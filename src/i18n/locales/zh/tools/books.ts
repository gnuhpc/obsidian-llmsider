/**
 * Books Tools Chinese Translations
 */

export const zhBooksTools = {
	searchOpenLibrary: {
		name: '搜索Open Library',
		description: '使用Open Library API搜索书籍。可按标题、作者、ISBN或关键词搜索。返回书籍信息包括标题、作者、出版日期、出版社、ISBN、封面图片和评分。'
	},
	getBookByISBN: {
		name: '通过 ISBN 获取图书',
		description: '使用 Open Library API 通过 ISBN 获取详细图书信息。返回全面的图书元数据，包括标题、作者、出版社、出版日期、页数、主题、描述和封面图片。'
	},
	searchGoogleBooks: {
		name: '搜索Google Books',
		description: '使用Google Books API搜索书籍。返回书籍信息包括标题、作者、出版社、描述、ISBN、页数、分类、评分和预览链接。使用特殊关键词如"intitle:"、"inauthor:"、"isbn:"进行特定搜索。'
	},
	getBookRecommendations: {
		name: '获取图书推荐',
		description: '根据特定书名获取图书推荐。使用Open Library根据主题、作者或相关作品查找相似书籍。返回包含元数据的推荐书籍列表。'
	}
};
