import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, 
  Clock, 
  FastForward, 
  Pause, 
  Play, 
  RotateCcw, 
  Award, 
  Shield, 
  Sparkles, 
  ChevronUp, 
  AlertCircle, 
  Dice5, 
  Tag, 
  Plane, 
  ChevronDown, 
  Users,
  Wallet,
  CheckCircle2,
  HelpCircle,
  X,
  AlertTriangle,
  Loader2,
  Crown
} from 'lucide-react';
import { 
  RoomState, 
  AuctionLot, 
  IPLTeamId, 
  IPL_FRANCHISES, 
  PlayerCategory 
} from '../types.js';
import { soundManager } from '../services/audio.js';
import { SkipPlayerModal } from './SkipPlayerModal.js';
import { TeamLogo } from './TeamLogo.js';
import { CricketPlayerSilhouette } from './CricketPlayerSilhouette.js';
import { FullScreenGavelModal } from './FullScreenGavelModal.js';
import { LiveBidFeed } from './LiveBidFeed.js';
import { HammerClockBadge, HammerClockPanel } from './HammerClock.js';

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
  onAdvanceLot?: (lotIndex?: number, resultId?: string) => void;
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
  onEndAuction,
  onAdvanceLot
}) => {
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [showHostDraw, setShowHostDraw] = useState(false);
  const [showSquadList, setShowSquadList] = useState(false);
  const [showOnboardingGuide, setShowOnboardingGuide] = useState(false);
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [wasOutbid, setWasOutbid] = useState(false);

  // Category & Price selection for Host Random Draw
  const [selectedCategory, setSelectedCategory] = useState<PlayerCategory>('Batsmen');
  const [selectedPriceBracket, setSelectedPriceBracket] = useState<number>(20000000);
  const [imageError, setImageError] = useState(false);
  const [dismissedLotNumber, setDismissedLotNumber] = useState<number | null>(null);

  const myMember = roomState.members[myMemberId];
  const myTeamId = myMember?.teamId;
  const isHost = myMember?.isHost;
  const lot = roomState.currentLot;

  // Refs for tracking leading state
  const lastBidRef = useRef<number>(lot?.currentBid || 0);
  const lastLotNumberRef = useRef<number>(lot?.lotNumber || 0);
  const wasLeadingRef = useRef<boolean>(false);

  // Reset image error on lot change
  useEffect(() => {
    setImageError(false);
  }, [lot?.player?.id]);

  const isHighestBidder = Boolean(myTeamId && lot && lot.currentBidder === myTeamId);

  // Track leading and outbid state transitions
  useEffect(() => {
    if (isHighestBidder) {
      wasLeadingRef.current = true;
      setWasOutbid(false);
    } else if (wasLeadingRef.current && lot?.currentBidder && lot.currentBidder !== myTeamId) {
      setWasOutbid(true);
    }
  }, [isHighestBidder, lot?.currentBidder, myTeamId]);

  // Reset outbid alert state on lot change
  useEffect(() => {
    wasLeadingRef.current = false;
    setWasOutbid(false);
    lastLotNumberRef.current = lot?.lotNumber || 0;
  }, [lot?.lotNumber]);

  // Track last accepted bid
  useEffect(() => {
    if (lot && lot.currentBid !== lastBidRef.current) {
      lastBidRef.current = lot.currentBid;
    }
  }, [lot?.currentBid]);

  if (!lot) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center animate-fadeIn">
        <div className="bg-[#0D0D0D] border border-[#222222] p-8 rounded-2xl shadow-2xl">
          <Trophy className="w-12 h-12 text-[#FFD700] mx-auto mb-3 animate-bounce" />
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
    !hasInsufficientPurse &&
    !isPlacingBid;

  let bidDisabledReason = '';
  if (!myTeamId) bidDisabledReason = 'Select a franchise to bid';
  else if (roomState.status === 'PAUSED') bidDisabledReason = 'Auction is paused';
  else if (lot.status !== 'IN_PROGRESS') bidDisabledReason = 'Lot transition in progress';
  else if (isHighestBidder) bidDisabledReason = 'Your franchise holds the highest bid';
  else if (isSquadFull) bidDisabledReason = 'Maximum squad limit (25) reached';
  else if (isOverseasFull) bidDisabledReason = 'Overseas limit reached (8/8)';
  else if (hasInsufficientPurse) {
    bidDisabledReason = `Purse reserve required: ₹${(minReserveRequired / 10000000).toFixed(2)} Cr needed to fill squad`;
  }

  const handlePlaceBidSafe = (amount: number) => {
    if (!canBid || isPlacingBid) return;
    setIsPlacingBid(true);
    // Silent bid button click per user request (no sound played on bid button click)
    onPlaceBid(amount);
    setTimeout(() => setIsPlacingBid(false), 350);
  };

  // Quick increment amounts
  const quickIncrements = [
    { label: `+₹${(minIncrement / 100000).toFixed(0)}L`, amount: nextMinBid },
    { label: '+₹50L', amount: currentBid === 0 ? player.base_price_inr + 5000000 : currentBid + 5000000 },
    { label: '+₹1.0 Cr', amount: currentBid === 0 ? player.base_price_inr + 10000000 : currentBid + 10000000 },
    { label: '+₹2.0 Cr', amount: currentBid === 0 ? player.base_price_inr + 20000000 : currentBid + 20000000 }
  ];

  const remainingLots = Math.max(0, (lot.totalLots || 359) - lot.lotNumber);

  // Highest-Bidded Player across the entire auction from completed SOLD records (Requirement 1)
  const soldHistoryLots = (roomState.history || []).filter(h => h.status === 'SOLD' && (h.soldPrice || 0) > 0);
  const highestBiddedLot = soldHistoryLots.length > 0
    ? [...soldHistoryLots].sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0) || a.lotNumber - b.lotNumber)[0]
    : null;

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-5 py-2.5 space-y-3">
      {/* 1. TOP PROGRESS RIBBON: Compact Set, Lot Status & Quick Help */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0D0D0D] border border-[#222222] px-3.5 py-2 rounded-xl text-xs shadow-md">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-mono font-bold text-[#00E676] bg-[#00E676]/10 px-2.5 py-0.5 rounded-full border border-[#00E676]/30 text-[11px]">
            Set {roomState.currentSetOrder}/{roomState.totalSets}
          </span>
          <span className="text-[#8E8E93] hidden sm:inline">·</span>
          <span className="font-semibold text-white truncate max-w-[220px] sm:max-w-none">
            {player.set_name}
          </span>
          {player.is_marquee && (
            <span className="bg-[#FFD700]/15 text-[#FFD700] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#FFD700]/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#FFD700]" />
              MARQUEE
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 font-mono text-[11px]">
          <span className="text-[#8E8E93]">
            Lot <strong className="text-white font-bold">#{lot.lotNumber}</strong> of {lot.totalLots}
          </span>
          <span className="text-[#8E8E93] hidden md:inline">
            ({remainingLots} remaining)
          </span>

          {/* Prominent Synchronized Hammer Clock Badge (Always visible across all devices) */}
          <HammerClockBadge 
            deadlineTimestamp={roomState.deadlineTimestamp} 
            roomStatus={roomState.status} 
            lotStatus={lot.status} 
          />

          {roomState.status === 'PAUSED' ? (
            <span className="bg-[#FFC857]/20 text-[#FFC857] font-bold px-2.5 py-0.5 rounded-full border border-[#FFC857]/40 flex items-center gap-1 text-[11px]">
              <Pause className="w-3 h-3" /> PAUSED
            </span>
          ) : (
            <span className="bg-[#00E676]/15 text-[#00E676] font-bold px-2.5 py-0.5 rounded-full border border-[#00E676]/30 flex items-center gap-1 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-[#00E676] animate-ping inline-block mr-0.5" />
              LIVE AUCTION
            </span>
          )}

          <button
            onClick={() => setShowOnboardingGuide(true)}
            aria-label="Auction Guide and Rules"
            className="flex items-center gap-1 text-[#8E8E93] hover:text-[#FFD700] bg-[#161616] hover:bg-[#222222] border border-[#2D2D2D] px-2.5 py-0.5 rounded-full transition-colors text-[10px] font-semibold"
          >
            <HelpCircle className="w-3 h-3" />
            <span className="hidden sm:inline">Guide</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN 3-PANEL DASHBOARD LAYOUT */}
      <div className="grid grid-cols-12 gap-3.5 items-start">
        
        {/* ======================================================== */}
        {/* LEFT AREA: BIDDING CONTROLS & AUCTION INFO (4 Cols)     */}
        {/* ======================================================== */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3 order-2 lg:order-1">
          
          {/* A. Bidding Panel & Timer (Clean Static Border) */}
          <div className="bg-[#0D0D0D] rounded-2xl p-4 border border-[#222222] shadow-xl relative overflow-hidden space-y-3.5">
            {/* Hammer Clock & Progress Panel */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <HammerClockPanel 
                deadlineTimestamp={roomState.deadlineTimestamp} 
                totalDurationSec={roomState.settings.timerDuration || 10} 
                roomStatus={roomState.status} 
                lotStatus={lot.status} 
              />

              {/* Competitive Leader States (Section 9) */}
              {isHighestBidder ? (
                <div className="flex items-center gap-1.5 text-xs text-[#00E676] font-bold bg-[#00E676]/15 border border-[#00E676]/40 px-3 py-1 rounded-full shadow-sm animate-pulse">
                  <Shield className="w-3.5 h-3.5" />
                  <span>YOU ARE LEADING</span>
                </div>
              ) : wasOutbid ? (
                <div className="flex items-center gap-1.5 text-xs text-[#FFC857] font-bold bg-[#FFC857]/15 border border-[#FFC857]/40 px-3 py-1 rounded-full shadow-sm animate-bounce">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#FFC857]" />
                  <span>OUTBID! RAISE BID</span>
                </div>
              ) : lot.currentBidder ? (
                <div className="flex items-center gap-1.5 text-xs text-[#8E8E93] font-bold bg-[#181818] border border-[#2D2D2D] px-3 py-1 rounded-full shadow-sm">
                  <Shield className="w-3.5 h-3.5 text-[#FFC857]" />
                  <span>{lot.currentBidder} LEADING</span>
                </div>
              ) : (
                <div className="text-xs text-[#8E8E93] font-mono bg-[#161616] px-2.5 py-1 rounded-full border border-[#262626]">
                  AWAITING BID
                </div>
              )}
            </div>

            {/* Current Highest Bid Banner with Price Pop Animation */}
            <div className="p-3 bg-[#141414] rounded-xl border border-[#222222] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#8E8E93] uppercase font-semibold block">Current Bid</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-[#00E676] block">
                  {currentBid > 0 ? `₹${(currentBid / 10000000).toFixed(2)} Cr` : 'NO BIDS YET'}
                </span>
              </div>
              {lot.currentBidder && (
                <div className="flex items-center gap-2 text-right">
                  <TeamLogo teamId={lot.currentBidder} className="w-7 h-7 object-contain drop-shadow" />
                  <div className="text-left">
                    <span className="text-[9px] text-[#8E8E93] block">Leader</span>
                    <span className="text-xs font-bold text-white block">{lot.currentBidder}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Disabled Bidding Reason Alert */}
            {!canBid && bidDisabledReason && (
              <div className="bg-[#FF5252]/15 border border-[#FF5252]/30 text-[#FF5252] px-3 py-2 rounded-xl text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-[#FF5252] shrink-0" />
                <span>{bidDisabledReason}</span>
              </div>
            )}

            {/* Primary Action Button: PLACE BID (With anti-double-click guard & loading state) */}
            <button
              onClick={() => handlePlaceBidSafe(nextMinBid)}
              disabled={!canBid}
              className="w-full bg-white hover:bg-slate-200 active:scale-[0.99] text-black font-display font-black py-3 px-5 rounded-xl transition-all shadow-[0_4px_20px_rgba(255,255,255,0.15)] flex items-center justify-between disabled:opacity-30 disabled:cursor-not-allowed group text-sm"
            >
              <div className="flex items-center gap-2">
                {isPlacingBid ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ChevronUp className="w-5 h-5 stroke-[3] transition-transform group-hover:-translate-y-0.5" />
                )}
                <span className="tracking-wide">
                  {isPlacingBid ? 'SUBMITTING BID...' : 'PLACE BID'}
                </span>
              </div>
              <span className="font-mono text-base sm:text-lg font-black text-black">
                ₹{(nextMinBid / 10000000).toFixed(2)} Cr
              </span>
            </button>

            {/* Quick Increment Buttons (+20L, +50L, +1Cr, +2Cr) */}
            <div className="grid grid-cols-4 gap-1.5 pt-0.5">
              {quickIncrements.map((inc, i) => {
                const isIncLegal = inc.amount >= nextMinBid && inc.amount <= maxPossibleBid && canBid;
                return (
                  <button
                    key={i}
                    onClick={() => handlePlaceBidSafe(inc.amount)}
                    disabled={!isIncLegal}
                    className="py-1.5 px-1.5 rounded-lg bg-[#151515] hover:bg-[#202020] text-slate-200 hover:text-white font-mono text-xs font-bold transition-all border border-[#262626] hover:border-[#00E676]/40 disabled:opacity-20 disabled:cursor-not-allowed flex flex-col items-center gap-0.5"
                  >
                    <span className="text-[#00E676] text-[11px] font-black">{inc.label}</span>
                    <span className="text-[9px] text-[#8E8E93] font-normal">
                      ₹{(inc.amount / 10000000).toFixed(2)}Cr
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* B. Host Controls Card (Skip, Pause, Draw Random) */}
          {isHost && (
            <div className="bg-[#0D0D0D] border border-[#222222] rounded-2xl p-3.5 space-y-2.5 shadow-md">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#8E8E93] flex items-center gap-1.5 text-[11px]">
                  <Shield className="w-3.5 h-3.5 text-[#00E676]" />
                  HOST CONTROLS
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowSkipModal(true)}
                    disabled={lot.status !== 'IN_PROGRESS'}
                    className="px-2.5 py-1 bg-[#151515] hover:bg-[#222222] text-[#FFC857] border border-[#FFC857]/30 rounded-full font-bold transition-all flex items-center gap-1 text-[11px] disabled:opacity-30 disabled:cursor-not-allowed"
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

              {/* Host Draw Random Player Toggle */}
              {onDrawRandomPlayer && (
                <div className="pt-1 border-t border-[#1C1C1C]">
                  <button
                    onClick={() => setShowHostDraw(!showHostDraw)}
                    className="w-full text-left flex items-center justify-between text-xs text-[#8E8E93] hover:text-white py-1 font-semibold transition-colors"
                  >
                    <span className="flex items-center gap-1">
                      <Dice5 className="w-3.5 h-3.5 text-[#FFC857]" />
                      Custom Random Draw
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHostDraw ? 'rotate-180' : ''}`} />
                  </button>

                  {showHostDraw && (
                    <div className="space-y-2 pt-2 animate-fadeIn">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-[#8E8E93] block mb-1">Category</label>
                          <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value as PlayerCategory)}
                            className="w-full bg-[#151515] border border-[#262626] text-white text-xs rounded-lg px-2 py-1 outline-none"
                          >
                            <option value="Batsmen">Batsmen</option>
                            <option value="All-rounders">All-Rounders</option>
                            <option value="Bowlers">Bowlers</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-[#8E8E93] block mb-1">Price Bracket</label>
                          <select
                            value={selectedPriceBracket}
                            onChange={(e) => setSelectedPriceBracket(Number(e.target.value))}
                            className="w-full bg-[#151515] border border-[#262626] text-white text-xs rounded-lg px-2 py-1 outline-none"
                          >
                            <option value={20000000}>₹2.00 Cr</option>
                            <option value={15000000}>₹1.50 Cr</option>
                            <option value={10000000}>₹1.00 Cr</option>
                            <option value={7500000}>₹75 L</option>
                            <option value={5000000}>₹50 L</option>
                            <option value={3000000}>₹30 L</option>
                          </select>
                        </div>
                      </div>

                      <button
                        onClick={() => onDrawRandomPlayer(selectedCategory, selectedPriceBracket)}
                        disabled={lot.status !== 'IN_PROGRESS'}
                        className="w-full bg-[#FFC857] hover:bg-[#ffcf6e] active:scale-[0.99] text-black font-display font-bold py-1.5 px-3 rounded-lg transition-all text-xs flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-30"
                      >
                        <Dice5 className="w-3.5 h-3.5" />
                        <span>Draw Random {selectedCategory}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* C. Highest-Bidded Player Card (Directly Below Host Controls) */}
          <div className="bg-[#0D0D0D] border border-[#222222] rounded-2xl p-3.5 shadow-xl space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#1E1E1E]">
              <span className="text-[10px] text-[#8E8E93] uppercase font-bold tracking-wider flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-[#FFD700]" />
                Highest-Bidded Player
              </span>
              {highestBiddedLot && (
                <span className="text-[10px] font-mono font-bold text-[#FFD700] bg-[#FFD700]/10 px-2 py-0.5 rounded-full border border-[#FFD700]/25">
                  Record Buy
                </span>
              )}
            </div>

            {highestBiddedLot ? (
              <div className="flex items-center justify-between gap-3 pt-0.5">
                {/* Player Photo & Details */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-[#2A2A2A] to-[#121212] border border-[#333333] flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                    {highestBiddedLot.player.image_url ? (
                      <img
                        src={highestBiddedLot.player.image_url}
                        alt={highestBiddedLot.player.name}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <CricketPlayerSilhouette category={highestBiddedLot.player.category} className="w-full h-full p-1" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <span className="text-xs font-black font-display text-white truncate block">
                      {highestBiddedLot.player.name}
                    </span>
                    <span className="text-[10px] text-[#8E8E93] block truncate">
                      {highestBiddedLot.player.primary_role} · {highestBiddedLot.player.category}
                    </span>

                    {/* Winning Team info */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {highestBiddedLot.winningTeam && (
                        <TeamLogo teamId={highestBiddedLot.winningTeam} className="w-4 h-4 object-contain shrink-0" />
                      )}
                      <span className="text-[10px] font-semibold text-slate-300 truncate">
                        {IPL_FRANCHISES[highestBiddedLot.winningTeam!]?.name || highestBiddedLot.winningTeamName || highestBiddedLot.winningTeam}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Final Sold Price in Crores */}
                <div className="text-right shrink-0">
                  <span className="text-[9px] text-[#8E8E93] uppercase font-semibold block">Sold Price</span>
                  <span className="text-sm sm:text-base font-mono font-black text-[#00E676] block">
                    ₹{((highestBiddedLot.soldPrice || 0) / 10000000).toFixed(2)} Cr
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-2.5 px-3 text-center rounded-xl bg-[#121212] border border-[#1C1C1C]">
                <p className="text-xs text-[#8E8E93] font-medium">No players sold yet.</p>
                <span className="text-[10px] text-[#555555] block mt-0.5">
                  Top auction sale will appear here
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* CENTER AREA: CURRENT PLAYER DETAILS & PHOTO (5 Cols)     */}
        {/* ======================================================== */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-3 order-1 lg:order-2">
          
          {/* Active Player Card with Clean Static Borders & Stadium Lighting */}
          <div 
            key={`player-card-${player.id}`}
            className={`relative bg-[#0D0D0D] border rounded-2xl overflow-hidden shadow-2xl transition-all animate-player-entrance ${
              player.is_marquee ? 'border-[#FFD700]/60 shadow-[0_0_24px_rgba(255,215,0,0.15)]' : 'border-[#222222]'
            }`}
          >
            {/* Top Details: Player Name, Badges & Base Price */}
            <div className="p-4 sm:p-5 bg-gradient-to-b from-[#141414] to-[#0D0D0D] border-b border-[#222222] space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight leading-tight">
                    {player.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-[#FFD700] uppercase font-mono tracking-wider">
                      {player.category}
                    </span>
                    <span className="text-[#8E8E93] text-xs">•</span>
                    <span className="text-xs text-[#8E8E93] font-medium">
                      Role: <strong className="text-slate-200">{player.primary_role}</strong>
                    </span>
                  </div>
                </div>

                {/* Base Price Tag */}
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-[#8E8E93] uppercase font-semibold block">Base Price</span>
                  <span className="text-lg sm:text-xl font-mono font-black text-[#00E676] block">
                    {player.base_price_display}
                  </span>
                </div>
              </div>

              {/* Classification Badges */}
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                {player.is_overseas ? (
                  <span className="bg-[#00E676]/15 border border-[#00E676]/30 text-[#00E676] text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-sm">
                    <Plane className="w-3.5 h-3.5" /> Overseas · {player.nationality}
                  </span>
                ) : (
                  <span className="bg-[#151515] border border-[#262626] text-slate-200 text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-sm">
                    <span>🇮🇳</span> Indian Player
                  </span>
                )}

                {player.is_wicketkeeper && (
                  <span className="bg-[#FFC857]/15 border border-[#FFC857]/30 text-[#FFC857] text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                    🧤 Wicket-keeper
                  </span>
                )}
              </div>
            </div>

            {/* Prominent Stadium Showcase Frame (Section 2: Reduced empty space, slightly larger portrait) */}
            <div className="relative w-full h-64 sm:h-76 md:h-80 stadium-spotlight flex items-center justify-center overflow-hidden border-b border-[#222222] p-2.5 sm:p-4">
              {/* Subtle stadium overhead light ray */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#FFD700]/10 via-transparent to-black/70 pointer-events-none" />
              
              {player.image_url && !imageError ? (
                <div className="relative z-10 w-52 h-52 sm:w-60 sm:h-60 md:w-64 md:h-64 rounded-full p-2 bg-gradient-to-b from-[#FFD700]/50 via-[#333333] to-[#111111] shadow-[0_0_40px_rgba(0,0,0,0.95),0_0_20px_rgba(255,215,0,0.2)] border-2 border-[#FFD700]/50 flex items-center justify-center overflow-hidden transform hover:scale-[1.02] transition-transform duration-300">
                  <img
                    src={player.image_url}
                    alt={player.name}
                    className="w-full h-full object-cover object-top select-none pointer-events-none"
                    onError={() => setImageError(true)}
                  />
                </div>
              ) : (
                <CricketPlayerSilhouette category={player.category} className="w-full h-full max-w-[260px] max-h-[260px]" />
              )}
            </div>

            {/* Bottom Card Summary: Status Banner */}
            <div className="p-3 bg-[#111111] flex items-center justify-between text-xs font-mono text-[#8E8E93]">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#00E676]" />
                Status: <strong className="text-white">{lot.status}</strong>
              </span>
              <span>Lot #{lot.lotNumber}</span>
            </div>

            {/* UNSOLD OVERLAY: Strictly only the text "UNSOLD" with clean animation matching black theme (Section 8) */}
            {lot.status === 'UNSOLD' && (
              <div className="absolute inset-0 z-40 bg-black/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center border border-[#222222] animate-fadeIn select-none">
                <span className="text-5xl sm:text-6xl font-black font-display tracking-widest text-[#8E8E93] animate-pulse">
                  UNSOLD
                </span>
                <span className="text-xs text-[#555555] font-mono mt-3">
                  Player moves to the un-auctioned pool
                </span>
              </div>
            )}

            {/* SKIPPED OVERLAY */}
            {lot.status === 'SKIPPED' && (
              <div className="absolute inset-0 z-40 bg-black/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center border border-[#222222] animate-fadeIn select-none">
                <FastForward className="w-8 h-8 text-[#FFC857] mb-2" />
                <span className="text-2xl font-black font-display text-[#FFC857] tracking-wider">
                  SKIPPED BY HOST
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT AREA: MY TEAM SUMMARY & ALL TEAMS SCOREBOARD (3 Cols) */}
        {/* ======================================================== */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-3 order-3">
          
          {/* A. My Franchise Card */}
          <div className="bg-[#0D0D0D] border border-[#222222] rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#1E1E1E]">
              <span className="text-[10px] text-[#8E8E93] uppercase font-bold tracking-wider">
                My Franchise
              </span>
              {myTeamId && (
                <span className="text-xs font-mono font-bold text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded-full border border-[#00E676]/20">
                  {myTeamId}
                </span>
              )}
            </div>

            {myTeamId ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <TeamLogo teamId={myTeamId} className="w-10 h-10 object-contain drop-shadow" />
                  <div>
                    <h3 className="font-display font-bold text-sm text-white leading-tight">
                      {IPL_FRANCHISES[myTeamId]?.name}
                    </h3>
                    <span className="text-[11px] text-[#8E8E93]">
                      Purse Remaining:
                    </span>
                  </div>
                </div>

                {/* Purse Balance */}
                <div className="bg-[#141414] p-2.5 rounded-xl border border-[#262626]">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[#8E8E93] flex items-center gap-1 font-mono">
                      <Wallet className="w-3.5 h-3.5 text-[#00E676]" /> Balance
                    </span>
                    <span className="font-mono font-black text-white text-sm">
                      ₹{(myPurse / 10000000).toFixed(2)} Cr
                    </span>
                  </div>
                  <div className="w-full bg-[#202020] h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-[#00E676] to-[#FFD700] h-full"
                      style={{ width: `${Math.min(100, Math.max(0, (myPurse / (roomState.settings.startingPurse || 1200000000)) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Squad Count & Overseas Count */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#141414] p-2 rounded-xl border border-[#262626]">
                    <span className="text-[10px] text-[#8E8E93] block">Squad</span>
                    <span className="font-bold text-white text-xs">
                      {mySquad.length} / {roomState.settings.maxSquad}
                    </span>
                  </div>
                  <div className="bg-[#141414] p-2 rounded-xl border border-[#262626]">
                    <span className="text-[10px] text-[#8E8E93] block">Overseas</span>
                    <span className={`font-bold text-xs ${myOverseasCount >= 8 ? 'text-[#FF5252]' : 'text-white'}`}>
                      {myOverseasCount} / 8 max
                    </span>
                  </div>
                </div>

                {/* Squad Reserve Requirement Notice */}
                {minReserveRequired > 0 && (
                  <p className="text-[10px] text-[#8E8E93] font-mono leading-tight bg-[#141414] p-2 rounded-lg border border-[#222222]">
                    🛡️ Min squad reserve: <strong className="text-[#FFC857]">₹{(minReserveRequired / 10000000).toFixed(2)} Cr</strong> required for remaining {slotsRemainingNeeded} slots.
                  </p>
                )}

                {/* Toggle Acquired Squad List */}
                {mySquad.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowSquadList(!showSquadList)}
                      className="w-full text-left text-xs text-[#00E676] font-semibold flex items-center justify-between py-1 transition-colors hover:underline"
                    >
                      <span>View My Squad ({mySquad.length})</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSquadList ? 'rotate-180' : ''}`} />
                    </button>

                    {showSquadList && (
                      <div className="space-y-1.5 mt-2 max-h-36 overflow-y-auto pr-1 animate-fadeIn">
                        {mySquad.map(sq => (
                          <div key={sq.id} className="flex items-center justify-between text-[11px] py-1 px-2 rounded-lg bg-[#141414] border border-[#222222]">
                            <span className="text-white font-medium truncate max-w-[120px]">{sq.name}</span>
                            <span className="font-mono text-[#00E676] text-[10px]">
                              ₹{(((sq.sold_price_inr || 0) / 10000000)).toFixed(2)}Cr
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-[#8E8E93]">
                <span>No franchise selected.</span>
              </div>
            )}
          </div>

          {/* B. Real-Time Live Bid Feed (Dedicated Current Lot Accepted Bids) */}
          <LiveBidFeed
            lot={lot}
            roomSettings={roomState.settings}
          />
        </div>
      </div>

      {/* 3. FULL-SCREEN REALISTIC AUCTIONEER GAVEL MODAL (ON CONFIRMED RESULT: SOLD & UNSOLD) */}
      {(lot.status === 'SOLD' || lot.status === 'UNSOLD') && dismissedLotNumber !== lot.lotNumber && (
        <FullScreenGavelModal
          lot={lot}
          myTeamId={myTeamId}
          onComplete={(resultId) => {
            setDismissedLotNumber(lot.lotNumber);
            onAdvanceLot?.(lot.lotNumber - 1, resultId);
          }}
        />
      )}

      {/* 4. SKIP PLAYER MODAL */}
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

      {/* 5. QUICK ONBOARDING GUIDE MODAL (SECTION 11) */}
      {showOnboardingGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0F0F0F] border border-[#FFD700]/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowOnboardingGuide(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-[#1A1A1A] hover:bg-[#252525] text-[#8E8E93] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-[#FFD700]">
              <Sparkles className="w-5 h-5 text-[#FFD700]" />
              <h3 className="font-display font-black text-lg text-white">How Bidding Works in Bid Wars</h3>
            </div>

            <div className="space-y-3 text-xs text-[#B3B3B3]">
              <div className="p-3 bg-[#141414] rounded-xl border border-[#222222] flex gap-3">
                <span className="font-mono font-black text-[#00E676] text-sm shrink-0">01</span>
                <div>
                  <h4 className="font-bold text-white mb-0.5">Current Lot & Base Price</h4>
                  <p>Each player enters the arena with an official base price. The first valid bid opens at the base price.</p>
                </div>
              </div>

              <div className="p-3 bg-[#141414] rounded-xl border border-[#222222] flex gap-3">
                <span className="font-mono font-black text-[#FFD700] text-sm shrink-0">02</span>
                <div>
                  <h4 className="font-bold text-white mb-0.5">Hammer Clock & 3-Second Warning</h4>
                  <p>Each accepted bid resets the countdown clock. At 3 seconds, warning ticks alert players before final sale.</p>
                </div>
              </div>

              <div className="p-3 bg-[#141414] rounded-xl border border-[#222222] flex gap-3">
                <span className="font-mono font-black text-[#00E676] text-sm shrink-0">03</span>
                <div>
                  <h4 className="font-bold text-white mb-0.5">Placing Bids & Increments</h4>
                  <p>Click "Place Bid" to submit the minimum increment, or use quick buttons (+20L, +50L, +1Cr, +2Cr).</p>
                </div>
              </div>

              <div className="p-3 bg-[#141414] rounded-xl border border-[#222222] flex gap-3">
                <span className="font-mono font-black text-[#FFC857] text-sm shrink-0">04</span>
                <div>
                  <h4 className="font-bold text-white mb-0.5">Squad & Overseas Limits</h4>
                  <p>Min 18 to max 25 players per team. Maximum 8 overseas players. You must reserve enough purse to fill 18 slots.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowOnboardingGuide(false)}
              className="w-full py-2.5 bg-[#00E676] hover:bg-[#00c966] text-black font-display font-black text-xs rounded-xl transition-all shadow-md mt-2"
            >
              Got It, Let's Bid!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
