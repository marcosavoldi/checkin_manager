import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'appicon.png'],
      manifest: {
        name: 'Lazzaretto City Walk',
        short_name: 'LCW',
        description: 'Gestione Pulizie Lazzaretto City Walk',
        theme_color: '#7950f2',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/appicon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/appicon.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/appicon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
