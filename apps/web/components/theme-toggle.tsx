'use client'

import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { useThemeStore } from '@/lib/stores/theme'

export function ThemeToggle() {
  const { mode, toggleMode } = useThemeStore()

  const getIcon = () => {
    switch (mode) {
      case 'light':
        return <Sun className="h-4 w-4" />
      case 'dark':
        return <Moon className="h-4 w-4" />
      case 'system':
        return <Monitor className="h-4 w-4" />
      default:
        return <Sun className="h-4 w-4" />
    }
  }

  const getLabel = () => {
    switch (mode) {
      case 'light':
        return 'Light'
      case 'dark':
        return 'Dark'
      case 'system':
        return 'System'
      default:
        return 'Light'
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleMode}
      className="w-full justify-start"
      title={`Current theme: ${getLabel()}`}
    >
      {getIcon()}
      <span className="ml-2">{getLabel()}</span>
    </Button>
  )
}