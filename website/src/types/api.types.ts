/**
 * API type definitions for Data Compose
 */

// Webhook types
export interface WebhookConfig {
  WEBHOOK_ID: string;
  WEBHOOK_URL: string;
}

export interface ChatMessage {
  id?: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
}

export interface ChatRequest {
  action: 'chat';
  message: string;
  timestamp: string;
}

export interface ChatResponse {
  response?: string;
  output?: string;
  message?: string;
  error?: string;
}

// n8n Workflow types
export interface Workflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  nodes?: WorkflowNode[];
  connections?: WorkflowConnection;
}

export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  parameters: Record<string, unknown>;
}

export interface WorkflowConnection {
  [nodeId: string]: {
    [outputIndex: string]: Array<{
      node: string;
      type: string;
      index: number;
    }>;
  };
}

export interface WorkflowsResponse {
  data: Workflow[];
  nextCursor?: string;
}

// Health check types
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  version?: string;
  timestamp?: string;
}

// Hierarchical Summarization types
export interface HierarchyLevel {
  level: number;
  count: number;
  label: string;
}

export interface HierarchyDocument {
  id: number;
  content?: string;
  summary?: string;
  source?: string;
  parent_id?: number;
  child_ids?: number[];
  level?: number;
}

export interface HierarchyData {
  batchId: string;
  directoryName?: string;
  timestamp?: string;
  totalDocuments?: number;
  hierarchyDepth?: number;
  levels: HierarchyLevel[];
  documents: {
    [level: string]: HierarchyDocument[];
  };
}

export interface SummarizationRequest {
  directoryPath: string;
}

export interface SummarizationResponse {
  workflowId: string;
  status: 'running' | 'completed' | 'failed';
  message?: string;
  progress?: number;
}

export interface SummarizationHistory {
  batchId: string;
  directoryName: string;
  timestamp: string;
  totalDocuments: number;
  hierarchyDepth: number;
}

// Error types
export interface ApiError {
  error: string;
  message: string;
  statusCode?: number;
  details?: unknown;
}