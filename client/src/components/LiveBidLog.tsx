import React from 'react';
import { Radio, Gavel, Trophy, AlertCircle, Ban, Play, Pause, ChevronRight } from 'lucide-react';
import { BidLogEntry } from '../types.js';
import { TeamLogo } from './TeamLogo.js';

interface LiveBidLogProps {
  entries?: BidLogEntry[];
  currentLotNumber?: number;
  currentPlayerName?: string;
}

export const LiveBidLog: React.FC<LiveBidLogProps> = ({
  entries = [],
  currentLotNumber,
  currentPlayerName
}) => {
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatAmount = (amt?: number) => {
    if (!amt) return '₹0';
    if (amt >= 10000000) {
      return `₹${(amt / 10000000).toFixed(2)} Cr`;
    }
    return `₹${(amt / 100000).toFixed(0)} Lakh`;
  };

  // Sort entries newest first
  const sortedEntries = [...entries].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="bg-[#0D0D0D] border border-[#222222] rounded-2xl p-3.5 shadow-xl flex flex-col h-[340px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#1E1E1E] shrink-0">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E676] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00E676]"></span>
          </span>
          <span className="text-[11px] text-[#E0E0E0] uppercase font-bold tracking-wider">
            Live Bid Log
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#8E8E93] bg-[#161616] px-2 py-0.5 rounded-full border border-[#252525]">
          {sortedEntries.length} events
        </span>
      </div>

      {/* Log Feed */}
      <div className="flex-1 overflow-y-auto pr-1 pt-2 space-y-1.5 custom-scrollbar">
        {sortedEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8 text-[#8E8E93] space-y-2">
            <Radio className="w-8 h-8 text-[#333333] animate-pulse" />
            <p className="text-xs font-medium text-[#777777]">No bids placed yet</p>
            <p className="text-[10px] text-[#555555] max-w-[200px]">
              Live bids, rejections, and round outcomes will appear here in real time.
            </p>
          </div>
        ) : (
          sortedEntries.map((item) => {
            if (item.type === 'EVENT') {
              return renderEventItem(item, formatTime);
            }
            return renderBidItem(item, formatTime, formatAmount);
          })
        )}
      </div>
    </div>
  );
};

function renderBidItem(
  item: BidLogEntry, 
  formatTime: (ts: number) => string, 
  formatAmount: (amt?: number) => string
) {
  const isHighest = Boolean(item.isHighest);
  const isAccepted = item.accepted !== false;

  return (
    <div
      key={item.id}
      className={`p-2 rounded-xl border transition-all text-xs ${
        isHighest
          ? 'bg-gradient-to-r from-[#18160B] via-[#1F1C0D] to-[#18160B] border-[#FFD700]/60 shadow-[0_0_12px_rgba(255,215,0,0.15)]'
          : isAccepted
          ? 'bg-[#121212] border-[#222222] hover:border-[#333333]'
          : 'bg-[#181212] border-[#FF5252]/40 opacity-75'
      }`}
    >
      <div className="flex items-center justify-between gap-1.5 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {item.teamId && (
            <TeamLogo teamId={item.teamId} className="w-4 h-4 object-contain shrink-0" />
          )}
          <span className={`font-bold truncate ${isHighest ? 'text-[#FFD700]' : 'text-white'}`}>
            {item.teamName || item.teamId || item.bidderName || 'Bidder'}
          </span>
          {item.bidderName && item.teamId && (
            <span className="text-[10px] text-[#777777] truncate">
              ({item.bidderName})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[9px] font-mono text-[#777777]">
            {formatTime(item.timestamp)}
          </span>
          {isHighest && (
            <span className="text-[9px] font-bold uppercase bg-[#FFD700]/20 text-[#FFD700] px-1.5 py-0.2 rounded border border-[#FFD700]/40 flex items-center gap-0.5">
              👑 LEADING
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <div className="text-[#8E8E93] truncate max-w-[130px]">
          {item.playerName ? (
            <span>{item.playerName}</span>
          ) : (
            <span>Lot #{item.lotNumber}</span>
          )}
        </div>

        <div className="shrink-0 font-mono">
          {isAccepted ? (
            <span className={`font-bold ${isHighest ? 'text-[#FFD700]' : 'text-[#00E676]'}`}>
              {formatAmount(item.amount)}
            </span>
          ) : (
            <div className="text-right">
              <span className="text-[#FF5252] line-through font-medium">
                {formatAmount(item.amount)}
              </span>
              {item.rejectionReason && (
                <span className="block text-[9px] text-[#FF5252]/80">
                  {item.rejectionReason}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function renderEventItem(item: BidLogEntry, formatTime: (ts: number) => string) {
  let badgeColor = 'bg-[#1C1C1C] text-[#8E8E93] border-[#333333]';
  let Icon = ChevronRight;

  if (item.eventAction === 'AUCTION_STARTED') {
    badgeColor = 'bg-[#00E676]/10 text-[#00E676] border-[#00E676]/30';
    Icon = Play;
  } else if (item.eventAction === 'PLAYER_NOMINATED') {
    badgeColor = 'bg-[#2979FF]/10 text-[#2979FF] border-[#2979FF]/30';
    Icon = Gavel;
  } else if (item.eventAction === 'PLAYER_SOLD') {
    badgeColor = 'bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/40';
    Icon = Trophy;
  } else if (item.eventAction === 'PLAYER_UNSOLD') {
    badgeColor = 'bg-[#FF5252]/10 text-[#FF5252] border-[#FF5252]/30';
    Icon = Ban;
  } else if (item.eventAction === 'PLAYER_SKIPPED') {
    badgeColor = 'bg-[#FF9100]/10 text-[#FF9100] border-[#FF9100]/30';
    Icon = AlertCircle;
  } else if (item.eventAction === 'AUCTION_PAUSED') {
    badgeColor = 'bg-[#FFAB00]/10 text-[#FFAB00] border-[#FFAB00]/30';
    Icon = Pause;
  } else if (item.eventAction === 'AUCTION_RESUMED') {
    badgeColor = 'bg-[#00E676]/10 text-[#00E676] border-[#00E676]/30';
    Icon = Play;
  }

  return (
    <div
      key={item.id}
      className={`p-1.5 px-2.5 rounded-lg border text-[11px] flex items-center justify-between gap-2 ${badgeColor}`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="font-semibold truncate">
          {item.eventMessage || item.eventAction}
        </span>
      </div>
      <span className="text-[9px] font-mono opacity-70 shrink-0">
        {formatTime(item.timestamp)}
      </span>
    </div>
  );
}

