import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { User, Bike, Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight, Shield } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

export default function LoginPage() {
  const [role, setRole] = useState('customer'); // 'customer' | 'delivery'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const { login, isLoading, error: storeError, clearError } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || (role === 'delivery' ? '/partner' : '/');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    try {
      const user = await login(email, password, role);
      // Role-based redirect
      if (user.role === 'delivery') {
        navigate('/partner', { replace: true });
      } else if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setLocalError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  const fillDemo = (demoRole) => {
    setRole(demoRole);
    if (demoRole === 'customer') {
      setEmail('customer@crave.com');
      setPassword('Customer@12345');
    } else {
      setEmail('delivery@crave.com');
      setPassword('Delivery@12345');
    }
  };

  return (
    <div className="min-h-[calc(100vh-60px)] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 bg-neutral-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <BrandLogo variant="full" size="xl" />
          </div>
          <h2 className="text-xl font-black text-neutral-900 tracking-tight sm:text-2xl">
            Welcome back to Cravecourier
          </h2>
          <p className="mt-1.5 text-xs text-neutral-500">
            Sign in to access your orders, deliveries, and live tracking
          </p>
        </div>

        {/* Role Tabs: Customer vs Delivery Partner */}
        <div className="mt-6 bg-neutral-200/70 p-1 rounded-xl flex items-center">
          <button
            type="button"
            onClick={() => {
              setRole('customer');
              clearError();
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
              role === 'customer'
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <User className="h-4 w-4" />
            Customer
          </button>
          <button
            type="button"
            onClick={() => {
              setRole('delivery');
              clearError();
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
              role === 'delivery'
                ? 'bg-white text-amber-600 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Bike className="h-4 w-4" />
            Delivery Partner
          </button>
        </div>

        {/* Main Login Card */}
        <div className="mt-4 bg-white py-8 px-5 shadow-xl shadow-neutral-200/50 rounded-2xl border border-neutral-200/70 sm:px-8">
          {(localError || storeError) && (
            <div className="mb-5 rounded-xl bg-rose-50 border border-rose-200 p-3.5 flex items-start space-x-2.5">
              <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 font-medium leading-relaxed">
                {localError || storeError}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Email Address
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-neutral-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="block w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm border border-neutral-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-neutral-50/50"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-neutral-700">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-neutral-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm border border-neutral-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-neutral-50/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md transition-all disabled:opacity-50 ${
                role === 'delivery'
                  ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                  : 'bg-brand-500 hover:bg-brand-600 shadow-brand-500/20'
              }`}
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In as {role === 'delivery' ? 'Partner' : 'Customer'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Pre-fill for Testing */}
          <div className="mt-6 pt-5 border-t border-neutral-200/80">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider text-center mb-2.5">
              Quick Demo Fill
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('customer')}
                className="text-[11px] py-1.5 px-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg font-medium transition-colors text-center"
              >
                Customer Demo
              </button>
              <button
                type="button"
                onClick={() => fillDemo('delivery')}
                className="text-[11px] py-1.5 px-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg font-medium transition-colors text-center"
              >
                Partner Demo
              </button>
            </div>
          </div>

          {/* Links */}
          <div className="mt-5 text-center text-xs text-neutral-500">
            Don't have an account?{' '}
            <Link
              to="/register"
              state={{ defaultRole: role }}
              className="font-bold text-brand-600 hover:text-brand-700"
            >
              Sign up here
            </Link>
          </div>
        </div>

        {/* Admin Link at the very bottom */}
        <div className="mt-6 text-center">
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 transition-colors"
          >
            <Shield className="h-3.5 w-3.5 text-neutral-400" />
            <span>Administrator Access Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

