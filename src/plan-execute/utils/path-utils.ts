import { App } from 'obsidian';
import { Logger } from '../../utils/logger';

/**
 * Path utility functions for Plan-Execute processor
 * Handles file path normalization and validation
 */
export class PathUtils {
	/**
	 * Normalize file path to be relative to vault root
	 * Handles both absolute paths and simple filenames
	 */
	static normalizeFilePath(path: string, app: App): string {
		if (!path || typeof path !== 'string') {
			return path;
		}

		// If already a valid vault path, return as-is
		const existingFile = app.vault.getAbstractFileByPath(path);
		if (existingFile) {
			return path;
		}

		// Try to find file by filename only
		const fileName = path.split('/').pop() || path;
		const allFiles = app.vault.getMarkdownFiles();

		for (const file of allFiles) {
			if (file.name === fileName || file.basename === fileName) {
				Logger.debug(`Normalized path "${path}" to "${file.path}"`);
				return file.path;
			}
		}

		// If not found, return original path (will fail with proper error message)
		Logger.warn(`Could not normalize path: ${path}`);
		return path;
	}

	/**
	 * Normalize file paths in tool input arguments
	 * Applies to tools that work with files (view, create, str_replace, insert, etc.)
	 */
	static normalizeFilePathsInInput(toolName: string, input: any, app: App): any {
		// Tools that work with file paths
		const fileTools = ['view', 'create', 'str_replace', 'insert', 'append',
			'list_directory', 'sed', 'undo_edit', 'move_file', 'trash_file'];

		if (!fileTools.includes(toolName)) {
			return input;
		}

		if (!input || typeof input !== 'object') {
			return input;
		}

		// Clone input to avoid mutation
		const normalizedInput = { ...input };

		// Normalize 'path' field if present
		if (normalizedInput.path && typeof normalizedInput.path === 'string') {
			const originalPath = normalizedInput.path;
			normalizedInput.path = this.normalizeFilePath(normalizedInput.path, app);
			if (normalizedInput.path !== originalPath) {
				Logger.debug(`Normalized path field: "${originalPath}" -> "${normalizedInput.path}"`);
			}
		}

		// Normalize 'file_path' field if present (alternative naming)
		if (normalizedInput.file_path && typeof normalizedInput.file_path === 'string') {
			const originalPath = normalizedInput.file_path;
			normalizedInput.file_path = this.normalizeFilePath(normalizedInput.file_path, app);
			if (normalizedInput.file_path !== originalPath) {
				Logger.debug(`Normalized file_path field: "${originalPath}" -> "${normalizedInput.file_path}"`);
			}
		}

		// Normalize 'filePath' field if present (for trash_file)
		if (normalizedInput.filePath && typeof normalizedInput.filePath === 'string') {
			const originalPath = normalizedInput.filePath;
			normalizedInput.filePath = this.normalizeFilePath(normalizedInput.filePath, app);
			if (normalizedInput.filePath !== originalPath) {
				Logger.debug(`Normalized filePath field: "${originalPath}" -> "${normalizedInput.filePath}"`);
			}
		}

		// Normalize 'oldPath' field if present (for move_file)
		if (normalizedInput.oldPath && typeof normalizedInput.oldPath === 'string') {
			const originalPath = normalizedInput.oldPath;
			normalizedInput.oldPath = this.normalizeFilePath(normalizedInput.oldPath, app);
			if (normalizedInput.oldPath !== originalPath) {
				Logger.debug(`Normalized oldPath field: "${originalPath}" -> "${normalizedInput.oldPath}"`);
			}
		}

		// Normalize 'newPath' field if present (for move_file)
		if (normalizedInput.newPath && typeof normalizedInput.newPath === 'string') {
			const originalPath = normalizedInput.newPath;
			normalizedInput.newPath = this.normalizeFilePath(normalizedInput.newPath, app);
			if (normalizedInput.newPath !== originalPath) {
				Logger.debug(`Normalized newPath field: "${originalPath}" -> "${normalizedInput.newPath}"`);
			}
		}

		return normalizedInput;
	}

	/**
	 * Helper function to escape special regex characters
	 */
	static escapeRegExp(string: string): string {
		return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}
}
