// File management tools using Obsidian FileManager API
import type { ToolCategory } from './built-in-tools';
import { Logger } from './../utils/logger';
import { TFile, TFolder, Notice } from 'obsidian';
import { sed } from 'sed-lite';

export interface BuiltInTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
  execute: (args: any) => Promise<any>;
  category?: ToolCategory;
}

// Import shared functions
let getApp: () => any;
let validatePath: (operation: string, path: string) => Promise<void>;
let saveToHistory: (path: string, content: string, operation: string) => Promise<void>;
let makeOutput: (content: string, path: string, startLine?: number) => string;
let ensureDirectoryExists: (filePath: string) => Promise<void>;
let globalFileHistory: Map<string, any[]>;
const SNIPPET_LINES = 3;

// These will be injected by the main built-in-tools module
export function setSharedFunctions(shared: {
  getApp: () => any;
  validatePath: (operation: string, path: string) => Promise<void>;
  saveToHistory: (path: string, content: string, operation: string) => Promise<void>;
  makeOutput: (content: string, path: string, startLine?: number) => string;
  ensureDirectoryExists: (filePath: string) => Promise<void>;
  globalFileHistory: Map<string, any[]>;
}) {
  getApp = shared.getApp;
  validatePath = shared.validatePath;
  saveToHistory = shared.saveToHistory;
  makeOutput = shared.makeOutput;
  ensureDirectoryExists = shared.ensureDirectoryExists;
  globalFileHistory = shared.globalFileHistory;
}

/**
 * View file content or directory listing within the Obsidian vault
 */
export const viewFileTool: BuiltInTool = {
  name: 'view',
  description: 'View one or multiple file contents or directory listings within the Obsidian vault. Supports viewing multiple files in a single call.',
  category: 'file-management',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        oneOf: [
          { type: 'string' },
          { 
            type: 'array',
            items: { type: 'string' }
          }
        ],
        description: 'Path (string) or paths (array of strings) to the file(s) or directory(ies) to view (relative to vault root). Can be a single path or an array of paths.'
      },
      view_range: {
        type: 'array',
        items: { type: 'number' },
        description: 'Optional: [start, end] line numbers to view (1-indexed, inclusive). Only applies to single file view, not directories or multiple files.'
      }
    },
    required: ['path']
  },
  execute: async (args: { path: string | string[]; view_range?: [number, number] }) => {
    try {
      // Normalize path to always be an array
      const paths = Array.isArray(args.path) ? args.path : [args.path];
      
      // If multiple paths provided, view_range should not be used
      if (paths.length > 1 && args.view_range) {
        throw new Error('The view_range parameter is not allowed when viewing multiple files. Use it only for single file view.');
      }

      const app = getApp();
      const results: any[] = [];

      // Process each path
      for (const path of paths) {
        try {
          await validatePath('view', path);
          const abstractFile = app.vault.getAbstractFileByPath(path);

          if (!abstractFile) {
            results.push({
              path,
              success: false,
              error: `File or directory not found: ${path}`
            });
            continue;
          }

          // Handle directory listing
          if (abstractFile instanceof TFolder) {
            if (args.view_range) {
              throw new Error('The view_range parameter is not allowed when path points to a directory.');
            }

            const children = abstractFile.children;
            const listing = children
              .map(child => `${child instanceof TFolder ? '📁' : '📄'} ${child.name}`)
              .join('\n');

            results.push({
              path,
              success: true,
              type: 'directory',
              content: `Files and directories in ${path}:\n${listing}`
            });
            continue;
          }

          // Handle file content
          if (!(abstractFile instanceof TFile)) {
            results.push({
              path,
              success: false,
              error: `Path is not a file or directory: ${path}`
            });
            continue;
          }

          const fileContent = await app.vault.read(abstractFile);
          let content = fileContent;
          let startLine = 1;

          // Handle view range if specified (only for single file)
          if (args.view_range && paths.length === 1) {
            const fileLines = fileContent.split('\n');
            const totalLines = fileLines.length;
            const [start, end] = args.view_range;

            // Validate and sanitize line numbers
            if (typeof start !== 'number' || typeof end !== 'number') {
              throw new Error(
                `Invalid view_range: [${start}, ${end}]. Both start and end must be numbers.`
              );
            }

            if (!Number.isInteger(start) || !Number.isInteger(end)) {
              throw new Error(
                `Invalid view_range: [${start}, ${end}]. Both start and end must be integers.`
              );
            }

            if (start < 1 || start > totalLines) {
              throw new Error(
                `Invalid view_range: [${start}, ${end}]. Start line ${start} should be within [1, ${totalLines}]. ` +
                `The view tool uses 1-based line numbers.`
              );
            }

            if (end !== -1) {
              if (end > totalLines) {
                throw new Error(
                  `Invalid view_range: [${start}, ${end}]. End line ${end} should be <= ${totalLines}`
                );
              }
              if (end < start) {
                throw new Error(
                  `Invalid view_range: [${start}, ${end}]. End line should be >= start line`
                );
              }
            }

            const selectedLines = end === -1
              ? fileLines.slice(start - 1)
              : fileLines.slice(start - 1, end);

            content = selectedLines.join('\n');
            startLine = start;
          }

          results.push({
            path,
            success: true,
            type: 'file',
            content: makeOutput(content, path, startLine),
            viewRange: args.view_range ? `lines ${startLine}-${args.view_range[1] === -1 ? 'end' : args.view_range[1]}` : undefined
          });
        } catch (error) {
          results.push({
            path,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Format the response
      if (paths.length === 1) {
        // Single file/directory - return simplified response
        const result = results[0];
        if (!result.success) {
          return {
            success: false,
            error: result.error
          };
        }

        return {
          success: true,
          message: result.type === 'directory' 
            ? `Directory listing for ${result.path}`
            : `Content of ${result.path}${result.viewRange ? ` (${result.viewRange})` : ''}`,
          content: result.content
        };
      } else {
        // Multiple files - return combined response
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.length - successCount;

        let combinedContent = '';
        results.forEach((result, index) => {
          if (index > 0) combinedContent += '\n\n' + '='.repeat(80) + '\n\n';
          
          if (result.success) {
            combinedContent += `📄 **${result.path}**${result.type === 'directory' ? ' (Directory)' : ''}\n\n`;
            combinedContent += result.content;
          } else {
            combinedContent += `❌ **${result.path}**\n\nError: ${result.error}`;
          }
        });

        return {
          success: successCount > 0,
          message: `Viewed ${successCount} file(s) successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
          content: combinedContent,
          results: results,
          summary: {
            total: results.length,
            successful: successCount,
            failed: failureCount
          }
        };
      }
    } catch (error) {
      Logger.error('Error in view tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

/**
 * Replace all occurrences of text in a file
 */
export const strReplaceTool: BuiltInTool = {
  name: 'str_replace',
  description: 'Replace all occurrences of text in a file',
  category: 'file-management',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to edit (relative to vault root)'
      },
      old_str: {
        type: 'string',
        description: 'The text to replace (all occurrences will be replaced)'
      },
      new_str: {
        type: 'string',
        description: 'The new text to replace with'
      }
    },
    required: ['path', 'old_str', 'new_str']
  },
  execute: async (args: { path: string; old_str: string; new_str: string }) => {
    try {
      await validatePath('str_replace', args.path);
      const app = getApp();

      const file = app.vault.getAbstractFileByPath(args.path) as TFile;
      if (!file || !(file instanceof TFile)) {
        throw new Error(`File not found: ${args.path}`);
      }

      const fileContent = await app.vault.read(file);
      const oldStr = args.old_str.replace(/\t/g, '    ');
      const newStr = args.new_str.replace(/\t/g, '    ');

      // Check for occurrences
      const occurrences = fileContent.split(oldStr).length - 1;
      if (occurrences === 0) {
        throw new Error(
          `No replacement performed. String "${args.old_str}" not found in ${args.path}`
        );
      }

      // Save to history before modification
      await saveToHistory(args.path, fileContent, 'str_replace');

      // Perform replacement (replace all occurrences)
      const newContent = fileContent.split(oldStr).join(newStr);
      await app.vault.modify(file, newContent);

      // Generate snippet showing the change
      const replacementLine = fileContent.split(oldStr)[0].split('\n').length;
      const startLine = Math.max(1, replacementLine - SNIPPET_LINES);
      const endLine = replacementLine + SNIPPET_LINES + newStr.split('\n').length;
      const snippet = newContent.split('\n').slice(startLine - 1, endLine).join('\n');

      new Notice(`Text replaced in ${file.name} (${occurrences} occurrence${occurrences > 1 ? 's' : ''})`);

      return {
        success: true,
        message: `Successfully replaced ${occurrences} occurrence${occurrences > 1 ? 's' : ''} of text in ${args.path}`,
        content: makeOutput(snippet, `${args.path} (modified)`, startLine)
      };
    } catch (error) {
      Logger.error('Error in str_replace tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

/**
 * Create a new file with specified content
 */
export const createFileTool: BuiltInTool = {
  name: 'create',
  description: 'Create a new file with specified content',
  category: 'file-management',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path for the new file (relative to vault root)'
      },
      file_text: {
        type: 'string',
        description: 'Content for the new file'
      },
      override: {
        type: 'boolean',
        description: 'Whether to overwrite existing file. If true, overwrites the existing file. If false or not specified (default), automatically generates a new filename with -1, -2, etc. suffix if file exists.'
      }
    },
    required: ['path', 'file_text']
  },
  execute: async (args: { path: string; file_text: string; override?: boolean }) => {
    try {
      Logger.debug('Create tool called with args:', {
        path: args.path,
        contentLength: args.file_text?.length || 0,
        contentPreview: args.file_text?.substring(0, 100) + '...' || 'empty',
        override: args.override || false
      });

      await validatePath('create', args.path);
      const app = getApp();

      const existingFile = app.vault.getAbstractFileByPath(args.path);

      if (existingFile) {
        if (args.override === true) {
          // Explicitly requested to overwrite: delete existing file before creating new one
          await app.vault.delete(existingFile);
          Logger.debug(`Deleted existing file: ${args.path}`);
        } else {
          // Default behavior (override === false or undefined): generate new filename with incremental suffix
          const lastDotIndex = args.path.lastIndexOf('.');
          const baseName = lastDotIndex > 0 ? args.path.slice(0, lastDotIndex) : args.path;
          const extension = lastDotIndex > 0 ? args.path.slice(lastDotIndex) : '';

          // Try to find an available filename with incremental suffix
          let counter = 1;
          let finalPath: string;
          let foundAvailable = false;

          while (counter <= 100) { // Safety limit to prevent infinite loop
            finalPath = `${baseName}-${counter}${extension}`;
            
            // Check if this path is available
            if (!app.vault.getAbstractFileByPath(finalPath)) {
              Logger.debug(`File exists, using alternative path: ${finalPath}`);
              args.path = finalPath;
              foundAvailable = true;
              break;
            }
            
            counter++;
          }

          if (!foundAvailable) {
            throw new Error(`Could not find available filename after ${counter - 1} attempts. Original path: ${args.path}`);
          }
        }
      }

      Logger.debug('Final path determined:', args.path);

      // Ensure parent directories exist
      Logger.debug('Ensuring parent directories exist...');
      await ensureDirectoryExists(args.path);

      // Create the file
      Logger.debug('Attempting to create file...');
      const file = await app.vault.create(args.path, args.file_text);
      Logger.debug('File created successfully:', {
        name: file.name,
        path: file.path,
        parent: file.parent?.path || 'root'
      });

      // Verify file was actually created
      const verifyFile = app.vault.getAbstractFileByPath(args.path);
      Logger.debug('File verification:', verifyFile ? 'FOUND' : 'NOT_FOUND');

      // Save to history for undo capability
      await saveToHistory(args.path, args.file_text, 'create');

      const wasOverridden = args.override === true && existingFile;
      new Notice(`${wasOverridden ? 'Overrode' : 'Created'} file: ${file.name}`);

      const message = wasOverridden
        ? `Successfully overrode existing file: ${args.path}`
        : `Successfully created file: ${args.path}`;

      return {
        success: true,
        message,
        content: makeOutput(args.file_text, args.path),
        actualPath: args.path,
        wasOverridden
      };
    } catch (error) {
      Logger.error('Error in create tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

/**
 * Insert content at a specific line in a file
 */
export const insertTool: BuiltInTool = {
  name: 'insert',
  description: 'Insert content at a specific line in a file',
  category: 'file-management',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to edit (relative to vault root)'
      },
      insert_line: {
        type: 'number',
        description: 'Line number to insert at (0-based, 0 = beginning of file)'
      },
      new_str: {
        type: 'string',
        description: 'Content to insert'
      }
    },
    required: ['path', 'insert_line', 'new_str']
  },
  execute: async (args: { path: string; insert_line: number; new_str: string }) => {
    try {
      await validatePath('insert', args.path);
      const app = getApp();

      const file = app.vault.getAbstractFileByPath(args.path) as TFile;
      if (!file || !(file instanceof TFile)) {
        throw new Error(`File not found: ${args.path}`);
      }

      const fileContent = await app.vault.read(file);
      const fileLines = fileContent.split('\n');
      const totalLines = fileLines.length;

      // Validate and sanitize insert_line parameter
      let insertLine = args.insert_line;

      // Handle common invalid values
      if (insertLine < 0) {
        Logger.warn(`Invalid insert_line: ${insertLine}, using 0 (beginning of file)`);
        insertLine = 0;
      } else if (insertLine > totalLines) {
        Logger.warn(`insert_line ${insertLine} exceeds file length ${totalLines}, using end of file`);
        insertLine = totalLines;
      }

      // Ensure insertLine is an integer
      insertLine = Math.floor(insertLine);

      // Save to history before modification
      await saveToHistory(args.path, fileContent, 'insert');

      const newStr = args.new_str.replace(/\t/g, '    ');
      const newStrLines = newStr.split('\n');

      const newFileLines = [
        ...fileLines.slice(0, insertLine),
        ...newStrLines,
        ...fileLines.slice(insertLine)
      ];

      const newFileContent = newFileLines.join('\n');
      await app.vault.modify(file, newFileContent);

      // Generate snippet showing the insertion
      const snippetLines = [
        ...fileLines.slice(Math.max(0, insertLine - SNIPPET_LINES), insertLine),
        ...newStrLines,
        ...fileLines.slice(insertLine, insertLine + SNIPPET_LINES)
      ];
      const snippet = snippetLines.join('\n');

      new Notice(`Content inserted in ${file.name}`);

      return {
        success: true,
        message: `Successfully inserted content at line ${insertLine} in ${args.path}`,
        content: makeOutput(snippet, `${args.path} (modified)`, Math.max(1, insertLine - SNIPPET_LINES + 1))
      };
    } catch (error) {
      Logger.error('Error in insert tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

/**
 * Move or rename a file using FileManager
 */
export const moveFileTool: BuiltInTool = {
  name: 'move_file',
  description: 'Move or rename a file within the vault using Obsidian FileManager',
  category: 'file-management',
  inputSchema: {
    type: 'object',
    properties: {
      oldPath: {
        type: 'string',
        description: 'Current path of the file to move (relative to vault root)'
      },
      newPath: {
        type: 'string',
        description: 'New path for the file (relative to vault root)'
      },
      updateLinks: {
        type: 'boolean',
        description: 'Whether to update links to this file',
        default: true
      }
    },
    required: ['oldPath', 'newPath']
  },
  execute: async (args: { oldPath: string; newPath: string; updateLinks?: boolean }) => {
    try {
      const app = getApp();
      const fileManager = app.fileManager;

      const file = app.vault.getAbstractFileByPath(args.oldPath);
      if (!file || !(file instanceof TFile)) {
        throw new Error(`File not found: ${args.oldPath}`);
      }

      // Check if target directory exists, create if needed
      const targetDir = args.newPath.substring(0, args.newPath.lastIndexOf('/'));
      if (targetDir && !app.vault.getAbstractFileByPath(targetDir)) {
        await app.vault.createFolder(targetDir);
      }

      // Use FileManager to rename/move the file
      await fileManager.renameFile(file, args.newPath);

      return {
        success: true,
        message: `Successfully moved file from ${args.oldPath} to ${args.newPath}`,
        oldPath: args.oldPath,
        newPath: args.newPath,
        linksUpdated: args.updateLinks !== false
      };
    } catch (error) {
      Logger.error('Error in move_file tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

/**
 * Generate markdown link using FileManager
 */
export const generateMarkdownLinkTool: BuiltInTool = {
  name: 'generate_markdown_link',
  description: 'Generate a Markdown link for a file using Obsidian FileManager preferences',
  category: 'file-management',
  inputSchema: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to the file to create a link for'
      },
      sourcePath: {
        type: 'string',
        description: 'Path of the source file where the link will be used (optional)'
      },
      linkText: {
        type: 'string',
        description: 'Custom text for the link (optional, defaults to filename)'
      },
      subpath: {
        type: 'string',
        description: 'Subpath within the file (for headings, blocks, etc.)'
      }
    },
    required: ['filePath']
  },
  execute: async (args: { filePath: string; sourcePath?: string; linkText?: string; subpath?: string }) => {
    try {
      const app = getApp();
      const fileManager = app.fileManager;

      const file = app.vault.getAbstractFileByPath(args.filePath);
      if (!file || !(file instanceof TFile)) {
        throw new Error(`File not found: ${args.filePath}`);
      }

      const link = fileManager.generateMarkdownLink(
        file,
        args.sourcePath || '',
        args.subpath || '',
        args.linkText || ''
      );

      return {
        success: true,
        message: `Generated markdown link for ${args.filePath}`,
        link,
        filePath: args.filePath,
        sourcePath: args.sourcePath,
        linkText: args.linkText,
        subpath: args.subpath
      };
    } catch (error) {
      Logger.error('Error in generate_markdown_link tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

/**
 * Get available path for attachment using FileManager
 */
export const getAttachmentPathTool: BuiltInTool = {
  name: 'get_attachment_path',
  description: 'Get available path for an attachment file using Obsidian FileManager',
  category: 'file-management',
  inputSchema: {
    type: 'object',
    properties: {
      filename: {
        type: 'string',
        description: 'Name of the attachment file'
      },
      sourcePath: {
        type: 'string',
        description: 'Path of the source file (optional)'
      }
    },
    required: ['filename']
  },
  execute: async (args: { filename: string; sourcePath?: string }) => {
    try {
      const app = getApp();
      const fileManager = app.fileManager;

      const attachmentPath = await fileManager.getAvailablePathForAttachment(
        args.filename,
        args.sourcePath || ''
      );

      return {
        success: true,
        message: `Generated attachment path for ${args.filename}`,
        attachmentPath,
        filename: args.filename,
        sourcePath: args.sourcePath
      };
    } catch (error) {
      Logger.error('Error in get_attachment_path tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

/**
 * Process file frontmatter using FileManager
 */
export const processFrontmatterTool: BuiltInTool = {
  name: 'process_frontmatter',
  description: 'Safely read, modify, and save file frontmatter using Obsidian FileManager',
  category: 'file-management',
  inputSchema: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to the file to modify frontmatter'
      },
      frontmatterUpdates: {
        type: 'object',
        description: 'Object containing frontmatter updates (will be merged with existing)'
      },
      operation: {
        type: 'string',
        enum: ['read', 'update', 'delete_key'],
        description: 'Operation to perform on frontmatter',
        default: 'read'
      },
      keyToDelete: {
        type: 'string',
        description: 'Key to delete (only used with delete_key operation)'
      }
    },
    required: ['filePath']
  },
  execute: async (args: { filePath: string; frontmatterUpdates?: any; operation?: string; keyToDelete?: string }) => {
    try {
      const app = getApp();
      const fileManager = app.fileManager;

      const file = app.vault.getAbstractFileByPath(args.filePath);
      if (!file || !(file instanceof TFile)) {
        throw new Error(`File not found: ${args.filePath}`);
      }

      const operation = args.operation || 'read';
      let result: any = {};

      await fileManager.processFrontMatter(file, (frontmatter: any) => {
        // Store original frontmatter for return
        result.originalFrontmatter = { ...frontmatter };

        switch (operation) {
          case 'read':
            // Just reading, no modifications
            break;
          case 'update':
            if (args.frontmatterUpdates) {
              Object.assign(frontmatter, args.frontmatterUpdates);
            }
            break;
          case 'delete_key':
            if (args.keyToDelete && args.keyToDelete in frontmatter) {
              delete frontmatter[args.keyToDelete];
            }
            break;
        }

        result.updatedFrontmatter = { ...frontmatter };
      });

      return {
        success: true,
        message: `Successfully processed frontmatter for ${args.filePath}`,
        operation,
        originalFrontmatter: result.originalFrontmatter,
        updatedFrontmatter: result.updatedFrontmatter,
        filePath: args.filePath
      };
    } catch (error) {
      Logger.error('Error in process_frontmatter tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

/**
 * Move file to trash using FileManager
 */
export const trashFileTool: BuiltInTool = {
  name: 'trash_file',
  description: 'Move a file to trash using Obsidian FileManager (respects user preferences)',
  category: 'file-management',
  inputSchema: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to the file to move to trash'
      }
    },
    required: ['filePath']
  },
  execute: async (args: { filePath: string }) => {
    try {
      const app = getApp();
      const fileManager = app.fileManager;

      const file = app.vault.getAbstractFileByPath(args.filePath);
      if (!file) {
        throw new Error(`File not found: ${args.filePath}`);
      }

      let trashError: Error | null = null;

      try {
        // Attempt to move file to trash
        await fileManager.trashFile(file);
      } catch (error) {
        trashError = error instanceof Error ? error : new Error('Unknown trash error');
      }

      // Check if file was actually moved by verifying it no longer exists at original path
      const stillExists = app.vault.getAbstractFileByPath(args.filePath);

      if (stillExists) {
        // File still exists, this is a real failure
        if (trashError) {
          throw trashError;
        } else {
          throw new Error(`File still exists after trash operation: ${args.filePath}`);
        }
      }

      // File was successfully moved to trash, even if there was an error
      // (This handles the common ENOENT error that occurs after successful deletion)
      return {
        success: true,
        message: `Successfully moved ${args.filePath} to trash`,
        filePath: args.filePath
      };
    } catch (error) {
      Logger.error('Error in trash_file tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

/**
 * Apply sed-like text transformations to a file
 */
export const sedTool: BuiltInTool = {
  name: 'sed',
  description: 'Apply sed-like text transformations to a file using regular expressions. Supports basic sed syntax (s/pattern/replacement/flags). For complex multiline patterns, the tool will attempt to convert to JavaScript regex. For precise multiline replacements, consider using str_replace instead. Supports flags: g (global), i (case-insensitive), m (multiline). Limited support for patterns with \\n (newlines) in them.',
  category: 'file-management',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to edit (relative to vault root)'
      },
      script: {
        type: 'string',
        description: 'Sed script to apply (e.g., "s/old/new/g" for global replace, "s/pattern/replacement/i" for case-insensitive). For multiline patterns, use \\n to represent newlines. Example: "s/## Section\\n```sql\\n[\\s\\S]*?```\\n//g" to remove a code block section.'
      }
    },
    required: ['path', 'script']
  },
  execute: async (args: { path: string; script: string }) => {
    try {
      await validatePath('sed', args.path);
      const app = getApp();

      const file = app.vault.getAbstractFileByPath(args.path) as TFile;
      if (!file || !(file instanceof TFile)) {
        throw new Error(`File not found: ${args.path}`);
      }

      const fileContent = await app.vault.read(file);

      // Save to history before modification
      await saveToHistory(args.path, fileContent, 'sed');

      try {
        // Process the script to handle multiline patterns correctly
        let processedScript = args.script;
        let newContent = fileContent;

        Logger.debug('Processing script:', processedScript);

        // Check if script uses line anchors (^ or $) and doesn't already have 'm' flag
        if (/s\/[^\/]*[\^$][^\/]*\/[^\/]*\/[^m]*$/.test(processedScript)) {
          // Add multiline flag for line anchor support
          processedScript = processedScript.replace(/\/([gimuy]*)$/, '/m$1');
        }

        // Check if the script contains \\n (newline in pattern) - needs special handling
        const hasNewlineInPattern = processedScript.includes('\\n');
        Logger.debug('Has newline in pattern:', hasNewlineInPattern);
        
        if (hasNewlineInPattern) {
          // Extract the full sed command parts: s/pattern/replacement/flags
          // Need to carefully parse this because the pattern/replacement can contain / characters
          // Strategy: Find the LAST / followed by valid flags (or end of string) as the final delimiter
          let match = null;
          
          // Try to extract using a more robust approach
          if (processedScript.startsWith('s/')) {
            const delimiter = '/';
            
            // Find all possible delimiter positions
            const delimiterPositions: number[] = [];
            let escaped = false;
            for (let i = 2; i < processedScript.length; i++) {
              if (escaped) {
                escaped = false;
              } else if (processedScript[i] === '\\') {
                escaped = true;
              } else if (processedScript[i] === delimiter) {
                delimiterPositions.push(i);
              }
            }
            
            // Need at least 2 delimiters: one after pattern, one after replacement
            if (delimiterPositions.length >= 2) {
              // Try from the last delimiter backwards to find the correct split
              // The last delimiter should be followed by valid flags (g, i, m, etc.) or nothing
              for (let i = delimiterPositions.length - 1; i >= 1; i--) {
                const patternEndPos = delimiterPositions[0];
                const replacementEndPos = delimiterPositions[i];
                
                const pattern = processedScript.substring(2, patternEndPos);
                const replacement = processedScript.substring(patternEndPos + 1, replacementEndPos);
                const flags = processedScript.substring(replacementEndPos + 1);
                
                // Check if flags are valid (only contains g, i, m, u, y, or empty)
                const validFlags = /^[gimuy]*$/.test(flags);
                
                if (validFlags) {
                  match = [processedScript, pattern, replacement, flags];
                  Logger.debug('Extracted pattern:', pattern);
                  Logger.debug('Extracted replacement:', replacement);
                  Logger.debug('Extracted flags:', flags);
                  break;
                }
              }
            }
          }
          
          if (match) {
            const [_, pattern, replacement, flags] = match;
            
            // Convert sed pattern to JavaScript regex
            // Replace \\n with actual newline character
            let regexPattern = pattern.replace(/\\n/g, '\n');
            
            // Escape special regex characters to treat the pattern as literal text
            // This must be done BEFORE splitting by newlines
            regexPattern = regexPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            // Handle [\\s\\S] character class - it's already correct for matching any character including newlines
            // But we need to make sure the regex handles optional whitespace between sections
            // Replace single \n with \n\s* to match newlines with optional whitespace (including empty lines)
            const parts = regexPattern.split('\n');
            if (parts.length > 1) {
              // Join with \n\s* to allow optional whitespace (including empty lines) between parts
              regexPattern = parts.join('\n\\s*');
            }
            
            // Handle other escaping - unescape backticks
            regexPattern = regexPattern.replace(/\\`/g, '`');
            
            Logger.debug('Converted regex pattern:', regexPattern);
            
            try {
              // Build JavaScript regex with appropriate flags
              let jsFlags = flags;
              const regex = new RegExp(regexPattern, jsFlags);
              Logger.debug('Created regex successfully');
              
              // Apply the replacement
              newContent = fileContent.replace(regex, replacement);
              Logger.debug('Replacement applied, content changed:', newContent !== fileContent);
            } catch (regexError) {
              Logger.warn('Multiline regex conversion failed:', regexError);
              // Fall back to sed-lite
              const sedFunction = sed(processedScript);
              newContent = sedFunction(fileContent);
            }
          } else {
            Logger.warn('Could not parse sed command, falling back to sed-lite');
            // Fall back to sed-lite
            const sedFunction = sed(processedScript);
            newContent = sedFunction(fileContent);
          }
        } else {
          // No newlines in pattern, use sed-lite as-is
          Logger.debug('No newlines in pattern, using sed-lite');
          
          // Handle 's' flag (dotall/singleline mode) - sed-lite doesn't support this directly
          const hasSFlag = /\/[gimuy]*s/.test(processedScript);
          if (hasSFlag) {
            // Remove the 's' flag
            processedScript = processedScript.replace(/\/([gimuy]*)s([gimuy]*)$/, '/$1$2');
          }

          // Handle non-greedy matching
          if (/\.\*\?/.test(processedScript)) {
            // Convert .*? to .* for greedy matching (best we can do)
            processedScript = processedScript.replace(/\.\*\?/g, '.*');
          }

          // Create sed transformer function
          const sedFunction = sed(processedScript);
          
          // Apply sed transformation
          newContent = sedFunction(fileContent);
        }

        // Check if content actually changed
        if (newContent === fileContent) {
          return {
            success: true,
            message: `Sed script applied to ${args.path} (no changes made)`,
            content: makeOutput(fileContent, args.path),
            changesCount: 0
          };
        }

        await app.vault.modify(file, newContent);

        // Count changes by comparing line by line
        const oldLines = fileContent.split('\n');
        const newLines = newContent.split('\n');
        let changesCount = 0;

        for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
          if (oldLines[i] !== newLines[i]) {
            changesCount++;
          }
        }

        // Generate snippet showing some changes
        const firstChangeLine = newLines.findIndex((line: string, idx: number) => oldLines[idx] !== line);
        const startLine = Math.max(1, (firstChangeLine + 1) - SNIPPET_LINES);
        const endLine = Math.min(newLines.length, (firstChangeLine + 1) + SNIPPET_LINES);
        const snippet = newLines.slice(startLine - 1, endLine).join('\n');

        new Notice(`Sed applied to ${file.name} (${changesCount} lines changed)`);

        return {
          success: true,
          message: `Successfully applied sed script to ${args.path} (${changesCount} lines changed)`,
          content: makeOutput(snippet, `${args.path} (modified)`, startLine),
          changesCount,
          script: args.script
        };
      } catch (sedError) {
        throw new Error(`Sed script error: ${sedError instanceof Error ? sedError.message : 'Unknown sed error'}`);
      }
    } catch (error) {
      Logger.error('Error in sed tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

/**
 * Append content to the end of a file
 */
export const appendTool: BuiltInTool = {
  name: 'append',
  description: 'Append content to the end of a file',
  category: 'file-management',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to append to (relative to vault root)'
      },
      content: {
        type: 'string',
        description: 'Content to append to the file'
      },
      newline: {
        type: 'boolean',
        description: 'Whether to add a newline before appending content (default: true)',
        default: true
      }
    },
    required: ['path', 'content']
  },
  execute: async (args: { path: string; content: string; newline?: boolean }) => {
    try {
      await validatePath('append', args.path);
      const app = getApp();

      const file = app.vault.getAbstractFileByPath(args.path) as TFile;
      if (!file || !(file instanceof TFile)) {
        throw new Error(`File not found: ${args.path}`);
      }

      const currentContent = await app.vault.read(file);

      // Save to history before modification
      await saveToHistory(args.path, currentContent, 'append');

      // Determine if we need a newline
      const needsNewline = args.newline !== false;
      const hasTrailingNewline = currentContent.endsWith('\n') || currentContent.endsWith('\r\n');

      let appendContent = args.content;
      if (needsNewline && !hasTrailingNewline && currentContent.length > 0) {
        appendContent = '\n' + appendContent;
      }

      const newContent = currentContent + appendContent;
      await app.vault.modify(file, newContent);

      // Generate output showing the appended content
      const lines = newContent.split('\n');
      const startLine = Math.max(1, lines.length - SNIPPET_LINES);
      const snippet = lines.slice(startLine - 1).join('\n');

      new Notice(`Content appended to ${file.name}`);

      return {
        success: true,
        message: `Successfully appended content to ${args.path}`,
        content: makeOutput(snippet, `${args.path} (appended)`, startLine),
        appendedLines: args.content.split('\n').length,
        totalLines: lines.length
      };
    } catch (error) {
      Logger.error('Error in append tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};
