import { useEffect } from 'react';
import { checkRemoteVersion, registerPwa, UPDATE_EVENT, type AppUpdateDetail } from '../../engine/pwa';

export const UpdateBanner = () => {
  useEffect(() => {
    let mounted = true;
    registerPwa().then(() => {
      if (!mounted) return;
      void checkRemoteVersion();
    });
    const onUpdate = (event: Event) => {
      const detail = (event as CustomEvent<AppUpdateDetail>).detail;
      window.dispatchEvent(new CustomEvent('mmows:update-settings', { detail }));
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
  return null;
};
