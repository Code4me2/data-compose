'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { createLogger } from '@/utils/logger';

const logger = createLogger('global-error');

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service
    logger.error('Global error boundary caught error', error, {
      digest: error.digest,
      url: window.location.href,
      timestamp: new Date().toISOString()
    });
  }, [error]);

  const isDarkMode = typeof window !== 'undefined' && 
    document.documentElement.classList.contains('dark');

  const isNetworkError = error.message.toLowerCase().includes('fetch') || 
    error.message.toLowerCase().includes('network');

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className={`rounded-lg p-8 text-center ${
          isDarkMode 
            ? 'bg-gray-800 border border-gray-700' 
            : 'bg-white border border-gray-200 shadow-xl'
        }`}>
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className={`p-4 rounded-full ${
              isDarkMode ? 'bg-red-900/20' : 'bg-red-100'
            }`}>
              <AlertTriangle className={`w-12 h-12 ${
                isDarkMode ? 'text-red-400' : 'text-red-600'
              }`} />
            </div>
          </div>
          
          {/* Error Title */}
          <h1 className={`text-2xl font-bold mb-3 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Oops! Something went wrong
          </h1>
          
          {/* Error Description */}
          <p className={`text-lg mb-8 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            {isNetworkError
              ? 'We\'re having trouble connecting to our servers. Please check your internet connection and try again.'
              : 'We encountered an unexpected error. Our team has been notified and is working to fix the issue.'}
          </p>

          {/* Error Code */}
          {error.digest && (
            <p className={`text-sm mb-6 font-mono ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`}>
              Error Code: {error.digest}
            </p>
          )}

          {/* Error details in development */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mb-6 text-left">
              <summary className={`cursor-pointer text-sm font-medium ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Developer Info
              </summary>
              <div className={`mt-3 p-4 text-xs font-mono overflow-auto rounded ${
                isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-700'
              }`}>
                <div className="mb-2">
                  <strong>Error:</strong> {error.toString()}
                </div>
                {error.stack && (
                  <div>
                    <strong>Stack trace:</strong>
                    <pre className="mt-1 whitespace-pre-wrap">{error.stack}</pre>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={reset}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>
            
            <button
              onClick={() => window.location.href = '/'}
              className={`flex items-center gap-2 px-6 py-3 rounded-md font-medium transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              <Home className="w-5 h-5" />
              Go Home
            </button>
          </div>

          {/* Support Message */}
          <p className={`mt-8 text-sm ${
            isDarkMode ? 'text-gray-500' : 'text-gray-400'
          }`}>
            If this problem persists, please contact support at{' '}
            <a 
              href="mailto:support@reichmanjorgensen.com" 
              className="text-blue-500 hover:text-blue-600 underline"
            >
              support@reichmanjorgensen.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}