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
          idleTimeoutMillis: 60000, // Increased from 30s to 60s for longer processing
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
          idleTimeoutMillis: 60000, // Increased timeout
        });
      }
      
      // Ensure database schema exists ONCE
      try {
        await ensureDatabaseSchema(pool);
      } catch (error) {
        throw new NodeOperationError(
          this.getNode(),
          `Failed to create database schema: ${error.message}. Please ensure the database user has CREATE TABLE privileges and the database is accessible.`
        );
      }
      
      // Process each item
      for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
        let client: any;
        
        try {
          // Get client from pool and begin transaction EARLY
          client = await pool.connect();
          await client.query('BEGIN');
          
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
                `Batch size ${batchSize} exceeds maximum safe limit of 32768 tokens. Please reduce the batch size.`,
                { itemIndex }
              );
            }
            
            if (batchSize < 100) {
              throw new NodeOperationError(
                this.getNode(),
                `Batch size ${batchSize} is too small. Minimum is 100 tokens to accommodate prompts.`,
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
              
              // Improved directory path validation
              const resolvedPath = path.resolve(directoryPath);
              const normalizedPath = path.normalize(resolvedPath);
              
              // Security check - ensure path doesn't escape intended boundaries
              if (normalizedPath !== resolvedPath || directoryPath.includes('..')) {
                throw new NodeOperationError(
                  this.getNode(),
                  'Invalid directory path. Path traversal attempts are not allowed for security reasons.',
                  { itemIndex }
                );
              }
              
              // Validate directory exists
              try {
                const stats = await fs.stat(normalizedPath);
                if (!stats.isDirectory()) {
                  throw new Error(`Path "${normalizedPath}" exists but is not a directory`);
                }
              } catch (error) {
                throw new NodeOperationError(
                  this.getNode(),
                  `Cannot access directory "${directoryPath}": ${error.message}. Please ensure the directory exists and is readable.`,
                  { itemIndex }
                );
              }
              
              // Read all .txt files from directory
              documentsToProcess = await readTextFilesFromDirectory(normalizedPath);
              
              if (documentsToProcess.length === 0) {
                throw new NodeOperationError(
                  this.getNode(),
                  `No .txt files found in directory: ${directoryPath}. Please ensure the directory contains .txt files to process.`,
                  { itemIndex }
                );
              }
              
            } else if (contentSource === 'previousNode') {
              // IMPROVED: Extract text content from previous node's output with better field detection
              const item = items[itemIndex];
              const textContent = extractTextContent(item);
              
              if (!textContent) {
                throw new NodeOperationError(
                  this.getNode(),
                  'No text content found in input data. The node expects one of these fields: content, text, data, message, body, description, value, output, or result.',
                  { itemIndex }
                );
              }
              
              documentsToProcess.push({
                name: `document_${itemIndex}`,
                content: textContent,
              });
            }
            
            // Processing will start
            
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
          // Item-specific error handling with better messages
          if (error instanceof NodeOperationError) {
            throw error;
          }
          
          // Provide more helpful error messages
          let errorMessage = error.message;
          if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Database connection refused. Please check that PostgreSQL is running and accessible.';
          } else if (error.code === '28P01') {
            errorMessage = 'Database authentication failed. Please check your PostgreSQL credentials.';
          } else if (error.code === '3D000') {
            errorMessage = 'Database does not exist. Please create the database first.';
          }
          
          throw new NodeOperationError(
            this.getNode(),
            `Hierarchical summarization failed for item ${itemIndex}: ${errorMessage}`,
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

// IMPROVED: Helper function to extract text content from various n8n input formats
function extractTextContent(item: INodeExecutionData): string | null {
  if (!item.json) return null;
  
  // Priority order for field checking - most common fields first
  const fieldPriority = [
    'content', 'text', 'data', 'message', 'body', 
    'description', 'value', 'output', 'result', 'html'
  ];
  
  for (const field of fieldPriority) {
    const value = item.json[field];
    if (value && typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  
  // Check for HTML with text fallback
  if (item.json.html && item.json.text) {
    const textValue = item.json.text;
    if (typeof textValue === 'string' && textValue.trim()) {
      return textValue;
    }
  }
  
  // Check for nested content in common structures
  if (typeof item.json.response === 'object' && item.json.response && 'content' in item.json.response) {
    const content = (item.json.response as any).content;
    if (typeof content === 'string' && content.trim()) {
      return content;
    }
  }
  
  if (typeof item.json.payload === 'object' && item.json.payload && 'text' in item.json.payload) {
    const text = (item.json.payload as any).text;
    if (typeof text === 'string' && text.trim()) {
      return text;
    }
  }
  
  // Check binary data for text content
  if (item.binary && Object.keys(item.binary).length > 0) {
    // Note: Binary processing would need to be implemented based on requirements
  }
  
  return null;
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
  const startTime = Date.now();
  const maxExecutionTime = 5 * 60 * 1000; // 5 minutes maximum
  
  let currentLevel = 0;
  let continueProcessing = true;
  let previousDocumentCount = 0;
  let previousTotalTokens = 0;
  
  while (continueProcessing) {
    // Check for overall timeout
    if (Date.now() - startTime > maxExecutionTime) {
      throw new Error(`Operation timed out after ${Math.floor((Date.now() - startTime) / 1000)} seconds. Max allowed: ${maxExecutionTime/1000} seconds.`);
    }
    
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
    
    console.log(`[HS Debug] Level ${currentLevel}: Processing ${documents.length} documents`);
    
    // Check for convergence - are we making progress?
    if (currentLevel > 0 && documents.length >= previousDocumentCount) {
      // Instead of immediately failing, check if the total content size is decreasing
      const currentTotalTokens = documents.reduce((sum, doc) => 
        sum + estimateTokenCount(doc.summary || doc.content), 0
      );
      
      // If we're not reducing document count, we should at least be reducing total tokens
      if (currentLevel > 1 && currentTotalTokens >= previousTotalTokens * 0.9) {
        throw new Error(
          `Summarization not converging: Level ${currentLevel-1} had ${previousDocumentCount} documents (${previousTotalTokens} tokens), ` +
          `Level ${currentLevel} has ${documents.length} documents (${currentTotalTokens} tokens). ` +
          `This indicates summaries are not reducing content size. ` +
          `Try: 1) Reducing AI output tokens (current: ~50), 2) Increasing batch size (current: ${config.batchSize}), ` +
          `or 3) Using more aggressive summarization prompts.`
        );
      }
      
      console.log(`[HS Progress] Level ${currentLevel}: Same document count but tokens reduced from ${previousTotalTokens} to ${currentTotalTokens}`);
    }
    
    previousDocumentCount = documents.length;
    previousTotalTokens = documents.reduce((sum, doc) => 
      sum + estimateTokenCount(doc.summary || doc.content), 0
    );
    
    // If only one document remains, we've reached the top
    if (documents.length === 1) {
      
      // If this is a source document (level 0) that hasn't been summarized yet,
      // we need to summarize it before returning
      const doc = documents[0];
      if (currentLevel === 0 && !doc.summary) {
        
        // Create a chunk from the document
        const chunk: DocumentChunk = {
          content: doc.content,
          index: 0,
          tokenCount: estimateTokenCount(doc.content),
          metadata: doc.metadata
        };
        
        // Summarize the document
        const summary = await summarizeChunk(chunk, null, config, executeFunctions);
        
        // Update the document with its summary
        await client.query(
          `UPDATE hierarchical_documents 
           SET summary = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [summary, doc.id]
        );
        
        doc.summary = summary;
      }
      
      // Update processing status
      await client.query(
        `UPDATE processing_status 
         SET status = 'completed', completed_at = CURRENT_TIMESTAMP, current_level = $1 
         WHERE batch_id = $2`,
        [currentLevel, config.batchId]
      );
      
      return doc;
    }
    
    // Process documents at this level to create next level
    
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
    
    // Safety check to prevent infinite loops - reduced from 20 to 10
    if (currentLevel > 10) {
      throw new Error(`Maximum hierarchy depth (10) exceeded. Level ${currentLevel} has ${documents.length} documents. Check for infinite hierarchy loops.`);
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
    throw new Error(`Batch size ${config.batchSize} too small for prompts. Increase batch size or reduce prompt length.`);
  }
  
  // Group documents into batches based on token count
  const batches: HierarchicalDocument[][] = [];
  let currentBatch: HierarchicalDocument[] = [];
  let currentBatchTokens = 0;
  
  for (const doc of documents) {
    const docContent = doc.summary || doc.content;
    const docTokens = estimateTokenCount(docContent);
    
    // If single document exceeds budget, process it separately
    if (docTokens > contentTokenBudget) {
      // Flush current batch if it has documents
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [];
        currentBatchTokens = 0;
      }
      
      // IMPORTANT: Don't chunk summaries at higher levels - this prevents infinite recursion
      // Only chunk original content at level 0
      if (doc.hierarchy_level === 0 && !doc.summary) {
        // Process oversized document with chunking
        const chunks = await chunkDocument(doc, config);
        const chunkSummaries: string[] = [];
        
        for (const chunk of chunks) {
          // Don't pass previousSummary for document chunking - each chunk should be independent
          // This prevents prompt size from growing with each chunk, which was causing excessive chunking
          const summary = await summarizeChunk(chunk, null, config, executeFunctions);
          chunkSummaries.push(summary);
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
      } else {
        // For summaries (level > 0), process as a single batch even if oversized
        // This prevents infinite hierarchy growth
        console.log(`Warning: Summary at level ${doc.hierarchy_level} exceeds batch size (${docTokens} tokens). Processing without chunking to prevent infinite recursion.`);
        batches.push([doc]);
      }
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
  
  // IMPROVED: Split content into sentences for clean chunking
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

// IMPROVED: Better sentence splitting that handles edge cases
function splitIntoSentences(text: string): string[] {
  // Handle empty text
  if (!text || !text.trim()) {
    return [];
  }
  
  // Protect special cases from being split
  const abbreviations = [
    'Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.', 'Sr.', 'Jr.', 
    'Ph.D.', 'M.D.', 'B.A.', 'M.A.', 'B.S.', 'M.S.',
    'i.e.', 'e.g.', 'etc.', 'vs.', 'Inc.', 'Ltd.', 'Co.',
    'a.m.', 'p.m.', 'Jan.', 'Feb.', 'Mar.', 'Apr.', 'Aug.',
    'Sept.', 'Oct.', 'Nov.', 'Dec.'
  ];
  
  let protectedText = text;
  const placeholders = new Map();
  let placeholderIndex = 0;

  // Protect abbreviations
  abbreviations.forEach(abbr => {
    const placeholder = `__ABBR_${placeholderIndex++}__`;
    placeholders.set(placeholder, abbr);
    const escapedAbbr = abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    protectedText = protectedText.replace(new RegExp(escapedAbbr, 'gi'), placeholder);
  });

  // Protect decimal numbers
  protectedText = protectedText.replace(/(\d+)\.(\d+)/g, (match) => {
    const placeholder = `__NUM_${placeholderIndex++}__`;
    placeholders.set(placeholder, match);
    return placeholder;
  });

  // Protect URLs
  protectedText = protectedText.replace(/https?:\/\/[^\s]+/g, (match) => {
    const placeholder = `__URL_${placeholderIndex++}__`;
    placeholders.set(placeholder, match);
    return placeholder;
  });

  // Protect email addresses
  protectedText = protectedText.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, (match) => {
    const placeholder = `__EMAIL_${placeholderIndex++}__`;
    placeholders.set(placeholder, match);
    return placeholder;
  });

  // Split on sentence boundaries
  // Look for sentence-ending punctuation followed by whitespace or end of string
  const sentenceRegex = /(?<=[.!?])\s+(?=\S)|(?<=[.!?])$/g;
  let sentences = protectedText.split(sentenceRegex);

  // Restore protected content
  sentences = sentences.map(sentence => {
    let restored = sentence;
    placeholders.forEach((original, placeholder) => {
      restored = restored.replace(new RegExp(placeholder, 'g'), original);
    });
    return restored.trim();
  }).filter(s => s.length > 0);

  // Handle edge case where no sentences were found
  if (sentences.length === 0 && text.trim()) {
    return [text.trim()];
  }

  return sentences;
}

// IMPROVED: Enhanced AI response parsing for multiple model formats
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
    // Get the AI language model connection
    const languageModel = await executeFunctions.getInputConnectionData(
      NodeConnectionType.AiLanguageModel,
      0
    );

    // Temporary diagnostic logging
    if (!languageModel) {
      // Log diagnostic information
      const node = executeFunctions.getNode();
      const inputData = executeFunctions.getInputData();
      console.error('[DIAGNOSTIC] AI Model connection failed:', {
        nodeType: node.type,
        nodeName: node.name,
        inputDataLength: inputData.length,
        connectionType: NodeConnectionType.AiLanguageModel,
        connectionTypeValue: NodeConnectionType.AiLanguageModel.toString()
      });
    }

    if (!languageModel || typeof (languageModel as any).invoke !== 'function') {
      throw new NodeOperationError(
        executeFunctions.getNode(),
        'No AI language model connected. Please connect an AI model to the Language Model input.'
      );
    }

    // Call the language model with timeout protection
    const response = await Promise.race([
      (languageModel as any).invoke({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        options: {
          temperature: 0.3,
          maxTokensToSample: 50,  // Reduced from 150 to enforce shorter summaries (1-2 sentences)
        }
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI request timeout after 60 seconds')), 60000)
      )
    ]);

    // IMPROVED: Extract the summary from response with better format handling
    const summary = parseAIResponse(response);
    
    if (!summary) {
      throw new Error('AI model returned empty response');
    }

    const trimmedSummary = summary.trim();
    
    // Check if the summary is actually summarizing (should be significantly shorter)
    const originalLength = chunk.content.length;
    const summaryLength = trimmedSummary.length;
    
    if (summaryLength >= originalLength * 0.8) {
      throw new Error(
        `Summary is not reducing content size sufficiently. ` +
        `Original: ${originalLength} chars, Summary: ${summaryLength} chars (${Math.round(summaryLength/originalLength*100)}%). ` +
        `The AI model is not summarizing effectively. ` +
        `Try: 1) More explicit summarization prompts, 2) Reducing AI output token limit, or 3) Using a different AI model.`
      );
    }
    
    // Also check token count
    const originalTokens = chunk.tokenCount;
    const summaryTokens = estimateTokenCount(trimmedSummary);
    
    if (summaryTokens >= originalTokens * 0.5) {
      console.warn(
        `[HS Warning] Summary token reduction is minimal: ${originalTokens} → ${summaryTokens} tokens (${Math.round(summaryTokens/originalTokens*100)}%)`
      );
    }

    return trimmedSummary;
    
  } catch (error) {
    // If AI model fails, provide a fallback summary
    const errorMessage = error.message || 'Unknown error';
    
    // Extract key sentences from the chunk as fallback
    const sentences = splitIntoSentences(chunk.content);
    const keyContent = sentences.slice(0, 2).join(' ').trim() || chunk.content.substring(0, 200);
    
    return `[AI Error: ${errorMessage}] Key content from chunk ${chunk.index}: ${keyContent}...`;
  }
}

// IMPROVED: Comprehensive AI response parser
function parseAIResponse(response: any): string {
  if (!response) {
    throw new Error('No response from AI model');
  }

  // Direct string response
  if (typeof response === 'string') {
    return response;
  }

  // Try various response formats in order of likelihood
  const extractors = [
    // OpenAI ChatGPT format
    () => response.choices?.[0]?.message?.content,
    () => response.choices?.[0]?.text,
    
    // Anthropic Claude format
    () => response.content,
    () => response.completion,
    
    // Google AI format
    () => response.candidates?.[0]?.content?.parts?.[0]?.text,
    () => response.candidates?.[0]?.text,
    () => response.text,
    
    // Cohere format
    () => response.text,
    () => response.generations?.[0]?.text,
    
    // Hugging Face format
    () => response.generated_text,
    () => response[0]?.generated_text,
    
    // Ollama format
    () => response.response,
    () => response.message?.content,
    
    // n8n AI node generic format
    () => response.output,
    () => response.result,
    () => response.data?.content,
    () => response.data?.text,
    
    // Azure OpenAI format
    () => response.choices?.[0]?.message?.content,
    () => response.body?.choices?.[0]?.message?.content,
    
    // LangChain format
    () => response.text,
    () => response.content,
    () => response.output_text,
    
    // Custom/Generic formats
    () => response.summary,
    () => response.answer,
    () => response.reply,
    () => response.response_text
  ];

  for (const extractor of extractors) {
    try {
      const result = extractor();
      if (result && typeof result === 'string' && result.trim()) {
        return result.trim();
      }
    } catch (e) {
      // Continue to next extractor
    }
  }

  // If we get here, we couldn't extract the response
  throw new Error('Unable to extract summary from AI response. The response format may not be supported.');
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