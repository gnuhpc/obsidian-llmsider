/**
 * Core tools - file management, editor, search
 */

export const zhCoreTools = {
	createFile: {
			name: '创建文件',
			description: '创建包含指定内容的新文件'
		},
viewFile: {
			name: '查看文件',
			description: '查看Obsidian库中一个或多个文件的内容或目录列表。支持通过传递路径数组在单次调用中查看多个文件。'
		},
replaceText: {
			name: '替换文本',
			description: '在文件中替换文本，验证唯一匹配'
		},
insertText: {
			name: '插入文本',
			description: '在文件指定行插入内容'
		},
editorUndo: {
			name: '编辑器撤销',
			description: '使用Obsidian原生撤销功能撤销当前活动编辑器中的最后一次编辑操作'
		},
editorRedo: {
			name: '编辑器重做',
			description: '使用Obsidian原生重做功能重做当前活动编辑器中最后一次撤销的操作'
		},
moveNote: {
			name: '移动笔记',
			description: '将一个或多个笔记移动到库中的不同文件夹。支持单文件移动或批量移动多个文件。'
		},
renameNote: {
			name: '重命名笔记',
			description: '重命名笔记并自动更新所有指向它的链接'
		},
deleteNote: {
			name: '删除笔记',
			description: '将笔记移动到废纸篓或永久删除'
		},
mergeNotes: {
			name: '合并笔记',
			description: '将一个笔记的内容合并到另一个笔记中'
		},
copyNote: {
			name: '复制笔记',
			description: '使用新名称或在不同文件夹中创建笔记的副本'
		},
duplicateNote: {
			name: '复制笔记副本',
			description: '在同一文件夹中创建笔记的副本'
		},
textSearchReplace: {
			name: '文本搜索替换',
			description: '搜索文本中的模式并可选择性地替换它们'
		},
getCurrentTime: {
			name: '获取当前时间',
			description: '获取多种格式的当前日期和时间'
		},
append: {
			name: '追加内容',
			description: '向文件末尾追加内容'
		},
listDirectory: {
			name: '列出目录',
			description: '列出目录中的所有文件夹和文件。返回子目录和文件,可选包含详细统计信息（大小、修改时间）。用于浏览库结构或发现现有内容。'
		},
moveFile: {
			name: '移动文件',
			description: '使用 Obsidian FileManager 在库内移动或重命名文件'
		},
trashFile: {
			name: '删除文件',
			description: '使用 Obsidian FileManager 将文件移动到回收站（遵循用户偏好设置）'
		},
sed: {
			name: 'Sed 转换',
			description: '使用正则表达式对文件应用类似 sed 的文本转换。支持基本的 sed 语法（s/pattern/replacement/flags）。支持标志：g（全局）、i（不区分大小写）、m（多行）。'
		},
fileExists: {
			name: '文件存在性检查',
			description: '使用 FileSystemAdapter 检查文件是否存在，支持大小写敏感选项'
		},
insertAtCursor: {
			name: '在光标处插入',
			description: '在活动编辑器的当前光标位置插入文本'
		},
searchFiles: {
			name: '搜索文件',
			description: '按名称模式在库中搜索文件。支持通配符 * 和 ? 的类glob模式。'
		},
searchContent: {
			name: '搜索内容',
			description: '使用正则表达式在文件中搜索文本内容。'
		},
findFilesContaining: {
			name: '查找包含文本的文件',
			description: '查找包含特定文本的文件（不区分大小写的简单搜索）。'
		},
};
