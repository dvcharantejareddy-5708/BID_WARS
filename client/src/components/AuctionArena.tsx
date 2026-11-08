import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, 
  FastForward, 
  Pause, 
  Play, 
  RotateCcw, 
  Shield, 
  Sparkles, 
  ChevronUp, 
  AlertCircle, 
  Dice5, 
  Tag, 
  Plane, 
  ChevronDown, 
  Wallet, 
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
import { SkipPlayerModal } from './SkipPlayerModal.js';
import { HostControlsModal } from './HostControlsModal.js';
import { TeamLogo } from './TeamLogo.js';
import { CricketPlayerSilhouette } from './CricketPlayerSilhouette.js';
import { FullScreenGavelModal } from './FullScreenGavelModal.js';
import { LiveBidFeed } from './LiveBidFeed.js';
import { HammerClockBadge, HammerClockPanel } from './HammerClock.js';
import { GavelIcon, BatIcon, BallIcon, StumpsIcon, CoinsIcon } from './BrandIcons.js';

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
  onBringAllUnsoldBack?: () => void;
  onRandomDrawUnsold?: (count: number, playerIds?: string[]) => void;
  onSkipMultiplePlayers?: (count: number) => void;
  onKickMember?: (targetMemberId: string) => void;
  onUpdateTimer?: (duration: number) => void;
  onUpdateSettings?: (settings: any) => void;
  onReAuctionSoldPlayer?: (playerId: string) => void;
  onReAuctionParticularPlayer?: (playerId: string) => void;
}

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
  onAdvanceLot,
  onBringAllUnsoldBack,
  onRandomDrawUnsold,
  onSkipMultiplePlayers,
  onKickMember,
  onUpdateTimer,
  onUpdateSettings,
  onReAuctionSoldPlayer,
  onReAuctionParticularPlayer
}) => {
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [showHostControlsModal, setShowHostControlsModal] = useState(false);
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
  const [announcingLot, setAnnouncingLot] = useState<AuctionLot | null>(null);

  const myMember = roomState.members[myMemberId];
  const myTeamId = myMember?.teamId;
  const isHost = myMember?.isHost;
  const rawLot = roomState.currentLot;

  // Strict Sequence Lock: hold announcingLot until the voice announcement and hammer modal finish completely
  useEffect(() => {
    if (rawLot && (rawLot.status === 'SOLD' || rawLot.status === 'UNSOLD') && dismissedLotNumber !== rawLot.lotNumber) {
      setAnnouncingLot(rawLot);
    }
  }, [rawLot?.lotNumber, rawLot?.status, dismissedLotNumber]);

  // Active displayed lot: While announcing, lock to announcingLot so next player CANNOT leak through!
  const lot = announcingLot || rawLot;

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
      <div className="max-w-4xl mx-auto px-4 py-12 text-center animate-fadeIn font-body">
        <div className="bg-[#12142A] border border-[#1E2246] p-8 sm:p-12 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-3xl bg-[#0A0B14] border border-[#C8FF3D]/30 flex items-center justify-center text-[#C8FF3D] mx-auto mb-5 shadow-[0_0_20px_rgba(200,255,61,0.2)]">
            <Trophy className="w-8 h-8 stroke-[2.2]" />
          </div>
          <h2 className="text-2xl font-heading font-black text-white mb-2 uppercase tracking-wide">
            Auction Queue Completed
          </h2>
          <p className="text-xs sm:text-sm text-[#8F9CAE] max-w-lg mx-auto leading-relaxed mb-6">
            {isHost
              ? 'All scheduled players in this pool have been auctioned! As the room host, you can bring all unsold players back, conduct a random draw for unsold players, or officially end the auction.'
              : 'All scheduled players in this pool have been auctioned. Waiting for the room host to recall unsold players or finalize results...'}
          </p>

          {isHost ? (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setShowHostControlsModal(true)}
                className="py-3 px-6 rounded-2xl bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] font-heading font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(200,255,61,0.3)] flex items-center gap-2"
              >
                <Crown className="w-4 h-4" />
                <span>Host Controls</span>
              </button>
              {onBringAllUnsoldBack && (
                <button
                  onClick={onBringAllUnsoldBack}
                  className="py-3 px-5 rounded-2xl bg-[#1E2246] hover:bg-[#282E5C] text-white font-heading font-bold text-xs uppercase tracking-wider transition-all border border-[#1E2246] flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4 text-[#C8FF3D]" />
                  <span>Bring All Unsold Back</span>
                </button>
              )}
              <button
                onClick={onEndAuction}
                className="py-3 px-5 rounded-2xl bg-[#FF3B5C] hover:bg-[#E02E4E] text-white font-heading font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(255,59,92,0.3)]"
              >
                End Auction Now
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0A0B14] border border-[#1E2246] text-xs text-[#8F9CAE]">
              <span className="w-2 h-2 rounded-full bg-[#FFC93D] animate-ping" />
              <span>Awaiting host decision</span>
            </div>
          )}
        </div>

        {isHost && (
          <HostControlsModal
            isOpen={showHostControlsModal}
            onClose={() => setShowHostControlsModal(false)}
            roomState={roomState}
            myMemberId={myMemberId}
            onPauseAuction={onPauseAuction}
            onResumeAuction={onResumeAuction}
            onRestartAuction={onRestartAuction}
            onEndAuction={onEndAuction}
            onBringAllUnsoldBack={onBringAllUnsoldBack || (() => {})}
            onRandomDrawUnsold={onRandomDrawUnsold || (() => {})}
            onSkipMultiplePlayers={onSkipMultiplePlayers || (() => {})}
            onKickMember={onKickMember || (() => {})}
            onUpdateTimer={onUpdateTimer || (() => {})}
            onUpdateSettings={onUpdateSettings}
            onDrawRandomPlayer={onDrawRandomPlayer}
            onReAuctionParticularPlayer={onReAuctionParticularPlayer}
          />
        )}
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
  else if (announcingLot || lot.status !== 'IN_PROGRESS') bidDisabledReason = 'Auction outcome announcement in progress';
  else if (isHighestBidder) bidDisabledReason = 'Your franchise holds the highest bid';
  else if (isSquadFull) bidDisabledReason = 'Maximum squad limit (25) reached';
  else if (isOverseasFull) bidDisabledReason = 'Overseas limit reached (8/8)';
  else if (hasInsufficientPurse) {
    bidDisabledReason = `Purse reserve required: ₹${(minReserveRequired / 10000000).toFixed(2)} Cr needed to fill squad`;
  }

  const handlePlaceBidSafe = (amount: number) => {
    if (!canBid || isPlacingBid || announcingLot) return;
    setIsPlacingBid(true);
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

  // Highest-Bidded Player across the entire auction from completed SOLD records
  const soldHistoryLots = (roomState.history || []).filter(h => h.status === 'SOLD' && (h.soldPrice || 0) > 0);
  const highestBiddedLot = soldHistoryLots.length > 0
    ? [...soldHistoryLots].sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0) || a.lotNumber - b.lotNumber)[0]
    : null;

  // Section 04: Player Ratings generator
  const getPlayerRatings = (p: typeof player) => {
    const isBat = p.category === 'Batsmen';
    const isBowl = p.category === 'Bowlers';
    const isAll = p.category === 'All-rounders';
    const isWK = p.is_wicketkeeper;

    if (isWK) return { bat: p.is_marquee ? 'S' : 'A+', bowl: '—', field: 'S' };
    if (isAll) return { bat: p.is_marquee ? 'S' : 'A+', bowl: p.is_marquee ? 'S' : 'A', field: 'A+' };
    if (isBat) return { bat: p.is_marquee ? 'S' : 'A+', bowl: 'C', field: 'A' };
    if (isBowl) return { bat: 'B', bowl: p.is_marquee ? 'S' : 'A+', field: 'A' };
    return { bat: 'A', bowl: 'A', field: 'A' };
  };

  const ratings = getPlayerRatings(player);

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-5 py-3 space-y-3 font-body">
      {/* 1. TOP PROGRESS RIBBON: Compact Set, Lot Status & Quick Help */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#12142A]/90 backdrop-blur-md border border-[#23274D] px-4 py-2.5 rounded-2xl text-xs shadow-lg">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-heading font-extrabold text-[#C8FF3D] bg-[#0A0B14] px-3 py-1 rounded-lg border border-[#C8FF3D]/30 text-xs uppercase tracking-wider">
            Set {roomState.currentSetOrder}/{roomState.totalSets}
          </span>
          <span className="text-[#62658A] hidden sm:inline">·</span>
          <span className="font-heading font-bold text-white tracking-wide truncate max-w-[220px] sm:max-w-none text-sm">
            {player.set_name}
          </span>
          {player.is_marquee && (
            <span className="bg-[#FFC93D]/15 text-[#FFC93D] text-[10px] font-heading font-extrabold px-2.5 py-0.5 rounded-md border border-[#FFC93D]/40 flex items-center gap-1 uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-[#FFC93D]" />
              MARQUEE
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 text-xs">
          <span className="text-[#9E9EB8]">
            Lot <strong className="text-white font-number font-bold text-sm">#{lot.lotNumber}</strong> of {lot.totalLots}
          </span>
          <span className="text-[#62658A] hidden md:inline text-[11px]">
            ({remainingLots} remaining)
          </span>

          {/* Prominent Synchronized Hammer Clock Badge */}
          <HammerClockBadge 
            deadlineTimestamp={roomState.deadlineTimestamp} 
            roomStatus={roomState.status} 
            lotStatus={lot.status} 
          />

          {roomState.status === 'PAUSED' ? (
            <span className="bg-[#FFC93D]/15 text-[#FFC93D] font-heading font-bold px-3 py-1 rounded-lg border border-[#FFC93D]/40 flex items-center gap-1 text-xs uppercase tracking-wider">
              <Pause className="w-3 h-3" /> PAUSED
            </span>
          ) : (
            <span className="bg-[#C8FF3D]/15 text-[#C8FF3D] font-heading font-bold px-3 py-1 rounded-lg border border-[#C8FF3D]/30 flex items-center gap-1.5 text-xs tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-[#C8FF3D] animate-ping inline-block mr-0.5" />
              LIVE AUCTION
            </span>
          )}

          <button
            onClick={() => setShowOnboardingGuide(true)}
            aria-label="Auction Guide and Rules"
            className="flex items-center gap-1.5 text-[#9E9EB8] hover:text-[#C8FF3D] bg-[#181B38] hover:bg-[#23274D] border border-[#23274D] px-3 py-1 rounded-lg transition-colors text-[11px] font-bold"
          >
            <HelpCircle className="w-3.5 h-3.5" />
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
          
          {/* A. Bidding Panel & Timer (Section 05 Bidding Screen) */}
          <div className="bg-[#12142A] rounded-2xl p-4 sm:p-5 border border-[#23274D] shadow-xl relative overflow-hidden space-y-4">
            {/* Header: BID WAR + Status */}
            <div className="flex items-center justify-between pb-3 border-b border-[#23274D]/80">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B5C] animate-pulse" />
                <span className="font-heading font-black text-sm tracking-wider text-white uppercase">
                  BID WAR
                </span>
              </div>
              <span className="text-[10px] font-number text-[#9E9EB8] uppercase tracking-wider">
                LOT #{lot.lotNumber}
              </span>
            </div>

            {/* Hammer Clock & Progress Panel */}
            <div className="flex items-center justify-between gap-3">
              <HammerClockPanel 
                deadlineTimestamp={roomState.deadlineTimestamp} 
                totalDurationSec={roomState.settings.timerDuration || 10} 
                roomStatus={roomState.status} 
                lotStatus={lot.status} 
              />

              {/* Competitive Leader States */}
              {isHighestBidder ? (
                <div className="flex items-center gap-1.5 text-xs text-[#0A0B14] font-heading font-extrabold uppercase bg-[#C8FF3D] px-3 py-1.5 rounded-lg shadow-[0_0_15px_rgba(200,255,61,0.4)] tracking-wide">
                  <Shield className="w-3.5 h-3.5" />
                  <span>YOU ARE LEADING</span>
                </div>
              ) : wasOutbid ? (
                <div className="flex items-center gap-1.5 text-xs text-white font-heading font-extrabold uppercase bg-[#FF3B5C] px-3 py-1.5 rounded-lg shadow-[0_0_15px_rgba(255,59,92,0.4)] animate-bounce tracking-wide">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>OUTBID! STRIKE BACK</span>
                </div>
              ) : lot.currentBidder ? (
                <div className="flex items-center gap-1.5 text-xs text-[#FFC93D] font-heading font-bold uppercase bg-[#FFC93D]/10 border border-[#FFC93D]/30 px-3 py-1.5 rounded-lg tracking-wide">
                  <Shield className="w-3.5 h-3.5 text-[#FFC93D]" />
                  <span>{lot.currentBidder} LEADING</span>
                </div>
              ) : (
                <div className="text-xs text-[#9E9EB8] font-heading font-bold uppercase bg-[#0A0B14] px-3 py-1.5 rounded-lg border border-[#23274D] tracking-wide">
                  AWAITING OPENING BID
                </div>
              )}
            </div>

            {/* Current Highest Bid Banner */}
            <div className="p-4 bg-[#0A0B14] rounded-xl border border-[#23274D] flex items-center justify-between relative overflow-hidden">
              <div className="relative z-10">
                <span className="text-[10px] text-[#9E9EB8] uppercase font-bold tracking-wider block">
                  {lot.currentBidder ? `CURRENT BID · ${lot.currentBidder}` : 'OPENING BID'}
                </span>
                <span className="text-3xl sm:text-4xl font-number font-extrabold text-[#C8FF3D] block tracking-tight mt-0.5">
                  {currentBid > 0 ? `₹${(currentBid / 10000000).toFixed(2)} Cr` : 'NO BIDS YET'}
                </span>
              </div>
              {lot.currentBidder && (
                <div className="flex items-center gap-2.5 text-right relative z-10">
                  <TeamLogo teamId={lot.currentBidder} className="w-9 h-9 object-contain drop-shadow-md" />
                  <div className="text-left">
                    <span className="text-[9px] text-[#9E9EB8] uppercase font-bold block">Franchise</span>
                    <span className="text-xs font-heading font-extrabold text-white block uppercase tracking-wide">{lot.currentBidder}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Disabled Bidding Reason Alert */}
            {!canBid && bidDisabledReason && (
              <div className="bg-[#FF3B5C]/15 border border-[#FF3B5C]/30 text-[#FF3B5C] px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-[#FF3B5C] shrink-0" />
                <span>{bidDisabledReason}</span>
              </div>
            )}

            {/* Primary Action Button: BID ₹X.XX Cr (Hammer Lime, High Glow) */}
            <button
              onClick={() => handlePlaceBidSafe(nextMinBid)}
              disabled={!canBid || Boolean(announcingLot)}
              className="w-full bg-[#C8FF3D] hover:bg-[#B5F522] active:scale-[0.98] text-[#0A0B14] font-heading font-black py-4 px-6 rounded-xl transition-all shadow-[0_0_24px_rgba(200,255,61,0.35)] flex items-center justify-between disabled:opacity-30 disabled:cursor-not-allowed group text-base uppercase tracking-wider"
            >
              <div className="flex items-center gap-2.5">
                {isPlacingBid ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#0A0B14]" />
                ) : (
                  <ChevronUp className="w-5 h-5 stroke-[3] transition-transform group-hover:-translate-y-1 text-[#0A0B14]" />
                )}
                <span className="tracking-wide">
                  {isPlacingBid ? 'SUBMITTING...' : 'BID NOW'}
                </span>
              </div>
              <span className="font-number text-xl font-black text-[#0A0B14]">
                ₹{(nextMinBid / 10000000).toFixed(2)} Cr
              </span>
            </button>

            {/* Quick Increment Buttons (+20L, +50L, +1Cr, +2Cr) */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {quickIncrements.map((inc, i) => {
                const isIncLegal = inc.amount >= nextMinBid && inc.amount <= maxPossibleBid && canBid && !announcingLot;
                return (
                  <button
                    key={i}
                    onClick={() => handlePlaceBidSafe(inc.amount)}
                    disabled={!isIncLegal}
                    className="py-2.5 px-1.5 rounded-xl bg-[#0A0B14] hover:bg-[#181B38] text-white font-body text-xs font-semibold transition-all border border-[#23274D] hover:border-[#C8FF3D]/50 disabled:opacity-25 disabled:cursor-not-allowed flex flex-col items-center gap-0.5 shadow-sm"
                  >
                    <span className="text-[#C8FF3D] font-heading font-extrabold text-xs">{inc.label}</span>
                    <span className="text-[10px] text-[#9E9EB8] font-number">
                      ₹{(inc.amount / 10000000).toFixed(2)}Cr
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* B. Host Controls Card (Skip, Pause, Draw Random) */}
          {isHost && (
            <div className="bg-[#12142A] border border-[#23274D] rounded-2xl p-4 space-y-3 shadow-md">
              <div className="flex items-center justify-between text-xs">
                <span className="font-heading font-extrabold uppercase tracking-wider text-[#C8FF3D] flex items-center gap-1.5 text-xs">
                  <Shield className="w-3.5 h-3.5 text-[#C8FF3D]" />
                  HOST CONTROLS
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowHostControlsModal(true)}
                    className="px-2.5 py-1 bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] rounded-lg font-heading font-black uppercase tracking-wider transition-all flex items-center gap-1 text-[11px] shadow-[0_0_10px_rgba(200,255,61,0.2)]"
                  >
                    <Crown className="w-3 h-3 stroke-[2.5]" />
                    <span>Host Controls</span>
                  </button>

                  <button
                    onClick={() => setShowSkipModal(true)}
                    disabled={lot.status !== 'IN_PROGRESS' || Boolean(announcingLot)}
                    className="px-2.5 py-1 bg-[#181B38] hover:bg-[#23274D] text-[#FFC93D] border border-[#23274D] rounded-lg font-heading font-bold uppercase tracking-wider transition-all flex items-center gap-1 text-[11px] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <FastForward className="w-3 h-3" />
                    <span>Skip</span>
                  </button>

                  {roomState.status === 'AUCTION' ? (
                    <button
                      onClick={onPauseAuction}
                      className="px-2.5 py-1 bg-[#181B38] hover:bg-[#23274D] text-[#9E9EB8] hover:text-white border border-[#23274D] rounded-lg font-heading font-bold uppercase tracking-wider transition-all flex items-center gap-1 text-[11px]"
                    >
                      <Pause className="w-3 h-3" />
                      <span>Pause</span>
                    </button>
                  ) : (
                    <button
                      onClick={onResumeAuction}
                      className="px-2.5 py-1 bg-[#C8FF3D]/15 hover:bg-[#C8FF3D]/25 text-[#C8FF3D] border border-[#C8FF3D]/40 rounded-lg font-heading font-bold uppercase tracking-wider transition-all flex items-center gap-1 text-[11px]"
                    >
                      <Play className="w-3 h-3" />
                      <span>Resume</span>
                    </button>
                  )}

                  <button
                    onClick={onRestartAuction}
                    className="px-2.5 py-1 bg-[#181B38] hover:bg-[#FF3B5C]/20 text-[#9E9EB8] hover:text-[#FF3B5C] border border-[#23274D] rounded-lg font-heading font-bold uppercase tracking-wider transition-all flex items-center gap-1 text-[11px]"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restart</span>
                  </button>
                </div>
              </div>

              {/* Host Draw Random Player Toggle */}
              {onDrawRandomPlayer && (
                <div className="pt-2 border-t border-[#23274D]">
                  <button
                    onClick={() => setShowHostDraw(!showHostDraw)}
                    className="w-full text-left flex items-center justify-between text-xs text-[#9E9EB8] hover:text-white py-1 font-semibold transition-colors"
                  >
                    <span className="flex items-center gap-1.5 font-heading font-bold uppercase tracking-wider text-[#7C5CFF]">
                      <Dice5 className="w-3.5 h-3.5 text-[#FFC93D]" />
                      Custom Random Draw
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHostDraw ? 'rotate-180' : ''}`} />
                  </button>

                  {showHostDraw && (
                    <div className="space-y-2.5 pt-2.5 animate-fadeIn">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-[#9E9EB8] block mb-1 font-medium">Category</label>
                          <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value as PlayerCategory)}
                            className="w-full bg-[#0A0B14] border border-[#23274D] text-white text-xs rounded-lg px-2.5 py-1.5 outline-none font-medium"
                          >
                            <option value="Batsmen">Batsmen</option>
                            <option value="All-rounders">All-Rounders</option>
                            <option value="Bowlers">Bowlers</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-[#9E9EB8] block mb-1 font-medium">Price Bracket</label>
                          <select
                            value={selectedPriceBracket}
                            onChange={(e) => setSelectedPriceBracket(Number(e.target.value))}
                            className="w-full bg-[#0A0B14] border border-[#23274D] text-white text-xs rounded-lg px-2.5 py-1.5 outline-none font-number font-medium"
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
                        disabled={lot.status !== 'IN_PROGRESS' || Boolean(announcingLot)}
                        className="w-full bg-[#7C5CFF] hover:bg-[#6847F7] active:scale-[0.99] text-white font-heading font-extrabold uppercase py-2.5 px-3 rounded-xl transition-all text-xs flex items-center justify-center gap-1.5 shadow-md disabled:opacity-30 tracking-wider"
                      >
                        <Dice5 className="w-3.5 h-3.5 text-[#FFC93D]" />
                        <span>Draw Random {selectedCategory}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* C. Highest-Bidded Player Card */}
          <div className="bg-[#12142A] border border-[#23274D] rounded-2xl p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#23274D]">
              <span className="text-[10px] text-[#C8FF3D] uppercase font-heading font-extrabold tracking-wider flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-[#FFC93D]" />
                Highest-Bidded Player
              </span>
              {highestBiddedLot && (
                <span className="text-[10px] font-heading font-bold text-[#C8FF3D] bg-[#C8FF3D]/10 px-2 py-0.5 rounded border border-[#C8FF3D]/30 uppercase tracking-wider">
                  Record Sale
                </span>
              )}
            </div>

            {highestBiddedLot ? (
              <div className="flex items-center justify-between gap-3 pt-0.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-[#0A0B14] border border-[#23274D] flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
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
                    <span className="text-sm font-heading font-bold text-white uppercase tracking-wide truncate block">
                      {highestBiddedLot.player.name}
                    </span>
                    <span className="text-[11px] text-[#9E9EB8] block truncate">
                      {highestBiddedLot.player.primary_role} · {highestBiddedLot.player.category}
                    </span>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      {highestBiddedLot.winningTeam && (
                        <TeamLogo teamId={highestBiddedLot.winningTeam} className="w-4 h-4 object-contain shrink-0" />
                      )}
                      <span className="text-[10px] font-semibold text-[#9E9EB8] truncate">
                        {IPL_FRANCHISES[highestBiddedLot.winningTeam!]?.name || highestBiddedLot.winningTeamName || highestBiddedLot.winningTeam}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[9px] text-[#9E9EB8] uppercase font-bold block">Sold For</span>
                  <span className="text-base font-number font-extrabold text-[#C8FF3D] block">
                    ₹{((highestBiddedLot.soldPrice || 0) / 10000000).toFixed(2)} Cr
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-3 px-3 text-center rounded-xl bg-[#0A0B14] border border-[#23274D]">
                <p className="text-xs text-[#9E9EB8] font-medium">No players sold yet.</p>
                <span className="text-[10px] text-[#62658A] block mt-0.5">
                  Top auction sale will appear here
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* CENTER AREA: CURRENT PLAYER DETAILS (Section 04 Player Card) */}
        {/* ======================================================== */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-3 order-1 lg:order-2">
          
          <div 
            key={`player-card-${player.id}`}
            className={`relative bg-[#12142A] border rounded-2xl overflow-hidden shadow-2xl transition-all ${
              player.is_marquee ? 'border-[#FFC93D] shadow-[0_0_30px_rgba(255,201,61,0.25)]' : 'border-[#23274D]'
            }`}
          >
            {/* Top Details: Player Category, Set Info & Base Price */}
            <div className="p-4 sm:p-5 bg-[#12142A] border-b border-[#23274D] space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="bg-[#C8FF3D] text-[#0A0B14] text-[11px] font-heading font-black px-3 py-1 rounded-md uppercase tracking-wider">
                    {player.category === 'All-rounders' ? 'ALL-ROUNDER' : player.category === 'Wicket-keepers' ? 'WICKET-KEEPER' : player.category.toUpperCase()}
                  </span>
                  <span className="text-xs text-[#9E9EB8] font-number font-bold">
                    SET {roomState.currentSetOrder} · #{lot.lotNumber}
                  </span>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-[#9E9EB8] uppercase font-bold tracking-wider block">Base Price</span>
                  <span className="text-lg sm:text-xl font-number font-extrabold text-[#FFC93D] block">
                    {player.base_price_display}
                  </span>
                </div>
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-black text-white tracking-tight uppercase leading-tight">
                  {player.name}
                </h2>
                <div className="flex items-center gap-2 mt-1 text-xs text-[#9E9EB8]">
                  <span>Role: <strong className="text-white">{player.primary_role}</strong></span>
                  <span>•</span>
                  <span>{player.category}</span>
                  <span>•</span>
                  <span>{player.nationality}</span>
                </div>
              </div>

              {/* Classification Badges */}
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                {player.is_overseas ? (
                  <span className="bg-[#0A0B14] border border-[#23274D] text-[#7C5CFF] text-xs font-heading font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 shadow-sm">
                    <Plane className="w-3.5 h-3.5" /> Overseas · {player.nationality}
                  </span>
                ) : (
                  <span className="bg-[#0A0B14] border border-[#23274D] text-white text-xs font-heading font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 shadow-sm">
                    <span>🇮🇳</span> Indian Player
                  </span>
                )}

                {player.is_wicketkeeper && (
                  <span className="bg-[#FFC93D]/15 border border-[#FFC93D]/40 text-[#FFC93D] text-xs font-heading font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-sm">
                    🧤 Wicket-keeper
                  </span>
                )}
              </div>
            </div>

            {/* Prominent Stadium Showcase Frame */}
            <div className="relative w-full h-64 sm:h-76 md:h-80 flex items-center justify-center overflow-hidden border-b border-[#23274D] p-4 bg-gradient-to-b from-[#0A0B14] via-[#12142A] to-[#0A0B14]">
              {player.image_url && !imageError ? (
                <div className="relative z-10 w-52 h-52 sm:w-60 sm:h-60 md:w-64 md:h-64 rounded-full p-2 bg-[#0A0B14] shadow-2xl border-2 border-[#C8FF3D]/30 flex items-center justify-center overflow-hidden transform hover:scale-[1.02] transition-transform duration-300">
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

            {/* Section 04: 3-Box Ratings Grid (BAT, BOWL, FIELD) */}
            <div className="p-4 bg-[#0A0B14] border-b border-[#23274D] grid grid-cols-3 gap-3">
              <div className="bg-[#12142A] border border-[#23274D] p-3 rounded-xl text-center">
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-heading font-extrabold uppercase text-[#9E9EB8] mb-0.5">
                  <BatIcon className="w-3.5 h-3.5 text-[#C8FF3D]" />
                  <span>BAT</span>
                </div>
                <div className="text-xl font-heading font-black text-white">{ratings.bat}</div>
              </div>

              <div className="bg-[#12142A] border border-[#23274D] p-3 rounded-xl text-center">
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-heading font-extrabold uppercase text-[#9E9EB8] mb-0.5">
                  <BallIcon className="w-3.5 h-3.5 text-[#FF3B5C]" />
                  <span>BOWL</span>
                </div>
                <div className="text-xl font-heading font-black text-white">{ratings.bowl}</div>
              </div>

              <div className="bg-[#12142A] border border-[#23274D] p-3 rounded-xl text-center">
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-heading font-extrabold uppercase text-[#9E9EB8] mb-0.5">
                  <StumpsIcon className="w-3.5 h-3.5 text-[#7C5CFF]" />
                  <span>FIELD</span>
                </div>
                <div className="text-xl font-heading font-black text-white">{ratings.field}</div>
              </div>
            </div>

            {/* Bottom Card Summary: Status Banner */}
            <div className="p-3 bg-[#12142A] flex items-center justify-between text-xs font-heading uppercase tracking-wider text-[#9E9EB8]">
              <span className="flex items-center gap-1.5 font-bold">
                <Tag className="w-3.5 h-3.5 text-[#C8FF3D]" />
                Status: <strong className="text-white">{lot.status}</strong>
              </span>
              <span className="font-number text-xs text-[#9E9EB8]">Lot #{lot.lotNumber}</span>
            </div>

            {/* UNSOLD OVERLAY */}
            {lot.status === 'UNSOLD' && (
              <div className="absolute inset-0 z-40 bg-[#0A0B14]/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 text-center border-2 border-[#FF3B5C] animate-fadeIn select-none">
                <span className="text-6xl sm:text-7xl font-heading font-black tracking-widest text-[#FF3B5C] animate-pulse uppercase">
                  UNSOLD
                </span>
                <span className="text-xs text-[#9E9EB8] font-body mt-3">
                  Player moves to the un-auctioned pool
                </span>
              </div>
            )}

            {/* SKIPPED OVERLAY */}
            {lot.status === 'SKIPPED' && (
              <div className="absolute inset-0 z-40 bg-[#0A0B14]/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 text-center border-2 border-[#FFC93D] animate-fadeIn select-none">
                <FastForward className="w-8 h-8 text-[#FFC93D] mb-2" />
                <span className="text-3xl font-heading font-black text-[#FFC93D] uppercase tracking-wider">
                  SKIPPED BY HOST
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT AREA: MY TEAM SUMMARY & LIVE BID FEED (3 Cols)     */}
        {/* ======================================================== */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-3 order-3">
          
          {/* A. My Franchise Card */}
          <div className="bg-[#12142A] border border-[#23274D] rounded-2xl p-4 sm:p-5 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#23274D]">
              <span className="text-[10px] text-[#9E9EB8] uppercase font-heading font-extrabold tracking-wider">
                My Franchise
              </span>
              {myTeamId && (
                <span className="text-xs font-heading font-extrabold text-[#C8FF3D] bg-[#0A0B14] px-2.5 py-0.5 rounded-md border border-[#C8FF3D]/30 uppercase tracking-wider">
                  {myTeamId}
                </span>
              )}
            </div>

            {myTeamId ? (
              <div className="space-y-3.5">
                <div className="flex items-center gap-3">
                  <TeamLogo teamId={myTeamId} className="w-11 h-11 object-contain drop-shadow-md" />
                  <div>
                    <h3 className="font-heading font-bold text-base text-white uppercase tracking-wide leading-tight">
                      {IPL_FRANCHISES[myTeamId]?.name}
                    </h3>
                    <span className="text-[11px] text-[#9E9EB8]">
                      Purse Remaining:
                    </span>
                  </div>
                </div>

                {/* Purse Balance */}
                <div className="bg-[#0A0B14] p-3 rounded-xl border border-[#23274D]">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-[#9E9EB8] flex items-center gap-1 font-body">
                      <Wallet className="w-3.5 h-3.5 text-[#C8FF3D]" /> Balance
                    </span>
                    <span className="font-number font-black text-[#FFC93D] text-lg">
                      ₹{(myPurse / 10000000).toFixed(2)} Cr
                    </span>
                  </div>
                  <div className="w-full bg-[#181B38] h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-[#C8FF3D] via-[#FFC93D] to-[#7C5CFF] h-full"
                      style={{ width: `${Math.min(100, Math.max(0, (myPurse / (roomState.settings.startingPurse || 1200000000)) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Squad Count & Overseas Count */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#0A0B14] p-2.5 rounded-xl border border-[#23274D]">
                    <span className="text-[10px] text-[#9E9EB8] block font-medium">Squad</span>
                    <span className="font-number font-bold text-white text-xs">
                      {mySquad.length} / {roomState.settings.maxSquad}
                    </span>
                  </div>
                  <div className="bg-[#0A0B14] p-2.5 rounded-xl border border-[#23274D]">
                    <span className="text-[10px] text-[#9E9EB8] block font-medium">Overseas</span>
                    <span className={`font-number font-bold text-xs ${myOverseasCount >= 8 ? 'text-[#FF3B5C]' : 'text-white'}`}>
                      {myOverseasCount} / 8 max
                    </span>
                  </div>
                </div>

                {/* Squad Reserve Requirement Notice */}
                {minReserveRequired > 0 && (
                  <p className="text-[10px] text-[#9E9EB8] font-body leading-tight bg-[#0A0B14] p-2.5 rounded-xl border border-[#23274D]">
                    🛡️ Min squad reserve: <strong className="text-[#FFC93D] font-number font-bold">₹{(minReserveRequired / 10000000).toFixed(2)} Cr</strong> required for remaining {slotsRemainingNeeded} slots.
                  </p>
                )}

                {/* Toggle Acquired Squad List */}
                {mySquad.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowSquadList(!showSquadList)}
                      className="w-full text-left text-xs text-[#C8FF3D] font-heading font-bold uppercase tracking-wider flex items-center justify-between py-1 transition-colors hover:underline"
                    >
                      <span>View My Squad ({mySquad.length})</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSquadList ? 'rotate-180' : ''}`} />
                    </button>

                    {showSquadList && (
                      <div className="space-y-1.5 mt-2 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                        {mySquad.map(sq => (
                          <div key={sq.id} className="flex items-center justify-between text-[11px] py-1 px-2.5 rounded-lg bg-[#0A0B14] border border-[#23274D]">
                            <span className="text-white font-medium truncate max-w-[120px]">{sq.name}</span>
                            <span className="font-number font-bold text-[#C8FF3D] text-[11px]">
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
              <div className="py-4 text-center text-xs text-[#9E9EB8]">
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
      {announcingLot && (
        <FullScreenGavelModal
          lot={announcingLot}
          myTeamId={myTeamId}
          onComplete={(resultId) => {
            const completedLotNumber = announcingLot.lotNumber;
            setDismissedLotNumber(completedLotNumber);
            setAnnouncingLot(null);
            onAdvanceLot?.(completedLotNumber - 1, resultId);
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

      {/* 5. QUICK ONBOARDING GUIDE MODAL */}
      {showOnboardingGuide && (
        <div className="fixed inset-0 z-50 bg-[#0A0B14]/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn font-body">
          <div className="bg-[#12142A] border border-[#23274D] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowOnboardingGuide(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-[#0A0B14] hover:bg-[#181B38] text-[#9E9EB8] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <GavelIcon className="w-6 h-6 text-[#C8FF3D]" />
              <h3 className="font-heading font-black text-xl text-white uppercase tracking-wide">How Bidding Works</h3>
            </div>

            <div className="space-y-3 text-xs text-[#9E9EB8]">
              <div className="p-3 bg-[#0A0B14] rounded-xl border border-[#23274D] flex gap-3">
                <span className="font-number font-extrabold text-[#C8FF3D] text-sm shrink-0">01</span>
                <div>
                  <h4 className="font-heading font-bold uppercase tracking-wider text-white mb-0.5">Current Lot & Base Price</h4>
                  <p>Each player enters the arena with an official base price. The first valid bid opens at the base price.</p>
                </div>
              </div>

              <div className="p-3 bg-[#0A0B14] rounded-xl border border-[#23274D] flex gap-3">
                <span className="font-number font-extrabold text-[#FFC93D] text-sm shrink-0">02</span>
                <div>
                  <h4 className="font-heading font-bold uppercase tracking-wider text-white mb-0.5">Hammer Clock & 3-Second Warning</h4>
                  <p>Each accepted bid resets the countdown clock. At 3 seconds, warning ticks alert players before final hammer strike.</p>
                </div>
              </div>

              <div className="p-3 bg-[#0A0B14] rounded-xl border border-[#23274D] flex gap-3">
                <span className="font-number font-extrabold text-[#FF3B5C] text-sm shrink-0">03</span>
                <div>
                  <h4 className="font-heading font-bold uppercase tracking-wider text-white mb-0.5">Placing Bids & Increments</h4>
                  <p>Click "Bid Now" to submit the minimum increment, or use quick increment buttons (+20L, +50L, +1Cr, +2Cr).</p>
                </div>
              </div>

              <div className="p-3 bg-[#0A0B14] rounded-xl border border-[#23274D] flex gap-3">
                <span className="font-number font-extrabold text-[#7C5CFF] text-sm shrink-0">04</span>
                <div>
                  <h4 className="font-heading font-bold uppercase tracking-wider text-white mb-0.5">Squad & Overseas Limits</h4>
                  <p>Min 18 to max 25 players per team. Maximum 8 overseas players. You must maintain enough purse reserve to complete 18 slots.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowOnboardingGuide(false)}
              className="w-full py-3.5 bg-[#C8FF3D] hover:bg-[#B5F522] text-[#0A0B14] font-heading font-extrabold uppercase text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(200,255,61,0.3)] mt-2 tracking-wider"
            >
              Hammer Your XI!
            </button>
          </div>
        </div>
      )}

      {/* 6. HOST CONTROLS & AUCTION MANAGEMENT MODAL */}
      {isHost && (
        <HostControlsModal
          isOpen={showHostControlsModal}
          onClose={() => setShowHostControlsModal(false)}
          roomState={roomState}
          myMemberId={myMemberId}
          onPauseAuction={onPauseAuction}
          onResumeAuction={onResumeAuction}
          onRestartAuction={onRestartAuction}
          onEndAuction={onEndAuction}
          onBringAllUnsoldBack={onBringAllUnsoldBack || (() => {})}
          onRandomDrawUnsold={onRandomDrawUnsold || (() => {})}
          onSkipMultiplePlayers={onSkipMultiplePlayers || (() => {})}
          onKickMember={onKickMember || (() => {})}
          onUpdateTimer={onUpdateTimer || (() => {})}
          onUpdateSettings={onUpdateSettings}
          onDrawRandomPlayer={onDrawRandomPlayer}
          onReAuctionParticularPlayer={onReAuctionParticularPlayer}
        />
      )}
    </div>
  );
};
