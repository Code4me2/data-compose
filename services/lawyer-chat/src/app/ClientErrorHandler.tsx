'use client';

import { useEffect } from 'react';
import { errorMonitoring } from '@/lib/errorMonitoring';
import { createLogger } from '@/utils/logger';

const logger = createLogger('client-error-handler');

export default function ClientErrorHandler() {
  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logger.error('Unhandled promise rejection', event.reason, {
        promise: event.promise
      });
      
      errorMonitoring.captureException(
        new Error(event.reason?.message || 'Unhandled promise rejection'),
        {
          component: 'window',
          action: 'unhandledrejection',
          reason: event.reason,
          timestamp: new Date().toISOString()
        },
        'high'
      );
    };

    // Handle global errors
    const handleError = (event: ErrorEvent) => {
      logger.error('Global error', event.error || new Error(event.message), {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
      
      errorMonitoring.captureException(
        event.error || new Error(event.message),
        {
          component: 'window',
          action: 'error',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          timestamp: new Date().toISOString()
        },
        'critical'
      );
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return null;
}