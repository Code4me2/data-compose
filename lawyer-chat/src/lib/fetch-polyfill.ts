// Polyfill for fetch to ensure proper error handling
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      
      // Log auth-related requests for debugging
      if (url?.includes('/api/auth')) {
        console.log('[Fetch Debug] Auth request:', url, init);
      }
      
      const response = await originalFetch(input, init);
      
      if (url?.includes('/api/auth')) {
        console.log('[Fetch Debug] Auth response:', response.status, response.statusText);
      }
      
      return response;
    } catch (error) {
      console.error('[Fetch Error]', error);
      throw error;
    }
  };
}