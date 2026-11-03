import React from 'react';
import { Radio } from 'lucide-react';
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
    if (!amt) return '0.00';
    if (amt >= 10000000) {
      return (amt / 10000000).toFixed(2);
    }
    return (amt / 100000).toFixed(0) + 'L';
  };

  const formatFullAmount = (amt: number) => {
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

  const basePriceDisplay = formatFullAmount(lot.player.base_price_inr);

  return (
    <div className="bg-[#12142A] border border-[#23274D] rounded-2xl p-4 shadow-card-dark flex flex-col h-[340px] overflow-hidden select-none font-sans">
      {/* Header matching Section 05: BID WAR */}
      <div className="flex items-center justify-between pb-3 border-b border-[#23274D] shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#C8FF3D] animate-ping" />
          <h3 className="font-display font-extrabold text-xs uppercase tracking-wider text-white">
            BID WAR
          </h3>
        </div>
        <span className="text-[11px] font-mono font-bold text-[#C8FF3D] bg-[#181A36] px-2.5 py-0.5 rounded-full border border-[#23274D] tracking-wider">
          {bids.length} {bids.length === 1 ? 'BID' : 'BIDS'}
        </span>
      </div>

      {/* Feed list matching Section 05 table */}
      <div className="flex-1 overflow-y-auto pr-1 pt-2 space-y-1.5 custom-scrollbar">
        {bids.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8 text-[#8A92B2] space-y-2">
            <Radio className="w-8 h-8 text-[#23274D] animate-pulse" />
            <p className="text-xs font-semibold text-[#F4F6FA]">No bids placed yet</p>
            <p className="text-[11px] text-[#8A92B2] max-w-[240px]">
              Base price opens at <span className="font-mono text-[#C8FF3D] font-bold">{basePriceDisplay}</span>
            </p>
          </div>
        ) : (
          sortedBids.map((bid, index) => {
            const isHighest = index === 0;
            const franchise = IPL_FRANCHISES[bid.teamId];
            const teamDisplayName = franchise?.name || bid.teamId;

            return (
              <div
                key={`${bid.timestamp}-${bid.teamId}-${bid.amount}`}
                className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                  isHighest
                    ? 'bg-[#181A36] border-[#C8FF3D] shadow-lime-glow-sm'
                    : 'bg-[#0A0B14]/60 border-[#23274D] hover:border-[#7C5CFF]/40'
                }`}
              >
                {/* Team Info */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <TeamLogo teamId={bid.teamId} className="w-5 h-5 shrink-0" />
                  <div className="min-w-0">
                    <span className={`font-sans font-bold text-xs truncate block ${isHighest ? 'text-white' : 'text-[#8A92B2]'}`}>
                      {teamDisplayName}
                    </span>
                    <span className="text-[10px] font-mono text-[#586082] block">
                      {formatTime(bid.timestamp)} {bid.bidderName ? `· ${bid.bidderName}` : ''}
                    </span>
                  </div>
                </div>

                {/* Amount matching PDF number style */}
                <div className="text-right shrink-0">
                  <span className={`font-mono font-bold text-sm sm:text-base ${isHighest ? 'text-[#C8FF3D]' : 'text-white'}`}>
                    {formatAmount(bid.amount)}
                  </span>
                  <span className="text-[10px] font-mono text-[#8A92B2] block">
                    {bid.amount >= 10000000 ? 'Cr' : ''}
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
