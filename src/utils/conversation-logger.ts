import { ChatMessage } from '../types';
import { Logger } from '././logger';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface ConversationTurn {
	timestamp: number;
	userMessage: ChatMessage;
	assistantMessage: {
		content: string;
		usage?: {
			promptTokens: number;
			completionTokens: number;
			totalTokens: number;
		};
		duration?: number;
		toolCalls?: any[];
	};
}

export interface SessionLog {
	sessionId: string;
	provider: string;
	model: string;
	created: number;
	updated: number;
	conversationTurns: ConversationTurn[];
}

/**
 * Logger for Normal Mode conversations
 * Saves each conversation turn (user message + AI response) to a separate file
 */
export class ConversationLogger {
	private static instance: ConversationLogger;
	private logDir: string;
	private isEnabled: boolean = true;
	private vaultPath: string | null = null;

	private constructor() {
		// Initially use home directory, will be updated when vault path is set
		this.logDir = path.join(os.homedir(), '.obsidian-llmsider-logs');
		this.ensureLogDirectory();
	}

	static getInstance(): ConversationLogger {
		if (!ConversationLogger.instance) {
			ConversationLogger.instance = new ConversationLogger();
		}
		return ConversationLogger.instance;
	}

	/**
	 * Set the vault path and migrate logs if necessary
	 * This should be called during plugin initialization
	 */
	setVaultPath(vaultPath: string): void {
		if (this.vaultPath === vaultPath) {
			return; // Already set
		}

		this.vaultPath = vaultPath;
		const newLogDir = path.join(vaultPath, '.obsidian', 'plugins', 'obsidian-llmsider', 'logs');
		
		// Migrate logs from old location if they exist
		this.migrateLogs(this.logDir, newLogDir);
		
		this.logDir = newLogDir;
		this.ensureLogDirectory();
		
		Logger.debug(`Log directory set to: ${this.logDir}`);
	}

	/**
	 * Migrate logs from old location to new location
	 */
	private migrateLogs(oldDir: string, newDir: string): void {
		try {
			// Check if old directory exists and has files
			if (!fs.existsSync(oldDir)) {
				return;
			}

			const files = fs.readdirSync(oldDir);
			const logFiles = files.filter(f => f.startsWith('session-') && f.endsWith('.json'));
			
			if (logFiles.length === 0) {
				Logger.debug('No log files to migrate');
				return;
			}

			// Ensure new directory exists
			if (!fs.existsSync(newDir)) {
				fs.mkdirSync(newDir, { recursive: true });
			}

			// Copy log files
			let migratedCount = 0;
			for (const file of logFiles) {
				const oldPath = path.join(oldDir, file);
				const newPath = path.join(newDir, file);
				
				// Only copy if destination doesn't exist
				if (!fs.existsSync(newPath)) {
					fs.copyFileSync(oldPath, newPath);
					migratedCount++;
				}
			}

			if (migratedCount > 0) {
				Logger.debug(`Migrated ${migratedCount} log files from ${oldDir} to ${newDir}`);
				Logger.debug('Old log files are preserved in case you need them');
			}
		} catch (error) {
			Logger.error('Failed to migrate logs:', error);
		}
	}

	/**
	 * Ensure the log directory exists
	 */
	private ensureLogDirectory(): void {
		try {
			if (!fs.existsSync(this.logDir)) {
				fs.mkdirSync(this.logDir, { recursive: true });
				Logger.debug(`Created log directory: ${this.logDir}`);
			}
		} catch (error) {
			Logger.error('Failed to create log directory:', error);
			this.isEnabled = false;
		}
	}

	/**
	 * Enable or disable conversation logging
	 */
	setEnabled(enabled: boolean): void {
		this.isEnabled = enabled;
	}

	/**
	 * Get the current log directory path
	 */
	getLogDirectory(): string {
		return this.logDir;
	}

	/**
	 * Log a conversation turn (user message + AI response)
	 * Appends to the session's log file
	 */
	async logConversation(
		sessionId: string,
		provider: string,
		model: string,
		userMessage: ChatMessage,
		assistantContent: string,
		usage?: { promptTokens: number; completionTokens: number; totalTokens: number },
		duration?: number,
		toolCalls?: any[]
	): Promise<void> {
		if (!this.isEnabled) {
			return;
		}

		try {
			const timestamp = Date.now();
			const filename = `session-${sessionId}.json`;
			const filePath = path.join(this.logDir, filename);

			// Create conversation turn
			const conversationTurn: ConversationTurn = {
				timestamp,
				userMessage: {
					id: userMessage.id,
					role: userMessage.role,
					content: userMessage.content,
					timestamp: userMessage.timestamp,
					metadata: userMessage.metadata
				},
				assistantMessage: {
					content: assistantContent,
					usage,
					duration,
					toolCalls
				}
			};

			// Read existing session log or create new one
			let sessionLog: SessionLog;
			
			if (await this.fileExists(filePath)) {
				// Read and update existing log
				const content = await fs.promises.readFile(filePath, 'utf8');
				sessionLog = JSON.parse(content) as SessionLog;
				sessionLog.conversationTurns.push(conversationTurn);
				sessionLog.updated = timestamp;
				// Update provider and model in case they changed
				sessionLog.provider = provider;
				sessionLog.model = model;
			} else {
				// Create new session log
				sessionLog = {
					sessionId,
					provider,
					model,
					created: timestamp,
					updated: timestamp,
					conversationTurns: [conversationTurn]
				};
			}

			// Write updated log to file
			await fs.promises.writeFile(
				filePath,
				JSON.stringify(sessionLog, null, 2),
				'utf8'
			);

			Logger.debug(`Logged conversation to: ${filePath} (${sessionLog.conversationTurns.length} turns)`);
		} catch (error) {
			Logger.error('Failed to log conversation:', error);
		}
	}

	/**
	 * Check if a file exists
	 */
	private async fileExists(filePath: string): Promise<boolean> {
		try {
			await fs.promises.access(filePath);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get all session log files
	 */
	async getLogFiles(): Promise<string[]> {
		try {
			const files = await fs.promises.readdir(this.logDir);
			return files
				.filter(f => f.startsWith('session-') && f.endsWith('.json'))
				.map(f => path.join(this.logDir, f));
		} catch (error) {
			Logger.error('Failed to read log files:', error);
			return [];
		}
	}

	/**
	 * Read a specific session log file
	 */
	async readLogFile(filePath: string): Promise<SessionLog | null> {
		try {
			const content = await fs.promises.readFile(filePath, 'utf8');
			return JSON.parse(content) as SessionLog;
		} catch (error) {
			Logger.error(`Failed to read log file ${filePath}:`, error);
			return null;
		}
	}

	/**
	 * Get session log by session ID
	 */
	async getSessionLog(sessionId: string): Promise<SessionLog | null> {
		const filename = `session-${sessionId}.json`;
		const filePath = path.join(this.logDir, filename);
		return this.readLogFile(filePath);
	}

	/**
	 * Clean up old log files (older than specified days)
	 */
	async cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
		try {
			const files = await this.getLogFiles();
			const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
			let deletedCount = 0;

			for (const file of files) {
				const stats = await fs.promises.stat(file);
				if (stats.mtimeMs < cutoffTime) {
					await fs.promises.unlink(file);
					deletedCount++;
				}
			}

			Logger.debug(`Cleaned up ${deletedCount} old log files`);
			return deletedCount;
		} catch (error) {
			Logger.error('Failed to cleanup old logs:', error);
			return 0;
		}
	}

	/**
	 * Export a formatted markdown version of a session log
	 */
	async exportToMarkdown(logFilePath: string, outputPath: string): Promise<void> {
		try {
			const log = await this.readLogFile(logFilePath);
			if (!log) {
				throw new Error('Failed to read log file');
			}

			const createdDate = new Date(log.created);
			const updatedDate = new Date(log.updated);
			
			let markdown = `# Conversation Log - Session ${log.sessionId}

**Created:** ${createdDate.toLocaleString()}
**Updated:** ${updatedDate.toLocaleString()}
**Session ID:** ${log.sessionId}
**Provider:** ${log.provider}
**Model:** ${log.model}
**Total Turns:** ${log.conversationTurns.length}

---

`;

			// Add each conversation turn
			log.conversationTurns.forEach((turn, index) => {
				const turnDate = new Date(turn.timestamp);
				markdown += `## Turn ${index + 1}

**Time:** ${turnDate.toLocaleString()}

### User

${typeof turn.userMessage.content === 'string' ? turn.userMessage.content : JSON.stringify(turn.userMessage.content, null, 2)}

### Assistant

${turn.assistantMessage.content}

`;

				if (turn.assistantMessage.usage) {
					markdown += `**Usage:** ${turn.assistantMessage.usage.totalTokens} tokens`;
					if (turn.assistantMessage.duration) {
						markdown += ` | **Duration:** ${turn.assistantMessage.duration}ms`;
					}
					markdown += '\n\n';
				}

				if (turn.assistantMessage.toolCalls && turn.assistantMessage.toolCalls.length > 0) {
					markdown += `**Tool Calls:**\n\`\`\`json\n${JSON.stringify(turn.assistantMessage.toolCalls, null, 2)}\n\`\`\`\n\n`;
				}

				markdown += '---\n\n';
			});

			// Add summary statistics
			const totalTokens = log.conversationTurns.reduce((sum, turn) => 
				sum + (turn.assistantMessage.usage?.totalTokens || 0), 0
			);
			const avgDuration = log.conversationTurns.filter(t => t.assistantMessage.duration).length > 0
				? log.conversationTurns.reduce((sum, turn) => sum + (turn.assistantMessage.duration || 0), 0) / 
				  log.conversationTurns.filter(t => t.assistantMessage.duration).length
				: 0;

			markdown += `## Summary

- **Total Conversation Turns:** ${log.conversationTurns.length}
- **Total Tokens Used:** ${totalTokens}
${avgDuration > 0 ? `- **Average Response Time:** ${avgDuration.toFixed(0)}ms` : ''}
- **Session Duration:** ${((log.updated - log.created) / 1000 / 60).toFixed(1)} minutes
`;

			await fs.promises.writeFile(outputPath, markdown, 'utf8');
			Logger.debug(`Exported markdown to: ${outputPath}`);
		} catch (error) {
			Logger.error('Failed to export markdown:', error);
			throw error;
		}
	}
}

export const conversationLogger = ConversationLogger.getInstance();
