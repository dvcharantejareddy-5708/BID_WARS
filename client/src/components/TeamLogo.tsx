import React, { useState } from 'react';
import { IPLTeamId, IPL_FRANCHISES } from '../types.js';

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

  const teamKey = teamId ? (teamId.toUpperCase() as IPLTeamId) : null;
  const franchise = teamKey ? IPL_FRANCHISES[teamKey] : null;

  if (!franchise) {
    return (
      <div
        className={`rounded-xl bg-[#1A1A1A] border border-[#2E2E2E] flex items-center justify-center text-[10px] font-black font-display text-[#8E8E93] shrink-0 select-none ${className}`}
      >
        IPL
      </div>
    );
  }

  if (hasError || !franchise.logoUrl) {
    return (
      <div
        className={`rounded-xl flex items-center justify-center font-black font-display text-xs shadow-md shrink-0 border border-white/10 select-none ${className}`}
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
      className={`relative rounded-xl flex items-center justify-center p-1 shrink-0 overflow-hidden bg-black/40 border border-[#262626]/60 backdrop-blur-xs shadow-sm transition-all duration-200 group-hover:border-[#00E676]/40 ${className}`}
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

