import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { User, Bike, Lock, Mail, Phone, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

export default function RegisterPage() {
  const location = useLocation();
  const defaultRole = location.state?.defaultRole || 'customer';

  const [role, setRole] = useState(defaultRole);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [localError, setLocalError] = useState('');

  const { register, isLoading, error: storeError, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    try {
      const regResult = await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role,
      });

      // Redirect to Email OTP Verification
      navigate('/verify-email', {
        state: {
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone,
          role: regResult?.user?.role || role,
          emailSent: regResult?.emailSent,
          emailError: regResult?.emailError,
        },
      });
    } catch (err) {
      setLocalError(err.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-[calc(100vh-60px)] relative overflow-hidden bg-gradient-to-b from-[#FFF5F0] via-white to-[#FFF0EA] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col justify-center py-6 px-4 sm:px-6 lg:px-8">
      {/* Decorative Warm Glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-gradient-to-tr from-rose-500/20 via-orange-500/20 to-amber-400/10 blur-3xl opacity-80"></div>
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-bl from-orange-500/20 via-rose-500/15 to-amber-300/10 blur-3xl opacity-80"></div>

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <BrandLogo variant="full" size="xl" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-rose-500/10 via-orange-500/10 to-amber-500/10 border border-orange-200/60 dark:border-orange-500/20 mb-3 shadow-xs">
            <span className="text-[11px] font-bold bg-gradient-to-r from-rose-600 via-orange-600 to-amber-600 bg-clip-text text-transparent uppercase tracking-wider">
              ✨ Join Crave Courier Today
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
            Create an Account
          </h1>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Enjoy instant delivery, order tracking, and exclusive discounts
          </p>
        </div>

        {/* Role Selection Tabs */}
        <div className="mt-5 p-1 bg-gradient-to-r from-rose-100/70 via-orange-100/70 to-amber-100/70 dark:from-slate-800 dark:to-slate-800/80 rounded-2xl flex items-center border border-orange-200/50 dark:border-slate-700 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setRole('customer');
              clearError();
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
              role === 'customer'
                ? 'bg-gradient-to-r from-[#FF541E] to-[#FF7A00] text-white shadow-md shadow-orange-500/25 scale-[1.01]'
                : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <User className="h-4 w-4" />
            <span>Customer</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setRole('delivery');
              clearError();
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
              role === 'delivery'
                ? 'bg-gradient-to-r from-[#FF541E] to-[#FF7A00] text-white shadow-md shadow-orange-500/25 scale-[1.01]'
                : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Bike className="h-4 w-4" />
            <span>Delivery Partner</span>
          </button>
        </div>

        {/* Card Form */}
        <div className="mt-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md py-6 px-5 sm:py-7 sm:px-8 shadow-2xl shadow-orange-950/10 dark:shadow-black/50 rounded-3xl border border-orange-100 dark:border-slate-800 relative">
          <div className="absolute top-0 inset-x-8 h-1 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 rounded-t-3xl"></div>

          {(localError || storeError) && (
            <div className="mb-4 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 p-3.5 flex items-start space-x-2.5">
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 dark:text-rose-300 font-medium leading-relaxed">
                {localError || storeError}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-200 mb-1">
                Full Name
              </label>
              <div className="relative rounded-2xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Jane Doe"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm border border-neutral-200 dark:border-slate-700 rounded-2xl bg-neutral-50/70 dark:bg-slate-800/60 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#FF541E] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-200 mb-1">
                Email Address
              </label>
              <div className="relative rounded-2xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm border border-neutral-200 dark:border-slate-700 rounded-2xl bg-neutral-50/70 dark:bg-slate-800/60 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#FF541E] focus:border-transparent transition-all"
                />
              </div>
              <p className="mt-1 text-[11px] text-orange-600 dark:text-orange-400 font-medium">
                ✉️ A 6-digit verification OTP will be sent to this email address
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-200 mb-1">
                Mobile Number
              </label>
              <div className="relative rounded-2xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="9876543210"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm border border-neutral-200 dark:border-slate-700 rounded-2xl bg-neutral-50/70 dark:bg-slate-800/60 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#FF541E] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-200 mb-1">
                  Password
                </label>
                <div className="relative rounded-2xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 6 chars"
                    className="block w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm border border-neutral-200 dark:border-slate-700 rounded-2xl bg-neutral-50/70 dark:bg-slate-800/60 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#FF541E] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-200 mb-1">
                  Confirm Password
                </label>
                <div className="relative rounded-2xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repeat password"
                    className="block w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm border border-neutral-200 dark:border-slate-700 rounded-2xl bg-neutral-50/70 dark:bg-slate-800/60 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#FF541E] focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

            {role === 'delivery' && (
              <p className="text-[11px] text-orange-900 dark:text-orange-200 bg-orange-50 dark:bg-orange-950/30 p-2.5 rounded-xl border border-orange-200 dark:border-orange-800/50">
                🚀 Delivery Partners earn competitive payouts, keep 100% of tips, and choose their own shifts.
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#FF541E] via-[#FF6B35] to-[#FF7A00] hover:from-[#E03E00] hover:to-[#F56E00] shadow-lg shadow-orange-500/30 transition-all duration-200 disabled:opacity-50 active:scale-[0.99]"
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Create {role === 'delivery' ? 'Partner' : 'Customer'} Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-neutral-500 dark:text-neutral-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-bold text-[#FF541E] hover:text-[#E03E00] dark:text-orange-400 underline underline-offset-2 transition-colors"
            >
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
