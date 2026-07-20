import { z } from 'zod';
import type { ReviewEvent } from '@glotty/srs';

const metaSchema = z.object({
  brand: z.object({
    shortName: z.string().min(1),
    fullName: z.string().min(1),
  }),
});

export type Meta = z.infer<typeof metaSchema>;

// Same-origin by default: production serves web and api behind one host
// (ADR 0027); dev and e2e builds inject an explicit origin.
const apiBaseUrl = import.meta.env.VITE_API_URL ?? window.location.origin;

export async function fetchMeta(): Promise<Meta | null> {
  try {
    const response = await fetch(new URL('/meta', apiBaseUrl));
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    return metaSchema.parse(payload);
  } catch {
    return null;
  }
}

const learnItemSchema = z.object({
  id: z.uuid(),
  kind: z.enum(['word', 'phrase', 'sentence']),
  text: z.string().min(1),
  translations: z
    .array(z.object({ lang: z.string(), text: z.string() }))
    .min(1),
  /** Contrastive hints per source language; absent on most items. */
  notes: z
    .array(z.object({ sourceLang: z.string(), text: z.string() }))
    .optional(),
  /**
   * Cross-source attestation tier from the forge (@glotty/content): gold = 3+
   * corroborating corpora, silver = 2, bronze = 1. Absent on most items today,
   * so it is optional; when present it gates data quality (ADR 0051).
   */
  attestation: z.enum(['gold', 'silver', 'bronze']).optional(),
});

const itemsSchema = z.object({ items: z.array(learnItemSchema) });

export type LearnItem = z.infer<typeof learnItemSchema>;

/** Items of one direction's pool (ADR 0046), most frequent first. */
export async function fetchItems(
  direction: string,
  limit = 50,
): Promise<LearnItem[] | null> {
  try {
    const response = await fetch(
      new URL(
        `/items?direction=${encodeURIComponent(direction)}&limit=${String(limit)}`,
        apiBaseUrl,
      ),
    );
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    return itemsSchema.parse(payload).items;
  } catch {
    return null;
  }
}

const statsSchema = z.object({
  items: z.number(),
  translations: z.number(),
  reviews: z.number(),
  learners: z.number(),
  /** Golden-set quality, 0-100, null until the first audit lands (ADR 0051);
   * the audited-item count keeps the figure honest about its sample. */
  qualityScore: z.number().nullable(),
  qualityAuditedItems: z.number(),
});

export type Stats = z.infer<typeof statsSchema>;

export async function fetchStats(direction: string): Promise<Stats | null> {
  try {
    const response = await fetch(
      new URL(`/stats?direction=${encodeURIComponent(direction)}`, apiBaseUrl),
    );
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    return statsSchema.parse(payload);
  } catch {
    return null;
  }
}

const courseSchema = z.object({
  units: z.array(
    z.object({
      id: z.uuid(),
      title: z.string(),
      lessons: z.array(
        z.object({ id: z.uuid(), title: z.string(), itemCount: z.number() }),
      ),
    }),
  ),
});

export type Course = z.infer<typeof courseSchema>;

export async function fetchCourse(direction: string): Promise<Course | null> {
  try {
    const response = await fetch(
      new URL(`/course?direction=${encodeURIComponent(direction)}`, apiBaseUrl),
    );
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    return courseSchema.parse(payload);
  } catch {
    return null;
  }
}

const lessonSchema = z.object({
  title: z.string(),
  items: z.array(learnItemSchema).min(1),
  dialogue: z
    .object({
      turns: z.array(
        z.object({
          speaker: z.string(),
          text: z.string(),
          translation: z.string(),
        }),
      ),
      provenance: z.object({ origin: z.string() }).loose(),
    })
    .optional(),
});

export type LessonDialogue = NonNullable<
  z.infer<typeof lessonSchema>['dialogue']
>;

export type Lesson = z.infer<typeof lessonSchema>;

export async function fetchLesson(
  id: string,
  direction: string,
): Promise<Lesson | null> {
  try {
    const response = await fetch(
      new URL(
        `/lessons/${id}?direction=${encodeURIComponent(direction)}`,
        apiBaseUrl,
      ),
    );
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    return lessonSchema.parse(payload);
  } catch {
    return null;
  }
}

const sentencesSchema = z.object({ sentences: z.array(learnItemSchema) });

/** Sentences that exercise this lesson's words; empty when none exist. */
export async function fetchLessonSentences(
  id: string,
  direction: string,
): Promise<LearnItem[]> {
  try {
    const response = await fetch(
      new URL(
        `/lessons/${id}/sentences?direction=${encodeURIComponent(direction)}`,
        apiBaseUrl,
      ),
    );
    if (!response.ok) {
      return [];
    }
    const payload: unknown = await response.json();
    return sentencesSchema.parse(payload).sentences;
  } catch {
    return [];
  }
}

const meSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    role: z.enum(['learner', 'reviewer', 'admin']),
  }),
});

export type Me = z.infer<typeof meSchema>;

export async function fetchMe(): Promise<Me | null> {
  try {
    const response = await fetch(new URL('/me', apiBaseUrl), {
      credentials: 'include',
    });
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    return meSchema.parse(payload);
  } catch {
    return null;
  }
}

async function authPost(path: string, body: unknown): Promise<boolean> {
  try {
    const response = await fetch(new URL(path, apiBaseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function signUp(
  email: string,
  password: string,
  name: string,
): Promise<boolean> {
  return authPost('/api/auth/sign-up/email', { email, password, name });
}

export function signIn(email: string, password: string): Promise<boolean> {
  return authPost('/api/auth/sign-in/email', { email, password });
}

export function signOut(): Promise<boolean> {
  return authPost('/api/auth/sign-out', {});
}

const syncResultSchema = z.object({
  received: z.number(),
  stored: z.number(),
});

export type SyncResult = z.infer<typeof syncResultSchema>;

/** Pushes the local review log; the server unions by event id (ADR 0030). */
export async function pushReviews(
  events: readonly ReviewEvent[],
): Promise<SyncResult | null> {
  try {
    const response = await fetch(new URL('/sync/reviews', apiBaseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ events }),
    });
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    return syncResultSchema.parse(payload);
  } catch {
    return null;
  }
}

export async function exportData(): Promise<unknown> {
  try {
    const response = await fetch(new URL('/me/export', apiBaseUrl), {
      credentials: 'include',
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

export async function deleteAccount(): Promise<boolean> {
  try {
    const response = await fetch(new URL('/me', apiBaseUrl), {
      method: 'DELETE',
      credentials: 'include',
    });
    return response.ok;
  } catch {
    return false;
  }
}

const pendingSchema = z.object({ pending: z.array(learnItemSchema) });

/** Admin-only: drafts awaiting review; null when not allowed/unreachable. */
export async function fetchPendingReviews(): Promise<LearnItem[] | null> {
  try {
    const response = await fetch(new URL('/admin/review', apiBaseUrl), {
      credentials: 'include',
    });
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    return pendingSchema.parse(payload).pending;
  } catch {
    return null;
  }
}

/** Admin-only: records a decision; true when the entry was decided. */
export async function decideReview(
  id: string,
  decision: 'approve' | 'reject',
): Promise<boolean> {
  try {
    const response = await fetch(new URL(`/admin/review/${id}`, apiBaseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ decision }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

const reviewEventsSchema = z.object({
  events: z.array(
    z.object({
      id: z.uuid(),
      itemId: z.uuid(),
      reviewedAt: z.iso.datetime(),
      grade: z.enum(['again', 'hard', 'good', 'easy']),
    }),
  ),
});

/** Pulls the account's review log for set-union into local storage. */
export async function fetchReviews(): Promise<ReviewEvent[] | null> {
  try {
    const response = await fetch(new URL('/sync/reviews', apiBaseUrl), {
      credentials: 'include',
    });
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    return reviewEventsSchema.parse(payload).events;
  } catch {
    return null;
  }
}

const usersSchema = z.object({
  users: z.array(
    z.object({
      id: z.string(),
      email: z.string(),
      name: z.string(),
      role: z.enum(['learner', 'reviewer', 'admin']),
      createdAt: z.string(),
    }),
  ),
});

export type UserRow = z.infer<typeof usersSchema>['users'][number];

/** Admin-only: the user directory; null when not allowed/unreachable. */
export async function fetchUsers(): Promise<UserRow[] | null> {
  try {
    const response = await fetch(new URL('/admin/users', apiBaseUrl), {
      credentials: 'include',
    });
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    return usersSchema.parse(payload).users;
  } catch {
    return null;
  }
}

/** Admin-only: promotes or demotes; true when the change landed. */
export async function setUserRole(
  id: string,
  role: 'learner' | 'reviewer' | 'admin',
): Promise<boolean> {
  try {
    const response = await fetch(
      new URL(`/admin/users/${id}/role`, apiBaseUrl),
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role }),
      },
    );
    return response.ok;
  } catch {
    return false;
  }
}

export type ContributeResult =
  'accepted' | 'invalid' | 'unauthenticated' | 'failed';

/** Sends a learner's suggestion into the community review queue,
 * scoped to one direction's pool (ADR 0046). */
export async function contribute(
  kind: 'word' | 'phrase' | 'sentence',
  text: string,
  translations: { lang: string; text: string }[],
  direction: string,
): Promise<ContributeResult> {
  try {
    const response = await fetch(new URL('/contribute', apiBaseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ direction, kind, text, translations }),
    });
    if (response.status === 202) {
      return 'accepted';
    }
    if (response.status === 401) {
      return 'unauthenticated';
    }
    if (response.status === 400) {
      return 'invalid';
    }
    return 'failed';
  } catch {
    return 'failed';
  }
}

const pendingVotesSchema = z.object({
  pending: z.array(
    z.object({
      item: learnItemSchema,
      upvotes: z.number(),
      downvotes: z.number(),
      myVote: z.boolean().nullable(),
    }),
  ),
});

export type PendingVote = z.infer<typeof pendingVotesSchema>['pending'][number];

/**
 * Community drafts open for voting (net-3 upvotes publishes). A 401 is a
 * missing session, not a failure — the view offers sign-in for it.
 */
export async function fetchPendingVotes(
  limit = 50,
): Promise<PendingVote[] | 'unauthenticated' | null> {
  try {
    const response = await fetch(
      new URL(`/review/pending?limit=${String(limit)}`, apiBaseUrl),
      { credentials: 'include' },
    );
    if (response.status === 401) {
      return 'unauthenticated';
    }
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    return pendingVotesSchema.parse(payload).pending;
  } catch {
    return null;
  }
}

const voteTallySchema = z.object({
  upvotes: z.number(),
  downvotes: z.number(),
});

export type VoteTally = z.infer<typeof voteTallySchema>;

/** Casts or changes a vote on a pending draft; null when it did not land. */
export async function castVote(
  id: string,
  up: boolean,
): Promise<VoteTally | null> {
  try {
    const response = await fetch(new URL(`/review/${id}/vote`, apiBaseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ up }),
    });
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    return voteTallySchema.parse(payload);
  } catch {
    return null;
  }
}

/** The four reasons a learner may attach to a quality report (ADR 0051). */
export const REPORT_REASONS = [
  'wrong_translation',
  'not_natural',
  'wrong_audio',
  'other',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

/**
 * Reports a quality problem with a published item (ADR 0051). Works for
 * anonymous and signed-in learners alike — reporting is a quality signal, not
 * an identity action. True when the report was accepted (202).
 */
export async function reportItem(
  itemId: string,
  reason: ReportReason,
  comment?: string,
): Promise<boolean> {
  try {
    const response = await fetch(
      new URL(`/items/${itemId}/report`, apiBaseUrl),
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reason,
          ...(comment === undefined || comment.trim() === ''
            ? {}
            : { comment }),
        }),
      },
    );
    return response.status === 202;
  } catch {
    return false;
  }
}

const qualityFlagsSchema = z.object({
  flags: z.array(
    z.object({
      item: learnItemSchema,
      againCount: z.number(),
      totalGraded: z.number(),
      failureRate: z.number(),
      openReports: z.number(),
      reasons: z.array(
        z.object({ reason: z.enum(REPORT_REASONS), count: z.number() }),
      ),
    }),
  ),
});

export type QualityFlag = z.infer<typeof qualityFlagsSchema>['flags'][number];

/**
 * Reviewer-only: items the quality-feedback loop has auto-escalated (ADR 0051)
 * — lapse-heavy in the review log or hand-reported past the bar, most severe
 * first. Null when not allowed or unreachable.
 */
export async function fetchQualityFlags(): Promise<QualityFlag[] | null> {
  try {
    const response = await fetch(new URL('/admin/quality-flags', apiBaseUrl), {
      credentials: 'include',
    });
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    return qualityFlagsSchema.parse(payload).flags;
  } catch {
    return null;
  }
}

const flagsSchema = z.object({
  flags: z.record(z.string(), z.boolean()),
});

/** Effective feature flags; absent flags read as off (ADR 0025). */
export async function fetchFlags(): Promise<Record<string, boolean>> {
  try {
    const response = await fetch(new URL('/flags', apiBaseUrl));
    if (!response.ok) {
      return {};
    }
    const payload: unknown = await response.json();
    return flagsSchema.parse(payload).flags;
  } catch {
    return {};
  }
}

const recordingsSchema = z.object({
  recordings: z.array(z.object({ id: z.string(), mime: z.string() })),
});

export type Recording = z.infer<typeof recordingsSchema>['recordings'][number];

/** Community recordings for an item; empty while the audio flag is dark. */
export async function fetchRecordings(itemId: string): Promise<Recording[]> {
  try {
    const response = await fetch(new URL(`/items/${itemId}/audio`, apiBaseUrl));
    if (!response.ok) {
      return [];
    }
    const payload: unknown = await response.json();
    return recordingsSchema.parse(payload).recordings;
  } catch {
    return [];
  }
}

/** Streamable address of one recording, for an Audio element. */
export function recordingUrl(id: string): string {
  return new URL(`/audio/${id}`, apiBaseUrl).toString();
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  // Chunked to keep the argument list small on megabyte clips.
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

/** Uploads accept exactly these container types (ADR 0004). */
export type RecordingMime = 'audio/webm' | 'audio/ogg' | 'audio/mpeg';

/** Client-estimated capture metadata (ADR 0048); triage only, never trusted. */
export interface RecordingDevice {
  /** Capture sample rate in Hz; omitted when the client cannot report it. */
  sampleRate?: number;
  mime: RecordingMime;
  durationMs: number;
}

/** The three independently opt-in grants (ADR 0048); app-use is required to
 * contribute, dataset and training default off. */
export interface RecordingConsent {
  version: string;
  app: true;
  dataset: boolean;
  training: boolean;
}

/**
 * Publishes a clip against an item (ADR 0048): the recording carries the
 * three consent grants, client-estimated device metadata, and an optional
 * accent tag, then enters the community-vote validation path as pending.
 */
export async function uploadRecording(
  itemId: string,
  clip: Blob,
  device: RecordingDevice,
  consent: RecordingConsent,
  accentTag?: string,
): Promise<boolean> {
  try {
    const data = toBase64(new Uint8Array(await clip.arrayBuffer()));
    const response = await fetch(
      new URL(`/items/${itemId}/audio`, apiBaseUrl),
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mime: device.mime,
          data,
          device: {
            ...(device.sampleRate === undefined
              ? {}
              : { sampleRate: device.sampleRate }),
            durationMs: device.durationMs,
          },
          consent: {
            version: consent.version,
            app: consent.app,
            dataset: consent.dataset,
            training: consent.training,
          },
          ...(accentTag === undefined ? {} : { accentTag }),
        }),
      },
    );
    return response.status === 201;
  } catch {
    return false;
  }
}

const recordingStatusSchema = z.enum(['pending', 'verified', 'rejected']);

export type RecordingStatus = z.infer<typeof recordingStatusSchema>;

const myAudioSchema = z.object({
  recordings: z.array(
    z.object({
      id: z.string(),
      itemId: z.string(),
      status: recordingStatusSchema,
      accentTag: z.string().nullable(),
      consentVersion: z.string(),
      consentApp: z.boolean(),
      consentDataset: z.boolean(),
      consentTraining: z.boolean(),
      createdAt: z.string(),
    }),
  ),
  credit: z
    .object({
      secondsValidated: z.number(),
      premiumDaysGranted: z.number(),
      grantedAt: z.string(),
    })
    .nullable(),
});

export type MyAudio = z.infer<typeof myAudioSchema>;
export type MyRecording = MyAudio['recordings'][number];

/**
 * A contributor's own clips, their consents, and the premium-time ledger
 * (ADR 0048). A 401 is a missing session, not a failure — the view offers
 * sign-in for it; null is unreachable.
 */
export async function fetchMyRecordings(): Promise<
  MyAudio | 'unauthenticated' | null
> {
  try {
    const response = await fetch(new URL('/audio/mine', apiBaseUrl), {
      credentials: 'include',
    });
    if (response.status === 401) {
      return 'unauthenticated';
    }
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    return myAudioSchema.parse(payload);
  } catch {
    return null;
  }
}

const audioVoteSchema = z.object({
  upvotes: z.number(),
  downvotes: z.number(),
  status: recordingStatusSchema,
});

export type AudioVoteResult = z.infer<typeof audioVoteSchema>;

/** Votes a pending recording up or down (ADR 0048/0040); the response
 * carries the fresh tally and the clip's status. Null when it did not land. */
export async function castAudioVote(
  id: string,
  up: boolean,
): Promise<AudioVoteResult | null> {
  try {
    const response = await fetch(new URL(`/audio/${id}/vote`, apiBaseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ up }),
    });
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    return audioVoteSchema.parse(payload);
  } catch {
    return null;
  }
}

const pendingAudioSchema = z.object({
  pending: z.array(
    z.object({
      id: z.string(),
      mime: z.string(),
      item: learnItemSchema,
      upvotes: z.number(),
      downvotes: z.number(),
      myVote: z.boolean().nullable(),
    }),
  ),
});

export type PendingRecording = z.infer<
  typeof pendingAudioSchema
>['pending'][number];

/**
 * Pending clips awaiting community validation (ADR 0048). A 401 is a missing
 * session; null is unreachable — including while the listing endpoint is not
 * yet served, so the queue degrades to "unavailable" rather than throwing.
 */
export async function fetchPendingAudio(
  limit = 50,
): Promise<PendingRecording[] | 'unauthenticated' | null> {
  try {
    const response = await fetch(
      new URL(`/audio/pending?limit=${String(limit)}`, apiBaseUrl),
      { credentials: 'include' },
    );
    if (response.status === 401) {
      return 'unauthenticated';
    }
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    return pendingAudioSchema.parse(payload).pending;
  } catch {
    return null;
  }
}

const goldenAuditSchema = z.object({
  accuracy: z.number(),
  naturalness: z.number(),
  fit: z.number(),
  comment: z.string().nullable(),
  auditedAt: z.string(),
});

const goldenQueueSchema = z.object({
  queue: z.array(
    z.object({
      item: learnItemSchema,
      priorAudit: goldenAuditSchema.nullable(),
    }),
  ),
});

export type GoldenEntry = z.infer<typeof goldenQueueSchema>['queue'][number];

/**
 * Reviewer-only: golden-set items in this direction awaiting the caller's
 * audit, each with any prior audit as context (ADR 0051). Null when not
 * allowed or unreachable.
 */
export async function fetchGoldenQueue(
  direction: string,
  limit = 50,
): Promise<GoldenEntry[] | null> {
  try {
    const response = await fetch(
      new URL(
        `/admin/golden?direction=${encodeURIComponent(direction)}&limit=${String(limit)}`,
        apiBaseUrl,
      ),
      { credentials: 'include' },
    );
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    return goldenQueueSchema.parse(payload).queue;
  } catch {
    return null;
  }
}

/** One reviewer's 1-5 scores over a golden-set item (ADR 0051). */
export interface GoldenScores {
  accuracy: number;
  naturalness: number;
  fit: number;
  comment?: string;
}

/** Reviewer-only: records (or replaces) the caller's audit; true when it
 * landed. */
export async function submitGoldenAudit(
  itemId: string,
  scores: GoldenScores,
): Promise<boolean> {
  try {
    const response = await fetch(
      new URL(`/admin/golden/${itemId}/audit`, apiBaseUrl),
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          accuracy: scores.accuracy,
          naturalness: scores.naturalness,
          fit: scores.fit,
          ...(scores.comment === undefined || scores.comment.trim() === ''
            ? {}
            : { comment: scores.comment }),
        }),
      },
    );
    return response.ok;
  } catch {
    return false;
  }
}

const formsSchema = z.object({
  forms: z.array(z.object({ tag: z.string(), text: z.string() })),
});

export type ItemForm = z.infer<typeof formsSchema>['forms'][number];

/** Inflected forms of an item (morphology artifact); empty when none. */
export async function fetchForms(itemId: string): Promise<ItemForm[]> {
  try {
    const response = await fetch(new URL(`/items/${itemId}/forms`, apiBaseUrl));
    if (!response.ok) {
      return [];
    }
    const payload: unknown = await response.json();
    return formsSchema.parse(payload).forms;
  } catch {
    return [];
  }
}
