// Simple intermediate processing functions that can be added to BitNet.node.ts

export interface ChunkGroup {
  indices: number[];
  theme?: string;
  keywords?: string[];
}

export class IntermediateProcessor {
  /**
   * Groups chunks by semantic similarity (simplified version)
   * In production, this would use embeddings for actual similarity
   */
  static groupChunksBySimilarity(
    chunks: string[], 
    maxGroups: number = 5,
    similarityThreshold: number = 0.7
  ): ChunkGroup[] {
    // For now, use a simple length-based grouping as a placeholder
    // Real implementation would compute embeddings and cluster
    
    const groups: ChunkGroup[] = [];
    const avgChunkLength = chunks.reduce((sum, c) => sum + c.length, 0) / chunks.length;
    
    // Group chunks by similar length (proxy for similar content density)
    const sortedIndices = chunks
      .map((chunk, idx) => ({ idx, length: chunk.length }))
      .sort((a, b) => a.length - b.length)
      .map(item => item.idx);
    
    const groupSize = Math.ceil(chunks.length / Math.min(maxGroups, chunks.length));
    
    for (let i = 0; i < sortedIndices.length; i += groupSize) {
      const groupIndices = sortedIndices.slice(i, i + groupSize);
      const groupChunks = groupIndices.map(idx => chunks[idx]);
      
      // Extract simple keywords (words that appear in multiple chunks of the group)
      const wordFreq: { [key: string]: number } = {};
      groupChunks.forEach(chunk => {
        const words = chunk.toLowerCase().match(/\b\w{4,}\b/g) || [];
        words.forEach(word => {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        });
      });
      
      const keywords = Object.entries(wordFreq)
        .filter(([_, freq]) => freq >= Math.ceil(groupChunks.length / 2))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word);
      
      groups.push({
        indices: groupIndices,
        theme: `Group ${groups.length + 1}: ${keywords.slice(0, 2).join(', ')}`,
        keywords,
      });
    }
    
    return groups;
  }
  
  /**
   * Merges chunks within a group into a single text for summarization
   */
  static mergeGroupedChunks(chunks: string[], group: ChunkGroup): string {
    const groupChunks = group.indices.map(i => chunks[i]);
    
    // Add a brief context header if keywords are available
    let merged = '';
    if (group.keywords && group.keywords.length > 0) {
      merged = `[Key concepts: ${group.keywords.join(', ')}]\n\n`;
    }
    
    merged += groupChunks.join('\n\n---\n\n');
    return merged;
  }
  
  /**
   * Extracts metadata from chunks before summarization
   */
  static extractChunkMetadata(chunks: string[]): {
    totalWords: number;
    avgChunkLength: number;
    keyPhrases: string[];
    hasNumbers: boolean;
    hasDates: boolean;
  } {
    const totalWords = chunks.reduce((sum, chunk) => 
      sum + (chunk.match(/\b\w+\b/g) || []).length, 0
    );
    
    const avgChunkLength = chunks.reduce((sum, c) => sum + c.length, 0) / chunks.length;
    
    // Extract common 2-3 word phrases
    const phraseFreq: { [key: string]: number } = {};
    chunks.forEach(chunk => {
      const words = chunk.toLowerCase().match(/\b\w+\b/g) || [];
      for (let i = 0; i < words.length - 1; i++) {
        const phrase2 = `${words[i]} ${words[i + 1]}`;
        phraseFreq[phrase2] = (phraseFreq[phrase2] || 0) + 1;
        
        if (i < words.length - 2) {
          const phrase3 = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
          phraseFreq[phrase3] = (phraseFreq[phrase3] || 0) + 1;
        }
      }
    });
    
    const keyPhrases = Object.entries(phraseFreq)
      .filter(([_, freq]) => freq >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([phrase]) => phrase);
    
    const allText = chunks.join(' ');
    const hasNumbers = /\b\d+\b/.test(allText);
    const hasDates = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}/i.test(allText);
    
    return {
      totalWords,
      avgChunkLength: Math.round(avgChunkLength),
      keyPhrases,
      hasNumbers,
      hasDates,
    };
  }
  
  /**
   * Post-processes summaries to extract consolidated information
   */
  static consolidateSummaryMetadata(
    summaries: string[],
    levelMetadata: any
  ): {
    consolidatedKeywords: string[];
    mainThemes: string[];
    factCount: number;
  } {
    // Extract all unique keywords from summaries
    const allWords = summaries.join(' ').toLowerCase().match(/\b\w{4,}\b/g) || [];
    const wordFreq: { [key: string]: number } = {};
    
    allWords.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    const consolidatedKeywords = Object.entries(wordFreq)
      .filter(([_, freq]) => freq >= summaries.length / 2) // Words in at least half the summaries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word]) => word);
    
    // Identify main themes (simplified - looks for repeated phrases)
    const themePatterns = [
      /\b(main|primary|key|important|significant)\s+\w+/gi,
      /\b(focuses? on|deals? with|concerns?|about)\s+[\w\s]+/gi,
    ];
    
    const themes = new Set<string>();
    summaries.forEach(summary => {
      themePatterns.forEach(pattern => {
        const matches = summary.match(pattern) || [];
        matches.forEach(match => themes.add(match.toLowerCase()));
      });
    });
    
    // Count sentences that look like facts (contain numbers, dates, or specific claims)
    const factCount = summaries.reduce((count, summary) => {
      const sentences = summary.split(/[.!?]+/);
      const factualSentences = sentences.filter(s => 
        /\b\d+\b/.test(s) || // Contains numbers
        /\b(?:is|are|was|were|has|have|had)\b/i.test(s) // Contains factual verbs
      );
      return count + factualSentences.length;
    }, 0);
    
    return {
      consolidatedKeywords,
      mainThemes: Array.from(themes).slice(0, 5),
      factCount,
    };
  }
}

// Example usage in BitNet.node.ts:
/*
// In the recursive summary operation, after getting chunks:

if (enableIntermediate && chunks.length > 2) {
  // Group similar chunks
  const groups = IntermediateProcessor.groupChunksBySimilarity(
    chunks,
    summaryOptions.maxGroups || 5,
    summaryOptions.similarityThreshold || 0.7
  );
  
  // Extract metadata before summarization
  const chunkMetadata = IntermediateProcessor.extractChunkMetadata(chunks);
  
  // Process by groups
  for (const group of groups) {
    const mergedText = IntermediateProcessor.mergeGroupedChunks(chunks, group);
    // ... make API call to summarize mergedText
  }
  
  // After getting summaries, consolidate metadata
  const summaryMetadata = IntermediateProcessor.consolidateSummaryMetadata(
    summaries,
    { chunkMetadata, groups }
  );
  
  // Add to level metadata
  levels[currentLevel].metadata = {
    ...levels[currentLevel].metadata,
    processing: {
      grouped: true,
      groupCount: groups.length,
      ...chunkMetadata,
      ...summaryMetadata,
    }
  };
}
*/