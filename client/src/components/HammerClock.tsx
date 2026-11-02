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
    <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#203650] border border-[#344B65] select-none shadow-sm">
      <Clock className="w-3.5 h-3.5 text-[#F3C969]" />
      <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-[#B0BED0] hidden xs:inline">
        Clock:
      </span>
      {roomStatus === 'PAUSED' ? (
        <span className="font-heading font-bold text-[#F3C969] text-xs uppercase">PAUSED</span>
      ) : lotStatus === 'IN_PROGRESS' ? (
        <div className="flex items-center gap-1 font-number">
          <span className={`text-sm font-bold ${
            remainingSec <= 2 
              ? 'text-[#E85D5D]' 
              : remainingSec <= 3 
              ? 'text-[#F3C969]' 
              : 'text-[#3DBB83]'
          }`}>
            {remainingSec}s
          </span>
          {remainingSec <= 2 && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#E85D5D] animate-ping" />
          )}
        </div>
      ) : (
        <span className="font-heading font-bold text-xs text-[#B0BED0] uppercase tracking-wider">
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
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#172840] overflow-hidden">
        <div
          className={`h-full transition-all duration-100 ${
            remainingSec <= 2
              ? 'bg-[#E85D5D]'
              : remainingSec <= 3
              ? 'bg-[#F3C969]'
              : 'bg-[#3DBB83]'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Countdown Box & Indicator */}
      <div className="flex items-center gap-2.5">
        <div className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center font-number border transition-all ${
          remainingSec <= 1 && lotStatus === 'IN_PROGRESS'
            ? 'bg-[#E85D5D]/20 text-[#E85D5D] border-[#E85D5D] shadow-sm animate-pulse scale-105'
            : remainingSec <= 2 && lotStatus === 'IN_PROGRESS'
            ? 'bg-[#E85D5D]/15 text-[#E85D5D] border-[#E85D5D] shadow-sm animate-pulse'
            : remainingSec <= 3 && lotStatus === 'IN_PROGRESS'
            ? 'bg-[#F3C969]/20 text-[#F3C969] border-[#F3C969] shadow-sm animate-pulse'
            : 'bg-[#172840] text-[#F4F6FA] border-[#344B65]'
        }`}>
          <span className="text-xl font-bold leading-none">{remainingSec}</span>
          <span className="text-[9px] font-heading font-bold uppercase text-[#B0BED0]">SEC</span>
        </div>

        <div>
          <span className="text-[10px] text-[#B0BED0] uppercase font-heading font-bold tracking-wider block">Hammer Clock</span>
          {lotStatus === 'IN_PROGRESS' && remainingSec <= 3 ? (
            <span className="text-xs font-heading font-bold text-[#E85D5D] flex items-center gap-1.5 animate-pulse uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E85D5D] animate-ping" />
              FINAL 3 SECONDS!
            </span>
          ) : (
            <span className="text-xs text-[#F4F6FA] font-semibold">
              {lotStatus === 'IN_PROGRESS' ? 'Resets on each bid' : lotStatus}
            </span>
          )}
        </div>
      </div>
    </>
  );
};
