import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import api from '../services/api';
import { isNativeApk, isNewerApkVersion } from '../config/appVersion';

const DISMISS_KEY = 'crave_apk_update_dismissed';

export default function ApkUpdatePrompt() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isNativeApk()) return;

    let cancelled = false;

    const checkForApkUpdate = async () => {
      try {
        const res = await api.get('/health/app-version');
        const data = res?.data?.data;
        if (cancelled || !data || !isNewerApkVersion(data)) return;

        const dismissedVersion = sessionStorage.getItem(DISMISS_KEY);
        if (!data.forceUpdate && dismissedVersion === data.latestVersion) return;

        setUpdateInfo(data);
        setIsVisible(true);
      } catch {
        // Silent fallback: never show update UI if offline or check fails
      }
    };

    checkForApkUpdate();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isVisible || !updateInfo) return null;

  const handleUpdateClick = () => {
    if (!updateInfo.downloadUrl) return;
    window.open(updateInfo.downloadUrl, '_system');
  };

  const handleDismiss = () => {
    if (updateInfo.forceUpdate) return;
    sessionStorage.setItem(DISMISS_KEY, updateInfo.latestVersion || 'dismissed');
    setIsVisible(false);
  };

  return (
    <aside
      aria-label="App Update Available"
      className="fixed z-50 bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm animate-pop"
    >
      <div className="bg-white dark:bg-slate-900 border border-neutral-200/90 dark:border-slate-800 rounded-3xl p-4 shadow-float backdrop-blur-md flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          <img
            src="/app-icon-squircle.png"
            alt="CraveCourier Update"
            className="h-11 w-11 rounded-2xl object-contain flex-shrink-0 shadow-md shadow-brand-500/20"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-black text-neutral-900 dark:text-slate-100 font-heading truncate">
                Update Available
              </h4>
              {updateInfo.latestVersion && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300">
                  v{updateInfo.latestVersion}
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-slate-400 truncate">
              {updateInfo.releaseNotes || 'A new version of CraveCourier is ready'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 flex-shrink-0">
          <button
            onClick={handleUpdateClick}
            className="touch-target px-3.5 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Update</span>
          </button>
          {!updateInfo.forceUpdate && (
            <button
              onClick={handleDismiss}
              className="touch-target p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 transition-colors"
              title="Dismiss update"
              aria-label="Dismiss update prompt"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
