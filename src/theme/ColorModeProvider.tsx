import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { buildTheme, themeStorageKey, type ColorMode } from './theme'

interface ColorModeValue {
  mode: ColorMode
  toggleMode: () => void
}

const ColorModeContext = createContext<ColorModeValue | undefined>(undefined)

export function ColorModeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<ColorMode>(() => {
    if (typeof window === 'undefined') {
      return 'dark'
    }
    return window.localStorage.getItem(themeStorageKey) === 'light' ? 'light' : 'dark'
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(themeStorageKey, mode)
      document.documentElement.dataset.theme = mode
      document.body.style.backgroundColor = mode === 'dark' ? '#07111f' : '#f2f5fa'
    }
  }, [mode])

  const toggleMode = useCallback(() => {
    setMode((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo(() => ({ mode, toggleMode }), [mode, toggleMode])
  const theme = useMemo(() => buildTheme(mode), [mode])

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  )
}

export function useColorMode() {
  const context = useContext(ColorModeContext)
  if (!context) {
    throw new Error('useColorMode must be used inside a ColorModeProvider')
  }
  return context
}
