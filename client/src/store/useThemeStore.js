import { create } from 'zustand';

export const useThemeStore = create((set, get) => ({
  theme: typeof window !== 'undefined' ? localStorage.getItem('crave_theme') || 'light' : 'light',

  initTheme: () => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('crave_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const activeTheme = saved || (prefersDark ? 'dark' : 'light');

    if (activeTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme: activeTheme });
  },

  toggleTheme: () => {
    const current = get().theme;
    const next = current === 'dark' ? 'light' : 'dark';

    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    localStorage.setItem('crave_theme', next);
    set({ theme: next });
  },
}));

