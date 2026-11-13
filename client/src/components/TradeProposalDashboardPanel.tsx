import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Globe2,
  Crown,
  Eye,
  Loader2
} from 'lucide-react';
import { TradeRequest, IPLTeamId, IPL_FRANCHISES } from '../types.js';
import { TeamLogo } from './TeamLogo.js';

interface TradeProposalDashboardPanelProps {
  activeTrade: TradeRequest;
  myTeamId: IPLTeamId | null;
  isHost: boolean;
  onAccept: (tradeId: string) => void;
  onReject: (tradeId: string, reason?: string) => void;
  onCancel: (tradeId: string, reason?: string) => void;
  onOpenTradeModal: () => void;
}

export const TradeProposalDashboardPanel = React.memo<TradeProposalDashboardPanelProps>(({
  activeTrade,
  myTeamId,
  isHost,
  onAccept,
  onReject,
  onCancel,
  onOpenTradeModal
}) => {
  const [remainingSec, setRemainingSec] = useState<number>(() => {
    return Math.max(0, Math.ceil((activeTrade.expiresAt - Date.now()) / 1000));
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Authoritative server deadline countdown: updates local state without re-rendering parent components!
  useEffect(() => {
    const updateTime = () => {
      const sec = Math.max(0, Math.ceil((activeTrade.expiresAt - Date.now()) / 1000));
      setRemainingSec(sec);
    };

    updateTime();
    const interval = setInterval(updateTime, 250);
    return () => clearInterval(interval);
  }, [activeTrade.expiresAt, activeTrade.id]);

  // Reset submitting state if trade ID changes
  useEffect(() => {
    setIsSubmitting(false);
    setShowRejectInput(false);
    setRejectionReason('');
  }, [activeTrade.id]);

  const isSendingTeam = myTeamId === activeTrade.fromTeamId;
  const isReceivingTeam = myTeamId === activeTrade.toTeamId;
  const isSpectator = !isSendingTeam && !isReceivingTeam;

  const handleAcceptClick = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    onAccept(activeTrade.id);
  };

  const handleRejectClick = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    onReject(activeTrade.id, rejectionReason || undefined);
  };

  const handleCancelClick = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    onCancel(activeTrade.id, isHost && !isSendingTeam ? 'Cancelled by Top Host' : 'Cancelled by initiator');
  };

  // Format countdown as MM:SS (e.g. 00:45)
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Progress percentage (out of 45s)
  const progressPercent = Math.min(100, Math.max(0, (remainingSec / 45) * 100));

  return (
    <div className="bg-[#12142A] border-2 border-[#7C5CFF] rounded-3xl p-4 sm:p-5 shadow-[0_0_35px_rgba(124,92,255,0.3)] animate-fadeIn relative overflow-hidden font-body space-y-4">
      {/* Dynamic Timer Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#1E2246] overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            remainingSec <= 10 ? 'bg-[#FF3B5C]' : remainingSec <= 20 ? 'bg-[#FFC93D]' : 'bg-[#C8FF3D]'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* TOP BAR: BANNER STATUS + PROMINENT COUNTDOWN */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-b border-[#23274D]/80 pb-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="bg-[#FF3B5C]/20 border border-[#FF3B5C]/50 text-[#FF3B5C] text-xs font-heading font-black px-3 py-1 rounded-xl flex items-center gap-1.5 uppercase tracking-wider animate-pulse">
            <span className="w-2 h-2 rounded-full bg-[#FF3B5C]" />
            AUCTION PAUSED — TRADE PENDING
          </span>

          <span className="bg-[#FFC93D]/15 text-[#FFC93D] border border-[#FFC93D]/30 text-xs font-heading font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider">
            STATUS: PENDING
          </span>
        </div>

        {/* PROMINENT SYNCHRONIZED 45-SECOND COUNTDOWN */}
        <div className="flex items-center gap-2 bg-[#0A0B14] border border-[#7C5CFF]/60 px-4 py-2 rounded-2xl shadow-[0_0_15px_rgba(124,92,255,0.25)]">
          <Clock className="w-4 h-4 text-[#C8FF3D] animate-pulse" />
          <span className="font-heading font-black text-sm text-white tracking-wider uppercase">
            TRADE REQUEST · <span className={`font-number font-extrabold ${remainingSec <= 10 ? 'text-[#FF3B5C] animate-ping' : 'text-[#C8FF3D]'}`}>
              {formatTimer(remainingSec)}
            </span>
          </span>
        </div>
      </div>

      {/* MAIN TRADE VISUAL MATCHUP: BOTH TEAMS & PLAYERS / MONEY */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
        
        {/* SENDER TEAM CARD (5 cols) */}
        <div className="md:col-span-5 bg-[#0A0B14]/90 border border-[#1E2246] rounded-2xl p-4 flex flex-col justify-between space-y-3 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <TeamLogo teamId={activeTrade.fromTeamId} className="w-8 h-8" />
              <div>
                <p className="font-heading font-black text-sm text-white">{IPL_FRANCHISES[activeTrade.fromTeamId].name}</p>
                <p className="text-[10px] text-[#8F9CAE]">Manager: <strong className="text-white">{activeTrade.fromMemberName}</strong></p>
              </div>
            </div>
            <span className="text-[10px] font-heading font-extrabold px-2 py-0.5 rounded bg-[#C8FF3D]/15 text-[#C8FF3D] border border-[#C8FF3D]/30 uppercase">
              Offering
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#12142A] border border-[#23274D] flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-heading font-black text-sm text-white truncate">
                {activeTrade.offeredPlayer.name}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-[#8F9CAE] mt-0.5">
                <span>{activeTrade.offeredPlayer.category}</span>
                {activeTrade.offeredPlayer.is_overseas && (
                  <span className="text-[#FFC93D] flex items-center gap-0.5 font-bold">
                    <Globe2 className="w-3 h-3" /> Overseas
                  </span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="font-number font-bold text-xs text-[#C8FF3D]">
                {activeTrade.offeredPlayer.sold_price_inr
                  ? `₹${(activeTrade.offeredPlayer.sold_price_inr / 10000000).toFixed(2)} Cr`
                  : activeTrade.offeredPlayer.base_price_display}
              </span>
            </div>
          </div>
        </div>

        {/* CENTER SWAP DIRECTION INDICATOR (2 cols) */}
        <div className="md:col-span-2 flex flex-col items-center justify-center py-2 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#7C5CFF]/20 border border-[#7C5CFF]/50 flex items-center justify-center text-[#C8FF3D] shadow-[0_0_20px_rgba(124,92,255,0.3)] mb-1">
            <ArrowLeftRight className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[11px] font-heading font-black text-white uppercase tracking-wider">
            {activeTrade.type === 'PLAYER_FOR_PLAYER' ? 'Player Swap' : 'Cash Purchase'}
          </span>
          <span className="text-[10px] text-[#8F9CAE] mt-0.5">
            45s Window
          </span>
        </div>

        {/* RECEIVING TEAM CARD (5 cols) */}
        <div className="md:col-span-5 bg-[#0A0B14]/90 border border-[#1E2246] rounded-2xl p-4 flex flex-col justify-between space-y-3 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <TeamLogo teamId={activeTrade.toTeamId} className="w-8 h-8" />
              <div>
                <p className="font-heading font-black text-sm text-white">{IPL_FRANCHISES[activeTrade.toTeamId].name}</p>
                <p className="text-[10px] text-[#8F9CAE]">Manager: <strong className="text-white">{activeTrade.toMemberName}</strong></p>
              </div>
            </div>
            <span className="text-[10px] font-heading font-extrabold px-2 py-0.5 rounded bg-[#7C5CFF]/20 text-[#7C5CFF] border border-[#7C5CFF]/40 uppercase">
              Requested
            </span>
          </div>

          {activeTrade.type === 'PLAYER_FOR_PLAYER' && activeTrade.requestedPlayer ? (
            <div className="p-3 rounded-xl bg-[#12142A] border border-[#23274D] flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-heading font-black text-sm text-white truncate">
                  {activeTrade.requestedPlayer.name}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-[#8F9CAE] mt-0.5">
                  <span>{activeTrade.requestedPlayer.category}</span>
                  {activeTrade.requestedPlayer.is_overseas && (
                    <span className="text-[#FFC93D] flex items-center gap-0.5 font-bold">
                      <Globe2 className="w-3 h-3" /> Overseas
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="font-number font-bold text-xs text-[#7C5CFF]">
                  {activeTrade.requestedPlayer.sold_price_inr
                    ? `₹${(activeTrade.requestedPlayer.sold_price_inr / 10000000).toFixed(2)} Cr`
                    : activeTrade.requestedPlayer.base_price_display}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-[#12142A] border border-[#23274D] flex items-center justify-between gap-2">
              <div>
                <p className="font-heading font-black text-sm text-white">Purse Transfer</p>
                <p className="text-[11px] text-[#8F9CAE]">Cash payment to {activeTrade.fromTeamId}</p>
              </div>
              <span className="font-number font-black text-base text-[#FFC93D]">
                ₹{((activeTrade.moneyAmount || 0) / 10000000).toFixed(2)} Cr
              </span>
            </div>
          )}
        </div>

      </div>

      {/* REJECTION REASON INPUT (Expandable for Receiving Team) */}
      {showRejectInput && isReceivingTeam && (
        <div className="p-3 bg-[#0A0B14] rounded-2xl border border-[#FF3B5C]/40 space-y-2 animate-fadeIn">
          <label className="text-xs text-[#8F9CAE] font-medium">Rejection Reason (Optional):</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="e.g. Counteroffer needed, keeping player, purse too low..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="bg-[#12142A] border border-[#23274D] rounded-xl px-3 py-2 text-xs text-white flex-1 focus:outline-none focus:border-[#FF3B5C]"
            />
            <button
              onClick={handleRejectClick}
              disabled={isSubmitting}
              className="py-2 px-4 rounded-xl bg-[#FF3B5C] hover:bg-[#E02E4E] text-white font-heading font-black text-xs uppercase tracking-wider"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Reject'}
            </button>
            <button
              onClick={() => setShowRejectInput(false)}
              className="py-2 px-3 rounded-xl bg-[#12142A] text-[#8F9CAE] hover:text-white text-xs"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* ROLE-SPECIFIC INTERACTIVE CONTROLS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#23274D]/80">
        <div className="flex items-center gap-2">
          {isReceivingTeam ? (
            <span className="text-xs font-heading font-black text-[#C8FF3D] flex items-center gap-1.5 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#C8FF3D] animate-ping" />
              Action Required: Your franchise has received this trade offer
            </span>
          ) : isSendingTeam ? (
            <span className="text-xs text-[#8F9CAE] font-medium">
              You proposed this trade. Waiting for <strong className="text-white">{IPL_FRANCHISES[activeTrade.toTeamId].name}</strong> to accept or reject.
            </span>
          ) : (
            <span className="text-xs text-[#8F9CAE] flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#7C5CFF]" />
              <span>Spectating trade · Only <strong>{IPL_FRANCHISES[activeTrade.toTeamId].name}</strong> can respond · Live bidding resumes when resolved</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 ml-auto">
          {/* 1. RECEIVING TEAM CONTROLS (Accept & Reject) */}
          {isReceivingTeam && !showRejectInput && (
            <>
              <button
                onClick={() => setShowRejectInput(true)}
                disabled={isSubmitting}
                className="py-2.5 px-5 rounded-2xl bg-[#FF3B5C]/20 hover:bg-[#FF3B5C] border border-[#FF3B5C]/40 text-white font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Trade</span>
              </button>

              <button
                onClick={handleAcceptClick}
                disabled={isSubmitting}
                className="py-2.5 px-6 rounded-2xl bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] font-heading font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(200,255,61,0.3)] flex items-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Accept Trade</span>
              </button>
            </>
          )}

          {/* 2. SENDING TEAM CONTROLS (Cancel own request) */}
          {isSendingTeam && (
            <button
              onClick={handleCancelClick}
              disabled={isSubmitting}
              className="py-2 px-5 rounded-2xl bg-[#FF3B5C]/20 hover:bg-[#FF3B5C] border border-[#FF3B5C]/40 text-white font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              <span>Cancel Request</span>
            </button>
          )}

          {/* 3. TOP HOST OVERRIDE CONTROL (Cancel stuck request) */}
          {isHost && !isReceivingTeam && !isSendingTeam && (
            <button
              onClick={handleCancelClick}
              disabled={isSubmitting}
              className="py-2 px-4 rounded-2xl bg-[#FFC93D]/15 hover:bg-[#FFC93D] hover:text-[#0A0B14] border border-[#FFC93D]/40 text-[#FFC93D] font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Host Cancel Trade</span>
            </button>
          )}

          {/* OPEN FULL MODAL BUTTON */}
          <button
            onClick={onOpenTradeModal}
            className="py-2 px-3.5 rounded-2xl bg-[#1E2246] hover:bg-[#282E5C] border border-[#23274D] text-[#8F9CAE] hover:text-white text-xs font-heading font-bold uppercase tracking-wider transition-all"
          >
            Details
          </button>
        </div>
      </div>
    </div>
  );
});
