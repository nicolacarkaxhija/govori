import { describe, expect, it } from 'vitest';
import { ConfigError, defineFlags, resolveFlags } from './index.js';

// The flag dependency graph from the product plan (ADR 0025):
// leaderboards → social → accounts; recordAndCompare → audio.
const definitions = defineFlags({
  accounts: {},
  social: { requires: ['accounts'] },
  leaderboards: { requires: ['social'] },
  audio: {},
  recordAndCompare: { requires: ['audio'] },
});

describe('defineFlags', () => {
  it('rejects a requirement on an unknown flag at definition time', () => {
    expect(() => defineFlags({ social: { requires: ['acounts'] } })).toThrow(
      ConfigError,
    );
    expect(() => defineFlags({ social: { requires: ['acounts'] } })).toThrow(
      /acounts/,
    );
  });

  it('rejects dependency cycles at definition time', () => {
    expect(() =>
      defineFlags({
        a: { requires: ['b'] },
        b: { requires: ['a'] },
      }),
    ).toThrow(/cycle/i);
  });
});

describe('resolveFlags', () => {
  it('enables a flag only when all transitive requirements are enabled', () => {
    const resolved = resolveFlags(definitions, {
      accounts: true,
      social: true,
      leaderboards: true,
      audio: false,
      recordAndCompare: true,
    });
    expect(resolved.leaderboards.effective).toBe(true);
    expect(resolved.recordAndCompare.effective).toBe(false);
    expect(resolved.recordAndCompare.suppressedBy).toEqual(['audio']);
  });

  it('suppresses the whole downstream chain when a root is off', () => {
    const resolved = resolveFlags(definitions, {
      accounts: false,
      social: true,
      leaderboards: true,
      audio: true,
      recordAndCompare: false,
    });
    expect(resolved.social.effective).toBe(false);
    expect(resolved.social.suppressedBy).toEqual(['accounts']);
    expect(resolved.leaderboards.effective).toBe(false);
    expect(resolved.leaderboards.suppressedBy).toEqual(['accounts', 'social']);
    expect(resolved.audio.effective).toBe(true);
  });

  it('treats flags missing from the state as disabled', () => {
    const resolved = resolveFlags(definitions, { accounts: true });
    expect(resolved.accounts.effective).toBe(true);
    expect(resolved.social.effective).toBe(false);
    expect(resolved.social.suppressedBy).toEqual([]);
  });

  it('reports a shared ancestor once in a diamond dependency', () => {
    const diamond = defineFlags({
      base: {},
      left: { requires: ['base'] },
      right: { requires: ['base'] },
      top: { requires: ['left', 'right'] },
    });
    const resolved = resolveFlags(diamond, {
      left: true,
      right: true,
      top: true,
    });
    expect(resolved.top.effective).toBe(false);
    expect(resolved.top.suppressedBy).toEqual(['base', 'left', 'right']);
  });

  it('rejects state keys that were never defined', () => {
    expect(() => resolveFlags(definitions, { ghost: true })).toThrow(
      ConfigError,
    );
  });
});
