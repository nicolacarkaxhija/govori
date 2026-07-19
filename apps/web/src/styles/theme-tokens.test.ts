import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Acceptance for the chosen identities: each instance's theme must define
// the full custom-property contract the engine consumes, carry its family's
// structural signature, and answer both the system preference and the
// forced [data-theme] override. Reading the source keeps this instance-
// agnostic — the engine ships none of it (ADR 0042).
const instancesDir = join(process.cwd(), '..', '..', 'instances');

function theme(instanceId: string): string {
  return readFileSync(
    join(instancesDir, instanceId, 'src', 'theme.css'),
    'utf8',
  );
}

// Every token the base/learn stylesheets read without a literal fallback.
const CONTRACT = [
  '--color-bg',
  '--color-surface',
  '--color-text',
  '--color-text-muted',
  '--color-primary',
  '--color-primary-hover',
  '--color-primary-soft',
  '--color-on-primary',
  '--color-border',
  '--color-correct',
  '--color-correct-soft',
  '--font-sans',
  '--radius-md',
  '--space-sm',
  '--space-md',
  '--space-lg',
];

describe.each(['govori', 'fol'])('%s theme', (instanceId) => {
  const css = theme(instanceId);

  it('defines the whole custom-property contract', () => {
    for (const token of CONTRACT) {
      expect(css, token).toContain(`${token}:`);
    }
  });

  it('answers both the system preference and the forced override', () => {
    expect(css).toContain('@media (prefers-color-scheme: dark)');
    expect(css).toContain(":root[data-theme='light']");
    expect(css).toContain(":root[data-theme='dark']");
  });
});

describe('govori wears Frost', () => {
  const css = theme('govori');

  it('paints the icy palette and a blurred, floated surface', () => {
    expect(css).toContain('--color-bg: #e9f1f8');
    expect(css).toContain('--card-blur: blur(14px)');
    expect(css).toContain('--radius-md: 18px');
    expect(css).toContain('backdrop-filter: blur(10px)');
  });

  it('keeps the primary a true red in the dark, never a pink', () => {
    expect(css).toContain('--color-primary: #ff5062');
  });
});

describe('fol wears Seed', () => {
  const css = theme('fol');

  it('seeds tonal red neutrals with M3 shape and no card chrome', () => {
    expect(css).toContain('--color-bg: #fef7f6');
    expect(css).toContain('--radius-md: 24px');
    expect(css).toContain('--card-border: none');
    expect(css).toContain(
      '--card-bg: color-mix(in srgb, var(--color-primary) 5%, var(--color-surface))',
    );
    expect(css).toContain('border-radius: 999px');
  });

  it('lifts the primary for dark-mode contrast', () => {
    expect(css).toContain('--color-primary: #ff6a5f');
  });
});
