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
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 relative font-body">
      {/* Celebration Header */}
      <div className="bg-[#203650] border border-[#344B65] rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-[#F3C969]/20 text-[#B8860B] text-xs font-heading font-bold uppercase tracking-wider px-3.5 py-1 rounded-full border border-[#F3C969]/40 mb-2">
            <Trophy className="w-3.5 h-3.5 text-[#B8860B]" />
            AUCTION COMPLETE
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-heading uppercase tracking-wide text-[#F4F6FA]">
            Official Auction Results
          </h1>
          <p className="text-xs sm:text-sm text-[#B0BED0] mt-1 font-body">
            Season {roomState.settings.season} · Room Code: <span className="font-number font-bold text-[#2858A5]">{roomState.roomCode}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-5 py-3 bg-[#3DBB83] hover:bg-[#2A9B6A] text-white font-heading font-bold uppercase tracking-wider rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 stroke-[3]" />
            <span>Export CSV Report</span>
          </button>

          {isHost && (unsoldLots.length > 0 || skippedLots.length > 0) && (
            <button
              onClick={onReAuctionUnsold}
              className="px-5 py-3 bg-[#B8860B] hover:bg-[#996D07] text-white font-heading font-bold uppercase tracking-wider rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4 stroke-[3]" />
              <span>Re-Auction Round ({unsoldLots.length + skippedLots.length})</span>
            </button>
          )}

          {isHost && (
            <button
              onClick={onRestartAuction}
              className="px-5 py-3 bg-[#172840] hover:bg-[#D5E2F5] text-[#2858A5] border border-[#344B65] rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all"
            >
              Restart Lobby
            </button>
          )}
        </div>
      </div>

      {/* Aggregate KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-[#203650] border border-[#344B65] rounded-xl p-4 shadow-sm">
          <span className="text-[10px] text-[#B0BED0] uppercase font-heading font-bold tracking-wider block">Total Lots</span>
          <div className="text-2xl font-number font-bold text-[#F4F6FA] mt-1">{history.length}</div>
        </div>

        <div className="bg-[#203650] border border-[#344B65] rounded-xl p-4 shadow-sm">
          <span className="text-[10px] text-[#3DBB83] uppercase font-heading font-bold tracking-wider block">Players Sold</span>
          <div className="text-2xl font-number font-bold text-[#3DBB83] mt-1">{soldLots.length}</div>
        </div>

        <div className="bg-[#203650] border border-[#344B65] rounded-xl p-4 shadow-sm">
          <span className="text-[10px] text-[#B0BED0] uppercase font-heading font-bold tracking-wider block">Unsold</span>
          <div className="text-2xl font-number font-bold text-[#B0BED0] mt-1">{unsoldLots.length}</div>
        </div>

        <div className="bg-[#203650] border border-[#344B65] rounded-xl p-4 shadow-sm">
          <span className="text-[10px] text-[#B8860B] uppercase font-heading font-bold tracking-wider block">Skipped</span>
          <div className="text-2xl font-number font-bold text-[#B8860B] mt-1">{skippedLots.length}</div>
        </div>

        <div className="bg-[#203650] border border-[#344B65] rounded-xl p-4 shadow-sm">
          <span className="text-[10px] text-[#3DBB83] uppercase font-heading font-bold tracking-wider block">Total Spent</span>
          <div className="text-xl font-number font-bold text-[#3DBB83] mt-1">
            ₹{(totalSpentAll / 10000000).toFixed(1)} Cr
          </div>
        </div>
      </div>

      {/* My Franchise Final Squad & Shareable Card */}
      {myTeamId && (
        <div className="bg-white border-2 border-[#3DBB83] rounded-2xl p-6 sm:p-7 shadow-md relative space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#344B65]">
            <div className="flex items-center gap-3.5">
              <TeamLogo teamId={myTeamId} className="w-12 h-12 object-contain drop-shadow-sm" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-heading font-bold text-[#3DBB83] uppercase tracking-wider">
                    My Franchise Final Squad
                  </span>
                  <span className="bg-[#172840] text-[#2858A5] text-[10px] font-number font-bold px-2 py-0.5 rounded border border-[#344B65]">
                    {myTeamId}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-heading uppercase text-[#F4F6FA]">
                  {IPL_FRANCHISES[myTeamId]?.name}
                </h2>
              </div>
            </div>

            <button
              onClick={handleCopyShareCard}
              className="px-4 py-2 bg-[#172840] hover:bg-[#D5E2F5] border border-[#344B65] text-[#2858A5] rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto"
            >
              {copiedShare ? (
                <>
                  <Check className="w-4 h-4 text-[#3DBB83]" />
                  <span className="text-[#3DBB83]">Summary Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#2858A5]" />
                  <span>Copy Shareable Card</span>
                </>
              )}
            </button>
          </div>

          {/* Squad Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-[#101B2D] p-3 rounded-xl border border-[#344B65]">
              <span className="text-[10px] text-[#B0BED0] uppercase font-heading font-bold tracking-wider block">Total Spent</span>
              <span className="text-lg font-number font-bold text-[#3DBB83]">
                ₹{(mySpent / 10000000).toFixed(2)} Cr
              </span>
            </div>
            <div className="bg-[#101B2D] p-3 rounded-xl border border-[#344B65]">
              <span className="text-[10px] text-[#B0BED0] uppercase font-heading font-bold tracking-wider block">Remaining Purse</span>
              <span className="text-lg font-number font-bold text-[#2858A5]">
                ₹{(myPurse / 10000000).toFixed(2)} Cr
              </span>
            </div>
            <div className="bg-[#101B2D] p-3 rounded-xl border border-[#344B65]">
              <span className="text-[10px] text-[#B0BED0] uppercase font-heading font-bold tracking-wider block">Total Squad</span>
              <span className="text-lg font-number font-bold text-[#F4F6FA]">
                {mySquad.length} Players
              </span>
            </div>
            <div className="bg-[#101B2D] p-3 rounded-xl border border-[#344B65]">
              <span className="text-[10px] text-[#B0BED0] uppercase font-heading font-bold tracking-wider block">Overseas</span>
              <span className="text-lg font-number font-bold text-[#3DBB83]">
                {myOverseas} / 8 Max
              </span>
            </div>
          </div>

          {/* Squad Composition Breakdown */}
          <div className="flex items-center gap-2 flex-wrap text-[11px] font-heading font-bold uppercase">
            <span className="bg-[#172840] border border-[#344B65] text-[#F4F6FA] px-2.5 py-1 rounded">
              🏏 Batters: <strong className="text-[#2858A5] font-number">{myBatters}</strong>
            </span>
            <span className="bg-[#172840] border border-[#344B65] text-[#F4F6FA] px-2.5 py-1 rounded">
              ⚡ All-Rounders: <strong className="text-[#3DBB83] font-number">{myAllRounders}</strong>
            </span>
            <span className="bg-[#172840] border border-[#344B65] text-[#F4F6FA] px-2.5 py-1 rounded">
              🎯 Bowlers: <strong className="text-[#2858A5] font-number">{myBowlers}</strong>
            </span>
            <span className="bg-[#172840] border border-[#344B65] text-[#F4F6FA] px-2.5 py-1 rounded">
              🧤 WKs: <strong className="text-[#F4F6FA] font-number">{myWKs}</strong>
            </span>
          </div>

          {/* Acquired Players List */}
          {mySquad.length > 0 && (
            <div className="space-y-1.5 pt-2">
              <span className="text-[11px] text-[#B0BED0] uppercase font-heading font-bold tracking-wider block">
                Acquired Players ({mySquad.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                {mySquad.map(p => (
                  <div key={p.id} className="p-2.5 bg-[#101B2D] rounded-xl border border-[#344B65] flex items-center justify-between text-xs">
                    <div className="truncate pr-2">
                      <span className="font-heading font-bold text-[#F4F6FA] block truncate uppercase">{p.name}</span>
                      <span className="text-[10px] text-[#B0BED0]">
                        {p.category} · {p.is_overseas ? `✈️ ${p.nationality}` : '🇮🇳 Ind'}
                      </span>
                    </div>
                    <span className="font-number font-bold text-[#3DBB83] shrink-0 text-xs">
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
      <div className="bg-[#203650] border border-[#344B65] rounded-2xl p-6 shadow-sm">
        <h3 className="font-heading font-bold text-lg text-[#F4F6FA] mb-2 flex items-center gap-2 uppercase tracking-wide">
          <Shield className="w-5 h-5 text-[#3DBB83]" />
          <span>Final Squad Compliance Audit</span>
        </h3>
        <p className="text-xs text-[#B0BED0] mb-4">
          Verification of min 18 players, max 25 players, max 8 overseas, and non-negative purse balances.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#344B65] text-[#B0BED0] font-heading font-bold uppercase tracking-wider">
                <th className="pb-3 pl-3">Franchise</th>
                <th className="pb-3">Squad Count</th>
                <th className="pb-3">Overseas</th>
                <th className="pb-3">Remaining Purse</th>
                <th className="pb-3">Spent</th>
                <th className="pb-3 pr-3 text-right">Compliance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#344B65]">
              {teamAudits.map(({ team, squad, purse, spent, overseas, isValid, errors }) => (
                <tr key={team.id} className="hover:bg-[#172840]/30 transition-colors">
                  <td className="py-3.5 pl-3 font-heading font-bold text-[#F4F6FA] flex items-center gap-2.5 uppercase">
                    <TeamLogo teamId={team.id} className="w-8 h-8 shrink-0 shadow-sm" />
                    <span>{team.name}</span>
                  </td>
                  <td className="py-3.5 font-number">
                    <span className={squad.length < minSquad ? 'text-[#E85D5D] font-bold' : 'text-[#F4F6FA]'}>
                      {squad.length}
                    </span>
                    <span className="text-[#B0BED0]"> / {minSquad}-{maxSquad}</span>
                  </td>
                  <td className="py-3.5 font-number">
                    <span className={overseas > maxOverseas ? 'text-[#E85D5D] font-bold' : 'text-[#F4F6FA]'}>
                      {overseas}
                    </span>
                    <span className="text-[#B0BED0]"> / {maxOverseas}</span>
                  </td>
                  <td className="py-3.5 font-number font-bold text-[#3DBB83]">
                    ₹{(purse / 10000000).toFixed(2)} Cr
                  </td>
                  <td className="py-3.5 font-number font-bold text-[#2858A5]">
                    ₹{(spent / 10000000).toFixed(2)} Cr
                  </td>
                  <td className="py-3.5 pr-3 text-right">
                    {isValid ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-heading font-bold text-[#3DBB83] bg-[#3DBB83]/10 border border-[#3DBB83]/30 px-3 py-1 rounded uppercase">
                        <CheckCircle className="w-3.5 h-3.5" />
                        COMPLIANT
                      </span>
                    ) : (
                      <div className="inline-flex flex-col items-end">
                        <span className="inline-flex items-center gap-1 text-[11px] font-heading font-bold text-[#E85D5D] bg-[#E85D5D]/10 border border-[#E85D5D]/30 px-2.5 py-0.5 rounded uppercase">
                          <XCircle className="w-3.5 h-3.5" />
                          INVALID SQUAD
                        </span>
                        <span className="text-[10px] text-[#E85D5D] mt-0.5">
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
