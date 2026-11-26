import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { MailCheck, AlertCircle, CheckCircle2, RefreshCw, ArrowRight, ShieldCheck, Mail, ArrowLeft } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyEmail, resendOtp, user, isLoading, error: storeError, clearError } = useAuthStore();

  const email = location.state?.email || user?.email || '';
  const phone = location.state?.phone || user?.phone || '';
  const role = location.state?.role || user?.role || 'customer';
  const autoResend = location.state?.autoResend || false;

  const [otp, setOtp] = useState('');
  const [localError, setLocalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);

  // Resend cooldown timer
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Handle auto-resend trigger if navigated from Login
  useEffect(() => {
    if (autoResend && (email || phone)) {
      handleResend();
    }
  }, [autoResend]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMsg('');
    clearError();

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setLocalError('Please enter the complete 6-digit verification code.');
      return;
    }

    if (!email && !phone) {
      setLocalError('No email or phone number associated with this session. Please return to login.');
      return;
    }

    try {
      await verifyEmail(email || phone, cleanOtp, phone);
      setSuccessMsg('🎉 Account verified successfully! Logging you in...');
      setTimeout(() => {
        if (role === 'delivery') navigate('/partner', { replace: true });
        else if (role === 'admin') navigate('/admin', { replace: true });
        else navigate('/', { replace: true });
      }, 1200);
    } catch (err) {
      setLocalError(err.message || 'Verification failed. Please check the OTP code.');
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setLocalError('');
    setSuccessMsg('');
    setResending(true);
    try {
      await resendOtp(email || phone, phone);
      setSuccessMsg('A fresh 6-digit code has been sent to your email and registered mobile number.');
      setResendCooldown(30);
    } catch (err) {
      setLocalError(err.message || 'Failed to resend verification code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-60px)] relative overflow-hidden bg-gradient-to-b from-[#FFF5F0] via-white to-[#FFF0EA] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      {/* Decorative Warm Ambient Glows */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-bl from-rose-500/20 via-orange-500/20 to-amber-300/10 blur-3xl opacity-80 animate-pulse"></div>
      <div className="pointer-events-none absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-gradient-to-tr from-orange-500/20 via-rose-500/15 to-amber-400/10 blur-3xl opacity-80"></div>

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <BrandLogo variant="full" size="xl" />
          </div>

          <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-rose-500 to-orange-500 text-white shadow-lg shadow-orange-500/30 mb-3 animate-float">
            <MailCheck className="h-8 w-8" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
            Verify Your Account
          </h1>
          <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-300 max-w-xs mx-auto">
            We sent a 6-digit verification code to
            {phone && (
              <>
                <br />
                <span className="font-bold text-neutral-900 dark:text-white">📱 SMS: {phone}</span>
              </>
            )}
            {email && (
              <>
                <br />
                <span className="font-bold text-neutral-900 dark:text-white">✉️ {email}</span>
              </>
            )}
          </p>
        </div>

        {/* Verification Card */}
        <div className="mt-5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md py-7 px-5 sm:px-8 shadow-2xl shadow-orange-950/10 dark:shadow-black/50 rounded-3xl border border-orange-100 dark:border-slate-800 relative">
          <div className="absolute top-0 inset-x-8 h-1 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 rounded-t-3xl"></div>

          {/* Error Message */}
          {(localError || storeError) && (
            <div className="mb-4 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 p-3.5 flex items-start space-x-2.5">
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 dark:text-rose-300 font-medium leading-relaxed">
                {localError || storeError}
              </p>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="mb-4 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/50 p-3.5 flex items-start space-x-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium leading-relaxed">
                {successMsg}
              </p>
            </div>
          )}

          {/* Deliverability & SMS / Spam Advice Banner */}
          <div className="mb-5 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-200/80 dark:border-orange-800/50 p-3.5 text-xs text-orange-950 dark:text-orange-200 flex items-start gap-2.5 shadow-xs">
            <span className="text-lg leading-none mt-0.5">📲</span>
            <div className="space-y-1">
              <p className="font-bold text-orange-950 dark:text-orange-100">
                Check Mobile SMS &amp; Email Inbox
              </p>
              <p className="text-[11px] text-orange-800 dark:text-orange-300/90 leading-relaxed">
                Your 6-digit code has been dispatched via <strong>Mobile SMS</strong> and <strong>Email</strong>. If checking email, please also check your <strong>Spam / Promotions</strong> folder.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-200 mb-2 text-center">
                Enter 6-Digit Code
              </label>
              <div className="relative max-w-xs mx-auto">
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="block w-full py-3.5 text-center text-2xl font-mono font-bold tracking-[0.5em] border border-orange-200 dark:border-slate-700 rounded-2xl bg-neutral-50/70 dark:bg-slate-800/60 text-neutral-900 dark:text-white placeholder-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#FF541E] focus:border-transparent transition-all shadow-inner"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#FF541E] via-[#FF6B35] to-[#FF7A00] hover:from-[#E03E00] hover:to-[#F56E00] shadow-lg shadow-orange-500/30 transition-all duration-200 disabled:opacity-50 active:scale-[0.99]"
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Verify &amp; Continue</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Resend Action */}
          <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-slate-800 text-center space-y-2">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Didn't receive the SMS or email code?
            </p>
            <div>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || resendCooldown > 0}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF541E] hover:text-[#E03E00] dark:text-orange-400 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
                <span>
                  {resending
                    ? 'Dispatching SMS & email code...'
                    : resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : '📱 Resend via SMS & Email'}
                </span>
              </button>
            </div>

            <div className="pt-2">
              <Link
                to="/register"
                className="text-[11px] font-medium text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 underline underline-offset-2"
              >
                Entered the wrong email? Re-register or change address
              </Link>
            </div>
          </div>

          {/* Back to Login */}
          <div className="mt-4 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
