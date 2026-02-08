/**
 * Note Management Tools (Mastra Format)
 * 
 * Provides operations for moving, renaming, deleting, merging, and copying notes
 * Core Obsidian functionality for managing vault notes
 */

import { z } from 'zod';
import { App, TFile, TFolder, Notice } from 'obsidian';
import { createMastraTool } from './tool-converter';

let globalApp: App | null = null;
let globalGetPlugin: (() => any) | null = null;

export function setSharedFunctions(functions: {
	getApp: () => App;
	getPlugin: () => any;
}) {
	globalApp = functions.getApp();
	globalGetPlugin = functions.getPlugin;
}

function getApp(): App {
	if (!globalApp) {
		throw new Error('App instance not initialized. Call setSharedFunctions() first.');
	}
	return globalApp;
}

function getPlugin(): any {
	return globalGetPlugin ? globalGetPlugin() : null;
}

/**
 * Tool: Move one or multiple notes to a different folder
 */
export const moveNoteTool = createMastraTool({
  category: 'note-management',
	id: 'move_note',
	description: 'Move one or multiple notes to a different folder in the vault. Supports batch operations to move multiple files at once.',
	
	inputSchema: z.object({
		source_paths: z.union([
			z.string().describe('Single note path to move'),
			z.array(z.string()).describe('Array of note paths to move for batch operations')
		]).describe('Path(s) of the note(s) to move'),
		target_folder: z.string()
			.describe('Target folder path (e.g., "archive" or "projects/2024"). Use empty string for vault root.')
	}).describe('Tool input parameters'),
	outputSchema: z.string().describe('Note move operation result'),
	
	execute: async ({ context }) => {
		const app = getApp();
		const paths = Array.isArray(context.source_paths) ? context.source_paths : [context.source_paths];
		const targetFolder = context.target_folder.trim() || '';
		
		if (paths.length === 0) {
			throw new Error('No source paths provided');
		}
		
		// Ensure target folder exists
		if (targetFolder) {
			const existingFolder = app.vault.getAbstractFileByPath(targetFolder);
			if (!existingFolder) {
				await app.vault.createFolder(targetFolder);
			}
		}
		
		const results: { success: string[]; failed: { path: string; error: string }[] } = {
			success: [],
			failed: []
		};
		
		// Move files sequentially with delays to prevent UI blocking
		for (const sourcePath of paths) {
			try {
				const sourceFile = app.vault.getAbstractFileByPath(sourcePath);
				if (!(sourceFile instanceof TFile)) {
					results.failed.push({
						path: sourcePath,
						error: 'File not found'
					});
					continue;
				}
				
				const fileName = sourceFile.name;
				const newPath = targetFolder ? `${targetFolder}/${fileName}` : fileName;
				
				// Check if target already exists
				const existingFile = app.vault.getAbstractFileByPath(newPath);
				if (existingFile && existingFile.path !== sourceFile.path) {
					results.failed.push({
						path: sourcePath,
						error: `Target file already exists: ${newPath}`
					});
					continue;
				}
				
				await app.fileManager.renameFile(sourceFile, newPath);
				await new Promise(resolve => setTimeout(resolve, 50));
				
				results.success.push(sourcePath);
			} catch (error: unknown) {
				results.failed.push({
					path: sourcePath,
					error: (error as any).message
				});
			}
		}
		
		// Build result message
		const messages: string[] = [];
		const targetDesc = targetFolder || 'root';
	const plugin = getPlugin();
	const i18n = plugin?.getI18nManager();
	
	if (results.success.length > 0) {
		if (results.success.length === 1) {
			const fileName = results.success[0].split('/').pop() || results.success[0];
			new Notice(i18n?.t('ui.noteMoved', { fileName, targetDesc }) || `Moved "${fileName}" to "${targetDesc}"`);
			messages.push(`Successfully moved 1 note to "${targetDesc}":`);
		} else {
			new Notice(i18n?.t('ui.notesMoved', { count: results.success.length, targetDesc }) || `Moved ${results.success.length} notes to "${targetDesc}"`);
			messages.push(`Successfully moved ${results.success.length} notes to "${targetDesc}":`);
		}
		messages.push(...results.success.map(path => `  ✓ ${path}`));
	}
	}
});

/**
 * Tool: Rename a note
 */
export const renameNoteTool = createMastraTool({
  category: 'note-management',
	id: 'rename_note',
	description: 'Rename a note and automatically update all links to it in other notes.',
	
	inputSchema: z.object({
		source_path: z.string()
			.min(1)
			.describe('Current path of the note'),
		new_name: z.string()
			.min(1)
			.describe('New name for the note (without .md extension)')
	}).describe('Tool input parameters'),
	outputSchema: z.string().describe('Note rename operation result'),
	
	execute: async ({ context }) => {
		const app = getApp();
		const { source_path, new_name } = context;
		
		const sourceFile = app.vault.getAbstractFileByPath(source_path);
		if (!(sourceFile instanceof TFile)) {
			throw new Error(`Source file not found: ${source_path}`);
		}
		
		// Ensure new name has .md extension
		const newFileName = new_name.endsWith('.md') ? new_name : `${new_name}.md`;
		
		// Construct new path (same folder, new name)
		const folderPath = sourceFile.parent?.path || '';
		const newPath = folderPath ? `${folderPath}/${newFileName}` : newFileName;
		
		// Check if target already exists
		const existingFile = app.vault.getAbstractFileByPath(newPath);
		if (existingFile) {
			throw new Error(`A note with name "${newFileName}" already exists in the same folder`);
		}
		
		// Rename file (this also updates links automatically)
		await app.fileManager.renameFile(sourceFile, newPath);
		const plugin = getPlugin();
		const i18n = plugin?.getI18nManager();
		new Notice(i18n?.t('ui.noteRenamed', { newFileName }) || `Renamed to "${newFileName}"`);
		return `Successfully renamed note from "${sourceFile.name}" to "${newFileName}". All links have been updated.`;
	}
});

/**
 * Tool: Delete a note or folder
 */
export const deleteNoteTool = createMastraTool({
  category: 'note-management',
	id: 'delete_note',
	description: 'Delete a note or folder by moving it to the system trash (can be recovered from trash). For folders, all contents will be deleted.',
	
	inputSchema: z.object({
		path: z.string()
			.min(1)
			.describe('Path of the note or folder to delete'),
		permanent: z.boolean()
			.describe('If true, delete permanently instead of moving to trash')
			.default(false)
	}).describe('Tool input parameters'),
	outputSchema: z.string().describe('Note deletion result'),
	
	execute: async ({ context }) => {
		const app = getApp();
		const { path, permanent } = context;
		
		const abstractFile = app.vault.getAbstractFileByPath(path);
		if (!abstractFile) {
			throw new Error(`File or folder not found: ${path}`);
		}
		
		const isFolder = abstractFile instanceof TFolder;
		const name = abstractFile.name;
		
		const plugin = getPlugin();
		const i18n = plugin?.getI18nManager();
		
		if (isFolder) {
			await app.vault.trash(abstractFile, permanent);
			if (permanent) {
				new Notice(i18n?.t('ui.folderDeletedPermanently', { name }) || `Permanently deleted folder "${name}"`);
				return `Successfully deleted folder "${path}" and all its contents permanently`;
			} else {
				new Notice(i18n?.t('ui.folderMovedToTrash', { name }) || `Moved folder "${name}" to trash`);
				return `Successfully moved folder "${path}" and all its contents to trash (can be recovered)`;
			}
		} else {
			await app.fileManager.trashFile(abstractFile as TFile);
			if (permanent) {
				new Notice(i18n?.t('ui.noteDeletedPermanently', { name }) || `Permanently deleted "${name}"`);
				return `Successfully deleted note "${path}" permanently`;
			} else {
				new Notice(i18n?.t('ui.noteMovedToTrash', { name }) || `Moved "${name}" to trash`);
				return `Successfully moved note "${path}" to trash (can be recovered)`;
			}
		}
	}
});

/**
 * Tool: Merge two notes
 */
export const mergeNotesTool = createMastraTool({
  category: 'note-management',
	id: 'merge_notes',
	description: 'Merge content from one note into another. The source note can optionally be deleted after merging.',
	
	inputSchema: z.object({
		source_path: z.string()
			.min(1)
			.describe('Path of the source note to merge from'),
		target_path: z.string()
			.min(1)
			.describe('Path of the target note to merge into'),
		position: z.enum(['top', 'bottom'])
			.describe('Where to insert source content')
			.default('bottom'),
		separator: z.string()
			.describe('Text to insert between merged content')
			.default('\n\n---\n\n'),
		delete_source: z.boolean()
			.describe('Delete source note after merging')
			.default(false)
	}).describe('Tool input parameters'),
	outputSchema: z.string().describe('Notes merge result'),
	
	execute: async ({ context }) => {
		const app = getApp();
		const { source_path, target_path, position, separator, delete_source } = context;
		
		const sourceFile = app.vault.getAbstractFileByPath(source_path);
		if (!(sourceFile instanceof TFile)) {
			throw new Error(`Source file not found: ${source_path}`);
		}
		
		const targetFile = app.vault.getAbstractFileByPath(target_path);
		if (!(targetFile instanceof TFile)) {
			throw new Error(`Target file not found: ${target_path}`);
		}
		
		// Read both files
		const sourceContent = await app.vault.read(sourceFile);
		const targetContent = await app.vault.read(targetFile);
		
		// Merge content
		const mergedContent = position === 'top'
			? `${sourceContent}${separator}${targetContent}`
			: `${targetContent}${separator}${sourceContent}`;
		
		// Write to target
		await app.vault.modify(targetFile, mergedContent);
		
		const plugin = getPlugin();
		const i18n = plugin?.getI18nManager();
		
		// Delete source if requested
		if (delete_source) {
			await app.fileManager.trashFile(sourceFile);
			new Notice(i18n?.t('ui.notesMergedWithDelete', { sourceName: sourceFile.name, targetName: targetFile.name }) || `Merged "${sourceFile.name}" into "${targetFile.name}" and deleted source`);
			return `Successfully merged "${source_path}" into "${target_path}" (source deleted)`;
		} else {
			new Notice(i18n?.t('ui.notesMerged', { sourceName: sourceFile.name, targetName: targetFile.name }) || `Merged "${sourceFile.name}" into "${targetFile.name}"`);
			return `Successfully merged "${source_path}" into "${target_path}" (source preserved)`;
		}
	}
});

/**
 * Tool: Copy a note
 */
export const copyNoteTool = createMastraTool({
  category: 'note-management',
	id: 'copy_note',
	description: 'Create a copy of a note with a new name and/or in a different folder.',
	
	inputSchema: z.object({
		source_path: z.string()
			.min(1)
			.describe('Path of the note to copy'),
		target_path: z.string()
			.min(1)
			.describe('Path for the new copy (including filename with .md extension)'),
		open_after_copy: z.boolean()
			.describe('Open the copied note after creation')
			.default(false)
	}).describe('Tool input parameters'),
	outputSchema: z.string().describe('Note copy operation result'),
	
	execute: async ({ context }) => {
		const app = getApp();
		const { source_path, target_path, open_after_copy } = context;
		
		const sourceFile = app.vault.getAbstractFileByPath(source_path);
		if (!(sourceFile instanceof TFile)) {
			throw new Error(`Source file not found: ${source_path}`);
		}
		
		// Check if target already exists
		const existingFile = app.vault.getAbstractFileByPath(target_path);
		if (existingFile) {
			throw new Error(`Target file already exists: ${target_path}`);
		}
		
		// Ensure target folder exists
		const targetFolderPath = target_path.substring(0, target_path.lastIndexOf('/'));
		if (targetFolderPath) {
			const existingFolder = app.vault.getAbstractFileByPath(targetFolderPath);
			if (!existingFolder) {
				await app.vault.createFolder(targetFolderPath);
			}
		}
		
		// Read source content
		const content = await app.vault.read(sourceFile);
		
		// Create copy
		const copiedFile = await app.vault.create(target_path, content);
		
		// Open if requested
		if (open_after_copy) {
			const leaf = app.workspace.getLeaf();
			await leaf.openFile(copiedFile);
			app.workspace.setActiveLeaf(leaf);
		}
		
		const plugin = getPlugin();
		const i18n = plugin?.getI18nManager();
		new Notice(i18n?.t('ui.noteCopied', { fileName: copiedFile.name }) || `Copied to "${copiedFile.name}"`);
		return `Successfully copied note from "${source_path}" to "${target_path}"${
			open_after_copy ? ' (opened)' : ''
		}`;
	}
});

/**
 * Tool: Duplicate a note
 */
export const duplicateNoteTool = createMastraTool({
  category: 'note-management',
	id: 'duplicate_note',
	description: 'Create a duplicate of a note in the same folder with " - Copy" suffix.',
	
	inputSchema: z.object({
		path: z.string()
			.min(1)
			.describe('Path of the note to duplicate'),
		open_duplicate: z.boolean()
			.describe('Open the duplicate after creation')
			.default(true)
	}).describe('Tool input parameters'),
	outputSchema: z.string().describe('Note duplication result'),
	
	execute: async ({ context }) => {
		const app = getApp();
		const { path, open_duplicate } = context;
		
		const sourceFile = app.vault.getAbstractFileByPath(path);
		if (!(sourceFile instanceof TFile)) {
			throw new Error(`File not found: ${path}`);
		}
		
		// Generate duplicate name
		const baseName = sourceFile.basename;
		const folderPath = sourceFile.parent?.path || '';
		
		// Find available name with counter
		let counter = 1;
		let duplicateName: string;
		let duplicatePath: string;
		
		do {
			duplicateName = counter === 1 ? `${baseName} - Copy` : `${baseName} - Copy ${counter}`;
			duplicatePath = folderPath ? `${folderPath}/${duplicateName}.md` : `${duplicateName}.md`;
			counter++;
		} while (app.vault.getAbstractFileByPath(duplicatePath));
		
		// Read source content
		const content = await app.vault.read(sourceFile);
		
		// Create duplicate
		const duplicateFile = await app.vault.create(duplicatePath, content);
		
		// Open if requested
		if (open_duplicate) {
			const leaf = app.workspace.getLeaf();
			await leaf.openFile(duplicateFile);
			app.workspace.setActiveLeaf(leaf);
		}
		
		const plugin = getPlugin();
		const i18n = plugin?.getI18nManager();
		new Notice(i18n?.t('ui.noteDuplicated', { duplicateName }) || `Created duplicate: "${duplicateName}"`);
		return `Successfully duplicated note "${path}" as "${duplicatePath}"${
			open_duplicate ? ' (opened)' : ''
		}`;
	}
});
