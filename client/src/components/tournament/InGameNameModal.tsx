import React, { useState, useEffect } from 'react';
import { ShieldCheck, Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { AuthUser, authService } from '../../services/auth';

interface InGameNameModalProps {
  isOpen: boolean;
  user: AuthUser;
  onSuccess: (inGameName: string) => void;
}

export const InGameNameModal: React.FC<InGameNameModalProps> = ({
  isOpen,
  user,
  onSuccess
}) => {
  const [name, setName] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Suggest initial name from Google name
    if (user.name) {
      const sanitized = user.name.replace(/[^a-zA-Z0-9_ -]/g, '').slice(0, 20).trim();
      if (sanitized.length >= 3) {
        setName(sanitized);
      }
    }
  }, [user]);

  // Real-time debounce check
  useEffect(() => {
    const clean = name.trim();
    if (clean.length < 3) {
      setIsAvailable(null);
      setStatusMessage('Name must be at least 3 characters.');
      return;
    }
    if (clean.length > 20) {
      setIsAvailable(false);
      setStatusMessage('Name must be 20 characters or fewer.');
      return;
    }
    if (!/^[a-zA-Z0-9_ -]{3,20}$/.test(clean)) {
      setIsAvailable(false);
      setStatusMessage('Only letters, numbers, spaces, underscores, and hyphens allowed.');
      return;
    }

    setIsChecking(true);
    const timer = setTimeout(async () => {
      const res = await authService.checkInGameNameAvailable(clean, user.id);
      setIsChecking(false);
      setIsAvailable(res.available);
      setStatusMessage(res.message);
    }, 350);

    return () => clearTimeout(timer);
  }, [name, user.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAvailable || isChecking) return;

    setIsSubmitting(true);
    setError(null);

    const res = await authService.setInGameName(name.trim());
    setIsSubmitting(false);

    if (res.success) {
      onSuccess(name.trim());
    } else {
      setError(res.error || 'Failed to register in-game name');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0A0B14] border border-[#2A2F60] rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#C8FF3D] via-[#7C5CFF] to-[#FF3B5C]" />

        {/* User Identity Preview */}
        <div className="flex items-center gap-3.5 bg-[#12142A] p-3.5 rounded-xl border border-[#1E2246]">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-11 h-11 rounded-full border-2 border-[#C8FF3D]" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-[#7C5CFF]/30 text-[#C8FF3D] font-black text-sm flex items-center justify-center border border-[#7C5CFF]">
              {user.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <span className="text-[10px] uppercase tracking-widest font-heading font-black text-[#8F9CAE] block">
              Google Verified Account
            </span>
            <p className="text-sm font-bold text-white truncate">{user.name}</p>
            {user.email && <p className="text-xs text-gray-400 truncate">{user.email}</p>}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#C8FF3D]">
            <Sparkles className="w-5 h-5" />
            <h2 className="text-xl font-heading font-black uppercase tracking-wider text-white">
              Create In-Game Name
            </h2>
          </div>
          <p className="text-xs text-[#8F9CAE] leading-relaxed">
            Choose your permanent display name for BidWars tournaments, live auctions, squad rosters, and scorecards.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-heading font-black uppercase tracking-wider text-gray-300 block">
              BidWars In-Game Name <span className="text-[#FF3B5C]">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                placeholder="e.g. CaptainCool, KingKohli, YorkerMaster"
                className="w-full px-4 py-3 rounded-xl bg-[#12142A] border border-[#1E2246] text-white placeholder-gray-500 text-sm font-bold focus:outline-none focus:border-[#C8FF3D] transition-colors"
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {isChecking && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
                {!isChecking && isAvailable === true && <CheckCircle2 className="w-4 h-4 text-[#C8FF3D]" />}
                {!isChecking && isAvailable === false && <AlertCircle className="w-4 h-4 text-[#FF3B5C]" />}
              </div>
            </div>

            {/* Helper status text */}
            <div className="flex items-center justify-between text-[11px]">
              <span className={isAvailable === true ? 'text-[#C8FF3D]' : isAvailable === false ? 'text-[#FF3B5C]' : 'text-gray-400'}>
                {statusMessage}
              </span>
              <span className="text-gray-500 font-mono text-[10px]">
                {name.trim().length}/20
              </span>
            </div>
          </div>

          <div className="bg-[#12142A]/60 p-3 rounded-xl border border-[#1E2246] text-[11px] text-[#8F9CAE] space-y-1">
            <div className="flex items-center gap-1.5 text-white font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C8FF3D]" />
              <span>Identity &amp; Privacy Rules</span>
            </div>
            <p>• Unique case-insensitive name visible to other tournament players.</p>
            <p>• Internal database UUIDs are never exposed in user interfaces.</p>
            <p>• Can be edited later in your profile settings.</p>
          </div>

          <button
            type="submit"
            disabled={!isAvailable || isChecking || isSubmitting}
            className={`w-full py-3.5 rounded-xl font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              isAvailable && !isChecking && !isSubmitting
                ? 'bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] shadow-[0_0_20px_rgba(200,255,61,0.3)] cursor-pointer'
                : 'bg-[#1E2246] text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving In-Game Name...</span>
              </>
            ) : (
              <span>Confirm &amp; Enter BidWars</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

