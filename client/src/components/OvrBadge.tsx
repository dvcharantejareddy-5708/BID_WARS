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
      badgeStyle: 'bg-[#FFC93D]/20 border border-[#FFC93D] text-[#FFC93D]',
      textStyle: 'text-[#FFC93D] font-extrabold',
      glowStyle: 'shadow-sm'
    };
  }
  if (ovr >= 90) {
    return {
      tierName: 'SUPERSTAR',
      badgeStyle: 'bg-[#FFC93D]/15 border border-[#FFC93D]/60 text-[#FFC93D]',
      textStyle: 'text-[#FFC93D] font-extrabold',
      glowStyle: 'shadow-sm'
    };
  }
  if (ovr >= 85) {
    return {
      tierName: 'ELITE MATCH-WINNER',
      badgeStyle: 'bg-[#C8FF3D]/15 border border-[#C8FF3D]/60 text-[#C8FF3D]',
      textStyle: 'text-[#C8FF3D] font-extrabold',
      glowStyle: 'shadow-sm'
    };
  }
  if (ovr >= 80) {
    return {
      tierName: 'TOP REGULAR',
      badgeStyle: 'bg-white/10 border border-white/20 text-white',
      textStyle: 'text-white font-bold',
      glowStyle: 'shadow-sm'
    };
  }
  if (ovr >= 75) {
    return {
      tierName: 'STRONG STARTER',
      badgeStyle: 'bg-white/5 border border-white/15 text-gray-300',
      textStyle: 'text-gray-300 font-bold',
      glowStyle: 'shadow-sm'
    };
  }
  if (ovr >= 70) {
    return {
      tierName: 'SOLID SQUAD',
      badgeStyle: 'bg-white/5 border border-white/10 text-gray-400',
      textStyle: 'text-gray-400 font-semibold',
      glowStyle: ''
    };
  }
  return {
    tierName: 'RESERVE',
    badgeStyle: 'bg-white/5 border border-white/10 text-gray-500',
    textStyle: 'text-gray-500 font-medium',
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

