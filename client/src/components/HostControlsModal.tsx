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
  ShieldAlert,
  Search,
  UserPlus,
  Sliders,
  Layers,
  ArrowRight
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
  onReAuctionParticularPlayer?: (playerId: string) => void;
  onSkipMultiplePlayers: (count: number) => void;
  onKickMember: (targetMemberId: string) => void;
  onUpdateTimer: (duration: number) => void;
  onUpdateTradeTimer?: (durationSec: number) => void;
  onUpdateSettings?: (settings: any) => void;
  onDrawRandomPlayer?: (category: PlayerCategory, basePriceInr: number) => void;
}

type TabType = 'auction' | 'players' | 'room';

export const HostControlsModal = React.memo<HostControlsModalProps>(({
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
  onReAuctionParticularPlayer,
  onSkipMultiplePlayers,
  onKickMember,
  onUpdateTimer,
  onUpdateTradeTimer,
  onUpdateSettings,
  onDrawRandomPlayer
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('players');
  const [reAuctionSubMode, setReAuctionSubMode] = useState<'all' | 'random' | 'particular'>('particular');
  
  // Particular player search query
  const [particularSearch, setParticularSearch] = useState('');

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    actionType: 'end' | 'restart' | 'recall_unsold' | 'kick' | 'skip_multiple';
    payload?: any;
  } | null>(null);

  // Random Draw Unsold & Skipped State
  const [drawCount, setDrawCount] = useState<number>(1);
  const [drawnPreviewPlayers, setDrawnPreviewPlayers] = useState<Array<{ player: Player; status: 'UNSOLD' | 'SKIPPED' }> | null>(null);

  // Skip Multiple State
  const [skipCount, setSkipCount] = useState<number>(2);

  // Timer State
  const [customTimerInput, setCustomTimerInput] = useState<string>(
    String(roomState.settings.timerDuration || 10)
  );

  // Feedback banner
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const isTopHost = myMemberId ? roomState.hostId === myMemberId : false;

  // Compute eligible unsold and skipped players strictly from authoritative state
  const eligibleUnsoldAndSkippedPlayers = useMemo(() => {
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

    const map = new Map<string, { player: Player; status: 'UNSOLD' | 'SKIPPED' }>();

    for (const lot of roomState.history || []) {
      if (lot.status === 'UNSOLD' || lot.status === 'SKIPPED') {
        if (!soldPlayerIds.has(lot.player.id) && !queuedPlayerIds.has(lot.player.id)) {
          map.set(lot.player.id, {
            player: lot.player,
            status: lot.status
          });
        }
      }
    }

    if (roomState.lots) {
      for (const lot of roomState.lots) {
        if (lot.status === 'UNSOLD' || lot.status === 'SKIPPED') {
          if (!soldPlayerIds.has(lot.player.id) && !queuedPlayerIds.has(lot.player.id)) {
            map.set(lot.player.id, {
              player: lot.player,
              status: lot.status
            });
          }
        }
      }
    }

    return Array.from(map.values());
  }, [roomState]);

  // Filtered particular unsold & skipped list
  const filteredParticularUnsold = useMemo(() => {
    if (!particularSearch.trim()) return eligibleUnsoldAndSkippedPlayers;
    const query = particularSearch.toLowerCase().trim();
    return eligibleUnsoldAndSkippedPlayers.filter(({ player: p }) => 
      p.name.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query) ||
      p.nationality.toLowerCase().includes(query)
    );
  }, [eligibleUnsoldAndSkippedPlayers, particularSearch]);

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

  // Strict Top Host security gate on UI level
  if (!isTopHost) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0B14]/85 backdrop-blur-md animate-fadeIn font-body">
        <div className="bg-[#12142A] max-w-md w-full rounded-3xl p-6 border border-[#FF3B5C]/30 shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0A0B14] text-[#FF3B5C] border border-[#FF3B5C]/30 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h3 className="font-heading font-black text-base uppercase text-white">Access Denied</h3>
          <p className="text-xs text-[#8F9CAE] leading-relaxed">
            Only the top host (the original room creator) has administrative privileges to access auction management controls.
          </p>
          <button
            onClick={onClose}
            className="py-2.5 px-6 rounded-xl bg-[#1E2246] hover:bg-[#282E5C] text-white text-xs font-heading font-bold uppercase"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const isAuctionActive = roomState.status === 'AUCTION';
  const isAuctionPaused = roomState.status === 'PAUSED';

  // Handler for random draw unsold & skipped preview
  const handleGenerateDrawPreview = () => {
    if (eligibleUnsoldAndSkippedPlayers.length === 0) {
      showFeedback('No unsold or skipped players available to draw.', 'error');
      return;
    }
    const count = Math.min(drawCount, eligibleUnsoldAndSkippedPlayers.length);
    const shuffled = [...eligibleUnsoldAndSkippedPlayers].sort(() => Math.random() - 0.5);
    setDrawnPreviewPlayers(shuffled.slice(0, count));
  };

  const handleConfirmDrawUnsold = () => {
    if (!drawnPreviewPlayers || drawnPreviewPlayers.length === 0) return;
    const playerIds = drawnPreviewPlayers.map(item => item.player.id);
    onRandomDrawUnsold(playerIds.length, playerIds);
    setDrawnPreviewPlayers(null);
    showFeedback(`Successfully added ${playerIds.length} unsold & skipped player(s) back into the auction queue!`);
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
        showFeedback(`Recalled all eligible unsold players into the active queue!`);
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
                  Host Controls
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-heading font-extrabold uppercase bg-[#C8FF3D]/15 text-[#C8FF3D] border border-[#C8FF3D]/30">
                  Top Host
                </span>
              </div>
              <p className="text-xs text-[#8F9CAE]">Authoritative room controls for room {roomState.roomCode}</p>
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

        {/* 3 Main Navigation Tabs per Requirement 5 */}
        <div className="flex items-center border-b border-[#1E2246] bg-[#0E1022] px-3 sm:px-6">
          <button
            onClick={() => setActiveTab('players')}
            className={`py-3.5 px-4 font-heading text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'players'
                ? 'border-[#C8FF3D] text-[#C8FF3D] bg-[#C8FF3D]/5'
                : 'border-transparent text-[#8F9CAE] hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Player Management</span>
            {eligibleUnsoldAndSkippedPlayers.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#FFC93D] text-[#0A0B14] font-mono text-[10px] font-black flex items-center justify-center">
                {eligibleUnsoldAndSkippedPlayers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('auction')}
            className={`py-3.5 px-4 font-heading text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'auction'
                ? 'border-[#C8FF3D] text-[#C8FF3D] bg-[#C8FF3D]/5'
                : 'border-transparent text-[#8F9CAE] hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Auction Management</span>
          </button>

          <button
            onClick={() => setActiveTab('room')}
            className={`py-3.5 px-4 font-heading text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'room'
                ? 'border-[#C8FF3D] text-[#C8FF3D] bg-[#C8FF3D]/5'
                : 'border-transparent text-[#8F9CAE] hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Room Management</span>
            <span className="w-5 h-5 rounded-full bg-[#1E2246] text-[#8F9CAE] font-mono text-[10px] font-bold flex items-center justify-center">
              {Object.keys(roomState.members || {}).length}
            </span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* SECTION 1: PLAYER MANAGEMENT */}
          {activeTab === 'players' && (
            <div className="space-y-6">
              
              {/* UNSOLD & SKIPPED PLAYERS */}
              <div className="bg-[#0A0B14] border border-[#1E2246] rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E2246] pb-3">
                  <div>
                    <h3 className="font-heading font-black text-sm uppercase tracking-wider text-white flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-[#C8FF3D]" />
                      <span>UNSOLD & SKIPPED PLAYERS</span>
                    </h3>
                    <p className="text-xs text-[#8F9CAE] mt-0.5">
                      Recall players who went unsold or were skipped back into the live auction pool at any point.
                    </p>
                  </div>

                  {/* 3 Sub-Modes Selector: Particular, Random Draw, All Unsold */}
                  <div className="flex items-center gap-1 bg-[#12142A] p-1 rounded-xl border border-[#1E2246]">
                    <button
                      onClick={() => setReAuctionSubMode('particular')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-heading font-bold uppercase transition-all ${
                        reAuctionSubMode === 'particular'
                          ? 'bg-[#C8FF3D] text-[#0A0B14]'
                          : 'text-[#8F9CAE] hover:text-white'
                      }`}
                    >
                      Particular Player
                    </button>
                    <button
                      onClick={() => setReAuctionSubMode('random')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-heading font-bold uppercase transition-all ${
                        reAuctionSubMode === 'random'
                          ? 'bg-[#FFC93D] text-[#0A0B14]'
                          : 'text-[#8F9CAE] hover:text-white'
                      }`}
                    >
                      Random Draw
                    </button>
                    <button
                      onClick={() => setReAuctionSubMode('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-heading font-bold uppercase transition-all ${
                        reAuctionSubMode === 'all'
                          ? 'bg-[#7C5CFF] text-white'
                          : 'text-[#8F9CAE] hover:text-white'
                      }`}
                    >
                      Bring All Back
                    </button>
                  </div>
                </div>

                {/* SUBMODE 1C: DRAW PARTICULAR PLAYER */}
                {reAuctionSubMode === 'particular' && (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs text-[#8F9CAE]">
                      <span>Select any unsold or skipped player to queue them up for the next slot:</span>
                      <span className="font-mono text-[#C8FF3D]">{eligibleUnsoldAndSkippedPlayers.length} eligible</span>
                    </div>

                    <div className="relative">
                      <Search className="w-4 h-4 text-[#8F9CAE] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search unsold & skipped players by name, category, or nationality..."
                        value={particularSearch}
                        onChange={(e) => setParticularSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#12142A] border border-[#1E2246] text-xs text-white placeholder-[#8F9CAE] focus:outline-none focus:border-[#C8FF3D]"
                      />
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                      {filteredParticularUnsold.length === 0 ? (
                        <div className="py-8 text-center text-xs text-[#8F9CAE] bg-[#12142A] rounded-xl border border-[#1E2246]">
                          {particularSearch ? 'No players match your search filter.' : 'No players currently marked UNSOLD or SKIPPED.'}
                        </div>
                      ) : (
                        filteredParticularUnsold.map(entry => {
                          const { player: p, status } = entry;
                          const isSkipped = status === 'SKIPPED';

                          return (
                            <div 
                              key={p.id} 
                              className="bg-[#12142A] border border-[#1E2246] rounded-xl p-3 flex items-center justify-between gap-3 hover:border-[#282E5C] transition-all"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-[#0A0B14] border border-[#1E2246] flex items-center justify-center shrink-0 overflow-hidden">
                                  {p.image_url ? (
                                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover object-top" />
                                  ) : (
                                    <span className={`font-heading font-black text-[10px] ${isSkipped ? 'text-[#FFC93D]' : 'text-[#C8FF3D]'}`}>
                                      {p.name.slice(0, 2)}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-heading font-bold text-xs text-white uppercase truncate block">
                                      {p.name}
                                    </span>
                                    {isSkipped ? (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-heading font-black uppercase bg-[#FFC93D]/15 text-[#FFC93D] border border-[#FFC93D]/30 shrink-0">
                                        SKIPPED
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-heading font-black uppercase bg-[#FF3B5C]/15 text-[#FF3B5C] border border-[#FF3B5C]/30 shrink-0">
                                        UNSOLD
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-[#8F9CAE] flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[#C8FF3D] font-medium">{p.category}</span>
                                    <span>•</span>
                                    <span>{p.is_overseas ? `✈️ ${p.nationality}` : `🇮🇳 ${p.nationality}`}</span>
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs font-mono font-bold text-[#FFC93D]">
                                  {p.base_price_display}
                                </span>
                                <button
                                  onClick={() => {
                                    if (onReAuctionParticularPlayer) {
                                      onReAuctionParticularPlayer(p.id);
                                      showFeedback(`${p.name} (${status}) brought back to auction!`);
                                    }
                                  }}
                                  className="py-1.5 px-3 rounded-lg bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] font-heading font-black text-[11px] uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Bring Back to Auction</span>
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* SUBMODE 1B: RANDOM DRAW */}
                {reAuctionSubMode === 'random' && (
                  <div className="space-y-4 animate-fadeIn">
                    <p className="text-xs text-[#8F9CAE] leading-relaxed">
                      Choose how many unsold & skipped players to draw. Preview the selected players, re-draw if unsatisfied, and confirm to add only the selected players into the upcoming queue.
                    </p>

                    {!drawnPreviewPlayers ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-heading font-bold uppercase text-[#8F9CAE]">Quantity:</span>
                        {[1, 2, 3, 5].map(cnt => (
                          <button
                            key={cnt}
                            onClick={() => setDrawCount(cnt)}
                            disabled={eligibleUnsoldAndSkippedPlayers.length === 0}
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
                            max={Math.max(1, eligibleUnsoldAndSkippedPlayers.length)}
                            value={drawCount}
                            onChange={(e) => setDrawCount(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-16 py-1.5 px-2 rounded-lg bg-[#12142A] border border-[#1E2246] text-center font-mono text-xs text-white focus:outline-none focus:border-[#FFC93D]"
                          />
                        </div>

                        <button
                          onClick={handleGenerateDrawPreview}
                          disabled={eligibleUnsoldAndSkippedPlayers.length === 0}
                          className={`ml-auto py-2 px-4 rounded-xl font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
                            eligibleUnsoldAndSkippedPlayers.length > 0
                              ? 'bg-[#FFC93D] hover:bg-[#E5B535] text-[#0A0B14] shadow-[0_0_15px_rgba(255,201,61,0.2)]'
                              : 'bg-[#1E2246] text-[#8F9CAE]/50 cursor-not-allowed'
                          }`}
                        >
                          <Dice5 className="w-3.5 h-3.5" />
                          <span>Draw Players</span>
                        </button>
                      </div>
                    ) : (
                      <div className="bg-[#12142A] border border-[#FFC93D]/30 rounded-xl p-4 space-y-3">
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
                          {drawnPreviewPlayers.map(entry => {
                            const { player: p, status } = entry;
                            const isSkipped = status === 'SKIPPED';

                            return (
                              <div key={p.id} className="bg-[#0A0B14] border border-[#1E2246] rounded-lg p-2.5 flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-heading font-black text-white uppercase">{p.name}</p>
                                    <span className={`px-1.5 py-0.2 rounded-full text-[8px] font-heading font-black uppercase ${
                                      isSkipped
                                        ? 'bg-[#FFC93D]/15 text-[#FFC93D] border border-[#FFC93D]/30'
                                        : 'bg-[#FF3B5C]/15 text-[#FF3B5C] border border-[#FF3B5C]/30'
                                    }`}>
                                      {status}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-[#8F9CAE]">{p.category} • {p.nationality}</p>
                                </div>
                                <span className="text-xs font-mono font-bold text-[#C8FF3D]">
                                  ₹{(p.base_price_inr / 10000000).toFixed(2)} Cr
                                </span>
                              </div>
                            );
                          })}
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
                )}

                {/* SUBMODE 1A: BRING ALL UNSOLD & SKIPPED BACK */}
                {reAuctionSubMode === 'all' && (
                  <div className="space-y-4 animate-fadeIn">
                    <p className="text-xs text-[#8F9CAE] leading-relaxed">
                      Restores all players previously marked UNSOLD or SKIPPED into the active auction queue. Original base prices and player attributes are preserved.
                    </p>

                    <div className="flex items-center justify-between bg-[#12142A] p-4 rounded-xl border border-[#1E2246]">
                      <div>
                        <span className="text-xs font-heading font-extrabold text-white block uppercase">
                          Eligible Pool: {eligibleUnsoldAndSkippedPlayers.length} Player(s)
                        </span>
                        <span className="text-[11px] text-[#8F9CAE]">
                          No duplicate entries will be created. Sold players will not be touched.
                        </span>
                      </div>

                      <button
                        onClick={() => setConfirmDialog({
                          title: 'Bring All Unsold & Skipped Players Back?',
                          description: `Are you sure you want to recall all ${eligibleUnsoldAndSkippedPlayers.length} unsold and skipped player(s) to the auction queue? Their base prices will be preserved.`,
                          actionType: 'recall_unsold'
                        })}
                        disabled={eligibleUnsoldAndSkippedPlayers.length === 0}
                        className={`py-2.5 px-5 rounded-xl font-heading font-black text-xs uppercase tracking-wider transition-all shrink-0 ${
                          eligibleUnsoldAndSkippedPlayers.length > 0
                            ? 'bg-[#7C5CFF] hover:bg-[#6846EB] text-white shadow-[0_0_15px_rgba(124,92,255,0.3)]'
                            : 'bg-[#1E2246] text-[#8F9CAE]/50 cursor-not-allowed border border-[#1E2246]'
                        }`}
                      >
                        Bring All Back
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* RE-AUCTION SOLD PLAYERS SHORTCUT NOTICE (Section 2) */}
              <div className="bg-[#0A0B14] border border-[#FF3B5C]/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[#FF3B5C]">
                    <RotateCcw className="w-4 h-4" />
                    <h4 className="font-heading font-black text-xs uppercase tracking-wider">
                      Re-Auction Sold Players
                    </h4>
                  </div>
                  <p className="text-[11px] text-[#8F9CAE] leading-relaxed">
                    To re-auction players who have already been sold, visit the <strong className="text-white">Players</strong> tab and switch to the <strong className="text-[#C8FF3D]">Sold Players</strong> table. Clicking "Re-Auction" will reverse the sale, refund the buyer's purse, and return the player to the auction ring.
                  </p>
                </div>
              </div>

              {/* SKIP MULTIPLE PLAYERS (Section 5) */}
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

            </div>
          )}

          {/* SECTION 2: AUCTION MANAGEMENT (Requirement 5) */}
          {activeTab === 'auction' && (
            <div className="space-y-6">
              
              {/* Timer Settings */}
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

              {/* Trade Decision Timer Duration */}
              <div className="bg-[#0A0B14] border border-[#1E2246] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#7C5CFF]" />
                    <h3 className="font-heading font-black text-sm uppercase tracking-wider text-white">
                      Trade Decision Timer
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-[#7C5CFF] font-bold">
                    Current: {roomState.settings.tradeTimerDuration || 45}s
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {[15, 30, 45, 60, 90, 120].map(duration => (
                    <button
                      key={duration}
                      onClick={() => {
                        onUpdateTradeTimer && onUpdateTradeTimer(duration);
                        showFeedback(`Trade decision timer updated to ${duration} seconds.`);
                      }}
                      className={`py-2 px-3.5 rounded-xl text-xs font-mono font-bold transition-all border ${
                        (roomState.settings.tradeTimerDuration || 45) === duration
                          ? 'bg-[#7C5CFF] text-white border-[#7C5CFF] shadow-[0_0_12px_rgba(124,92,255,0.25)]'
                          : 'bg-[#12142A] text-[#8F9CAE] border-[#1E2246] hover:text-white'
                      }`}
                    >
                      {duration}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Minimum Bid Increment */}
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

              {/* Flow State: Pause, Resume, Reset */}
              <div className="bg-[#0A0B14] border border-[#1E2246] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-heading font-black text-sm uppercase tracking-wider text-white flex items-center gap-2">
                    <span>Live Auction Flow</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      isAuctionActive ? 'bg-[#C8FF3D]/15 text-[#C8FF3D]' : 'bg-[#FFC93D]/15 text-[#FFC93D]'
                    }`}>
                      {roomState.status}
                    </span>
                  </h3>
                  <p className="text-xs text-[#8F9CAE] mt-1">
                    Freeze or resume clocks without corrupting active bids.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {isAuctionActive && (
                    <button
                      onClick={onPauseAuction}
                      className="py-2.5 px-4 rounded-xl bg-[#1E2246] hover:bg-[#282E5C] text-[#FFC93D] font-heading font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 border border-[#FFC93D]/30"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause</span>
                    </button>
                  )}

                  {isAuctionPaused && (
                    <button
                      onClick={onResumeAuction}
                      className="py-2.5 px-4 rounded-xl bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(200,255,61,0.25)]"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Resume</span>
                    </button>
                  )}

                  <button
                    onClick={() => setConfirmDialog({
                      title: 'Reset to Lobby?',
                      description: 'Warning: This will clear all squad purchases, refund team purses, and reset player lots back to the beginning. Proceed?',
                      actionType: 'restart'
                    })}
                    className="py-2.5 px-4 rounded-xl bg-[#1E2246] hover:bg-[#282E5C] text-[#8F9CAE] hover:text-white font-heading font-bold text-xs uppercase tracking-wider transition-all border border-[#1E2246] flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Lobby</span>
                  </button>
                </div>
              </div>

              {/* End Auction (Section 5) */}
              <div className="bg-[#0A0B14] border border-[#FF3B5C]/30 rounded-2xl p-5 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-[#FF3B5C]">
                      <ShieldAlert className="w-4 h-4" />
                      <h3 className="font-heading font-black text-sm uppercase tracking-wider">
                        End Auction Officially
                      </h3>
                    </div>
                    <p className="text-xs text-[#8F9CAE] mt-1 max-w-lg leading-relaxed">
                      Conclude the live auction and lock all squads. Calculating final standings, purse reserves, and navigating all participants to the final Results view.
                    </p>
                  </div>

                  <button
                    onClick={() => setConfirmDialog({
                      title: 'End Live Auction?',
                      description: 'Are you sure you want to officially end the auction? Squad purchases and purse balances will be finalized.',
                      actionType: 'end'
                    })}
                    className="py-2.5 px-5 rounded-xl bg-[#FF3B5C] hover:bg-[#E02E4E] text-white font-heading font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(255,59,92,0.3)] shrink-0"
                  >
                    End Auction Now
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* SECTION 3: ROOM MANAGEMENT (Requirement 5) */}
          {activeTab === 'room' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#1E2246]">
                <h3 className="font-heading font-black text-sm uppercase tracking-wider text-white">
                  Active Room Members ({Object.keys(roomState.members || {}).length})
                </h3>
                <span className="text-xs text-[#8F9CAE]">Top host exclusive participant removal</span>
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
                                Top Host
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

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#1E2246] bg-[#101226] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#8F9CAE]">
            <Crown className="w-3.5 h-3.5 text-[#C8FF3D]" />
            <span>Top Host Session Active</span>
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
});

HostControlsModal.displayName = 'HostControlsModal';
