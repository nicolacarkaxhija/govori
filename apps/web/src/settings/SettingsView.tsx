import { useT } from '../i18n';
import type { ThemeChoice } from '../hooks/useTheme';
import { LEARN_LANGUAGES } from '../learn/useLearnLanguage';

export interface ScriptOption {
  id: string;
  label: string;
}

export interface SettingsViewProps {
  onExit: () => void;
  themeChoice: ThemeChoice;
  onThemeChoice: (choice: ThemeChoice) => void;
  uiLanguage: string;
  uiLanguages: readonly string[];
  onUiLanguage: (language: string) => void;
  learnLang: string;
  onLearnLang: (code: string) => void;
  hasScriptChoice: boolean;
  script: string;
  scripts: readonly ScriptOption[];
  onScript: (id: string) => void;
}

/**
 * The settings screen (ADR 0045): the home for the preferences that used to
 * crowd the top bar and footer — colour theme, interface language,
 * translation language, and, only where the active pack offers more than one
 * script, the display script. Reached from the home footer.
 */
export function SettingsView({
  onExit,
  themeChoice,
  onThemeChoice,
  uiLanguage,
  uiLanguages,
  onUiLanguage,
  learnLang,
  onLearnLang,
  hasScriptChoice,
  script,
  scripts,
  onScript,
}: SettingsViewProps) {
  const t = useT();
  return (
    <section className="settings">
      <h2 className="settings-title">{t('settings')}</h2>

      <label className="field">
        {t('theme')}
        <select
          aria-label={t('theme')}
          value={themeChoice}
          onChange={(event) => {
            onThemeChoice(event.target.value as ThemeChoice);
          }}
        >
          <option value="system">{t('themeSystem')}</option>
          <option value="light">{t('themeLight')}</option>
          <option value="dark">{t('themeDark')}</option>
        </select>
      </label>

      <label className="field">
        {t('interfaceLanguage')}
        <select
          aria-label={t('interfaceLanguage')}
          value={uiLanguage}
          onChange={(event) => {
            onUiLanguage(event.target.value);
          }}
        >
          {uiLanguages.map((code) => (
            <option key={code} value={code}>
              {code.toUpperCase()}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        {t('translationLanguage')}
        <select
          aria-label={t('translationLanguage')}
          value={learnLang}
          onChange={(event) => {
            onLearnLang(event.target.value);
          }}
        >
          {LEARN_LANGUAGES.map((entry) => (
            <option key={entry.code} value={entry.code}>
              {entry.name}
            </option>
          ))}
        </select>
      </label>

      {hasScriptChoice && (
        <label className="field">
          {t('displayScript')}
          <select
            aria-label={t('displayScript')}
            value={script}
            onChange={(event) => {
              onScript(event.target.value);
            }}
          >
            {scripts.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <button type="button" className="quiet" onClick={onExit}>
        {t('back')}
      </button>
    </section>
  );
}
