import { createLogger, sanitizeForLogging } from '../logger';

describe('logger utils', () => {
  let consoleSpy: {
    log: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createLogger', () => {
    it('should create a logger with the given context', () => {
      const logger = createLogger('test-context');
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('error');
      expect(logger).toHaveProperty('debug');
    });

    describe('in development mode', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
      });

      it('should log info messages with context', () => {
        const logger = createLogger('test');
        logger.info('Test message', { data: 'value' });
        
        expect(consoleSpy.log).toHaveBeenCalledWith(
          '[test]',
          'Test message',
          { data: 'value' }
        );
      });

      it('should log warnings with context', () => {
        const logger = createLogger('test');
        logger.warn('Warning message');
        
        expect(consoleSpy.warn).toHaveBeenCalledWith(
          '[test]',
          'Warning message'
        );
      });

      it('should log errors with context and error object', () => {
        const logger = createLogger('test');
        const error = new Error('Test error');
        logger.error('Error occurred', error);
        
        expect(consoleSpy.error).toHaveBeenCalledWith(
          '[test]',
          'Error occurred',
          error,
          undefined
        );
      });
    });

    describe('in production mode', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      it('should log JSON formatted messages', () => {
        const logger = createLogger('prod-test');
        logger.info('Production log', { userId: 123 });
        
        expect(consoleSpy.log).toHaveBeenCalled();
        const logCall = consoleSpy.log.mock.calls[0][0];
        const parsed = JSON.parse(logCall);
        
        expect(parsed).toMatchObject({
          level: 'info',
          context: 'prod-test',
          message: 'Production log',
          data: { userId: 123 }
        });
        expect(parsed.timestamp).toBeDefined();
      });

      it('should not log debug messages', () => {
        const logger = createLogger('prod-test');
        logger.debug('Debug message');
        
        expect(consoleSpy.log).not.toHaveBeenCalled();
      });
    });
  });

  describe('sanitizeForLogging', () => {
    it('should remove sensitive fields', () => {
      const input = {
        username: 'user@example.com',
        password: 'secret123',
        token: 'jwt-token',
        apiKey: 'api-key-123',
        data: 'safe-data'
      };

      const sanitized = sanitizeForLogging(input);
      
      expect(sanitized).toEqual({
        username: 'user@example.com',
        password: '[REDACTED]',
        token: '[REDACTED]',
        apiKey: '[REDACTED]',
        data: 'safe-data'
      });
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          email: 'test@example.com',
          auth: {
            password: 'secret',
            token: 'token123'
          }
        }
      };

      const sanitized = sanitizeForLogging(input);
      
      expect(sanitized.user.auth.password).toBe('[REDACTED]');
      expect(sanitized.user.auth.token).toBe('[REDACTED]');
      expect(sanitized.user.email).toBe('test@example.com');
    });

    it('should handle arrays', () => {
      const input = {
        users: [
          { name: 'User1', password: 'pass1' },
          { name: 'User2', password: 'pass2' }
        ]
      };

      const sanitized = sanitizeForLogging(input);
      
      expect(sanitized.users[0].password).toBe('[REDACTED]');
      expect(sanitized.users[1].password).toBe('[REDACTED]');
    });

    it('should handle null and undefined values', () => {
      expect(sanitizeForLogging(null)).toBe(null);
      expect(sanitizeForLogging(undefined)).toBe(undefined);
      expect(sanitizeForLogging({ key: null })).toEqual({ key: null });
    });

    it('should handle circular references', () => {
      interface CircularObj {
        name: string;
        circular?: CircularObj;
      }
      const obj: CircularObj = { name: 'test' };
      obj.circular = obj;
      
      expect(() => sanitizeForLogging(obj)).not.toThrow();
    });
  });
});