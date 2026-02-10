/**
 * Weather information and forecast tools
 */

export const enWeatherTools = {
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
	}
};
