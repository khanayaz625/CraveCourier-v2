import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { MailCheck, AlertCircle, CheckCircle2, RefreshCw, ArrowRight } from 'lucide-react';

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyEmail, resendOtp, user, isLoading, error: storeError, clearError } = useAuthStore();

  const email = location.state?.email || user?.email || '';
  const role = location.state?.role || user?.role || 'customer';

  const [otp, setOtp] = useState('');
  const [localError, setLocalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMsg('');
    clearError();

    if (!email) {
      setLocalError('No email associated with this session. Please sign in again.');
      return;
    }

    try {
      await verifyEmail(email, otp);
      setSuccessMsg('Email verified successfully! Redirecting...');
      setTimeout(() => {
        if (role === 'delivery') navigate('/partner', { replace: true });
        else if (role === 'admin') navigate('/admin', { replace: true });
        else navigate('/', { replace: true });
      }, 1500);
    } catch (err) {
      setLocalError(err.message || 'Verification failed. Please check the OTP code.');
    }
  };

  const handleResend = async () => {
    setLocalError('');
    setSuccessMsg('');
    setResending(true);
    try {
      await resendOtp(email);
      setSuccessMsg('A fresh verification code has been dispatched to your email.');
    } catch (err) {
      setLocalError(err.message || 'Failed to resend verification code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-60px)] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-neutral-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 shadow-md">
            <MailCheck className="h-7 w-7 text-emerald-600" />
          </span>
          <h2 className="mt-4 text-2xl font-black text-neutral-900 tracking-tight sm:text-3xl">
            Verify your email
          </h2>
          <p className="mt-1.5 text-xs text-neutral-500 max-w-xs mx-auto">
            We sent a 6-digit verification code to <span className="font-semibold text-neutral-800">{email || 'your email'}</span>
          </p>
        </div>

        <div className="mt-6 bg-white py-8 px-5 shadow-xl shadow-neutral-200/50 rounded-2xl border border-neutral-200/70 sm:px-8">
          {(localError || storeError) && (
            <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 font-medium">{localError || storeError}</p>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-start space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-700 font-medium">{successMsg}</p>
            </div>
          )}

          <div className="mb-5 rounded-xl bg-amber-50/90 border border-amber-200/90 p-3 text-xs text-amber-900 flex items-start gap-2.5">
            <span className="text-base leading-none mt-0.5">📩</span>
            <div className="space-y-0.5">
              <p className="font-bold text-amber-950">Check your Inbox &amp; Spam / Junk folder</p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                The verification code is sent by <strong>Crave Courier</strong>. If you don't see it in your Inbox, please check your <strong>Spam</strong> or <strong>Promotions</strong> folder.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5 text-center">
                Enter 6-Digit Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="block w-full py-3 text-center text-2xl font-mono tracking-widest border border-neutral-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-neutral-50"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-md shadow-brand-500/20 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Verify Email</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <span>Didn't receive the code?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="font-bold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${resending ? 'animate-spin' : ''}`} />
              Resend Code
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-xs text-neutral-500 hover:text-neutral-800">
            Skip for now & return to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

