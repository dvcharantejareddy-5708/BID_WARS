import React, { useState } from 'react';
import { 
  Shield, 
  Users, 
  Coins, 
  Globe, 
  Bot, 
  CheckCircle, 
  AlertCircle,
  ArrowLeft,
  Plane,
  Tag,
  Trophy,
  ExternalLink
} from 'lucide-react';
import { RoomState, IPLTeamId, IPL_FRANCHISES, Player } from '../types.js';
import { TeamLogo } from './TeamLogo.js';

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

  // Selected team for dedicated squad dashboard
  const [selectedTeamId, setSelectedTeamId] = useState<IPLTeamId | null>(null);

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

  // If a team is selected, show its Dedicated Squad Dashboard
  if (selectedTeamId) {
    const team = IPL_FRANCHISES[selectedTeamId];
    const manager = managers[selectedTeamId];
    const squad = roomState.teamSquads[selectedTeamId] || [];
    const purse = roomState.teamPurse[selectedTeamId] || 0;
    const spent = startingPurse - purse;
    const overseasCount = squad.filter(p => p.is_overseas).length;
    const indianCount = squad.filter(p => !p.is_overseas).length;
    const remainingOverseasSlots = Math.max(0, maxOverseas - overseasCount);
    const isMyTeam = myMember?.teamId === selectedTeamId;

    const purchasesWithPrice = squad.map(p => {
      const lotHistory = roomState.history.find(h => h.player.id === p.id && h.winningTeam === selectedTeamId);
      return {
        player: p,
        price: lotHistory?.soldPrice || p.sold_price_inr || p.base_price_inr
      };
    });

    const batters = squad.filter(p => p.primary_role === 'BATTER' && !p.is_wicketkeeper).length;
    const bowlers = squad.filter(p => p.primary_role === 'BOWLER').length;
    const allRounders = squad.filter(p => p.primary_role === 'ALL_ROUNDER').length;
    const wks = squad.filter(p => p.is_wicketkeeper).length;

    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5 animate-fadeIn selection:bg-[#C8FF45] selection:text-black">
        {/* Back Button & Team Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedTeamId(null)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0E1626] hover:bg-[#1B2942] border border-[#26354D] text-xs font-heading font-bold uppercase tracking-wider text-[#F4F7FC] transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-[#C8FF45]" />
            <span>Back to All 10 Teams</span>
          </button>

          {isMyTeam && (
            <span className="text-xs font-heading font-black uppercase tracking-wider text-[#C8FF45] bg-[#C8FF45]/10 border border-[#C8FF45]/20 px-3 py-1 rounded-full">
              Your Managed Franchise
            </span>
          )}
        </div>

        {/* Team Banner */}
        <div className="bg-[#141F33] border border-[#26354D] rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <TeamLogo teamId={selectedTeamId} className="w-16 h-16 shadow-xl" />

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#C8FF45] font-heading font-black uppercase tracking-wider">
                  MANAGER: {manager ? manager.nickname : 'Vacant'} {manager?.isBot ? '(AI BOT)' : ''}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-heading uppercase text-[#F4F7FC]">
                {team.name}
              </h1>
              <p className="text-xs text-[#9BAAC0] mt-0.5">
                {team.city} · {team.emblemText}
              </p>
            </div>
          </div>

          {/* Purse Summary Box */}
          <div className="bg-[#0E1626] border border-[#26354D] rounded-2xl p-3.5 flex items-center gap-5 text-xs">
            <div>
              <span className="text-[10px] text-[#9BAAC0] uppercase font-heading font-bold block">Purse Left</span>
              <span className="text-xl font-number font-black text-[#C8FF45]">
                ₹{(purse / 10000000).toFixed(2)} Cr
              </span>
            </div>
            <div className="h-8 w-px bg-[#26354D]" />
            <div>
              <span className="text-[10px] text-[#9BAAC0] uppercase font-heading font-bold block">Total Spent</span>
              <span className="text-xl font-number font-black text-[#54C8FF]">
                ₹{(spent / 10000000).toFixed(2)} Cr
              </span>
            </div>
          </div>
        </div>

        {/* Squad Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
          <div className="bg-[#141F33] border border-[#26354D] rounded-xl p-3">
            <span className="text-[10px] text-[#9BAAC0] uppercase font-heading font-bold tracking-wider block">Squad Count</span>
            <span className="text-lg font-number font-black text-[#F4F7FC] mt-0.5 block">
              {squad.length} / {maxSquad}
            </span>
            <span className="text-[10px] text-[#9BAAC0]">Min: {minSquad}</span>
          </div>

          <div className="bg-[#141F33] border border-[#26354D] rounded-xl p-3">
            <span className="text-[10px] text-[#9BAAC0] uppercase font-heading font-bold tracking-wider block">Overseas</span>
            <span className={`text-lg font-number font-black mt-0.5 block ${overseasCount >= maxOverseas ? 'text-[#FF647C]' : 'text-[#43D995]'}`}>
              {overseasCount} / {maxOverseas}
            </span>
            <span className="text-[10px] text-[#9BAAC0]">
              {overseasCount >= maxOverseas ? 'LIMIT REACHED' : `${remainingOverseasSlots} slots left`}
            </span>
          </div>

          <div className="bg-[#141F33] border border-[#26354D] rounded-xl p-3">
            <span className="text-[10px] text-[#9BAAC0] uppercase font-heading font-bold tracking-wider block">Indian Players</span>
            <span className="text-lg font-number font-black text-[#F4F7FC] mt-0.5 block">
              {indianCount}
            </span>
            <span className="text-[10px] text-[#9BAAC0]">Domestic squad</span>
          </div>

          <div className="bg-[#141F33] border border-[#26354D] rounded-xl p-3">
            <span className="text-[10px] text-[#9BAAC0] uppercase font-heading font-bold tracking-wider block">Batters / WK</span>
            <span className="text-lg font-number font-black text-[#F4F7FC] mt-0.5 block">
              {batters} / {wks}
            </span>
            <span className="text-[10px] text-[#9BAAC0]">Specialists</span>
          </div>

          <div className="bg-[#141F33] border border-[#26354D] rounded-xl p-3">
            <span className="text-[10px] text-[#9BAAC0] uppercase font-heading font-bold tracking-wider block">Bowlers / AR</span>
            <span className="text-lg font-number font-black text-[#F4F7FC] mt-0.5 block">
              {bowlers} / {allRounders}
            </span>
            <span className="text-[10px] text-[#9BAAC0]">Attack unit</span>
          </div>

          <div className="bg-[#141F33] border border-[#26354D] rounded-xl p-3">
            <span className="text-[10px] text-[#9BAAC0] uppercase font-heading font-bold tracking-wider block">Status</span>
            <span className="text-sm font-heading font-black text-[#43D995] mt-1 flex items-center gap-1 uppercase">
              <CheckCircle className="w-3.5 h-3.5" /> Verified
            </span>
            <span className="text-[10px] text-[#9BAAC0]">Authoritative</span>
          </div>
        </div>

        {/* Full Purchased Squad Table */}
        <div className="bg-[#141F33] border border-[#26354D] rounded-2xl p-5 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-black text-sm text-[#F4F7FC] flex items-center gap-2 uppercase tracking-wide">
              <span>Purchased Squad ({squad.length} Players)</span>
            </h3>
            <span className="text-[11px] text-[#9BAAC0]">Showing exact final sold prices</span>
          </div>

          {squad.length === 0 ? (
            <div className="py-12 text-center text-[#9BAAC0]">
              <p className="text-sm font-heading font-bold uppercase text-[#F4F7FC]">No players acquired yet by {team.name}</p>
              <p className="text-xs text-[#9BAAC0] mt-1">Players bought by this franchise will appear here in real time.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#26354D] text-[#9BAAC0] font-heading font-bold uppercase tracking-wider text-[11px]">
                    <th className="pb-3 pl-3">#</th>
                    <th className="pb-3">Player</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Classification</th>
                    <th className="pb-3">Base Price</th>
                    <th className="pb-3 pr-3 text-right">ACTUAL SOLD PRICE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#26354D]">
                  {purchasesWithPrice.map(({ player: p, price }, idx) => (
                    <tr key={p.id} className="hover:bg-[#1B2942]/50 transition-colors">
                      <td className="py-3 pl-3 font-number text-[#9BAAC0]">{idx + 1}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#0E1626] border border-[#26354D] overflow-hidden flex items-center justify-center shrink-0">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover object-top" />
                            ) : (
                              <span className="font-heading font-black text-[10px] text-[#C8FF45]">{p.name.slice(0, 2)}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-heading font-black uppercase text-[#F4F7FC] flex items-center gap-1.5">
                              <span>{p.name}</span>
                              {p.is_marquee && (
                                <span className="text-[9px] bg-[#FFC857]/20 text-[#FFC857] px-1.5 py-0.2 rounded font-black border border-[#FFC857]/40">
                                  MARQUEE
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#9BAAC0]">{p.primary_role}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="bg-[#0E1626] border border-[#26354D] px-2 py-0.5 rounded text-[11px] text-[#F4F7FC] font-heading font-bold uppercase">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3">
                        {p.is_overseas ? (
                          <span className="text-[#43D995] bg-[#43D995]/10 border border-[#43D995]/20 px-2 py-0.5 rounded-full inline-flex items-center gap-1 text-[11px] font-semibold">
                            <Plane className="w-2.5 h-2.5" /> {p.nationality}
                          </span>
                        ) : (
                          <span className="text-[#9BAAC0] text-[11px] flex items-center gap-1">
                            <span>🇮🇳</span> {p.nationality}
                          </span>
                        )}
                      </td>
                      <td className="py-3 font-number text-[#9BAAC0]">
                        {p.base_price_display}
                      </td>
                      <td className="py-3 pr-3 text-right">
                        <span className="font-number font-black text-sm text-[#C8FF45] bg-[#C8FF45]/10 border border-[#C8FF45]/20 px-2.5 py-0.5 rounded-full">
                          ₹{(price / 10000000).toFixed(2)} Cr
                        </span>
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
  }

  // ALL TEAMS 10-FRANCHISE OVERVIEW
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5 selection:bg-[#C8FF45] selection:text-black">
      {/* Header */}
      <div className="bg-[#141F33] border border-[#26354D] rounded-2xl p-5 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black font-heading uppercase tracking-wide text-[#F4F7FC]">
            10 Franchise Matrix
          </h1>
          <p className="text-xs text-[#9BAAC0] mt-0.5">
            Click any team to inspect its full purchased roster, spending details, and overseas slots.
          </p>
        </div>

        <div className="flex items-center gap-2.5 text-xs font-heading font-bold uppercase">
          <span className="flex items-center gap-1.5 text-[#F4F7FC] bg-[#0E1626] border border-[#26354D] px-3 py-1.5 rounded-full">
            <Users className="w-3.5 h-3.5 text-[#C8FF45]" />
            Squad: <span className="font-number">{minSquad}-{maxSquad}</span>
          </span>
          <span className="flex items-center gap-1.5 text-[#F4F7FC] bg-[#0E1626] border border-[#26354D] px-3 py-1.5 rounded-full">
            <Plane className="w-3.5 h-3.5 text-[#54C8FF]" />
            Max Overseas: <span className="font-number">8</span>
          </span>
        </div>
      </div>

      {/* Grid of all 10 franchises (Compact Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {allTeams.map((teamId) => {
          const team = IPL_FRANCHISES[teamId];
          const manager = managers[teamId];
          const squad = roomState.teamSquads[teamId] || [];
          const purse = roomState.teamPurse[teamId] || 0;
          const spent = startingPurse - purse;
          const overseas = squad.filter(p => p.is_overseas).length;
          const isMyTeam = myMember?.teamId === teamId;

          return (
            <div
              key={teamId}
              onClick={() => setSelectedTeamId(teamId)}
              className={`bg-[#141F33] rounded-2xl p-4 border transition-all cursor-pointer flex flex-col justify-between hover:border-[#C8FF45] hover:bg-[#1B2942] group relative shadow-lg ${
                isMyTeam
                  ? 'border-[#C8FF45] shadow-[0_0_15px_rgba(200,255,69,0.2)]'
                  : 'border-[#26354D]'
              }`}
            >
              <div>
                {/* Team Logo & Manager Tag */}
                <div className="flex items-start justify-between mb-2.5">
                  <TeamLogo teamId={teamId} className="w-11 h-11 shadow-md shrink-0" />

                  {manager?.isBot ? (
                    <span className="text-[10px] font-heading font-black uppercase bg-[#54C8FF]/20 text-[#54C8FF] border border-[#54C8FF]/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Bot className="w-2.5 h-2.5" /> BOT
                    </span>
                  ) : manager ? (
                    <span className="text-[10px] font-heading font-black uppercase bg-[#C8FF45]/20 text-[#C8FF45] border border-[#C8FF45]/30 px-2 py-0.5 rounded-full">
                      HUMAN
                    </span>
                  ) : (
                    <span className="text-[10px] font-heading font-bold uppercase bg-[#0E1626] text-[#9BAAC0] border border-[#26354D] px-2 py-0.5 rounded-full">
                      VACANT
                    </span>
                  )}
                </div>

                <h3 className="font-heading font-black text-sm text-[#F4F7FC] leading-tight uppercase">
                  {team.name}
                </h3>
                <p className="text-[11px] text-[#9BAAC0] truncate mt-0.5">
                  {manager ? manager.nickname : 'No manager'}
                  {isMyTeam && <strong className="text-[#C8FF45] ml-1">(You)</strong>}
                </p>

                {/* Purse Metrics */}
                <div className="my-2.5 py-2 px-2.5 bg-[#0E1626] border border-[#26354D] rounded-xl space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[#9BAAC0] font-heading font-bold uppercase text-[10px]">Purse Left:</span>
                    <span className="font-number font-black text-[#C8FF45]">
                      ₹{(purse / 10000000).toFixed(2)} Cr
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-[#9BAAC0] font-heading font-bold uppercase text-[10px]">Spent:</span>
                    <span className="font-number font-black text-[#54C8FF]">
                      ₹{(spent / 10000000).toFixed(2)} Cr
                    </span>
                  </div>
                </div>

                {/* Squad Counts */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-[#F4F7FC]">
                    <span className="text-[#9BAAC0] font-heading font-bold uppercase text-[10px]">Squad:</span>
                    <span className="font-number font-black text-[#F4F7FC]">
                      {squad.length} / {maxSquad}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#F4F7FC]">
                    <span className="text-[#9BAAC0] font-heading font-bold uppercase text-[10px]">Overseas:</span>
                    <span className={`font-number font-black ${overseas >= maxOverseas ? 'text-[#FF647C]' : 'text-[#43D995]'}`}>
                      {overseas} / {maxOverseas}
                      {overseas >= maxOverseas && <span className="ml-1 text-[10px] text-[#FF647C] font-heading uppercase">(MAX)</span>}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom: Click to View Squad */}
              <div className="pt-2.5 mt-2.5 border-t border-[#26354D] text-[11px] flex items-center justify-between">
                <span className="text-[#9BAAC0] font-number">
                  {squad.length} players bought
                </span>
                <span className="text-[#C8FF45] font-heading font-bold uppercase inline-flex items-center gap-0.5 group-hover:underline">
                  <span>View Squad</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
