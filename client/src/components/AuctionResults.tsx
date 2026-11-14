import React, { useState } from 'react';
import { 
  Download, 
  RotateCcw, 
  CheckCircle, 
  XCircle, 
  Shield, 
  Copy, 
  Check, 
  Sparkles, 
  Flame,
  Award
} from 'lucide-react';
import { RoomState, IPL_FRANCHISES, IPLTeamId } from '../types.js';
import { TeamLogo } from './TeamLogo.js';
import { TrophyIcon, GavelIcon, CoinsIcon, BatIcon, BallIcon, StumpsIcon } from './BrandIcons.js';
import { OvrBadge } from './OvrBadge.js';

interface AuctionResultsProps {
  roomState: RoomState;
  myMemberId: string;
  onReAuctionUnsold: () => void;
  onRestartAuction: () => void;
}

export const AuctionResults: React.FC<AuctionResultsProps> = ({
  roomState,
  myMemberId,
  onReAuctionUnsold,
  onRestartAuction
}) => {
  const [copiedShare, setCopiedShare] = useState(false);
  const myMember = roomState.members[myMemberId];
  const myTeamId = myMember?.teamId;
  const isHost = myMember?.isHost;
  const history = roomState.history;
  const soldLots = history.filter(h => h.status === 'SOLD');
  const unsoldLots = history.filter(h => h.status === 'UNSOLD');
  const skippedLots = history.filter(h => h.status === 'SKIPPED');

  const totalSpentAll = soldLots.reduce((acc, curr) => acc + (curr.soldPrice || 0), 0);

  // Highest sold buy (Best Buy)
  const bestBuyLot = soldLots.length > 0 
    ? [...soldLots].sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0))[0] 
    : null;

  // My Franchise stats & squad breakdown
  const mySquad = myTeamId ? (roomState.teamSquads[myTeamId] || []) : [];
  const myPurse = myTeamId ? (roomState.teamPurse[myTeamId] || 0) : 0;
  const mySpent = myTeamId ? (roomState.settings.startingPurse - myPurse) : 0;
  const myOverseas = mySquad.filter(p => p.is_overseas).length;
  const myBatters = mySquad.filter(p => p.category === 'Batsmen').length;
  const myAllRounders = mySquad.filter(p => p.category === 'All-rounders').length;
  const myBowlers = mySquad.filter(p => p.category === 'Bowlers').length;
  const myWKs = mySquad.filter(p => p.is_wicketkeeper).length;

  const handleCopyShareCard = () => {
    if (!myTeamId) return;
    const teamName = IPL_FRANCHISES[myTeamId]?.name || myTeamId;
    const topSignings = mySquad
      .slice(0, 5)
      .map(p => `• ${p.name} (₹${(((p.sold_price_inr || 0) / 10000000)).toFixed(2)} Cr)`)
      .join('\n');

    const text = `🏆 BIDWARS — AUCTION SQUAD REPORT\n` +
      `Franchise: ${teamName} (${myTeamId})\n` +
      `Purse Spent: ₹${(mySpent / 10000000).toFixed(2)} Cr | Remaining: ₹${(myPurse / 10000000).toFixed(2)} Cr\n` +
      `Squad Size: ${mySquad.length} Players (${myOverseas} Overseas)\n` +
      `Composition: ${myBatters} Batters | ${myAllRounders} All-Rounders | ${myBowlers} Bowlers | ${myWKs} Wicketkeepers\n\n` +
      `Key Signings:\n${topSignings}\n\n` +
      `Hammer your XI. Built with BidWars 2026`;

    navigator.clipboard.writeText(text);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  // Franchise validation analysis
  const allTeams: IPLTeamId[] = ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'PBKS', 'DC', 'GT', 'LSG'];
  const minSquad = roomState.settings.minSquad;
  const maxSquad = roomState.settings.maxSquad;
  const maxOverseas = roomState.settings.maxOverseas;

  const teamAudits = allTeams.map(teamId => {
    const team = IPL_FRANCHISES[teamId];
    const squad = roomState.teamSquads[teamId] || [];
    const purse = roomState.teamPurse[teamId] || 0;
    const spent = roomState.settings.startingPurse - purse;
    const overseas = squad.filter(p => p.is_overseas).length;

    const errors: string[] = [];
    if (squad.length < minSquad) {
      errors.push(`Incomplete squad: ${squad.length}/${minSquad} players`);
    }
    if (squad.length > maxSquad) {
      errors.push(`Exceeded max squad: ${squad.length}/${maxSquad} players`);
    }
    if (overseas > maxOverseas) {
      errors.push(`Exceeded overseas limit: ${overseas}/${maxOverseas} players`);
    }
    if (purse < 0) {
      errors.push(`Deficit purse: ₹${(purse / 10000000).toFixed(2)} Cr`);
    }

    return {
      team,
      squad,
      purse,
      spent,
      overseas,
      isValid: errors.length === 0,
      errors
    };
  });

  // Calculate winner team: compliant team with largest or best balanced squad, or my team if compliant
  const compliantTeams = teamAudits.filter(t => t.isValid && t.squad.length >= minSquad);
  const winnerTeam = compliantTeams.length > 0 
    ? [...compliantTeams].sort((a, b) => b.squad.length - a.squad.length || b.spent - a.spent)[0]?.team
    : (myTeamId ? IPL_FRANCHISES[myTeamId] : IPL_FRANCHISES['CSK']);

  // CSV Export handler
  const handleExportCSV = () => {
    const headers = ['Lot', 'Player Name', 'OVR', 'Role', 'Country', 'Status', 'Winning Franchise', 'Sold Price (INR)', 'Base Price'];
    const rows = history.map(h => [
      h.lotNumber,
      `"${h.player.name}"`,
      h.player.ovr || '—',
      h.player.category,
      h.player.nationality,
      h.status,
      h.winningTeamName ? `"${h.winningTeamName}"` : '—',
      h.soldPrice || 0,
      h.player.base_price_inr
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BIDWARS_${roomState.roomCode}_Results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 relative font-body">
      {/* SECTION 06: VICTORY BANNER (From BidWars Brand Board) */}
      <div className="relative rounded-3xl overflow-hidden border-2 border-[#C8FF3D] bg-[#12142A] p-6 sm:p-10 shadow-[0_0_50px_rgba(200,255,61,0.2)]">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-[#C8FF3D]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-[#7C5CFF]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 text-center md:text-left">
            {/* Top Badge: AUCTION COMPLETE · SQUAD LOCKED */}
            <div className="inline-flex items-center gap-2 bg-[#0A0B14] text-[#C8FF3D] text-xs font-heading font-black uppercase tracking-wider px-4 py-1.5 rounded-full border border-[#C8FF3D]/40">
              <span className="w-2 h-2 rounded-full bg-[#C8FF3D] animate-ping" />
              AUCTION COMPLETE · SQUAD LOCKED
            </div>

            {/* Headline Banner: WIN THE ROOM */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-heading font-black uppercase tracking-tight text-white leading-none">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C8FF3D] via-[#FFC93D] to-[#FF3B5C]">
                {winnerTeam?.name || 'CHAMPIONS'}
              </span>
              <br />
              <span className="text-white">WIN THE ROOM</span>
            </h1>

            <p className="text-sm text-[#9E9EB8] max-w-xl">
              All sets completed. Final hammer struck. Official squad rosters are locked for Season {roomState.settings.season}.
            </p>
          </div>

          {/* Trophy & Best Buy Showcase */}
          <div className="flex flex-col items-center md:items-end gap-3 shrink-0">
            <div className="w-24 h-24 rounded-2xl bg-[#0A0B14] border-2 border-[#FFC93D] flex items-center justify-center shadow-[0_0_30px_rgba(255,201,61,0.3)]">
              <TrophyIcon className="w-14 h-14 text-[#FFC93D]" />
            </div>

            {bestBuyLot && (
              <div className="bg-[#0A0B14] border border-[#23274D] px-4 py-2 rounded-xl text-center md:text-right">
                <div className="flex items-center justify-center md:justify-end gap-1.5 mb-0.5">
                  <span className="text-[10px] text-[#9E9EB8] font-heading font-extrabold uppercase tracking-wider">
                    BEST BUY · {bestBuyLot.player.name}
                  </span>
                  <OvrBadge ovr={bestBuyLot.player.ovr} size="xs" />
                </div>
                <span className="text-lg font-number font-black text-[#C8FF3D]">
                  ₹{((bestBuyLot.soldPrice || 0) / 10000000).toFixed(2)} Cr
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-6 mt-6 border-t border-[#23274D]">
          <div className="text-xs text-[#9E9EB8]">
            Room Code: <span className="font-number font-bold text-white text-sm">{roomState.roomCode}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="px-5 py-2.5 bg-[#C8FF3D] hover:bg-[#B5F522] text-[#0A0B14] font-heading font-black uppercase tracking-wider rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(200,255,61,0.3)] flex items-center gap-2"
            >
              <Download className="w-4 h-4 stroke-[3]" />
              <span>Export CSV</span>
            </button>

            {isHost && (unsoldLots.length > 0 || skippedLots.length > 0) && (
              <button
                onClick={onReAuctionUnsold}
                className="px-5 py-2.5 bg-[#FFC93D] hover:bg-[#E5B535] text-[#0A0B14] font-heading font-black uppercase tracking-wider rounded-xl text-xs transition-all shadow-md flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4 stroke-[3]" />
                <span>Re-Auction Round ({unsoldLots.length + skippedLots.length})</span>
              </button>
            )}

            {isHost && (
              <button
                onClick={onRestartAuction}
                className="px-5 py-2.5 bg-[#181B38] hover:bg-[#23274D] text-white border border-[#23274D] rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all"
              >
                Restart Lobby
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Aggregate KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-[#12142A] border border-[#23274D] rounded-2xl p-4 shadow-md">
          <span className="text-[10px] text-[#9E9EB8] uppercase font-heading font-extrabold tracking-wider block">Total Lots</span>
          <div className="text-2xl font-number font-extrabold text-white mt-1">{history.length}</div>
        </div>

        <div className="bg-[#12142A] border border-[#23274D] rounded-2xl p-4 shadow-md">
          <span className="text-[10px] text-[#C8FF3D] uppercase font-heading font-extrabold tracking-wider block">Players Sold</span>
          <div className="text-2xl font-number font-extrabold text-[#C8FF3D] mt-1">{soldLots.length}</div>
        </div>

        <div className="bg-[#12142A] border border-[#23274D] rounded-2xl p-4 shadow-md">
          <span className="text-[10px] text-[#FF3B5C] uppercase font-heading font-extrabold tracking-wider block">Unsold</span>
          <div className="text-2xl font-number font-extrabold text-[#FF3B5C] mt-1">{unsoldLots.length}</div>
        </div>

        <div className="bg-[#12142A] border border-[#23274D] rounded-2xl p-4 shadow-md">
          <span className="text-[10px] text-[#FFC93D] uppercase font-heading font-extrabold tracking-wider block">Skipped</span>
          <div className="text-2xl font-number font-extrabold text-[#FFC93D] mt-1">{skippedLots.length}</div>
        </div>

        <div className="bg-[#12142A] border border-[#23274D] rounded-2xl p-4 shadow-md">
          <span className="text-[10px] text-[#C8FF3D] uppercase font-heading font-extrabold tracking-wider block">Total Spent</span>
          <div className="text-xl font-number font-extrabold text-[#C8FF3D] mt-1">
            ₹{(totalSpentAll / 10000000).toFixed(1)} Cr
          </div>
        </div>
      </div>

      {/* My Franchise Final Squad & Shareable Card */}
      {myTeamId && (
        <div className="bg-[#12142A] border-2 border-[#C8FF3D] rounded-3xl p-6 sm:p-8 shadow-xl relative space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#23274D]">
            <div className="flex items-center gap-3.5">
              <TeamLogo teamId={myTeamId} className="w-14 h-14 object-contain drop-shadow-md" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-heading font-extrabold text-[#C8FF3D] uppercase tracking-wider">
                    My Franchise Final Squad
                  </span>
                  <span className="bg-[#0A0B14] text-[#C8FF3D] text-[10px] font-number font-bold px-2 py-0.5 rounded border border-[#C8FF3D]/30">
                    {myTeamId}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-heading font-black uppercase text-white tracking-tight">
                  {IPL_FRANCHISES[myTeamId]?.name}
                </h2>
              </div>
            </div>

            <button
              onClick={handleCopyShareCard}
              className="px-4 py-2.5 bg-[#0A0B14] hover:bg-[#181B38] border border-[#23274D] text-[#C8FF3D] rounded-xl text-xs font-heading font-extrabold uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto shadow-sm"
            >
              {copiedShare ? (
                <>
                  <Check className="w-4 h-4 text-[#C8FF3D]" />
                  <span className="text-[#C8FF3D]">Summary Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#C8FF3D]" />
                  <span>Copy Shareable Card</span>
                </>
              )}
            </button>
          </div>

          {/* Squad Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-[#0A0B14] p-3.5 rounded-2xl border border-[#23274D]">
              <span className="text-[10px] text-[#9E9EB8] uppercase font-heading font-extrabold tracking-wider block">Total Spent</span>
              <span className="text-xl font-number font-extrabold text-[#C8FF3D]">
                ₹{(mySpent / 10000000).toFixed(2)} Cr
              </span>
            </div>
            <div className="bg-[#0A0B14] p-3.5 rounded-2xl border border-[#23274D]">
              <span className="text-[10px] text-[#9E9EB8] uppercase font-heading font-extrabold tracking-wider block">Remaining Purse</span>
              <span className="text-xl font-number font-extrabold text-[#FFC93D]">
                ₹{(myPurse / 10000000).toFixed(2)} Cr
              </span>
            </div>
            <div className="bg-[#0A0B14] p-3.5 rounded-2xl border border-[#23274D]">
              <span className="text-[10px] text-[#9E9EB8] uppercase font-heading font-extrabold tracking-wider block">Total Squad</span>
              <span className="text-xl font-number font-extrabold text-white">
                {mySquad.length} Players
              </span>
            </div>
            <div className="bg-[#0A0B14] p-3.5 rounded-2xl border border-[#23274D]">
              <span className="text-[10px] text-[#9E9EB8] uppercase font-heading font-extrabold tracking-wider block">Overseas</span>
              <span className="text-xl font-number font-extrabold text-[#7C5CFF]">
                {myOverseas} / 8 Max
              </span>
            </div>
          </div>

          {/* Squad Composition Breakdown */}
          <div className="flex items-center gap-2 flex-wrap text-xs font-heading font-extrabold uppercase">
            <span className="bg-[#0A0B14] border border-[#23274D] text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <BatIcon className="w-3.5 h-3.5 text-[#C8FF3D]" /> Batters: <strong className="text-[#C8FF3D] font-number">{myBatters}</strong>
            </span>
            <span className="bg-[#0A0B14] border border-[#23274D] text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <CoinsIcon className="w-3.5 h-3.5 text-[#FFC93D]" /> All-Rounders: <strong className="text-[#FFC93D] font-number">{myAllRounders}</strong>
            </span>
            <span className="bg-[#0A0B14] border border-[#23274D] text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <BallIcon className="w-3.5 h-3.5 text-[#FF3B5C]" /> Bowlers: <strong className="text-[#FF3B5C] font-number">{myBowlers}</strong>
            </span>
            <span className="bg-[#0A0B14] border border-[#23274D] text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <StumpsIcon className="w-3.5 h-3.5 text-[#7C5CFF]" /> WKs: <strong className="text-[#7C5CFF] font-number">{myWKs}</strong>
            </span>
          </div>

          {/* Acquired Players List */}
          {mySquad.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-[11px] text-[#9E9EB8] uppercase font-heading font-extrabold tracking-wider block">
                Acquired Players ({mySquad.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                {mySquad.map(p => (
                  <div key={p.id} className="p-3 bg-[#0A0B14] rounded-xl border border-[#23274D] flex items-center justify-between text-xs">
                    <div className="truncate pr-2">
                      <span className="font-heading font-bold text-white block truncate uppercase">{p.name}</span>
                      <span className="text-[10px] text-[#9E9EB8]">
                        {p.category} · {p.is_overseas ? `✈️ ${p.nationality}` : '🇮🇳 Ind'}
                      </span>
                    </div>
                    <span className="font-number font-extrabold text-[#C8FF3D] shrink-0 text-xs">
                      ₹{(((p.sold_price_inr || 0) / 10000000)).toFixed(2)}Cr
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Squad Validation Audit Table */}
      <div className="bg-[#12142A] border border-[#23274D] rounded-3xl p-6 sm:p-8 shadow-xl">
        <h3 className="font-heading font-black text-xl text-white mb-2 flex items-center gap-2.5 uppercase tracking-wide">
          <Shield className="w-5 h-5 text-[#C8FF3D]" />
          <span>Final Squad Compliance Audit</span>
        </h3>
        <p className="text-xs text-[#9E9EB8] mb-5">
          Official verification: minimum 18 players, maximum 25 players, max 8 overseas, and solvent purse balances.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#23274D] text-[#9E9EB8] font-heading font-extrabold uppercase tracking-wider">
                <th className="pb-3.5 pl-3">Franchise</th>
                <th className="pb-3.5">Squad Count</th>
                <th className="pb-3.5">Overseas</th>
                <th className="pb-3.5">Remaining Purse</th>
                <th className="pb-3.5">Spent</th>
                <th className="pb-3.5 pr-3 text-right">Compliance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#23274D]">
              {teamAudits.map(({ team, squad, purse, spent, overseas, isValid, errors }) => (
                <tr key={team.id} className="hover:bg-[#181B38]/50 transition-colors">
                  <td className="py-4 pl-3 font-heading font-bold text-white flex items-center gap-3 uppercase">
                    <TeamLogo teamId={team.id} className="w-8 h-8 shrink-0 drop-shadow-sm" />
                    <span>{team.name}</span>
                  </td>
                  <td className="py-4 font-number">
                    <span className={squad.length < minSquad ? 'text-[#FF3B5C] font-bold' : 'text-white'}>
                      {squad.length}
                    </span>
                    <span className="text-[#62658A]"> / {minSquad}-{maxSquad}</span>
                  </td>
                  <td className="py-4 font-number">
                    <span className={overseas > maxOverseas ? 'text-[#FF3B5C] font-bold' : 'text-white'}>
                      {overseas}
                    </span>
                    <span className="text-[#62658A]"> / {maxOverseas}</span>
                  </td>
                  <td className="py-4 font-number font-extrabold text-[#FFC93D]">
                    ₹{(purse / 10000000).toFixed(2)} Cr
                  </td>
                  <td className="py-4 font-number font-extrabold text-[#C8FF3D]">
                    ₹{(spent / 10000000).toFixed(2)} Cr
                  </td>
                  <td className="py-4 pr-3 text-right">
                    {isValid ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-heading font-extrabold text-[#C8FF3D] bg-[#C8FF3D]/10 border border-[#C8FF3D]/30 px-3 py-1 rounded-lg uppercase">
                        <CheckCircle className="w-3.5 h-3.5" />
                        COMPLIANT
                      </span>
                    ) : (
                      <div className="inline-flex flex-col items-end">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-heading font-extrabold text-[#FF3B5C] bg-[#FF3B5C]/10 border border-[#FF3B5C]/30 px-2.5 py-1 rounded-lg uppercase">
                          <XCircle className="w-3.5 h-3.5" />
                          INVALID SQUAD
                        </span>
                        <span className="text-[10px] text-[#FF3B5C] mt-0.5">
                          {errors[0]}
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
