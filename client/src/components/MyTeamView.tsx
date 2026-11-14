import React, { useState, useMemo } from 'react';
import { 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Search,
  Plane
} from 'lucide-react';
import { RoomState, IPL_FRANCHISES } from '../types.js';
import { TeamLogo } from './TeamLogo.js';
import { BatIcon, BallIcon, StumpsIcon, CoinsIcon } from './BrandIcons.js';
import { OvrBadge } from './OvrBadge.js';

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
        <div className="bg-[#12142A] border border-[#23274D] p-8 rounded-3xl shadow-xl">
          <Shield className="w-12 h-12 text-[#FF3B5C] mx-auto mb-4" />
          <h2 className="text-2xl font-black font-heading uppercase text-white mb-2">No Franchise Assigned</h2>
          <p className="text-xs text-[#9E9EB8]">Please select a franchise in the waiting lobby or onboarding screen.</p>
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

  // Dynamic OVR calculations from teamStats or squad
  const teamStat = roomState.teamStats?.[myTeamId];
  const avgSquadOvr = teamStat?.avgSquadOvr ?? (squad.length > 0 ? Math.round((squad.reduce((sum, p) => sum + (p.ovr || 70), 0) / squad.length) * 10) / 10 : 0);
  const avgPlayingXIOvr = teamStat?.avgPlayingXIOvr ?? 0;
  const highestOvr = teamStat?.highestOvrPlayer ?? (squad.length > 0 ? [...squad].sort((a, b) => (b.ovr || 0) - (a.ovr || 0))[0] : null);
  const lowestOvr = teamStat?.lowestOvrPlayer ?? (squad.length > 0 ? [...squad].sort((a, b) => (a.ovr || 0) - (b.ovr || 0))[0] : null);

  // Feasibility reserve check
  const slotsRemainingNeeded = Math.max(0, minSquad - squad.length);
  const minSpendRequired = slotsRemainingNeeded * 3000000;
  const isFeasible = purse >= minSpendRequired;

  // Filtered Squad
  const filteredPurchases = useMemo(() => {
    return purchasesWithPrice.filter(({ player: p }) => {
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesCountry = (p.country || p.nationality || '').toLowerCase().includes(query);
        const matchesRole = p.primary_role.toLowerCase().includes(query);
        if (!matchesName && !matchesCountry && !matchesRole) return false;
      }

      if (roleFilter !== 'ALL') {
        if (roleFilter === 'WICKET_KEEPER') {
          if (!p.is_wicketkeeper) return false;
        } else if (p.primary_role !== roleFilter) {
          return false;
        }
      }

      if (nationalityFilter === 'INDIAN' && p.is_overseas) return false;
      if (nationalityFilter === 'OVERSEAS' && !p.is_overseas) return false;

      return true;
    });
  }, [purchasesWithPrice, searchTerm, roleFilter, nationalityFilter]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 relative font-body">
      {/* Team Header Banner */}
      <div className="bg-[#12142A] border border-[#23274D] rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <TeamLogo teamId={myTeamId} className="w-16 h-16 drop-shadow-md" />

          <div>
            <span className="text-xs text-[#C8FF3D] font-heading font-extrabold uppercase tracking-wider">
              MANAGER: {myMember.nickname}
            </span>
            <h1 className="text-3xl font-black font-heading uppercase text-white tracking-tight">
              {team.name}
            </h1>
            <p className="text-xs text-[#9E9EB8] mt-0.5">
              {team.city} · {team.emblemText}
            </p>
          </div>
        </div>

        {/* Purse & OVR Overview Box */}
        <div className="bg-[#0A0B14] border border-[#23274D] rounded-2xl p-4 flex items-center gap-5 shadow-md flex-wrap">
          <div>
            <span className="text-[10px] text-[#9E9EB8] uppercase tracking-wider font-heading font-extrabold block">
              Remaining Purse
            </span>
            <span className="text-2xl font-black font-number text-[#FFC93D]">
              ₹{(purse / 10000000).toFixed(2)} Cr
            </span>
          </div>
          <div className="h-8 w-px bg-[#23274D]" />
          <div>
            <span className="text-[10px] text-[#9E9EB8] uppercase tracking-wider font-heading font-extrabold block">
              Total Spent
            </span>
            <span className="text-2xl font-black font-number text-[#C8FF3D]">
              ₹{(totalSpent / 10000000).toFixed(2)} Cr
            </span>
          </div>
          <div className="h-8 w-px bg-[#23274D]" />
          <div>
            <span className="text-[10px] text-[#9E9EB8] uppercase tracking-wider font-heading font-extrabold block">
              Squad Avg OVR
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-2xl font-black font-number text-white">
                {avgSquadOvr > 0 ? avgSquadOvr : '—'}
              </span>
              {avgSquadOvr > 0 && <OvrBadge ovr={avgSquadOvr} size="xs" showLabel={false} />}
            </div>
          </div>
          {avgPlayingXIOvr > 0 && (
            <>
              <div className="h-8 w-px bg-[#23274D]" />
              <div>
                <span className="text-[10px] text-[#9E9EB8] uppercase tracking-wider font-heading font-extrabold block">
                  Playing XI OVR
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-2xl font-black font-number text-[#C8FF3D]">
                    {avgPlayingXIOvr}
                  </span>
                  <OvrBadge ovr={avgPlayingXIOvr} size="xs" showLabel={false} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Squad KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-[#12142A] border border-[#23274D] rounded-2xl p-4 shadow-md">
          <span className="text-[10px] text-[#9E9EB8] uppercase font-heading font-extrabold tracking-wider block">Squad Size</span>
          <div className="text-xl font-number font-extrabold text-white mt-1">
            {squad.length} / {maxSquad}
          </div>
          <span className="text-[10px] text-[#62658A] mt-0.5 block">Min required: {minSquad}</span>
        </div>

        <div className="bg-[#12142A] border border-[#23274D] rounded-2xl p-4 shadow-md">
          <span className="text-[10px] text-[#9E9EB8] uppercase font-heading font-extrabold tracking-wider block">Overseas</span>
          <div className={`text-xl font-number font-extrabold mt-1 ${overseasCount >= maxOverseas ? 'text-[#FF3B5C]' : 'text-[#7C5CFF]'}`}>
            {overseasCount} / {maxOverseas}
          </div>
          <span className="text-[10px] text-[#62658A] mt-0.5 block">
            {overseasCount >= maxOverseas ? 'LIMIT REACHED' : `${remainingOverseasSlots} slots left`}
          </span>
        </div>

        <div className="bg-[#12142A] border border-[#23274D] rounded-2xl p-4 shadow-md">
          <span className="text-[10px] text-[#9E9EB8] uppercase font-heading font-extrabold tracking-wider block">Indian Core</span>
          <div className="text-xl font-number font-extrabold text-white mt-1">
            {indianCount}
          </div>
          <span className="text-[10px] text-[#62658A] mt-0.5 block">Domestic players</span>
        </div>

        <div className="bg-[#12142A] border border-[#23274D] rounded-2xl p-4 shadow-md">
          <span className="text-[10px] text-[#9E9EB8] uppercase font-heading font-extrabold tracking-wider block">Avg Cost</span>
          <div className="text-xl font-number font-extrabold text-[#C8FF3D] mt-1">
            ₹{(avgPrice / 10000000).toFixed(2)} Cr
          </div>
          <span className="text-[10px] text-[#62658A] mt-0.5 block">Per squad buy</span>
        </div>

        <div className="bg-[#12142A] border border-[#23274D] rounded-2xl p-4 shadow-md">
          <span className="text-[10px] text-[#9E9EB8] uppercase font-heading font-extrabold tracking-wider block">Top Buy</span>
          <div className="text-sm font-heading font-bold text-white uppercase truncate mt-1">
            {mostExpensive ? mostExpensive.player.name : '—'}
          </div>
          <span className="text-[10px] text-[#C8FF3D] font-number font-bold mt-0.5 block">
            {mostExpensive ? `₹${(mostExpensive.price / 10000000).toFixed(2)} Cr` : '—'}
          </span>
        </div>

        <div className="bg-[#12142A] border border-[#23274D] rounded-2xl p-4 shadow-md">
          <span className="text-[10px] text-[#9E9EB8] uppercase font-heading font-extrabold tracking-wider block">Purse Reserve</span>
          <div className="flex items-center gap-1 text-sm font-heading font-bold mt-1 uppercase">
            {isFeasible ? (
              <span className="text-[#C8FF3D] flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Feasible
              </span>
            ) : (
              <span className="text-[#FF3B5C] flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Deficit
              </span>
            )}
          </div>
          <span className="text-[10px] text-[#62658A] mt-0.5 block font-number">
            ₹{(minSpendRequired / 10000000).toFixed(2)} Cr needed
          </span>
        </div>
      </div>

      {/* OVR Rating Performance & Balance Banner */}
      <div className="bg-[#12142A] border border-[#23274D] rounded-3xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0A0B14] border border-[#C8FF3D]/30 flex items-center justify-center text-[#C8FF3D] font-heading font-black text-sm">
            ★
          </div>
          <div>
            <span className="text-[10px] text-[#9E9EB8] uppercase tracking-wider font-heading font-extrabold block">
              Franchise Rating Balance
            </span>
            <span className="text-sm font-heading font-bold text-white uppercase">
              {squad.length > 0 ? `Squad Average: ${avgSquadOvr} OVR` : 'No players in squad yet'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap text-xs">
          {highestOvr && (
            <div className="bg-[#0A0B14] border border-[#23274D] px-3.5 py-2 rounded-xl flex items-center gap-2.5">
              <div>
                <span className="text-[9px] text-[#C8FF3D] font-heading font-extrabold uppercase block">Highest Rated</span>
                <span className="font-heading font-bold text-white text-xs uppercase truncate max-w-[120px] block">{highestOvr.name}</span>
              </div>
              <OvrBadge ovr={highestOvr.ovr} size="sm" />
            </div>
          )}

          {lowestOvr && (
            <div className="bg-[#0A0B14] border border-[#23274D] px-3.5 py-2 rounded-xl flex items-center gap-2.5">
              <div>
                <span className="text-[9px] text-[#9E9EB8] font-heading font-extrabold uppercase block">Lowest Rated</span>
                <span className="font-heading font-bold text-[#B0BED0] text-xs uppercase truncate max-w-[120px] block">{lowestOvr.name}</span>
              </div>
              <OvrBadge ovr={lowestOvr.ovr} size="sm" />
            </div>
          )}
        </div>
      </div>

      {/* Role Composition Progress Bars */}
      <div className="bg-[#12142A] border border-[#23274D] rounded-3xl p-6 shadow-xl">
        <h3 className="font-heading font-black text-sm text-white mb-4 uppercase tracking-wide">
          Squad Role Composition
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-[#0A0B14] p-4 rounded-2xl border border-[#23274D]">
            <div className="flex justify-between text-xs mb-2 font-heading font-extrabold uppercase">
              <span className="text-[#9E9EB8] flex items-center gap-1.5">
                <BatIcon className="w-3.5 h-3.5 text-[#C8FF3D]" /> Batters:
              </span>
              <span className="font-number font-extrabold text-[#C8FF3D]">{batters.length}</span>
            </div>
            <div className="h-2 bg-[#181B38] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#C8FF3D]"
                style={{ width: `${Math.min(100, (batters.length / 6) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-[#62658A] mt-1.5">
              <span>Target: 5-7</span>
              {teamStat?.roleOvrBalance?.battersAvgOvr ? (
                <span className="text-[#C8FF3D] font-bold">Avg {teamStat.roleOvrBalance.battersAvgOvr} OVR</span>
              ) : null}
            </div>
          </div>

          <div className="bg-[#0A0B14] p-4 rounded-2xl border border-[#23274D]">
            <div className="flex justify-between text-xs mb-2 font-heading font-extrabold uppercase">
              <span className="text-[#9E9EB8] flex items-center gap-1.5">
                <BallIcon className="w-3.5 h-3.5 text-[#FF3B5C]" /> Bowlers:
              </span>
              <span className="font-number font-extrabold text-[#FF3B5C]">{bowlers.length}</span>
            </div>
            <div className="h-2 bg-[#181B38] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FF3B5C]"
                style={{ width: `${Math.min(100, (bowlers.length / 6) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-[#62658A] mt-1.5">
              <span>Target: 5-7</span>
              {teamStat?.roleOvrBalance?.bowlersAvgOvr ? (
                <span className="text-[#FF3B5C] font-bold">Avg {teamStat.roleOvrBalance.bowlersAvgOvr} OVR</span>
              ) : null}
            </div>
          </div>

          <div className="bg-[#0A0B14] p-4 rounded-2xl border border-[#23274D]">
            <div className="flex justify-between text-xs mb-2 font-heading font-extrabold uppercase">
              <span className="text-[#9E9EB8] flex items-center gap-1.5">
                <CoinsIcon className="w-3.5 h-3.5 text-[#FFC93D]" /> All-Rounders:
              </span>
              <span className="font-number font-extrabold text-[#FFC93D]">{allRounders.length}</span>
            </div>
            <div className="h-2 bg-[#181B38] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FFC93D]"
                style={{ width: `${Math.min(100, (allRounders.length / 4) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-[#62658A] mt-1.5">
              <span>Target: 3-5</span>
              {teamStat?.roleOvrBalance?.allRoundersAvgOvr ? (
                <span className="text-[#FFC93D] font-bold">Avg {teamStat.roleOvrBalance.allRoundersAvgOvr} OVR</span>
              ) : null}
            </div>
          </div>

          <div className="bg-[#0A0B14] p-4 rounded-2xl border border-[#23274D]">
            <div className="flex justify-between text-xs mb-2 font-heading font-extrabold uppercase">
              <span className="text-[#9E9EB8] flex items-center gap-1.5">
                <StumpsIcon className="w-3.5 h-3.5 text-[#7C5CFF]" /> WKs:
              </span>
              <span className="font-number font-extrabold text-[#7C5CFF]">{wicketKeepers.length}</span>
            </div>
            <div className="h-2 bg-[#181B38] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#7C5CFF]"
                style={{ width: `${Math.min(100, (wicketKeepers.length / 2) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-[#62658A] mt-1.5">
              <span>Target: 2</span>
              {teamStat?.roleOvrBalance?.wicketKeepersAvgOvr ? (
                <span className="text-[#7C5CFF] font-bold">Avg {teamStat.roleOvrBalance.wicketKeepersAvgOvr} OVR</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* In-Squad Search & Filters */}
      <div className="bg-[#12142A] border border-[#23274D] rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h3 className="font-heading font-black text-base text-white flex items-center gap-2 uppercase tracking-wide">
            <span>Acquired Squad</span>
            <span className="text-xs font-number font-bold text-[#C8FF3D] bg-[#0A0B14] px-3 py-1 rounded-lg border border-[#C8FF3D]/30">
              {squad.length} Players
            </span>
          </h3>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-[#9E9EB8] absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="Search player or country..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0A0B14] border border-[#23274D] text-white text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-[#C8FF3D] placeholder-[#62658A]"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="bg-[#0A0B14] border border-[#23274D] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#C8FF3D] font-heading font-bold uppercase"
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
              className="bg-[#0A0B14] border border-[#23274D] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#C8FF3D] font-heading font-bold uppercase"
            >
              <option value="ALL">All Nationalities</option>
              <option value="INDIAN">Indian Only (🇮🇳)</option>
              <option value="OVERSEAS">Overseas Only (✈)</option>
            </select>
          </div>
        </div>

        {/* Players List */}
        {squad.length === 0 ? (
          <div className="py-16 text-center text-[#9E9EB8]">
            <Shield className="w-12 h-12 text-[#23274D] mx-auto mb-3" />
            <p className="text-sm font-heading font-extrabold uppercase text-white">No players acquired yet</p>
            <p className="text-xs text-[#62658A] mt-1">Bid in the live Auction Arena to start building your XI.</p>
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="py-10 text-center text-[#9E9EB8]">
            <p className="text-xs">No squad members match the selected search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#23274D] text-[#9E9EB8] font-heading font-extrabold uppercase tracking-wider">
                  <th className="pb-3.5 pl-3">#</th>
                  <th className="pb-3.5">Player</th>
                  <th className="pb-3.5 text-center">OVR</th>
                  <th className="pb-3.5">Role</th>
                  <th className="pb-3.5">Nationality</th>
                  <th className="pb-3.5">Base Price</th>
                  <th className="pb-3.5 pr-3 text-right">Bought For</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#23274D]">
                {filteredPurchases.map(({ player: p, price }, idx) => (
                  <tr key={p.id} className="hover:bg-[#181B38]/50 transition-colors">
                    <td className="py-3.5 pl-3 font-number text-[#9E9EB8]">{idx + 1}</td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#0A0B14] border border-[#23274D] overflow-hidden flex items-center justify-center shrink-0">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover object-top" />
                          ) : (
                            <span className="font-heading font-bold text-xs text-[#C8FF3D]">{p.name.slice(0, 2)}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-heading font-bold uppercase text-white flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {p.is_marquee && (
                              <span className="text-[9px] bg-[#FFC93D]/15 text-[#FFC93D] px-1.5 py-0.5 rounded font-extrabold border border-[#FFC93D]/40 uppercase">
                                MARQUEE
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#9E9EB8]">{p.primary_role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 text-center">
                      <OvrBadge ovr={p.ovr} size="sm" />
                    </td>
                    <td className="py-3.5">
                      <span className="bg-[#0A0B14] border border-[#23274D] px-2.5 py-1 rounded-lg text-white font-heading font-bold uppercase text-[11px]">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3.5">
                      {p.is_overseas ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#7C5CFF] font-semibold bg-[#0A0B14] border border-[#23274D] px-2.5 py-1 rounded-lg">
                          <Plane className="w-3 h-3" /> {p.nationality}
                        </span>
                      ) : (
                        <span className="text-[#9E9EB8] font-medium text-xs flex items-center gap-1">
                          <span>🇮🇳</span> {p.nationality}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 font-number text-[#9E9EB8]">{p.base_price_display}</td>
                    <td className="py-3.5 pr-3 font-number font-extrabold text-[#C8FF3D] text-right text-sm">
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
