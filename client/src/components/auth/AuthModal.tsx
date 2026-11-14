import React, { useState, useEffect } from 'react';
import { X, Trophy, Lock, User, Mail, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { authService, AuthUser } from '../../services/auth';

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
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Live username availability check during registration
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameFeedback, setUsernameFeedback] = useState<string>('');

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setSuccessMsg(null);
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
        setUsernameFeedback(res.available ? 'Username is available' : 'This username is already taken');
      } catch {
        setUsernameAvailable(null);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username, mode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (mode === 'register') {
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

        const res = await authService.register(username, password, confirmPassword, recoveryEmail);
        if (res.success) {
          const user = authService.getUser();
          if (user) onSuccess(user);
        } else {
          setError(res.error || 'Registration failed');
        }
      } else if (mode === 'login') {
        const res = await authService.login(username, password);
        if (res.success) {
          const user = authService.getUser();
          if (user) onSuccess(user);
        } else {
          setError(res.error || 'Invalid username or password');
        }
      } else if (mode === 'forgot') {
        if (!recoveryEmail.trim()) {
          setError('Please enter your recovery email.');
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('New password must be at least 6 characters.');
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setIsLoading(false);
          return;
        }

        const res = await authService.resetPassword(username, recoveryEmail, password, confirmPassword);
        if (res.success) {
          setSuccessMsg(res.message || 'Password reset successfully! Please log in with your new password.');
          setTimeout(() => {
            setMode('login');
            setPassword('');
            setConfirmPassword('');
            setError(null);
          }, 2000);
        } else {
          setError(res.error || 'Password reset failed');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

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
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1E2246] transition-colors"
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
              }}
              className={`py-2 rounded-lg transition-all ${
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
              }}
              className={`py-2 rounded-lg transition-all ${
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
          <div className="p-3 bg-[#FF3B5C]/10 border border-[#FF3B5C]/30 rounded-xl text-[#FF3B5C] text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-[#C8FF3D]/10 border border-[#C8FF3D]/30 rounded-xl text-[#C8FF3D] text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Input */}
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

          {/* Recovery Email Input (Register / Forgot mode) */}
          {mode === 'register' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
                <span>Recovery Email</span>
                <span className="text-[10px] text-[#C8FF3D] font-mono">Optional</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={recoveryEmail}
                  onChange={e => setRecoveryEmail(e.target.value)}
                  placeholder="name@example.com (for password recovery)"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#12142A] border border-[#2A2F60] focus:border-[#C8FF3D] rounded-xl text-white placeholder-gray-500 text-xs font-semibold focus:outline-none transition-colors"
                />
              </div>
              <p className="text-[10px] text-gray-500 leading-tight">
                Used strictly to recover your account if you forget your password. Never exposed to other players.
              </p>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">
                Registered Recovery Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={recoveryEmail}
                  onChange={e => setRecoveryEmail(e.target.value)}
                  placeholder="The email you registered with"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#12142A] border border-[#2A2F60] focus:border-[#C8FF3D] rounded-xl text-white placeholder-gray-500 text-xs font-semibold focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                {mode === 'forgot' ? 'New Password' : 'Password'}
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setError(null);
                  }}
                  className="text-[10px] text-[#C8FF3D] hover:underline"
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password (Register / Forgot mode) */}
          {(mode === 'register' || mode === 'forgot') && (
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
              disabled={isLoading || (mode === 'register' && usernameAvailable === false)}
              className="w-full py-3 rounded-xl bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] font-heading font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(200,255,61,0.25)] hover:scale-[1.02] cursor-pointer disabled:opacity-50"
            >
              {isLoading
                ? 'Processing...'
                : mode === 'login'
                ? 'Sign In to BidWars'
                : mode === 'register'
                ? 'Create BidWars Account'
                : 'Reset Password'}
            </button>
          </div>

          {mode === 'forgot' && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className="text-xs text-gray-400 hover:text-white underline"
              >
                &larr; Back to Sign In
              </button>
            </div>
          )}
        </form>

        {/* Security Footer */}
        <div className="pt-2 border-t border-[#1E2246] flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
          <ShieldCheck className="w-3.5 h-3.5 text-[#C8FF3D]" />
          <span>Passkeys &amp; profiles protected by Supabase Auth &amp; PostgreSQL RLS</span>
        </div>
      </div>
    </div>
  );
};
