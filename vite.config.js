import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  base: './',
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toLocaleString('es-MX', {
      timeZone: 'America/Mazatlan',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    })),
    __APP_VERSION__: JSON.stringify('1'),
  },
  plugins: [
    react(),
    visualizer({ open: false, filename: 'dist/stats.html', gzipSize: true }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-logo.png', 'logo.png'],
      workbox: {
        globIgnores: ['instalar.html'],
        navigateFallbackDenylist: [/^\/instalar\.html/],
      },
      manifest: {
        name: 'Purificadora Mar de Hielo',
        short_name: 'Mar de Hielo',
        description: 'App de ventas - Purificadora Mar de Hielo',
        theme_color: '#1152d4',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ]
})
