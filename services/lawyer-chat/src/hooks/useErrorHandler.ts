import { useCallback } from 'react';
import { createLogger } from '@/utils/logger';

const logger = createLogger('error-handler');

interface ErrorMetadata {
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: unknown;
}

export function useErrorHandler(componentName: string) {
  const logError = useCallback((
    error: Error | unknown,
    metadata?: ErrorMetadata
  ) => {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    // Log to our logger
    logger.error(`Error in ${componentName}`, errorObj, {
      component: componentName,
      ...metadata,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
    });

    // In production, send to error monitoring service
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      // TODO: Integrate with Sentry, Rollbar, or similar service
      // Example:
      // if (window.Sentry) {
      //   window.Sentry.captureException(errorObj, {
      //     tags: { component: componentName },
      //     extra: metadata
      //   });
      // }
    }
  }, [componentName]);

  const logWarning = useCallback((
    message: string,
    metadata?: ErrorMetadata
  ) => {
    logger.warn(`Warning in ${componentName}: ${message}`, {
      component: componentName,
      ...metadata
    });
  }, [componentName]);

  const captureError = useCallback((
    error: Error | unknown,
    fallbackAction?: () => void
  ) => {
    logError(error);
    
    // Execute fallback action if provided
    if (fallbackAction) {
      try {
        fallbackAction();
      } catch (fallbackError) {
        logger.error('Fallback action failed', fallbackError, {
          component: componentName,
          originalError: error
        });
      }
    }
  }, [componentName, logError]);

  return {
    logError,
    logWarning,
    captureError
  };
}

// Hook for async error handling
export function useAsyncError() {
  return useCallback((error: Error | unknown) => {
    throw error; // This will be caught by the nearest error boundary
  }, []);
}