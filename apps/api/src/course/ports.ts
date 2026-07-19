import type { CurriculumArtifact, Item } from '@glotty/content';

export type LessonDialogue = NonNullable<
  CurriculumArtifact['units'][number]['lessons'][number]['dialogue']
>;

export interface LessonSummary {
  id: string;
  title: string;
  itemCount: number;
}

export interface UnitSummary {
  id: string;
  title: string;
  lessons: LessonSummary[];
}

/** Write port: curated curriculum is replaced wholesale (ADR 0009),
 * one direction's course at a time (ADR 0046). */
export interface CourseRepository {
  replaceCurriculum(
    curriculum: CurriculumArtifact,
    direction: string,
  ): Promise<void>;
}

/** Read port for the course surface; scoped by direction (ADR 0046). */
export interface CourseQueries {
  overview(direction: string): Promise<UnitSummary[]>;
  /** Undefined when the lesson is unknown or belongs elsewhere. */
  lessonItems(
    lessonId: string,
    direction: string,
  ): Promise<
    { title: string; items: Item[]; dialogue?: LessonDialogue } | undefined
  >;
}
