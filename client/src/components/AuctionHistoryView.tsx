import React from 'react';
import { History, Award, XCircle, FastForward, Plane } from 'lucide-react';
import { AuctionLot, IPL_FRANCHISES } from '../types.js';
import { TeamLogo } from './TeamLogo.js';

interface AuctionHistoryViewProps {
  history: AuctionLot[];
  season?: string;
  roomCode?: string;
}

export const AuctionHistoryView: React.FC<AuctionHistoryViewProps> = ({
  history,
  roomCode
}) => {
  const soldLots = history.filter(h => h.status === 'SOLD');
  const unsoldLots = history.filter(h => h.status === 'UNSOLD');
  const totalSpent = soldLots.reduce((acc, curr) => acc + (curr.soldPrice || 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5 font-body">
      {/* Top Banner & Summary Ribbon */}
      <div className="bg-[#12142A] border border-[#23274D] rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-[#0A0B14] text-[#C8FF3D] text-xs font-heading font-extrabold uppercase tracking-wider px-3 py-1 rounded-md border border-[#C8FF3D]/30 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> LIVE AUCTION TIMELINE
            </span>
            {roomCode && (
              <span className="text-xs text-[#FFC93D] font-number font-bold bg-[#0A0B14] px-2.5 py-0.5 rounded border border-[#23274D]">Room: {roomCode}</span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading uppercase tracking-tight text-white">
            Auction History
          </h1>
          <p className="text-xs text-[#9E9EB8]">
            Authoritative chronological log of finalized player lots for this session.
          </p>
        </div>

        {/* Compact Summary KPIs */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-[#0A0B14] border border-[#23274D] rounded-2xl px-3.5 py-2.5 shadow-sm">
            <span className="text-[10px] text-[#9E9EB8] block font-heading font-extrabold uppercase tracking-wider">Total</span>
            <span className="font-number font-black text-white text-base">{history.length}</span>
          </div>
          <div className="bg-[#0A0B14] border border-[#23274D] rounded-2xl px-3.5 py-2.5 shadow-sm">
            <span className="text-[10px] text-[#C8FF3D] block font-heading font-extrabold uppercase tracking-wider">Sold</span>
            <span className="font-number font-black text-[#C8FF3D] text-base">{soldLots.length}</span>
          </div>
          <div className="bg-[#0A0B14] border border-[#23274D] rounded-2xl px-3.5 py-2.5 shadow-sm">
            <span className="text-[10px] text-[#FF3B5C] block font-heading font-extrabold uppercase tracking-wider">Unsold</span>
            <span className="font-number font-black text-[#FF3B5C] text-base">{unsoldLots.length}</span>
          </div>
          <div className="bg-[#0A0B14] border border-[#23274D] rounded-2xl px-3.5 py-2.5 shadow-sm">
            <span className="text-[10px] text-[#C8FF3D] block font-heading font-extrabold uppercase tracking-wider">Spent</span>
            <span className="font-number font-black text-[#C8FF3D] text-sm">₹{(totalSpent / 10000000).toFixed(1)} Cr</span>
          </div>
        </div>
      </div>

      {/* History Ledger Table */}
      <div className="bg-[#12142A] border border-[#23274D] rounded-3xl p-6 shadow-xl">
        {history.length === 0 ? (
          <div className="py-16 text-center text-[#9E9EB8]">
            <History className="w-12 h-12 mx-auto mb-3 opacity-30 text-[#C8FF3D]" />
            <h3 className="text-sm font-heading font-extrabold uppercase text-white">No Auction Records Yet</h3>
            <p className="text-xs text-[#62658A] mt-1">
              Completed lots will appear here live with winning franchise and final hammer price.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#23274D] text-[#9E9EB8] font-heading font-extrabold uppercase tracking-wider text-[11px]">
                  <th className="pb-3.5 pl-3">Lot #</th>
                  <th className="pb-3.5">Player</th>
                  <th className="pb-3.5">Role</th>
                  <th className="pb-3.5">Base Price</th>
                  <th className="pb-3.5">Outcome</th>
                  <th className="pb-3.5">Winning Franchise</th>
                  <th className="pb-3.5 pr-3 text-right">Sold Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#23274D]">
                {history.map((lot, idx) => {
                  const p = lot.player;
                  const isSold = lot.status === 'SOLD';
                  const isUnsold = lot.status === 'UNSOLD';
                  const isSkipped = lot.status === 'SKIPPED';
                  const winningFranchise = lot.winningTeam ? IPL_FRANCHISES[lot.winningTeam] : null;

                  return (
                    <tr key={`${lot.lotNumber}-${idx}`} className="hover:bg-[#181B38]/50 transition-colors">
                      <td className="py-3.5 pl-3 font-number text-[#9E9EB8] font-bold">
                        #{lot.lotNumber}
                      </td>

                      <td className="py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-[#0A0B14] border border-[#23274D] overflow-hidden flex items-center justify-center shrink-0">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover object-top" />
                            ) : (
                              <span className="font-heading font-black text-[10px] text-[#C8FF3D]">{p.name.slice(0, 2)}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-heading font-bold text-white flex items-center gap-1.5 uppercase">
                              <span>{p.name}</span>
                              {p.is_overseas && (
                                <span className="text-[9px] text-[#7C5CFF] bg-[#0A0B14] border border-[#23274D] px-1.5 py-0.5 rounded font-extrabold flex items-center gap-0.5">
                                  <Plane className="w-2.5 h-2.5" /> OS
                                </span>
                              )}
                              {p.is_marquee && (
                                <span className="text-[9px] text-[#FFC93D] bg-[#FFC93D]/15 border border-[#FFC93D]/40 px-1.5 py-0.5 rounded font-extrabold font-heading uppercase">
                                  MARQUEE
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#9E9EB8]">{p.nationality}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 text-[#9E9EB8]">
                        <span className="bg-[#0A0B14] border border-[#23274D] px-2.5 py-1 rounded-lg text-[11px] font-heading font-bold uppercase text-[#C8FF3D]">
                          {p.category}
                        </span>
                      </td>

                      <td className="py-3.5 font-number text-[#9E9EB8]">
                        {p.base_price_display}
                      </td>

                      <td className="py-3.5">
                        {isSold && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-heading font-extrabold bg-[#C8FF3D]/15 text-[#C8FF3D] border border-[#C8FF3D]/30 uppercase">
                            <Award className="w-3.5 h-3.5" /> SOLD
                          </span>
                        )}
                        {isUnsold && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-heading font-extrabold bg-[#FF3B5C]/15 text-[#FF3B5C] border border-[#FF3B5C]/30 uppercase">
                            <XCircle className="w-3.5 h-3.5" /> UNSOLD
                          </span>
                        )}
                        {isSkipped && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-heading font-extrabold bg-[#FFC93D]/15 text-[#FFC93D] border border-[#FFC93D]/40 uppercase">
                            <FastForward className="w-3.5 h-3.5" /> SKIPPED
                          </span>
                        )}
                      </td>

                      <td className="py-3.5">
                        {winningFranchise ? (
                          <div className="flex items-center gap-2">
                            <TeamLogo teamId={lot.winningTeam} className="w-6 h-6 shrink-0 drop-shadow-xs" />
                            <span className="font-heading font-bold text-white truncate max-w-[140px] uppercase">
                              {winningFranchise.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#62658A] italic">—</span>
                        )}
                      </td>

                      <td className="py-3.5 pr-3 text-right font-number font-black text-sm">
                        {isSold ? (
                          <span className="text-[#C8FF3D]">
                            ₹{((lot.soldPrice || 0) / 10000000).toFixed(2)} Cr
                          </span>
                        ) : (
                          <span className="text-[#62658A] font-normal text-xs">—</span>
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
