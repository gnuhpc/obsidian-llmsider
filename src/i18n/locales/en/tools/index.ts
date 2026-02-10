/**
 * Tools module - aggregates all tool categories
 */

import { enNoteManagementTools } from './note-management';
import { enWebTools } from './web';
import { enStockTools } from './stock';
import { enFuturesTools } from './futures';
import { enBondsTools } from './bonds';
import { enOptionsTools } from './options';
import { enFundsTools } from './funds';
import { enForexTools } from './forex';
import { enCryptoTools } from './crypto';
import { enMacroTools } from './macro';
import { enDerivativesTools } from './derivatives';
import { enRiskTools } from './risk';
import { enNewsTools } from './news';
import { enOthersTools } from './others';
import { enMissingTools } from './missing';
import { enBookTools } from './books';
import { enWeatherTools } from './weather';
import { enEntertainmentTools } from './entertainment';
import { enImdbTools } from './imdb';
import { enDevToTools } from './devto';

export const enTools = {
	...enNoteManagementTools,
	...enWebTools,
	...enStockTools,
	...enFuturesTools,
	...enBondsTools,
	...enOptionsTools,
	...enFundsTools,
	...enForexTools,
	...enCryptoTools,
	...enMacroTools,
	...enDerivativesTools,
	...enRiskTools,
	...enNewsTools,
	...enOthersTools,
	...enMissingTools,
	...enBookTools,
	...enWeatherTools,
	...enEntertainmentTools,
	...enImdbTools,
	...enDevToTools
};
