import type { CapacitorConfig } from '@capacitor/cli';
import { resolveInstance } from './src/instances';

// Native shell over the built PWA (ADR 0014); the web bundle stays the
// single UI and ships embedded, same-origin against the deployed API.
// Like the web build, the shell must be told its instance explicitly.
const { instance } = resolveInstance(process.env.VITE_INSTANCE);

const config: CapacitorConfig = {
  appId: `org.${instance.id}.app`,
  appName: instance.brand.shortName,
  webDir: 'dist',
};

export default config;
