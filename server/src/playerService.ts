import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Player, AuctionLot } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load datasets
const players2026Path = path.join(__dirname, 'data', 'players2026.json');
const players2025Path = path.join(__dirname, 'data', 'players2025.json');

const players2026: Player[] = JSON.parse(fs.readFileSync(players2026Path, 'utf-8'));
const players2025: Player[] = JSON.parse(fs.readFileSync(players2025Path, 'utf-8'));

export function getAllPlayers(season: '2026' | '2025' = '2026'): Player[] {
  return season === '2025' ? players2025 : players2026;
}

export function getPlayerById(id: string, season: '2026' | '2025' = '2026'): Player | undefined {
  const list = getAllPlayers(season);
  return list.find(p => p.id === id);
}

/**
 * Builds the official auction lots for a room based on season and pool mode.
 * Rules:
 * 1. Marquee players (SET -1) come first.
 * 2. Followed by role groups: Batters, Wicket-Keepers, All-Rounders, Bowlers.
 * 3. Within each set, ordered from highest base price to lowest base price.
 * 4. Deterministic tie-breaking by s_no.
 */
export function buildAuctionLots(
  season: '2026' | '2025' = '2026',
  poolMode: 'auction_pool' | 'mega_all' = 'auction_pool',
  customMarqueeIds: string[] = []
): AuctionLot[] {
  let pool = getAllPlayers(season);

  if (poolMode === 'auction_pool') {
    // Only auction-eligible (non-retained) players
    pool = pool.filter(p => !p.is_retained || customMarqueeIds.includes(p.id));
  }

  // Sort pool according to master prompt specs:
  // Set -1 Marquee Set first, then set_order, then base_price_inr DESC, then s_no ASC
  const sorted = [...pool].sort((a, b) => {
    const isMarqueeA = a.is_marquee || customMarqueeIds.includes(a.id);
    const isMarqueeB = b.is_marquee || customMarqueeIds.includes(b.id);

    if (isMarqueeA && !isMarqueeB) return -1;
    if (!isMarqueeA && isMarqueeB) return 1;

    // Next compare set_order
    if (a.set_order !== b.set_order) {
      return a.set_order - b.set_order;
    }

    // Within set: highest base price to lowest
    if (b.base_price_inr !== a.base_price_inr) {
      return b.base_price_inr - a.base_price_inr;
    }

    // Tie-break by official master list S.No
    return a.s_no - b.s_no;
  });

  const total = sorted.length;
  return sorted.map((player, idx) => ({
    lotNumber: idx + 1,
    totalLots: total,
    player,
    status: 'PENDING',
    currentBid: 0,
    currentBidder: null,
    currentBidderName: null,
    bids: []
  }));
}
