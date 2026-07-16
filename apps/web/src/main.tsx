import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import '@fontsource-variable/literata';
import '@fontsource/source-sans-3';
import './styles/tokens.css';
import './styles/base.css';
import './styles/learn.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root is missing from the document');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
