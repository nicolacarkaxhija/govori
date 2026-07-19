import { asc, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import {
  audioCredits,
  recordingVotes,
  recordings,
  reviewEvents,
  user,
} from '../db/schema.js';
import type { AccountRights, ExportBundle } from './ports.js';

/** The attribution a pseudonymized contribution carries after erasure (ADR 0010). */
const ERASED_CONTRIBUTOR = 'deleted';

export class DrizzleAccount implements AccountRights {
  constructor(private readonly db: Db) {}

  async exportData(userId: string): Promise<ExportBundle | undefined> {
    const [row] = await this.db.select().from(user).where(eq(user.id, userId));
    if (row === undefined) {
      return undefined;
    }
    const reviews = await this.db
      .select()
      .from(reviewEvents)
      .where(eq(reviewEvents.userId, userId))
      .orderBy(asc(reviewEvents.reviewedAt), asc(reviewEvents.id));
    return {
      user: {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        createdAt: row.createdAt.toISOString(),
      },
      reviews: reviews.map((review) => ({
        id: review.id,
        itemId: review.itemId,
        reviewedAt: review.reviewedAt.toISOString(),
        grade: review.grade,
      })),
    };
  }

  async deleteAccount(userId: string): Promise<void> {
    // Voice recordings are personal data (ADR 0048): erasure drops the audio
    // and its attribution but keeps a tombstone (deleted_at), so the clip is
    // excluded from every future dataset build while versions it already
    // shipped in stay non-recallable (ADR 0010). The contributor's ballots
    // and premium-time ledger are theirs alone and go entirely.
    await this.db
      .update(recordings)
      .set({
        deletedAt: new Date(),
        bytes: new Uint8Array(),
        contributorId: ERASED_CONTRIBUTOR,
      })
      .where(eq(recordings.contributorId, userId));
    await this.db
      .delete(recordingVotes)
      .where(eq(recordingVotes.voterId, userId));
    await this.db.delete(audioCredits).where(eq(audioCredits.userId, userId));
    await this.db.delete(user).where(eq(user.id, userId));
  }
}
