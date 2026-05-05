import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toLocaleString('es-MX', {
      timeZone: 'America/Mazatlan',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    })),
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
        name: 'Ventas Repartidor',
        short_name: 'Ventas',
        description: 'App de ventas en ruta y control de inventario',
        theme_color: '#ffb91a',
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
