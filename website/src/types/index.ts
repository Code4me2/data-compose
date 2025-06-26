/**
 * Central type exports for Data Compose application
 */

// Re-export all type definitions
export * from './api.types';
export * from './module.types';
export * from './visualization.types';

// Common utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

// Function types
export type AsyncFunction<T = void> = () => Promise<T>;
export type Callback<T = void> = (error: Error | null, result?: T) => void;

// Status types commonly used across modules
export type Status = 'idle' | 'loading' | 'success' | 'error';
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// Generic result type for operations
export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

// Pagination types
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}