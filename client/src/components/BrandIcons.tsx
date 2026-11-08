import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  color?: string;
}

// Section 03 · GAME ICONS · 1.8PX ROUNDED STROKE (from BidWars Brand Board.pdf)

export const PlayerIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="7" r="4" />
    <path d="M5.5 21v-2a6.5 6.5 0 0113 0v2" />
  </svg>
);

export const GavelIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M14 13l-8.5 8.5a2.12 2.12 0 01-3-3L11 10" />
    <path d="M16 16l4-4" />
    <path d="M8 8l4-4" />
    <path d="M9 7l8 8" />
    <path d="M15 1l6 6-3 3-6-6 3-3z" />
  </svg>
);

export const CoinsIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <ellipse cx="12" cy="6" rx="8" ry="3" />
    <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" />
    <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
  </svg>
);

export const TrophyIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2" />
    <path d="M18 9h2a2 2 0 002-2V5a2 2 0 00-2-2h-2" />
    <path d="M6 3h12v7a6 6 0 01-12 0V3z" />
    <path d="M12 16v4" />
    <path d="M8 20h8" />
  </svg>
);

export const BallIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3a13 13 0 010 18" />
    <path d="M12 3a13 13 0 000 18" />
    <path d="M8.5 7.5l2 1" />
    <path d="M8.5 11.5l2 1" />
    <path d="M8.5 15.5l2 1" />
    <path d="M15.5 7.5l-2 1" />
    <path d="M15.5 11.5l-2 1" />
    <path d="M15.5 15.5l-2 1" />
  </svg>
);

export const BatIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4 20l2 2" />
    <path d="M5 19l4-4" />
    <path d="M9 15l10-10a2.12 2.12 0 013 3L12 18l-3-3z" />
  </svg>
);

export const StumpsIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M5 4h14" />
    <path d="M7 4v16" />
    <path d="M12 4v16" />
    <path d="M17 4v16" />
  </svg>
);

export const PowerUpIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
  </svg>
);

