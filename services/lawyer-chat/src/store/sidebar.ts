import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarStore {
  isExpanded: boolean;
  toggleSidebar: () => void;
  setExpanded: (expanded: boolean) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (darkMode: boolean) => void;
  isTaskBarExpanded: boolean;
  toggleTaskBar: () => void;
  setTaskBarExpanded: (expanded: boolean) => void;
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      isExpanded: true,
      toggleSidebar: () => set((state) => ({ isExpanded: !state.isExpanded })),
      setExpanded: (expanded: boolean) => set({ isExpanded: expanded }),
      isDarkMode: false,
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      setDarkMode: (darkMode: boolean) => set({ isDarkMode: darkMode }),
      isTaskBarExpanded: false,
      toggleTaskBar: () => set((state) => ({ isTaskBarExpanded: !state.isTaskBarExpanded })),
      setTaskBarExpanded: (expanded: boolean) => set({ isTaskBarExpanded: expanded }),
    }),
    {
      name: 'sidebar-storage',
    }
  )
);