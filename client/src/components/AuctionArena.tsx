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
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  RoomState, 
  AuctionLot, 
  IPLTeamId, 
  IPL_FRANCHISES, 
  RoomMember, 
  Player 
} from '../types.js';
import { soundManager } from '../services/audio.js';
import { SkipPlayerModal } from './SkipPlayerModal.js';

interface AuctionArenaProps {
  roomState: RoomState;
  myMemberId: string;
  onPlaceBid: (amount?: number) => void;
  onSkipPlayer: () => void;
  onPauseAuction: () => void;
  onResumeAuction: () => void;
  onRestartAuction: () => void;
  onEndAuction: () => void;
}

export const AuctionArena: React.FC<AuctionArenaProps> = ({
  roomState,
  myMemberId,
  onPlaceBid,
  onSkipPlayer,
  onPauseAuction,
  onResumeAuction,
  onRestartAuction,
  onEndAuction
}) => {
  const [now, setNow] = useState(Date.now());
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [imageError, setImageError] = useState(false);

  const myMember = roomState.members[myMemberId];
  const myTeamId = myMember?.teamId;
  const isHost = myMember?.isHost;
  const lot = roomState.currentLot;

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

  // Reset image error on lot change
  useEffect(() => {
    setImageError(false);
  }, [lot?.player.id]);

  if (!lot) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="glass-panel p-8 rounded-2xl">
          <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold font-display text-white mb-2">Preparing Next Lot...</h2>
          <p className="text-xs text-slate-400">Loading verified player records.</p>
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
  const myOverseas = mySquad.filter(p => p.is_overseas).length;
  const isOverseasFull = player.is_overseas && myOverseas >= roomState.settings.maxOverseas;

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
  else if (isOverseasFull) bidDisabledReason = 'Maximum overseas limit (8) reached';
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 relative">
      {/* Set & Lot Progress Ribbon */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-navy-900/90 border border-navy-700/80 px-4 py-2.5 rounded-xl text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-cyan-300">
            Set {roomState.currentSetOrder} of {roomState.totalSets}
          </span>
          <span className="text-slate-500">·</span>
          <span className="font-semibold text-slate-200">
            {player.set_name}
          </span>
          {player.is_marquee && (
            <span className="bg-amber-400/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-400/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              MARQUEE
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-400 font-mono">
            Lot <strong className="text-white">#{lot.lotNumber}</strong> of {lot.totalLots}
          </span>

          {/* Auction Status Badge */}
          {roomState.status === 'PAUSED' ? (
            <span className="bg-amber-500/20 text-amber-300 font-bold px-2.5 py-0.5 rounded border border-amber-500/40 flex items-center gap-1">
              <Pause className="w-3 h-3" /> PAUSED
            </span>
          ) : (
            <span className="bg-cyan-500/20 text-cyan-300 font-bold px-2.5 py-0.5 rounded border border-cyan-500/40 flex items-center gap-1">
              <Flame className="w-3 h-3 text-cyan-400" /> LIVE
            </span>
          )}
        </div>
      </div>

      {/* Main Auction Arena Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Big Player Portrait & Official Metadata (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <div className={`glass-panel rounded-2xl p-6 border shadow-2xl relative overflow-hidden flex-1 flex flex-col justify-between ${
            player.is_marquee ? 'border-amber-400/40 shadow-glow-amber' : 'border-navy-600/70'
          }`}>
            {/* Top Badges */}
            <div className="flex items-start justify-between gap-2 z-10">
              <div className="flex flex-wrap gap-1.5">
                <span className="bg-navy-950/80 text-cyan-300 border border-cyan-400/30 text-xs font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider">
                  {player.category}
                </span>
                {player.is_wicketkeeper && (
                  <span className="bg-navy-950/80 text-amber-300 border border-amber-400/30 text-xs font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider">
                    🧤 WICKET-KEEPER
                  </span>
                )}
                {player.is_retained && (
                  <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold px-2 py-1 rounded-lg">
                    RETAINED (R)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 bg-navy-950/80 border border-navy-700 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-300">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>{player.nationality}</span>
              </div>
            </div>

            {/* Center Player Portrait */}
            <div className="relative my-6 flex items-center justify-center">
              <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl bg-gradient-to-b from-navy-800 to-navy-950 border border-navy-700/80 shadow-inner flex items-center justify-center overflow-hidden group">
                {!imageError ? (
                  <img
                    src={player.image_url}
                    alt={player.name}
                    onError={() => setImageError(true)}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-4">
                    <span className="text-4xl font-display font-extrabold text-cyan-400/80 mb-2">
                      {player.name.split(' ').map(n => n[0]).join('').slice(0, 3)}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {player.primary_role}
                    </span>
                  </div>
                )}

                {/* Status Overlay Banner */}
                {lot.status === 'SOLD' && (
                  <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-md flex flex-col items-center justify-center animate-fadeIn text-center p-4">
                    <Award className="w-12 h-12 text-emerald-400 mb-2 animate-bounce" />
                    <span className="text-3xl font-extrabold font-display text-emerald-300 tracking-wider">
                      SOLD!
                    </span>
                    <span className="text-sm font-bold text-white mt-1">
                      {lot.winningTeamName}
                    </span>
                    <span className="text-xs font-mono text-emerald-400 font-bold mt-0.5">
                      ₹{((lot.soldPrice || 0) / 10000000).toFixed(2)} Crore
                    </span>
                  </div>
                )}

                {lot.status === 'UNSOLD' && (
                  <div className="absolute inset-0 bg-navy-950/90 backdrop-blur-md flex flex-col items-center justify-center animate-fadeIn text-center p-4">
                    <span className="text-3xl font-extrabold font-display text-slate-400 tracking-wider">
                      UNSOLD
                    </span>
                    <span className="text-xs text-slate-500 mt-1">
                      Available in re-auction round
                    </span>
                  </div>
                )}

                {lot.status === 'SKIPPED' && (
                  <div className="absolute inset-0 bg-amber-950/90 backdrop-blur-md flex flex-col items-center justify-center animate-fadeIn text-center p-4">
                    <FastForward className="w-10 h-10 text-amber-400 mb-2" />
                    <span className="text-2xl font-extrabold font-display text-amber-300 tracking-wider">
                      SKIPPED
                    </span>
                    <span className="text-xs text-slate-400 mt-1">
                      Passed by host
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Player Information */}
            <div className="text-center z-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
                {player.name}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Official Base Price:{' '}
                <strong className="text-amber-300 font-mono text-sm">{player.base_price_display}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Timer, Live Bidding, Controls & History (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Synchronized Countdown Timer & Current Bid Banner */}
          <div className="glass-panel rounded-2xl p-6 border border-cyan-400/30 shadow-2xl relative overflow-hidden">
            {/* Timer Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-navy-900">
              <div
                className={`h-full transition-all duration-100 ${
                  remainingSec <= 2
                    ? 'bg-ruby-500 shadow-glow-ruby animate-pulse'
                    : remainingSec <= 5
                    ? 'bg-amber-400 shadow-glow-amber'
                    : 'bg-cyan-400 shadow-glow-cyan'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2 mb-6">
              {/* Countdown Clock Display */}
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-mono font-black border transition-all ${
                  remainingSec <= 2
                    ? 'bg-ruby-500/20 text-ruby-400 border-ruby-500 shadow-glow-ruby animate-bounce'
                    : remainingSec <= 5
                    ? 'bg-amber-400/20 text-amber-300 border-amber-400 shadow-glow-amber'
                    : 'bg-navy-900 text-cyan-300 border-cyan-400/40 shadow-glow-cyan'
                }`}>
                  <span className="text-2xl leading-none">{remainingSec}</span>
                  <span className="text-[9px] uppercase font-bold text-slate-400">SEC</span>
                </div>

                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
                    Countdown Status
                  </span>
                  <p className="text-xs text-slate-300 font-medium">
                    {lot.status === 'IN_PROGRESS' 
                      ? 'Timer resets on each valid bid'
                      : lot.status}
                  </p>
                </div>
              </div>

              {/* Current Highest Bid */}
              <div className="text-left sm:text-right">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
                  Current Highest Bid
                </span>
                <span className="text-3xl sm:text-4xl font-black font-mono text-cyan-300 drop-shadow">
                  {currentBid > 0 ? `₹${(currentBid / 10000000).toFixed(2)} Cr` : 'NO BIDS YET'}
                </span>
              </div>
            </div>

            {/* Leading Bidder Strip */}
            <div className="bg-navy-900/90 border border-navy-700/80 rounded-xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {lot.currentBidder ? (
                  <>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-black font-display text-xs shadow-md shrink-0"
                      style={{
                        backgroundColor: IPL_FRANCHISES[lot.currentBidder].primaryColor,
                        color: IPL_FRANCHISES[lot.currentBidder].textColor
                      }}
                    >
                      {lot.currentBidder}
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-medium">Holding Bid:</span>
                      <h4 className="font-display font-bold text-sm text-white">
                        {IPL_FRANCHISES[lot.currentBidder].name} ({lot.currentBidderName})
                      </h4>
                    </div>
                  </>
                ) : (
                  <div>
                    <span className="text-xs text-slate-400 font-medium">Opening Bid Required:</span>
                    <h4 className="font-display font-bold text-sm text-amber-300 font-mono">
                      ₹{(player.base_price_inr / 10000000).toFixed(2)} Crore
                    </h4>
                  </div>
                )}
              </div>

              {lot.currentBidder && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                  <Shield className="w-3.5 h-3.5" />
                  <span>LEADING</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Bidding Action Panel */}
          <div className="glass-panel rounded-2xl p-5 border border-navy-600/70 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-sm text-slate-200">
                Place Live Bid ·{' '}
                <span className="text-cyan-300">
                  {myTeamId ? `${IPL_FRANCHISES[myTeamId].name} (${myTeamId})` : 'Spectator'}
                </span>
              </h3>
              {myTeamId && (
                <span className="text-xs text-slate-400 font-mono">
                  Purse Available: <strong className="text-white">₹{(myPurse / 10000000).toFixed(2)} Cr</strong>
                </span>
              )}
            </div>

            {/* Error / Disabled Tooltip Notice */}
            {!canBid && bidDisabledReason && (
              <div className="bg-ruby-500/15 border border-ruby-500/30 text-ruby-200 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-ruby-400 shrink-0" />
                <span>{bidDisabledReason}</span>
              </div>
            )}

            {/* Big Primary Action: Next Legal Bid Button */}
            <button
              onClick={() => onPlaceBid(nextMinBid)}
              disabled={!canBid}
              className="w-full bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-300 hover:from-cyan-300 hover:to-sky-200 text-black font-display font-extrabold py-4 px-6 rounded-xl transition-all shadow-glow-cyan flex items-center justify-between disabled:opacity-35 disabled:cursor-not-allowed group text-base"
            >
              <div className="flex items-center gap-2">
                <ChevronUp className="w-6 h-6 stroke-[3] transition-transform group-hover:-translate-y-0.5" />
                <span>BID NEXT LEGAL AMOUNT</span>
              </div>
              <span className="font-mono text-xl font-black">
                ₹{(nextMinBid / 10000000).toFixed(2)} Cr
              </span>
            </button>

            {/* Quick Increment Buttons (+20L, +50L, +1Cr, +2Cr) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {quickIncrements.map((inc, i) => {
                const isIncLegal = inc.amount >= nextMinBid && inc.amount <= maxPossibleBid && canBid;
                return (
                  <button
                    key={i}
                    onClick={() => onPlaceBid(inc.amount)}
                    disabled={!isIncLegal}
                    className="py-2.5 px-3 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-200 hover:text-white font-mono text-xs font-bold transition-all border border-navy-700 hover:border-cyan-400/40 disabled:opacity-25 disabled:cursor-not-allowed flex flex-col items-center gap-0.5"
                  >
                    <span className="text-cyan-400">{inc.label}</span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      (₹{(inc.amount / 10000000).toFixed(2)} Cr)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Host Control Strip (if Host) */}
          {isHost && (
            <div className="bg-navy-950/80 border border-amber-500/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                HOST CONTROLS
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSkipModal(true)}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  <span>Skip Player</span>
                </button>

                {roomState.status === 'AUCTION' ? (
                  <button
                    onClick={onPauseAuction}
                    className="px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-slate-200 border border-navy-600 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </button>
                ) : (
                  <button
                    onClick={onResumeAuction}
                    className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Resume</span>
                  </button>
                )}

                <button
                  onClick={onRestartAuction}
                  className="px-3 py-1.5 bg-navy-800 hover:bg-ruby-500/20 text-slate-400 hover:text-ruby-300 border border-navy-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restart</span>
                </button>
              </div>
            </div>
          )}

          {/* Bid History Feed for Current Lot */}
          <div className="glass-panel rounded-2xl p-4 border border-navy-700/80">
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-cyan-400" />
              <span>Lot Bid Timeline ({lot.bids.length} bids)</span>
            </h4>

            {lot.bids.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                Awaiting opening bids...
              </p>
            ) : (
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {lot.bids.map((b) => {
                  const team = IPL_FRANCHISES[b.teamId];
                  return (
                    <div
                      key={b.bidId}
                      className="bg-navy-900/80 border border-navy-700/60 rounded-xl px-3 py-2 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center font-black text-[10px] shadow-sm shrink-0"
                          style={{ backgroundColor: team.primaryColor, color: team.textColor }}
                        >
                          {team.id}
                        </div>
                        <span className="font-semibold text-white">
                          {b.bidderName}
                        </span>
                        {b.isBot && (
                          <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1 rounded font-bold">
                            BOT
                          </span>
                        )}
                      </div>

                      <span className="font-mono font-bold text-cyan-300">
                        ₹{(b.amount / 10000000).toFixed(2)} Cr
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom 10 IPL Franchises Purse & Squad Tracker */}
      <div className="glass-panel rounded-2xl p-4 border border-navy-700/80">
        <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">
          10 Franchise Auction Standings
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2.5">
          {(['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'PBKS', 'DC', 'GT', 'LSG'] as IPLTeamId[]).map((tId) => {
            const team = IPL_FRANCHISES[tId];
            const purse = roomState.teamPurse[tId] || 0;
            const squad = roomState.teamSquads[tId] || [];
            const isLeading = lot.currentBidder === tId;
            const isMyTeam = myTeamId === tId;

            return (
              <div
                key={tId}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  isLeading
                    ? 'border-cyan-400 bg-cyan-950/30 shadow-glow-cyan'
                    : isMyTeam
                    ? 'border-slate-500 bg-navy-800'
                    : 'border-navy-700/60 bg-navy-900/60'
                }`}
              >
                <div
                  className="w-7 h-7 mx-auto rounded-lg flex items-center justify-center font-black text-[10px] mb-1.5 shadow-sm"
                  style={{ backgroundColor: team.primaryColor, color: team.textColor }}
                >
                  {team.id}
                </div>
                <div className="font-mono font-bold text-xs text-white">
                  ₹{(purse / 10000000).toFixed(1)} Cr
                </div>
                <div className="text-[10px] text-slate-400">
                  {squad.length}/18-25
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Skip Player Confirmation Modal */}
      <SkipPlayerModal
        player={player}
        lotNumber={lot.lotNumber}
        isOpen={showSkipModal}
        onClose={() => setShowSkipModal(false)}
        onConfirmSkip={onSkipPlayer}
      />
    </div>
  );
};
