/**
 * Semantic Chunker
 * 基于 Markdown 结构的语义分块器
 * 
 * 不使用 parsedoc 插件，避免在 Obsidian 环境中的兼容性问题
 */

import { ChunkMetadata } from './types';
import { Logger } from './../utils/logger';
import { createHash } from 'crypto';

/**
 * Semantic chunker based on Markdown structure
 */
export class SemanticChunker {
  /**
   * Split markdown content into semantic chunks based on headings
   * 
   * Strategy:
   * 1. Split by H1 (#) or H2 (##) headings
   * 2. Each section becomes a chunk
   * 3. If no headings, split by paragraphs (double newlines)
   * 4. Preserve heading hierarchy context
   */
  async splitIntoChunks(
    content: string,
    filePath: string
  ): Promise<ChunkMetadata[]> {
    try {
      const chunks: ChunkMetadata[] = [];
      
      // Normalize line endings
      const normalizedContent = content.replace(/\r\n/g, '\n');
      
      // Try to split by headings first (H1 or H2)
      const headingRegex = /^(#{1,2})\s+(.+)$/gm;
      const matches = [...normalizedContent.matchAll(headingRegex)];
      
      if (matches.length > 0) {
        // Split by headings
        let lastIndex = 0;
        let chunkIndex = 0;
        
        for (let i = 0; i < matches.length; i++) {
          const match = matches[i];
          const nextMatch = matches[i + 1];
          const startPos = match.index;
          const endPos = nextMatch ? nextMatch.index : normalizedContent.length;
          
          const chunkContent = normalizedContent.substring(startPos, endPos).trim();
          
          if (chunkContent.length > 0) {
            const contentHash = createHash('md5')
              .update(chunkContent)
              .digest('hex');

            chunks.push({
              id: `${filePath}::${chunkIndex}`,
              filePath,
              chunkIndex,
              contentHash,
              content: chunkContent,
              timestamp: Date.now()
            });

            chunkIndex++;
          }
        }
        
        // Handle content before first heading if it exists
        if (matches[0].index > 0) {
          const preamble = normalizedContent.substring(0, matches[0].index).trim();
          if (preamble.length > 0) {
            const contentHash = createHash('md5')
              .update(preamble)
              .digest('hex');

            chunks.unshift({
              id: `${filePath}::preamble`,
              filePath,
              chunkIndex: -1, // Special index for preamble
              contentHash,
              content: preamble,
              timestamp: Date.now()
            });
          }
        }
      } else {
        // No headings found, split by paragraphs (double newlines)
        const paragraphs = normalizedContent
          .split(/\n\n+/)
          .map(p => p.trim())
          .filter(p => p.length > 0);
        
        if (paragraphs.length > 0) {
          paragraphs.forEach((paragraph, index) => {
            const contentHash = createHash('md5')
              .update(paragraph)
              .digest('hex');

            chunks.push({
              id: `${filePath}::${index}`,
              filePath,
              chunkIndex: index,
              contentHash,
              content: paragraph,
              timestamp: Date.now()
            });
          });
        } else {
          // Last fallback: single chunk with entire content
          const contentHash = createHash('md5')
            .update(normalizedContent)
            .digest('hex');

          chunks.push({
            id: `${filePath}::0`,
            filePath,
            chunkIndex: 0,
            contentHash,
            content: normalizedContent,
            timestamp: Date.now()
          });
        }
      }

      return chunks.length > 0 ? chunks : [{
        id: `${filePath}::0`,
        filePath,
        chunkIndex: 0,
        contentHash: createHash('md5').update(content).digest('hex'),
        content: content.trim(),
        timestamp: Date.now()
      }];
    } catch (error) {
      Logger.error('Error splitting content:', error);
      
      // Fallback: create a single chunk with the entire content
      const contentHash = createHash('md5')
        .update(content)
        .digest('hex');

      return [{
        id: `${filePath}::0`,
        filePath,
        chunkIndex: 0,
        contentHash,
        content: content.trim(),
        timestamp: Date.now()
      }];
    }
  }
}
