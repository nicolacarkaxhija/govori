import { defineFlags } from '@glotty/config';

/**
 * The product's feature-flag graph (ADR 0025). Risky-at-small-scale features
 * ship built but dark; enable thresholds are pre-committed in ADR 0033.
 */
export const flagDefinitions = defineFlags({
  accounts: { description: 'Sign-up, sync, and everything identity-bound' },
  social: {
    requires: ['accounts'],
    description: 'Follows and shared presence; dark until critical mass',
  },
  leaderboards: {
    requires: ['social'],
    description: 'Competitive views over social data',
  },
  audio: { description: 'Community recordings and listening exercises' },
  recordAndCompare: {
    requires: ['audio'],
    description: 'Self-recording against native audio',
  },
});
