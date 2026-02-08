/**
 * Book Information Tools (Mastra Format)
 * 
 * Fetch book metadata from various public APIs without requiring authentication
 */

import { z } from 'zod';
import { requestUrl } from 'obsidian';
import { createMastraTool } from './tool-converter';

/**
 * Tool: Search Open Library
 */
export const searchOpenLibraryTool = createMastraTool({
  category: 'entertainment',
	id: 'search_open_library',
	description: 'Search for books using Open Library API. Search by title, author, ISBN, or keywords. Returns book information including title, authors, publish date, publishers, ISBN, and cover images.',
	
	inputSchema: z.object({
		query: z.string()
			.min(1)
			.describe('Search query - can be book title, author name, ISBN, or keywords'),
		limit: z.number()
			.min(1)
			.max(100)
			.describe('Maximum number of results to return (1-100)')
			.default(10)
	}).describe('Tool input parameters'),
	
	outputSchema: z.object({
		query: z.string().describe('The search query used'),
		total_results: z.number().describe('Total number of results found'),
		returned_count: z.number().describe('Number of results returned'),
		books: z.array(z.object({
			title: z.string().describe('Book title'),
			authors: z.array(z.string()).describe('List of authors'),
			first_publish_year: z.number().optional().describe('First publication year'),
			isbn: z.string().optional().nullable().describe('ISBN number'),
			publishers: z.array(z.string()).describe('List of publishers'),
			number_of_pages: z.number().optional().describe('Number of pages'),
			languages: z.array(z.string()).describe('Languages'),
			subjects: z.array(z.string()).describe('Book subjects/topics'),
			cover_id: z.number().optional().describe('Cover image ID'),
			cover_url: z.string().optional().nullable().describe('Cover image URL'),
			open_library_url: z.string().optional().nullable().describe('Open Library URL'),
			ratings_average: z.number().optional().describe('Average rating'),
			ratings_count: z.number().optional().describe('Number of ratings')
		})).describe('List of books found')
	}).describe('Open Library search results'),
	
	execute: async ({ context }) => {
		const { query, limit } = context;
		const encodedQuery = encodeURIComponent(query);
		const url = `https://openlibrary.org/search.json?q=${encodedQuery}&limit=${limit}`;
		
		const response = await requestUrl({
			url,
			method: 'GET',
			headers: {
				'User-Agent': 'ObsidianLLMSider/1.0'
			}
		});
		
		if (response.status !== 200) {
			throw new Error(`Failed to search Open Library (HTTP ${response.status})`);
		}
		
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
		
		return {
			query,
			total_results: data.numFound,
			returned_count: books.length,
			books
		};
	}
});

/**
 * Tool: Get book by ISBN
 */
export const getBookByISBNTool = createMastraTool({
  category: 'entertainment',
	id: 'get_book_by_isbn',
	description: 'Get detailed book information by ISBN using Open Library API. Returns comprehensive book metadata including title, authors, publisher, publish date, pages, description, and cover image.',
	
	inputSchema: z.object({
		isbn: z.string()
			.min(10)
			.describe('ISBN-10 or ISBN-13 number (e.g., 9780140328721)')
	}).describe('Tool input parameters'),
	
	outputSchema: z.object({
		isbn: z.string().describe('ISBN number'),
		title: z.string().describe('Book title'),
		subtitle: z.string().optional().describe('Book subtitle'),
		authors: z.array(z.string()).describe('List of authors'),
		publishers: z.array(z.string()).describe('List of publishers'),
		publish_date: z.string().optional().describe('Publication date'),
		number_of_pages: z.number().optional().describe('Number of pages'),
		subjects: z.array(z.string()).describe('Book subjects'),
		excerpts: z.array(z.string()).describe('Book excerpts'),
		cover: z.object({
			small: z.string().optional(),
			medium: z.string().optional(),
			large: z.string().optional()
		}).optional().nullable().describe('Cover image URLs'),
		url: z.string().optional().describe('Open Library URL'),
		notes: z.string().optional().describe('Additional notes'),
		identifiers: z.record(z.any()).optional().describe('Other identifiers')
	}).describe('Detailed book information from Open Library'),
	
	execute: async ({ context }) => {
		const isbn = context.isbn.replace(/[^0-9X]/gi, '');
		const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
		
		const response = await requestUrl({
			url,
			method: 'GET',
			headers: {
				'User-Agent': 'ObsidianLLMSider/1.0'
			}
		});
		
		if (response.status !== 200) {
			throw new Error(`Failed to fetch book (HTTP ${response.status})`);
		}
		
		const data = response.json;
		const bookKey = `ISBN:${isbn}`;
		
		if (!data[bookKey]) {
			throw new Error(`Book not found for ISBN: ${isbn}`);
		}
		
		const book = data[bookKey];
		
		return {
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
	}
});

/**
 * Tool: Search Google Books
 */
export const searchGoogleBooksTool = createMastraTool({
  category: 'entertainment',
	id: 'search_google_books',
	description: 'Search for books using Google Books API. Returns book information including title, authors, publisher, description, ISBN, page count, categories, and preview links. Free API, no key required.',
	
	inputSchema: z.object({
		query: z.string()
			.min(1)
			.describe('Search query - can include title, author, ISBN, or keywords. Use special keywords like "intitle:", "inauthor:", "isbn:" for specific searches.'),
		max_results: z.number()
			.min(1)
			.max(40)
			.describe('Maximum number of results (1-40)')
			.default(10),
		language: z.string()
			.describe('Language code (e.g., en, zh-CN, ja, de, fr)')
			.default('en')
	}).describe('Tool input parameters'),
	
	outputSchema: z.object({
		query: z.string().describe('The search query used'),
		total_results: z.number().describe('Total number of results'),
		returned_count: z.number().describe('Number of results returned'),
		books: z.array(z.object({
			id: z.string().describe('Google Books ID'),
			title: z.string().describe('Book title'),
			subtitle: z.string().optional().describe('Book subtitle'),
			authors: z.array(z.string()).describe('List of authors'),
			publisher: z.string().optional().describe('Publisher name'),
			published_date: z.string().optional().describe('Publication date'),
			description: z.string().optional().describe('Book description'),
			isbn_13: z.string().optional().describe('ISBN-13'),
			isbn_10: z.string().optional().describe('ISBN-10'),
			page_count: z.number().optional().describe('Number of pages'),
			categories: z.array(z.string()).describe('Book categories'),
			average_rating: z.number().optional().describe('Average rating'),
			ratings_count: z.number().optional().describe('Number of ratings'),
			language: z.string().optional().describe('Book language'),
			preview_link: z.string().optional().describe('Preview link'),
			info_link: z.string().optional().describe('Info link'),
			thumbnail: z.string().optional().describe('Thumbnail URL'),
			small_thumbnail: z.string().optional().describe('Small thumbnail URL'),
			is_ebook: z.boolean().describe('Whether the book is an ebook')
		})).describe('List of books'),
		message: z.string().optional().describe('Message if no results found')
	}).describe('Google Books search results'),
	
	execute: async ({ context }) => {
		const { query, max_results, language } = context;
		const encodedQuery = encodeURIComponent(query);
		const url = `https://www.googleapis.com/books/v1/volumes?q=${encodedQuery}&maxResults=${max_results}&langRestrict=${language}`;
		
		const response = await requestUrl({
			url,
			method: 'GET',
			headers: {
				'User-Agent': 'curl/7.64.1',
				'Accept': 'application/json'
			}
		});
		
		if (response.status !== 200) {
			throw new Error(`Failed to search Google Books (HTTP ${response.status})`);
		}
		
		const data = response.json;
		
		if (!data.items || data.items.length === 0) {
			return {
				query,
				total_results: 0,
				returned_count: 0,
				books: [],
				message: 'No books found'
			};
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
		
		return {
			query,
			total_results: data.totalItems,
			returned_count: books.length,
			books
		};
	}
});

/**
 * Tool: Get book recommendations
 */
export const getBookRecommendationsTool = createMastraTool({
  category: 'entertainment',
	id: 'get_book_recommendations',
	description: 'Get book recommendations based on a specific book. Uses Open Library to find similar books by subject, author, or related works.',
	
	inputSchema: z.object({
		book_title: z.string()
			.min(1)
			.describe('Title of the book to get recommendations for'),
		limit: z.number()
			.min(1)
			.max(20)
			.describe('Maximum number of recommendations (1-20)')
			.default(10)
	}).describe('Tool input parameters'),
	
	outputSchema: z.object({
		original_book: z.object({
			title: z.string().describe('Original book title'),
			authors: z.array(z.string()).describe('Original book authors')
		}).describe('The book used as basis for recommendations'),
		recommendation_criteria: z.string().describe('Criteria used for recommendations'),
		count: z.number().describe('Number of recommendations returned'),
		recommendations: z.array(z.object({
			title: z.string().describe('Book title'),
			authors: z.array(z.string()).describe('List of authors'),
			first_publish_year: z.number().optional().describe('First publication year'),
			isbn: z.string().optional().describe('ISBN number'),
			subjects: z.array(z.string()).describe('Book subjects'),
			ratings_average: z.number().optional().describe('Average rating'),
			cover_url: z.string().optional().nullable().describe('Cover image URL'),
			open_library_url: z.string().optional().nullable().describe('Open Library URL')
		})).describe('List of recommended books')
	}).describe('Book recommendations based on similarity'),
	
	execute: async ({ context }) => {
		const { book_title, limit } = context;
		
		// First, search for the book to get its details
		const encodedQuery = encodeURIComponent(book_title);
		const searchUrl = `https://openlibrary.org/search.json?q=${encodedQuery}&limit=1`;
		
		const searchResponse = await requestUrl({
			url: searchUrl,
			method: 'GET',
			headers: {
				'User-Agent': 'ObsidianLLMSider/1.0'
			}
		});
		
		if (searchResponse.status !== 200) {
			throw new Error(`Failed to search for book (HTTP ${searchResponse.status})`);
		}
		
		const searchData = searchResponse.json;
		
		if (!searchData.docs || searchData.docs.length === 0) {
			throw new Error(`Book not found: ${book_title}`);
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
		
		if (recResponse.status !== 200) {
			throw new Error(`Failed to fetch recommendations (HTTP ${recResponse.status})`);
		}
		
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
		
		return {
			original_book: {
				title: book.title,
				authors: book.author_name || []
			},
			recommendation_criteria: subjects.length > 0 ? `Based on subject: ${subjects[0]}` : `Based on author: ${author}`,
			count: recommendations.length,
			recommendations
		};
	}
});
