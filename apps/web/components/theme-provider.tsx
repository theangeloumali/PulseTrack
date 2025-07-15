'use client';

import {useEffect} from 'react';
import {useTheme} from 'next-themes';
import {useThemeStore} from '@/lib/stores/theme';

export function ThemeProvider() {
  const {setTheme} = useTheme();
  const {mode, palette} = useThemeStore();

  useEffect(() => {
    // Sync with next-themes
    setTheme(mode);

    // Apply palette class to document
    const root = document.documentElement;

    // Remove existing palette classes
    root.classList.remove(
      'theme-default',
      'theme-blue',
      'theme-green',
      'theme-purple',
      'theme-orange',
      'theme-red',
    );

    // Add current palette
    root.classList.add(`theme-${palette}`);

    // Set data attribute for easier debugging
    root.setAttribute('data-palette', palette);
  }, [mode, palette, setTheme]);

  useEffect(() => {
    // Listen for system theme changes when in system mode
    if (mode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleChange = () => {
        // next-themes will handle the actual theme switching
        // we just need to ensure our palette classes remain
        setTimeout(() => {
          const root = document.documentElement;
          if (!root.classList.contains(`theme-${palette}`)) {
            root.classList.add(`theme-${palette}`);
          }
        }, 0);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [mode, palette]);

  return null;
}
