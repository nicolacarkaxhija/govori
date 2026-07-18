import { describe, expect, it } from 'vitest';
import {
  ConfigError,
  defineFlags,
  resolveFlags,
  type TargetRole,
} from './index.js';

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
  const on = (targetRole: TargetRole = 'all') => ({
    enabled: true,
    targetRole,
  });
  const off = (targetRole: TargetRole = 'all') => ({
    enabled: false,
    targetRole,
  });

  it('enables a flag only when all transitive requirements are enabled', () => {
    const resolved = resolveFlags(
      definitions,
      {
        accounts: on(),
        social: on(),
        leaderboards: on(),
        audio: off(),
        recordAndCompare: on(),
      },
      'admin',
    );
    expect(resolved.leaderboards.effective).toBe(true);
    expect(resolved.recordAndCompare.effective).toBe(false);
    expect(resolved.recordAndCompare.suppressedBy).toEqual(['audio']);
  });

  it('suppresses the whole downstream chain when a root is off', () => {
    const resolved = resolveFlags(
      definitions,
      {
        accounts: off(),
        social: on(),
        leaderboards: on(),
        audio: on(),
        recordAndCompare: off(),
      },
      'admin',
    );
    expect(resolved.social.effective).toBe(false);
    expect(resolved.social.suppressedBy).toEqual(['accounts']);
    expect(resolved.leaderboards.effective).toBe(false);
    expect(resolved.leaderboards.suppressedBy).toEqual(['accounts', 'social']);
    expect(resolved.audio.effective).toBe(true);
  });

  it('treats flags missing from the state as disabled', () => {
    const resolved = resolveFlags(definitions, { accounts: on() }, 'admin');
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
    const resolved = resolveFlags(
      diamond,
      { left: on(), right: on(), top: on() },
      'admin',
    );
    expect(resolved.top.effective).toBe(false);
    expect(resolved.top.suppressedBy).toEqual(['base', 'left', 'right']);
  });

  it('rejects state keys that were never defined', () => {
    expect(() => resolveFlags(definitions, { ghost: on() }, 'admin')).toThrow(
      ConfigError,
    );
  });

  it('shows an all-ring flag to every viewer, anonymous included', () => {
    const state = { accounts: on('all') };
    for (const viewer of [
      'anonymous',
      'learner',
      'reviewer',
      'admin',
    ] as const) {
      expect(resolveFlags(definitions, state, viewer).accounts.effective).toBe(
        true,
      );
    }
  });

  it('shows a reviewer-ring flag to reviewers and admins but no lower', () => {
    const state = { audio: on('reviewer') };
    expect(resolveFlags(definitions, state, 'anonymous').audio.effective).toBe(
      false,
    );
    expect(resolveFlags(definitions, state, 'learner').audio.effective).toBe(
      false,
    );
    expect(resolveFlags(definitions, state, 'reviewer').audio.effective).toBe(
      true,
    );
    expect(resolveFlags(definitions, state, 'admin').audio.effective).toBe(
      true,
    );
  });

  it('confines an admin-ring flag to admins', () => {
    const state = { audio: on('admin') };
    expect(resolveFlags(definitions, state, 'reviewer').audio.effective).toBe(
      false,
    );
    expect(resolveFlags(definitions, state, 'admin').audio.effective).toBe(
      true,
    );
  });

  it('propagates a requirement hidden by its ring to its dependents', () => {
    const resolved = resolveFlags(
      definitions,
      { audio: on('admin'), recordAndCompare: on('all') },
      'reviewer',
    );
    expect(resolved.audio.effective).toBe(false);
    expect(resolved.recordAndCompare.effective).toBe(false);
    expect(resolved.recordAndCompare.suppressedBy).toEqual(['audio']);
  });
});
