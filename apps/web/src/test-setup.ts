import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom does not implement matchMedia; the theme hook only reads `.matches`.
vi.stubGlobal(
  'matchMedia',
  vi.fn((query: string) => ({ matches: false, media: query })),
);

afterEach(() => {
  cleanup();
});
