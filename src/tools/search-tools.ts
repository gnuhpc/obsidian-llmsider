// Search tools for finding files and content within Obsidian vault
import { App, TFile, TFolder } from 'obsidian';
import { Logger } from './../utils/logger';
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
 * Search for files by name pattern in the vault
 */
export const searchFilesTool: BuiltInTool = {
  name: 'search_files',
  description: 'Search for files by name pattern in the vault. Supports glob-like patterns with * and ?.',
  category: 'search',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'File name pattern to search for (supports * and ? wildcards)'
      },
      path: {
        type: 'string',
        description: 'Directory path to search in (defaults to vault root)',
        default: ''
      },
      include_folders: {
        type: 'boolean',
        description: 'Whether to include folders in results (defaults to false)',
        default: false
      }
    },
    required: ['pattern']
  },
  async execute(args: { pattern: string; path?: string; include_folders?: boolean }): Promise<string> {
    const app = getApp();
    const { pattern, path = '', include_folders = false } = args;

    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(regexPattern, 'i');

    const results: { path: string; type: 'file' | 'folder' }[] = [];

    // Get all files and folders
    const allFiles = app.vault.getAllLoadedFiles();

    for (const file of allFiles) {
      // Filter by path if specified
      if (path && !file.path.startsWith(path)) {
        continue;
      }

      // Check if name matches pattern
      if (regex.test(file.name)) {
        if (file instanceof TFile) {
          results.push({ path: file.path, type: 'file' });
        } else if (file instanceof TFolder && include_folders) {
          results.push({ path: file.path, type: 'folder' });
        }
      }
    }

    if (results.length === 0) {
      return `Found 0 results for pattern "${pattern}"${path ? ` in ${path}` : ''}.`;
    }

    const resultLines = results.map(({ path, type }) =>
      `${type === 'folder' ? '[DIR]' : ''} ${path}`
    );

    return `Found ${results.length} result${results.length === 1 ? '' : 's'} for pattern "${pattern}"${path ? ` in ${path}` : ''}:\n\n${resultLines.join('\n')}`;
  }
};

/**
 * Search for text content within files using regex
 */
export const searchContentTool: BuiltInTool = {
  name: 'search_content',
  description: 'Search for text content within files using regex patterns.',
  category: 'search',
  inputSchema: {
    type: 'object',
    properties: {
      regex: {
        type: 'string',
        description: 'Regular expression pattern to search for'
      },
      path: {
        type: 'string',
        description: 'Directory path to search in (defaults to vault root)',
        default: ''
      },
      file_pattern: {
        type: 'string',
        description: 'File name pattern to limit search to (e.g., "*.md")',
        default: '*'
      },
      case_sensitive: {
        type: 'boolean',
        description: 'Whether search should be case sensitive (defaults to false)',
        default: false
      },
      max_results: {
        type: 'number',
        description: 'Maximum number of results to return (defaults to 50)',
        default: 50
      }
    },
    required: ['regex']
  },
  async execute(args: {
    regex: string;
    path?: string;
    file_pattern?: string;
    case_sensitive?: boolean;
    max_results?: number;
  }): Promise<string> {
    const app = getApp();
    const {
      regex,
      path = '',
      file_pattern = '*',
      case_sensitive = false,
      max_results = 50
    } = args;

    try {
      const searchRegex = new RegExp(regex, case_sensitive ? 'g' : 'gi');
      const filePatternRegex = new RegExp(
        file_pattern.replace(/\*/g, '.*').replace(/\?/g, '.'),
        'i'
      );

      const results: { file: string; line: number; content: string; match: string }[] = [];
      const allFiles = app.vault.getMarkdownFiles();

      for (const file of allFiles) {
        // Filter by path if specified
        if (path && !file.path.startsWith(path)) {
          continue;
        }

        // Filter by file pattern
        if (!filePatternRegex.test(file.name)) {
          continue;
        }

        try {
          const content = await app.vault.read(file);
          const lines = content.split('\n');

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const matches = [...line.matchAll(searchRegex)];

            for (const match of matches) {
              results.push({
                file: file.path,
                line: i + 1,
                content: line.trim(),
                match: match[0]
              });

              if (results.length >= max_results) {
                break;
              }
            }

            if (results.length >= max_results) {
              break;
            }
          }
        } catch (error) {
          Logger.warn(`Failed to read file ${file.path}:`, error);
        }

        if (results.length >= max_results) {
          break;
        }
      }

      if (results.length === 0) {
        return `Found 0 results for regex "${regex}"${path ? ` in ${path}` : ''}.`;
      }

      const resultLines = results.map(({ file, line, content, match }) =>
        `${file}:${line}: ${content}`
      );

      const truncated = results.length >= max_results ? ` (showing first ${max_results} results)` : '';
      return `Found ${results.length} result${results.length === 1 ? '' : 's'} for regex "${regex}"${path ? ` in ${path}` : ''}${truncated}:\n\n${resultLines.join('\n')}`;
    } catch (error) {
      throw new Error(`Invalid regex pattern: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

/**
 * Find files that contain specific text (simple text search)
 */
export const findFilesTool: BuiltInTool = {
  name: 'find_files_containing',
  description: 'Find files that contain specific text (case-insensitive simple search).',
  category: 'search',
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Text to search for within files'
      },
      path: {
        type: 'string',
        description: 'Directory path to search in (defaults to vault root)',
        default: ''
      },
      file_pattern: {
        type: 'string',
        description: 'File name pattern to limit search to (e.g., "*.md")',
        default: '*.md'
      }
    },
    required: ['text']
  },
  async execute(args: { text: string; path?: string; file_pattern?: string }): Promise<string> {
    const app = getApp();
    const { text, path = '', file_pattern = '*.md' } = args;

    const filePatternRegex = new RegExp(
      file_pattern.replace(/\*/g, '.*').replace(/\?/g, '.'),
      'i'
    );

    const results: string[] = [];
    const allFiles = app.vault.getMarkdownFiles();
    const searchText = text.toLowerCase();

    for (const file of allFiles) {
      // Filter by path if specified
      if (path && !file.path.startsWith(path)) {
        continue;
      }

      // Filter by file pattern
      if (!filePatternRegex.test(file.name)) {
        continue;
      }

      try {
        const content = await app.vault.read(file);
        if (content.toLowerCase().includes(searchText)) {
          results.push(file.path);
        }
      } catch (error) {
        Logger.warn(`Failed to read file ${file.path}:`, error);
      }
    }

    if (results.length === 0) {
      return `Found 0 files containing "${text}"${path ? ` in ${path}` : ''}.`;
    }

    return `Found ${results.length} file${results.length === 1 ? '' : 's'} containing "${text}"${path ? ` in ${path}` : ''}:\n\n${results.join('\n')}`;
  }
};

/**
 * Get all available search tools
 */
export function getAllSearchTools(): BuiltInTool[] {
  return [
    searchFilesTool,
    searchContentTool,
    findFilesTool
  ];
}