// File system tools using Obsidian FileSystemAdapter API
import type { ToolCategory } from './built-in-tools';
import { Logger } from './../utils/logger';
import { FileSystemAdapter, normalizePath } from 'obsidian';

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

// These will be injected by the main built-in-tools module
export function setSharedFunctions(shared: {
  getApp: () => any;
}) {
  getApp = shared.getApp;
}

/**
 * Get file system path using FileSystemAdapter
 */
export const getFileSystemPathTool: BuiltInTool = {
  name: 'get_filesystem_path',
  description: 'Get the absolute file system path for a vault file using FileSystemAdapter',
  category: 'file-management',
  inputSchema: {
    type: 'object',
    properties: {
      vaultPath: {
        type: 'string',
        description: 'Vault-relative path'
      }
    },
    required: ['vaultPath']
  },
  execute: async (args: { vaultPath: string }) => {
    try {
      const app = getApp();
      const adapter = app.vault.adapter;

      if (!(adapter instanceof FileSystemAdapter)) {
        throw new Error('FileSystemAdapter not available (desktop only feature)');
      }

      const normalizedPath = normalizePath(args.vaultPath);
      const fullPath = adapter.getFullPath(normalizedPath);
      const filePath = adapter.getFilePath(normalizedPath);

      return {
        success: true,
        message: `Retrieved filesystem path for ${args.vaultPath}`,
        vaultPath: args.vaultPath,
        normalizedPath,
        fullPath,
        filePath
      };
    } catch (error) {
      Logger.error('Error in get_filesystem_path tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

/**
 * Check file existence using FileSystemAdapter
 */
export const fileExistsTool: BuiltInTool = {
  name: 'file_exists',
  description: 'Check if a file exists using FileSystemAdapter with case sensitivity option',
  category: 'file-management',
  inputSchema: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'File path to check'
      },
      caseSensitive: {
        type: 'boolean',
        description: 'Case-sensitive check (default: true)'
      }
    },
    required: ['filePath']
  },
  execute: async (args: { filePath: string; caseSensitive?: boolean }) => {
    try {
      const app = getApp();
      const adapter = app.vault.adapter;

      if (!(adapter instanceof FileSystemAdapter)) {
        throw new Error('FileSystemAdapter not available (desktop only feature)');
      }

      const normalizedPath = normalizePath(args.filePath);
      const exists = await adapter.exists(normalizedPath, args.caseSensitive !== false);

      return {
        success: true,
        message: `Checked existence for ${args.filePath}`,
        filePath: args.filePath,
        normalizedPath,
        exists,
        caseSensitive: args.caseSensitive !== false
      };
    } catch (error) {
      Logger.error('Error in file_exists tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

/**
 * Get file/directory stats using FileSystemAdapter
 */
export const getFileStatsTool: BuiltInTool = {
  name: 'get_file_stats',
  description: 'Get detailed file or directory statistics using FileSystemAdapter',
  category: 'file-management',
  inputSchema: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to get statistics for'
      }
    },
    required: ['filePath']
  },
  execute: async (args: { filePath: string }) => {
    try {
      const app = getApp();
      const adapter = app.vault.adapter;

      if (!(adapter instanceof FileSystemAdapter)) {
        throw new Error('FileSystemAdapter not available (desktop only feature)');
      }

      const normalizedPath = normalizePath(args.filePath);
      const stats = await adapter.stat(normalizedPath);

      if (!stats) {
        throw new Error(`File not found: ${args.filePath}`);
      }

      return {
        success: true,
        message: `Retrieved stats for ${args.filePath}`,
        filePath: args.filePath,
        normalizedPath,
        stats: {
          type: stats.type,
          size: stats.size,
          ctime: stats.ctime,
          mtime: stats.mtime,
          ctimeMs: stats.ctime,
          mtimeMs: stats.mtime
        }
      };
    } catch (error) {
      Logger.error('Error in get_file_stats tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

/**
 * List directory contents using FileSystemAdapter
 */
export const listDirectoryTool: BuiltInTool = {
  name: 'list_file_directory',
  description: 'List all folders and files in a directory using FileSystemAdapter. Returns both subdirectories and files with optional detailed statistics (size, modification time). Use this to browse vault structure, discover existing files, or check directory contents before file operations. OUTPUT STRUCTURE: {success: true, message: "...", directoryPath: "...", listing: {folders: [...], files: [...]}, fileCount: number, folderCount: number}. IMPORTANT: When referencing output in subsequent steps, use {{stepN.output.listing.files}} for files array or {{stepN.output.listing.folders}} for folders array.',
  category: 'file-management',
  inputSchema: {
    type: 'object',
    properties: {
      directoryPath: {
        type: 'string',
        description: 'Path to directory to list. Use empty string "" or omit for vault root directory. Returns both folders and files in the specified path.',
        default: ''
      },
      includeStats: {
        type: 'boolean',
        description: 'Whether to include detailed file statistics (size, modified date, type) for each file',
        default: false
      }
    },
    required: []
  },
  execute: async (args: { directoryPath?: string; includeStats?: boolean }) => {
    try {
      const app = getApp();
      const adapter = app.vault.adapter;

      if (!(adapter instanceof FileSystemAdapter)) {
        throw new Error('FileSystemAdapter not available (desktop only feature)');
      }

      const normalizedPath = normalizePath(args.directoryPath || '');
      const listing = await adapter.list(normalizedPath);

      let detailedListing: any = {
        folders: listing.folders,
        files: listing.files
      };

      if (args.includeStats) {
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
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

/**
 * Copy file using FileSystemAdapter
 */
export const copyFileTool: BuiltInTool = {
  name: 'copy_file',
  description: 'Copy a file to a new location using FileSystemAdapter',
  category: 'file-management',
  inputSchema: {
    type: 'object',
    properties: {
      sourcePath: {
        type: 'string',
        description: 'Source file path to copy from'
      },
      targetPath: {
        type: 'string',
        description: 'Target file path to copy to'
      },
      overwrite: {
        type: 'boolean',
        description: 'Whether to overwrite existing target file',
        default: false
      }
    },
    required: ['sourcePath', 'targetPath']
  },
  execute: async (args: { sourcePath: string; targetPath: string; overwrite?: boolean }) => {
    try {
      const app = getApp();
      const adapter = app.vault.adapter;

      if (!(adapter instanceof FileSystemAdapter)) {
        throw new Error('FileSystemAdapter not available (desktop only feature)');
      }

      const normalizedSource = normalizePath(args.sourcePath);
      const normalizedTarget = normalizePath(args.targetPath);

      // Check if source exists
      const sourceExists = await adapter.exists(normalizedSource);
      if (!sourceExists) {
        throw new Error(`Source file not found: ${args.sourcePath}`);
      }

      // Check if target exists and handle overwrite
      const targetExists = await adapter.exists(normalizedTarget);
      if (targetExists && !args.overwrite) {
        throw new Error(`Target file already exists: ${args.targetPath}. Set overwrite=true to replace it.`);
      }

      // Create target directory if needed
      const targetDir = normalizedTarget.substring(0, normalizedTarget.lastIndexOf('/'));
      if (targetDir && !(await adapter.exists(targetDir))) {
        await adapter.mkdir(targetDir);
      }

      await adapter.copy(normalizedSource, normalizedTarget);

      return {
        success: true,
        message: `Successfully copied ${args.sourcePath} to ${args.targetPath}`,
        sourcePath: args.sourcePath,
        targetPath: args.targetPath,
        normalizedSource,
        normalizedTarget,
        overwrite: args.overwrite || false
      };
    } catch (error) {
      Logger.error('Error in copy_file tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};