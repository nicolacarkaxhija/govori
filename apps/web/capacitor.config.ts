import type { CapacitorConfig } from '@capacitor/cli';

// Native shell over the built PWA (ADR 0014); the web bundle stays the
// single UI and ships embedded, same-origin against the deployed API.
const config: CapacitorConfig = {
  appId: 'org.govori.app',
  appName: 'Govori',
  webDir: 'dist',
};

export default config;
