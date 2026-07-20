import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import type { Item } from '@glotty/content';
import { and, eq, isNotNull } from 'drizzle-orm';
import { createDb, type Db } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';
import { itemReports, reviewEvents, user } from '../db/schema.js';
import { DrizzleItemRepository } from '../content/drizzle-item-repository.js';
import { DrizzleReportStore } from './drizzle-report-store.js';
import { DrizzleQualityQueries } from './drizzle-quality-queries.js';
import { qualityThresholds } from './thresholds.js';
import type { Grade } from '@glotty/srs';

let container: StartedPostgreSqlContainer;
let db: Db;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17-alpine').start();
  db = createDb(container.getConnectionUri());
  await runMigrations(db);
}, 120_000);

afterAll(async () => {
  await container.stop();
});

const word = (id: string, text: string): Item => ({
  id,
  kind: 'word',
  text,
  translations: [{ lang: 'en', text: `${text}-en` }],
  notes: [],
  provenance: {
    origin: 'import',
    source: 'medzuslovjansky/slovnik',
    license: 'MIT',
    attribution: 'Interslavic community dictionary',
  },
});

// Deterministic uuids per (item, ordinal) so the fixtures never collide.
const eventId = (n: number): string =>
  `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;

async function grade(itemId: string, grades: Grade[]): Promise<void> {
  let seq = Number.parseInt(itemId.slice(0, 4), 16) * 1000;
  await db.insert(reviewEvents).values(
    grades.map((g, index) => ({
      id: eventId(seq + index),
      userId: 'learner-1',
      itemId,
      reviewedAt: new Date(2026, 6, 20, 0, 0, index),
      grade: g,
    })),
  );
  seq += grades.length;
}

const laconic = word('1a11d8f0-4b1c-4f6e-9a7d-1c2b3a4d5e6f', 'laconic');
const reported = word('2b22d8f0-4b1c-4f6e-9a7d-1c2b3a4d5e6f', 'reported');
const thin = word('3c33d8f0-4b1c-4f6e-9a7d-1c2b3a4d5e6f', 'thin');
const healthy = word('4d44d8f0-4b1c-4f6e-9a7d-1c2b3a4d5e6f', 'healthy');
const stray = word('5e55d8f0-4b1c-4f6e-9a7d-1c2b3a4d5e6f', 'stray');

beforeAll(async () => {
  await db.insert(user).values({
    id: 'learner-1',
    name: 'Learner One',
    email: 'learner-1@example.com',
  });
  const repository = new DrizzleItemRepository(db);
  await repository.upsertMany([laconic, reported, thin, healthy], 'isv');
  await repository.upsertMany([stray], 'other');
}, 120_000);

describe('DrizzleReportStore', () => {
  it('flags an item on the third open report, idempotently', async () => {
    const store = new DrizzleReportStore(db);
    const add = (comment: string | null) =>
      store.add({
        itemId: reported.id,
        direction: 'isv',
        reporterId: null,
        reason: 'wrong_translation',
        comment,
      });

    expect(await add(null)).toEqual({ flagged: false });
    expect(await add('still wrong')).toEqual({ flagged: false });
    // The third open report tips it over.
    expect(await add(null)).toEqual({ flagged: true });
    // A fourth report finds it already flagged; the flag never re-stamps.
    expect(await add(null)).toEqual({ flagged: true });

    const flagged = await db
      .select({ id: itemReports.id })
      .from(itemReports)
      .where(
        and(
          eq(itemReports.itemId, reported.id),
          isNotNull(itemReports.flaggedAt),
        ),
      );
    // Exactly one report carries the flag stamp.
    expect(flagged).toHaveLength(1);
  });
});

describe('DrizzleQualityQueries', () => {
  it('escalates lapse-heavy and hand-reported items, most severe first', async () => {
    // laconic: 8 of 12 graded 'again' — over half, enough evidence.
    await grade(laconic.id, [
      'again',
      'again',
      'again',
      'again',
      'again',
      'again',
      'again',
      'again',
      'good',
      'good',
      'good',
      'easy',
    ]);
    // healthy: mostly good, never escalates.
    await grade(healthy.id, [
      'good',
      'good',
      'good',
      'again',
      'good',
      'good',
      'good',
      'good',
      'good',
      'easy',
      'good',
      'good',
    ]);
    // thin: all 'again' but too few graded to trust — below the 10 bar.
    await grade(thin.id, ['again', 'again', 'again', 'again', 'again']);
    // stray: lapse-heavy but in another direction's pool.
    await grade(stray.id, [
      'again',
      'again',
      'again',
      'again',
      'again',
      'again',
      'again',
      'again',
      'again',
      'again',
      'again',
      'again',
    ]);

    // thin also draws two reports — below the bar on both signals, so it never
    // escalates, and its reason rows are dropped from the breakdown merge.
    await db.insert(itemReports).values([
      {
        itemId: thin.id,
        direction: 'isv',
        reporterId: null,
        reason: 'other',
      },
      {
        itemId: thin.id,
        direction: 'isv',
        reporterId: null,
        reason: 'other',
      },
    ]);

    // Two more open reports under a second reason, so the reason breakdown
    // carries more than one bucket and sorts richest-first.
    await db.insert(itemReports).values([
      {
        itemId: reported.id,
        direction: 'isv',
        reporterId: null,
        reason: 'not_natural',
      },
      {
        itemId: reported.id,
        direction: 'isv',
        reporterId: null,
        reason: 'not_natural',
      },
    ]);

    const queries = new DrizzleQualityQueries(
      db,
      new DrizzleItemRepository(db),
    );
    const flags = await queries.flags('isv', qualityThresholds);
    const ids = flags.map((flag) => flag.item.id);

    // reported (3 open reports, flagged in the store suite) and laconic
    // (lapse rate) escalate; healthy, thin, and the cross-direction stray do not.
    expect(ids).toContain(reported.id);
    expect(ids).toContain(laconic.id);
    expect(ids).not.toContain(healthy.id);
    expect(ids).not.toContain(thin.id);
    expect(ids).not.toContain(stray.id);

    // Hand reports weigh heaviest: reported sorts ahead of laconic.
    expect(ids.indexOf(reported.id)).toBeLessThan(ids.indexOf(laconic.id));

    const laconicFlag = flags.find((flag) => flag.item.id === laconic.id);
    expect(laconicFlag).toMatchObject({
      againCount: 8,
      totalGraded: 12,
      openReports: 0,
      reasons: [],
    });
    expect(laconicFlag?.failureRate).toBeCloseTo(8 / 12, 5);

    const reportedFlag = flags.find((flag) => flag.item.id === reported.id);
    // Four wrong_translation reports from the store suite, plus two here.
    expect(reportedFlag?.openReports).toBe(6);
    expect(reportedFlag?.reasons).toEqual([
      { reason: 'wrong_translation', count: 4 },
      { reason: 'not_natural', count: 2 },
    ]);
    // Its full item — text and translation — rides along for the reviewer view.
    expect(reportedFlag?.item.text).toBe('reported');
    expect(reportedFlag?.item.translations[0]?.text).toBe('reported-en');
  });

  it('is empty for a direction with no signals', async () => {
    const queries = new DrizzleQualityQueries(
      db,
      new DrizzleItemRepository(db),
    );
    expect(await queries.flags('empty', qualityThresholds)).toEqual([]);
  });
});
