import React from 'react';
import { 
  Shield, 
  Coins, 
  Users, 
  Globe, 
  Award, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Percent
} from 'lucide-react';
import { RoomState, IPL_FRANCHISES, Player } from '../types.js';

interface MyTeamViewProps {
  roomState: RoomState;
  myMemberId: string;
}

export const MyTeamView: React.FC<MyTeamViewProps> = ({ roomState, myMemberId }) => {
  const myMember = roomState.members[myMemberId];
  const myTeamId = myMember?.teamId;

  if (!myTeamId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="glass-panel p-8 rounded-2xl">
          <Shield className="w-12 h-12 text-ruby-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold font-display text-white mb-2">No Franchise Assigned</h2>
          <p className="text-xs text-slate-400">Please join a franchise in the waiting lobby.</p>
        </div>
      </div>
    );
  }

  const team = IPL_FRANCHISES[myTeamId];
  const squad = roomState.teamSquads[myTeamId] || [];
  const purse = roomState.teamPurse[myTeamId] || 0;
  const startingPurse = roomState.settings.startingPurse;
  const totalSpent = startingPurse - purse;

  const overseasCount = squad.filter(p => p.is_overseas).length;
  const batters = squad.filter(p => p.primary_role === 'BATTER' && !p.is_wicketkeeper);
  const bowlers = squad.filter(p => p.primary_role === 'BOWLER');
  const allRounders = squad.filter(p => p.primary_role === 'ALL_ROUNDER');
  const wicketKeepers = squad.filter(p => p.is_wicketkeeper);

  const minSquad = roomState.settings.minSquad;
  const maxSquad = roomState.settings.maxSquad;
  const maxOverseas = roomState.settings.maxOverseas;
  const emptySlots = Math.max(0, minSquad - squad.length);
  const completionPercent = Math.min(100, Math.round((squad.length / minSquad) * 100));

  // Find most expensive and cheapest purchase
  // Lookup purchases from history
  const purchasesWithPrice = squad.map(p => {
    const lotHistory = roomState.history.find(h => h.player.id === p.id && h.winningTeam === myTeamId);
    return {
      player: p,
      price: lotHistory?.soldPrice || p.base_price_inr
    };
  });

  const mostExpensive = purchasesWithPrice.length > 0 
    ? [...purchasesWithPrice].sort((a, b) => b.price - a.price)[0]
    : null;
  const cheapest = purchasesWithPrice.length > 0 
    ? [...purchasesWithPrice].sort((a, b) => a.price - b.price)[0]
    : null;

  const avgPrice = squad.length > 0 ? Math.round(totalSpent / squad.length) : 0;

  // Feasibility reserve check
  const slotsRemainingNeeded = Math.max(0, minSquad - squad.length);
  const minSpendRequired = slotsRemainingNeeded * 3000000;
  const isFeasible = purse >= minSpendRequired;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 relative">
      {/* Team Header Banner */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-navy-600/70 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center font-black font-display text-2xl shadow-lg shrink-0"
            style={{ backgroundColor: team.primaryColor, color: team.textColor }}
          >
            {team.shortName}
          </div>

          <div>
            <span className="text-xs text-cyan-400 font-bold uppercase tracking-wider">
              MANAGER: {myMember.nickname}
            </span>
            <h1 className="text-3xl font-extrabold font-display text-white">
              {team.name}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {team.city} · {team.emblemText}
            </p>
          </div>
        </div>

        {/* Purse Overview Box */}
        <div className="bg-navy-900/90 border border-navy-700/80 rounded-xl p-4 flex items-center gap-6">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              Remaining Purse
            </span>
            <span className="text-2xl font-black font-mono text-cyan-300">
              ₹{(purse / 10000000).toFixed(2)} Cr
            </span>
          </div>
          <div className="h-8 w-px bg-navy-700" />
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              Total Spent
            </span>
            <span className="text-2xl font-black font-mono text-amber-300">
              ₹{(totalSpent / 10000000).toFixed(2)} Cr
            </span>
          </div>
        </div>
      </div>

      {/* Squad KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3.5">
        <div className="glass-card rounded-xl p-3.5 border border-navy-700/60">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Squad Size</span>
          <div className="text-xl font-mono font-bold text-white mt-1">
            {squad.length} / {minSquad}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Max {maxSquad}</span>
        </div>

        <div className="glass-card rounded-xl p-3.5 border border-navy-700/60">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Overseas</span>
          <div className={`text-xl font-mono font-bold mt-1 ${overseasCount >= maxOverseas ? 'text-ruby-400' : 'text-cyan-300'}`}>
            {overseasCount} / {maxOverseas}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{maxOverseas - overseasCount} slots open</span>
        </div>

        <div className="glass-card rounded-xl p-3.5 border border-navy-700/60">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Completion</span>
          <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
            {completionPercent}%
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{emptySlots} to reach 18</span>
        </div>

        <div className="glass-card rounded-xl p-3.5 border border-navy-700/60">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Avg Cost</span>
          <div className="text-xl font-mono font-bold text-amber-300 mt-1">
            ₹{(avgPrice / 10000000).toFixed(2)} Cr
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Per player</span>
        </div>

        <div className="glass-card rounded-xl p-3.5 border border-navy-700/60">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Top Buy</span>
          <div className="text-sm font-display font-bold text-white truncate mt-1">
            {mostExpensive ? mostExpensive.player.name : '—'}
          </div>
          <span className="text-[10px] text-amber-400 font-mono mt-0.5 block">
            {mostExpensive ? `₹${(mostExpensive.price / 10000000).toFixed(2)} Cr` : '—'}
          </span>
        </div>

        <div className="glass-card rounded-xl p-3.5 border border-navy-700/60">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Reserve Check</span>
          <div className="flex items-center gap-1 text-sm font-bold mt-1">
            {isFeasible ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Legally Valid
              </span>
            ) : (
              <span className="text-ruby-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Deficit
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Min ₹{(minSpendRequired / 10000000).toFixed(2)} Cr
          </span>
        </div>
      </div>

      {/* Role Composition Progress Bars */}
      <div className="glass-panel rounded-2xl p-5 border border-navy-600/70">
        <h3 className="font-display font-bold text-sm text-slate-200 mb-3">
          Squad Role Balance Target
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300">Batters:</span>
              <span className="font-mono font-bold text-cyan-300">{batters.length}</span>
            </div>
            <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-400"
                style={{ width: `${Math.min(100, (batters.length / 6) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Ideal: 5-7</span>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300">Bowlers:</span>
              <span className="font-mono font-bold text-amber-300">{bowlers.length}</span>
            </div>
            <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400"
                style={{ width: `${Math.min(100, (bowlers.length / 6) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Ideal: 5-7</span>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300">All-Rounders:</span>
              <span className="font-mono font-bold text-purple-400">{allRounders.length}</span>
            </div>
            <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-400"
                style={{ width: `${Math.min(100, (allRounders.length / 4) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Ideal: 3-5</span>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300">Wicket-Keepers:</span>
              <span className="font-mono font-bold text-emerald-400">{wicketKeepers.length}</span>
            </div>
            <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400"
                style={{ width: `${Math.min(100, (wicketKeepers.length / 2) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Ideal: 2</span>
          </div>
        </div>
      </div>

      {/* Purchased Players Roster Table */}
      <div className="glass-panel rounded-2xl p-5 border border-navy-600/70">
        <h3 className="font-display font-bold text-base text-white mb-4 flex items-center justify-between">
          <span>Acquired Squad ({squad.length} Players)</span>
        </h3>

        {squad.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <p className="text-sm">No players acquired yet.</p>
            <p className="text-xs text-slate-600 mt-1">Bid in the Auction Arena to build your squad.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-navy-700/80 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 pl-2">#</th>
                  <th className="pb-3">Player</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Country</th>
                  <th className="pb-3">Base Price</th>
                  <th className="pb-3 pr-2 text-right">Bought For</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800/80">
                {purchasesWithPrice.map(({ player: p, price }, idx) => (
                  <tr key={p.id} className="hover:bg-navy-800/40 transition-colors">
                    <td className="py-3 pl-2 font-mono text-slate-500">{idx + 1}</td>
                    <td className="py-3 font-display font-bold text-white flex items-center gap-2">
                      <span>{p.name}</span>
                      {p.is_marquee && (
                        <span className="text-[9px] bg-amber-400/20 text-amber-300 px-1.5 py-0.2 rounded font-bold border border-amber-400/30">
                          MARQUEE
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className="bg-navy-800 px-2 py-0.5 rounded text-cyan-300 font-medium">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3 text-slate-300">
                      {p.nationality} {p.is_overseas && <span className="text-[10px] text-amber-400 font-bold">(OS)</span>}
                    </td>
                    <td className="py-3 font-mono text-slate-400">{p.base_price_display}</td>
                    <td className="py-3 pr-2 font-mono font-bold text-emerald-400 text-right">
                      ₹{(price / 10000000).toFixed(2)} Cr
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
