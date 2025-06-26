/**
 * Type-safe path configuration system for the lawyer-chat application.
 * Handles base path configuration for deployment at any URL path.
 */

const BASE_PATH = process.env.BASE_PATH || '';

export const pathConfig = {
  basePath: BASE_PATH,
  api: {
    auth: {
      login: '/api/auth/signin',
      register: '/api/auth/register',
      verify: '/api/auth/verify',
      nextauth: '/api/auth/[...nextauth]',
      error: '/api/auth/error'
    },
    chats: {
      base: '/api/chats',
      byId: (id: string) => `/api/chats/${id}`,
      messages: (id: string) => `/api/chats/${id}/messages`
    },
    chat: '/api/chat', // Streaming chat endpoint
    admin: {
      users: '/api/admin/users',
      auditLogs: '/api/admin/audit-logs'
    },
    health: '/api/health'
  },
  assets: {
    logo: '/logo.png',
    logoDark: '/logo-dark.png',
    favicon: '/favicon.ico'
  },
  pages: {
    home: '/',
    login: '/auth/signin',
    register: '/auth/register',
    authError: '/auth/error',
    admin: '/admin'
  },
  external: {
    n8nWebhook: process.env.N8N_WEBHOOK_URL || 'http://n8n:5678/webhook/legal-chat'
  }
} as const;

export type PathConfig = typeof pathConfig;

/**
 * Build a path with the configured base path.
 * @param path - The path to build (should start with /)
 * @returns The path with base path prepended if configured
 */
export function buildPath(path: string): string {
  if (!BASE_PATH) return path;
  // Ensure path starts with / and doesn't double up slashes
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_PATH}${normalizedPath}`;
}

/**
 * Build an API URL with the base path.
 * @param endpoint - The API endpoint path
 * @returns The full API URL with base path
 */
export function buildApiUrl(endpoint: string): string {
  return buildPath(endpoint);
}

/**
 * Build an asset path with type safety.
 * @param asset - The asset key from pathConfig.assets
 * @returns The full asset path with base path
 */
export function buildAssetPath(asset: keyof typeof pathConfig.assets): string {
  return buildPath(pathConfig.assets[asset]);
}

/**
 * Build a page path with type safety.
 * @param page - The page key from pathConfig.pages
 * @returns The full page path with base path
 */
export function buildPagePath(page: keyof typeof pathConfig.pages): string {
  return buildPath(pathConfig.pages[page]);
}

/**
 * Get the full URL for an endpoint (client-side only).
 * Useful for WebSocket connections or external API calls.
 * @param endpoint - The endpoint path
 * @returns The full URL including protocol and host
 */
export function getFullUrl(endpoint: string): string {
  if (typeof window === 'undefined') {
    throw new Error('getFullUrl can only be used on the client side');
  }
  
  const url = new URL(endpoint, window.location.origin);
  if (BASE_PATH && !endpoint.startsWith('http')) {
    url.pathname = BASE_PATH + url.pathname;
  }
  return url.toString();
}

/**
 * Check if we're running with a base path.
 * @returns true if BASE_PATH is configured
 */
export function hasBasePath(): boolean {
  return Boolean(BASE_PATH);
}

/**
 * Get the configured base path.
 * @returns The base path or empty string
 */
export function getBasePath(): string {
  return BASE_PATH;
}

/**
 * Remove the base path from a URL path.
 * Useful for routing logic that needs the path without base.
 * @param fullPath - The full path including base path
 * @returns The path without base path
 */
export function removeBasePath(fullPath: string): string {
  if (!BASE_PATH || !fullPath.startsWith(BASE_PATH)) {
    return fullPath;
  }
  return fullPath.slice(BASE_PATH.length) || '/';
}