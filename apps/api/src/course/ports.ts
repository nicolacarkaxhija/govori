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

/** Write port: curated curriculum is replaced wholesale (ADR 0009). */
export interface CourseRepository {
  replaceCurriculum(curriculum: CurriculumArtifact): Promise<void>;
}

/** Read port for the course surface. */
export interface CourseQueries {
  overview(): Promise<UnitSummary[]>;
  lessonItems(
    lessonId: string,
  ): Promise<
    { title: string; items: Item[]; dialogue?: LessonDialogue } | undefined
  >;
}
