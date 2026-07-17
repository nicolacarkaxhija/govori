import { useEffect, useState } from 'react';
import { brand } from './brand';
import { fetchMeta } from './api/client';
import { useTheme } from './hooks/useTheme';
import { useScript } from './learn/useScript';
import { LessonView } from './learn/LessonView';
import { CourseView } from './learn/CourseView';
import { StatsView } from './stats/StatsView';

export function App() {
  const { theme, toggle } = useTheme();
  const { script, toggle: toggleScript } = useScript();
  const [shortName, setShortName] = useState<string>(brand.shortName);
  const [fullName, setFullName] = useState<string>(brand.fullName);
  const [view, setView] = useState<
    | { name: 'home' }
    | { name: 'course' }
    | { name: 'lesson'; lessonId: string }
    | { name: 'stats' }
  >({ name: 'home' });

  useEffect(() => {
    let active = true;
    const load = async () => {
      const meta = await fetchMeta();
      if (active && meta) {
        setShortName(meta.brand.shortName);
        setFullName(meta.brand.fullName);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.title = fullName;
  }, [fullName]);

  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <div className="shell">
      <header className="topbar">
        <span className="wordmark" aria-hidden={view.name === 'home'}>
          {view.name === 'home' ? '' : shortName}
        </span>
        <div className="topbar-controls">
          <button
            type="button"
            className="quiet"
            onClick={toggleScript}
            aria-label="Switch script"
          >
            {script === 'latin' ? 'Aa → Аа' : 'Аа → Aa'}
          </button>
          <button
            type="button"
            className="quiet"
            onClick={toggle}
            aria-label={`Switch to ${nextTheme} theme`}
          >
            {theme === 'dark' ? '☼' : '☾'}
          </button>
        </div>
      </header>

      {view.name === 'home' ? (
        <main className="hero">
          <div className="stitch" aria-hidden="true" />
          <h1 className="hero-name">{shortName}</h1>
          <p className="hero-tagline">Learn Interslavic</p>
          <button
            type="button"
            className="primary"
            onClick={() => {
              setView({ name: 'course' });
            }}
          >
            Start learning
          </button>
        </main>
      ) : view.name === 'course' ? (
        <CourseView
          onOpenLesson={(lessonId) => {
            setView({ name: 'lesson', lessonId });
          }}
          onExit={() => {
            setView({ name: 'home' });
          }}
        />
      ) : view.name === 'lesson' ? (
        <LessonView
          lessonId={view.lessonId}
          script={script}
          onExit={() => {
            setView({ name: 'course' });
          }}
        />
      ) : (
        <StatsView
          onExit={() => {
            setView({ name: 'home' });
          }}
        />
      )}

      <footer className="footer">
        <p>Code: AGPL-3.0-only</p>
        <p>Content: CC BY-SA 4.0</p>
        <button
          type="button"
          className="footer-link"
          onClick={() => {
            setView({ name: 'stats' });
          }}
        >
          Open numbers
        </button>
      </footer>
    </div>
  );
}
