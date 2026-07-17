import { useEffect, useState } from 'react';
import { brand } from './brand';
import { fetchMeta } from './api/client';
import { useTheme } from './hooks/useTheme';
import { useScript } from './learn/useScript';
import { LessonView } from './learn/LessonView';
import { CourseView } from './learn/CourseView';
import { AccountView } from './account/AccountView';
import { StatsView } from './stats/StatsView';
import { ReviewView } from './review/ReviewView';
import { UsersView } from './review/UsersView';
import { LanguageProvider, useLanguage, useT } from './i18n';

export function App() {
  const { language, toggle: toggleLanguage } = useLanguage();
  return (
    <LanguageProvider language={language}>
      <AppShell onToggleLanguage={toggleLanguage} language={language} />
    </LanguageProvider>
  );
}

function AppShell({
  onToggleLanguage,
  language,
}: {
  onToggleLanguage: () => void;
  language: 'en' | 'isv';
}) {
  const t = useT();
  const { theme, toggle } = useTheme();
  const { script, toggle: toggleScript } = useScript();
  const [shortName, setShortName] = useState<string>(brand.shortName);
  const [fullName, setFullName] = useState<string>(brand.fullName);
  const [view, setView] = useState<
    | { name: 'home' }
    | { name: 'course' }
    | { name: 'lesson'; lessonId: string }
    | { name: 'stats' }
    | { name: 'account' }
    | { name: 'review' }
    | { name: 'users' }
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
            onClick={() => {
              setView({ name: 'account' });
            }}
          >
            {t('account')}
          </button>
          <button
            type="button"
            className="quiet"
            onClick={onToggleLanguage}
            aria-label={t('languageSwitch')}
          >
            {language === 'en' ? 'MS' : 'EN'}
          </button>
          <button
            type="button"
            className="quiet"
            onClick={toggleScript}
            aria-label={t('switchScript')}
          >
            {script === 'latin' ? 'Žž → Жж' : 'Жж → Žž'}
          </button>
          <button
            type="button"
            className="quiet"
            onClick={toggle}
            aria-label={t('toggleTheme')}
          >
            {theme === 'dark' ? '☼' : '☾'}
          </button>
        </div>
      </header>

      {view.name === 'home' ? (
        <main className="hero">
          <div className="stitch" aria-hidden="true" />
          <h1 className="hero-name">{shortName}</h1>
          <p className="hero-tagline">{t('tagline')}</p>
          <button
            type="button"
            className="primary"
            onClick={() => {
              setView({ name: 'course' });
            }}
          >
            {t('startLearning')}
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
      ) : view.name === 'account' ? (
        <AccountView
          onExit={() => {
            setView({ name: 'home' });
          }}
          onReview={() => {
            setView({ name: 'review' });
          }}
          onUsers={() => {
            setView({ name: 'users' });
          }}
        />
      ) : view.name === 'users' ? (
        <UsersView
          onExit={() => {
            setView({ name: 'account' });
          }}
        />
      ) : view.name === 'review' ? (
        <ReviewView
          script={script}
          onExit={() => {
            setView({ name: 'account' });
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
        <p>{t('codeLicense')}</p>
        <p>{t('contentLicense')}</p>
        <button
          type="button"
          className="footer-link"
          onClick={() => {
            setView({ name: 'stats' });
          }}
        >
          {t('openNumbers')}
        </button>
      </footer>
    </div>
  );
}
