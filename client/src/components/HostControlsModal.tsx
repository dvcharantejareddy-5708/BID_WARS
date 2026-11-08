import React, { useState, useMemo } from 'react';
import { 
  X, 
  Crown, 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Clock, 
  Users, 
  UserMinus, 
  AlertTriangle, 
  CheckCircle2, 
  Dice5, 
  Sparkles, 
  Coins, 
  ArrowRight,
  ShieldAlert,
  Shuffle
} from 'lucide-react';
import { RoomState, IPLTeamId, Player, PlayerCategory, IPL_FRANCHISES, AuctionLot } from '../types.js';
import { TeamLogo } from './TeamLogo.js';

interface HostControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomState: RoomState;
  myMemberId: string | null;
  onPauseAuction: () => void;
  onResumeAuction: () => void;
  onRestartAuction: () => void;
  onEndAuction: () => void;
  onBringAllUnsoldBack: () => void;
  onRandomDrawUnsold: (count: number, playerIds?: string[]) => void;
  onSkipMultiplePlayers: (count: number) => void;
  onKickMember: (targetMemberId: string) => void;
  onUpdateTimer: (duration: number) => void;
  onUpdateSettings?: (settings: any) => void;
  onDrawRandomPlayer?: (category: PlayerCategory, basePriceInr: number) => void;
}

type TabType = 'auction' | 'players' | 'room' | 'settings';

export const HostControlsModal: React.FC<HostControlsModalProps> = ({
  isOpen,
  onClose,
  roomState,
  myMemberId,
  onPauseAuction,
  onResumeAuction,
  onRestartAuction,
  onEndAuction,
  onBringAllUnsoldBack,
  onRandomDrawUnsold,
  onSkipMultiplePlayers,
  onKickMember,
  onUpdateTimer,
  onUpdateSettings,
  onDrawRandomPlayer
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('auction');
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    actionType: 'end' | 'restart' | 'recall_unsold' | 'kick' | 'skip_multiple';
    payload?: any;
  } | null>(null);

  // Random Draw Unsold State
  const [drawCount, setDrawCount] = useState<number>(1);
  const [drawnPreviewPlayers, setDrawnPreviewPlayers] = useState<Player[] | null>(null);

  // Skip Multiple State
  const [skipCount, setSkipCount] = useState<number>(2);

  // Timer State
  const [customTimerInput, setCustomTimerInput] = useState<string>(
    String(roomState.settings.timerDuration || 10)
  );

  // Category & Price Draw State
  const [drawCategory, setDrawCategory] = useState<PlayerCategory>('Batsmen');
  const [drawPrice, setDrawPrice] = useState<number>(20000000);

  // Feedback banner
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Compute eligible unsold players
  const eligibleUnsoldPlayers = useMemo(() => {
    const soldPlayerIds = new Set<string>();
    for (const squad of Object.values(roomState.teamSquads || {})) {
      for (const p of squad) {
        soldPlayerIds.add(p.id);
      }
    }

    const queuedPlayerIds = new Set<string>();
    if (roomState.lots) {
      for (let i = roomState.currentLotIndex; i < roomState.lots.length; i++) {
        const l = roomState.lots[i];
        if (l && (l.status === 'PENDING' || l.status === 'IN_PROGRESS')) {
          queuedPlayerIds.add(l.player.id);
        }
      }
    }

    const eligible: Player[] = [];
    const seenIds = new Set<string>();

    const checkAndAdd = (p: Player) => {
      if (!soldPlayerIds.has(p.id) && !queuedPlayerIds.has(p.id) && !seenIds.has(p.id)) {
        seenIds.add(p.id);
        eligible.push(p);
      }
    };

    for (const lot of roomState.history || []) {
      if (lot.status === 'UNSOLD') checkAndAdd(lot.player);
    }
    if (roomState.lots) {
      for (const lot of roomState.lots) {
        if (lot.status === 'UNSOLD') checkAndAdd(lot.player);
      }
    }

    return eligible;
  }, [roomState]);

  // Compute upcoming lots for Skip Multiple preview
  const upcomingLotsToSkip = useMemo(() => {
    if (!roomState.lots) return [];
    const current = roomState.lots[roomState.currentLotIndex];
    let start = roomState.currentLotIndex;
    if (current && current.status === 'IN_PROGRESS' && current.currentBid > 0) {
      start = roomState.currentLotIndex + 1;
    }
    const end = Math.min(roomState.lots.length, start + skipCount);
    return roomState.lots.slice(start, end);
  }, [roomState, skipCount]);

  if (!isOpen) return null;

  const isAuctionActive = roomState.status === 'AUCTION';
  const isAuctionPaused = roomState.status === 'PAUSED';

  // Handler for random draw unsold preview
  const handleGenerateDrawPreview = () => {
    if (eligibleUnsoldPlayers.length === 0) {
      showFeedback('No unsold players available to draw.', 'error');
      return;
    }
    const count = Math.min(drawCount, eligibleUnsoldPlayers.length);
    const shuffled = [...eligibleUnsoldPlayers].sort(() => Math.random() - 0.5);
    setDrawnPreviewPlayers(shuffled.slice(0, count));
  };

  const handleConfirmDrawUnsold = () => {
    if (!drawnPreviewPlayers || drawnPreviewPlayers.length === 0) return;
    const playerIds = drawnPreviewPlayers.map(p => p.id);
    onRandomDrawUnsold(playerIds.length, playerIds);
    setDrawnPreviewPlayers(null);
    showFeedback(`Successfully added ${playerIds.length} unsold player(s) back into the auction queue!`);
  };

  // Execution of confirmed action
  const handleExecuteConfirm = () => {
    if (!confirmDialog) return;

    switch (confirmDialog.actionType) {
      case 'end':
        onEndAuction();
        showFeedback('Auction ended officially.');
        onClose();
        break;
      case 'restart':
        onRestartAuction();
        showFeedback('Auction reset to lobby.');
        onClose();
        break;
      case 'recall_unsold':
        onBringAllUnsoldBack();
        showFeedback(`Recalled all eligible unsold players!`);
        break;
      case 'kick':
        if (confirmDialog.payload?.memberId) {
          onKickMember(confirmDialog.payload.memberId);
          showFeedback(`Participant removed from auction.`);
        }
        break;
      case 'skip_multiple':
        onSkipMultiplePlayers(skipCount);
        showFeedback(`Skipped ${upcomingLotsToSkip.length} player(s).`);
        break;
    }
    setConfirmDialog(null);
  };

  const timerPresets = [5, 8, 10, 12, 15, 20];
  const incrementPresets = [
    { label: '₹10 Lakh', value: 1000000 },
    { label: '₹20 Lakh', value: 2000000 },
    { label: '₹25 Lakh', value: 2500000 },
    { label: '₹50 Lakh', value: 5000000 },
    { label: '₹1.00 Cr', value: 10000000 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#0A0B14]/85 backdrop-blur-md animate-fadeIn font-body">
      <div className="bg-[#12142A] max-w-3xl w-full rounded-3xl border border-[#1E2246] shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative text-white flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#1E2246] flex items-center justify-between bg-[#101226]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0A0B14] border border-[#C8FF3D]/30 flex items-center justify-center text-[#C8FF3D] shadow-[0_0_15px_rgba(200,255,61,0.15)]">
              <Crown className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-black text-lg sm:text-xl uppercase tracking-tight text-white">
                  Auction Management
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-heading font-extrabold uppercase bg-[#C8FF3D]/15 text-[#C8FF3D] border border-[#C8FF3D]/30">
                  Host Controls
                </span>
              </div>
              <p className="text-xs text-[#8F9CAE]">Full server-authoritative controls for room {roomState.roomCode}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#8F9CAE] hover:text-white hover:bg-[#1E2246] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback message banner */}
        {feedbackMsg && (
          <div className={`px-6 py-2.5 text-xs font-heading font-bold uppercase tracking-wider flex items-center gap-2 border-b ${
            feedbackMsg.type === 'success' 
              ? 'bg-[#C8FF3D]/10 border-[#C8FF3D]/30 text-[#C8FF3D]' 
              : 'bg-[#FF3B5C]/10 border-[#FF3B5C]/30 text-[#FF3B5C]'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-[#1E2246] bg-[#0E1022] px-3 sm:px-6 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('auction')}
            className={`py-3.5 px-4 font-heading text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all shrink-0 flex items-center gap-2 ${
              activeTab === 'auction'
                ? 'border-[#C8FF3D] text-[#C8FF3D] bg-[#C8FF3D]/5'
                : 'border-transparent text-[#8F9CAE] hover:text-white'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Auction Control</span>
          </button>

          <button
            onClick={() => setActiveTab('players')}
            className={`py-3.5 px-4 font-heading text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all shrink-0 flex items-center gap-2 ${
              activeTab === 'players'
                ? 'border-[#C8FF3D] text-[#C8FF3D] bg-[#C8FF3D]/5'
                : 'border-transparent text-[#8F9CAE] hover:text-white'
            }`}
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Player Management</span>
            {eligibleUnsoldPlayers.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#FFC93D] text-[#0A0B14] font-mono text-[10px] font-black flex items-center justify-center">
                {eligibleUnsoldPlayers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('room')}
            className={`py-3.5 px-4 font-heading text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all shrink-0 flex items-center gap-2 ${
              activeTab === 'room'
                ? 'border-[#C8FF3D] text-[#C8FF3D] bg-[#C8FF3D]/5'
                : 'border-transparent text-[#8F9CAE] hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Participants</span>
            <span className="w-5 h-5 rounded-full bg-[#1E2246] text-[#8F9CAE] font-mono text-[10px] font-bold flex items-center justify-center">
              {Object.keys(roomState.members || {}).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3.5 px-4 font-heading text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all shrink-0 flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'border-[#C8FF3D] text-[#C8FF3D] bg-[#C8FF3D]/5'
                : 'border-transparent text-[#8F9CAE] hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Auction Settings</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* TAB 1: AUCTION CONTROL */}
          {activeTab === 'auction' && (
            <div className="space-y-6">
              {/* Pause & Resume Auction */}
              <div className="bg-[#0A0B14] border border-[#1E2246] rounded-2xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-heading font-black text-sm uppercase tracking-wider text-white flex items-center gap-2">
                      <span>Live Flow State</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        isAuctionActive ? 'bg-[#C8FF3D]/15 text-[#C8FF3D]' : 'bg-[#FFC93D]/15 text-[#FFC93D]'
                      }`}>
                        {roomState.status}
                      </span>
                    </h3>
                    <p className="text-xs text-[#8F9CAE] mt-1">
                      Temporarily freeze bidding clocks across all participant devices without resetting current bids.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAuctionActive && (
                      <button
                        onClick={onPauseAuction}
                        className="py-2.5 px-5 rounded-xl bg-[#1E2246] hover:bg-[#282E5C] text-[#FFC93D] font-heading font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 border border-[#FFC93D]/30 shadow-[0_0_12px_rgba(255,201,61,0.15)]"
                      >
                        <Pause className="w-4 h-4" />
                        <span>Pause Auction</span>
                      </button>
                    )}

                    {isAuctionPaused && (
                      <button
                        onClick={onResumeAuction}
                        className="py-2.5 px-5 rounded-xl bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(200,255,61,0.3)]"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Resume Auction</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* End Auction Section (Feature 3) */}
              <div className="bg-[#0A0B14] border border-[#FF3B5C]/30 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF3B5C]/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-[#FF3B5C]">
                      <ShieldAlert className="w-4 h-4" />
                      <h3 className="font-heading font-black text-sm uppercase tracking-wider">
                        End Auction Officially
                      </h3>
                    </div>
                    <p className="text-xs text-[#8F9CAE] mt-1 max-w-lg leading-relaxed">
                      Conclude the live auction and lock all franchises. Calculating final squad scores, purse standings, and navigating all connected participants to the final Auction Results view.
                    </p>
                  </div>

                  <button
                    onClick={() => setConfirmDialog({
                      title: 'End Live Auction?',
                      description: 'Are you sure you want to officially end the auction? All squad purchases and purse balances will be finalized. All participants will transition to the Final Results view.',
                      actionType: 'end'
                    })}
                    className="py-2.5 px-5 rounded-xl bg-[#FF3B5C] hover:bg-[#E02E4E] text-white font-heading font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(255,59,92,0.3)] shrink-0"
                  >
                    End Auction Now
                  </button>
                </div>
              </div>

              {/* Restart Lobby */}
              <div className="bg-[#0A0B14] border border-[#1E2246] rounded-2xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-heading font-black text-sm uppercase tracking-wider text-white">
                      Reset Auction to Lobby
                    </h3>
                    <p className="text-xs text-[#8F9CAE] mt-1">
                      Resets all squad purchases, restores original ₹120.00 Cr purse balances, and returns all participants to the team selection lobby.
                    </p>
                  </div>

                  <button
                    onClick={() => setConfirmDialog({
                      title: 'Reset to Lobby?',
                      description: 'Warning: This will clear all squads, refund purses to starting limits, and reset player lots back to the beginning. Proceed?',
                      actionType: 'restart'
                    })}
                    className="py-2.5 px-5 rounded-xl bg-[#1E2246] hover:bg-[#282E5C] text-[#8F9CAE] hover:text-white font-heading font-bold text-xs uppercase tracking-wider transition-all border border-[#1E2246] flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset to Lobby</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PLAYER MANAGEMENT (Features 1, 2, 7) */}
          {activeTab === 'players' && (
            <div className="space-y-6">
              
              {/* FEATURE 1: Bring All Unsold Players Back */}
              <div className="bg-[#0A0B14] border border-[#1E2246] rounded-2xl p-5 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-[#C8FF3D]" />
                      <h3 className="font-heading font-black text-sm uppercase tracking-wider text-white">
                        Bring All Unsold Players Back
                      </h3>
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-[#C8FF3D]/15 text-[#C8FF3D] border border-[#C8FF3D]/30">
                        {eligibleUnsoldPlayers.length} Eligible
                      </span>
                    </div>
                    <p className="text-xs text-[#8F9CAE] leading-relaxed max-w-lg">
                      Restores all players previously marked UNSOLD into the active auction queue. Original base prices, player attributes, and details are strictly preserved. Sold players are untouched.
                    </p>
                  </div>

                  <button
                    onClick={() => setConfirmDialog({
                      title: 'Bring All Unsold Players Back?',
                      description: `Are you sure you want to recall all ${eligibleUnsoldPlayers.length} unsold player(s) to the auction queue? Their base prices will be preserved.`,
                      actionType: 'recall_unsold'
                    })}
                    disabled={eligibleUnsoldPlayers.length === 0}
                    className={`py-2.5 px-5 rounded-xl font-heading font-black text-xs uppercase tracking-wider transition-all shrink-0 ${
                      eligibleUnsoldPlayers.length > 0
                        ? 'bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] shadow-[0_0_15px_rgba(200,255,61,0.25)]'
                        : 'bg-[#1E2246] text-[#8F9CAE]/50 cursor-not-allowed border border-[#1E2246]'
                    }`}
                  >
                    Bring All Unsold Back
                  </button>
                </div>
              </div>

              {/* FEATURE 2: Custom Random Draw for Unsold Players */}
              <div className="bg-[#0A0B14] border border-[#1E2246] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Dice5 className="w-4 h-4 text-[#FFC93D]" />
                    <h3 className="font-heading font-black text-sm uppercase tracking-wider text-white">
                      Random Draw: Unsold Players
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-[#8F9CAE]">
                    {eligibleUnsoldPlayers.length} Unsold Available
                  </span>
                </div>

                <p className="text-xs text-[#8F9CAE] leading-relaxed">
                  Choose how many unsold players to draw. Preview the selected players, re-draw if unsatisfied, and confirm to add only the selected players into the queue.
                </p>

                {/* Draw Quantity Selector */}
                {!drawnPreviewPlayers && (
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <span className="text-xs font-heading font-bold uppercase text-[#8F9CAE]">Quantity:</span>
                    {[1, 2, 3, 5].map(cnt => (
                      <button
                        key={cnt}
                        onClick={() => setDrawCount(cnt)}
                        disabled={eligibleUnsoldPlayers.length === 0}
                        className={`py-1.5 px-3 rounded-lg text-xs font-mono font-bold transition-all border ${
                          drawCount === cnt
                            ? 'bg-[#FFC93D] text-[#0A0B14] border-[#FFC93D]'
                            : 'bg-[#12142A] text-[#8F9CAE] border-[#1E2246] hover:text-white'
                        }`}
                      >
                        {cnt} Player{cnt > 1 ? 's' : ''}
                      </button>
                    ))}
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max={Math.max(1, eligibleUnsoldPlayers.length)}
                        value={drawCount}
                        onChange={(e) => setDrawCount(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 py-1.5 px-2 rounded-lg bg-[#12142A] border border-[#1E2246] text-center font-mono text-xs text-white focus:outline-none focus:border-[#FFC93D]"
                      />
                    </div>

                    <button
                      onClick={handleGenerateDrawPreview}
                      disabled={eligibleUnsoldPlayers.length === 0}
                      className={`ml-auto py-2 px-4 rounded-xl font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
                        eligibleUnsoldPlayers.length > 0
                          ? 'bg-[#FFC93D] hover:bg-[#E5B535] text-[#0A0B14] shadow-[0_0_15px_rgba(255,201,61,0.2)]'
                          : 'bg-[#1E2246] text-[#8F9CAE]/50 cursor-not-allowed'
                      }`}
                    >
                      <Dice5 className="w-3.5 h-3.5" />
                      <span>Draw Players</span>
                    </button>
                  </div>
                )}

                {/* Drawn Players Preview Cards */}
                {drawnPreviewPlayers && (
                  <div className="bg-[#12142A] border border-[#FFC93D]/30 rounded-xl p-4 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-[#1E2246] pb-2">
                      <span className="text-xs font-heading font-black uppercase text-[#FFC93D] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Preview: {drawnPreviewPlayers.length} Drawn Player(s)</span>
                      </span>
                      <button
                        onClick={handleGenerateDrawPreview}
                        className="text-[11px] font-heading font-bold uppercase text-[#8F9CAE] hover:text-white flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Re-Draw</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {drawnPreviewPlayers.map(p => (
                        <div key={p.id} className="bg-[#0A0B14] border border-[#1E2246] rounded-lg p-2.5 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-heading font-black text-white uppercase">{p.name}</p>
                            <p className="text-[10px] text-[#8F9CAE]">{p.category} • {p.nationality}</p>
                          </div>
                          <span className="text-xs font-mono font-bold text-[#C8FF3D]">
                            ₹{(p.base_price_inr / 10000000).toFixed(2)} Cr
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E2246]">
                      <button
                        onClick={() => setDrawnPreviewPlayers(null)}
                        className="py-1.5 px-3 rounded-lg bg-[#0A0B14] border border-[#1E2246] text-xs font-heading font-bold text-[#8F9CAE] hover:text-white uppercase"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmDrawUnsold}
                        className="py-1.5 px-4 rounded-lg bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] text-xs font-heading font-black uppercase tracking-wider shadow-[0_0_12px_rgba(200,255,61,0.2)]"
                      >
                        Confirm & Add to Queue
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* FEATURE 7: Skip Multiple Players */}
              <div className="bg-[#0A0B14] border border-[#1E2246] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FastForward className="w-4 h-4 text-[#7C5CFF]" />
                    <h3 className="font-heading font-black text-sm uppercase tracking-wider text-white">
                      Skip Multiple Players
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-[#8F9CAE]">
                    Upcoming in pool: {Math.max(0, (roomState.lots?.length || 0) - roomState.currentLotIndex)}
                  </span>
                </div>

                <p className="text-xs text-[#8F9CAE] leading-relaxed">
                  Skip upcoming lots in batch. Preview the upcoming player lots before confirming. Active player rounds with placed bids will finish first.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-heading font-bold uppercase text-[#8F9CAE]">Skip Count:</span>
                  {[1, 2, 3, 5, 10].map(cnt => (
                    <button
                      key={cnt}
                      onClick={() => setSkipCount(cnt)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-mono font-bold transition-all border ${
                        skipCount === cnt
                          ? 'bg-[#7C5CFF] text-white border-[#7C5CFF]'
                          : 'bg-[#12142A] text-[#8F9CAE] border-[#1E2246] hover:text-white'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>

                {upcomingLotsToSkip.length > 0 && (
                  <div className="bg-[#12142A] border border-[#1E2246] rounded-xl p-3 space-y-2">
                    <span className="text-[11px] font-heading font-extrabold uppercase text-[#8F9CAE]">
                      Preview of {upcomingLotsToSkip.length} player(s) to be marked SKIPPED:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {upcomingLotsToSkip.map((l: AuctionLot) => (
                        <div key={l.lotNumber} className="bg-[#0A0B14] border border-[#1E2246] rounded-lg p-2 flex items-center justify-between text-xs">
                          <span className="font-heading font-bold text-white uppercase truncate mr-2">
                            #{l.lotNumber} {l.player.name}
                          </span>
                          <span className="text-[10px] font-mono text-[#8F9CAE] shrink-0">
                            {l.player.base_price_display}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => setConfirmDialog({
                          title: `Skip ${upcomingLotsToSkip.length} Player(s)?`,
                          description: `This will mark ${upcomingLotsToSkip.map((l: AuctionLot) => l.player.name).join(', ')} as SKIPPED and advance the auction.`,
                          actionType: 'skip_multiple'
                        })}
                        className="py-2 px-4 rounded-xl bg-[#7C5CFF] hover:bg-[#6846EB] text-white text-xs font-heading font-black uppercase tracking-wider shadow-[0_0_15px_rgba(124,92,255,0.25)] flex items-center gap-1.5"
                      >
                        <FastForward className="w-3.5 h-3.5" />
                        <span>Confirm Skip {upcomingLotsToSkip.length} Lots</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 16: Custom Category & Price Draw */}
              {onDrawRandomPlayer && (
                <div className="bg-[#0A0B14] border border-[#1E2246] rounded-2xl p-5 space-y-3">
                  <h3 className="font-heading font-black text-sm uppercase tracking-wider text-white flex items-center gap-2">
                    <Coins className="w-4 h-4 text-[#C8FF3D]" />
                    <span>Draw Specific Category & Price Bracket</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-heading font-bold uppercase text-[#8F9CAE] block mb-1">
                        Category
                      </label>
                      <select
                        value={drawCategory}
                        onChange={(e) => setDrawCategory(e.target.value as PlayerCategory)}
                        className="w-full py-2 px-3 rounded-xl bg-[#12142A] border border-[#1E2246] text-white text-xs font-medium focus:outline-none focus:border-[#C8FF3D]"
                      >
                        <option value="Batsmen">Batsmen</option>
                        <option value="Bowlers">Bowlers</option>
                        <option value="All-rounders">All-rounders</option>
                        <option value="Wicket-keepers">Wicket-keepers</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-heading font-bold uppercase text-[#8F9CAE] block mb-1">
                        Base Price Bracket
                      </label>
                      <select
                        value={drawPrice}
                        onChange={(e) => setDrawPrice(Number(e.target.value))}
                        className="w-full py-2 px-3 rounded-xl bg-[#12142A] border border-[#1E2246] text-white text-xs font-mono focus:outline-none focus:border-[#C8FF3D]"
                      >
                        <option value={20000000}>₹2.00 Cr</option>
                        <option value={15000000}>₹1.50 Cr</option>
                        <option value={10000000}>₹1.00 Cr</option>
                        <option value={5000000}>₹50 Lakh</option>
                        <option value={2000000}>₹20 Lakh</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => onDrawRandomPlayer(drawCategory, drawPrice)}
                      className="py-2 px-4 rounded-xl bg-[#1E2246] hover:bg-[#282E5C] text-[#C8FF3D] border border-[#C8FF3D]/30 text-xs font-heading font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                    >
                      <Dice5 className="w-3.5 h-3.5" />
                      <span>Draw Next Matching Lot</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ROOM & PARTICIPANTS (Feature 6: Kick Out Players) */}
          {activeTab === 'room' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#1E2246]">
                <h3 className="font-heading font-black text-sm uppercase tracking-wider text-white">
                  Active Room Members ({Object.keys(roomState.members || {}).length})
                </h3>
                <span className="text-xs text-[#8F9CAE]">Host has exclusive participant removal privileges</span>
              </div>

              <div className="space-y-2">
                {Object.values(roomState.members || {}).map((member) => {
                  const isHost = member.id === roomState.hostId;
                  const isSelf = member.id === myMemberId;
                  const franchise = member.teamId ? IPL_FRANCHISES[member.teamId] : null;

                  return (
                    <div
                      key={member.id}
                      className="bg-[#0A0B14] border border-[#1E2246] rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 hover:border-[#282E5C] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        {member.teamId ? (
                          <div className="w-10 h-10 rounded-xl bg-[#12142A] border border-[#1E2246] flex items-center justify-center p-1">
                            <TeamLogo teamId={member.teamId} className="w-7 h-7" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-[#12142A] border border-[#1E2246] flex items-center justify-center text-xs font-heading font-bold text-[#8F9CAE]">
                            ?
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-heading font-black text-sm text-white uppercase tracking-tight">
                              {member.nickname}
                            </span>
                            {isHost && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-heading font-black uppercase bg-[#C8FF3D]/15 text-[#C8FF3D] border border-[#C8FF3D]/30">
                                Host
                              </span>
                            )}
                            {isSelf && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-heading font-black uppercase bg-[#7C5CFF]/15 text-[#7C5CFF] border border-[#7C5CFF]/30">
                                You
                              </span>
                            )}
                            {member.isBot && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-[#FFC93D]/15 text-[#FFC93D]">
                                BOT
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#8F9CAE]">
                            {franchise ? `${franchise.name} (${member.teamId})` : 'No team selected'}
                            {' • '}
                            <span className={member.connected ? 'text-[#C8FF3D]' : 'text-[#FF3B5C]'}>
                              {member.connected ? 'Connected' : 'Offline'}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Kick Button (Feature 6) */}
                      {!isHost && !isSelf && (
                        <button
                          onClick={() => setConfirmDialog({
                            title: `Kick ${member.nickname}?`,
                            description: `Are you sure you want to remove ${member.nickname} from the auction room? They will be immediately disconnected, their bidding access revoked, and they will be prevented from re-entering.`,
                            actionType: 'kick',
                            payload: { memberId: member.id, nickname: member.nickname }
                          })}
                          className="py-1.5 px-3 rounded-xl bg-[#1E2246] hover:bg-[#FF3B5C] text-[#8F9CAE] hover:text-white font-heading font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 border border-[#1E2246] hover:border-[#FF3B5C]"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          <span>Kick Out</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: AUCTION SETTINGS (Features 4 & 5) */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              
              {/* FEATURE 4: Auction Timer Settings */}
              <div className="bg-[#0A0B14] border border-[#1E2246] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#C8FF3D]" />
                    <h3 className="font-heading font-black text-sm uppercase tracking-wider text-white">
                      Bid Round Countdown Timer
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#C8FF3D]">
                    Current: {roomState.settings.timerDuration}s
                  </span>
                </div>

                <p className="text-xs text-[#8F9CAE] leading-relaxed">
                  Adjust countdown duration per bid round. Changes apply safely from the next round or bid without corrupting ongoing bidding.
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  {timerPresets.map(duration => (
                    <button
                      key={duration}
                      onClick={() => {
                        onUpdateTimer(duration);
                        setCustomTimerInput(String(duration));
                        showFeedback(`Round timer updated to ${duration} seconds.`);
                      }}
                      className={`py-2 px-3.5 rounded-xl text-xs font-mono font-bold transition-all border ${
                        roomState.settings.timerDuration === duration
                          ? 'bg-[#C8FF3D] text-[#0A0B14] border-[#C8FF3D] shadow-[0_0_12px_rgba(200,255,61,0.2)]'
                          : 'bg-[#12142A] text-[#8F9CAE] border-[#1E2246] hover:text-white'
                      }`}
                    >
                      {duration}s
                    </button>
                  ))}

                  {/* Custom input */}
                  <div className="flex items-center gap-2 ml-auto">
                    <input
                      type="number"
                      min="3"
                      max="60"
                      value={customTimerInput}
                      onChange={(e) => setCustomTimerInput(e.target.value)}
                      placeholder="Sec"
                      className="w-16 py-1.5 px-2 rounded-xl bg-[#12142A] border border-[#1E2246] text-center font-mono text-xs text-white focus:outline-none focus:border-[#C8FF3D]"
                    />
                    <button
                      onClick={() => {
                        const val = parseInt(customTimerInput, 10);
                        if (val >= 3 && val <= 60) {
                          onUpdateTimer(val);
                          showFeedback(`Custom round timer set to ${val}s.`);
                        } else {
                          showFeedback('Duration must be between 3 and 60 seconds.', 'error');
                        }
                      }}
                      className="py-1.5 px-3 rounded-xl bg-[#1E2246] hover:bg-[#282E5C] text-[#C8FF3D] border border-[#C8FF3D]/30 text-xs font-heading font-black uppercase tracking-wider"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>

              {/* FEATURE 5: Minimum Bid Increment */}
              <div className="bg-[#0A0B14] border border-[#1E2246] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-[#FFC93D]" />
                    <h3 className="font-heading font-black text-sm uppercase tracking-wider text-white">
                      Minimum Bid Increment
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#FFC93D]">
                    Current: ₹{(roomState.settings.minBidIncrement / 100000).toFixed(0)} Lakh
                  </span>
                </div>

                <p className="text-xs text-[#8F9CAE] leading-relaxed">
                  Controls the step value when participants press the Quick Bid (+Increment) button.
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  {incrementPresets.map(preset => (
                    <button
                      key={preset.value}
                      onClick={() => {
                        if (onUpdateSettings) {
                          onUpdateSettings({ minBidIncrement: preset.value });
                          showFeedback(`Min bid increment updated to ${preset.label}.`);
                        }
                      }}
                      className={`py-2 px-3.5 rounded-xl text-xs font-mono font-bold transition-all border ${
                        roomState.settings.minBidIncrement === preset.value
                          ? 'bg-[#FFC93D] text-[#0A0B14] border-[#FFC93D] shadow-[0_0_12px_rgba(255,201,61,0.2)]'
                          : 'bg-[#12142A] text-[#8F9CAE] border-[#1E2246] hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#1E2246] bg-[#101226] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#8F9CAE]">
            <Crown className="w-3.5 h-3.5 text-[#C8FF3D]" />
            <span>Room Host Session</span>
          </div>
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-[#1E2246] hover:bg-[#282E5C] text-white text-xs font-heading font-bold uppercase tracking-wider transition-all"
          >
            Done
          </button>
        </div>

      </div>

      {/* CONFIRMATION MODAL OVERLAY */}
      {confirmDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-[#0A0B14]/90 backdrop-blur-md animate-fadeIn font-body">
          <div className="bg-[#12142A] max-w-md w-full rounded-3xl p-6 border border-[#23274D] shadow-2xl relative text-white space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#0A0B14] text-[#FF3B5C] flex items-center justify-center border border-[#FF3B5C]/30">
                <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-heading font-black text-base uppercase tracking-tight text-white">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs text-[#8F9CAE]">Confirmation Required</p>
              </div>
            </div>

            <p className="text-xs text-[#8F9CAE] leading-relaxed bg-[#0A0B14] p-4 rounded-xl border border-[#1E2246]">
              {confirmDialog.description}
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-[#0A0B14] hover:bg-[#181B38] text-[#8F9CAE] hover:text-white text-xs font-heading font-bold uppercase tracking-wider transition-all border border-[#1E2246]"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteConfirm}
                className="flex-1 py-3 px-4 rounded-xl bg-[#FF3B5C] hover:bg-[#E02E4E] text-white text-xs font-heading font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(255,59,92,0.3)]"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
