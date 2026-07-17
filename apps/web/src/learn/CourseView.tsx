import { useEffect, useState } from 'react';
import { fetchCourse, type Course } from '../api/client';

export interface CourseViewProps {
  onOpenLesson: (lessonId: string) => void;
  onExit: () => void;
}

export function CourseView({ onOpenLesson, onExit }: CourseViewProps) {
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
          ← Back
        </button>
      </header>

      {course === 'loading' && <p className="lesson-note">Loading…</p>}
      {course === null && (
        <p className="lesson-note">
          The server is unreachable — try again in a moment.
        </p>
      )}
      {course !== null && course !== 'loading' && course.units.length === 0 && (
        <p className="lesson-note">No course yet — the seed is on its way.</p>
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
                      {lesson.itemCount} words
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
