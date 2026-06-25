import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './ui/styles.css';

if (import.meta.env.DEV) {
  console.log('[MMOWS] app mounted');
  window.addEventListener('error', (event) => console.error('[MMOWS] window error', event.error ?? event.message));
  window.addEventListener('unhandledrejection', (event) => console.error('[MMOWS] unhandled rejection', event.reason));
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
