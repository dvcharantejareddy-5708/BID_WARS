import React, { useState } from 'react';
import { 
  Trophy, 
  Download, 
  RotateCcw, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Shield, 
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  Share2,
  Copy,
  Check,
  Sparkles,
  Users
} from 'lucide-react';
import { RoomState, IPL_FRANCHISES, IPLTeamId } from '../types.js';
import { TeamLogo } from './TeamLogo.js';

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

  // My Franchise stats & squad breakdown (Section 11)
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

    const text = `🏏 BID WARS IPL AUCTION — SQUAD SUMMARY\n` +
      `Franchise: ${teamName} (${myTeamId})\n` +
      `Purse Spent: ₹${(mySpent / 10000000).toFixed(2)} Cr | Remaining: ₹${(myPurse / 10000000).toFixed(2)} Cr\n` +
      `Squad Size: ${mySquad.length} Players (${myOverseas} Overseas)\n` +
      `Composition: ${myBatters} Batters | ${myAllRounders} All-Rounders | ${myBowlers} Bowlers | ${myWKs} Wicketkeepers\n\n` +
      `Key Signings:\n${topSignings}\n\n` +
      `Built with Bid Wars IPL 2026`;

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

  // CSV Export handler
  const handleExportCSV = () => {
    const headers = ['Lot', 'Player Name', 'Role', 'Country', 'Status', 'Winning Franchise', 'Sold Price (INR)', 'Base Price'];
    const rows = history.map(h => [
      h.lotNumber,
      `"${h.player.name}"`,
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
    link.setAttribute('download', `BID_WARS_${roomState.roomCode}_Results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 relative">
      {/* Celebration Header */}
      <div className="bg-[#0D0D0D] border border-[#FFC857]/40 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-[#FFC857]/20 text-[#FFC857] text-xs font-bold px-3.5 py-1 rounded-full border border-[#FFC857]/30 mb-2">
            <Trophy className="w-3.5 h-3.5 text-[#FFC857]" />
            AUCTION COMPLETE
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-white">
            Official Auction Results
          </h1>
          <p className="text-xs sm:text-sm text-[#8E8E93] mt-1">
            Season {roomState.settings.season} · Room Code: {roomState.roomCode}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-5 py-3 bg-[#00E676] hover:bg-[#00c966] text-black font-display font-extrabold rounded-full text-xs transition-all shadow-lg flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV Report</span>
          </button>

          {isHost && (unsoldLots.length > 0 || skippedLots.length > 0) && (
            <button
              onClick={onReAuctionUnsold}
              className="px-5 py-3 bg-[#FFC857] hover:bg-[#ffcf6e] text-black font-display font-extrabold rounded-full text-xs transition-all shadow-lg flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Re-Auction Round ({unsoldLots.length + skippedLots.length})</span>
            </button>
          )}

          {isHost && (
            <button
              onClick={onRestartAuction}
              className="px-5 py-3 bg-[#151515] hover:bg-[#202020] text-white border border-[#262626] rounded-full text-xs font-bold transition-all"
            >
              Restart Lobby
            </button>
          )}
        </div>
      </div>

      {/* Aggregate KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-2xl p-4">
          <span className="text-[10px] text-[#8E8E93] uppercase font-semibold block">Total Lots</span>
          <div className="text-2xl font-mono font-bold text-white mt-1">{history.length}</div>
        </div>

        <div className="bg-[#0D0D0D] border border-[#00E676]/30 rounded-2xl p-4">
          <span className="text-[10px] text-[#00E676] uppercase font-semibold block">Players Sold</span>
          <div className="text-2xl font-mono font-bold text-[#00E676] mt-1">{soldLots.length}</div>
        </div>

        <div className="bg-[#0D0D0D] border border-[#262626] rounded-2xl p-4">
          <span className="text-[10px] text-[#8E8E93] uppercase font-semibold block">Unsold</span>
          <div className="text-2xl font-mono font-bold text-slate-300 mt-1">{unsoldLots.length}</div>
        </div>

        <div className="bg-[#0D0D0D] border border-[#FFC857]/30 rounded-2xl p-4">
          <span className="text-[10px] text-[#FFC857] uppercase font-semibold block">Skipped</span>
          <div className="text-2xl font-mono font-bold text-[#FFC857] mt-1">{skippedLots.length}</div>
        </div>

        <div className="bg-[#0D0D0D] border border-[#00E676]/30 rounded-2xl p-4">
          <span className="text-[10px] text-[#00E676] uppercase font-semibold block">Total Spent</span>
          <div className="text-xl font-mono font-bold text-[#00E676] mt-1">
            ₹{(totalSpentAll / 10000000).toFixed(1)} Cr
          </div>
        </div>
      </div>

      {/* My Franchise Final Squad & Shareable Card (Section 11) */}
      {myTeamId && (
        <div className="bg-[#0D0D0D] border border-[#FFD700]/40 rounded-3xl p-6 sm:p-7 shadow-2xl relative space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
            <div className="flex items-center gap-3.5">
              <TeamLogo teamId={myTeamId} className="w-12 h-12 object-contain drop-shadow" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#FFD700] uppercase tracking-wider">
                    My Franchise Final Squad
                  </span>
                  <span className="bg-[#00E676]/15 text-[#00E676] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#00E676]/30">
                    {myTeamId}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black font-display text-white">
                  {IPL_FRANCHISES[myTeamId]?.name}
                </h2>
              </div>
            </div>

            <button
              onClick={handleCopyShareCard}
              className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#252525] border border-[#333333] hover:border-[#FFD700]/50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto"
            >
              {copiedShare ? (
                <>
                  <Check className="w-4 h-4 text-[#00E676]" />
                  <span className="text-[#00E676]">Summary Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#FFD700]" />
                  <span>Copy Shareable Card</span>
                </>
              )}
            </button>
          </div>

          {/* Squad Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-[#141414] p-3 rounded-xl border border-[#222222]">
              <span className="text-[10px] text-[#8E8E93] uppercase font-semibold block">Total Spent</span>
              <span className="text-lg font-mono font-black text-[#00E676]">
                ₹{(mySpent / 10000000).toFixed(2)} Cr
              </span>
            </div>
            <div className="bg-[#141414] p-3 rounded-xl border border-[#222222]">
              <span className="text-[10px] text-[#8E8E93] uppercase font-semibold block">Remaining Purse</span>
              <span className="text-lg font-mono font-black text-[#FFD700]">
                ₹{(myPurse / 10000000).toFixed(2)} Cr
              </span>
            </div>
            <div className="bg-[#141414] p-3 rounded-xl border border-[#222222]">
              <span className="text-[10px] text-[#8E8E93] uppercase font-semibold block">Total Squad</span>
              <span className="text-lg font-mono font-black text-white">
                {mySquad.length} Players
              </span>
            </div>
            <div className="bg-[#141414] p-3 rounded-xl border border-[#222222]">
              <span className="text-[10px] text-[#8E8E93] uppercase font-semibold block">Overseas</span>
              <span className="text-lg font-mono font-black text-[#00E676]">
                {myOverseas} / 8 Max
              </span>
            </div>
          </div>

          {/* Squad Composition Breakdown */}
          <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
            <span className="bg-[#161616] border border-[#282828] text-white px-2.5 py-1 rounded-lg">
              🏏 Batters: <strong className="text-[#FFD700]">{myBatters}</strong>
            </span>
            <span className="bg-[#161616] border border-[#282828] text-white px-2.5 py-1 rounded-lg">
              ⚡ All-Rounders: <strong className="text-[#00E676]">{myAllRounders}</strong>
            </span>
            <span className="bg-[#161616] border border-[#282828] text-white px-2.5 py-1 rounded-lg">
              🎯 Bowlers: <strong className="text-[#FFC857]">{myBowlers}</strong>
            </span>
            <span className="bg-[#161616] border border-[#282828] text-white px-2.5 py-1 rounded-lg">
              🧤 WKs: <strong className="text-white">{myWKs}</strong>
            </span>
          </div>

          {/* Acquired Players List */}
          {mySquad.length > 0 && (
            <div className="space-y-1.5 pt-2">
              <span className="text-[11px] text-[#8E8E93] uppercase font-bold tracking-wider block">
                Acquired Players ({mySquad.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                {mySquad.map(p => (
                  <div key={p.id} className="p-2.5 bg-[#141414] rounded-xl border border-[#222222] flex items-center justify-between text-xs">
                    <div className="truncate pr-2">
                      <span className="font-bold text-white block truncate">{p.name}</span>
                      <span className="text-[10px] text-[#8E8E93]">
                        {p.category} · {p.is_overseas ? `✈️ ${p.nationality}` : '🇮🇳 Ind'}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-[#00E676] shrink-0 text-xs">
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
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-3xl p-6 shadow-2xl">
        <h3 className="font-display font-bold text-lg text-white mb-2 flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#00E676]" />
          <span>Final Squad Compliance Audit</span>
        </h3>
        <p className="text-xs text-[#8E8E93] mb-4">
          Verification of min 18 players, max 25 players, max 8 overseas, and non-negative purse balances.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#262626] text-[#8E8E93] font-semibold uppercase tracking-wider">
                <th className="pb-3 pl-3">Franchise</th>
                <th className="pb-3">Squad Count</th>
                <th className="pb-3">Overseas</th>
                <th className="pb-3">Remaining Purse</th>
                <th className="pb-3">Spent</th>
                <th className="pb-3 pr-3 text-right">Compliance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202020]">
              {teamAudits.map(({ team, squad, purse, spent, overseas, isValid, errors }) => (
                <tr key={team.id} className="hover:bg-[#151515] transition-colors">
                  <td className="py-3.5 pl-3 font-display font-bold text-white flex items-center gap-2.5">
                    <TeamLogo teamId={team.id} className="w-8 h-8 shrink-0 shadow-sm" />
                    <span>{team.name}</span>
                  </td>
                  <td className="py-3.5 font-mono">
                    <span className={squad.length < minSquad ? 'text-[#FF5252] font-bold' : 'text-white'}>
                      {squad.length}
                    </span>
                    <span className="text-[#8E8E93]"> / {minSquad}-{maxSquad}</span>
                  </td>
                  <td className="py-3.5 font-mono">
                    <span className={overseas > maxOverseas ? 'text-[#FF5252] font-bold' : 'text-white'}>
                      {overseas}
                    </span>
                    <span className="text-[#8E8E93]"> / {maxOverseas}</span>
                  </td>
                  <td className="py-3.5 font-mono font-bold text-[#00E676]">
                    ₹{(purse / 10000000).toFixed(2)} Cr
                  </td>
                  <td className="py-3.5 font-mono text-[#FFC857]">
                    ₹{(spent / 10000000).toFixed(2)} Cr
                  </td>
                  <td className="py-3.5 pr-3 text-right">
                    {isValid ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00E676] bg-[#00E676]/10 border border-[#00E676]/30 px-3 py-1 rounded-full">
                        <CheckCircle className="w-3.5 h-3.5" />
                        COMPLIANT
                      </span>
                    ) : (
                      <div className="inline-flex flex-col items-end">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FF5252] bg-[#FF5252]/10 border border-[#FF5252]/30 px-2.5 py-0.5 rounded-full">
                          <XCircle className="w-3.5 h-3.5" />
                          INVALID SQUAD
                        </span>
                        <span className="text-[10px] text-[#FF5252]/80 mt-0.5">
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
