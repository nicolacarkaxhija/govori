import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { brand } from './src/brand';

const themeColor = '#c41e3a';
const backgroundColor = '#faf6f4';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        short_name: brand.shortName,
        name: brand.fullName,
        description: 'Learn Interslavic',
        display: 'standalone',
        start_url: '/',
        theme_color: themeColor,
        background_color: backgroundColor,
      },
      workbox: {
        // Lessons keep working offline: content reads fall back to the
        // last good copy when the network is away (ADR 0031).
        runtimeCaching: [
          {
            urlPattern:
              /\/(meta|stats|course|items|lessons\/[^/]+(\/sentences)?)$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'govori-content',
              expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
});
