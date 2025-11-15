// Built-in tools system for LLMSider
// Provides basic web scraping and file operations

import { App, Notice } from 'obsidian';
import { Logger } from './../utils/logger';
import { I18nManager } from '../i18n/i18n-manager';
import { FileHistoryEntry } from '../types';

// Import all tools from separate modules
import {
  viewFileTool,
  strReplaceTool,
  createFileTool,
  insertTool,
  moveFileTool,
  trashFileTool,
  sedTool,
  appendTool,
  setSharedFunctions as setFileManagementSharedFunctions
} from './file-management-tools';

import {
  fileExistsTool,
  listDirectoryTool,
  setSharedFunctions as setFileSystemSharedFunctions
} from './file-system-tools';

import {
  getCurrentTimeTool
} from './utility-tools';

import {
  fetchWebContentTool,
  fetchYouTubeTranscriptTool
} from './web-content-tools';

import {
  webSearchTool,
  setPluginSettingsGetter
} from './google-search-tools';

import {
  insertAtCursorTool,
  editorUndoTool,
  editorRedoTool,
  setSharedFunctions as setEditorSharedFunctions
} from './editor-tools';

import {
  moveNoteTool,
  renameNoteTool,
  deleteNoteTool,
  mergeNotesTool,
  copyNoteTool,
  duplicateNoteTool,
  setSharedFunctions as setNoteManagementSharedFunctions
} from './note-management-tools';

import {
  searchFilesTool,
  searchContentTool,
  findFilesTool,
  setSharedFunctions as setSearchSharedFunctions
} from './search-tools';

import {
  duckduckgoTextSearchTool,
  duckduckgoImageSearchTool,
  duckduckgoNewsSearchTool,
  duckduckgoVideoSearchTool
} from './duckduckgo-tools';

import {
  wikipediaSearchTool,
  wikipediaRandomTool
} from './wikipedia-tools';

import {
  enhancedSearchTool
} from './enhanced-search-tools';

import {
  getMarketQuoteTool,
  searchSymbolTool
} from './market-data-tools';

import {
  getIndustryBoardTool,
  getConceptBoardTool,
  getBoardStocksTool
} from './market-board-tools';

import {
  getLimitBoardTool,
  getMarketMoneyFlowTool,
  getDragonTigerListTool,
  getNewStockInfoTool,
  getMarketOverviewTool
} from './market-advanced-tools';

import {
  getCorporateBondTool
} from './bond-tools';

import {
  getOpenFundTool,
  getFundRankingTool,
  getFundNAVHistoryTool,
  getFundHoldingsTool,
  getFundManagerTool
} from './fund-tools';

import {
  getFuturesPositionRankSumTool,
  getFuturesWarehouseReceiptDataTool,
  getCFFEXDailyTool,
  getCZCEDailyTool,
  getDCEDailyTool,
  getSHFEDailyTool,
  getINEDailyTool,
  getFuturesInventoryEMTool,
  getDCECommodityOptionHistTool,
  getCZCECommodityOptionHistTool,
  getSHFECommodityOptionHistTool,
  getGFEXCommodityOptionHistTool
} from './futures-advanced-tools';

import {
  getOpenFundRankingTool,
  getExchangeFundRankingTool,
  getMoneyFundRankingTool,
  getFundManagerInfoTool,
  getFundRatingTool,
  getFundStockHoldingsTool,
  getFundBondHoldingsTool,
  getFundScaleChangeTool,
  getFundHolderStructureTool,
  getFundDividendRankingTool,
  getFundDividendDetailTool,
  getQDIIExchangeRateIndexTool,
  getQDIIAllocationIndexTool
} from './fund-advanced-tools';

import {
  getOptionGreeksDetailTool,
  getOptionMinuteDataTool,
  getOptionVolatilitySurfaceTool,
  getOptionRiskMetricsTool,
  getOptionValueAnalysisTool,
  getChinaVIXTool,
  getOptionLeaderboardTool,
  getOptionPCRTool,
  getOptionArbitrageTool,
  getOptionMoneynessTool,
  getOptionVolatilityComparisonTool,
  getOptionTurnoverRankTool
} from './options-advanced-tools';



import {
  getStockAShareHistTool
} from './stock-market-tools';

import {
  getIndustrySectorSpotTool,
  getConceptBoardSpotTool,
  getSectorConstituentsTool,
  getSectorHistTool
} from './stock-sector-tools';

import {
  getIndividualFundFlowTool,
  getStockFundFlowRankTool,
  getSectorFundFlowRankTool,
  getMarketFundFlowTool
} from './stock-fund-flow-tools';

import {
  getDragonTigerListTool as getDTListDetailTool,
  getLimitUpPoolTool,
  getLimitDownPoolTool,
  getIPOSubscriptionDataTool,
  getBlockTradeDetailsTool
} from './stock-special-tools';

import {
  getFinancialSummaryTool,
  getFinancialStatementsTool
} from './stock-financial-tools';

import {
  getMarginTradingSummarySSETool,
  getMarginTradingDetailTool
} from './margin-tools';

import {
  getHSGTHoldingsTool,
  getHSGTFundFlowTool
} from './hsgt-tools';

import {
  getIPOSubscriptionListTool,
  getIPOAuditKCBTool,
  getIPOAuditCYBTool,
  getIPOAuditBJTool,
  getIPOProfitRateTool,
  getIPOBenefitStocksTool,
  getNewStockFirstDayTool
} from './stock-ipo-tools';

import {
  getInstitutionResearchStatsTool,
  getEquityPledgeProfileTool,
  getCompanyPledgeRatioTool
} from './stock-depth-analysis-tools';

import {
  getStockNewHighTool,
  getStockNewLowTool,
  getContinuousRiseTool,
  getContinuousFallTool,
  getContinuousVolumeTool,
  getContinuousVolumeShrinkTool,
  getVolumePriceRiseTool,
  getVolumePriceFallTool,
  getBoardAnomalyTool
} from './stock-technical-tools';

import {
  getCCTVNewsTool,
  getFinancialNewsTool,
  getStockPopularityTool,
  getNewsSentimentTool,
  getWeiboSentimentTool,
  getEconomicCalendarTool,
  getResearchReportsTool
} from './stock-news-sentiment-tools';

import {
  getFuturesHoldingRankDetailTool,
  getWarehouseReceiptDetailTool,
  getFuturesRollYieldTool,
  getFuturesSpotPriceTool,
  getCommodityInventoryTool
} from './futures-detail-tools';

import {
  getChinaSocialFinancingTool,
  getChinaReserveRatioTool,
  getChinaIndustrialValueAddedTool,
  getUSNonFarmPayrollTool,
  getUSADPEmploymentTool,
  getUSCPITool,
  getUSPPITool,
  getUSPMITool,
  getUSRetailSalesTool,
  getUSInitialJoblessTool,
  getUSEIACrudeTool,
  getUSAPICrudeTool
} from './macro-economic-tools';

import {
  getRollYieldBarTool,
  getCFFEXRankTableTool,
  getRankTableCZCETool,
  getDCERankTableTool,
  getSHFEVWAPTool,
  getGFEXDailyTool
} from './futures-roll-yield-tools';

import {
  getStockHKDailyTool,
  getStockUSDailyTool,
  getUSStockNameTool,
  getStockAHSpotTool,
  getStockKCBSpotTool,
  getStockKCBDailyTool
} from './stock-hk-us-history-tools';

import {
  getFuturesZhSpotTool,
  getFuturesZhRealtimeTool,
  getFuturesForeignRealtimeTool,
  getFuturesZhMinuteSinaTool
} from './futures-sina-tools';

import {
  getFXSwapQuoteTool,
  getFXPairQuoteTool,
  getMajorFXPairsTool
} from './forex-supplementary-tools';

import {
  getIndexSSEDailyTool,
  getIndexSZSEDailyTool,
  getIndexCSIDailyTool
} from './index-historical-tools';



import {
  getConvertibleBondSpotTool,
  getCorporateBondSpotTool,
  getCorporateBondIssuanceTool,
  getLocalGovBondIssuanceTool,
  getBondCreditRatingTool,
  getBondRatingChangesTool,
  getBondDefaultEventsTool
} from './bond-supplementary-tools';

import {
  getStockDividendTool,
  getStockBuybackTool,
  getExecutiveTradingTool,
  getInstitutionalHoldingsTool,
  getShareholderCountTool,
  getRestrictedShareReleaseTool,
  getSharePledgeTool,
  getStockOfferingTool,
  getEquityIncentiveTool,
  getEarningsForecastTool,
  getEarningsFlashTool,
  getTopListTool
} from './stock-fundamental-tools';

import {
  getFuturesExchangeListTool,
  getFuturesTradingTimeTool,
  getFuturesContractMultiplierTool,
  getFuturesMarginRatioTool
} from './futures-contract-info-tools';

import {
  getFundManagerPerformanceTool,
  getFundFlowTool,
  getETFTrackingTool,
  getFundAllocationIndexTool,
  getFundComparisonTool,
  getFundFeesTool,
  getFundRiskMetricsTool,
  getFundStyleAnalysisTool,
  getFundCompanyRankingTool,
  getETFArbitrageTool,
  getLOFArbitrageTool,
  getFundTurnoverRateTool,
  getFundManagerHistoryTool,
  getSectorFundRankingTool,
  getFundBenchmarkComparisonTool,
  getQDIICurrencyExposureTool,
  getFundHoldingsChangeTool,
  getMoneyFundYieldRankingTool,
  getFundShareholderConcentrationTool,
  getSmartBetaETFMetricsTool
} from './fund-detail-tools';

import {
  getStockTickDataTool,
  getOrderBookLevel2Tool,
  getOrderBookLevel2FullTool,
  getTransactionStreamTool,
  getMarketSnapshotTool,
  getIntradayMinuteDataTool,
  getLargeOrderMonitorTool,
  getIndexCompositionRealtimeTool,
  getSectorRotationRealtimeTool,
  getMarketBreadthTool,
  getOptionsChainRealtimeTool,
  getBondQuotesStreamTool,
  getMarketMakerQuotesTool,
  getAuctionDataTool
} from './realtime-market-tools';

import {
  getNewsHeatRankingTool,
  getResearchReportStatsTool,
  getStockMentionTrendsTool,
  getInstitutionalResearchCalendarTool
} from './alternative-data-tools';

import {
  getMetalFuturesSpreadsTool,
  getEnergyFuturesSpreadsTool,
  getAgriculturalFuturesBasisTool,
  getCOTReportsTool,
  getWarehouseStocksByLocationTool,
  getFreightRatesTool,
  getCommoditySeasonalityTool,
  getCommodityProductionCostsTool,
  getFuturesTermStructureTool,
  getCommodityTradeFlowsTool,
  getCommoditySupplyDemandTool,
  getRefineryMarginsTool,
  getCommodityWeatherImpactTool,
  getCommodityCorrelationTool,
  getFuturesOpenInterestAnalysisTool,
  getCommodityIndexTrackingTool,
  getFuturesVolumeAnalysisTool,
  getCommodityArbitrageOpportunitiesTool,
  getFuturesRolloverAnalysisTool,
  getCommodityMarketDepthTool
} from './commodity-futures-tools';

import {
  getInterestRateSwapRatesTool,
  getEquityIndexDerivativesTool,
  getVolatilitySurfaceAnalysisTool,
  getOptionStrategyAnalysisTool,
  getSwaptionDataTool,
  getVarianceSwapRatesTool,
  getExoticOptionsDataTool,
  getCDSSpreadsTool,
  getForwardRateAgreementsTool,
  getInterestRateCapFloorTool,
  getEquityDerivativesOIDistributionTool,
  getVolatilityArbitrageSignalsTool,
  getDividendSwapRatesTool,
  getCorrelationSwapQuotesTool,
  getEquityDispersionTradingTool,
  getOptionImpliedCorrelationTool,
  getCrossCurrencyBasisSwapsTool,
  getTotalReturnSwapsTool
} from './derivatives-tools';

import {
  getValueAtRiskTool,
  getStressTestingResultsTool,
  getScenarioAnalysisTool,
  getPortfolioRiskAttributionTool,
  getCreditRiskMetricsTool,
  getLiquidityRiskIndicatorsTool,
  getOperationalRiskIndicatorsTool,
  getMarginRequirementsTool,
  getCounterpartyExposureTool,
  getConcentrationRiskAnalysisTool,
  getTailRiskIndicatorsTool,
  getRiskLimitMonitoringTool
} from './risk-management-tools';

import {
  getESGRatingsTool,
  getCarbonEmissionsDataTool,
  getGreenBondDataTool,
  getESGControversyScoresTool,
  getClimateRiskAssessmentTool,
  getSustainabilityReportsTool,
  getWaterUsageDataTool,
  getRenewableEnergyUsageTool,
  getWasteManagementMetricsTool,
  getSupplyChainESGMetricsTool,
  getBoardDiversityMetricsTool,
  getEmployeeSatisfactionMetricsTool,
  getESGFundScreeningTool,
  getGreenFinanceStatsTool,
  getCarbonCreditPricesTool,
  getESGDisclosureQualityTool,
  getSocialResponsibilityMetricsTool,
  getGovernanceQualityMetricsTool
} from './esg-data-tools';

import {
  getCreditRatingsHistoryTool,
  getRatingTransitionMatrixTool,
  getDefaultProbabilityTool,
  getCreditSpreadAnalysisTool,
  getRecoveryRatesTool,
  getCovenantAnalysisTool,
  getDebtStructureAnalysisTool,
  getCreditEventHistoryTool,
  getBankruptcyPredictionTool,
  getDistressedDebtAnalysisTool,
  getCreditPortfolioAnalyticsTool,
  getCounterpartyCreditRiskTool,
  getSovereignCreditAnalysisTool,
  getCorporateBondAnalyticsTool,
  getCreditCycleIndicatorsTool,
  getDebtCapacityAnalysisTool
} from './credit-analysis-tools';

import {
  getUSEarningsCalendarTool,
  getUSInstitutionalHoldingsTool,
  getUSInsiderTradingTool,
  getUSDividendCalendarTool,
  getADRDataTool,
  getUSExtendedHoursQuotesTool,
  getUSStockSplitsCalendarTool,
  getHKConnectQuotaUsageTool,
  getHKIPOCalendarTool,
  getHKMajorShareholdersTool,
  getHKWarrantDataTool,
  getUSConferenceCallScheduleTool,
  getUSAnalystEstimatesTool,
  getHKBuybackAnnouncementsTool,
  getGlobalIndicesRealtimeTool,
  getUSOptionsExpirationCalendarTool,
  getHKShortSellingDataTool,
  getAHPremiumTrackingTool
} from './international-market-tools';

import {
  getBankNetInterestMarginTool,
  getBankLoanDepositRatioTool,
  getBankNPLRatioTool,
  getBankCapitalAdequacyTool,
  getInsurancePremiumIncomeTool,
  getInsuranceSolvencyRatioTool,
  getInsuranceCombinedRatioTool,
  getRealEstateSalesDataTool,
  getLandTransactionDataTool,
  getPropertyInventoryLevelsTool,
  getPropertyPriceIndicesTool,
  getDrugApprovalPipelineTool,
  getClinicalTrialDataTool,
  getMedicalDeviceRegistrationTool,
  getHospitalOperationMetricsTool,
  getREITsPerformanceTool,
  getTelecomOperatorMetricsTool,
  getAutomotiveSalesDataTool
} from './sector-specific-tools';

import {
  getStockScreeningTool,
  getBacktestingResultsTool,
  getCorrelationMatrixTool,
  getMomentumIndicatorsTool,
  getTechnicalPatternRecognitionTool,
  getMeanReversionSignalsTool,
  getPairTradingOpportunitiesTool,
  getStockRankingMultiMetricTool,
  getSectorMomentumRankingTool
} from './stock-advanced-analysis-tools';

// Batch 9: Stock Popularity & Technical Analysis
import {
  getStockHotRankEMTool,
  getStockCYQEMTool,
  getStockIntradayEMTool,
  getStockBidAskEMTool,
  getStockChangesEMTool,
  getStockBoardChangeEMTool,
  getStockHotFollowXQTool,
  getStockHotTweetXQTool,
  getStockInnerTradeXQTool,
  getStockHotSearchBaiduTool,
  getStockATTMLYRTool,
  getStockAAllPBTool,
  getStockZHAGBJGEMTool
} from './stock-popularity-technical-tools';

// Batch 9: Options & Margin Analysis
import {
  getOptionMarginTool,
  getOptionDailyStatsSZSETool,
  getOptionCommInfoTool,
  getFuturesHoldPosSinaTool,
  getStockZHABComparisonEMTool,
  getStockMarginAccountInfoTool,
  getCryptoBitcoinCMETool,
  getCryptoBitcoinHoldReportTool
} from './option-margin-tools';

// Batch 9: Fund Alternative Data
import {
  getFundScaleOpenSinaTool,
  getFundFeeEMTool,
  getStockHKProfitForecastTool,
  getFundPortfolioHoldEMTool,
  getFundManagerInfoEMTool,
  getPrivateFundRankTool,
  getFundManagerChangeTool,
  getETFRealTimePremiumTool,
  getLOFRealTimePremiumTool,
  getBondConvertPremiumTool,
  getBondCallRedeemWarningTool,
  getFundShareChangeTool,
  getFundPurchaseRedeemTool,
  getFundOpenRankEMTool
} from './fund-alternative-data-tools';

// Constants from TextEditorTools
const SNIPPET_LINES = 3; // Number of lines to show before/after changes
const MAX_HISTORY_ENTRIES = 50; // Maximum number of undo entries per file

/**
 * Ultra-simplified practical tool category system
 * Default enabled: file-management, editor, note-management, search, utility, web-content, search-engines
 */
export type ToolCategory = 
  // ========== Default Enabled Categories (7) ==========
  | 'file-management'    // File operations (create, edit, move, delete, exists, list directory)
  | 'editor'             // Editor operations (insert at cursor, undo/redo)
  | 'note-management'    // Note-specific operations (create, duplicate)
  | 'search'             // Search operations (files, content)
  | 'utility'            // Utility tools (time/date)
  | 'web-content'        // Web content fetching (web pages, YouTube)
  | 'search-engines'     // Search engines (Google, Bing, Wikipedia)
  
  // ========== Financial Market Categories (6 total) ==========
  | 'stock'              // 股票市场：A股、港股、美股、个股数据、板块、资金流向、龙虎榜、财务报表
  | 'funds'              // 基金市场：公募基金、ETF、QDII、基金净值、基金经理
  | 'futures'            // 期货市场：商品期货、金融期货、持仓排名、仓单、主力合约
  | 'bonds'              // 债券市场：国债、企业债、可转债、收益率曲线、Shibor、LPR
  | 'options'            // 期权市场：股票期权、期权Greeks、波动率、期权策略
  | 'market-data';       // 市场数据与分析：外汇、数字货币、宏观经济、行业数据、技术分析、新闻舆情、风险管理、ESG、商品基本面、衍生品、信用分析

export interface BuiltInTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
  execute: (args: any) => Promise<any>;
  category?: ToolCategory;
}

// Global App instance for Obsidian API access
let globalApp: App | null = null;
// File history for undo functionality
export let globalFileHistory: Map<string, FileHistoryEntry[]> = new Map();

/**
 * Set the global App instance for Obsidian API access
 */
export function setApp(app: App, getSettings?: () => any): void {
  globalApp = app;

  // Initialize settings getter for google search tool
  if (getSettings) {
    setPluginSettingsGetter(getSettings);
  }

  // Initialize shared functions for all tool modules
  setFileManagementSharedFunctions({
    getApp,
    validatePath,
    saveToHistory,
    makeOutput,
    ensureDirectoryExists,
    globalFileHistory
  });

  setFileSystemSharedFunctions({
    getApp
  });

  setEditorSharedFunctions({
    getApp
  });

  setNoteManagementSharedFunctions({
    getApp
  });

  setSearchSharedFunctions({
    getApp
  });
}

/**
 * Get the global App instance
 */
export function getApp(): App {
  if (!globalApp) {
    throw new Error('App instance not initialized. Call setApp() first.');
  }
  return globalApp;
}

/**
 * Validate file path for security and vault boundaries
 */
export async function validatePath(operation: string, path: string): Promise<void> {
  if (!path || path.trim() === '') {
    throw new Error(`Invalid path: empty path provided for ${operation}`);
  }

  // Security: prevent path traversal
  if (path.includes('..') || path.includes('//') || path.startsWith('/')) {
    throw new Error(`Invalid path: path traversal not allowed (${path})`);
  }

  // Ensure path is within vault boundaries by normalizing
  const normalizedPath = path.replace(/\\/g, '/');
  if (normalizedPath !== path) {
    throw new Error(`Invalid path: backslashes not allowed (${path})`);
  }
}

/**
 * Save file content to history for undo functionality
 */
export async function saveToHistory(path: string, content: string, operation: string): Promise<void> {
  if (!globalFileHistory.has(path)) {
    globalFileHistory.set(path, []);
  }

  const history = globalFileHistory.get(path)!;
  history.push({
    content,
    timestamp: Date.now(),
    operation
  });

  // Limit history size to prevent memory issues
  if (history.length > MAX_HISTORY_ENTRIES) {
    history.shift(); // Remove oldest entry
  }
}

/**
 * Format output with line numbers (following existing patterns)
 */
export function makeOutput(content: string, path: string, startLine: number = 1): string {
  const lines = content.split('\n');
  const lineNumberWidth = Math.max(2, String(startLine + lines.length - 1).length);

  const numberedLines = lines.map((line, index) => {
    const lineNumber = startLine + index;
    const paddedNumber = String(lineNumber).padStart(lineNumberWidth, ' ');
    return `${paddedNumber}→${line}`;
  });

  return `Here's the content of ${path}:\n${numberedLines.join('\n')}`;
}

/**
 * Ensure that the directory path exists for a given file path
 */
export async function ensureDirectoryExists(filePath: string): Promise<void> {
  Logger.debug('ensureDirectoryExists called with:', filePath);

  const app = getApp();
  const pathParts = filePath.split('/');
  Logger.debug('Path parts:', pathParts);

  // Remove the filename (last part)
  if (pathParts.length <= 1) {
    Logger.debug('File is in root directory, no directories to create');
    return; // File is in root directory
  }

  const directoryPath = pathParts.slice(0, -1).join('/');
  Logger.debug('Target directory path:', directoryPath);

  // Check if directory already exists
  const existingDir = app.vault.getAbstractFileByPath(directoryPath);
  Logger.debug('Directory exists check:', existingDir ? 'EXISTS' : 'NOT_EXISTS');
  if (existingDir) {
    Logger.debug('Directory already exists:', {
      name: existingDir.name,
      path: existingDir.path,
      type: existingDir.constructor.name
    });
    return; // Directory already exists
  }

  // Create directory path step by step
  Logger.debug('Creating directories step by step...');
  let currentPath = '';
  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];
    currentPath = currentPath ? `${currentPath}/${part}` : part;
    Logger.debug(`Processing directory part ${i + 1}/${pathParts.length - 1}: "${part}" -> "${currentPath}"`);

    const existingPart = app.vault.getAbstractFileByPath(currentPath);
    Logger.debug(`Directory "${currentPath}" exists:`, existingPart ? 'YES' : 'NO');

    if (!existingPart) {
      try {
        Logger.debug(`Attempting to create directory: "${currentPath}"`);
        const createdFolder = await app.vault.createFolder(currentPath);
        Logger.debug(`Successfully created directory:`, {
          name: createdFolder.name,
          path: createdFolder.path,
          parent: createdFolder.parent?.path || 'root'
        });

        // Verify the directory was created
        const verifyDir = app.vault.getAbstractFileByPath(currentPath);
        Logger.debug(`Directory verification for "${currentPath}":`, verifyDir ? 'FOUND' : 'NOT_FOUND');
      } catch (error) {
        // Check if error is "folder already exists" - this is OK
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.toLowerCase().includes('already exists') || 
            errorMessage.toLowerCase().includes('folder already exists')) {
          Logger.debug(`Directory "${currentPath}" already exists (caught during creation), continuing...`);
          
          // Try to verify directory exists (may be case-insensitive match)
          const verifyDir = app.vault.getAbstractFileByPath(currentPath);
          if (verifyDir) {
            Logger.debug(`Directory "${currentPath}" confirmed to exist (exact match)`);
          } else {
            // Directory exists but with different case (e.g., Templates vs templates on macOS)
            // This is OK - just log it and continue
            Logger.debug(`Directory exists but with different case (case-insensitive file system)`);
          }
          continue; // Directory exists (possibly with different case), move to next part
        }
        
        Logger.error(`Failed to create directory "${currentPath}":`, error);
        Logger.error('Directory creation error details:', {
          message: errorMessage,
          stack: error instanceof Error ? error.stack : 'No stack trace'
        });
        throw new Error(`Failed to create directory: ${currentPath} - ${errorMessage}`);
      }
    } else {
      Logger.debug(`Directory "${currentPath}" already exists, skipping creation`);
    }
  }
  Logger.debug('Directory creation process completed');
}

// Export constants for use by modules
export { SNIPPET_LINES, MAX_HISTORY_ENTRIES };

/**
 * Registry of all built-in tools
 */
export const BUILT_IN_TOOLS: Record<string, BuiltInTool> = {
  'get_timedate': getCurrentTimeTool,
  'view': viewFileTool,
  'str_replace': strReplaceTool,
  'sed': sedTool,
  'append': appendTool,
  'create': createFileTool,
  'insert': insertTool,
  'fetch_web_content': fetchWebContentTool,
  'fetch_youtube_transcript': fetchYouTubeTranscriptTool,
  'web_search': webSearchTool,
  // FileManager tools
  'move_file': moveFileTool,
  'trash_file': trashFileTool,
  // FileSystemAdapter tools
  'file_exists': fileExistsTool,
  'list_file_directory': listDirectoryTool,
  // Editor tools
  'insert_at_cursor': insertAtCursorTool,
  'editor_undo': editorUndoTool,
  'editor_redo': editorRedoTool,
  // Note management tools
  'move_note': moveNoteTool,
  'rename_note': renameNoteTool,
  'delete_note': deleteNoteTool,
  'merge_notes': mergeNotesTool,
  'copy_note': copyNoteTool,
  'duplicate_note': duplicateNoteTool,
  // Vault search tools
  'search_files': searchFilesTool,
  'search_content': searchContentTool,
  'find_files_containing': findFilesTool,
  // Enhanced web search tools
  'enhanced_search': enhancedSearchTool,
  'duckduckgo_text_search': duckduckgoTextSearchTool,
  'duckduckgo_image_search': duckduckgoImageSearchTool,
  'duckduckgo_news_search': duckduckgoNewsSearchTool,
  'duckduckgo_video_search': duckduckgoVideoSearchTool,
  'wikipedia_search': wikipediaSearchTool,
  'wikipedia_random': wikipediaRandomTool,
  // Market data tools
  'get_market_quote': getMarketQuoteTool,
  'search_market_symbol': searchSymbolTool,
  // Market board tools
  'get_industry_board': getIndustryBoardTool,
  'get_concept_board': getConceptBoardTool,
  'get_board_stocks': getBoardStocksTool,
  // Market advanced tools
  'get_limit_board': getLimitBoardTool,
  'get_market_money_flow': getMarketMoneyFlowTool,
  'get_dragon_tiger_list': getDragonTigerListTool,
  'get_new_stock_info': getNewStockInfoTool,
  'get_market_overview': getMarketOverviewTool,
  // Bond market tools (placeholder tools removed)
  'get_corporate_bond': getCorporateBondTool,
  // Options advanced tools
  'get_option_greeks_detail': getOptionGreeksDetailTool,
  'get_option_minute_data': getOptionMinuteDataTool,
  'get_option_volatility_surface': getOptionVolatilitySurfaceTool,
  'get_option_risk_metrics': getOptionRiskMetricsTool,
  'get_option_value_analysis': getOptionValueAnalysisTool,
  'get_china_vix': getChinaVIXTool,
  'get_option_leaderboard': getOptionLeaderboardTool,
  'get_option_pcr': getOptionPCRTool,
  'get_option_arbitrage': getOptionArbitrageTool,
  'get_option_moneyness': getOptionMoneynessTool,
  'get_option_volatility_comparison': getOptionVolatilityComparisonTool,
  'get_option_turnover_rank': getOptionTurnoverRankTool,
  // Fund market tools (get_etf_fund removed - API failed)
  'get_open_fund': getOpenFundTool,
  'get_fund_ranking': getFundRankingTool,
  'get_fund_nav_history': getFundNAVHistoryTool,
  'get_fund_holdings': getFundHoldingsTool,
  'get_fund_manager': getFundManagerTool,

  // Stock market data tools (A-share history only - failed APIs removed)
  'get_stock_a_share_hist': getStockAShareHistTool,
  // Stock sector and concept board tools
  'get_industry_sector_spot': getIndustrySectorSpotTool,
  'get_concept_board_spot': getConceptBoardSpotTool,
  'get_sector_constituents': getSectorConstituentsTool,
  'get_sector_hist': getSectorHistTool,
  // Stock fund flow tools
  'get_individual_fund_flow': getIndividualFundFlowTool,
  'get_stock_fund_flow_rank': getStockFundFlowRankTool,
  'get_sector_fund_flow_rank': getSectorFundFlowRankTool,
  'get_market_fund_flow': getMarketFundFlowTool,
  // Stock special data tools
  'get_dragon_tiger_list_detail': getDTListDetailTool,
  'get_limit_up_pool': getLimitUpPoolTool,
  'get_limit_down_pool': getLimitDownPoolTool,
  'get_ipo_subscription_data': getIPOSubscriptionDataTool,
  'get_block_trade_details': getBlockTradeDetailsTool,
  // Stock financial tools
  'get_financial_summary': getFinancialSummaryTool,
  'get_financial_statements': getFinancialStatementsTool,

  // Forex tools (removed - APIs failed)
  // Margin trading tools
  'get_margin_trading_summary_sse': getMarginTradingSummarySSETool,
  'get_margin_trading_detail': getMarginTradingDetailTool,
  // Shanghai-Shenzhen-Hong Kong Stock Connect tools
  'get_hsgt_holdings': getHSGTHoldingsTool,
  'get_hsgt_fund_flow': getHSGTFundFlowTool,
  // IPO data tools
  'get_ipo_subscription_list': getIPOSubscriptionListTool,
  'get_ipo_audit_kcb': getIPOAuditKCBTool,
  'get_ipo_audit_cyb': getIPOAuditCYBTool,
  'get_ipo_audit_bj': getIPOAuditBJTool,
  'get_ipo_profit_rate': getIPOProfitRateTool,
  'get_ipo_benefit_stocks': getIPOBenefitStocksTool,
  'get_new_stock_first_day': getNewStockFirstDayTool,
  // Stock depth analysis tools
  'get_institution_research_stats': getInstitutionResearchStatsTool,
  'get_equity_pledge_profile': getEquityPledgeProfileTool,
  'get_company_pledge_ratio': getCompanyPledgeRatioTool,
  // Technical stock selection tools
  'get_stock_new_high': getStockNewHighTool,
  'get_stock_new_low': getStockNewLowTool,
  'get_continuous_rise': getContinuousRiseTool,
  'get_continuous_fall': getContinuousFallTool,
  'get_continuous_volume': getContinuousVolumeTool,
  'get_continuous_volume_shrink': getContinuousVolumeShrinkTool,
  'get_volume_price_rise': getVolumePriceRiseTool,
  'get_volume_price_fall': getVolumePriceFallTool,
  'get_board_anomaly': getBoardAnomalyTool,
  // News and sentiment tools
  'get_cctv_news': getCCTVNewsTool,
  'get_financial_news': getFinancialNewsTool,
  'get_stock_popularity': getStockPopularityTool,
  'get_news_sentiment': getNewsSentimentTool,
  'get_weibo_sentiment': getWeiboSentimentTool,
  'get_economic_calendar': getEconomicCalendarTool,
  'get_research_reports': getResearchReportsTool,
  // Futures detailed data tools
  'get_futures_holding_rank_detail': getFuturesHoldingRankDetailTool,
  'get_warehouse_receipt_detail': getWarehouseReceiptDetailTool,
  'get_futures_roll_yield': getFuturesRollYieldTool,
  'get_futures_spot_price': getFuturesSpotPriceTool,
  'get_commodity_inventory': getCommodityInventoryTool,
  // Futures advanced tools
  'get_futures_position_rank_sum': getFuturesPositionRankSumTool,
  'get_futures_warehouse_receipt_data': getFuturesWarehouseReceiptDataTool,
  'get_cffex_daily': getCFFEXDailyTool,
  'get_czce_daily': getCZCEDailyTool,
  'get_dce_daily': getDCEDailyTool,
  'get_shfe_daily': getSHFEDailyTool,
  'get_ine_daily': getINEDailyTool,
  'get_futures_inventory_em': getFuturesInventoryEMTool,
  'get_dce_commodity_option_hist': getDCECommodityOptionHistTool,
  'get_czce_commodity_option_hist': getCZCECommodityOptionHistTool,
  'get_shfe_commodity_option_hist': getSHFECommodityOptionHistTool,
  'get_gfex_commodity_option_hist': getGFEXCommodityOptionHistTool,
  // Fund advanced tools
  'get_open_fund_ranking': getOpenFundRankingTool,
  'get_exchange_fund_ranking': getExchangeFundRankingTool,
  'get_money_fund_ranking': getMoneyFundRankingTool,
  'get_fund_manager_info': getFundManagerInfoTool,
  'get_fund_rating': getFundRatingTool,
  'get_fund_stock_holdings': getFundStockHoldingsTool,
  'get_fund_bond_holdings': getFundBondHoldingsTool,
  'get_fund_scale_change': getFundScaleChangeTool,
  'get_fund_holder_structure': getFundHolderStructureTool,
  'get_fund_dividend_ranking': getFundDividendRankingTool,
  'get_fund_dividend_detail': getFundDividendDetailTool,
  'get_qdii_exchange_rate_index': getQDIIExchangeRateIndexTool,
  'get_qdii_allocation_index': getQDIIAllocationIndexTool,
  // Macro economic data tools (detailed)
  'get_china_social_financing': getChinaSocialFinancingTool,
  'get_china_reserve_ratio': getChinaReserveRatioTool,
  'get_china_industrial_value_added': getChinaIndustrialValueAddedTool,
  'get_us_non_farm_payroll': getUSNonFarmPayrollTool,
  'get_us_adp_employment': getUSADPEmploymentTool,
  'get_us_cpi': getUSCPITool,
  'get_us_ppi': getUSPPITool,
  'get_us_pmi': getUSPMITool,
  'get_us_retail_sales': getUSRetailSalesTool,
  'get_us_initial_jobless': getUSInitialJoblessTool,
  'get_us_eia_crude': getUSEIACrudeTool,
  'get_us_api_crude': getUSAPICrudeTool,
  // Futures roll yield and advanced position data
  'get_roll_yield_bar': getRollYieldBarTool,
  'get_cffex_rank_table': getCFFEXRankTableTool,
  'get_rank_table_czce': getRankTableCZCETool,
  'get_dce_rank_table': getDCERankTableTool,
  'get_shfe_v_wap': getSHFEVWAPTool,
  'get_gfex_daily': getGFEXDailyTool,
  // Hong Kong and US stock historical data
  'stock_hk_daily': getStockHKDailyTool,
  'stock_us_daily': getStockUSDailyTool,
  'get_us_stock_name': getUSStockNameTool,
  'stock_zh_ah_spot': getStockAHSpotTool,
  'stock_zh_kcb_spot': getStockKCBSpotTool,
  'stock_zh_kcb_daily': getStockKCBDailyTool,
  // Futures Sina data tools (removed 2 example-only tools)
  'futures_zh_spot': getFuturesZhSpotTool,
  'futures_zh_realtime': getFuturesZhRealtimeTool,
  'futures_foreign_commodity_realtime': getFuturesForeignRealtimeTool,
  'futures_zh_minute_sina': getFuturesZhMinuteSinaTool,
  // Forex supplementary tools
  'fx_swap_quote': getFXSwapQuoteTool,
  'fx_pair_quote': getFXPairQuoteTool,
  'fx_major_pairs_realtime': getMajorFXPairsTool,
  // Stock index historical data tools
  'stock_zh_index_daily': getIndexSSEDailyTool,
  'stock_sz_index_daily': getIndexSZSEDailyTool,
  'stock_csi_index_daily': getIndexCSIDailyTool,

  // Futures contract information tools
  'futures_exchange_list': getFuturesExchangeListTool,
  'futures_trading_time': getFuturesTradingTimeTool,
  'futures_contract_multiplier': getFuturesContractMultiplierTool,
  'futures_margin_ratio': getFuturesMarginRatioTool,
  // Bond supplementary tools
  'get_convertible_bond_spot': getConvertibleBondSpotTool,
  'get_corporate_bond_spot': getCorporateBondSpotTool,
  'get_corporate_bond_issuance': getCorporateBondIssuanceTool,
  'get_local_gov_bond_issuance': getLocalGovBondIssuanceTool,
  'get_bond_credit_rating': getBondCreditRatingTool,
  'get_bond_rating_changes': getBondRatingChangesTool,
  'get_bond_default_events': getBondDefaultEventsTool,
  // Stock fundamental tools
  'get_stock_dividend': getStockDividendTool,
  'get_stock_buyback': getStockBuybackTool,
  'get_executive_trading': getExecutiveTradingTool,
  'get_institutional_holdings': getInstitutionalHoldingsTool,
  'get_shareholder_count': getShareholderCountTool,
  'get_restricted_share_release': getRestrictedShareReleaseTool,
  'get_share_pledge': getSharePledgeTool,
  'get_stock_offering': getStockOfferingTool,
  'get_equity_incentive': getEquityIncentiveTool,
  'get_earnings_forecast': getEarningsForecastTool,
  'get_earnings_flash': getEarningsFlashTool,
  'get_top_list': getTopListTool,
  // Fund detail tools
  'get_fund_manager_performance': getFundManagerPerformanceTool,
  'get_fund_flow': getFundFlowTool,
  'get_etf_tracking': getETFTrackingTool,
  'get_fund_allocation_index': getFundAllocationIndexTool,
  'get_fund_comparison': getFundComparisonTool,
  'get_fund_fees': getFundFeesTool,
  'get_fund_risk_metrics': getFundRiskMetricsTool,
  'get_fund_style_analysis': getFundStyleAnalysisTool,
  'get_fund_company_ranking': getFundCompanyRankingTool,
  'get_etf_arbitrage': getETFArbitrageTool,
  'get_lof_arbitrage': getLOFArbitrageTool,
  'get_fund_turnover_rate': getFundTurnoverRateTool,
  'get_fund_manager_history': getFundManagerHistoryTool,
  'get_sector_fund_ranking': getSectorFundRankingTool,
  'get_fund_benchmark_comparison': getFundBenchmarkComparisonTool,
  'get_qdii_currency_exposure': getQDIICurrencyExposureTool,
  'get_fund_holdings_change': getFundHoldingsChangeTool,
  'get_money_fund_yield_ranking': getMoneyFundYieldRankingTool,
  'get_fund_shareholder_concentration': getFundShareholderConcentrationTool,
  'get_smart_beta_etf_metrics': getSmartBetaETFMetricsTool,
  // Real-time market data tools
  'get_stock_tick_data': getStockTickDataTool,
  'get_order_book_level2': getOrderBookLevel2Tool,
  'get_order_book_level2_full': getOrderBookLevel2FullTool,
  'get_transaction_stream': getTransactionStreamTool,
  'get_market_snapshot': getMarketSnapshotTool,
  'get_intraday_minute_data': getIntradayMinuteDataTool,
  'get_large_order_monitor': getLargeOrderMonitorTool,
  'get_index_composition_realtime': getIndexCompositionRealtimeTool,
  'get_sector_rotation_realtime': getSectorRotationRealtimeTool,
  'get_market_breadth': getMarketBreadthTool,
  'get_options_chain_realtime': getOptionsChainRealtimeTool,
  'get_bond_quotes_stream': getBondQuotesStreamTool,
  'get_market_maker_quotes': getMarketMakerQuotesTool,
  'get_auction_data': getAuctionDataTool,
  // Alternative data tools
  'get_news_heat_ranking': getNewsHeatRankingTool,
  'get_research_report_stats': getResearchReportStatsTool,
  'get_stock_mention_trends': getStockMentionTrendsTool,
  'get_institutional_research_calendar': getInstitutionalResearchCalendarTool,
  
  // International market tools
  'get_us_earnings_calendar': getUSEarningsCalendarTool,
  'get_us_institutional_holdings': getUSInstitutionalHoldingsTool,
  'get_us_insider_trading': getUSInsiderTradingTool,
  'get_us_dividend_calendar': getUSDividendCalendarTool,
  'get_adr_data': getADRDataTool,
  'get_us_extended_hours_quotes': getUSExtendedHoursQuotesTool,
  'get_us_stock_splits_calendar': getUSStockSplitsCalendarTool,
  'get_hk_connect_quota_usage': getHKConnectQuotaUsageTool,
  'get_hk_ipo_calendar': getHKIPOCalendarTool,
  'get_hk_major_shareholders': getHKMajorShareholdersTool,
  'get_hk_warrant_data': getHKWarrantDataTool,
  'get_us_conference_call_schedule': getUSConferenceCallScheduleTool,
  'get_us_analyst_estimates': getUSAnalystEstimatesTool,
  'get_hk_buyback_announcements': getHKBuybackAnnouncementsTool,
  'get_global_indices_realtime': getGlobalIndicesRealtimeTool,
  'get_us_options_expiration_calendar': getUSOptionsExpirationCalendarTool,
  'get_hk_short_selling_data': getHKShortSellingDataTool,
  'get_ah_premium_tracking': getAHPremiumTrackingTool,
  
  // Sector-specific tools
  'get_bank_net_interest_margin': getBankNetInterestMarginTool,
  'get_bank_loan_deposit_ratio': getBankLoanDepositRatioTool,
  'get_bank_npl_ratio': getBankNPLRatioTool,
  'get_bank_capital_adequacy': getBankCapitalAdequacyTool,
  'get_insurance_premium_income': getInsurancePremiumIncomeTool,
  'get_insurance_solvency_ratio': getInsuranceSolvencyRatioTool,
  'get_insurance_combined_ratio': getInsuranceCombinedRatioTool,
  'get_real_estate_sales_data': getRealEstateSalesDataTool,
  'get_land_transaction_data': getLandTransactionDataTool,
  'get_property_inventory_levels': getPropertyInventoryLevelsTool,
  'get_property_price_indices': getPropertyPriceIndicesTool,
  'get_drug_approval_pipeline': getDrugApprovalPipelineTool,
  'get_clinical_trial_data': getClinicalTrialDataTool,
  'get_medical_device_registration': getMedicalDeviceRegistrationTool,
  'get_hospital_operation_metrics': getHospitalOperationMetricsTool,
  'get_reits_performance': getREITsPerformanceTool,
  'get_telecom_operator_metrics': getTelecomOperatorMetricsTool,
  'get_automotive_sales_data': getAutomotiveSalesDataTool,
  
  // Commodity futures tools
  'get_metal_futures_spreads': getMetalFuturesSpreadsTool,
  'get_energy_futures_spreads': getEnergyFuturesSpreadsTool,
  'get_agricultural_futures_basis': getAgriculturalFuturesBasisTool,
  'get_cot_reports': getCOTReportsTool,
  'get_warehouse_stocks_by_location': getWarehouseStocksByLocationTool,
  'get_freight_rates': getFreightRatesTool,
  'get_commodity_seasonality': getCommoditySeasonalityTool,
  'get_commodity_production_costs': getCommodityProductionCostsTool,
  'get_futures_term_structure': getFuturesTermStructureTool,
  'get_commodity_trade_flows': getCommodityTradeFlowsTool,
  'get_commodity_supply_demand': getCommoditySupplyDemandTool,
  'get_refinery_margins': getRefineryMarginsTool,
  'get_commodity_weather_impact': getCommodityWeatherImpactTool,
  'get_commodity_correlation': getCommodityCorrelationTool,
  'get_futures_open_interest_analysis': getFuturesOpenInterestAnalysisTool,
  'get_commodity_index_tracking': getCommodityIndexTrackingTool,
  'get_futures_volume_analysis': getFuturesVolumeAnalysisTool,
  'get_commodity_arbitrage_opportunities': getCommodityArbitrageOpportunitiesTool,
  'get_futures_rollover_analysis': getFuturesRolloverAnalysisTool,
  'get_commodity_market_depth': getCommodityMarketDepthTool,
  
  // Derivatives tools
  'get_interest_rate_swap_rates': getInterestRateSwapRatesTool,
  'get_equity_index_derivatives': getEquityIndexDerivativesTool,
  'get_volatility_surface_analysis': getVolatilitySurfaceAnalysisTool,
  'get_option_strategy_analysis': getOptionStrategyAnalysisTool,
  'get_swaption_data': getSwaptionDataTool,
  'get_variance_swap_rates': getVarianceSwapRatesTool,
  'get_exotic_options_data': getExoticOptionsDataTool,
  'get_cds_spreads': getCDSSpreadsTool,
  'get_forward_rate_agreements': getForwardRateAgreementsTool,
  'get_interest_rate_cap_floor': getInterestRateCapFloorTool,
  'get_equity_derivatives_oi_distribution': getEquityDerivativesOIDistributionTool,
  'get_volatility_arbitrage_signals': getVolatilityArbitrageSignalsTool,
  'get_dividend_swap_rates': getDividendSwapRatesTool,
  'get_correlation_swap_quotes': getCorrelationSwapQuotesTool,
  'get_equity_dispersion_trading': getEquityDispersionTradingTool,
  'get_option_implied_correlation': getOptionImpliedCorrelationTool,
  'get_cross_currency_basis_swaps': getCrossCurrencyBasisSwapsTool,
  'get_total_return_swaps': getTotalReturnSwapsTool,
  
  // Risk management tools
  'get_value_at_risk': getValueAtRiskTool,
  'get_stress_testing_results': getStressTestingResultsTool,
  'get_scenario_analysis': getScenarioAnalysisTool,
  'get_portfolio_risk_attribution': getPortfolioRiskAttributionTool,
  'get_credit_risk_metrics': getCreditRiskMetricsTool,
  'get_liquidity_risk_indicators': getLiquidityRiskIndicatorsTool,
  'get_operational_risk_indicators': getOperationalRiskIndicatorsTool,
  'get_margin_requirements': getMarginRequirementsTool,
  'get_counterparty_exposure': getCounterpartyExposureTool,
  'get_concentration_risk_analysis': getConcentrationRiskAnalysisTool,
  'get_tail_risk_indicators': getTailRiskIndicatorsTool,
  'get_risk_limit_monitoring': getRiskLimitMonitoringTool,
  
  // Stock advanced analysis tools
  'get_stock_screening': getStockScreeningTool,
  'get_backtesting_results': getBacktestingResultsTool,
  'get_correlation_matrix': getCorrelationMatrixTool,
  'get_momentum_indicators': getMomentumIndicatorsTool,
  'get_technical_pattern_recognition': getTechnicalPatternRecognitionTool,
  'get_mean_reversion_signals': getMeanReversionSignalsTool,
  'get_pair_trading_opportunities': getPairTradingOpportunitiesTool,
  'get_stock_ranking_multi_metric': getStockRankingMultiMetricTool,
  'get_sector_momentum_ranking': getSectorMomentumRankingTool,
  
  // Batch 9: Stock Popularity & Technical Analysis (13 tools after cleanup)
  'get_stock_hot_rank_em': getStockHotRankEMTool,
  'get_stock_cyq_em': getStockCYQEMTool,
  'get_stock_intraday_em': getStockIntradayEMTool,
  'get_stock_bid_ask_em': getStockBidAskEMTool,
  'get_stock_changes_em': getStockChangesEMTool,
  'get_stock_board_change_em': getStockBoardChangeEMTool,
  'get_stock_hot_follow_xq': getStockHotFollowXQTool,
  'get_stock_hot_tweet_xq': getStockHotTweetXQTool,
  'get_stock_inner_trade_xq': getStockInnerTradeXQTool,
  'get_stock_hot_search_baidu': getStockHotSearchBaiduTool,
  'get_stock_a_ttm_lyr': getStockATTMLYRTool,
  'get_stock_a_all_pb': getStockAAllPBTool,
  'get_stock_zh_a_gb_jg_em': getStockZHAGBJGEMTool,
  
  // Batch 9: Options & Margin Analysis (8 tools - removed 6 failed exchange API tools)
  'get_option_margin': getOptionMarginTool,
  'get_option_daily_stats_szse': getOptionDailyStatsSZSETool,
  'get_option_comm_info': getOptionCommInfoTool,
  'get_futures_hold_pos_sina': getFuturesHoldPosSinaTool,
  'get_stock_zh_a_b_comparison_em': getStockZHABComparisonEMTool,
  'get_stock_margin_account_info': getStockMarginAccountInfoTool,
  'get_crypto_bitcoin_cme': getCryptoBitcoinCMETool,
  'get_crypto_bitcoin_hold_report': getCryptoBitcoinHoldReportTool,
  
  // Batch 9: Fund Alternative Data (14 tools - removed 4 invalid API tools)
  'get_fund_scale_open_sina': getFundScaleOpenSinaTool,
  'get_fund_fee_em': getFundFeeEMTool,
  'get_stock_hk_profit_forecast': getStockHKProfitForecastTool,
  'get_fund_portfolio_hold_em': getFundPortfolioHoldEMTool,
  'get_fund_manager_info_em': getFundManagerInfoEMTool,
  'get_private_fund_rank': getPrivateFundRankTool,
  'get_fund_manager_change': getFundManagerChangeTool,
  'get_etf_real_time_premium': getETFRealTimePremiumTool,
  'get_lof_real_time_premium': getLOFRealTimePremiumTool,
  'get_bond_convert_premium': getBondConvertPremiumTool,
  'get_bond_call_redeem_warning': getBondCallRedeemWarningTool,
  'get_fund_share_change': getFundShareChangeTool,
  'get_fund_purchase_redeem': getFundPurchaseRedeemTool,
  'get_fund_open_rank_em': getFundOpenRankEMTool,
  
  // ESG data tools
  'get_esg_ratings': getESGRatingsTool,
  'get_carbon_emissions_data': getCarbonEmissionsDataTool,
  'get_green_bond_data': getGreenBondDataTool,
  'get_esg_controversy_scores': getESGControversyScoresTool,
  'get_climate_risk_assessment': getClimateRiskAssessmentTool,
  'get_sustainability_reports': getSustainabilityReportsTool,
  'get_water_usage_data': getWaterUsageDataTool,
  'get_renewable_energy_usage': getRenewableEnergyUsageTool,
  'get_waste_management_metrics': getWasteManagementMetricsTool,
  'get_supply_chain_esg_metrics': getSupplyChainESGMetricsTool,
  'get_board_diversity_metrics': getBoardDiversityMetricsTool,
  'get_employee_satisfaction_metrics': getEmployeeSatisfactionMetricsTool,
  'get_esg_fund_screening': getESGFundScreeningTool,
  'get_green_finance_stats': getGreenFinanceStatsTool,
  'get_carbon_credit_prices': getCarbonCreditPricesTool,
  'get_esg_disclosure_quality': getESGDisclosureQualityTool,
  'get_social_responsibility_metrics': getSocialResponsibilityMetricsTool,
  'get_governance_quality_metrics': getGovernanceQualityMetricsTool,
  
  // Credit analysis tools
  'get_credit_ratings_history': getCreditRatingsHistoryTool,
  'get_rating_transition_matrix': getRatingTransitionMatrixTool,
  'get_default_probability': getDefaultProbabilityTool,
  'get_credit_spread_analysis': getCreditSpreadAnalysisTool,
  'get_recovery_rates': getRecoveryRatesTool,
  'get_covenant_analysis': getCovenantAnalysisTool,
  'get_debt_structure_analysis': getDebtStructureAnalysisTool,
  'get_credit_event_history': getCreditEventHistoryTool,
  'get_bankruptcy_prediction': getBankruptcyPredictionTool,
  'get_distressed_debt_analysis': getDistressedDebtAnalysisTool,
  'get_credit_portfolio_analytics': getCreditPortfolioAnalyticsTool,
  'get_counterparty_credit_risk': getCounterpartyCreditRiskTool,
  'get_sovereign_credit_analysis': getSovereignCreditAnalysisTool,
  'get_corporate_bond_analytics': getCorporateBondAnalyticsTool,
  'get_credit_cycle_indicators': getCreditCycleIndicatorsTool,
  'get_debt_capacity_analysis': getDebtCapacityAnalysisTool
};

/**
 * Get all built-in tools as an array
 */
/**
 * Tool name to i18n key mapping for localization
 */
const TOOL_I18N_KEY_MAP: Record<string, { name: string; description: string }> = {
  'get_timedate': { name: 'tools.getCurrentTime.name', description: 'tools.getCurrentTime.description' },
  'view': { name: 'tools.viewFile.name', description: 'tools.viewFile.description' },
  'str_replace': { name: 'tools.replaceText.name', description: 'tools.replaceText.description' },
  'sed': { name: 'tools.sed.name', description: 'tools.sed.description' },
  'append': { name: 'tools.append.name', description: 'tools.append.description' },
  'create': { name: 'tools.createFile.name', description: 'tools.createFile.description' },
  'insert': { name: 'tools.insertText.name', description: 'tools.insertText.description' },
  'fetch_web_content': { name: 'tools.fetchWebContent.name', description: 'tools.fetchWebContent.description' },
  'fetch_youtube_transcript': { name: 'tools.fetchYouTubeTranscript.name', description: 'tools.fetchYouTubeTranscript.description' },
  'web_search': { name: 'tools.webSearch.name', description: 'tools.webSearch.description' },
  'move_file': { name: 'tools.moveFile.name', description: 'tools.moveFile.description' },
  'trash_file': { name: 'tools.trashFile.name', description: 'tools.trashFile.description' },
  'file_exists': { name: 'tools.fileExists.name', description: 'tools.fileExists.description' },
  'list_file_directory': { name: 'tools.listDirectory.name', description: 'tools.listDirectory.description' },
  'insert_at_cursor': { name: 'tools.insertAtCursor.name', description: 'tools.insertAtCursor.description' },
  'editor_undo': { name: 'tools.editorUndo.name', description: 'tools.editorUndo.description' },
  'editor_redo': { name: 'tools.editorRedo.name', description: 'tools.editorRedo.description' },
  'move_note': { name: 'tools.moveNote.name', description: 'tools.moveNote.description' },
  'rename_note': { name: 'tools.renameNote.name', description: 'tools.renameNote.description' },
  'delete_note': { name: 'tools.deleteNote.name', description: 'tools.deleteNote.description' },
  'merge_notes': { name: 'tools.mergeNotes.name', description: 'tools.mergeNotes.description' },
  'copy_note': { name: 'tools.copyNote.name', description: 'tools.copyNote.description' },
  'duplicate_note': { name: 'tools.duplicateNote.name', description: 'tools.duplicateNote.description' },
  'search_files': { name: 'tools.searchFiles.name', description: 'tools.searchFiles.description' },
  'search_content': { name: 'tools.searchContent.name', description: 'tools.searchContent.description' },
  'find_files_containing': { name: 'tools.findFilesContaining.name', description: 'tools.findFilesContaining.description' },
  'enhanced_search': { name: 'tools.enhancedSearch.name', description: 'tools.enhancedSearch.description' },
  'duckduckgo_text_search': { name: 'tools.duckduckgoTextSearch.name', description: 'tools.duckduckgoTextSearch.description' },
  'duckduckgo_image_search': { name: 'tools.duckduckgoImageSearch.name', description: 'tools.duckduckgoImageSearch.description' },
  'duckduckgo_news_search': { name: 'tools.duckduckgoNewsSearch.name', description: 'tools.duckduckgoNewsSearch.description' },
  'duckduckgo_video_search': { name: 'tools.duckduckgoVideoSearch.name', description: 'tools.duckduckgoVideoSearch.description' },
  'wikipedia_search': { name: 'tools.wikipediaSearch.name', description: 'tools.wikipediaSearch.description' },
  'wikipedia_random': { name: 'tools.wikipediaRandom.name', description: 'tools.wikipediaRandom.description' },
  'get_market_quote': { name: 'tools.getMarketQuote.name', description: 'tools.getMarketQuote.description' },
  'search_market_symbol': { name: 'tools.searchMarketSymbol.name', description: 'tools.searchMarketSymbol.description' },
  'get_stock_hot_rank': { name: 'tools.getStockHotRank.name', description: 'tools.getStockHotRank.description' },
  'get_industry_board': { name: 'tools.getIndustryBoard.name', description: 'tools.getIndustryBoard.description' },
  'get_concept_board': { name: 'tools.getConceptBoard.name', description: 'tools.getConceptBoard.description' },
  'get_board_stocks': { name: 'tools.getBoardStocks.name', description: 'tools.getBoardStocks.description' },
  'get_limit_board': { name: 'tools.getLimitBoard.name', description: 'tools.getLimitBoard.description' },
  'get_hot_up_rank': { name: 'tools.getHotUpRank.name', description: 'tools.getHotUpRank.description' },
  'get_market_money_flow': { name: 'tools.getMarketMoneyFlow.name', description: 'tools.getMarketMoneyFlow.description' },
  'get_dragon_tiger_list': { name: 'tools.getDragonTigerList.name', description: 'tools.getDragonTigerList.description' },
  'get_new_stock_info': { name: 'tools.getNewStockInfo.name', description: 'tools.getNewStockInfo.description' },
  'get_market_overview': { name: 'tools.getMarketOverview.name', description: 'tools.getMarketOverview.description' },
  'get_movie_boxoffice_realtime': { name: 'tools.getMovieBoxOfficeRealtime.name', description: 'tools.getMovieBoxOfficeRealtime.description' },
  'get_movie_boxoffice_daily': { name: 'tools.getMovieBoxOfficeDaily.name', description: 'tools.getMovieBoxOfficeDaily.description' },
  'get_tv_show_ranking': { name: 'tools.getTVShowRanking.name', description: 'tools.getTVShowRanking.description' },
  'get_variety_show_ranking': { name: 'tools.getVarietyShowRanking.name', description: 'tools.getVarietyShowRanking.description' },
  'get_artist_business_value': { name: 'tools.getArtistBusinessValue.name', description: 'tools.getArtistBusinessValue.description' },
  'get_artist_online_value': { name: 'tools.getArtistOnlineValue.name', description: 'tools.getArtistOnlineValue.description' },
  'get_weather_daily': { name: 'tools.getWeatherDaily.name', description: 'tools.getWeatherDaily.description' },
  'get_air_quality_hist': { name: 'tools.getAirQualityHist.name', description: 'tools.getAirQualityHist.description' },
  'get_air_quality_rank': { name: 'tools.getAirQualityRank.name', description: 'tools.getAirQualityRank.description' },
  'get_air_city_list': { name: 'tools.getAirCityList.name', description: 'tools.getAirCityList.description' },
  'get_hog_price_province_rank': { name: 'tools.getHogPriceProvinceRank.name', description: 'tools.getHogPriceProvinceRank.description' },
  'get_hog_price_trend': { name: 'tools.getHogPriceTrend.name', description: 'tools.getHogPriceTrend.description' },
  'get_hog_lean_price': { name: 'tools.getHogLeanPrice.name', description: 'tools.getHogLeanPrice.description' },
  'get_corn_price': { name: 'tools.getCornPrice.name', description: 'tools.getCornPrice.description' },
  'get_soybean_meal_price': { name: 'tools.getSoybeanMealPrice.name', description: 'tools.getSoybeanMealPrice.description' },
  'get_feed_cost_index': { name: 'tools.getFeedCostIndex.name', description: 'tools.getFeedCostIndex.description' },
  // Futures market tools
  'get_futures_realtime': { name: 'tools.getFuturesRealtime.name', description: 'tools.getFuturesRealtime.description' },
  'get_futures_main_contract': { name: 'tools.getFuturesMainContract.name', description: 'tools.getFuturesMainContract.description' },
  'get_futures_position_rank': { name: 'tools.getFuturesPositionRank.name', description: 'tools.getFuturesPositionRank.description' },
  'get_futures_warehouse_receipt': { name: 'tools.getFuturesWarehouseReceipt.name', description: 'tools.getFuturesWarehouseReceipt.description' },
  'get_futures_inventory': { name: 'tools.getFuturesInventory.name', description: 'tools.getFuturesInventory.description' },
  // Futures advanced tools
  'get_futures_position_rank_sum': { name: 'tools.getFuturesPositionRankSum.name', description: 'tools.getFuturesPositionRankSum.description' },
  'get_futures_warehouse_receipt_data': { name: 'tools.getFuturesWarehouseReceiptData.name', description: 'tools.getFuturesWarehouseReceiptData.description' },
  'get_cffex_daily': { name: 'tools.getCFFEXDaily.name', description: 'tools.getCFFEXDaily.description' },
  'get_czce_daily': { name: 'tools.getCZCEDaily.name', description: 'tools.getCZCEDaily.description' },
  'get_dce_daily': { name: 'tools.getDCEDaily.name', description: 'tools.getDCEDaily.description' },
  'get_shfe_daily': { name: 'tools.getSHFEDaily.name', description: 'tools.getSHFEDaily.description' },
  'get_ine_daily': { name: 'tools.getINEDaily.name', description: 'tools.getINEDaily.description' },
  'get_futures_inventory_em': { name: 'tools.getFuturesInventoryEM.name', description: 'tools.getFuturesInventoryEM.description' },
  'get_dce_commodity_option_hist': { name: 'tools.getDCECommodityOptionHist.name', description: 'tools.getDCECommodityOptionHist.description' },
  'get_czce_commodity_option_hist': { name: 'tools.getCZCECommodityOptionHist.name', description: 'tools.getCZCECommodityOptionHist.description' },
  'get_shfe_commodity_option_hist': { name: 'tools.getSHFECommodityOptionHist.name', description: 'tools.getSHFECommodityOptionHist.description' },
  'get_gfex_commodity_option_hist': { name: 'tools.getGFEXCommodityOptionHist.name', description: 'tools.getGFEXCommodityOptionHist.description' },
  // Bond market tools
  'get_bond_realtime': { name: 'tools.getBondRealtime.name', description: 'tools.getBondRealtime.description' },
  'get_convertible_bond': { name: 'tools.getConvertibleBond.name', description: 'tools.getConvertibleBond.description' },
  'get_treasury_yield_curve': { name: 'tools.getTreasuryYieldCurve.name', description: 'tools.getTreasuryYieldCurve.description' },
  'get_corporate_bond': { name: 'tools.getCorporateBond.name', description: 'tools.getCorporateBond.description' },
  'get_bond_ytm': { name: 'tools.getBondYTM.name', description: 'tools.getBondYTM.description' },
  'get_china_us_treasury_spread': { name: 'tools.getChinaUSTreasurySpread.name', description: 'tools.getChinaUSTreasurySpread.description' },
  // Bond advanced tools
  'get_bond_market_quote': { name: 'tools.getBondMarketQuote.name', description: 'tools.getBondMarketQuote.description' },
  'get_bond_market_trade': { name: 'tools.getBondMarketTrade.name', description: 'tools.getBondMarketTrade.description' },
  'get_treasury_bond_issue': { name: 'tools.getTreasuryBondIssue.name', description: 'tools.getTreasuryBondIssue.description' },
  'get_corporate_bond_issue': { name: 'tools.getCorporateBondIssue.name', description: 'tools.getCorporateBondIssue.description' },
  'get_local_gov_bond_issue': { name: 'tools.getLocalGovBondIssue.name', description: 'tools.getLocalGovBondIssue.description' },
  'get_convertible_bond_value_analysis': { name: 'tools.getConvertibleBondValueAnalysis.name', description: 'tools.getConvertibleBondValueAnalysis.description' },
  'get_convertible_bond_premium_analysis': { name: 'tools.getConvertibleBondPremiumAnalysis.name', description: 'tools.getConvertibleBondPremiumAnalysis.description' },
  'get_china_bond_yield_curve': { name: 'tools.getChinaBondYieldCurve.name', description: 'tools.getChinaBondYieldCurve.description' },
  'get_sse_pledge_repo': { name: 'tools.getSSEPledgeRepo.name', description: 'tools.getSSEPledgeRepo.description' },
  'get_szse_pledge_repo': { name: 'tools.getSZSEPledgeRepo.name', description: 'tools.getSZSEPledgeRepo.description' },
  // Options market tools
  'get_sse50_option': { name: 'tools.getSSE50Option.name', description: 'tools.getSSE50Option.description' },
  'get_csi300_option': { name: 'tools.getCSI300Option.name', description: 'tools.getCSI300Option.description' },
  'get_csi1000_option': { name: 'tools.getCSI1000Option.name', description: 'tools.getCSI1000Option.description' },
  'get_option_t_quotes': { name: 'tools.getOptionTQuotes.name', description: 'tools.getOptionTQuotes.description' },
  'get_option_iv': { name: 'tools.getOptionIV.name', description: 'tools.getOptionIV.description' },
  'get_option_greeks': { name: 'tools.getOptionGreeks.name', description: 'tools.getOptionGreeks.description' },
  // Options advanced tools
  'get_option_greeks_detail': { name: 'tools.getOptionGreeksDetail.name', description: 'tools.getOptionGreeksDetail.description' },
  'get_option_minute_data': { name: 'tools.getOptionMinuteData.name', description: 'tools.getOptionMinuteData.description' },
  'get_option_volatility_surface': { name: 'tools.getOptionVolatilitySurface.name', description: 'tools.getOptionVolatilitySurface.description' },
  'get_option_risk_metrics': { name: 'tools.getOptionRiskMetrics.name', description: 'tools.getOptionRiskMetrics.description' },
  'get_option_value_analysis': { name: 'tools.getOptionValueAnalysis.name', description: 'tools.getOptionValueAnalysis.description' },
  'get_china_vix': { name: 'tools.getChinaVIX.name', description: 'tools.getChinaVIX.description' },
  'get_option_leaderboard': { name: 'tools.getOptionLeaderboard.name', description: 'tools.getOptionLeaderboard.description' },
  'get_option_pcr': { name: 'tools.getOptionPCR.name', description: 'tools.getOptionPCR.description' },
  'get_option_arbitrage': { name: 'tools.getOptionArbitrage.name', description: 'tools.getOptionArbitrage.description' },
  'get_option_moneyness': { name: 'tools.getOptionMoneyness.name', description: 'tools.getOptionMoneyness.description' },
  'get_option_volatility_comparison': { name: 'tools.getOptionVolatilityComparison.name', description: 'tools.getOptionVolatilityComparison.description' },
  'get_option_turnover_rank': { name: 'tools.getOptionTurnoverRank.name', description: 'tools.getOptionTurnoverRank.description' },
  // Fund market tools
  'get_open_fund': { name: 'tools.getOpenFund.name', description: 'tools.getOpenFund.description' },
  'get_etf_fund': { name: 'tools.getETFFund.name', description: 'tools.getETFFund.description' },
  'get_fund_ranking': { name: 'tools.getFundRanking.name', description: 'tools.getFundRanking.description' },
  'get_fund_nav_history': { name: 'tools.getFundNAVHistory.name', description: 'tools.getFundNAVHistory.description' },
  'get_fund_holdings': { name: 'tools.getFundHoldings.name', description: 'tools.getFundHoldings.description' },
  'get_fund_manager': { name: 'tools.getFundManager.name', description: 'tools.getFundManager.description' },
  // Fund advanced tools
  'get_open_fund_ranking': { name: 'tools.getOpenFundRanking.name', description: 'tools.getOpenFundRanking.description' },
  'get_exchange_fund_ranking': { name: 'tools.getExchangeFundRanking.name', description: 'tools.getExchangeFundRanking.description' },
  'get_money_fund_ranking': { name: 'tools.getMoneyFundRanking.name', description: 'tools.getMoneyFundRanking.description' },
  'get_fund_manager_info': { name: 'tools.getFundManagerInfo.name', description: 'tools.getFundManagerInfo.description' },
  'get_fund_rating': { name: 'tools.getFundRating.name', description: 'tools.getFundRating.description' },
  'get_fund_stock_holdings': { name: 'tools.getFundStockHoldings.name', description: 'tools.getFundStockHoldings.description' },
  'get_fund_bond_holdings': { name: 'tools.getFundBondHoldings.name', description: 'tools.getFundBondHoldings.description' },
  'get_fund_scale_change': { name: 'tools.getFundScaleChange.name', description: 'tools.getFundScaleChange.description' },
  'get_fund_holder_structure': { name: 'tools.getFundHolderStructure.name', description: 'tools.getFundHolderStructure.description' },
  'get_fund_dividend_ranking': { name: 'tools.getFundDividendRanking.name', description: 'tools.getFundDividendRanking.description' },
  'get_fund_dividend_detail': { name: 'tools.getFundDividendDetail.name', description: 'tools.getFundDividendDetail.description' },
  'get_qdii_exchange_rate_index': { name: 'tools.getQDIIExchangeRateIndex.name', description: 'tools.getQDIIExchangeRateIndex.description' },
  'get_qdii_allocation_index': { name: 'tools.getQDIIAllocationIndex.name', description: 'tools.getQDIIAllocationIndex.description' },

  // Stock depth data tools
  'get_margin_trading': { name: 'tools.getMarginTrading.name', description: 'tools.getMarginTrading.description' },
  'get_block_trade': { name: 'tools.getBlockTrade.name', description: 'tools.getBlockTrade.description' },
  'get_dividend': { name: 'tools.getDividend.name', description: 'tools.getDividend.description' },
  'get_shareholder_change': { name: 'tools.getShareholderChange.name', description: 'tools.getShareholderChange.description' },
  'get_restricted_share_unlock': { name: 'tools.getRestrictedShareUnlock.name', description: 'tools.getRestrictedShareUnlock.description' },
  'get_share_buyback': { name: 'tools.getShareBuyback.name', description: 'tools.getShareBuyback.description' },
  'get_ipo_subscription': { name: 'tools.getIPOSubscription.name', description: 'tools.getIPOSubscription.description' },
  // Stock market data tools
  'get_stock_a_share_spot': { name: 'tools.getStockAShareSpot.name', description: 'tools.getStockAShareSpot.description' },
  'get_stock_a_share_hist': { name: 'tools.getStockAShareHist.name', description: 'tools.getStockAShareHist.description' },
  'get_stock_hk_spot': { name: 'tools.getStockHKSpot.name', description: 'tools.getStockHKSpot.description' },
  'get_stock_us_spot': { name: 'tools.getStockUSSpot.name', description: 'tools.getStockUSSpot.description' },
  'get_stock_minute_data': { name: 'tools.getStockMinuteData.name', description: 'tools.getStockMinuteData.description' },
  // Stock sector tools
  'get_industry_sector_spot': { name: 'tools.getIndustrySectorSpot.name', description: 'tools.getIndustrySectorSpot.description' },
  'get_concept_board_spot': { name: 'tools.getConceptBoardSpot.name', description: 'tools.getConceptBoardSpot.description' },
  'get_sector_constituents': { name: 'tools.getSectorConstituents.name', description: 'tools.getSectorConstituents.description' },
  'get_sector_hist': { name: 'tools.getSectorHist.name', description: 'tools.getSectorHist.description' },
  // Stock fund flow tools
  'get_individual_fund_flow': { name: 'tools.getIndividualFundFlow.name', description: 'tools.getIndividualFundFlow.description' },
  'get_stock_fund_flow_rank': { name: 'tools.getStockFundFlowRank.name', description: 'tools.getStockFundFlowRank.description' },
  'get_sector_fund_flow_rank': { name: 'tools.getSectorFundFlowRank.name', description: 'tools.getSectorFundFlowRank.description' },
  'get_market_fund_flow': { name: 'tools.getMarketFundFlow.name', description: 'tools.getMarketFundFlow.description' },
  // Stock special data tools
  'get_dragon_tiger_list_detail': { name: 'tools.getDragonTigerListDetail.name', description: 'tools.getDragonTigerListDetail.description' },
  'get_limit_up_pool': { name: 'tools.getLimitUpPool.name', description: 'tools.getLimitUpPool.description' },
  'get_limit_down_pool': { name: 'tools.getLimitDownPool.name', description: 'tools.getLimitDownPool.description' },
  'get_ipo_subscription_data': { name: 'tools.getIPOSubscriptionData.name', description: 'tools.getIPOSubscriptionData.description' },
  'get_block_trade_details': { name: 'tools.getBlockTradeDetails.name', description: 'tools.getBlockTradeDetails.description' },
  // Stock financial tools
  'get_financial_summary': { name: 'tools.getFinancialSummary.name', description: 'tools.getFinancialSummary.description' },
  'get_performance_forecast': { name: 'tools.getPerformanceForecast.name', description: 'tools.getPerformanceForecast.description' },
  'get_performance_express': { name: 'tools.getPerformanceExpress.name', description: 'tools.getPerformanceExpress.description' },
  'get_financial_statements': { name: 'tools.getFinancialStatements.name', description: 'tools.getFinancialStatements.description' },

  // Forex tools
  'get_fx_spot_quote': { name: 'tools.getFXSpotQuote.name', description: 'tools.getFXSpotQuote.description' },
  'get_realtime_exchange_rate': { name: 'tools.getRealTimeExchangeRate.name', description: 'tools.getRealTimeExchangeRate.description' },
  // Margin trading tools
  'get_margin_trading_summary_sse': { name: 'tools.getMarginTradingSummarySSE.name', description: 'tools.getMarginTradingSummarySSE.description' },
  'get_margin_trading_detail': { name: 'tools.getMarginTradingDetail.name', description: 'tools.getMarginTradingDetail.description' },
  // HSGT tools
  'get_hsgt_holdings': { name: 'tools.getHSGTHoldings.name', description: 'tools.getHSGTHoldings.description' },
  'get_hsgt_fund_flow': { name: 'tools.getHSGTFundFlow.name', description: 'tools.getHSGTFundFlow.description' },
  // Crypto tools
  'get_crypto_spot': { name: 'tools.getCryptoSpot.name', description: 'tools.getCryptoSpot.description' },
  // Auto tools
  'get_car_sales_ranking': { name: 'tools.getCarSalesRanking.name', description: 'tools.getCarSalesRanking.description' },
  'get_nev_sales': { name: 'tools.getNEVSales.name', description: 'tools.getNEVSales.description' },
  // IPO data tools
  'get_ipo_subscription_list': { name: 'tools.getIPOSubscriptionList.name', description: 'tools.getIPOSubscriptionList.description' },
  'get_ipo_audit_kcb': { name: 'tools.getIPOAuditKCB.name', description: 'tools.getIPOAuditKCB.description' },
  'get_ipo_audit_cyb': { name: 'tools.getIPOAuditCYB.name', description: 'tools.getIPOAuditCYB.description' },
  'get_ipo_audit_bj': { name: 'tools.getIPOAuditBJ.name', description: 'tools.getIPOAuditBJ.description' },
  'get_ipo_profit_rate': { name: 'tools.getIPOProfitRate.name', description: 'tools.getIPOProfitRate.description' },
  'get_ipo_benefit_stocks': { name: 'tools.getIPOBenefitStocks.name', description: 'tools.getIPOBenefitStocks.description' },
  'get_new_stock_first_day': { name: 'tools.getNewStockFirstDay.name', description: 'tools.getNewStockFirstDay.description' },
  // Stock depth analysis tools
  'get_shareholder_number': { name: 'tools.getShareholderNumber.name', description: 'tools.getShareholderNumber.description' },
  'get_executive_holding_change': { name: 'tools.getExecutiveHoldingChange.name', description: 'tools.getExecutiveHoldingChange.description' },
  'get_institution_research_stats': { name: 'tools.getInstitutionResearchStats.name', description: 'tools.getInstitutionResearchStats.description' },
  'get_institution_research_detail': { name: 'tools.getInstitutionResearchDetail.name', description: 'tools.getInstitutionResearchDetail.description' },
  'get_equity_pledge_profile': { name: 'tools.getEquityPledgeProfile.name', description: 'tools.getEquityPledgeProfile.description' },
  'get_company_pledge_ratio': { name: 'tools.getCompanyPledgeRatio.name', description: 'tools.getCompanyPledgeRatio.description' },
  'get_pledge_detail': { name: 'tools.getPledgeDetail.name', description: 'tools.getPledgeDetail.description' },
  'get_profit_forecast': { name: 'tools.getProfitForecast.name', description: 'tools.getProfitForecast.description' },
  // Technical stock selection tools
  'get_stock_new_high': { name: 'tools.getStockNewHigh.name', description: 'tools.getStockNewHigh.description' },
  'get_stock_new_low': { name: 'tools.getStockNewLow.name', description: 'tools.getStockNewLow.description' },
  'get_continuous_rise': { name: 'tools.getContinuousRise.name', description: 'tools.getContinuousRise.description' },
  'get_continuous_fall': { name: 'tools.getContinuousFall.name', description: 'tools.getContinuousFall.description' },
  'get_continuous_volume': { name: 'tools.getContinuousVolume.name', description: 'tools.getContinuousVolume.description' },
  'get_continuous_volume_shrink': { name: 'tools.getContinuousVolumeShrink.name', description: 'tools.getContinuousVolumeShrink.description' },
  'get_volume_price_rise': { name: 'tools.getVolumePriceRise.name', description: 'tools.getVolumePriceRise.description' },
  'get_volume_price_fall': { name: 'tools.getVolumePriceFall.name', description: 'tools.getVolumePriceFall.description' },
  'get_market_anomaly': { name: 'tools.getMarketAnomaly.name', description: 'tools.getMarketAnomaly.description' },
  'get_board_anomaly': { name: 'tools.getBoardAnomaly.name', description: 'tools.getBoardAnomaly.description' },
  // News and sentiment tools
  'get_cctv_news': { name: 'tools.getCCTVNews.name', description: 'tools.getCCTVNews.description' },
  'get_financial_news': { name: 'tools.getFinancialNews.name', description: 'tools.getFinancialNews.description' },
  'get_stock_popularity': { name: 'tools.getStockPopularity.name', description: 'tools.getStockPopularity.description' },
  'get_news_sentiment': { name: 'tools.getNewsSentiment.name', description: 'tools.getNewsSentiment.description' },
  'get_weibo_sentiment': { name: 'tools.getWeiboSentiment.name', description: 'tools.getWeiboSentiment.description' },
  'get_economic_calendar': { name: 'tools.getEconomicCalendar.name', description: 'tools.getEconomicCalendar.description' },
  'get_research_reports': { name: 'tools.getResearchReports.name', description: 'tools.getResearchReports.description' },
  // Futures detailed data tools
  'get_futures_holding_rank_detail': { name: 'tools.getFuturesHoldingRankDetail.name', description: 'tools.getFuturesHoldingRankDetail.description' },
  'get_warehouse_receipt_detail': { name: 'tools.getWarehouseReceiptDetail.name', description: 'tools.getWarehouseReceiptDetail.description' },
  'get_futures_roll_yield': { name: 'tools.getFuturesRollYield.name', description: 'tools.getFuturesRollYield.description' },
  'get_futures_spot_price': { name: 'tools.getFuturesSpotPrice.name', description: 'tools.getFuturesSpotPrice.description' },
  'get_commodity_inventory': { name: 'tools.getCommodityInventory.name', description: 'tools.getCommodityInventory.description' },
  // Macro economic data tools (detailed)
  'get_china_social_financing': { name: 'tools.getChinaSocialFinancing.name', description: 'tools.getChinaSocialFinancing.description' },
  'get_china_reserve_ratio': { name: 'tools.getChinaReserveRatio.name', description: 'tools.getChinaReserveRatio.description' },
  'get_china_industrial_value_added': { name: 'tools.getChinaIndustrialValueAdded.name', description: 'tools.getChinaIndustrialValueAdded.description' },
  'get_us_non_farm_payroll': { name: 'tools.getUSNonFarmPayroll.name', description: 'tools.getUSNonFarmPayroll.description' },
  'get_us_adp_employment': { name: 'tools.getUSADPEmployment.name', description: 'tools.getUSADPEmployment.description' },
  'get_us_cpi': { name: 'tools.getUSCPI.name', description: 'tools.getUSCPI.description' },
  'get_us_ppi': { name: 'tools.getUSPPI.name', description: 'tools.getUSPPI.description' },
  'get_us_pmi': { name: 'tools.getUSPMI.name', description: 'tools.getUSPMI.description' },
  'get_us_retail_sales': { name: 'tools.getUSRetailSales.name', description: 'tools.getUSRetailSales.description' },
  'get_us_initial_jobless': { name: 'tools.getUSInitialJobless.name', description: 'tools.getUSInitialJobless.description' },
  'get_us_eia_crude': { name: 'tools.getUSEIACrude.name', description: 'tools.getUSEIACrude.description' },
  'get_us_api_crude': { name: 'tools.getUSAPICrude.name', description: 'tools.getUSAPICrude.description' },
  // Commodity futures tools
  'get_metal_futures_spreads': { name: 'tools.getMetalFuturesSpreads.name', description: 'tools.getMetalFuturesSpreads.description' },
  'get_energy_futures_spreads': { name: 'tools.getEnergyFuturesSpreads.name', description: 'tools.getEnergyFuturesSpreads.description' },
  'get_agricultural_futures_basis': { name: 'tools.getAgriculturalFuturesBasis.name', description: 'tools.getAgriculturalFuturesBasis.description' },
  'get_cot_reports': { name: 'tools.getCOTReports.name', description: 'tools.getCOTReports.description' },
  'get_warehouse_stocks_by_location': { name: 'tools.getWarehouseStocksByLocation.name', description: 'tools.getWarehouseStocksByLocation.description' },
  'get_freight_rates': { name: 'tools.getFreightRates.name', description: 'tools.getFreightRates.description' },
  'get_commodity_seasonality': { name: 'tools.getCommoditySeasonality.name', description: 'tools.getCommoditySeasonality.description' },
  'get_commodity_production_costs': { name: 'tools.getCommodityProductionCosts.name', description: 'tools.getCommodityProductionCosts.description' },
  'get_futures_term_structure': { name: 'tools.getFuturesTermStructure.name', description: 'tools.getFuturesTermStructure.description' },
  'get_commodity_trade_flows': { name: 'tools.getCommodityTradeFlows.name', description: 'tools.getCommodityTradeFlows.description' },
  'get_commodity_supply_demand': { name: 'tools.getCommoditySupplyDemand.name', description: 'tools.getCommoditySupplyDemand.description' },
  'get_refinery_margins': { name: 'tools.getRefineryMargins.name', description: 'tools.getRefineryMargins.description' },
  'get_commodity_weather_impact': { name: 'tools.getCommodityWeatherImpact.name', description: 'tools.getCommodityWeatherImpact.description' },
  'get_commodity_correlation': { name: 'tools.getCommodityCorrelation.name', description: 'tools.getCommodityCorrelation.description' },
  'get_futures_open_interest_analysis': { name: 'tools.getFuturesOpenInterestAnalysis.name', description: 'tools.getFuturesOpenInterestAnalysis.description' },
  'get_commodity_index_tracking': { name: 'tools.getCommodityIndexTracking.name', description: 'tools.getCommodityIndexTracking.description' },
  'get_futures_volume_analysis': { name: 'tools.getFuturesVolumeAnalysis.name', description: 'tools.getFuturesVolumeAnalysis.description' },
  'get_commodity_arbitrage_opportunities': { name: 'tools.getCommodityArbitrageOpportunities.name', description: 'tools.getCommodityArbitrageOpportunities.description' },
  'get_futures_rollover_analysis': { name: 'tools.getFuturesRolloverAnalysis.name', description: 'tools.getFuturesRolloverAnalysis.description' },
  'get_commodity_market_depth': { name: 'tools.getCommodityMarketDepth.name', description: 'tools.getCommodityMarketDepth.description' },
  // Derivatives tools
  'get_interest_rate_swap_rates': { name: 'tools.getInterestRateSwapRates.name', description: 'tools.getInterestRateSwapRates.description' },
  'get_equity_index_derivatives': { name: 'tools.getEquityIndexDerivatives.name', description: 'tools.getEquityIndexDerivatives.description' },
  'get_volatility_surface_analysis': { name: 'tools.getVolatilitySurfaceAnalysis.name', description: 'tools.getVolatilitySurfaceAnalysis.description' },
  'get_option_strategy_analysis': { name: 'tools.getOptionStrategyAnalysis.name', description: 'tools.getOptionStrategyAnalysis.description' },
  'get_swaption_data': { name: 'tools.getSwaptionData.name', description: 'tools.getSwaptionData.description' },
  'get_variance_swap_rates': { name: 'tools.getVarianceSwapRates.name', description: 'tools.getVarianceSwapRates.description' },
  'get_exotic_options_data': { name: 'tools.getExoticOptionsData.name', description: 'tools.getExoticOptionsData.description' },
  'get_cds_spreads': { name: 'tools.getCDSSpreads.name', description: 'tools.getCDSSpreads.description' },
  'get_forward_rate_agreements': { name: 'tools.getForwardRateAgreements.name', description: 'tools.getForwardRateAgreements.description' },
  'get_interest_rate_cap_floor': { name: 'tools.getInterestRateCapFloor.name', description: 'tools.getInterestRateCapFloor.description' },
  'get_equity_derivatives_oi_distribution': { name: 'tools.getEquityDerivativesOIDistribution.name', description: 'tools.getEquityDerivativesOIDistribution.description' },
  'get_volatility_arbitrage_signals': { name: 'tools.getVolatilityArbitrageSignals.name', description: 'tools.getVolatilityArbitrageSignals.description' },
  'get_dividend_swap_rates': { name: 'tools.getDividendSwapRates.name', description: 'tools.getDividendSwapRates.description' },
  'get_correlation_swap_quotes': { name: 'tools.getCorrelationSwapQuotes.name', description: 'tools.getCorrelationSwapQuotes.description' },
  'get_equity_dispersion_trading': { name: 'tools.getEquityDispersionTrading.name', description: 'tools.getEquityDispersionTrading.description' },
  'get_option_implied_correlation': { name: 'tools.getOptionImpliedCorrelation.name', description: 'tools.getOptionImpliedCorrelation.description' },
  'get_cross_currency_basis_swaps': { name: 'tools.getCrossCurrencyBasisSwaps.name', description: 'tools.getCrossCurrencyBasisSwaps.description' },
  'get_total_return_swaps': { name: 'tools.getTotalReturnSwaps.name', description: 'tools.getTotalReturnSwaps.description' },
  // Risk management tools
  'get_value_at_risk': { name: 'tools.getValueAtRisk.name', description: 'tools.getValueAtRisk.description' },
  'get_stress_testing_results': { name: 'tools.getStressTestingResults.name', description: 'tools.getStressTestingResults.description' },
  'get_scenario_analysis': { name: 'tools.getScenarioAnalysis.name', description: 'tools.getScenarioAnalysis.description' },
  'get_portfolio_risk_attribution': { name: 'tools.getPortfolioRiskAttribution.name', description: 'tools.getPortfolioRiskAttribution.description' },
  'get_credit_risk_metrics': { name: 'tools.getCreditRiskMetrics.name', description: 'tools.getCreditRiskMetrics.description' },
  'get_liquidity_risk_indicators': { name: 'tools.getLiquidityRiskIndicators.name', description: 'tools.getLiquidityRiskIndicators.description' },
  'get_operational_risk_indicators': { name: 'tools.getOperationalRiskIndicators.name', description: 'tools.getOperationalRiskIndicators.description' },
  'get_margin_requirements': { name: 'tools.getMarginRequirements.name', description: 'tools.getMarginRequirements.description' },
  'get_counterparty_exposure': { name: 'tools.getCounterpartyExposure.name', description: 'tools.getCounterpartyExposure.description' },
  'get_concentration_risk_analysis': { name: 'tools.getConcentrationRiskAnalysis.name', description: 'tools.getConcentrationRiskAnalysis.description' },
  'get_tail_risk_indicators': { name: 'tools.getTailRiskIndicators.name', description: 'tools.getTailRiskIndicators.description' },
  'get_risk_limit_monitoring': { name: 'tools.getRiskLimitMonitoring.name', description: 'tools.getRiskLimitMonitoring.description' },
  // ESG data tools
  'get_esg_ratings': { name: 'tools.getESGRatings.name', description: 'tools.getESGRatings.description' },
  'get_carbon_emissions_data': { name: 'tools.getCarbonEmissionsData.name', description: 'tools.getCarbonEmissionsData.description' },
  'get_green_bond_data': { name: 'tools.getGreenBondData.name', description: 'tools.getGreenBondData.description' },
  'get_esg_controversy_scores': { name: 'tools.getESGControversyScores.name', description: 'tools.getESGControversyScores.description' },
  'get_climate_risk_assessment': { name: 'tools.getClimateRiskAssessment.name', description: 'tools.getClimateRiskAssessment.description' },
  'get_sustainability_reports': { name: 'tools.getSustainabilityReports.name', description: 'tools.getSustainabilityReports.description' },
  'get_water_usage_data': { name: 'tools.getWaterUsageData.name', description: 'tools.getWaterUsageData.description' },
  'get_renewable_energy_usage': { name: 'tools.getRenewableEnergyUsage.name', description: 'tools.getRenewableEnergyUsage.description' },
  'get_waste_management_metrics': { name: 'tools.getWasteManagementMetrics.name', description: 'tools.getWasteManagementMetrics.description' },
  'get_supply_chain_esg_metrics': { name: 'tools.getSupplyChainESGMetrics.name', description: 'tools.getSupplyChainESGMetrics.description' },
  'get_board_diversity_metrics': { name: 'tools.getBoardDiversityMetrics.name', description: 'tools.getBoardDiversityMetrics.description' },
  'get_employee_satisfaction_metrics': { name: 'tools.getEmployeeSatisfactionMetrics.name', description: 'tools.getEmployeeSatisfactionMetrics.description' },
  'get_esg_fund_screening': { name: 'tools.getESGFundScreening.name', description: 'tools.getESGFundScreening.description' },
  'get_green_finance_stats': { name: 'tools.getGreenFinanceStats.name', description: 'tools.getGreenFinanceStats.description' },
  'get_carbon_credit_prices': { name: 'tools.getCarbonCreditPrices.name', description: 'tools.getCarbonCreditPrices.description' },
  'get_esg_disclosure_quality': { name: 'tools.getESGDisclosureQuality.name', description: 'tools.getESGDisclosureQuality.description' },
  'get_social_responsibility_metrics': { name: 'tools.getSocialResponsibilityMetrics.name', description: 'tools.getSocialResponsibilityMetrics.description' },
  'get_governance_quality_metrics': { name: 'tools.getGovernanceQualityMetrics.name', description: 'tools.getGovernanceQualityMetrics.description' },
  // Market microstructure tools
  'get_order_book_depth': { name: 'tools.getOrderBookDepth.name', description: 'tools.getOrderBookDepth.description' },
  'get_microstructure_market_maker_depth': { name: 'tools.getMicrostructureMarketMakerDepth.name', description: 'tools.getMicrostructureMarketMakerDepth.description' },
  'get_tick_by_tick_data': { name: 'tools.getTickByTickData.name', description: 'tools.getTickByTickData.description' },
  'get_trade_execution_quality': { name: 'tools.getTradeExecutionQuality.name', description: 'tools.getTradeExecutionQuality.description' },
  'get_slippage_analysis': { name: 'tools.getSlippageAnalysis.name', description: 'tools.getSlippageAnalysis.description' },
  'get_market_impact_analysis': { name: 'tools.getMarketImpactAnalysis.name', description: 'tools.getMarketImpactAnalysis.description' },
  'get_vwap_twap_benchmarks': { name: 'tools.getVWAPTWAPBenchmarks.name', description: 'tools.getVWAPTWAPBenchmarks.description' },
  'get_limit_order_book_analysis': { name: 'tools.getLimitOrderBookAnalysis.name', description: 'tools.getLimitOrderBookAnalysis.description' },
  'get_quote_stuffing_detection': { name: 'tools.getQuoteStuffingDetection.name', description: 'tools.getQuoteStuffingDetection.description' },
  'get_hft_activity_indicators': { name: 'tools.getHFTActivityIndicators.name', description: 'tools.getHFTActivityIndicators.description' },
  'get_dark_pool_volume': { name: 'tools.getDarkPoolVolume.name', description: 'tools.getDarkPoolVolume.description' },
  'get_auction_imbalance_indicators': { name: 'tools.getAuctionImbalanceIndicators.name', description: 'tools.getAuctionImbalanceIndicators.description' },
  'get_block_trade_analysis': { name: 'tools.getBlockTradeAnalysis.name', description: 'tools.getBlockTradeAnalysis.description' },
  'get_order_flow_imbalance': { name: 'tools.getOrderFlowImbalance.name', description: 'tools.getOrderFlowImbalance.description' },
  'get_bid_ask_bounce_analysis': { name: 'tools.getBidAskBounceAnalysis.name', description: 'tools.getBidAskBounceAnalysis.description' },
  'get_trade_classification': { name: 'tools.getTradeClassification.name', description: 'tools.getTradeClassification.description' },
  // Credit analysis tools
  'get_credit_ratings_history': { name: 'tools.getCreditRatingsHistory.name', description: 'tools.getCreditRatingsHistory.description' },
  'get_rating_transition_matrix': { name: 'tools.getRatingTransitionMatrix.name', description: 'tools.getRatingTransitionMatrix.description' },
  'get_default_probability': { name: 'tools.getDefaultProbability.name', description: 'tools.getDefaultProbability.description' },
  'get_credit_spread_analysis': { name: 'tools.getCreditSpreadAnalysis.name', description: 'tools.getCreditSpreadAnalysis.description' },
  'get_recovery_rates': { name: 'tools.getRecoveryRates.name', description: 'tools.getRecoveryRates.description' },
  'get_covenant_analysis': { name: 'tools.getCovenantAnalysis.name', description: 'tools.getCovenantAnalysis.description' },
  'get_debt_structure_analysis': { name: 'tools.getDebtStructureAnalysis.name', description: 'tools.getDebtStructureAnalysis.description' },
  'get_credit_event_history': { name: 'tools.getCreditEventHistory.name', description: 'tools.getCreditEventHistory.description' },
  'get_bankruptcy_prediction': { name: 'tools.getBankruptcyPrediction.name', description: 'tools.getBankruptcyPrediction.description' },
  'get_distressed_debt_analysis': { name: 'tools.getDistressedDebtAnalysis.name', description: 'tools.getDistressedDebtAnalysis.description' },
  'get_credit_portfolio_analytics': { name: 'tools.getCreditPortfolioAnalytics.name', description: 'tools.getCreditPortfolioAnalytics.description' },
  'get_counterparty_credit_risk': { name: 'tools.getCounterpartyCreditRisk.name', description: 'tools.getCounterpartyCreditRisk.description' },
  'get_sovereign_credit_analysis': { name: 'tools.getSovereignCreditAnalysis.name', description: 'tools.getSovereignCreditAnalysis.description' },
  'get_corporate_bond_analytics': { name: 'tools.getCorporateBondAnalytics.name', description: 'tools.getCorporateBondAnalytics.description' },
  'get_credit_cycle_indicators': { name: 'tools.getCreditCycleIndicators.name', description: 'tools.getCreditCycleIndicators.description' },
  'get_debt_capacity_analysis': { name: 'tools.getDebtCapacityAnalysis.name', description: 'tools.getDebtCapacityAnalysis.description' },
  // Batch 9: Stock Popularity & Technical Analysis
  'get_stock_hot_rank_em': { name: 'tools.getStockHotRankEM.name', description: 'tools.getStockHotRankEM.description' },
  'get_stock_hot_up_em': { name: 'tools.getStockHotUpEM.name', description: 'tools.getStockHotUpEM.description' },
  'get_stock_hot_keyword_em': { name: 'tools.getStockHotKeywordEM.name', description: 'tools.getStockHotKeywordEM.description' },
  'get_stock_cyq_em': { name: 'tools.getStockCYQEM.name', description: 'tools.getStockCYQEM.description' },
  'get_stock_intraday_em': { name: 'tools.getStockIntradayEM.name', description: 'tools.getStockIntradayEM.description' },
  'get_stock_intraday_sina': { name: 'tools.getStockIntradaySina.name', description: 'tools.getStockIntradaySina.description' },
  'get_stock_bid_ask_em': { name: 'tools.getStockBidAskEM.name', description: 'tools.getStockBidAskEM.description' },
  'get_stock_changes_em': { name: 'tools.getStockChangesEM.name', description: 'tools.getStockChangesEM.description' },
  'get_stock_board_change_em': { name: 'tools.getStockBoardChangeEM.name', description: 'tools.getStockBoardChangeEM.description' },
  'get_stock_hot_follow_xq': { name: 'tools.getStockHotFollowXQ.name', description: 'tools.getStockHotFollowXQ.description' },
  'get_stock_hot_tweet_xq': { name: 'tools.getStockHotTweetXQ.name', description: 'tools.getStockHotTweetXQ.description' },
  'get_stock_inner_trade_xq': { name: 'tools.getStockInnerTradeXQ.name', description: 'tools.getStockInnerTradeXQ.description' },
  'get_stock_hot_search_baidu': { name: 'tools.getStockHotSearchBaidu.name', description: 'tools.getStockHotSearchBaidu.description' },
  'get_stock_a_ttm_lyr': { name: 'tools.getStockATTMLYR.name', description: 'tools.getStockATTMLYR.description' },
  'get_stock_a_all_pb': { name: 'tools.getStockAAllPB.name', description: 'tools.getStockAAllPB.description' },
  'get_stock_zh_a_gb_jg_em': { name: 'tools.getStockZHAGBJGEM.name', description: 'tools.getStockZHAGBJGEM.description' },
  // Batch 9: Options & Margin Analysis
  'get_option_margin': { name: 'tools.getOptionMargin.name', description: 'tools.getOptionMargin.description' },
  'get_stock_margin_ratio_pa': { name: 'tools.getStockMarginRatioPA.name', description: 'tools.getStockMarginRatioPA.description' },
  'get_option_risk_indicator_sse': { name: 'tools.getOptionRiskIndicatorSSE.name', description: 'tools.getOptionRiskIndicatorSSE.description' },
  'get_option_daily_stats_sse': { name: 'tools.getOptionDailyStatsSSE.name', description: 'tools.getOptionDailyStatsSSE.description' },
  'get_option_daily_stats_szse': { name: 'tools.getOptionDailyStatsSZSE.name', description: 'tools.getOptionDailyStatsSZSE.description' },
  'get_option_comm_info': { name: 'tools.getOptionCommInfo.name', description: 'tools.getOptionCommInfo.description' },
  'get_futures_hold_pos_sina': { name: 'tools.getFuturesHoldPosSina.name', description: 'tools.getFuturesHoldPosSina.description' },
  'get_futures_spot_sys': { name: 'tools.getFuturesSpotSys.name', description: 'tools.getFuturesSpotSys.description' },
  'get_futures_stock_shfe_js': { name: 'tools.getFuturesStockSHFEJS.name', description: 'tools.getFuturesStockSHFEJS.description' },
  'get_stock_zh_a_b_comparison_em': { name: 'tools.getStockZHABComparisonEM.name', description: 'tools.getStockZHABComparisonEM.description' },
  'get_stock_margin_account_info': { name: 'tools.getStockMarginAccountInfo.name', description: 'tools.getStockMarginAccountInfo.description' },
  'get_crypto_bitcoin_cme': { name: 'tools.getCryptoBitcoinCME.name', description: 'tools.getCryptoBitcoinCME.description' },
  'get_crypto_bitcoin_hold_report': { name: 'tools.getCryptoBitcoinHoldReport.name', description: 'tools.getCryptoBitcoinHoldReport.description' },
  'get_futures_contract_info_shfe': { name: 'tools.getFuturesContractInfoSHFE.name', description: 'tools.getFuturesContractInfoSHFE.description' },
  // Batch 9: Fund Alternative Data (14 tools - removed 4 invalid API tools)
  'get_fund_scale_open_sina': { name: 'tools.getFundScaleOpenSina.name', description: 'tools.getFundScaleOpenSina.description' },
  'get_fund_fee_em': { name: 'tools.getFundFeeEM.name', description: 'tools.getFundFeeEM.description' },
  'get_stock_hk_profit_forecast': { name: 'tools.getStockHKProfitForecast.name', description: 'tools.getStockHKProfitForecast.description' },
  'get_fund_portfolio_hold_em': { name: 'tools.getFundPortfolioHoldEM.name', description: 'tools.getFundPortfolioHoldEM.description' },
  'get_fund_manager_info_em': { name: 'tools.getFundManagerInfoEM.name', description: 'tools.getFundManagerInfoEM.description' },
  'get_private_fund_rank': { name: 'tools.getPrivateFundRank.name', description: 'tools.getPrivateFundRank.description' },
  'get_fund_manager_change': { name: 'tools.getFundManagerChange.name', description: 'tools.getFundManagerChange.description' },
  'get_etf_real_time_premium': { name: 'tools.getETFRealTimePremium.name', description: 'tools.getETFRealTimePremium.description' },
  'get_lof_real_time_premium': { name: 'tools.getLOFRealTimePremium.name', description: 'tools.getLOFRealTimePremium.description' },
  'get_bond_convert_premium': { name: 'tools.getBondConvertPremium.name', description: 'tools.getBondConvertPremium.description' },
  'get_bond_call_redeem_warning': { name: 'tools.getBondCallRedeemWarning.name', description: 'tools.getBondCallRedeemWarning.description' },
  'get_fund_share_change': { name: 'tools.getFundShareChange.name', description: 'tools.getFundShareChange.description' },
  'get_fund_purchase_redeem': { name: 'tools.getFundPurchaseRedeem.name', description: 'tools.getFundPurchaseRedeem.description' },
  'get_fund_open_rank_em': { name: 'tools.getFundOpenRankEM.name', description: 'tools.getFundOpenRankEM.description' },
  // Financial depth analysis tools (246 additional tools)
  'get_income_statement_detail': { name: 'tools.getIncomeStatementDetail.name', description: 'tools.getIncomeStatementDetail.description' },
  'get_balance_sheet_detail': { name: 'tools.getBalanceSheetDetail.name', description: 'tools.getBalanceSheetDetail.description' },
  'get_cash_flow_detail': { name: 'tools.getCashFlowDetail.name', description: 'tools.getCashFlowDetail.description' },
  'get_financial_indicators': { name: 'tools.getFinancialIndicators.name', description: 'tools.getFinancialIndicators.description' },
  'get_roe_dupont': { name: 'tools.getRoeDupont.name', description: 'tools.getRoeDupont.description' },
  'get_profitability_metrics': { name: 'tools.getProfitabilityMetrics.name', description: 'tools.getProfitabilityMetrics.description' },
  'get_operating_efficiency': { name: 'tools.getOperatingEfficiency.name', description: 'tools.getOperatingEfficiency.description' },
  'get_solvency_ratios': { name: 'tools.getSolvencyRatios.name', description: 'tools.getSolvencyRatios.description' },
  'get_growth_metrics': { name: 'tools.getGrowthMetrics.name', description: 'tools.getGrowthMetrics.description' },
  'get_valuation_multiples': { name: 'tools.getValuationMultiples.name', description: 'tools.getValuationMultiples.description' },
  'get_pe_pb_band': { name: 'tools.getPePbBand.name', description: 'tools.getPePbBand.description' },
  'get_dividend_analysis': { name: 'tools.getDividendAnalysis.name', description: 'tools.getDividendAnalysis.description' },
  'get_capital_structure': { name: 'tools.getCapitalStructure.name', description: 'tools.getCapitalStructure.description' },
  'get_working_capital': { name: 'tools.getWorkingCapital.name', description: 'tools.getWorkingCapital.description' },
  'get_free_cash_flow': { name: 'tools.getFreeCashFlow.name', description: 'tools.getFreeCashFlow.description' },
  'get_earnings_quality': { name: 'tools.getEarningsQuality.name', description: 'tools.getEarningsQuality.description' },
  'get_asset_quality': { name: 'tools.getAssetQuality.name', description: 'tools.getAssetQuality.description' },
  'get_revenue_breakdown': { name: 'tools.getRevenueBreakdown.name', description: 'tools.getRevenueBreakdown.description' },
  'get_cost_structure': { name: 'tools.getCostStructure.name', description: 'tools.getCostStructure.description' },
  'get_rd_investment': { name: 'tools.getRdInvestment.name', description: 'tools.getRdInvestment.description' },
  'get_capex_analysis': { name: 'tools.getCapexAnalysis.name', description: 'tools.getCapexAnalysis.description' },
  'get_tax_rate_analysis': { name: 'tools.getTaxRateAnalysis.name', description: 'tools.getTaxRateAnalysis.description' },
  'get_peer_comparison': { name: 'tools.getPeerComparison.name', description: 'tools.getPeerComparison.description' },
  'get_financial_forecast': { name: 'tools.getFinancialForecast.name', description: 'tools.getFinancialForecast.description' },
  'get_earnings_surprise': { name: 'tools.getEarningsSurprise.name', description: 'tools.getEarningsSurprise.description' },
  'get_quarterly_earnings_trend': { name: 'tools.getQuarterlyEarningsTrend.name', description: 'tools.getQuarterlyEarningsTrend.description' },
  'get_segment_performance': { name: 'tools.getSegmentPerformance.name', description: 'tools.getSegmentPerformance.description' },
  'get_geographic_revenue': { name: 'tools.getGeographicRevenue.name', description: 'tools.getGeographicRevenue.description' },
  'get_customer_concentration': { name: 'tools.getCustomerConcentration.name', description: 'tools.getCustomerConcentration.description' },
  'get_supplier_concentration': { name: 'tools.getSupplierConcentration.name', description: 'tools.getSupplierConcentration.description' },
  'get_inventory_analysis': { name: 'tools.getInventoryAnalysis.name', description: 'tools.getInventoryAnalysis.description' },
  'get_receivables_analysis': { name: 'tools.getReceivablesAnalysis.name', description: 'tools.getReceivablesAnalysis.description' },
  'get_goodwill_analysis': { name: 'tools.getGoodwillAnalysis.name', description: 'tools.getGoodwillAnalysis.description' },
  'get_contingent_liabilities': { name: 'tools.getContingentLiabilities.name', description: 'tools.getContingentLiabilities.description' },
  'get_related_party_transactions': { name: 'tools.getRelatedPartyTransactions.name', description: 'tools.getRelatedPartyTransactions.description' },
  'get_off_balance_sheet_items': { name: 'tools.getOffBalanceSheetItems.name', description: 'tools.getOffBalanceSheetItems.description' },
  'get_accounting_policy': { name: 'tools.getAccountingPolicy.name', description: 'tools.getAccountingPolicy.description' },
  'get_auditor_opinion': { name: 'tools.getAuditorOpinion.name', description: 'tools.getAuditorOpinion.description' },
  'get_financial_footnotes': { name: 'tools.getFinancialFootnotes.name', description: 'tools.getFinancialFootnotes.description' },
  'get_mda': { name: 'tools.getMda.name', description: 'tools.getMda.description' },
  'get_financial_red_flags': { name: 'tools.getFinancialRedFlags.name', description: 'tools.getFinancialRedFlags.description' },
  'get_altman_z_score': { name: 'tools.getAltmanZScore.name', description: 'tools.getAltmanZScore.description' },
  'get_piotroski_f_score': { name: 'tools.getPiotroskiFScore.name', description: 'tools.getPiotroskiFScore.description' },
  'get_beneish_m_score': { name: 'tools.getBeneishMScore.name', description: 'tools.getBeneishMScore.description' },
  'get_roll_yield_bar': { name: 'tools.getRollYieldBar.name', description: 'tools.getRollYieldBar.description' },
  'get_cffex_rank_table': { name: 'tools.getCffexRankTable.name', description: 'tools.getCffexRankTable.description' },
  'get_rank_table_czce': { name: 'tools.getRankTableCzce.name', description: 'tools.getRankTableCzce.description' },
  'get_dce_rank_table': { name: 'tools.getDceRankTable.name', description: 'tools.getDceRankTable.description' },
  'get_shfe_v_wap': { name: 'tools.getShfeVWap.name', description: 'tools.getShfeVWap.description' },
  'get_gfex_daily': { name: 'tools.getGfexDaily.name', description: 'tools.getGfexDaily.description' },
  'stock_hk_daily': { name: 'tools.stockHkDaily.name', description: 'tools.stockHkDaily.description' },
  'stock_us_daily': { name: 'tools.stockUsDaily.name', description: 'tools.stockUsDaily.description' },
  'get_us_stock_name': { name: 'tools.getUsStockName.name', description: 'tools.getUsStockName.description' },
  'stock_zh_ah_spot': { name: 'tools.stockZhAhSpot.name', description: 'tools.stockZhAhSpot.description' },
  'stock_zh_kcb_spot': { name: 'tools.stockZhKcbSpot.name', description: 'tools.stockZhKcbSpot.description' },
  'stock_zh_kcb_daily': { name: 'tools.stockZhKcbDaily.name', description: 'tools.stockZhKcbDaily.description' },
  'futures_zh_spot': { name: 'tools.futuresZhSpot.name', description: 'tools.futuresZhSpot.description' },
  'futures_zh_realtime': { name: 'tools.futuresZhRealtime.name', description: 'tools.futuresZhRealtime.description' },
  'futures_foreign_commodity_realtime': { name: 'tools.futuresForeignCommodityRealtime.name', description: 'tools.futuresForeignCommodityRealtime.description' },
  'futures_zh_minute_sina': { name: 'tools.futuresZhMinuteSina.name', description: 'tools.futuresZhMinuteSina.description' },
  'option_cffex_sz50_list_sina': { name: 'tools.optionCffexSz50ListSina.name', description: 'tools.optionCffexSz50ListSina.description' },
  'option_cffex_hs300_list_sina': { name: 'tools.optionCffexHs300ListSina.name', description: 'tools.optionCffexHs300ListSina.description' },
  'option_cffex_zz1000_list_sina': { name: 'tools.optionCffexZz1000ListSina.name', description: 'tools.optionCffexZz1000ListSina.description' },
  'option_sse_spot_price_sina': { name: 'tools.optionSseSpotPriceSina.name', description: 'tools.optionSseSpotPriceSina.description' },
  'option_sse_underlying_spot_price_sina': { name: 'tools.optionSseUnderlyingSpotPriceSina.name', description: 'tools.optionSseUnderlyingSpotPriceSina.description' },
  'option_sse_greeks_sina': { name: 'tools.optionSseGreeksSina.name', description: 'tools.optionSseGreeksSina.description' },
  'option_sse_minute_sina': { name: 'tools.optionSseMinuteSina.name', description: 'tools.optionSseMinuteSina.description' },
  'option_sse_daily_sina': { name: 'tools.optionSseDailySina.name', description: 'tools.optionSseDailySina.description' },
  'option_finance_minute_sina': { name: 'tools.optionFinanceMinuteSina.name', description: 'tools.optionFinanceMinuteSina.description' },
  'option_minute_em': { name: 'tools.optionMinuteEm.name', description: 'tools.optionMinuteEm.description' },
  'fx_swap_quote': { name: 'tools.fxSwapQuote.name', description: 'tools.fxSwapQuote.description' },
  'fx_pair_quote': { name: 'tools.fxPairQuote.name', description: 'tools.fxPairQuote.description' },
  'fx_major_pairs_realtime': { name: 'tools.fxMajorPairsRealtime.name', description: 'tools.fxMajorPairsRealtime.description' },
  'stock_zh_index_daily': { name: 'tools.stockZhIndexDaily.name', description: 'tools.stockZhIndexDaily.description' },
  'stock_sz_index_daily': { name: 'tools.stockSzIndexDaily.name', description: 'tools.stockSzIndexDaily.description' },
  'stock_csi_index_daily': { name: 'tools.stockCsiIndexDaily.name', description: 'tools.stockCsiIndexDaily.description' },

  'futures_exchange_list': { name: 'tools.futuresExchangeList.name', description: 'tools.futuresExchangeList.description' },
  'futures_trading_time': { name: 'tools.futuresTradingTime.name', description: 'tools.futuresTradingTime.description' },
  'futures_contract_multiplier': { name: 'tools.futuresContractMultiplier.name', description: 'tools.futuresContractMultiplier.description' },
  'futures_margin_ratio': { name: 'tools.futuresMarginRatio.name', description: 'tools.futuresMarginRatio.description' },
  'stock_financial_ratios': { name: 'tools.stockFinancialRatios.name', description: 'tools.stockFinancialRatios.description' },
  'stock_dcf_valuation': { name: 'tools.stockDcfValuation.name', description: 'tools.stockDcfValuation.description' },
  'stock_technical_indicators': { name: 'tools.stockTechnicalIndicators.name', description: 'tools.stockTechnicalIndicators.description' },
  'stock_industry_comparison': { name: 'tools.stockIndustryComparison.name', description: 'tools.stockIndustryComparison.description' },
  'get_convertible_bond_spot': { name: 'tools.getConvertibleBondSpot.name', description: 'tools.getConvertibleBondSpot.description' },
  'get_convertible_bond_issuance': { name: 'tools.getConvertibleBondIssuance.name', description: 'tools.getConvertibleBondIssuance.description' },
  'get_conversion_premium_history': { name: 'tools.getConversionPremiumHistory.name', description: 'tools.getConversionPremiumHistory.description' },
  'get_corporate_bond_spot': { name: 'tools.getCorporateBondSpot.name', description: 'tools.getCorporateBondSpot.description' },
  'get_corporate_bond_issuance': { name: 'tools.getCorporateBondIssuance.name', description: 'tools.getCorporateBondIssuance.description' },
  'get_local_gov_bond_issuance': { name: 'tools.getLocalGovBondIssuance.name', description: 'tools.getLocalGovBondIssuance.description' },
  'get_shibor_rate': { name: 'tools.getShiborRate.name', description: 'tools.getShiborRate.description' },
  'get_lpr_rate': { name: 'tools.getLprRate.name', description: 'tools.getLprRate.description' },
  'get_bond_credit_rating': { name: 'tools.getBondCreditRating.name', description: 'tools.getBondCreditRating.description' },
  'get_bond_rating_changes': { name: 'tools.getBondRatingChanges.name', description: 'tools.getBondRatingChanges.description' },
  'get_bond_default_events': { name: 'tools.getBondDefaultEvents.name', description: 'tools.getBondDefaultEvents.description' },
  'get_bond_repo_rates': { name: 'tools.getBondRepoRates.name', description: 'tools.getBondRepoRates.description' },
  'get_bond_duration_convexity': { name: 'tools.getBondDurationConvexity.name', description: 'tools.getBondDurationConvexity.description' },
  'get_exchangeable_bond': { name: 'tools.getExchangeableBond.name', description: 'tools.getExchangeableBond.description' },
  'get_abs_securities': { name: 'tools.getAbsSecurities.name', description: 'tools.getAbsSecurities.description' },
  'get_agriculture_inventory': { name: 'tools.getAgricultureInventory.name', description: 'tools.getAgricultureInventory.description' },
  'get_agriculture_production': { name: 'tools.getAgricultureProduction.name', description: 'tools.getAgricultureProduction.description' },
  'get_metals_inventory': { name: 'tools.getMetalsInventory.name', description: 'tools.getMetalsInventory.description' },
  'get_metals_production': { name: 'tools.getMetalsProduction.name', description: 'tools.getMetalsProduction.description' },
  'get_oil_inventory': { name: 'tools.getOilInventory.name', description: 'tools.getOilInventory.description' },
  'get_refined_oil_inventory': { name: 'tools.getRefinedOilInventory.name', description: 'tools.getRefinedOilInventory.description' },
  'get_natural_gas_inventory': { name: 'tools.getNaturalGasInventory.name', description: 'tools.getNaturalGasInventory.description' },
  'get_coal_inventory': { name: 'tools.getCoalInventory.name', description: 'tools.getCoalInventory.description' },
  'get_steel_inventory': { name: 'tools.getSteelInventory.name', description: 'tools.getSteelInventory.description' },
  'get_cement_production': { name: 'tools.getCementProduction.name', description: 'tools.getCementProduction.description' },
  'get_chemical_inventory': { name: 'tools.getChemicalInventory.name', description: 'tools.getChemicalInventory.description' },
  'get_rubber_inventory': { name: 'tools.getRubberInventory.name', description: 'tools.getRubberInventory.description' },
  'get_sugar_inventory': { name: 'tools.getSugarInventory.name', description: 'tools.getSugarInventory.description' },
  'get_oilseed_inventory': { name: 'tools.getOilseedInventory.name', description: 'tools.getOilseedInventory.description' },
  'get_glass_data': { name: 'tools.getGlassData.name', description: 'tools.getGlassData.description' },
  'get_metals_trade_data': { name: 'tools.getMetalsTradeData.name', description: 'tools.getMetalsTradeData.description' },
  'get_stock_dividend': { name: 'tools.getStockDividend.name', description: 'tools.getStockDividend.description' },
  'get_stock_buyback': { name: 'tools.getStockBuyback.name', description: 'tools.getStockBuyback.description' },
  'get_executive_trading': { name: 'tools.getExecutiveTrading.name', description: 'tools.getExecutiveTrading.description' },
  'get_institutional_holdings': { name: 'tools.getInstitutionalHoldings.name', description: 'tools.getInstitutionalHoldings.description' },
  'get_shareholder_count': { name: 'tools.getShareholderCount.name', description: 'tools.getShareholderCount.description' },
  'get_restricted_share_release': { name: 'tools.getRestrictedShareRelease.name', description: 'tools.getRestrictedShareRelease.description' },
  'get_share_pledge': { name: 'tools.getSharePledge.name', description: 'tools.getSharePledge.description' },
  'get_stock_offering': { name: 'tools.getStockOffering.name', description: 'tools.getStockOffering.description' },
  'get_equity_incentive': { name: 'tools.getEquityIncentive.name', description: 'tools.getEquityIncentive.description' },
  'get_earnings_forecast': { name: 'tools.getEarningsForecast.name', description: 'tools.getEarningsForecast.description' },
  'get_earnings_flash': { name: 'tools.getEarningsFlash.name', description: 'tools.getEarningsFlash.description' },
  'get_top_list': { name: 'tools.getTopList.name', description: 'tools.getTopList.description' },
  'get_fund_manager_performance': { name: 'tools.getFundManagerPerformance.name', description: 'tools.getFundManagerPerformance.description' },
  'get_fund_flow': { name: 'tools.getFundFlow.name', description: 'tools.getFundFlow.description' },
  'get_etf_tracking': { name: 'tools.getEtfTracking.name', description: 'tools.getEtfTracking.description' },
  'get_fund_allocation_index': { name: 'tools.getFundAllocationIndex.name', description: 'tools.getFundAllocationIndex.description' },
  'get_fund_comparison': { name: 'tools.getFundComparison.name', description: 'tools.getFundComparison.description' },
  'get_fund_fees': { name: 'tools.getFundFees.name', description: 'tools.getFundFees.description' },
  'get_fund_risk_metrics': { name: 'tools.getFundRiskMetrics.name', description: 'tools.getFundRiskMetrics.description' },
  'get_fund_style_analysis': { name: 'tools.getFundStyleAnalysis.name', description: 'tools.getFundStyleAnalysis.description' },
  'get_fund_company_ranking': { name: 'tools.getFundCompanyRanking.name', description: 'tools.getFundCompanyRanking.description' },
  'get_etf_arbitrage': { name: 'tools.getEtfArbitrage.name', description: 'tools.getEtfArbitrage.description' },
  'get_lof_arbitrage': { name: 'tools.getLofArbitrage.name', description: 'tools.getLofArbitrage.description' },
  'get_fund_turnover_rate': { name: 'tools.getFundTurnoverRate.name', description: 'tools.getFundTurnoverRate.description' },
  'get_fund_manager_history': { name: 'tools.getFundManagerHistory.name', description: 'tools.getFundManagerHistory.description' },
  'get_sector_fund_ranking': { name: 'tools.getSectorFundRanking.name', description: 'tools.getSectorFundRanking.description' },
  'get_fund_benchmark_comparison': { name: 'tools.getFundBenchmarkComparison.name', description: 'tools.getFundBenchmarkComparison.description' },
  'get_qdii_currency_exposure': { name: 'tools.getQdiiCurrencyExposure.name', description: 'tools.getQdiiCurrencyExposure.description' },
  'get_fund_holdings_change': { name: 'tools.getFundHoldingsChange.name', description: 'tools.getFundHoldingsChange.description' },
  'get_money_fund_yield_ranking': { name: 'tools.getMoneyFundYieldRanking.name', description: 'tools.getMoneyFundYieldRanking.description' },
  'get_fund_shareholder_concentration': { name: 'tools.getFundShareholderConcentration.name', description: 'tools.getFundShareholderConcentration.description' },
  'get_smart_beta_etf_metrics': { name: 'tools.getSmartBetaEtfMetrics.name', description: 'tools.getSmartBetaEtfMetrics.description' },
  'get_stock_tick_data': { name: 'tools.getStockTickData.name', description: 'tools.getStockTickData.description' },
  'get_order_book_level2': { name: 'tools.getOrderBookLevel2.name', description: 'tools.getOrderBookLevel2.description' },
  'get_order_book_level2_full': { name: 'tools.getOrderBookLevel2Full.name', description: 'tools.getOrderBookLevel2Full.description' },
  'get_transaction_stream': { name: 'tools.getTransactionStream.name', description: 'tools.getTransactionStream.description' },
  'get_market_snapshot': { name: 'tools.getMarketSnapshot.name', description: 'tools.getMarketSnapshot.description' },
  'get_intraday_minute_data': { name: 'tools.getIntradayMinuteData.name', description: 'tools.getIntradayMinuteData.description' },
  'get_large_order_monitor': { name: 'tools.getLargeOrderMonitor.name', description: 'tools.getLargeOrderMonitor.description' },
  'get_index_composition_realtime': { name: 'tools.getIndexCompositionRealtime.name', description: 'tools.getIndexCompositionRealtime.description' },
  'get_sector_rotation_realtime': { name: 'tools.getSectorRotationRealtime.name', description: 'tools.getSectorRotationRealtime.description' },
  'get_market_breadth': { name: 'tools.getMarketBreadth.name', description: 'tools.getMarketBreadth.description' },
  'get_options_chain_realtime': { name: 'tools.getOptionsChainRealtime.name', description: 'tools.getOptionsChainRealtime.description' },
  'get_futures_order_book': { name: 'tools.getFuturesOrderBook.name', description: 'tools.getFuturesOrderBook.description' },
  'get_bond_quotes_stream': { name: 'tools.getBondQuotesStream.name', description: 'tools.getBondQuotesStream.description' },
  'get_forex_ticks': { name: 'tools.getForexTicks.name', description: 'tools.getForexTicks.description' },
  'get_market_maker_quotes': { name: 'tools.getMarketMakerQuotes.name', description: 'tools.getMarketMakerQuotes.description' },
  'get_auction_data': { name: 'tools.getAuctionData.name', description: 'tools.getAuctionData.description' },
  'get_news_heat_ranking': { name: 'tools.getNewsHeatRanking.name', description: 'tools.getNewsHeatRanking.description' },
  'get_research_report_stats': { name: 'tools.getResearchReportStats.name', description: 'tools.getResearchReportStats.description' },
  'get_stock_mention_trends': { name: 'tools.getStockMentionTrends.name', description: 'tools.getStockMentionTrends.description' },
  'get_institutional_research_calendar': { name: 'tools.getInstitutionalResearchCalendar.name', description: 'tools.getInstitutionalResearchCalendar.description' },
  'get_media_coverage_analysis': { name: 'tools.getMediaCoverageAnalysis.name', description: 'tools.getMediaCoverageAnalysis.description' },
  'get_us_earnings_calendar': { name: 'tools.getUsEarningsCalendar.name', description: 'tools.getUsEarningsCalendar.description' },
  'get_us_institutional_holdings': { name: 'tools.getUsInstitutionalHoldings.name', description: 'tools.getUsInstitutionalHoldings.description' },
  'get_us_insider_trading': { name: 'tools.getUsInsiderTrading.name', description: 'tools.getUsInsiderTrading.description' },
  'get_us_dividend_calendar': { name: 'tools.getUsDividendCalendar.name', description: 'tools.getUsDividendCalendar.description' },
  'get_adr_data': { name: 'tools.getAdrData.name', description: 'tools.getAdrData.description' },
  'get_us_extended_hours_quotes': { name: 'tools.getUsExtendedHoursQuotes.name', description: 'tools.getUsExtendedHoursQuotes.description' },
  'get_us_stock_splits_calendar': { name: 'tools.getUsStockSplitsCalendar.name', description: 'tools.getUsStockSplitsCalendar.description' },
  'get_hk_connect_quota_usage': { name: 'tools.getHkConnectQuotaUsage.name', description: 'tools.getHkConnectQuotaUsage.description' },
  'get_hk_ipo_calendar': { name: 'tools.getHkIpoCalendar.name', description: 'tools.getHkIpoCalendar.description' },
  'get_hk_major_shareholders': { name: 'tools.getHkMajorShareholders.name', description: 'tools.getHkMajorShareholders.description' },
  'get_hk_warrant_data': { name: 'tools.getHkWarrantData.name', description: 'tools.getHkWarrantData.description' },
  'get_us_conference_call_schedule': { name: 'tools.getUsConferenceCallSchedule.name', description: 'tools.getUsConferenceCallSchedule.description' },
  'get_us_analyst_estimates': { name: 'tools.getUsAnalystEstimates.name', description: 'tools.getUsAnalystEstimates.description' },
  'get_hk_buyback_announcements': { name: 'tools.getHkBuybackAnnouncements.name', description: 'tools.getHkBuybackAnnouncements.description' },
  'get_global_indices_realtime': { name: 'tools.getGlobalIndicesRealtime.name', description: 'tools.getGlobalIndicesRealtime.description' },
  'get_us_options_expiration_calendar': { name: 'tools.getUsOptionsExpirationCalendar.name', description: 'tools.getUsOptionsExpirationCalendar.description' },
  'get_hk_short_selling_data': { name: 'tools.getHkShortSellingData.name', description: 'tools.getHkShortSellingData.description' },
  'get_ah_premium_tracking': { name: 'tools.getAhPremiumTracking.name', description: 'tools.getAhPremiumTracking.description' },
  'get_bank_net_interest_margin': { name: 'tools.getBankNetInterestMargin.name', description: 'tools.getBankNetInterestMargin.description' },
  'get_bank_loan_deposit_ratio': { name: 'tools.getBankLoanDepositRatio.name', description: 'tools.getBankLoanDepositRatio.description' },
  'get_bank_npl_ratio': { name: 'tools.getBankNplRatio.name', description: 'tools.getBankNplRatio.description' },
  'get_bank_capital_adequacy': { name: 'tools.getBankCapitalAdequacy.name', description: 'tools.getBankCapitalAdequacy.description' },
  'get_insurance_premium_income': { name: 'tools.getInsurancePremiumIncome.name', description: 'tools.getInsurancePremiumIncome.description' },
  'get_insurance_solvency_ratio': { name: 'tools.getInsuranceSolvencyRatio.name', description: 'tools.getInsuranceSolvencyRatio.description' },
  'get_insurance_combined_ratio': { name: 'tools.getInsuranceCombinedRatio.name', description: 'tools.getInsuranceCombinedRatio.description' },
  'get_real_estate_sales_data': { name: 'tools.getRealEstateSalesData.name', description: 'tools.getRealEstateSalesData.description' },
  'get_land_transaction_data': { name: 'tools.getLandTransactionData.name', description: 'tools.getLandTransactionData.description' },
  'get_property_inventory_levels': { name: 'tools.getPropertyInventoryLevels.name', description: 'tools.getPropertyInventoryLevels.description' },
  'get_property_price_indices': { name: 'tools.getPropertyPriceIndices.name', description: 'tools.getPropertyPriceIndices.description' },
  'get_drug_approval_pipeline': { name: 'tools.getDrugApprovalPipeline.name', description: 'tools.getDrugApprovalPipeline.description' },
  'get_clinical_trial_data': { name: 'tools.getClinicalTrialData.name', description: 'tools.getClinicalTrialData.description' },
  'get_medical_device_registration': { name: 'tools.getMedicalDeviceRegistration.name', description: 'tools.getMedicalDeviceRegistration.description' },
  'get_hospital_operation_metrics': { name: 'tools.getHospitalOperationMetrics.name', description: 'tools.getHospitalOperationMetrics.description' },
  'get_reits_performance': { name: 'tools.getReitsPerformance.name', description: 'tools.getReitsPerformance.description' },
  'get_telecom_operator_metrics': { name: 'tools.getTelecomOperatorMetrics.name', description: 'tools.getTelecomOperatorMetrics.description' },
  'get_automotive_sales_data': { name: 'tools.getAutomotiveSalesData.name', description: 'tools.getAutomotiveSalesData.description' },
  'get_stock_factor_exposure': { name: 'tools.getStockFactorExposure.name', description: 'tools.getStockFactorExposure.description' },
  'get_stock_screening': { name: 'tools.getStockScreening.name', description: 'tools.getStockScreening.description' },
  'get_backtesting_results': { name: 'tools.getBacktestingResults.name', description: 'tools.getBacktestingResults.description' },
  'get_correlation_matrix': { name: 'tools.getCorrelationMatrix.name', description: 'tools.getCorrelationMatrix.description' },
  'get_stock_beta': { name: 'tools.getStockBeta.name', description: 'tools.getStockBeta.description' },
  'get_momentum_indicators': { name: 'tools.getMomentumIndicators.name', description: 'tools.getMomentumIndicators.description' },
  'get_technical_pattern_recognition': { name: 'tools.getTechnicalPatternRecognition.name', description: 'tools.getTechnicalPatternRecognition.description' },
  'get_volatility_analysis': { name: 'tools.getVolatilityAnalysis.name', description: 'tools.getVolatilityAnalysis.description' },
  'get_mean_reversion_signals': { name: 'tools.getMeanReversionSignals.name', description: 'tools.getMeanReversionSignals.description' },
  'get_pair_trading_opportunities': { name: 'tools.getPairTradingOpportunities.name', description: 'tools.getPairTradingOpportunities.description' },
  'get_stock_ranking_multi_metric': { name: 'tools.getStockRankingMultiMetric.name', description: 'tools.getStockRankingMultiMetric.description' },
  'get_sector_momentum_ranking': { name: 'tools.getSectorMomentumRanking.name', description: 'tools.getSectorMomentumRanking.description' },
  'get_relative_strength': { name: 'tools.getRelativeStrength.name', description: 'tools.getRelativeStrength.description' },
  'get_alpha_generation': { name: 'tools.getAlphaGeneration.name', description: 'tools.getAlphaGeneration.description' },
  // Additional missing tools
  'crypto_market_cap_ranking': { name: 'tools.cryptoMarketCapRanking.name', description: 'tools.cryptoMarketCapRanking.description' },
  'crypto_bitcoin_price_trend': { name: 'tools.cryptoBitcoinPriceTrend.name', description: 'tools.cryptoBitcoinPriceTrend.description' },
  'crypto_exchange_ranking': { name: 'tools.cryptoExchangeRanking.name', description: 'tools.cryptoExchangeRanking.description' },
  'crypto_defi_tvl': { name: 'tools.cryptoDefiTvl.name', description: 'tools.cryptoDefiTvl.description' },
  'crypto_nft_market_data': { name: 'tools.cryptoNftMarketData.name', description: 'tools.cryptoNftMarketData.description' }
};

/**
 * Dynamically determine tool category based on tool name
 * Ultra-simplified to 13 categories total (7 default + 6 financial)
 */
function getToolCategory(toolName: string): ToolCategory {
  // ========== Default Enabled Categories (7) ==========
  if (/^(view|create|str_replace|sed|append|insert|move_file|trash_file|file_exists|list_file_directory)$/.test(toolName)) return 'file-management';
  if (/^(insert_at_cursor|editor_undo|editor_redo)$/.test(toolName)) return 'editor';
  if (/_note|duplicate_note/.test(toolName)) return 'note-management';
  if (/^(search_files|search_content|find_files_containing)$/.test(toolName)) return 'search';
  if (/^(get_timedate)$/.test(toolName)) return 'utility';
  if (/^(fetch_web_content|fetch_youtube_transcript)$/.test(toolName)) return 'web-content';
  if (/_search|wikipedia/.test(toolName)) return 'search-engines';
  
  // ========== Financial Market Categories (6) ==========
  
  // 1. Futures 期货市场（包含期货排名、成交、持仓等数据）
  if (/futures|comex_inventory|warehouse|position_rank|^get_(cffex|czce|dce|shfe|ine|gfex)_daily|^get(CFFEX|CZCE|DCE|SHFE|INE|GFEX)Daily|roll_yield|receipt_date|rank_table|shfe_v_wap/.test(toolName)) return 'futures';
  
  // 2. Bonds 债券市场（包含利率互换等）
  if (/bond|treasury|yield|shibor|lpr|^get_(sse|szse)_pledge_repo|abs_securities|interest_rate_swap|interest_rate_cap_floor/.test(toolName)) return 'bonds';
  
  // 3. Options 期权市场
  if (/option|^get_(sse50|csi300|csi1000)/.test(toolName)) return 'options';
  
  // 4. Funds 基金市场
  if (/fund|etf|lof|qdii/.test(toolName)) return 'funds';
  
  // 5. Stock 股票市场（包含A股、港股、美股、技术分析、资金流向等）
  // 美股数据
  if (/^get_us_(earnings|dividend|insider|institutional|analyst|conference|adp|cpi|ppi|pmi|retail|jobless|non_farm)/.test(toolName)) return 'stock';
  // 港股数据
  if (/^get_hk_(connect|ipo|major_shareholders|short_selling|warrant)/.test(toolName)) return 'stock';
  // 沪深港通
  if (/hsgt|hk_connect/.test(toolName)) return 'stock';
  // 技术分析（主要用于股票）
  if (/continuous_rise|continuous_fall|continuous_volume|volume_price|large_order_monitor|intraday_minute|transaction_stream/.test(toolName)) return 'stock';
  // IPO和上市公司数据
  if (/^get_(stock|market|board|sector|index|hot_|limit_|dragon|tiger|shareholder|executive_|institutional_|equity_|pledge|ipo_|performance_|dividend|buyback|share_|restricted_|top_list|earnings_|financial|income_statement|balance_sheet|cash_flow|news_heat|news_sentiment|weibo|research_report)/.test(toolName)) return 'stock';
  if (/stock|market|quote|board|industry|concept|sector|index|capital|money_flow|block_trade|limit|hot|ranking|snapshot|breadth|rotation/.test(toolName)) return 'stock';
  
  // 6. Market Data 市场数据与分析（包含外汇、数字货币、宏观经济、行业数据、技术分析、新闻舆情、风险管理、ESG、商品、衍生品、信用分析等所有其他金融工具）
  // 外汇和加密货币
  if (/forex|^fx_|exchange_rate|currency|crypto|bitcoin|ethereum|blockchain|defi|nft/.test(toolName)) return 'market-data';
  
  // 宏观经济数据
  if (/^(get_|macro_)(cpi|ppi|gdp|pmi|money_supply|unemployment|forex_reserve|china_us|interest_rate|inflation|employment|trade_balance|social_financing|tsf|industrial_value|reserve_ratio|china_social|china_industrial|china_reserve|china_cpi|china_gdp|china_money_supply|china_pmi|china_ppi|china_trade_balance)/.test(toolName)) return 'market-data';
  
  // 行业数据
  if (/^get_(hog|corn|soybean|wheat|cotton|sugar|feed|automotive|nev_sales|telecom|hospital|drug|clinical|medical|reits|land_transaction|property|real_estate|insurance_|bank_|cement|movie|tv|variety|artist|animation|game|weather|air_quality)/.test(toolName)) return 'market-data';
  
  // 商品基本面
  if (/agriculture_inventory|agriculture_production|metals_inventory|metals_production|metals_trade|oil_inventory|refined_oil|natural_gas_inventory|coal_inventory|steel_inventory|chemical_inventory|rubber_inventory|sugar_inventory|oilseed_inventory|glass_data|commodity_inventory|commodity_production|commodity_seasonality|commodity_weather|commodity_correlation|commodity_supply_demand|commodity_trade_flow|commodity_arbitrage|freight_rate/.test(toolName)) return 'market-data';
  
  // 技术分析
  if (/continuous_rise|continuous_fall|continuous_volume|volume_price|momentum_indicator|technical_pattern|mean_reversion|pair_trading|relative_strength|correlation_matrix|volatility_analysis|backtesting/.test(toolName)) return 'market-data';
  
  // 新闻舆情
  if (/news|economic_calendar|research_report|cctv|sentiment|analyst|consensus|rating|social_responsibility/.test(toolName)) return 'market-data';
  
  // 风险管理
  if (/risk|var|stress_test|scenario|concentration_risk|tail_risk|risk_limit|counterparty_exposure/.test(toolName)) return 'market-data';
  
  // ESG
  if (/esg|carbon|climate|sustainability|environmental|governance|water_usage|renewable_energy|waste_management|employee_satisfaction|green_/.test(toolName)) return 'market-data';
  
  // 市场微观结构
  if (/tick_data|order_book|order_flow|bid_ask|execution_quality|slippage|market_impact|vwap|twap|auction|market_maker|hft_activity|quote_stuffing|dark_pool|trade_classification|intraday_minute|large_order_monitor|transaction_stream|short_interest/.test(toolName)) return 'market-data';
  
  // 衍生品
  if (/swap|cds|swaption|variance_swap|correlation_swap|exotic_option|forward_rate|dispersion|implied_correlation|volatility_arbitrage|volatility_surface|conversion_premium/.test(toolName)) return 'market-data';
  
  // 信用分析
  if (/credit_rating|default_probability|bankruptcy|distressed_debt|covenant|debt_structure|debt_capacity|recovery_rate|credit_event|credit_spread|credit_cycle|sovereign_credit|counterparty_credit|credit_portfolio/.test(toolName)) return 'market-data';
  
  // 另类数据
  if (/social_media|satellite|sentiment_index|media_coverage|alternative_data|web_scraping|earnings_call_transcript|institution_research|cot_reports/.test(toolName)) return 'market-data';
  
  // 默认返回市场数据类别
  return 'market-data';
}

/**
 * Unified function to get all built-in tools
 * @param options - Configuration options
 * @param options.i18n - Optional I18nManager for localization. If provided, tools will be localized
 * @param options.asArray - If true, returns array; if false, returns Record (default: false)
 * @returns Built-in tools as array or record, localized if i18n is provided
 */
export function getAllBuiltInTools(options?: { 
  i18n?: I18nManager; 
  asArray?: boolean 
}): BuiltInTool[] | Record<string, BuiltInTool> {
  const { i18n, asArray = false } = options || {};
  
  let tools: Record<string, BuiltInTool>;
  
  if (i18n) {
    // Localize tools and assign categories
    tools = {};
    for (const [toolName, tool] of Object.entries(BUILT_IN_TOOLS)) {
      const i18nKeys = TOOL_I18N_KEY_MAP[toolName];
      const category = getToolCategory(toolName);
      
      if (i18nKeys) {
        // Tool has i18n keys, try to translate
        tools[toolName] = {
          ...tool,
          id: toolName, // Keep original tool name as id for permission checking
          name: i18n.t(i18nKeys.name) || tool.name,
          description: i18n.t(i18nKeys.description) || tool.description,
          category
        } as any;
      } else {
        // No i18n keys, use original
        tools[toolName] = {
          ...tool,
          id: toolName, // Keep original tool name as id
          category
        } as any;
      }
    }
  } else {
    // Return original tools with categories
    tools = {};
    for (const [toolName, tool] of Object.entries(BUILT_IN_TOOLS)) {
      tools[toolName] = {
        ...tool,
        id: toolName, // Keep original tool name as id
        category: getToolCategory(toolName)
      } as any;
    }
  }
  
  return asArray ? Object.values(tools) : tools;
}

/**
 * @deprecated Use getAllBuiltInTools({ i18n }) instead
 * Get localized built-in tools with translated descriptions
 */
export function getLocalizedBuiltInTools(i18n: I18nManager): Record<string, BuiltInTool> {
  return getAllBuiltInTools({ i18n }) as Record<string, BuiltInTool>;
}

/**
 * Get a specific built-in tool by name
 */
export function getBuiltInTool(name: string): BuiltInTool | undefined {
  return BUILT_IN_TOOLS[name];
}

/**
 * Execute a built-in tool
 */
export async function executeBuiltInTool(name: string, args: any): Promise<any> {
  const tool = getBuiltInTool(name);
  if (!tool) {
    throw new Error(`Built-in tool not found: ${name}`);
  }

  Logger.debug(`Executing tool: ${name}`, args);
  const result = await tool.execute(args);
  Logger.debug(`Tool ${name} result:`, result);

  return result;
}

/**
 * Check if a tool name refers to a built-in tool
 */
export function isBuiltInTool(name: string): boolean {
  return name in BUILT_IN_TOOLS;
}
