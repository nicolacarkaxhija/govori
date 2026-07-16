import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { applyReview, replay, selectDue, type ReviewEvent } from './index.js';

// Invariants the sync model depends on (ADR 0030/0036): replay must behave
// like a pure function of the event *set*, never of arrival order.

// An event id IS the event's identity: ids are unique per distinct event
// (see ReviewEvent). The generator upholds that invariant by assigning
// sequential ids after generation.
const payloadArb = fc.record({
  itemId: fc.constantFrom('dom', 'voda', 'hlěb', 'konj'),
  reviewedAt: fc
    .date({
      min: new Date('2026-01-01T00:00:00.000Z'),
      max: new Date('2027-01-01T00:00:00.000Z'),
      noInvalidDate: true,
    })
    .map((date) => date.toISOString()),
  grade: fc.constantFrom('again', 'hard', 'good', 'easy'),
});

const eventArb: fc.Arbitrary<ReviewEvent> = payloadArb.map((payload) => ({
  ...payload,
  id: 'e0',
}));

const eventsArb: fc.Arbitrary<ReviewEvent[]> = fc
  .array(payloadArb, { maxLength: 25 })
  .map((payloads) =>
    payloads.map((payload, index) => ({ ...payload, id: `e${String(index)}` })),
  );

describe('replay invariants', () => {
  it('is order-independent', () => {
    const eventsWithPermutation = eventsArb.chain((events) =>
      fc.tuple(
        fc.constant(events),
        fc.shuffledSubarray(events, { minLength: events.length }),
      ),
    );
    fc.assert(
      fc.property(eventsWithPermutation, ([events, shuffled]) => {
        expect(replay(shuffled)).toEqual(replay(events));
      }),
    );
  });

  it('is idempotent under set union with itself', () => {
    fc.assert(
      fc.property(eventsArb, (events) => {
        expect(replay([...events, ...events])).toEqual(replay(events));
      }),
    );
  });

  it('always schedules the next review strictly after the review time', () => {
    fc.assert(
      fc.property(eventArb, (event) => {
        const schedule = applyReview(undefined, event);
        expect(schedule.due > event.reviewedAt).toBe(true);
        expect(schedule.intervalDays).toBeGreaterThanOrEqual(1);
        expect(schedule.ease).toBeGreaterThanOrEqual(1.3);
      }),
    );
  });

  it('never returns items that are not yet due', () => {
    fc.assert(
      fc.property(
        eventsArb,
        fc
          .date({
            min: new Date('2026-01-01T00:00:00.000Z'),
            max: new Date('2028-01-01T00:00:00.000Z'),
            noInvalidDate: true,
          })
          .map((date) => date.toISOString()),
        (events, now) => {
          for (const schedule of selectDue(replay(events), now)) {
            expect(schedule.due <= now).toBe(true);
          }
        },
      ),
    );
  });
});
