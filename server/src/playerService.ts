import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Player, AuctionLot } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load datasets (support both ts-node/tsx src/ and compiled dist/ execution)
const getDataPath = (filename: string) => {
  const distData = path.join(__dirname, 'data', filename);
  if (fs.existsSync(distData)) return distData;
  const srcData = path.join(__dirname, '..', 'src', 'data', filename);
  if (fs.existsSync(srcData)) return srcData;
  return path.join(process.cwd(), 'server', 'src', 'data', filename);
};

const players2026Path = getDataPath('players2026.json');
const players2025Path = getDataPath('players2025.json');

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
 * Fisher-Yates shuffle algorithm for impartial, uniform random distribution
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Builds the official auction lots for a room based on the strict specification:
 * 1. Price brackets in descending order:
 *    ₹2 Crore -> ₹1.5 Crore -> ₹1.25 Crore -> ₹1 Crore -> ₹75 Lakh -> ₹50 Lakh -> ₹40 Lakh -> ₹30 Lakh
 * 2. In each price bracket, fixed category sequence:
 *    Batsmen -> All-Rounders -> Bowlers
 * 3. Wicket-keepers have primary_role 'BATTER' and are included in the Batsmen category (never omitted).
 * 4. Within each price bracket & category, the eligible players are randomly shuffled for that auction session.
 * 5. Empty categories are automatically skipped.
 * 6. The resulting sequence is persisted for the session.
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

  // 1. Get all unique base price brackets present in pool, sorted descending
  const priceBrackets = Array.from(new Set(pool.map(p => p.base_price_inr))).sort((a, b) => b - a);

  // 2. Fixed category sequence: Batsmen -> All-Rounders -> Bowlers
  const CATEGORY_SEQUENCE: Array<{
    role: 'BATTER' | 'ALL_ROUNDER' | 'BOWLER';
    label: string;
  }> = [
    { role: 'BATTER', label: 'Batsmen' },
    { role: 'ALL_ROUNDER', label: 'All-Rounders' },
    { role: 'BOWLER', label: 'Bowlers' }
  ];

  const orderedPlayers: Player[] = [];
  let setOrderCounter = 0;

  for (const price of priceBrackets) {
    const priceDisplay = price >= 10000000
      ? `₹${(price / 10000000).toFixed(2)} Cr`
      : `₹${(price / 100000).toFixed(0)} Lakh`;

    for (const cat of CATEGORY_SEQUENCE) {
      // Filter players in this price bracket and category
      // Wicket-keepers have primary_role === 'BATTER' so they are naturally included in Batsmen
      const categoryPlayers = pool.filter(
        p => p.base_price_inr === price && p.primary_role === cat.role
      );

      // Automatically skip if no players in this category
      if (categoryPlayers.length === 0) {
        continue;
      }

      setOrderCounter++;
      const setName = `${priceDisplay} ${cat.label}`;

      // Randomly shuffle players within this specific price bracket & category
      const randomizedCategoryPlayers = shuffleArray(categoryPlayers);

      randomizedCategoryPlayers.forEach(player => {
        orderedPlayers.push({
          ...player,
          set_name: setName,
          set_order: setOrderCounter
        });
      });
    }
  }

  const total = orderedPlayers.length;
  return orderedPlayers.map((player, idx) => ({
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
