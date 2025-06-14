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
    private defaultConfig: SummaryConfig = {
        maxChunkSize: 2048,
        overlapSize: 200,
        summaryRatio: 0.3,
        maxLevels: 3,
        preserveStructure: true,
        includeMetadata: true
    };

    constructor(private config: Partial<SummaryConfig> = {}) {
        this.config = { ...this.defaultConfig, ...config };
    }

    /**
     * Split text into overlapping chunks for better context preservation
     */
    splitIntoChunks(text: string, chunkSize: number = this.config.maxChunkSize!, overlap: number = this.config.overlapSize!): string[] {
        const chunks: string[] = [];
        const sentences = this.splitIntoSentences(text);
        let currentChunk = '';
        let overlapBuffer = '';

        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i];
            
            if ((currentChunk + sentence).length > chunkSize) {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                    
                    // Create overlap from the end of current chunk
                    const words = currentChunk.split(' ');
                    const overlapWords = Math.ceil(overlap / 5); // Approximate words
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

        if (currentChunk && currentChunk !== overlapBuffer) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }

    /**
     * Split text into sentences
     */
    private splitIntoSentences(text: string): string[] {
        // Improved sentence splitting that handles abbreviations
        const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
        return sentences.map(s => s.trim()).filter(s => s.length > 0);
    }

    /**
     * Generate summary prompt based on level and context
     */
    generateSummaryPrompt(text: string, level: number, context?: IDataObject): string {
        const prompts = [
            {
                // Level 0: Initial summary of raw text
                instruction: "Create a comprehensive summary of the following text. Preserve key facts, main ideas, and important details:",
                style: "detailed",
                targetRatio: 0.4
            },
            {
                // Level 1: Summary of summaries
                instruction: "Synthesize the following summaries into a cohesive overview. Maintain logical flow and highlight connections between ideas:",
                style: "analytical",
                targetRatio: 0.3
            },
            {
                // Level 2: High-level summary
                instruction: "Distill the following summary into key insights and main takeaways. Focus on the most important points:",
                style: "concise",
                targetRatio: 0.25
            },
            {
                // Level 3: Executive summary
                instruction: "Create a brief executive summary capturing the essence in a few key points:",
                style: "bullet-points",
                targetRatio: 0.15
            }
        ];

        const promptConfig = prompts[Math.min(level, prompts.length - 1)];
        const wordCount = text.split(' ').length;
        const targetWords = Math.floor(wordCount * promptConfig.targetRatio);

        let prompt = `${promptConfig.instruction}\n\n`;
        
        if (context?.topic) {
            prompt += `Topic: ${context.topic}\n`;
        }
        
        if (context?.format) {
            prompt += `Format: ${context.format}\n`;
        }
        
        prompt += `Target length: approximately ${targetWords} words\n`;
        prompt += `Style: ${promptConfig.style}\n\n`;
        prompt += `Text to summarize:\n${text}`;

        return prompt;
    }

    /**
     * Format hierarchical summaries for output
     */
    formatHierarchicalSummary(levels: SummaryLevel[]): IDataObject {
        const output: IDataObject = {
            timestamp: new Date().toISOString(),
            totalLevels: levels.length,
            structure: []
        };

        // Build hierarchical structure
        levels.forEach((level, index) => {
            const levelData: IDataObject = {
                level: index,
                chunkCount: level.chunks.length,
                summaryCount: level.summaries.length,
                totalInputLength: level.chunks.reduce((sum, chunk) => sum + chunk.length, 0),
                totalSummaryLength: level.summaries.reduce((sum, summary) => sum + summary.length, 0),
                compressionRatio: 0
            };

            if (levelData.totalInputLength as number > 0) {
                levelData.compressionRatio = 
                    ((levelData.totalSummaryLength as number) / (levelData.totalInputLength as number)).toFixed(2);
            }

            if (this.config.includeMetadata && level.metadata) {
                levelData.metadata = level.metadata;
            }

            output.structure = [...(output.structure as any[]), levelData];
        });

        // Add final summary if available
        if (levels.length > 0 && levels[levels.length - 1].summaries.length > 0) {
            output.finalSummary = levels[levels.length - 1].summaries.join('\n\n');
        }

        return output;
    }

    /**
     * Merge summaries intelligently to avoid redundancy
     */
    mergeSummaries(summaries: string[], overlap: boolean = true): string {
        if (summaries.length === 0) return '';
        if (summaries.length === 1) return summaries[0];

        // If overlap handling is enabled, try to detect and merge overlapping content
        if (overlap && this.config.overlapSize! > 0) {
            const merged: string[] = [summaries[0]];
            
            for (let i = 1; i < summaries.length; i++) {
                const current = summaries[i];
                const previous = merged[merged.length - 1];
                
                // Simple overlap detection based on ending/beginning similarity
                const overlapDetected = this.detectOverlap(previous, current);
                
                if (overlapDetected) {
                    // Merge with overlap removed
                    const mergedText = this.mergeWithOverlap(previous, current);
                    merged[merged.length - 1] = mergedText;
                } else {
                    merged.push(current);
                }
            }
            
            return merged.join('\n\n');
        }

        // Simple concatenation with paragraph breaks
        return summaries.join('\n\n');
    }

    /**
     * Detect potential overlap between two text segments
     */
    private detectOverlap(text1: string, text2: string): boolean {
        const words1 = text1.split(' ');
        const words2 = text2.split(' ');
        
        // Check if the end of text1 matches the beginning of text2
        const checkLength = Math.min(20, Math.floor(words1.length * 0.1), Math.floor(words2.length * 0.1));
        
        for (let i = checkLength; i > 3; i--) {
            const ending = words1.slice(-i).join(' ').toLowerCase();
            const beginning = words2.slice(0, i).join(' ').toLowerCase();
            
            if (ending === beginning) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Merge two text segments removing detected overlap
     */
    private mergeWithOverlap(text1: string, text2: string): string {
        const words1 = text1.split(' ');
        const words2 = text2.split(' ');
        
        let overlapLength = 0;
        const checkLength = Math.min(20, Math.floor(words1.length * 0.1), Math.floor(words2.length * 0.1));
        
        for (let i = checkLength; i > 3; i--) {
            const ending = words1.slice(-i).join(' ').toLowerCase();
            const beginning = words2.slice(0, i).join(' ').toLowerCase();
            
            if (ending === beginning) {
                overlapLength = i;
                break;
            }
        }
        
        if (overlapLength > 0) {
            return words1.join(' ') + ' ' + words2.slice(overlapLength).join(' ');
        }
        
        return text1 + ' ' + text2;
    }

    /**
     * Calculate token estimate for text
     */
    estimateTokens(text: string): number {
        // Rough estimation: 1 token ≈ 4 characters or 0.75 words
        const charCount = text.length;
        const wordCount = text.split(/\s+/).length;
        
        return Math.ceil(Math.max(charCount / 4, wordCount / 0.75));
    }

    /**
     * Validate if text needs chunking based on token estimate
     */
    needsChunking(text: string, maxTokens: number = 2048): boolean {
        return this.estimateTokens(text) > maxTokens * 0.8; // 80% threshold for safety
    }
}