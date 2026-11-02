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
    <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-white border border-[#D8D8D1] select-none shadow-sm">
      <Clock className="w-3.5 h-3.5 text-[#173B78]" />
      <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-[#647084] hidden xs:inline">
        Clock:
      </span>
      {roomStatus === 'PAUSED' ? (
        <span className="font-heading font-bold text-[#F0C65B] text-xs uppercase">PAUSED</span>
      ) : lotStatus === 'IN_PROGRESS' ? (
        <div className="flex items-center gap-1 font-number">
          <span className={`text-sm font-bold ${
            remainingSec <= 2 
              ? 'text-[#C74444]' 
              : remainingSec <= 3 
              ? 'text-[#B8860B]' 
              : 'text-[#176B48]'
          }`}>
            {remainingSec}s
          </span>
          {remainingSec <= 2 && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#C74444] animate-ping" />
          )}
        </div>
      ) : (
        <span className="font-heading font-bold text-xs text-[#647084] uppercase tracking-wider">
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
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#E6EDF8] overflow-hidden">
        <div
          className={`h-full transition-all duration-100 ${
            remainingSec <= 2
              ? 'bg-[#C74444]'
              : remainingSec <= 3
              ? 'bg-[#F0C65B]'
              : 'bg-[#176B48]'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Countdown Box & Indicator */}
      <div className="flex items-center gap-2.5">
        <div className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center font-number border transition-all ${
          remainingSec <= 1 && lotStatus === 'IN_PROGRESS'
            ? 'bg-[#C74444]/15 text-[#C74444] border-[#C74444] shadow-sm animate-pulse scale-105'
            : remainingSec <= 2 && lotStatus === 'IN_PROGRESS'
            ? 'bg-[#C74444]/10 text-[#C74444] border-[#C74444] shadow-sm animate-pulse'
            : remainingSec <= 3 && lotStatus === 'IN_PROGRESS'
            ? 'bg-[#F0C65B]/20 text-[#B8860B] border-[#F0C65B] shadow-sm animate-pulse'
            : 'bg-[#E6EDF8] text-[#173B78] border-[#D8D8D1]'
        }`}>
          <span className="text-xl font-bold leading-none">{remainingSec}</span>
          <span className="text-[9px] font-heading font-bold uppercase text-[#647084]">SEC</span>
        </div>

        <div>
          <span className="text-[10px] text-[#647084] uppercase font-heading font-bold tracking-wider block">Hammer Clock</span>
          {lotStatus === 'IN_PROGRESS' && remainingSec <= 3 ? (
            <span className="text-xs font-heading font-bold text-[#C74444] flex items-center gap-1.5 animate-pulse uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C74444] animate-ping" />
              FINAL 3 SECONDS!
            </span>
          ) : (
            <span className="text-xs text-[#18243A] font-semibold">
              {lotStatus === 'IN_PROGRESS' ? 'Resets on each bid' : lotStatus}
            </span>
          )}
        </div>
      </div>
    </>
  );
};
