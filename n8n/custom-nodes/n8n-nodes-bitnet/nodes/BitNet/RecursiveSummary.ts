import { IDataObject } from 'n8n-workflow';

export interface SummaryLevel {
  level: number;
  chunks: string[];
  summaries: string[];
  metadata: IDataObject;
}

export interface SummaryConfig {
  maxChunkSize: number;
  overlapSize: number;
  summaryRatio: number;
  maxLevels: number;
  preserveStructure: boolean;
  includeMetadata: boolean;
}

export class RecursiveSummaryManager {
  private config: SummaryConfig;
  private defaultConfig: SummaryConfig = {
    maxChunkSize: 2048,
    overlapSize: 200,
    summaryRatio: 0.3,
    maxLevels: 3,
    preserveStructure: true,
    includeMetadata: true,
  };

  constructor(config?: Partial<SummaryConfig>) {
    this.config = { ...this.defaultConfig, ...config };
  }

  splitIntoChunks(text: string, chunkSize?: number, overlap?: number): string[] {
    const actualChunkSize = chunkSize || this.config.maxChunkSize;
    const actualOverlap = overlap || this.config.overlapSize;
    
    if (text.length <= actualChunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    const sentences = this.splitIntoSentences(text);
    let currentChunk = '';
    let overlapBuffer = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > actualChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          // Keep last part for overlap
          const words = currentChunk.split(' ');
          const overlapWords = Math.ceil(actualOverlap / 10); // Rough estimate
          overlapBuffer = words.slice(-overlapWords).join(' ');
          currentChunk = overlapBuffer + ' ' + sentence;
        } else {
          // Single sentence exceeds chunk size
          chunks.push(sentence);
          currentChunk = '';
        }
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting - can be improved
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return sentences.map(s => s.trim()).filter(s => s.length > 0);
  }

  generateSummaryPrompt(text: string, level: number, context?: IDataObject): string {
    const topic = context?.topic ? ` focusing on ${context.topic}` : '';
    
    if (level === 0) {
      return `Please provide a concise summary of the following text${topic}. Focus on the main points and key information:\n\n${text}\n\nSummary:`;
    } else {
      return `Please provide a higher-level summary of these summaries${topic}. Synthesize the main themes and conclusions:\n\n${text}\n\nConsolidated Summary:`;
    }
  }

  formatHierarchicalSummary(levels: SummaryLevel[]): IDataObject {
    const result: IDataObject = {
      finalSummary: levels[levels.length - 1].summaries[0],
      levels: levels.map((level, index) => ({
        level: index,
        chunkCount: level.chunks.length,
        summaryCount: level.summaries.length,
        totalLength: level.chunks.reduce((sum, chunk) => sum + chunk.length, 0),
        summaryLength: level.summaries.reduce((sum, summary) => sum + summary.length, 0),
        compressionRatio: (
          level.summaries.reduce((sum, summary) => sum + summary.length, 0) /
          level.chunks.reduce((sum, chunk) => sum + chunk.length, 0)
        ).toFixed(2),
      })),
      metadata: {
        totalLevels: levels.length,
        originalLength: levels[0].chunks.reduce((sum, chunk) => sum + chunk.length, 0),
        finalLength: levels[levels.length - 1].summaries[0].length,
        totalCompressionRatio: (
          levels[levels.length - 1].summaries[0].length /
          levels[0].chunks.reduce((sum, chunk) => sum + chunk.length, 0)
        ).toFixed(2),
      },
    };

    if (this.config.includeMetadata) {
      result.detailedLevels = levels;
    }

    return result;
  }

  mergeSummaries(summaries: string[], overlap: boolean = false): string {
    if (summaries.length === 0) return '';
    if (summaries.length === 1) return summaries[0];

    if (overlap && this.config.preserveStructure) {
      return this.mergeWithOverlap(summaries);
    }

    return summaries.join('\n\n');
  }

  private detectOverlap(text1: string, text2: string): number {
    const words1 = text1.split(' ');
    const words2 = text2.split(' ');
    
    for (let i = Math.min(words1.length, 20); i > 0; i--) {
      const end1 = words1.slice(-i).join(' ');
      const start2 = words2.slice(0, i).join(' ');
      if (end1 === start2) {
        return i;
      }
    }
    
    return 0;
  }

  private mergeWithOverlap(summaries: string[]): string {
    let merged = summaries[0];
    
    for (let i = 1; i < summaries.length; i++) {
      const overlapWords = this.detectOverlap(merged, summaries[i]);
      if (overlapWords > 0) {
        const words = summaries[i].split(' ');
        merged += ' ' + words.slice(overlapWords).join(' ');
      } else {
        merged += '\n\n' + summaries[i];
      }
    }
    
    return merged;
  }

  estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  needsChunking(text: string, maxTokens: number = 2048): boolean {
    return this.estimateTokens(text) > maxTokens;
  }
}