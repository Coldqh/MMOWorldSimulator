import { useEffect, useState } from 'react';
import { APP_VERSION } from '../../engine/version';
import { applyLatestVersion, checkRemoteVersion, registerPwa, UPDATE_EVENT, type AppUpdateDetail } from '../../engine/pwa';

export const UpdateBanner = () => {
  const [update, setUpdate] = useState<AppUpdateDetail | null>(null);

  useEffect(() => {
    let mounted = true;
    registerPwa().then((registration) => {
      if (!mounted) return;
      void registration;
      void checkRemoteVersion();
    });

    const onUpdate = (event: Event) => {
      const detail = (event as CustomEvent<AppUpdateDetail>).detail;
      setUpdate(detail);
    };
    window.addEventListener(UPDATE_EVENT, onUpdate as EventListener);

    const timer = window.setInterval(() => {
      if (!document.hidden) void checkRemoteVersion();
    }, 120000);

    return () => {
      mounted = false;
      window.removeEventListener(UPDATE_EVENT, onUpdate as EventListener);
      window.clearInterval(timer);
    };
  }, []);

  if (update) {
    return (
      <div className="update-banner update-banner-ready">
        <div>
          <strong>Доступна новая версия</strong>
          <span>{update.version === 'new' ? 'Новая сборка уже скачана.' : `Текущая ${APP_VERSION} → новая ${update.version}.`}</span>
        </div>
        <button onClick={() => void applyLatestVersion()}>Обновить</button>
      </div>
    );
  }

  return null;
};
