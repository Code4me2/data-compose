import { generateCSRFToken, validateCSRFToken } from '../csrf';

describe('CSRF utils', () => {
  describe('generateCSRFToken', () => {
    it('should generate a token of the correct length', () => {
      const token = generateCSRFToken();
      expect(token).toHaveLength(64); // 32 bytes in hex = 64 characters
    });

    it('should generate unique tokens', () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateCSRFToken());
      }
      expect(tokens.size).toBe(100);
    });

    it('should only contain valid hex characters', () => {
      const token = generateCSRFToken();
      expect(token).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('validateCSRFToken', () => {
    it('should validate matching tokens', () => {
      const token = generateCSRFToken();
      expect(validateCSRFToken(token, token)).toBe(true);
    });

    it('should reject non-matching tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      expect(validateCSRFToken(token1, token2)).toBe(false);
    });

    it('should reject empty or invalid tokens', () => {
      const token = generateCSRFToken();
      expect(validateCSRFToken('', token)).toBe(false);
      expect(validateCSRFToken(token, '')).toBe(false);
      expect(validateCSRFToken('', '')).toBe(false);
      expect(validateCSRFToken(null as any, token)).toBe(false);
      expect(validateCSRFToken(token, undefined as any)).toBe(false);
    });

    it('should be case-sensitive', () => {
      const token = generateCSRFToken();
      expect(validateCSRFToken(token.toUpperCase(), token)).toBe(false);
    });

    it('should handle timing attack prevention', () => {
      // Ensure validation takes similar time for matching and non-matching tokens
      const token = generateCSRFToken();
      const wrongToken = generateCSRFToken();
      
      const start1 = performance.now();
      validateCSRFToken(token, token);
      const time1 = performance.now() - start1;
      
      const start2 = performance.now();
      validateCSRFToken(token, wrongToken);
      const time2 = performance.now() - start2;
      
      // Times should be within reasonable variance (not exact due to JS timing)
      expect(Math.abs(time1 - time2)).toBeLessThan(5);
    });
  });
});