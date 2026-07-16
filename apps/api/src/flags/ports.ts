/** Runtime flag states: read for serving, write for the admin surface (ADR 0025). */
export interface FlagStore {
  getStates(): Promise<Record<string, boolean>>;
  setFlag(key: string, enabled: boolean, changedBy: string): Promise<void>;
}
