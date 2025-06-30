import { useCsrfStore } from '@/store/csrf';

interface FetchOptions extends RequestInit {
  includeAuth?: boolean;
}

/**
 * Enhanced fetch wrapper that automatically includes CSRF token
 * for state-changing requests
 */
export async function apiFetch(url: string, options: FetchOptions = {}): Promise<Response> {
  const { method = 'GET', headers = {}, includeAuth = true, ...restOptions } = options;
  
  // Prepend basePath to relative URLs
  const basePath = ''; // Removed for local development
  const fullUrl = url.startsWith('http') || url.startsWith('//') 
    ? url 
    : `${basePath}${url}`;
  
  // Get CSRF token from store
  const csrfToken = useCsrfStore.getState().csrfToken;
  
  // Create headers object
  const enhancedHeaders: Record<string, string> = {
    ...(headers as Record<string, string>)
  };
  
  // Add CSRF token for state-changing requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase()) && csrfToken) {
    enhancedHeaders['X-CSRF-Token'] = csrfToken;
  }
  
  // Always include credentials for authentication
  const enhancedOptions: RequestInit = {
    ...restOptions,
    method,
    headers: enhancedHeaders,
    credentials: includeAuth ? 'include' : 'omit'
  };
  
  const response = await fetch(fullUrl, enhancedOptions);
  
  // If CSRF token is invalid, try to refresh it and retry once
  if (response.status === 403) {
    const data = await response.json().catch(() => ({}));
    if (data.code === 'CSRF_TOKEN_INVALID') {
      // Refresh CSRF token
      await useCsrfStore.getState().fetchCsrfToken();
      const newCsrfToken = useCsrfStore.getState().csrfToken;
      
      if (newCsrfToken && newCsrfToken !== csrfToken) {
        // Retry with new token
        enhancedHeaders['X-CSRF-Token'] = newCsrfToken;
        return fetch(fullUrl, {
          ...enhancedOptions,
          headers: enhancedHeaders
        });
      }
    }
  }
  
  return response;
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: (url: string, options?: Omit<FetchOptions, 'method'>) => 
    apiFetch(url, { ...options, method: 'GET' }),
    
  post: <T = unknown>(url: string, body?: T, options?: Omit<FetchOptions, 'method' | 'body'>) => 
    apiFetch(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      body: body ? JSON.stringify(body) : undefined
    }),
    
  put: <T = unknown>(url: string, body?: T, options?: Omit<FetchOptions, 'method' | 'body'>) => 
    apiFetch(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      body: body ? JSON.stringify(body) : undefined
    }),
    
  delete: (url: string, options?: Omit<FetchOptions, 'method'>) => 
    apiFetch(url, { ...options, method: 'DELETE' }),
    
  patch: <T = unknown>(url: string, body?: T, options?: Omit<FetchOptions, 'method' | 'body'>) => 
    apiFetch(url, {
      ...options,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      body: body ? JSON.stringify(body) : undefined
    })
};