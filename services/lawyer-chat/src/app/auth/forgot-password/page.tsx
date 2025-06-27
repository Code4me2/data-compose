'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSidebarStore } from '@/store/sidebar';
import DarkModeWrapper from '@/components/DarkModeWrapper';
import { api } from '@/utils/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { isDarkMode } = useSidebarStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await api.post('/api/auth/forgot-password', { email });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setMessage(data.message);
      // Clear the form
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DarkModeWrapper>
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className={`w-full max-w-md p-8 rounded-lg shadow-lg ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <h1 className={`text-2xl font-bold mb-6 text-center ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Reset Password
          </h1>

          <p className={`text-sm mb-6 text-center ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Enter your email address and we'll send you a link to reset your password.
          </p>

          {message && (
            <div className="mb-4 p-4 rounded-md bg-green-50 dark:bg-green-900/20">
              <p className="text-sm text-green-800 dark:text-green-200">
                {message}
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 rounded-md bg-red-50 dark:bg-red-900/20">
              <p className="text-sm text-red-800 dark:text-red-200">
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#C7A562] ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="name@reichmanjorgensen.com"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2 px-4 rounded-md font-semibold transition-colors ${
                isLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-[#C7A562] text-[#004A84] hover:bg-[#B89550]'
              }`}
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link
              href="/auth/signin"
              className={`text-sm hover:underline ${
                isDarkMode ? 'text-[#C7A562]' : 'text-[#004A84]'
              }`}
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </DarkModeWrapper>
  );
}