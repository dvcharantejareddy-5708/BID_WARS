import React, { useState, useEffect } from 'react';
import { Trophy, KeyRound, ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import { authService, supabaseClient } from '../../services/auth';

interface VerifyRecoveryPageProps {
  onVerified: () => void;
  onGoToLogin: () => void;
  initialIdentifier?: string;
}

export const VerifyRecoveryPage: React.FC<VerifyRecoveryPageProps> = ({
  onVerified,
  onGoToLogin,
  initialIdentifier = ''
}) => {
  const [identifier, setIdentifier] = useState<string>(() => {
    if (initialIdentifier) return initialIdentifier;
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('bidwars_recovery_identifier') || '';
    }
    return '';
  });

  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Load cooldown and persist identifier
  useEffect(() => {
    if (identifier && typeof window !== 'undefined') {
      sessionStorage.setItem('bidwars_recovery_identifier', identifier);
    }
  }, [identifier]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown(c => c - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanCode = otpCode.trim();
    if (!cleanCode) {
      setError('Please enter the 6-digit recovery code.');
      return;
    }
    if (cleanCode.length < 6) {
      setError('Recovery code must be 6 digits.');
      return;
    }
    if (!identifier) {
      setError('Missing account identifier. Please return to login and request a new code.');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await authService.verifyRecoveryOtp(identifier, cleanCode);
      if (res.success && res.session) {
        setSuccessMsg('Recovery code verified successfully! Redirecting...');
        
        // Secure flag confirming authenticated OTP verification for reset page
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('bidwars_recovery_mode', 'true');
        }

        setTimeout(() => {
          onVerified();
        }, 600);
      } else {
        setError(res.error || 'Invalid or expired recovery code. Please check and try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify recovery code.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || isResending) return;
    if (!identifier) {
      setError('No account specified. Please return to login and request a code.');
      return;
    }

    setIsResending(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await authService.sendRecoveryOtp(identifier);
      if (res.success) {
        setResendCooldown(60);
        setSuccessMsg('A new recovery code has been sent. Please check your inbox.');
      } else {
        setError(res.error || 'Failed to resend recovery code.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error while resending recovery code.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080E] flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-[#0A0B14] border border-[#2A2F60] rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
        {/* Top Glow Banner */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#C8FF3D] via-[#7C5CFF] to-[#FF3B5C]" />

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-[#1E2246]">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#C8FF3D] to-[#7C5CFF] flex items-center justify-center shadow-lime-glow-sm shrink-0">
            <Trophy className="w-6 h-6 text-[#0A0B14]" />
          </div>
          <div>
            <h2 className="font-heading font-black text-lg text-white uppercase tracking-wider">
              Verify Recovery Code
            </h2>
            <p className="text-[11px] text-gray-400">BidWars IPL Tournament Platform</p>
          </div>
        </div>

        {/* Account Identifier Badge */}
        {identifier && (
          <div className="bg-[#12142A] border border-[#1E2246] rounded-xl p-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                Recovering Account
              </span>
              <span className="text-xs font-heading font-black text-white">
                {identifier}
              </span>
            </div>
            <span className="px-2 py-1 rounded text-[9px] font-black uppercase bg-[#7C5CFF]/15 text-[#A58BFF] border border-[#7C5CFF]/30">
              One-Time Code
            </span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3 bg-[#C8FF3D]/10 border border-[#C8FF3D]/30 rounded-xl text-[#C8FF3D] text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Verification Form */}
        <form onSubmit={handleVerifySubmit} className="space-y-5">
          {/* Recovery Code Input */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">
              6-Digit Recovery Code
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\s+/g, ''))}
                placeholder="123456"
                required
                autoFocus
                className="w-full pl-10 pr-4 py-3 bg-[#12142A] border border-[#2A2F60] focus:border-[#C8FF3D] rounded-xl text-white placeholder-gray-500 text-base font-mono font-bold tracking-[0.25em] text-center focus:outline-none transition-colors"
              />
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Enter the OTP recovery code sent to your registered Gmail address. The code expires shortly.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-1 space-y-3">
            <button
              type="submit"
              disabled={isVerifying || otpCode.length < 6}
              className="w-full py-3 rounded-xl bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] font-heading font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(200,255,61,0.25)] hover:scale-[1.02] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>Verify Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Resend Code Option */}
            <div className="flex items-center justify-between text-xs text-gray-400 pt-1 px-1">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendCooldown > 0 || isResending}
                className="hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-[11px]"
              >
                {resendCooldown > 0
                  ? `Resend Code in ${resendCooldown}s`
                  : isResending
                  ? 'Sending Code...'
                  : 'Didn\'t get a code? Resend Code'}
              </button>

              <button
                type="button"
                onClick={onGoToLogin}
                className="hover:text-white transition-colors cursor-pointer text-[11px] flex items-center gap-1 text-gray-400"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back to Sign In</span>
              </button>
            </div>
          </div>
        </form>

        {/* Security Footer */}
        <div className="pt-2 border-t border-[#1E2246] flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
          <ShieldCheck className="w-3.5 h-3.5 text-[#C8FF3D]" />
          <span>Encrypted and authenticated via Supabase Auth</span>
        </div>
      </div>
    </div>
  );
};

