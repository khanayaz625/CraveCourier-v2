import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Shield, Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const { adminLogin, isLoading, error: storeError, clearError } = useAuthStore();
  const navigate = useNavigate();

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

  const fillAdminDemo = () => {
    setEmail('admin@crave.com');
    setPassword('Admin@12345');
  };

  return (
    <div className="min-h-[calc(100vh-60px)] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-neutral-900 text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-600/30 text-purple-400 ring-1 ring-purple-500/50 shadow-xl shadow-purple-900/30">
            <Shield className="h-7 w-7 text-purple-400" />
          </span>
          <h2 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl text-white">
            Admin Control Center
          </h2>
          <p className="mt-1 text-xs text-neutral-400">
            Restricted access portal for Crave platform administrators
          </p>
        </div>

        <div className="mt-6 bg-neutral-800/90 py-8 px-5 shadow-2xl rounded-2xl border border-neutral-700/80 sm:px-8 backdrop-blur-sm">
          {(localError || storeError) && (
            <div className="mb-5 rounded-xl bg-rose-950/60 border border-rose-800/80 p-3.5 flex items-start space-x-2.5">
              <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-rose-200 font-medium leading-relaxed">
                {localError || storeError}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Admin Email
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-neutral-500" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@crave.com"
                  className="block w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm border border-neutral-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-neutral-900/70 text-white placeholder-neutral-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Admin Password
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-neutral-500" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm border border-neutral-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-neutral-900/70 text-white placeholder-neutral-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-white"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-900/40 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Authenticate Admin</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Pre-fill */}
          <div className="mt-6 pt-5 border-t border-neutral-700/60 text-center">
            <button
              type="button"
              onClick={fillAdminDemo}
              className="text-xs py-1.5 px-3 bg-neutral-700/70 hover:bg-neutral-700 text-neutral-300 rounded-lg font-medium transition-colors"
            >
              Fill Super Admin Demo
            </button>
          </div>
        </div>

        {/* Return to store link */}
        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Customer & Partner Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

