import { useState, useEffect, useRef } from 'react';
import { Shield, Smartphone, ArrowRight, RotateCw, AlertCircle, CheckCircle2, Lock, X } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export default function TwoFactorModal({ isOpen, onClose, twoFactorData, onSuccess }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [localError, setLocalError] = useState('');
  const [resendSuccess, setResendSuccess] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [currentTempToken, setCurrentTempToken] = useState('');

  const inputRefs = useRef([]);
  const { verify2FA, resend2FA } = useAuthStore();

  useEffect(() => {
    if (isOpen && twoFactorData?.twoFactorTempToken) {
      setCurrentTempToken(twoFactorData.twoFactorTempToken);
      setDigits(['', '', '', '', '', '']);
      setLocalError('');
      setResendSuccess('');
      setResendCooldown(30);
      // Auto-focus first input
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    }
  }, [isOpen, twoFactorData]);

  // Countdown timer for resend
  useEffect(() => {
    if (!isOpen || resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, resendCooldown]);

  if (!isOpen) return null;

  const handleDigitChange = (index, value) => {
    // Only numbers
    const cleanVal = value.replace(/\D/g, '');
    const newDigits = [...digits];

    if (!cleanVal) {
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    // If pasted full 6-digit string
    if (cleanVal.length > 1) {
      const pastedChars = cleanVal.slice(0, 6).split('');
      pastedChars.forEach((char, idx) => {
        newDigits[idx] = char;
      });
      setDigits(newDigits);
      const nextFocus = Math.min(pastedChars.length, 5);
      inputRefs.current[nextFocus]?.focus();
      if (pastedChars.length === 6) {
        handleVerify(pastedChars.join(''));
      }
      return;
    }

    newDigits[index] = cleanVal.slice(-1);
    setDigits(newDigits);

    // Auto-advance
    if (index < 5 && cleanVal) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 filled
    if (index === 5 && cleanVal) {
      const fullCode = newDigits.join('');
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (codeToVerify) => {
    const fullOtp = typeof codeToVerify === 'string' ? codeToVerify : digits.join('');
    if (fullOtp.length !== 6) {
      setLocalError('Please enter all 6 digits of the security code.');
      return;
    }

    setLocalError('');
    setVerifying(true);

    try {
      const user = await verify2FA(currentTempToken, fullOtp);
      if (onSuccess) onSuccess(user);
      onClose();
    } catch (err) {
      setLocalError(err.message || 'Invalid or expired 6-digit security code.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLocalError('');
    setResendSuccess('');

    try {
      const res = await resend2FA(currentTempToken);
      setResendSuccess('A fresh 6-digit SMS code has been dispatched.');
      setResendCooldown(45);
      if (res?.debugOtp && twoFactorData) {
        twoFactorData.debugOtp = res.debugOtp;
      }
    } catch (err) {
      setLocalError(err.message || 'Failed to resend SMS code. Please try again.');
    }
  };

  const fillDebugOtp = () => {
    if (!twoFactorData?.debugOtp) return;
    const chars = twoFactorData.debugOtp.split('');
    setDigits(chars);
    handleVerify(twoFactorData.debugOtp);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200/90 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Cancel 2FA"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Shield & Phone Icon Header */}
        <div className="text-center space-y-2">
          <div className="relative inline-flex items-center justify-center">
            <div className="h-16 w-16 rounded-3xl bg-gradient-to-tr from-brand-500 via-orange-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Shield className="h-8 w-8" />
            </div>
            <span className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-emerald-500 text-white shadow-xs">
              <Smartphone className="h-3.5 w-3.5" />
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-slate-100 font-heading">
            Two-Factor Security
          </h2>
          <p className="text-xs text-neutral-500 dark:text-slate-400 max-w-xs mx-auto">
            We sent a 6-digit one-time passcode via SMS to{' '}
            <strong className="text-neutral-800 dark:text-slate-200 font-mono">
              {twoFactorData?.maskedPhone || 'your mobile phone'}
            </strong>
          </p>
        </div>

        {/* Development Mode Quick Fill */}
        {twoFactorData?.debugOtp && (
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs">
            <span className="text-amber-800 dark:text-amber-300 font-medium">
              Demo Code: <strong className="font-mono font-bold tracking-wider">{twoFactorData.debugOtp}</strong>
            </span>
            <button
              type="button"
              onClick={fillDebugOtp}
              className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] shadow-xs active:scale-95"
            >
              1-Tap Fill
            </button>
          </div>
        )}

        {/* Feedback alerts */}
        {localError && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
            <span>{localError}</span>
          </div>
        )}

        {resendSuccess && (
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>{resendSuccess}</span>
          </div>
        )}

        {/* 6-Digit Individual Input Cells */}
        <div className="flex items-center justify-center gap-2 sm:gap-2.5 pt-1">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (inputRefs.current[idx] = el)}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-black font-mono rounded-2xl border transition-all outline-none ${
                digit
                  ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-950/40 text-brand-600 dark:text-brand-300 ring-2 ring-brand-500/20 shadow-xs'
                  : 'border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-neutral-900 dark:text-slate-100 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'
              }`}
            />
          ))}
        </div>

        {/* Submit Action */}
        <button
          type="button"
          onClick={() => handleVerify()}
          disabled={verifying || digits.join('').length !== 6}
          className="w-full py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-brand-500 via-brand-600 to-amber-500 hover:from-brand-600 hover:to-amber-600 shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-98"
        >
          {verifying ? (
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <span>Verify &amp; Sign In</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        {/* Resend Controls */}
        <div className="pt-1 text-center">
          {resendCooldown > 0 ? (
            <span className="text-xs text-neutral-400">
              Resend SMS in <strong className="font-mono text-neutral-600 dark:text-slate-300">{resendCooldown}s</strong>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1.5"
            >
              <RotateCw className="h-3.5 w-3.5" />
              <span>Resend 6-Digit SMS Code</span>
            </button>
          )}
        </div>

        <p className="text-[10px] text-center text-neutral-400 pt-1">
          Backup code was also sent to your registered email in case of telecom SMS delays.
        </p>
      </div>
    </div>
  );
}
