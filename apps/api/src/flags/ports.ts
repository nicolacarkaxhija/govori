/** Read port for stored runtime flag states (ADR 0025). */
export interface FlagStateSource {
  getStates(): Promise<Record<string, boolean>>;
}
