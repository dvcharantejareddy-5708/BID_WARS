import React, { useState, useEffect } from 'react';
import { X, User, ShieldCheck, Mail, Sparkles, CheckCircle2, AlertCircle, Loader2, Copy, Check, Lock, Eye, EyeOff, KeyRound } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  // In-Game Name state
  const [inGameName, setInGameName] = useState(user.username || user.inGameName || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    setInGameName(user.username || user.inGameName || '');
  }, [user, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError(null);
      setPasswordSuccess(null);
    }
  }, [isOpen]);

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

  const handleSaveName = async (e: React.FormEvent) => {
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Current password is required.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('New password cannot be the same as your current password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await authService.changePassword(currentPassword, newPassword, confirmPassword);
      if (res.success) {
        setPasswordSuccess(res.message || 'Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(res.error || 'Failed to change password.');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Network error while changing password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const copyUserId = () => {
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0A0B14] border border-[#2A2F60] rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-7 space-y-5">
        {/* Top Glow Banner */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#C8FF3D] via-[#7C5CFF] to-[#FF3B5C]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1E2246]">
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5 text-[#C8FF3D]" />
            <h3 className="font-heading font-black text-lg text-white uppercase tracking-wider">
              Account &amp; Security Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1E2246] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-2 p-1 bg-[#12142A] border border-[#1E2246] rounded-xl text-xs font-bold font-heading uppercase tracking-wider">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'profile'
                ? 'bg-[#C8FF3D] text-[#0A0B14] shadow-lime-glow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile &amp; Name</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'security'
                ? 'bg-[#C8FF3D] text-[#0A0B14] shadow-lime-glow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Change Password</span>
          </button>
        </div>

        {/* Profile Card Summary */}
        <div className="bg-[#12142A] border border-[#1E2246] rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#7C5CFF]/30 text-[#C8FF3D] font-black text-xl flex items-center justify-center border border-[#7C5CFF] shrink-0">
            {(user.username || user.inGameName || 'P').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-heading font-black text-white uppercase truncate">{user.username || user.inGameName}</span>
              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-[#C8FF3D]/15 text-[#C8FF3D] border border-[#C8FF3D]/30 shrink-0">
                Verified
              </span>
            </div>
            {user.email && (
              <p className="text-xs text-gray-400 flex items-center gap-1.5 truncate">
                <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                <span className="truncate">{user.email}</span>
              </p>
            )}
            <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono">
              <span>UUID: {user.id.slice(0, 16)}...</span>
              <button
                onClick={copyUserId}
                className="hover:text-white transition-colors cursor-pointer"
                title="Copy permanent UUID"
              >
                {copiedId ? <Check className="w-3 h-3 text-[#C8FF3D]" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* TAB 1: Profile & Name */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

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
                    className="text-xs font-heading font-bold uppercase text-[#C8FF3D] hover:underline cursor-pointer"
                  >
                    Edit Name
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setInGameName(user.username || user.inGameName || '');
                    }}
                    className="text-xs font-heading font-bold uppercase text-gray-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {!isEditing ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#0A0B14] border border-[#1E2246]">
                  <span className="text-base font-heading font-black text-white">
                    {user.username || user.inGameName}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-gray-400">
                    Displayed in Tournaments
                  </span>
                </div>
              ) : (
                <form onSubmit={handleSaveName} className="space-y-3">
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
                      className="px-3 py-1.5 rounded-lg bg-[#0A0B14] text-xs font-bold uppercase text-gray-400 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!isAvailable || isChecking || isSaving}
                      className="px-4 py-1.5 rounded-lg bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] text-xs font-heading font-black uppercase tracking-wider disabled:opacity-40 cursor-pointer"
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
          </div>
        )}

        {/* TAB 2: Change Password */}
        {activeTab === 'security' && (
          <form onSubmit={handleChangePassword} className="space-y-4">
            {passwordError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-[#C8FF3D]/10 border border-[#C8FF3D]/30 rounded-xl text-[#C8FF3D] text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {/* Current Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">
                Current Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-[#12142A] border border-[#2A2F60] focus:border-[#C8FF3D] rounded-xl text-white placeholder-gray-500 text-xs font-semibold focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-[#12142A] border border-[#2A2F60] focus:border-[#C8FF3D] rounded-xl text-white placeholder-gray-500 text-xs font-semibold focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-[#12142A] border border-[#2A2F60] focus:border-[#C8FF3D] rounded-xl text-white placeholder-gray-500 text-xs font-semibold focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isChangingPassword}
              className="w-full py-2.5 rounded-xl bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] font-heading font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(200,255,61,0.25)] hover:scale-[1.01] cursor-pointer disabled:opacity-50"
            >
              {isChangingPassword ? 'Verifying & Updating...' : 'Update Password'}
            </button>
          </form>
        )}

        {/* Security & Permanent Data Note */}
        <div className="bg-[#12142A]/60 p-3.5 rounded-xl border border-[#1E2246] flex items-start gap-2.5 text-xs text-[#8F9CAE]">
          <ShieldCheck className="w-4 h-4 text-[#C8FF3D] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="text-white font-bold block">Permanent Cloud Security Active</span>
            <p className="text-[11px]">
              Passwords are encrypted and verified through Supabase Auth. Tournament states, squads, and stats are preserved securely.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#12142A] hover:bg-[#1E2246] text-white text-xs font-heading font-black uppercase tracking-wider border border-[#2A2F60] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
