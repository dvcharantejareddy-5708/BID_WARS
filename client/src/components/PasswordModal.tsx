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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18243A]/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white max-w-md w-full rounded-2xl p-6 border border-[#D8D8D1] shadow-2xl relative text-[#18243A]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#647084] hover:text-[#18243A] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#E6EDF8] text-[#173B78] flex items-center justify-center border border-[#D8D8D1]">
            <Lock className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-heading font-bold uppercase tracking-wide text-lg text-[#18243A]">Private Room Access</h3>
            <p className="text-xs text-[#647084]">
              Room: <strong className="text-[#173B78] font-number font-bold">{roomCode}</strong>
              {roomName ? ` · ${roomName}` : ''}
            </p>
          </div>
        </div>

        {displayError && (
          <div className="mb-4 bg-[#C74444]/10 border border-[#C74444]/30 text-[#C74444] px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-heading font-bold uppercase tracking-wider text-[#647084] mb-1.5">
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
                className="w-full bg-[#F3F0E8] border border-[#D8D8D1] focus:border-[#173B78] focus:ring-1 focus:ring-[#173B78] rounded-xl pl-4 pr-11 py-3 text-sm text-[#18243A] placeholder-[#647084] outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#647084] hover:text-[#18243A]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl bg-[#E6EDF8] hover:bg-[#D5E2F5] text-[#173B78] text-xs font-heading font-bold uppercase tracking-wider transition-all border border-[#D8D8D1]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="flex-1 py-3 px-4 rounded-xl bg-[#176B48] hover:bg-[#125438] text-white font-heading font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-30"
            >
              <span>{isLoading ? 'Verifying...' : 'Join Room'}</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
