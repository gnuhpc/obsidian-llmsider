/**
 * Book search and information tools
 */

export const enBookTools = {
	searchOpenLibrary: {
		name: 'Search Open Library',
		description: 'Search for books using Open Library API. Search by title, author, ISBN, or keywords. Returns book information including title, authors, publish date, publishers, ISBN, cover images, and ratings.'
	},
	getBookByISBN: {
		name: 'Get Book by ISBN',
		description: 'Get detailed book information by ISBN using Open Library API. Returns comprehensive book metadata including title, authors, publisher, publish date, page count, subjects, description, and cover image.'
	},
	searchGoogleBooks: {
		name: 'Search Google Books',
		description: 'Search for books using Google Books API. Returns book information including title, authors, publisher, description, ISBN, page count, categories, ratings, and preview links. Use special keywords like "intitle:", "inauthor:", "isbn:" for specific searches.'
	},
	getBookRecommendations: {
		name: 'Get Book Recommendations',
		description: 'Get book recommendations based on a specific book title. Uses Open Library to find similar books by subject, author, or related works. Returns a list of recommended books with metadata.'
	}
};
