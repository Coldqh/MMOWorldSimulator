import React from 'react';
import ReactDOM from 'react-dom/client';
import './ui/styles.css';
import { runRuntimeResetIfNeeded } from './engine/runtimeReset';

if (import.meta.env.DEV) {
  console.log('[MMOWS] app boot');
  window.addEventListener('error', (event) => console.error('[MMOWS] window error', event.error ?? event.message));
  window.addEventListener('unhandledrejection', (event) => console.error('[MMOWS] unhandled rejection', event.reason));
}

const boot = async () => {
  await runRuntimeResetIfNeeded();

  const { App } = await import('./app/App');

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );

  if (import.meta.env.DEV) console.log('[MMOWS] app mounted');
};

void boot();
