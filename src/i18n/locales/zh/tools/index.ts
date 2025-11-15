/**
 * Tools module - aggregates all tool categories
 */

import { zhCoreTools } from './core';
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

export const zhTools = {
	...zhCoreTools,
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
	...zhOthersTools
};
