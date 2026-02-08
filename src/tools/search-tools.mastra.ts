// Search tools for finding files and content within Obsidian vault - Mastra format
import { z } from 'zod';
import { App, TFile, TFolder } from 'obsidian';
import { minimatch } from 'minimatch';
import { Logger } from './../utils/logger';
import type { MastraTool } from './mastra-tool-types';
import { createMastraTool } from './tool-converter';

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
 * Normalize and validate search path
 */
function normalizeSearchPath(path: string): string {
  if (!path) return '';
  
  // Remove leading/trailing slashes
  let normalized = path.trim().replace(/^\/+|\/+$/g, '');
  
  // Ensure path ends with / for proper subdirectory matching
  return normalized ? normalized + '/' : '';
}

/**
 * Check if file is within the specified directory (including subdirectories)
 */
function isFileInDirectory(filePath: string, dirPath: string): boolean {
  if (!dirPath) return true; // Empty path means search entire vault
  
  // Normalize the directory path
  const normalizedDir = normalizeSearchPath(dirPath);
  
  // Check if file path starts with the directory path
  return filePath.startsWith(normalizedDir) || filePath === normalizedDir.slice(0, -1);
}

/**
 * Parse time filter from string (ISO date, relative time, etc.)
 */
function parseTimeFilter(timeStr: string): Date {
  // Try parsing as ISO date
  let date = new Date(timeStr);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Parse relative time (e.g., "7 days ago", "1 week ago", "2 hours ago")
  const relativeMatch = timeStr.match(/^(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/i);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2].toLowerCase();
    
    const now = new Date();
    switch (unit) {
      case 'second':
        now.setSeconds(now.getSeconds() - amount);
        break;
      case 'minute':
        now.setMinutes(now.getMinutes() - amount);
        break;
      case 'hour':
        now.setHours(now.getHours() - amount);
        break;
      case 'day':
        now.setDate(now.getDate() - amount);
        break;
      case 'week':
        now.setDate(now.getDate() - amount * 7);
        break;
      case 'month':
        now.setMonth(now.getMonth() - amount);
        break;
      case 'year':
        now.setFullYear(now.getFullYear() - amount);
        break;
    }
    return now;
  }

  throw new Error(`Invalid time filter format: ${timeStr}. Use ISO date format (e.g., "2024-01-01") or relative time (e.g., "7 days ago")`);
}

/**
 * Check if file matches time filter criteria
 */
function matchesTimeFilter(file: TFile, afterTime: Date | null, beforeTime: Date | null): boolean {
  const mtime = new Date(file.stat.mtime);
  
  if (afterTime && mtime < afterTime) {
    return false;
  }
  
  if (beforeTime && mtime > beforeTime) {
    return false;
  }
  
  return true;
}

/**
 * Generate a description of the time filter for display in results
 */
function getTimeFilterDescription(afterTime: Date | null, beforeTime: Date | null): string {
  if (!afterTime && !beforeTime) {
    return '';
  }
  
  const parts: string[] = [];
  if (afterTime) {
    parts.push(`modified after ${afterTime.toLocaleString()}`);
  }
  if (beforeTime) {
    parts.push(`modified before ${beforeTime.toLocaleString()}`);
  }
  
  return ` (${parts.join(' and ')})`;
}


/**
 * Unified note search tool - combines file name search, content search, and text search
 * Supports time-based filtering by modification date
 * Uses standard glob patterns for file matching (powered by minimatch)
 */
export const searchNotesTool: MastraTool = createMastraTool({
  category: 'note-management',
  id: 'search_notes',
  description: 'Search for notes in the vault using standard glob patterns, text content, or regex. Supports "filename" mode with glob patterns (*, **, ?, [abc], {a,b}), "text" for simple text search, and "regex" for advanced pattern matching. Can filter by modification time (modified_after/modified_before).',
  
  inputSchema: z.object({
    mode: z.enum(['filename', 'text', 'regex'])
      .describe('Search mode: "filename" for glob pattern search, "text" for simple text search, "regex" for regex pattern search'),
    
    query: z.string()
      .min(1)
      .describe('Search query: glob pattern (e.g., "**/*.md", "project-*.txt") for filename mode, text string for text mode, or regex pattern for regex mode'),
    
    path: z.string()
      .optional()
      .default('')
      .describe('Directory path to search in, supports searching within a specific folder and all its subdirectories (e.g., "projects", "work/reports"). Defaults to vault root if not specified.'),
    
    file_pattern: z.string()
      .optional()
      .default('*.md')
      .describe('Glob pattern to filter files (e.g., "*.md", "**/*.{md,txt}"), only used in text and regex modes'),
    
    case_sensitive: z.boolean()
      .optional()
      .default(false)
      .describe('Whether search should be case sensitive (only for regex mode, defaults to false)'),
    
    max_results: z.number()
      .min(1)
      .optional()
      .default(50)
      .describe('Maximum number of results to return (only for text and regex modes, defaults to 50)'),
    
    include_folders: z.boolean()
      .optional()
      .default(false)
      .describe('Whether to include folders in results (only for filename mode, defaults to false)'),
    
    modified_after: z.string()
      .optional()
      .describe('Filter notes modified after this date/time (ISO 8601 format or relative time like "7 days ago", "1 week ago", "2024-01-01")'),
    
    modified_before: z.string()
      .optional()
      .describe('Filter notes modified before this date/time (ISO 8601 format or relative time like "1 day ago", "2024-12-31")'),
    
    timeout: z.number()
      .min(1000)
      .max(300000)
      .optional()
      .default(30000)
      .describe('Maximum execution time in milliseconds (1000-300000). Default: 30000 (30 seconds)')
  }),
  
  outputSchema: z.string()
    .describe('Formatted text listing search results with file paths and matching content snippets.'),
  
  execute: async ({ context }) => {
    const app = getApp();
    const {
      mode,
      query,
      path = '',
      file_pattern = '*.md',
      case_sensitive = false,
      max_results = 50,
      include_folders = false,
      modified_after,
      modified_before,
      timeout = 30000
    } = context;
    
    Logger.debug(`[search_notes] Starting search in ${mode} mode with timeout ${timeout}ms`);
    
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        Logger.warn(`[search_notes] Search timeout after ${timeout}ms`);
        reject(new Error(`Search timeout after ${timeout / 1000} seconds. Try reducing search scope or increasing timeout.`));
      }, timeout);
    });
    
    // Create main search promise
    const searchPromise = (async () => {

    // Parse time filters
    const afterTime = modified_after ? parseTimeFilter(modified_after) : null;
    const beforeTime = modified_before ? parseTimeFilter(modified_before) : null;
    
    // Normalize search path for proper directory filtering
    const searchPath = normalizeSearchPath(path);

    // Mode 1: Search by filename using glob pattern
    if (mode === 'filename') {
      const results: { path: string; type: 'file' | 'folder'; mtime?: number }[] = [];
      const allFiles = app.vault.getAllLoadedFiles();
      Logger.debug(`[search_notes] Searching ${allFiles.length} files with filename pattern "${query}"`);

      // Prepare glob pattern
      const globPattern = query;

      for (const file of allFiles) {
        // Filter by directory - check if file is within the specified directory
        if (!isFileInDirectory(file.path, searchPath)) continue;

        // Use minimatch for glob pattern matching
        // If pattern contains path separators, match against full path
        // Otherwise, match against just the filename
        const matchTarget = globPattern.includes('/') ? file.path : file.name;
        const isMatch = minimatch(matchTarget, globPattern, { 
          nocase: true,  // Case-insensitive matching
          dot: true      // Match files starting with .
        });

        if (isMatch) {
          if (file instanceof TFile) {
            // Apply time filter for files
            if (!matchesTimeFilter(file, afterTime, beforeTime)) continue;
            results.push({ path: file.path, type: 'file', mtime: file.stat.mtime });
          } else if (file instanceof TFolder && include_folders) {
            results.push({ path: file.path, type: 'folder' });
          }
        }
      }

      if (results.length === 0) {
        const timeFilterDesc = getTimeFilterDescription(afterTime, beforeTime);
        const pathDesc = searchPath ? ` in directory "${searchPath.slice(0, -1)}" (including subdirectories)` : '';
        return `Found 0 results for filename pattern "${query}"${pathDesc}${timeFilterDesc}.`;
      }

      const resultLines = results.map(({ path, type, mtime }) => {
        const mtimeStr = mtime ? ` (modified: ${new Date(mtime).toLocaleString()})` : '';
        return `${type === 'folder' ? '[DIR]' : ''} ${path}${mtimeStr}`;
      });

      const timeFilterDesc = getTimeFilterDescription(afterTime, beforeTime);
      const pathDesc = searchPath ? ` in directory "${searchPath.slice(0, -1)}" (including subdirectories)` : '';
      return `Found ${results.length} result${results.length === 1 ? '' : 's'} for filename pattern "${query}"${pathDesc}${timeFilterDesc}:\n\n${resultLines.join('\n')}`;
    }

    // Mode 2: Simple text search with glob file pattern filtering
    if (mode === 'text') {
      const results: { path: string; mtime: number }[] = [];
      const allFiles = app.vault.getMarkdownFiles();
      const searchText = query.toLowerCase();
      Logger.debug(`[search_notes] Searching ${allFiles.length} markdown files for text "${query}"`);
      
      let processedFiles = 0;
      for (const file of allFiles) {
        // Filter by directory - check if file is within the specified directory
        if (!isFileInDirectory(file.path, searchPath)) continue;
        
        // Use minimatch for file pattern filtering
        if (!minimatch(file.name, file_pattern, { nocase: true, dot: true })) continue;
        
        // Apply time filter
        if (!matchesTimeFilter(file, afterTime, beforeTime)) continue;

        try {
          const content = await app.vault.read(file);
          processedFiles++;
          if (processedFiles % 100 === 0) {
            Logger.debug(`[search_notes] Processed ${processedFiles}/${allFiles.length} files, found ${results.length} matches`);
          }
          if (content.toLowerCase().includes(searchText)) {
            results.push({ path: file.path, mtime: file.stat.mtime });
          }
        } catch (error) {
          Logger.warn(`[search_notes] Failed to read file ${file.path}:`, error);
        }

        if (results.length >= max_results) {
          Logger.debug(`[search_notes] Reached max_results limit (${max_results})`);
          break;
        }
      }
      Logger.debug(`[search_notes] Text search completed. Processed ${processedFiles} files, found ${results.length} matches`);

      if (results.length === 0) {
        const timeFilterDesc = getTimeFilterDescription(afterTime, beforeTime);
        const pathDesc = searchPath ? ` in directory "${searchPath.slice(0, -1)}" (including subdirectories)` : '';
        return `Found 0 files containing text "${query}"${pathDesc}${timeFilterDesc}.`;
      }

      const resultLines = results.map(({ path, mtime }) =>
        `${path} (modified: ${new Date(mtime).toLocaleString()})`
      );

      const truncated = results.length >= max_results ? ` (showing first ${max_results} results)` : '';
      const timeFilterDesc = getTimeFilterDescription(afterTime, beforeTime);
      const pathDesc = searchPath ? ` in directory "${searchPath.slice(0, -1)}" (including subdirectories)` : '';
      return `Found ${results.length} file${results.length === 1 ? '' : 's'} containing text "${query}"${pathDesc}${timeFilterDesc}${truncated}:\n\n${resultLines.join('\n')}`;
    }

    // Mode 3: Regex content search with glob file pattern filtering
    if (mode === 'regex') {
      try {
        const searchRegex = new RegExp(query, case_sensitive ? 'g' : 'gi');

        const results: { file: string; line: number; content: string; match: string; mtime: number }[] = [];
        const allFiles = app.vault.getMarkdownFiles();
        Logger.debug(`[search_notes] Searching ${allFiles.length} markdown files with regex "${query}"`);
        
        let processedFiles = 0;
        for (const file of allFiles) {
          // Filter by directory - check if file is within the specified directory
          if (!isFileInDirectory(file.path, searchPath)) continue;
          
          // Use minimatch for file pattern filtering
          if (!minimatch(file.name, file_pattern, { nocase: true, dot: true })) continue;
          
          // Apply time filter
          if (!matchesTimeFilter(file, afterTime, beforeTime)) continue;

          try {
            const content = await app.vault.read(file);
            processedFiles++;
            if (processedFiles % 100 === 0) {
              Logger.debug(`[search_notes] Processed ${processedFiles}/${allFiles.length} files, found ${results.length} matches`);
            }
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              const matches = [...line.matchAll(searchRegex)];

              for (const match of matches) {
                results.push({
                  file: file.path,
                  line: i + 1,
                  content: line.trim(),
                  match: match[0],
                  mtime: file.stat.mtime
                });

                if (results.length >= max_results) break;
              }

              if (results.length >= max_results) break;
            }
          } catch (error) {
            Logger.warn(`[search_notes] Failed to read file ${file.path}:`, error);
          }

          if (results.length >= max_results) {
            Logger.debug(`[search_notes] Reached max_results limit (${max_results})`);
            break;
          }
        }
        Logger.debug(`[search_notes] Regex search completed. Processed ${processedFiles} files, found ${results.length} matches`);

        if (results.length === 0) {
          const timeFilterDesc = getTimeFilterDescription(afterTime, beforeTime);
          const pathDesc = searchPath ? ` in directory "${searchPath.slice(0, -1)}" (including subdirectories)` : '';
          return `Found 0 results for regex "${query}"${pathDesc}${timeFilterDesc}.`;
        }

        const resultLines = results.map(({ file, line, content }) =>
          `${file}:${line}: ${content}`
        );

        const truncated = results.length >= max_results ? ` (showing first ${max_results} results)` : '';
        const timeFilterDesc = getTimeFilterDescription(afterTime, beforeTime);
        const pathDesc = searchPath ? ` in directory "${searchPath.slice(0, -1)}" (including subdirectories)` : '';
        return `Found ${results.length} result${results.length === 1 ? '' : 's'} for regex "${query}"${pathDesc}${timeFilterDesc}${truncated}:\n\n${resultLines.join('\n')}`;
      } catch (error) {
        throw new Error(`Invalid regex pattern: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    throw new Error(`Invalid search mode: ${mode}. Must be one of: filename, text, regex`);
    })();
    
    // Race between search and timeout
    return await Promise.race([searchPromise, timeoutPromise]);
  }
});
