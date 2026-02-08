/**
 * TVMaze API tools for searching TV shows and movies - Mastra Tool format
 * API Documentation: https://www.tvmaze.com/api
 * No authentication required - completely free!
 */

import { z } from 'zod';
import { requestUrl } from 'obsidian';
import { createMastraTool } from './tool-converter';

const TVMAZE_BASE_URL = 'https://api.tvmaze.com';

/**
 * Search for TV shows by name
 */
export const searchTVShowsTool = createMastraTool({
  category: 'entertainment',
  id: 'search_tv_shows',
  description: 'Search for TV shows by name using TVMaze API. Returns show information including title, summary, genres, network, rating, and image.',
  inputSchema: z.object({
    query: z.string()
      .min(1, 'Query parameter is required')
      .describe('The TV show name to search for'),
    max_results: z.number()
      .min(1)
      .max(25)
      .default(10)
      .optional()
      .describe('Maximum number of results to return (1-25, default: 10)')
  }).describe('Tool input parameters'),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    shows: z.array(z.object({
      id: z.number(),
      name: z.string(),
      type: z.string(),
      language: z.string(),
      genres: z.array(z.string()),
      status: z.string(),
      runtime: z.string(),
      premiered: z.string(),
      ended: z.string(),
      network: z.string(),
      country: z.string(),
      rating: z.union([z.number(), z.string()]),
      summary: z.string(),
      official_site: z.string(),
      image: z.string(),
      tvmaze_url: z.string()
    }))
  }).describe('TV show search results'),
  execute: async ({ context }) => {
    const { query, max_results = 10 } = context;

    const limit = Math.min(Math.max(1, max_results), 25);

    const response = await requestUrl({
      url: `${TVMAZE_BASE_URL}/search/shows?q=${encodeURIComponent(query)}`,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.status !== 200) {
      throw new Error(`TVMaze API returned status ${response.status}`);
    }

    const results = response.json;
    
    if (!Array.isArray(results) || results.length === 0) {
      return {
        success: true,
        message: `No TV shows found for "${query}"`,
        shows: []
      };
    }

    const shows = results.slice(0, limit).map((item: any) => {
      const show = item.show;
      
      // Clean HTML from summary
      const summary = show.summary 
        ? show.summary.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
        : 'No summary available';

      return {
        id: show.id,
        name: show.name,
        type: show.type || 'N/A',
        language: show.language || 'N/A',
        genres: show.genres && show.genres.length > 0 ? show.genres : ['N/A'],
        status: show.status || 'N/A',
        runtime: show.runtime ? `${show.runtime} minutes` : 'N/A',
        premiered: show.premiered || 'N/A',
        ended: show.ended || (show.status === 'Ended' ? 'N/A' : 'Ongoing'),
        network: show.network ? show.network.name : (show.webChannel ? show.webChannel.name : 'N/A'),
        country: show.network?.country?.name || show.webChannel?.country?.name || 'N/A',
        rating: show.rating?.average || 'N/A',
        summary: summary,
        official_site: show.officialSite || 'N/A',
        image: show.image?.medium || show.image?.original || 'N/A',
        tvmaze_url: show.url
      };
    });

    return {
      success: true,
      message: `Found ${shows.length} TV show(s) for "${query}"`,
      shows: shows
    };
  }
});

/**
 * Get TV show details by ID
 */
export const getTVShowDetailsTool = createMastraTool({
  category: 'entertainment',
  id: 'get_tv_show_details',
  description: 'Get detailed information about a specific TV show by its TVMaze ID. Returns comprehensive information including cast, crew, episodes, and more.',
  inputSchema: z.object({
    show_id: z.number()
      .positive('Valid show_id is required')
      .describe('The TVMaze ID of the TV show'),
    include_episodes: z.boolean()
      .default(false)
      .optional()
      .describe('Whether to include episode list (default: false)')
  }).describe('Tool input parameters'),
  outputSchema: z.object({
    success: z.boolean(),
    show: z.object({
      id: z.number(),
      name: z.string(),
      type: z.string(),
      language: z.string(),
      genres: z.array(z.string()),
      status: z.string(),
      runtime: z.string(),
      premiered: z.string(),
      ended: z.string(),
      network: z.string(),
      country: z.string(),
      rating: z.union([z.number(), z.string()]),
      summary: z.string(),
      official_site: z.string(),
      image: z.string(),
      tvmaze_url: z.string(),
      schedule: z.object({
        time: z.string(),
        days: z.array(z.string())
      }),
      cast: z.array(z.object({
        person: z.string(),
        character: z.string(),
        image: z.string()
      })).optional(),
      crew: z.record(z.array(z.string())).optional(),
      episodes: z.array(z.object({
        season: z.number(),
        episode: z.number(),
        name: z.string(),
        airdate: z.string(),
        runtime: z.string(),
        summary: z.string()
      })).optional(),
      total_episodes: z.number().optional(),
      episodes_error: z.string().optional()
    })
  }).describe('TV show detailed information'),
  execute: async ({ context }) => {
    const { show_id, include_episodes = false } = context;

    // Get show details
    const showResponse = await requestUrl({
      url: `${TVMAZE_BASE_URL}/shows/${show_id}?embed[]=cast&embed[]=crew`,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (showResponse.status !== 200) {
      throw new Error(`TVMaze API returned status ${showResponse.status}`);
    }

    const show = showResponse.json;

    // Clean HTML from summary
    const summary = show.summary 
      ? show.summary.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
      : 'No summary available';

    const result: any = {
      id: show.id,
      name: show.name,
      type: show.type || 'N/A',
      language: show.language || 'N/A',
      genres: show.genres && show.genres.length > 0 ? show.genres : ['N/A'],
      status: show.status || 'N/A',
      runtime: show.runtime ? `${show.runtime} minutes` : 'N/A',
      premiered: show.premiered || 'N/A',
      ended: show.ended || (show.status === 'Ended' ? 'N/A' : 'Ongoing'),
      network: show.network ? show.network.name : (show.webChannel ? show.webChannel.name : 'N/A'),
      country: show.network?.country?.name || show.webChannel?.country?.name || 'N/A',
      rating: show.rating?.average || 'N/A',
      summary: summary,
      official_site: show.officialSite || 'N/A',
      image: show.image?.original || show.image?.medium || 'N/A',
      tvmaze_url: show.url,
      schedule: show.schedule ? {
        time: show.schedule.time || 'N/A',
        days: show.schedule.days && show.schedule.days.length > 0 ? show.schedule.days : ['N/A']
      } : { time: 'N/A', days: ['N/A'] }
    };

    // Add cast information if available
    if (show._embedded?.cast) {
      result.cast = show._embedded.cast.slice(0, 10).map((item: any) => ({
        person: item.person?.name || 'N/A',
        character: item.character?.name || 'N/A',
        image: item.person?.image?.medium || 'N/A'
      }));
    }

    // Add crew information if available
    if (show._embedded?.crew) {
      const crewByType: { [key: string]: string[] } = {};
      show._embedded.crew.forEach((item: any) => {
        const type = item.type || 'Other';
        const name = item.person?.name || 'N/A';
        if (!crewByType[type]) {
          crewByType[type] = [];
        }
        if (!crewByType[type].includes(name)) {
          crewByType[type].push(name);
        }
      });
      result.crew = crewByType;
    }

    // Get episodes if requested
    if (include_episodes) {
      try {
        const episodesResponse = await requestUrl({
          url: `${TVMAZE_BASE_URL}/shows/${show_id}/episodes`,
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (episodesResponse.status === 200) {
          const episodes = episodesResponse.json;
          result.episodes = episodes.map((ep: any) => ({
            season: ep.season,
            episode: ep.number,
            name: ep.name,
            airdate: ep.airdate || 'N/A',
            runtime: ep.runtime ? `${ep.runtime} minutes` : 'N/A',
            summary: ep.summary ? ep.summary.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ') : 'No summary'
          }));
          result.total_episodes = episodes.length;
        }
      } catch (error) {
        result.episodes_error = 'Failed to fetch episodes';
      }
    }

    return {
      success: true,
      show: result
    };
  }
});

/**
 * Search for people (actors, directors, etc.)
 */
export const searchPeopleTool = createMastraTool({
  category: 'entertainment',
  id: 'search_tv_people',
  description: 'Search for people (actors, directors, etc.) in TV industry using TVMaze API. Returns information about the person and their credits.',
  inputSchema: z.object({
    query: z.string()
      .min(1, 'Query parameter is required')
      .describe('The person name to search for'),
    max_results: z.number()
      .min(1)
      .max(20)
      .default(10)
      .optional()
      .describe('Maximum number of results to return (1-20, default: 10)')
  }).describe('Tool input parameters'),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    people: z.array(z.object({
      id: z.number(),
      name: z.string(),
      birthday: z.string(),
      deathday: z.string(),
      gender: z.string(),
      country: z.string(),
      image: z.string(),
      tvmaze_url: z.string()
    }))
  }).describe('Cast and crew search results'),
  execute: async ({ context }) => {
    const { query, max_results = 10 } = context;

    const limit = Math.min(Math.max(1, max_results), 20);

    const response = await requestUrl({
      url: `${TVMAZE_BASE_URL}/search/people?q=${encodeURIComponent(query)}`,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.status !== 200) {
      throw new Error(`TVMaze API returned status ${response.status}`);
    }

    const results = response.json;
    
    if (!Array.isArray(results) || results.length === 0) {
      return {
        success: true,
        message: `No people found for "${query}"`,
        people: []
      };
    }

    const people = results.slice(0, limit).map((item: any) => {
      const person = item.person;
      
      return {
        id: person.id,
        name: person.name,
        birthday: person.birthday || 'N/A',
        deathday: person.deathday || 'N/A',
        gender: person.gender || 'N/A',
        country: person.country?.name || 'N/A',
        image: person.image?.medium || person.image?.original || 'N/A',
        tvmaze_url: person.url
      };
    });

    return {
      success: true,
      message: `Found ${people.length} person(s) for "${query}"`,
      people: people
    };
  }
});

/**
 * Get TV schedule for a specific date
 */
export const getTVScheduleTool = createMastraTool({
  category: 'entertainment',
  id: 'get_tv_schedule',
  description: 'Get TV schedule for a specific date. Returns list of episodes airing on that date. If no date provided, returns schedule for today.',
  inputSchema: z.object({
    date: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in ISO format (YYYY-MM-DD)')
      .optional()
      .describe('Date in ISO format (YYYY-MM-DD). If not provided, uses today\'s date'),
    country: z.string()
      .optional()
      .describe('Country code (e.g., US, GB, CA) to filter results. Optional.')
  }).describe('Tool input parameters'),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    date: z.string(),
    episodes: z.array(z.object({
      show_name: z.string(),
      show_id: z.number().optional(),
      episode_name: z.string(),
      season: z.number(),
      episode: z.number(),
      airdate: z.string(),
      airtime: z.string(),
      runtime: z.string(),
      network: z.string(),
      country: z.string(),
      summary: z.string(),
      image: z.string()
    }))
  }).describe('TV schedule'),
  execute: async ({ context }) => {
    const { date, country } = context;

    const url = date 
      ? `${TVMAZE_BASE_URL}/schedule?date=${date}${country ? `&country=${country}` : ''}`
      : `${TVMAZE_BASE_URL}/schedule${country ? `?country=${country}` : ''}`;

    const response = await requestUrl({
      url: url,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.status !== 200) {
      throw new Error(`TVMaze API returned status ${response.status}`);
    }

    const schedule = response.json;
    
    if (!Array.isArray(schedule) || schedule.length === 0) {
      return {
        success: true,
        message: date 
          ? `No episodes scheduled for ${date}${country ? ` in ${country}` : ''}`
          : `No episodes scheduled for today${country ? ` in ${country}` : ''}`,
        date: date || 'today',
        episodes: []
      };
    }

    const episodes = schedule.map((item: any) => ({
      show_name: item.show?.name || 'N/A',
      show_id: item.show?.id,
      episode_name: item.name || 'N/A',
      season: item.season,
      episode: item.number,
      airdate: item.airdate,
      airtime: item.airstamp || item.airtime || 'N/A',
      runtime: item.runtime ? `${item.runtime} minutes` : 'N/A',
      network: item.show?.network?.name || item.show?.webChannel?.name || 'N/A',
      country: item.show?.network?.country?.name || item.show?.webChannel?.country?.name || 'N/A',
      summary: item.summary ? item.summary.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ') : 'No summary',
      image: item.image?.medium || item.show?.image?.medium || 'N/A'
    }));

    return {
      success: true,
      message: `Found ${episodes.length} episode(s) scheduled${date ? ` for ${date}` : ' for today'}${country ? ` in ${country}` : ''}`,
      date: date || new Date().toISOString().split('T')[0],
      episodes: episodes
    };
  }
});
