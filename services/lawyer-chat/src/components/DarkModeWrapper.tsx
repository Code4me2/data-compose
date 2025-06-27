'use client';

import { useEffect } from 'react';
import { useSidebarStore } from '@/store/sidebar';

export default function DarkModeWrapper({ children }: { children: React.ReactNode }) {
  const { isDarkMode } = useSidebarStore();
  
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);
  
  return <>{children}</>;
}