import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { User, Bike, Lock, Mail, Phone, AlertCircle, ArrowRight } from 'lucide-react';
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
      const { user, devOtp } = await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role,
      });

      // Redirect to Email OTP Verification
      navigate('/verify-email', {
        state: { email: formData.email, devOtp, role: user.role },
      });
    } catch (err) {
      setLocalError(err.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-[calc(100vh-60px)] flex flex-col justify-center py-8 pb-28 sm:py-10 sm:pb-12 px-4 sm:px-6 lg:px-8 bg-neutral-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <BrandLogo variant="full" size="xl" />
          </div>
          <h2 className="text-xl font-black text-neutral-900 tracking-tight sm:text-2xl">
            Create your Cravecourier account
          </h2>
          <p className="mt-1.5 text-xs text-neutral-500">
            Join thousands enjoying instant food & grocery delivery
          </p>
        </div>

        {/* Role Selection Tabs */}
        <div className="mt-6 bg-neutral-200/70 p-1 rounded-xl flex items-center">
          <button
            type="button"
            onClick={() => setRole('customer')}
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
            onClick={() => setRole('delivery')}
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

        {/* Card Form */}
        <div className="mt-4 bg-white py-8 px-5 shadow-xl shadow-neutral-200/50 rounded-2xl border border-neutral-200/70 sm:px-8">
          {(localError || storeError) && (
            <div className="mb-5 rounded-xl bg-rose-50 border border-rose-200 p-3.5 flex items-start space-x-2.5">
              <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 font-medium leading-relaxed">
                {localError || storeError}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Full Name
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-neutral-400" />
                </div>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Jane Doe"
                  className="block w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-neutral-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-neutral-50/50"
                />
              </div>
            </div>

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
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className="block w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-neutral-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-neutral-50/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Phone Number (Optional)
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-neutral-400" />
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                  className="block w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-neutral-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-neutral-50/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Password
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-neutral-400" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 6 chars"
                    className="block w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-neutral-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-neutral-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-neutral-400" />
                  </div>
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repeat password"
                    className="block w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-neutral-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-neutral-50/50"
                  />
                </div>
              </div>
            </div>

            {role === 'delivery' && (
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                🚀 Delivery Partners earn competitive payouts, keep 100% of tips, and choose their own shifts.
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md transition-all disabled:opacity-50 ${
                role === 'delivery'
                  ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                  : 'bg-brand-500 hover:bg-brand-600 shadow-brand-500/20'
              }`}
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Create {role === 'delivery' ? 'Partner' : 'Customer'} Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-neutral-500">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-brand-600 hover:text-brand-700">
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

