// Command execution and process management tools
import { App, Notice, Platform } from 'obsidian';
import { Logger } from './../utils/logger';
import { BuiltInTool } from './built-in-tools';
import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let globalApp: App | null = null;
const runningProcesses = new Map<string, ChildProcess>();

export function setSharedFunctions(functions: {
  getApp: () => App;
}) {
  globalApp = functions.getApp();
}

function getApp(): App {
  if (!globalApp) {
    throw new Error('App instance not initialized. Call setSharedFunctions() first.');
  }
  return globalApp;
}

/**
 * Execute a shell command and return the result
 */
export const executeCommandTool: BuiltInTool = {
  name: 'execute_command',
  description: 'Execute a shell command and return the output. Use with caution as this can modify your system.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The shell command to execute'
      },
      timeout: {
        type: 'number',
        description: 'Timeout in seconds (defaults to 30)',
        default: 30
      },
      working_directory: {
        type: 'string',
        description: 'Working directory for command execution (defaults to vault root)'
      }
    },
    required: ['command']
  },
  async execute(args: { command: string; timeout?: number; working_directory?: string }): Promise<string> {
    const app = getApp();
    const { command, timeout = 30, working_directory } = args;

    // Security check - prevent dangerous commands
    const dangerousCommands = ['rm -rf', 'del /s', 'format', 'shutdown', 'reboot', 'dd if='];
    for (const dangerous of dangerousCommands) {
      if (command.toLowerCase().includes(dangerous.toLowerCase())) {
        throw new Error(`Dangerous command detected and blocked: ${dangerous}`);
      }
    }

    const vaultPath = (app.vault.adapter as any).basePath || process.cwd();
    const cwd = working_directory || vaultPath;

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout: timeout * 1000,
        maxBuffer: 1024 * 1024 // 1MB buffer
      });

      const output = stdout.trim();
      const errorOutput = stderr.trim();

      if (errorOutput && !output) {
        return `Command executed with errors:\n${errorOutput}`;
      } else if (errorOutput) {
        return `Command output:\n${output}\n\nWarnings/Errors:\n${errorOutput}`;
      } else {
        return output || 'Command executed successfully (no output)';
      }
    } catch (error: any) {
      if (error.code === 'TIMEOUT') {
        throw new Error(`Command timed out after ${timeout} seconds`);
      }
      throw new Error(`Command failed: ${error.message}`);
    }
  }
};

/**
 * Start a long-running process in the background
 */
export const startProcessTool: BuiltInTool = {
  name: 'start_process',
  description: 'Start a long-running process in the background and return a process ID for management.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The command to start as a background process'
      },
      args: {
        type: 'array',
        description: 'Arguments for the command',
        items: { type: 'string' },
        default: []
      },
      working_directory: {
        type: 'string',
        description: 'Working directory for the process (defaults to vault root)'
      }
    },
    required: ['command']
  },
  async execute(executeArgs: { command: string; args?: string[]; working_directory?: string }): Promise<string> {
    const app = getApp();
    const { command, args = [], working_directory } = executeArgs;

    const vaultPath = (app.vault.adapter as any).basePath || process.cwd();
    const cwd = working_directory || vaultPath;

    try {
      const child = spawn(command, args, {
        cwd,
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      const processId = `${command}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      runningProcesses.set(processId, child);

      // Handle process events
      child.on('error', (error: any) => {
        Logger.error(`Process ${processId} error:`, error);
        runningProcesses.delete(processId);
      });

      child.on('exit', (code: any) => {
        Logger.debug(`Process ${processId} exited with code ${code}`);
        runningProcesses.delete(processId);
      });

      return `Process started successfully with ID: ${processId}\nUse 'check_process' to monitor or 'stop_process' to terminate.`;
    } catch (error: any) {
      throw new Error(`Failed to start process: ${error.message}`);
    }
  }
};

/**
 * Check the status of a running process
 */
export const checkProcessTool: BuiltInTool = {
  name: 'check_process',
  description: 'Check the status and get recent output of a background process.',
  inputSchema: {
    type: 'object',
    properties: {
      process_id: {
        type: 'string',
        description: 'The process ID returned by start_process'
      }
    },
    required: ['process_id']
  },
  async execute(args: { process_id: string }): Promise<string> {
    const { process_id } = args;
    const process = runningProcesses.get(process_id);

    if (!process) {
      return `Process ${process_id} not found or has already terminated.`;
    }

    const isRunning = !process.killed && process.exitCode === null;

    if (isRunning) {
      return `Process ${process_id} is still running (PID: ${process.pid})`;
    } else {
      runningProcesses.delete(process_id);
      return `Process ${process_id} has terminated (exit code: ${process.exitCode})`;
    }
  }
};

/**
 * Stop a running background process
 */
export const stopProcessTool: BuiltInTool = {
  name: 'stop_process',
  description: 'Stop a running background process by its process ID.',
  inputSchema: {
    type: 'object',
    properties: {
      process_id: {
        type: 'string',
        description: 'The process ID returned by start_process'
      },
      force: {
        type: 'boolean',
        description: 'Whether to force kill the process (defaults to false)',
        default: false
      }
    },
    required: ['process_id']
  },
  async execute(args: { process_id: string; force?: boolean }): Promise<string> {
    const { process_id, force = false } = args;
    const process = runningProcesses.get(process_id);

    if (!process) {
      return `Process ${process_id} not found or has already terminated.`;
    }

    try {
      if (force) {
        process.kill('SIGKILL');
      } else {
        process.kill('SIGTERM');
      }

      runningProcesses.delete(process_id);
      return `Process ${process_id} has been ${force ? 'forcefully killed' : 'terminated'}.`;
    } catch (error: any) {
      return `Failed to stop process ${process_id}: ${error.message}`;
    }
  }
};

/**
 * List all running background processes
 */
export const listProcessesTool: BuiltInTool = {
  name: 'list_processes',
  description: 'List all currently running background processes started by this plugin.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: []
  },
  async execute(args: {}): Promise<string> {
    if (runningProcesses.size === 0) {
      return 'No background processes are currently running.';
    }

    const processes: string[] = [];
    for (const [processId, process] of runningProcesses) {
      const isRunning = !process.killed && process.exitCode === null;
      const status = isRunning ? `running (PID: ${process.pid})` : 'terminated';
      processes.push(`${processId}: ${status}`);
    }

    return `Currently tracked processes (${processes.length}):\n\n${processes.join('\n')}`;
  }
};

/**
 * Get system information
 */
export const getSystemInfoTool: BuiltInTool = {
  name: 'get_system_info',
  description: 'Get basic system information like platform, architecture, and environment.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: []
  },
  async execute(args: {}): Promise<string> {
    const app = getApp();

    const info = {
      platform: Platform.isDesktopApp ? 'Desktop' : (Platform.isMobileApp ? 'Mobile' : 'Web'),
      os: Platform.isWin ? 'Windows' : (Platform.isMacOS ? 'macOS' : (Platform.isLinux ? 'Linux' : 'Unknown')),
      obsidianVersion: (app as any).appVersion || 'Unknown',
      vaultName: app.vault.getName(),
      vaultPath: (app.vault.adapter as any).basePath || 'Unknown',
      nodeVersion: typeof process !== 'undefined' ? process.version : 'N/A',
      architecture: typeof process !== 'undefined' ? process.arch : 'N/A'
    };

    return Object.entries(info)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  }
};