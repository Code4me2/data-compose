import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IDataObject,
  NodeConnectionType,
  NodeOperationError,
} from 'n8n-workflow';

export class SummaryProcessor implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Summary Level Processor',
    name: 'summaryLevelProcessor',
    icon: 'fa:layer-group',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter.operation}}',
    description: 'Process summarization levels with semantic grouping, keyword extraction, and metadata enrichment',
    defaults: {
      name: 'Summary Processor',
    },
    inputs: [{ type: NodeConnectionType.Main }],
    outputs: [{ type: NodeConnectionType.Main }],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Semantic Grouping',
            value: 'semanticGrouping',
            description: 'Group chunks by semantic similarity before summarization',
            action: 'Group chunks semantically',
          },
          {
            name: 'Keyword Extraction',
            value: 'keywordExtraction',
            description: 'Extract and consolidate keywords from chunks',
            action: 'Extract keywords',
          },
          {
            name: 'Entity Recognition',
            value: 'entityRecognition',
            description: 'Extract named entities from chunks',
            action: 'Extract entities',
          },
          {
            name: 'Metadata Enrichment',
            value: 'metadataEnrichment',
            description: 'Add metadata and statistics to level data',
            action: 'Enrich metadata',
          },
          {
            name: 'Chunk Preprocessing',
            value: 'chunkPreprocessing',
            description: 'Prepare chunks for better summarization',
            action: 'Preprocess chunks',
          },
        ],
        default: 'semanticGrouping',
      },
      // Semantic Grouping Options
      {
        displayName: 'Grouping Method',
        name: 'groupingMethod',
        type: 'options',
        displayOptions: {
          show: {
            operation: ['semanticGrouping'],
          },
        },
        options: [
          {
            name: 'By Length Similarity',
            value: 'length',
            description: 'Group chunks with similar lengths',
          },
          {
            name: 'By Keyword Overlap',
            value: 'keywords',
            description: 'Group chunks sharing common keywords',
          },
          {
            name: 'By Topic Modeling',
            value: 'topics',
            description: 'Use simple topic detection',
          },
          {
            name: 'Fixed Size Groups',
            value: 'fixed',
            description: 'Create groups of fixed size',
          },
        ],
        default: 'keywords',
      },
      {
        displayName: 'Max Groups',
        name: 'maxGroups',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['semanticGrouping'],
          },
        },
        default: 5,
        description: 'Maximum number of groups to create',
      },
      {
        displayName: 'Min Group Size',
        name: 'minGroupSize',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['semanticGrouping'],
          },
        },
        default: 2,
        description: 'Minimum chunks per group',
      },
      // Keyword Extraction Options
      {
        displayName: 'Keywords Per Chunk',
        name: 'keywordsPerChunk',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['keywordExtraction'],
          },
        },
        default: 10,
        description: 'Maximum keywords to extract per chunk',
      },
      {
        displayName: 'Keyword Method',
        name: 'keywordMethod',
        type: 'options',
        displayOptions: {
          show: {
            operation: ['keywordExtraction'],
          },
        },
        options: [
          {
            name: 'Word Frequency',
            value: 'frequency',
            description: 'Extract most frequent words',
          },
          {
            name: 'TF-IDF',
            value: 'tfidf',
            description: 'Use TF-IDF scoring',
          },
          {
            name: 'N-grams',
            value: 'ngrams',
            description: 'Extract common phrases',
          },
        ],
        default: 'frequency',
      },
      // Entity Recognition Options
      {
        displayName: 'Entity Types',
        name: 'entityTypes',
        type: 'multiOptions',
        displayOptions: {
          show: {
            operation: ['entityRecognition'],
          },
        },
        options: [
          {
            name: 'People',
            value: 'people',
          },
          {
            name: 'Organizations',
            value: 'organizations',
          },
          {
            name: 'Locations',
            value: 'locations',
          },
          {
            name: 'Dates',
            value: 'dates',
          },
          {
            name: 'Numbers',
            value: 'numbers',
          },
        ],
        default: ['people', 'organizations'],
      },
      // Preprocessing Options
      {
        displayName: 'Preprocessing Actions',
        name: 'preprocessingActions',
        type: 'multiOptions',
        displayOptions: {
          show: {
            operation: ['chunkPreprocessing'],
          },
        },
        options: [
          {
            name: 'Add Context Headers',
            value: 'headers',
            description: 'Add section headers to chunks',
          },
          {
            name: 'Merge Short Chunks',
            value: 'mergeShort',
            description: 'Combine very short chunks',
          },
          {
            name: 'Split Long Chunks',
            value: 'splitLong',
            description: 'Break up overly long chunks',
          },
          {
            name: 'Remove Duplicates',
            value: 'deduplicate',
            description: 'Remove duplicate content',
          },
        ],
        default: ['headers'],
      },
      // Output Options
      {
        displayName: 'Output Format',
        name: 'outputFormat',
        type: 'options',
        options: [
          {
            name: 'Enhanced Level Data',
            value: 'enhanced',
            description: 'Original data with enhancements',
          },
          {
            name: 'Processed Chunks Only',
            value: 'chunks',
            description: 'Just the processed chunks',
          },
          {
            name: 'Metadata Only',
            value: 'metadata',
            description: 'Just the extracted metadata',
          },
          {
            name: 'Groups for Summarization',
            value: 'groups',
            description: 'Grouped text ready for summarization',
          },
        ],
        default: 'enhanced',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const operation = this.getNodeParameter('operation', 0) as string;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const inputData = item.json;
      
      // Validate input structure
      if (!inputData.chunks || !Array.isArray(inputData.chunks)) {
        throw new NodeOperationError(
          this.getNode(),
          'Input must contain a "chunks" array. This node processes output from recursive summarization.',
        );
      }

      let result: IDataObject = {};

      try {
        switch (operation) {
          case 'semanticGrouping':
            result = await this.performSemanticGrouping(inputData, i);
            break;
          case 'keywordExtraction':
            result = await this.performKeywordExtraction(inputData, i);
            break;
          case 'entityRecognition':
            result = await this.performEntityRecognition(inputData, i);
            break;
          case 'metadataEnrichment':
            result = await this.performMetadataEnrichment(inputData, i);
            break;
          case 'chunkPreprocessing':
            result = await this.performChunkPreprocessing(inputData, i);
            break;
        }

        // Format output based on preference
        const outputFormat = this.getNodeParameter('outputFormat', i) as string;
        let outputData: IDataObject;

        switch (outputFormat) {
          case 'enhanced':
            outputData = {
              ...inputData,
              ...result,
              processingApplied: operation,
            };
            break;
          case 'chunks':
            outputData = {
              chunks: result.processedChunks || inputData.chunks,
              metadata: result.metadata || {},
            };
            break;
          case 'metadata':
            outputData = result.metadata || {};
            break;
          case 'groups':
            outputData = {
              groups: result.groups || [],
              originalChunks: inputData.chunks,
            };
            break;
          default:
            outputData = result;
        }

        returnData.push({
          json: outputData,
          pairedItem: i,
        });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: error instanceof Error ? error.message : String(error),
              originalData: inputData,
            },
            pairedItem: i,
          });
        } else {
          throw error;
        }
      }
    }

    return [returnData];
  }

  private async performSemanticGrouping(data: IDataObject, itemIndex: number): Promise<IDataObject> {
    const chunks = data.chunks as string[];
    const method = this.getNodeParameter('groupingMethod', itemIndex) as string;
    const maxGroups = this.getNodeParameter('maxGroups', itemIndex) as number;
    const minGroupSize = this.getNodeParameter('minGroupSize', itemIndex) as number;

    const groups: Array<{
      indices: number[];
      theme: string;
      keywords: string[];
      combinedText: string;
    }> = [];

    switch (method) {
      case 'keywords':
        // Group by keyword overlap
        const chunkKeywords = chunks.map(chunk => this.extractSimpleKeywords(chunk));
        const processed = new Set<number>();
        
        for (let i = 0; i < chunks.length && groups.length < maxGroups; i++) {
          if (processed.has(i)) continue;
          
          const group = {
            indices: [i],
            theme: '',
            keywords: chunkKeywords[i],
            combinedText: chunks[i],
          };
          
          // Find similar chunks
          for (let j = i + 1; j < chunks.length; j++) {
            if (processed.has(j)) continue;
            
            const overlap = this.calculateKeywordOverlap(chunkKeywords[i], chunkKeywords[j]);
            if (overlap > 0.3) {
              group.indices.push(j);
              group.keywords = [...new Set([...group.keywords, ...chunkKeywords[j]])];
              group.combinedText += '\n\n' + chunks[j];
              processed.add(j);
            }
          }
          
          if (group.indices.length >= minGroupSize) {
            group.theme = `Group ${groups.length + 1}: ${group.keywords.slice(0, 3).join(', ')}`;
            groups.push(group);
            processed.add(i);
          }
        }
        
        // Add ungrouped chunks
        const ungrouped = chunks
          .map((_, idx) => idx)
          .filter(idx => !processed.has(idx));
        
        if (ungrouped.length > 0) {
          groups.push({
            indices: ungrouped,
            theme: 'Miscellaneous',
            keywords: [],
            combinedText: ungrouped.map(idx => chunks[idx]).join('\n\n'),
          });
        }
        break;

      case 'length':
        // Group by similar length
        const sortedIndices = chunks
          .map((chunk, idx) => ({ idx, length: chunk.length }))
          .sort((a, b) => a.length - b.length)
          .map(item => item.idx);
        
        const groupSize = Math.ceil(chunks.length / maxGroups);
        
        for (let i = 0; i < sortedIndices.length; i += groupSize) {
          const groupIndices = sortedIndices.slice(i, i + groupSize);
          const groupChunks = groupIndices.map(idx => chunks[idx]);
          const keywords = this.extractSimpleKeywords(groupChunks.join(' '));
          
          groups.push({
            indices: groupIndices,
            theme: `Length-based Group ${groups.length + 1}`,
            keywords: keywords.slice(0, 5),
            combinedText: groupChunks.join('\n\n'),
          });
        }
        break;

      case 'fixed':
      default:
        // Fixed size groups
        const fixedSize = Math.ceil(chunks.length / maxGroups);
        
        for (let i = 0; i < chunks.length; i += fixedSize) {
          const groupIndices = Array.from(
            { length: Math.min(fixedSize, chunks.length - i) },
            (_, j) => i + j
          );
          const groupChunks = groupIndices.map(idx => chunks[idx]);
          const keywords = this.extractSimpleKeywords(groupChunks.join(' '));
          
          groups.push({
            indices: groupIndices,
            theme: `Section ${groups.length + 1}`,
            keywords: keywords.slice(0, 5),
            combinedText: groupChunks.join('\n\n'),
          });
        }
    }

    return {
      groups,
      metadata: {
        operation: 'semanticGrouping',
        method,
        groupCount: groups.length,
        averageGroupSize: chunks.length / groups.length,
      },
    };
  }

  private async performKeywordExtraction(data: IDataObject, itemIndex: number): Promise<IDataObject> {
    const chunks = data.chunks as string[];
    const keywordsPerChunk = this.getNodeParameter('keywordsPerChunk', itemIndex) as number;
    const method = this.getNodeParameter('keywordMethod', itemIndex) as string;

    const chunkKeywords: string[][] = [];
    const globalKeywordFreq: { [key: string]: number } = {};

    for (const chunk of chunks) {
      let keywords: string[] = [];
      
      switch (method) {
        case 'frequency':
          keywords = this.extractSimpleKeywords(chunk, keywordsPerChunk);
          break;
        case 'ngrams':
          keywords = this.extractNGrams(chunk, keywordsPerChunk);
          break;
        case 'tfidf':
        default:
          // Simplified TF-IDF
          keywords = this.extractTFIDFKeywords(chunk, chunks, keywordsPerChunk);
      }
      
      chunkKeywords.push(keywords);
      keywords.forEach(kw => {
        globalKeywordFreq[kw] = (globalKeywordFreq[kw] || 0) + 1;
      });
    }

    // Get consolidated keywords
    const consolidatedKeywords = Object.entries(globalKeywordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, keywordsPerChunk * 2)
      .map(([kw]) => kw);

    return {
      chunkKeywords,
      consolidatedKeywords,
      keywordFrequency: globalKeywordFreq,
      metadata: {
        operation: 'keywordExtraction',
        method,
        totalUniqueKeywords: Object.keys(globalKeywordFreq).length,
        topKeywords: consolidatedKeywords.slice(0, 10),
      },
    };
  }

  private async performEntityRecognition(data: IDataObject, itemIndex: number): Promise<IDataObject> {
    const chunks = data.chunks as string[];
    const entityTypes = this.getNodeParameter('entityTypes', itemIndex) as string[];
    
    const entities: { [type: string]: Set<string> } = {};
    entityTypes.forEach(type => entities[type] = new Set());

    // Simple pattern-based entity extraction
    const patterns: { [type: string]: RegExp } = {
      people: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
      organizations: /\b(?:[A-Z][a-z]+ )+(?:Inc|Corp|LLC|Ltd|Company|Organization|Foundation)\b/g,
      locations: /\b(?:[A-Z][a-z]+ )+(?:City|State|Country|Street|Avenue|Road)\b/g,
      dates: /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4})\b/g,
      numbers: /\b\d+(?:\.\d+)?(?:%|k|K|M|B|million|billion)?\b/g,
    };

    chunks.forEach(chunk => {
      entityTypes.forEach(type => {
        if (patterns[type]) {
          const matches = chunk.match(patterns[type]) || [];
          matches.forEach(match => entities[type].add(match));
        }
      });
    });

    const entityResults: { [type: string]: string[] } = {};
    Object.entries(entities).forEach(([type, set]) => {
      entityResults[type] = Array.from(set).sort();
    });

    return {
      entities: entityResults,
      metadata: {
        operation: 'entityRecognition',
        entityTypes,
        totalEntities: Object.values(entityResults).reduce((sum, arr) => sum + arr.length, 0),
        entitiesPerType: Object.entries(entityResults).map(([type, arr]) => ({
          type,
          count: arr.length,
        })),
      },
    };
  }

  private async performMetadataEnrichment(data: IDataObject, itemIndex: number): Promise<IDataObject> {
    const chunks = data.chunks as string[];
    
    const metadata = {
      statistics: {
        chunkCount: chunks.length,
        totalLength: chunks.reduce((sum, c) => sum + c.length, 0),
        averageLength: Math.round(chunks.reduce((sum, c) => sum + c.length, 0) / chunks.length),
        minLength: Math.min(...chunks.map(c => c.length)),
        maxLength: Math.max(...chunks.map(c => c.length)),
        totalWords: chunks.reduce((sum, c) => sum + (c.match(/\b\w+\b/g) || []).length, 0),
        averageWords: Math.round(chunks.reduce((sum, c) => sum + (c.match(/\b\w+\b/g) || []).length, 0) / chunks.length),
      },
      contentAnalysis: {
        hasNumbers: chunks.some(c => /\b\d+\b/.test(c)),
        hasDates: chunks.some(c => /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(c)),
        hasQuestions: chunks.some(c => /\?/.test(c)),
        hasLists: chunks.some(c => /^\s*[-•*]\s/m.test(c)),
        averageSentences: Math.round(chunks.reduce((sum, c) => sum + (c.match(/[.!?]+/g) || []).length, 0) / chunks.length),
      },
      levelInfo: {
        level: data.level || 0,
        isFirstLevel: data.level === 0,
        timestamp: new Date().toISOString(),
      },
    };

    return {
      enrichedMetadata: metadata,
      metadata: {
        operation: 'metadataEnrichment',
        ...metadata,
      },
    };
  }

  private async performChunkPreprocessing(data: IDataObject, itemIndex: number): Promise<IDataObject> {
    const chunks = data.chunks as string[];
    const actions = this.getNodeParameter('preprocessingActions', itemIndex) as string[];
    
    let processedChunks = [...chunks];
    const appliedActions: string[] = [];

    if (actions.includes('headers')) {
      // Add context headers
      processedChunks = processedChunks.map((chunk, idx) => 
        `[Section ${idx + 1} of ${chunks.length}]\n${chunk}`
      );
      appliedActions.push('headers');
    }

    if (actions.includes('mergeShort')) {
      // Merge chunks shorter than 100 characters
      const merged: string[] = [];
      let currentMerge = '';
      
      processedChunks.forEach(chunk => {
        if (chunk.length < 100 && currentMerge) {
          currentMerge += '\n\n' + chunk;
        } else if (currentMerge) {
          merged.push(currentMerge);
          currentMerge = chunk;
        } else {
          currentMerge = chunk;
        }
      });
      
      if (currentMerge) merged.push(currentMerge);
      processedChunks = merged;
      appliedActions.push('mergeShort');
    }

    if (actions.includes('deduplicate')) {
      // Remove duplicate sentences
      const seen = new Set<string>();
      processedChunks = processedChunks.map(chunk => {
        const sentences = chunk.split(/[.!?]+/).filter(s => s.trim());
        const unique = sentences.filter(s => {
          const normalized = s.trim().toLowerCase();
          if (seen.has(normalized)) return false;
          seen.add(normalized);
          return true;
        });
        return unique.join('. ') + '.';
      });
      appliedActions.push('deduplicate');
    }

    return {
      processedChunks,
      metadata: {
        operation: 'chunkPreprocessing',
        appliedActions,
        originalCount: chunks.length,
        processedCount: processedChunks.length,
        reduction: chunks.length - processedChunks.length,
      },
    };
  }

  // Helper methods
  private extractSimpleKeywords(text: string, limit: number = 10): string[] {
    const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const freq: { [key: string]: number } = {};
    
    words.forEach(word => {
      if (!this.isStopWord(word)) {
        freq[word] = (freq[word] || 0) + 1;
      }
    });
    
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([word]) => word);
  }

  private extractNGrams(text: string, limit: number = 10): string[] {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const ngrams: { [key: string]: number } = {};
    
    // Extract 2-grams and 3-grams
    for (let i = 0; i < words.length - 1; i++) {
      if (!this.isStopWord(words[i])) {
        const bigram = `${words[i]} ${words[i + 1]}`;
        ngrams[bigram] = (ngrams[bigram] || 0) + 1;
        
        if (i < words.length - 2) {
          const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
          ngrams[trigram] = (ngrams[trigram] || 0) + 1;
        }
      }
    }
    
    return Object.entries(ngrams)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([ngram]) => ngram);
  }

  private extractTFIDFKeywords(text: string, allChunks: string[], limit: number = 10): string[] {
    const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const tf: { [key: string]: number } = {};
    const df: { [key: string]: number } = {};
    
    // Calculate term frequency for current text
    words.forEach(word => {
      if (!this.isStopWord(word)) {
        tf[word] = (tf[word] || 0) + 1;
      }
    });
    
    // Calculate document frequency across all chunks
    Object.keys(tf).forEach(word => {
      df[word] = allChunks.filter(chunk => 
        chunk.toLowerCase().includes(word)
      ).length;
    });
    
    // Calculate TF-IDF scores
    const tfidf: { [key: string]: number } = {};
    Object.entries(tf).forEach(([word, freq]) => {
      const idf = Math.log(allChunks.length / (df[word] || 1));
      tfidf[word] = freq * idf;
    });
    
    return Object.entries(tfidf)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([word]) => word);
  }

  private calculateKeywordOverlap(keywords1: string[], keywords2: string[]): number {
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have',
      'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you',
      'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they',
      'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one',
      'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out',
      'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when',
      'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
      'take', 'people', 'into', 'year', 'your', 'good', 'some',
      'could', 'them', 'see', 'other', 'than', 'then', 'now',
      'look', 'only', 'come', 'its', 'over', 'think', 'also',
      'back', 'after', 'use', 'two', 'how', 'our', 'work'
    ]);
    
    return stopWords.has(word.toLowerCase());
  }
}