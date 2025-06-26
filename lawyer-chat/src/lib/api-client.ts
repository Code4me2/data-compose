/**
 * Type-safe API client for the lawyer-chat application.
 * Handles base path configuration and provides typed responses.
 */

import { getBasePath } from './paths';

interface ApiRequestConfig extends Omit<RequestInit, 'body'> {
  params?: Record<string, string>;
  body?: unknown;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
  ok: boolean;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

class TypedApiClient {
  private basePath: string;

  constructor() {
    this.basePath = getBasePath();
  }

  /**
   * Build a full URL with base path and query parameters.
   */
  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    // Handle both relative and absolute URLs
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      // External URL, use as-is
      const url = new URL(endpoint);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
      }
      return url.toString();
    }

    // Internal URL, build with base path
    const url = new URL(
      this.basePath + endpoint,
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'
    );

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    return url.toString();
  }

  /**
   * Make a typed API request.
   */
  async request<T>(
    endpoint: string,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    const { params, body, ...fetchConfig } = config || {};
    const url = this.buildUrl(endpoint, params);

    try {
      const headers: HeadersInit = {
        ...fetchConfig.headers,
      };

      // Add Content-Type for JSON bodies
      if (body && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(url, {
        ...fetchConfig,
        headers,
        body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      });

      // Handle different response types
      const contentType = response.headers.get('content-type');
      let data: unknown = null;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else if (contentType?.includes('text/')) {
        data = await response.text();
      } else if (response.ok) {
        // For successful responses with no content
        data = null;
      }

      // Handle API errors
      if (!response.ok) {
        const error = data as ApiError;
        return {
          error: error?.error || `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          ok: false,
        };
      }

      return {
        data: data as T,
        status: response.status,
        ok: true,
      };
    } catch (error) {
      // Network or parsing errors
      return {
        error: error instanceof Error ? error.message : 'Network error',
        status: 0,
        ok: false,
      };
    }
  }

  /**
   * GET request with typed response.
   */
  get<T>(endpoint: string, params?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  /**
   * POST request with typed response.
   */
  post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  /**
   * PUT request with typed response.
   */
  put<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  /**
   * PATCH request with typed response.
   */
  patch<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  /**
   * DELETE request with typed response.
   */
  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * Stream a response using Server-Sent Events.
   * Useful for chat streaming responses.
   */
  async stream(
    endpoint: string,
    body?: unknown,
    onMessage?: (message: string) => void,
    onError?: (error: string) => void
  ): Promise<void> {
    const url = this.buildUrl(endpoint);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const error = await response.text();
        onError?.(error || `HTTP ${response.status}`);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        onError?.('No response body');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            onMessage?.(data);
          }
        }
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Stream error');
    }
  }
}

// Export a singleton instance
export const apiClient = new TypedApiClient();

// Export types for use in components
export type { TypedApiClient };