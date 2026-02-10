/**
 * Tool-related translation types
 */

export interface ToolTranslation {
  name: string;
  description: string;
  parameters?: Record<string, string>;
  examples?: string[];
}

export interface ToolCategoryTranslation {
  name: string;
  description: string;
  tools: Record<string, ToolTranslation>;
}

export interface ToolsTranslation {
  // Tool execution
  executing: string;
  executed: string;
  executionFailed: string;
  
  // Tool permissions
  permissionRequired: string;
  permissionGranted: string;
  permissionDenied: string;
  
  // Tool categories (organized by functionality)
  categories: {
    fileSystem: ToolCategoryTranslation;
    editor: ToolCategoryTranslation;
    noteManagement: ToolCategoryTranslation;
    search: ToolCategoryTranslation;
    webContent: ToolCategoryTranslation;
    searchEngines: ToolCategoryTranslation;
    stock: ToolCategoryTranslation;
    financial: ToolCategoryTranslation;
    futures: ToolCategoryTranslation;
    bonds: ToolCategoryTranslation;
    options: ToolCategoryTranslation;
    funds: ToolCategoryTranslation;
    forex: ToolCategoryTranslation;
    crypto: ToolCategoryTranslation;
    derivatives: ToolCategoryTranslation;
    microstructure: ToolCategoryTranslation;
    credit: ToolCategoryTranslation;
    international: ToolCategoryTranslation;
    macro: ToolCategoryTranslation;
    industry: ToolCategoryTranslation;
    commodity: ToolCategoryTranslation;
    news: ToolCategoryTranslation;
    sentiment: ToolCategoryTranslation;
    esg: ToolCategoryTranslation;
    risk: ToolCategoryTranslation;
    technical: ToolCategoryTranslation;
    weather: ToolCategoryTranslation;
    entertainment: ToolCategoryTranslation;
    utility: ToolCategoryTranslation;
    other: ToolCategoryTranslation;
  };
}
