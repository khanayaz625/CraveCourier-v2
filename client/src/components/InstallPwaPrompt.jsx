import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles } from 'lucide-react';

let deferredPromptGlobal = null;

export default function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if running as standalone PWA
    const checkIsStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isStandaloneNavigator = window.navigator?.standalone === true;
      return isStandaloneMedia || isStandaloneNavigator;
    };

    if (checkIsStandalone()) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e) => {
      // Prevent automatic browser banner
      e.preventDefault();
      deferredPromptGlobal = e;
      setDeferredPrompt(e);

      // Check if user dismissed recently
      const dismissed = sessionStorage.getItem('crave_pwa_dismissed');
      if (!dismissed) {
        setIsVisible(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      deferredPromptGlobal = null;
      console.log('[PWA] Crave application installed successfully!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || deferredPromptGlobal;
    if (!promptEvent) {
      alert('To install Crave: tap Share or Browser Menu (⋮) and select "Add to Home Screen".');
      return;
    }

    try {
      await promptEvent.prompt();
      const choiceResult = await promptEvent.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted Crave PWA installation prompt');
      } else {
        console.log('[PWA] User dismissed Crave PWA installation prompt');
      }
      setDeferredPrompt(null);
      deferredPromptGlobal = null;
      setIsVisible(false);
    } catch (err) {
      console.error('[PWA INSTALL ERROR]', err);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('crave_pwa_dismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible || isInstalled) return null;

  return (
    <aside
      aria-label="Install App Prompt"
      className="fixed z-50 bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm animate-pop"
    >
      <div className="bg-white dark:bg-slate-900 border border-neutral-200/90 dark:border-slate-800 rounded-3xl p-4 shadow-float backdrop-blur-md flex items-center justify-between gap-3">
        {/* App Icon */}
        <div className="flex items-center space-x-3 min-w-0">
          <img
            src="/app-icon-squircle.png"
            alt="Cravecourier App"
            className="h-11 w-11 rounded-2xl object-contain flex-shrink-0 shadow-md shadow-brand-500/20"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-black text-neutral-900 dark:text-slate-100 font-heading truncate">
                Install Crave App
              </h4>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-slate-400 truncate">
              Faster checkout & instant live tracking
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1.5 flex-shrink-0">
          <button
            onClick={handleInstallClick}
            className="touch-target px-3.5 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Install</span>
          </button>
          <button
            onClick={handleDismiss}
            className="touch-target p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 transition-colors"
            title="Dismiss prompt"
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

