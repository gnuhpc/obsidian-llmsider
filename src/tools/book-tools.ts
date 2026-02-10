/**
 * Book Information Tools
 * Fetch book metadata from various public APIs without requiring authentication
 */

import { requestUrl } from 'obsidian';
import type { BuiltInTool } from './built-in-tools';

/**
 * Helper function to extract text content from HTML
 */
function extractTextFromHTML(html: string): string {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, 'text/html');
	return doc.body.textContent?.trim() || '';
}

/**
 * Open Library - Search books by title, author, or ISBN
 * Free API, no authentication required
 */
export const searchOpenLibraryTool: BuiltInTool = {
	name: 'search_open_library',
	description: 'Search for books using Open Library API. Search by title, author, ISBN, or keywords. Returns book information including title, authors, publish date, publishers, ISBN, and cover images.',
	category: 'entertainment',
	inputSchema: {
		type: 'object',
		properties: {
			query: {
				type: 'string',
				description: 'Search query - can be book title, author name, ISBN, or keywords'
			},
			limit: {
				type: 'number',
				description: 'Maximum number of results to return (1-100). Default is 10.'
			}
		},
		required: ['query']
	},
	outputSchema: {
		type: 'string',
		description: 'JSON string of search results from Open Library'
	},
	execute: async (params: { query: string; limit?: number }) => {
		try {
			const limit = Math.min(params.limit || 10, 100);
			const encodedQuery = encodeURIComponent(params.query);
			const url = `https://openlibrary.org/search.json?q=${encodedQuery}&limit=${limit}`;

			const response = await requestUrl({
				url,
				method: 'GET',
				headers: {
					'User-Agent': 'ObsidianLLMSider/1.0'
				}
			});

			const data = response.json;
			const books = (data.docs || []).map((book: any) => ({
				title: book.title,
				authors: book.author_name || [],
				first_publish_year: book.first_publish_year,
				isbn: book.isbn?.[0] || null,
				publishers: book.publisher?.slice(0, 3) || [],
				number_of_pages: book.number_of_pages_median,
				languages: book.language?.slice(0, 3) || [],
				subjects: book.subject?.slice(0, 5) || [],
				cover_id: book.cover_i,
				cover_url: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg` : null,
				open_library_url: book.key ? `https://openlibrary.org${book.key}` : null,
				ratings_average: book.ratings_average,
				ratings_count: book.ratings_count
			}));

			return JSON.stringify({
				query: params.query,
				total_results: data.numFound,
				returned_count: books.length,
				books
			}, null, 2);
		} catch (error: unknown) {
			throw new Error(`Failed to search Open Library: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};

/**
 * Open Library - Get book details by ISBN
 */
export const getBookByISBNTool: BuiltInTool = {
	name: 'get_book_by_isbn',
	description: 'Get detailed book information by ISBN using Open Library API. Returns comprehensive book metadata including title, authors, publisher, publish date, pages, description, and cover image.',
	category: 'entertainment',
	inputSchema: {
		type: 'object',
		properties: {
			isbn: {
				type: 'string',
				description: 'ISBN-10 or ISBN-13 number (e.g., 9780140328721)'
			}
		},
		required: ['isbn']
	},
	outputSchema: {
		type: 'string',
		description: 'JSON string of book details from Open Library'
	},
	execute: async (params: { isbn: string }) => {
		try {
			const isbn = params.isbn.replace(/[^0-9X]/gi, '');
			const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;

			const response = await requestUrl({
				url,
				method: 'GET',
				headers: {
					'User-Agent': 'ObsidianLLMSider/1.0'
				}
			});

			const data = response.json;
			const bookKey = `ISBN:${isbn}`;
			
			if (!data[bookKey]) {
				throw new Error(`Book not found for ISBN: ${isbn}`);
			}

			const book = data[bookKey];
			
			// Extract detailed information
			const bookInfo = {
				isbn,
				title: book.title,
				subtitle: book.subtitle,
				authors: book.authors?.map((a: any) => a.name) || [],
				publishers: book.publishers?.map((p: any) => p.name) || [],
				publish_date: book.publish_date,
				number_of_pages: book.number_of_pages,
				subjects: book.subjects?.map((s: any) => s.name)?.slice(0, 10) || [],
				excerpts: book.excerpts?.map((e: any) => e.text)?.slice(0, 2) || [],
				cover: book.cover ? {
					small: book.cover.small,
					medium: book.cover.medium,
					large: book.cover.large
				} : null,
				url: book.url,
				notes: book.notes,
				identifiers: book.identifiers
			};

			return JSON.stringify(bookInfo, null, 2);
		} catch (error: unknown) {
			throw new Error(`Failed to get book by ISBN: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};

/**
 * Google Books - Search books
 */
export const searchGoogleBooksTool: BuiltInTool = {
	name: 'search_google_books',
	description: 'Search for books using Google Books API. Returns book information including title, authors, publisher, description, ISBN, page count, categories, and preview links. Free API, no key required.',
	category: 'entertainment',
	inputSchema: {
		type: 'object',
		properties: {
			query: {
				type: 'string',
				description: 'Search query - can include title, author, ISBN, or keywords. Use special keywords like "intitle:", "inauthor:", "isbn:" for specific searches.'
			},
			max_results: {
				type: 'number',
				description: 'Maximum number of results (1-40). Default is 10.'
			},
			language: {
				type: 'string',
				description: 'Language code (e.g., en, zh-CN, ja, de, fr). Default is en.'
			}
		},
		required: ['query']
	},
	outputSchema: {
		type: 'string',
		description: 'JSON string of search results from Google Books'
	},
	execute: async (params: { query: string; max_results?: number; language?: string }) => {
		try {
			const maxResults = Math.min(params.max_results || 10, 40);
			const language = params.language || 'en';
			const encodedQuery = encodeURIComponent(params.query);
			const url = `https://www.googleapis.com/books/v1/volumes?q=${encodedQuery}&maxResults=${maxResults}&langRestrict=${language}`;

			const response = await requestUrl({
				url,
				method: 'GET',
				headers: {
					'User-Agent': 'ObsidianLLMSider/1.0'
				}
			});

			const data = response.json;
			
			if (!data.items || data.items.length === 0) {
				return JSON.stringify({
					query: params.query,
					total_results: 0,
					books: [],
					message: 'No books found'
				}, null, 2);
			}

			const books = data.items.map((item: any) => {
				const volumeInfo = item.volumeInfo;
				const saleInfo = item.saleInfo;
				
				return {
					id: item.id,
					title: volumeInfo.title,
					subtitle: volumeInfo.subtitle,
					authors: volumeInfo.authors || [],
					publisher: volumeInfo.publisher,
					published_date: volumeInfo.publishedDate,
					description: volumeInfo.description,
					isbn_13: volumeInfo.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier,
					isbn_10: volumeInfo.industryIdentifiers?.find((id: any) => id.type === 'ISBN_10')?.identifier,
					page_count: volumeInfo.pageCount,
					categories: volumeInfo.categories || [],
					average_rating: volumeInfo.averageRating,
					ratings_count: volumeInfo.ratingsCount,
					language: volumeInfo.language,
					preview_link: volumeInfo.previewLink,
					info_link: volumeInfo.infoLink,
					thumbnail: volumeInfo.imageLinks?.thumbnail,
					small_thumbnail: volumeInfo.imageLinks?.smallThumbnail,
					is_ebook: saleInfo?.isEbook || false
				};
			});

			return JSON.stringify({
				query: params.query,
				total_results: data.totalItems,
				returned_count: books.length,
				books
			}, null, 2);
		} catch (error: unknown) {
			throw new Error(`Failed to search Google Books: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};

/**
 * Douban Books - Search and get book info (via ISBN redirect)
 * Note: This uses Douban's public ISBN lookup which doesn't require authentication
 */
export const searchDoubanBookTool: BuiltInTool = {
	name: 'search_douban_book',
	description: 'Get book information from Douban (豆瓣读书) by ISBN. Returns Chinese book metadata including title, author, publisher, rating, and description. No authentication required.',
	category: 'entertainment',
	inputSchema: {
		type: 'object',
		properties: {
			isbn: {
				type: 'string',
				description: 'ISBN-10 or ISBN-13 number'
			}
		},
		required: ['isbn']
	},
	outputSchema: {
		type: 'string',
		description: 'JSON string of book details from Douban'
	},
	execute: async (params: { isbn: string }) => {
		try {
			const isbn = params.isbn.replace(/[^0-9X]/gi, '');
			
			// First, try to get the subject ID via ISBN redirect
			const redirectUrl = `https://book.douban.com/isbn/${isbn}/`;
			
			const response = await requestUrl({
				url: redirectUrl,
				method: 'GET',
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
					'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
					'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
					'Referer': 'https://www.douban.com/'
				},
				throw: false
			});

			if (response.status !== 200) {
				throw new Error(`HTTP ${response.status}: Unable to fetch book information`);
			}

			const html = response.text;
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, 'text/html');

			// Extract book information from the page
			const title = doc.querySelector('h1 span')?.textContent?.trim() || 
						 doc.querySelector('h1')?.textContent?.trim();
			
			if (!title) {
				throw new Error(`Book not found for ISBN: ${isbn}`);
			}

			// Helper function to extract info by label
			const extractInfo = (label: string): string | null => {
				const span = Array.from(doc.querySelectorAll('span.pl')).find((el) => {
					const text = el.textContent?.trim();
					return text?.startsWith(label) || text === `${label}:` || text === `${label}：`;
				});
				return span?.nextSibling?.textContent?.replace(/^[:：\s]+/, '')?.trim() || null;
			};

			// Extract authors
			const authors: string[] = [];
			Array.from(doc.querySelectorAll('span.pl'))
				.filter((span) => span.textContent?.trim() === '作者' || span.textContent?.trim().includes('作者'))
				.forEach((span) => {
					Array.from(span.parentElement?.querySelectorAll('a') || [])
						.forEach((a) => {
							const author = a.textContent?.replace(/【.*?】/g, '')?.trim();
							if (author) authors.push(author);
						});
				});

			// Extract translators
			const translators: string[] = [];
			Array.from(doc.querySelectorAll('span.pl'))
				.filter((span) => span.textContent?.trim() === '译者')
				.forEach((span) => {
					Array.from(span.parentElement?.querySelectorAll('a') || [])
						.forEach((a) => {
							const translator = a.textContent?.trim();
							if (translator) translators.push(translator);
						});
				});

			const bookInfo = {
				isbn,
				title,
				subtitle: extractInfo('副标题'),
				original_title: extractInfo('原作名'),
				authors,
				translators,
				publisher: extractInfo('出版社'),
				publish_date: extractInfo('出版年'),
				pages: extractInfo('页数')?.replace(/页$/, ''),
				price: extractInfo('定价'),
				binding: extractInfo('装帧'),
				series: extractInfo('丛书'),
				rating: doc.querySelector('.rating_num')?.textContent?.trim(),
				rating_count: doc.querySelector('.rating_people span')?.textContent?.match(/\d+/)?.[0],
				cover: doc.querySelector('#mainpic img')?.getAttribute('src')?.replace(/^http:/, 'https:'),
				description: doc.querySelector('#link-report .intro')?.textContent?.trim(),
				url: redirectUrl
			};

			return JSON.stringify(bookInfo, null, 2);
		} catch (error: unknown) {
			throw new Error(`Failed to get Douban book info: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};

/**
 * Get book recommendations from Open Library
 */
export const getBookRecommendationsTool: BuiltInTool = {
	name: 'get_book_recommendations',
	description: 'Get book recommendations based on a specific book. Uses Open Library to find similar books by subject, author, or related works.',
	category: 'entertainment',
	inputSchema: {
		type: 'object',
		properties: {
			book_title: {
				type: 'string',
				description: 'Title of the book to get recommendations for'
			},
			limit: {
				type: 'number',
				description: 'Maximum number of recommendations (1-20). Default is 10.'
			}
		},
		required: ['book_title']
	},
	outputSchema: {
		type: 'string',
		description: 'JSON string of book recommendations'
	},
	execute: async (params: { book_title: string; limit?: number }) => {
		try {
			const limit = Math.min(params.limit || 10, 20);
			
			// First, search for the book to get its details
			const encodedQuery = encodeURIComponent(params.book_title);
			const searchUrl = `https://openlibrary.org/search.json?q=${encodedQuery}&limit=1`;

			const searchResponse = await requestUrl({
				url: searchUrl,
				method: 'GET',
				headers: {
					'User-Agent': 'ObsidianLLMSider/1.0'
				}
			});

			const searchData = searchResponse.json;
			
			if (!searchData.docs || searchData.docs.length === 0) {
				throw new Error(`Book not found: ${params.book_title}`);
			}

			const book = searchData.docs[0];
			const subjects = book.subject?.slice(0, 3) || [];
			const author = book.author_name?.[0];

			// Get recommendations based on subjects or author
			let recommendationsQuery = '';
			if (subjects.length > 0) {
				recommendationsQuery = `subject:"${subjects[0]}"`;
			} else if (author) {
				recommendationsQuery = `author:"${author}"`;
			} else {
				throw new Error('Cannot find enough information to generate recommendations');
			}

			const recUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(recommendationsQuery)}&limit=${limit + 5}`;

			const recResponse = await requestUrl({
				url: recUrl,
				method: 'GET',
				headers: {
					'User-Agent': 'ObsidianLLMSider/1.0'
				}
			});

			const recData = recResponse.json;
			
			// Filter out the original book and format results
			const recommendations = (recData.docs || [])
				.filter((rec: any) => rec.title !== book.title)
				.slice(0, limit)
				.map((rec: any) => ({
					title: rec.title,
					authors: rec.author_name || [],
					first_publish_year: rec.first_publish_year,
					isbn: rec.isbn?.[0],
					subjects: rec.subject?.slice(0, 3) || [],
					ratings_average: rec.ratings_average,
					cover_url: rec.cover_i ? `https://covers.openlibrary.org/b/id/${rec.cover_i}-M.jpg` : null,
					open_library_url: rec.key ? `https://openlibrary.org${rec.key}` : null
				}));

			return JSON.stringify({
				original_book: {
					title: book.title,
					authors: book.author_name || []
				},
				recommendation_criteria: subjects.length > 0 ? `Based on subject: ${subjects[0]}` : `Based on author: ${author}`,
				count: recommendations.length,
				recommendations
			}, null, 2);
		} catch (error: unknown) {
			throw new Error(`Failed to get recommendations: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
};
