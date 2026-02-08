/**
 * Weather tools - current weather, forecast, geocoding
 */

export const zhWeatherTools = {
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
	}
};
