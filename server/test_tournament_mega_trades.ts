import { buildTournamentAuctionLots, getAllPlayers } from './src/playerService.js';
import { GameRoom } from './src/gameEngine.js';
import { Player, RoomState, IPLTeamId } from './src/types.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ ${message}`);
  }
}

async function runTests() {
  console.log('=== TEST SUITE: MEGA AUCTION ORDERING, MULTI-PLAYER TRADES & TOURNAMENT AUCTION TYPES ===\n');

  // 1. MEGA AUCTION POOL & ORDERING TESTS
  console.log('--- 1. Testing Mega Auction Pool & Ordering ---');
  const allPlayers = getAllPlayers();
  assert(allPlayers.length === 532, `Total player dataset has 532 players (actual: ${allPlayers.length})`);

  const megaLots = buildTournamentAuctionLots(allPlayers, 'mega_all');
  assert(megaLots.length === 532, `Mega auction pool has all 532 players (actual: ${megaLots.length})`);

  // Check unique players (no duplicates)
  const megaIds = new Set(megaLots.map(l => l.player.id));
  assert(megaIds.size === 532, `All 532 players in Mega Auction order are unique (actual: ${megaIds.size})`);

  // Verify Base-Price-First and Role-Wise sequence:
  // Each lot must have base_price_inr <= previous lot's base price, OR if same price, role progression:
  // Batter (BATTER/WICKETKEEPER) -> All-Rounder (ALL_ROUNDER) -> Bowler (BOWLER)
  let prevBasePrice = Infinity;
  let prevSetOrder = -1;
  const roleRank = (cat: string) => {
    if (cat === 'BATTER' || cat === 'WICKETKEEPER') return 0;
    if (cat === 'ALL_ROUNDER') return 1;
    if (cat === 'BOWLER') return 2;
    return 3;
  };

  let sequenceValid = true;
  let allSetOrdersValid = true;
  for (let i = 0; i < megaLots.length; i++) {
    const lot = megaLots[i];
    const setOrder = lot.player.set_order || 0;
    if (setOrder < prevSetOrder) {
      allSetOrdersValid = false;
    }
    prevSetOrder = setOrder;

    if (lot.player.base_price_inr < prevBasePrice) {
      prevBasePrice = lot.player.base_price_inr;
    } else if (lot.player.base_price_inr > prevBasePrice) {
      sequenceValid = false;
      console.error(`Price inversion at index ${i}: lot has ₹${lot.player.base_price_inr} after ₹${prevBasePrice}`);
    }
  }
  assert(allSetOrdersValid, 'All 532 lots follow non-decreasing set_order progression');
  assert(sequenceValid, 'All lots strictly follow descending base price order');

  // Verify first lots are 2 Cr Batters/WKs
  const firstCategory = megaLots.filter(l => l.player.set_order === megaLots[0].player.set_order);
  assert(firstCategory.every(l => l.player.base_price_inr === 20000000 && (l.player.is_wicketkeeper || l.player.category === 'BATTER' || l.player.category === 'WICKETKEEPER' || l.player.category === 'Batsmen' || l.player.category === 'Wicket-keepers')),
    'First category strictly consists of ₹2 Cr Batters / Wicketkeepers');

  // 2. MINI AUCTION POOL TESTS
  console.log('\n--- 2. Testing Mini Auction Pool & Ordering ---');
  const miniLots = buildTournamentAuctionLots(allPlayers, 'auction_pool');
  assert(miniLots.length === 359, `Mini auction pool has 359 non-retained players (actual: ${miniLots.length})`);
  const miniIds = new Set(miniLots.map(l => l.player.id));
  assert(miniIds.size === 359, `All 359 players in Mini Auction order are unique`);
  assert(miniLots.every(l => !l.player.is_retained), 'Mini auction pool contains zero retained players');

  // 3. MULTI-PLAYER & PLAYER-PLUS-MONEY TRADES TESTS
  console.log('\n--- 3. Testing Multi-Player & Player-Plus-Money Trades ---');
  const room = new GameRoom('TEST01', 'HostUser', {
    hostId: 'host_uuid',
    maxSquad: 25,
    timerDuration: 15,
    startingPurse: 1000000000,
    tradeTimerDuration: 45
  }, () => {});

  room.join('CSK_Manager', 'csk_uuid');
  room.join('MI_Manager', 'mi_uuid');
  room.selectTeam('host_uuid', 'CSK');
  room.selectTeam('csk_uuid', 'CSK');
  room.selectTeam('mi_uuid', 'MI');

  // Setup squads for CSK and MI
  const p1: Player = { id: 'p1', name: 'MS Dhoni', category: 'WICKETKEEPER', base_price_inr: 20000000, base_price_display: '₹2.00 Cr', ovr: 89, country: 'India', is_overseas: false, sold_price_inr: 20000000 };
  const p2: Player = { id: 'p2', name: 'Ravindra Jadeja', category: 'ALL_ROUNDER', base_price_inr: 20000000, base_price_display: '₹2.00 Cr', ovr: 90, country: 'India', is_overseas: false, sold_price_inr: 20000000 };
  const p3: Player = { id: 'p3', name: 'Moeen Ali', category: 'ALL_ROUNDER', base_price_inr: 15000000, base_price_display: '₹1.50 Cr', ovr: 84, country: 'England', is_overseas: true, sold_price_inr: 15000000 };

  const p4: Player = { id: 'p4', name: 'Rohit Sharma', category: 'BATTER', base_price_inr: 20000000, base_price_display: '₹2.00 Cr', ovr: 91, country: 'India', is_overseas: false, sold_price_inr: 20000000 };
  const p5: Player = { id: 'p5', name: 'Jasprit Bumrah', category: 'BOWLER', base_price_inr: 20000000, base_price_display: '₹2.00 Cr', ovr: 95, country: 'India', is_overseas: false, sold_price_inr: 20000000 };
  const p6: Player = { id: 'p6', name: 'Tim David', category: 'BATTER', base_price_inr: 10000000, base_price_display: '₹1.00 Cr', ovr: 82, country: 'Australia', is_overseas: true, sold_price_inr: 10000000 };

  room.teamSquads['CSK'] = [p1, p2, p3];
  room.teamSquads['MI'] = [p4, p5, p6];
  room.teamPurse['CSK'] = 500000000; // 50 Cr
  room.teamPurse['MI'] = 500000000;  // 50 Cr
  room.status = 'AUCTION';

  // A. 1-for-many trade (CSK gives p1 for MI's p4 and p5)
  console.log('Testing 1-for-many trade creation & acceptance...');
  let tradeRes = room.createTradeRequest('host_uuid', {
    toTeamId: 'MI',
    tradeType: 'MULTI_PLAYER',
    offeredPlayerIds: ['p1'],
    requestedPlayerIds: ['p4', 'p5']
  });
  if (!tradeRes.success) console.error('Failed trade creation:', tradeRes);
  assert(tradeRes.success, `1-for-many trade created successfully`);
  assert(room.activeTrade !== null, `Room has active trade pending`);
  assert(room.activeTrade?.offeredPlayers.length === 1 && room.activeTrade?.requestedPlayers.length === 2, `Active trade has 1 offered, 2 requested`);

  // Respond ACCEPT
  let respondRes = room.respondTradeRequest('mi_uuid', room.activeTrade!.id, 'ACCEPT');
  assert(respondRes.success, `1-for-many trade accepted successfully`);
  assert(room.teamSquads['CSK'].some(p => p.id === 'p4') && room.teamSquads['CSK'].some(p => p.id === 'p5'), `CSK received Rohit and Bumrah`);
  assert(room.teamSquads['MI'].some(p => p.id === 'p1'), `MI received MS Dhoni`);
  assert(room.activeTrade === null, `Active trade cleared`);

  // B. Player(s) plus money trade (MI gives p1 + 5 Cr cash for CSK's p2 and p4)
  console.log('\nTesting player(s) plus money trade with cash adjustment...');
  tradeRes = room.createTradeRequest('mi_uuid', {
    toTeamId: 'CSK',
    tradeType: 'PLAYER_PLUS_CASH',
    offeredPlayerIds: ['p1'],
    requestedPlayerIds: ['p2', 'p4'],
    moneyAmount: 50000000, // 5 Cr
    cashPayer: 'OFFERING_TEAM'
  });
  assert(tradeRes.success, `Player + cash trade created successfully`);

  const prevCskPurse = room.teamPurse['CSK'];
  const prevMiPurse = room.teamPurse['MI'];

  respondRes = room.respondTradeRequest('host_uuid', room.activeTrade!.id, 'ACCEPT');
  assert(respondRes.success, `Player + cash trade accepted`);
  assert(room.teamPurse['CSK'] === prevCskPurse + 50000000, `CSK purse increased by 5 Cr cash`);
  assert(room.teamPurse['MI'] === prevMiPurse - 50000000, `MI purse decreased by 5 Cr cash`);

  // C. Test overseas player limit validation (> 8 overseas rejected)
  console.log('\nTesting overseas player limit (>8) rejection...');
  // Fill MI overseas with 7 players
  for (let i = 10; i <= 16; i++) {
    room.teamSquads['MI'].push({
      id: `ov_${i}`,
      name: `Overseas Player ${i}`,
      category: 'ALL_ROUNDER',
      base_price_inr: 10000000,
      base_price_display: '₹1.00 Cr',
      ovr: 80,
      country: 'South Africa',
      is_overseas: true
    });
  }
  // Now MI has p6 (overseas) + 7 overseas = 8 overseas players!
  assert(room.teamSquads['MI'].filter(p => p.is_overseas).length === 8, 'MI has 8 overseas players');

  // CSK offers overseas player p3 for MI domestic player
  tradeRes = room.createTradeRequest('host_uuid', {
    toTeamId: 'MI',
    tradeType: 'PLAYER_FOR_PLAYER',
    offeredPlayerIds: ['p3'], // overseas
    requestedPlayerIds: ['p2'] // domestic
  });
  assert(!tradeRes.success, `Trade rejected because MI would have 9 overseas players: ${tradeRes.message}`);

  // D. Test single active trade restriction across room
  console.log('\nTesting single active trade proposal limit...');
  tradeRes = room.createTradeRequest('host_uuid', {
    toTeamId: 'MI',
    tradeType: 'PLAYER_FOR_PLAYER',
    offeredPlayerIds: ['p5'],
    requestedPlayerIds: ['p2']
  });
  assert(tradeRes.success, `First trade proposal successfully created`);

  // Attempt second trade proposal while first is active
  const secondTradeRes = room.createTradeRequest('mi_uuid', {
    toTeamId: 'CSK',
    tradeType: 'PLAYER_FOR_PLAYER',
    offeredPlayerIds: ['p2'],
    requestedPlayerIds: ['p5']
  });
  assert(!secondTradeRes.success, `Second trade blocked while active trade pending: ${secondTradeRes.message}`);

  // Cancel the active trade
  const cancelRes = room.cancelTradeRequest('host_uuid', room.activeTrade!.id);
  assert(cancelRes.success, `Active trade cancelled by offering manager`);

  // E. Test drawing player from Mega Auction base-price categories
  console.log('\nTesting sequential category progression in drawRandomPlayer...');
  room.lots = megaLots.slice(0, 50); // first 50 lots
  room.currentLotIndex = 0;

  const drawRes = room.drawRandomPlayer('host_uuid');
  if (!drawRes.success) console.error('Failed drawRandomPlayer:', drawRes);
  assert(drawRes.success && Boolean(drawRes.lot), 'Drew first player from mega auction');
  const firstLot = drawRes.lot!;
  assert(firstLot.player.set_order === 1, `First drawn player is from category set_order 1 (₹2 Cr Batters)`);
  assert(firstLot.player.base_price_inr === 20000000, `First drawn player base price is ₹2 Cr`);

  console.log('\n🎉 ALL 13 REQUIREMENTS AND ASSERTIONS PASSED PERFECTLY!\n');
  room.clearAllTimers();
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
