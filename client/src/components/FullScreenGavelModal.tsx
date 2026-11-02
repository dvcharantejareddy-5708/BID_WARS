import React, { useEffect, useState, useRef } from 'react';
import { Sparkles, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { AuctionLot, IPL_FRANCHISES } from '../types.js';
import { TeamLogo } from './TeamLogo.js';
import { soundManager, formatPriceForSpeech } from '../services/audio.js';

interface FullScreenGavelModalProps {
  lot: AuctionLot;
  myTeamId?: string | null;
  onComplete: (resultId?: string) => void;
}

export const FullScreenGavelModal: React.FC<FullScreenGavelModalProps> = ({
  lot,
  myTeamId,
  onComplete
}) => {
  const [isMuted, setIsMuted] = useState(soundManager.isMuted);
  const [hasStruck, setHasStruck] = useState(false);
  const [visualDone, setVisualDone] = useState(false);
  const [voiceDone, setVoiceDone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const completedRef = useRef(false);
  const spokenLotKeyRef = useRef<string | null>(null);

  const isSold = lot.status === 'SOLD';
  const isUnsold = lot.status === 'UNSOLD';
  const player = lot.player;
  const winningTeamId = lot.winningTeam || null;
  const franchise = winningTeamId ? IPL_FRANCHISES[winningTeamId] : null;
  const fullTeamName = franchise?.name || lot.winningTeamName || winningTeamId || '';
  const shortTeamName = franchise?.shortName || winningTeamId || '';
  const finalPrice = lot.soldPrice || 0;
  const spokenPrice = formatPriceForSpeech(finalPrice);

  const handleToggleMute = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
    if (muted) {
      setVoiceDone(true);
    }
  };

  // 1. Coordinated Visual Strike and Animation Lifecycle
  useEffect(() => {
    // A. Strike sound & impact shake synchronized at hammer impact (~700ms)
    const strikeTimer = setTimeout(() => {
      setHasStruck(true);
      soundManager.playSoldGavel();

      if (isSold && winningTeamId && winningTeamId === myTeamId) {
        confetti({
          particleCount: 140,
          spread: 85,
          origin: { y: 0.55 }
        });
      } else if (isUnsold) {
        soundManager.playUnsoldSound();
      }
    }, 700);

    // B. Required visual animation completion: hammer settles cleanly at ~1350ms
    const visualTimer = setTimeout(() => {
      setVisualDone(true);
    }, 1350);

    return () => {
      clearTimeout(strikeTimer);
      clearTimeout(visualTimer);
    };
  }, [isSold, isUnsold, winningTeamId, myTeamId]);

  // 2. Authoritative Voice Announcement Lifecycle (Triggers ONCE upon hammer impact)
  useEffect(() => {
    if (!hasStruck) return;

    const resultId = lot.resultId || `${lot.lotNumber}_${player.id}_${lot.status}_${finalPrice}`;
    if (spokenLotKeyRef.current === resultId) {
      return; // Already triggered for this lot; avoid duplicate speech on rerenders
    }
    spokenLotKeyRef.current = resultId;

    if (isMuted) {
      setVoiceDone(true);
      return;
    }

    if (isSold) {
      // Call speech synthesis directly at the moment of hammer impact!
      soundManager.speakSoldAnnouncement(
        resultId,
        player.name,
        shortTeamName,
        spokenPrice,
        () => {
          // Detect actual speech completion via SpeechSynthesisUtterance.onend event
          setVoiceDone(true);
        }
      );
    } else if (isUnsold) {
      soundManager.speakUnsoldAnnouncement(
        resultId,
        player.name,
        () => {
          setVoiceDone(true);
        }
      );
    } else {
      setVoiceDone(true);
    }
  }, [hasStruck, isMuted, isSold, isUnsold, lot.resultId, lot.lotNumber, lot.status, player.id, player.name, shortTeamName, spokenPrice, finalPrice]);

  // 3. Strict Synchronization: Only when BOTH the voice announcement and visual animation finish:
  useEffect(() => {
    if (visualDone && voiceDone) {
      if (!completedRef.current) {
        completedRef.current = true;
        setIsDismissed(true);
        const resultId = lot.resultId || `${lot.lotNumber}_${player.id}_${lot.status}_${finalPrice}`;
        onComplete(resultId);
      }
    }
  }, [visualDone, voiceDone, onComplete, lot.resultId, lot.lotNumber, player.id, lot.status, finalPrice]);

  if (isDismissed) {
    return null;
  }

  return (
    <div className={`fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-8 animate-fadeIn select-none overflow-hidden ${
      hasStruck ? 'animate-impact-shake' : ''
    }`}>
      {/* Top Bar: Official Confirmation & Mute Toggle */}
      <div className="flex items-center justify-between w-full max-w-5xl mx-auto z-10">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141414] border border-[#2D2D2D]">
          {isSold ? (
            <>
              <Sparkles className="w-4 h-4 text-[#FFD700] animate-spin" />
              <span className="text-xs font-mono font-bold text-[#FFD700] tracking-wider uppercase">
                Official Sale Confirmation
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-[#FF5252]" />
              <span className="text-xs font-mono font-bold text-[#FF5252] tracking-wider uppercase">
                Lot Concluded — Unsold
              </span>
            </>
          )}
        </div>

        <button
          onClick={handleToggleMute}
          aria-label={isMuted ? 'Unmute voice' : 'Mute voice'}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#181818] hover:bg-[#252525] border border-[#333333] text-white transition-all text-xs font-semibold shadow-md active:scale-95"
        >
          {isMuted ? (
            <>
              <VolumeX className="w-4 h-4 text-[#FF5252]" />
              <span className="text-[#8E8E93]">Muted</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 text-[#00E676]" />
              <span className="text-[#00E676]">Voice Active</span>
            </>
          )}
        </button>
      </div>

      {/* Main Center Stage: User-Provided Auctioneer Hammer & Result Reveal */}
      <div className="my-auto flex flex-col items-center justify-center text-center max-w-4xl mx-auto w-full z-10">
        {/* Full-Screen User-Provided Hammer & Striking Animation */}
        <div className="relative w-full max-w-lg min-h-[200px] sm:min-h-[250px] md:min-h-[280px] flex items-center justify-center">
          {/* Impact Shockwave Ring & Flash behind the strike */}
          {hasStruck && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {isSold ? (
                <>
                  <div className="w-36 h-36 rounded-full border-4 border-[#FFD700] animate-cinematic-shockwave opacity-0" />
                  <div className="w-64 h-64 rounded-full bg-gradient-to-r from-[#FFD700]/50 via-[#FFA000]/25 to-transparent blur-xl animate-gold-impact-flash" />
                </>
              ) : (
                <>
                  <div className="w-36 h-36 rounded-full border-4 border-[#FF5252] animate-cinematic-shockwave opacity-0" />
                  <div className="w-64 h-64 rounded-full bg-gradient-to-r from-[#FF5252]/50 via-[#D32F2F]/25 to-transparent blur-xl animate-gold-impact-flash" />
                </>
              )}
            </div>
          )}

          {/* User's Exact Provided Hammer Image */}
          <div className="relative z-10 w-full flex items-center justify-center">
            <img
              src="/auction-hammer.png"
              alt="Auctioneer Hammer"
              className="w-full max-w-[340px] sm:max-w-[420px] md:max-w-[460px] h-auto object-contain animate-user-hammer-strike select-none pointer-events-none"
            />
          </div>
        </div>

        {/* SOLD / UNSOLD Callout with Radiance - Synchronized with Hammer Strike */}
        <div className={`mt-2 space-y-1 transition-all duration-500 transform ${
          hasStruck ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-3 pointer-events-none'
        }`}>
          {isSold ? (
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black font-display tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#FFF59D] via-[#FFD700] to-[#FF8F00] drop-shadow-[0_0_35px_rgba(255,215,0,0.7)] animate-pulse">
              SOLD!
            </h1>
          ) : (
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black font-display tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#FF8A80] via-[#FF5252] to-[#D32F2F] drop-shadow-[0_0_35px_rgba(255,82,82,0.6)] animate-pulse">
              UNSOLD
            </h1>
          )}

          {/* Player Name and Classification */}
          <div className="text-2xl sm:text-3xl font-black text-white leading-tight">
            {player.name}
          </div>
          <div className="text-xs sm:text-sm text-[#8E8E93] font-medium">
            {player.category} • {player.is_overseas ? `✈️ Overseas (${player.nationality})` : '🇮🇳 Indian Player'}
          </div>
        </div>

        {/* Detail Card - Synchronized with Strike */}
        {isSold && winningTeamId && (
          <div className={`mt-5 w-full max-w-xl bg-gradient-to-r from-[#141414] via-[#1A1A1A] to-[#141414] border-2 border-[#FFC857]/60 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-[0_0_40px_rgba(255,200,87,0.25)] animate-sold-glow transition-all duration-500 transform ${
            hasStruck ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
          }`}>
            {/* Winning Team with Official Logo & Full Name */}
            <div className="flex items-center gap-3.5 text-left">
              <TeamLogo teamId={winningTeamId} className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0 drop-shadow-lg" />
              <div>
                <span className="text-[11px] text-[#8E8E93] uppercase font-semibold tracking-wider block">
                  Acquired By
                </span>
                <span className="text-base sm:text-lg font-black text-white block leading-tight">
                  {fullTeamName}
                </span>
                <span className="text-xs font-mono font-bold text-[#FFD700]">
                  ({shortTeamName})
                </span>
              </div>
            </div>

            {/* Final Sold Price */}
            <div className="text-right shrink-0">
              <span className="text-[11px] text-[#FFC857] uppercase font-bold tracking-wider block">
                Final Bid
              </span>
              <span className="text-2xl sm:text-3xl font-mono font-black text-[#00E676] block leading-none">
                ₹{(finalPrice / 10000000).toFixed(2)} Cr
              </span>
            </div>
          </div>
        )}

        {isUnsold && (
          <div className={`mt-5 w-full max-w-xl bg-gradient-to-r from-[#141414] via-[#1C1616] to-[#141414] border border-[#FF5252]/40 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-[0_0_30px_rgba(255,82,82,0.15)] transition-all duration-500 transform ${
            hasStruck ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
          }`}>
            <div className="text-left">
              <span className="text-[11px] text-[#8E8E93] uppercase font-semibold tracking-wider block">
                Auction Outcome
              </span>
              <span className="text-base sm:text-lg font-bold text-white block">
                No Bids Placed
              </span>
              <span className="text-xs text-[#8E8E93]">
                Player moved to unsold pool for later accelerated round
              </span>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[11px] text-[#8E8E93] uppercase font-bold tracking-wider block">
                Base Price
              </span>
              <span className="text-xl sm:text-2xl font-mono font-bold text-[#CCCCCC] block leading-none">
                ₹{(player.base_price_inr / 10000000).toFixed(2)} Cr
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status & Voice Pacing Indicator */}
      <div className="w-full max-w-md mx-auto text-center z-10 pt-2">
        <p className="text-xs font-mono text-[#8E8E93] mb-2 flex items-center justify-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${isSold ? 'bg-[#00E676]' : 'bg-[#FF5252]'} animate-ping`} />
          <span>
            {isSold 
              ? `“${player.name} sold to ${shortTeamName} for ${spokenPrice}!”` 
              : `“${player.name} goes unsold!”`}
          </span>
        </p>
      </div>
    </div>
  );
};
