import { useEffect, useState } from 'react';
import { instance } from './instance';
import { fetchMeta } from './api/client';
import { useTheme } from './hooks/useTheme';
import { useScript } from './learn/useScript';
import { LEARN_LANGUAGES, useLearnLanguage } from './learn/useLearnLanguage';
import { LessonView } from './learn/LessonView';
import { CourseView } from './learn/CourseView';
import { PracticeView } from './practice/PracticeView';
import { SpeedReviewView } from './practice/SpeedReviewView';
import { JournalView } from './journal/JournalView';
import { GoalChips } from './goals/GoalChips';
import { WeeklyPlanView } from './plan/WeeklyPlanView';
import { AccountView } from './account/AccountView';
import { StatsView } from './stats/StatsView';
import { ReviewView } from './review/ReviewView';
import { UsersView } from './review/UsersView';
import { ContributeView } from './review/ContributeView';
import { VoteView } from './review/VoteView';
import { LanguageProvider, useLanguage, useT } from './i18n';
import { streakDays } from './learn/progress';

export function App() {
  const { language, toggle: toggleLanguage, next } = useLanguage();
  return (
    <LanguageProvider language={language}>
      <AppShell onToggleLanguage={toggleLanguage} nextLanguage={next} />
    </LanguageProvider>
  );
}

function AppShell({
  onToggleLanguage,
  nextLanguage,
}: {
  onToggleLanguage: () => void;
  nextLanguage: string;
}) {
  const t = useT();
  const { theme, toggle } = useTheme();
  const {
    script,
    toggle: toggleScript,
    hasChoice: hasScriptChoice,
    currentLabel,
    nextLabel,
  } = useScript();
  const { learnLang, setLearnLang } = useLearnLanguage();
  const [shortName, setShortName] = useState<string>(instance.brand.shortName);
  const [fullName, setFullName] = useState<string>(instance.brand.fullName);
  const [view, setView] = useState<
    | { name: 'home' }
    | { name: 'course' }
    | { name: 'lesson'; lessonId: string }
    | { name: 'stats' }
    | { name: 'account' }
    | { name: 'review' }
    | { name: 'users' }
    | { name: 'contribute' }
    | { name: 'weak' }
    | { name: 'common' }
    | { name: 'speed' }
    | { name: 'journal' }
    | { name: 'plan' }
    | { name: 'vote' }
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
            {nextLanguage.toUpperCase()}
          </button>
          {hasScriptChoice && (
            <button
              type="button"
              className="quiet"
              onClick={toggleScript}
              aria-label={t('switchScript')}
            >
              {`${currentLabel ?? ''} → ${nextLabel ?? ''}`}
            </button>
          )}
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
          {streakDays() > 0 && (
            <p className="hero-streak">
              {t('streak', { count: streakDays() })}
            </p>
          )}
          <button
            type="button"
            className="primary"
            onClick={() => {
              setView({ name: 'course' });
            }}
          >
            {t('startLearning')}
          </button>
          <GoalChips />
          <nav className="practice" aria-label={t('practiceTitle')}>
            <p className="practice-title">{t('practiceTitle')}</p>
            <div className="practice-links">
              <button
                type="button"
                className="quiet"
                onClick={() => {
                  setView({ name: 'speed' });
                }}
              >
                {t('speedReview')}
              </button>
              <button
                type="button"
                className="quiet"
                onClick={() => {
                  setView({ name: 'weak' });
                }}
              >
                {t('weakItems')}
              </button>
              <button
                type="button"
                className="quiet"
                onClick={() => {
                  setView({ name: 'common' });
                }}
              >
                {t('commonWords')}
              </button>
              <button
                type="button"
                className="quiet"
                onClick={() => {
                  setView({ name: 'journal' });
                }}
              >
                {t('journalTitle')}
              </button>
              <button
                type="button"
                className="quiet"
                onClick={() => {
                  setView({ name: 'plan' });
                }}
              >
                {t('weeklyPlanTitle')}
              </button>
            </div>
          </nav>
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
      ) : view.name === 'contribute' ? (
        <ContributeView
          onExit={() => {
            setView({ name: 'home' });
          }}
          onSignIn={() => {
            setView({ name: 'account' });
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
      ) : view.name === 'vote' ? (
        <VoteView
          script={script}
          onExit={() => {
            setView({ name: 'home' });
          }}
          onSignIn={() => {
            setView({ name: 'account' });
          }}
        />
      ) : view.name === 'speed' ? (
        <SpeedReviewView
          script={script}
          learnLang={learnLang}
          onExit={() => {
            setView({ name: 'home' });
          }}
        />
      ) : view.name === 'journal' ? (
        <JournalView
          script={script}
          learnLang={learnLang}
          onExit={() => {
            setView({ name: 'home' });
          }}
        />
      ) : view.name === 'plan' ? (
        <WeeklyPlanView
          onExit={() => {
            setView({ name: 'home' });
          }}
        />
      ) : view.name === 'weak' || view.name === 'common' ? (
        <PracticeView
          source={view.name}
          script={script}
          learnLang={learnLang}
          onExit={() => {
            setView({ name: 'home' });
          }}
        />
      ) : view.name === 'lesson' ? (
        <LessonView
          lessonId={view.lessonId}
          script={script}
          learnLang={learnLang}
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
        <select
          className="footer-select"
          aria-label={t('translationLanguage')}
          value={learnLang}
          onChange={(event) => {
            setLearnLang(event.target.value);
          }}
        >
          {LEARN_LANGUAGES.map((entry) => (
            <option key={entry.code} value={entry.code}>
              {entry.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="footer-link"
          onClick={() => {
            setView({ name: 'contribute' });
          }}
        >
          {t('contribute')}
        </button>
        <button
          type="button"
          className="footer-link"
          onClick={() => {
            setView({ name: 'vote' });
          }}
        >
          {t('communityReview')}
        </button>
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
