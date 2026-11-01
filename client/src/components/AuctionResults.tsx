import React from 'react';
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
  FileSpreadsheet
} from 'lucide-react';
import { RoomState, IPL_FRANCHISES, IPLTeamId } from '../types.js';

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
  const isHost = roomState.members[myMemberId]?.isHost;
  const history = roomState.history;
  const soldLots = history.filter(h => h.status === 'SOLD');
  const unsoldLots = history.filter(h => h.status === 'UNSOLD');
  const skippedLots = history.filter(h => h.status === 'SKIPPED');

  const totalSpentAll = soldLots.reduce((acc, curr) => acc + (curr.soldPrice || 0), 0);

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
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-amber-500/40 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-amber-400/20 text-amber-300 text-xs font-bold px-3 py-1 rounded-full border border-amber-400/30 mb-2">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            AUCTION COMPLETE
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-white">
            Official Auction Results
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Season {roomState.settings.season} · Room Code: {roomState.roomCode}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-black font-display font-bold rounded-xl text-xs transition-all shadow-glow-cyan flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV Report</span>
          </button>

          {isHost && (unsoldLots.length > 0 || skippedLots.length > 0) && (
            <button
              onClick={onReAuctionUnsold}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-display font-bold rounded-xl text-xs transition-all shadow-glow-amber flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Re-Auction Round ({unsoldLots.length + skippedLots.length})</span>
            </button>
          )}

          {isHost && (
            <button
              onClick={onRestartAuction}
              className="px-4 py-2.5 bg-navy-800 hover:bg-navy-700 text-slate-300 hover:text-white border border-navy-700 rounded-xl text-xs font-bold transition-all"
            >
              Restart Lobby
            </button>
          )}
        </div>
      </div>

      {/* Aggregate KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="glass-card rounded-xl p-4 border border-navy-700/60">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Lots</span>
          <div className="text-2xl font-mono font-bold text-white mt-1">{history.length}</div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-emerald-500/30">
          <span className="text-[10px] text-emerald-400 uppercase font-semibold block">Players Sold</span>
          <div className="text-2xl font-mono font-bold text-emerald-300 mt-1">{soldLots.length}</div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-navy-700/60">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Unsold</span>
          <div className="text-2xl font-mono font-bold text-slate-300 mt-1">{unsoldLots.length}</div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-amber-500/30">
          <span className="text-[10px] text-amber-400 uppercase font-semibold block">Skipped</span>
          <div className="text-2xl font-mono font-bold text-amber-300 mt-1">{skippedLots.length}</div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-cyan-400/30">
          <span className="text-[10px] text-cyan-400 uppercase font-semibold block">Total Spent</span>
          <div className="text-xl font-mono font-bold text-cyan-300 mt-1">
            ₹{(totalSpentAll / 10000000).toFixed(1)} Cr
          </div>
        </div>
      </div>

      {/* Squad Validation Audit Table */}
      <div className="glass-panel rounded-2xl p-6 border border-navy-600/70">
        <h3 className="font-display font-bold text-lg text-white mb-2 flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-400" />
          <span>Final Squad Compliance Audit</span>
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Strict verification of min 18 players, max 25 players, max 8 overseas, and positive purse constraints.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-navy-700/80 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pl-2">Franchise</th>
                <th className="pb-3">Squad Count</th>
                <th className="pb-3">Overseas</th>
                <th className="pb-3">Remaining Purse</th>
                <th className="pb-3">Spent</th>
                <th className="pb-3 pr-2 text-right">Compliance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/80">
              {teamAudits.map(({ team, squad, purse, spent, overseas, isValid, errors }) => (
                <tr key={team.id} className="hover:bg-navy-800/40 transition-colors">
                  <td className="py-3.5 pl-2 font-display font-bold text-white flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0"
                      style={{ backgroundColor: team.primaryColor, color: team.textColor }}
                    >
                      {team.shortName}
                    </div>
                    <span>{team.name}</span>
                  </td>
                  <td className="py-3.5 font-mono">
                    <span className={squad.length < minSquad ? 'text-ruby-400 font-bold' : 'text-slate-200'}>
                      {squad.length}
                    </span>
                    <span className="text-slate-500"> / {minSquad}-{maxSquad}</span>
                  </td>
                  <td className="py-3.5 font-mono">
                    <span className={overseas > maxOverseas ? 'text-ruby-400 font-bold' : 'text-slate-200'}>
                      {overseas}
                    </span>
                    <span className="text-slate-500"> / {maxOverseas}</span>
                  </td>
                  <td className="py-3.5 font-mono font-bold text-cyan-300">
                    ₹{(purse / 10000000).toFixed(2)} Cr
                  </td>
                  <td className="py-3.5 font-mono text-amber-300">
                    ₹{(spent / 10000000).toFixed(2)} Cr
                  </td>
                  <td className="py-3.5 pr-2 text-right">
                    {isValid ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                        <CheckCircle className="w-3.5 h-3.5" />
                        COMPLIANT
                      </span>
                    ) : (
                      <div className="inline-flex flex-col items-end">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-ruby-400 bg-ruby-500/10 border border-ruby-500/20 px-2 py-0.5 rounded-md">
                          <XCircle className="w-3.5 h-3.5" />
                          INVALID SQUAD
                        </span>
                        <span className="text-[10px] text-ruby-300/80 mt-0.5">
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
