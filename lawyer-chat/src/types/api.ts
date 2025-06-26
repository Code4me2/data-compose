/**
 * Type definitions for all API requests and responses.
 * Replaces all uses of 'any' with proper types.
 */

// User and Authentication types
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'admin';
  createdAt: Date | string;
  updatedAt: Date | string;
  emailVerified: Date | string | null;
}

export interface Session {
  user: User;
  expires: string;
}

// Chat types
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date | string;
  metadata?: {
    model?: string;
    tokens?: number;
    processingTime?: number;
    temperature?: number;
  };
}

export interface Chat {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date | string;
  updatedAt: Date | string;
  metadata?: Record<string, unknown>;
}

export interface CreateChatRequest {
  title?: string;
  message: string;
}

export interface CreateChatResponse {
  chat: Chat;
  message: ChatMessage;
}

export interface SendMessageRequest {
  message: string;
  chatId?: string;
}

export interface StreamingChatResponse {
  id: string;
  content: string;
  role: 'assistant';
  isComplete: boolean;
}

// Analytics types (replacing any[] in AnalyticsDropdown)
export interface TrendDataPoint {
  date: string;
  value: number;
  label: string;
  category?: string;
}

export interface Statistics {
  totalChats: number;
  activeUsers: number;
  avgResponseTime: number;
  totalMessages: number;
  errorRate: number;
  successRate: number;
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string;
  borderWidth?: number;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface AnalyticsChart {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'radar' | 'polarArea';
  title: string;
  description?: string;
  data: ChartData;
  options?: Record<string, unknown>;
}

export interface AnalyticsData {
  trends: TrendDataPoint[];
  statistics: Statistics;
  charts: AnalyticsChart[];
  summary?: {
    period: string;
    highlights: string[];
  };
}

// Citation types (replacing any in CitationPanel)
export interface Citation {
  id: string;
  title: string;
  content: string;
  source: string;
  url?: string;
  author?: string;
  date?: Date | string;
  relevanceScore?: number;
  metadata?: {
    documentType?: string;
    pageNumber?: number;
    section?: string;
  };
}

export interface CitationGroup {
  category: string;
  citations: Citation[];
}

// Admin types
export interface AuditLog {
  id: string;
  userId: string;
  user?: User;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  createdAt: Date | string;
}

export interface AdminUser extends User {
  _count?: {
    chats: number;
    sessions: number;
  };
  lastLogin?: Date | string;
  isActive: boolean;
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp?: string;
}

// Health check types
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version?: string;
  services?: {
    database: boolean;
    redis?: boolean;
    external?: boolean;
  };
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  user: User;
  token?: string;
  expiresAt?: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyEmailResponse {
  success: boolean;
  message: string;
  user?: User;
}

// Form validation types (for sanitizeJson function)
export type JsonValue = 
  | string 
  | number 
  | boolean 
  | null 
  | JsonObject 
  | JsonArray;

export interface JsonObject {
  [key: string]: JsonValue;
}

export interface JsonArray extends Array<JsonValue> {}

// WebSocket message types
export interface WebSocketMessage {
  type: 'chat' | 'notification' | 'status' | 'error';
  payload: unknown;
  timestamp: string;
}

export interface ChatWebSocketMessage extends WebSocketMessage {
  type: 'chat';
  payload: {
    chatId: string;
    message: ChatMessage;
  };
}

// Sidebar types
export interface SidebarState {
  isOpen: boolean;
  activeSection: string;
  user?: User;
}

// Task types (for TaskBar component)
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high';
  assignee?: User;
  dueDate?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Type guards
export function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj &&
    'role' in obj
  );
}

export function isChat(obj: unknown): obj is Chat {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'userId' in obj &&
    'messages' in obj &&
    Array.isArray((obj as Chat).messages)
  );
}

export function isApiError(obj: unknown): obj is ApiErrorResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'error' in obj &&
    typeof (obj as ApiErrorResponse).error === 'string'
  );
}