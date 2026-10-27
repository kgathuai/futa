import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import { AppProvider } from './context/AppContext'

registerSW({ immediate: true })

const appTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4ce3a3',
      dark: '#3ecf92',
      contrastText: '#07111f',
    },
    background: {
      default: '#07111f',
      paper: '#151f33',
    },
    text: {
      primary: '#edf2f7',
      secondary: '#9fb0c9',
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Segoe UI", sans-serif',
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#151f33',
          border: '1px solid rgba(159,176,201,0.16)',
          boxShadow: 'none',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 4,
          borderRadius: 999,
          backgroundColor: 'rgba(76,227,163,0.18)',
          overflow: 'hidden',
        },
        bar: {
          backgroundColor: '#4ce3a3',
          boxShadow: '0 0 10px rgba(76,227,163,0.85), 0 0 22px rgba(76,227,163,0.45)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 600,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 9,
          textTransform: 'none',
          fontWeight: 700,
        },
      },
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <BrowserRouter>
        <AppProvider>
          <App />
        </AppProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
