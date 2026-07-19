import { describe, expect, it } from 'vitest';
import {
  PREMIUM_DAYS_PER_GRANT,
  VALIDATED_SECONDS_PER_GRANT,
  premiumDaysFor,
} from './credit-policy.js';

describe('premiumDaysFor', () => {
  it('grants nothing below the first threshold', () => {
    expect(premiumDaysFor(0)).toBe(0);
    expect(premiumDaysFor(VALIDATED_SECONDS_PER_GRANT - 1)).toBe(0);
  });

  it('grants one block of days at exactly the threshold', () => {
    expect(premiumDaysFor(VALIDATED_SECONDS_PER_GRANT)).toBe(
      PREMIUM_DAYS_PER_GRANT,
    );
  });

  it('grants whole blocks only, flooring the remainder', () => {
    expect(premiumDaysFor(VALIDATED_SECONDS_PER_GRANT * 2 + 5)).toBe(
      PREMIUM_DAYS_PER_GRANT * 2,
    );
  });
});
