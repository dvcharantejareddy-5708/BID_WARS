import React, { useState, useEffect } from 'react';
import { X, Trophy, Lock, User, Mail, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { authService, AuthService, AuthUser } from '../../services/auth';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register' | 'forgot';
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gmail, setGmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Unverified email handling
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // Forgot password cooldown (prevents email spam)
  const [forgotCooldown, setForgotCooldown] = useState<number>(0);

  useEffect(() => {
    if (forgotCooldown <= 0) return;
    const timer = setTimeout(() => {
      setForgotCooldown(c => c - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [forgotCooldown]);

  // Live username availability check during registration
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameFeedback, setUsernameFeedback] = useState<string>('');

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setSuccessMsg(null);
    setUnverifiedEmail(null);
    setResendStatus(null);
  }, [initialMode, isOpen]);

  // Debounced username check for register mode
  useEffect(() => {
    if (mode !== 'register') {
      setUsernameAvailable(null);
      return;
    }

    const clean = username.trim();
    if (clean.length < 3) {
      setUsernameAvailable(null);
      setUsernameFeedback('');
      return;
    }

    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(clean)) {
      setUsernameAvailable(false);
      setUsernameFeedback('3-20 characters: letters, numbers, underscores or hyphens only');
      return;
    }

    setIsCheckingUsername(true);
    const timer = setTimeout(async () => {
      try {
        const res = await authService.checkUsernameAvailable(clean);
        setUsernameAvailable(res.available);
        setUsernameFeedback(res.message || (res.available ? 'Username is available' : 'This username is already taken'));
      } catch {
        setUsernameAvailable(null);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username, mode]);

  // Real-time Gmail validation helper
  const getGmailFeedback = () => {
    if (!gmail) return null;
    const clean = gmail.trim().toLowerCase();
    if (!clean.includes('@')) {
      return { valid: false, text: 'Must include @gmail.com' };
    }
    if (!clean.endsWith('@gmail.com')) {
      return { valid: false, text: 'Only addresses ending in @gmail.com are accepted' };
    }
    const namePart = clean.slice(0, clean.indexOf('@'));
    if (!namePart || namePart.length < 1) {
      return { valid: false, text: 'Enter username before @gmail.com' };
    }
    return { valid: true, text: 'Valid Gmail address' };
  };

  const handleResendVerification = async () => {
    const targetEmail = unverifiedEmail || gmail.trim().toLowerCase();
    if (!targetEmail) return;

    setIsResending(true);
    setResendStatus(null);
    try {
      const res = await authService.resendVerification(targetEmail);
      if (res.success) {
        setResendStatus(res.message || 'Verification email resent! Please check your Gmail.');
      } else {
        setResendStatus(`Failed: ${res.error || 'Could not resend email'}`);
      }
    } catch {
      setResendStatus('Failed to send request. Check your connection.');
    } finally {
      setIsResending(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setResendStatus(null);
    setIsLoading(true);

    try {
      if (mode === 'register') {
        const emailValidation = AuthService.validateGmail(gmail);
        if (!emailValidation.valid) {
          setError(emailValidation.error || 'Invalid Gmail address');
          setIsLoading(false);
          return;
        }

        if (password.length < 6) {
          setError('Password must be at least 6 characters long.');
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setIsLoading(false);
          return;
        }
        if (usernameAvailable === false) {
          setError('Please choose an available username.');
          setIsLoading(false);
          return;
        }

        const res = await authService.register(username, password, confirmPassword, gmail);
        if (res.success) {
          const user = authService.getUser();
          if (user) {
            onSuccess(user);
            onClose();
          }
        } else {
          setError(res.error || 'Registration failed');
        }
      } else if (mode === 'login') {
        const res = await authService.login(username, password);
        if (res.success) {
          const user = authService.getUser();
          if (user) {
            onSuccess(user);
            onClose();
          }
        } else {
          setError(res.error || 'Invalid username or password');
        }
      } else if (mode === 'forgot') {
        if (forgotCooldown > 0) {
          setError(`Please wait ${forgotCooldown} seconds before requesting another reset link.`);
          setIsLoading(false);
          return;
        }

        const emailValidation = AuthService.validateGmail(gmail);
        if (!emailValidation.valid) {
          setError(emailValidation.error || 'Invalid Gmail address');
          setIsLoading(false);
          return;
        }

        const res = await authService.forgotPassword(gmail);
        if (res.success) {
          setForgotCooldown(60);
          setSuccessMsg('If an account exists for this email, a password reset link has been sent.');
        } else {
          setError(res.error || 'Failed to send password reset request');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const gmailFeedback = mode === 'register' ? getGmailFeedback() : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0A0B14] border border-[#2A2F60] rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1E2246]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C8FF3D] to-[#7C5CFF] flex items-center justify-center shadow-lime-glow-sm">
              <Trophy className="w-5 h-5 text-[#0A0B14]" />
            </div>
            <div>
              <h3 className="font-heading font-black text-lg text-white uppercase tracking-wider">
                {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Reset Password'}
              </h3>
              <p className="text-[11px] text-gray-400">BidWars IPL Tournament Platform</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1E2246] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        {mode !== 'forgot' && (
          <div className="grid grid-cols-2 p-1 bg-[#12142A] border border-[#1E2246] rounded-xl text-xs font-bold font-heading uppercase tracking-wider">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMsg(null);
                setUnverifiedEmail(null);
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-[#C8FF3D] text-[#0A0B14] shadow-lime-glow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
                setSuccessMsg(null);
                setUnverifiedEmail(null);
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-[#C8FF3D] text-[#0A0B14] shadow-lime-glow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Alerts */}
        {error && (
          <div className="p-3 bg-[#FF3B5C]/10 border border-[#FF3B5C]/30 rounded-xl text-[#FF3B5C] text-xs font-semibold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <div>{error}</div>
              {unverifiedEmail && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isResending}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#FF3B5C]/20 hover:bg-[#FF3B5C]/30 text-white text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                    {isResending ? 'Sending...' : 'Resend Verification Email'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-[#C8FF3D]/10 border border-[#C8FF3D]/30 rounded-xl text-[#C8FF3D] text-xs font-semibold flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <div>{successMsg}</div>
              {unverifiedEmail && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isResending}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#C8FF3D]/20 hover:bg-[#C8FF3D]/30 text-white text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                    {isResending ? 'Resending...' : 'Resend Verification Email'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {resendStatus && (
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-300 text-xs flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            <span>{resendStatus}</span>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Input (Login & Register mode) */}
          {mode !== 'forgot' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
                <span>Username</span>
                {mode === 'register' && (
                  <span className="text-[10px] text-gray-500 font-normal">3-20 characters</span>
                )}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. CaptainKohli"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#12142A] border border-[#2A2F60] focus:border-[#C8FF3D] rounded-xl text-white placeholder-gray-500 text-xs font-semibold focus:outline-none transition-colors"
                />
              </div>
              {mode === 'register' && username.trim().length >= 3 && (
                <div className="text-[11px] flex items-center gap-1.5 mt-1 font-medium">
                  {isCheckingUsername ? (
                    <span className="text-gray-400">Checking availability...</span>
                  ) : usernameAvailable ? (
                    <span className="text-[#C8FF3D] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Username is available
                    </span>
                  ) : usernameAvailable === false ? (
                    <span className="text-[#FF3B5C] flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {usernameFeedback || 'Username is taken'}
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* Mandatory Gmail Input (Register mode) */}
          {mode === 'register' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
                <span>Gmail Address</span>
                <span className="text-[10px] text-[#C8FF3D] font-mono">Compulsory (@gmail.com)</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={gmail}
                  onChange={e => setGmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#12142A] border border-[#2A2F60] focus:border-[#C8FF3D] rounded-xl text-white placeholder-gray-500 text-xs font-semibold focus:outline-none transition-colors"
                />
              </div>
              {gmailFeedback && (
                <div className={`text-[11px] flex items-center gap-1 mt-1 font-medium ${
                  gmailFeedback.valid ? 'text-[#C8FF3D]' : 'text-[#FF3B5C]'
                }`}>
                  {gmailFeedback.valid ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  <span>{gmailFeedback.text}</span>
                </div>
              )}
              <p className="text-[10px] text-gray-500 leading-tight">
                A verification link will be sent to this Gmail address. You must verify ownership before playing.
              </p>
            </div>
          )}

          {/* Registered Gmail Input (Forgot Password mode) */}
          {mode === 'forgot' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">
                Registered Gmail Address (@gmail.com)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={gmail}
                  onChange={e => setGmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#12142A] border border-[#2A2F60] focus:border-[#C8FF3D] rounded-xl text-white placeholder-gray-500 text-xs font-semibold focus:outline-none transition-colors"
                />
              </div>
              <p className="text-[10px] text-gray-500 leading-tight">
                Enter your registered Gmail address. We will send an account recovery link to reset your password.
              </p>
            </div>
          )}

          {/* Password Input (Login & Register mode) */}
          {mode !== 'forgot' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[10px] text-[#C8FF3D] hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
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
            </div>
          )}

          {/* Confirm Password (Register mode) */}
          {mode === 'register' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#12142A] border border-[#2A2F60] focus:border-[#C8FF3D] rounded-xl text-white placeholder-gray-500 text-xs font-semibold focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || (mode === 'register' && usernameAvailable === false) || (mode === 'forgot' && forgotCooldown > 0)}
              className="w-full py-3 rounded-xl bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] font-heading font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(200,255,61,0.25)] hover:scale-[1.02] cursor-pointer disabled:opacity-50"
            >
              {isLoading
                ? 'Processing...'
                : mode === 'login'
                ? 'Sign In to BidWars'
                : mode === 'register'
                ? 'Create BidWars Account'
                : forgotCooldown > 0
                ? `Resend in ${forgotCooldown}s`
                : 'Send Reset Link'}
            </button>
          </div>

          {mode === 'forgot' && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-xs text-gray-400 hover:text-white underline cursor-pointer"
              >
                &larr; Back to Sign In
              </button>
            </div>
          )}
        </form>

        {/* Security Footer */}
        <div className="pt-2 border-t border-[#1E2246] flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
          <ShieldCheck className="w-3.5 h-3.5 text-[#C8FF3D]" />
          <span>Accounts &amp; Gmail verification protected by Supabase Auth</span>
        </div>
      </div>
    </div>
  );
};
