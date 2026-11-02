import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { soundManager } from '../services/audio.js';

interface HammerClockBadgeProps {
  deadlineTimestamp?: number | null;
  roomStatus: string;
  lotStatus: string;
}

export const HammerClockBadge: React.FC<HammerClockBadgeProps> = ({
  deadlineTimestamp = 0,
  roomStatus,
  lotStatus
}) => {
  const [now, setNow] = useState(Date.now());
  const effectiveDeadline = deadlineTimestamp || 0;

  useEffect(() => {
    if (roomStatus !== 'AUCTION' || lotStatus !== 'IN_PROGRESS') {
      return;
    }
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, [roomStatus, lotStatus, effectiveDeadline]);

  const remainingMs = Math.max(0, effectiveDeadline - now);
  const remainingSec = Math.ceil(remainingMs / 1000);

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#141414] border border-[#2D2D2D] select-none">
      <Clock className="w-3.5 h-3.5 text-[#FFD700]" />
      <span className="text-[10px] uppercase font-bold text-[#8E8E93] hidden xs:inline">
        Clock:
      </span>
      {roomStatus === 'PAUSED' ? (
        <span className="font-mono font-bold text-[#FFC857] text-[11px]">PAUSED</span>
      ) : lotStatus === 'IN_PROGRESS' ? (
        <div className="flex items-center gap-1 font-mono font-black">
          <span className={`text-[11px] sm:text-xs ${
            remainingSec <= 3 
              ? 'text-[#FF1744] animate-pulse drop-shadow-[0_0_8px_rgba(255,23,68,0.8)]' 
              : remainingSec <= 5 
              ? 'text-[#FFC857]' 
              : 'text-[#00E676]'
          }`}>
            {remainingSec}s
          </span>
          {remainingSec <= 3 && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF1744] animate-ping" />
          )}
        </div>
      ) : (
        <span className="font-mono font-bold text-[10px] text-[#8E8E93] uppercase">
          {lotStatus}
        </span>
      )}
    </div>
  );
};

interface HammerClockPanelProps {
  deadlineTimestamp?: number | null;
  totalDurationSec?: number;
  roomStatus: string;
  lotStatus: string;
}

export const HammerClockPanel: React.FC<HammerClockPanelProps> = ({
  deadlineTimestamp = 0,
  totalDurationSec = 10,
  roomStatus,
  lotStatus
}) => {
  const [now, setNow] = useState(Date.now());
  const lastTickedSecondRef = useRef<number | null>(null);
  const effectiveDeadline = deadlineTimestamp || 0;

  useEffect(() => {
    if (roomStatus !== 'AUCTION' || lotStatus !== 'IN_PROGRESS') {
      return;
    }
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, [roomStatus, lotStatus, effectiveDeadline]);

  const remainingMs = Math.max(0, effectiveDeadline - now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const totalDurationMs = Math.max(1000, totalDurationSec * 1000);
  const progressPercent = Math.min(100, Math.max(0, (remainingMs / totalDurationMs) * 100));

  // Audio countdown alert on final 3 seconds
  useEffect(() => {
    if (roomStatus !== 'AUCTION' || lotStatus !== 'IN_PROGRESS') {
      lastTickedSecondRef.current = null;
      return;
    }

    if (remainingSec >= 1 && remainingSec <= 3) {
      if (lastTickedSecondRef.current !== remainingSec) {
        lastTickedSecondRef.current = remainingSec;
        soundManager.playCountdownTick(remainingSec);
      }
    } else if (remainingSec > 3) {
      lastTickedSecondRef.current = null;
    }
  }, [remainingSec, roomStatus, lotStatus]);

  return (
    <>
      {/* Top Hammer Timer Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#151515] overflow-hidden">
        <div
          className={`h-full transition-all duration-100 ${
            remainingSec <= 2
              ? 'bg-[#FF5252] shadow-[0_0_12px_#FF5252] animate-pulse'
              : remainingSec <= 3
              ? 'bg-[#FFC857] shadow-[0_0_12px_#FFC857]'
              : 'bg-[#00E676] shadow-[0_0_12px_#00E676]'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Countdown Box & Indicator */}
      <div className="flex items-center gap-2.5">
        <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-mono font-black border transition-all ${
          remainingSec <= 1 && lotStatus === 'IN_PROGRESS'
            ? 'bg-[#FF1744]/30 text-[#FF1744] border-[#FF1744] shadow-[0_0_18px_rgba(255,23,68,0.6)] animate-pulse scale-105'
            : remainingSec <= 2 && lotStatus === 'IN_PROGRESS'
            ? 'bg-[#FF5252]/25 text-[#FF5252] border-[#FF5252] shadow-[0_0_14px_rgba(255,82,82,0.5)] animate-pulse'
            : remainingSec <= 3 && lotStatus === 'IN_PROGRESS'
            ? 'bg-[#FFD700]/25 text-[#FFD700] border-[#FFD700] shadow-[0_0_12px_rgba(255,215,0,0.4)] animate-pulse'
            : 'bg-[#151515] text-[#00E676] border-[#00E676]/40'
        }`}>
          <span className="text-xl leading-none">{remainingSec}</span>
          <span className="text-[8px] uppercase font-bold text-[#8E8E93]">SEC</span>
        </div>

        <div>
          <span className="text-[10px] text-[#8E8E93] uppercase font-semibold block">Hammer Clock</span>
          {lotStatus === 'IN_PROGRESS' && remainingSec <= 3 ? (
            <span className="text-xs font-bold text-[#FF5252] flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5252] animate-ping" />
              FINAL 3 SECONDS!
            </span>
          ) : (
            <span className="text-xs text-white font-medium">
              {lotStatus === 'IN_PROGRESS' ? 'Resets on each bid' : lotStatus}
            </span>
          )}
        </div>
      </div>
    </>
  );
};
