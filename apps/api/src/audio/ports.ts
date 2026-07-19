/** Recording validation state through the community-vote path (ADR 0048/0040). */
export type RecordingStatus = 'pending' | 'verified' | 'rejected';

/** Client-estimated capture metadata (ADR 0048): kept for dataset quality
 * triage, never trusted as ground truth. */
export interface DeviceMeta {
  /** Capture sample rate in Hz; omitted when the client cannot report it. */
  sampleRate?: number;
  mime: string;
  /** Clip length in milliseconds, as the client measured it. */
  durationMs: number;
}

/** One community recording; accents are kept diverse, never normalized (ADR 0004). */
export interface RecordingSummary {
  id: string;
  itemId: string;
  mime: string;
  contributorId: string;
  status: RecordingStatus;
}

/** A clip on its way into storage, carrying the dataset-grade metadata the
 * program needs from day one (ADR 0048). */
export interface NewRecording {
  id: string;
  itemId: string;
  /** The learning direction the clip belongs to (ADR 0046). */
  direction: string;
  contributorId: string;
  /** Stable pseudonymous speaker id, never the user id (ADR 0048). */
  speakerPseudonym: string;
  /** Contributor-declared accent/dialect tag; null when undeclared. */
  accentTag: string | null;
  mime: string;
  bytes: Uint8Array;
  deviceMeta: DeviceMeta;
  /** The three grants are independently opt-in (ADR 0048): app-use is
   * required to contribute; dataset and training default off. */
  consentVersion: string;
  consentApp: boolean;
  consentDataset: boolean;
  consentTraining: boolean;
}

/** A recording's identity and validation state, sans bytes — enough for the
 * vote route to judge and credit without loading the audio. */
export interface RecordingRecord {
  id: string;
  contributorId: string;
  /** Owning direction; null for a pre-backfill row, treated as absent. */
  direction: string | null;
  status: RecordingStatus;
  deletedAt: Date | null;
}

export interface VoteTally {
  upvotes: number;
  downvotes: number;
}

/** The casual-tier premium-time ledger for one contributor (ADR 0048). */
export interface AudioCredit {
  secondsValidated: number;
  premiumDaysGranted: number;
  grantedAt: string;
}

/** A contributor's own audio: their clips with consents, and their credit. */
export interface MyAudio {
  recordings: {
    id: string;
    itemId: string;
    status: RecordingStatus;
    accentTag: string | null;
    consentVersion: string;
    consentApp: boolean;
    consentDataset: boolean;
    consentTraining: boolean;
    createdAt: string;
  }[];
  credit: AudioCredit | null;
}

/** Persistence port for community audio (ADR 0004/0048). */
export interface RecordingStore {
  add(recording: NewRecording): Promise<void>;
  /** Verified, non-tombstoned clips for public playback. */
  listForItem(itemId: string): Promise<RecordingSummary[]>;
  get(id: string): Promise<{ mime: string; bytes: Uint8Array } | undefined>;
  /** Identity and state for the vote route; undefined when unknown. */
  findById(id: string): Promise<RecordingRecord | undefined>;
  /** Upserts one vote per voter per recording; returns the fresh tally. */
  castVote(
    recordingId: string,
    voterId: string,
    up: boolean,
  ): Promise<VoteTally>;
  /**
   * Flips a pending recording to verified exactly once and credits its
   * contributor by the clip's validated seconds (ADR 0048). Returns the
   * contributor's updated ledger, or undefined when nothing flipped
   * (unknown, already decided, or tombstoned) so votes never double-credit.
   */
  verify(recordingId: string): Promise<AudioCredit | undefined>;
  /** A contributor's own clips, consents, and credit ledger (ADR 0048). */
  mine(userId: string): Promise<MyAudio>;
}
