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
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5 animate-fadeIn font-body">
        {/* Back Button & Team Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedTeamId(null)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-[#E6EDF8] border border-[#D8D8D1] text-xs font-heading font-bold uppercase tracking-wider text-[#173B78] transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-[#173B78]" />
            <span>Back to All 10 Teams</span>
          </button>

          {isMyTeam && (
            <span className="text-xs font-heading font-bold uppercase tracking-wider text-[#176B48] bg-[#176B48]/10 border border-[#176B48]/30 px-3 py-1 rounded-full">
              Your Managed Franchise
            </span>
          )}
        </div>

        {/* Team Banner */}
        <div className="bg-white border border-[#D8D8D1] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <TeamLogo teamId={selectedTeamId} className="w-16 h-16 shadow-sm" />

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#176B48] font-heading font-bold uppercase tracking-wider">
                  MANAGER: {manager ? manager.nickname : 'Vacant'} {manager?.isBot ? '(AI BOT)' : ''}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-heading uppercase text-[#18243A]">
                {team.name}
              </h1>
              <p className="text-xs text-[#647084] mt-0.5">
                {team.city} · {team.emblemText}
              </p>
            </div>
          </div>

          {/* Purse Summary Box */}
          <div className="bg-[#E6EDF8] border border-[#D8D8D1] rounded-xl p-3.5 flex items-center gap-5 text-xs">
            <div>
              <span className="text-[10px] text-[#647084] uppercase font-heading font-bold block">Purse Left</span>
              <span className="text-xl font-number font-bold text-[#176B48]">
                ₹{(purse / 10000000).toFixed(2)} Cr
              </span>
            </div>
            <div className="h-8 w-px bg-[#D8D8D1]" />
            <div>
              <span className="text-[10px] text-[#647084] uppercase font-heading font-bold block">Total Spent</span>
              <span className="text-xl font-number font-bold text-[#173B78]">
                ₹{(spent / 10000000).toFixed(2)} Cr
              </span>
            </div>
          </div>
        </div>

        {/* Squad Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
          <div className="bg-white border border-[#D8D8D1] rounded-xl p-3 shadow-sm">
            <span className="text-[10px] text-[#647084] uppercase font-heading font-bold tracking-wider block">Squad Count</span>
            <span className="text-lg font-number font-bold text-[#18243A] mt-0.5 block">
              {squad.length} / {maxSquad}
            </span>
            <span className="text-[10px] text-[#647084]">Min: {minSquad}</span>
          </div>

          <div className="bg-white border border-[#D8D8D1] rounded-xl p-3 shadow-sm">
            <span className="text-[10px] text-[#647084] uppercase font-heading font-bold tracking-wider block">Overseas</span>
            <span className={`text-lg font-number font-bold mt-0.5 block ${overseasCount >= maxOverseas ? 'text-[#C74444]' : 'text-[#176B48]'}`}>
              {overseasCount} / {maxOverseas}
            </span>
            <span className="text-[10px] text-[#647084]">
              {overseasCount >= maxOverseas ? 'LIMIT REACHED' : `${remainingOverseasSlots} slots left`}
            </span>
          </div>

          <div className="bg-white border border-[#D8D8D1] rounded-xl p-3 shadow-sm">
            <span className="text-[10px] text-[#647084] uppercase font-heading font-bold tracking-wider block">Indian Players</span>
            <span className="text-lg font-number font-bold text-[#18243A] mt-0.5 block">
              {indianCount}
            </span>
            <span className="text-[10px] text-[#647084]">Domestic squad</span>
          </div>

          <div className="bg-white border border-[#D8D8D1] rounded-xl p-3 shadow-sm">
            <span className="text-[10px] text-[#647084] uppercase font-heading font-bold tracking-wider block">Batters / WK</span>
            <span className="text-lg font-number font-bold text-[#18243A] mt-0.5 block">
              {batters} / {wks}
            </span>
            <span className="text-[10px] text-[#647084]">Specialists</span>
          </div>

          <div className="bg-white border border-[#D8D8D1] rounded-xl p-3 shadow-sm">
            <span className="text-[10px] text-[#647084] uppercase font-heading font-bold tracking-wider block">Bowlers / AR</span>
            <span className="text-lg font-number font-bold text-[#18243A] mt-0.5 block">
              {bowlers} / {allRounders}
            </span>
            <span className="text-[10px] text-[#647084]">Attack unit</span>
          </div>

          <div className="bg-white border border-[#D8D8D1] rounded-xl p-3 shadow-sm">
            <span className="text-[10px] text-[#647084] uppercase font-heading font-bold tracking-wider block">Status</span>
            <span className="text-sm font-heading font-bold text-[#167447] mt-1 flex items-center gap-1 uppercase">
              <CheckCircle className="w-3.5 h-3.5" /> Verified
            </span>
            <span className="text-[10px] text-[#647084]">Authoritative</span>
          </div>
        </div>

        {/* Full Purchased Squad Table */}
        <div className="bg-white border border-[#D8D8D1] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-bold text-sm text-[#18243A] flex items-center gap-2 uppercase tracking-wide">
              <span>Purchased Squad ({squad.length} Players)</span>
            </h3>
            <span className="text-[11px] text-[#647084]">Showing exact final sold prices</span>
          </div>

          {squad.length === 0 ? (
            <div className="py-12 text-center text-[#647084]">
              <p className="text-sm font-heading font-bold uppercase text-[#18243A]">No players acquired yet by {team.name}</p>
              <p className="text-xs text-[#647084] mt-1">Players bought by this franchise will appear here in real time.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#D8D8D1] text-[#647084] font-heading font-bold uppercase tracking-wider text-[11px]">
                    <th className="pb-3 pl-3">#</th>
                    <th className="pb-3">Player</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Classification</th>
                    <th className="pb-3">Base Price</th>
                    <th className="pb-3 pr-3 text-right">ACTUAL SOLD PRICE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8D8D1]">
                  {purchasesWithPrice.map(({ player: p, price }, idx) => (
                    <tr key={p.id} className="hover:bg-[#E6EDF8]/30 transition-colors">
                      <td className="py-3 pl-3 font-number text-[#647084]">{idx + 1}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#E6EDF8] border border-[#D8D8D1] overflow-hidden flex items-center justify-center shrink-0">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover object-top" />
                            ) : (
                              <span className="font-heading font-bold text-[10px] text-[#173B78]">{p.name.slice(0, 2)}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-heading font-bold uppercase text-[#18243A] flex items-center gap-1.5">
                              <span>{p.name}</span>
                              {p.is_marquee && (
                                <span className="text-[9px] bg-[#F0C65B]/20 text-[#B8860B] px-1.5 py-0.2 rounded font-bold border border-[#F0C65B]/40">
                                  MARQUEE
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#647084]">{p.primary_role}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="bg-[#F3F0E8] border border-[#D8D8D1] px-2 py-0.5 rounded text-[11px] text-[#18243A] font-heading font-bold uppercase">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3">
                        {p.is_overseas ? (
                          <span className="text-[#173B78] bg-[#E6EDF8] border border-[#D8D8D1] px-2 py-0.5 rounded inline-flex items-center gap-1 text-[11px] font-semibold">
                            <Plane className="w-2.5 h-2.5" /> {p.nationality}
                          </span>
                        ) : (
                          <span className="text-[#647084] text-[11px] flex items-center gap-1">
                            <span>🇮🇳</span> {p.nationality}
                          </span>
                        )}
                      </td>
                      <td className="py-3 font-number text-[#647084]">
                        {p.base_price_display}
                      </td>
                      <td className="py-3 pr-3 text-right">
                        <span className="font-number font-bold text-sm text-[#167447] bg-[#167447]/10 border border-[#167447]/20 px-2.5 py-0.5 rounded">
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
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5 font-body">
      {/* Header */}
      <div className="bg-white border border-[#D8D8D1] rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading uppercase tracking-wide text-[#18243A]">
            10 Franchise Matrix
          </h1>
          <p className="text-xs text-[#647084] mt-0.5">
            Click any team to inspect its full purchased roster, spending details, and overseas slots.
          </p>
        </div>

        <div className="flex items-center gap-2.5 text-xs font-heading font-bold uppercase">
          <span className="flex items-center gap-1.5 text-[#173B78] bg-[#E6EDF8] border border-[#D8D8D1] px-3 py-1.5 rounded-full">
            <Users className="w-3.5 h-3.5 text-[#176B48]" />
            Squad: <span className="font-number">{minSquad}-{maxSquad}</span>
          </span>
          <span className="flex items-center gap-1.5 text-[#173B78] bg-[#E6EDF8] border border-[#D8D8D1] px-3 py-1.5 rounded-full">
            <Plane className="w-3.5 h-3.5 text-[#173B78]" />
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
              className={`bg-white rounded-xl p-4 border transition-all cursor-pointer flex flex-col justify-between hover:border-[#173B78] hover:bg-[#E6EDF8]/30 group relative shadow-sm ${
                isMyTeam
                  ? 'border-[#176B48] ring-1 ring-[#176B48]/30 shadow-md'
                  : 'border-[#D8D8D1]'
              }`}
            >
              <div>
                {/* Team Logo & Manager Tag */}
                <div className="flex items-start justify-between mb-2.5">
                  <TeamLogo teamId={teamId} className="w-11 h-11 shadow-sm shrink-0" />

                  {manager?.isBot ? (
                    <span className="text-[10px] font-heading font-bold uppercase bg-[#E6EDF8] text-[#173B78] border border-[#D8D8D1] px-2 py-0.5 rounded flex items-center gap-1">
                      <Bot className="w-2.5 h-2.5" /> BOT
                    </span>
                  ) : manager ? (
                    <span className="text-[10px] font-heading font-bold uppercase bg-[#176B48]/10 text-[#176B48] border border-[#176B48]/30 px-2 py-0.5 rounded">
                      HUMAN
                    </span>
                  ) : (
                    <span className="text-[10px] font-heading font-bold uppercase bg-[#F3F0E8] text-[#647084] border border-[#D8D8D1] px-2 py-0.5 rounded">
                      VACANT
                    </span>
                  )}
                </div>

                <h3 className="font-heading font-bold text-sm text-[#18243A] leading-tight uppercase">
                  {team.name}
                </h3>
                <p className="text-[11px] text-[#647084] truncate mt-0.5">
                  {manager ? manager.nickname : 'No manager'}
                  {isMyTeam && <strong className="text-[#176B48] ml-1">(You)</strong>}
                </p>

                {/* Purse Metrics */}
                <div className="my-2.5 py-2 px-2.5 bg-[#F3F0E8] border border-[#D8D8D1] rounded-lg space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[#647084] font-heading font-bold uppercase text-[10px]">Purse Left:</span>
                    <span className="font-number font-bold text-[#176B48]">
                      ₹{(purse / 10000000).toFixed(2)} Cr
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-[#647084] font-heading font-bold uppercase text-[10px]">Spent:</span>
                    <span className="font-number font-bold text-[#173B78]">
                      ₹{(spent / 10000000).toFixed(2)} Cr
                    </span>
                  </div>
                </div>

                {/* Squad Counts */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-[#18243A]">
                    <span className="text-[#647084] font-heading font-bold uppercase text-[10px]">Squad:</span>
                    <span className="font-number font-bold text-[#18243A]">
                      {squad.length} / {maxSquad}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#18243A]">
                    <span className="text-[#647084] font-heading font-bold uppercase text-[10px]">Overseas:</span>
                    <span className={`font-number font-bold ${overseas >= maxOverseas ? 'text-[#C74444]' : 'text-[#176B48]'}`}>
                      {overseas} / {maxOverseas}
                      {overseas >= maxOverseas && <span className="ml-1 text-[10px] text-[#C74444] font-heading uppercase">(MAX)</span>}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom: Click to View Squad */}
              <div className="pt-2.5 mt-2.5 border-t border-[#D8D8D1] text-[11px] flex items-center justify-between">
                <span className="text-[#647084] font-number">
                  {squad.length} players bought
                </span>
                <span className="text-[#173B78] font-heading font-bold uppercase inline-flex items-center gap-0.5 group-hover:underline">
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
