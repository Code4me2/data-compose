import { api } from '../api';

// Mock the global fetch
global.fetch = jest.fn();

// Mock the csrf store
jest.mock('@/store/csrf', () => ({
  useCsrfStore: {
    getState: () => ({
      csrfToken: 'test-csrf-token',
      fetchCsrfToken: jest.fn(),
    }),
  },
}));

describe('api utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
      text: async () => 'Success',
      headers: new Headers(),
    });
  });

  describe('api.get', () => {
    it('should make GET request with correct headers', async () => {
      await api.get('/test-endpoint');

      expect(global.fetch).toHaveBeenCalledWith('/test-endpoint', {
        method: 'GET',
        headers: {
          'X-CSRF-Token': 'test-csrf-token',
        },
        credentials: 'include',
      });
    });

    it('should handle query parameters', async () => {
      await api.get('/test-endpoint', { 
        params: { foo: 'bar', baz: 123 } 
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/test-endpoint?foo=bar&baz=123',
        expect.any(Object)
      );
    });

    it('should handle errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(api.get('/test-endpoint')).rejects.toThrow('Not Found');
    });
  });

  describe('api.post', () => {
    it('should make POST request with JSON body', async () => {
      const data = { name: 'Test', value: 123 };
      await api.post('/test-endpoint', data);

      expect(global.fetch).toHaveBeenCalledWith('/test-endpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'test-csrf-token',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
    });

    it('should handle null body', async () => {
      await api.post('/test-endpoint');

      expect(global.fetch).toHaveBeenCalledWith('/test-endpoint', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': 'test-csrf-token',
        },
        credentials: 'include',
      });
    });

    it('should merge custom headers', async () => {
      await api.post('/test-endpoint', { data: 'test' }, {
        headers: { 'X-Custom': 'header' }
      });

      expect(global.fetch).toHaveBeenCalledWith('/test-endpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'test-csrf-token',
          'X-Custom': 'header',
        },
        body: JSON.stringify({ data: 'test' }),
        credentials: 'include',
      });
    });
  });

  describe('api.put', () => {
    it('should make PUT request', async () => {
      const data = { id: 1, name: 'Updated' };
      await api.put('/test-endpoint', data);

      expect(global.fetch).toHaveBeenCalledWith('/test-endpoint', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'test-csrf-token',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
    });
  });

  describe('api.delete', () => {
    it('should make DELETE request', async () => {
      await api.delete('/test-endpoint');

      expect(global.fetch).toHaveBeenCalledWith('/test-endpoint', {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': 'test-csrf-token',
        },
        credentials: 'include',
      });
    });
  });

  describe('api.stream', () => {
    it('should handle SSE stream', async () => {
      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({ 
            done: false, 
            value: new TextEncoder().encode('data: {"message": "Hello"}\n\n') 
          })
          .mockResolvedValueOnce({ 
            done: false, 
            value: new TextEncoder().encode('data: {"message": "World"}\n\n') 
          })
          .mockResolvedValueOnce({ done: true }),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const messages: any[] = [];
      await api.stream('/test-stream', {
        onMessage: (data) => messages.push(data),
      });

      expect(messages).toEqual([
        { message: 'Hello' },
        { message: 'World' },
      ]);
    });

    it('should handle stream errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const onError = jest.fn();
      await api.stream('/test-stream', {
        onMessage: jest.fn(),
        onError,
      });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});