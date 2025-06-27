'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { createLogger } from '@/utils/logger';
import { errorMonitoring } from '@/lib/errorMonitoring';

const logger = createLogger('error-boundary');

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnKeysChange?: boolean;
  isolate?: boolean;
  level?: 'page' | 'section' | 'component';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: NodeJS.Timeout | null = null;
  private previousResetKeys: Array<string | number> = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
    
    if (props.resetKeys) {
      this.previousResetKeys = props.resetKeys;
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component' } = this.props;
    const { errorCount } = this.state;

    // Log error with context
    logger.error(`React ErrorBoundary caught error at ${level} level`, error, {
      componentStack: errorInfo.componentStack,
      errorBoundaryLevel: level,
      errorCount: errorCount + 1,
      ...this.getErrorContext()
    });

    // Send to error monitoring service
    errorMonitoring.captureException(error, {
      component: 'ErrorBoundary',
      componentStack: errorInfo.componentStack,
      errorBoundaryLevel: level,
      errorCount: errorCount + 1,
      ...this.getErrorContext()
    }, level === 'page' ? 'high' : 'medium');

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Update state with error info
    this.setState({
      errorInfo,
      errorCount: errorCount + 1
    });

    // Auto-reset after 5 errors to prevent infinite loops
    if (errorCount >= 4) {
      this.scheduleReset(5000);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnKeysChange } = this.props;
    
    if (resetKeys && resetOnKeysChange && this.state.hasError) {
      const hasResetKeyChanged = resetKeys.some((key, index) => 
        key !== this.previousResetKeys[index]
      );
      
      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
        this.previousResetKeys = resetKeys;
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private getErrorContext() {
    // Collect additional context for error logging
    return {
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      timestamp: new Date().toISOString()
    };
  }

  private scheduleReset = (delay: number) => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
    
    this.resetTimeoutId = setTimeout(() => {
      this.resetErrorBoundary();
    }, delay);
  };

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    });
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback, isolate, level = 'component' } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return <>{fallback}</>;
      }

      // For isolated components, show minimal error UI
      if (isolate) {
        return (
          <div className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 mx-auto text-yellow-500 mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Something went wrong in this component
            </p>
            <button
              onClick={this.resetErrorBoundary}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Try again
            </button>
          </div>
        );
      }

      // Default error UI based on level
      return <ErrorFallback 
        error={error} 
        resetError={this.resetErrorBoundary}
        level={level}
      />;
    }

    return children;
  }
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  level: 'page' | 'section' | 'component';
}

function ErrorFallback({ error, resetError, level }: ErrorFallbackProps) {
  const isDarkMode = typeof window !== 'undefined' && 
    document.documentElement.classList.contains('dark');

  const isNetworkError = error.message.toLowerCase().includes('fetch') || 
    error.message.toLowerCase().includes('network');

  return (
    <div className={`min-h-[400px] flex items-center justify-center p-8 ${
      level === 'page' ? 'min-h-screen' : ''
    }`}>
      <div className="max-w-md w-full">
        <div className={`rounded-lg p-6 text-center ${
          isDarkMode 
            ? 'bg-gray-800 border border-gray-700' 
            : 'bg-white border border-gray-200 shadow-lg'
        }`}>
          <div className="flex justify-center mb-4">
            <div className={`p-3 rounded-full ${
              isDarkMode ? 'bg-red-900/20' : 'bg-red-100'
            }`}>
              <AlertTriangle className={`w-8 h-8 ${
                isDarkMode ? 'text-red-400' : 'text-red-600'
              }`} />
            </div>
          </div>
          
          <h2 className={`text-xl font-semibold mb-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {level === 'page' 
              ? 'Oops! Something went wrong' 
              : 'Component Error'}
          </h2>
          
          <p className={`mb-6 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            {isNetworkError
              ? 'Unable to connect to the server. Please check your connection and try again.'
              : level === 'page'
              ? 'We encountered an unexpected error. This has been logged and we\'ll look into it.'
              : 'This component encountered an error and cannot be displayed.'}
          </p>

          {/* Error details in development */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mb-4 text-left">
              <summary className={`cursor-pointer text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Error details
              </summary>
              <pre className={`mt-2 p-2 text-xs overflow-auto rounded ${
                isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'
              }`}>
                {error.toString()}
                {error.stack && `\n\nStack trace:\n${error.stack}`}
              </pre>
            </details>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={resetError}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                isDarkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            
            {level === 'page' && (
              <button
                onClick={() => window.location.href = '/'}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Convenience wrapper for async components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}