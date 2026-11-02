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
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#141F33] border border-[#26354D] select-none shadow-sm">
      <Clock className="w-3.5 h-3.5 text-[#C8FF45]" />
      <span className="text-[10px] font-heading font-extrabold uppercase tracking-wider text-[#9BAAC0] hidden xs:inline">
        Clock:
      </span>
      {roomStatus === 'PAUSED' ? (
        <span className="font-heading font-bold text-[#FFC857] text-xs uppercase">PAUSED</span>
      ) : lotStatus === 'IN_PROGRESS' ? (
        <div className="flex items-center gap-1 font-number">
          <span className={`text-xs ${
            remainingSec <= 3 
              ? 'text-[#FF647C] animate-pulse drop-shadow-[0_0_8px_rgba(255,100,124,0.8)]' 
              : remainingSec <= 5 
              ? 'text-[#FFC857]' 
              : 'text-[#C8FF45]'
          }`}>
            {remainingSec}s
          </span>
          {remainingSec <= 3 && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF647C] animate-ping" />
          )}
        </div>
      ) : (
        <span className="font-heading font-bold text-[11px] text-[#9BAAC0] uppercase tracking-wider">
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
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#080D18] overflow-hidden">
        <div
          className={`h-full transition-all duration-100 ${
            remainingSec <= 2
              ? 'bg-[#FF647C] shadow-[0_0_12px_#FF647C] animate-pulse'
              : remainingSec <= 3
              ? 'bg-[#FFC857] shadow-[0_0_12px_#FFC857]'
              : 'bg-gradient-to-r from-[#C8FF45] to-[#54C8FF] shadow-[0_0_12px_#C8FF45]'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Countdown Box & Indicator */}
      <div className="flex items-center gap-2.5">
        <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-number border transition-all ${
          remainingSec <= 1 && lotStatus === 'IN_PROGRESS'
            ? 'bg-[#FF647C]/30 text-[#FF647C] border-[#FF647C] shadow-[0_0_18px_rgba(255,100,124,0.6)] animate-pulse scale-105'
            : remainingSec <= 2 && lotStatus === 'IN_PROGRESS'
            ? 'bg-[#FF647C]/25 text-[#FF647C] border-[#FF647C] shadow-[0_0_14px_rgba(255,100,124,0.5)] animate-pulse'
            : remainingSec <= 3 && lotStatus === 'IN_PROGRESS'
            ? 'bg-[#FFC857]/25 text-[#FFC857] border-[#FFC857] shadow-[0_0_12px_rgba(255,200,87,0.4)] animate-pulse'
            : 'bg-[#141F33] text-[#C8FF45] border-[#26354D]'
        }`}>
          <span className="text-xl leading-none">{remainingSec}</span>
          <span className="text-[8px] font-heading font-extrabold uppercase text-[#9BAAC0]">SEC</span>
        </div>

        <div>
          <span className="text-[10px] text-[#9BAAC0] uppercase font-heading font-extrabold tracking-wider block">Hammer Clock</span>
          {lotStatus === 'IN_PROGRESS' && remainingSec <= 3 ? (
            <span className="text-xs font-heading font-extrabold text-[#FF647C] flex items-center gap-1.5 animate-pulse uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF647C] animate-ping" />
              FINAL 3 SECONDS!
            </span>
          ) : (
            <span className="text-xs text-[#F4F7FC] font-medium">
              {lotStatus === 'IN_PROGRESS' ? 'Resets on each bid' : lotStatus}
            </span>
          )}
        </div>
      </div>
    </>
  );
};
