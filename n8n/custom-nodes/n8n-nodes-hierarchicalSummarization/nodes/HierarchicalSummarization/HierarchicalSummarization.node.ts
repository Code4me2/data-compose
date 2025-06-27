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

// Global circuit breaker instance (shared across all executions)
let globalCircuitBreaker: CircuitBreaker | null = null;

// Global rate limiter instance (shared across all executions)
let globalRateLimiter: RateLimiter | null = null;

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
  // New fields for better traceability
  document_type?: 'source' | 'chunk' | 'batch' | 'summary';
  chunk_index?: number;
  source_document_ids?: number[];
  token_count?: number;
}

interface ProcessingConfig {
  summaryPrompt: string;
  contextPrompt: string;
  batchSize: number;
  batchId: string;
  resilience?: ResilienceConfig;
}

interface DocumentChunk {
  content: string;
  index: number;
  parentDocumentId?: number;
  tokenCount: number;
  metadata?: any;
}

interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterFactor: number;
}

interface ResilienceConfig {
  retryEnabled: boolean;
  retryConfig: RetryConfig;
  requestTimeout: number;
  fallbackEnabled: boolean;
  rateLimit: number;
  circuitBreakerEnabled?: boolean;
  circuitBreakerThreshold?: number;
  circuitBreakerResetTimeout?: number;
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenRequests: number;
}

// Circuit breaker state management
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private halfOpenAttempts = 0;
  private successfulHalfOpenRequests = 0;
  
  constructor(private config: CircuitBreakerConfig) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from open to half-open
    if (this.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure > this.config.resetTimeout) {
        console.log('[CircuitBreaker] Transitioning from OPEN to HALF-OPEN');
        this.state = 'half-open';
        this.halfOpenAttempts = 0;
        this.successfulHalfOpenRequests = 0;
      } else {
        throw new Error(`Circuit breaker is OPEN - BitNet server is unavailable. Will retry in ${Math.round((this.config.resetTimeout - timeSinceLastFailure) / 1000)} seconds`);
      }
    }
    
    // In half-open state, limit the number of test requests
    if (this.state === 'half-open' && this.halfOpenAttempts >= this.config.halfOpenRequests) {
      // Decide whether to close or re-open based on success rate
      if (this.successfulHalfOpenRequests >= Math.ceil(this.config.halfOpenRequests / 2)) {
        console.log('[CircuitBreaker] Closing circuit - server recovered');
        this.state = 'closed';
        this.failures = 0;
      } else {
        console.log('[CircuitBreaker] Re-opening circuit - server still failing');
        this.state = 'open';
        this.lastFailureTime = Date.now();
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    if (this.state === 'half-open') {
      this.successfulHalfOpenRequests++;
      this.halfOpenAttempts++;
      console.log(`[CircuitBreaker] Half-open success ${this.successfulHalfOpenRequests}/${this.halfOpenAttempts}`);
    } else if (this.state === 'closed') {
      // Reset failure count on success
      this.failures = 0;
    }
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.state === 'half-open') {
      this.halfOpenAttempts++;
      console.log(`[CircuitBreaker] Half-open failure ${this.halfOpenAttempts - this.successfulHalfOpenRequests}/${this.halfOpenAttempts}`);
    } else if (this.state === 'closed' && this.failures >= this.config.failureThreshold) {
      console.log(`[CircuitBreaker] Opening circuit after ${this.failures} consecutive failures`);
      this.state = 'open';
    }
  }
  
  getState(): string {
    return this.state;
  }
}

// Rate limiter with request queue
class RateLimiter {
  private queue: Array<{
    execute: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  private processing = false;
  private lastRequestTime = 0;
  
  constructor(
    private requestsPerMinute: number
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        execute: operation,
        resolve,
        reject
      });
      
      if (!this.processing) {
        this.processQueue();
      }
    });
  }
  
  private async processQueue() {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (!request) continue;
      
      // Calculate minimum interval between requests
      const minInterval = 60000 / this.requestsPerMinute;
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      
      // Wait if necessary to maintain rate limit
      if (timeSinceLastRequest < minInterval) {
        const waitTime = minInterval - timeSinceLastRequest;
        console.log(`[RateLimiter] Waiting ${Math.round(waitTime)}ms to maintain rate limit`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      this.lastRequestTime = Date.now();
      
      try {
        const result = await request.execute();
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }
    
    this.processing = false;
  }
  
  getQueueLength(): number {
    return this.queue.length;
  }
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
      // Resilience Configuration
      {
        displayName: 'Resilience Options',
        name: 'resilience',
        type: 'collection',
        placeholder: 'Add Resilience Option',
        default: {
          retryEnabled: true,
          maxRetries: 3,
          requestTimeout: 60000,
          fallbackEnabled: true,
          rateLimit: 30,
        },
        options: [
          {
            displayName: 'Enable Retry Logic',
            name: 'retryEnabled',
            type: 'boolean',
            default: true,
            description: 'Retry failed AI requests with exponential backoff',
          },
          {
            displayName: 'Max Retries',
            name: 'maxRetries',
            type: 'number',
            default: 3,
            description: 'Maximum number of retry attempts',
            displayOptions: {
              show: {
                retryEnabled: [true],
              },
            },
          },
          {
            displayName: 'Request Timeout (ms)',
            name: 'requestTimeout',
            type: 'number',
            default: 60000,
            description: 'Timeout for each AI request in milliseconds',
          },
          {
            displayName: 'Enable Fallback Summaries',
            name: 'fallbackEnabled',
            type: 'boolean',
            default: true,
            description: 'Generate basic summaries when AI is unavailable',
          },
          {
            displayName: 'Rate Limit (requests/min)',
            name: 'rateLimit',
            type: 'number',
            default: 30,
            description: 'Maximum AI requests per minute',
          },
          {
            displayName: 'Enable Circuit Breaker',
            name: 'circuitBreakerEnabled',
            type: 'boolean',
            default: true,
            description: 'Stop trying when server is down to prevent cascading failures',
          },
          {
            displayName: 'Circuit Breaker Threshold',
            name: 'circuitBreakerThreshold',
            type: 'number',
            default: 5,
            description: 'Number of consecutive failures before opening circuit',
            displayOptions: {
              show: {
                circuitBreakerEnabled: [true],
              },
            },
          },
          {
            displayName: 'Circuit Breaker Reset Time (ms)',
            name: 'circuitBreakerResetTimeout',
            type: 'number',
            default: 60000,
            description: 'Time to wait before testing if server recovered',
            displayOptions: {
              show: {
                circuitBreakerEnabled: [true],
              },
            },
          },
        ],
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
            
            // Get resilience configuration
            const resilienceOptions = this.getNodeParameter('resilience', itemIndex) as IDataObject;
            const resilience: ResilienceConfig = {
              retryEnabled: resilienceOptions.retryEnabled as boolean ?? true,
              retryConfig: {
                maxRetries: resilienceOptions.maxRetries as number ?? 3,
                initialDelay: 1000,
                maxDelay: 30000,
                backoffMultiplier: 2,
                jitterFactor: 0.1
              },
              requestTimeout: resilienceOptions.requestTimeout as number ?? 60000,
              fallbackEnabled: resilienceOptions.fallbackEnabled as boolean ?? true,
              rateLimit: resilienceOptions.rateLimit as number ?? 30,
              circuitBreakerEnabled: resilienceOptions.circuitBreakerEnabled as boolean ?? true,
              circuitBreakerThreshold: resilienceOptions.circuitBreakerThreshold as number ?? 5,
              circuitBreakerResetTimeout: resilienceOptions.circuitBreakerResetTimeout as number ?? 60000
            };
            
            // Initialize processing configuration
            const config: ProcessingConfig = {
              summaryPrompt,
              contextPrompt,
              batchSize,
              batchId,
              resilience,
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

// Retry logic with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  logger?: (message: string) => void
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === config.maxRetries) {
        logger?.(`[Retry] All ${config.maxRetries + 1} attempts failed. Final error: ${lastError.message}`);
        break;
      }
      
      // Calculate delay with exponential backoff + jitter
      const baseDelay = Math.min(
        config.initialDelay * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelay
      );
      const jitter = baseDelay * config.jitterFactor * (Math.random() - 0.5) * 2;
      const delay = Math.round(baseDelay + jitter);
      
      logger?.(`[Retry] Attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Fallback summary generation when AI is unavailable
function generateFallbackSummary(chunk: DocumentChunk): string {
  const sentences = splitIntoSentences(chunk.content);
  
  if (sentences.length === 0) {
    return '[AI Unavailable] Document appears to be empty.';
  }
  
  if (sentences.length <= 2) {
    return `[AI Unavailable - Original] ${chunk.content}`;
  }
  
  // Simple extractive summarization: first and longest sentence
  const firstSentence = sentences[0];
  const longestSentence = sentences
    .slice(1, -1)
    .sort((a, b) => b.length - a.length)[0] || sentences[1];
  
  // Ensure we don't duplicate if first is also longest
  const summary = firstSentence === longestSentence 
    ? firstSentence 
    : `${firstSentence} ${longestSentence}`;
  
  return `[AI Unavailable - Extracted] ${summary}`;
}

async function ensureDatabaseSchema(pool: Pool): Promise<void> {
  
  // Create tables if they don't exist
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
  
  // Add new columns if they don't exist (for existing databases)
  const migrationSQL = `
    DO $$ 
    BEGIN
      -- Add document_type column if it doesn't exist
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = 'hierarchical_documents' 
                     AND column_name = 'document_type') THEN
          ALTER TABLE hierarchical_documents 
          ADD COLUMN document_type VARCHAR(20) DEFAULT 'source';
      END IF;
      
      -- Add chunk_index column if it doesn't exist
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = 'hierarchical_documents' 
                     AND column_name = 'chunk_index') THEN
          ALTER TABLE hierarchical_documents 
          ADD COLUMN chunk_index INTEGER;
      END IF;
      
      -- Add source_document_ids column if it doesn't exist
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = 'hierarchical_documents' 
                     AND column_name = 'source_document_ids') THEN
          ALTER TABLE hierarchical_documents 
          ADD COLUMN source_document_ids INTEGER[] DEFAULT '{}';
      END IF;
      
      -- Create index on document_type if it doesn't exist
      IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                     WHERE tablename = 'hierarchical_documents' 
                     AND indexname = 'idx_document_type') THEN
          CREATE INDEX idx_document_type ON hierarchical_documents(document_type);
      END IF;
    END $$;
  `;
  
  await pool.query(migrationSQL);
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
       (content, batch_id, hierarchy_level, token_count, metadata, document_type) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id`,
      [
        doc.content,
        config.batchId,
        0, // Hierarchy level 0 for source documents
        tokenCount,
        JSON.stringify({ filename: doc.name }),
        'source' // Mark as source document
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
      // Special handling for Level 0 → Level 1 transition
      // Level 1 contains batches/chunks, not summaries, so document count may stay same or decrease
      if (currentLevel === 1) {
        // Level 1 should have fewer or equal documents than Level 0 (batching occurred)
        console.log(
          `[HS Info] Level 0 → Level 1: ${previousDocumentCount} source documents → ${documents.length} batches/chunks`
        );
        // No error needed - Level 1 is just reorganized batches
      }
      
      // For Level 2+, check if summarization is working (reducing content)
      if (currentLevel >= 2) {
        const currentTotalTokens = documents.reduce((sum, doc) => 
          sum + estimateTokenCount(doc.summary || doc.content), 0
        );
        
        // Level 2+: Summaries should be reducing document count OR token count
        if (documents.length >= previousDocumentCount && currentTotalTokens >= previousTotalTokens * 0.9) {
          throw new Error(
            `Summarization not converging: Level ${currentLevel-1} had ${previousDocumentCount} documents (${previousTotalTokens} tokens), ` +
            `Level ${currentLevel} has ${documents.length} documents (${currentTotalTokens} tokens). ` +
            `This indicates summaries are not reducing content size. ` +
            `Try: 1) Reducing AI output tokens (current: ~50), 2) Increasing batch size (current: ${config.batchSize}), ` +
            `or 3) Using more aggressive summarization prompts.`
          );
        }
        
        console.log(`[HS Progress] Level ${currentLevel}: ${previousDocumentCount} → ${documents.length} documents, ${previousTotalTokens} → ${currentTotalTokens} tokens`);
      }
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

/**
 * Process documents at the current level to create the next level in the hierarchy.
 * 
 * HIERARCHY LOGIC:
 * - Level 0: Source documents (original content)
 * - Level 1: Batches/chunks of Level 0 content (no summaries yet)
 * - Level 2: First summaries of Level 1 batches/chunks
 * - Level 3+: Higher-level summaries
 * 
 * This function handles the transformation between levels:
 * - Level 0 → Level 1: Creates batches (combining small docs) or chunks (splitting large docs)
 * - Level 1 → Level 2: Creates first summaries from batches/chunks
 * - Level 2+ → Next: Standard summarization with convergence
 */
async function processLevel(
  client: any,
  documents: HierarchicalDocument[],
  config: ProcessingConfig,
  nextLevel: number,
  executeFunctions: IExecuteFunctions
): Promise<HierarchicalDocument[]> {
  const createdDocuments: HierarchicalDocument[] = [];
  
  // Calculate available tokens for content after accounting for prompts
  const promptTokens = estimateTokenCount(
    config.summaryPrompt + (config.contextPrompt || '')
  );
  const contentTokenBudget = config.batchSize - promptTokens - 100; // Safety buffer
  
  if (contentTokenBudget < 100) {
    throw new Error(`Batch size ${config.batchSize} too small for prompts. Increase batch size or reduce prompt length.`);
  }
  
  // CRITICAL LOGIC: Handle Level 0 → Level 1 transformation differently
  // Level 0 → 1: Create batches/chunks (content only, no summaries)
  // Level 1 → 2+: Create summaries
  const isCreatingBatches = documents[0]?.hierarchy_level === 0;
  
  if (isCreatingBatches) {
    // ========== LEVEL 0 → LEVEL 1: Create batches/chunks ==========
    console.log(`[HS] Creating Level 1 batches/chunks from ${documents.length} Level 0 documents`);
    
    // Initialize batch tracking variables
    let currentBatch: HierarchicalDocument[] = [];
    let currentBatchTokens = 0;
    
    for (const doc of documents) {
      const docTokens = estimateTokenCount(doc.content);
      
      if (docTokens > contentTokenBudget) {
        // Large document: Create chunks at Level 1
        console.log(`[HS] Document "${doc.metadata?.filename}" (${docTokens} tokens) exceeds batch size. Creating chunks.`);
        
        const chunks = await chunkDocument(doc, config);
        
        // Save each chunk as a Level 1 document
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const chunkDoc = await client.query(
            `INSERT INTO hierarchical_documents 
             (content, batch_id, hierarchy_level, parent_id, token_count, metadata, document_type, chunk_index) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
             RETURNING *`,
            [
              chunk.content,
              config.batchId,
              1, // Level 1: chunks
              doc.id,
              chunk.tokenCount,
              JSON.stringify({
                ...doc.metadata,
                chunkOf: doc.metadata?.filename || 'unknown',
                chunkIndex: i,
                totalChunks: chunks.length
              }),
              'chunk',
              i
            ]
          );
          
          createdDocuments.push(chunkDoc.rows[0]);
        }
      } else {
        // Small document: Will be batched with others
        // For now, just track it for batching
        if (currentBatch.length === 0) {
          currentBatchTokens = 0;
        }
        
        // Check if adding this document would exceed the batch size
        if (currentBatchTokens + docTokens > contentTokenBudget && currentBatch.length > 0) {
          // Save current batch as Level 1 document
          await saveBatchAsLevel1(client, currentBatch, config, createdDocuments);
          currentBatch = [];
          currentBatchTokens = 0;
        }
        
        currentBatch.push(doc);
        currentBatchTokens += docTokens;
      }
    }
    
    // Save any remaining batch
    if (currentBatch.length > 0) {
      await saveBatchAsLevel1(client, currentBatch, config, createdDocuments);
    }
    
    return createdDocuments;
    
  } else {
    // ========== LEVEL 1+ → NEXT LEVEL: Create summaries ==========
    console.log(`[HS] Creating Level ${nextLevel} summaries from ${documents.length} Level ${documents[0]?.hierarchy_level} documents`);
    
    // Standard batching logic for summarization
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
        
        // For Level 1+ documents, never chunk - process as single batch
        console.log(`Warning: Document at level ${doc.hierarchy_level} exceeds batch size (${docTokens} tokens). Processing alone.`);
        
        if (doc.hierarchy_level >= 2 && docTokens > contentTokenBudget * 0.8) {
          console.warn(
            `[HS Critical] Level ${doc.hierarchy_level} document is ${docTokens} tokens, ` +
            `which is ${Math.round(docTokens/contentTokenBudget*100)}% of available batch budget. ` +
            `This suggests summarization is not condensing content effectively.`
          );
        }
        
        batches.push([doc]);
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
  
    // Process each batch to create summaries
    for (const batch of batches) {
      if (batch.length === 1) {
        // Single document - summarize directly
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
        
        createdDocuments.push(newDoc);
      } else {
        // Multiple documents - combine and summarize
        const combinedContent = batch.map(doc => {
          const content = doc.summary || doc.content;
          const source = doc.metadata?.source || doc.metadata?.filename || 'unknown';
          return `[Document: ${source}]\n${content}`;
        }).join('\n\n');
        
        // Create metadata that references all parent documents
        const combinedMetadata = {
          sources: batch.map(doc => doc.metadata?.source || doc.metadata?.filename || 'unknown'),
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
        
        createdDocuments.push(newDoc);
      }
    }
    
    return createdDocuments;
  }
}

/**
 * Helper function to save a batch of Level 0 documents as a single Level 1 batch document.
 * This preserves the exact content that will be summarized for traceability.
 */
async function saveBatchAsLevel1(
  client: any,
  batch: HierarchicalDocument[],
  config: ProcessingConfig,
  createdDocuments: HierarchicalDocument[]
): Promise<void> {
  // Combine content from all documents in the batch
  const combinedContent = batch.map(doc => {
    const filename = doc.metadata?.filename || 'unknown';
    return `[Document: ${filename}]\n${doc.content}`;
  }).join('\n\n');
  
  const totalTokens = batch.reduce((sum, doc) => sum + (doc.token_count || 0), 0);
  
  // Create metadata that references all source documents
  const batchMetadata = {
    batchOf: batch.map(doc => doc.metadata?.filename || 'unknown'),
    sourceDocumentIds: batch.map(doc => doc.id),
    documentCount: batch.length,
    totalTokens
  };
  
  const batchDoc = await client.query(
    `INSERT INTO hierarchical_documents 
     (content, batch_id, hierarchy_level, token_count, metadata, document_type, source_document_ids) 
     VALUES ($1, $2, $3, $4, $5, $6, $7) 
     RETURNING *`,
    [
      combinedContent,
      config.batchId,
      1, // Level 1: batch
      totalTokens,
      JSON.stringify(batchMetadata),
      'batch',
      batch.map(doc => doc.id)
    ]
  );
  
  // Update parent documents to reference this batch
  for (const sourceDoc of batch) {
    await client.query(
      `UPDATE hierarchical_documents 
       SET child_ids = array_append(child_ids, $1) 
       WHERE id = $2`,
      [batchDoc.rows[0].id, sourceDoc.id]
    );
  }
  
  createdDocuments.push(batchDoc.rows[0]);
  
  console.log(`[HS] Created Level 1 batch from ${batch.length} documents (${totalTokens} tokens total)`);
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

// IMPROVED: Enhanced AI response parsing for multiple model formats with resilience
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
  
  // Get resilience configuration with defaults
  const resilience = config.resilience || {
    retryEnabled: true,
    retryConfig: {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitterFactor: 0.1
    },
    requestTimeout: 60000,
    fallbackEnabled: true,
    rateLimit: 30
  };
  
  // Logger function for retry attempts
  const logger = (message: string) => {
    console.log(`[HS ${chunk.index}] ${message}`);
  };
  
  // Initialize circuit breaker if enabled and not already created
  if (resilience.circuitBreakerEnabled && !globalCircuitBreaker) {
    globalCircuitBreaker = new CircuitBreaker({
      failureThreshold: resilience.circuitBreakerThreshold || 5,
      resetTimeout: resilience.circuitBreakerResetTimeout || 60000,
      halfOpenRequests: 3
    });
    logger('Circuit breaker initialized');
  }
  
  // Initialize rate limiter if not already created
  if (!globalRateLimiter) {
    globalRateLimiter = new RateLimiter(resilience.rateLimit);
    logger(`Rate limiter initialized: ${resilience.rateLimit} requests/minute`);
  }
  
  // Main operation to be retried
  const operation = async () => {
    // Get the AI language model connection
    const languageModel = await executeFunctions.getInputConnectionData(
      NodeConnectionType.AiLanguageModel,
      0
    );

    if (!languageModel || typeof (languageModel as any).invoke !== 'function') {
      throw new NodeOperationError(
        executeFunctions.getNode(),
        'No AI language model connected. Please connect an AI model to the Language Model input.'
      );
    }

    // Call the language model with configurable timeout
    let response;
    
    try {
      // First try the custom node format (BitNet style with messages array)
      response = await Promise.race([
        (languageModel as any).invoke({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
          ],
          options: {
            temperature: 0.3,
            maxTokensToSample: 50,
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`AI request timeout after ${resilience.requestTimeout}ms`)), resilience.requestTimeout)
        )
      ]);
    } catch (invokeError: any) {
      // If it fails with toChatMessages error, try the default n8n format (string prompt)
      if (invokeError.message?.includes('toChatMessages') || invokeError.message?.includes('messages')) {
        logger('Custom format failed, trying default n8n format (string prompt)');
        const combinedPrompt = `${systemPrompt}\n\nHuman: ${userContent}\n\nAI:`;
        
        response = await Promise.race([
          (languageModel as any).invoke(combinedPrompt, {
            temperature: 0.3,
            estimatedTokens: estimateTokenCount(userContent) + 100,
            options: {
              temperature: 0.3,
              max_tokens: 50,
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`AI request timeout after ${resilience.requestTimeout}ms`)), resilience.requestTimeout)
          )
        ]);
      } else {
        // If it's a different error, re-throw it
        throw invokeError;
      }
    }

    // Debug logging for response format (only in manual mode to avoid cluttering logs)
    if (executeFunctions.getMode && executeFunctions.getMode() === 'manual') {
      console.log('=== AI Response Debug ===');
      console.log('Response type:', typeof response);
      console.log('Response constructor:', response?.constructor?.name);
      console.log('Response keys:', Object.keys(response || {}));
      if (response && typeof response === 'object') {
        console.log('Has lc_kwargs:', 'lc_kwargs' in response);
        console.log('Has _getType:', typeof response._getType === 'function');
        console.log('Sample response:', JSON.stringify(response, null, 2).substring(0, 500));
      }
      console.log('=== End Debug ===');
    }

    // Extract the summary from response
    const summary = parseAIResponse(response);
    
    if (!summary) {
      throw new NodeOperationError(
        executeFunctions.getNode(),
        'AI model returned empty or unrecognized response format. This may indicate an incompatibility with the connected AI model.',
        { description: 'The AI model response could not be parsed. Please check that you are using a compatible AI model.' }
      );
    }

    const trimmedSummary = summary.trim();
    
    // Validate summary quality
    const originalLength = chunk.content.length;
    const summaryLength = trimmedSummary.length;
    
    if (summaryLength >= originalLength * 0.8) {
      throw new Error(
        `Summary is not reducing content size sufficiently. ` +
        `Original: ${originalLength} chars, Summary: ${summaryLength} chars (${Math.round(summaryLength/originalLength*100)}%). `
      );
    }
    
    // Check token reduction
    const originalTokens = chunk.tokenCount;
    const summaryTokens = estimateTokenCount(trimmedSummary);
    
    if (summaryTokens >= originalTokens * 0.5) {
      logger(`Warning: Minimal token reduction: ${originalTokens} → ${summaryTokens} tokens`);
    }

    return trimmedSummary;
  };
  
  try {
    // Wrap with rate limiter, circuit breaker, and retry logic
    const executeOperation = async () => {
      // First, apply rate limiting
      return await globalRateLimiter!.execute(async () => {
        // Log queue status if there's a queue
        const queueLength = globalRateLimiter!.getQueueLength();
        if (queueLength > 0) {
          logger(`Rate limiter queue: ${queueLength} requests waiting`);
        }
        
        // Then apply circuit breaker if enabled
        if (resilience.circuitBreakerEnabled && globalCircuitBreaker) {
          return await globalCircuitBreaker.execute(async () => {
            // Finally, apply retry logic if enabled
            if (resilience.retryEnabled) {
              return await retryWithBackoff(operation, resilience.retryConfig, logger);
            } else {
              return await operation();
            }
          });
        } else {
          // No circuit breaker, just use retry logic
          if (resilience.retryEnabled) {
            return await retryWithBackoff(operation, resilience.retryConfig, logger);
          } else {
            return await operation();
          }
        }
      });
    };
    
    return await executeOperation();
  } catch (error) {
    const errorMessage = error.message || 'Unknown error';
    logger(`Error: ${errorMessage}`);
    
    // Check if circuit breaker is open
    if (errorMessage.includes('Circuit breaker is OPEN')) {
      logger(`Circuit breaker state: ${globalCircuitBreaker?.getState()}`);
    }
    
    // Use fallback if enabled
    if (resilience.fallbackEnabled) {
      logger('Using fallback summary generation');
      // Note: We generate the fallback but don't use it - we want to fail instead
      generateFallbackSummary(chunk);
      
      // Throw error to indicate AI connection failure
      throw new NodeOperationError(
        executeFunctions.getNode(),
        `AI model connection failed: ${errorMessage}. The node cannot proceed without a working AI connection.`,
        { description: 'Please ensure an AI model is properly connected and configured.' }
      );
    }
    
    // Re-throw if no fallback
    throw error;
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
    // n8n AI node format (as seen in actual output)
    () => response.response?.generations?.[0]?.[0]?.text,
    () => response.generations?.[0]?.[0]?.text,
    
    // LangChain BaseMessage format (used by default n8n nodes)
    () => response.lc_kwargs?.content,
    () => response.content && typeof response._getType === 'function' ? response.content : undefined,
    
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
     (content, summary, batch_id, hierarchy_level, parent_id, token_count, document_type) 
     VALUES ($1, $2, $3, $4, $5, $6, $7) 
     RETURNING *`,
    [
      '', // Empty content since this is a summary
      summary,
      config.batchId,
      hierarchyLevel,
      parentId,
      estimateTokenCount(summary),
      'summary' // Mark as summary document
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
     (content, summary, batch_id, hierarchy_level, parent_id, token_count, metadata, document_type, source_document_ids) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
     RETURNING *`,
    [
      '', // Empty content since this is a summary
      summary,
      config.batchId,
      hierarchyLevel,
      parentIds[0], // Primary parent for compatibility
      estimateTokenCount(summary),
      JSON.stringify(metadata),
      'summary', // Mark as summary document
      parentIds // Store all parent IDs for full traceability
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