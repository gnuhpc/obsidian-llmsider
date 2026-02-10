import { EditorSuggest, Editor, TFile, EditorPosition, EditorSuggestTriggerInfo, EditorSuggestContext } from 'obsidian';
import LLMSiderPlugin from '../main';

interface FileSuggestion {
	file: TFile;
	displayText: string;
	path: string;
}

export class FileReferenceSuggest extends EditorSuggest<FileSuggestion> {
	private plugin: LLMSiderPlugin;

	constructor(plugin: LLMSiderPlugin) {
		super(plugin.app);
		this.plugin = plugin;
	}

	onTrigger(cursor: EditorPosition, editor: Editor, file: TFile): EditorSuggestTriggerInfo | null {
		// 获取当前行文本
		const line = editor.getLine(cursor.line);
		const beforeCursor = line.substring(0, cursor.ch);
		
		// 检查是否在"@"后面
		const atIndex = beforeCursor.lastIndexOf('@');
		if (atIndex === -1) {
			return null;
		}
		
		// 确保@是在单词边界上（空格后或行首）
		const charBeforeAt = atIndex > 0 ? beforeCursor[atIndex - 1] : ' ';
		if (charBeforeAt !== ' ' && charBeforeAt !== '\n' && charBeforeAt !== '\t') {
			return null;
		}

		// 获取@后的查询文本
		const query = beforeCursor.substring(atIndex + 1);
		
		// 如果查询文本包含空格，则不触发（说明用户不是在引用文件）
		if (query.includes(' ')) {
			return null;
		}

		return {
			start: { line: cursor.line, ch: atIndex },
			end: cursor,
			query: query
		};
	}

	async getSuggestions(context: EditorSuggestContext & { query: string }): Promise<FileSuggestion[]> {
		const query = context.query.toLowerCase();
		const files = this.app.vault.getFiles(); // 获取所有文件，不仅仅是markdown文件
		
		// 过滤和排序文件
		const suggestions: FileSuggestion[] = [];
		
		for (const file of files) {
			// 跳过当前文件
			if (file === context.file) {
				continue;
			}

			const fileName = file.basename.toLowerCase();
			const filePath = file.path.toLowerCase();
			
			// 匹配文件名或路径
			if (fileName.includes(query) || filePath.includes(query)) {
				const suggestion: FileSuggestion = {
					file: file,
					displayText: file.basename,
					path: file.path
				};
				suggestions.push(suggestion);
			}
		}

		// 按相关性排序
		suggestions.sort((a, b) => {
			const aNameMatch = a.file.basename.toLowerCase().startsWith(query.toLowerCase());
			const bNameMatch = b.file.basename.toLowerCase().startsWith(query.toLowerCase());
			
			if (aNameMatch && !bNameMatch) return -1;
			if (!aNameMatch && bNameMatch) return 1;
			
			// 如果都匹配或都不匹配，按字母顺序排序
			return a.file.basename.localeCompare(b.file.basename);
		});

		// 限制结果数量
		return suggestions.slice(0, 15); // 增加显示数量以容纳更多文件类型
	}

	renderSuggestion(suggestion: FileSuggestion, el: HTMLElement): void {
		const container = el.createDiv({ cls: 'file-reference-suggestion' });
		
		// 文件图标
		const iconEl = container.createDiv({ cls: 'file-reference-icon' });
		iconEl.innerHTML = this.getFileIconSVG(suggestion.file);
		
		// 文件信息容器
		const infoEl = container.createDiv({ cls: 'file-reference-info' });
		
		// 文件名
		const nameEl = infoEl.createDiv({ cls: 'file-reference-name' });
		nameEl.textContent = suggestion.displayText;
		
		// 文件扩展名（如果不是markdown）
		if (suggestion.file.extension !== 'md') {
			const extEl = nameEl.createSpan({ cls: 'file-reference-ext' });
			extEl.textContent = `.${suggestion.file.extension}`;
		}
		
		// 文件路径（如果不是根目录）
		if (suggestion.file.parent && suggestion.file.parent.path !== '/') {
			const pathEl = infoEl.createDiv({ cls: 'file-reference-path' });
			pathEl.textContent = suggestion.file.parent.path;
		}
	}

	/**
	 * 根据文件扩展名返回相应的SVG图标
	 */
	private getFileIconSVG(file: TFile): string {
		const ext = file.extension.toLowerCase();
		
		// 图片类型
		if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp'].includes(ext)) {
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
				<circle cx="8.5" cy="8.5" r="1.5"></circle>
				<polyline points="21 15 16 10 5 21"></polyline>
			</svg>`;
		}
		
		// PDF文档
		if (['pdf'].includes(ext)) {
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
				<polyline points="14 2 14 8 20 8"></polyline>
				<path d="M10 12h4"></path>
				<path d="M10 16h4"></path>
			</svg>`;
		}
		
		// 电子表格
		if (['xls', 'xlsx', 'xlsb', 'xlsm', 'xltx', 'ods', 'ots', 'csv'].includes(ext)) {
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M3 3v18h18"></path>
				<path d="M18 17V9"></path>
				<path d="M13 17V5"></path>
				<path d="M8 17v-3"></path>
			</svg>`;
		}
		
		// 代码文件
		if (['js', 'ts', 'jsx', 'tsx', 'json', 'py', 'java', 'kt', 'cpp', 'c', 'h', 'go', 'rs', 'php', 'rb', 'swift', 'css', 'scss', 'less'].includes(ext)) {
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="16 18 22 12 16 6"></polyline>
				<polyline points="8 6 2 12 8 18"></polyline>
			</svg>`;
		}
		
		// 音频文件
		if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) {
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M9 18V5l12-2v13"></path>
				<circle cx="6" cy="18" r="3"></circle>
				<circle cx="18" cy="16" r="3"></circle>
			</svg>`;
		}
		
		// 视频文件
		if (['mp4', 'avi', 'mkv', 'mov', 'wmv'].includes(ext)) {
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polygon points="23 7 16 12 23 17 23 7"></polygon>
				<rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
			</svg>`;
		}
		
		// 压缩文件
		if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
				<polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline>
				<polyline points="7.5 19.79 7.5 14.6 3 12"></polyline>
				<polyline points="21 12 16.5 14.6 16.5 19.79"></polyline>
				<polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
				<line x1="12" y1="22.08" x2="12" y2="12"></line>
			</svg>`;
		}
		
		// HTML/网页文件
		if (['html', 'htm'].includes(ext)) {
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="10"></circle>
				<line x1="2" y1="12" x2="22" y2="12"></line>
				<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
			</svg>`;
		}
		
		// Markdown和文本文件
		if (['md', 'markdown', 'txt'].includes(ext)) {
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
				<polyline points="14 2 14 8 20 8"></polyline>
				<line x1="16" y1="13" x2="8" y2="13"></line>
				<line x1="16" y1="17" x2="8" y2="17"></line>
				<polyline points="10 9 9 9 8 9"></polyline>
			</svg>`;
		}
		
		// 默认文件图标
		return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
			<polyline points="14 2 14 8 20 8"></polyline>
		</svg>`;
	}

	/**
	 * 根据文件扩展名返回相应的图标（已弃用，保留用于向后兼容）
	 * @deprecated 使用 getFileIconSVG 替代
	 */
	private getFileIcon(file: TFile): string {
		const ext = file.extension.toLowerCase();
		
		// 文档类型
		if (['pdf'].includes(ext)) return '📕';
		if (['doc', 'docx'].includes(ext)) return '📄';
		if (['odt', 'ott', 'rtf'].includes(ext)) return '📝';
		
		// 电子表格
		if (['xls', 'xlsx', 'xlsb', 'xlsm', 'xltx', 'ods', 'ots'].includes(ext)) return '📊';
		if (['csv'].includes(ext)) return '📋';
		
		// 演示文稿
		if (['pptx', 'potx', 'odp', 'otp'].includes(ext)) return '📊';
		
		// 图片
		if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp'].includes(ext)) return '🖼️';
		if (['odg', 'otg'].includes(ext)) return '🎨';
		
		// 网页和标记
		if (['html', 'htm'].includes(ext)) return '🌐';
		if (['xml', 'xsl'].includes(ext)) return '📰';
		if (['atom', 'rss'].includes(ext)) return '📡';
		if (['epub'].includes(ext)) return '📖';
		
		// 文本和代码
		if (['md', 'markdown'].includes(ext)) return '📄';
		if (['txt'].includes(ext)) return '📃';
		if (['js', 'ts', 'jsx', 'tsx'].includes(ext)) return '⚡';
		if (['json'].includes(ext)) return '🔧';
		if (['css', 'scss', 'less'].includes(ext)) return '🎨';
		if (['py'].includes(ext)) return '🐍';
		if (['java', 'kt'].includes(ext)) return '☕';
		if (['cpp', 'c', 'h'].includes(ext)) return '⚙️';
		if (['go'].includes(ext)) return '🐹';
		if (['rs'].includes(ext)) return '🦀';
		if (['php'].includes(ext)) return '🐘';
		if (['rb'].includes(ext)) return '💎';
		if (['swift'].includes(ext)) return '🐦';
		
		// CAD
		if (['dxf'].includes(ext)) return '📐';
		
		// 音频视频
		if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) return '🎵';
		if (['mp4', 'avi', 'mkv', 'mov', 'wmv'].includes(ext)) return '🎬';
		
		// 压缩文件
		if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '📦';
		
		// 默认文件图标
		return '📄';
	}

	selectSuggestion(suggestion: FileSuggestion): void {
		const editor = this.context?.editor;
		if (!editor) return;

		const cursor = editor.getCursor();
		const line = editor.getLine(cursor.line);
		const beforeCursor = line.substring(0, cursor.ch);
		
		// 找到@的位置
		const atIndex = beforeCursor.lastIndexOf('@');
		if (atIndex === -1) return;

		// 构建文件引用文本
		const fileRef = `@[[${suggestion.file.path}]]`;
		
		// 替换@和查询文本
		editor.replaceRange(
			fileRef,
			{ line: cursor.line, ch: atIndex },
			cursor
		);
		
		// 将光标移动到引用后面
		const newCursor = { 
			line: cursor.line, 
			ch: atIndex + fileRef.length 
		};
		editor.setCursor(newCursor);

		// 通知聊天视图添加文件上下文
		this.notifyChatViewFileReference(suggestion.file);
	}

	private notifyChatViewFileReference(file: TFile): void {
		// 查找聊天视图并通知文件引用
		const chatLeaves = this.app.workspace.getLeavesOfType('llmsider-chat-view');
		if (chatLeaves.length > 0) {
			const chatView = chatLeaves[0].view as unknown;
			if (chatView.addFileReference) {
				chatView.addFileReference(file);
			}
		}
	}

	// 清理方法
	destroy(): void {
		this.close();
	}
}