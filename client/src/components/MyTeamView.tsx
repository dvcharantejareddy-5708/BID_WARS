import React, { useState, useMemo } from 'react';
import { 
  Shield, 
  Coins, 
  Users, 
  Globe, 
  Award, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Percent,
  Search,
  Filter,
  Plane,
  Tag,
  Sparkles
} from 'lucide-react';
import { RoomState, IPL_FRANCHISES, Player } from '../types.js';
import { TeamLogo } from './TeamLogo.js';

interface MyTeamViewProps {
  roomState: RoomState;
  myMemberId: string;
}

export const MyTeamView: React.FC<MyTeamViewProps> = ({ roomState, myMemberId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'BATTER' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER'>('ALL');
  const [nationalityFilter, setNationalityFilter] = useState<'ALL' | 'INDIAN' | 'OVERSEAS'>('ALL');

  const myMember = roomState.members[myMemberId];
  const myTeamId = myMember?.teamId;

  if (!myTeamId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-white border border-[#D8D8D1] p-8 rounded-3xl shadow-sm">
          <Shield className="w-12 h-12 text-[#C74444] mx-auto mb-4" />
          <h2 className="text-2xl font-black font-heading uppercase text-[#18243A] mb-2">No Franchise Assigned</h2>
          <p className="text-xs text-[#647084]">Please select a franchise in the waiting lobby.</p>
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
  const indianCount = squad.filter(p => !p.is_overseas).length;
  const batters = squad.filter(p => p.primary_role === 'BATTER' && !p.is_wicketkeeper);
  const bowlers = squad.filter(p => p.primary_role === 'BOWLER');
  const allRounders = squad.filter(p => p.primary_role === 'ALL_ROUNDER');
  const wicketKeepers = squad.filter(p => p.is_wicketkeeper);

  const minSquad = roomState.settings.minSquad;
  const maxSquad = roomState.settings.maxSquad;
  const maxOverseas = roomState.settings.maxOverseas;
  const remainingOverseasSlots = Math.max(0, maxOverseas - overseasCount);
  const emptySlots = Math.max(0, minSquad - squad.length);
  const completionPercent = Math.min(100, Math.round((squad.length / minSquad) * 100));

  // Find purchases with price
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
  const avgPrice = squad.length > 0 ? Math.round(totalSpent / squad.length) : 0;

  // Feasibility reserve check
  const slotsRemainingNeeded = Math.max(0, minSquad - squad.length);
  const minSpendRequired = slotsRemainingNeeded * 3000000;
  const isFeasible = purse >= minSpendRequired;

  // Filtered Squad
  const filteredPurchases = useMemo(() => {
    return purchasesWithPrice.filter(({ player: p }) => {
      // Search term
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesCountry = (p.country || p.nationality || '').toLowerCase().includes(query);
        const matchesRole = p.primary_role.toLowerCase().includes(query);
        if (!matchesName && !matchesCountry && !matchesRole) return false;
      }

      // Role filter
      if (roleFilter !== 'ALL') {
        if (roleFilter === 'WICKET_KEEPER') {
          if (!p.is_wicketkeeper) return false;
        } else if (p.primary_role !== roleFilter) {
          return false;
        }
      }

      // Nationality filter
      if (nationalityFilter === 'INDIAN' && p.is_overseas) return false;
      if (nationalityFilter === 'OVERSEAS' && !p.is_overseas) return false;

      return true;
    });
  }, [purchasesWithPrice, searchTerm, roleFilter, nationalityFilter]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 relative font-body">
      {/* Team Header Banner */}
      <div className="bg-white border border-[#D8D8D1] rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <TeamLogo teamId={myTeamId} className="w-16 h-16 shadow-sm" />

          <div>
            <span className="text-xs text-[#176B48] font-heading font-bold uppercase tracking-wider">
              MANAGER: {myMember.nickname}
            </span>
            <h1 className="text-3xl font-bold font-heading uppercase text-[#18243A]">
              {team.name}
            </h1>
            <p className="text-xs text-[#647084] mt-0.5">
              {team.city} · {team.emblemText}
            </p>
          </div>
        </div>

        {/* Purse Overview Box */}
        <div className="bg-[#E6EDF8] border border-[#D8D8D1] rounded-xl p-4 flex items-center gap-6">
          <div>
            <span className="text-[10px] text-[#647084] uppercase tracking-wider font-heading font-bold block">
              Remaining Purse
            </span>
            <span className="text-2xl font-bold font-number text-[#176B48]">
              ₹{(purse / 10000000).toFixed(2)} Cr
            </span>
          </div>
          <div className="h-8 w-px bg-[#D8D8D1]" />
          <div>
            <span className="text-[10px] text-[#647084] uppercase tracking-wider font-heading font-bold block">
              Total Spent
            </span>
            <span className="text-2xl font-bold font-number text-[#173B78]">
              ₹{(totalSpent / 10000000).toFixed(2)} Cr
            </span>
          </div>
        </div>
      </div>

      {/* Squad KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white border border-[#D8D8D1] rounded-xl p-4 shadow-sm">
          <span className="text-[10px] text-[#647084] uppercase font-heading font-bold tracking-wider block">Squad Size</span>
          <div className="text-xl font-number font-bold text-[#18243A] mt-1">
            {squad.length} / {maxSquad}
          </div>
          <span className="text-[10px] text-[#647084] mt-0.5 block">Min required: {minSquad}</span>
        </div>

        <div className="bg-white border border-[#D8D8D1] rounded-xl p-4 shadow-sm">
          <span className="text-[10px] text-[#647084] uppercase font-heading font-bold tracking-wider block">Overseas</span>
          <div className={`text-xl font-number font-bold mt-1 ${overseasCount >= maxOverseas ? 'text-[#C74444]' : 'text-[#176B48]'}`}>
            {overseasCount} / {maxOverseas}
          </div>
          <span className="text-[10px] text-[#647084] mt-0.5 block">
            {overseasCount >= maxOverseas ? 'LIMIT REACHED' : `${remainingOverseasSlots} slots left`}
          </span>
        </div>

        <div className="bg-white border border-[#D8D8D1] rounded-xl p-4 shadow-sm">
          <span className="text-[10px] text-[#647084] uppercase font-heading font-bold tracking-wider block">Indian Players</span>
          <div className="text-xl font-number font-bold text-[#18243A] mt-1">
            {indianCount}
          </div>
          <span className="text-[10px] text-[#647084] mt-0.5 block">Domestic core</span>
        </div>

        <div className="bg-white border border-[#D8D8D1] rounded-xl p-4 shadow-sm">
          <span className="text-[10px] text-[#647084] uppercase font-heading font-bold tracking-wider block">Avg Cost</span>
          <div className="text-xl font-number font-bold text-[#173B78] mt-1">
            ₹{(avgPrice / 10000000).toFixed(2)} Cr
          </div>
          <span className="text-[10px] text-[#647084] mt-0.5 block">Per player</span>
        </div>

        <div className="bg-white border border-[#D8D8D1] rounded-xl p-4 shadow-sm">
          <span className="text-[10px] text-[#647084] uppercase font-heading font-bold tracking-wider block">Top Buy</span>
          <div className="text-sm font-heading font-bold text-[#18243A] uppercase truncate mt-1">
            {mostExpensive ? mostExpensive.player.name : '—'}
          </div>
          <span className="text-[10px] text-[#176B48] font-number font-bold mt-0.5 block">
            {mostExpensive ? `₹${(mostExpensive.price / 10000000).toFixed(2)} Cr` : '—'}
          </span>
        </div>

        <div className="bg-white border border-[#D8D8D1] rounded-xl p-4 shadow-sm">
          <span className="text-[10px] text-[#647084] uppercase font-heading font-bold tracking-wider block">Purse Reserve</span>
          <div className="flex items-center gap-1 text-sm font-heading font-bold mt-1 uppercase">
            {isFeasible ? (
              <span className="text-[#167447] flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Feasible
              </span>
            ) : (
              <span className="text-[#C74444] flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Deficit
              </span>
            )}
          </div>
          <span className="text-[10px] text-[#647084] mt-0.5 block font-number">
            ₹{(minSpendRequired / 10000000).toFixed(2)} Cr needed
          </span>
        </div>
      </div>

      {/* Role Composition Progress Bars */}
      <div className="bg-white border border-[#D8D8D1] rounded-2xl p-5 shadow-sm">
        <h3 className="font-heading font-bold text-sm text-[#18243A] mb-3 uppercase tracking-wide">
          Squad Role Composition
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-[#F3F0E8] p-3.5 rounded-xl border border-[#D8D8D1]">
            <div className="flex justify-between text-xs mb-1.5 font-heading font-bold uppercase">
              <span className="text-[#647084]">Batters:</span>
              <span className="font-number font-bold text-[#173B78]">{batters.length}</span>
            </div>
            <div className="h-1.5 bg-[#D8D8D1] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#173B78]"
                style={{ width: `${Math.min(100, (batters.length / 6) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-[#647084] mt-1.5 block">Ideal: 5-7</span>
          </div>

          <div className="bg-[#F3F0E8] p-3.5 rounded-xl border border-[#D8D8D1]">
            <div className="flex justify-between text-xs mb-1.5 font-heading font-bold uppercase">
              <span className="text-[#647084]">Bowlers:</span>
              <span className="font-number font-bold text-[#176B48]">{bowlers.length}</span>
            </div>
            <div className="h-1.5 bg-[#D8D8D1] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#176B48]"
                style={{ width: `${Math.min(100, (bowlers.length / 6) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-[#647084] mt-1.5 block">Ideal: 5-7</span>
          </div>

          <div className="bg-[#F3F0E8] p-3.5 rounded-xl border border-[#D8D8D1]">
            <div className="flex justify-between text-xs mb-1.5 font-heading font-bold uppercase">
              <span className="text-[#647084]">All-Rounders:</span>
              <span className="font-number font-bold text-[#B8860B]">{allRounders.length}</span>
            </div>
            <div className="h-1.5 bg-[#D8D8D1] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#B8860B]"
                style={{ width: `${Math.min(100, (allRounders.length / 4) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-[#647084] mt-1.5 block">Ideal: 3-5</span>
          </div>

          <div className="bg-[#F3F0E8] p-3.5 rounded-xl border border-[#D8D8D1]">
            <div className="flex justify-between text-xs mb-1.5 font-heading font-bold uppercase">
              <span className="text-[#647084]">Wicket-Keepers:</span>
              <span className="font-number font-bold text-[#18243A]">{wicketKeepers.length}</span>
            </div>
            <div className="h-1.5 bg-[#D8D8D1] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#18243A]"
                style={{ width: `${Math.min(100, (wicketKeepers.length / 2) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-[#647084] mt-1.5 block">Ideal: 2</span>
          </div>
        </div>
      </div>

      {/* In-Squad Search & Filters */}
      <div className="bg-white border border-[#D8D8D1] rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h3 className="font-heading font-bold text-base text-[#18243A] flex items-center gap-2 uppercase tracking-wide">
            <span>Acquired Roster</span>
            <span className="text-xs font-number font-bold text-[#173B78] bg-[#E6EDF8] px-2.5 py-0.5 rounded border border-[#D8D8D1]">
              {squad.length} Players
            </span>
          </h3>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-[#647084] absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search player name or country..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#F3F0E8] border border-[#D8D8D1] text-[#18243A] text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-[#173B78] placeholder-[#647084]"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="bg-[#F3F0E8] border border-[#D8D8D1] text-[#18243A] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#173B78] font-heading font-bold uppercase"
            >
              <option value="ALL">All Roles</option>
              <option value="BATTER">Batters</option>
              <option value="BOWLER">Bowlers</option>
              <option value="ALL_ROUNDER">All-Rounders</option>
              <option value="WICKET_KEEPER">Wicket-Keepers</option>
            </select>

            {/* Nationality Filter */}
            <select
              value={nationalityFilter}
              onChange={(e) => setNationalityFilter(e.target.value as any)}
              className="bg-[#F3F0E8] border border-[#D8D8D1] text-[#18243A] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#173B78] font-heading font-bold uppercase"
            >
              <option value="ALL">All Nationalities</option>
              <option value="INDIAN">Indian Only (🇮🇳)</option>
              <option value="OVERSEAS">Overseas Only (✈)</option>
            </select>
          </div>
        </div>

        {/* Players List */}
        {squad.length === 0 ? (
          <div className="py-16 text-center text-[#647084]">
            <Shield className="w-10 h-10 text-[#D8D8D1] mx-auto mb-3" />
            <p className="text-sm font-heading font-bold uppercase text-[#18243A]">No players acquired yet</p>
            <p className="text-xs text-[#647084] mt-1">Bid in the live Auction Arena to start building your 2026 IPL roster.</p>
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="py-10 text-center text-[#647084]">
            <p className="text-xs">No squad members match the selected search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#D8D8D1] text-[#647084] font-heading font-bold uppercase tracking-wider">
                  <th className="pb-3 pl-3">#</th>
                  <th className="pb-3">Player</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Nationality</th>
                  <th className="pb-3">Base Price</th>
                  <th className="pb-3 pr-3 text-right">Bought For</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8D8D1]">
                {filteredPurchases.map(({ player: p, price }, idx) => (
                  <tr key={p.id} className="hover:bg-[#E6EDF8]/30 transition-colors">
                    <td className="py-3 pl-3 font-number text-[#647084]">{idx + 1}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#E6EDF8] border border-[#D8D8D1] overflow-hidden flex items-center justify-center shrink-0">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover object-top" />
                          ) : (
                            <span className="font-heading font-bold text-xs text-[#173B78]">{p.name.slice(0, 2)}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-heading font-bold uppercase text-[#18243A] flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {p.is_marquee && (
                              <span className="text-[9px] bg-[#F0C65B]/20 text-[#B8860B] px-1.5 py-0.5 rounded font-bold border border-[#F0C65B]/40 uppercase">
                                MARQUEE
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#647084]">{p.primary_role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="bg-[#F3F0E8] border border-[#D8D8D1] px-2.5 py-1 rounded text-[#18243A] font-heading font-bold uppercase text-[11px]">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3">
                      {p.is_overseas ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#173B78] font-semibold bg-[#E6EDF8] border border-[#D8D8D1] px-2 py-0.5 rounded">
                          <Plane className="w-3 h-3" /> {p.nationality}
                        </span>
                      ) : (
                        <span className="text-[#647084] font-medium text-xs flex items-center gap-1">
                          <span>🇮🇳</span> {p.nationality}
                        </span>
                      )}
                    </td>
                    <td className="py-3 font-number text-[#647084]">{p.base_price_display}</td>
                    <td className="py-3 pr-3 font-number font-bold text-[#167447] text-right text-sm">
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
