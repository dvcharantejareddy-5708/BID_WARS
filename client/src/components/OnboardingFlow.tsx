import React, { useState } from 'react';
import { Shield, Check, User, ArrowLeft, ArrowRight, Lock, AlertCircle } from 'lucide-react';
import { IPLTeamId, IPL_FRANCHISES, RoomMember } from '../types.js';

interface OnboardingFlowProps {
  roomCode: string;
  initialNickname?: string;
  members: Record<string, RoomMember>;
  myMemberId?: string;
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
  onConfirmSelection,
  onBackToLanding,
  isSubmitting,
  errorMessage
}) => {
  const [step, setStep] = useState<'name' | 'franchise'>(initialNickname ? 'franchise' : 'name');
  const [nickname, setNickname] = useState(initialNickname);
  const [selectedTeamId, setSelectedTeamId] = useState<IPLTeamId | null>(null);
  const [nameError, setNameError] = useState('');

  // Determine taken teams and occupant names
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
    // Can only click if free OR already occupied by current member
    if (!occupant || occupant.memberId === myMemberId) {
      setSelectedTeamId(teamId);
    }
  };

  const handleFinalConfirm = () => {
    if (!selectedTeamId) return;
    onConfirmSelection(nickname.trim(), selectedTeamId);
  };

  const allTeams: IPLTeamId[] = ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'PBKS', 'DC', 'GT', 'LSG'];

  return (
    <div className="min-h-screen bg-[#0B1020] text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative">
      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[25%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[130px]" />
        <div className="absolute bottom-[15%] right-[20%] w-[550px] h-[550px] bg-amber-500/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto">
        {/* Header Navigation & Step Indicator */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={step === 'franchise' && !initialNickname ? () => setStep('name') : onBackToLanding}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-cyan-300 transition-colors bg-navy-800/80 px-3 py-1.5 rounded-lg border border-navy-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{step === 'franchise' && !initialNickname ? 'Change Name' : 'Leave Room'}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-cyan-300 bg-navy-800/90 border border-cyan-400/30 px-2.5 py-1 rounded-md font-bold">
              ROOM: {roomCode}
            </span>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-4 bg-ruby-500/15 border border-ruby-500/40 text-ruby-200 px-4 py-3 rounded-xl flex items-center gap-2.5 text-sm">
            <AlertCircle className="w-4 h-4 text-ruby-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: ENTER PLAYER NAME */}
        {step === 'name' && (
          <div className="max-w-md mx-auto glass-panel rounded-2xl p-6 sm:p-8 border border-navy-600/70 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-cyan-400/20 text-cyan-300 flex items-center justify-center mx-auto mb-3 border border-cyan-400/30 shadow-glow-cyan">
                <User className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold font-display text-white">Enter Your Name</h2>
              <p className="text-xs text-slate-400 mt-1">
                This name will be displayed during bidding, in the lobby, and on the team roster.
              </p>
            </div>

            <form onSubmit={handleNameSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
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
                  className="w-full bg-navy-900/90 border border-navy-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl px-4 py-3 text-base text-white placeholder-slate-500 outline-none transition-all"
                />
                {nameError && (
                  <p className="text-xs text-ruby-400 mt-1.5 font-medium">{nameError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={!nickname.trim()}
                className="w-full bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-black font-display font-bold py-3 px-6 rounded-xl transition-all shadow-glow-cyan flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group text-sm"
              >
                <span>Select IPL Franchise</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: SELECT IPL FRANCHISE */}
        {step === 'franchise' && (
          <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-navy-600/70 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-navy-700/70">
              <div>
                <span className="text-xs text-cyan-400 font-bold uppercase tracking-wider">Step 2 of 2</span>
                <h2 className="text-2xl font-bold font-display text-white">Select Your IPL Franchise</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Playing as: <strong className="text-slate-200">{nickname}</strong>. Exactly one manager per franchise.
                </p>
              </div>

              {selectedTeamId && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFinalConfirm}
                    disabled={isSubmitting}
                    className="bg-emerald-400 hover:bg-emerald-300 text-black font-display font-bold py-2.5 px-6 rounded-xl transition-all shadow-glow-emerald flex items-center gap-2 text-sm disabled:opacity-50"
                  >
                    <span>{isSubmitting ? 'Reserving...' : `Confirm ${selectedTeamId}`}</span>
                    <Check className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              )}
            </div>

            {/* 10 IPL FRANCHISE CARDS GRID */}
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
                        ? 'opacity-40 cursor-not-allowed bg-navy-950/60 border-navy-800'
                        : isSelected
                        ? 'ring-2 ring-cyan-400 shadow-glow-cyan bg-navy-800/95 border-cyan-400 cursor-pointer transform scale-[1.02]'
                        : 'bg-navy-900/80 border-navy-700/80 hover:border-slate-500 hover:bg-navy-800/90 cursor-pointer'
                    }`}
                  >
                    {/* Top Team Badge & Tag */}
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-black font-display text-sm shadow-md"
                        style={{ backgroundColor: team.primaryColor, color: team.textColor }}
                      >
                        {team.shortName}
                      </div>

                      {/* Status Pill */}
                      {isTakenByOther ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold bg-ruby-500/20 text-ruby-300 border border-ruby-500/30 px-2 py-0.5 rounded-full">
                          <Lock className="w-2.5 h-2.5" />
                          TAKEN
                        </span>
                      ) : isSelected ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold bg-cyan-400 text-black px-2 py-0.5 rounded-full">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                          SELECTED
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          OPEN
                        </span>
                      )}
                    </div>

                    {/* Team Details */}
                    <div>
                      <h4 className="font-display font-bold text-sm text-white leading-tight">
                        {team.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                        {team.city} · {team.emblemText}
                      </p>
                    </div>

                    {/* Occupant Notice */}
                    <div className="mt-3 pt-2.5 border-t border-navy-700/60">
                      {isTakenByOther ? (
                        <span className="text-[11px] text-ruby-300 font-medium truncate block">
                          Controlled by: {occupant.nickname}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          Starting Purse: <strong className="text-slate-200">₹120 Cr</strong>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Confirm Action for mobile */}
            {selectedTeamId && (
              <div className="mt-6 pt-4 border-t border-navy-700/60 sm:hidden">
                <button
                  onClick={handleFinalConfirm}
                  disabled={isSubmitting}
                  className="w-full bg-emerald-400 hover:bg-emerald-300 text-black font-display font-bold py-3 px-6 rounded-xl transition-all shadow-glow-emerald flex items-center justify-center gap-2 text-sm disabled:opacity-50"
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
