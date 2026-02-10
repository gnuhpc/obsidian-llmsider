/**
 * TV show search and information tools
 */

export const enEntertainmentTools = {
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
	}
};
