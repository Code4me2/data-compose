/**
 * Module system type definitions
 */

// Base module interface for plugin system
export interface AppModule {
  id: string;
  name: string;
  icon: string;
  description?: string;
  version: string;
  dependencies?: string[];
  
  // Lifecycle methods
  init(): Promise<void>;
  mount(container: HTMLElement): void;
  unmount(): void;
  destroy?(): void;
  
  // Navigation
  onNavigate?(params: RouteParams): void;
  canNavigateAway?(): boolean | Promise<boolean>;
  
  // State management
  getState?(): unknown;
  restoreState?(state: unknown): void;
}

// Route parameters
export interface RouteParams {
  [key: string]: string | undefined;
}

// Module configuration
export interface ModuleConfig {
  enabled: boolean;
  settings?: Record<string, unknown>;
  permissions?: string[];
}

// Module manifest for registration
export interface ModuleManifest {
  module: new (config?: ModuleConfig) => AppModule;
  config?: ModuleConfig;
  priority?: number;
}

// Service registry types
export interface ServiceConstructor<T = unknown> {
  new (...args: unknown[]): T;
}

export interface ServiceDefinition {
  name: string;
  service: ServiceConstructor;
  singleton?: boolean;
  dependencies?: string[];
}

// Event system types
export interface AppEvent<T = unknown> {
  type: string;
  payload?: T;
  timestamp: number;
  source?: string;
}

export type EventHandler<T = unknown> = (event: AppEvent<T>) => void | Promise<void>;

export interface EventSubscription {
  unsubscribe(): void;
}

// Navigation types
export interface Route {
  path: string;
  moduleId: string;
  params?: RouteParams;
  meta?: Record<string, unknown>;
}

export interface NavigationGuard {
  (to: Route, from: Route | null): boolean | Promise<boolean>;
}

// Storage types
export interface StorageAdapter {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
  has(key: string): boolean;
}

// UI Component types for modules
export interface ComponentDefinition {
  template: string;
  styles?: string;
  data?: () => unknown;
  methods?: Record<string, Function>;
  mounted?: () => void;
  unmounted?: () => void;
}

// Module communication
export interface ModuleMessage<T = unknown> {
  from: string;
  to: string;
  type: string;
  data?: T;
  replyTo?: string;
}

export interface ModuleMessageHandler<T = unknown, R = unknown> {
  (message: ModuleMessage<T>): R | Promise<R>;
}