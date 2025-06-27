/**
 * Production-safe logger utility
 * 
 * This logger ensures that:
 * 1. No sensitive data is logged
 * 2. Logging is controlled by environment
 * 3. Errors are properly formatted
 * 4. Development has full logging, production has minimal logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isTest = process.env.NODE_ENV === 'test';
  
  // In production, only log warnings and errors
  private shouldLog(level: LogLevel): boolean {
    if (this.isTest) return false; // No logs during tests
    if (this.isDevelopment) return true; // All logs in development
    
    // In production, only log warnings and errors
    return level === 'warn' || level === 'error';
  }

  private sanitizeError(error: unknown): unknown {
    if (error instanceof Error) {
      return {
        message: error.message,
        name: error.name,
        // Only include stack in development
        ...(this.isDevelopment && { stack: error.stack })
      };
    }
    return error;
  }

  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) return undefined;
    
    // Remove sensitive fields
    const sanitized = { ...context };
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization', 'cookie'];
    
    Object.keys(sanitized).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const sanitizedContext = this.sanitizeContext(context);
    
    // In production, use structured logging
    if (!this.isDevelopment) {
      const logEntry = {
        timestamp,
        level,
        message,
        ...(sanitizedContext && { context: sanitizedContext })
      };
      
      // Use appropriate console method
      switch (level) {
        case 'error':
          console.error(JSON.stringify(logEntry));
          break;
        case 'warn':
          console.warn(JSON.stringify(logEntry));
          break;
        default:
          console.log(JSON.stringify(logEntry));
      }
    } else {
      // In development, use readable format
      const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
      const logArgs: [string, string, LogContext?] = sanitizedContext 
        ? [prefix, message, sanitizedContext]
        : [prefix, message];
      
      switch (level) {
        case 'error':
          console.error(...logArgs);
          break;
        case 'warn':
          console.warn(...logArgs);
          break;
        case 'debug':
          console.log(...logArgs);
          break;
        default:
          console.log(...logArgs);
      }
    }
  }

  debug(message: string, context?: LogContext): void {
    this.formatMessage('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.formatMessage('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.formatMessage('warn', message, context);
  }

  error(message: string, error?: unknown, context?: LogContext): void {
    const errorContext: LogContext = {
      ...(context || {}),
      ...(error ? { error: this.sanitizeError(error) } : {})
    };
    this.formatMessage('error', message, errorContext);
  }

  // Special method for email logging in development
  emailDebug(type: string, data: Record<string, unknown>): void {
    if (this.isDevelopment) {
      console.log('=================================');
      console.log(`${type} (DEV MODE)`);
      Object.entries(data).forEach(([key, value]) => {
        if (key.toLowerCase().includes('password') || key.toLowerCase().includes('token')) {
          console.log(`${key}: [REDACTED]`);
        } else {
          console.log(`${key}:`, value);
        }
      });
      console.log('=================================');
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export type-safe logger for specific contexts
export function createLogger(context: string) {
  return {
    debug: (message: string, data?: LogContext) => logger.debug(message, { ...data, context }),
    info: (message: string, data?: LogContext) => logger.info(message, { ...data, context }),
    warn: (message: string, data?: LogContext) => logger.warn(message, { ...data, context }),
    error: (message: string, error?: unknown, data?: LogContext) => logger.error(message, error, { ...data, context })
  };
}