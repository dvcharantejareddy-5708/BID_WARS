import React, { useState, useEffect } from 'react';
import { X, User, ShieldCheck, Mail, Sparkles, CheckCircle2, AlertCircle, Loader2, Copy, Check } from 'lucide-react';
import { AuthUser, authService } from '../../services/auth';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  user: AuthUser;
  onClose: () => void;
  onUpdated: (newName: string) => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  user,
  onClose,
  onUpdated
}) => {
  const [inGameName, setInGameName] = useState(user.inGameName || user.name || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    setInGameName(user.inGameName || user.name || '');
  }, [user, isOpen]);

  useEffect(() => {
    if (!isEditing) return;
    const clean = inGameName.trim();
    if (clean === user.inGameName) {
      setIsAvailable(true);
      setStatusMessage('Current In-Game Name');
      return;
    }
    if (clean.length < 3) {
      setIsAvailable(false);
      setStatusMessage('Must be at least 3 characters.');
      return;
    }
    if (clean.length > 20) {
      setIsAvailable(false);
      setStatusMessage('Must be 20 characters or fewer.');
      return;
    }
    if (!/^[a-zA-Z0-9_ -]{3,20}$/.test(clean)) {
      setIsAvailable(false);
      setStatusMessage('Only letters, numbers, spaces, underscores, and hyphens.');
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
  }, [inGameName, isEditing, user.id, user.inGameName]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAvailable || isChecking) return;

    setIsSaving(true);
    setError(null);
    const res = await authService.setInGameName(inGameName.trim());
    setIsSaving(false);

    if (res.success) {
      setIsEditing(false);
      onUpdated(inGameName.trim());
    } else {
      setError(res.error || 'Failed to update In-Game Name');
    }
  };

  const copyUserId = () => {
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0A0B14] border border-[#2A2F60] rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-7 space-y-6">
        {/* Top Glow Banner */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#C8FF3D] via-[#7C5CFF] to-[#FF3B5C]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1E2246]">
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5 text-[#C8FF3D]" />
            <h3 className="font-heading font-black text-lg text-white uppercase tracking-wider">
              Account &amp; Profile Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1E2246] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Profile Card */}
        <div className="bg-[#12142A] border border-[#1E2246] rounded-xl p-4 flex items-center gap-4">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-14 h-14 rounded-full border-2 border-[#C8FF3D] shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#7C5CFF]/30 text-[#C8FF3D] font-black text-xl flex items-center justify-center border border-[#7C5CFF] shrink-0">
              {user.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-heading font-black text-white uppercase">{user.name}</span>
              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-[#C8FF3D]/15 text-[#C8FF3D] border border-[#C8FF3D]/30">
                Google Verified
              </span>
            </div>
            {user.email && (
              <p className="text-xs text-gray-400 flex items-center gap-1.5 truncate">
                <Mail className="w-3.5 h-3.5 text-gray-500" />
                <span>{user.email}</span>
              </p>
            )}
            <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono">
              <span>UUID: {user.id.slice(0, 16)}...</span>
              <button
                onClick={copyUserId}
                className="hover:text-white transition-colors"
                title="Copy permanent UUID"
              >
                {copiedId ? <Check className="w-3 h-3 text-[#C8FF3D]" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* In-Game Name Section */}
        <div className="bg-[#12142A] border border-[#1E2246] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C8FF3D]" />
              <span className="text-xs font-heading font-black uppercase text-white tracking-wider">
                BidWars In-Game Name
              </span>
            </div>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs font-heading font-bold uppercase text-[#C8FF3D] hover:underline"
              >
                Edit Name
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsEditing(false);
                  setInGameName(user.inGameName || user.name || '');
                }}
                className="text-xs font-heading font-bold uppercase text-gray-400 hover:text-white"
              >
                Cancel
              </button>
            )}
          </div>

          {!isEditing ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0A0B14] border border-[#1E2246]">
              <span className="text-base font-heading font-black text-white">
                {user.inGameName || user.name}
              </span>
              <span className="text-[10px] uppercase font-bold text-gray-400">
                Displayed in Tournaments
              </span>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={inGameName}
                  onChange={(e) => setInGameName(e.target.value)}
                  maxLength={20}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0A0B14] border border-[#1E2246] text-white text-sm font-bold focus:outline-none focus:border-[#C8FF3D]"
                  autoFocus
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isChecking && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
                  {!isChecking && isAvailable === true && <CheckCircle2 className="w-4 h-4 text-[#C8FF3D]" />}
                  {!isChecking && isAvailable === false && <AlertCircle className="w-4 h-4 text-[#FF3B5C]" />}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className={isAvailable === true ? 'text-[#C8FF3D]' : 'text-[#FF3B5C]'}>
                  {statusMessage}
                </span>
                <span className="text-gray-500 font-mono text-[10px]">
                  {inGameName.trim().length}/20
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#0A0B14] text-xs font-bold uppercase text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isAvailable || isChecking || isSaving}
                  className="px-4 py-1.5 rounded-lg bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] text-xs font-heading font-black uppercase tracking-wider disabled:opacity-40"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          <p className="text-[11px] text-[#8F9CAE] leading-relaxed">
            Your in-game name is displayed across tournament lobbies, live auction bidding boards, franchise rosters, and match scorecards.
          </p>
        </div>

        {/* Security & Permanent Data Note */}
        <div className="bg-[#12142A]/60 p-3.5 rounded-xl border border-[#1E2246] flex items-start gap-2.5 text-xs text-[#8F9CAE]">
          <ShieldCheck className="w-4 h-4 text-[#C8FF3D] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="text-white font-bold block">Permanent Cloud Storage Active</span>
            <p className="text-[11px]">
              All tournament participations, squads, purses, and player stats are permanently linked to your Google Account UUID in Supabase PostgreSQL.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#12142A] hover:bg-[#1E2246] text-white text-xs font-heading font-black uppercase tracking-wider border border-[#2A2F60] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

