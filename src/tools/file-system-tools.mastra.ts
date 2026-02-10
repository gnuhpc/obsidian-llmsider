/**
 * File System Tools - Mastra Format
 * Tools using Obsidian FileSystemAdapter API
 */

import { z } from 'zod';
import { Logger } from '../utils/logger';
import { FileSystemAdapter, normalizePath } from 'obsidian';
import { createMastraTool } from './tool-converter';
import type { MastraTool } from './mastra-tool-types';

// Import shared functions
let getApp: () => unknown;

// These will be injected by the main built-in-tools module
export function setSharedFunctions(shared: {
	getApp: () => unknown;
}) {
	getApp = shared.getApp;
}

/**
 * Check file existence using FileSystemAdapter
 */
export const fileExistsTool: MastraTool = createMastraTool({
	id: 'file_exists',
	description: 'Check if a file exists using FileSystemAdapter with case sensitivity option',
	category: 'note-management',
	
	inputSchema: z.object({
		filePath: z.string().describe('File path to check'),
		caseSensitive: z.boolean().optional().default(true).describe('Case-sensitive check (default: true)')
	}),
	
	outputSchema: z.object({
		success: z.boolean().describe('Operation success status'),
		filePath: z.string().describe('Checked file path'),
		normalizedPath: z.string().describe('Normalized path'),
		exists: z.boolean().describe('Whether file exists'),
		caseSensitive: z.boolean().describe('Whether case sensitive'),
		message: z.string().describe('Result message')
	}),
	
	execute: async ({ context }) => {
		try {
			const app = getApp() as any;
			const adapter = app.vault.adapter;

			if (!(adapter instanceof FileSystemAdapter)) {
				throw new Error('FileSystemAdapter not available (desktop only feature)');
			}

			const normalizedPath = normalizePath(context.filePath);
			const caseSensitive = context.caseSensitive ?? true;
			const exists = await adapter.exists(normalizedPath, caseSensitive);

			return {
				success: true,
				message: `Checked existence for ${context.filePath}`,
				filePath: context.filePath,
				normalizedPath,
				exists,
				caseSensitive
			};
		} catch (error) {
			Logger.error('Error in file_exists tool:', error);
			throw error;
		}
	}
});

/**
 * List directory contents using FileSystemAdapter
 */
export const listDirectoryTool: MastraTool = createMastraTool({
	id: 'list_file_directory',
	description: 'List all folders and files in a directory using FileSystemAdapter. Returns both subdirectories and files with optional detailed statistics (size, modification time). Use this to browse vault structure, discover existing files, or check directory contents before file operations.',
	category: 'note-management',
	
	inputSchema: z.object({
		directoryPath: z.string()
			.optional()
			.default('')
			.describe('Path to directory to list. Use empty string "" or omit for vault root directory. Returns both folders and files in the specified path.'),
		includeStats: z.boolean()
			.optional()
			.default(false)
			.describe('Whether to include detailed file statistics (size, modified date, type) for each file')
	}),
	
	outputSchema: z.object({
		success: z.boolean().describe('Whether the operation succeeded'),
		message: z.string().describe('Status message'),
		directoryPath: z.string().describe('The directory path that was listed'),
		listing: z.object({
			folders: z.array(z.string()).describe('Array of folder paths'),
			files: z.union([
				z.array(z.string()),
				z.array(z.object({
					name: z.string(),
					size: z.number().optional(),
					modified: z.number().optional(),
					type: z.string().optional(),
					error: z.string().optional()
				}))
			]).describe('Array of file paths or file objects (with stats if includeStats=true)')
		}).describe('Directory contents organized by type'),
		fileCount: z.number().describe('Total number of files'),
		folderCount: z.number().describe('Total number of folders')
	}),
	
	execute: async ({ context }) => {
		try {
			const app = getApp() as any;
			const adapter = app.vault.adapter;

			if (!(adapter instanceof FileSystemAdapter)) {
				throw new Error('FileSystemAdapter not available (desktop only feature)');
			}

			const normalizedPath = normalizePath(context.directoryPath || '');
			const listing = await adapter.list(normalizedPath);

			let detailedListing: any = {
				folders: listing.folders,
				files: listing.files
			};

			if (context.includeStats) {
				const filesWithStats = [];
				for (const file of listing.files) {
					try {
						const filePath = normalizedPath ? `${normalizedPath}/${file}` : file;
						const stats = await adapter.stat(filePath);
						filesWithStats.push({
							name: file,
							size: stats?.size || 0,
							modified: stats?.mtime || 0,
							type: stats?.type || 'file'
						});
					} catch (error) {
						filesWithStats.push({
							name: file,
							error: 'Could not get stats'
						});
					}
				}
				detailedListing.files = filesWithStats;
			}

			return {
				success: true,
				message: `Listed directory contents for ${normalizedPath || 'root'}`,
				directoryPath: normalizedPath,
				listing: detailedListing,
				fileCount: listing.files.length,
				folderCount: listing.folders.length
			};
		} catch (error) {
			Logger.error('Error in list_file_directory tool:', error);
			throw error;
		}
	}
});

/**
 * Copy file using FileSystemAdapter
 */
export const copyFileTool: MastraTool = createMastraTool({
	id: 'copy_file',
	description: 'Copy a file to a new location using FileSystemAdapter',
	category: 'note-management',
	
	inputSchema: z.object({
		sourcePath: z.string().describe('Source file path to copy from'),
		targetPath: z.string().describe('Target file path to copy to'),
		overwrite: z.boolean()
			.optional()
			.default(false)
			.describe('Whether to overwrite existing target file')
	}),
	
	outputSchema: z.object({
		success: z.boolean().describe('Whether copy succeeded'),
		sourcePath: z.string().describe('Source file path'),
		targetPath: z.string().describe('Target file path'),
		normalizedSource: z.string().describe('Normalized source path'),
		normalizedTarget: z.string().describe('Normalized target path'),
		overwrite: z.boolean().describe('Whether existing file was overwritten'),
		message: z.string().describe('Result message')
	}),
	
	execute: async ({ context }) => {
		try {
			const app = getApp() as any;
			const adapter = app.vault.adapter;

			if (!(adapter instanceof FileSystemAdapter)) {
				throw new Error('FileSystemAdapter not available (desktop only feature)');
			}

			const normalizedSource = normalizePath(context.sourcePath);
			const normalizedTarget = normalizePath(context.targetPath);

			// Check if source exists
			const sourceExists = await adapter.exists(normalizedSource);
			if (!sourceExists) {
				throw new Error(`Source file not found: ${context.sourcePath}`);
			}

			// Check if target exists and handle overwrite
			const targetExists = await adapter.exists(normalizedTarget);
			if (targetExists && !context.overwrite) {
				throw new Error(`Target file already exists: ${context.targetPath}. Set overwrite=true to replace it.`);
			}

			// Create target directory if needed
			const targetDir = normalizedTarget.substring(0, normalizedTarget.lastIndexOf('/'));
			if (targetDir && !(await adapter.exists(targetDir))) {
				await adapter.mkdir(targetDir);
			}

			await adapter.copy(normalizedSource, normalizedTarget);

			return {
				success: true,
				message: `Successfully copied ${context.sourcePath} to ${context.targetPath}`,
				sourcePath: context.sourcePath,
				targetPath: context.targetPath,
				normalizedSource,
				normalizedTarget,
				overwrite: context.overwrite || false
			};
		} catch (error) {
			Logger.error('Error in copy_file tool:', error);
			throw error;
		}
	}
});
