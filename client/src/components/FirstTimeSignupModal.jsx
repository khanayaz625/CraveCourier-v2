import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { X, Sparkles, ShoppingBag, ArrowRight, ShieldCheck } from 'lucide-react';

export default function FirstTimeSignupModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Only show if user is NOT authenticated and hasn't dismissed it in this browser
    const hasSeenModal = localStorage.getItem('crave_welcome_signup_seen');
    if (!isAuthenticated && !hasSeenModal) {
      // Small 1.2s delay for pleasant first-load experience
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  if (!isOpen || isAuthenticated) {
    return null;
  }

  const handleClose = () => {
    localStorage.setItem('crave_welcome_signup_seen', 'true');
    setIsOpen(false);
  };

  const handleGoToSignup = () => {
    handleClose();
    navigate('/register');
  };

  const handleGoToLogin = () => {
    handleClose();
    navigate('/login');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-neutral-200/80 dark:border-slate-800 text-center space-y-5 animate-scale-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-modal-title"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close welcome modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Brand Logo & Rider Badge */}
        <div className="mx-auto flex items-center justify-center">
          <div className="relative">
            <img
              src="/crave-courier-pin.png"
              alt="CraveCourier"
              className="h-20 w-auto object-contain mx-auto animate-bounce-subtle"
            />
            <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-emerald-500 text-white shadow-xs">
              <Sparkles className="h-3.5 w-3.5 fill-white" />
            </span>
          </div>
        </div>

        {/* Header Text */}
        <div className="space-y-1.5">
          <h2 id="welcome-modal-title" className="text-xl sm:text-2xl font-black font-heading text-neutral-900 dark:text-slate-100">
            Welcome to <span className="text-[#FF541E]">Crave</span>courier!
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
            Sign up to start ordering fresh Kirana groceries & delicious food delivered in <strong>20 minutes</strong>!
          </p>
        </div>

        {/* First Order Discount Perk Badge */}
        <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 rounded-2xl border border-amber-200 dark:border-amber-900/60 flex items-center justify-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200 shadow-xs">
          <span className="text-base">🎁</span>
          <span>Use code <strong>WELCOME50</strong> for ₹50 OFF on your first order!</span>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          {/* 1. Main Sign Up Button */}
          <button
            type="button"
            onClick={handleGoToSignup}
            className="w-full py-3.5 px-5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 shadow-md shadow-brand-500/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Sign Up to Make an Order</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          {/* Already have an account link */}
          <div className="pt-2 flex items-center justify-center space-x-3 text-xs">
            <span className="text-neutral-500 dark:text-slate-400">Already a customer?</span>
            <button
              type="button"
              onClick={handleGoToLogin}
              className="font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 underline"
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Continue browsing secondary link */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleClose}
            className="text-[11px] font-semibold text-neutral-400 hover:text-neutral-600 dark:hover:text-slate-300 transition-colors"
          >
            Explore Catalogue First &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
