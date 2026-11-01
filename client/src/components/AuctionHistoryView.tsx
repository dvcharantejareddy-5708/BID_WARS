import React from 'react';
import { History, Award, XCircle, FastForward, Trophy, Clock, Plane } from 'lucide-react';
import { AuctionLot, IPL_FRANCHISES } from '../types.js';
import { TeamLogo } from './TeamLogo.js';

interface AuctionHistoryViewProps {
  history: AuctionLot[];
  season?: string;
  roomCode?: string;
}

export const AuctionHistoryView: React.FC<AuctionHistoryViewProps> = ({
  history,
  season = '2026',
  roomCode
}) => {
  const soldLots = history.filter(h => h.status === 'SOLD');
  const unsoldLots = history.filter(h => h.status === 'UNSOLD');
  const skippedLots = history.filter(h => h.status === 'SKIPPED');
  const totalSpent = soldLots.reduce((acc, curr) => acc + (curr.soldPrice || 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      {/* Top Banner & Summary Ribbon */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-2xl p-5 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[#00E676]/10 text-[#00E676] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#00E676]/20 flex items-center gap-1">
              <History className="w-3 h-3" /> LIVE AUCTION TIMELINE
            </span>
            {roomCode && (
              <span className="text-xs text-[#8E8E93] font-mono">Room: {roomCode}</span>
            )}
          </div>
          <h1 className="text-2xl font-black font-display text-white">
            Current Auction History
          </h1>
          <p className="text-xs text-[#8E8E93]">
            Chronological log of finalized player lots for this auction session.
          </p>
        </div>

        {/* Compact Summary KPIs */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-[#151515] border border-[#262626] rounded-xl px-3 py-2">
            <span className="text-[10px] text-[#8E8E93] block uppercase">Total Lots</span>
            <span className="font-mono font-bold text-white text-base">{history.length}</span>
          </div>
          <div className="bg-[#151515] border border-[#00E676]/30 rounded-xl px-3 py-2">
            <span className="text-[10px] text-[#00E676] block uppercase">Sold</span>
            <span className="font-mono font-bold text-[#00E676] text-base">{soldLots.length}</span>
          </div>
          <div className="bg-[#151515] border border-[#FF5252]/30 rounded-xl px-3 py-2">
            <span className="text-[10px] text-[#FF5252] block uppercase">Unsold</span>
            <span className="font-mono font-bold text-[#FF5252] text-base">{unsoldLots.length}</span>
          </div>
          <div className="bg-[#151515] border border-[#FFC857]/30 rounded-xl px-3 py-2">
            <span className="text-[10px] text-[#FFC857] block uppercase">Spent</span>
            <span className="font-mono font-bold text-[#FFC857] text-sm">₹{(totalSpent / 10000000).toFixed(1)} Cr</span>
          </div>
        </div>
      </div>

      {/* History Ledger Table */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-2xl p-5 shadow-2xl">
        {history.length === 0 ? (
          <div className="py-16 text-center text-[#8E8E93]">
            <History className="w-10 h-10 mx-auto mb-3 opacity-30 text-white" />
            <h3 className="text-sm font-bold text-white">No Auction Records Yet</h3>
            <p className="text-xs text-[#8E8E93] mt-1">
              Completed lots will appear here live with winning team and sale price.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#262626] text-[#8E8E93] font-semibold uppercase tracking-wider text-[11px]">
                  <th className="pb-3 pl-3">Lot #</th>
                  <th className="pb-3">Player</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Base Price</th>
                  <th className="pb-3">Outcome</th>
                  <th className="pb-3">Winning Franchise</th>
                  <th className="pb-3 pr-3 text-right">Sold Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c1c1c]">
                {history.map((lot, idx) => {
                  const p = lot.player;
                  const isSold = lot.status === 'SOLD';
                  const isUnsold = lot.status === 'UNSOLD';
                  const isSkipped = lot.status === 'SKIPPED';
                  const winningFranchise = lot.winningTeam ? IPL_FRANCHISES[lot.winningTeam] : null;

                  return (
                    <tr key={`${lot.lotNumber}-${idx}`} className="hover:bg-[#151515] transition-colors">
                      <td className="py-3 pl-3 font-mono text-[#8E8E93] font-semibold">
                        #{lot.lotNumber}
                      </td>

                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#181818] border border-[#262626] overflow-hidden flex items-center justify-center shrink-0">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover object-top" />
                            ) : (
                              <span className="font-bold text-[10px] text-[#00E676]">{p.name.slice(0, 2)}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-display font-bold text-white flex items-center gap-1.5">
                              <span>{p.name}</span>
                              {p.is_overseas && (
                                <span className="text-[9px] text-[#00E676] bg-[#00E676]/10 border border-[#00E676]/20 px-1.5 py-0.2 rounded-full font-bold flex items-center gap-0.5">
                                  <Plane className="w-2 h-2" /> OS
                                </span>
                              )}
                              {p.is_marquee && (
                                <span className="text-[9px] text-[#FFC857] bg-[#FFC857]/15 border border-[#FFC857]/30 px-1.5 py-0.2 rounded font-bold">
                                  MARQUEE
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#8E8E93]">{p.nationality}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 text-slate-300">
                        <span className="bg-[#181818] border border-[#262626] px-2 py-0.5 rounded text-[11px]">
                          {p.category}
                        </span>
                      </td>

                      <td className="py-3 font-mono text-[#8E8E93]">
                        {p.base_price_display}
                      </td>

                      <td className="py-3">
                        {isSold && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/30">
                            <Award className="w-3 h-3" /> SOLD
                          </span>
                        )}
                        {isUnsold && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FF5252]/10 text-[#FF5252] border border-[#FF5252]/30">
                            <XCircle className="w-3 h-3" /> UNSOLD
                          </span>
                        )}
                        {isSkipped && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFC857]/10 text-[#FFC857] border border-[#FFC857]/30">
                            <FastForward className="w-3 h-3" /> SKIPPED
                          </span>
                        )}
                      </td>

                      <td className="py-3">
                        {winningFranchise ? (
                          <div className="flex items-center gap-2">
                            <TeamLogo teamId={lot.winningTeam} className="w-6 h-6 shrink-0 shadow-sm" />
                            <span className="font-semibold text-white truncate max-w-[140px]">
                              {winningFranchise.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#8E8E93] italic">—</span>
                        )}
                      </td>

                      <td className="py-3 pr-3 text-right font-mono font-bold text-sm">
                        {isSold ? (
                          <span className="text-[#00E676]">
                            ₹{((lot.soldPrice || 0) / 10000000).toFixed(2)} Cr
                          </span>
                        ) : (
                          <span className="text-[#8E8E93] font-normal text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

