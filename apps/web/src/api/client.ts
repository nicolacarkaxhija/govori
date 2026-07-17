import { z } from 'zod';
import type { ReviewEvent } from '@govori/srs';

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
});

const itemsSchema = z.object({ items: z.array(learnItemSchema) });

export type LearnItem = z.infer<typeof learnItemSchema>;

export async function fetchItems(limit = 50): Promise<LearnItem[] | null> {
  try {
    const response = await fetch(
      new URL(`/items?limit=${String(limit)}`, apiBaseUrl),
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
});

export type Stats = z.infer<typeof statsSchema>;

export async function fetchStats(): Promise<Stats | null> {
  try {
    const response = await fetch(new URL('/stats', apiBaseUrl));
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

export async function fetchCourse(): Promise<Course | null> {
  try {
    const response = await fetch(new URL('/course', apiBaseUrl));
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
});

export type Lesson = z.infer<typeof lessonSchema>;

export async function fetchLesson(id: string): Promise<Lesson | null> {
  try {
    const response = await fetch(new URL(`/lessons/${id}`, apiBaseUrl));
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
export async function fetchLessonSentences(id: string): Promise<LearnItem[]> {
  try {
    const response = await fetch(
      new URL(`/lessons/${id}/sentences`, apiBaseUrl),
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
    role: z.enum(['learner', 'admin']),
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
