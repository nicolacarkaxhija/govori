import { z } from 'zod';

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
