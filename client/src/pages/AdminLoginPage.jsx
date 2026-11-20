import { useState, useEffect } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Shield, Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const { adminLogin, isLoading, error: storeError, clearError, isAuthenticated, user, isAuthInitialized } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Craved Admin | Management Portal';
    if (isAuthenticated && user?.role === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // While session is being verified on boot, avoid flashing the login form
  if (!isAuthInitialized) {
    return (
      <div className="min-h-screen min-h-[100dvh] w-full flex items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-9 w-9 border-3 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 font-heading tracking-wider uppercase">
            Verifying admin session...
          </p>
        </div>
      </div>
    );
  }

  // If already authenticated as admin, redirect
  if (isAuthenticated && user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    try {
      await adminLogin(email, password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setLocalError(err.message || 'Administrator authorization failed');
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] w-full relative flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-100 via-indigo-50/50 to-slate-200 dark:from-slate-900 dark:via-indigo-950/70 dark:to-slate-900 text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Decorative Ambient Radial Glow Orbs */}
      <div className="pointer-events-none absolute -top-28 -left-28 w-96 h-96 rounded-full bg-gradient-to-tr from-purple-500/15 via-indigo-500/15 to-blue-500/10 blur-3xl opacity-80 animate-pulse"></div>
      <div className="pointer-events-none absolute -bottom-28 -right-28 w-96 h-96 rounded-full bg-gradient-to-bl from-indigo-500/15 via-purple-500/15 to-violet-500/10 blur-3xl opacity-80"></div>

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md z-10">
        {/* Admin Header with Shield & Badges */}
        <div className="text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-700 text-white shadow-xl shadow-purple-600/30 mb-3 ring-4 ring-purple-200/60 dark:ring-purple-950/80 animate-float">
            <Shield className="h-8 w-8" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white font-heading">
            Craved <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">Admin</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
            Official Management Portal &amp; Platform Operations Center
          </p>

          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200/80 dark:border-purple-800 text-[11px] font-bold text-purple-700 dark:text-purple-300 shadow-xs">
            <span>🔒</span>
            <span>High-Security Enterprise Access</span>
          </div>
        </div>

        {/* Elevated Executive Card */}
        <div className="mt-5 bg-white/95 dark:bg-slate-800/90 backdrop-blur-xl py-7 px-5 sm:px-8 shadow-2xl shadow-indigo-950/10 dark:shadow-black/40 rounded-3xl border border-slate-200/90 dark:border-slate-700 relative">
          {/* Subtle Top Accent Highlight Strip */}
          <div className="absolute top-0 inset-x-8 h-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 rounded-t-3xl"></div>

          {(localError || storeError) && (
            <div className="mb-5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 p-3.5 flex items-start space-x-2.5">
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 dark:text-rose-300 font-medium leading-relaxed">
                {localError || storeError}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                Admin Email
              </label>
              <div className="relative rounded-2xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@crave.com"
                  className="block w-full pl-10 pr-3.5 py-3 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                Admin Password
              </label>
              <div className="relative rounded-2xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-11 py-3 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-600/30 transition-all duration-200 disabled:opacity-50 active:scale-[0.99] mt-2"
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Authenticate Admin Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Return to Store Link */}
        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-300 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Customer &amp; Delivery Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
