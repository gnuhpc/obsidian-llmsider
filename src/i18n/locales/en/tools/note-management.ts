/**
 * Note management tools - file operations, editing, searching
 */

export const enNoteManagementTools = {
	generateContent: {
		name: 'Generate Content',
		description: 'Generate content using AI based on context and requirements'
	},
	createFile: {
		name: 'Create Note',
		description: 'Create a new note with specified content'
	},
	viewFile: {
		name: 'View Note',
		description: 'View one or multiple note contents or directory listings within the Obsidian vault. Supports viewing multiple notes in a single call by passing an array of paths.'
	},
	replaceText: {
		name: 'Replace Text',
		description: 'Replace text in a note with validation for unique matches'
	},
	insert: {
		name: 'Insert Text',
		description: 'Insert text into a note at a specific position or context'
	},
	strReplace: {
		name: 'String Replace',
		description: 'Replace text in a note using string matching'
	},
	insertText: {
		name: 'Insert Text',
		description: 'Insert content at a specific line in a note'
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
		description: 'Move one or multiple notes to a different folder in the vault. Supports single note or batch moving multiple notes at once.'
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
		name: 'Append',
		description: 'Append content to the end of a note'
	},
	sed: {
		name: 'Sed Transform',
		description: 'Apply sed-like text transformations to a note using regular expressions. Supports basic sed syntax (s/pattern/replacement/flags). Supports flags: g (global), i (case-insensitive), m (multiline).'
	},
	createAndOpenFile: {
		name: 'Create and Open Note',
		description: 'Create a new note and open it in the editor immediately'
	},
	gotoLine: {
		name: 'Go to Line',
		description: 'Navigate to a specific line in the currently active file'
	},
	replaceSelection: {
		name: 'Replace Selection',
		description: 'Replace the currently selected text in the active editor'
	},
	generateMarkdownLink: {
		name: 'Generate Markdown Link',
		description: 'Generate a Markdown link for a file using Obsidian\'s link generation logic'
	},
	getAttachmentPath: {
		name: 'Get Attachment Path',
		description: 'Get the path where a new attachment should be saved based on settings'
	},
	searchNotes: {
		name: 'Search Notes',
		description: 'Search for notes using standard glob patterns, text content, or regex. Supports filename mode with glob syntax (*, **, ?, [abc], {a,b}), text mode for simple text search, and regex mode for advanced pattern matching. Filter by modification time range (specify modified_after/modified_before).'
	}
};
