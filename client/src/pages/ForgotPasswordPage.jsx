import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { KeyRound, Mail, Lock, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, RotateCw } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1); // 1 = Request OTP, 2 = Enter OTP + New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const { forgotPassword, resetPassword, isLoading, error: storeError, clearError } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim()) return;
    setLocalError('');
    setSuccessMsg('');
    clearError();

    try {
      await forgotPassword(email.trim().toLowerCase());
      setSuccessMsg(`A 6-digit reset code has been sent to ${email.trim().toLowerCase()}.`);
      setStep(2);
      setCooldown(30);
    } catch (err) {
      setLocalError(err.message || 'Failed to request reset code');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (otp.trim().length !== 6) {
      setLocalError('Please enter the 6-digit reset code.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    try {
      await resetPassword(email.trim().toLowerCase(), otp.trim(), newPassword);
      setSuccessMsg('Password has been reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setLocalError(err.message || 'Password reset failed');
    }
  };

  return (
    <div className="min-h-[calc(100vh-60px)] relative overflow-hidden bg-gradient-to-b from-[#FFF5F0] via-white to-[#FFF0EA] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-gradient-to-tr from-rose-500/20 via-orange-500/20 to-amber-400/10 blur-3xl opacity-80"></div>
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-bl from-orange-500/20 via-rose-500/15 to-amber-300/10 blur-3xl opacity-80"></div>

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <BrandLogo variant="full" size="lg" />
          </div>
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#FF541E] to-[#FF7A00] text-white shadow-lg shadow-orange-500/25">
            <KeyRound className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-2xl font-black text-neutral-900 dark:text-white tracking-tight sm:text-3xl">
            {step === 1 ? 'Reset your password' : 'Set new password'}
          </h1>
          <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            {step === 1
              ? 'Enter your registered email to receive a 6-digit recovery OTP'
              : 'Enter the 6-digit code sent to your email and choose a new password'}
          </p>
        </div>

        <div className="mt-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md py-8 px-5 sm:px-8 shadow-2xl shadow-orange-950/10 dark:shadow-black/50 rounded-3xl border border-orange-100 dark:border-slate-800 relative">
          <div className="absolute top-0 inset-x-8 h-1 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 rounded-t-3xl"></div>

          {(localError || storeError) && (
            <div className="mb-4 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 p-3.5 flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 dark:text-rose-300 font-medium">{localError || storeError}</p>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/50 p-3.5 flex items-start space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">{successMsg}</p>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-200 mb-1.5">
                  Registered Email Address
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#FF541E] via-[#FF6B35] to-[#FF7A00] hover:from-[#E03E00] hover:to-[#F56E00] shadow-lg shadow-orange-500/30 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Send Reset Code to Email</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <>
              <div className="mb-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-800/50 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                <span className="text-base leading-none mt-0.5">📩</span>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                  Sent by <strong>Crave Courier</strong> to <strong>{email}</strong>. Please check your <strong>Spam</strong> or <strong>Promotions</strong> folder if not in your primary inbox.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-200 mb-1">
                    6-Digit Reset Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="block w-full py-2.5 text-center text-xl font-mono font-black tracking-widest border border-neutral-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-[#FF541E] focus:border-transparent bg-neutral-50 dark:bg-slate-800/60 text-neutral-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-200 mb-1">
                    New Password
                  </label>
                  <div className="relative rounded-2xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="block w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm border border-neutral-200 dark:border-slate-700 rounded-2xl bg-neutral-50/70 dark:bg-slate-800/60 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF541E] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-200 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative rounded-2xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="block w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm border border-neutral-200 dark:border-slate-700 rounded-2xl bg-neutral-50/70 dark:bg-slate-800/60 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF541E] focus:border-transparent"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#FF541E] via-[#FF6B35] to-[#FF7A00] hover:from-[#E03E00] hover:to-[#F56E00] shadow-lg shadow-orange-500/30 transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Update Password</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => handleRequestOtp()}
                    disabled={isLoading || cooldown > 0}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF541E] hover:text-[#E03E00] dark:text-orange-400 disabled:opacity-50"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    <span>{cooldown > 0 ? `Resend reset code in ${cooldown}s` : 'Resend Reset Code'}</span>
                  </button>
                </div>
              </form>
            </>
          )}

          <div className="mt-5 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
