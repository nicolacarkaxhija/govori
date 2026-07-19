import { useEffect, useState } from 'react';
import { instance } from './instance';
import { fetchMe, fetchMeta } from './api/client';
import { useTheme } from './hooks/useTheme';
import { useDirection } from './learn/useDirection';
import { useScript } from './learn/useScript';
import { useLearnLanguage } from './learn/useLearnLanguage';
import { LessonView } from './learn/LessonView';
import { CourseView } from './learn/CourseView';
import { PracticeView } from './practice/PracticeView';
import { SpeedReviewView } from './practice/SpeedReviewView';
import { JournalView } from './journal/JournalView';
import { GoalChips } from './goals/GoalChips';
import { WeeklyPlanView } from './plan/WeeklyPlanView';
import { Onboarding } from './onboarding/Onboarding';
import { GrowingCourseBanner } from './home/GrowingCourseBanner';
import { AccountView } from './account/AccountView';
import { SettingsView } from './settings/SettingsView';
import { StatsView } from './stats/StatsView';
import { ReviewView } from './review/ReviewView';
import { UsersView } from './review/UsersView';
import { ContributeView } from './review/ContributeView';
import { VoteView } from './review/VoteView';
import { LanguageProvider, useLanguage, useT } from './i18n';
import { streakDays } from './learn/progress';

export function App() {
  const {
    language,
    set: setUiLanguage,
    languages: uiLanguages,
  } = useLanguage();
  return (
    <LanguageProvider language={language}>
      <AppShell
        language={language}
        setUiLanguage={setUiLanguage}
        uiLanguages={uiLanguages}
      />
    </LanguageProvider>
  );
}

function AppShell({
  language,
  setUiLanguage,
  uiLanguages,
}: {
  language: string;
  setUiLanguage: (language: string) => void;
  uiLanguages: readonly string[];
}) {
  const t = useT();
  const { choice: themeChoice, setChoice: setThemeChoice } = useTheme();
  const {
    directionId,
    cycle: cycleDirection,
    hasChoice: hasDirectionChoice,
    currentLabel: directionLabel,
    nextLabel: nextDirectionLabel,
  } = useDirection();
  const {
    script,
    select: selectScript,
    scripts,
    hasChoice: hasScriptChoice,
  } = useScript(directionId);
  const { learnLang, setLearnLang } = useLearnLanguage(directionId);
  const [shortName, setShortName] = useState<string>(instance.brand.shortName);
  const [fullName, setFullName] = useState<string>(instance.brand.fullName);
  const [signedIn, setSignedIn] = useState(false);
  const [onboarded, setOnboarded] = useState(
    () => localStorage.getItem(`${instance.id}.onboarded`) !== null,
  );
  const [view, setView] = useState<
    | { name: 'home' }
    | { name: 'course' }
    | { name: 'lesson'; lessonId: string }
    | { name: 'stats' }
    | { name: 'account' }
    | { name: 'settings' }
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

  useEffect(() => {
    let active = true;
    void fetchMe().then((me) => {
      if (active) {
        setSignedIn(me !== null);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  if (!onboarded) {
    return (
      <Onboarding
        learnLang={learnLang}
        setLearnLang={setLearnLang}
        onDone={() => {
          localStorage.setItem(`${instance.id}.onboarded`, '1');
          setOnboarded(true);
        }}
      />
    );
  }

  return (
    // Keyed by the working direction (ADR 0046): a switch remounts the
    // content views so every pool read runs against the new direction.
    <div className="shell" key={directionId}>
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
          {hasDirectionChoice && (
            <button
              type="button"
              className="quiet"
              onClick={cycleDirection}
              aria-label={t('switchDirection')}
            >
              {`${directionLabel} → ${nextDirectionLabel ?? ''}`}
            </button>
          )}
        </div>
      </header>

      {view.name === 'home' ? (
        <main className="hero">
          <GrowingCourseBanner
            onContribute={() => {
              setView({ name: 'contribute' });
            }}
          />
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
      ) : view.name === 'settings' ? (
        <SettingsView
          onExit={() => {
            setView({ name: 'home' });
          }}
          themeChoice={themeChoice}
          onThemeChoice={setThemeChoice}
          uiLanguage={language}
          uiLanguages={uiLanguages}
          onUiLanguage={setUiLanguage}
          learnLang={learnLang}
          onLearnLang={setLearnLang}
          hasScriptChoice={hasScriptChoice}
          script={script}
          scripts={scripts}
          onScript={selectScript}
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
        <button
          type="button"
          className="footer-link"
          aria-label={t('settings')}
          onClick={() => {
            setView({ name: 'settings' });
          }}
        >
          {`⚙ ${t('settings')}`}
        </button>
        {signedIn && (
          <button
            type="button"
            className="footer-link"
            onClick={() => {
              setView({ name: 'contribute' });
            }}
          >
            {t('contribute')}
          </button>
        )}
        {signedIn && (
          <button
            type="button"
            className="footer-link"
            onClick={() => {
              setView({ name: 'vote' });
            }}
          >
            {t('communityReview')}
          </button>
        )}
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
