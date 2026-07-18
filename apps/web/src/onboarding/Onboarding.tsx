import { useState } from 'react';
import { useT } from '../i18n';
import { LEARN_LANGUAGES } from '../learn/useLearnLanguage';

export interface OnboardingProps {
  learnLang: string;
  setLearnLang: (code: string) => void;
  onDone: () => void;
}

/**
 * Two-step first-run onboarding (ADR 0045): pick the translation language,
 * then a reassurance that no account is needed (ADR 0022). Shown once, on
 * first visit; the choice reuses the app-wide learn-language preference.
 */
export function Onboarding({
  learnLang,
  setLearnLang,
  onDone,
}: OnboardingProps) {
  const t = useT();
  const [step, setStep] = useState<1 | 2>(1);

  return (
    <main className="onboarding">
      <div className="stitch" aria-hidden="true" />
      <h1 className="onboarding-title">{t('onboardTitle')}</h1>
      {step === 1 ? (
        <>
          <label className="field">
            {t('onboardLanguage')}
            <select
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
          </label>
          <button
            type="button"
            className="primary"
            onClick={() => {
              setStep(2);
            }}
          >
            {t('continueButton')}
          </button>
        </>
      ) : (
        <>
          <p className="onboarding-note">{t('onboardNote')}</p>
          <button type="button" className="primary" onClick={onDone}>
            {t('startLearning')}
          </button>
        </>
      )}
    </main>
  );
}
