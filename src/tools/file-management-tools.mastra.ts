/* eslint-disable @typescript-eslint/no-explicit-any */
// File management tools using Obsidian FileManager API - Mastra SDK migration
import { createMastraTool } from './tool-converter';
import { z } from 'zod';
import { Logger } from './../utils/logger';
import { TFile, TFolder, Notice } from 'obsidian';
import { sed } from 'sed-lite';

// Import shared functions
let getApp: () => unknown;
let getPlugin: () => any;
let validatePath: (operation: string, path: string) => Promise<void>;
let saveToHistory: (path: string, content: string, operation: string) => Promise<void>;
let makeOutput: (content: string, path: string, startLine?: number) => string;
let ensureDirectoryExists: (filePath: string) => Promise<void>;
let globalFileHistory: Map<string, unknown[]>;
const SNIPPET_LINES = 3;

// These will be injected by the main built-in-tools module
export function setSharedFunctions(shared: {
  getApp: () => unknown;
  getPlugin: () => any;
  validatePath: (operation: string, path: string) => Promise<void>;
  saveToHistory: (path: string, content: string, operation: string) => Promise<void>;
  makeOutput: (content: string, path: string, startLine?: number) => string;
  ensureDirectoryExists: (filePath: string) => Promise<void>;
  globalFileHistory: Map<string, unknown[]>;
}) {
  getApp = shared.getApp;
  getPlugin = shared.getPlugin;
  validatePath = shared.validatePath;
  saveToHistory = shared.saveToHistory;
  makeOutput = shared.makeOutput;
  ensureDirectoryExists = shared.ensureDirectoryExists;
  globalFileHistory = shared.globalFileHistory;
}

/**
 * View file content or directory listing within the Obsidian vault
 */
export const viewFileTool = createMastraTool({
  category: 'note-management',
  id: 'view',
  description: 'View one or multiple file contents or directory listings within the Obsidian vault. Supports viewing multiple files in a single call. Empty path defaults to vault root. Can recursively list all files in subdirectories.',
  inputSchema: z.object({
    paths: z.union([z.string(), z.array(z.string())])
      .describe('Path (string) or paths (array of strings) to the file(s) or directory(ies) to view (relative to vault root). Can be a single path or an array of paths. Empty string or "/" defaults to vault root directory.'),
    view_range: z.array(z.number())
      .describe('Optional: [start, end] line numbers to view (1-indexed, inclusive). Only applies to single file view, not directories or multiple files.')
      .optional(),
    recursive: z.boolean()
      .describe('Optional: If true, recursively list all files in subdirectories (only applies to directory listings, not file content). Default: false')
      .default(false)
      .optional()
  }).describe('Tool input parameters'),
  outputSchema: z.object({
    success: z.boolean()
      .describe('Whether operation succeeded'),
    message: z.string()
      .describe('Description of what was viewed')
      .optional(),
    content: z.string()
      .describe('File content or directory listing')
      .optional(),
    results: z.array(z.object({
      path: z.string().describe('File/directory path'),
      success: z.boolean().describe('Whether this path succeeded'),
      type: z.string().describe('"file" or "directory"'),
      content: z.string().describe('Content or listing').optional()
    }))
      .describe('Array of results (for multiple paths)')
      .optional(),
    summary: z.object({
      total: z.number().describe('Total paths processed'),
      successful: z.number().describe('Successful operations'),
      failed: z.number().describe('Failed operations')
    })
      .describe('Summary of operation (for multiple paths)')
      .optional(),
    error: z.string()
      .describe('Error message if failed')
      .optional()
  }).describe('File content or directory listing result'),
  execute: async ({ context }: { context: { paths: string | string[]; view_range?: [number, number]; recursive?: boolean } }) => {
    try {
      // Debug logging
      Logger.debug('[viewFileTool] Received context:', { 
        pathType: Array.isArray(context.paths) ? 'array' : typeof context.paths,
        pathValue: context.paths,
        pathLength: Array.isArray(context.paths) ? context.paths.length : 'N/A',
        pathFirstItem: Array.isArray(context.paths) && context.paths.length > 0 ? context.paths[0] : 'N/A',
        rawContext: JSON.stringify(context)
      });
      
      // Handle path parameter - it might be a JSON string from some LLM providers
      let pathParam = context.paths;
      if (typeof pathParam === 'string' && pathParam.trim().startsWith('[')) {
        try {
          Logger.debug('[viewFileTool] Detected JSON string, parsing...');
          pathParam = JSON.parse(pathParam);
          Logger.debug('[viewFileTool] Parsed path:', pathParam);
        } catch (e) {
          Logger.debug('[viewFileTool] Failed to parse as JSON, using as-is');
        }
      }
      
      // Normalize path to always be an array
      const paths = Array.isArray(pathParam) ? pathParam : [pathParam];
      const recursive = context.recursive ?? false;
      
      Logger.debug('[viewFileTool] Normalized paths:', { 
        count: paths.length,
        paths: paths,
        firstPath: paths[0],
        firstPathType: typeof paths[0]
      });
      
      // If multiple paths provided, view_range should not be used
      if (paths.length > 1 && context.view_range) {
        throw new Error('The view_range parameter is not allowed when viewing multiple files. Use it only for single file view.');
      }

      const app = getApp();
      const results: unknown[] = [];
      
      // Helper function to recursively list files in a folder
      const listFilesRecursively = (folder: TFolder, prefix = ''): string[] => {
        const items: string[] = [];
        for (const child of folder.children) {
          if (child instanceof TFolder) {
            items.push(`${prefix}📁 ${child.name}/`);
            items.push(...listFilesRecursively(child, prefix + '  '));
          } else {
            items.push(`${prefix}📄 ${child.name}`);
          }
        }
        return items;
      };

      // Process each path
      for (let path of paths) {
        try {
          // Trim and normalize the path first
          const originalPath = path;
          path = path?.trim() || '';
          
          Logger.debug('[viewFileTool] Processing path:', { 
            originalPath, 
            trimmed: path,
            isEmpty: !path || path === ''
          });
          
          // Handle empty path - default to root directory
          if (!path || path === '') {
            path = '/';
            Logger.debug('[view tool] Empty path provided, defaulting to root directory');
          }
          
          // Validate path (skip for root directory)
          if (path !== '/') {
            await validatePath('view', path);
          }
          
          // Handle root directory specially
          let abstractFile;
          if (path === '/') {
            // Get vault root
            abstractFile = (app as any).vault.getRoot();
          } else {
            abstractFile = (app as any).vault.getAbstractFileByPath(path);
          }

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
            if (context.view_range) {
              throw new Error('The view_range parameter is not allowed when path points to a directory.');
            }

            let listing: string;
            if (recursive) {
              const items = listFilesRecursively(abstractFile);
              listing = items.join('\n');
            } else {
              const children = abstractFile.children;
              listing = children
                .map(child => `${child instanceof TFolder ? '📁' : '📄'} ${child.name}`)
                .join('\n');
            }

            results.push({
              path,
              success: true,
              type: 'directory',
              content: `Files and directories in ${path}${recursive ? ' (recursive)' : ''}:\n${listing}`
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

          const fileContent = await (app as any).vault.read(abstractFile);
          let content = fileContent;
          let startLine = 1;

          // Handle view range if specified (only for single file)
          if (context.view_range && paths.length === 1) {
            const fileLines = fileContent.split('\n');
            const totalLines = fileLines.length;
            const [start, end] = context.view_range;

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
            viewRange: context.view_range ? `lines ${startLine}-${context.view_range[1] === -1 ? 'end' : context.view_range[1]}` : undefined
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
        const result = results[0] as any;
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
        const successCount = results.filter((r: any) => r.success).length;
        const failureCount = results.length - successCount;

        let combinedContent = '';
        results.forEach((result: any, index) => {
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
});

/**
 * Replace all occurrences of text in a file
 */
export const strReplaceTool = createMastraTool({
  category: 'note-management',
  id: 'str_replace',
  description: 'Replace all occurrences of text in a file',
  inputSchema: z.object({
    path: z.string()
      .describe('Path to the file to edit (relative to vault root)'),
    old_str: z.string()
      .describe('The text to replace (all occurrences will be replaced)'),
    new_str: z.string()
      .describe('The new text to replace with')
  }).describe('Tool input parameters'),
  outputSchema: z.object({
    success: z.boolean()
      .describe('Whether replacement succeeded'),
    message: z.string()
      .describe('Summary of replacements made')
      .optional(),
    content: z.string()
      .describe('Code snippet showing the changes')
      .optional(),
    error: z.string()
      .describe('Error message if failed')
      .optional()
  }).describe('Result of string replacement operation'),
  execute: async (args: { path: string; old_str: string; new_str: string }) => {
    try {
      await validatePath('str_replace', args.path);
      const app = getApp();

      const abstractFile = (app as any).vault.getAbstractFileByPath(args.path);
      if (!abstractFile || !(abstractFile instanceof TFile)) {
        throw new Error(`File not found: ${args.path}`);
      }
      const file = abstractFile;

      const fileContent = await (app as any).vault.read(file);
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
      await (app as any).vault.modify(file, newContent);

      // Generate snippet showing the change
      const replacementLine = fileContent.split(oldStr)[0].split('\n').length;
      const startLine = Math.max(1, replacementLine - SNIPPET_LINES);
      const endLine = replacementLine + SNIPPET_LINES + newStr.split('\n').length;
      const snippet = newContent.split('\n').slice(startLine - 1, endLine).join('\n');

      const plugin = getPlugin();
      new Notice(plugin?.getI18nManager()?.t('notifications.tools.textReplaced', { file: file.name, count: occurrences, plural: occurrences > 1 ? 's' : '' }) || `Text replaced in ${file.name} (${occurrences} occurrence${occurrences > 1 ? 's' : ''})`);

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
});

/**
 * Create a new file with specified content
 */
export const createFileTool = createMastraTool({
  category: 'note-management',
  id: 'create_file',
  description: 'Create a new file with specified content',
  inputSchema: z.object({
    path: z.string()
      .describe('Path for the new file (relative to vault root)'),
    file_text: z.string()
      .describe('Content for the new file'),
    override: z.boolean()
      .describe('Whether to overwrite existing file. If true, overwrites the existing file. If false or not specified (default), automatically generates a new filename with -1, -2, etc. suffix if file exists.')
      .optional()
  }).describe('Tool input parameters'),
  outputSchema: z.object({
    success: z.boolean()
      .describe('Whether file was created successfully'),
    message: z.string()
      .describe('Success message')
      .optional(),
    path: z.string()
      .describe('Actual path of created file (may differ if renamed)')
      .optional(),
    content: z.string()
      .describe('Preview of created content')
      .optional(),
    error: z.string()
      .describe('Error message if failed')
      .optional()
  }).describe('Result of file creation'),
  execute: async ({ context }) => {
    try {
      Logger.debug('Create tool called with context:', {
        path: context.path,
        contentLength: context.file_text?.length || 0,
        contentPreview: context.file_text?.substring(0, 100) + '...' || 'empty',
        override: context.override || false
      });

      await validatePath('create', context.path);
      const app = getApp();

      const existingFile = (app as any).vault.getAbstractFileByPath(context.path);

      if (existingFile) {
        if (context.override === true) {
          // Explicitly requested to overwrite: delete existing file before creating new one
          await (app as any).vault.delete(existingFile);
          Logger.debug(`Deleted existing file: ${context.path}`);
        } else {
          // Default behavior (override === false or undefined): generate new filename with incremental suffix
          const lastDotIndex = context.path.lastIndexOf('.');
          const baseName = lastDotIndex > 0 ? context.path.slice(0, lastDotIndex) : context.path;
          const extension = lastDotIndex > 0 ? context.path.slice(lastDotIndex) : '';

          // Try to find an available filename with incremental suffix
          let counter = 1;
          let finalPath: string;
          let foundAvailable = false;

          while (counter <= 100) { // Safety limit to prevent infinite loop
            finalPath = `${baseName}-${counter}${extension}`;
            
            // Check if this path is available
            if (!(app as any).vault.getAbstractFileByPath(finalPath)) {
              Logger.debug(`File exists, using alternative path: ${finalPath}`);
              context.path = finalPath;
              foundAvailable = true;
              break;
            }
            
            counter++;
          }

          if (!foundAvailable) {
            throw new Error(`Could not find available filename after ${counter - 1} attempts. Original path: ${context.path}`);
          }
        }
      }

      Logger.debug('Final path determined:', context.path);

      // Ensure parent directories exist
      Logger.debug('Ensuring parent directories exist...');
      await ensureDirectoryExists(context.path);

      // Create the file
      Logger.debug('Attempting to create file...');
      const file = await (app as any).vault.create(context.path, context.file_text);
      Logger.debug('File created successfully:', {
        name: file.name,
        path: file.path,
        parent: file.parent?.path || 'root'
      });

      // Verify file was actually created
      const verifyFile = (app as any).vault.getAbstractFileByPath(context.path);
      Logger.debug('File verification:', verifyFile ? 'FOUND' : 'NOT_FOUND');

      // Save to history for undo capability
      await saveToHistory(context.path, context.file_text, 'create');

      const plugin = getPlugin();
      const i18n = plugin?.getI18nManager();
      const wasOverridden = context.override === true && existingFile;
      const fileName = file.name;
      new Notice(i18n?.t(wasOverridden ? 'ui.fileOverrode' : 'ui.fileCreated', { fileName }) || `${wasOverridden ? 'Overrode' : 'Created'} file: ${fileName}`);

      // Open the newly created file in an active leaf for immediate editing
      try {
        await (app as any).workspace.getLeaf(true).openFile(file);
      } catch (openError) {
        Logger.warn('Failed to open created file automatically', openError);
      }

      const message = wasOverridden
        ? `Successfully overrode existing file: ${context.path}`
        : `Successfully created file: ${context.path}`;

      return {
        success: true,
        message,
        content: makeOutput(context.file_text, context.path),
        actualPath: context.path,
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
});

/**
 * Insert content at a specific line in a file
 */
export const insertTool = createMastraTool({
  category: 'note-management',
  id: 'insert',
  description: 'Insert content at a specific line in a file',
  inputSchema: z.object({
    path: z.string()
      .describe('Path to the file to edit (relative to vault root)'),
    insert_line: z.number()
      .describe('Line number to insert at (0-based, 0 = beginning of file)'),
    new_str: z.string()
      .describe('Content to insert')
  }).describe('Tool input parameters'),
  outputSchema: z.object({
    success: z.boolean()
      .describe('Whether insertion succeeded'),
    message: z.string()
      .describe('Summary of the insertion')
      .optional(),
    content: z.string()
      .describe('Code snippet showing inserted content with context')
      .optional(),
    error: z.string()
      .describe('Error message if failed')
      .optional()
  }).describe('Result of content insertion'),
  execute: async (args: { path: string; insert_line: number; new_str: string }) => {
    try {
      await validatePath('insert', args.path);
      const app = getApp();

      const abstractFile = (app as any).vault.getAbstractFileByPath(args.path);
      if (!abstractFile || !(abstractFile instanceof TFile)) {
        throw new Error(`File not found: ${args.path}`);
      }
      const file = abstractFile;

      const fileContent = await (app as any).vault.read(file);
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
      await (app as any).vault.modify(file, newFileContent);

      // Generate snippet showing the insertion
      const snippetLines = [
        ...fileLines.slice(Math.max(0, insertLine - SNIPPET_LINES), insertLine),
        ...newStrLines,
        ...fileLines.slice(insertLine, insertLine + SNIPPET_LINES)
      ];
      const snippet = snippetLines.join('\n');

      const plugin = getPlugin();
      const i18n = plugin?.getI18nManager();
      new Notice(i18n?.t('notifications.tools.contentInserted', { file: file.name }) || `Content inserted in ${file.name}`);

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
});

/**
 * Process file frontmatter using FileManager
 */
export const processFrontmatterTool = createMastraTool({
  category: 'note-management',
  id: 'process_frontmatter',
  description: 'Safely read, modify, and save file frontmatter using Obsidian FileManager',
  inputSchema: z.object({
    filePath: z.string()
      .describe('Path to the file to modify frontmatter'),
    frontmatterUpdates: z.record(z.unknown())
      .describe('Object containing frontmatter updates (will be merged with existing)')
      .optional(),
    operation: z.enum(['read', 'update', 'delete_key'])
      .describe('Operation to perform on frontmatter')
      .default('read')
      .optional(),
    keyToDelete: z.string()
      .describe('Key to delete (only used with delete_key operation)')
      .optional()
  }).describe('Tool input parameters'),
  outputSchema: z.object({
    success: z.boolean()
      .describe('Whether operation succeeded'),
    operation: z.string()
      .describe('Operation performed')
      .optional(),
    frontmatter: z.record(z.unknown())
      .describe('Current frontmatter data')
      .optional(),
    message: z.string()
      .describe('Result message')
      .optional(),
    originalFrontmatter: z.record(z.unknown())
      .describe('Original frontmatter before changes')
      .optional(),
    updatedFrontmatter: z.record(z.unknown())
      .describe('Updated frontmatter after changes')
      .optional(),
    filePath: z.string()
      .describe('File path')
      .optional(),
    error: z.string()
      .describe('Error message if failed')
      .optional()
  }).describe('Frontmatter operation result'),
  execute: async (args: { filePath: string; frontmatterUpdates?: unknown; operation?: string; keyToDelete?: string }) => {
    try {
      const app = getApp();
      const fileManager = (app as any).fileManager;

      const file = (app as any).vault.getAbstractFileByPath(args.filePath);
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
              Object.assign(frontmatter, args.frontmatterUpdates as object);
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
});

/**
 * Apply sed-like text transformations to a file
 */
export const sedTool = createMastraTool({
  category: 'note-management',
  id: 'sed',
  description: 'Apply sed-like text transformations to a file using regular expressions. Supports basic sed syntax (s/pattern/replacement/flags). For complex multiline patterns, the tool will attempt to convert to JavaScript regex. For precise multiline replacements, consider using str_replace instead. Supports flags: g (global), i (case-insensitive), m (multiline). Limited support for patterns with \\n (newlines) in them.',
  inputSchema: z.object({
    path: z.string()
      .describe('Path to the file to edit (relative to vault root)'),
    script: z.string()
      .describe('Sed script to apply (e.g., "s/old/new/g" for global replace, "s/pattern/replacement/i" for case-insensitive). For multiline patterns, use \\n to represent newlines. Example: "s/## Section\\n```sql\\n[\\s\\S]*?```\\n//g" to remove a code block section.')
  }).describe('Tool input parameters'),
  outputSchema: z.object({
    success: z.boolean()
      .describe('Whether transformation succeeded'),
    replacements: z.number()
      .describe('Number of replacements made')
      .optional(),
    path: z.string()
      .describe('Path of modified file')
      .optional(),
    message: z.string()
      .describe('Result message')
      .optional(),
    error: z.string()
      .describe('Error message if failed')
      .optional()
  }).describe('Sed transformation result'),
  execute: async (args: { path: string; script: string }) => {
    try {
      await validatePath('sed', args.path);
      const app = getApp();

      const abstractFile = (app as any).vault.getAbstractFileByPath(args.path);
      if (!abstractFile || !(abstractFile instanceof TFile)) {
        throw new Error(`File not found: ${args.path}`);
      }
      const file = abstractFile;

      const fileContent = await (app as any).vault.read(file);

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

        await (app as any).vault.modify(file, newContent);

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

        const plugin = getPlugin();
        const i18n = plugin?.getI18nManager();
        new Notice(i18n?.t('notifications.tools.sedApplied', { file: file.name, count: changesCount }) || `Sed applied to ${file.name} (${changesCount} lines changed)`);

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
});

/**
 * Append content to the end of a file
 */
export const appendTool = createMastraTool({
  category: 'note-management',
  id: 'append',
  description: 'Append content to the end of a file',
  inputSchema: z.object({
    path: z.string()
      .describe('Path to the file to append to (relative to vault root)'),
    content: z.string()
      .describe('Content to append to the file'),
    newline: z.boolean()
      .describe('Whether to add a newline before appending content (default: true)')
      .default(true)
      .optional()
  }).describe('Tool input parameters'),
  outputSchema: z.object({
    success: z.boolean()
      .describe('Whether append succeeded'),
    message: z.string()
      .describe('Summary of the append operation')
      .optional(),
    content: z.string()
      .describe('Snippet showing the appended content')
      .optional(),
    appendedLines: z.number()
      .describe('Number of lines appended')
      .optional(),
    totalLines: z.number()
      .describe('Total lines in file after append')
      .optional(),
    error: z.string()
      .describe('Error message if failed')
      .optional()
  }).describe('Result of appending content to file'),
  execute: async (args: { path: string; content: string; newline?: boolean }) => {
    try {
      await validatePath('append', args.path);
      const app = getApp();

      const abstractFile = (app as any).vault.getAbstractFileByPath(args.path);
      if (!abstractFile || !(abstractFile instanceof TFile)) {
        throw new Error(`File not found: ${args.path}`);
      }
      const file = abstractFile;

      const currentContent = await (app as any).vault.read(file);

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
      await (app as any).vault.modify(file, newContent);

      // Generate output showing the appended content
      const lines = newContent.split('\n');
      const startLine = Math.max(1, lines.length - SNIPPET_LINES);
      const snippet = lines.slice(startLine - 1).join('\n');

      const plugin = getPlugin();
      const i18n = plugin?.getI18nManager();
      new Notice(i18n?.t('notifications.tools.contentAppended', { file: file.name }) || `Content appended to ${file.name}`);

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
});
