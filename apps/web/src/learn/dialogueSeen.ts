import { instance } from '../instance';

const STORAGE_KEY = `${instance.id}.dialogues-seen.v1`;

function load(): string[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === 'string')
      : [];
  } catch {
    return [];
  }
}

/**
 * Which lesson dialogues this device has already watched: a plain id
 * list in localStorage, so return visits can play the scene as a
 * reordering exercise instead of a rerun.
 */
export function hasSeenDialogue(lessonId: string): boolean {
  return load().includes(lessonId);
}

export function markDialogueSeen(lessonId: string): void {
  const seen = load();
  if (!seen.includes(lessonId)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen, lessonId]));
  }
}
