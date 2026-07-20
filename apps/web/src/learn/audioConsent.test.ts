import { beforeEach, describe, expect, it } from 'vitest';
import { CONSENT_VERSION, loadConsent, saveConsent } from './audioConsent';

const KEY = 'govori.audioConsent';

beforeEach(() => {
  localStorage.clear();
});

describe('audio consent memory', () => {
  it('returns null when nothing is stored', () => {
    expect(loadConsent()).toBeNull();
  });

  it('remembers a saved choice under the current version, app always on', () => {
    const saved = saveConsent({ dataset: true, training: false });
    expect(saved).toEqual({
      version: CONSENT_VERSION,
      app: true,
      dataset: true,
      training: false,
    });
    expect(loadConsent()).toEqual(saved);
  });

  it('re-asks when the stored choice predates the current charter version', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ version: '0', dataset: true, training: true }),
    );
    expect(loadConsent()).toBeNull();
  });

  it('re-asks when the stored value is malformed', () => {
    localStorage.setItem(KEY, 'not json');
    expect(loadConsent()).toBeNull();
    localStorage.setItem(KEY, JSON.stringify({ version: '1' }));
    expect(loadConsent()).toBeNull();
  });
});
