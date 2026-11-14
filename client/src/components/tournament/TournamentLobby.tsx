import React, { useState } from 'react';
import { ArrowLeft, Users, Trophy, Play, CheckCircle2, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import { IPLTeamId, IPL_FRANCHISES } from '../../types';
import { AuthUser } from '../../services/auth';
import { Tournament } from '../../tournamentTypes';
import { TournamentApi } from '../../services/tournamentApi';

interface TournamentLobbyProps {
  tournament: Tournament;
  user: AuthUser;
  onBack: () => void;
  onEnterAuction: (roomCode: string) => void;
  onRefresh: () => void;
  onEnterHub: () => void;
}

export const TournamentLobby: React.FC<TournamentLobbyProps> = ({
  tournament,
  user,
  onBack,
  onEnterAuction,
  onRefresh,
  onEnterHub
}) => {
  const [selectedFranchise, setSelectedFranchise] = useState<IPLTeamId | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isHost = tournament.hostId === user.id;
  const myMember = tournament.members.find(m => m.userId === user.id);
  const hasClaimedTeam = Boolean(myMember);

  // Claimed franchise IDs
  const claimedFranchises = new Set(tournament.members.map(m => m.franchiseId));
  const allFranchises = Object.keys(IPL_FRANCHISES) as IPLTeamId[];
  const availableFranchises = allFranchises.filter(f => !claimedFranchises.has(f));

  const handleClaim = async () => {
    if (!selectedFranchise) return;
    setIsClaiming(true);
    setError(null);
    try {
      const res = await TournamentApi.joinTournament(tournament.id, {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        franchiseId: selectedFranchise
      });

      if (!res.success) {
        setError(res.error || 'Failed to claim franchise');
      } else {
        setSelectedFranchise(null);
        onRefresh();
      }
    } catch (err: any) {
      setError(err.message || 'Error claiming franchise');
    } finally {
      setIsClaiming(false);
    }
  };

  const handleStartAuction = async () => {
    setActionLoading(true);
    try {
      await TournamentApi.startAuction(tournament.id, user.id);
      onEnterAuction(tournament.roomCode);
    } catch (err: any) {
      setError(err.message || 'Error starting auction');
    } finally {
      setActionLoading(false);
    }
  };

  const handleImportSquads = async () => {
    setActionLoading(true);
    try {
      await TournamentApi.importAuctionSquads(tournament.id);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Error importing auction squads');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartLive = async () => {
    setActionLoading(true);
    try {
      await TournamentApi.startLiveTournament(tournament.id, user.id);
      onEnterHub();
    } catch (err: any) {
      setError(err.message || 'Error starting live tournament');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0B14] text-white p-4 md:p-8">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-[#12142A] border border-[#2A2F60] text-gray-400 hover:text-white hover:border-[#C8FF3D] transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider font-heading">
                {tournament.name}
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-[#C8FF3D]/10 text-[#C8FF3D] border border-[#C8FF3D]/30">
                {tournament.status}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Tournament ID: <span className="font-mono text-gray-200">{tournament.id}</span> • Overs: {tournament.matchOvers} • Teams: {tournament.members.length}/{tournament.teamsCount}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="p-2.5 rounded-xl bg-[#12142A] border border-[#2A2F60] text-gray-300 hover:text-white transition-colors"
            title="Refresh Lobby"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* If live or completed, allow jumping directly into hub */}
          {(tournament.status === 'TOURNAMENT_LIVE' || tournament.status === 'PLAYOFFS' || tournament.status === 'COMPLETED') && (
            <button
              onClick={onEnterHub}
              className="px-5 py-2.5 rounded-xl bg-[#C8FF3D] text-[#0A0B14] font-black uppercase text-xs tracking-wider shadow-[0_0_15px_rgba(200,255,61,0.25)] flex items-center gap-2"
            >
              <Trophy className="w-4 h-4" />
              Open Tournament Hub
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Claimed Franchises & Members */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#12142A] border border-[#2A2F60] rounded-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#1E2246] mb-5">
              <h2 className="text-lg font-black uppercase tracking-wider flex items-center gap-2">
                <Users className="w-5 h-5 text-[#C8FF3D]" />
                Franchise Roster ({tournament.members.length}/{tournament.teamsCount})
              </h2>
              <span className="text-xs text-gray-400">1 Google Account per team</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tournament.members.map(member => {
                const f = IPL_FRANCHISES[member.franchiseId];
                const isMe = member.userId === user.id;
                const teamData = tournament.teams[member.franchiseId];
                const squadCount = teamData?.squad?.length || 0;

                return (
                  <div
                    key={member.franchiseId}
                    className={`p-4 rounded-xl border transition-all ${
                      isMe
                        ? 'bg-[#1E2246] border-[#C8FF3D] shadow-[0_0_15px_rgba(200,255,61,0.15)]'
                        : 'bg-[#0D0E1A] border-[#2A2F60]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={f.logoUrl}
                          alt={f.name}
                          className="w-10 h-10 object-contain rounded-full bg-black/40 p-1"
                          onError={e => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div>
                          <div className="font-black text-sm text-white flex items-center gap-1.5">
                            {f.shortName}
                            {isMe && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#C8FF3D] text-[#0A0B14] font-black uppercase">
                                YOU
                              </span>
                            )}
                            {member.isHost && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#7C5CFF]/30 text-[#C8FF3D] border border-[#7C5CFF]/50 uppercase">
                                HOST
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">{f.name}</div>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-gray-400 pt-3 border-t border-[#1E2246]/60 flex items-center justify-between">
                      <span className="truncate max-w-[150px]">Owner: <span className="text-white font-medium">{member.userName}</span></span>
                      {squadCount > 0 && (
                        <span className="text-[#C8FF3D] font-bold">{squadCount} Players</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Empty Slots */}
              {Array.from({ length: tournament.teamsCount - tournament.members.length }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="p-4 rounded-xl border border-dashed border-[#2A2F60] bg-[#0D0E1A]/40 flex items-center justify-center text-center min-h-[100px]"
                >
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Empty Slot — Waiting for Player
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Join/Claim section if user hasn't claimed a team */}
          {!hasClaimedTeam && tournament.status === 'REGISTRATION' && (
            <div className="bg-[#12142A] border border-[#2A2F60] rounded-2xl p-6">
              <h3 className="text-base font-black uppercase tracking-wider mb-2 flex items-center gap-2 text-[#C8FF3D]">
                <Sparkles className="w-5 h-5" />
                Claim Your Franchise
              </h3>
              <p className="text-xs text-gray-400 mb-4">
                Choose an available IPL franchise to participate in the auction and tournament matches.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
                {availableFranchises.map(fid => {
                  const f = IPL_FRANCHISES[fid];
                  const isSelected = selectedFranchise === fid;
                  return (
                    <button
                      key={fid}
                      onClick={() => setSelectedFranchise(fid)}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                        isSelected
                          ? 'border-[#C8FF3D] bg-[#1E2246] shadow-[0_0_12px_rgba(200,255,61,0.2)]'
                          : 'border-[#2A2F60] bg-[#0D0E1A] hover:border-gray-500'
                      }`}
                    >
                      <img
                        src={f.logoUrl}
                        alt={f.name}
                        className="w-10 h-10 object-contain rounded-full bg-black/40 p-1"
                        onError={e => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <span className={`text-xs font-bold ${isSelected ? 'text-[#C8FF3D]' : 'text-gray-300'}`}>
                        {f.shortName}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleClaim}
                disabled={!selectedFranchise || isClaiming}
                className="w-full py-3 rounded-xl bg-[#C8FF3D] text-[#0A0B14] font-black uppercase text-sm tracking-wider shadow-[0_0_20px_rgba(200,255,61,0.2)] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isClaiming ? 'Claiming...' : `Claim ${selectedFranchise ? IPL_FRANCHISES[selectedFranchise].name : 'Franchise'}`}
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Actions & Host Management */}
        <div className="space-y-6">
          <div className="bg-[#12142A] border border-[#2A2F60] rounded-2xl p-6">
            <h3 className="text-base font-black uppercase tracking-wider mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#FFC93D]" />
              Tournament Progression
            </h3>

            {/* Stage Progress tracker */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                  tournament.status === 'REGISTRATION' ? 'bg-[#C8FF3D] text-[#0A0B14]' : 'bg-emerald-500 text-white'
                }`}>
                  1
                </div>
                <div>
                  <div className="font-bold text-sm text-white">Franchise Registration</div>
                  <div className="text-xs text-gray-400">Teams claim their franchises.</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                  tournament.status === 'AUCTION'
                    ? 'bg-[#C8FF3D] text-[#0A0B14]'
                    : ['SQUAD_FINALIZATION', 'TOURNAMENT_LIVE', 'PLAYOFFS', 'COMPLETED'].includes(tournament.status)
                    ? 'bg-emerald-500 text-white'
                    : 'bg-[#1E2246] text-gray-400'
                }`}>
                  2
                </div>
                <div>
                  <div className="font-bold text-sm text-white">Live IPL Auction</div>
                  <div className="text-xs text-gray-400">Bid, buy, and trade players with ₹120 Cr purse.</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                  ['TOURNAMENT_LIVE', 'PLAYOFFS', 'COMPLETED'].includes(tournament.status)
                    ? 'bg-emerald-500 text-white'
                    : 'bg-[#1E2246] text-gray-400'
                }`}>
                  3
                </div>
                <div>
                  <div className="font-bold text-sm text-white">Hand-Cricket Matches</div>
                  <div className="text-xs text-gray-400">Select match Playing XI & battle with OVR abilities.</div>
                </div>
              </div>
            </div>

            {/* Action buttons based on status */}
            <div className="mt-8 space-y-3 pt-6 border-t border-[#1E2246]">
              {/* Auction Button */}
              <button
                onClick={() => onEnterAuction(tournament.roomCode)}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#7C5CFF] to-[#0078FF] text-white font-black uppercase text-sm tracking-wider shadow-[0_0_20px_rgba(124,92,255,0.3)] hover:opacity-95 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                Enter Auction Arena
              </button>

              {/* Host Controls */}
              {isHost && (
                <>
                  {tournament.status === 'REGISTRATION' && (
                    <button
                      onClick={handleStartAuction}
                      disabled={actionLoading}
                      className="w-full py-3 px-4 rounded-xl bg-[#C8FF3D] text-[#0A0B14] font-black uppercase text-xs tracking-wider transition-all disabled:opacity-50"
                    >
                      {actionLoading ? 'Starting...' : 'Host: Launch Auction Phase'}
                    </button>
                  )}

                  {(tournament.status === 'AUCTION' || tournament.status === 'SQUAD_FINALIZATION') && (
                    <button
                      onClick={handleImportSquads}
                      disabled={actionLoading}
                      className="w-full py-3 px-4 rounded-xl bg-[#1E2246] border border-[#2A2F60] text-gray-200 hover:text-white hover:border-[#C8FF3D] font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                      {actionLoading ? 'Syncing...' : 'Sync Auction Squads into Tournament'}
                    </button>
                  )}

                  {tournament.status === 'SQUAD_FINALIZATION' && (
                    <button
                      onClick={handleStartLive}
                      disabled={actionLoading}
                      className="w-full py-3.5 px-4 rounded-xl bg-[#C8FF3D] text-[#0A0B14] font-black uppercase text-xs tracking-wider shadow-[0_0_20px_rgba(200,255,61,0.25)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {actionLoading ? 'Launching...' : 'Host: Launch Live Matches & Fixtures'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

