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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn selection:bg-[#C8FF45] selection:text-black">
      <div className="bg-[#141F33] max-w-md w-full rounded-2xl p-6 border border-[#26354D] shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#9BAAC0] hover:text-[#F4F7FC] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#C8FF45]/10 text-[#C8FF45] flex items-center justify-center border border-[#C8FF45]/20">
            <Lock className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-heading font-black uppercase tracking-wide text-lg text-[#F4F7FC]">Private Room Access</h3>
            <p className="text-xs text-[#9BAAC0]">
              Room: <strong className="text-[#C8FF45] font-number font-black">{roomCode}</strong>
              {roomName ? ` · ${roomName}` : ''}
            </p>
          </div>
        </div>

        {displayError && (
          <div className="mb-4 bg-[#FF647C]/15 border border-[#FF647C]/30 text-[#FF647C] px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-heading font-bold uppercase tracking-wider text-[#9BAAC0] mb-1.5">
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
                className="w-full bg-[#0E1626] border border-[#26354D] focus:border-[#C8FF45] focus:ring-1 focus:ring-[#C8FF45] rounded-xl pl-4 pr-11 py-3 text-sm text-[#F4F7FC] placeholder-[#54627A] outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9BAAC0] hover:text-[#F4F7FC]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl bg-[#0E1626] hover:bg-[#1B2942] text-[#9BAAC0] hover:text-[#F4F7FC] text-xs font-heading font-bold uppercase tracking-wider transition-all border border-[#26354D]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="flex-1 py-3 px-4 rounded-xl bg-[#C8FF45] hover:bg-[#B0E635] text-black font-heading font-black text-xs uppercase tracking-wider transition-all shadow-glow-lime flex items-center justify-center gap-1.5 disabled:opacity-30"
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
