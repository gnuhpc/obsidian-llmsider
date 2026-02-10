/**
 * Weather Information Tools - Mastra format
 * Fetch weather data from public APIs without requiring authentication
 */

import { z } from 'zod';
import { requestUrl } from 'obsidian';
import type { MastraTool } from './mastra-tool-types';
import { createMastraTool } from './tool-converter';

/**
 * Open-Meteo Weather API - Current Weather
 * Free weather API, no authentication required
 */
export const getCurrentWeatherTool: MastraTool = createMastraTool({
  category: 'search-web',
	id: 'get_current_weather',
	description: 'Get current weather conditions for a specific location using coordinates (latitude/longitude). Returns temperature, humidity, wind speed, weather condition, and more.',
	
	inputSchema: z.object({
		latitude: z.number()
			.min(-90)
			.max(90)
			.describe('Latitude of the location (-90 to 90)'),
		
		longitude: z.number()
			.min(-180)
			.max(180)
			.describe('Longitude of the location (-180 to 180)'),
		
		temperature_unit: z.enum(['celsius', 'fahrenheit'])
			.optional()
			.describe('Temperature unit: "celsius" or "fahrenheit". Default is "celsius".')
	}),
	
	outputSchema: z.object({
		location: z.object({
			latitude: z.number(),
			longitude: z.number(),
			timezone: z.string().optional(),
			timezone_abbreviation: z.string().optional()
		}),
		current_weather: z.object({
			time: z.string(),
			temperature: z.string().describe('Current temperature'),
			apparent_temperature: z.string().describe('Feels like temperature'),
			humidity: z.string().describe('Relative humidity %'),
			precipitation: z.string().describe('Precipitation mm'),
			weather_condition: z.string().describe('Weather condition description'),
			weather_code: z.number(),
			cloud_cover: z.string().describe('Cloud cover %'),
			wind_speed: z.string().describe('Wind speed'),
			wind_direction: z.string().describe('Wind direction in degrees')
		})
  }).describe('Current weather data'),	execute: async ({ context }) => {
		try {
			const unit = context.temperature_unit === 'fahrenheit' ? 'fahrenheit' : 'celsius';
			const url = `https://api.open-meteo.com/v1/forecast?latitude=${context.latitude}&longitude=${context.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m&temperature_unit=${unit}&timezone=auto`;

			const response = await requestUrl({
				url,
				method: 'GET'
			});

			const data = response.json;
			const current = data.current;

			// Weather code descriptions
			const weatherCodes: Record<number, string> = {
				0: 'Clear sky',
				1: 'Mainly clear',
				2: 'Partly cloudy',
				3: 'Overcast',
				45: 'Foggy',
				48: 'Depositing rime fog',
				51: 'Light drizzle',
				53: 'Moderate drizzle',
				55: 'Dense drizzle',
				61: 'Slight rain',
				63: 'Moderate rain',
				65: 'Heavy rain',
				71: 'Slight snow',
				73: 'Moderate snow',
				75: 'Heavy snow',
				77: 'Snow grains',
				80: 'Slight rain showers',
				81: 'Moderate rain showers',
				82: 'Violent rain showers',
				85: 'Slight snow showers',
				86: 'Heavy snow showers',
				95: 'Thunderstorm',
				96: 'Thunderstorm with slight hail',
				99: 'Thunderstorm with heavy hail'
			};

			return JSON.stringify({
				location: {
					latitude: data.latitude,
					longitude: data.longitude,
					timezone: data.timezone,
					timezone_abbreviation: data.timezone_abbreviation
				},
				current_weather: {
					time: current.time,
					temperature: `${current.temperature_2m}°${unit === 'celsius' ? 'C' : 'F'}`,
					apparent_temperature: `${current.apparent_temperature}°${unit === 'celsius' ? 'C' : 'F'}`,
					humidity: `${current.relative_humidity_2m}%`,
					precipitation: `${current.precipitation}mm`,
					weather_condition: weatherCodes[current.weather_code] || 'Unknown',
					weather_code: current.weather_code,
					cloud_cover: `${current.cloud_cover}%`,
					wind_speed: `${current.wind_speed_10m}km/h`,
					wind_direction: `${current.wind_direction_10m}°`
				}
			}, null, 2);
		} catch (error: unknown) {
			throw new Error(`Failed to fetch weather data: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
});

/**
 * Open-Meteo Weather API - 7-day Weather Forecast
 */
export const getWeatherForecastTool: MastraTool = createMastraTool({
  category: 'search-web',
	id: 'get_weather_forecast',
	description: 'Get 7-day weather forecast for a specific location. Returns daily temperature (max/min), precipitation, weather conditions, and more.',
	
	inputSchema: z.object({
		latitude: z.number()
			.min(-90)
			.max(90)
			.describe('Latitude of the location (-90 to 90)'),
		
		longitude: z.number()
			.min(-180)
			.max(180)
			.describe('Longitude of the location (-180 to 180)'),
		
		days: z.number()
			.min(1)
			.max(16)
			.optional()
			.describe('Number of forecast days (1-16). Default is 7.'),
		
		temperature_unit: z.enum(['celsius', 'fahrenheit'])
			.optional()
			.describe('Temperature unit: "celsius" or "fahrenheit". Default is "celsius".')
	}),
	
	outputSchema: z.object({
		location: z.object({
			latitude: z.number(),
			longitude: z.number(),
			timezone: z.string()
		}),
		forecast: z.array(z.object({
			date: z.string().describe('Forecast date'),
			max_temperature: z.string().describe('Maximum temperature'),
			min_temperature: z.string().describe('Minimum temperature'),
			precipitation: z.string().describe('Total precipitation'),
			precipitation_probability: z.string().describe('Precipitation probability'),
			weather_condition: z.string().describe('Weather condition'),
			wind_speed_max: z.string().describe('Maximum wind speed'),
			sunrise: z.string().describe('Sunrise time'),
			sunset: z.string().describe('Sunset time')
		}))
  }).describe('Weather forecast data'),	execute: async ({ context }) => {
		try {
			const days = Math.min(Math.max(context.days || 7, 1), 16);
			const unit = context.temperature_unit === 'fahrenheit' ? 'fahrenheit' : 'celsius';
			const url = `https://api.open-meteo.com/v1/forecast?latitude=${context.latitude}&longitude=${context.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code,sunrise,sunset,wind_speed_10m_max&temperature_unit=${unit}&timezone=auto&forecast_days=${days}`;

			const response = await requestUrl({
				url,
				method: 'GET'
			});

			const data = response.json;
			const daily = data.daily;

			const weatherCodes: Record<number, string> = {
				0: 'Clear sky',
				1: 'Mainly clear',
				2: 'Partly cloudy',
				3: 'Overcast',
				45: 'Foggy',
				48: 'Depositing rime fog',
				51: 'Light drizzle',
				53: 'Moderate drizzle',
				55: 'Dense drizzle',
				61: 'Slight rain',
				63: 'Moderate rain',
				65: 'Heavy rain',
				71: 'Slight snow',
				73: 'Moderate snow',
				75: 'Heavy snow',
				95: 'Thunderstorm'
			};

			const forecast = daily.time.map((date: string, index: number) => ({
				date,
				max_temperature: `${daily.temperature_2m_max[index]}°${unit === 'celsius' ? 'C' : 'F'}`,
				min_temperature: `${daily.temperature_2m_min[index]}°${unit === 'celsius' ? 'C' : 'F'}`,
				precipitation: `${daily.precipitation_sum[index]}mm`,
				precipitation_probability: `${daily.precipitation_probability_max[index]}%`,
				weather_condition: weatherCodes[daily.weather_code[index]] || 'Unknown',
				wind_speed_max: `${daily.wind_speed_10m_max[index]}km/h`,
				sunrise: daily.sunrise[index],
				sunset: daily.sunset[index]
			}));

			return JSON.stringify({
				location: {
					latitude: data.latitude,
					longitude: data.longitude,
					timezone: data.timezone
				},
				forecast
			}, null, 2);
		} catch (error: unknown) {
			throw new Error(`Failed to fetch weather forecast: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
});

/**
 * Geocoding API - Convert city name to coordinates
 */
export const geocodeCityTool: MastraTool = createMastraTool({
  category: 'search-web',
	id: 'geocode_city',
	description: 'Convert city name to geographic coordinates (latitude/longitude). Useful for getting coordinates before fetching weather data.',
	
	inputSchema: z.object({
		city: z.string()
			.describe('City name (e.g., "New York", "London", "Tokyo", "Beijing")'),
		
		count: z.number()
			.min(1)
			.max(10)
			.optional()
			.describe('Maximum number of results to return. Default is 5.')
	}),
	
	outputSchema: z.object({
		query: z.string().describe('City name searched'),
		count: z.number().describe('Number of results returned'),
		results: z.array(z.object({
			name: z.string().describe('Location name'),
			country: z.string().describe('Country name'),
			country_code: z.string().describe('Country code'),
			admin1: z.string().optional().describe('Administrative region'),
			latitude: z.number().describe('Latitude'),
			longitude: z.number().describe('Longitude'),
			timezone: z.string().optional().describe('Timezone'),
			population: z.number().optional().describe('Population'),
			elevation: z.number().optional().describe('Elevation in meters')
		})),
		message: z.string().optional()
  }).describe('Geocoding results'),	execute: async ({ context }) => {
		try {
			const count = Math.min(context.count || 5, 10);
			const encodedCity = encodeURIComponent(context.city);
			const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodedCity}&count=${count}&language=en&format=json`;

			const response = await requestUrl({
				url,
				method: 'GET'
			});

			const data = response.json;

			if (!data.results || data.results.length === 0) {
				return JSON.stringify({
					query: context.city,
					results: [],
					message: 'No locations found for the given city name'
				}, null, 2);
			}

			const locations = data.results.map((result: any) => ({
				name: result.name,
				country: result.country,
				country_code: result.country_code,
				admin1: result.admin1,
				latitude: result.latitude,
				longitude: result.longitude,
				timezone: result.timezone,
				population: result.population,
				elevation: result.elevation
			}));

			return JSON.stringify({
				query: context.city,
				count: locations.length,
				results: locations
			}, null, 2);
		} catch (error: unknown) {
			throw new Error(`Failed to geocode city: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
});
