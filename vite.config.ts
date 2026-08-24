import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // we ship a static /public/manifest.webmanifest instead
      includeAssets: ['favicon.svg', 'icons/*.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Never let the vault's own network calls (Supabase auth/DB) be
        // served from the offline cache — only the static app shell.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
})
