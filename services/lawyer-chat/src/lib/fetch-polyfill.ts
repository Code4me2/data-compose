import { logger } from '@/utils/logger';

// Polyfill for fetch to ensure proper error handling
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  const fetchLogger = logger;
  
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      
      // Only log in development for debugging auth flow
      if (process.env.NODE_ENV === 'development' && url?.includes('/api/auth')) {
        fetchLogger.debug('Auth request initiated', { 
          url,
          method: init?.method || 'GET'
        });
      }
      
      const response = await originalFetch(input, init);
      
      if (process.env.NODE_ENV === 'development' && url?.includes('/api/auth')) {
        fetchLogger.debug('Auth response received', { 
          url,
          status: response.status,
          statusText: response.statusText
        });
      }
      
      return response;
    } catch (error) {
      fetchLogger.error('Fetch request failed', error, {
        url: typeof input === 'string' ? input : 'complex-input',
        method: init?.method || 'GET'
      });
      throw error;
    }
  };
}