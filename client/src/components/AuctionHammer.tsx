import React from 'react';

interface AuctionHammerProps {
  className?: string;
  strikeImpact?: boolean;
}

export const AuctionHammer: React.FC<AuctionHammerProps> = ({
  className = 'w-28 h-24',
  strikeImpact = true
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <img
        src="/auction-hammer.png"
        alt="Auction Hammer"
        className={`w-full h-full object-contain filter drop-shadow-lg ${
          strikeImpact ? 'animate-user-hammer-strike' : ''
        }`}
      />
    </div>
  );
};
