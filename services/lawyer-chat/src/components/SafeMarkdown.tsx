'use client';

import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ErrorBoundary } from './ErrorBoundary';
import { AlertCircle } from 'lucide-react';
import { useSidebarStore } from '@/store/sidebar';

interface SafeMarkdownProps {
  content: string;
  className?: string;
}

export default function SafeMarkdown({ content, className }: SafeMarkdownProps) {
  const { isDarkMode } = useSidebarStore();
  
  const components: Components = {
    // Safe rendering of code blocks
    code: ({ inline, className: codeClassName, children, ...props }) => {
      const match = /language-(\w+)/.exec(codeClassName || '');
      
      if (!inline && match) {
        return (
          <div className="relative">
            <div className={`absolute top-2 right-2 text-xs px-2 py-1 rounded ${
              isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
            }`}>
              {match[1]}
            </div>
            <pre className={`${codeClassName} overflow-x-auto`}>
              <code className={codeClassName}>
                {children}
              </code>
            </pre>
          </div>
        );
      }
      
      return (
        <code className={`${codeClassName || ''} ${
          isDarkMode 
            ? 'bg-gray-800 text-pink-400' 
            : 'bg-gray-100 text-pink-600'
        } px-1 py-0.5 rounded text-sm`}>
          {children}
        </code>
      );
    },
    // Safe rendering of links
    a: ({ ...props }) => (
      <a 
        {...props} 
        className="text-blue-500 hover:text-blue-600 underline"
        target="_blank"
        rel="noopener noreferrer"
      />
    ),
    // Safe rendering of images
    img: ({ ...props }) => (
      <img 
        {...props} 
        className="max-w-full h-auto rounded-md my-2"
        loading="lazy"
        onError={(e) => {
          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzk0YTNiOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+SW1hZ2UgZmFpbGVkIHRvIGxvYWQ8L3RleHQ+Cjwvc3ZnPg==';
          e.currentTarget.alt = 'Image failed to load';
        }}
      />
    ),
    // Safe rendering of tables
    table: ({ ...props }) => (
      <div className="overflow-x-auto my-4">
        <table {...props} className={`min-w-full divide-y ${
          isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
        }`} />
      </div>
    ),
    th: ({ ...props }) => (
      <th {...props} className={`px-4 py-2 text-left text-sm font-medium ${
        isDarkMode ? 'text-gray-300 bg-gray-800' : 'text-gray-700 bg-gray-50'
      }`} />
    ),
    td: ({ ...props }) => (
      <td {...props} className={`px-4 py-2 text-sm ${
        isDarkMode ? 'text-gray-300 border-gray-700' : 'text-gray-600 border-gray-200'
      } border-t`} />
    )
  };
  
  const fallback = (
    <div className={`p-4 rounded-md ${
      isDarkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
    }`}>
      <div className="flex items-start gap-2">
        <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
          isDarkMode ? 'text-red-400' : 'text-red-600'
        }`} />
        <div>
          <p className={`font-medium ${
            isDarkMode ? 'text-red-300' : 'text-red-800'
          }`}>
            Unable to render message
          </p>
          <p className={`text-sm mt-1 ${
            isDarkMode ? 'text-red-400/80' : 'text-red-600'
          }`}>
            The message content could not be displayed properly. The raw content has been preserved.
          </p>
          <details className="mt-2">
            <summary className={`cursor-pointer text-sm ${
              isDarkMode ? 'text-red-400' : 'text-red-700'
            }`}>
              Show raw content
            </summary>
            <pre className={`mt-2 p-2 text-xs rounded overflow-x-auto ${
              isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-white text-gray-700'
            }`}>
              {content}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary 
      fallback={fallback}
      isolate
      level="component"
      resetKeys={[content]}
      resetOnKeysChange
    >
      <div className={className}>
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]} 
          components={components}
        >
          {content}
        </ReactMarkdown>
      </div>
    </ErrorBoundary>
  );
}