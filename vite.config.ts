import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Default to the API port from .env (PORT) so dev proxy and server always agree.
  const backendTarget = env.VITE_API_PROXY_TARGET || `http://localhost:${env.PORT || '4000'}`

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'pwa-icon.svg'],
        manifest: {
          name: 'Futa Football Community',
          short_name: 'Futa',
          description:
            'PWA for announcing local football matches, requesting friendlies, chatting, and reporting results.',
          theme_color: '#0a7a5f',
          background_color: '#f4efe7',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/pwa-icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any',
            },
            {
              src: '/pwa-icon-maskable.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        },
      }),
    ],
    build: {
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (!id.includes('node_modules')) {
              return
            }
            if (id.includes('@mui') || id.includes('@emotion')) {
              return 'mui-vendor'
            }
            if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/')) {
              return 'react-vendor'
            }
          },
        },
      },
    },
    server: {
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
