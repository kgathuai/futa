import { createTheme } from '@mui/material'
import type { Theme } from '@mui/material'

export type ColorMode = 'dark' | 'light'

export const themeStorageKey = 'futa_color_mode'

export const buildTheme = (mode: ColorMode): Theme =>
  createTheme({
    palette: {
      mode,
      primary: { main: '#4ce3a3', dark: '#3ecf92', contrastText: '#07111f' },
      background:
        mode === 'dark'
          ? { default: '#07111f', paper: '#151f33' }
          : { default: '#f2f5fa', paper: '#ffffff' },
      text:
        mode === 'dark'
          ? { primary: '#edf2f7', secondary: '#9fb0c9' }
          : { primary: '#0b1220', secondary: '#4a5670' },
    },
    shape: { borderRadius: 12 },
    typography: { fontFamily: '"Plus Jakarta Sans", "Segoe UI", sans-serif' },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'dark' ? '#151f33' : '#ffffff',
            border: `1px solid ${mode === 'dark' ? 'rgba(159,176,201,0.16)' : 'rgba(11,18,32,0.1)'}`,
            boxShadow: 'none',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'dark' ? '#0d1524' : '#ffffff',
            color: mode === 'dark' ? '#edf2f7' : '#0b1220',
          },
        },
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiLinearProgress: {
        styleOverrides: {
          root: { height: 4, borderRadius: 999, backgroundColor: 'rgba(76,227,163,0.18)', overflow: 'hidden' },
          bar: {
            backgroundColor: '#4ce3a3',
            boxShadow: '0 0 10px rgba(76,227,163,0.85), 0 0 22px rgba(76,227,163,0.45)',
          },
        },
      },
      MuiMenuItem: { styleOverrides: { root: { fontSize: '0.8rem', minHeight: 34 } } },
      MuiChip: { styleOverrides: { root: { borderRadius: 999, fontWeight: 600 } } },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 9, textTransform: 'none', fontWeight: 700 },
        },
      },
    },
  })
