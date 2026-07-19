import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '../i18n';
import { SettingsView, type SettingsViewProps } from './SettingsView';

function renderSettings(overrides: Partial<SettingsViewProps> = {}) {
  const props: SettingsViewProps = {
    onExit: vi.fn(),
    themeChoice: 'system',
    onThemeChoice: vi.fn(),
    uiLanguage: 'en',
    uiLanguages: ['en', 'isv'],
    onUiLanguage: vi.fn(),
    learnLang: 'en',
    onLearnLang: vi.fn(),
    hasScriptChoice: true,
    script: 'latin',
    scripts: [
      { id: 'latin', label: 'Latin' },
      { id: 'cyrillic', label: 'Cyrillic' },
    ],
    onScript: vi.fn(),
    ...overrides,
  };
  render(
    <LanguageProvider language="en">
      <SettingsView {...props} />
    </LanguageProvider>,
  );
  return props;
}

describe('SettingsView', () => {
  it('reports the chosen theme, languages, and script', async () => {
    const props = renderSettings();
    const user = userEvent.setup();

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Theme' }),
      'dark',
    );
    expect(props.onThemeChoice).toHaveBeenCalledWith('dark');

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Interface language' }),
      'isv',
    );
    expect(props.onUiLanguage).toHaveBeenCalledWith('isv');

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Translation language' }),
      'pl',
    );
    expect(props.onLearnLang).toHaveBeenCalledWith('pl');

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Display script' }),
      'cyrillic',
    );
    expect(props.onScript).toHaveBeenCalledWith('cyrillic');
  });

  it('hides the display-script choice when the pack has one script', () => {
    renderSettings({ hasScriptChoice: false });
    expect(
      screen.queryByRole('combobox', { name: 'Display script' }),
    ).toBeNull();
  });

  it('leaves settings when back is pressed', async () => {
    const props = renderSettings();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '← Back' }));
    expect(props.onExit).toHaveBeenCalledTimes(1);
  });
});
