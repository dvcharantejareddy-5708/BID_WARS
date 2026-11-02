import React, { useState } from 'react';
import { Shield, Check, User, ArrowLeft, ArrowRight, Lock, AlertCircle } from 'lucide-react';
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
    <div className="min-h-screen bg-[#F3F0E8] text-[#18243A] flex flex-col justify-center items-center px-4 py-8 relative selection:bg-[#F0C65B] selection:text-[#18243A] font-body">
      <div className="relative z-10 w-full max-w-4xl mx-auto">
        {/* Navigation & Room Info */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={step === 'franchise' && !initialNickname ? () => setStep('name') : onBackToLanding}
            className="flex items-center gap-1.5 text-xs font-heading font-bold uppercase tracking-wider text-[#173B78] hover:text-[#122E5E] transition-colors bg-white px-3.5 py-2 rounded-xl border border-[#D8D8D1] shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{step === 'franchise' && !initialNickname ? 'Change Name' : 'Leave Room'}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-number font-bold text-[#173B78] bg-white border border-[#D8D8D1] px-3 py-1.5 rounded-xl shadow-sm">
              ROOM: {roomCode}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 bg-[#C74444]/10 border border-[#C74444]/30 text-[#C74444] px-4 py-3 rounded-xl flex items-center gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Live Auction In Progress Badge */}
        {isAuctionActive && (
          <div className="mb-4 bg-[#176B48]/10 border border-[#176B48]/30 text-[#176B48] px-4 py-3 rounded-xl flex items-center justify-between gap-2.5 text-xs shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#176B48] animate-ping" />
              <span className="font-heading font-bold uppercase tracking-wider">Live Auction In Progress</span>
            </div>
            <span className="text-[11px] text-[#647084]">Pick any available franchise to join active bidding</span>
          </div>
        )}

        {/* Room Full Notice */}
        {isRoomFull && (
          <div className="mb-4 bg-[#C74444]/10 border border-[#C74444]/40 text-[#C74444] px-4 py-3 rounded-xl flex items-center gap-3 text-xs">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-heading font-bold text-sm uppercase">Room is Full</p>
              <p className="text-[#647084] mt-0.5">
                All 10 IPL franchises have already been claimed by other participants.
              </p>
            </div>
          </div>
        )}

        {/* STEP 1: ENTER NAME */}
        {step === 'name' && (
          <div className="max-w-md mx-auto bg-white rounded-2xl p-6 sm:p-8 border border-[#D8D8D1] shadow-lg">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#E6EDF8] text-[#173B78] flex items-center justify-center mx-auto mb-3 border border-[#D8D8D1]">
                <User className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold font-heading uppercase tracking-wide text-[#18243A]">Enter Your Name</h2>
              <p className="text-xs text-[#647084] mt-1">
                Your manager display name during bidding and on the franchise roster.
              </p>
            </div>

            <form onSubmit={handleNameSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-heading font-bold uppercase tracking-wider text-[#647084] mb-1.5">
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
                  className="w-full bg-[#F3F0E8] border border-[#D8D8D1] focus:border-[#173B78] focus:ring-1 focus:ring-[#173B78] rounded-xl px-4 py-3 text-base text-[#18243A] placeholder-[#647084] outline-none transition-all"
                />
                {nameError && (
                  <p className="text-xs text-[#C74444] mt-1.5 font-medium">{nameError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={!nickname.trim()}
                className="w-full bg-[#176B48] hover:bg-[#125438] text-white font-heading font-bold uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed group text-sm"
              >
                <span>Select IPL Franchise</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 stroke-[3]" />
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: SELECT FRANCHISE */}
        {step === 'franchise' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#D8D8D1] shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-[#D8D8D1]">
              <div>
                <span className="text-xs text-[#176B48] font-heading font-bold uppercase tracking-wider">Step 2 of 2</span>
                <h2 className="text-2xl font-bold font-heading uppercase tracking-wide text-[#18243A]">Select Your IPL Franchise</h2>
                <p className="text-xs text-[#647084] mt-0.5">
                  Manager: <strong className="text-[#18243A]">{nickname}</strong>. Exactly one human/bot per franchise.
                </p>
              </div>

              {selectedTeamId && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFinalConfirm}
                    disabled={isSubmitting}
                    className="bg-[#176B48] hover:bg-[#125438] text-white font-heading font-bold uppercase tracking-wider py-2.5 px-6 rounded-xl transition-all shadow-md flex items-center gap-2 text-sm disabled:opacity-30"
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
                    className={`relative rounded-xl p-4 transition-all duration-200 flex flex-col justify-between border ${
                      isTakenByOther
                        ? 'opacity-40 cursor-not-allowed bg-[#F3F0E8] border-[#D8D8D1]'
                        : isSelected
                        ? 'ring-2 ring-[#176B48] shadow-md bg-[#E6EDF8] border-[#176B48] cursor-pointer transform scale-[1.02]'
                        : 'bg-[#F3F0E8]/50 border-[#D8D8D1] hover:border-[#173B78] hover:bg-white cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <TeamLogo teamId={teamId} className="w-11 h-11 shadow-sm" />

                      {isTakenByOther ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold bg-[#C74444]/15 text-[#C74444] border border-[#C74444]/30 px-2 py-0.5 rounded">
                          <Lock className="w-2.5 h-2.5" />
                          TAKEN
                        </span>
                      ) : isSelected ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold bg-[#176B48] text-white px-2 py-0.5 rounded">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                          SELECTED
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-[#176B48]/10 text-[#176B48] border border-[#176B48]/30 px-2 py-0.5 rounded">
                          OPEN
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-heading font-bold text-sm text-[#18243A] leading-tight uppercase">
                        {team.name}
                      </h4>
                      <p className="text-[11px] text-[#647084] mt-0.5">
                        {team.city} · {team.emblemText}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#D8D8D1]">
                      {isTakenByOther ? (
                        <span className="text-[11px] text-[#C74444] font-medium truncate block">
                          Controlled by: {occupant.nickname}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#647084]">
                          Starting Purse: <strong className="text-[#18243A] font-number font-bold">₹120 Cr</strong>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedTeamId && (
              <div className="mt-6 pt-4 border-t border-[#D8D8D1] sm:hidden">
                <button
                  onClick={handleFinalConfirm}
                  disabled={isSubmitting}
                  className="w-full bg-[#176B48] hover:bg-[#125438] text-white font-heading font-bold uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm disabled:opacity-30"
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
