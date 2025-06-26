'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Scale, AlertCircle, ArrowLeft } from 'lucide-react';
import { Suspense } from 'react';
import { useSidebarStore } from '@/store/sidebar';
import DarkModeWrapper from '@/components/DarkModeWrapper';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get('error');
  const { isDarkMode } = useSidebarStore();

  const getErrorDetails = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return {
          title: 'Server Configuration Error',
          message: 'There is a problem with the server configuration.',
          suggestion: 'Please contact support if this error persists.'
        };
      case 'AccessDenied':
        return {
          title: 'Access Denied',
          message: 'You do not have permission to sign in.',
          suggestion: 'Please contact an administrator for access.'
        };
      case 'Verification':
        return {
          title: 'Verification Error',
          message: 'The verification token has expired or is invalid.',
          suggestion: 'Please try signing in again.'
        };
      case 'Default':
      default:
        return {
          title: 'Authentication Error',
          message: 'An error occurred during authentication.',
          suggestion: 'Please try signing in again or contact support if the problem persists.'
        };
    }
  };

  const errorDetails = getErrorDetails(error);

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#1a1b1e]' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100'} flex items-center justify-center p-4`}>
      <div className="max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className={`w-12 h-12 ${isDarkMode ? 'bg-[#C7A562]' : 'bg-gradient-to-br from-blue-600 to-blue-700'} rounded-xl flex items-center justify-center shadow-lg`}>
              <Scale className={isDarkMode ? 'text-[#004A84]' : 'text-white'} size={24} />
            </div>
            <h1 className="text-3xl font-bold" style={{ color: isDarkMode ? '#ffffff' : '#004A84' }}>AI Legal</h1>
          </div>
          <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Professional Legal Assistant</p>
        </div>

        {/* Error Card */}
        <div className={`${isDarkMode ? 'bg-[#25262b] border-gray-700' : 'bg-white border-gray-200'} rounded-2xl shadow-xl border p-8`}>
          <div className="text-center">
            {/* Error Icon */}
            <div className="flex justify-center mb-4">
              <div className={`w-16 h-16 ${isDarkMode ? 'bg-red-900/20' : 'bg-red-100'} rounded-full flex items-center justify-center`}>
                <AlertCircle className={isDarkMode ? 'text-red-400' : 'text-red-600'} size={32} />
              </div>
            </div>

            {/* Error Details */}
            <h2 className={`text-2xl font-semibold mb-3 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
              {errorDetails.title}
            </h2>
            
            <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {errorDetails.message}
            </p>
            
            <p className={`text-sm mb-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {errorDetails.suggestion}
            </p>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => router.push('/auth/signin')}
                className="w-full flex items-center justify-center px-6 py-3 rounded-lg shadow-sm font-medium transition-all duration-200"
                style={{ 
                  backgroundColor: isDarkMode ? 'transparent' : '#C7A562', 
                  border: isDarkMode ? '2px solid #d1d1d1' : 'none',
                  color: isDarkMode ? '#d1d1d1' : '#004A84' 
                }}
                onMouseEnter={(e) => {
                  if (!isDarkMode) (e.target as HTMLButtonElement).style.backgroundColor = '#B59552';
                  else (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(209, 209, 209, 0.1)';
                }}
                onMouseLeave={(e) => {
                  if (!isDarkMode) (e.target as HTMLButtonElement).style.backgroundColor = '#C7A562';
                  else (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
                }}
              >
                Try Signing In Again
              </button>
              
              <button
                onClick={() => router.push('/')}
                className="w-full flex items-center justify-center px-6 py-3 border rounded-lg font-medium transition-all duration-200"
                style={{ 
                  backgroundColor: isDarkMode ? 'transparent' : '#E1C88E', 
                  border: isDarkMode ? '2px solid #9CA3AF' : 'none',
                  color: isDarkMode ? '#9CA3AF' : '#004A84'
                }}
                onMouseEnter={(e) => {
                  if (!isDarkMode) (e.target as HTMLButtonElement).style.backgroundColor = '#D4B67D';
                  else (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(156, 163, 175, 0.1)';
                }}
                onMouseLeave={(e) => {
                  if (!isDarkMode) (e.target as HTMLButtonElement).style.backgroundColor = '#E1C88E';
                  else (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
                }}
              >
                <ArrowLeft size={16} className="mr-2" style={{ color: isDarkMode ? '#9CA3AF' : '#004A84' }} />
                Back to Home
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            🔒 All communications are protected under attorney-client privilege
          </p>
          <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Need help? Contact our support team
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthError() {
  const { isDarkMode } = useSidebarStore();
  
  return (
    <>
      <DarkModeWrapper>{' '}</DarkModeWrapper>
      <Suspense fallback={
        <div className={`min-h-screen ${isDarkMode ? 'bg-[#1a1b1e]' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100'} flex items-center justify-center`}>
          <div className={`w-8 h-8 border-2 ${isDarkMode ? 'border-gray-400' : 'border-blue-600'} border-t-transparent rounded-full animate-spin`}></div>
        </div>
      }>
        <AuthErrorContent />
      </Suspense>
    </>
  );
}