import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { Player, AuctionLot } from './types.js';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load datasets (support static bundler trace, ts-node/tsx src/, compiled dist/, and Vercel paths)
const getDataPath = (filename: string): string => {
  const candidates = [
    path.join(__dirname, 'data', filename),
    path.join(__dirname, '..', 'src', 'data', filename),
    path.join(__dirname, '..', 'data', filename),
    path.join(process.cwd(), 'dist', 'data', filename),
    path.join(process.cwd(), 'server', 'dist', 'data', filename),
    path.join(process.cwd(), 'src', 'data', filename),
    path.join(process.cwd(), 'server', 'src', 'data', filename),
    path.join(process.cwd(), 'data', filename)
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
};

function loadDataset(filename: string): Player[] {
  // 1. Static require to ensure @vercel/nft traces and bundles the JSON assets
  try {
    if (filename === 'players2026.json') {
      try {
        return require('./data/players2026.json');
      } catch {
        return require('../src/data/players2026.json');
      }
    } else if (filename === 'players2025.json') {
      try {
        return require('./data/players2025.json');
      } catch {
        return require('../src/data/players2025.json');
      }
    }
  } catch (err) {
    // Proceed to filesystem search fallback
  }

  // 2. Direct filesystem read fallback
  try {
    const p = getDataPath(filename);
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    }
    console.error(`[PlayerService] Dataset file not found at any candidate path: ${filename}`);
  } catch (err) {
    console.error(`[PlayerService] Failed to load dataset ${filename}:`, err);
  }
  return [];
}

const players2026: Player[] = loadDataset('players2026.json');
const players2025: Player[] = loadDataset('players2025.json');

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

  // 2. Fixed category sequence: Batsmen -> All-Rounders -> Bowlers -> Wicket-Keepers
  const CATEGORY_SEQUENCE: Array<{
    category: 'Batsmen' | 'All-rounders' | 'Bowlers' | 'Wicket-keepers';
    label: string;
  }> = [
    { category: 'Batsmen', label: 'Batsmen' },
    { category: 'All-rounders', label: 'All-Rounders' },
    { category: 'Bowlers', label: 'Bowlers' },
    { category: 'Wicket-keepers', label: 'Wicket-Keepers' }
  ];

  const orderedPlayers: Player[] = [];
  let setOrderCounter = 0;

  for (const price of priceBrackets) {
    const priceDisplay = price >= 10000000
      ? `₹${(price / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`
      : `₹${(price / 100000).toFixed(0)} Lakh`;

    for (const cat of CATEGORY_SEQUENCE) {
      // Filter players in this price bracket and category
      const categoryPlayers = pool.filter(p => {
        if (p.base_price_inr !== price) return false;
        if (cat.category === 'Wicket-keepers') {
          return p.category === 'Wicket-keepers' || p.is_wicketkeeper;
        }
        if (cat.category === 'Batsmen') {
          return (p.category === 'Batsmen' || p.primary_role === 'BATTER') && !p.is_wicketkeeper && p.category !== 'Wicket-keepers';
        }
        if (cat.category === 'All-rounders') {
          return (p.category === 'All-rounders' || p.primary_role === 'ALL_ROUNDER') && !p.is_wicketkeeper && p.category !== 'Wicket-keepers';
        }
        if (cat.category === 'Bowlers') {
          return (p.category === 'Bowlers' || p.primary_role === 'BOWLER') && !p.is_wicketkeeper && p.category !== 'Wicket-keepers';
        }
        return false;
      });

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
