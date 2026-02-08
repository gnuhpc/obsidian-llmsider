/**
 * Tools module - aggregates all tool categories
 */

import { zhNoteManagementTools } from './note-management';
import { zhWeatherTools } from './weather';
import { zhWebTools } from './web';
import { zhStockTools } from './stock';
import { zhFuturesTools } from './futures';
import { zhBondsTools } from './bonds';
import { zhOptionsTools } from './options';
import { zhFundsTools } from './funds';
import { zhForexTools } from './forex';
import { zhCryptoTools } from './crypto';
import { zhMacroTools } from './macro';
import { zhDerivativesTools } from './derivatives';
import { zhRiskTools } from './risk';
import { zhNewsTools } from './news';
import { zhOthersTools } from './others';
import { zhBooksTools } from './books';
import { zhSystemTools } from './system';
import { zhDevToTools } from './devto';
import { zhFilesTools } from './files';
import { zhFundAdvancedTools } from './fund-advanced';
import { zhGitHubTools } from './github';
import { zhIndexHistoricalTools } from './index-historical';
import { zhInternationalTools } from './international';
import { zhMarketTools } from './market';
import { zhSectorTools } from './sector';
import { zhStockPanoramaTools } from './stock-panorama';
import { zhEntertainmentTools } from './entertainment';
import { zhIMDBTools } from './imdb';

export const zhTools = {
	...zhNoteManagementTools,
	...zhWeatherTools,
	...zhWebTools,
	...zhStockTools,
	...zhFuturesTools,
	...zhBondsTools,
	...zhOptionsTools,
	...zhFundsTools,
	...zhForexTools,
	...zhCryptoTools,
	...zhMacroTools,
	...zhDerivativesTools,
	...zhRiskTools,
	...zhNewsTools,
	...zhOthersTools,
	...zhBooksTools,
	...zhSystemTools,
	...zhDevToTools,
	...zhFilesTools,
	...zhFundAdvancedTools,
	...zhGitHubTools,
	...zhIndexHistoricalTools,
	...zhInternationalTools,
	...zhMarketTools,
	...zhSectorTools,
	...zhStockPanoramaTools,
	...zhEntertainmentTools,
	...zhIMDBTools
};
