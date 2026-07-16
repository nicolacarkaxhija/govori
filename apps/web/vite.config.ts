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
    }),
  ],
});
