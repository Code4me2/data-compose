'use client';

import { useState } from 'react';
import { Download, FileText, FileType } from 'lucide-react';
import { useSidebarStore } from '@/store/sidebar';

interface DownloadButtonProps {
  onDownloadPDF: () => Promise<void> | void;
  onDownloadText: () => Promise<void> | void;
  label?: string;
  className?: string;
  compact?: boolean;
}

export default function DownloadButton({ 
  onDownloadPDF, 
  onDownloadText, 
  label = 'Download',
  className = '',
  compact = false 
}: DownloadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { isDarkMode } = useSidebarStore();

  const handleDownload = async (format: 'pdf' | 'txt') => {
    setIsDownloading(true);
    try {
      if (format === 'pdf') {
        await onDownloadPDF();
      } else {
        await onDownloadText();
      }
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
      setIsOpen(false);
    }
  };

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isDownloading}
          className={`p-2 rounded-md transition-colors ${
            isDarkMode 
              ? 'hover:bg-gray-700 text-gray-300' 
              : 'hover:bg-gray-100 text-gray-600'
          } ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
          title={label}
        >
          <Download className="w-4 h-4" />
        </button>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            <div className={`absolute right-0 mt-1 rounded-md shadow-lg z-20 ${
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              <button
                onClick={() => handleDownload('pdf')}
                className={`flex items-center gap-2 px-4 py-2 text-sm rounded-t-md transition-colors w-full text-left ${
                  isDarkMode 
                    ? 'hover:bg-gray-700 text-gray-300' 
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <FileType className="w-4 h-4 text-red-500" />
                PDF
              </button>
              <button
                onClick={() => handleDownload('txt')}
                className={`flex items-center gap-2 px-4 py-2 text-sm rounded-b-md transition-colors w-full text-left ${
                  isDarkMode 
                    ? 'hover:bg-gray-700 text-gray-300' 
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <FileText className="w-4 h-4 text-blue-500" />
                Text
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDownloading}
        className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
          isDarkMode
            ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
        } ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      >
        <Download className="w-4 h-4" />
        {isDownloading ? 'Downloading...' : label}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg z-20 ${
            isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <div className="py-1">
              <button
                onClick={() => handleDownload('pdf')}
                className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors w-full text-left ${
                  isDarkMode 
                    ? 'hover:bg-gray-700 text-gray-300' 
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <FileType className="w-4 h-4 text-red-500" />
                Download as PDF
              </button>
              <button
                onClick={() => handleDownload('txt')}
                className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors w-full text-left ${
                  isDarkMode 
                    ? 'hover:bg-gray-700 text-gray-300' 
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <FileText className="w-4 h-4 text-blue-500" />
                Download as Text
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}