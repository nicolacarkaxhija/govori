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
