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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0B14]/80 backdrop-blur-md animate-fadeIn font-body">
      <div className="bg-[#12142A] max-w-md w-full rounded-3xl p-6 sm:p-8 border border-[#23274D] shadow-2xl relative text-white">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#9E9EB8] hover:text-white transition-colors p-1.5 rounded-xl hover:bg-[#181B38]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-[#0A0B14] text-[#FFC93D] flex items-center justify-center border border-[#23274D]">
            <Lock className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-heading font-black uppercase tracking-tight text-lg text-white">Private Room Access</h3>
            <p className="text-xs text-[#9E9EB8]">
              Room: <strong className="text-[#FFC93D] font-number font-bold">{roomCode}</strong>
              {roomName ? ` · ${roomName}` : ''}
            </p>
          </div>
        </div>

        {displayError && (
          <div className="mb-4 bg-[#FF3B5C]/15 border border-[#FF3B5C]/30 text-[#FF3B5C] px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-heading font-extrabold uppercase tracking-wider text-[#9E9EB8] mb-2">
              Room Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter room password..."
                className="w-full bg-[#0A0B14] border border-[#23274D] focus:border-[#C8FF3D] focus:ring-1 focus:ring-[#C8FF3D] rounded-xl px-4 py-3 text-sm text-white placeholder-[#62658A] outline-none transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-[#9E9EB8] hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !password.trim()}
            className="w-full py-3.5 px-4 rounded-xl bg-[#C8FF3D] hover:bg-[#B5F522] text-[#0A0B14] text-xs font-heading font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(200,255,61,0.3)] flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span>{isLoading ? 'Verifying...' : 'Unlock Auction Room'}</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </form>
      </div>
    </div>
  );
};
