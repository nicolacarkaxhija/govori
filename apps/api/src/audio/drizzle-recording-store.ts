import { asc, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { recordings } from '../db/schema.js';
import type {
  RecordingStore,
  RecordingSummary,
  StoredRecording,
} from './ports.js';

/** Postgres adapter for community audio (ADR 0004). */
export class DrizzleRecordingStore implements RecordingStore {
  constructor(private readonly db: Db) {}

  async add(recording: StoredRecording): Promise<void> {
    await this.db.insert(recordings).values(recording);
  }

  async listForItem(itemId: string): Promise<RecordingSummary[]> {
    return this.db
      .select({
        id: recordings.id,
        itemId: recordings.itemId,
        mime: recordings.mime,
        contributorId: recordings.contributorId,
      })
      .from(recordings)
      .where(eq(recordings.itemId, itemId))
      .orderBy(asc(recordings.createdAt), asc(recordings.id));
  }

  async get(
    id: string,
  ): Promise<{ mime: string; bytes: Uint8Array } | undefined> {
    const [row] = await this.db
      .select({ mime: recordings.mime, bytes: recordings.bytes })
      .from(recordings)
      .where(eq(recordings.id, id))
      .limit(1);
    return row;
  }
}
