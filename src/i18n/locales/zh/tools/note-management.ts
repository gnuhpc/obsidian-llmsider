/**
 * Note management tools - file operations, content manipulation
 */

export const zhNoteManagementTools = {
	generateContent: {
		name: '生成内容',
		description: '基于上下文和要求使用AI生成内容'
	},
	createFile: {
		name: '创建笔记',
		description: '创建包含指定内容的新笔记'
	},
	viewFile: {
		name: '查看笔记',
		description: '查看Obsidian库中一个或多个笔记的内容或目录列表。支持通过传递路径数组在单次调用中查看多个笔记。'
	},
	replaceText: {
		name: '替换文本',
		description: '在笔记中替换文本，验证唯一匹配'
	},
	insert: {
		name: '插入文本',
		description: '在笔记的特定位置或上下文中插入文本'
	},
	strReplace: {
		name: '字符串替换',
		description: '使用字符串匹配替换笔记中的文本'
	},
	insertText: {
		name: '插入文本',
		description: '在笔记指定行插入内容'
	},
	moveNote: {
		name: '移动笔记',
		description: '将一个或多个笔记移动到库中的不同文件夹。支持单笔记移动或批量移动多个笔记。'
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
		description: '向笔记末尾追加内容'
	},
	sed: {
		name: 'Sed 转换',
		description: '使用正则表达式对笔记应用类似 sed 的文本转换。支持基本的 sed 语法（s/pattern/replacement/flags）。支持标志：g（全局）、i（不区分大小写）、m（多行）。'
	},
	searchNotes: {
		name: '搜索笔记',
		description: '在库中搜索笔记,支持标准 glob 模式、文本内容和正则表达式三种搜索模式。filename 模式支持 glob 语法(*, **, ?, [abc], {a,b})、text 模式用于简单文本搜索、regex 模式用于高级正则匹配。支持按修改时间过滤笔记(可指定修改时间范围)。'
	},
	processFrontmatter: {
		name: '处理 Frontmatter',
		description: '处理和更新 Markdown 文件中的 Frontmatter。'
	},
	copy_file: {
		name: '复制文件',
		description: '将文件从源复制到目标。'
	},
	copyFile: {
		name: '复制文件',
		description: '将文件从源复制到目标。'
	},
	file_exists: {
		name: '文件存在检查',
		description: '检查文件或目录是否存在。'
	},
	fileExists: {
		name: '文件存在检查',
		description: '检查文件或目录是否存在。'
	},
	list_file_directory: {
		name: '列出目录',
		description: '列出目录中的所有文件夹和文件。'
	},
	listDirectory: {
		name: '列出目录',
		description: '列出目录中的所有文件夹和文件。'
	},
	for_each: {
		name: '循环执行',
		description: '对数组中的每个项目重复执行工具。'
	},
	forEach: {
		name: '循环执行',
		description: '对数组中的每个项目重复执行工具。'
	}
};
