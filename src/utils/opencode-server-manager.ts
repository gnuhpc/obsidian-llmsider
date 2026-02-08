import { Notice } from 'obsidian';
import { Logger } from './logger';
import { spawn, ChildProcess } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class OpenCodeServerManager {
	private port: number = 4097;
	private hostname: string = '127.0.0.1';
	private serverUrl: string;
	private checkInterval: NodeJS.Timeout | null = null;
	private isServerRunning: boolean = false;
	private serverProcess: ChildProcess | null = null;
	private isStarting: boolean = false;

	constructor(port: number = 4097, hostname: string = '127.0.0.1') {
		this.port = port;
		this.hostname = hostname;
		this.serverUrl = `http://${this.hostname}:${this.port}`;
	}

	async startMonitoring(): Promise<void> {
		await this.checkServerStatus();

		this.checkInterval = setInterval(async () => {
			await this.checkServerStatus();
		}, 30000);

		Logger.info('[OpenCode] Server monitoring started');
	}

	stopMonitoring(): void {
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
			Logger.info('[OpenCode] Server monitoring stopped');
		}
	}

	async isRunning(): Promise<boolean> {
		try {
			const isWindows = process.platform === 'win32';
			
			let command: string;
			if (isWindows) {
				command = 'tasklist /FI "IMAGENAME eq opencode.exe" /NH';
			} else {
				command = 'ps aux | grep "[o]pencode serve" || ps aux | grep "[o]pencode" | grep -v grep';
			}

			const { stdout } = await execAsync(command);
			
			const isRunning = stdout.trim().length > 0 && 
				(stdout.toLowerCase().includes('omo') || stdout.toLowerCase().includes('opencode'));
			
			Logger.debug(`[OpenCode] Process check: ${isRunning ? 'Running' : 'Not running'}`);
			return isRunning;
		} catch (error) {
			Logger.debug('[OpenCode] Process not found:', error);
			return false;
		}
	}

	private async checkServerStatus(): Promise<void> {
		const wasRunning = this.isServerRunning;
		this.isServerRunning = await this.isRunning();

		if (!this.isServerRunning && !this.isStarting) {
			Logger.info('[OpenCode] Server not running, attempting to start...');
			await this.startServer();
		} else if (wasRunning && !this.isServerRunning) {
			Logger.warn('[OpenCode] Server stopped unexpectedly, attempting restart...');
			await this.startServer();
		} else if (!wasRunning && this.isServerRunning) {
			Logger.info('[OpenCode] Server detected and running');
		}
	}

	async startServer(): Promise<boolean> {
		if (this.isStarting || this.serverProcess) {
			Logger.debug('[OpenCode] Server already starting or running');
			return false;
		}

		this.isStarting = true;

		try {
			Logger.info('[OpenCode] Starting server with: opencode serve');

			this.serverProcess = spawn('opencode', ['serve', '--port', this.port.toString(), '--hostname', this.hostname], {
				detached: false,
				stdio: ['ignore', 'pipe', 'pipe']
			});

			this.serverProcess.stdout?.on('data', (data) => {
				Logger.debug(`[OpenCode] stdout: ${data.toString().trim()}`);
			});

			this.serverProcess.stderr?.on('data', (data) => {
				const message = data.toString().trim();
				if (message.toLowerCase().includes('error')) {
					Logger.error(`[OpenCode] stderr: ${message}`);
				} else {
					Logger.debug(`[OpenCode] stderr: ${message}`);
				}
			});

			this.serverProcess.on('error', (error) => {
				Logger.error('[OpenCode] Failed to start server:', error);
				this.isStarting = false;
				this.serverProcess = null;
				
				if (error.message.includes('ENOENT')) {
					new Notice('OpenCode CLI not found. Please install it with: npm install -g opencode', 8000);
				} else {
					new Notice(`Failed to start OpenCode server: ${error.message}`, 8000);
				}
			});

			this.serverProcess.on('exit', (code, signal) => {
				Logger.info(`[OpenCode] Server process exited with code ${code}, signal ${signal}`);
				this.serverProcess = null;
				this.isServerRunning = false;
				
				if (code !== 0 && code !== null) {
					new Notice(`OpenCode server stopped unexpectedly (exit code: ${code})`, 6000);
				}
			});

			await new Promise(resolve => setTimeout(resolve, 2000));

			const isNowRunning = await this.isRunning();
			if (isNowRunning) {
				Logger.info('[OpenCode] Server started successfully');
				new Notice('OpenCode server started successfully');
				this.isServerRunning = true;
				return true;
			} else {
				Logger.warn('[OpenCode] Server process spawned but not detected as running');
				return false;
			}
		} catch (error) {
			Logger.error('[OpenCode] Error starting server:', error);
			new Notice(`Failed to start OpenCode server: ${error instanceof Error ? error.message : String(error)}`, 8000);
			return false;
		} finally {
			this.isStarting = false;
		}
	}

	async stopServer(): Promise<void> {
		if (this.serverProcess) {
			Logger.info('[OpenCode] Stopping server...');
			this.serverProcess.kill();
			this.serverProcess = null;
			this.isServerRunning = false;
		}
	}

	getServerStatus(): { running: boolean; url: string; port: number; hostname: string } {
		return {
			running: this.isServerRunning,
			url: this.serverUrl,
			port: this.port,
			hostname: this.hostname
		};
	}

	async checkAndNotify(): Promise<boolean> {
		const running = await this.isRunning();
		this.isServerRunning = running;

		if (!running) {
			Logger.info('[OpenCode] Server not detected, will auto-start');
			await this.startServer();
			return this.isServerRunning;
		}

		Logger.info('[OpenCode] Server is already running');
		return true;
	}
}
