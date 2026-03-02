/**
 * Core tools - file management, editor, search
 */

export const zhCoreTools = {
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
			description: '在库中搜索笔记,支持文件名、文本内容和正则表达式三种搜索模式。可按名称模式搜索、简单文本搜索或高级正则匹配。'
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
	},
	// Book tools
	searchOpenLibrary: {
		name: '搜索Open Library',
		description: '使用Open Library API搜索书籍。可按标题、作者、ISBN或关键词搜索。返回书籍信息包括标题、作者、出版日期、出版社、ISBN、封面图片和评分。'
	},
	getBookByISBN: {
		name: '通过ISBN获取书籍',
		description: '使用Open Library API通过ISBN获取详细的书籍信息。返回完整的书籍元数据包括标题、作者、出版社、出版日期、页数、主题、描述和封面图片。'
	},
	searchGoogleBooks: {
		name: '搜索Google Books',
		description: '使用Google Books API搜索书籍。返回书籍信息包括标题、作者、出版社、描述、ISBN、页数、分类、评分和预览链接。使用特殊关键词如"intitle:"、"inauthor:"、"isbn:"进行特定搜索。'
	},
	getBookRecommendations: {
		name: '获取图书推荐',
		description: '根据特定书名获取图书推荐。使用Open Library根据主题、作者或相关作品查找相似书籍。返回包含元数据的推荐书籍列表。'
	},
	// 天气工具
	getCurrentWeather: {
		name: '获取当前天气',
		description: '使用坐标获取指定位置的当前天气状况。返回温度、湿度、降水量、天气状况、云量和风力信息。使用免费的Open-Meteo API。'
	},
	getWeatherForecast: {
		name: '获取天气预报',
		description: '使用坐标获取指定位置的天气预报。返回每日预报包括最高/最低温度、降水概率和降水量、天气状况、风速以及日出日落时间。支持1-16天预报。'
	},
	geocodeCity: {
		name: '城市地理编码',
		description: '将城市名称转换为地理坐标。返回匹配的城市及其坐标、时区、人口、海拔和国家信息。支持多语言城市名称。'
	},
	// 新闻聚合工具
	getBBCNews: {
		name: '获取BBC新闻',
		description: '从BBC新闻RSS源获取最新新闻。支持多个类别包括世界、商业、技术、科学、健康、娱乐和体育。返回新闻标题、描述、链接和发布日期。'
	},
	getHackerNews: {
		name: '获取Hacker News',
		description: '从Hacker News获取故事。支持多种故事类型包括热门、最新、最佳、提问、展示和招聘。返回故事标题、URL、评分、作者、评论数和Hacker News讨论链接。'
	},
	getRedditTopPosts: {
		name: '获取Reddit热门帖子',
		description: '从Reddit子版块获取热门帖子。支持多个时间段包括小时、天、周、月、年和所有时间。返回帖子标题、作者、评分、点赞比例、评论数、URL和内容预览。'
	},
	getNPRNews: {
		name: '获取NPR新闻',
		description: '从NPR（美国国家公共广播电台）RSS源获取最新新闻。支持多个类别包括新闻、世界、商业、技术、科学、健康和政治。返回新闻标题、摘要、链接和发布日期。'
	},
	// 电视和电影工具
	searchTVShows: {
		name: '搜索电视节目',
		description: '使用TVMaze API按名称搜索电视节目。返回节目信息包括标题、摘要、类型、网络、评分、首播/结束日期和图片。完全免费，无需API密钥。'
	},
	getTVShowDetails: {
		name: '获取电视节目详情',
		description: '通过TVMaze ID获取特定电视节目的详细信息。返回包括演员、制作人员、播出时间表和可选的剧集列表在内的全面信息。无需身份验证。'
	},
	searchTvPeople: {
		name: '搜索电视从业者',
		description: '使用TVMaze API搜索电视行业的人物（演员、导演、制片人等）。返回人物信息包括姓名、生日、性别、国家和个人照片。'
	},
	getTVSchedule: {
		name: '获取电视节目表',
		description: '获取特定日期或今天的电视节目表。返回该日期播出的剧集列表，包括节目信息、播出时间和剧集详情。可按国家代码过滤。'
	},
	// IMDB工具
	searchIMDB: {
		name: '搜索IMDB',
		description: '在IMDB上搜索电影、电视节目、演员、导演和其他娱乐内容。返回标题、年份、演员、评分和海报图片。使用IMDB的公共搜索API并进行速率限制。'
	},
	getIMDBTop250: {
		name: '获取IMDB Top 250',
		description: '获取IMDB Top 250电影榜单。返回精选的高分电影列表，包含标题、年份、评分和IMDB链接。非常适合发现经典和广受好评的电影。'
	},
	searchIMDBByType: {
		name: '按类型搜索IMDB',
		description: '在IMDB上搜索特定类型的内容，包括电影、电视剧、电视剧集和电子游戏。根据内容类型提供过滤结果和详细信息。'
	},
	// 维基百科工具
	searchWikipedia: {
		name: '搜索维基百科',
		description: '在维基百科中搜索条目。返回条目标题、摘要和URL。适合快速查找任意主题的信息。'
	}
};
