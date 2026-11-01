import React from 'react';
import { Shield, Users, Coins, Globe, Bot, CheckCircle, AlertCircle } from 'lucide-react';
import { RoomState, IPLTeamId, IPL_FRANCHISES } from '../types.js';

interface AllTeamsViewProps {
  roomState: RoomState;
  myMemberId: string;
}

export const AllTeamsView: React.FC<AllTeamsViewProps> = ({ roomState, myMemberId }) => {
  const allTeams: IPLTeamId[] = ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'PBKS', 'DC', 'GT', 'LSG'];
  const myMember = roomState.members[myMemberId];
  const startingPurse = roomState.settings.startingPurse;
  const minSquad = roomState.settings.minSquad;
  const maxSquad = roomState.settings.maxSquad;
  const maxOverseas = roomState.settings.maxOverseas;

  // Build manager lookup
  const managers: Record<IPLTeamId, { nickname: string; isBot: boolean; isHost: boolean }> = {} as any;
  Object.values(roomState.members).forEach(m => {
    if (m.teamId) {
      managers[m.teamId] = {
        nickname: m.nickname,
        isBot: m.isBot,
        isHost: m.isHost
      };
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 relative">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-navy-600/70 shadow-2xl">
        <h1 className="text-3xl font-extrabold font-display text-white">
          10 Franchise Matrix
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Live comparison of purse balances, roster sizes, overseas allotments, and squad completion.
        </p>
      </div>

      {/* Grid of all 10 franchises */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {allTeams.map((teamId) => {
          const team = IPL_FRANCHISES[teamId];
          const manager = managers[teamId];
          const squad = roomState.teamSquads[teamId] || [];
          const purse = roomState.teamPurse[teamId] || 0;
          const spent = startingPurse - purse;
          const overseas = squad.filter(p => p.is_overseas).length;
          const isMyTeam = myMember?.teamId === teamId;

          const batters = squad.filter(p => p.primary_role === 'BATTER' && !p.is_wicketkeeper).length;
          const bowlers = squad.filter(p => p.primary_role === 'BOWLER').length;
          const allRounders = squad.filter(p => p.primary_role === 'ALL_ROUNDER').length;
          const wks = squad.filter(p => p.is_wicketkeeper).length;

          // Find top buy
          const lotHistory = roomState.history.filter(h => h.winningTeam === teamId && h.soldPrice);
          const topBuy = lotHistory.length > 0
            ? [...lotHistory].sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0))[0]
            : null;

          const needed = Math.max(0, minSquad - squad.length);
          const minSpend = needed * 3000000;
          const isFeasible = purse >= minSpend;

          return (
            <div
              key={teamId}
              className={`glass-panel rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                isMyTeam
                  ? 'border-cyan-400 shadow-glow-cyan bg-navy-800/90'
                  : 'border-navy-700/80 bg-navy-900/80 hover:border-slate-500'
              }`}
            >
              <div>
                {/* Team & Manager Ribbon */}
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-black font-display text-sm shadow-md"
                    style={{ backgroundColor: team.primaryColor, color: team.textColor }}
                  >
                    {team.shortName}
                  </div>

                  {manager?.isBot ? (
                    <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Bot className="w-2.5 h-2.5" /> AI BOT
                    </span>
                  ) : manager ? (
                    <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                      HUMAN
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-navy-800 text-slate-500 px-2 py-0.5 rounded-full">
                      UNOCCUPIED
                    </span>
                  )}
                </div>

                <h3 className="font-display font-bold text-sm text-white leading-tight">
                  {team.name}
                </h3>
                <p className="text-xs text-slate-400 truncate">
                  {manager ? manager.nickname : 'No manager'}
                  {isMyTeam && <strong className="text-cyan-400 ml-1">(You)</strong>}
                </p>

                {/* Purse Metrics */}
                <div className="my-3 py-2 px-3 bg-navy-950/70 border border-navy-800 rounded-xl space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Purse Left:</span>
                    <span className="font-bold text-cyan-300">
                      ₹{(purse / 10000000).toFixed(2)} Cr
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Spent:</span>
                    <span className="text-amber-400">
                      ₹{(spent / 10000000).toFixed(2)} Cr
                    </span>
                  </div>
                </div>

                {/* Squad Counts */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Squad Size:</span>
                    <span className="font-mono font-bold">
                      {squad.length} / {minSquad}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Overseas:</span>
                    <span className={`font-mono font-bold ${overseas >= maxOverseas ? 'text-ruby-400' : 'text-slate-200'}`}>
                      {overseas} / {maxOverseas}
                    </span>
                  </div>
                </div>

                {/* Role Badges */}
                <div className="grid grid-cols-4 gap-1 text-[10px] text-center my-3 py-1.5 bg-navy-950/50 rounded-lg">
                  <div>
                    <span className="text-slate-500 block">BAT</span>
                    <strong className="text-cyan-300 font-mono">{batters}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">BOWL</span>
                    <strong className="text-amber-300 font-mono">{bowlers}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">AR</span>
                    <strong className="text-purple-300 font-mono">{allRounders}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">WK</span>
                    <strong className="text-emerald-300 font-mono">{wks}</strong>
                  </div>
                </div>
              </div>

              {/* Bottom: Top Buy & Feasibility */}
              <div className="pt-2 border-t border-navy-700/60 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Top Buy:</span>
                  <span className="text-slate-300 font-medium truncate max-w-[120px] text-right">
                    {topBuy ? topBuy.player.name : '—'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
