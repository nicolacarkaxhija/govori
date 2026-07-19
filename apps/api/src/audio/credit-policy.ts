/**
 * The casual-tier premium-time reward (ADR 0048).
 *
 * The casual audio tier settles in premium time alone — never a micro-payout.
 * Every {@link VALIDATED_SECONDS_PER_GRANT} seconds of community-verified
 * audio a contributor accrues grants a further {@link PREMIUM_DAYS_PER_GRANT}
 * days of premium access. These two constants are the whole grant rule and
 * live only here.
 */
export const VALIDATED_SECONDS_PER_GRANT = 120;
export const PREMIUM_DAYS_PER_GRANT = 7;

/**
 * Cumulative premium days earned for a running total of validated seconds.
 * The ledger stores the running total; this derives the days it has bought.
 */
export function premiumDaysFor(secondsValidated: number): number {
  return (
    Math.floor(secondsValidated / VALIDATED_SECONDS_PER_GRANT) *
    PREMIUM_DAYS_PER_GRANT
  );
}
