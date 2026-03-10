import { execFile, execFileSync } from 'child_process';
import path from 'path';
import { promisify } from 'util';
import { z } from 'zod';
import type { MastraTool } from './mastra-tool-types';
import { Notice } from 'obsidian';
import { i18n } from '../i18n/i18n-manager';
import { getApp } from './built-in-tools';

const execFileAsync = promisify(execFile);
const loginShellPathCache = new Map<string, string>();
const DEFAULT_COMMAND_TIMEOUT_MS = 30000;

interface LocalCommandRuntimeContext {
  skill?: {
    rootPath?: string;
    id?: string;
    name?: string;
  } | null;
  skillRootPath?: string;
}

function getShellCandidates(shellOverride?: string): string[] {
  return Array.from(
    new Set(
      [
        shellOverride,
        process.env.SHELL,
        '/bin/zsh',
        '/bin/bash',
        '/bin/sh',
      ].filter((value): value is string => Boolean(value && value.trim()))
    )
  );
}

function getRuntimePath(shellOverride?: string): string {
  for (const shell of getShellCandidates(shellOverride)) {
    const cached = loginShellPathCache.get(shell);
    if (cached) {
      return cached;
    }

    try {
      const loginPath = execFileSync(shell, ['-lc', 'printf %s "$PATH"'], {
        encoding: 'utf8',
        timeout: 2000,
        env: process.env,
      }).trim();

      if (loginPath) {
        loginShellPathCache.set(shell, loginPath);
        return loginPath;
      }
    } catch {
      // Try the next candidate shell.
    }
  }

  const fallbackPath = process.env.PATH || '';
  return fallbackPath;
}

function resolveSkillRootPath(runtimeContext?: unknown): string | undefined {
  const context = (runtimeContext || {}) as LocalCommandRuntimeContext;
  const rawPath = context.skillRootPath || context.skill?.rootPath;
  if (!rawPath) {
    return undefined;
  }

  if (path.isAbsolute(rawPath)) {
    return rawPath;
  }

  try {
    const app = getApp() as any;
    const vaultBasePath = app?.vault?.adapter?.basePath;
    if (vaultBasePath) {
      return path.join(vaultBasePath, rawPath);
    }
  } catch {
    // Fall back to process cwd when App is not available.
  }

  return path.resolve(rawPath);
}

function replaceSkillPlaceholders(command: string, runtimeContext?: unknown): string {
  const skillRootPath = resolveSkillRootPath(runtimeContext);
  if (!skillRootPath) {
    return command;
  }

  return command
    .replaceAll('{baseDir}', skillRootPath)
    .replaceAll('${baseDir}', skillRootPath)
    .replaceAll('{skillRoot}', skillRootPath)
    .replaceAll('${skillRoot}', skillRootPath)
    .replaceAll('{skillRootPath}', skillRootPath)
    .replaceAll('${skillRootPath}', skillRootPath);
}

function resolveWorkingDirectory(command: string, cwd: string | undefined, runtimeContext?: unknown): string | undefined {
  if (cwd) {
    return cwd;
  }

  const skillRootPath = resolveSkillRootPath(runtimeContext);
  if (!skillRootPath) {
    return undefined;
  }

  const trimmed = command.trim();
  const firstToken = trimmed.match(/^(?:"([^"]+)"|'([^']+)'|([^\s]+))/)?.slice(1).find(Boolean);
  if (!firstToken) {
    return skillRootPath;
  }

  if (firstToken.startsWith('./') || firstToken.startsWith('../')) {
    return skillRootPath;
  }

  if (trimmed.includes(' ./') || trimmed.includes(' ../')) {
    return skillRootPath;
  }

  return undefined;
}

export const runLocalCommandTool: MastraTool = {
  id: 'run_local_command',
  description: 'Execute a local shell command on this machine and return stdout, stderr, and exit status. This is the exact tool to use for CLI-based skills; pass a real shell command string and do not invent wrapper tool names.',
  category: 'system-command',
  inputSchema: z.object({
    command: z.string().min(1).describe('The full local shell command to execute.'),
    cwd: z.string().optional().describe('Optional working directory for command execution.'),
    timeoutMs: z.number().int().positive().optional().describe('Optional timeout in milliseconds.'),
    shell: z.string().optional().describe('Optional shell executable to use, such as /bin/zsh or /bin/bash.'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    command: z.string(),
    stdout: z.string(),
    stderr: z.string(),
    exitCode: z.number(),
    signal: z.string().optional(),
  }),
  execute: async ({ context, runtimeContext }) => {
    const shellCandidates = getShellCandidates(context.shell);
    const runtimePath = getRuntimePath(context.shell);
    const timeoutMs = context.timeoutMs || DEFAULT_COMMAND_TIMEOUT_MS;
    const resolvedCommand = replaceSkillPlaceholders(context.command, runtimeContext);
    const resolvedCwd = resolveWorkingDirectory(resolvedCommand, context.cwd, runtimeContext);
    new Notice(
      i18n.t('ui.executingCommand', { command: resolvedCommand }) || `Executing command: ${resolvedCommand}`,
      3000,
    );

    try {
      let lastError: any;
      let stdout = '';
      let stderr = '';

      for (const shell of shellCandidates) {
        try {
          const shellArgs = shell.endsWith('/sh') ? ['-c', resolvedCommand] : ['-lc', resolvedCommand];
          const result = await execFileAsync(shell, shellArgs, {
            cwd: resolvedCwd,
            timeout: timeoutMs,
            killSignal: 'SIGKILL',
            maxBuffer: 10 * 1024 * 1024,
            env: {
              ...process.env,
              PATH: runtimePath,
            },
          });
          stdout = result.stdout || '';
          stderr = result.stderr || '';
          lastError = undefined;
          break;
        } catch (error: any) {
          lastError = error;
          if (error?.code !== 'ENOENT') {
            throw error;
          }
        }
      }

      if (lastError) {
        throw lastError;
      }

      new Notice(
        i18n.t('ui.commandSucceeded', { command: resolvedCommand }) || `Command succeeded: ${resolvedCommand}`,
        2500,
      );

      return {
        success: true,
        command: resolvedCommand,
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: 0,
      };
    } catch (error: any) {
      new Notice(
        i18n.t('ui.commandFailed', { command: resolvedCommand }) || `Command failed: ${resolvedCommand}`,
        4000,
      );
      return {
        success: false,
        command: resolvedCommand,
        stdout: error?.stdout || '',
        stderr: error?.killed
          ? error?.stderr || `Command timed out after ${timeoutMs}ms`
          : error?.stderr || error?.message || 'Command execution failed',
        exitCode: typeof error?.code === 'number' ? error.code : 1,
        signal: error?.signal,
      };
    }
  },
};
