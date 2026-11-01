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
    typography: {
      fontFamily: '"Plus Jakarta Sans", "Segoe UI", sans-serif',
      // Compact, dashboard-style scale used across the whole app.
      fontSize: 12,
      h1: { fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.15 },
      h2: { fontSize: '1.3rem', fontWeight: 800, lineHeight: 1.15 },
      h3: { fontSize: '1.15rem', fontWeight: 800, lineHeight: 1.2 },
      h4: { fontSize: '1rem', fontWeight: 800, lineHeight: 1.2 },
      h5: { fontSize: '0.9rem', fontWeight: 800, lineHeight: 1.25 },
      h6: { fontSize: '0.82rem', fontWeight: 800, lineHeight: 1.3 },
      subtitle1: { fontSize: '0.8rem', fontWeight: 700 },
      subtitle2: { fontSize: '0.74rem', fontWeight: 700 },
      body1: { fontSize: '0.78rem' },
      body2: { fontSize: '0.72rem' },
      button: { fontSize: '0.72rem', fontWeight: 700, textTransform: 'none' },
      caption: { fontSize: '0.64rem' },
      overline: { fontSize: '0.56rem', letterSpacing: '0.14em', fontWeight: 800, lineHeight: 1.6 },
    },
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
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 9, textTransform: 'none', fontWeight: 700, fontSize: '0.72rem' },
          sizeSmall: { fontSize: '0.66rem' },
          contained: { fontSize: '0.72rem' },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          root: { fontSize: '0.78rem' },
          input: { fontSize: '0.78rem' },
        },
      },
      MuiInputLabel: {
        styleOverrides: { root: { fontSize: '0.76rem' } },
      },
      MuiFormHelperText: {
        styleOverrides: { root: { fontSize: '0.64rem' } },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 999, fontWeight: 600, fontSize: '0.66rem' },
          label: { fontSize: '0.66rem' },
          sizeSmall: { fontSize: '0.6rem' },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-root': {
              fontSize: '0.58rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontWeight: 800,
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: { root: { fontSize: '0.72rem' } },
      },
      MuiListItemText: {
        styleOverrides: {
          primary: { fontSize: '0.78rem' },
          secondary: { fontSize: '0.68rem' },
        },
      },
      MuiDialogTitle: {
        styleOverrides: { root: { fontSize: '0.9rem', fontWeight: 800 } },
      },
    },
  })
