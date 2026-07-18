import { useState } from 'react';
import { instance } from '../instance';
import { useT } from '../i18n';

const STORAGE_KEY = `${instance.id}.growingCourse`;

export interface GrowingCourseBannerProps {
  /** Opens the contribution view — the banner's one call to action. */
  onContribute: () => void;
}

/**
 * A dismissible home banner (ADR 0045) inviting contributions as the
 * course grows. The copy is instance-neutral — the engine never names a
 * language — so it ships for every product. Dismissal is remembered.
 */
export function GrowingCourseBanner({
  onContribute,
}: GrowingCourseBannerProps) {
  const t = useT();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(STORAGE_KEY) !== null,
  );

  if (dismissed) {
    return null;
  }

  return (
    <aside className="banner growing-course">
      <p className="banner-text">{t('growingCourseBanner')}</p>
      <button type="button" className="footer-link" onClick={onContribute}>
        {t('contribute')}
      </button>
      <button
        type="button"
        className="quiet banner-dismiss"
        aria-label={t('dismiss')}
        onClick={() => {
          localStorage.setItem(STORAGE_KEY, '1');
          setDismissed(true);
        }}
      >
        ×
      </button>
    </aside>
  );
}
