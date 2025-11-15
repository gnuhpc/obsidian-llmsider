/**
 * Semantic Search Module
 * 语义搜索模块 - 负责语义检索和结果格式化
 */

import { IVectorDatabase, DocItem } from './types';
import { Logger } from './../utils/logger';

/**
 * Semantic Search Manager
 */
export class SemanticSearchManager {
  private vectorDB: IVectorDatabase;

  constructor(vectorDB: IVectorDatabase) {
    this.vectorDB = vectorDB;
  }

  /**
   * Search for relevant documents using semantic search
   * @param query User's query text
   * @param topK Number of results to return
   * @returns Array of relevant document items with scores
   */
  async searchLocal(query: string, topK: number = 5): Promise<DocItem[]> {
    try {
      Logger.debug(`Searching for: "${query}" (topK=${topK})`);
      
      // Query ChromaDB
      const results = await this.vectorDB.query(query, topK);
      
      Logger.debug(`Found ${results.length} results`);
      
      return results;
    } catch (error) {
      Logger.error('Search failed:', error);
      throw error;
    }
  }

  /**
   * Format search results for LLM context
   * @param results Search results
   * @returns Formatted string for LLM context
   */
  formatForLLMContext(results: DocItem[]): string {
    if (results.length === 0) {
      return '';
    }

    const contextParts: string[] = [];
    
    contextParts.push('# Relevant Context from Your Vault\n');
    contextParts.push('Below are the most relevant passages from your notes:\n');
    
    results.forEach((item, index) => {
      contextParts.push(`\n## Source ${index + 1}: ${item.filePath}`);
      contextParts.push(`Relevance: ${(item.score * 100).toFixed(1)}%`);
      contextParts.push(`\n${item.content}\n`);
      contextParts.push('---');
    });

    return contextParts.join('\n');
  }

  /**
   * Get relevance summary for UI display
   * @param results Search results
   * @returns Summary string
   */
  getRelevanceSummary(results: DocItem[]): string {
    if (results.length === 0) {
      return 'No relevant notes found';
    }

    const avgScore = results.reduce((sum, item) => sum + item.score, 0) / results.length;
    const uniqueFiles = new Set(results.map(item => item.filePath)).size;

    return `Found ${results.length} relevant passages from ${uniqueFiles} note(s) (avg relevance: ${(avgScore * 100).toFixed(1)}%)`;
  }

  /**
   * Get unique files from search results
   * @param results Search results
   * @returns Array of unique file paths
   */
  getUniqueFiles(results: DocItem[]): string[] {
    const uniqueFiles = new Set<string>();
    results.forEach(item => uniqueFiles.add(item.filePath));
    return Array.from(uniqueFiles);
  }

  /**
   * Filter results by minimum score threshold
   * @param results Search results
   * @param minScore Minimum score threshold (0-1)
   * @returns Filtered results
   */
  filterByScore(results: DocItem[], minScore: number = 0.5): DocItem[] {
    return results.filter(item => item.score >= minScore);
  }

  /**
   * Group results by file
   * @param results Search results
   * @returns Map of file path to results
   */
  groupByFile(results: DocItem[]): Map<string, DocItem[]> {
    const grouped = new Map<string, DocItem[]>();
    
    results.forEach(item => {
      const existing = grouped.get(item.filePath) || [];
      existing.push(item);
      grouped.set(item.filePath, existing);
    });

    return grouped;
  }

  /**
   * Create a compact summary of search results for UI
   * @param results Search results
   * @param maxLength Maximum length of summary
   * @returns Compact summary string
   */
  createCompactSummary(results: DocItem[], maxLength: number = 200): string {
    if (results.length === 0) {
      return 'No relevant context found';
    }

    const fileCount = new Set(results.map(item => item.filePath)).size;
    const topResult = results[0];
    const preview = topResult.content.substring(0, maxLength);
    const truncated = topResult.content.length > maxLength;

    return `${fileCount} note(s), ${results.length} passage(s) | Top: "${preview}${truncated ? '...' : ''}"`;
  }
}
