'use client';

import { Moon, Sun } from 'lucide-react';
import { useSidebarStore } from '@/store/sidebar';

export default function DarkModeToggle() {
  const { isDarkMode, toggleDarkMode } = useSidebarStore();

  return (
    <button
      onClick={toggleDarkMode}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none border-2 cursor-pointer hover:opacity-80
      `}
      style={{
        backgroundColor: 'transparent',
        borderColor: isDarkMode ? '#ffffff' : '#004A84',
        zIndex: 50
      }}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className="sr-only">{isDarkMode ? 'Dark mode' : 'Light mode'}</span>
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full transition-transform duration-200 pointer-events-none
          ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}
        `}
        style={{
          backgroundColor: isDarkMode ? '#ffffff' : '#004A84'
        }}
      >
        {isDarkMode ? (
          <Moon className="h-3 w-3 text-gray-800 ml-0.5 mt-0.5" />
        ) : (
          <Sun className="h-3 w-3 text-white ml-0.5 mt-0.5" />
        )}
      </span>
    </button>
  );
}