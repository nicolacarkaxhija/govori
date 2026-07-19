import { and, asc, eq, isNull } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import {
  audioCredits,
  datasetManifests,
  recordingVotes,
  recordings,
} from '../db/schema.js';
import { premiumDaysFor } from './credit-policy.js';
import type {
  AudioCredit,
  MyAudio,
  NewRecording,
  RecordingRecord,
  RecordingStore,
  RecordingSummary,
  VoteTally,
} from './ports.js';

/** Postgres adapter for the community audio program (ADR 0004/0048). */
export class DrizzleRecordingStore implements RecordingStore {
  constructor(private readonly db: Db) {}

  async add(recording: NewRecording): Promise<void> {
    const { deviceMeta, ...rest } = recording;
    await this.db.insert(recordings).values({ ...rest, deviceMeta });
  }

  async listForItem(itemId: string): Promise<RecordingSummary[]> {
    return this.db
      .select({
        id: recordings.id,
        itemId: recordings.itemId,
        mime: recordings.mime,
        contributorId: recordings.contributorId,
        status: recordings.status,
      })
      .from(recordings)
      .where(
        and(
          eq(recordings.itemId, itemId),
          eq(recordings.status, 'verified'),
          isNull(recordings.deletedAt),
        ),
      )
      .orderBy(asc(recordings.createdAt), asc(recordings.id));
  }

  async get(
    id: string,
  ): Promise<{ mime: string; bytes: Uint8Array } | undefined> {
    const [row] = await this.db
      .select({ mime: recordings.mime, bytes: recordings.bytes })
      .from(recordings)
      .where(and(eq(recordings.id, id), isNull(recordings.deletedAt)))
      .limit(1);
    return row;
  }

  async findById(id: string): Promise<RecordingRecord | undefined> {
    const [row] = await this.db
      .select({
        id: recordings.id,
        contributorId: recordings.contributorId,
        direction: recordings.direction,
        status: recordings.status,
        deletedAt: recordings.deletedAt,
      })
      .from(recordings)
      .where(eq(recordings.id, id))
      .limit(1);
    return row;
  }

  async castVote(
    recordingId: string,
    voterId: string,
    up: boolean,
  ): Promise<VoteTally> {
    await this.db
      .insert(recordingVotes)
      .values({ recordingId, voterId, up })
      .onConflictDoUpdate({
        target: [recordingVotes.recordingId, recordingVotes.voterId],
        set: { up },
      });
    const rows = await this.db
      .select({ up: recordingVotes.up })
      .from(recordingVotes)
      .where(eq(recordingVotes.recordingId, recordingId));
    return {
      upvotes: rows.filter((row) => row.up).length,
      downvotes: rows.filter((row) => !row.up).length,
    };
  }

  async verify(recordingId: string): Promise<AudioCredit | undefined> {
    const [flipped] = await this.db
      .update(recordings)
      .set({ status: 'verified' })
      .where(
        and(
          eq(recordings.id, recordingId),
          eq(recordings.status, 'pending'),
          isNull(recordings.deletedAt),
        ),
      )
      .returning({
        contributorId: recordings.contributorId,
        deviceMeta: recordings.deviceMeta,
      });
    if (flipped === undefined) {
      return undefined;
    }
    const seconds = Math.round(flipped.deviceMeta.durationMs / 1000);
    const [existing] = await this.db
      .select({ secondsValidated: audioCredits.secondsValidated })
      .from(audioCredits)
      .where(eq(audioCredits.userId, flipped.contributorId));
    const secondsValidated = (existing?.secondsValidated ?? 0) + seconds;
    const premiumDaysGranted = premiumDaysFor(secondsValidated);
    const grantedAt = new Date();
    await this.db
      .insert(audioCredits)
      .values({
        userId: flipped.contributorId,
        secondsValidated,
        premiumDaysGranted,
        grantedAt,
      })
      .onConflictDoUpdate({
        target: audioCredits.userId,
        set: { secondsValidated, premiumDaysGranted, grantedAt },
      });
    return {
      secondsValidated,
      premiumDaysGranted,
      grantedAt: grantedAt.toISOString(),
    };
  }

  async mine(userId: string): Promise<MyAudio> {
    const mineRecordings = await this.db
      .select({
        id: recordings.id,
        itemId: recordings.itemId,
        status: recordings.status,
        accentTag: recordings.accentTag,
        consentVersion: recordings.consentVersion,
        consentApp: recordings.consentApp,
        consentDataset: recordings.consentDataset,
        consentTraining: recordings.consentTraining,
        createdAt: recordings.createdAt,
      })
      .from(recordings)
      .where(
        and(eq(recordings.contributorId, userId), isNull(recordings.deletedAt)),
      )
      .orderBy(asc(recordings.createdAt), asc(recordings.id));
    const [credit] = await this.db
      .select({
        secondsValidated: audioCredits.secondsValidated,
        premiumDaysGranted: audioCredits.premiumDaysGranted,
        grantedAt: audioCredits.grantedAt,
      })
      .from(audioCredits)
      .where(eq(audioCredits.userId, userId));
    return {
      recordings: mineRecordings.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
      credit:
        credit === undefined
          ? null
          : { ...credit, grantedAt: credit.grantedAt.toISOString() },
    };
  }

  /**
   * Freezes a dataset build's membership (ADR 0048): the eligible recordings
   * are those verified, dataset-consented, and not tombstoned. The snapshot
   * is stored under its version, so a later build reflects a withdrawal while
   * the version this one shipped stays non-recallable. Not on the port — the
   * app never builds datasets; this is exercised offline and in tests.
   */
  async buildDatasetManifest(
    version: string,
  ): Promise<{ version: string; recordingIds: string[] }> {
    const eligible = await this.db
      .select({ id: recordings.id })
      .from(recordings)
      .where(
        and(
          eq(recordings.status, 'verified'),
          eq(recordings.consentDataset, true),
          isNull(recordings.deletedAt),
        ),
      )
      .orderBy(asc(recordings.createdAt), asc(recordings.id));
    const recordingIds = eligible.map((row) => row.id);
    await this.db
      .insert(datasetManifests)
      .values({ version, recordingIds })
      .onConflictDoUpdate({
        target: datasetManifests.version,
        set: { recordingIds },
      });
    return { version, recordingIds };
  }

  /** A shipped manifest's frozen membership; undefined when unknown. */
  async getManifest(version: string): Promise<string[] | undefined> {
    const [row] = await this.db
      .select({ recordingIds: datasetManifests.recordingIds })
      .from(datasetManifests)
      .where(eq(datasetManifests.version, version));
    return row?.recordingIds;
  }
}
