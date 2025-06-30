import { validateMessage, sanitizeHtml } from '../validation';

describe('validation utils', () => {
  describe('validateMessage', () => {
    it('should return valid result for valid messages', () => {
      expect(validateMessage('Hello, this is a valid message').isValid).toBe(true);
      expect(validateMessage('A').isValid).toBe(true); // Single character
      expect(validateMessage('A'.repeat(10000)).isValid).toBe(true); // Max length
    });

    it('should return invalid result for invalid messages', () => {
      expect(validateMessage('').isValid).toBe(false);
      expect(validateMessage('   ').isValid).toBe(false); // Only whitespace
      expect(validateMessage('A'.repeat(10001)).isValid).toBe(false); // Exceeds max length
    });

    it('should trim whitespace before validation', () => {
      expect(validateMessage('  valid message  ').isValid).toBe(true);
      expect(validateMessage('  \n\t  ').isValid).toBe(false);
    });
    
    it('should provide error messages for invalid inputs', () => {
      const emptyResult = validateMessage('');
      expect(emptyResult.error).toBe('Message cannot be empty');
      
      const tooLongResult = validateMessage('A'.repeat(10001));
      expect(tooLongResult.error).toContain('Message too long');
    });
    
    it('should sanitize dangerous content', () => {
      const result = validateMessage('Hello<script>alert("XSS")</script>World');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('HelloWorld');
    });
  });

  describe('sanitizeHtml', () => {
    it('should remove dangerous HTML tags', () => {
      expect(sanitizeHtml('<script>alert("XSS")</script>Hello')).toBe('Hello');
      expect(sanitizeHtml('Hello<script>evil()</script>World')).toBe('HelloWorld');
      expect(sanitizeHtml('<iframe src="evil.com"></iframe>')).toBe('');
    });

    it('should preserve safe HTML tags', () => {
      expect(sanitizeHtml('<strong>Bold</strong> text')).toBe('<strong>Bold</strong> text');
      expect(sanitizeHtml('<em>emphasis</em> text')).toBe('<em>emphasis</em> text');
      expect(sanitizeHtml('<a href="https://example.com">Link</a>')).toBe('<a href="https://example.com">Link</a>');
    });

    it('should remove event handlers', () => {
      expect(sanitizeHtml('<p onclick="alert(1)">Click me</p>')).toBe('<p>Click me</p>');
      expect(sanitizeHtml('<a href="#" onclick="alert(1)">Link</a>')).toBe('<a href="#">Link</a>');
    });

    it('should handle markdown-style content', () => {
      const markdown = '# Title\n\n**Bold** and *italic* text';
      expect(sanitizeHtml(markdown)).toBe(markdown);
    });

    it('should handle empty and null inputs', () => {
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml(null as any)).toBe('');
      expect(sanitizeHtml(undefined as any)).toBe('');
    });

    it('should handle complex nested HTML', () => {
      const input = '<p>Safe <script>alert(1)</script> content</p>';
      const expected = '<p>Safe  content</p>';
      expect(sanitizeHtml(input)).toBe(expected);
    });
  });
});