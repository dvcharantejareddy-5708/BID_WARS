import React, { useState } from 'react';
import { Lock, Eye, EyeOff, X, ArrowRight, AlertCircle } from 'lucide-react';

interface PasswordModalProps {
  roomCode: string;
  roomName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
  isLoading?: boolean;
  error?: string;
  errorMessage?: string;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({
  roomCode,
  roomName,
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  error,
  errorMessage
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const displayError = error || errorMessage;

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    onSubmit(password.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0D0D0D] max-w-md w-full rounded-2xl p-6 border border-[#292929] shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#B3B3B3] hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-cricket-400/10 text-cricket-400 flex items-center justify-center border border-cricket-400/20">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-white">Private Room Access</h3>
            <p className="text-xs text-[#B3B3B3]">
              Room: <strong className="text-white font-mono">{roomCode}</strong>
              {roomName ? ` · ${roomName}` : ''}
            </p>
          </div>
        </div>

        {displayError && (
          <div className="mb-4 bg-alert-500/15 border border-alert-500/30 text-alert-500 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#B3B3B3] mb-1.5">
              Room Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full bg-[#151515] border border-[#292929] focus:border-cricket-400 focus:ring-1 focus:ring-cricket-400 rounded-xl pl-4 pr-11 py-3 text-sm text-white placeholder-[#525252] outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B3B3B3] hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl bg-[#1E1E1E] hover:bg-[#292929] text-[#B3B3B3] hover:text-white text-xs font-semibold transition-all border border-[#292929]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="flex-1 py-3 px-4 rounded-xl bg-cricket-400 hover:bg-cricket-500 text-black font-display font-bold text-xs transition-all shadow-glow-green flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <span>{isLoading ? 'Verifying...' : 'Join Room'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
