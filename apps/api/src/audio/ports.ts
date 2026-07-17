/** One community recording; accents are kept diverse, never normalized (ADR 0004). */
export interface RecordingSummary {
  id: string;
  itemId: string;
  mime: string;
  contributorId: string;
}

export interface StoredRecording extends RecordingSummary {
  bytes: Uint8Array;
}

/** Persistence port for community audio; publishes without review (ADR 0008). */
export interface RecordingStore {
  add(recording: StoredRecording): Promise<void>;
  listForItem(itemId: string): Promise<RecordingSummary[]>;
  get(id: string): Promise<{ mime: string; bytes: Uint8Array } | undefined>;
}
