import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolveInstance } from './src/instances';

// The build must be told which product it is (ADR 0029); an unset or
// unknown VITE_INSTANCE fails the build here, before anything ships.
const { instance } = resolveInstance(process.env.VITE_INSTANCE);

const themeColor = '#c41e3a';
const backgroundColor = '#faf6f4';

/** Stamps the instance's branding into index.html placeholders. */
function instanceHtml(): Plugin {
  return {
    name: 'instance-html',
    transformIndexHtml: (html) =>
      html
        .replaceAll('{{shortName}}', instance.brand.shortName)
        .replaceAll('{{fullName}}', instance.brand.fullName)
        .replaceAll('{{description}}', instance.brand.description)
        .replaceAll('{{uiLang}}', instance.uiLanguages[0] ?? 'und'),
  };
}

export default defineConfig({
  // The engine ships no palette (ADR 0042): the active instance's theme is
  // resolved through the same VITE_INSTANCE seam as its config and imported
  // by name (`@instance/theme.css`) from `main.tsx`.
  resolve: {
    alias: {
      '@instance/theme.css': `@glotty/instance-${instance.id}/theme.css`,
    },
  },
  plugins: [
    react(),
    instanceHtml(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        short_name: instance.brand.shortName,
        name: instance.brand.fullName,
        description: instance.brand.description,
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
              cacheName: `${instance.id}-content`,
              expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
});
