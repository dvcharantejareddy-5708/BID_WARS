import React from 'react';
import { Radio, Trophy } from 'lucide-react';
import { AuctionLot, IPL_FRANCHISES, RoomSettings } from '../types.js';
import { TeamLogo } from './TeamLogo.js';

interface LiveBidFeedProps {
  lot: AuctionLot;
  roomSettings?: RoomSettings;
}

export const LiveBidFeed: React.FC<LiveBidFeedProps> = ({
  lot,
  roomSettings
}) => {
  const formatAmount = (amt: number) => {
    if (!amt) return '₹0';
    if (amt >= 10000000) {
      return `₹${(amt / 10000000).toFixed(2)} Cr`;
    }
    return `₹${(amt / 100000).toFixed(0)} Lakh`;
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Ensure reverse chronological order: latest/highest bid first
  const bids = lot.bids || [];
  const sortedBids = [...bids].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0) || b.amount - a.amount);
  const highestBid = sortedBids[0];

  const basePriceDisplay = formatAmount(lot.player.base_price_inr);

  return (
    <div className="bg-[#0E1626] border border-[#26354D] rounded-2xl p-3.5 shadow-xl flex flex-col h-[340px] overflow-hidden select-none font-body">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#1C273A] shrink-0">
        <div className="flex items-center gap-2 min-w-0 pr-2">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C8FF45] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C8FF45]"></span>
          </span>
          <h3 className="font-heading font-extrabold text-xs uppercase tracking-wider text-[#C8FF45] truncate">
            {lot.player.name} — LIVE BIDDING
          </h3>
        </div>
        <span className="text-[10px] font-heading font-bold uppercase text-[#9BAAC0] bg-[#141F33] px-2 py-0.5 rounded-full border border-[#26354D] shrink-0 tracking-wider">
          {bids.length} {bids.length === 1 ? 'bid' : 'bids'}
        </span>
      </div>

      {/* Feed list */}
      <div className="flex-1 overflow-y-auto pr-1 pt-2 space-y-1.5 custom-scrollbar">
        {bids.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8 text-[#9BAAC0] space-y-2">
            <Radio className="w-8 h-8 text-[#26354D] animate-pulse" />
            <p className="text-xs font-semibold text-[#F4F7FC]">No bids placed yet</p>
            <p className="text-[11px] text-[#9BAAC0] max-w-[240px]">
              Base price is <span className="font-number text-[#C8FF45] font-bold">{basePriceDisplay}</span>
            </p>
          </div>
        ) : (
          sortedBids.map((bid, index) => {
            const isHighest = index === 0;
            const franchise = IPL_FRANCHISES[bid.teamId];
            const teamDisplayName = franchise?.shortName || bid.teamId;
            const managerName = bid.bidderName;

            return (
              <div
                key={`${bid.timestamp}-${bid.teamId}-${bid.amount}`}
                className={`p-2.5 rounded-xl border transition-all text-xs ${
                  isHighest
                    ? 'bg-gradient-to-r from-[#172314] via-[#1B2B16] to-[#172314] border-[#C8FF45]/70 shadow-[0_0_14px_rgba(200,255,69,0.18)]'
                    : 'bg-[#141F33] border-[#26354D] hover:border-[#3D506E]'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <TeamLogo teamId={bid.teamId} className="w-4 h-4 object-contain shrink-0" />
                    <span className={`font-heading font-bold uppercase tracking-wide truncate ${isHighest ? 'text-[#C8FF45]' : 'text-[#F4F7FC]'}`}>
                      {franchise?.name || teamDisplayName}
                    </span>
                    {managerName && (
                      <span className="text-[10px] text-[#9BAAC0] truncate font-body">
                        ({managerName})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[9px] font-mono text-[#5A6F8F]">
                      {formatTime(bid.timestamp)}
                    </span>
                    {isHighest && (
                      <span className="text-[9px] font-heading font-extrabold uppercase bg-[#C8FF45]/25 text-[#C8FF45] px-1.5 py-0.5 rounded border border-[#C8FF45]/50 flex items-center gap-0.5 tracking-wider">
                        <Trophy className="w-2.5 h-2.5" />
                        👑 HIGHEST
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  <span className="text-[#9BAAC0] text-[10px]">
                    {isHighest ? 'Current winning bid' : 'Previous bid'}
                  </span>
                  <span className={`font-number text-sm ${isHighest ? 'text-[#C8FF45]' : 'text-[#54C8FF]'}`}>
                    {formatAmount(bid.amount)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
