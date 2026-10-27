import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import { AppProvider } from './context/AppContext'
import { LanguageProvider } from './lib/i18n'
import { ColorModeProvider } from './theme/ColorModeProvider'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ColorModeProvider>
      <BrowserRouter>
        <LanguageProvider>
          <AppProvider>
            <App />
          </AppProvider>
        </LanguageProvider>
      </BrowserRouter>
    </ColorModeProvider>
  </StrictMode>,
)
