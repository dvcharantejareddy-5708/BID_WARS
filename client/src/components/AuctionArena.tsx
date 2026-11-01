import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Clock, 
  FastForward, 
  Pause, 
  Play, 
  RotateCcw, 
  Award, 
  Globe, 
  Shield, 
  Sparkles, 
  History, 
  Flame,
  ChevronUp,
  AlertCircle,
  Dice5,
  Tag,
  Plane,
  ChevronDown,
  Users
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  RoomState, 
  AuctionLot, 
  IPLTeamId, 
  IPL_FRANCHISES, 
  RoomMember, 
  Player,
  PlayerCategory 
} from '../types.js';
import { soundManager } from '../services/audio.js';
import { SkipPlayerModal } from './SkipPlayerModal.js';
import { TeamLogo } from './TeamLogo.js';
import { CricketPlayerSilhouette } from './CricketPlayerSilhouette.js';

interface AuctionArenaProps {
  roomState: RoomState;
  myMemberId: string;
  onPlaceBid: (amount?: number) => void;
  onSkipPlayer: () => void;
  onDrawRandomPlayer?: (category: PlayerCategory, basePriceInr: number) => void;
  onPauseAuction: () => void;
  onResumeAuction: () => void;
  onRestartAuction: () => void;
  onEndAuction: () => void;
}

const ALL_TEAMS: IPLTeamId[] = ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'PBKS', 'DC', 'GT', 'LSG'];

export const AuctionArena: React.FC<AuctionArenaProps> = ({
  roomState,
  myMemberId,
  onPlaceBid,
  onSkipPlayer,
  onDrawRandomPlayer,
  onPauseAuction,
  onResumeAuction,
  onRestartAuction,
  onEndAuction
}) => {
  const [now, setNow] = useState(Date.now());
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [showHostDraw, setShowHostDraw] = useState(false);

  // Section 16: Category & Price selection for Host Random Draw
  const [selectedCategory, setSelectedCategory] = useState<PlayerCategory>('Batsmen');
  const [selectedPriceBracket, setSelectedPriceBracket] = useState<number>(20000000); // default 2 Cr
  const [imageError, setImageError] = useState(false);

  const myMember = roomState.members[myMemberId];
  const myTeamId = myMember?.teamId;
  const isHost = myMember?.isHost;
  const lot = roomState.currentLot;

  useEffect(() => {
    setImageError(false);
  }, [lot?.player?.id]);

  // Real-time server-synced local clock ticker (every 100ms for smooth progress bar)
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, []);

  // Compute remaining seconds from server deadline
  const deadline = roomState.deadlineTimestamp || 0;
  const remainingMs = Math.max(0, deadline - now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const totalDurationMs = (roomState.settings.timerDuration || 10) * 1000;
  const progressPercent = Math.min(100, Math.max(0, (remainingMs / totalDurationMs) * 100));

  // Audio countdown ticks on final 5 seconds
  useEffect(() => {
    if (roomState.status === 'AUCTION' && lot?.status === 'IN_PROGRESS') {
      if (remainingSec > 0 && remainingSec <= 5 && remainingMs % 1000 < 150) {
        soundManager.playCountdownTick(remainingSec);
      }
    }
  }, [remainingSec, roomState.status, lot?.status]);

  // Audio & confetti on lot finalization
  useEffect(() => {
    if (lot?.status === 'SOLD') {
      soundManager.playSoldGavel();
      if (lot.winningTeam === myTeamId) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } else if (lot?.status === 'UNSOLD') {
      soundManager.playUnsoldSound();
    }
  }, [lot?.status]);

  if (!lot) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center animate-fadeIn">
        <div className="bg-[#0D0D0D] border border-[#262626] p-6 rounded-2xl shadow-2xl">
          <Trophy className="w-10 h-10 text-[#FFC857] mx-auto mb-3 animate-bounce" />
          <h2 className="text-xl font-bold font-display text-white mb-1">Preparing Next Lot...</h2>
          <p className="text-xs text-[#8E8E93]">Loading official verified player records.</p>
        </div>
      </div>
    );
  }

  const player = lot.player;
  const currentBid = lot.currentBid;
  const minIncrement = roomState.settings.minBidIncrement;
  const nextMinBid = currentBid === 0 ? player.base_price_inr : currentBid + minIncrement;

  // Validation for My Team's Bidding
  const mySquad = myTeamId ? (roomState.teamSquads[myTeamId] || []) : [];
  const myPurse = myTeamId ? (roomState.teamPurse[myTeamId] || 0) : 0;
  const isHighestBidder = myTeamId && lot.currentBidder === myTeamId;
  const isSquadFull = mySquad.length >= roomState.settings.maxSquad;
  const myOverseasCount = mySquad.filter(p => p.is_overseas).length;
  const isOverseasFull = player.is_overseas && myOverseasCount >= roomState.settings.maxOverseas;

  // Mathematical squad reserve feasibility check
  const slotsRemainingNeeded = Math.max(0, roomState.settings.minSquad - (mySquad.length + 1));
  const minReserveRequired = slotsRemainingNeeded * 3000000;
  const maxPossibleBid = myPurse - minReserveRequired;
  const hasInsufficientPurse = nextMinBid > maxPossibleBid;

  const canBid =
    roomState.status === 'AUCTION' &&
    lot.status === 'IN_PROGRESS' &&
    myTeamId &&
    !isHighestBidder &&
    !isSquadFull &&
    !isOverseasFull &&
    !hasInsufficientPurse;

  let bidDisabledReason = '';
  if (!myTeamId) bidDisabledReason = 'Select a franchise to bid';
  else if (roomState.status === 'PAUSED') bidDisabledReason = 'Auction is paused';
  else if (lot.status !== 'IN_PROGRESS') bidDisabledReason = 'Lot is finalized';
  else if (isHighestBidder) bidDisabledReason = 'Your team holds the highest bid';
  else if (isSquadFull) bidDisabledReason = 'Maximum squad limit (25) reached';
  else if (isOverseasFull) bidDisabledReason = 'Overseas limit reached (8/8) — cannot bid on overseas players';
  else if (hasInsufficientPurse) {
    bidDisabledReason = `Purse reserve required: ₹${(minReserveRequired / 10000000).toFixed(2)} Cr needed to fill squad`;
  }

  // Quick increment amounts
  const quickIncrements = [
    { label: `+₹${(minIncrement / 100000).toFixed(0)}L`, amount: nextMinBid },
    { label: '+₹50L', amount: currentBid === 0 ? player.base_price_inr + 5000000 : currentBid + 5000000 },
    { label: '+₹1.0 Cr', amount: currentBid === 0 ? player.base_price_inr + 10000000 : currentBid + 10000000 },
    { label: '+₹2.0 Cr', amount: currentBid === 0 ? player.base_price_inr + 20000000 : currentBid + 20000000 }
  ];

  const remainingLots = Math.max(0, (lot.totalLots || 359) - lot.lotNumber);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 space-y-3.5">
      {/* Set & Lot Progress Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0D0D0D] border border-[#262626] px-3.5 py-2 rounded-xl text-xs shadow-md">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold text-[#00E676] bg-[#00E676]/10 px-2.5 py-0.5 rounded-full border border-[#00E676]/20 text-[11px]">
            Set {roomState.currentSetOrder}/{roomState.totalSets}
          </span>
          <span className="text-[#8E8E93] hidden sm:inline">·</span>
          <span className="font-semibold text-white truncate max-w-[220px] sm:max-w-none">
            {player.set_name}
          </span>
          {player.is_marquee && (
            <span className="bg-[#FFC857]/20 text-[#FFC857] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#FFC857]/40 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#FFC857]" />
              MARQUEE
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="text-[#8E8E93]">
            Lot <strong className="text-white font-bold">#{lot.lotNumber}</strong> of {lot.totalLots}
          </span>
          <span className="text-[#8E8E93] hidden md:inline">
            ({remainingLots} remaining)
          </span>

          {roomState.status === 'PAUSED' ? (
            <span className="bg-[#FFC857]/20 text-[#FFC857] font-bold px-2.5 py-0.5 rounded-full border border-[#FFC857]/40 flex items-center gap-1 text-[11px]">
              <Pause className="w-3 h-3" /> PAUSED
            </span>
          ) : (
            <span className="bg-[#00E676]/20 text-[#00E676] font-bold px-2.5 py-0.5 rounded-full border border-[#00E676]/40 flex items-center gap-1 text-[11px] animate-pulse">
              <Flame className="w-3 h-3 text-[#00E676]" /> LIVE
            </span>
          )}
        </div>
      </div>

      {/* Main 2-Column Dashboard Layout
          LEFT: Auction Information & Live Purse Matrix
          RIGHT: Active Player Card with Details at Top, Silhouette Below, & Bidding
      */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* ======================================================== */}
        {/* LEFT COLUMN: AUCTION INFORMATION & CONTROLS (5 cols)    */}
        {/* Order 2 on mobile, Order 1 on Desktop                    */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 flex flex-col gap-3.5 order-2 lg:order-1">
          
          {/* User's Team & Remaining Purse Card */}
          {myTeamId ? (
            <div className="bg-[#0D0D0D] border border-[#262626] rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <TeamLogo teamId={myTeamId} className="w-10 h-10" />
                  <div>
                    <span className="text-[10px] text-[#00E676] font-bold uppercase tracking-wider block">
                      YOUR FRANCHISE · {myMember?.nickname}
                    </span>
                    <h3 className="font-display font-black text-sm text-white leading-tight">
                      {IPL_FRANCHISES[myTeamId].name}
                    </h3>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-[#8E8E93] uppercase font-semibold block">
                    Purse Balance
                  </span>
                  <span className="text-lg font-mono font-black text-[#00E676]">
                    ₹{(myPurse / 10000000).toFixed(2)} Cr
                  </span>
                </div>
              </div>

              {/* Squad & Overseas Indicators */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#151515] border border-[#262626] rounded-xl p-2 flex items-center justify-between">
                  <span className="text-[#8E8E93] text-[11px] flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-[#00E676]" /> Squad:
                  </span>
                  <span className="font-mono font-bold text-white">
                    {mySquad.length} / {roomState.settings.maxSquad}
                  </span>
                </div>

                <div className={`rounded-xl p-2 flex items-center justify-between border ${
                  myOverseasCount >= roomState.settings.maxOverseas
                    ? 'bg-[#FF5252]/10 border-[#FF5252]/30 text-[#FF5252]'
                    : 'bg-[#151515] border-[#262626] text-white'
                }`}>
                  <span className="text-[11px] flex items-center gap-1">
                    <Plane className="w-3.5 h-3.5 text-[#FFC857]" /> Overseas:
                  </span>
                  <span className="font-mono font-bold">
                    {myOverseasCount} / {roomState.settings.maxOverseas}
                    {myOverseasCount >= roomState.settings.maxOverseas && (
                      <span className="ml-1 text-[9px] font-black uppercase text-[#FF5252]">(MAX)</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#0D0D0D] border border-[#262626] rounded-2xl p-3.5 shadow-xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1A1A1A] border border-[#2E2E2E] flex items-center justify-center text-xs font-bold text-[#8E8E93]">
                👁
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Spectator Mode</span>
                <span className="text-[11px] text-[#8E8E93]">Select a franchise in the waiting lobby to bid</span>
              </div>
            </div>
          )}

          {/* Compact 10-Franchise Purse Summary Grid */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-2xl p-3.5 shadow-xl">
            <div className="flex items-center justify-between mb-2.5 px-0.5">
              <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-[#FFC857]" />
                All 10 Franchises Live Purse
              </span>
              <span className="text-[10px] text-[#8E8E93] font-mono">
                Max 8 OS
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 max-h-[220px] overflow-y-auto pr-1">
              {ALL_TEAMS.map((teamKey) => {
                const franchise = IPL_FRANCHISES[teamKey];
                const teamPurse = roomState.teamPurse[teamKey] || 0;
                const teamSquad = roomState.teamSquads[teamKey] || [];
                const osCount = teamSquad.filter(p => p.is_overseas).length;
                const isLeading = lot.currentBidder === teamKey;
                const isMine = myTeamId === teamKey;

                return (
                  <div
                    key={teamKey}
                    className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-all ${
                      isLeading
                        ? 'bg-[#00E676]/10 border-[#00E676] shadow-[0_0_10px_rgba(0,230,118,0.2)]'
                        : isMine
                        ? 'bg-[#181818] border-[#FFC857]/40'
                        : 'bg-[#151515] border-[#222222]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <TeamLogo teamId={teamKey} className="w-6 h-6 shrink-0" />
                      <div className="truncate">
                        <span className="font-bold text-white text-[11px] block truncate">
                          {franchise.shortName}
                        </span>
                        <span className="text-[10px] text-[#8E8E93] font-mono block">
                          ₹{(teamPurse / 10000000).toFixed(1)} Cr
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono text-[10px]">
                      <span className="text-slate-300 block">{teamSquad.length}/25</span>
                      <span className={osCount >= 8 ? 'text-[#FF5252] font-bold' : 'text-[#8E8E93]'}>
                        {osCount} OS
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 16 Host Control: Collapsible Category & Price Random Draw */}
          {isHost && onDrawRandomPlayer && (
            <div className="bg-[#0D0D0D] border border-[#FFC857]/40 rounded-2xl p-3.5 space-y-2.5 shadow-xl">
              <div 
                onClick={() => setShowHostDraw(!showHostDraw)}
                className="flex items-center justify-between cursor-pointer select-none"
              >
                <span className="text-xs font-bold text-[#FFC857] flex items-center gap-1.5 uppercase tracking-wider">
                  <Dice5 className="w-3.5 h-3.5 text-[#FFC857]" />
                  Section 16: Category & Price Random Draw
                </span>
                <span className="text-[11px] text-[#8E8E93] flex items-center gap-1 hover:text-white">
                  <span>{showHostDraw ? 'Collapse' : 'Expand'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHostDraw ? 'rotate-180' : ''}`} />
                </span>
              </div>

              {showHostDraw && (
                <div className="pt-2 border-t border-[#262626] space-y-2.5 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-[#8E8E93] uppercase font-semibold block mb-1">
                        Category:
                      </label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value as PlayerCategory)}
                        className="w-full bg-[#151515] border border-[#262626] text-white text-xs rounded-xl px-2.5 py-1.5 outline-none focus:border-[#FFC857]"
                      >
                        <option value="Batsmen">🏏 Batsmen</option>
                        <option value="Bowlers">🎯 Bowlers</option>
                        <option value="All-rounders">⚡ All-rounders</option>
                        <option value="Wicket-keepers">🧤 Wicket-keepers</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-[#8E8E93] uppercase font-semibold block mb-1">
                        Price Bracket:
                      </label>
                      <select
                        value={selectedPriceBracket}
                        onChange={(e) => setSelectedPriceBracket(Number(e.target.value))}
                        className="w-full bg-[#151515] border border-[#262626] text-white text-xs rounded-xl px-2.5 py-1.5 outline-none focus:border-[#FFC857]"
                      >
                        <option value={20000000}>₹2.00 Crore</option>
                        <option value={15000000}>₹1.50 Crore</option>
                        <option value={10000000}>₹1.00 Crore</option>
                        <option value={7500000}>₹75 Lakh</option>
                        <option value={5000000}>₹50 Lakh</option>
                        <option value={4000000}>₹40 Lakh</option>
                        <option value={3000000}>₹30 Lakh</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={() => onDrawRandomPlayer(selectedCategory, selectedPriceBracket)}
                    className="w-full bg-[#FFC857] hover:bg-[#ffcf6e] active:scale-[0.99] text-black font-display font-bold py-2 px-4 rounded-full transition-all text-xs flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Dice5 className="w-3.5 h-3.5" />
                    <span>Draw Random {selectedCategory} ({selectedPriceBracket >= 10000000 ? `₹${(selectedPriceBracket / 10000000).toFixed(2)} Cr` : `₹${(selectedPriceBracket / 100000).toFixed(0)}L`})</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Host Standard Controls (Skip, Pause, Restart) */}
          {isHost && (
            <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs shadow-md">
              <span className="font-bold text-[#8E8E93] flex items-center gap-1 text-[11px]">
                <Shield className="w-3.5 h-3.5 text-[#00E676]" />
                HOST CONTROLS
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowSkipModal(true)}
                  className="px-2.5 py-1 bg-[#151515] hover:bg-[#222222] text-[#FFC857] border border-[#FFC857]/30 rounded-full font-bold transition-all flex items-center gap-1 text-[11px]"
                >
                  <FastForward className="w-3 h-3" />
                  <span>Skip</span>
                </button>

                {roomState.status === 'AUCTION' ? (
                  <button
                    onClick={onPauseAuction}
                    className="px-2.5 py-1 bg-[#151515] hover:bg-[#222222] text-white border border-[#262626] rounded-full font-bold transition-all flex items-center gap-1 text-[11px]"
                  >
                    <Pause className="w-3 h-3" />
                    <span>Pause</span>
                  </button>
                ) : (
                  <button
                    onClick={onResumeAuction}
                    className="px-2.5 py-1 bg-[#00E676]/20 hover:bg-[#00E676]/30 text-[#00E676] border border-[#00E676]/40 rounded-full font-bold transition-all flex items-center gap-1 text-[11px]"
                  >
                    <Play className="w-3 h-3" />
                    <span>Resume</span>
                  </button>
                )}

                <button
                  onClick={onRestartAuction}
                  className="px-2.5 py-1 bg-[#151515] hover:bg-[#FF5252]/20 text-[#8E8E93] hover:text-[#FF5252] border border-[#262626] rounded-full font-bold transition-all flex items-center gap-1 text-[11px]"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restart</span>
                </button>
              </div>
            </div>
          )}

          {/* Compact Recent Lot Bids Timeline */}
          {lot.bids.length > 0 && (
            <div className="bg-[#0D0D0D] rounded-2xl p-3 border border-[#262626] shadow-xl">
              <div className="flex items-center justify-between text-[11px] text-[#8E8E93] mb-2 px-1 font-semibold uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <History className="w-3.5 h-3.5 text-[#00E676]" />
                  Lot Bids History ({lot.bids.length})
                </span>
              </div>
              <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                {lot.bids.slice(0, 4).map((b) => {
                  const team = IPL_FRANCHISES[b.teamId];
                  return (
                    <div
                      key={b.bidId}
                      className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-[#151515] border border-[#262626]"
                    >
                      <div className="flex items-center gap-2">
                        <TeamLogo teamId={b.teamId} className="w-4 h-4" />
                        <span className="font-semibold text-white text-[11px]">
                          {team.shortName}
                        </span>
                        <span className="text-[10px] text-[#8E8E93]">({b.bidderName})</span>
                      </div>
                      <span className="font-mono font-bold text-[#00E676] text-xs">
                        ₹{(b.amount / 10000000).toFixed(2)} Cr
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: ACTIVE PLAYER CARD & BIDDING (7 cols)      */}
        {/* Order 1 on mobile, Order 2 on Desktop                    */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 flex flex-col gap-3.5 order-1 lg:order-2">
          
          {/* Active Player Card with DETAILS AT THE TOP */}
          <div className={`relative bg-[#0D0D0D] border rounded-2xl overflow-hidden shadow-2xl transition-all ${
            player.is_marquee ? 'border-[#FFC857]/60 shadow-[0_0_24px_rgba(255,200,87,0.15)]' : 'border-[#262626]'
          }`}>
            
            {/* 1. TOP OF CARD: PLAYER DETAILS PROMINENTLY DISPLAYED */}
            <div className="p-4 sm:p-5 bg-gradient-to-b from-[#141414] to-[#0D0D0D] border-b border-[#222222] space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight leading-tight">
                    {player.name}
                  </h2>
                  <p className="text-xs text-[#8E8E93] font-medium mt-0.5">
                    {player.primary_role} · {player.category}
                  </p>
                </div>

                {/* Auction Status Badge */}
                <div>
                  {lot.status === 'SOLD' ? (
                    <span className="bg-[#00E676]/20 text-[#00E676] font-bold px-3 py-1 rounded-full border border-[#00E676]/40 text-xs inline-flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" /> SOLD
                    </span>
                  ) : lot.status === 'UNSOLD' ? (
                    <span className="bg-[#FF5252]/20 text-[#FF5252] font-bold px-3 py-1 rounded-full border border-[#FF5252]/40 text-xs">
                      UNSOLD
                    </span>
                  ) : lot.status === 'SKIPPED' ? (
                    <span className="bg-[#FFC857]/20 text-[#FFC857] font-bold px-3 py-1 rounded-full border border-[#FFC857]/40 text-xs">
                      SKIPPED
                    </span>
                  ) : roomState.status === 'PAUSED' ? (
                    <span className="bg-[#FFC857]/20 text-[#FFC857] font-bold px-3 py-1 rounded-full border border-[#FFC857]/40 text-xs inline-flex items-center gap-1">
                      <Pause className="w-3 h-3" /> PAUSED
                    </span>
                  ) : (
                    <span className="bg-[#00E676]/20 text-[#00E676] font-bold px-3 py-1 rounded-full border border-[#00E676]/40 text-xs inline-flex items-center gap-1 animate-pulse">
                      <Flame className="w-3 h-3" /> AVAILABLE / LIVE
                    </span>
                  )}
                </div>
              </div>

              {/* Metadata Pills Row (Base Price, Classification, WK) */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {/* Base Price */}
                <div className="flex items-center gap-1.5 bg-[#151515] border border-[#262626] px-3 py-1 rounded-full text-xs font-mono font-bold text-white shadow-sm">
                  <Tag className="w-3.5 h-3.5 text-[#00E676]" />
                  <span>Base: <strong className="text-[#00E676]">{player.base_price_display}</strong></span>
                </div>

                {/* Classification: Indian or Overseas */}
                {player.is_overseas ? (
                  <span className="bg-[#00E676]/15 border border-[#00E676]/30 text-[#00E676] text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-sm">
                    <Plane className="w-3.5 h-3.5" /> Overseas · {player.nationality}
                  </span>
                ) : (
                  <span className="bg-[#151515] border border-[#262626] text-slate-200 text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-sm">
                    <span>🇮🇳</span> Indian Player
                  </span>
                )}

                {/* Wicketkeeper Tag */}
                {player.is_wicketkeeper && (
                  <span className="bg-[#FFC857]/15 border border-[#FFC857]/30 text-[#FFC857] text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                    🧤 Wicket-keeper
                  </span>
                )}
              </div>
            </div>

            {/* 2. PLAYER PHOTO / SILHOUETTE IMAGE AREA (BELOW DETAILS) */}
            <div className="relative w-full h-40 sm:h-44 bg-[#080808] flex items-center justify-center overflow-hidden border-b border-[#222222]">
              {player.image_url && !imageError ? (
                <div className="relative w-full h-full flex items-center justify-center p-2">
                  <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 bg-gradient-to-b from-[#262626] via-[#161616] to-[#0a0a0a] shadow-[0_0_20px_rgba(0,0,0,0.85)] border border-[#333333] flex items-center justify-center overflow-hidden">
                    <img
                      src={player.image_url}
                      alt={player.name}
                      className="w-full h-full object-cover object-top"
                      onError={() => setImageError(true)}
                    />
                  </div>
                </div>
              ) : (
                <CricketPlayerSilhouette category={player.category} className="w-full h-full" />
              )}

              {/* Status Overlays on SOLD / UNSOLD / SKIPPED */}
              {lot.status === 'SOLD' && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center animate-fadeIn text-center p-4 z-30">
                  <Award className="w-10 h-10 text-[#00E676] mb-1 animate-bounce" />
                  <span className="text-3xl font-extrabold font-display text-[#00E676] tracking-wider">
                    SOLD!
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    {lot.winningTeam && <TeamLogo teamId={lot.winningTeam} className="w-6 h-6" />}
                    <span className="text-base font-bold text-white">
                      {lot.winningTeamName}
                    </span>
                  </div>
                  <span className="text-sm font-mono text-[#00E676] font-bold mt-1 bg-[#00E676]/10 px-3 py-0.5 rounded-full border border-[#00E676]/30">
                    ₹{((lot.soldPrice || 0) / 10000000).toFixed(2)} Crore
                  </span>
                </div>
              )}

              {lot.status === 'UNSOLD' && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center animate-fadeIn text-center p-4 z-30">
                  <span className="text-3xl font-extrabold font-display text-[#8E8E93] tracking-wider">
                    UNSOLD
                  </span>
                  <span className="text-xs text-[#8E8E93] mt-1">
                    Player moves to the un-auctioned pool
                  </span>
                </div>
              )}

              {lot.status === 'SKIPPED' && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center animate-fadeIn text-center p-4 z-30">
                  <FastForward className="w-8 h-8 text-[#FFC857] mb-1" />
                  <span className="text-2xl font-extrabold font-display text-[#FFC857] tracking-wider">
                    SKIPPED BY HOST
                  </span>
                </div>
              )}
            </div>

            {/* 3. CURRENT HIGHEST BID & LEADING TEAM BANNER */}
            <div className="p-3.5 bg-[#121212] flex items-center justify-between gap-3 border-t border-[#1C1C1C]">
              <div className="flex items-center gap-2.5">
                {lot.currentBidder ? (
                  <>
                    <TeamLogo teamId={lot.currentBidder} className="w-9 h-9 shrink-0 shadow-md" />
                    <div>
                      <span className="text-[10px] text-[#8E8E93] uppercase font-semibold block">
                        Leading Franchise:
                      </span>
                      <h4 className="font-display font-bold text-xs sm:text-sm text-white leading-tight">
                        {IPL_FRANCHISES[lot.currentBidder].name}{' '}
                        <span className="text-[#8E8E93] font-normal font-sans">({lot.currentBidderName})</span>
                      </h4>
                    </div>
                  </>
                ) : (
                  <div>
                    <span className="text-[10px] text-[#8E8E93] uppercase font-semibold block">
                      Opening Price Bracket:
                    </span>
                    <h4 className="font-display font-bold text-xs sm:text-sm text-[#FFC857] font-mono">
                      ₹{(player.base_price_inr / 10000000).toFixed(2)} Crore
                    </h4>
                  </div>
                )}
              </div>

              <div className="text-right">
                <span className="text-[10px] text-[#8E8E93] uppercase font-semibold block">
                  Current Highest Bid
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-[#00E676]">
                  {currentBid > 0 ? `₹${(currentBid / 10000000).toFixed(2)} Cr` : 'NO BIDS YET'}
                </span>
              </div>
            </div>
          </div>

          {/* Synchronized Countdown Timer & Bidding Panel */}
          <div className="bg-[#0D0D0D] rounded-2xl p-4 border border-[#262626] shadow-2xl relative overflow-hidden space-y-3.5">
            {/* Timer Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#151515]">
              <div
                className={`h-full transition-all duration-100 ${
                  remainingSec <= 2
                    ? 'bg-[#FF5252] shadow-[0_0_12px_#FF5252] animate-pulse'
                    : remainingSec <= 5
                    ? 'bg-[#FFC857] shadow-[0_0_12px_#FFC857]'
                    : 'bg-[#00E676] shadow-[0_0_12px_#00E676]'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-1">
              {/* Countdown Clock Display */}
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-mono font-black border transition-all ${
                  remainingSec <= 2
                    ? 'bg-[#FF5252]/20 text-[#FF5252] border-[#FF5252] animate-bounce'
                    : remainingSec <= 5
                    ? 'bg-[#FFC857]/20 text-[#FFC857] border-[#FFC857]'
                    : 'bg-[#151515] text-[#00E676] border-[#00E676]/40'
                }`}>
                  <span className="text-2xl leading-none">{remainingSec}</span>
                  <span className="text-[8px] uppercase font-bold text-[#8E8E93]">SEC</span>
                </div>

                <div>
                  <span className="text-[10px] text-[#8E8E93] uppercase font-semibold block">
                    Hammer Timer
                  </span>
                  <p className="text-xs text-white font-medium">
                    {lot.status === 'IN_PROGRESS' ? 'Resets on valid bid' : lot.status}
                  </p>
                </div>
              </div>

              {/* Leading Indicator */}
              {lot.currentBidder && (
                <div className="flex items-center gap-1.5 text-xs text-[#00E676] font-bold bg-[#00E676]/10 border border-[#00E676]/30 px-3 py-1 rounded-full shadow-sm">
                  <Shield className="w-3.5 h-3.5" />
                  <span>{isHighestBidder ? 'YOU ARE LEADING' : `${lot.currentBidder} LEADING`}</span>
                </div>
              )}
            </div>

            {/* Error / Disabled Tooltip Notice */}
            {!canBid && bidDisabledReason && (
              <div className="bg-[#FF5252]/15 border border-[#FF5252]/30 text-[#FF5252] px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-[#FF5252] shrink-0" />
                <span>{bidDisabledReason}</span>
              </div>
            )}

            {/* Big Primary Action: Sleek Rounded Pill Bid Button */}
            <button
              onClick={() => onPlaceBid(nextMinBid)}
              disabled={!canBid}
              className="w-full bg-white hover:bg-slate-200 active:scale-[0.99] text-black font-display font-black py-3.5 px-6 rounded-full transition-all shadow-[0_4px_20px_rgba(255,255,255,0.15)] flex items-center justify-between disabled:opacity-30 disabled:cursor-not-allowed group text-sm"
            >
              <div className="flex items-center gap-2">
                <ChevronUp className="w-5 h-5 stroke-[3] transition-transform group-hover:-translate-y-0.5" />
                <span className="tracking-wide">PLACE BID</span>
              </div>
              <span className="font-mono text-lg font-black text-black">
                ₹{(nextMinBid / 10000000).toFixed(2)} Cr
              </span>
            </button>

            {/* Quick Increment Buttons (+20L, +50L, +1Cr, +2Cr) */}
            <div className="grid grid-cols-4 gap-2 pt-0.5">
              {quickIncrements.map((inc, i) => {
                const isIncLegal = inc.amount >= nextMinBid && inc.amount <= maxPossibleBid && canBid;
                return (
                  <button
                    key={i}
                    onClick={() => onPlaceBid(inc.amount)}
                    disabled={!isIncLegal}
                    className="py-2 px-2 rounded-xl bg-[#151515] hover:bg-[#202020] text-slate-200 hover:text-white font-mono text-xs font-bold transition-all border border-[#262626] hover:border-[#00E676]/40 disabled:opacity-25 disabled:cursor-not-allowed flex flex-col items-center gap-0.5"
                  >
                    <span className="text-[#00E676] text-[11px] font-black">{inc.label}</span>
                    <span className="text-[10px] text-[#8E8E93] font-normal">
                      ₹{(inc.amount / 10000000).toFixed(2)}Cr
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Skip Player Modal */}
      {isHost && (
        <SkipPlayerModal
          isOpen={showSkipModal}
          playerName={player.name}
          onConfirm={() => {
            setShowSkipModal(false);
            onSkipPlayer();
          }}
          onClose={() => setShowSkipModal(false)}
        />
      )}
    </div>
  );
};
