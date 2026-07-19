import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import '@fontsource-variable/literata';
import '@fontsource/source-sans-3';
import './styles/base.css';
import './styles/learn.css';
// The active instance owns the palette and its family treatments; it is
// imported last so its structural rules win over the engine defaults.
import '@instance/theme.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root is missing from the document');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
