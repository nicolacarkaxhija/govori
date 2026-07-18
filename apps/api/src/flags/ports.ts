import type { FlagState, TargetRole } from '@glotty/config';

/** Runtime flag states: read for serving, write for the admin surface (ADR 0025). */
export interface FlagStore {
  getStates(): Promise<Record<string, FlagState>>;
  /**
   * Flips a flag's switch and, when given, its visibility ring; an
   * omitted ring leaves the stored one untouched. Records the change.
   */
  setFlag(
    key: string,
    enabled: boolean,
    changedBy: string,
    targetRole?: TargetRole,
  ): Promise<void>;
}
