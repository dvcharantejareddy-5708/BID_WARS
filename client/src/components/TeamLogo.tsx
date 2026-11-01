import React, { useState, useEffect } from 'react';
import { IPLTeamId, resolveTeamFranchise } from '../types.js';

interface TeamLogoProps {
  teamId?: IPLTeamId | string | null;
  className?: string;
  imgClassName?: string;
  alt?: string;
}

export const TeamLogo: React.FC<TeamLogoProps> = ({
  teamId,
  className = 'w-9 h-9',
  imgClassName = '',
  alt
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [teamId]);

  const franchise = resolveTeamFranchise(teamId);

  const isSmall = className.includes('w-4') || className.includes('w-5') || className.includes('w-6');
  const paddingClass = isSmall ? 'p-0.5' : 'p-1';
  const roundedClass = isSmall ? 'rounded-md' : 'rounded-xl';

  if (!franchise) {
    return (
      <div
        className={`${roundedClass} bg-[#1A1A1A] border border-[#2E2E2E] flex items-center justify-center text-[10px] font-black font-display text-[#8E8E93] shrink-0 select-none ${className}`}
      >
        IPL
      </div>
    );
  }

  if (hasError || !franchise.logoUrl) {
    return (
      <div
        className={`${roundedClass} flex items-center justify-center font-black font-display text-xs shadow-md shrink-0 border border-white/10 select-none ${className}`}
        style={{
          backgroundColor: franchise.primaryColor,
          color: franchise.textColor
        }}
        title={franchise.name}
      >
        {franchise.shortName}
      </div>
    );
  }

  return (
    <div
      className={`relative ${roundedClass} flex items-center justify-center ${paddingClass} shrink-0 overflow-hidden bg-black/50 border border-[#262626]/70 backdrop-blur-xs shadow-sm transition-all duration-200 group-hover:border-[#00E676]/40 ${className}`}
      title={franchise.name}
    >
      <img
        src={franchise.logoUrl}
        alt={alt || `${franchise.name} Logo`}
        onError={() => setHasError(true)}
        className={`w-full h-full object-contain filter drop-shadow transition-transform duration-200 ${imgClassName}`}
        loading="lazy"
      />
    </div>
  );
};

