import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  ArrowLeftRight,
  Shield,
  Crown,
  Lock,
  Unlock,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Download,
  Flame,
  Award,
  Sparkles,
  ChevronRight,
  Zap,
  Globe2
} from 'lucide-react';
import { RoomState, IPLTeamId, IPL_FRANCHISES, Player, TradeType, PlayingXISelection } from '../types.js';
import { TeamLogo } from './TeamLogo.js';
import { TradeProposalDashboardPanel } from './TradeProposalDashboardPanel.js';
import { TradeModal } from './TradeModal.js';
import { PlayingXISelector } from './PlayingXISelector.js';
import { AuctionResults } from './AuctionResults.js';

interface FinalTeamManagementProps {
  roomState: RoomState;
  myMemberId: string | null;
  onCreateTrade: (payload: {
    toTeamId: IPLTeamId;
    tradeType: TradeType;
    offeredPlayerId: string;
    requestedPlayerId?: string;
    moneyAmount?: number;
    cashPayer?: 'OFFERING_TEAM' | 'RECEIVING_TEAM';
  }) => void;
  onRespondTrade: (tradeId: string, action: 'ACCEPT' | 'REJECT', rejectionReason?: string) => void;
  onCancelTrade: (tradeId: string, reason?: string) => void;
  onUpdateTradeTimer?: (durationSec: number) => void;
  onSavePlayingXI: (teamId: IPLTeamId, selection: Partial<PlayingXISelection>) => void;
  onConfirmPlayingXI: (teamId: IPLTeamId) => void;
  onUnlockPlayingXI: (teamId: IPLTeamId) => void;
  onCloseTradeWindow?: () => void;
  onReAuctionUnsold: () => void;
  onRestartAuction: () => void;
}

const ALL_FRANCHISES: IPLTeamId[] = ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'PBKS', 'DC', 'GT', 'LSG'];

export const FinalTeamManagement: React.FC<FinalTeamManagementProps> = ({
  roomState,
  myMemberId,
  onCreateTrade,
  onRespondTrade,
  onCancelTrade,
  onUpdateTradeTimer,
  onSavePlayingXI,
  onConfirmPlayingXI,
  onUnlockPlayingXI,
  onCloseTradeWindow,
  onReAuctionUnsold,
  onRestartAuction
}) => {
  const myMember = myMemberId ? roomState.members[myMemberId] : null;
  const myTeamId = myMember?.teamId || null;
  const isHost = Boolean(myMember?.isHost);

  const [activeMainTab, setActiveMainTab] = useState<'management' | 'results'>('management');
  const [selectedFranchiseXI, setSelectedFranchiseXI] = useState<IPLTeamId | null>(myTeamId || 'CSK');
  const [showTradeModal, setShowTradeModal] = useState<boolean>(false);

  // Authoritative countdown for 10-Minute Post-Auction Trading Window
  const [remainingWindowSec, setRemainingWindowSec] = useState<number>(0);
  const isWindowActive = roomState.postAuctionTradeStatus === 'ACTIVE';
  const isWindowClosed = roomState.postAuctionTradeStatus === 'CLOSED';

  useEffect(() => {
    if (!roomState.postAuctionTradeDeadline || roomState.postAuctionTradeStatus !== 'ACTIVE') {
      setRemainingWindowSec(0);
      return;
    }

    const updateCountdown = () => {
      const remainingMs = Math.max(0, roomState.postAuctionTradeDeadline! - Date.now());
      setRemainingWindowSec(Math.ceil(remainingMs / 1000));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [roomState.postAuctionTradeDeadline, roomState.postAuctionTradeStatus]);

  const formatWindowTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Find manager name for each team
  const franchiseManagers = useMemo(() => {
    const managers: Record<IPLTeamId, string> = {} as any;
    for (const m of Object.values(roomState.members)) {
      if (m.teamId) {
        managers[m.teamId] = m.nickname;
      }
    }
    return managers;
  }, [roomState.members]);

  // CSV Export handler
  const handleExportCSV = () => {
    const headers = ['Lot', 'Player Name', 'Role', 'Country', 'Status', 'Winning Franchise', 'Sold Price (INR)', 'Base Price'];
    const rows = roomState.history.map(h => [
      h.lotNumber,
      `"${h.player.name}"`,
      h.player.category,
      h.player.country || h.player.nationality || 'India',
      h.status,
      h.winningTeamName ? `"${h.winningTeamName}"` : '—',
      h.soldPrice || 0,
      h.player.base_price_inr
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BIDWARS_${roomState.roomCode}_Final_Rosters.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 font-body relative">
      {/* ======================================================== */}
      {/* 1. TOP POST-AUCTION TRADING WINDOW BANNER               */}
      {/* ======================================================== */}
      <div className="relative rounded-3xl overflow-hidden border-2 border-[#7C5CFF] bg-[#12142A] p-5 sm:p-7 shadow-[0_0_40px_rgba(124,92,255,0.25)]">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-[#C8FF3D]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 bg-[#7C5CFF]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span className="bg-[#0A0B14] text-[#C8FF3D] border border-[#C8FF3D]/40 text-xs font-heading font-black px-3.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#C8FF3D] animate-ping" />
                AUCTION CONCLUDED · FINAL TEAM MANAGEMENT
              </span>

              {isWindowActive ? (
                <span className="bg-[#FFC93D]/20 text-[#FFC93D] border border-[#FFC93D]/50 text-xs font-heading font-black px-3 py-1 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  POST-AUCTION TRADING ACTIVE
                </span>
              ) : isWindowClosed ? (
                <span className="bg-[#FF3B5C]/20 text-[#FF3B5C] border border-[#FF3B5C]/50 text-xs font-heading font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  TRADING WINDOW CLOSED
                </span>
              ) : null}
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-black text-white uppercase tracking-tight">
              Final Squads & Playing XI
            </h1>

            <p className="text-xs sm:text-sm text-[#8F9CAE] max-w-xl">
              {isWindowActive
                ? 'The 10-minute post-auction trade window is live. Franchise managers can swap players, execute player+cash trades, and lock their official Season 2026 Playing XI.'
                : 'Trading is officially closed. All franchise rosters and Playing XI selections are finalized.'}
            </p>
          </div>

          {/* Synchronized Countdown & Trade Hub Action */}
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            {isWindowActive && (
              <div className="bg-[#0A0B14] border-2 border-[#C8FF3D] px-5 py-3 rounded-2xl flex items-center gap-3 shadow-[0_0_20px_rgba(200,255,61,0.25)]">
                <Clock className="w-6 h-6 text-[#C8FF3D] animate-pulse" />
                <div className="text-left">
                  <span className="text-[10px] text-[#8F9CAE] font-heading font-extrabold uppercase tracking-wider block">
                    POST-AUCTION TRADE WINDOW
                  </span>
                  <span className={`font-number font-black text-2xl tracking-wider ${remainingWindowSec <= 60 ? 'text-[#FF3B5C] animate-ping' : 'text-[#C8FF3D]'}`}>
                    {formatWindowTimer(remainingWindowSec)}
                  </span>
                </div>
              </div>
            )}

            {isWindowActive && (
              <button
                onClick={() => setShowTradeModal(true)}
                className="px-6 py-4 rounded-2xl bg-gradient-to-r from-[#7C5CFF] to-[#6038FF] hover:from-[#6E48FF] hover:to-[#5028EE] text-white font-heading font-black text-sm uppercase tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(124,92,255,0.4)] transition-all"
              >
                <ArrowLeftRight className="w-5 h-5 text-[#C8FF3D]" />
                Open Trade Hub
              </button>
            )}
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-5 mt-5 border-t border-[#1E2246]">
          {/* Main Navigation Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveMainTab('management')}
              className={`px-4 py-2 rounded-xl text-xs font-heading font-black uppercase tracking-wider transition-all ${
                activeMainTab === 'management'
                  ? 'bg-[#C8FF3D] text-[#0A0B14] shadow-[0_0_15px_rgba(200,255,61,0.25)]'
                  : 'bg-[#0A0B14] text-[#8F9CAE] hover:text-white border border-[#1E2246]'
              }`}
            >
              10 Franchises & Playing XI
            </button>

            <button
              onClick={() => setActiveMainTab('results')}
              className={`px-4 py-2 rounded-xl text-xs font-heading font-black uppercase tracking-wider transition-all ${
                activeMainTab === 'results'
                  ? 'bg-[#C8FF3D] text-[#0A0B14] shadow-[0_0_15px_rgba(200,255,61,0.25)]'
                  : 'bg-[#0A0B14] text-[#8F9CAE] hover:text-white border border-[#1E2246]'
              }`}
            >
              Hall of Fame & Auction Report
            </button>
          </div>

          {/* Host & Utility Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-[#0A0B14] hover:bg-[#1E2246] border border-[#1E2246] text-[#8F9CAE] hover:text-white text-xs font-heading font-bold flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-[#C8FF3D]" />
              Export Rosters (CSV)
            </button>

            {isHost && isWindowActive && onCloseTradeWindow && (
              <button
                onClick={onCloseTradeWindow}
                className="px-3.5 py-2 rounded-xl bg-[#FF3B5C]/15 hover:bg-[#FF3B5C]/30 border border-[#FF3B5C]/40 text-[#FF3B5C] text-xs font-heading font-bold flex items-center gap-1.5 transition-all"
                title="Top Host can close the post-auction trade window immediately"
              >
                <Lock className="w-3.5 h-3.5" />
                Close Window Early
              </button>
            )}

            {isHost && (
              <>
                <button
                  onClick={onReAuctionUnsold}
                  className="px-3.5 py-2 rounded-xl bg-[#0A0B14] hover:bg-[#1E2246] border border-[#1E2246] text-[#8F9CAE] hover:text-white text-xs font-heading font-bold flex items-center gap-1.5 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#FFC93D]" />
                  Re-Auction Unsold
                </button>
                <button
                  onClick={onRestartAuction}
                  className="px-3.5 py-2 rounded-xl bg-[#FF3B5C]/20 hover:bg-[#FF3B5C] border border-[#FF3B5C]/40 text-white text-xs font-heading font-bold flex items-center gap-1.5 transition-all"
                >
                  Restart Auction
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. REAL-TIME TRADE PROPOSAL PANEL (IF PENDING)          */}
      {/* ======================================================== */}
      {roomState.activeTrade && (
        <TradeProposalDashboardPanel
          activeTrade={roomState.activeTrade}
          myTeamId={myTeamId}
          isHost={isHost}
          onAccept={(tradeId) => onRespondTrade(tradeId, 'ACCEPT')}
          onReject={(tradeId, reason) => onRespondTrade(tradeId, 'REJECT', reason)}
          onCancel={(tradeId, reason) => onCancelTrade(tradeId, reason)}
          onOpenTradeModal={() => setShowTradeModal(true)}
        />
      )}

      {/* ======================================================== */}
      {/* 3. MAIN CONTENT VIEW                                    */}
      {/* ======================================================== */}
      {activeMainTab === 'management' ? (
        <div className="space-y-6">
          {/* FRANCHISE OVERVIEW CARDS (10 FRANCHISES) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-heading font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#C8FF3D]" />
                <span>All 10 Franchise Squads & Playing XI Status</span>
              </span>
              <span className="text-[11px] text-[#8F9CAE]">
                Click any franchise to review squad or configure Starting XI.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {ALL_FRANCHISES.map(teamId => {
                const team = IPL_FRANCHISES[teamId];
                const squad = roomState.teamSquads[teamId] || [];
                const purse = roomState.teamPurse[teamId] || 0;
                const overseas = squad.filter(p => p.is_overseas).length;
                const xi = roomState.teamPlayingXI ? roomState.teamPlayingXI[teamId] : null;
                const isConfirmed = Boolean(xi?.isConfirmed);
                const hasStarters = (xi?.playingXIIds?.length || 0) > 0;
                const isSelected = selectedFranchiseXI === teamId;
                const isMine = myTeamId === teamId;
                const manager = franchiseManagers[teamId] || 'Unassigned';

                return (
                  <div
                    key={teamId}
                    onClick={() => setSelectedFranchiseXI(teamId)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 relative ${
                      isSelected
                        ? 'bg-[#1E2246] border-[#C8FF3D] shadow-[0_0_20px_rgba(200,255,61,0.2)]'
                        : isMine
                        ? 'bg-[#12142A] border-[#7C5CFF]/60 hover:border-[#7C5CFF]'
                        : 'bg-[#12142A]/80 border-[#1E2246] hover:border-[#282E5C]'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <TeamLogo teamId={teamId} className="w-8 h-8" />
                        <div>
                          <p className="font-heading font-black text-xs text-white leading-tight">
                            {team.name}
                          </p>
                          <p className="text-[10px] text-[#8F9CAE]">
                            {manager} {isMine && <span className="text-[#C8FF3D] font-bold">(You)</span>}
                          </p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      {isConfirmed ? (
                        <span className="w-5 h-5 rounded-full bg-[#C8FF3D]/20 text-[#C8FF3D] border border-[#C8FF3D]/50 flex items-center justify-center shrink-0" title="Playing XI Confirmed">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </span>
                      ) : hasStarters ? (
                        <span className="w-5 h-5 rounded-full bg-[#FFC93D]/20 text-[#FFC93D] border border-[#FFC93D]/50 flex items-center justify-center shrink-0" title="Playing XI Draft in Progress">
                          <Unlock className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-[#1E2246] text-[#62658A] border border-[#23274D] flex items-center justify-center shrink-0" title="Not Started">
                          <Users className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    {/* Stats Strip */}
                    <div className="pt-2 border-t border-[#1E2246] grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-[9px] text-[#8F9CAE] uppercase font-heading font-bold block">Squad</span>
                        <span className="font-number font-bold text-white">
                          {squad.length} Players
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#8F9CAE] uppercase font-heading font-bold block">Remaining</span>
                        <span className="font-number font-bold text-[#C8FF3D]">
                          ₹{(purse / 10000000).toFixed(2)} Cr
                        </span>
                      </div>
                    </div>

                    {/* Playing XI Badge */}
                    <div className="pt-1">
                      {isConfirmed ? (
                        <div className="p-1.5 rounded-lg bg-[#C8FF3D]/10 border border-[#C8FF3D]/30 flex items-center justify-between text-[10px]">
                          <span className="font-heading font-extrabold text-[#C8FF3D] uppercase">XI Locked</span>
                          <span className="font-number font-bold text-[#C8FF3D]">11 / 11</span>
                        </div>
                      ) : hasStarters ? (
                        <div className="p-1.5 rounded-lg bg-[#FFC93D]/10 border border-[#FFC93D]/30 flex items-center justify-between text-[10px]">
                          <span className="font-heading font-extrabold text-[#FFC93D] uppercase">In Draft</span>
                          <span className="font-number font-bold text-[#FFC93D]">{xi?.playingXIIds.length}/11</span>
                        </div>
                      ) : (
                        <div className="p-1.5 rounded-lg bg-[#0A0B14] border border-[#1E2246] flex items-center justify-between text-[10px] text-[#62658A]">
                          <span className="font-heading font-bold uppercase">Unset</span>
                          <span className="font-number">0/11</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ACTIVE PLAYING XI EDITOR / VIEWER */}
          {selectedFranchiseXI && (
            <PlayingXISelector
              teamId={selectedFranchiseXI}
              squad={roomState.teamSquads[selectedFranchiseXI] || []}
              selection={roomState.teamPlayingXI ? roomState.teamPlayingXI[selectedFranchiseXI] : undefined}
              isMyTeam={myTeamId === selectedFranchiseXI}
              isHost={isHost}
              isWindowClosed={isWindowClosed}
              onSaveDraft={selection => onSavePlayingXI(selectedFranchiseXI, selection)}
              onConfirmTeam={() => onConfirmPlayingXI(selectedFranchiseXI)}
              onUnlockTeam={() => onUnlockPlayingXI(selectedFranchiseXI)}
            />
          )}
        </div>
      ) : (
        /* AUCTION RESULTS & VICTORY REPORT */
        <AuctionResults
          roomState={roomState}
          myMemberId={myMemberId || ''}
          onReAuctionUnsold={onReAuctionUnsold}
          onRestartAuction={onRestartAuction}
        />
      )}

      {/* EMBEDDED TRADE MODAL */}
      <TradeModal
        isOpen={showTradeModal}
        onClose={() => setShowTradeModal(false)}
        roomState={roomState}
        myMemberId={myMemberId}
        onCreateTrade={onCreateTrade}
        onRespondTrade={onRespondTrade}
        onCancelTrade={onCancelTrade}
        onUpdateTradeTimer={onUpdateTradeTimer}
      />
    </div>
  );
};
