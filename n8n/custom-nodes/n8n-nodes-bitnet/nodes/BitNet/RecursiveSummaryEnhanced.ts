import { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { SummaryLevel, SummaryConfig } from './RecursiveSummary';

export interface IntermediateProcessor {
  name: string;
  process: (level: SummaryLevel, context: IDataObject) => Promise<ProcessorResult>;
}

export interface ProcessorResult {
  enrichedLevel: SummaryLevel;
  metadata: IDataObject;
  semanticGroups?: SemanticGroup[];
}

export interface SemanticGroup {
  id: string;
  theme: string;
  chunkIndices: number[];
  keywords: string[];
  entities: string[];
  summary?: string;
}

export interface EnhancedSummaryConfig extends SummaryConfig {
  enableIntermediateProcessing: boolean;
  processors?: string[]; // Names of processors to use
  semanticGrouping?: {
    enabled: boolean;
    minSimilarity: number;
    maxGroups: number;
  };
  metadataExtraction?: {
    extractKeywords: boolean;
    extractEntities: boolean;
    extractDates: boolean;
    extractTopics: boolean;
  };
}

export class RecursiveSummaryEnhanced {
  private processors: Map<string, IntermediateProcessor> = new Map();
  
  constructor(private config: EnhancedSummaryConfig) {
    this.initializeDefaultProcessors();
  }

  private initializeDefaultProcessors() {
    // Semantic Grouping Processor
    this.registerProcessor({
      name: 'semantic-grouping',
      process: async (level: SummaryLevel, context: IDataObject) => {
        const groups = await this.performSemanticGrouping(level);
        return {
          enrichedLevel: this.mergeGroupsIntoLevel(level, groups),
          metadata: { groupCount: groups.length },
          semanticGroups: groups,
        };
      }
    });

    // Metadata Extraction Processor
    this.registerProcessor({
      name: 'metadata-extraction',
      process: async (level: SummaryLevel, context: IDataObject) => {
        const metadata = await this.extractMetadata(level);
        return {
          enrichedLevel: level,
          metadata,
        };
      }
    });

    // Keyword Consolidation Processor
    this.registerProcessor({
      name: 'keyword-consolidation',
      process: async (level: SummaryLevel, context: IDataObject) => {
        const keywords = await this.consolidateKeywords(level);
        level.metadata.consolidatedKeywords = keywords;
        return {
          enrichedLevel: level,
          metadata: { keywordCount: keywords.length },
        };
      }
    });
  }

  registerProcessor(processor: IntermediateProcessor) {
    this.processors.set(processor.name, processor);
  }

  async processWithIntermediates(
    text: string,
    summarizeFunction: (text: string, level: number) => Promise<string>,
    executeFunctions?: IExecuteFunctions
  ): Promise<IDataObject> {
    const levels: SummaryLevel[] = [];
    let currentText = text;
    let currentLevel = 0;
    const allMetadata: IDataObject[] = [];
    const allSemanticGroups: SemanticGroup[][] = [];

    while (currentLevel < this.config.maxLevels && this.needsChunking(currentText)) {
      // Split into chunks
      const chunks = this.splitIntoChunks(currentText);
      
      // Create initial level
      let level: SummaryLevel = {
        level: currentLevel,
        chunks,
        summaries: [],
        metadata: {
          chunkCount: chunks.length,
          totalLength: currentText.length,
        }
      };

      // Apply intermediate processors before summarization
      if (this.config.enableIntermediateProcessing && this.config.processors) {
        for (const processorName of this.config.processors) {
          const processor = this.processors.get(processorName);
          if (processor) {
            const result = await processor.process(level, { 
              previousLevels: levels,
              config: this.config 
            });
            
            level = result.enrichedLevel;
            allMetadata.push(result.metadata);
            
            if (result.semanticGroups) {
              allSemanticGroups.push(result.semanticGroups);
            }
          }
        }
      }

      // Perform summarization (potentially on grouped chunks)
      const summaries: string[] = [];
      if (level.metadata.semanticGroups) {
        // Summarize by semantic groups
        for (const group of level.metadata.semanticGroups as SemanticGroup[]) {
          const groupText = group.chunkIndices
            .map(i => chunks[i])
            .join('\n\n');
          const summary = await summarizeFunction(groupText, currentLevel);
          summaries.push(summary);
          group.summary = summary;
        }
      } else {
        // Traditional chunk-by-chunk summarization
        for (const chunk of chunks) {
          const summary = await summarizeFunction(chunk, currentLevel);
          summaries.push(summary);
        }
      }

      level.summaries = summaries;
      levels.push(level);

      // Prepare for next level
      currentText = this.mergeSummaries(summaries);
      currentLevel++;
    }

    // Final summary
    if (currentText.length < this.config.maxChunkSize) {
      const finalSummary = await summarizeFunction(currentText, currentLevel);
      levels.push({
        level: currentLevel,
        chunks: [currentText],
        summaries: [finalSummary],
        metadata: {
          chunkCount: 1,
          totalLength: currentText.length,
          summaryLength: finalSummary.length,
        }
      });
    }

    return this.formatEnhancedOutput(levels, allMetadata, allSemanticGroups);
  }

  private async performSemanticGrouping(level: SummaryLevel): Promise<SemanticGroup[]> {
    // Placeholder for semantic grouping logic
    // In real implementation, this would:
    // 1. Generate embeddings for each chunk
    // 2. Calculate similarity matrix
    // 3. Cluster similar chunks
    // 4. Extract common themes/keywords per cluster
    
    const groups: SemanticGroup[] = [];
    
    // Mock implementation
    const numGroups = Math.min(
      Math.ceil(level.chunks.length / 3),
      this.config.semanticGrouping?.maxGroups || 5
    );
    
    for (let i = 0; i < numGroups; i++) {
      groups.push({
        id: `group-${i}`,
        theme: `Theme ${i + 1}`,
        chunkIndices: level.chunks
          .map((_, idx) => idx)
          .filter(idx => idx % numGroups === i),
        keywords: [`keyword${i}1`, `keyword${i}2`],
        entities: [`entity${i}1`, `entity${i}2`],
      });
    }
    
    return groups;
  }

  private mergeGroupsIntoLevel(
    level: SummaryLevel, 
    groups: SemanticGroup[]
  ): SummaryLevel {
    // Reorganize chunks based on semantic groups
    const reorderedChunks: string[] = [];
    const groupMapping: IDataObject = {};
    
    groups.forEach((group, groupIdx) => {
      group.chunkIndices.forEach(chunkIdx => {
        reorderedChunks.push(level.chunks[chunkIdx]);
        groupMapping[reorderedChunks.length - 1] = {
          originalIndex: chunkIdx,
          groupId: group.id,
          theme: group.theme,
        };
      });
    });
    
    return {
      ...level,
      chunks: reorderedChunks,
      metadata: {
        ...level.metadata,
        semanticGroups: groups,
        chunkGroupMapping: groupMapping,
      }
    };
  }

  private async extractMetadata(level: SummaryLevel): Promise<IDataObject> {
    const metadata: IDataObject = {
      keywords: [],
      entities: [],
      dates: [],
      topics: [],
    };
    
    // Placeholder for metadata extraction
    // Real implementation would use NLP libraries or LLM calls
    
    if (this.config.metadataExtraction?.extractKeywords) {
      // Extract keywords from chunks
      metadata.keywords = ['sample', 'keywords'];
    }
    
    if (this.config.metadataExtraction?.extractEntities) {
      // Extract named entities
      metadata.entities = ['Entity1', 'Entity2'];
    }
    
    return metadata;
  }

  private async consolidateKeywords(level: SummaryLevel): Promise<string[]> {
    // Placeholder for keyword consolidation
    // Would aggregate keywords from all chunks and deduplicate
    return ['consolidated', 'keywords'];
  }

  private needsChunking(text: string): boolean {
    return text.length > this.config.maxChunkSize;
  }

  private splitIntoChunks(text: string): string[] {
    // Reuse existing implementation from RecursiveSummaryManager
    const chunks: string[] = [];
    const chunkSize = this.config.maxChunkSize;
    
    for (let i = 0; i < text.length; i += chunkSize - this.config.overlapSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    
    return chunks;
  }

  private mergeSummaries(summaries: string[]): string {
    return summaries.join('\n\n');
  }

  private formatEnhancedOutput(
    levels: SummaryLevel[],
    metadata: IDataObject[],
    semanticGroups: SemanticGroup[][]
  ): IDataObject {
    return {
      finalSummary: levels[levels.length - 1].summaries[0],
      levels: levels.map((level, idx) => ({
        ...level,
        processingMetadata: metadata.filter((_, mIdx) => 
          Math.floor(mIdx / (this.config.processors?.length || 1)) === idx
        ),
        semanticGroups: semanticGroups[idx] || [],
      })),
      aggregatedMetadata: this.aggregateMetadata(metadata),
      totalSemanticGroups: semanticGroups.flat(),
    };
  }

  private aggregateMetadata(metadata: IDataObject[]): IDataObject {
    // Aggregate all metadata across levels
    const aggregated: IDataObject = {
      totalKeywords: new Set<string>(),
      totalEntities: new Set<string>(),
      totalTopics: new Set<string>(),
    };
    
    metadata.forEach(m => {
      if (m.keywords) {
        (m.keywords as string[]).forEach(k => 
          (aggregated.totalKeywords as Set<string>).add(k)
        );
      }
      if (m.entities) {
        (m.entities as string[]).forEach(e => 
          (aggregated.totalEntities as Set<string>).add(e)
        );
      }
    });
    
    return {
      uniqueKeywords: Array.from(aggregated.totalKeywords as Set<string>),
      uniqueEntities: Array.from(aggregated.totalEntities as Set<string>),
      metadataCount: metadata.length,
    };
  }
}

// Export factory function for creating processors
export function createProcessor(
  name: string,
  processFunc: (level: SummaryLevel, context: IDataObject) => Promise<ProcessorResult>
): IntermediateProcessor {
  return { name, process: processFunc };
}