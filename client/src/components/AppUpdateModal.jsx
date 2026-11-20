import { useState } from 'react';
import { Download, Sparkles, CheckCircle2, Shield, X, Smartphone, ArrowRight, Copy, Check } from 'lucide-react';
import BrandLogo from './BrandLogo';

export default function AppUpdateModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Primary APK download URL (served statically by client or local network / GitHub)
  const apkDownloadUrl = '/CraveCourier.apk';
  const networkApkUrl = 'http://192.168.29.170:8080/CraveCourier.apk';
  const githubApkUrl = 'https://github.com/khanayaz625/CraveCourier-v2/raw/main/CraveCourier.apk';

  const handleCopyLink = () => {
    const link = window.location.origin ? `${window.location.origin}/CraveCourier.apk` : githubApkUrl;
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    // Open/download the APK
    const link = document.createElement('a');
    link.href = apkDownloadUrl;
    link.setAttribute('download', 'CraveCourier.apk');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200/90 dark:border-slate-800 shadow-2xl overflow-hidden p-5 sm:p-6 space-y-4">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close update modal"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header with App Logo & Version Badge */}
        <div className="flex items-center space-x-3.5 pr-8">
          <div className="h-14 w-14 rounded-2xl bg-neutral-900 dark:bg-slate-800 p-2 shadow-md flex items-center justify-center flex-shrink-0">
            <img
              src="/app-icon-squircle.png"
              alt="CraveCourier"
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider mb-1">
              <Sparkles className="h-3 w-3 text-emerald-500" />
              <span>Update Ready &bull; v1.0.1</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-neutral-900 dark:text-slate-100 font-heading">
              CraveCourier Update
            </h2>
          </div>
        </div>

        {/* What's New in this update */}
        <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-slate-800/60 border border-neutral-200/60 dark:border-slate-700/60 space-y-2">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-slate-400">
            What's new in v1.0.1 (Build 2)
          </h3>
          <ul className="text-xs text-neutral-700 dark:text-slate-300 space-y-1.5">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-brand-500 flex-shrink-0 mt-0.5" />
              <span><strong>Cloud Database:</strong> Full real-time connection to live Render backend & live food menu.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-brand-500 flex-shrink-0 mt-0.5" />
              <span><strong>Official App Logo:</strong> Native CraveCourier launcher icon on home screen & app drawer.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-brand-500 flex-shrink-0 mt-0.5" />
              <span><strong>Mobile Notch & Overlap Fixes:</strong> Safe-area notch padding and zero overlap on food cards & checkout.</span>
            </li>
          </ul>
        </div>

        {/* How to Update Steps */}
        <div className="space-y-1.5 text-[11px] text-neutral-500 dark:text-slate-400 bg-brand-50/50 dark:bg-brand-950/30 p-3 rounded-2xl border border-brand-200/50 dark:border-brand-900/40">
          <p className="font-bold text-brand-700 dark:text-brand-300">How to update without losing data:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-neutral-600 dark:text-slate-300">
            <li>Tap <strong>Download & Update APK</strong> below.</li>
            <li>Tap the downloaded file in your notification bar.</li>
            <li>Press <strong>Update</strong> when Android asks (your session stays intact).</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleDownload}
            className="w-full py-3.5 px-5 rounded-2xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-brand-500 via-brand-600 to-amber-500 hover:from-brand-600 hover:to-amber-600 shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 transition-transform active:scale-98"
          >
            <Download className="h-4 w-4" />
            <span>Download &amp; Update APK (18 MB)</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-neutral-700 dark:text-slate-300 bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-600">Download Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Direct APK Download Link</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
