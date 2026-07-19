import { and, asc, eq, inArray } from 'drizzle-orm';
import type { CurriculumArtifact, Item } from '@glotty/content';
import type { Db } from '../db/client.js';
import { lessonItems, lessons, units } from '../db/schema.js';
import type { ItemQueries } from '../content/ports.js';
import type {
  CourseQueries,
  CourseRepository,
  LessonDialogue,
  UnitSummary,
} from './ports.js';

/** Postgres adapter for the course ports; every read and the wholesale
 * replace are scoped to one direction's course (ADR 0046). */
export class DrizzleCourse implements CourseRepository, CourseQueries {
  constructor(
    private readonly db: Db,
    private readonly items: ItemQueries,
  ) {}

  async replaceCurriculum(
    curriculum: CurriculumArtifact,
    direction: string,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Only this direction's course is replaced; the other pools'
      // structures stay untouched (ADR 0046).
      await tx.delete(units).where(eq(units.direction, direction));
      for (const [unitIndex, unit] of curriculum.units.entries()) {
        const unitId = crypto.randomUUID();
        await tx.insert(units).values({
          id: unitId,
          direction,
          title: unit.title,
          position: unitIndex,
        });
        for (const [lessonIndex, lesson] of unit.lessons.entries()) {
          const lessonId = crypto.randomUUID();
          await tx.insert(lessons).values({
            id: lessonId,
            unitId,
            title: lesson.title,
            position: lessonIndex,
            dialogue: lesson.dialogue ?? null,
          });
          await tx.insert(lessonItems).values(
            lesson.itemIds.map((itemId, itemIndex) => ({
              lessonId,
              itemId,
              position: itemIndex,
            })),
          );
        }
      }
    });
  }

  async overview(direction: string): Promise<UnitSummary[]> {
    const unitRows = await this.db
      .select()
      .from(units)
      .where(eq(units.direction, direction))
      .orderBy(asc(units.position));
    if (unitRows.length === 0) {
      return [];
    }
    const lessonRows = await this.db
      .select()
      .from(lessons)
      .where(
        inArray(
          lessons.unitId,
          unitRows.map((unit) => unit.id),
        ),
      )
      .orderBy(asc(lessons.position));
    const linkRows = await this.db.select().from(lessonItems);
    return unitRows.map((unit) => ({
      id: unit.id,
      title: unit.title,
      lessons: lessonRows
        .filter((lesson) => lesson.unitId === unit.id)
        .map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          itemCount: linkRows.filter((link) => link.lessonId === lesson.id)
            .length,
        })),
    }));
  }

  async lessonItems(
    lessonId: string,
    direction: string,
  ): Promise<
    { title: string; items: Item[]; dialogue?: LessonDialogue } | undefined
  > {
    // The unit join scopes the lookup: a lesson of another direction is
    // as absent as an unknown id (ADR 0046).
    const [row] = await this.db
      .select({ lesson: lessons })
      .from(lessons)
      .innerJoin(units, eq(lessons.unitId, units.id))
      .where(and(eq(lessons.id, lessonId), eq(units.direction, direction)));
    if (row === undefined) {
      return undefined;
    }
    const links = await this.db
      .select()
      .from(lessonItems)
      .where(eq(lessonItems.lessonId, lessonId))
      .orderBy(asc(lessonItems.position));
    const found = await this.items.findByIds(links.map((link) => link.itemId));
    return {
      title: row.lesson.title,
      items: found,
      ...(row.lesson.dialogue === null
        ? {}
        : { dialogue: row.lesson.dialogue }),
    };
  }
}
