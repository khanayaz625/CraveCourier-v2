import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { User, Bike, Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight, Shield, Sparkles, CheckCircle2, Smartphone, KeyRound, RotateCw } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import TwoFactorModal from '../components/TwoFactorModal';
import { useHoldToAdmin } from '../hooks/useHoldToAdmin';

export default function LoginPage() {
  const [role, setRole] = useState('customer'); // 'customer' | 'delivery'
  const [authMethod, setAuthMethod] = useState('password'); // 'password' | 'mobile'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [unverifiedState, setUnverifiedState] = useState(null); // { email, role, message }

  // 2FA Mobile OTP states
  const [twoFactorChallenge, setTwoFactorChallenge] = useState(null);
  const [show2FAModal, setShow2FAModal] = useState(false);

  // 1-Tap Mobile OTP Login states
  const [mobilePhone, setMobilePhone] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [mobileStep, setMobileStep] = useState(1); // 1 = Phone, 2 = OTP
  const [mobileSending, setMobileSending] = useState(false);
  const [mobileDebugOtp, setMobileDebugOtp] = useState(null);

  const { isHolding, progress, holdProps } = useHoldToAdmin({ durationMs: 1400 });

  const {
    login,
    sendMobileOtp,
    verifyMobileOtp,
    isLoading,
    error: storeError,
    clearError,
    isAuthenticated,
    user,
    isAuthInitialized,
  } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || (role === 'delivery' ? '/partner' : '/');

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'delivery') {
        navigate('/partner', { replace: true });
      } else if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, from]);

  // While session is being checked on initial boot, prevent flash of login form
  if (!isAuthInitialized) {
    return (
      <div className="min-h-[calc(100vh-60px)] flex items-center justify-center bg-gradient-to-br from-orange-50/60 via-white to-rose-50/60 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-10 w-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-neutral-400 dark:text-slate-400 font-heading tracking-wider uppercase">
            Verifying session...
          </p>
        </div>
      </div>
    );
  }

  const handleLoginSuccess = (loggedUser) => {
    if (loggedUser.role === 'delivery') {
      navigate('/partner', { replace: true });
    } else if (loggedUser.role === 'admin') {
      navigate('/admin', { replace: true });
    } else {
      navigate(from, { replace: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setUnverifiedState(null);
    clearError();

    try {
      const res = await login(email, password, role);

      // Check if 2-Factor Mobile Challenge is triggered
      if (res?.requires2FA) {
        setTwoFactorChallenge(res);
        setShow2FAModal(true);
        return;
      }

      handleLoginSuccess(res);
    } catch (err) {
      // Check if blocked due to unverified email
      if (err.isEmailVerified === false || (err.statusCode === 403 && (err.message?.toLowerCase().includes('verif') || err.message?.toLowerCase().includes('otp')))) {
        setUnverifiedState({
          email: err.unverifiedEmail || email,
          role,
          debugOtp: err.debugOtp,
          message: err.message || 'Email verification is required before signing in. A fresh 6-digit code has been dispatched to your email.',
        });
      } else {
        setLocalError(err.message || 'Login failed. Please check your credentials.');
      }
    }
  };

  // 1-Tap Mobile Phone OTP Handlers
  const handleSendMobileOtp = async (e) => {
    e.preventDefault();
    const cleanPhone = mobilePhone.trim().replace(/[^\d+]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setLocalError('Please enter a valid 10-digit mobile phone number.');
      return;
    }

    setLocalError('');
    setMobileSending(true);
    try {
      const res = await sendMobileOtp(cleanPhone, role);
      setMobileStep(2);
      if (res?.debugOtp) {
        setMobileDebugOtp(res.debugOtp);
      }
    } catch (err) {
      if (err.message?.includes('Route not found') || err.message?.includes('404')) {
        setLocalError(
          'Mobile OTP service is synchronizing with the cloud backend. Please use the Password login tab or email verification in the meantime.'
        );
      } else {
        setLocalError(err.message || 'Failed to dispatch mobile OTP. Please try again.');
      }
    } finally {
      setMobileSending(false);
    }
  };

  const handleVerifyMobileOtp = async (e) => {
    e.preventDefault();
    if (!mobileOtp || mobileOtp.trim().length !== 6) {
      setLocalError('Please enter the 6-digit OTP received on your mobile phone.');
      return;
    }

    setLocalError('');
    setMobileSending(true);
    try {
      const loggedUser = await verifyMobileOtp(mobilePhone.trim(), mobileOtp.trim(), '', role);
      handleLoginSuccess(loggedUser);
    } catch (err) {
      setLocalError(err.message || 'Invalid or expired mobile OTP.');
    } finally {
      setMobileSending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-60px)] relative overflow-hidden bg-gradient-to-b from-[#FFF5F0] via-white to-[#FFF0EA] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col justify-center py-6 px-4 sm:px-6 lg:px-8">
      {/* Decorative Warm Reddish / Orangish Ambient Glow Orbs */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-gradient-to-tr from-rose-500/20 via-orange-500/20 to-amber-400/10 blur-3xl opacity-80 animate-pulse"></div>
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-bl from-orange-500/20 via-rose-500/15 to-amber-300/10 blur-3xl opacity-80"></div>

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md z-10">
        {/* Brand Header with Warm Badges */}
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <BrandLogo variant="full" size="xl" />
          </div>

          {/* Food Badges */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-rose-500/10 via-orange-500/10 to-amber-500/10 border border-orange-200/60 dark:border-orange-500/20 mb-3 shadow-xs">
            <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping"></span>
            <span className="text-[11px] font-bold bg-gradient-to-r from-rose-600 via-orange-600 to-amber-600 bg-clip-text text-transparent uppercase tracking-wider">
              🍕 Pizza 65 &amp; Express Delivery
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
            Hungry? <span className="bg-gradient-to-r from-[#FF541E] via-[#FF6B35] to-[#FFA000] bg-clip-text text-transparent">Sign in &amp; Crave</span>
          </h1>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Log in to order fresh food, track live riders, and earn rewards
          </p>
        </div>

        {/* Role Switcher Pill Container */}
        <div className="mt-5 p-1 bg-gradient-to-r from-rose-100/70 via-orange-100/70 to-amber-100/70 dark:from-slate-800 dark:to-slate-800/80 rounded-2xl flex items-center border border-orange-200/50 dark:border-slate-700 shadow-inner relative">
          {/* Secret Hold Progress Pill */}
          {isHolding && (
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[9px] font-black tracking-wider uppercase shadow-lg shadow-purple-500/40 flex items-center gap-1 animate-bounce z-50 pointer-events-none">
              <Shield className="h-3 w-3" />
              <span>Switching to Admin {progress}%</span>
            </div>
          )}

          <button
            type="button"
            {...holdProps}
            onClick={(e) => {
              holdProps.onClick(e);
              setRole('customer');
              setLocalError('');
              setUnverifiedState(null);
              clearError();
            }}
            title="Customer mode (Hold to switch to Admin)"
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 touch-manipulation select-none ${
              isHolding
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/40 scale-[1.02]'
                : role === 'customer'
                ? 'bg-gradient-to-r from-[#FF541E] to-[#FF7A00] text-white shadow-md shadow-orange-500/25 scale-[1.01]'
                : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {isHolding ? <Shield className="h-4 w-4 animate-pulse" /> : <User className="h-4 w-4" />}
            <span>{isHolding ? 'Admin' : 'Customer'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setRole('delivery');
              setLocalError('');
              setUnverifiedState(null);
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

        {/* Main Card */}
        <div className="mt-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md py-6 px-5 sm:py-8 sm:px-8 shadow-2xl shadow-orange-950/10 dark:shadow-black/50 rounded-3xl border border-orange-100 dark:border-slate-800 relative">
          
          {/* Subtle Card Accent Top Strip */}
          <div className="absolute top-0 inset-x-8 h-1 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 rounded-t-3xl"></div>

          {/* Unverified Email Warning Banner */}
          {unverifiedState && (
            <div className="mb-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-orange-200 dark:border-orange-800/60 p-4 shadow-sm animate-pop">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-500 to-rose-500 text-white flex-shrink-0 shadow-sm mt-0.5">
                  <AlertCircle className="h-5 w-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-black text-orange-950 dark:text-orange-200 tracking-tight">
                    Email Verification Required
                  </h4>
                  <p className="text-[11px] text-orange-800 dark:text-orange-300 mt-0.5 leading-relaxed">
                    {unverifiedState.message}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        navigate('/verify-email', {
                          state: {
                            email: unverifiedState.email,
                            role: unverifiedState.role,
                            debugOtp: unverifiedState.debugOtp,
                          },
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl text-white bg-gradient-to-r from-[#FF541E] to-[#FF7A00] shadow-sm hover:opacity-95 transition-all"
                    >
                      <span>Enter 6-Digit Code</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        navigate('/verify-email', {
                          state: { email: unverifiedState.email, role: unverifiedState.role, autoResend: true },
                        })
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl text-orange-800 dark:text-orange-200 bg-white dark:bg-slate-800 border border-orange-200 dark:border-slate-700 hover:bg-orange-50 transition-colors"
                    >
                      Resend OTP
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Standard Error Display */}
          {(localError || storeError) && !unverifiedState && (
            <div className="mb-5 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 p-3.5 flex items-start space-x-2.5">
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 dark:text-rose-300 font-medium leading-relaxed">
                {localError || storeError}
              </p>
            </div>
          )}

          {/* Auth Method Tabs: Password & 2FA vs 1-Tap Mobile OTP */}
          <div className="mb-5 flex rounded-2xl bg-neutral-100/80 dark:bg-slate-800 p-1 border border-neutral-200/60 dark:border-slate-700/80">
            <button
              type="button"
              onClick={() => {
                setAuthMethod('password');
                setLocalError('');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                authMethod === 'password'
                  ? 'bg-white dark:bg-slate-700 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Password & 2FA</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod('mobile');
                setLocalError('');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                authMethod === 'mobile'
                  ? 'bg-gradient-to-r from-brand-500 to-orange-500 text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Mobile OTP</span>
            </button>
          </div>

          {authMethod === 'password' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-200 mb-1.5">
                  Email Address
                </label>
                <div className="relative rounded-2xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="block w-full pl-10 pr-3.5 py-3 text-xs sm:text-sm border border-neutral-200 dark:border-slate-700 rounded-2xl bg-neutral-50/70 dark:bg-slate-800/60 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#FF541E] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-200">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-[#FF541E] hover:text-[#E03E00] dark:text-orange-400 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative rounded-2xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-11 py-3 text-xs sm:text-sm border border-neutral-200 dark:border-slate-700 rounded-2xl bg-neutral-50/70 dark:bg-slate-800/60 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#FF541E] focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Action Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#FF541E] via-[#FF6B35] to-[#FF7A00] hover:from-[#E03E00] hover:to-[#F56E00] shadow-lg shadow-orange-500/30 transition-all duration-200 disabled:opacity-60 active:scale-[0.99]"
              >
                {isLoading ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Sign In as {role === 'delivery' ? 'Partner' : 'Customer'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* 1-Tap Fast Mobile Phone OTP Form */
            <div className="space-y-4">
              {mobileStep === 1 ? (
                <form onSubmit={handleSendMobileOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-200 mb-1.5">
                      Mobile Phone Number
                    </label>
                    <div className="relative rounded-2xl shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500 font-bold text-xs">
                        +91
                      </div>
                      <input
                        type="tel"
                        required
                        value={mobilePhone}
                        onChange={(e) => setMobilePhone(e.target.value)}
                        placeholder="98765 43210"
                        maxLength={15}
                        className="block w-full pl-12 pr-3.5 py-3 text-xs sm:text-sm border border-neutral-200 dark:border-slate-700 rounded-2xl bg-neutral-50/70 dark:bg-slate-800/60 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#FF541E] focus:border-transparent transition-all font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-1">
                      We'll send a 6-digit one-time SMS verification code to your phone.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={mobileSending || mobilePhone.trim().length < 10}
                    className="w-full relative mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#FF541E] via-[#FF6B35] to-[#FF7A00] hover:from-[#E03E00] hover:to-[#F56E00] shadow-lg shadow-orange-500/30 transition-all duration-200 disabled:opacity-60 active:scale-[0.99]"
                  >
                    {mobileSending ? (
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span>Send 6-Digit SMS OTP</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyMobileOtp} className="space-y-4">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-orange-50 dark:bg-slate-800 border border-orange-200/60 dark:border-slate-700 text-xs">
                    <span className="font-mono font-bold text-neutral-800 dark:text-slate-200">
                      OTP sent to +91 {mobilePhone}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMobileStep(1)}
                      className="text-[#FF541E] font-bold hover:underline"
                    >
                      Change
                    </button>
                  </div>

                  {mobileDebugOtp && (
                    <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs">
                      <span className="text-amber-800 dark:text-amber-300 font-medium">
                        Demo Code: <strong className="font-mono">{mobileDebugOtp}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setMobileOtp(mobileDebugOtp)}
                        className="px-2 py-1 rounded bg-amber-500 text-white font-bold text-[10px]"
                      >
                        Fill Code
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-200 mb-1.5">
                      Enter 6-Digit Mobile Code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={mobileOtp}
                      onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="••••••"
                      maxLength={6}
                      className="block w-full py-3 text-center text-xl font-mono font-black tracking-widest border border-neutral-200 dark:border-slate-700 rounded-2xl bg-neutral-50/70 dark:bg-slate-800/60 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#FF541E] focus:border-transparent transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={mobileSending || mobileOtp.length !== 6}
                    className="w-full relative mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#FF541E] via-[#FF6B35] to-[#FF7A00] hover:from-[#E03E00] hover:to-[#F56E00] shadow-lg shadow-orange-500/30 transition-all duration-200 disabled:opacity-60 active:scale-[0.99]"
                  >
                    {mobileSending ? (
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span>Verify &amp; Sign In</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={handleSendMobileOtp}
                      className="text-xs font-bold text-neutral-500 dark:text-neutral-400 hover:text-brand-500 inline-flex items-center gap-1"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                      <span>Resend SMS OTP</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Two-Factor Authentication Modal */}
          <TwoFactorModal
            isOpen={show2FAModal}
            onClose={() => setShow2FAModal(false)}
            twoFactorData={twoFactorChallenge}
            onSuccess={handleLoginSuccess}
          />

          {/* Sign Up Link */}
          <div className="mt-5 text-center text-xs text-neutral-500 dark:text-neutral-400">
            Don't have an account?{' '}
            <Link
              to="/register"
              state={{ defaultRole: role }}
              className="font-bold text-[#FF541E] hover:text-[#E03E00] dark:text-orange-400 underline underline-offset-2 transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>

        {/* Footer Admin Link */}
        <div className="mt-6 text-center">
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
          >
            <Shield className="h-3.5 w-3.5 text-orange-400" />
            <span>Administrator Access Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
