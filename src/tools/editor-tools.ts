// File editing and workspace management tools
import { App, TFile, WorkspaceLeaf, MarkdownView, Notice } from 'obsidian';
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
 * Open a file in Obsidian editor
 */
export const openFileTool: BuiltInTool = {
  name: 'open_file',
  description: 'Open a file in the Obsidian editor. Creates a new tab or focuses existing one.',
  category: 'editor',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to open'
      },
      line: {
        type: 'number',
        description: 'Line number to jump to (optional)'
      },
      new_pane: {
        type: 'boolean',
        description: 'Whether to open in a new pane (defaults to false)',
        default: false
      },
      split_direction: {
        type: 'string',
        description: 'Direction to split if opening in new pane: "horizontal", "vertical"',
        enum: ['horizontal', 'vertical'],
        default: 'vertical'
      }
    },
    required: ['path']
  },
  async execute(args: {
    path: string;
    line?: number;
    new_pane?: boolean;
    split_direction?: 'horizontal' | 'vertical'
  }): Promise<string> {
    const app = getApp();
    const { path, line, new_pane = false, split_direction = 'vertical' } = args;

    const file = app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      throw new Error(`File not found: ${path}`);
    }

    try {
      let leaf: WorkspaceLeaf;

      if (new_pane) {
        const direction = split_direction === 'horizontal' ? 'horizontal' : 'vertical';
        leaf = app.workspace.getLeaf('split', direction);
      } else {
        leaf = app.workspace.getLeaf();
      }

      await leaf.openFile(file);

      // Jump to specific line if specified
      if (line && typeof line === 'number' && line > 0) {
        const view = leaf.view;
        if (view instanceof MarkdownView) {
          const editor = view.editor;
          const lineCount = editor.lineCount();

          if (line <= lineCount) {
            editor.setCursor(line - 1, 0);
            editor.scrollIntoView({ from: { line: line - 1, ch: 0 }, to: { line: line - 1, ch: 0 } });
          } else {
            new Notice(`Line ${line} is beyond file length (${lineCount} lines)`);
          }
        }
      }

      app.workspace.setActiveLeaf(leaf);
      return `Successfully opened ${path}${line ? ` at line ${line}` : ''}${new_pane ? ' in new pane' : ''}`;
    } catch (error: any) {
      throw new Error(`Failed to open file: ${error.message}`);
    }
  }
};

/**
 * Create and open a new file
 */
export const createAndOpenFileTool: BuiltInTool = {
  name: 'create_and_open_file',
  description: 'Create a new file and open it in the editor. Optionally set initial content.',
  category: 'editor',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path for the new file'
      },
      content: {
        type: 'string',
        description: 'Initial content for the file',
        default: ''
      },
      template: {
        type: 'string',
        description: 'Template to use (if available in vault)',
      },
      open_after_create: {
        type: 'boolean',
        description: 'Whether to open the file after creation (defaults to true)',
        default: true
      }
    },
    required: ['path']
  },
  async execute(args: {
    path: string;
    content?: string;
    template?: string;
    open_after_create?: boolean;
  }): Promise<string> {
    const app = getApp();
    let { path } = args;
    const { content = '', template, open_after_create = true } = args;

    // Check if file already exists
    const existingFile = app.vault.getAbstractFileByPath(path);
    if (existingFile) {
      // Generate new filename with incremental suffix
      const lastDotIndex = path.lastIndexOf('.');
      const baseName = lastDotIndex > 0 ? path.slice(0, lastDotIndex) : path;
      const extension = lastDotIndex > 0 ? path.slice(lastDotIndex) : '';

      // Try to find an available filename with incremental suffix
      let counter = 1;
      let finalPath: string;
      let foundAvailable = false;

      while (counter <= 100) { // Safety limit to prevent infinite loop
        finalPath = `${baseName}-${counter}${extension}`;
        
        // Check if this path is available
        if (!app.vault.getAbstractFileByPath(finalPath)) {
          Logger.debug(`File exists, using alternative path: ${finalPath}`);
          path = finalPath;
          foundAvailable = true;
          break;
        }
        
        counter++;
      }

      if (!foundAvailable) {
        throw new Error(`Could not find available filename after ${counter - 1} attempts. Original path: ${args.path}`);
      }
      
      new Notice(`File already exists, creating: ${path}`);
    }

    try {
      let finalContent = content;

      // If template is specified, try to load it
      if (template) {
        const templateFile = app.vault.getAbstractFileByPath(template);
        if (templateFile instanceof TFile) {
          const templateContent = await app.vault.read(templateFile);
          finalContent = templateContent + (content ? `\n\n${content}` : '');
        } else {
          new Notice(`Template file not found: ${template}, using provided content only`);
        }
      }

      const createdFile = await app.vault.create(path, finalContent);

      if (open_after_create) {
        const leaf = app.workspace.getLeaf();
        await leaf.openFile(createdFile);
        app.workspace.setActiveLeaf(leaf);
      }

      return `Successfully created ${open_after_create ? 'and opened ' : ''}file: ${path}`;
    } catch (error: any) {
      throw new Error(`Failed to create file: ${error.message}`);
    }
  }
};

/**
 * Get current active file information
 */
export const getCurrentFileTool: BuiltInTool = {
  name: 'get_current_file',
  description: 'Get information about the currently active file in the editor.',
  category: 'editor',
  inputSchema: {
    type: 'object',
    properties: {
      include_content: {
        type: 'boolean',
        description: 'Whether to include file content in response (defaults to false)',
        default: false
      },
      include_cursor: {
        type: 'boolean',
        description: 'Whether to include cursor position (defaults to true)',
        default: true
      }
    },
    required: []
  },
  async execute(args: { include_content?: boolean; include_cursor?: boolean }): Promise<string> {
    const app = getApp();
    const { include_content = false, include_cursor = true } = args;

    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) {
      return 'No file is currently active in the editor';
    }

    const result: string[] = [];
    result.push(`Active file: ${activeFile.path}`);
    result.push(`File size: ${activeFile.stat.size} bytes`);
    result.push(`Last modified: ${new Date(activeFile.stat.mtime).toLocaleString()}`);

    // Get cursor position if requested
    if (include_cursor) {
      const activeView = app.workspace.getActiveViewOfType(MarkdownView);
      if (activeView) {
        const editor = activeView.editor;
        const cursor = editor.getCursor();
        const selection = editor.getSelection();

        result.push(`Cursor position: line ${cursor.line + 1}, column ${cursor.ch + 1}`);
        if (selection) {
          result.push(`Selected text length: ${selection.length} characters`);
        }
      }
    }

    // Include content if requested
    if (include_content) {
      try {
        const content = await app.vault.read(activeFile);
        result.push(`\nContent:\n${content}`);
      } catch (error: any) {
        result.push(`Error reading content: ${error.message}`);
      }
    }

    return result.join('\n');
  }
};

/**
 * Insert text at cursor position
 */
export const insertAtCursorTool: BuiltInTool = {
  name: 'insert_at_cursor',
  description: 'Insert text at the current cursor position in the active editor.',
  category: 'editor',
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Text to insert'
      },
      newline_before: {
        type: 'boolean',
        description: 'Add newline before inserted text (defaults to false)',
        default: false
      },
      newline_after: {
        type: 'boolean',
        description: 'Add newline after inserted text (defaults to false)',
        default: false
      }
    },
    required: ['text']
  },
  async execute(args: { text: string; newline_before?: boolean; newline_after?: boolean }): Promise<string> {
    const app = getApp();
    const { text, newline_before = false, newline_after = false } = args;

    const activeView = app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView) {
      throw new Error('No active markdown editor found');
    }

    const editor = activeView.editor;
    const cursor = editor.getCursor();

    let insertText = text;
    if (newline_before) insertText = '\n' + insertText;
    if (newline_after) insertText = insertText + '\n';

    editor.replaceRange(insertText, cursor);

    // Move cursor to end of inserted text
    const newCursor = {
      line: cursor.line + (insertText.match(/\n/g) || []).length,
      ch: insertText.includes('\n') ?
          insertText.split('\n').pop()!.length :
          cursor.ch + insertText.length
    };
    editor.setCursor(newCursor);

    return `Successfully inserted ${text.length} characters at line ${cursor.line + 1}, column ${cursor.ch + 1}`;
  }
};

/**
 * Replace selected text or text at cursor
 */
export const replaceSelectionTool: BuiltInTool = {
  name: 'replace_selection',
  description: 'Replace the currently selected text in the active editor.',
  category: 'editor',
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Text to replace selection with'
      }
    },
    required: ['text']
  },
  async execute(args: { text: string }): Promise<string> {
    const app = getApp();
    const { text } = args;

    const activeView = app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView) {
      throw new Error('No active markdown editor found');
    }

    const editor = activeView.editor;
    const selection = editor.getSelection();

    if (selection) {
      editor.replaceSelection(text);
      return `Successfully replaced ${selection.length} characters with new text (${text.length} characters)`;
    } else {
      const cursor = editor.getCursor();
      editor.replaceRange(text, cursor);
      return `Successfully inserted text at cursor position (${text.length} characters)`;
    }
  }
};

/**
 * Navigate to a specific line in the current file
 */
export const gotoLineTool: BuiltInTool = {
  name: 'goto_line',
  description: 'Navigate to a specific line in the currently active file.',
  category: 'editor',
  inputSchema: {
    type: 'object',
    properties: {
      line: {
        type: 'number',
        description: 'Line number to navigate to (1-based)'
      },
      column: {
        type: 'number',
        description: 'Column position (optional, defaults to 0)',
        default: 0
      }
    },
    required: ['line']
  },
  async execute(args: { line: number; column?: number }): Promise<string> {
    const app = getApp();
    const { line, column = 0 } = args;

    const activeView = app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView) {
      throw new Error('No active markdown editor found');
    }

    const editor = activeView.editor;
    const lineCount = editor.lineCount();

    if (line < 1 || line > lineCount) {
      throw new Error(`Line ${line} is out of range (1-${lineCount})`);
    }

    const targetLine = line - 1; // Convert to 0-based
    const lineLength = editor.getLine(targetLine).length;
    const targetCol = Math.min(Math.max(0, column), lineLength);

    editor.setCursor(targetLine, targetCol);
    editor.scrollIntoView({
      from: { line: targetLine, ch: targetCol },
      to: { line: targetLine, ch: targetCol }
    });

    return `Successfully navigated to line ${line}, column ${targetCol + 1}`;
  }
};

/**
 * Undo the last edit operation in the active editor
 */
export const editorUndoTool: BuiltInTool = {
  name: 'editor_undo',
  description: 'Undo the last edit operation in the currently active editor (or a specified file) using Obsidian\'s native undo functionality. If a file path is provided, the file will be opened first before performing undo. If no path is provided and no editor is active, automatically opens the most recently modified file and performs undo on it.',
  category: 'editor',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Optional path to the file to undo changes in. If not provided, uses the currently active editor or the most recently modified file.'
      }
    },
    required: []
  },
  async execute(args: { path?: string } = {}): Promise<string> {
    const app = getApp();
    let { path } = args;

    // Try to get the active markdown view first
    let activeView = app.workspace.getActiveViewOfType(MarkdownView);

    // If no active view and no path provided, auto-select the most recently modified file
    if (!activeView && !path) {
      const allFiles = app.vault.getMarkdownFiles();
      if (allFiles.length === 0) {
        throw new Error('No markdown files found in the vault.');
      }

      // Get the most recently modified file
      const mostRecentFile = allFiles.sort((a, b) => b.stat.mtime - a.stat.mtime)[0];
      path = mostRecentFile.path;
      
      new Notice(`No active editor found. Auto-opening most recent file: ${mostRecentFile.name}`);
    }

    // If path is provided (either by user or auto-selected), open the file first
    if (path) {
      const file = app.vault.getAbstractFileByPath(path);
      if (!(file instanceof TFile)) {
        throw new Error(`File not found: ${path}`);
      }

      // Open the file
      const leaf = app.workspace.getLeaf();
      await leaf.openFile(file);
      app.workspace.setActiveLeaf(leaf);
      
      // Wait a moment for the editor to initialize
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Get the active view again after opening
      activeView = app.workspace.getActiveViewOfType(MarkdownView);
    }

    if (!activeView) {
      throw new Error('Failed to get active markdown editor after opening file.');
    }

    const editor = activeView.editor;
    const file = activeView.file;

    if (!file) {
      throw new Error('No file associated with the active editor. Please ensure a valid file is open.');
    }

    try {
      // Store the content before undo to check if anything actually changed
      const contentBefore = editor.getValue();
      
      // Use the editor's undo method (it handles its own history checks)
      editor.undo();
      
      // Check if content actually changed
      const contentAfter = editor.getValue();
      
      if (contentBefore === contentAfter) {
        return `No undo history available in ${file.path}. The file may not have any recent edits to undo.`;
      }

      new Notice(`Undo successful in ${file.name}`);

      return `Successfully undid last edit operation in ${file.path}`;
    } catch (error: any) {
      throw new Error(`Failed to undo in ${file.path}: ${error.message}`);
    }
  }
};

/**
 * Redo the last undone operation in the active editor
 */
export const editorRedoTool: BuiltInTool = {
  name: 'editor_redo',
  description: 'Redo the last undone operation in the currently active editor (or a specified file) using Obsidian\'s native redo functionality. If a file path is provided, the file will be opened first before performing redo. If no path is provided and no editor is active, automatically opens the most recently modified file and performs redo on it.',
  category: 'editor',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Optional path to the file to redo changes in. If not provided, uses the currently active editor or the most recently modified file.'
      }
    },
    required: []
  },
  async execute(args: { path?: string } = {}): Promise<string> {
    const app = getApp();
    let { path } = args;

    // Try to get the active markdown view first
    let activeView = app.workspace.getActiveViewOfType(MarkdownView);

    // If no active view and no path provided, auto-select the most recently modified file
    if (!activeView && !path) {
      const allFiles = app.vault.getMarkdownFiles();
      if (allFiles.length === 0) {
        throw new Error('No markdown files found in the vault.');
      }

      // Get the most recently modified file
      const mostRecentFile = allFiles.sort((a, b) => b.stat.mtime - a.stat.mtime)[0];
      path = mostRecentFile.path;
      
      new Notice(`No active editor found. Auto-opening most recent file: ${mostRecentFile.name}`);
    }

    // If path is provided (either by user or auto-selected), open the file first
    if (path) {
      const file = app.vault.getAbstractFileByPath(path);
      if (!(file instanceof TFile)) {
        throw new Error(`File not found: ${path}`);
      }

      // Open the file
      const leaf = app.workspace.getLeaf();
      await leaf.openFile(file);
      app.workspace.setActiveLeaf(leaf);
      
      // Wait a moment for the editor to initialize
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Get the active view again after opening
      activeView = app.workspace.getActiveViewOfType(MarkdownView);
    }

    if (!activeView) {
      throw new Error('Failed to get active markdown editor after opening file.');
    }

    const editor = activeView.editor;
    const file = activeView.file;

    if (!file) {
      throw new Error('No file associated with the active editor');
    }

    try {
      // Store the content before redo to check if anything actually changed
      const contentBefore = editor.getValue();
      
      // Use the editor's redo method (it handles its own history checks)
      editor.redo();
      
      // Check if content actually changed
      const contentAfter = editor.getValue();
      
      if (contentBefore === contentAfter) {
        return `No redo history available in ${file.path}. There are no undone operations to redo.`;
      }

      new Notice(`Redo successful in ${file.name}`);

      return `Successfully redid last undone operation in ${file.path}`;
    } catch (error: any) {
      throw new Error(`Failed to redo: ${error.message}`);
    }
  }
};