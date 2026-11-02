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
      <div className="bg-[#203650] border border-[#344B65] rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[#172840] text-[#2858A5] text-xs font-heading font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border border-[#344B65] flex items-center gap-1">
              <History className="w-3 h-3" /> LIVE AUCTION TIMELINE
            </span>
            {roomCode && (
              <span className="text-xs text-[#2858A5] font-number font-bold">Room: {roomCode}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold font-heading uppercase tracking-wide text-[#F4F6FA]">
            Current Auction History
          </h1>
          <p className="text-xs text-[#B0BED0]">
            Chronological log of finalized player lots for this auction session.
          </p>
        </div>

        {/* Compact Summary KPIs */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-[#101B2D] border border-[#344B65] rounded-xl px-3 py-2">
            <span className="text-[10px] text-[#B0BED0] block font-heading font-bold uppercase tracking-wider">Total Lots</span>
            <span className="font-number font-bold text-[#F4F6FA] text-base">{history.length}</span>
          </div>
          <div className="bg-[#101B2D] border border-[#344B65] rounded-xl px-3 py-2">
            <span className="text-[10px] text-[#3DBB83] block font-heading font-bold uppercase tracking-wider">Sold</span>
            <span className="font-number font-bold text-[#3DBB83] text-base">{soldLots.length}</span>
          </div>
          <div className="bg-[#101B2D] border border-[#344B65] rounded-xl px-3 py-2">
            <span className="text-[10px] text-[#E85D5D] block font-heading font-bold uppercase tracking-wider">Unsold</span>
            <span className="font-number font-bold text-[#E85D5D] text-base">{unsoldLots.length}</span>
          </div>
          <div className="bg-[#101B2D] border border-[#344B65] rounded-xl px-3 py-2">
            <span className="text-[10px] text-[#3DBB83] block font-heading font-bold uppercase tracking-wider">Spent</span>
            <span className="font-number font-bold text-[#3DBB83] text-sm">₹{(totalSpent / 10000000).toFixed(1)} Cr</span>
          </div>
        </div>
      </div>

      {/* History Ledger Table */}
      <div className="bg-[#203650] border border-[#344B65] rounded-2xl p-5 shadow-sm">
        {history.length === 0 ? (
          <div className="py-16 text-center text-[#B0BED0]">
            <History className="w-10 h-10 mx-auto mb-3 opacity-30 text-[#2858A5]" />
            <h3 className="text-sm font-heading font-bold uppercase text-[#F4F6FA]">No Auction Records Yet</h3>
            <p className="text-xs text-[#B0BED0] mt-1">
              Completed lots will appear here live with winning team and sale price.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#344B65] text-[#B0BED0] font-heading font-bold uppercase tracking-wider text-[11px]">
                  <th className="pb-3 pl-3">Lot #</th>
                  <th className="pb-3">Player</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Base Price</th>
                  <th className="pb-3">Outcome</th>
                  <th className="pb-3">Winning Franchise</th>
                  <th className="pb-3 pr-3 text-right">Sold Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#344B65]">
                {history.map((lot, idx) => {
                  const p = lot.player;
                  const isSold = lot.status === 'SOLD';
                  const isUnsold = lot.status === 'UNSOLD';
                  const isSkipped = lot.status === 'SKIPPED';
                  const winningFranchise = lot.winningTeam ? IPL_FRANCHISES[lot.winningTeam] : null;

                  return (
                    <tr key={`${lot.lotNumber}-${idx}`} className="hover:bg-[#172840]/30 transition-colors">
                      <td className="py-3 pl-3 font-number text-[#B0BED0] font-bold">
                        #{lot.lotNumber}
                      </td>

                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#172840] border border-[#344B65] overflow-hidden flex items-center justify-center shrink-0">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover object-top" />
                            ) : (
                              <span className="font-heading font-bold text-[10px] text-[#2858A5]">{p.name.slice(0, 2)}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-heading font-bold text-[#F4F6FA] flex items-center gap-1.5 uppercase">
                              <span>{p.name}</span>
                              {p.is_overseas && (
                                <span className="text-[9px] text-[#2858A5] bg-[#172840] border border-[#344B65] px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
                                  <Plane className="w-2 h-2" /> OS
                                </span>
                              )}
                              {p.is_marquee && (
                                <span className="text-[9px] text-[#B8860B] bg-[#F3C969]/20 border border-[#F3C969]/40 px-1.5 py-0.2 rounded font-bold font-heading uppercase">
                                  MARQUEE
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#B0BED0]">{p.nationality}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 text-[#B0BED0]">
                        <span className="bg-[#101B2D] border border-[#344B65] px-2 py-0.5 rounded text-[11px] font-heading font-bold uppercase">
                          {p.category}
                        </span>
                      </td>

                      <td className="py-3 font-number text-[#B0BED0]">
                        {p.base_price_display}
                      </td>

                      <td className="py-3">
                        {isSold && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-heading font-bold bg-[#3DBB83]/10 text-[#3DBB83] border border-[#3DBB83]/30 uppercase">
                            <Award className="w-3 h-3" /> SOLD
                          </span>
                        )}
                        {isUnsold && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-heading font-bold bg-[#E85D5D]/10 text-[#E85D5D] border border-[#E85D5D]/30 uppercase">
                            <XCircle className="w-3 h-3" /> UNSOLD
                          </span>
                        )}
                        {isSkipped && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-heading font-bold bg-[#F3C969]/20 text-[#B8860B] border border-[#F3C969]/40 uppercase">
                            <FastForward className="w-3 h-3" /> SKIPPED
                          </span>
                        )}
                      </td>

                      <td className="py-3">
                        {winningFranchise ? (
                          <div className="flex items-center gap-2">
                            <TeamLogo teamId={lot.winningTeam} className="w-6 h-6 shrink-0 shadow-sm" />
                            <span className="font-heading font-bold text-[#F4F6FA] truncate max-w-[140px] uppercase">
                              {winningFranchise.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#B0BED0] italic">—</span>
                        )}
                      </td>

                      <td className="py-3 pr-3 text-right font-number font-bold text-sm">
                        {isSold ? (
                          <span className="text-[#3DBB83]">
                            ₹{((lot.soldPrice || 0) / 10000000).toFixed(2)} Cr
                          </span>
                        ) : (
                          <span className="text-[#B0BED0] font-normal text-xs">—</span>
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

