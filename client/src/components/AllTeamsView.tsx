import React, { useState } from 'react';
import { 
  Users, 
  Bot, 
  CheckCircle, 
  ArrowLeft,
  Plane,
  ExternalLink
} from 'lucide-react';
import { RoomState, IPLTeamId, IPL_FRANCHISES } from '../types.js';
import { TeamLogo } from './TeamLogo.js';
import { OvrBadge } from './OvrBadge.js';

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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#12142A] hover:bg-[#181B38] border border-[#23274D] text-xs font-heading font-extrabold uppercase tracking-wider text-[#C8FF3D] transition-all shadow-md"
          >
            <ArrowLeft className="w-4 h-4 text-[#C8FF3D]" />
            <span>Back to All 10 Teams</span>
          </button>

          {isMyTeam && (
            <span className="text-xs font-heading font-extrabold uppercase tracking-wider text-[#C8FF3D] bg-[#C8FF3D]/10 border border-[#C8FF3D]/30 px-3 py-1 rounded-full">
              Your Managed Franchise
            </span>
          )}
        </div>

        {/* Team Banner */}
        <div className="bg-[#12142A] border border-[#23274D] rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <TeamLogo teamId={selectedTeamId} className="w-16 h-16 drop-shadow-md" />

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#C8FF3D] font-heading font-extrabold uppercase tracking-wider">
                  MANAGER: {manager ? manager.nickname : 'Vacant'} {manager?.isBot ? '(AI BOT)' : ''}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-heading uppercase text-white tracking-tight">
                {team.name}
              </h1>
              <p className="text-xs text-[#9E9EB8] mt-0.5">
                {team.city} · {team.emblemText}
              </p>
            </div>
          </div>

          {/* Purse & Squad OVR Summary Box */}
          <div className="bg-[#0A0B14] border border-[#23274D] rounded-2xl p-4 flex items-center gap-5 text-xs shadow-md flex-wrap">
            <div>
              <span className="text-[10px] text-[#9E9EB8] uppercase font-heading font-extrabold block">Purse Left</span>
              <span className="text-xl font-number font-black text-[#FFC93D]">
                ₹{(purse / 10000000).toFixed(2)} Cr
              </span>
            </div>
            <div className="h-8 w-px bg-[#23274D]" />
            <div>
              <span className="text-[10px] text-[#9E9EB8] uppercase font-heading font-extrabold block">Total Spent</span>
              <span className="text-xl font-number font-black text-[#C8FF3D]">
                ₹{(spent / 10000000).toFixed(2)} Cr
              </span>
            </div>
            <div className="h-8 w-px bg-[#23274D]" />
            <div>
              <span className="text-[10px] text-[#9E9EB8] uppercase font-heading font-extrabold block">Avg Squad OVR</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xl font-number font-black text-white">
                  {roomState.teamStats?.[selectedTeamId]?.avgSquadOvr || (squad.length > 0 ? Math.round((squad.reduce((a, b) => a + (b.ovr || 70), 0) / squad.length) * 10) / 10 : '—')}
                </span>
                {squad.length > 0 && (
                  <OvrBadge
                    ovr={roomState.teamStats?.[selectedTeamId]?.avgSquadOvr || Math.round((squad.reduce((a, b) => a + (b.ovr || 70), 0) / squad.length) * 10) / 10}
                    size="xs"
                    showLabel={false}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Squad Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
          <div className="bg-[#12142A] border border-[#23274D] rounded-2xl p-3.5 shadow-md">
            <span className="text-[10px] text-[#9E9EB8] uppercase font-heading font-extrabold tracking-wider block">Squad Count</span>
            <span className="text-lg font-number font-black text-white mt-0.5 block">
              {squad.length} / {maxSquad}
            </span>
            <span className="text-[10px] text-[#62658A]">Min: {minSquad}</span>
          </div>

          <div className="bg-[#12142A] border border-[#23274D] rounded-2xl p-3.5 shadow-md">
            <span className="text-[10px] text-[#9E9EB8] uppercase font-heading font-extrabold tracking-wider block">Overseas</span>
            <span className={`text-lg font-number font-black mt-0.5 block ${overseasCount >= maxOverseas ? 'text-[#FF3B5C]' : 'text-[#7C5CFF]'}`}>
              {overseasCount} / {maxOverseas}
            </span>
            <span className="text-[10px] text-[#62658A]">
              {overseasCount >= maxOverseas ? 'LIMIT REACHED' : `${remainingOverseasSlots} slots left`}
            </span>
          </div>

          <div className="bg-[#12142A] border border-[#23274D] rounded-2xl p-3.5 shadow-md">
            <span className="text-[10px] text-[#9E9EB8] uppercase font-heading font-extrabold tracking-wider block">Indian Core</span>
            <span className="text-lg font-number font-black text-white mt-0.5 block">
              {indianCount}
            </span>
            <span className="text-[10px] text-[#62658A]">Domestic squad</span>
          </div>

          <div className="bg-[#12142A] border border-[#23274D] rounded-2xl p-3.5 shadow-md">
            <span className="text-[10px] text-[#9E9EB8] uppercase font-heading font-extrabold tracking-wider block">Batters / WK</span>
            <span className="text-lg font-number font-black text-[#C8FF3D] mt-0.5 block">
              {batters} / {wks}
            </span>
            <span className="text-[10px] text-[#62658A]">Specialists</span>
          </div>

          <div className="bg-[#12142A] border border-[#23274D] rounded-2xl p-3.5 shadow-md">
            <span className="text-[10px] text-[#9E9EB8] uppercase font-heading font-extrabold tracking-wider block">Bowlers / AR</span>
            <span className="text-lg font-number font-black text-[#FF3B5C] mt-0.5 block">
              {bowlers} / {allRounders}
            </span>
            <span className="text-[10px] text-[#62658A]">Attack unit</span>
          </div>

          <div className="bg-[#12142A] border border-[#23274D] rounded-2xl p-3.5 shadow-md">
            <span className="text-[10px] text-[#9E9EB8] uppercase font-heading font-extrabold tracking-wider block">Status</span>
            <span className="text-sm font-heading font-extrabold text-[#C8FF3D] mt-1 flex items-center gap-1 uppercase">
              <CheckCircle className="w-3.5 h-3.5" /> Verified
            </span>
            <span className="text-[10px] text-[#62658A]">Authoritative</span>
          </div>
        </div>

        {/* Full Purchased Squad Table */}
        <div className="bg-[#12142A] border border-[#23274D] rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-black text-base text-white flex items-center gap-2 uppercase tracking-wide">
              <span>Purchased Squad ({squad.length} Players)</span>
            </h3>
            <span className="text-[11px] text-[#9E9EB8]">Showing exact final sold prices</span>
          </div>

          {squad.length === 0 ? (
            <div className="py-12 text-center text-[#9E9EB8]">
              <p className="text-sm font-heading font-extrabold uppercase text-white">No players acquired yet by {team.name}</p>
              <p className="text-xs text-[#62658A] mt-1">Players bought by this franchise will appear here in real time.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#23274D] text-[#9E9EB8] font-heading font-extrabold uppercase tracking-wider text-[11px]">
                    <th className="pb-3.5 pl-3">#</th>
                    <th className="pb-3.5">Player</th>
                    <th className="pb-3.5 text-center">OVR</th>
                    <th className="pb-3.5">Role</th>
                    <th className="pb-3.5">Classification</th>
                    <th className="pb-3.5">Base Price</th>
                    <th className="pb-3.5 pr-3 text-right">ACTUAL SOLD PRICE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#23274D]">
                  {purchasesWithPrice.map(({ player: p, price }, idx) => (
                    <tr key={p.id} className="hover:bg-[#181B38]/50 transition-colors">
                      <td className="py-3.5 pl-3 font-number text-[#9E9EB8]">{idx + 1}</td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-[#0A0B14] border border-[#23274D] overflow-hidden flex items-center justify-center shrink-0">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover object-top" />
                            ) : (
                              <span className="font-heading font-bold text-[10px] text-[#C8FF3D]">{p.name.slice(0, 2)}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-heading font-bold uppercase text-white flex items-center gap-1.5">
                              <span>{p.name}</span>
                              {p.is_marquee && (
                                <span className="text-[9px] bg-[#FFC93D]/15 text-[#FFC93D] px-1.5 py-0.5 rounded font-extrabold border border-[#FFC93D]/40">
                                  MARQUEE
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#9E9EB8]">{p.primary_role}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 text-center">
                        <OvrBadge ovr={p.ovr} size="sm" />
                      </td>
                      <td className="py-3.5">
                        <span className="bg-[#0A0B14] border border-[#23274D] px-2.5 py-1 rounded-lg text-[11px] text-white font-heading font-bold uppercase">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3.5">
                        {p.is_overseas ? (
                          <span className="text-[#7C5CFF] bg-[#0A0B14] border border-[#23274D] px-2.5 py-1 rounded-lg inline-flex items-center gap-1 text-[11px] font-semibold">
                            <Plane className="w-3 h-3" /> {p.nationality}
                          </span>
                        ) : (
                          <span className="text-[#9E9EB8] text-[11px] flex items-center gap-1">
                            <span>🇮🇳</span> {p.nationality}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 font-number text-[#9E9EB8]">
                        {p.base_price_display}
                      </td>
                      <td className="py-3.5 pr-3 text-right">
                        <span className="font-number font-black text-sm text-[#C8FF3D] bg-[#C8FF3D]/10 border border-[#C8FF3D]/20 px-3 py-1 rounded-lg">
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
      <div className="bg-[#12142A] border border-[#23274D] rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading uppercase tracking-tight text-white">
            10 Franchise Matrix
          </h1>
          <p className="text-xs text-[#9E9EB8] mt-0.5">
            Click any team to inspect its full purchased roster, spending details, and overseas slots.
          </p>
        </div>

        <div className="flex items-center gap-2.5 text-xs font-heading font-extrabold uppercase">
          <span className="flex items-center gap-1.5 text-white bg-[#0A0B14] border border-[#23274D] px-3.5 py-2 rounded-xl">
            <Users className="w-3.5 h-3.5 text-[#C8FF3D]" />
            Squad: <span className="font-number text-[#C8FF3D]">{minSquad}-{maxSquad}</span>
          </span>
          <span className="flex items-center gap-1.5 text-white bg-[#0A0B14] border border-[#23274D] px-3.5 py-2 rounded-xl">
            <Plane className="w-3.5 h-3.5 text-[#7C5CFF]" />
            Overseas: <span className="font-number text-[#7C5CFF]">Max 8</span>
          </span>
        </div>
      </div>

      {/* Grid of all 10 franchises */}
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
              className={`bg-[#12142A] rounded-2xl p-4 border transition-all cursor-pointer flex flex-col justify-between hover:border-[#C8FF3D]/60 hover:bg-[#181B38] group relative shadow-md ${
                isMyTeam
                  ? 'border-[#C8FF3D] ring-1 ring-[#C8FF3D]/40 shadow-[0_0_20px_rgba(200,255,61,0.15)]'
                  : 'border-[#23274D]'
              }`}
            >
              <div>
                {/* Team Logo & Manager Tag */}
                <div className="flex items-start justify-between mb-3">
                  <TeamLogo teamId={teamId} className="w-12 h-12 drop-shadow-sm shrink-0" />

                  {manager?.isBot ? (
                    <span className="text-[10px] font-heading font-extrabold uppercase bg-[#0A0B14] text-[#7C5CFF] border border-[#23274D] px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Bot className="w-2.5 h-2.5" /> BOT
                    </span>
                  ) : manager ? (
                    <span className="text-[10px] font-heading font-extrabold uppercase bg-[#C8FF3D]/15 text-[#C8FF3D] border border-[#C8FF3D]/30 px-2 py-0.5 rounded-md">
                      HUMAN
                    </span>
                  ) : (
                    <span className="text-[10px] font-heading font-extrabold uppercase bg-[#0A0B14] text-[#62658A] border border-[#23274D] px-2 py-0.5 rounded-md">
                      VACANT
                    </span>
                  )}
                </div>

                <h3 className="font-heading font-bold text-sm text-white leading-tight uppercase">
                  {team.name}
                </h3>
                <p className="text-[11px] text-[#9E9EB8] truncate mt-0.5">
                  {manager ? manager.nickname : 'No manager'}
                  {isMyTeam && <strong className="text-[#C8FF3D] ml-1">(You)</strong>}
                </p>

                {/* Purse Metrics */}
                <div className="my-3 py-2.5 px-3 bg-[#0A0B14] border border-[#23274D] rounded-xl space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[#9E9EB8] font-heading font-extrabold uppercase text-[10px]">Purse:</span>
                    <span className="font-number font-black text-[#FFC93D]">
                      ₹{(purse / 10000000).toFixed(2)} Cr
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-[#9E9EB8] font-heading font-extrabold uppercase text-[10px]">Spent:</span>
                    <span className="font-number font-black text-[#C8FF3D]">
                      ₹{(spent / 10000000).toFixed(2)} Cr
                    </span>
                  </div>
                </div>

                {/* Squad Counts & OVR */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-white">
                    <span className="text-[#9E9EB8] font-heading font-extrabold uppercase text-[10px]">Squad:</span>
                    <span className="font-number font-bold text-white">
                      {squad.length} / {maxSquad}
                    </span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span className="text-[#9E9EB8] font-heading font-extrabold uppercase text-[10px]">Overseas:</span>
                    <span className={`font-number font-bold ${overseas >= maxOverseas ? 'text-[#FF3B5C]' : 'text-[#7C5CFF]'}`}>
                      {overseas} / {maxOverseas}
                      {overseas >= maxOverseas && <span className="ml-1 text-[10px] text-[#FF3B5C] font-heading uppercase">(MAX)</span>}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-white pt-0.5">
                    <span className="text-[#9E9EB8] font-heading font-extrabold uppercase text-[10px]">Avg OVR:</span>
                    {squad.length > 0 ? (
                      <OvrBadge
                        ovr={roomState.teamStats?.[teamId]?.avgSquadOvr || Math.round((squad.reduce((a, b) => a + (b.ovr || 70), 0) / squad.length) * 10) / 10}
                        size="xs"
                        showLabel={false}
                      />
                    ) : (
                      <span className="text-[#62658A] text-[10px]">—</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom: Click to View Squad */}
              <div className="pt-2.5 mt-3 border-t border-[#23274D] text-[11px] flex items-center justify-between">
                <span className="text-[#9E9EB8] font-number">
                  {squad.length} players
                </span>
                <span className="text-[#C8FF3D] font-heading font-bold uppercase inline-flex items-center gap-1 group-hover:underline">
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
