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
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 relative selection:bg-[#C8FF45] selection:text-black">
      {/* Celebration Header */}
      <div className="bg-[#141F33] border border-[#FFC857]/40 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-[#FFC857]/20 text-[#FFC857] text-xs font-heading font-black uppercase tracking-wider px-3.5 py-1 rounded-full border border-[#FFC857]/30 mb-2">
            <Trophy className="w-3.5 h-3.5 text-[#FFC857]" />
            AUCTION COMPLETE
          </div>
          <h1 className="text-3xl sm:text-4xl font-black font-heading uppercase tracking-wide text-[#F4F7FC]">
            Official Auction Results
          </h1>
          <p className="text-xs sm:text-sm text-[#9BAAC0] mt-1 font-body">
            Season {roomState.settings.season} · Room Code: <span className="font-number font-bold text-[#54C8FF]">{roomState.roomCode}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-5 py-3 bg-[#C8FF45] hover:bg-[#B0E635] text-black font-heading font-black uppercase tracking-wider rounded-xl text-xs transition-all shadow-glow-lime flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 stroke-[3]" />
            <span>Export CSV Report</span>
          </button>

          {isHost && (unsoldLots.length > 0 || skippedLots.length > 0) && (
            <button
              onClick={onReAuctionUnsold}
              className="px-5 py-3 bg-[#FFC857] hover:bg-[#ffcf6e] text-black font-heading font-black uppercase tracking-wider rounded-xl text-xs transition-all shadow-glow-gold flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4 stroke-[3]" />
              <span>Re-Auction Round ({unsoldLots.length + skippedLots.length})</span>
            </button>
          )}

          {isHost && (
            <button
              onClick={onRestartAuction}
              className="px-5 py-3 bg-[#0E1626] hover:bg-[#1B2942] text-[#F4F7FC] border border-[#26354D] rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all"
            >
              Restart Lobby
            </button>
          )}
        </div>
      </div>

      {/* Aggregate KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-[#141F33] border border-[#26354D] rounded-2xl p-4">
          <span className="text-[10px] text-[#9BAAC0] uppercase font-heading font-bold tracking-wider block">Total Lots</span>
          <div className="text-2xl font-number font-black text-[#F4F7FC] mt-1">{history.length}</div>
        </div>

        <div className="bg-[#141F33] border border-[#43D995]/30 rounded-2xl p-4">
          <span className="text-[10px] text-[#43D995] uppercase font-heading font-bold tracking-wider block">Players Sold</span>
          <div className="text-2xl font-number font-black text-[#43D995] mt-1">{soldLots.length}</div>
        </div>

        <div className="bg-[#141F33] border border-[#26354D] rounded-2xl p-4">
          <span className="text-[10px] text-[#9BAAC0] uppercase font-heading font-bold tracking-wider block">Unsold</span>
          <div className="text-2xl font-number font-black text-[#9BAAC0] mt-1">{unsoldLots.length}</div>
        </div>

        <div className="bg-[#141F33] border border-[#FFC857]/30 rounded-2xl p-4">
          <span className="text-[10px] text-[#FFC857] uppercase font-heading font-bold tracking-wider block">Skipped</span>
          <div className="text-2xl font-number font-black text-[#FFC857] mt-1">{skippedLots.length}</div>
        </div>

        <div className="bg-[#141F33] border border-[#C8FF45]/30 rounded-2xl p-4">
          <span className="text-[10px] text-[#C8FF45] uppercase font-heading font-bold tracking-wider block">Total Spent</span>
          <div className="text-xl font-number font-black text-[#C8FF45] mt-1">
            ₹{(totalSpentAll / 10000000).toFixed(1)} Cr
          </div>
        </div>
      </div>

      {/* My Franchise Final Squad & Shareable Card */}
      {myTeamId && (
        <div className="bg-[#141F33] border border-[#C8FF45]/40 rounded-3xl p-6 sm:p-7 shadow-2xl relative space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#26354D]">
            <div className="flex items-center gap-3.5">
              <TeamLogo teamId={myTeamId} className="w-12 h-12 object-contain drop-shadow" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-heading font-black text-[#C8FF45] uppercase tracking-wider">
                    My Franchise Final Squad
                  </span>
                  <span className="bg-[#C8FF45]/15 text-[#C8FF45] text-[10px] font-number font-black px-2 py-0.5 rounded-full border border-[#C8FF45]/30">
                    {myTeamId}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black font-heading uppercase text-[#F4F7FC]">
                  {IPL_FRANCHISES[myTeamId]?.name}
                </h2>
              </div>
            </div>

            <button
              onClick={handleCopyShareCard}
              className="px-4 py-2 bg-[#0E1626] hover:bg-[#1B2942] border border-[#26354D] hover:border-[#C8FF45]/50 text-[#F4F7FC] rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto"
            >
              {copiedShare ? (
                <>
                  <Check className="w-4 h-4 text-[#43D995]" />
                  <span className="text-[#43D995]">Summary Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#C8FF45]" />
                  <span>Copy Shareable Card</span>
                </>
              )}
            </button>
          </div>

          {/* Squad Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-[#0E1626] p-3 rounded-xl border border-[#26354D]">
              <span className="text-[10px] text-[#9BAAC0] uppercase font-heading font-bold tracking-wider block">Total Spent</span>
              <span className="text-lg font-number font-black text-[#C8FF45]">
                ₹{(mySpent / 10000000).toFixed(2)} Cr
              </span>
            </div>
            <div className="bg-[#0E1626] p-3 rounded-xl border border-[#26354D]">
              <span className="text-[10px] text-[#9BAAC0] uppercase font-heading font-bold tracking-wider block">Remaining Purse</span>
              <span className="text-lg font-number font-black text-[#54C8FF]">
                ₹{(myPurse / 10000000).toFixed(2)} Cr
              </span>
            </div>
            <div className="bg-[#0E1626] p-3 rounded-xl border border-[#26354D]">
              <span className="text-[10px] text-[#9BAAC0] uppercase font-heading font-bold tracking-wider block">Total Squad</span>
              <span className="text-lg font-number font-black text-[#F4F7FC]">
                {mySquad.length} Players
              </span>
            </div>
            <div className="bg-[#0E1626] p-3 rounded-xl border border-[#26354D]">
              <span className="text-[10px] text-[#9BAAC0] uppercase font-heading font-bold tracking-wider block">Overseas</span>
              <span className="text-lg font-number font-black text-[#43D995]">
                {myOverseas} / 8 Max
              </span>
            </div>
          </div>

          {/* Squad Composition Breakdown */}
          <div className="flex items-center gap-2 flex-wrap text-[11px] font-heading font-bold uppercase">
            <span className="bg-[#0E1626] border border-[#26354D] text-[#F4F7FC] px-2.5 py-1 rounded-lg">
              🏏 Batters: <strong className="text-[#FFC857] font-number">{myBatters}</strong>
            </span>
            <span className="bg-[#0E1626] border border-[#26354D] text-[#F4F7FC] px-2.5 py-1 rounded-lg">
              ⚡ All-Rounders: <strong className="text-[#C8FF45] font-number">{myAllRounders}</strong>
            </span>
            <span className="bg-[#0E1626] border border-[#26354D] text-[#F4F7FC] px-2.5 py-1 rounded-lg">
              🎯 Bowlers: <strong className="text-[#54C8FF] font-number">{myBowlers}</strong>
            </span>
            <span className="bg-[#0E1626] border border-[#26354D] text-[#F4F7FC] px-2.5 py-1 rounded-lg">
              🧤 WKs: <strong className="text-[#F4F7FC] font-number">{myWKs}</strong>
            </span>
          </div>

          {/* Acquired Players List */}
          {mySquad.length > 0 && (
            <div className="space-y-1.5 pt-2">
              <span className="text-[11px] text-[#9BAAC0] uppercase font-heading font-bold tracking-wider block">
                Acquired Players ({mySquad.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                {mySquad.map(p => (
                  <div key={p.id} className="p-2.5 bg-[#0E1626] rounded-xl border border-[#26354D] flex items-center justify-between text-xs">
                    <div className="truncate pr-2">
                      <span className="font-heading font-black text-[#F4F7FC] block truncate uppercase">{p.name}</span>
                      <span className="text-[10px] text-[#9BAAC0]">
                        {p.category} · {p.is_overseas ? `✈️ ${p.nationality}` : '🇮🇳 Ind'}
                      </span>
                    </div>
                    <span className="font-number font-black text-[#C8FF45] shrink-0 text-xs">
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
      <div className="bg-[#141F33] border border-[#26354D] rounded-3xl p-6 shadow-2xl">
        <h3 className="font-heading font-black text-lg text-[#F4F7FC] mb-2 flex items-center gap-2 uppercase tracking-wide">
          <Shield className="w-5 h-5 text-[#C8FF45]" />
          <span>Final Squad Compliance Audit</span>
        </h3>
        <p className="text-xs text-[#9BAAC0] mb-4">
          Verification of min 18 players, max 25 players, max 8 overseas, and non-negative purse balances.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#26354D] text-[#9BAAC0] font-heading font-bold uppercase tracking-wider">
                <th className="pb-3 pl-3">Franchise</th>
                <th className="pb-3">Squad Count</th>
                <th className="pb-3">Overseas</th>
                <th className="pb-3">Remaining Purse</th>
                <th className="pb-3">Spent</th>
                <th className="pb-3 pr-3 text-right">Compliance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26354D]">
              {teamAudits.map(({ team, squad, purse, spent, overseas, isValid, errors }) => (
                <tr key={team.id} className="hover:bg-[#1B2942]/50 transition-colors">
                  <td className="py-3.5 pl-3 font-heading font-black text-[#F4F7FC] flex items-center gap-2.5 uppercase">
                    <TeamLogo teamId={team.id} className="w-8 h-8 shrink-0 shadow-sm" />
                    <span>{team.name}</span>
                  </td>
                  <td className="py-3.5 font-number">
                    <span className={squad.length < minSquad ? 'text-[#FF647C] font-black' : 'text-[#F4F7FC]'}>
                      {squad.length}
                    </span>
                    <span className="text-[#9BAAC0]"> / {minSquad}-{maxSquad}</span>
                  </td>
                  <td className="py-3.5 font-number">
                    <span className={overseas > maxOverseas ? 'text-[#FF647C] font-black' : 'text-[#F4F7FC]'}>
                      {overseas}
                    </span>
                    <span className="text-[#9BAAC0]"> / {maxOverseas}</span>
                  </td>
                  <td className="py-3.5 font-number font-black text-[#C8FF45]">
                    ₹{(purse / 10000000).toFixed(2)} Cr
                  </td>
                  <td className="py-3.5 font-number text-[#54C8FF]">
                    ₹{(spent / 10000000).toFixed(2)} Cr
                  </td>
                  <td className="py-3.5 pr-3 text-right">
                    {isValid ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-heading font-black text-[#43D995] bg-[#43D995]/10 border border-[#43D995]/30 px-3 py-1 rounded-full uppercase">
                        <CheckCircle className="w-3.5 h-3.5" />
                        COMPLIANT
                      </span>
                    ) : (
                      <div className="inline-flex flex-col items-end">
                        <span className="inline-flex items-center gap-1 text-[11px] font-heading font-black text-[#FF647C] bg-[#FF647C]/10 border border-[#FF647C]/30 px-2.5 py-0.5 rounded-full uppercase">
                          <XCircle className="w-3.5 h-3.5" />
                          INVALID SQUAD
                        </span>
                        <span className="text-[10px] text-[#FF647C]/80 mt-0.5">
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
