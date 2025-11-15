/**
 * Tools module - aggregates all tool categories
 */

import { enCoreTools } from './core';
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

export const enTools = {
	...enCoreTools,
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
	...enOthersTools
};
