import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Finance Tracker',
        short_name: 'Finance',
        description: 'A private, offline-friendly personal finance tracker.',
        theme_color: '#05070F',
        background_color: '#05070F',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/pwa-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/pwa-512.svg', sizes: '512x512', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) => request.method === 'GET' && /\/api\/(analytics|reports)/.test(url.pathname),
            handler: 'NetworkFirst',
            options: { cacheName: 'finance-api', networkTimeoutSeconds: 5, expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 } },
          },
        ],
      },
    }),
  ],
  server: { port: 5173 },
});
