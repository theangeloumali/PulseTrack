import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ThemePalette = 'default' | 'blue' | 'green' | 'purple' | 'orange' | 'red'

interface ThemeState {
  mode: ThemeMode
  palette: ThemePalette
  
  // Actions
  setMode: (mode: ThemeMode) => void
  setPalette: (palette: ThemePalette) => void
  toggleMode: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'light',
      palette: 'default',
      
      setMode: (mode) => {
        set({ mode })
        if (typeof window !== 'undefined') {
          applyTheme(mode, get().palette)
        }
      },
      
      setPalette: (palette) => {
        set({ palette })
        if (typeof window !== 'undefined') {
          applyTheme(get().mode, palette)
        }
      },
      
      toggleMode: () => {
        const currentMode = get().mode
        const newMode = currentMode === 'light' ? 'dark' : 'light'
        get().setMode(newMode)
      },
    }),
    {
      name: 'theme-store',
    }
  )
)

function applyTheme(mode: ThemeMode, palette: ThemePalette) {
  if (typeof window === 'undefined') return
  
  const root = document.documentElement
  
  // Remove existing theme classes
  root.classList.remove('light', 'dark')
  root.classList.remove('theme-default', 'theme-blue', 'theme-green', 'theme-purple', 'theme-orange', 'theme-red')
  
  // Apply mode
  if (mode === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    root.classList.add(systemTheme)
  } else {
    root.classList.add(mode)
  }
  
  // Apply palette
  root.classList.add(`theme-${palette}`)
  
  // Set the theme attribute for next-themes compatibility
  root.setAttribute('data-theme', mode === 'system' ? 'system' : mode)
  root.setAttribute('data-palette', palette)
}

// Theme palette configurations
export const themePalettes = {
  default: {
    name: 'Default',
    description: 'Classic blue and gray theme',
    primary: '#3b82f6', // blue-500
    primaryForeground: '#ffffff',
  },
  blue: {
    name: 'Ocean Blue',
    description: 'Deep blue professional theme',
    primary: '#1e40af', // blue-800
    primaryForeground: '#ffffff',
  },
  green: {
    name: 'Forest Green',
    description: 'Natural green theme',
    primary: '#059669', // emerald-600
    primaryForeground: '#ffffff',
  },
  purple: {
    name: 'Royal Purple',
    description: 'Elegant purple theme',
    primary: '#7c3aed', // violet-600
    primaryForeground: '#ffffff',
  },
  orange: {
    name: 'Sunset Orange',
    description: 'Warm orange theme',
    primary: '#ea580c', // orange-600
    primaryForeground: '#ffffff',
  },
  red: {
    name: 'Crimson Red',
    description: 'Bold red theme',
    primary: '#dc2626', // red-600
    primaryForeground: '#ffffff',
  },
} as const