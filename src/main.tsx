import React from 'react';
import ReactDOM from 'react-dom/client';
import './ui/styles.css';
import { prepareRuntimeResetBeforeAppImport, runDeferredRuntimeCleanup } from './engine/runtimeReset';

if (import.meta.env.DEV) {
  console.log('[MMOWS] app boot');
  window.addEventListener('error', (event) => console.error('[MMOWS] window error', event.error ?? event.message));
  window.addEventListener('unhandledrejection', (event) => console.error('[MMOWS] unhandled rejection', event.reason));
}

const renderBootError = (error: unknown) => {
  const root = document.getElementById('root');
  const message = error instanceof Error ? error.message : String(error);
  if (root) {
    root.innerHTML = `
      <div style="padding:24px;font-family:system-ui;background:#111827;color:#e5e7eb;min-height:100vh">
        <h1 style="margin:0 0 12px">Ошибка запуска</h1>
        <p style="color:#fca5a5">React не смог смонтироваться. Boot-screen больше не будет висеть молча.</p>
        <pre style="white-space:pre-wrap;background:#1f2937;padding:12px;border-radius:8px">${message}</pre>
      </div>
    `;
  }
};

const boot = async () => {
  try {
    prepareRuntimeResetBeforeAppImport();
    const { App } = await import('./app/App');
    ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
    if (import.meta.env.DEV) console.log('[MMOWS] app mounted');
    window.setTimeout(() => { void runDeferredRuntimeCleanup(); }, 0);
  } catch (error) {
    console.error('[MMOWS] boot failed', error);
    renderBootError(error);
  }
};

void boot();
