/**
 * Runtime validation utilities for API responses.
 * Provides type guards and validation functions without external dependencies.
 */

import type {
  User,
  Chat,
  ChatMessage,
  AnalyticsData,
  ApiErrorResponse,
  AdminUser,
  AuditLog,
  TrendDataPoint,
  Statistics,
  ChartData,
  Citation
} from '@/types/api';

// Type guard functions
export function isUser(value: unknown): value is User {
  if (!isObject(value)) return false;
  
  return (
    typeof value.id === 'string' &&
    typeof value.email === 'string' &&
    (value.name === null || typeof value.name === 'string') &&
    (value.role === 'user' || value.role === 'admin') &&
    isDateLike(value.createdAt) &&
    isDateLike(value.updatedAt) &&
    (value.emailVerified === null || isDateLike(value.emailVerified))
  );
}

export function isChatMessage(value: unknown): value is ChatMessage {
  if (!isObject(value)) return false;
  
  return (
    typeof value.id === 'string' &&
    typeof value.content === 'string' &&
    (value.role === 'user' || value.role === 'assistant' || value.role === 'system') &&
    isDateLike(value.timestamp) &&
    (value.metadata === undefined || isObject(value.metadata))
  );
}

export function isChat(value: unknown): value is Chat {
  if (!isObject(value)) return false;
  
  return (
    typeof value.id === 'string' &&
    typeof value.userId === 'string' &&
    typeof value.title === 'string' &&
    Array.isArray(value.messages) &&
    value.messages.every(isChatMessage) &&
    isDateLike(value.createdAt) &&
    isDateLike(value.updatedAt) &&
    (value.metadata === undefined || isObject(value.metadata))
  );
}

export function isApiError(value: unknown): value is ApiErrorResponse {
  if (!isObject(value)) return false;
  
  return (
    typeof value.error === 'string' &&
    (value.code === undefined || typeof value.code === 'string') &&
    (value.details === undefined || isObject(value.details))
  );
}

export function isAnalyticsData(value: unknown): value is AnalyticsData {
  if (!isObject(value)) return false;
  
  return (
    Array.isArray(value.trends) &&
    value.trends.every(isTrendDataPoint) &&
    isStatistics(value.statistics) &&
    Array.isArray(value.charts)
  );
}

export function isTrendDataPoint(value: unknown): value is TrendDataPoint {
  if (!isObject(value)) return false;
  
  return (
    typeof value.date === 'string' &&
    typeof value.value === 'number' &&
    typeof value.label === 'string' &&
    (value.category === undefined || typeof value.category === 'string')
  );
}

export function isStatistics(value: unknown): value is Statistics {
  if (!isObject(value)) return false;
  
  return (
    typeof value.totalChats === 'number' &&
    typeof value.activeUsers === 'number' &&
    typeof value.avgResponseTime === 'number' &&
    typeof value.totalMessages === 'number' &&
    typeof value.errorRate === 'number' &&
    typeof value.successRate === 'number'
  );
}

// Validation functions with detailed error messages
export function validateUser(data: unknown): User {
  if (!isUser(data)) {
    throw new ValidationError('Invalid user data', { received: data });
  }
  return data;
}

export function validateChat(data: unknown): Chat {
  if (!isChat(data)) {
    throw new ValidationError('Invalid chat data', { received: data });
  }
  return data;
}

export function validateChatMessage(data: unknown): ChatMessage {
  if (!isChatMessage(data)) {
    throw new ValidationError('Invalid chat message data', { received: data });
  }
  return data;
}

export function validateAnalyticsData(data: unknown): AnalyticsData {
  if (!isAnalyticsData(data)) {
    throw new ValidationError('Invalid analytics data', { received: data });
  }
  return data;
}

// Safe validation with error handling
export function safeValidate<T>(
  data: unknown,
  validator: (data: unknown) => T
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validatedData = validator(data);
    return { success: true, data: validatedData };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Validation failed';
    return { success: false, error: message };
  }
}

// Utility functions
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDateLike(value: unknown): boolean {
  if (value instanceof Date) return true;
  if (typeof value === 'string') {
    const date = new Date(value);
    return !isNaN(date.getTime());
  }
  return false;
}

// Custom validation error
export class ValidationError extends Error {
  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Replace the unsafe sanitizeJson from validation.ts
export function sanitizeJson(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeJson);
  }
  
  if (isObject(obj)) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip potentially dangerous keys
      if (key.startsWith('__') || key.startsWith('constructor')) {
        continue;
      }
      sanitized[key] = sanitizeJson(value);
    }
    return sanitized;
  }
  
  // For other types (functions, symbols, etc.), return null
  return null;
}

// Validate array of items
export function validateArray<T>(
  data: unknown,
  itemValidator: (item: unknown) => T
): T[] {
  if (!Array.isArray(data)) {
    throw new ValidationError('Expected an array', { received: typeof data });
  }
  
  return data.map((item, index) => {
    try {
      return itemValidator(item);
    } catch (error) {
      throw new ValidationError(
        `Invalid item at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { item, index }
      );
    }
  });
}

// Type-safe property access
export function getProperty<T, K extends keyof T>(
  obj: T,
  key: K,
  defaultValue?: T[K]
): T[K] | undefined {
  return obj[key] ?? defaultValue;
}

// Deep clone for safe object manipulation
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as T;
  
  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}