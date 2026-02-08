import { Notice, TFile } from 'obsidian';
import { Logger } from '../utils/logger';
import type LLMSiderPlugin from '../main';
import { SpeedReadingDrawer } from '../modals/speed-reading-modal';
import type { ChatMessage } from '../types';

export interface SpeedReadingResult {
	id: string;
	noteTitle: string;
	notePath: string;
	summary: string;
	keyPoints: string[];
	mindMap: string;
	extendedReading: string[];
	guessYouCareAbout: string[];
	createdAt: number;
	updatedAt: number;
}

export class SpeedReadingManager {
	private drawer: SpeedReadingDrawer | null = null;
	private isStreaming = false;
	private currentFilePath: string | null = null;
	private streamingContent = '';
	private lastParsedNodeCount = 0;
	private lastParsedMindMapLength = 0;

	constructor(private plugin: LLMSiderPlugin) {}

	/**
	 * Initialize drawer
	 */
	initializeDrawer(containerEl: HTMLElement): void {
		if (!this.drawer) {
			this.drawer = new SpeedReadingDrawer(this.plugin.app, this.plugin, containerEl);
		}
	}

	/**
	 * Ensure drawer is initialized
	 */
	private ensureDrawerInitialized(): void {
		if (!this.drawer) {
			const container = activeDocument ? activeDocument.body : document.body;
			this.initializeDrawer(container);
		}
	}

	/**
	 * Toggle drawer (open/close)
	 */
	toggleDrawer(): boolean {
		return this.drawer?.isDrawerOpen() || false;
	}

	/**
	 * Regenerate report for a specific note path
	 */
	async regenerateReport(notePath: string): Promise<void> {
		// Find the file by path
		const file = this.plugin.app.vault.getAbstractFileByPath(notePath);
		if (!file || !(file instanceof TFile)) {
			new Notice(this.plugin.i18n.t('ui.speedReadingNoteFileNotFound'));
			return;
		}

		// Delete existing result from database (use configDb to match getSpeedReadingResult)
		const db = this.plugin.configDb;
		if (db && db['db']) {
			try {
				const sqlDb = db['db'];
				sqlDb.run(
					'DELETE FROM speed_reading_results WHERE note_path = ?',
					[notePath]
				);
			} catch (error) {
				Logger.error('[SpeedReading] Error deleting existing result:', error);
			}
		}

		// Now call processActiveNote which will create a new analysis
		await this.processActiveNote();
	}

	/**
	 * Process speed reading for current active note
	 */
	async processActiveNote(): Promise<void> {
		// Ensure drawer is initialized (reuse existing instance if available)
		this.ensureDrawerInitialized();
		
		const activeFile = this.plugin.app.workspace.getActiveFile();
		
		if (!activeFile || activeFile.extension !== 'md') {
			new Notice(this.plugin.i18n.t('ui.speedReadingPleaseOpenNoteFirst'));
			return;
		}

		// If drawer is open, simply toggle it closed
		if (this.drawer?.isDrawerOpen()) {
			// If streaming for same file, keep drawer open to continue viewing
			if (this.isStreaming && this.currentFilePath === activeFile.path) {
				return;
			}
			// Otherwise close the drawer
			this.drawer.close();
			return;
		}

		// Check if result already exists
		const existingResult = await this.getSpeedReadingResult(activeFile.path);
		if (existingResult) {
			// Show existing result
			this.showResult(existingResult);
			return;
		}

		// Check if currently streaming for this file
		if (this.isStreaming && this.currentFilePath === activeFile.path) {
			// Reopen drawer to show streaming progress
			const partialResult: SpeedReadingResult = {
				id: `speed-reading-${Date.now()}`,
				noteTitle: activeFile.basename,
				notePath: activeFile.path,
				summary: '',
				keyPoints: [],
				mindMap: this.streamingContent,
				extendedReading: [],
				createdAt: Date.now(),
				updatedAt: Date.now()
			};
			this.drawer?.open(partialResult, true);
			return;
		}

		// Start streaming analysis
		new Notice(this.plugin.i18n.t('ui.speedReadingAnalyzingDocument'));
		this.currentFilePath = activeFile.path;
		this.streamingContent = '';
		
		try {
			// Read file content
			const content = await this.plugin.app.vault.read(activeFile);
			
			// Start streaming to drawer
			await this.analyzeContentStreaming(activeFile, content);
		} catch (error) {
			Logger.error('[SpeedReading] Error:', error);
			new Notice(this.plugin.i18n.t('ui.speedReadingProcessFailed') + ': ' + (error instanceof Error ? error.message : String(error)));
			this.isStreaming = false;
			this.currentFilePath = null;
		}
	}

	/**
	 * Analyze content using LLM with streaming
	 */
	private async analyzeContentStreaming(file: TFile, content: string): Promise<void> {
		// Get similar notes if available
		let similarNotesContext = '';
		const vectorDBManager = this.plugin.vectorDBManager;
		const settings = this.plugin.settings;
		
		if (vectorDBManager && settings.vectorDB?.enabled && settings.vectorDB?.showSimilarNotes) {
			try {
				const similarNoteFinder = (vectorDBManager as any).similarNoteFinder;
				if (similarNoteFinder) {
					const similarNotes = await similarNoteFinder.findSimilarNotes(file, 3);
					if (similarNotes && similarNotes.length > 0) {
						similarNotesContext = '\n\n相关笔记参考：\n';
						for (const note of similarNotes) {
							try {
								const noteContent = await this.plugin.app.vault.read(note.file);
								// Limit content to 500 characters per note
								const preview = noteContent.substring(0, 500);
								similarNotesContext += `\n【${note.title}】(相似度: ${(note.similarity * 100).toFixed(1)}%)\n${preview}\n`;
							} catch (err) {
								Logger.error('[SpeedReading] Error reading similar note:', err);
							}
						}
					}
				}
			} catch (error) {
				Logger.error('[SpeedReading] Error getting similar notes:', error);
			}
		}

		const prompt = `Please perform an in-depth analysis of the following article. 

IMPORTANT: Please respond in the SAME LANGUAGE as the article content. If the article is in English, respond in English. If it's in Chinese, respond in Chinese. If it's in another language, respond in that language.

Article Title: ${file.basename}

Article Content:
${content}${similarNotesContext}

Please return the analysis results in the following strict order (note: must output in 1→2→3→4→5 sequence):

Please return the analysis results in the following strict order (note: must output in 1→2→3→4→5 sequence):

## Content Summary
[A 200-300 word summary, this is the first part and must be output first]

## Core Points
Important: Key terms and core concepts in each point must be marked with **bold**, these bold texts will be specially highlighted.

Format requirements:
- Each point on one line, starting with "- "
- Surround keywords, core concepts, and important terms with **bold**
- Each point should mark at least 1-3 keywords
- Bold should be used for the most important words or phrases

Example format:
- The essence of strategy is **choice and trade-offs**, clearly defining what to do and what not to do
- An effective strategy includes three core elements: **diagnosis**, **guiding policy**, **coherent actions**
- The **value proposition** should clearly express the unique advantages of the product or service
- During implementation, attention should be paid to **execution** and **continuous optimization**

Please output 3-5 core points:

## Knowledge Structure
Please output the knowledge structure using jsMind node-by-node format, outputting one complete node JSON object at a time.

Output rules:
1. First output the root node:
{"id":"root","topic":"Topic Name"}

2. Then output child nodes one by one (one node per line):
{"id":"sub1","parentid":"root","topic":"Subtopic 1","direction":"right"}
{"id":"sub2","parentid":"root","topic":"Subtopic 2","direction":"left"}
{"id":"detail1","parentid":"sub1","topic":"Detail 1.1","direction":"right"}
{"id":"detail2","parentid":"sub1","topic":"Detail 1.2","direction":"right"}

Notes:
- Each node must be a complete JSON object (one per line)
- Root node must have id and topic
- Child nodes must have id, parentid, topic, direction
- direction can only be "right" or "left"
- Output at least 3 levels of nodes
- Do not wrap with markdown code blocks

## Extended Reading Suggestions
- [Suggestion 1]
- [Suggestion 2]
- [Suggestion 3]
...

## You Might Be Interested In${similarNotesContext ? '\nBased on the article content and related notes, analyze questions, topics, or areas of extension that users might be interested in:' : '\nBased on the article content, analyze questions, topics, or areas of extension that users might be interested in:'}
- [Interest 1]
- [Interest 2]
- [Interest 3]
...`;

		// Get current active provider
		const provider = this.plugin.getActiveProvider();
		if (!provider) {
			throw new Error(this.plugin.i18n.t('ui.speedReadingNoModelAvailable'));
		}

		// Prepare messages
		const messages: ChatMessage[] = [
			{ 
				id: `speed-reading-${Date.now()}`,
				role: 'user', 
				content: prompt,
				timestamp: Date.now()
			}
		];

		// Open drawer immediately
		const initialResult: SpeedReadingResult = {
			id: `speed-reading-${Date.now()}`,
			noteTitle: file.basename,
			notePath: file.path,
			summary: this.plugin.i18n.t('ui.speedReadingAnalyzingPlaceholder'),
			keyPoints: [],
			mindMap: '',
			extendedReading: [],
			guessYouCareAbout: [],
			createdAt: Date.now(),
			updatedAt: Date.now()
		};
		this.drawer?.open(initialResult, true);

		// Call LLM API using streaming
		this.isStreaming = true;
		this.streamingContent = '';
		let fullResponse = '';
		let chunkCount = 0;
		
		try {
			await provider.sendStreamingMessage(
				messages,
				(chunk) => {
					if (chunk.delta) {
						chunkCount++;
						fullResponse += chunk.delta;
						this.streamingContent = fullResponse;
						
						// Parse current response in real-time
						const parsed = this.parseResponse(fullResponse);
						
						// Update drawer in real-time with parsed content
						const updatedResult: SpeedReadingResult = {
							id: initialResult.id,
							noteTitle: file.basename,
							notePath: file.path,
							summary: parsed.summary,
							keyPoints: parsed.keyPoints,
							mindMap: parsed.mindMap,
							extendedReading: parsed.extendedReading,						guessYouCareAbout: parsed.guessYouCareAbout,							createdAt: initialResult.createdAt,
							updatedAt: Date.now()
						};
						this.drawer?.updateContent(updatedResult);
					}
				},
				undefined, // no abort signal
				undefined, // no tools
				undefined  // no system message
			);

			if (!fullResponse) {
				throw new Error(this.plugin.i18n.t('ui.speedReadingEmptyResponse'));
			}

			// Parse response and save
			const parsed = this.parseResponse(fullResponse);
			
			const finalResult: SpeedReadingResult = {
				id: initialResult.id,
				noteTitle: file.basename,
				notePath: file.path,
				summary: parsed.summary,
				keyPoints: parsed.keyPoints,
				mindMap: parsed.mindMap,
				extendedReading: parsed.extendedReading,
				guessYouCareAbout: parsed.guessYouCareAbout,
				createdAt: initialResult.createdAt,
				updatedAt: Date.now()
			};

			// Save to database
			await this.saveResult(finalResult);
			
			// Final update - explicitly mark streaming as complete
			this.drawer?.updateContent(finalResult, false);
			
			new Notice(this.plugin.i18n.t('ui.speedReadingComplete'));
		} catch (error) {
			Logger.error('[SpeedReading] Streaming error:', error);
			throw error;
		} finally {
			this.isStreaming = false;
		}
	}

	/**
	 * Parse node-based mindmap format into jsMind structure
	 * Each line is a separate JSON node: {"id":"root","topic":"Topic"}
	 */
	private parseNodeBasedMindMap(rawText: string): string | null {
		if (!rawText) return null;
		
		const nodes: any[] = [];
		const jsonRegex = /\{[\s\S]*?\}/g;
		const matches = rawText.match(jsonRegex);
		
		if (matches) {
			for (const match of matches) {
				try {
					const node = JSON.parse(match);
					if (node.id && node.topic) {
						nodes.push(node);
					}
				} catch (e) {
					// Ignore parse failures
				}
			}
		}
		
		if (nodes.length === 0) return null;
		
		if (nodes.length !== this.lastParsedNodeCount) {
			Logger.debug(`[MindMap] Parsed ${nodes.length} nodes`);
			this.lastParsedNodeCount = nodes.length;
		}
		return this.convertNodesToJsMindTree(nodes);
	}
	
	/**
	 * Convert flat node array to jsMind tree structure
	 */
	private convertNodesToJsMindTree(nodes: any[]): string {
		// Find root node
		const root = nodes.find(n => n.id === 'root' || !n.parentid);
		if (!root) {
			return JSON.stringify({
				meta: {
					name: 'Speed Reading Mind Map',
					author: 'LLMSider',
					version: '1.0'
				},
				format: 'node_tree',
				data: { id: 'root', topic: 'Unknown', children: [] }
			});
		}
		
		// Build tree recursively
		// depth 0 = root, depth 1 = root's children (need direction), depth 2+ = grandchildren (no direction)
		const buildTree = (nodeId: string, depth: number = 0): any => {
			const node = nodes.find(n => n.id === nodeId);
			if (!node) return null;
			
			const children = nodes
				.filter(n => n.parentid === nodeId)
				.map(child => buildTree(child.id, depth + 1))
				.filter(c => c !== null);
			
			const result: any = {
				id: node.id,
				topic: node.topic
			};
			
			// Only set isroot for the root node (depth 0)
			if (depth === 0) {
				result.isroot = true;
			}
			
			if (children.length > 0) {
				result.children = children;
			}
			
			// Only add direction for root's direct children (depth 1)
			if (depth === 1 && node.direction) {
				result.direction = node.direction;
			}
			
			return result;
		};
		
		const tree = buildTree(root.id, 0);
		
		const result = {
			meta: {
				name: 'Speed Reading Mind Map',
				author: 'LLMSider',
				version: '1.0'
			},
			format: 'node_tree',
			data: tree
		};
		
		const jsonStr = JSON.stringify(result, null, 2);
		if (jsonStr.length !== this.lastParsedMindMapLength) {
			this.lastParsedMindMapLength = jsonStr.length;
		}
		return jsonStr;
	}

	/**
	 * Parse LLM response
	 */
	private parseResponse(response: string): {
		summary: string;
		keyPoints: string[];
		mindMap: string;
		extendedReading: string[];
		guessYouCareAbout: string[];
	} {
		const keyPoints: string[] = [];
		let summary = '';
		let mindMap = '';
		const extendedReading: string[] = [];
		const guessYouCareAbout: string[] = [];

		// Extract key points (support both Chinese and English)
		const keyPointsMatch = response.match(/## (核心要点|Core Points)\s*([\s\S]*?)(?=##|$)/i);
		if (keyPointsMatch) {
			const points = keyPointsMatch[2].trim().split('\n');
			points.forEach(point => {
				const cleaned = point.trim().replace(/^[-*]\s*/, '');
				if (cleaned) keyPoints.push(cleaned);
			});
		}

		// Extract summary (support both Chinese and English)
		const summaryMatch = response.match(/## (内容总结|Content Summary)\s*([\s\S]*?)(?=##|$)/i);
		if (summaryMatch) {
			summary = summaryMatch[2].trim();
		}

		// Extract knowledge structure (node-based mind map, support both Chinese and English)
		const mindMapMatch = response.match(/## (知识结构|Knowledge Structure)\s*([\s\S]*?)(?=##|$)/i);
		if (mindMapMatch) {
			const rawMindMap = mindMapMatch[2].trim().replace(/```[\s\S]*?```/g, '').trim();
			// Parse individual node JSONs and construct jsMind data structure
			mindMap = this.parseNodeBasedMindMap(rawMindMap);
			if (!mindMap) {
				Logger.debug('[MindMap] Failed to parse node-based mindMap');
			}
		} else {
			// Debug: log all section headers found in response
			const headers = response.match(/##\s+[^\n]+/g);
			Logger.debug('[MindMap] No mindMap section found. Available sections:', headers);
			Logger.debug('[MindMap] Response preview:', response.substring(0, 500));
		}

		// Extract extended reading (support both Chinese and English)
		const extendedMatch = response.match(/## (拓展阅读建议|Extended Reading Suggestions)\s*([\s\S]*?)(?=##|$)/i);
		if (extendedMatch) {
			const readings = extendedMatch[2].trim().split('\n');
			readings.forEach(reading => {
				const cleaned = reading.trim().replace(/^[-*]\s*/, '').replace(/^\[|\]$/g, '');
				if (cleaned) extendedReading.push(cleaned);
			});
		}

		// Extract guess you care about (support both Chinese and English)
		const guessMatch = response.match(/## (猜你关注|You Might Be Interested In)\s*([\s\S]*?)(?=##|$)/i);
		if (guessMatch) {
			const guesses = guessMatch[2].trim().split('\n');
			guesses.forEach(guess => {
				const cleaned = guess.trim().replace(/^[-*]\s*/, '').replace(/^\[|\]$/g, '');
				// Skip lines that look like context explanations
				if (cleaned && !cleaned.startsWith('基于') && !cleaned.startsWith('Based on')) {
					guessYouCareAbout.push(cleaned);
				}
			});
		}

		return { summary, keyPoints, mindMap, extendedReading, guessYouCareAbout };
	}

	/**
	 * Save result to database
	 */
	private async saveResult(result: SpeedReadingResult): Promise<void> {
		const db = this.plugin.configDb;
		if (!db || !db['db']) {
			throw new Error('Database not initialized');
		}

		try {
			const sqlDb = db['db'];
			sqlDb.run(
				`INSERT OR REPLACE INTO speed_reading_results 
				(id, note_title, note_path, summary, key_points, mind_map, extended_reading, guess_you_care_about, created_at, updated_at) 
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					result.id,
					result.noteTitle,
					result.notePath,
					result.summary || '',
					JSON.stringify(result.keyPoints || []),
					result.mindMap || '',
					JSON.stringify(result.extendedReading || []),
					JSON.stringify(result.guessYouCareAbout || []),
					result.createdAt,
					result.updatedAt
				]
			);
			
			// Save database to disk
			await db.saveToFileImmediate();
		} catch (error) {
			Logger.error('[SpeedReading] Error saving result:', error);
			throw new Error(this.plugin.i18n.t('ui.speedReadingSaveFailed') + ': ' + (error instanceof Error ? error.message : String(error)));
		}
	}

	/**
	 * Get speed reading result by note path
	 */
	async getSpeedReadingResult(notePath: string): Promise<SpeedReadingResult | null> {
		const db = this.plugin.configDb;
		if (!db || !db['db']) return null;

		try {
			const sqlDb = db['db'];
			const stmt = sqlDb.prepare(
				'SELECT * FROM speed_reading_results WHERE note_path = ? ORDER BY updated_at DESC LIMIT 1'
			);
			stmt.bind([notePath]);
			
			if (!stmt.step()) {
				stmt.free();
				return null;
			}
			
			const row = stmt.getAsObject();
			stmt.free();

			return {
				id: row.id as string,
				noteTitle: row.note_title as string,
				notePath: row.note_path as string,
				summary: (row.summary as string) || '',
				keyPoints: row.key_points ? JSON.parse(row.key_points as string) : [],
				mindMap: (row.mind_map as string) || '',
				extendedReading: row.extended_reading ? JSON.parse(row.extended_reading as string) : [],
				guessYouCareAbout: row.guess_you_care_about ? JSON.parse(row.guess_you_care_about as string) : [],
				createdAt: (row.created_at as number) || Date.now(),
				updatedAt: (row.updated_at as number) || Date.now()
			};
		} catch (error) {
			Logger.error('[SpeedReading] Error getting result:', error);
			return null;
		}
	}

	/**
	 * Show result in drawer
	 */
	private showResult(result: SpeedReadingResult): void {
		Logger.debug('[SpeedReading] showResult called, drawer exists:', !!this.drawer);
		if (this.drawer) {
			Logger.debug('[SpeedReading] Opening drawer with result');
			this.drawer.open(result);
		} else {
			Logger.error('[SpeedReading] Cannot show result: drawer not initialized');
			new Notice(this.plugin.i18n.t('ui.speedReadingDrawerInitFailed'));
		}
	}

	/**
	 * Initialize database table
	 */
	static async initializeDatabase(db: any): Promise<void> {
		if (!db || !db['db']) {
			throw new Error('Database not initialized');
		}
		
		try {
			const sqlDb = db['db'];
			
			// Check if table exists
			const tableExists = sqlDb.exec(`
				SELECT name FROM sqlite_master 
				WHERE type='table' AND name='speed_reading_results'
			`);
			
			if (tableExists.length === 0) {
				// Create new table with all columns including guess_you_care_about
				sqlDb.run(`
					CREATE TABLE IF NOT EXISTS speed_reading_results (
						id TEXT PRIMARY KEY,
						note_title TEXT NOT NULL,
						note_path TEXT NOT NULL,
						summary TEXT,
						key_points TEXT,
						mind_map TEXT,
						extended_reading TEXT,
						guess_you_care_about TEXT,
						created_at INTEGER,
						updated_at INTEGER
					)
				`);
				
				// Create index for faster lookups
				sqlDb.run(`
					CREATE INDEX IF NOT EXISTS idx_speed_reading_note_path 
					ON speed_reading_results(note_path)
				`);
				
				await db.saveToFileImmediate();
				Logger.debug('[SpeedReading] Database table created with all columns');
			} else {
				// Table exists, check if guess_you_care_about column exists (migration)
				const columnCheck = sqlDb.exec(`PRAGMA table_info(speed_reading_results)`);
				const columns = columnCheck[0]?.values || [];
				const hasGuessColumn = columns.some((col: any[]) => col[1] === 'guess_you_care_about');
				
				if (!hasGuessColumn) {
					Logger.debug('[SpeedReading] Adding guess_you_care_about column (migration)...');
					sqlDb.run(`ALTER TABLE speed_reading_results ADD COLUMN guess_you_care_about TEXT`);
					await db.saveToFileImmediate();
					Logger.debug('[SpeedReading] Database migration completed');
				}
			}
		} catch (error) {
			Logger.error('[SpeedReading] Error initializing database:', error);
			throw error;
		}
	}
}
