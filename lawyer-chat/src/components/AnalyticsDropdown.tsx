'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronUp, Download } from 'lucide-react'
import { useSidebarStore } from '@/store/sidebar'

interface AnalyticsData {
  trends?: any[]
  statistics?: Record<string, any>
  charts?: any[]
  summary?: string
  [key: string]: any
}

interface AnalyticsDropdownProps {
  data: AnalyticsData
}

export default function AnalyticsDropdown({ data }: AnalyticsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { isDarkMode } = useSidebarStore()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleDownload = () => {
    const dataStr = JSON.stringify(data, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `analytics_${new Date().toISOString()}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const getDropdownPosition = () => {
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    const dropdownWidth = Math.min(800, viewportWidth * 0.9)
    const dropdownHeight = Math.min(600, viewportHeight * 0.8)
    
    return {
      position: 'fixed' as const,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: dropdownWidth,
      maxHeight: dropdownHeight,
      zIndex: 9999
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`px-4 py-2 rounded-lg transition-all duration-200 transform active:scale-95 ${
          isDarkMode 
            ? 'bg-[#25262b] text-[#d1d1d1] hover:bg-[#404147] active:bg-[#505157]' 
            : 'bg-[#E1C88E] text-[#004A84] hover:bg-[#C8A665] active:bg-[#B59552]'
        }`}
        aria-label="Toggle analytics view"
        style={{
          fontSize: '1.092rem',
          fontWeight: '600',
          letterSpacing: '0.05em'
        }}
      >
        ANALYTICS
      </button>

      {isOpen && (
        <div 
          ref={dropdownRef}
          className={`${isDarkMode ? 'bg-[#25262b] border-gray-700' : 'bg-white border-[#E1C88E] border-opacity-40'} border rounded-lg shadow-2xl flex flex-col`}
          style={{
            ...getDropdownPosition(),
            boxShadow: '0 0 0 2000px rgba(0, 0, 0, 0.3)'
          }}
        >
          <div className={`flex-shrink-0 px-4 py-3 border-b flex items-center justify-between ${isDarkMode ? 'bg-[#1a1b1e] border-gray-700' : 'bg-[#FBF7F1] border-[#E1C88E] border-opacity-30'}`}>
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-[#004A84]'}`}>Analytics Results</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-[#F4E9D9] hover:text-[#004A84]'}`}
                aria-label="Download analytics data"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-[#F4E9D9] hover:text-[#004A84]'}`}
                aria-label="Close analytics view"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {data.summary && (
              <div className="mb-4">
                <h4 className={`font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-[#004A84]'}`}>Summary</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{data.summary}</p>
              </div>
            )}
            
            {data.statistics && (
              <div className="mb-4">
                <h4 className={`font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-[#004A84]'}`}>Statistics</h4>
                <div className={`rounded p-3 ${isDarkMode ? 'bg-[#2e2f38]' : 'bg-[#FBF7F1]'}`}>
                  <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
                    {JSON.stringify(data.statistics, null, 2)}
                  </pre>
                </div>
              </div>
            )}
            
            {data.trends && data.trends.length > 0 && (
              <div className="mb-4">
                <h4 className={`font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-[#004A84]'}`}>Trends</h4>
                <ul className="space-y-2">
                  {data.trends.map((trend, index) => (
                    <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                      <span className={`mr-2 ${isDarkMode ? 'text-[#C7A562]' : 'text-[#004A84]'}`}>•</span>
                      {JSON.stringify(trend)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {data.charts && data.charts.length > 0 && (
              <div>
                <h4 className={`font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-[#004A84]'}`}>Charts Data</h4>
                <div className={`rounded p-3 ${isDarkMode ? 'bg-[#2e2f38]' : 'bg-[#FBF7F1]'}`}>
                  <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
                    {JSON.stringify(data.charts, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}