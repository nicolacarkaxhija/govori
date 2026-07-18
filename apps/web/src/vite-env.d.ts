interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_INSTANCE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.css';

declare module '@fontsource-variable/literata';
declare module '@fontsource/source-sans-3';
