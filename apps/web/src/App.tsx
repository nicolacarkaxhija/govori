import { useEffect, useState } from 'react';
import { brand } from './brand';
import { fetchMeta } from './api/client';
import { useTheme } from './hooks/useTheme';

export function App() {
  const { theme, toggle } = useTheme();
  const [shortName, setShortName] = useState<string>(brand.shortName);
  const [fullName, setFullName] = useState<string>(brand.fullName);

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
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-lg)',
        gap: 'var(--space-lg)',
      }}
    >
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-md)',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(2.5rem, 8vw, 4rem)',
            letterSpacing: '-0.02em',
            color: 'var(--color-primary)',
          }}
        >
          {shortName}
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--color-text-muted)' }}>
          Learn Interslavic
        </p>
        <button
          type="button"
          onClick={toggle}
          aria-label={`Switch to ${nextTheme} theme`}
          style={{
            marginTop: 'var(--space-md)',
            padding: '0.6rem 1.2rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text)',
          }}
        >
          {theme === 'dark' ? 'Light theme' : 'Dark theme'}
        </button>
      </main>
      <footer
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 'var(--space-md)',
          fontSize: '0.85rem',
          color: 'var(--color-text-muted)',
        }}
      >
        <p>Code: AGPL-3.0-only</p>
        <p>Content: CC BY-SA 4.0</p>
      </footer>
    </div>
  );
}
