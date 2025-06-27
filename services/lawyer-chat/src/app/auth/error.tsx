'use client';

import { useEffect } from 'react';
import { AlertTriangle, Home, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createLogger } from '@/utils/logger';

const logger = createLogger('auth-error');

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  
  useEffect(() => {
    logger.error('Authentication error', error, {
      digest: error.digest,
      url: window.location.href
    });
  }, [error]);

  const isDarkMode = typeof window !== 'undefined' && 
    document.documentElement.classList.contains('dark');

  const isCredentialsError = error.message.toLowerCase().includes('credentials') ||
    error.message.toLowerCase().includes('invalid') ||
    error.message.toLowerCase().includes('unauthorized');

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className={`rounded-lg p-8 text-center ${
          isDarkMode 
            ? 'bg-gray-800 border border-gray-700' 
            : 'bg-white border border-gray-200 shadow-xl'
        }`}>
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className={`p-4 rounded-full ${
              isDarkMode ? 'bg-yellow-900/20' : 'bg-yellow-100'
            }`}>
              <AlertTriangle className={`w-10 h-10 ${
                isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
              }`} />
            </div>
          </div>
          
          {/* Error Title */}
          <h1 className={`text-xl font-bold mb-3 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Authentication Error
          </h1>
          
          {/* Error Description */}
          <p className={`mb-6 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            {isCredentialsError
              ? 'The email or password you entered is incorrect. Please try again.'
              : 'We encountered an error during authentication. Please try again or contact support if the issue persists.'}
          </p>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/auth/signin')}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Try Again
            </button>
            
            <button
              onClick={() => router.push('/')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-md font-medium transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              <Home className="w-4 h-4" />
              Go Home
            </button>
          </div>

          {/* Help Links */}
          <div className={`mt-6 pt-6 border-t ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <p className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Need help?{' '}
              <a 
                href="/auth/forgot-password" 
                className="text-blue-500 hover:text-blue-600 underline"
              >
                Reset your password
              </a>
              {' or '}
              <a 
                href="mailto:support@reichmanjorgensen.com" 
                className="text-blue-500 hover:text-blue-600 underline"
              >
                contact support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}