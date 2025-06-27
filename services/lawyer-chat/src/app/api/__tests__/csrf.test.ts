import { GET } from '../../csrf/route';
import { createMockRequest, parseJsonResponse } from './test-helpers';

describe('/api/csrf', () => {
  describe('GET', () => {
    it('should return a CSRF token', async () => {
      const request = createMockRequest('/api/csrf');
      const response = await GET(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('csrfToken');
      expect(typeof data.csrfToken).toBe('string');
      expect(data.csrfToken).toHaveLength(64);
    });

    it('should return different tokens on each request', async () => {
      const request1 = createMockRequest('/api/csrf');
      const response1 = await GET(request1);
      const data1 = await parseJsonResponse(response1);

      const request2 = createMockRequest('/api/csrf');
      const response2 = await GET(request2);
      const data2 = await parseJsonResponse(response2);

      expect(data1.csrfToken).not.toBe(data2.csrfToken);
    });

    it('should set appropriate headers', async () => {
      const request = createMockRequest('/api/csrf');
      const response = await GET(request);

      expect(response.headers.get('Cache-Control')).toBe('no-store, max-age=0');
    });
  });
});