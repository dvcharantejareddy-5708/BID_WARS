import React from 'react';

interface CricketPlayerSilhouetteProps {
  className?: string;
  category?: string;
}

export const CricketPlayerSilhouette: React.FC<CricketPlayerSilhouetteProps> = ({
  className = 'w-full h-full',
  category
}) => {
  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#141F33] via-[#0E1626] to-[#080D18] select-none ${className}`}>
      {/* Background Stadium Floodlight Rings / Ambient Aura */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
        <div className="w-48 h-48 rounded-full bg-[#54C8FF]/15 blur-2xl animate-pulse" />
        <div className="absolute w-36 h-36 rounded-full border border-[#26354D]" />
        <div className="absolute w-52 h-52 rounded-full border border-[#26354D]" />
      </div>

      {/* Sharp Vector Silhouette of an Athletic Cricket Player */}
      <svg
        viewBox="0 0 200 220"
        className="h-full w-auto max-h-[170px] max-w-[200px] object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)] transition-transform duration-300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="bodyGradient" x1="100" y1="20" x2="100" y2="210" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4A4A4A" />
            <stop offset="45%" stopColor="#2E2E2E" />
            <stop offset="100%" stopColor="#181818" />
          </linearGradient>
          <linearGradient id="batGradient" x1="140" y1="50" x2="185" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#C4A470" />
            <stop offset="100%" stopColor="#7E6038" />
          </linearGradient>
          <linearGradient id="accentGlow" x1="100" y1="0" x2="100" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00E676" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#00E676" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Outer subtle glow outline */}
        <ellipse cx="100" cy="208" rx="60" ry="8" fill="#000000" opacity="0.6" />

        {/* Cricket Bat (Poised at an angle) */}
        <g opacity="0.85">
          {/* Bat Handle */}
          <line x1="152" y1="58" x2="168" y2="35" stroke="#E0E0E0" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="152" y1="58" x2="168" y2="35" stroke="#333333" strokeWidth="2.5" strokeDasharray="2 2" strokeLinecap="round" />
          <circle cx="169" cy="34" r="3.5" fill="#C4A470" />

          {/* Bat Blade */}
          <path
            d="M 149 60 L 157 52 L 182 125 C 184 132 181 140 174 144 L 166 148 C 160 152 153 149 150 143 Z"
            fill="url(#batGradient)"
            stroke="#222222"
            strokeWidth="1.5"
          />
          {/* Bat colored grip/edges */}
          <path
            d="M 152 57 L 176 130"
            stroke="#FFFFFF"
            strokeWidth="1"
            opacity="0.3"
          />
        </g>

        {/* Cricket Player Head / Helmet */}
        <g>
          {/* Neck */}
          <path d="M 94 65 L 106 65 L 108 78 L 92 78 Z" fill="url(#bodyGradient)" />

          {/* Helmet/Head */}
          <circle cx="100" cy="46" r="19" fill="url(#bodyGradient)" stroke="#555555" strokeWidth="1" />
          
          {/* Helmet Visor / Grille */}
          <path
            d="M 104 42 L 120 46 C 122 47 122 50 120 52 L 106 58 Z"
            fill="#222222"
            stroke="#777777"
            strokeWidth="1.2"
          />
          <path d="M 107 48 L 118 50" stroke="#00E676" strokeWidth="1" opacity="0.8" />
          <path d="M 107 53 L 117 52" stroke="#888888" strokeWidth="0.8" opacity="0.6" />

          {/* Helmet peak shadow */}
          <path d="M 96 34 C 104 31 114 34 119 39" stroke="#666666" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Player Torso & Athletic Shoulders */}
        <path
          d="M 72 82 C 78 74 88 72 100 72 C 112 72 122 74 128 82 L 140 102 C 143 108 141 116 135 120 L 128 124 L 124 165 C 124 170 120 174 115 174 L 85 174 C 80 174 76 170 76 165 L 72 124 L 65 120 C 59 116 57 108 60 102 Z"
          fill="url(#bodyGradient)"
          stroke="#444444"
          strokeWidth="1.2"
        />

        {/* Jersey Collar & Seam Accents */}
        <path d="M 93 74 L 100 86 L 107 74" stroke="#00E676" strokeWidth="1.8" fill="none" opacity="0.9" />
        <path d="M 76 96 C 85 110 115 110 124 96" stroke="#222222" strokeWidth="1.2" fill="none" />
        <path d="M 82 135 L 118 135" stroke="#262626" strokeWidth="1.5" />

        {/* Right Arm & Batting Glove */}
        <path
          d="M 126 86 L 144 104 L 152 78 L 142 74 Z"
          fill="url(#bodyGradient)"
          stroke="#383838"
          strokeWidth="1"
        />
        {/* Batting Glove */}
        <ellipse cx="152" cy="74" rx="6" ry="7" fill="#E6E6E6" stroke="#333333" strokeWidth="1.2" />

        {/* Left Arm & Batting Glove */}
        <path
          d="M 74 86 L 62 110 L 76 122 L 86 102 Z"
          fill="url(#bodyGradient)"
          stroke="#383838"
          strokeWidth="1"
        />
        <ellipse cx="60" cy="114" rx="6" ry="6" fill="#D4D4D4" stroke="#333333" strokeWidth="1.2" />

        {/* Lower Body & Cricket Pads (Athletic stance) */}
        <path
          d="M 82 170 L 78 206 C 78 210 82 214 88 214 L 95 214 C 99 214 102 210 102 206 L 98 170 Z"
          fill="#252525"
          stroke="#3A3A3A"
          strokeWidth="1"
        />
        <path
          d="M 102 170 L 106 206 C 106 210 110 214 116 214 L 123 214 C 127 214 130 210 130 206 L 122 170 Z"
          fill="#222222"
          stroke="#3A3A3A"
          strokeWidth="1"
        />

        {/* Pad Straps Accents */}
        <line x1="80" y1="184" x2="100" y2="184" stroke="#444444" strokeWidth="1" />
        <line x1="80" y1="198" x2="100" y2="198" stroke="#444444" strokeWidth="1" />
        <line x1="104" y1="184" x2="124" y2="184" stroke="#444444" strokeWidth="1" />
        <line x1="104" y1="198" x2="124" y2="198" stroke="#444444" strokeWidth="1" />
      </svg>

      {/* Subtle Bottom Vignette */}
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0D0D0D] to-transparent pointer-events-none" />
    </div>
  );
};

