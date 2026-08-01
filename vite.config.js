import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// La app se sirve desde https://oldfashioned1994.github.io/finanzas/
export default defineConfig({
  base: '/finanzas/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'favicon-32.png'],
      manifest: {
        name: 'Finanzas',
        short_name: 'Finanzas',
        description: 'Registro personal de ingresos y gastos',
        lang: 'es',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#020617',
        theme_color: '#020617',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        // Precachea todo para que la app abra y funcione sin conexión.
        globPatterns: ['**/*.{js,css,html,svg,woff2,json}'],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
})
