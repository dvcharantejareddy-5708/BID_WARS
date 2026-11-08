import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { soundManager } from '../services/audio.js';

interface HammerClockBadgeProps {
  deadlineTimestamp?: number | null;
  roomStatus: string;
  lotStatus: string;
}

export const HammerClockBadge = React.memo<HammerClockBadgeProps>(({
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
    const interval = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(interval);
  }, [roomStatus, lotStatus, effectiveDeadline]);

  const remainingMs = Math.max(0, effectiveDeadline - now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const formattedTime = `00:${remainingSec.toString().padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#12142A] border border-[#23274D] select-none shadow-sm">
      <Clock className="w-3.5 h-3.5 text-[#FFC93D]" />
      <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-[#8A92B2] hidden xs:inline">
        Clock:
      </span>
      {roomStatus === 'PAUSED' ? (
        <span className="font-display font-bold text-[#FFC93D] text-xs uppercase">PAUSED</span>
      ) : lotStatus === 'IN_PROGRESS' ? (
        <div className="flex items-center gap-1.5 font-mono">
          <span className={`text-sm font-bold tracking-wider ${
            remainingSec <= 3 
              ? 'text-[#FF3B5C] animate-pulse' 
              : 'text-[#C8FF3D]'
          }`}>
            {formattedTime}
          </span>
          {remainingSec <= 3 && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B5C] animate-ping" />
          )}
        </div>
      ) : (
        <span className="font-display font-bold text-xs text-[#8A92B2] uppercase tracking-wider">
          {lotStatus}
        </span>
      )}
    </div>
  );
});

HammerClockBadge.displayName = 'HammerClockBadge';

interface HammerClockPanelProps {
  deadlineTimestamp?: number | null;
  totalDurationSec?: number;
  roomStatus: string;
  lotStatus: string;
}

export const HammerClockPanel = React.memo<HammerClockPanelProps>(({
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
    const interval = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(interval);
  }, [roomStatus, lotStatus, effectiveDeadline]);

  const remainingMs = Math.max(0, effectiveDeadline - now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const totalDurationMs = Math.max(1000, totalDurationSec * 1000);
  const progressPercent = Math.min(100, Math.max(0, (remainingMs / totalDurationMs) * 100));
  const formattedTime = `00:${remainingSec.toString().padStart(2, '0')}`;

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
      {/* Top Hammer Timer Progress Bar matching signature gradient */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#181A36] overflow-hidden">
        <div
          className={`h-full transition-all duration-100 ${
            remainingSec <= 3
              ? 'bg-[#FF3B5C]'
              : 'bg-signature-gradient-h'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Countdown Box & Indicator matching 00:12 in PDF */}
      <div className="flex items-center gap-3">
        <div className={`px-3 py-1.5 rounded-xl flex items-center justify-center font-mono border transition-all ${
          remainingSec <= 2 && lotStatus === 'IN_PROGRESS'
            ? 'bg-[#FF3B5C]/20 text-[#FF3B5C] border-[#FF3B5C] shadow-crimson-glow animate-pulse'
            : remainingSec <= 3 && lotStatus === 'IN_PROGRESS'
            ? 'bg-[#FF3B5C]/15 text-[#FF3B5C] border-[#FF3B5C]/60 shadow-sm'
            : 'bg-[#181A36] text-[#C8FF3D] border-[#23274D]'
        }`}>
          <span className="text-xl font-bold tracking-widest">{formattedTime}</span>
        </div>

        <div>
          <span className="text-[10px] text-[#8A92B2] uppercase font-sans font-bold tracking-wider block">
            AUCTION CLOCK
          </span>
          {lotStatus === 'IN_PROGRESS' && remainingSec <= 3 ? (
            <span className="text-xs font-display font-bold text-[#FF3B5C] flex items-center gap-1.5 animate-pulse uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B5C] animate-ping" />
              GOING THREE TIMES!
            </span>
          ) : (
            <span className="text-xs text-[#F4F6FA] font-sans font-medium">
              {lotStatus === 'IN_PROGRESS' ? 'Resets on every raise' : lotStatus}
            </span>
          )}
        </div>
      </div>
    </>
  );
});

HammerClockPanel.displayName = 'HammerClockPanel';
