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
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5 font-body">
      {/* Top Banner & Summary Ribbon */}
      <div className="bg-white border border-[#D8D8D1] rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[#E6EDF8] text-[#173B78] text-xs font-heading font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border border-[#D8D8D1] flex items-center gap-1">
              <History className="w-3 h-3" /> LIVE AUCTION TIMELINE
            </span>
            {roomCode && (
              <span className="text-xs text-[#173B78] font-number font-bold">Room: {roomCode}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold font-heading uppercase tracking-wide text-[#18243A]">
            Current Auction History
          </h1>
          <p className="text-xs text-[#647084]">
            Chronological log of finalized player lots for this auction session.
          </p>
        </div>

        {/* Compact Summary KPIs */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-[#F3F0E8] border border-[#D8D8D1] rounded-xl px-3 py-2">
            <span className="text-[10px] text-[#647084] block font-heading font-bold uppercase tracking-wider">Total Lots</span>
            <span className="font-number font-bold text-[#18243A] text-base">{history.length}</span>
          </div>
          <div className="bg-[#F3F0E8] border border-[#D8D8D1] rounded-xl px-3 py-2">
            <span className="text-[10px] text-[#167447] block font-heading font-bold uppercase tracking-wider">Sold</span>
            <span className="font-number font-bold text-[#167447] text-base">{soldLots.length}</span>
          </div>
          <div className="bg-[#F3F0E8] border border-[#D8D8D1] rounded-xl px-3 py-2">
            <span className="text-[10px] text-[#C74444] block font-heading font-bold uppercase tracking-wider">Unsold</span>
            <span className="font-number font-bold text-[#C74444] text-base">{unsoldLots.length}</span>
          </div>
          <div className="bg-[#F3F0E8] border border-[#D8D8D1] rounded-xl px-3 py-2">
            <span className="text-[10px] text-[#176B48] block font-heading font-bold uppercase tracking-wider">Spent</span>
            <span className="font-number font-bold text-[#176B48] text-sm">₹{(totalSpent / 10000000).toFixed(1)} Cr</span>
          </div>
        </div>
      </div>

      {/* History Ledger Table */}
      <div className="bg-white border border-[#D8D8D1] rounded-2xl p-5 shadow-sm">
        {history.length === 0 ? (
          <div className="py-16 text-center text-[#647084]">
            <History className="w-10 h-10 mx-auto mb-3 opacity-30 text-[#173B78]" />
            <h3 className="text-sm font-heading font-bold uppercase text-[#18243A]">No Auction Records Yet</h3>
            <p className="text-xs text-[#647084] mt-1">
              Completed lots will appear here live with winning team and sale price.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#D8D8D1] text-[#647084] font-heading font-bold uppercase tracking-wider text-[11px]">
                  <th className="pb-3 pl-3">Lot #</th>
                  <th className="pb-3">Player</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Base Price</th>
                  <th className="pb-3">Outcome</th>
                  <th className="pb-3">Winning Franchise</th>
                  <th className="pb-3 pr-3 text-right">Sold Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8D8D1]">
                {history.map((lot, idx) => {
                  const p = lot.player;
                  const isSold = lot.status === 'SOLD';
                  const isUnsold = lot.status === 'UNSOLD';
                  const isSkipped = lot.status === 'SKIPPED';
                  const winningFranchise = lot.winningTeam ? IPL_FRANCHISES[lot.winningTeam] : null;

                  return (
                    <tr key={`${lot.lotNumber}-${idx}`} className="hover:bg-[#E6EDF8]/30 transition-colors">
                      <td className="py-3 pl-3 font-number text-[#647084] font-bold">
                        #{lot.lotNumber}
                      </td>

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
                            <div className="font-heading font-bold text-[#18243A] flex items-center gap-1.5 uppercase">
                              <span>{p.name}</span>
                              {p.is_overseas && (
                                <span className="text-[9px] text-[#173B78] bg-[#E6EDF8] border border-[#D8D8D1] px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
                                  <Plane className="w-2 h-2" /> OS
                                </span>
                              )}
                              {p.is_marquee && (
                                <span className="text-[9px] text-[#B8860B] bg-[#F0C65B]/20 border border-[#F0C65B]/40 px-1.5 py-0.2 rounded font-bold font-heading uppercase">
                                  MARQUEE
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#647084]">{p.nationality}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 text-[#647084]">
                        <span className="bg-[#F3F0E8] border border-[#D8D8D1] px-2 py-0.5 rounded text-[11px] font-heading font-bold uppercase">
                          {p.category}
                        </span>
                      </td>

                      <td className="py-3 font-number text-[#647084]">
                        {p.base_price_display}
                      </td>

                      <td className="py-3">
                        {isSold && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-heading font-bold bg-[#167447]/10 text-[#167447] border border-[#167447]/30 uppercase">
                            <Award className="w-3 h-3" /> SOLD
                          </span>
                        )}
                        {isUnsold && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-heading font-bold bg-[#C74444]/10 text-[#C74444] border border-[#C74444]/30 uppercase">
                            <XCircle className="w-3 h-3" /> UNSOLD
                          </span>
                        )}
                        {isSkipped && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-heading font-bold bg-[#F0C65B]/20 text-[#B8860B] border border-[#F0C65B]/40 uppercase">
                            <FastForward className="w-3 h-3" /> SKIPPED
                          </span>
                        )}
                      </td>

                      <td className="py-3">
                        {winningFranchise ? (
                          <div className="flex items-center gap-2">
                            <TeamLogo teamId={lot.winningTeam} className="w-6 h-6 shrink-0 shadow-sm" />
                            <span className="font-heading font-bold text-[#18243A] truncate max-w-[140px] uppercase">
                              {winningFranchise.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#647084] italic">—</span>
                        )}
                      </td>

                      <td className="py-3 pr-3 text-right font-number font-bold text-sm">
                        {isSold ? (
                          <span className="text-[#167447]">
                            ₹{((lot.soldPrice || 0) / 10000000).toFixed(2)} Cr
                          </span>
                        ) : (
                          <span className="text-[#647084] font-normal text-xs">—</span>
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

