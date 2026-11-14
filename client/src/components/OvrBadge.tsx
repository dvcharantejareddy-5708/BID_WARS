import React from 'react';

export interface OvrBadgeProps {
  ovr: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'hero';
  showLabel?: boolean;
  className?: string;
}

export function getOvrTier(ovr: number): {
  tierName: string;
  badgeStyle: string;
  textStyle: string;
  glowStyle: string;
} {
  if (ovr >= 95) {
    return {
      tierName: 'ALL-TIME GREAT',
      badgeStyle: 'bg-gradient-to-br from-[#FFC93D] via-[#FFE082] to-[#C8FF3D] border-[#FFE082] text-[#0A0B14]',
      textStyle: 'text-[#0A0B14] font-black',
      glowStyle: 'shadow-[0_0_18px_rgba(255,201,61,0.55)] ring-1 ring-[#FFC93D]/50'
    };
  }
  if (ovr >= 90) {
    return {
      tierName: 'SUPERSTAR',
      badgeStyle: 'bg-[#FFC93D]/20 border-[#FFC93D]/70 text-[#FFC93D]',
      textStyle: 'text-[#FFC93D] font-extrabold',
      glowStyle: 'shadow-[0_0_14px_rgba(255,201,61,0.35)]'
    };
  }
  if (ovr >= 85) {
    return {
      tierName: 'ELITE MATCH-WINNER',
      badgeStyle: 'bg-[#7C5CFF]/20 border-[#7C5CFF]/70 text-[#C4B5FD]',
      textStyle: 'text-[#C4B5FD] font-extrabold',
      glowStyle: 'shadow-[0_0_14px_rgba(124,92,255,0.35)]'
    };
  }
  if (ovr >= 80) {
    return {
      tierName: 'TOP REGULAR',
      badgeStyle: 'bg-[#38BDF8]/20 border-[#38BDF8]/70 text-[#38BDF8]',
      textStyle: 'text-[#38BDF8] font-bold',
      glowStyle: 'shadow-[0_0_12px_rgba(56,189,248,0.3)]'
    };
  }
  if (ovr >= 75) {
    return {
      tierName: 'STRONG STARTER',
      badgeStyle: 'bg-[#3DBB83]/20 border-[#3DBB83]/70 text-[#3DBB83]',
      textStyle: 'text-[#3DBB83] font-bold',
      glowStyle: 'shadow-[0_0_10px_rgba(61,187,131,0.3)]'
    };
  }
  if (ovr >= 70) {
    return {
      tierName: 'SOLID SQUAD',
      badgeStyle: 'bg-[#6366F1]/20 border-[#6366F1]/50 text-[#A5B4FC]',
      textStyle: 'text-[#A5B4FC] font-semibold',
      glowStyle: ''
    };
  }
  return {
    tierName: 'RESERVE',
    badgeStyle: 'bg-[#1E2246]/60 border-[#344B65] text-[#9E9EB8]',
    textStyle: 'text-[#9E9EB8] font-medium',
    glowStyle: ''
  };
}

export const OvrBadge: React.FC<OvrBadgeProps> = ({
  ovr,
  size = 'md',
  showLabel = true,
  className = ''
}) => {
  const safeOvr = Math.round(ovr || 70);
  const { tierName, badgeStyle, textStyle, glowStyle } = getOvrTier(safeOvr);

  if (size === 'xs') {
    return (
      <span
        title={`OVR: ${safeOvr} (${tierName})`}
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded border text-[9px] font-heading uppercase tracking-wider ${badgeStyle} ${glowStyle} ${className}`}
      >
        {showLabel && <span className="opacity-75 text-[8px]">OVR</span>}
        <span className={textStyle}>{safeOvr}</span>
      </span>
    );
  }

  if (size === 'sm') {
    return (
      <span
        title={`OVR: ${safeOvr} (${tierName})`}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-heading uppercase tracking-wider ${badgeStyle} ${glowStyle} ${className}`}
      >
        {showLabel && <span className="opacity-80 text-[9px]">OVR</span>}
        <span className={textStyle}>{safeOvr}</span>
      </span>
    );
  }

  if (size === 'hero') {
    return (
      <div
        className={`relative inline-flex flex-col items-center justify-center px-4 py-2 rounded-2xl border-2 backdrop-blur-md ${badgeStyle} ${glowStyle} ${className}`}
      >
        <span className="text-[10px] font-heading font-black tracking-widest opacity-80 uppercase">
          OVERALL
        </span>
        <span className={`text-3xl sm:text-4xl font-heading font-black tracking-tight leading-none ${textStyle}`}>
          {safeOvr}
        </span>
        {showLabel && (
          <span className="text-[9px] font-heading font-extrabold uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded bg-black/30">
            {tierName}
          </span>
        )}
      </div>
    );
  }

  if (size === 'lg') {
    return (
      <span
        title={`OVR: ${safeOvr} (${tierName})`}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-heading uppercase tracking-wider ${badgeStyle} ${glowStyle} ${className}`}
      >
        {showLabel && <span className="opacity-80 font-bold">OVR</span>}
        <span className={`text-sm ${textStyle}`}>{safeOvr}</span>
      </span>
    );
  }

  // Default 'md'
  return (
    <span
      title={`OVR: ${safeOvr} (${tierName})`}
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-xs font-heading uppercase tracking-wider ${badgeStyle} ${glowStyle} ${className}`}
    >
      {showLabel && <span className="opacity-80 text-[10px] font-bold">OVR</span>}
      <span className={textStyle}>{safeOvr}</span>
    </span>
  );
};

