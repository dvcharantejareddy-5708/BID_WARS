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
      <div className="max-w-4xl mx-auto px-4 py-16 text-center animate-fadeIn font-body">
        <div className="bg-[#0E1626] border border-[#26354D] p-8 rounded-2xl shadow-2xl">
          <Trophy className="w-12 h-12 text-[#C8FF45] mx-auto mb-3 animate-bounce" />
          <h2 className="text-xl font-heading font-black text-[#F4F7FC] mb-1 uppercase tracking-wide">Preparing Next Lot...</h2>
          <p className="text-xs text-[#9BAAC0]">Loading official verified player records.</p>
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

  // Highest-Bidded Player across the entire auction from completed SOLD records (Requirement 1)
  const soldHistoryLots = (roomState.history || []).filter(h => h.status === 'SOLD' && (h.soldPrice || 0) > 0);
  const highestBiddedLot = soldHistoryLots.length > 0
    ? [...soldHistoryLots].sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0) || a.lotNumber - b.lotNumber)[0]
    : null;

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-5 py-2.5 space-y-3 font-body">
      {/* 1. TOP PROGRESS RIBBON: Compact Set, Lot Status & Quick Help */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0E1626] border border-[#26354D] px-3.5 py-2 rounded-xl text-xs shadow-md">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-heading font-extrabold text-[#C8FF45] bg-[#C8FF45]/10 px-2.5 py-0.5 rounded-full border border-[#C8FF45]/30 text-xs uppercase tracking-wider">
            Set {roomState.currentSetOrder}/{roomState.totalSets}
          </span>
          <span className="text-[#9BAAC0] hidden sm:inline">·</span>
          <span className="font-heading font-bold text-[#F4F7FC] tracking-wide truncate max-w-[220px] sm:max-w-none text-sm">
            {player.set_name}
          </span>
          {player.is_marquee && (
            <span className="bg-[#FFC857]/15 text-[#FFC857] text-[10px] font-heading font-extrabold px-2.5 py-0.5 rounded-full border border-[#FFC857]/30 flex items-center gap-1 uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-[#FFC857]" />
              MARQUEE
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 text-xs">
          <span className="text-[#9BAAC0]">
            Lot <strong className="text-[#F4F7FC] font-number font-bold text-sm">#{lot.lotNumber}</strong> of {lot.totalLots}
          </span>
          <span className="text-[#9BAAC0] hidden md:inline text-[11px]">
            ({remainingLots} remaining)
          </span>

          {/* Prominent Synchronized Hammer Clock Badge (Always visible across all devices) */}
          <HammerClockBadge 
            deadlineTimestamp={roomState.deadlineTimestamp} 
            roomStatus={roomState.status} 
            lotStatus={lot.status} 
          />

          {roomState.status === 'PAUSED' ? (
            <span className="bg-[#FFC857]/20 text-[#FFC857] font-heading font-bold px-2.5 py-0.5 rounded-full border border-[#FFC857]/40 flex items-center gap-1 text-xs">
              <Pause className="w-3 h-3" /> PAUSED
            </span>
          ) : (
            <span className="bg-[#C8FF45]/15 text-[#C8FF45] font-heading font-bold px-2.5 py-0.5 rounded-full border border-[#C8FF45]/30 flex items-center gap-1 text-xs tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#C8FF45] animate-ping inline-block mr-0.5" />
              LIVE AUCTION
            </span>
          )}

          <button
            onClick={() => setShowOnboardingGuide(true)}
            aria-label="Auction Guide and Rules"
            className="flex items-center gap-1 text-[#9BAAC0] hover:text-[#C8FF45] bg-[#141F33] hover:bg-[#1B2942] border border-[#26354D] px-2.5 py-0.5 rounded-full transition-colors text-[11px] font-medium"
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
          
          {/* A. Bidding Panel & Timer (Stadium Clean Card) */}
          <div className="bg-[#0E1626] rounded-2xl p-4 border border-[#26354D] shadow-xl relative overflow-hidden space-y-3.5">
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
                <div className="flex items-center gap-1.5 text-xs text-[#C8FF45] font-heading font-extrabold uppercase bg-[#C8FF45]/15 border border-[#C8FF45]/40 px-3 py-1 rounded-full shadow-sm animate-pulse tracking-wide">
                  <Shield className="w-3.5 h-3.5" />
                  <span>YOU ARE LEADING</span>
                </div>
              ) : wasOutbid ? (
                <div className="flex items-center gap-1.5 text-xs text-[#FFC857] font-heading font-extrabold uppercase bg-[#FFC857]/15 border border-[#FFC857]/40 px-3 py-1 rounded-full shadow-sm animate-bounce tracking-wide">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#FFC857]" />
                  <span>OUTBID! RAISE BID</span>
                </div>
              ) : lot.currentBidder ? (
                <div className="flex items-center gap-1.5 text-xs text-[#9BAAC0] font-heading font-bold uppercase bg-[#141F33] border border-[#26354D] px-3 py-1 rounded-full shadow-sm tracking-wide">
                  <Shield className="w-3.5 h-3.5 text-[#FFC857]" />
                  <span>{lot.currentBidder} LEADING</span>
                </div>
              ) : (
                <div className="text-xs text-[#9BAAC0] font-heading font-bold uppercase bg-[#141F33] px-2.5 py-1 rounded-full border border-[#26354D] tracking-wide">
                  AWAITING BID
                </div>
              )}
            </div>

            {/* Current Highest Bid Banner */}
            <div className="p-3.5 bg-[#141F33] rounded-xl border border-[#26354D] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#9BAAC0] uppercase font-bold tracking-wider block">Current Bid</span>
                <span className="text-2xl sm:text-3xl font-number text-[#C8FF45] block">
                  {currentBid > 0 ? `₹${(currentBid / 10000000).toFixed(2)} Cr` : 'NO BIDS YET'}
                </span>
              </div>
              {lot.currentBidder && (
                <div className="flex items-center gap-2 text-right">
                  <TeamLogo teamId={lot.currentBidder} className="w-8 h-8 object-contain drop-shadow" />
                  <div className="text-left">
                    <span className="text-[9px] text-[#9BAAC0] uppercase font-bold block">Leader</span>
                    <span className="text-xs font-heading font-extrabold text-[#F4F7FC] block uppercase tracking-wide">{lot.currentBidder}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Disabled Bidding Reason Alert */}
            {!canBid && bidDisabledReason && (
              <div className="bg-[#FF647C]/15 border border-[#FF647C]/30 text-[#FF647C] px-3 py-2 rounded-xl text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-[#FF647C] shrink-0" />
                <span>{bidDisabledReason}</span>
              </div>
            )}

            {/* Primary Action Button: PLACE BID (With anti-double-click guard & loading state) */}
            <button
              onClick={() => handlePlaceBidSafe(nextMinBid)}
              disabled={!canBid || Boolean(announcingLot)}
              className="w-full bg-[#C8FF45] hover:bg-[#B0E635] active:scale-[0.99] text-black font-heading font-black py-3.5 px-5 rounded-xl transition-all shadow-glow-lime flex items-center justify-between disabled:opacity-25 disabled:cursor-not-allowed group text-base uppercase tracking-wider"
            >
              <div className="flex items-center gap-2">
                {isPlacingBid ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ChevronUp className="w-5 h-5 stroke-[3] transition-transform group-hover:-translate-y-0.5" />
                )}
                <span>
                  {isPlacingBid ? 'SUBMITTING BID...' : 'PLACE BID'}
                </span>
              </div>
              <span className="font-number text-lg font-black text-black">
                ₹{(nextMinBid / 10000000).toFixed(2)} Cr
              </span>
            </button>

            {/* Quick Increment Buttons (+20L, +50L, +1Cr, +2Cr) */}
            <div className="grid grid-cols-4 gap-1.5 pt-0.5">
              {quickIncrements.map((inc, i) => {
                const isIncLegal = inc.amount >= nextMinBid && inc.amount <= maxPossibleBid && canBid && !announcingLot;
                return (
                  <button
                    key={i}
                    onClick={() => handlePlaceBidSafe(inc.amount)}
                    disabled={!isIncLegal}
                    className="py-2 px-1.5 rounded-lg bg-[#141F33] hover:bg-[#1B2942] text-[#F4F7FC] hover:text-white font-body text-xs font-semibold transition-all border border-[#26354D] hover:border-[#C8FF45]/50 disabled:opacity-20 disabled:cursor-not-allowed flex flex-col items-center gap-0.5 shadow-sm"
                  >
                    <span className="text-[#C8FF45] font-heading font-black text-xs">{inc.label}</span>
                    <span className="text-[10px] text-[#9BAAC0] font-number">
                      ₹{(inc.amount / 10000000).toFixed(2)}Cr
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* B. Host Controls Card (Skip, Pause, Draw Random) */}
          {isHost && (
            <div className="bg-[#0E1626] border border-[#26354D] rounded-2xl p-3.5 space-y-2.5 shadow-md">
              <div className="flex items-center justify-between text-xs">
                <span className="font-heading font-bold uppercase tracking-wider text-[#9BAAC0] flex items-center gap-1.5 text-xs">
                  <Shield className="w-3.5 h-3.5 text-[#C8FF45]" />
                  HOST CONTROLS
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowSkipModal(true)}
                    disabled={lot.status !== 'IN_PROGRESS' || Boolean(announcingLot)}
                    className="px-2.5 py-1 bg-[#141F33] hover:bg-[#1B2942] text-[#FFC857] border border-[#FFC857]/30 rounded-full font-heading font-bold uppercase tracking-wider transition-all flex items-center gap-1 text-[11px] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <FastForward className="w-3 h-3" />
                    <span>Skip</span>
                  </button>

                  {roomState.status === 'AUCTION' ? (
                    <button
                      onClick={onPauseAuction}
                      className="px-2.5 py-1 bg-[#141F33] hover:bg-[#1B2942] text-[#F4F7FC] border border-[#26354D] rounded-full font-heading font-bold uppercase tracking-wider transition-all flex items-center gap-1 text-[11px]"
                    >
                      <Pause className="w-3 h-3" />
                      <span>Pause</span>
                    </button>
                  ) : (
                    <button
                      onClick={onResumeAuction}
                      className="px-2.5 py-1 bg-[#C8FF45]/20 hover:bg-[#C8FF45]/30 text-[#C8FF45] border border-[#C8FF45]/40 rounded-full font-heading font-bold uppercase tracking-wider transition-all flex items-center gap-1 text-[11px]"
                    >
                      <Play className="w-3 h-3" />
                      <span>Resume</span>
                    </button>
                  )}

                  <button
                    onClick={onRestartAuction}
                    className="px-2.5 py-1 bg-[#141F33] hover:bg-[#FF647C]/20 text-[#9BAAC0] hover:text-[#FF647C] border border-[#26354D] rounded-full font-heading font-bold uppercase tracking-wider transition-all flex items-center gap-1 text-[11px]"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restart</span>
                  </button>
                </div>
              </div>

              {/* Host Draw Random Player Toggle */}
              {onDrawRandomPlayer && (
                <div className="pt-1 border-t border-[#1C273A]">
                  <button
                    onClick={() => setShowHostDraw(!showHostDraw)}
                    className="w-full text-left flex items-center justify-between text-xs text-[#9BAAC0] hover:text-white py-1 font-semibold transition-colors"
                  >
                    <span className="flex items-center gap-1 font-heading font-bold uppercase tracking-wider">
                      <Dice5 className="w-3.5 h-3.5 text-[#FFC857]" />
                      Custom Random Draw
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHostDraw ? 'rotate-180' : ''}`} />
                  </button>

                  {showHostDraw && (
                    <div className="space-y-2 pt-2 animate-fadeIn">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-[#9BAAC0] block mb-1">Category</label>
                          <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value as PlayerCategory)}
                            className="w-full bg-[#141F33] border border-[#26354D] text-[#F4F7FC] text-xs rounded-lg px-2 py-1 outline-none"
                          >
                            <option value="Batsmen">Batsmen</option>
                            <option value="All-rounders">All-Rounders</option>
                            <option value="Bowlers">Bowlers</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-[#9BAAC0] block mb-1">Price Bracket</label>
                          <select
                            value={selectedPriceBracket}
                            onChange={(e) => setSelectedPriceBracket(Number(e.target.value))}
                            className="w-full bg-[#141F33] border border-[#26354D] text-[#F4F7FC] text-xs rounded-lg px-2 py-1 outline-none font-number"
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
                        className="w-full bg-[#FFC857] hover:bg-[#ffcf6e] active:scale-[0.99] text-black font-heading font-extrabold uppercase py-2 px-3 rounded-lg transition-all text-xs flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-30 tracking-wider"
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

          {/* C. Highest-Bidded Player Card */}
          <div className="bg-[#0E1626] border border-[#26354D] rounded-2xl p-3.5 shadow-xl space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#1C273A]">
              <span className="text-[10px] text-[#9BAAC0] uppercase font-heading font-extrabold tracking-wider flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-[#FFC857]" />
                Highest-Bidded Player
              </span>
              {highestBiddedLot && (
                <span className="text-[10px] font-heading font-extrabold text-[#C8FF45] bg-[#C8FF45]/10 px-2 py-0.5 rounded-full border border-[#C8FF45]/25 uppercase tracking-wider">
                  Record Buy
                </span>
              )}
            </div>

            {highestBiddedLot ? (
              <div className="flex items-center justify-between gap-3 pt-0.5">
                {/* Player Photo & Details */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-[#1B2942] to-[#0E1626] border border-[#26354D] flex items-center justify-center overflow-hidden shrink-0 shadow-md">
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
                    <span className="text-sm font-heading font-extrabold text-[#F4F7FC] uppercase tracking-wide truncate block">
                      {highestBiddedLot.player.name}
                    </span>
                    <span className="text-[11px] text-[#9BAAC0] block truncate">
                      {highestBiddedLot.player.primary_role} · {highestBiddedLot.player.category}
                    </span>

                    {/* Winning Team info */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {highestBiddedLot.winningTeam && (
                        <TeamLogo teamId={highestBiddedLot.winningTeam} className="w-4 h-4 object-contain shrink-0" />
                      )}
                      <span className="text-[10px] font-semibold text-[#9BAAC0] truncate">
                        {IPL_FRANCHISES[highestBiddedLot.winningTeam!]?.name || highestBiddedLot.winningTeamName || highestBiddedLot.winningTeam}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Final Sold Price in Crores */}
                <div className="text-right shrink-0">
                  <span className="text-[9px] text-[#9BAAC0] uppercase font-bold block">Sold Price</span>
                  <span className="text-base font-number text-[#C8FF45] block">
                    ₹{((highestBiddedLot.soldPrice || 0) / 10000000).toFixed(2)} Cr
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-2.5 px-3 text-center rounded-xl bg-[#141F33] border border-[#26354D]">
                <p className="text-xs text-[#9BAAC0] font-medium">No players sold yet.</p>
                <span className="text-[10px] text-[#5A6F8F] block mt-0.5">
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
          
          {/* Active Player Card with Stadium Spotlight & Refined Borders */}
          <div 
            key={`player-card-${player.id}`}
            className={`relative bg-[#0E1626] border rounded-2xl overflow-hidden shadow-stadium-card transition-all animate-player-entrance ${
              player.is_marquee ? 'border-[#C8FF45]/60 shadow-glow-lime' : 'border-[#26354D]'
            }`}
          >
            {/* Top Details: Player Name, Badges & Base Price */}
            <div className="p-4 sm:p-5 bg-gradient-to-b from-[#141F33] to-[#0E1626] border-b border-[#26354D] space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-heading font-black text-[#F4F7FC] tracking-wide uppercase leading-tight">
                    {player.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-heading font-extrabold text-[#C8FF45] uppercase tracking-wider">
                      {player.category}
                    </span>
                    <span className="text-[#9BAAC0] text-xs">•</span>
                    <span className="text-xs text-[#9BAAC0] font-medium">
                      Role: <strong className="text-[#F4F7FC]">{player.primary_role}</strong>
                    </span>
                  </div>
                </div>

                {/* Base Price Tag */}
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-[#9BAAC0] uppercase font-bold tracking-wider block">Base Price</span>
                  <span className="text-lg sm:text-xl font-number text-[#C8FF45] block">
                    {player.base_price_display}
                  </span>
                </div>
              </div>

              {/* Classification Badges */}
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                {player.is_overseas ? (
                  <span className="bg-[#54C8FF]/15 border border-[#54C8FF]/30 text-[#54C8FF] text-xs font-heading font-bold uppercase tracking-wider px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-sm">
                    <Plane className="w-3.5 h-3.5" /> Overseas · {player.nationality}
                  </span>
                ) : (
                  <span className="bg-[#141F33] border border-[#26354D] text-[#F4F7FC] text-xs font-heading font-bold uppercase tracking-wider px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-sm">
                    <span>🇮🇳</span> Indian Player
                  </span>
                )}

                {player.is_wicketkeeper && (
                  <span className="bg-[#FFC857]/15 border border-[#FFC857]/30 text-[#FFC857] text-xs font-heading font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm">
                    🧤 Wicket-keeper
                  </span>
                )}
              </div>
            </div>

            {/* Prominent Stadium Showcase Frame */}
            <div className="relative w-full h-64 sm:h-76 md:h-80 flex items-center justify-center overflow-hidden border-b border-[#26354D] p-2.5 sm:p-4 bg-gradient-to-b from-[#0E1626] via-[#101A2E] to-[#0E1626]">
              {/* Subtle stadium overhead light ray */}
              <div className="absolute inset-0 bg-radial-gradient pointer-events-none opacity-40" />
              
              {player.image_url && !imageError ? (
                <div className="relative z-10 w-52 h-52 sm:w-60 sm:h-60 md:w-64 md:h-64 rounded-full p-2 bg-gradient-to-b from-[#C8FF45]/40 via-[#26354D] to-[#0E1626] shadow-[0_0_40px_rgba(0,0,0,0.8),0_0_20px_rgba(200,255,69,0.2)] border-2 border-[#C8FF45]/50 flex items-center justify-center overflow-hidden transform hover:scale-[1.02] transition-transform duration-300">
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
            <div className="p-3 bg-[#101A2C] flex items-center justify-between text-xs font-heading uppercase tracking-wider text-[#9BAAC0]">
              <span className="flex items-center gap-1.5 font-bold">
                <Tag className="w-3.5 h-3.5 text-[#C8FF45]" />
                Status: <strong className="text-[#F4F7FC]">{lot.status}</strong>
              </span>
              <span className="font-number text-xs text-[#9BAAC0]">Lot #{lot.lotNumber}</span>
            </div>

            {/* UNSOLD OVERLAY */}
            {lot.status === 'UNSOLD' && (
              <div className="absolute inset-0 z-40 bg-[#080D18]/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center border border-[#26354D] animate-fadeIn select-none">
                <span className="text-6xl sm:text-7xl font-heading font-black tracking-widest text-[#FF647C] animate-pulse uppercase">
                  UNSOLD
                </span>
                <span className="text-xs text-[#9BAAC0] font-body mt-3">
                  Player moves to the un-auctioned pool
                </span>
              </div>
            )}

            {/* SKIPPED OVERLAY */}
            {lot.status === 'SKIPPED' && (
              <div className="absolute inset-0 z-40 bg-[#080D18]/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center border border-[#26354D] animate-fadeIn select-none">
                <FastForward className="w-8 h-8 text-[#FFC857] mb-2" />
                <span className="text-3xl font-heading font-black text-[#FFC857] uppercase tracking-wider">
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
          <div className="bg-[#0E1626] border border-[#26354D] rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#1C273A]">
              <span className="text-[10px] text-[#9BAAC0] uppercase font-heading font-extrabold tracking-wider">
                My Franchise
              </span>
              {myTeamId && (
                <span className="text-xs font-heading font-extrabold text-[#C8FF45] bg-[#C8FF45]/10 px-2.5 py-0.5 rounded-full border border-[#C8FF45]/20 uppercase tracking-wider">
                  {myTeamId}
                </span>
              )}
            </div>

            {myTeamId ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <TeamLogo teamId={myTeamId} className="w-10 h-10 object-contain drop-shadow" />
                  <div>
                    <h3 className="font-heading font-extrabold text-base text-[#F4F7FC] uppercase tracking-wide leading-tight">
                      {IPL_FRANCHISES[myTeamId]?.name}
                    </h3>
                    <span className="text-[11px] text-[#9BAAC0]">
                      Purse Remaining:
                    </span>
                  </div>
                </div>

                {/* Purse Balance */}
                <div className="bg-[#141F33] p-2.5 rounded-xl border border-[#26354D]">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[#9BAAC0] flex items-center gap-1 font-body">
                      <Wallet className="w-3.5 h-3.5 text-[#C8FF45]" /> Balance
                    </span>
                    <span className="font-number text-[#F4F7FC] text-sm">
                      ₹{(myPurse / 10000000).toFixed(2)} Cr
                    </span>
                  </div>
                  <div className="w-full bg-[#080D18] h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-[#C8FF45] via-[#54C8FF] to-[#C8FF45] h-full"
                      style={{ width: `${Math.min(100, Math.max(0, (myPurse / (roomState.settings.startingPurse || 1200000000)) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Squad Count & Overseas Count */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#141F33] p-2 rounded-xl border border-[#26354D]">
                    <span className="text-[10px] text-[#9BAAC0] block font-medium">Squad</span>
                    <span className="font-number text-[#F4F7FC] text-xs">
                      {mySquad.length} / {roomState.settings.maxSquad}
                    </span>
                  </div>
                  <div className="bg-[#141F33] p-2 rounded-xl border border-[#26354D]">
                    <span className="text-[10px] text-[#9BAAC0] block font-medium">Overseas</span>
                    <span className={`font-number text-xs ${myOverseasCount >= 8 ? 'text-[#FF647C]' : 'text-[#F4F7FC]'}`}>
                      {myOverseasCount} / 8 max
                    </span>
                  </div>
                </div>

                {/* Squad Reserve Requirement Notice */}
                {minReserveRequired > 0 && (
                  <p className="text-[10px] text-[#9BAAC0] font-body leading-tight bg-[#141F33] p-2 rounded-lg border border-[#26354D]">
                    🛡️ Min squad reserve: <strong className="text-[#FFC857] font-number">₹{(minReserveRequired / 10000000).toFixed(2)} Cr</strong> required for remaining {slotsRemainingNeeded} slots.
                  </p>
                )}

                {/* Toggle Acquired Squad List */}
                {mySquad.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowSquadList(!showSquadList)}
                      className="w-full text-left text-xs text-[#C8FF45] font-heading font-bold uppercase tracking-wider flex items-center justify-between py-1 transition-colors hover:underline"
                    >
                      <span>View My Squad ({mySquad.length})</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSquadList ? 'rotate-180' : ''}`} />
                    </button>

                    {showSquadList && (
                      <div className="space-y-1.5 mt-2 max-h-36 overflow-y-auto pr-1 animate-fadeIn">
                        {mySquad.map(sq => (
                          <div key={sq.id} className="flex items-center justify-between text-[11px] py-1 px-2.5 rounded-lg bg-[#141F33] border border-[#26354D]">
                            <span className="text-[#F4F7FC] font-medium truncate max-w-[120px]">{sq.name}</span>
                            <span className="font-number text-[#C8FF45] text-[10px]">
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
              <div className="py-4 text-center text-xs text-[#9BAAC0]">
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
        <div className="fixed inset-0 z-50 bg-[#080D18]/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn font-body">
          <div className="bg-[#0E1626] border border-[#26354D] rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowOnboardingGuide(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-[#141F33] hover:bg-[#1B2942] text-[#9BAAC0] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-[#C8FF45]">
              <Sparkles className="w-5 h-5 text-[#C8FF45]" />
              <h3 className="font-heading font-black text-xl text-[#F4F7FC] uppercase tracking-wide">How Bidding Works in Bid Wars</h3>
            </div>

            <div className="space-y-3 text-xs text-[#9BAAC0]">
              <div className="p-3 bg-[#141F33] rounded-xl border border-[#26354D] flex gap-3">
                <span className="font-number text-[#C8FF45] text-sm shrink-0">01</span>
                <div>
                  <h4 className="font-heading font-bold uppercase tracking-wider text-[#F4F7FC] mb-0.5">Current Lot & Base Price</h4>
                  <p>Each player enters the arena with an official base price. The first valid bid opens at the base price.</p>
                </div>
              </div>

              <div className="p-3 bg-[#141F33] rounded-xl border border-[#26354D] flex gap-3">
                <span className="font-number text-[#FFC857] text-sm shrink-0">02</span>
                <div>
                  <h4 className="font-heading font-bold uppercase tracking-wider text-[#F4F7FC] mb-0.5">Hammer Clock & 3-Second Warning</h4>
                  <p>Each accepted bid resets the countdown clock. At 3 seconds, warning ticks alert players before final sale.</p>
                </div>
              </div>

              <div className="p-3 bg-[#141F33] rounded-xl border border-[#26354D] flex gap-3">
                <span className="font-number text-[#C8FF45] text-sm shrink-0">03</span>
                <div>
                  <h4 className="font-heading font-bold uppercase tracking-wider text-[#F4F7FC] mb-0.5">Placing Bids & Increments</h4>
                  <p>Click "Place Bid" to submit the minimum increment, or use quick buttons (+20L, +50L, +1Cr, +2Cr).</p>
                </div>
              </div>

              <div className="p-3 bg-[#141F33] rounded-xl border border-[#26354D] flex gap-3">
                <span className="font-number text-[#FFC857] text-sm shrink-0">04</span>
                <div>
                  <h4 className="font-heading font-bold uppercase tracking-wider text-[#F4F7FC] mb-0.5">Squad & Overseas Limits</h4>
                  <p>Min 18 to max 25 players per team. Maximum 8 overseas players. You must reserve enough purse to fill 18 slots.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowOnboardingGuide(false)}
              className="w-full py-3 bg-[#C8FF45] hover:bg-[#B0E635] text-black font-heading font-black uppercase text-sm rounded-xl transition-all shadow-glow-lime mt-2 tracking-wider"
            >
              Got It, Let's Bid!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
