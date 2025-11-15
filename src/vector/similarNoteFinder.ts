/**
 * Similar Note Finder
 * 相似笔记查找器 - 基于向量数据库查找相似笔记
 */

import { TFile, Vault } from 'obsidian';
import { Logger } from './../utils/logger';
import { DocItem } from './types';
import { VectorDBManager } from './vectorDBManager';

export interface SimilarNote {
  file: TFile;
  title: string;
  path: string;
  similarity: number;
  preview: string;
  sourceChunk?: string;
}

/**
 * Similar Note Finder Service
 * 查找与当前笔记相似的其他笔记
 */
export class SimilarNoteFinder {
  private vectorDBManager: VectorDBManager;
  private vault: Vault;

  constructor(vectorDBManager: VectorDBManager, vault: Vault) {
    this.vectorDBManager = vectorDBManager;
    this.vault = vault;
  }

  /**
   * Find similar notes for a given file
   * @param file The file to find similar notes for
   * @param topK Number of similar notes to return (default: 5)
   * @returns Array of similar notes with similarity scores
   */
  async findSimilarNotes(file: TFile, topK: number = 5): Promise<SimilarNote[]> {
    try {
      // Read file content
      const content = await this.vault.read(file);
      
      if (!content || content.trim().length === 0) {
        return [];
      }

      // Use the first 500 characters as query (enough for semantic similarity)
      const query = content.substring(0, 500);

      // Search for similar documents
      const results = await this.vectorDBManager.search(query, topK + 1); // +1 to exclude self

      // Filter out the current file and convert to SimilarNote format
      const similarNotes: SimilarNote[] = [];
      
      for (const result of results) {
        // Skip the current file
        if (result.filePath === file.path) {
          continue;
        }

        // Get the file from vault
        const similarFile = this.vault.getFileByPath(result.filePath);
        if (!similarFile || !(similarFile instanceof TFile)) {
          continue;
        }
        
        similarNotes.push({
          file: similarFile,
          title: similarFile.basename,
          path: result.filePath,
          similarity: result.score,
          preview: result.content,
          sourceChunk: query // Optional: include source chunk for context
        });

        // Stop when we have enough results
        if (similarNotes.length >= topK) {
          break;
        }
      }

      return similarNotes;
    } catch (error) {
      Logger.error('Error finding similar notes:', error);
      return [];
    }
  }

  /**
   * Get unique file paths from similar notes
   */
  getUniqueFiles(similarNotes: SimilarNote[]): string[] {
    return [...new Set(similarNotes.map(note => note.path))];
  }

  /**
   * Filter similar notes by minimum similarity threshold
   * @param similarNotes Array of similar notes
   * @param minSimilarity Minimum similarity score (0-1)
   */
  filterByThreshold(similarNotes: SimilarNote[], minSimilarity: number = 0.5): SimilarNote[] {
    return similarNotes.filter(note => note.similarity >= minSimilarity);
  }

  /**
   * Get a summary of similar notes for UI display
   */
  getSummary(similarNotes: SimilarNote[]): string {
    if (similarNotes.length === 0) {
      return 'No similar notes found';
    }

    const avgScore = similarNotes.reduce((sum, note) => sum + note.similarity, 0) / similarNotes.length;
    return `Found ${similarNotes.length} similar note(s) (avg similarity: ${(avgScore * 100).toFixed(1)}%)`;
  }
}
