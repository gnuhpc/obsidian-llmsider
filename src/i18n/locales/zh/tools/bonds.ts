/**
 * Bond market tools
 */

export const zhBondsTools = {
	getCorporateBond: {
		name: '获取企业债信息',
		description: '获取企业债市场信息，包括债券代码、名称、价格、涨跌幅等。'
	},
	getConvertibleBondSpot: {
		name: '获取可转债实时行情',
		description: '获取沪深可转债实时行情数据，包括价格、涨跌幅、成交量、溢价率等。'
	},
	getCorporateBondSpot: {
		name: '获取企业债实时行情',
		description: '获取企业债实时行情数据，包括价格、收益率、成交量等。'
	},
	getCorporateBondIssuance: {
		name: '获取企业债发行信息',
		description: '获取企业债发行信息，包括发行人、规模、期限、票面利率、信用评级等。'
	},
	getLocalGovBondIssuance: {
		name: '获取地方债发行信息',
		description: '获取地方政府债券发行数据，包括一般债券和专项债券。'
	},
	getBondCreditRating: {
		name: '获取债券信用评级',
		description: '获取债券信用评级信息，包括发行人评级、债券评级、评级机构、评级展望等。'
	},
	getBondRatingChanges: {
		name: '获取债券评级变动',
		description: '获取债券评级变动记录，包括上调、下调、展望调整等。'
	},
	getBondDefaultEvents: {
		name: '获取债券违约事件',
		description: '获取债券违约事件，包括技术性违约、实质性违约、延期支付等。'
	}
};
