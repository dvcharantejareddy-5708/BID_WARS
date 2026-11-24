import React from 'react';

interface BidWarsLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  iconOnly?: boolean;
}

export const BidWarsLogo: React.FC<BidWarsLogoProps> = ({
  className = '',
  size = 'md',
  showTagline = false,
  iconOnly = false
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  };

  const badgeRadius = {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    xl: 'rounded-2xl'
  };

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Unified Metallic Gold Angled Bid-Paddle Gavel Badge */}
      <div
        className={`${iconSizes[size]} ${badgeRadius[size]} bg-gradient-to-br from-[#F0CE82] via-[#D6AD55] to-[#927545] border border-[#F0CE82]/40 flex items-center justify-center shrink-0 shadow-[0_2px_10px_rgba(214,173,85,0.3)] transform -rotate-6 hover:rotate-0 transition-transform duration-200`}
        title="BIDWARS"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#111111"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5/8 h-5/8 object-contain"
        >
          {/* Stylized Auction Hammer Head and Shaft angled 45deg */}
          <path d="M14 6l4 4" />
          <path d="M11 9l-7 7a2.12 2.12 0 003 3l7-7" />
          <path d="M13 3l6 6-2 2-6-6 2-2z" fill="#111111" />
        </svg>
      </div>

      {!iconOnly && (
        <div className="flex flex-col leading-none">
          <span className={`font-display font-black tracking-tight uppercase ${textSizes[size]}`}>
            <span className="text-[#F5F3ED]">BID</span>
            <span className="text-[#D6AD55] drop-shadow-[0_1px_4px_rgba(214,173,85,0.25)]">WARS</span>
          </span>
          {showTagline && (
            <span className="text-[10px] font-mono font-medium tracking-wide text-[#AAA9A2] mt-0.5">
              BUILD YOUR SQUAD. OWN THE GAME.
            </span>
          )}
        </div>
      )}
    </div>
  );
};
