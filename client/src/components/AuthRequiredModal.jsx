import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { X, Lock, ShoppingBag, ArrowRight, UserPlus, ShieldCheck } from 'lucide-react';

export default function AuthRequiredModal() {
  const { authModalOpen, closeAuthModal } = useAuthStore();
  const navigate = useNavigate();

  if (!authModalOpen) return null;

  const handleSignIn = () => {
    closeAuthModal();
    navigate('/login');
  };

  const handleSignUp = () => {
    closeAuthModal();
    navigate('/register');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-neutral-200/80 dark:border-slate-800 text-center space-y-4 animate-scale-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-2 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon & Badge */}
        <div className="flex justify-center pt-2">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-brand-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-brand-500/30">
            <ShoppingBag className="h-7 w-7" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-1.5">
          <h3
            id="auth-modal-title"
            className="text-lg sm:text-xl font-black text-neutral-900 dark:text-slate-100 font-heading"
          >
            Sign In to Order
          </h3>
          <p className="text-xs text-neutral-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
            Please sign in or create an account to add items to your cart and place your order.
          </p>
        </div>

        {/* Guarantees */}
        <div className="bg-neutral-50 dark:bg-slate-800/60 rounded-2xl p-2.5 flex items-center justify-center gap-3 text-[11px] text-neutral-600 dark:text-slate-300 font-medium">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            20-Min Delivery
          </span>
          <span className="text-neutral-300 dark:text-slate-600">&bull;</span>
          <span>Live GPS Tracking</span>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleSignIn}
            className="w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 shadow-md shadow-brand-500/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
          >
            <span>Sign In to Continue</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleSignUp}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-neutral-700 dark:text-slate-300 bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <UserPlus className="h-4 w-4 text-brand-500" />
            <span>Create New Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
