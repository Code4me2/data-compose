'use client';

import { X, Download } from 'lucide-react';
import { useSidebarStore } from '@/store/sidebar';

interface CitationPanelProps {
  citation: {
    id: string;
    title: string;
    content: string;
    court?: string;
    date?: string;
    caseNumber?: string;
  };
  onClose: () => void;
}

export default function CitationPanel({ citation, onClose }: CitationPanelProps) {
  const { isDarkMode } = useSidebarStore();

  const handleDownload = () => {
    // Create a blob with the citation content
    const blob = new Blob([
      `${citation.title}\n\n`,
      citation.court ? `Court: ${citation.court}\n` : '',
      citation.date ? `Date: ${citation.date}\n` : '',
      citation.caseNumber ? `Case Number: ${citation.caseNumber}\n` : '',
      `\n${citation.content}`
    ], { type: 'text/plain' });

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${citation.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className={`h-full flex flex-col ${
      isDarkMode ? 'bg-[#25262b] border-l border-gray-700' : 'bg-white border-l border-gray-200'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <h3 className={`text-lg font-semibold ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Citation Document
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownload}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
            title="Download citation"
          >
            <Download size={20} />
          </button>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
            title="Close panel"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Citation Content */}
      <div className="flex-1 overflow-y-auto hide-scrollbar p-6">
        <div className="space-y-4">
          {/* Citation Title */}
          <h2 className={`text-xl font-bold ${
            isDarkMode ? 'text-gray-100' : 'text-gray-900'
          }`}>
            {citation.title}
          </h2>

          {/* Citation Metadata */}
          <div className={`space-y-2 text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {citation.court && (
              <div>
                <span className="font-medium">Court:</span> {citation.court}
              </div>
            )}
            {citation.date && (
              <div>
                <span className="font-medium">Date:</span> {citation.date}
              </div>
            )}
            {citation.caseNumber && (
              <div>
                <span className="font-medium">Case Number:</span> {citation.caseNumber}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className={`border-t ${
            isDarkMode ? 'border-gray-700' : 'border-gray-300'
          }`} />

          {/* Citation Text */}
          <div className={`whitespace-pre-wrap leading-relaxed ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {citation.content}
          </div>
        </div>
      </div>
    </div>
  );
}