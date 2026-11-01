import React from 'react';

interface AuctionHammerProps {
  className?: string;
  strikeImpact?: boolean;
}

export const AuctionHammer: React.FC<AuctionHammerProps> = ({
  className = 'w-24 h-20',
  strikeImpact = true
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 140 110"
        className="w-full h-full overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Wood grain gradient for hammer head & anvil */}
          <linearGradient id="hammerWood" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5D4037" />
            <stop offset="50%" stopColor="#3E2723" />
            <stop offset="100%" stopColor="#271510" />
          </linearGradient>

          {/* Gold metallic trim gradient */}
          <linearGradient id="hammerGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE082" />
            <stop offset="40%" stopColor="#FFD700" />
            <stop offset="70%" stopColor="#FFA000" />
            <stop offset="100%" stopColor="#FF8F00" />
          </linearGradient>

          {/* Handle wood gradient */}
          <linearGradient id="handleWood" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8D6E63" />
            <stop offset="45%" stopColor="#5D4037" />
            <stop offset="100%" stopColor="#3E2723" />
          </linearGradient>

          {/* Gold glow filter */}
          <filter id="goldGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. SOUND BLOCK (ANVIL BASE) - Fixed at the bottom */}
        <g id="sound-block">
          {/* Outer shadow base */}
          <ellipse cx="60" cy="94" rx="42" ry="10" fill="#000000" opacity="0.75" />
          
          {/* Pedestal Bottom Rim */}
          <path
            d="M 24 88 C 24 94, 96 94, 96 88 L 94 92 C 94 98, 26 98, 26 92 Z"
            fill="url(#hammerGold)"
            stroke="#B28900"
            strokeWidth="0.8"
          />

          {/* Sound Block Main Body */}
          <path
            d="M 28 85 L 34 76 C 34 72, 86 72, 86 76 L 92 85 C 92 90, 28 90, 28 85 Z"
            fill="url(#hammerWood)"
            stroke="#271510"
            strokeWidth="1"
          />

          {/* Sound Block Top Striking Surface (Round plate with gold trim) */}
          <ellipse cx="60" cy="75" rx="26" ry="6" fill="#4E342E" stroke="url(#hammerGold)" strokeWidth="1.5" />
          <ellipse cx="60" cy="75" rx="20" ry="4" fill="#2E1B15" />
        </g>

        {/* 2. GOLD IMPACT SHOCKWAVE (Radiates at impact point x=46, y=74) */}
        {strikeImpact && (
          <g id="impact-effects" className="pointer-events-none">
            {/* Shockwave Rings */}
            <circle
              cx="46"
              cy="74"
              r="14"
              stroke="url(#hammerGold)"
              strokeWidth="2.5"
              fill="none"
              className="animate-gold-shockwave origin-[46px_74px]"
            />
            {/* Impact Spark Particles */}
            <circle cx="36" cy="66" r="2" fill="#FFD700" className="animate-spark-1 origin-[46px_74px]" />
            <circle cx="56" cy="66" r="2.2" fill="#FFE082" className="animate-spark-2 origin-[46px_74px]" />
            <circle cx="32" cy="76" r="1.8" fill="#FFA000" className="animate-spark-3 origin-[46px_74px]" />
            <circle cx="60" cy="76" r="2" fill="#FFD700" className="animate-spark-4 origin-[46px_74px]" />
          </g>
        )}

        {/* 3. SWINGING AUCTION HAMMER */}
        <g id="hammer-assembly" className="animate-hammer-strike origin-[88px_74px]">
          {/* Turned Wooden Handle with Brass Inlays */}
          <rect
            x="48"
            y="69"
            width="52"
            height="5.5"
            rx="2.5"
            fill="url(#handleWood)"
            stroke="#1E110D"
            strokeWidth="0.8"
          />
          {/* Gold Grip Rings */}
          <rect x="74" y="68" width="2.5" height="7.5" rx="0.8" fill="url(#hammerGold)" />
          <rect x="80" y="68" width="2.5" height="7.5" rx="0.8" fill="url(#hammerGold)" />
          <rect x="94" y="68" width="3" height="7.5" rx="1" fill="url(#hammerGold)" />
          {/* Handle End Knob */}
          <ellipse cx="98" cy="71.7" rx="3.5" ry="4.5" fill="url(#hammerGold)" />

          {/* Hammer Head Assembly (Strikes down onto the block) */}
          <g id="hammer-head">
            {/* Center Wooden Barrel */}
            <rect
              x="36"
              y="58"
              width="18"
              height="27"
              rx="3"
              fill="url(#hammerWood)"
              stroke="#1C0F0B"
              strokeWidth="1"
            />
            {/* Center Gold Band */}
            <rect x="42.5" y="58" width="5" height="27" fill="url(#hammerGold)" />

            {/* Left Striking Face (Bevelled Cylinder & Gold Cap) */}
            <rect x="33" y="60.5" width="4" height="22" rx="1" fill="url(#hammerGold)" />
            <rect x="29" y="62" width="4.5" height="19" rx="1.5" fill="#3E2723" stroke="#1C0F0B" strokeWidth="0.8" />
            <rect x="26.5" y="63.5" width="3" height="16" rx="1" fill="url(#hammerGold)" />

            {/* Right Striking Face */}
            <rect x="53" y="60.5" width="4" height="22" rx="1" fill="url(#hammerGold)" />
            <rect x="56.5" y="62" width="4.5" height="19" rx="1.5" fill="#3E2723" stroke="#1C0F0B" strokeWidth="0.8" />
            <rect x="60.5" y="63.5" width="3" height="16" rx="1" fill="url(#hammerGold)" />
          </g>
        </g>
      </svg>
    </div>
  );
};
