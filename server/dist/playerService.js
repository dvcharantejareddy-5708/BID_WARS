import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load datasets (support static bundler trace, ts-node/tsx src/, compiled dist/, and Vercel paths)
const getDataPath = (filename) => {
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
        if (fs.existsSync(p))
            return p;
    }
    return candidates[0];
};
function loadDataset(filename) {
    // 1. Static require to ensure @vercel/nft traces and bundles the JSON assets
    try {
        if (filename === 'players2026.json') {
            try {
                return require('./data/players2026.json');
            }
            catch {
                return require('../src/data/players2026.json');
            }
        }
        else if (filename === 'players2025.json') {
            try {
                return require('./data/players2025.json');
            }
            catch {
                return require('../src/data/players2025.json');
            }
        }
    }
    catch (err) {
        // Proceed to filesystem search fallback
    }
    // 2. Direct filesystem read fallback
    try {
        const p = getDataPath(filename);
        if (fs.existsSync(p)) {
            return JSON.parse(fs.readFileSync(p, 'utf-8'));
        }
        console.error(`[PlayerService] Dataset file not found at any candidate path: ${filename}`);
    }
    catch (err) {
        console.error(`[PlayerService] Failed to load dataset ${filename}:`, err);
    }
    return [];
}
const players2026 = loadDataset('players2026.json');
const players2025 = loadDataset('players2025.json');
export function getAllPlayers(season = '2026') {
    return season === '2025' ? players2025 : players2026;
}
export function getPlayerById(id, season = '2026') {
    const list = getAllPlayers(season);
    return list.find(p => p.id === id);
}
/**
 * Fisher-Yates shuffle algorithm for impartial, uniform random distribution
 */
export function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
/**
 * Official IPL Mega Auction Set Progression for Tournament Mode
 * 1. Set 1: Marquee Players (M1 / M-RET)
 * 2. Set 2: Batters Set 1 (BA1)
 * 3. Set 3: Wicket-Keepers Set 1 (WK1)
 * 4. Set 4: All-Rounders Set 1 (AL1)
 * 5. Set 5: Bowlers Set 1 (BO1)
 * 6. Set 6: Batters Set 2 (BA2)
 * 7. Set 7: Wicket-Keepers Set 2 (WK2)
 * 8. Set 8: All-Rounders Set 2 (AL2)
 * 9. Set 9: Bowlers Set 2 (BO2)
 * 10. Set 10: Batters Set 3 (BA3)
 * 11. Set 11: Wicket-Keepers Set 3 (WK3)
 * 12. Set 12: All-Rounders Set 3 (AL3)
 * 13. Set 13: Bowlers Set 3 (BO3)
 *
 * Each set is shuffled uniformly at random for impartial distribution.
 * Every one of the 532 players appears exactly once in the sequence.
 */
export function buildTournamentAuctionLots(season = '2026') {
    const allPlayers = getAllPlayers(season);
    const SET_DEFINITIONS = [
        {
            setOrder: 1,
            setCode: 'M1',
            setName: 'Set 1 — Marquee Players',
            filter: p => p.set_code === 'M1' || p.set_code === 'M-RET' || Boolean(p.is_marquee)
        },
        {
            setOrder: 2,
            setCode: 'BA1',
            setName: 'Set 2 — Batters Set 1',
            filter: p => p.set_code === 'BA1'
        },
        {
            setOrder: 3,
            setCode: 'WK1',
            setName: 'Set 3 — Wicket-Keepers Set 1',
            filter: p => p.set_code === 'WK1'
        },
        {
            setOrder: 4,
            setCode: 'AL1',
            setName: 'Set 4 — All-Rounders Set 1',
            filter: p => p.set_code === 'AL1'
        },
        {
            setOrder: 5,
            setCode: 'BO1',
            setName: 'Set 5 — Bowlers Set 1',
            filter: p => p.set_code === 'BO1'
        },
        {
            setOrder: 6,
            setCode: 'BA2',
            setName: 'Set 6 — Batters Set 2',
            filter: p => p.set_code === 'BA2'
        },
        {
            setOrder: 7,
            setCode: 'WK2',
            setName: 'Set 7 — Wicket-Keepers Set 2',
            filter: p => p.set_code === 'WK2'
        },
        {
            setOrder: 8,
            setCode: 'AL2',
            setName: 'Set 8 — All-Rounders Set 2',
            filter: p => p.set_code === 'AL2'
        },
        {
            setOrder: 9,
            setCode: 'BO2',
            setName: 'Set 9 — Bowlers Set 2',
            filter: p => p.set_code === 'BO2'
        },
        {
            setOrder: 10,
            setCode: 'BA3',
            setName: 'Set 10 — Batters Set 3',
            filter: p => p.set_code === 'BA3'
        },
        {
            setOrder: 11,
            setCode: 'WK3',
            setName: 'Set 11 — Wicket-Keepers Set 3',
            filter: p => p.set_code === 'WK3'
        },
        {
            setOrder: 12,
            setCode: 'AL3',
            setName: 'Set 12 — All-Rounders Set 3',
            filter: p => p.set_code === 'AL3'
        },
        {
            setOrder: 13,
            setCode: 'BO3',
            setName: 'Set 13 — Bowlers Set 3',
            filter: p => p.set_code === 'BO3'
        }
    ];
    const orderedPlayers = [];
    const assignedIds = new Set();
    for (const setDef of SET_DEFINITIONS) {
        const playersInSet = allPlayers.filter(p => !assignedIds.has(p.id) && setDef.filter(p));
        const randomizedSet = shuffleArray(playersInSet);
        for (const player of randomizedSet) {
            assignedIds.add(player.id);
            orderedPlayers.push({
                ...player,
                set_code: setDef.setCode,
                set_name: setDef.setName,
                set_order: setDef.setOrder,
                auction_status: 'AVAILABLE'
            });
        }
    }
    // Defensive fallback: append any remaining players not matching the explicit set codes
    const remaining = allPlayers.filter(p => !assignedIds.has(p.id));
    if (remaining.length > 0) {
        const randomizedRemaining = shuffleArray(remaining);
        for (const player of randomizedRemaining) {
            assignedIds.add(player.id);
            orderedPlayers.push({
                ...player,
                set_code: player.set_code || 'EXTRA',
                set_name: player.set_name || 'Additional Players',
                set_order: SET_DEFINITIONS.length + 1,
                auction_status: 'AVAILABLE'
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
export function buildAuctionLots(season = '2026', poolMode = 'auction_pool', customMarqueeIds = []) {
    if (poolMode === 'mega_all') {
        return buildTournamentAuctionLots(season);
    }
    let pool = getAllPlayers(season);
    if (poolMode === 'auction_pool') {
        // Only auction-eligible (non-retained) players
        pool = pool.filter(p => !p.is_retained || customMarqueeIds.includes(p.id));
    }
    // 1. Get all unique base price brackets present in pool, sorted descending
    const priceBrackets = Array.from(new Set(pool.map(p => p.base_price_inr))).sort((a, b) => b - a);
    // 2. Fixed category sequence: Batsmen -> All-Rounders -> Bowlers
    const CATEGORY_SEQUENCE = [
        { category: 'Batsmen', label: 'Batsmen' },
        { category: 'All-rounders', label: 'All-Rounders' },
        { category: 'Bowlers', label: 'Bowlers' }
    ];
    const orderedPlayers = [];
    let setOrderCounter = 0;
    for (const price of priceBrackets) {
        const priceDisplay = price >= 10000000
            ? `₹${(price / 10000000).toFixed(2)} Cr`
            : `₹${(price / 100000).toFixed(0)} Lakh`;
        for (const cat of CATEGORY_SEQUENCE) {
            // Filter players in this price bracket and category
            const categoryPlayers = pool.filter(p => {
                if (p.base_price_inr !== price)
                    return false;
                if (cat.category === 'Batsmen') {
                    return p.category === 'Batsmen' || p.primary_role === 'BATTER' || p.category === 'Wicket-keepers' || p.is_wicketkeeper;
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
