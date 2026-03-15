import { execFile, execFileSync } from 'child_process';
import fs from 'fs';
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
  const isWindows = process.platform === 'win32';
  const windowsCandidates = [
    shellOverride,
    process.env.COMSPEC,
    process.env.PSModulePath ? 'powershell.exe' : undefined,
    'pwsh.exe',
    'powershell.exe',
    'cmd.exe',
  ];
  const unixCandidates = [
    shellOverride,
    process.env.SHELL,
    '/bin/zsh',
    '/bin/bash',
    '/bin/sh',
  ];

  return Array.from(
    new Set(
      (isWindows ? windowsCandidates : unixCandidates).filter(
        (value): value is string => Boolean(value && value.trim()),
      ),
    )
  );
}

function getRuntimePath(shellOverride?: string): string {
  if (process.platform === 'win32') {
    // Windows does not support POSIX-style login shell PATH probing.
    return process.env.PATH || '';
  }

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

function getShellArgs(shell: string, command: string): string[] {
  const shellName = path.basename(shell).toLowerCase();

  if (shellName === 'cmd.exe' || shellName === 'cmd') {
    return ['/d', '/s', '/c', command];
  }

  if (
    shellName === 'powershell.exe'
    || shellName === 'powershell'
    || shellName === 'pwsh.exe'
    || shellName === 'pwsh'
  ) {
    return ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command];
  }

  return shell.endsWith('/sh') ? ['-c', command] : ['-lc', command];
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

function getVaultBasePath(): string | undefined {
  try {
    const app = getApp() as any;
    const basePath = app?.vault?.adapter?.basePath;
    return typeof basePath === 'string' && basePath.trim().length > 0
      ? path.resolve(basePath)
      : undefined;
  } catch {
    return undefined;
  }
}

function isPathInsideBase(basePath: string, targetPath: string): boolean {
  const normalizedBase = path.resolve(basePath);
  const normalizedTarget = path.resolve(targetPath);
  const relative = path.relative(normalizedBase, normalizedTarget);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function resolveCommandCwd(
  cwd: string | undefined,
  runtimeContext: unknown,
  vaultBasePath: string,
): { cwd?: string; error?: string } {
  // Hard rule: always execute inside vault. Default is vault root only.
  // Skill root placeholders can still be used in command text, but execution base remains vault root.
  const selected = cwd && cwd.trim().length > 0
    ? cwd.trim()
    : '.';

  const resolved = path.isAbsolute(selected)
    ? path.resolve(selected)
    : path.resolve(vaultBasePath, selected);

  if (!isPathInsideBase(vaultBasePath, resolved)) {
    return {
      error: `Working directory is outside vault boundary: ${selected}`,
    };
  }

  try {
    const real = fs.realpathSync.native(resolved);
    if (!isPathInsideBase(vaultBasePath, real)) {
      return {
        error: `Working directory symlink escapes vault boundary: ${selected}`,
      };
    }
  } catch {
    // If path doesn't exist yet, rely on normalized-path boundary check above.
  }

  return { cwd: resolved };
}

function validateCommandPathBoundary(command: string, vaultBasePath: string): { valid: true } | { valid: false; reason: string } {
  const tokenRegex = /(?:"[^"]*"|'[^']*'|`[^`]*`|\S+)/g;
  const tokens = command.match(tokenRegex) || [];
  const allowedAbsoluteExecutables = new Set(['/bin', '/usr/bin', '/opt/homebrew/bin', '/usr/local/bin']);

  for (let index = 0; index < tokens.length; index += 1) {
    const raw = tokens[index];
    const dequoted = raw.replace(/^['"`]|['"`]$/g, '');
    const stripped = dequoted
      .replace(/^(?:\d*>>?|\d*<<?|[<>]+)/, '')
      .trim();

    if (!stripped) continue;
    if (/^[a-zA-Z]+:\/\//.test(stripped)) continue; // URL
    if (stripped.startsWith('~') || stripped.includes('$HOME')) {
      return { valid: false, reason: `Home-path reference is not allowed: ${stripped}` };
    }
    if (stripped === '..' || stripped.includes('../') || stripped.includes('..\\')) {
      return { valid: false, reason: `Parent traversal is not allowed: ${stripped}` };
    }

    if (path.isAbsolute(stripped)) {
      // Allow absolute executable path for the command itself.
      if (index === 0) {
        const parentDir = path.dirname(stripped);
        if (allowedAbsoluteExecutables.has(parentDir) || Array.from(allowedAbsoluteExecutables).some(prefix => stripped.startsWith(`${prefix}/`))) {
          continue;
        }
      }
      if (!isPathInsideBase(vaultBasePath, stripped)) {
        return { valid: false, reason: `Absolute path outside vault is not allowed: ${stripped}` };
      }
    }
  }

  return { valid: true };
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
    const vaultBasePath = getVaultBasePath();
    if (!vaultBasePath) {
      return {
        success: false,
        command: context.command,
        stdout: '',
        stderr: 'Vault base path is unavailable; refusing to run local command.',
        exitCode: 1,
      };
    }

    const shellCandidates = getShellCandidates(context.shell);
    const runtimePath = getRuntimePath(context.shell);
    const timeoutMs = context.timeoutMs || DEFAULT_COMMAND_TIMEOUT_MS;
    const resolvedCommand = replaceSkillPlaceholders(context.command, runtimeContext);
    const boundary = validateCommandPathBoundary(resolvedCommand, vaultBasePath);
    if (!boundary.valid) {
      return {
        success: false,
        command: resolvedCommand,
        stdout: '',
        stderr: `Command rejected by vault boundary policy: ${boundary.reason}`,
        exitCode: 1,
      };
    }

    const cwdResult = resolveCommandCwd(
      resolveWorkingDirectory(resolvedCommand, context.cwd, runtimeContext),
      runtimeContext,
      vaultBasePath,
    );
    if (cwdResult.error || !cwdResult.cwd) {
      return {
        success: false,
        command: resolvedCommand,
        stdout: '',
        stderr: `Command rejected by vault boundary policy: ${cwdResult.error || 'invalid working directory'}`,
        exitCode: 1,
      };
    }
    const resolvedCwd = cwdResult.cwd;
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
          const shellArgs = getShellArgs(shell, resolvedCommand);
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
