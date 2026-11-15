import React, { useState, useEffect } from 'react';
import { Trophy, Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { supabaseClient, authService } from '../../services/auth';

interface ResetPasswordPageProps {
  onGoToLogin: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onGoToLogin }) => {
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);
  const [accountUsername, setAccountUsername] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [accountEmail, setAccountEmail] = useState<string>('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    let mounted = true;

    async function checkRecoverySession() {
      setLoadingSession(true);

      try {
        // 1. Check if Supabase client is available
        if (!supabaseClient) {
          if (mounted) {
            setSessionValid(false);
            setLoadingSession(false);
          }
          return;
        }

        // 2. Parse hash fragment if tokens were provided via URL hash (#access_token=...&type=recovery)
        const hash = window.location.hash ? window.location.hash.substring(1) : '';
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token') || '';
        const type = params.get('type');

        if (accessToken && type === 'recovery') {
          try {
            await supabaseClient.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
          } catch (sessionErr) {
            console.warn('[ResetPassword] setSession error:', sessionErr);
          }
        }

        // 3. Check query param code if PKCE was used (?code=...)
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        if (code) {
          try {
            await supabaseClient.auth.exchangeCodeForSession(code);
          } catch (codeErr) {
            console.warn('[ResetPassword] exchangeCodeForSession error:', codeErr);
          }
        }

        // 4. Retrieve current active session
        const { data } = await supabaseClient.auth.getSession();
        const user = data?.session?.user;

        if (user && mounted) {
          setSessionValid(true);
          setUserId(user.id);
          setAccountEmail(user.email || '');

          // Get username from user metadata or profile
          const metaUsername = user.user_metadata?.username || user.user_metadata?.in_game_name;
          if (metaUsername) {
            setAccountUsername(metaUsername);
          } else {
            // Attempt fetching profile via API
            try {
              const apiBase = ((import.meta as any).env?.VITE_API_URL as string) || '';
              const pRes = await fetch(`${apiBase}/api/profiles/active?userId=${user.id}`).catch(() => null);
              if (pRes && pRes.ok) {
                const pData = await pRes.json();
                if (pData?.username) setAccountUsername(pData.username);
              }
            } catch {}
          }
        } else if (mounted) {
          setSessionValid(false);
        }
      } catch (err: any) {
        console.error('[ResetPassword] check error:', err);
        if (mounted) setSessionValid(false);
      } finally {
        if (mounted) setLoadingSession(false);
      }
    }

    checkRecoverySession();

    // Listen to PASSWORD_RECOVERY auth state event
    const { data: authListener } = supabaseClient?.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session?.user && !sessionValid)) {
        if (mounted && session?.user) {
          setSessionValid(true);
          setUserId(session.user.id);
          setAccountEmail(session.user.email || '');
          const uName = session.user.user_metadata?.username || session.user.user_metadata?.in_game_name;
          if (uName) setAccountUsername(uName);
          setLoadingSession(false);
        }
      }
    }) || { data: { subscription: { unsubscribe: () => {} } } };

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Auto-redirect countdown upon successful reset
  useEffect(() => {
    if (!isSuccess) return;
    if (countdown <= 0) {
      handleCompleteAndRedirect();
      return;
    }
    const timer = setTimeout(() => {
      setCountdown(c => c - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [isSuccess, countdown]);

  const handleCompleteAndRedirect = () => {
    // Clear hash and parameters from address bar cleanly
    if (window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    onGoToLogin();
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!supabaseClient) {
        throw new Error('Supabase client is unavailable.');
      }

      // Update password directly via Supabase Auth
      const { data, error: updateError } = await supabaseClient.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw updateError;
      }

      // Sync backup credential hash if user ID is known
      if (userId) {
        await authService.syncPasswordCredentials(userId, newPassword);
      }

      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please request a new recovery link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password strength helper
  const getPasswordStrength = () => {
    if (!newPassword) return null;
    if (newPassword.length < 6) return { label: 'Too short', color: 'text-red-400', bar: 'w-1/4 bg-red-500' };
    const hasLetters = /[a-zA-Z]/.test(newPassword);
    const hasNumbers = /[0-9]/.test(newPassword);
    const hasSpecial = /[^a-zA-Z0-9]/.test(newPassword);
    const score = (hasLetters ? 1 : 0) + (hasNumbers ? 1 : 0) + (hasSpecial ? 1 : 0) + (newPassword.length >= 8 ? 1 : 0);

    if (score >= 4) return { label: 'Strong', color: 'text-[#C8FF3D]', bar: 'w-full bg-[#C8FF3D]' };
    if (score >= 2) return { label: 'Good', color: 'text-yellow-400', bar: 'w-2/3 bg-yellow-400' };
    return { label: 'Fair', color: 'text-orange-400', bar: 'w-1/3 bg-orange-400' };
  };

  const strength = getPasswordStrength();

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-[#07080E] flex items-center justify-center p-4">
        <div className="bg-[#0A0B14] border border-[#2A2F60] rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <Loader2 className="w-10 h-10 text-[#C8FF3D] animate-spin mx-auto" />
          <h3 className="font-heading font-black text-white uppercase text-base tracking-wider">
            Verifying Recovery Link...
          </h3>
          <p className="text-xs text-gray-400">Authenticating secure reset token with Supabase Auth</p>
        </div>
      </div>
    );
  }

  if (!sessionValid && !isSuccess) {
    return (
      <div className="min-h-screen bg-[#07080E] flex items-center justify-center p-4">
        <div className="bg-[#0A0B14] border border-[#FF3B5C]/30 rounded-3xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-[#FF3B5C]/15 border border-[#FF3B5C]/30 flex items-center justify-center mx-auto text-[#FF3B5C]">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="font-heading font-black text-white uppercase text-lg tracking-wider">
              Invalid or Expired Link
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              This password recovery link has either expired or has already been used. Please request a new link from the login page.
            </p>
          </div>
          <button
            onClick={onGoToLogin}
            className="w-full py-3 rounded-xl bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] font-heading font-black text-xs uppercase tracking-wider transition-all shadow-lime-glow-sm cursor-pointer"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

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
              Reset Password
            </h2>
            <p className="text-[11px] text-gray-400">BidWars IPL Tournament Platform</p>
          </div>
        </div>

        {/* Verified Account Identifier */}
        <div className="bg-[#12142A] border border-[#1E2246] rounded-xl p-3.5 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
              Resetting Password For
            </span>
            <span className="text-sm font-heading font-black text-white">
              {accountUsername || 'BidWars Player'}
            </span>
            {accountEmail && (
              <span className="text-[10px] text-gray-500 font-mono block">
                {accountEmail}
              </span>
            )}
          </div>
          <span className="px-2 py-1 rounded text-[9px] font-black uppercase bg-[#C8FF3D]/15 text-[#C8FF3D] border border-[#C8FF3D]/30 shrink-0">
            Verified Account
          </span>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success State */}
        {isSuccess ? (
          <div className="space-y-5 text-center py-2">
            <div className="w-14 h-14 rounded-2xl bg-[#C8FF3D]/20 border border-[#C8FF3D]/40 text-[#C8FF3D] flex items-center justify-center mx-auto shadow-lime-glow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="font-heading font-black text-lg text-white uppercase tracking-wider">
                Password Updated!
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Your password has been successfully reset. You can now sign in to your BidWars account with your new password.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={handleCompleteAndRedirect}
                className="w-full py-3 rounded-xl bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] font-heading font-black text-xs uppercase tracking-wider transition-all shadow-lime-glow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Proceed to Sign In ({countdown}s)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Password Form */
          <form onSubmit={handleResetSubmit} className="space-y-4">
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  autoFocus
                  className="w-full pl-10 pr-10 py-2.5 bg-[#12142A] border border-[#2A2F60] focus:border-[#C8FF3D] rounded-xl text-white placeholder-gray-500 text-xs font-semibold focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {strength && (
                <div className="space-y-1 pt-1">
                  <div className="h-1 w-full bg-[#1E2246] rounded-full overflow-hidden">
                    <div className={`h-full ${strength.bar} transition-all duration-300`} />
                  </div>
                  <div className="text-[10px] flex justify-between text-gray-400">
                    <span>Password Strength:</span>
                    <span className={`font-bold ${strength.color}`}>{strength.label}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#12142A] border border-[#2A2F60] focus:border-[#C8FF3D] rounded-xl text-white placeholder-gray-500 text-xs font-semibold focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] font-heading font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(200,255,61,0.25)] hover:scale-[1.02] cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}

        {/* Security Footer */}
        <div className="pt-2 border-t border-[#1E2246] flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
          <ShieldCheck className="w-3.5 h-3.5 text-[#C8FF3D]" />
          <span>Encrypted and secured via Supabase Auth</span>
        </div>
      </div>
    </div>
  );
};

