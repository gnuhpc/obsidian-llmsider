/**
 * Core tools - file management, editor, search
 */

export const enCoreTools = {
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
			description: 'Search for notes in the vault by file name pattern, text content, or regex pattern. Supports three modes: filename search with wildcards, simple text search, and advanced regex matching.'
		},
	// Book tools
	searchOpenLibrary: {
		name: 'Search Open Library',
		description: 'Search for books using Open Library API. Search by title, author, ISBN, or keywords. Returns book information including title, authors, publish date, publishers, ISBN, cover images, and ratings.'
	},
	getBookByIsbn: {
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
	},
	// Weather tools
	getCurrentWeather: {
		name: 'Get Current Weather',
		description: 'Get current weather conditions for a specific location using coordinates. Returns temperature, humidity, precipitation, weather condition, cloud cover, and wind information. Uses the free Open-Meteo API.'
	},
	getWeatherForecast: {
		name: 'Get Weather Forecast',
		description: 'Get weather forecast for a specific location using coordinates. Returns daily forecast including max/min temperatures, precipitation probability and amount, weather condition, wind speed, and sunrise/sunset times. Supports 1-16 days forecast.'
	},
	geocodeCity: {
		name: 'Geocode City',
		description: 'Convert city name to geographic coordinates. Returns matching cities with their coordinates, timezone, population, elevation, and country information. Supports multi-language city names.'
	},
	// News aggregation tools
	getBbcNews: {
		name: 'Get BBC News',
		description: 'Get latest news from BBC News RSS feed. Supports multiple categories including world, business, technology, science, health, entertainment, and sport. Returns news headlines, descriptions, links, and publication dates.'
	},
	getHackerNews: {
		name: 'Get Hacker News',
		description: 'Get stories from Hacker News. Supports multiple story types including top, new, best, ask, show, and job stories. Returns story title, URL, score, author, comment count, and Hacker News discussion link.'
	},
	getRedditTopPosts: {
		name: 'Get Reddit Top Posts',
		description: 'Get top posts from a Reddit subreddit. Supports multiple time periods including hour, day, week, month, year, and all time. Returns post title, author, score, upvote ratio, comment count, URL, and content preview.'
	},
	getNprNews: {
		name: 'Get NPR News',
		description: 'Get latest news from NPR (National Public Radio) RSS feed. Supports multiple categories including news, world, business, technology, science, health, and politics. Returns news headlines, summaries, links, and publication dates.'
	},
	// TV & Movie tools
	searchTvShows: {
		name: 'Search TV Shows',
		description: 'Search for TV shows by name using TVMaze API. Returns show information including title, summary, genres, network, rating, premiere/end dates, and images. Completely free, no API key required.'
	},
	getTvShowDetails: {
		name: 'Get TV Show Details',
		description: 'Get detailed information about a specific TV show by its TVMaze ID. Returns comprehensive information including cast, crew, schedule, and optionally episode list. No authentication required.'
	},
	searchTvPeople: {
		name: 'Search TV People',
		description: 'Search for people (actors, directors, producers, etc.) in the TV industry using TVMaze API. Returns information about the person including name, birthday, gender, country, and their profile image.'
	},
	getTvSchedule: {
		name: 'Get TV Schedule',
		description: 'Get TV schedule for a specific date or today. Returns list of episodes airing on that date with show information, air times, and episode details. Can filter by country code.'
	},
	// IMDB tools
	searchImdb: {
		name: 'Search IMDB',
		description: 'Search IMDB for movies, TV shows, actors, directors, and other entertainment content. Returns titles, years, cast, ratings, and poster images. Uses IMDB\'s public search API with rate limiting.'
	},
	getImdbTop250: {
		name: 'Get IMDB Top 250',
		description: 'Get IMDB Top 250 movies list. Returns a curated list of highly-rated movies with titles, years, ratings, and IMDB links. Great for discovering classic and acclaimed films.'
	},
	searchImdbByType: {
		name: 'Search IMDB by Type',
		description: 'Search IMDB for specific types of content including movies, TV series, TV episodes, and video games. Provides filtered results based on content type with detailed information.'
	},
	// Wikipedia tools
	searchWikipedia: {
		name: 'Search Wikipedia',
		description: 'Search Wikipedia for articles. Returns article titles, summaries, and URLs. Great for quickly finding information on any topic.'
	}
};