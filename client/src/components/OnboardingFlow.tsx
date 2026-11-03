import React, { useState } from 'react';
import { Check, User, ArrowLeft, ArrowRight, Lock, AlertCircle } from 'lucide-react';
import { IPLTeamId, IPL_FRANCHISES, RoomMember } from '../types.js';
import { TeamLogo } from './TeamLogo.js';

interface OnboardingFlowProps {
  roomCode: string;
  initialNickname?: string;
  members: Record<string, RoomMember>;
  myMemberId?: string;
  isAuctionActive?: boolean;
  onConfirmSelection: (nickname: string, teamId: IPLTeamId) => void;
  onBackToLanding: () => void;
  isSubmitting: boolean;
  errorMessage?: string;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  roomCode,
  initialNickname = '',
  members,
  myMemberId,
  isAuctionActive = false,
  onConfirmSelection,
  onBackToLanding,
  isSubmitting,
  errorMessage
}) => {
  const [step, setStep] = useState<'name' | 'franchise'>(initialNickname ? 'franchise' : 'name');
  const [nickname, setNickname] = useState(initialNickname);
  const [selectedTeamId, setSelectedTeamId] = useState<IPLTeamId | null>(null);
  const [nameError, setNameError] = useState('');

  const teamOccupants: Record<IPLTeamId, { memberId: string; nickname: string; isBot: boolean }> = {} as any;
  Object.values(members).forEach(m => {
    if (m.teamId) {
      teamOccupants[m.teamId] = {
        memberId: m.id,
        nickname: m.nickname,
        isBot: m.isBot
      };
    }
  });

  const allTeams: IPLTeamId[] = ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'PBKS', 'DC', 'GT', 'LSG'];
  const availableTeams = allTeams.filter(teamId => {
    const occupant = teamOccupants[teamId];
    return !occupant || occupant.memberId === myMemberId;
  });
  const isRoomFull = availableTeams.length === 0;

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nickname.trim();
    if (!clean) {
      setNameError('Please enter a display name');
      return;
    }
    if (clean.length < 2) {
      setNameError('Name must be at least 2 characters');
      return;
    }
    if (!/^[a-zA-Z0-9_\-\s]+$/.test(clean)) {
      setNameError('Name can only contain letters, numbers, spaces, and hyphens');
      return;
    }
    setNameError('');
    setStep('franchise');
  };

  const handleTeamClick = (teamId: IPLTeamId) => {
    const occupant = teamOccupants[teamId];
    if (!occupant || occupant.memberId === myMemberId) {
      setSelectedTeamId(teamId);
    }
  };

  const handleFinalConfirm = () => {
    if (!selectedTeamId) return;
    onConfirmSelection(nickname.trim(), selectedTeamId);
  };

  return (
    <div className="min-h-screen bg-[#0A0B14] text-white flex flex-col justify-center items-center px-4 py-8 relative selection:bg-[#C8FF3D]/30 selection:text-white font-body">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#7C5CFF]/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl mx-auto">
        {/* Navigation & Room Info */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={step === 'franchise' && !initialNickname ? () => setStep('name') : onBackToLanding}
            className="flex items-center gap-2 text-xs font-heading font-extrabold uppercase tracking-wider text-[#9E9EB8] hover:text-white transition-colors bg-[#12142A] px-4 py-2.5 rounded-xl border border-[#23274D] shadow-md"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{step === 'franchise' && !initialNickname ? 'Change Name' : 'Leave Room'}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-number font-bold text-[#FFC93D] bg-[#12142A] border border-[#23274D] px-4 py-2 rounded-xl shadow-md">
              ROOM: {roomCode}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 bg-[#FF3B5C]/15 border border-[#FF3B5C]/30 text-[#FF3B5C] px-4 py-3 rounded-xl flex items-center gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Live Auction In Progress Badge */}
        {isAuctionActive && (
          <div className="mb-5 bg-[#C8FF3D]/10 border border-[#C8FF3D]/30 text-[#C8FF3D] px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-md">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C8FF3D] animate-ping" />
              <span className="font-heading font-extrabold uppercase tracking-wider">Live Auction In Progress</span>
            </div>
            <span className="text-[11px] text-[#9E9EB8]">Pick any open franchise to enter active bidding</span>
          </div>
        )}

        {/* Room Full Notice */}
        {isRoomFull && (
          <div className="mb-5 bg-[#FF3B5C]/15 border border-[#FF3B5C]/40 text-[#FF3B5C] px-4 py-3.5 rounded-2xl flex items-center gap-3 text-xs">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-heading font-black text-sm uppercase">Room is Full</p>
              <p className="text-[#9E9EB8] mt-0.5">
                All 10 IPL franchises have already been claimed by other participants.
              </p>
            </div>
          </div>
        )}

        {/* STEP 1: ENTER NAME */}
        {step === 'name' && (
          <div className="max-w-md mx-auto bg-[#12142A] rounded-3xl p-6 sm:p-8 border border-[#23274D] shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[#0A0B14] text-[#C8FF3D] flex items-center justify-center mx-auto mb-3.5 border border-[#23274D]">
                <User className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-black font-heading uppercase tracking-tight text-white">Enter Your Name</h2>
              <p className="text-xs text-[#9E9EB8] mt-1">
                Your manager display name during live bidding and on the franchise roster.
              </p>
            </div>

            <form onSubmit={handleNameSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-heading font-extrabold uppercase tracking-wider text-[#9E9EB8] mb-2">
                  Player Display Name
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  maxLength={24}
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value);
                    setNameError('');
                  }}
                  placeholder="e.g. MasterBlaster, ThalaFan"
                  className="w-full bg-[#0A0B14] border border-[#23274D] focus:border-[#C8FF3D] focus:ring-1 focus:ring-[#C8FF3D] rounded-xl px-4 py-3 text-base text-white placeholder-[#62658A] outline-none transition-all"
                />
                {nameError && (
                  <p className="text-xs text-[#FF3B5C] mt-2 font-medium">{nameError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={!nickname.trim()}
                className="w-full bg-[#C8FF3D] hover:bg-[#B5F522] text-[#0A0B14] font-heading font-black uppercase tracking-wider py-4 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(200,255,61,0.3)] flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed group text-sm"
              >
                <span>Select IPL Franchise</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 stroke-[3]" />
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: SELECT FRANCHISE */}
        {step === 'franchise' && (
          <div className="bg-[#12142A] rounded-3xl p-6 sm:p-8 border border-[#23274D] shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#23274D]">
              <div>
                <span className="text-xs text-[#C8FF3D] font-heading font-extrabold uppercase tracking-wider">Step 2 of 2</span>
                <h2 className="text-2xl sm:text-3xl font-black font-heading uppercase tracking-tight text-white">Select Your Franchise</h2>
                <p className="text-xs text-[#9E9EB8] mt-0.5">
                  Manager: <strong className="text-white">{nickname}</strong>. Exactly one human/bot per franchise.
                </p>
              </div>

              {selectedTeamId && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFinalConfirm}
                    disabled={isSubmitting}
                    className="bg-[#C8FF3D] hover:bg-[#B5F522] text-[#0A0B14] font-heading font-black uppercase tracking-wider py-3 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(200,255,61,0.35)] flex items-center gap-2 text-sm disabled:opacity-30"
                  >
                    <span>
                      {isSubmitting 
                        ? 'Joining...' 
                        : isAuctionActive 
                        ? `Enter Live Auction with ${selectedTeamId}` 
                        : `Confirm ${selectedTeamId}`}
                    </span>
                    <Check className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              )}
            </div>

            {/* 10 FRANCHISES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {allTeams.map((teamId) => {
                const team = IPL_FRANCHISES[teamId];
                const occupant = teamOccupants[teamId];
                const isTakenByOther = occupant && occupant.memberId !== myMemberId;
                const isSelected = selectedTeamId === teamId;

                return (
                  <div
                    key={teamId}
                    onClick={() => !isTakenByOther && handleTeamClick(teamId)}
                    className={`relative rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between border ${
                      isTakenByOther
                        ? 'opacity-35 cursor-not-allowed bg-[#0A0B14] border-[#23274D]'
                        : isSelected
                        ? 'ring-2 ring-[#C8FF3D] shadow-[0_0_20px_rgba(200,255,61,0.25)] bg-[#0A0B14] border-[#C8FF3D] cursor-pointer transform scale-[1.02]'
                        : 'bg-[#0A0B14] border-[#23274D] hover:border-[#C8FF3D]/50 hover:bg-[#181B38] cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <TeamLogo teamId={teamId} className="w-12 h-12 drop-shadow-sm" />

                      {isTakenByOther ? (
                        <span className="flex items-center gap-1 text-[10px] font-heading font-extrabold bg-[#FF3B5C]/15 text-[#FF3B5C] border border-[#FF3B5C]/30 px-2 py-0.5 rounded">
                          <Lock className="w-2.5 h-2.5" />
                          TAKEN
                        </span>
                      ) : isSelected ? (
                        <span className="flex items-center gap-1 text-[10px] font-heading font-extrabold bg-[#C8FF3D] text-[#0A0B14] px-2 py-0.5 rounded">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                          SELECTED
                        </span>
                      ) : (
                        <span className="text-[10px] font-heading font-extrabold bg-[#C8FF3D]/10 text-[#C8FF3D] border border-[#C8FF3D]/30 px-2 py-0.5 rounded">
                          OPEN
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-heading font-bold text-sm text-white leading-tight uppercase">
                        {team.name}
                      </h4>
                      <p className="text-[11px] text-[#9E9EB8] mt-0.5">
                        {team.city} · {team.emblemText}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#23274D]">
                      {isTakenByOther ? (
                        <span className="text-[11px] text-[#FF3B5C] font-medium truncate block">
                          Manager: {occupant.nickname}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#9E9EB8]">
                          Purse: <strong className="text-[#FFC93D] font-number font-bold">₹120 Cr</strong>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedTeamId && (
              <div className="mt-6 pt-4 border-t border-[#23274D] sm:hidden">
                <button
                  onClick={handleFinalConfirm}
                  disabled={isSubmitting}
                  className="w-full bg-[#C8FF3D] hover:bg-[#B5F522] text-[#0A0B14] font-heading font-black uppercase tracking-wider py-4 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(200,255,61,0.3)] flex items-center justify-center gap-2 text-sm disabled:opacity-30"
                >
                  <span>{isSubmitting ? 'Reserving...' : `Confirm ${IPL_FRANCHISES[selectedTeamId].name}`}</span>
                  <Check className="w-4 h-4 stroke-[3]" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
