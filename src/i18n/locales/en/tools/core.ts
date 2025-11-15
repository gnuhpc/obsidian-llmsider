/**
 * Core tools - file management, editor, search
 */

export const enCoreTools = {
	createFile: {
			name: 'Create File',
			description: 'Create a new file with specified content'
		},
viewFile: {
			name: 'View File',
			description: 'View one or multiple file contents or directory listings within the Obsidian vault. Supports viewing multiple files in a single call by passing an array of paths.'
		},
replaceText: {
			name: 'Replace Text',
			description: 'Replace text in a file with validation for unique matches'
		},
insertText: {
			name: 'Insert Text',
			description: 'Insert content at a specific line in a file'
		},
editorUndo: {
			name: 'Editor Undo',
			description: 'Undo the last edit operation in the currently active editor using Obsidian\'s native undo functionality'
		},
editorRedo: {
			name: 'Editor Redo',
			description: 'Redo the last undone operation in the currently active editor using Obsidian\'s native redo functionality'
		},
moveNote: {
			name: 'Move Note',
			description: 'Move one or multiple notes to a different folder in the vault. Supports single file or batch moving multiple files at once.'
		},
renameNote: {
			name: 'Rename Note',
			description: 'Rename a note and automatically update all links to it'
		},
deleteNote: {
			name: 'Delete Note',
			description: 'Delete a note by moving it to trash or permanently'
		},
mergeNotes: {
			name: 'Merge Notes',
			description: 'Merge content from one note into another'
		},
copyNote: {
			name: 'Copy Note',
			description: 'Create a copy of a note with a new name or in a different folder'
		},
duplicateNote: {
			name: 'Duplicate Note',
			description: 'Create a duplicate of a note in the same folder'
		},
textSearchReplace: {
			name: 'Text Search & Replace',
			description: 'Search for patterns in text and optionally replace them'
		},
getCurrentTime: {
			name: 'Get Current Time',
			description: 'Get the current date and time in various formats'
		},
append: {
			name: 'Append Content',
			description: 'Append content to the end of a file'
		},
listDirectory: {
			name: 'List Directory',
			description: 'List all folders and files in a directory. Returns both subdirectories and files, with optional detailed statistics (size, modification time). Use this to browse vault structure or discover existing content.'
		},
moveFile: {
			name: 'Move File',
			description: 'Move or rename a file within the vault using Obsidian FileManager'
		},
trashFile: {
			name: 'Trash File',
			description: 'Move a file to trash using Obsidian FileManager (respects user preferences)'
		},
sed: {
			name: 'Sed Transform',
			description: 'Apply sed-like text transformations to a file using regular expressions. Supports basic sed syntax (s/pattern/replacement/flags). Supports flags: g (global), i (case-insensitive), m (multiline).'
		},
fileExists: {
			name: 'File Exists',
			description: 'Check if a file exists using FileSystemAdapter with case sensitivity option'
		},
insertAtCursor: {
			name: 'Insert at Cursor',
			description: 'Insert text at the current cursor position in the active editor'
		},
searchFiles: {
			name: 'Search Files',
			description: 'Search for files by name pattern in the vault. Supports glob-like patterns with * and ?.'
		},
searchContent: {
			name: 'Search Content',
			description: 'Search for text content within files using regex patterns.'
		},
findFilesContaining: {
			name: 'Find Files Containing',
			description: 'Find files that contain specific text (case-insensitive simple search).'
		},
};
