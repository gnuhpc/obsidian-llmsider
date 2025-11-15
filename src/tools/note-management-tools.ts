// Note management tools for Obsidian
// Provides operations for moving, renaming, deleting, merging, and copying notes

import { App, TFile, Notice } from 'obsidian';
import { BuiltInTool } from './built-in-tools';

let globalApp: App | null = null;

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
 * Move one or multiple notes to a different folder
 */
export const moveNoteTool: BuiltInTool = {
  name: 'move_note',
  description: 'Move one or multiple notes to a different folder in the vault. Supports moving single file or batch moving multiple files. If the target folder does not exist, it will be created.',
  category: 'note-management',
  inputSchema: {
    type: 'object',
    properties: {
      source_paths: {
        oneOf: [
          {
            type: 'string',
            description: 'Single note path to move (e.g., "folder/note.md")'
          },
          {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of note paths to move (e.g., ["folder/note1.md", "folder/note2.md"])'
          }
        ],
        description: 'Path(s) of the note(s) to move. Can be a single string or an array of strings for batch moving.'
      },
      target_folder: {
        type: 'string',
        description: 'Target folder path (e.g., "archive" or "projects/2024"). Use empty string for vault root.'
      }
    },
    required: ['source_paths', 'target_folder']
  },
  async execute(args: { source_paths: string | string[]; target_folder: string }): Promise<string> {
    const app = getApp();
    const { source_paths, target_folder } = args;

    // Normalize source_paths to array
    const paths = Array.isArray(source_paths) ? source_paths : [source_paths];
    
    if (paths.length === 0) {
      throw new Error('No source paths provided');
    }

    // Ensure target folder exists
    const normalizedFolder = target_folder.trim() || '';
    if (normalizedFolder) {
      const existingFolder = app.vault.getAbstractFileByPath(normalizedFolder);
      if (!existingFolder) {
        await app.vault.createFolder(normalizedFolder);
      }
    }

    const results: { success: string[]; failed: { path: string; error: string }[] } = {
      success: [],
      failed: []
    };

    // Move each file
    for (const sourcePath of paths) {
      try {
        // Get source file
        const sourceFile = app.vault.getAbstractFileByPath(sourcePath);
        if (!(sourceFile instanceof TFile)) {
          results.failed.push({
            path: sourcePath,
            error: 'File not found'
          });
          continue;
        }

        // Construct new path
        const fileName = sourceFile.name;
        const newPath = normalizedFolder ? `${normalizedFolder}/${fileName}` : fileName;

        // Check if target already exists
        const existingFile = app.vault.getAbstractFileByPath(newPath);
        if (existingFile && existingFile.path !== sourceFile.path) {
          results.failed.push({
            path: sourcePath,
            error: `Target file already exists: ${newPath}`
          });
          continue;
        }

        // Move the file
        await app.fileManager.renameFile(sourceFile, newPath);
        results.success.push(sourcePath);
      } catch (error: any) {
        results.failed.push({
          path: sourcePath,
          error: error.message
        });
      }
    }

    // Build result message
    const messages: string[] = [];
    
    if (results.success.length > 0) {
      if (results.success.length === 1) {
        const fileName = results.success[0].split('/').pop() || results.success[0];
        new Notice(`Moved "${fileName}" to "${normalizedFolder || 'root'}"`);
        messages.push(`Successfully moved 1 note to "${normalizedFolder || 'root'}":`);
      } else {
        new Notice(`Moved ${results.success.length} notes to "${normalizedFolder || 'root'}"`);
        messages.push(`Successfully moved ${results.success.length} notes to "${normalizedFolder || 'root'}":`);
      }
      messages.push(...results.success.map(path => `  ✓ ${path}`));
    }
    
    if (results.failed.length > 0) {
      messages.push(`\nFailed to move ${results.failed.length} note(s):`);
      messages.push(...results.failed.map(f => `  ✗ ${f.path}: ${f.error}`));
    }

    if (results.success.length === 0 && results.failed.length > 0) {
      throw new Error(messages.join('\n'));
    }

    return messages.join('\n');
  }
};

/**
 * Rename a note
 */
export const renameNoteTool: BuiltInTool = {
  name: 'rename_note',
  description: 'Rename a note and automatically update all links to it in other notes.',
  category: 'note-management',
  inputSchema: {
    type: 'object',
    properties: {
      source_path: {
        type: 'string',
        description: 'Current path of the note'
      },
      new_name: {
        type: 'string',
        description: 'New name for the note (without .md extension)'
      }
    },
    required: ['source_path', 'new_name']
  },
  async execute(args: { source_path: string; new_name: string }): Promise<string> {
    const app = getApp();
    const { source_path, new_name } = args;

    // Get source file
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

    try {
      // Rename file (this also updates links automatically)
      await app.fileManager.renameFile(sourceFile, newPath);
      new Notice(`Renamed to "${newFileName}"`);
      return `Successfully renamed note from "${sourceFile.name}" to "${newFileName}". All links have been updated.`;
    } catch (error: any) {
      throw new Error(`Failed to rename note: ${error.message}`);
    }
  }
};

/**
 * Delete a note (move to trash)
 */
export const deleteNoteTool: BuiltInTool = {
  name: 'delete_note',
  description: 'Delete a note by moving it to the system trash (can be recovered from trash).',
  category: 'note-management',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path of the note to delete'
      },
      permanent: {
        type: 'boolean',
        description: 'If true, delete permanently instead of moving to trash (default: false)',
        default: false
      }
    },
    required: ['path']
  },
  async execute(args: { path: string; permanent?: boolean }): Promise<string> {
    const app = getApp();
    const { path, permanent = false } = args;

    // Get file
    const file = app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      throw new Error(`File not found: ${path}`);
    }

    try {
      if (permanent) {
        await app.vault.delete(file);
        new Notice(`Permanently deleted "${file.name}"`);
        return `Successfully deleted note "${path}" permanently`;
      } else {
        await app.vault.trash(file, true);
        new Notice(`Moved "${file.name}" to trash`);
        return `Successfully moved note "${path}" to trash (can be recovered)`;
      }
    } catch (error: any) {
      throw new Error(`Failed to delete note: ${error.message}`);
    }
  }
};

/**
 * Merge two notes
 */
export const mergeNotesTool: BuiltInTool = {
  name: 'merge_notes',
  description: 'Merge content from one note into another. The source note can optionally be deleted after merging.',
  category: 'note-management',
  inputSchema: {
    type: 'object',
    properties: {
      source_path: {
        type: 'string',
        description: 'Path of the source note to merge from'
      },
      target_path: {
        type: 'string',
        description: 'Path of the target note to merge into'
      },
      position: {
        type: 'string',
        description: 'Where to insert source content: "top", "bottom" (default: "bottom")',
        enum: ['top', 'bottom'],
        default: 'bottom'
      },
      separator: {
        type: 'string',
        description: 'Text to insert between merged content (default: "\\n\\n---\\n\\n")',
        default: '\n\n---\n\n'
      },
      delete_source: {
        type: 'boolean',
        description: 'Delete source note after merging (default: false)',
        default: false
      }
    },
    required: ['source_path', 'target_path']
  },
  async execute(args: {
    source_path: string;
    target_path: string;
    position?: 'top' | 'bottom';
    separator?: string;
    delete_source?: boolean;
  }): Promise<string> {
    const app = getApp();
    const {
      source_path,
      target_path,
      position = 'bottom',
      separator = '\n\n---\n\n',
      delete_source = false
    } = args;

    // Get source file
    const sourceFile = app.vault.getAbstractFileByPath(source_path);
    if (!(sourceFile instanceof TFile)) {
      throw new Error(`Source file not found: ${source_path}`);
    }

    // Get target file
    const targetFile = app.vault.getAbstractFileByPath(target_path);
    if (!(targetFile instanceof TFile)) {
      throw new Error(`Target file not found: ${target_path}`);
    }

    try {
      // Read both files
      const sourceContent = await app.vault.read(sourceFile);
      const targetContent = await app.vault.read(targetFile);

      // Merge content
      const mergedContent = position === 'top'
        ? `${sourceContent}${separator}${targetContent}`
        : `${targetContent}${separator}${sourceContent}`;

      // Write to target
      await app.vault.modify(targetFile, mergedContent);

      // Delete source if requested
      if (delete_source) {
        await app.vault.trash(sourceFile, true);
        new Notice(`Merged "${sourceFile.name}" into "${targetFile.name}" and deleted source`);
        return `Successfully merged "${source_path}" into "${target_path}" (source deleted)`;
      } else {
        new Notice(`Merged "${sourceFile.name}" into "${targetFile.name}"`);
        return `Successfully merged "${source_path}" into "${target_path}" (source preserved)`;
      }
    } catch (error: any) {
      throw new Error(`Failed to merge notes: ${error.message}`);
    }
  }
};

/**
 * Copy a note
 */
export const copyNoteTool: BuiltInTool = {
  name: 'copy_note',
  description: 'Create a copy of a note with a new name and/or in a different folder.',
  category: 'note-management',
  inputSchema: {
    type: 'object',
    properties: {
      source_path: {
        type: 'string',
        description: 'Path of the note to copy'
      },
      target_path: {
        type: 'string',
        description: 'Path for the new copy (including filename with .md extension)'
      },
      open_after_copy: {
        type: 'boolean',
        description: 'Open the copied note after creation (default: false)',
        default: false
      }
    },
    required: ['source_path', 'target_path']
  },
  async execute(args: {
    source_path: string;
    target_path: string;
    open_after_copy?: boolean;
  }): Promise<string> {
    const app = getApp();
    const { source_path, target_path, open_after_copy = false } = args;

    // Get source file
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

    try {
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

      new Notice(`Copied to "${copiedFile.name}"`);
      return `Successfully copied note from "${source_path}" to "${target_path}"${
        open_after_copy ? ' (opened)' : ''
      }`;
    } catch (error: any) {
      throw new Error(`Failed to copy note: ${error.message}`);
    }
  }
};

/**
 * Duplicate a note (create copy in same folder with " - Copy" suffix)
 */
export const duplicateNoteTool: BuiltInTool = {
  name: 'duplicate_note',
  description: 'Create a duplicate of a note in the same folder with " - Copy" suffix.',
  category: 'note-management',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path of the note to duplicate'
      },
      open_duplicate: {
        type: 'boolean',
        description: 'Open the duplicate after creation (default: true)',
        default: true
      }
    },
    required: ['path']
  },
  async execute(args: { path: string; open_duplicate?: boolean }): Promise<string> {
    const app = getApp();
    const { path, open_duplicate = true } = args;

    // Get source file
    const sourceFile = app.vault.getAbstractFileByPath(path);
    if (!(sourceFile instanceof TFile)) {
      throw new Error(`File not found: ${path}`);
    }

    // Generate duplicate name
    const baseName = sourceFile.basename; // without .md
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

    try {
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

      new Notice(`Created duplicate: "${duplicateName}"`);
      return `Successfully duplicated note "${path}" as "${duplicatePath}"${
        open_duplicate ? ' (opened)' : ''
      }`;
    } catch (error: any) {
      throw new Error(`Failed to duplicate note: ${error.message}`);
    }
  }
};
