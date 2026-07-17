import { asc, eq } from 'drizzle-orm';
import type { CurriculumArtifact, Item } from '@govori/content';
import type { Db } from '../db/client.js';
import { lessonItems, lessons, units } from '../db/schema.js';
import type { ItemQueries } from '../content/ports.js';
import type {
  CourseQueries,
  CourseRepository,
  LessonDialogue,
  UnitSummary,
} from './ports.js';

export class DrizzleCourse implements CourseRepository, CourseQueries {
  constructor(
    private readonly db: Db,
    private readonly items: ItemQueries,
  ) {}

  async replaceCurriculum(curriculum: CurriculumArtifact): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(units);
      for (const [unitIndex, unit] of curriculum.units.entries()) {
        const unitId = crypto.randomUUID();
        await tx
          .insert(units)
          .values({ id: unitId, title: unit.title, position: unitIndex });
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

  async overview(): Promise<UnitSummary[]> {
    const unitRows = await this.db
      .select()
      .from(units)
      .orderBy(asc(units.position));
    const lessonRows = await this.db
      .select()
      .from(lessons)
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
  ): Promise<
    { title: string; items: Item[]; dialogue?: LessonDialogue } | undefined
  > {
    const [lesson] = await this.db
      .select()
      .from(lessons)
      .where(eq(lessons.id, lessonId));
    if (lesson === undefined) {
      return undefined;
    }
    const links = await this.db
      .select()
      .from(lessonItems)
      .where(eq(lessonItems.lessonId, lessonId))
      .orderBy(asc(lessonItems.position));
    const found = await this.items.findByIds(links.map((link) => link.itemId));
    return {
      title: lesson.title,
      items: found,
      ...(lesson.dialogue === null ? {} : { dialogue: lesson.dialogue }),
    };
  }
}
