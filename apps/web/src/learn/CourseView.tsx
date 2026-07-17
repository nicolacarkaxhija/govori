import { useEffect, useState } from 'react';
import { fetchCourse, type Course } from '../api/client';
import { useT } from '../i18n';

export interface CourseViewProps {
  onOpenLesson: (lessonId: string) => void;
  onExit: () => void;
}

export function CourseView({ onOpenLesson, onExit }: CourseViewProps) {
  const t = useT();
  const [course, setCourse] = useState<Course | null | 'loading'>('loading');

  useEffect(() => {
    let active = true;
    const load = async () => {
      const result = await fetchCourse();
      if (active) {
        setCourse(result);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="lesson">
      <header className="lesson-bar">
        <button type="button" className="quiet" onClick={onExit}>
          {t('back')}
        </button>
      </header>

      {course === 'loading' && <p className="lesson-note">{t('loading')}</p>}
      {course === null && <p className="lesson-note">{t('unreachable')}</p>}
      {course !== null && course !== 'loading' && course.units.length === 0 && (
        <p className="lesson-note">{t('noCourse')}</p>
      )}
      {course !== null && course !== 'loading' && (
        <div className="course">
          {course.units.map((unit) => (
            <section key={unit.id} className="unit">
              <h2 className="unit-title">{unit.title}</h2>
              <div className="unit-lessons">
                {unit.lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    type="button"
                    className="lesson-card"
                    onClick={() => {
                      onOpenLesson(lesson.id);
                    }}
                  >
                    <span className="lesson-card-title">{lesson.title}</span>
                    <span className="lesson-card-count">
                      {t('lessonWords', { count: lesson.itemCount })}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
