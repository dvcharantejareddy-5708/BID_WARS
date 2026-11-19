"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllPlayers = getAllPlayers;
exports.getPlayerById = getPlayerById;
exports.shuffleArray = shuffleArray;
exports.buildAuctionLots = buildAuctionLots;
exports.buildTournamentAuctionLots = buildTournamentAuctionLots;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const currentDirname = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
const safeRequire = typeof require !== 'undefined' ? require : () => null;
// Load datasets (support static bundler trace, ts-node/tsx src/, compiled dist/, and Vercel paths)
const getDataPath = (filename) => {
    const candidates = [
        path_1.default.join(currentDirname, 'data', filename),
        path_1.default.join(currentDirname, '..', 'dist', 'data', filename),
        path_1.default.join(currentDirname, '..', 'src', 'data', filename),
        path_1.default.join(currentDirname, '..', 'data', filename),
        path_1.default.join(process.cwd(), 'dist', 'data', filename),
        path_1.default.join(process.cwd(), 'server', 'dist', 'data', filename),
        path_1.default.join(process.cwd(), 'src', 'data', filename),
        path_1.default.join(process.cwd(), 'server', 'src', 'data', filename),
        path_1.default.join(process.cwd(), 'server', 'data', filename),
        path_1.default.join(process.cwd(), 'data', filename),
        path_1.default.join('/var/task', 'server', 'dist', 'data', filename),
        path_1.default.join('/var/task', 'dist', 'data', filename),
        path_1.default.join('/var/task', 'server', 'src', 'data', filename),
        path_1.default.join('/var/task', 'server', 'data', filename),
        path_1.default.join('/var/task', 'src', 'data', filename),
        path_1.default.join('/var/task', 'data', filename)
    ];
    for (const p of candidates) {
        if (fs_1.default.existsSync(p))
            return p;
    }
    return candidates[0];
};
function loadDataset(filename) {
    // 1. Static require to ensure @vercel/nft traces and bundles the JSON assets
    try {
        if (typeof safeRequire === 'function') {
            if (filename === 'players2026.json') {
                try {
                    const res = safeRequire('./data/players2026.json');
                    if (res)
                        return res;
                }
                catch {
                    const res = safeRequire('../src/data/players2026.json');
                    if (res)
                        return res;
                }
            }
            else if (filename === 'players2025.json') {
                try {
                    const res = safeRequire('./data/players2025.json');
                    if (res)
                        return res;
                }
                catch {
                    const res = safeRequire('../src/data/players2025.json');
                    if (res)
                        return res;
                }
            }
        }
    }
    catch (err) {
        // Proceed to filesystem search fallback
    }
    // 2. Direct filesystem read fallback
    try {
        const p = getDataPath(filename);
        if (fs_1.default.existsSync(p)) {
            return JSON.parse(fs_1.default.readFileSync(p, 'utf-8'));
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
function getAllPlayers(season = '2026') {
    return season === '2025' ? players2025 : players2026;
}
function getPlayerById(id, season = '2026') {
    const list = getAllPlayers(season);
    return list.find(p => p.id === id);
}
/**
 * Fisher-Yates shuffle algorithm for impartial, uniform random distribution
 */
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
/**
 * Official IPL Mega & Mini Auction Lot Generator
 * Base-Price-First Ordering with Role-Wise Categories:
 * 1. Price brackets in descending order:
 *    ₹2.00 Cr -> ₹1.50 Cr -> ₹1.25 Cr -> ₹1.00 Cr -> ₹75 Lakh -> ₹50 Lakh -> ₹40 Lakh -> ₹30 Lakh
 * 2. In each price bracket, fixed category sequence:
 *    Batters (including Wicket-Keepers) -> All-Rounders -> Bowlers
 * 3. Players are randomized uniformly within each individual base-price and role category.
 * 4. Never mix players from different base prices or roles.
 * 5. Empty categories are automatically skipped.
 * 6. Every eligible player appears exactly once (532 players in Mega Auction, 359 in Mini Auction).
 */
function buildAuctionLots(season = '2026', poolMode = 'auction_pool', customMarqueeIds = []) {
    let pool = getAllPlayers(season);
    if (poolMode === 'auction_pool') {
        // Mini Auction: Only auction-eligible (non-retained) players
        pool = pool.filter(p => !p.is_retained || customMarqueeIds.includes(p.id));
    }
    // 1. Get all unique base price brackets present in pool, sorted descending
    const priceBrackets = Array.from(new Set(pool.map(p => p.base_price_inr))).sort((a, b) => b - a);
    // 2. Fixed category sequence: Batters -> All-Rounders -> Bowlers
    const CATEGORY_SEQUENCE = [
        {
            category: 'Batters',
            label: 'Batters',
            matcher: p => {
                if (p.is_wicketkeeper || p.category === 'Wicket-keepers')
                    return true;
                return p.primary_role === 'BATTER' || p.role === 'BATTER' || p.category === 'Batsmen';
            }
        },
        {
            category: 'All-rounders',
            label: 'All-Rounders',
            matcher: p => {
                if (p.is_wicketkeeper || p.category === 'Wicket-keepers')
                    return false;
                return p.primary_role === 'ALL_ROUNDER' || p.role === 'ALL_ROUNDER' || p.category === 'All-rounders';
            }
        },
        {
            category: 'Bowlers',
            label: 'Bowlers',
            matcher: p => {
                if (p.is_wicketkeeper || p.category === 'Wicket-keepers')
                    return false;
                return p.primary_role === 'BOWLER' || p.role === 'BOWLER' || p.category === 'Bowlers';
            }
        }
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
                return cat.matcher(p);
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
                    set_order: setOrderCounter,
                    auction_status: 'AVAILABLE'
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
function buildTournamentAuctionLots(season = '2026', poolMode = 'mega_all') {
    return buildAuctionLots(season, poolMode);
}
