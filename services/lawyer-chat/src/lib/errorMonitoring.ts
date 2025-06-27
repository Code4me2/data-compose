import { createLogger } from '@/utils/logger';

const logger = createLogger('error-monitoring');

export interface ErrorReport {
  error: Error;
  context?: {
    userId?: string;
    sessionId?: string;
    component?: string;
    action?: string;
    url?: string;
    userAgent?: string;
    timestamp: string;
    [key: string]: unknown;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class ErrorMonitoringService {
  private queue: ErrorReport[] = [];
  private isInitialized = false;

  initialize() {
    if (this.isInitialized) return;
    
    // Initialize error monitoring service (e.g., Sentry, Rollbar)
    if (process.env.NODE_ENV === 'production') {
      // TODO: Add your error monitoring service initialization here
      // Example with Sentry:
      // if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      //   Sentry.init({
      //     dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      //     environment: process.env.NODE_ENV,
      //     integrations: [
      //       new Sentry.BrowserTracing(),
      //       new Sentry.Replay()
      //     ],
      //     tracesSampleRate: 0.1,
      //     replaysSessionSampleRate: 0.1,
      //     replaysOnErrorSampleRate: 1.0,
      //   });
      // }
    }
    
    this.isInitialized = true;
    
    // Process any queued errors
    this.processQueue();
  }

  captureException(error: Error, context?: ErrorReport['context'], severity: ErrorReport['severity'] = 'medium') {
    const report: ErrorReport = {
      error,
      context: {
        ...context,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      },
      severity
    };

    // Log locally
    logger.error('Captured exception', error, report.context);

    if (!this.isInitialized) {
      // Queue the error if service not initialized yet
      this.queue.push(report);
      return;
    }

    this.sendToMonitoringService(report);
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorReport['context']) {
    const logContext = {
      ...context,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : undefined
    };

    // Log locally based on level
    switch (level) {
      case 'error':
        logger.error(message, undefined, logContext);
        break;
      case 'warning':
        logger.warn(message, logContext);
        break;
      default:
        logger.info(message, logContext);
    }

    if (this.isInitialized && process.env.NODE_ENV === 'production') {
      // TODO: Send to monitoring service
      // Example: Sentry.captureMessage(message, level);
    }
  }

  setUserContext(userId: string, email?: string, role?: string) {
    if (this.isInitialized && process.env.NODE_ENV === 'production') {
      // TODO: Set user context in monitoring service
      // Example:
      // Sentry.setUser({
      //   id: userId,
      //   email,
      //   role
      // });
    }
  }

  clearUserContext() {
    if (this.isInitialized && process.env.NODE_ENV === 'production') {
      // TODO: Clear user context
      // Example: Sentry.setUser(null);
    }
  }

  private processQueue() {
    while (this.queue.length > 0) {
      const report = this.queue.shift();
      if (report) {
        this.sendToMonitoringService(report);
      }
    }
  }

  private sendToMonitoringService(report: ErrorReport) {
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to your monitoring service
      // Example with Sentry:
      // Sentry.captureException(report.error, {
      //   level: this.mapSeverityToLevel(report.severity),
      //   contexts: {
      //     custom: report.context
      //   }
      // });
    }
  }

  private mapSeverityToLevel(severity: ErrorReport['severity']): 'debug' | 'info' | 'warning' | 'error' | 'fatal' {
    switch (severity) {
      case 'critical':
        return 'fatal';
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
    }
  }
}

// Export singleton instance
export const errorMonitoring = new ErrorMonitoringService();

// Initialize on client side
if (typeof window !== 'undefined') {
  errorMonitoring.initialize();
}