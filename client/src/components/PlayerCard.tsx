import React, { useState } from 'react';
import { Player, IPLTeamId, IPL_FRANCHISES } from '../types.js';
import { OvrBadge } from './OvrBadge.js';
import { CricketPlayerSilhouette } from './CricketPlayerSilhouette.js';
import { TeamLogo } from './TeamLogo.js';
import { Plane } from 'lucide-react';

export interface PlayerCardProps {
  player: Player;
  status?: 'AVAILABLE' | 'SOLD' | 'UNSOLD' | 'SKIPPED' | 'SELECTED' | 'DISABLED';
  soldPrice?: number;
  winningTeam?: IPLTeamId | null;
  showBasePrice?: boolean;
  size?: 'sm' | 'md' | 'lg';
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
  actionButton?: React.ReactNode;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  status = 'AVAILABLE',
  soldPrice,
  winningTeam,
  showBasePrice = true,
  size = 'md',
  isSelected = false,
  onClick,
  className = '',
  actionButton
}) => {
  const [imageError, setImageError] = useState(false);

  // Determine role label and accent color
  const getRoleBadge = () => {
    if (player.is_wicketkeeper || player.category === 'Wicket-keepers') {
      return { label: 'WK', fullLabel: 'Wicket-Keeper', color: 'bg-[#FFC93D]/15 text-[#FFC93D] border-[#FFC93D]/40' };
    }
    if (player.category === 'All-rounders' || player.primary_role === 'ALL_ROUNDER') {
      return { label: 'ALL', fullLabel: 'All-Rounder', color: 'bg-[#C8FF3D]/15 text-[#C8FF3D] border-[#C8FF3D]/40' };
    }
    if (player.category === 'Bowlers' || player.primary_role === 'BOWLER') {
      return { label: 'BOWL', fullLabel: 'Bowler', color: 'bg-[#FF3B5C]/15 text-[#FF3B5C] border-[#FF3B5C]/40' };
    }
    return { label: 'BAT', fullLabel: 'Batter', color: 'bg-[#7C5CFF]/15 text-[#7C5CFF] border-[#7C5CFF]/40' };
  };

  const roleBadge = getRoleBadge();
  const franchise = winningTeam ? (IPL_FRANCHISES as Record<string, any>)[winningTeam] : null;

  // Compact size
  if (size === 'sm') {
    return (
      <div
        onClick={onClick}
        className={`relative bg-[#12142A] border rounded-xl p-2.5 transition-all flex items-center justify-between gap-3 ${
          isSelected
            ? 'border-[#C8FF3D] shadow-[0_0_12px_rgba(200,255,61,0.2)] bg-[#181B38]'
            : 'border-[#23274D] hover:border-[#3B4174]'
        } ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-full bg-[#0A0B14] border border-[#23274D] overflow-hidden shrink-0 flex items-center justify-center">
            {player.image_url && !imageError ? (
              <img
                src={player.image_url}
                alt={player.name}
                className="w-full h-full object-cover object-top select-none"
                onError={() => setImageError(true)}
              />
            ) : (
              <CricketPlayerSilhouette category={player.category} className="w-full h-full p-1" />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-heading font-black text-xs text-white uppercase tracking-tight truncate flex items-center gap-1.5">
              <span className="truncate">{player.name}</span>
              {player.is_overseas && (
                <span className="text-[9px] text-[#7C5CFF]" title="Overseas Player">✈</span>
              )}
            </div>
            <div className="text-[10px] text-[#9E9EB8] font-heading font-semibold uppercase flex items-center gap-1">
              <span className={`px-1 py-0.2 rounded border ${roleBadge.color} text-[9px]`}>
                {roleBadge.label}
              </span>
              {showBasePrice && (
                <span className="text-[#FFC93D] font-number font-bold ml-1">
                  {player.base_price_display}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          <OvrBadge ovr={player.ovr} size="xs" />
          {actionButton}
        </div>
      </div>
    );
  }

  // Standard/Medium size: clean, compact, professional card
  return (
    <div
      onClick={onClick}
      className={`group relative bg-[#12142A] border rounded-2xl p-4 transition-all flex flex-col justify-between overflow-hidden ${
        isSelected
          ? 'border-[#C8FF3D] shadow-[0_0_20px_rgba(200,255,61,0.25)] bg-[#181B38]'
          : status === 'SOLD'
          ? 'border-emerald-500/40 bg-[#12142A]'
          : status === 'UNSOLD'
          ? 'border-[#FF3B5C]/40 bg-[#12142A]'
          : 'border-[#23274D] hover:border-[#7C5CFF]/60 hover:shadow-lg'
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Top Bar: Role badge + Overseas indicator + OVR badge */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-heading font-extrabold uppercase tracking-wider border ${roleBadge.color}`}>
            {roleBadge.fullLabel}
          </span>
          {player.is_overseas ? (
            <span className="px-1.5 py-0.5 rounded-md bg-[#0A0B14] border border-[#23274D] text-[#7C5CFF] text-[10px] font-heading font-bold uppercase tracking-wider flex items-center gap-1">
              <Plane className="w-2.5 h-2.5" /> {player.nationality}
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-md bg-[#0A0B14] border border-[#23274D] text-gray-300 text-[10px] font-heading font-bold uppercase tracking-wider">
              🇮🇳 India
            </span>
          )}
        </div>

        <OvrBadge ovr={player.ovr} size="sm" />
      </div>

      {/* Center Avatar & Name */}
      <div className="flex items-center gap-3.5 my-2">
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#0A0B14] border-2 border-[#23274D] group-hover:border-[#C8FF3D]/50 transition-colors overflow-hidden shrink-0 flex items-center justify-center shadow-md">
          {player.image_url && !imageError ? (
            <img
              src={player.image_url}
              alt={player.name}
              className="w-full h-full object-cover object-top select-none group-hover:scale-105 transition-transform duration-300"
              onError={() => setImageError(true)}
            />
          ) : (
            <CricketPlayerSilhouette category={player.category} className="w-full h-full p-1" />
          )}
        </div>

        <div className="min-w-0 grow">
          <h3 className="font-heading font-black text-sm sm:text-base text-white uppercase tracking-tight truncate group-hover:text-[#C8FF3D] transition-colors">
            {player.name}
          </h3>
          <div className="text-[11px] text-[#9E9EB8] mt-0.5 flex items-center gap-2 flex-wrap">
            <span>Set: <strong className="text-gray-300">{player.set_name || 'Standard'}</strong></span>
            {player.is_marquee && (
              <span className="text-[#FFC93D] font-extrabold text-[10px] uppercase bg-[#FFC93D]/10 px-1.5 py-0.2 rounded border border-[#FFC93D]/30">
                Marquee
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Bar: Base Price or Sold Status */}
      <div className="mt-3 pt-2.5 border-t border-[#23274D] flex items-center justify-between text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-[#9E9EB8] block">Base Price</span>
          <span className="font-number font-extrabold text-[#FFC93D] text-sm">
            {player.base_price_display}
          </span>
        </div>

        {/* Status / Sold info */}
        <div>
          {status === 'SOLD' && soldPrice ? (
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block">Sold For</span>
              <span className="font-number font-black text-emerald-400 text-sm">
                ₹{(soldPrice / 10000000).toFixed(2)} Cr
              </span>
            </div>
          ) : status === 'UNSOLD' ? (
            <span className="px-2 py-0.5 rounded-full bg-[#FF3B5C]/15 border border-[#FF3B5C]/40 text-[#FF3B5C] font-heading font-bold text-[10px] uppercase">
              Unsold
            </span>
          ) : status === 'SKIPPED' ? (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 font-heading font-bold text-[10px] uppercase">
              Skipped
            </span>
          ) : winningTeam && franchise ? (
            <div className="flex items-center gap-1.5">
              <TeamLogo teamId={winningTeam} className="w-5 h-5 shrink-0" />
              <span className="font-heading font-bold text-white text-xs">{franchise.shortName}</span>
            </div>
          ) : (
            <span className="text-[10px] font-heading font-bold uppercase text-[#C8FF3D] bg-[#C8FF3D]/10 px-2 py-0.5 rounded border border-[#C8FF3D]/30">
              In Pool
            </span>
          )}
        </div>
      </div>

      {actionButton && (
        <div className="mt-3 pt-2 border-t border-[#23274D]">
          {actionButton}
        </div>
      )}
    </div>
  );
};

