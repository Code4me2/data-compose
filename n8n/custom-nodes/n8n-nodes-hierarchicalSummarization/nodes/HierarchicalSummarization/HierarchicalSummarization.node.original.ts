import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
  IDataObject,
  NodeConnectionType,
  INodeInputConfiguration,
  INodeCredentialDescription,
} from 'n8n-workflow';

import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createReadStream } from 'fs';
import { Pool } from 'pg';

// Constants and interfaces
const CHARS_PER_TOKEN = 4;

interface HierarchicalDocument {
  id?: number;
  content: string;
  summary?: string;
  batch_id: string;
  hierarchy_level: number;
  parent_id?: number | null;
  child_ids?: number[];
  metadata?: IDataObject;
  created_at?: Date;
  updated_at?: Date;
}

interface ProcessingConfig {
  summaryPrompt: string;
  contextPrompt: string;
  batchSize: number;
  batchId: string;
}

interface DocumentChunk {
  content: string;
  index: number;
  parentDocumentId?: number;
  tokenCount: number;
  metadata?: any;
}

export class HierarchicalSummarization implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Hierarchical Summarization',
    name: 'hierarchicalSummarization',
    icon: 'file:hierarchicalSummarization.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Recursively summarize large document collections into a hierarchical structure',
    defaults: {
      name: 'Hierarchical Summarization',
    },
    // Define multiple input connections
    inputs: [
      NodeConnectionType.Main,
      {
        type: NodeConnectionType.AiLanguageModel,
        required: true,
        displayName: 'Language Model',
        maxConnections: 1,
      },
    ] as Array<NodeConnectionType | INodeInputConfiguration>,
    
    outputs: [NodeConnectionType.Main],
    
    credentials: [
      {
        name: 'postgres',
        required: false,
        displayOptions: {
          show: {
            databaseConfig: ['credentials'],
          },
        },
      },
    ] as INodeCredentialDescription[],
    
    properties: [
      {
        displayName: 'Summary Prompt',
        name: 'summaryPrompt',
        type: 'string',
        default: 'summarize the content between the two tokens <c></c> in two or less sentences',
        description: 'System prompt for AI summarization. Use <c></c> tokens to mark content boundaries.',
        typeOptions: {
          rows: 3,
        },
      },
      {
        displayName: 'Context Prompt',
        name: 'contextPrompt',
        type: 'string',
        default: '',
        placeholder: 'Add additional context or instructions...',
        description: 'Optional additional context to guide the AI model',
        typeOptions: {
          rows: 3,
        },
      },
      {
        displayName: 'Content Source',
        name: 'contentSource',
        type: 'options',
        options: [
          {
            name: 'Directory Path',
            value: 'directory',
          },
          {
            name: 'Previous Node Data',
            value: 'previousNode',
          },
        ],
        default: 'directory',
        description: 'Source of documents to process',
      },
      {
        displayName: 'Directory Path',
        name: 'directoryPath',
        type: 'string',
        default: '',
        placeholder: '/path/to/documents',
        description: 'Path to directory containing .txt files',
        displayOptions: {
          show: {
            contentSource: ['directory'],
          },
        },
        required: true,
      },
      {
        displayName: 'Batch Size (Tokens)',
        name: 'batchSize',
        type: 'number',
        default: 2048,
        description: 'Maximum tokens per chunk. Consider your AI model\'s context limit.',
        typeOptions: {
          minValue: 100,
          maxValue: 32768,
          numberStepSize: 256,
        },
      },
      {
        displayName: 'Database Configuration',
        name: 'databaseConfig',
        type: 'options',
        options: [
          {
            name: 'Use Credentials',
            value: 'credentials',
            description: 'Use PostgreSQL credentials configured in n8n',
          },
          {
            name: 'Manual Configuration',
            value: 'manual',
            description: 'Manually configure database connection parameters',
          },
        ],
        default: 'credentials',
        description: 'How to connect to the database for storing hierarchical data',
      },
      // Database parameters for when not using credentials
      {
        displayName: 'Database Host',
        name: 'dbHost',
        type: 'string',
        default: 'localhost',
        description: 'PostgreSQL database host',
        displayOptions: {
          show: {
            databaseConfig: ['manual'],
          },
        },
      },
      {
        displayName: 'Database Name',
        name: 'dbName',
        type: 'string',
        default: 'postgres',
        description: 'PostgreSQL database name',
        displayOptions: {
          show: {
            databaseConfig: ['manual'],
          },
        },
      },
      {
        displayName: 'Database User',
        name: 'dbUser',
        type: 'string',
        default: 'postgres',
        description: 'PostgreSQL user',
        displayOptions: {
          show: {
            databaseConfig: ['manual'],
          },
        },
      },
      {
        displayName: 'Database Password',
        name: 'dbPassword',
        type: 'string',
        typeOptions: {
          password: true,
        },
        default: '',
        description: 'PostgreSQL password',
        displayOptions: {
          show: {
            databaseConfig: ['manual'],
          },
        },
      },
      {
        displayName: 'Database Port',
        name: 'dbPort',
        type: 'number',
        default: 5432,
        description: 'PostgreSQL port',
        displayOptions: {
          show: {
            databaseConfig: ['manual'],
          },
        },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    
    // Create database pool ONCE for all items
    let pool: Pool | null = null;
    
    try {
      // Get database configuration from first item (assuming consistent config)
      const databaseConfig = this.getNodeParameter('databaseConfig', 0) as string;
      
      if (databaseConfig === 'credentials') {
        // Use n8n credentials
        const credentials = await this.getCredentials('postgres');
        pool = new Pool({
          host: credentials.host as string,
          port: credentials.port as number,
          database: credentials.database as string,
          user: credentials.user as string,
          password: credentials.password as string,
          max: 10,
          idleTimeoutMillis: 30000,
        });
      } else {
        // Use manual parameters from first item
        const dbHost = this.getNodeParameter('dbHost', 0) as string;
        const dbName = this.getNodeParameter('dbName', 0) as string;
        const dbUser = this.getNodeParameter('dbUser', 0) as string;
        const dbPassword = this.getNodeParameter('dbPassword', 0) as string;
        const dbPort = this.getNodeParameter('dbPort', 0) as number;
        
        pool = new Pool({
          host: dbHost,
          port: dbPort,
          database: dbName,
          user: dbUser,
          password: dbPassword,
          max: 10,
          idleTimeoutMillis: 30000,
        });
      }
      
      // Ensure database schema exists ONCE
      try {
        await ensureDatabaseSchema(pool);
      } catch (error) {
        throw new NodeOperationError(
          this.getNode(),
          `Failed to create database schema: ${error.message}. Ensure the database user has CREATE TABLE privileges.`
        );
      }
      
      // Process each item
      for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
        let client: any;
        
        try {
          // Extract parameters for this item
          const summaryPrompt = this.getNodeParameter('summaryPrompt', itemIndex) as string;
          const contextPrompt = this.getNodeParameter('contextPrompt', itemIndex) as string;
          const contentSource = this.getNodeParameter('contentSource', itemIndex) as string;
          const batchSize = this.getNodeParameter('batchSize', itemIndex) as number;
          
          // Validate batch size
          if (batchSize > 32768) {
            throw new NodeOperationError(
              this.getNode(),
              `Batch size ${batchSize} exceeds maximum safe limit of 32768 tokens`,
              { itemIndex }
            );
          }
          
          if (batchSize < 100) {
            throw new NodeOperationError(
              this.getNode(),
              `Batch size ${batchSize} is too small. Minimum is 100 tokens.`,
              { itemIndex }
            );
          }
          
          // Generate unique batch ID with validation
          const batchId = uuidv4();
          
          // Validate UUID format for extra security
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(batchId)) {
            throw new Error('Invalid batch ID generated');
          }
          
          // Initialize processing configuration
          const config: ProcessingConfig = {
            summaryPrompt,
            contextPrompt,
            batchSize,
            batchId,
          };
          
          // Process based on content source
          let documentsToProcess: Array<{name: string, content: string}> = [];
          
          if (contentSource === 'directory') {
            const directoryPath = this.getNodeParameter('directoryPath', itemIndex) as string;
            
            // Validate directory path (security check)
            if (!directoryPath || directoryPath.includes('..')) {
              throw new NodeOperationError(
                this.getNode(),
                'Invalid directory path. Path traversal is not allowed.',
                { itemIndex }
              );
            }
            
            // Validate directory exists
            try {
              const stats = await fs.stat(directoryPath);
              if (!stats.isDirectory()) {
                throw new Error(`Path ${directoryPath} is not a directory`);
              }
            } catch (error) {
              throw new NodeOperationError(
                this.getNode(),
                `Cannot access directory: ${error.message}`,
                { itemIndex }
              );
            }
            
            // Read all .txt files from directory
            documentsToProcess = await readTextFilesFromDirectory(directoryPath);
            
            if (documentsToProcess.length === 0) {
              throw new NodeOperationError(
                this.getNode(),
                `No .txt files found in directory: ${directoryPath}`,
                { itemIndex }
              );
            }
            
          } else if (contentSource === 'previousNode') {
            // Extract text content from previous node's output
            const item = items[itemIndex];
            if (item.json.content) {
              documentsToProcess.push({
                name: `document_${itemIndex}`,
                content: item.json.content as string,
              });
            } else {
              throw new NodeOperationError(
                this.getNode(),
                'No content field found in input data',
                { itemIndex }
              );
            }
          }
          
          // Log processing start
          console.log(`Starting hierarchical summarization for batch ${batchId}`);
          console.log(`Processing ${documentsToProcess.length} documents with ${batchSize} token chunks`);
          
          // Get client from pool and begin transaction
          client = await pool.connect();
          await client.query('BEGIN');
          
          try {
            // Step 1: Index all documents at hierarchy level 0
            await indexDocuments(
              client,
              documentsToProcess,
              config
            );
            
            // Step 2: Begin recursive summarization
            const finalSummary = await performHierarchicalSummarization(
              client,
              config,
              this // Pass the execution context for AI model access
            );
            
            await client.query('COMMIT');
            
            // Prepare output
            returnData.push({
              json: {
                batchId,
                finalSummary: finalSummary.summary,
                totalDocuments: documentsToProcess.length,
                hierarchyDepth: finalSummary.hierarchy_level,
                processingComplete: true,
              },
              pairedItem: { item: itemIndex },
            });
            
          } catch (error) {
            await client.query('ROLLBACK');
            throw error;
          } finally {
            // Always release the client back to the pool
            if (client) {
              client.release();
            }
          }
          
        } catch (error) {
          // Item-specific error handling
          if (error instanceof NodeOperationError) {
            throw error;
          }
          throw new NodeOperationError(
            this.getNode(),
            `Hierarchical summarization failed for item ${itemIndex}: ${error.message}`,
            { itemIndex }
          );
        }
      }
      
    } finally {
      // Clean up pool after ALL items are processed
      if (pool) {
        await pool.end();
      }
    }
    
    return [returnData];
  }
}

// Helper functions

async function ensureDatabaseSchema(pool: Pool): Promise<void> {
  
  const schemaSQL = `
    -- Main documents table with hierarchy tracking
    CREATE TABLE IF NOT EXISTS hierarchical_documents (
      id SERIAL PRIMARY KEY,
      content TEXT NOT NULL,
      summary TEXT,
      batch_id VARCHAR(255) NOT NULL,
      hierarchy_level INTEGER NOT NULL,
      parent_id INTEGER REFERENCES hierarchical_documents(id) ON DELETE CASCADE,
      child_ids INTEGER[] DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      token_count INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_batch_level 
      ON hierarchical_documents(batch_id, hierarchy_level);
    CREATE INDEX IF NOT EXISTS idx_parent 
      ON hierarchical_documents(parent_id);
    
    -- Processing status tracking
    CREATE TABLE IF NOT EXISTS processing_status (
      id SERIAL PRIMARY KEY,
      batch_id VARCHAR(255) UNIQUE NOT NULL,
      current_level INTEGER NOT NULL DEFAULT 0,
      total_documents INTEGER,
      processed_documents INTEGER DEFAULT 0,
      status VARCHAR(50) NOT NULL DEFAULT 'processing',
      error_message TEXT,
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP
    );
  `;
  
  await pool.query(schemaSQL);
}

async function readTextFilesFromDirectory(
  directoryPath: string
): Promise<Array<{name: string, content: string}>> {
  const files: Array<{name: string, content: string}> = [];
  
  // Read directory contents
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  
  // Filter for .txt files only
  const textFiles = entries.filter(
    entry => entry.isFile() && path.extname(entry.name).toLowerCase() === '.txt'
  );
  
  if (textFiles.length === 0) {
    throw new Error(`No .txt files found in directory ${directoryPath}`);
  }
  
  // Read each file
  for (const file of textFiles) {
    const filePath = path.join(directoryPath, file.name);
    
    // Check file size to determine reading strategy
    const stats = await fs.stat(filePath);
    
    if (stats.size > 50 * 1024 * 1024) { // 50MB threshold
      // Use streaming for large files
      const content = await readLargeFile(filePath);
      files.push({ name: file.name, content });
    } else {
      // Read smaller files directly
      const content = await fs.readFile(filePath, 'utf-8');
      files.push({ name: file.name, content });
    }
  }
  
  return files;
}

async function readLargeFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = [];
    const stream = createReadStream(filePath, { encoding: 'utf-8' });
    
    let errorOccurred = false;
    
    stream.on('data', (chunk) => {
      if (!errorOccurred) {
        chunks.push(chunk.toString());
      }
    });
    
    stream.on('end', () => {
      if (!errorOccurred) {
        resolve(chunks.join(''));
      }
    });
    
    stream.on('error', (error) => {
      errorOccurred = true;
      stream.destroy(); // Clean up the stream
      reject(new Error(`Failed to read file ${filePath}: ${error.message}`));
    });
  });
}

async function indexDocuments(
  client: any,
  documents: Array<{name: string, content: string}>,
  config: ProcessingConfig
): Promise<number[]> {
  const documentIds: number[] = [];
  
  // Insert processing status record
  await client.query(
    `INSERT INTO processing_status (batch_id, total_documents, status) 
     VALUES ($1, $2, 'processing')`,
    [config.batchId, documents.length]
  );
  
  // Index each document
  for (const doc of documents) {
    const tokenCount = estimateTokenCount(doc.content);
    
    const result = await client.query(
      `INSERT INTO hierarchical_documents 
       (content, batch_id, hierarchy_level, token_count, metadata) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id`,
      [
        doc.content,
        config.batchId,
        0, // Hierarchy level 0 for source documents
        tokenCount,
        JSON.stringify({ filename: doc.name })
      ]
    );
    
    documentIds.push(result.rows[0].id);
    
    // Log progress
    console.log(`Indexed document ${doc.name} (${tokenCount} tokens)`);
  }
  
  return documentIds;
}

function estimateTokenCount(text: string): number {
  // Remove excessive whitespace for more accurate count
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  return Math.ceil(normalizedText.length / CHARS_PER_TOKEN);
}

async function performHierarchicalSummarization(
  client: any,
  config: ProcessingConfig,
  executeFunctions: IExecuteFunctions
): Promise<HierarchicalDocument> {
  let currentLevel = 0;
  let continueProcessing = true;
  
  while (continueProcessing) {
    // Get all documents at current level
    const documentsResult = await client.query(
      `SELECT * FROM hierarchical_documents 
       WHERE batch_id = $1 AND hierarchy_level = $2 
       ORDER BY id`,
      [config.batchId, currentLevel]
    );
    
    const documents = documentsResult.rows as HierarchicalDocument[];
    
    if (documents.length === 0) {
      throw new Error(`No documents found at level ${currentLevel}`);
    }
    
    // If only one document remains, we've reached the top
    if (documents.length === 1) {
      console.log(`Final summary reached at level ${currentLevel}`);
      
      // Update processing status
      await client.query(
        `UPDATE processing_status 
         SET status = 'completed', completed_at = CURRENT_TIMESTAMP, current_level = $1 
         WHERE batch_id = $2`,
        [currentLevel, config.batchId]
      );
      
      return documents[0];
    }
    
    // Process documents at this level to create next level
    console.log(`Processing ${documents.length} documents at level ${currentLevel}`);
    
    await processLevel(
      client,
      documents,
      config,
      currentLevel + 1,
      executeFunctions
    );
    
    // Update progress
    await client.query(
      `UPDATE processing_status 
       SET current_level = $1, processed_documents = processed_documents + $2 
       WHERE batch_id = $3`,
      [currentLevel + 1, documents.length, config.batchId]
    );
    
    currentLevel++;
    
    // Safety check to prevent infinite loops
    if (currentLevel > 20) {
      throw new Error('Maximum hierarchy depth (20) exceeded');
    }
  }
  
  throw new Error('Summarization did not converge to single document');
}

async function processLevel(
  client: any,
  documents: HierarchicalDocument[],
  config: ProcessingConfig,
  nextLevel: number,
  executeFunctions: IExecuteFunctions
): Promise<HierarchicalDocument[]> {
  const summaries: HierarchicalDocument[] = [];
  
  // Calculate available tokens for content after accounting for prompts
  const promptTokens = estimateTokenCount(
    config.summaryPrompt + (config.contextPrompt || '')
  );
  const contentTokenBudget = config.batchSize - promptTokens - 100; // Safety buffer
  
  if (contentTokenBudget < 100) {
    throw new Error(`Batch size ${config.batchSize} too small for prompts`);
  }
  
  // Group documents into batches based on token count
  const batches: HierarchicalDocument[][] = [];
  let currentBatch: HierarchicalDocument[] = [];
  let currentBatchTokens = 0;
  
  for (const doc of documents) {
    const docContent = doc.summary || doc.content;
    const docTokens = estimateTokenCount(docContent);
    
    // If single document exceeds budget, process it separately with chunking
    if (docTokens > contentTokenBudget) {
      // Flush current batch if it has documents
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [];
        currentBatchTokens = 0;
      }
      
      // Process oversized document with chunking
      const chunks = await chunkDocument(doc, config);
      let previousSummary: string | null = null;
      const chunkSummaries: string[] = [];
      
      for (const chunk of chunks) {
        const summary = await summarizeChunk(chunk, previousSummary, config, executeFunctions);
        chunkSummaries.push(summary);
        previousSummary = summary;
      }
      
      const combinedSummary = chunkSummaries.join(' ');
      const newDoc = await createSummaryDocument(
        client,
        combinedSummary,
        doc.id!,
        config,
        nextLevel
      );
      
      summaries.push(newDoc);
      continue;
    }
    
    // Check if adding this document would exceed the batch size
    if (currentBatchTokens + docTokens > contentTokenBudget && currentBatch.length > 0) {
      // Flush current batch
      batches.push(currentBatch);
      currentBatch = [];
      currentBatchTokens = 0;
    }
    
    // Add document to current batch
    currentBatch.push(doc);
    currentBatchTokens += docTokens;
  }
  
  // Flush remaining batch
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }
  
  // Process each batch
  for (const batch of batches) {
    if (batch.length === 1) {
      // Single document in batch - summarize directly
      const doc = batch[0];
      const docContent = doc.summary || doc.content;
      const chunk: DocumentChunk = {
        content: docContent,
        index: 0,
        tokenCount: estimateTokenCount(docContent),
        metadata: doc.metadata
      };
      
      const summary = await summarizeChunk(chunk, null, config, executeFunctions);
      const newDoc = await createSummaryDocument(
        client,
        summary,
        doc.id!,
        config,
        nextLevel
      );
      
      summaries.push(newDoc);
    } else {
      // Multiple documents in batch - combine and summarize
      const combinedContent = batch.map(doc => {
        const content = doc.summary || doc.content;
        const source = doc.metadata?.source || 'unknown';
        return `[Document: ${source}]\n${content}`;
      }).join('\n\n');
      
      // Create metadata that references all parent documents
      const combinedMetadata = {
        sources: batch.map(doc => doc.metadata?.source || 'unknown'),
        parentIds: batch.map(doc => doc.id),
        documentCount: batch.length
      };
      
      const chunk: DocumentChunk = {
        content: combinedContent,
        index: 0,
        tokenCount: estimateTokenCount(combinedContent),
        metadata: combinedMetadata
      };
      
      const summary = await summarizeChunk(chunk, null, config, executeFunctions);
      
      // Create summary document with multiple parent references
      const newDoc = await createBatchSummaryDocument(
        client,
        summary,
        batch.map(doc => doc.id!),
        config,
        nextLevel,
        combinedMetadata
      );
      
      summaries.push(newDoc);
    }
  }
  
  return summaries;
}

async function chunkDocument(
  document: HierarchicalDocument,
  config: ProcessingConfig
): Promise<DocumentChunk[]> {
  const content = document.summary || document.content;
  const chunks: DocumentChunk[] = [];
  
  // Calculate available tokens after accounting for prompts
  const promptTokens = estimateTokenCount(
    config.summaryPrompt + (config.contextPrompt || '')
  );
  const contentTokenBudget = config.batchSize - promptTokens - 50; // 50 token safety buffer
  
  if (contentTokenBudget < 100) {
    throw new Error(`Batch size ${config.batchSize} too small for prompts`);
  }
  
  // Split content into sentences for clean chunking
  const sentences = splitIntoSentences(content);
  
  let currentChunk: string[] = [];
  let currentTokens = 0;
  let chunkIndex = 0;
  
  for (const sentence of sentences) {
    const sentenceTokens = estimateTokenCount(sentence);
    
    if (currentTokens + sentenceTokens > contentTokenBudget && currentChunk.length > 0) {
      // Current chunk is full - save it
      chunks.push({
        content: currentChunk.join(' '),
        index: chunkIndex++,
        parentDocumentId: document.id,
        tokenCount: currentTokens,
      });
      
      currentChunk = [sentence];
      currentTokens = sentenceTokens;
    } else {
      currentChunk.push(sentence);
      currentTokens += sentenceTokens;
    }
  }
  
  // Add final chunk
  if (currentChunk.length > 0) {
    chunks.push({
      content: currentChunk.join(' '),
      index: chunkIndex,
      parentDocumentId: document.id,
      tokenCount: currentTokens,
    });
  }
  
  return chunks;
}

function splitIntoSentences(text: string): string[] {
  // Basic sentence splitting - handles common cases
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  return sentences.map(s => s.trim()).filter(s => s.length > 0);
}

async function summarizeChunk(
  chunk: DocumentChunk,
  previousSummary: string | null,
  config: ProcessingConfig,
  executeFunctions: IExecuteFunctions
): Promise<string> {
  // Build the complete prompt
  let systemPrompt = config.summaryPrompt;
  if (config.contextPrompt) {
    systemPrompt += `\n\nAdditional context: ${config.contextPrompt}`;
  }
  
  // Build the content with context from previous summary
  let userContent = '';
  if (previousSummary) {
    userContent = `Previous summary: ${previousSummary}\n\n`;
  }
  userContent += `<c>${chunk.content}</c>`;
  
  try {
    // Get the AI language model from the connected sub-node
    const languageModel = (await executeFunctions.getInputConnectionData(
      NodeConnectionType.AiLanguageModel,
      0
    )) as any;

    if (!languageModel) {
      throw new Error('No language model connected. Please connect an AI language model to this node.');
    }

    // Call the language model
    const response = await languageModel.invoke({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      options: {
        temperature: 0.3,
        maxTokensToSample: 150,
      }
    });

    // Extract the summary from response
    let summary = '';
    
    // Handle different response formats from various AI models
    if (typeof response === 'string') {
      summary = response;
    } else if (response && typeof response === 'object') {
      // Try common response properties
      summary = response.text || 
                response.content || 
                response.message?.content ||
                response.choices?.[0]?.message?.content ||
                response.choices?.[0]?.text ||
                '';
    }
    
    if (!summary) {
      throw new Error('No text content in language model response');
    }

    return summary.trim();
    
  } catch (error) {
    console.error('Error calling language model:', error);
    
    // Better fallback: Extract key sentences from the chunk
    const sentences = chunk.content.match(/[^.!?]+[.!?]+/g) || [];
    const keyContent = sentences.slice(0, 2).join(' ').trim() || chunk.content.substring(0, 200);
    
    return `[AI Unavailable] Key content from chunk ${chunk.index}: ${keyContent}...`;
  }
}

async function createSummaryDocument(
  client: any,
  summary: string,
  parentId: number,
  config: ProcessingConfig,
  hierarchyLevel: number
): Promise<HierarchicalDocument> {
  // Insert the summary document
  const result = await client.query(
    `INSERT INTO hierarchical_documents 
     (content, summary, batch_id, hierarchy_level, parent_id, token_count) 
     VALUES ($1, $2, $3, $4, $5, $6) 
     RETURNING *`,
    [
      '', // Empty content since this is a summary
      summary,
      config.batchId,
      hierarchyLevel,
      parentId,
      estimateTokenCount(summary)
    ]
  );
  
  const newDoc = result.rows[0] as HierarchicalDocument;
  
  // Update parent's child_ids array
  await client.query(
    `UPDATE hierarchical_documents 
     SET child_ids = array_append(child_ids, $1), updated_at = CURRENT_TIMESTAMP 
     WHERE id = $2`,
    [newDoc.id, parentId]
  );
  
  return newDoc;
}

async function createBatchSummaryDocument(
  client: any,
  summary: string,
  parentIds: number[],
  config: ProcessingConfig,
  hierarchyLevel: number,
  metadata: any
): Promise<HierarchicalDocument> {
  // Insert the summary document with metadata
  const result = await client.query(
    `INSERT INTO hierarchical_documents 
     (content, summary, batch_id, hierarchy_level, parent_id, token_count, metadata) 
     VALUES ($1, $2, $3, $4, $5, $6, $7) 
     RETURNING *`,
    [
      '', // Empty content since this is a summary
      summary,
      config.batchId,
      hierarchyLevel,
      parentIds[0], // Primary parent for compatibility
      estimateTokenCount(summary),
      JSON.stringify(metadata)
    ]
  );
  
  const newDoc = result.rows[0] as HierarchicalDocument;
  
  // Update all parent documents' child_ids arrays
  for (const parentId of parentIds) {
    await client.query(
      `UPDATE hierarchical_documents 
       SET child_ids = array_append(child_ids, $1), updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [newDoc.id, parentId]
    );
  }
  
  return newDoc;
}