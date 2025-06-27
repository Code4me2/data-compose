import { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { RecursiveSummaryManager, SummaryLevel, SummaryConfig } from './RecursiveSummary';

export interface ProcessorHook {
  beforeSummarization?: (chunks: string[], level: number, metadata: IDataObject) => Promise<{
    chunks: string[];
    metadata: IDataObject;
    grouping?: Array<{ indices: number[]; theme?: string }>;
  }>;
  
  afterSummarization?: (summaries: string[], level: number, metadata: IDataObject) => Promise<{
    summaries: string[];
    metadata: IDataObject;
  }>;
}

export class RecursiveSummaryAdapter {
  private baseManager: RecursiveSummaryManager;
  private hooks: ProcessorHook = {};
  
  constructor(config?: Partial<SummaryConfig>) {
    this.baseManager = new RecursiveSummaryManager(config);
  }
  
  setProcessorHooks(hooks: ProcessorHook) {
    this.hooks = hooks;
  }
  
  // Delegate all existing methods to maintain compatibility
  splitIntoChunks(text: string, chunkSize?: number, overlap?: number): string[] {
    return this.baseManager.splitIntoChunks(text, chunkSize, overlap);
  }
  
  generateSummaryPrompt(text: string, level: number, context?: IDataObject): string {
    return this.baseManager.generateSummaryPrompt(text, level, context);
  }
  
  formatHierarchicalSummary(levels: SummaryLevel[]): IDataObject {
    return this.baseManager.formatHierarchicalSummary(levels);
  }
  
  mergeSummaries(summaries: string[], overlap: boolean = false): string {
    return this.baseManager.mergeSummaries(summaries, overlap);
  }
  
  estimateTokens(text: string): number {
    return this.baseManager.estimateTokens(text);
  }
  
  needsChunking(text: string, maxTokens: number = 2048): boolean {
    return this.baseManager.needsChunking(text, maxTokens);
  }
  
  // Enhanced method with optional processing hooks
  async processWithHooks(
    chunks: string[],
    level: number,
    summarizeFunc: (chunk: string) => Promise<string>
  ): Promise<{ summaries: string[]; metadata: IDataObject }> {
    let processedChunks = chunks;
    let metadata: IDataObject = {};
    let grouping: Array<{ indices: number[]; theme?: string }> | undefined;
    
    // Apply pre-processing hook if available
    if (this.hooks.beforeSummarization) {
      const result = await this.hooks.beforeSummarization(chunks, level, metadata);
      processedChunks = result.chunks;
      metadata = { ...metadata, ...result.metadata };
      grouping = result.grouping;
    }
    
    // Perform summarization
    let summaries: string[] = [];
    
    if (grouping) {
      // Summarize by groups
      for (const group of grouping) {
        const groupText = group.indices
          .map(i => chunks[i])
          .join('\n\n');
        const summary = await summarizeFunc(groupText);
        summaries.push(summary);
        
        // Store group info in metadata
        if (!metadata.groups) metadata.groups = [];
        (metadata.groups as any[]).push({
          ...group,
          summary: summary.substring(0, 100) + '...' // Preview
        });
      }
    } else {
      // Traditional chunk-by-chunk
      for (const chunk of processedChunks) {
        summaries.push(await summarizeFunc(chunk));
      }
    }
    
    // Apply post-processing hook if available
    if (this.hooks.afterSummarization) {
      const result = await this.hooks.afterSummarization(summaries, level, metadata);
      summaries = result.summaries;
      metadata = { ...metadata, ...result.metadata };
    }
    
    return { summaries, metadata };
  }
}