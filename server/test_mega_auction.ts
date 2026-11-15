import assert from 'assert';
import { getAllPlayers, buildTournamentAuctionLots, buildAuctionLots } from './src/playerService.js';
import { GameRoom } from './src/gameEngine.js';
import { RoomSettings } from './src/types.js';

console.log('====================================================');
console.log('TEST SUITE: IPL MEGA AUCTION 532-PLAYER ENGINE');
console.log('====================================================\n');

// 1. Audit Player Dataset
console.log('1. Auditing Player Dataset for Season 2026...');
const players2026 = getAllPlayers('2026');
console.log(`   Total players in 2026 pool: ${players2026.length}`);
assert.strictEqual(players2026.length, 532, 'Must have exactly 532 players in 2026');

const uniqueIds = new Set(players2026.map(p => p.id));
assert.strictEqual(uniqueIds.size, 532, 'All 532 player IDs must be unique');

const uniqueNames = new Set(players2026.map(p => p.name));
assert.strictEqual(uniqueNames.size, 532, 'All 532 player names must be unique');

const uniqueSnos = new Set(players2026.map(p => p.s_no));
assert.strictEqual(uniqueSnos.size, 532, 'All 532 player s_no must be unique');

for (const p of players2026) {
  assert(p.image_url && p.image_url.length > 5, `Player ${p.name} missing image_url`);
  assert(p.base_price_inr && p.base_price_inr >= 3000000, `Player ${p.name} invalid base price`);
  assert(p.role, `Player ${p.name} missing role`);
  assert(p.set_code, `Player ${p.name} missing set_code`);
}
console.log('   ✓ Dataset integrity verified: 532 unique players with valid images, roles, base prices, and sets.\n');

// 2. Test Mega Auction Set Progression & Randomization
console.log('2. Verifying Mega Auction Set Structure and Intra-Set Randomization...');
const lots1 = buildTournamentAuctionLots('2026');
const lots2 = buildTournamentAuctionLots('2026');

assert.strictEqual(lots1.length, 532, 'Generated lots must contain all 532 players');
assert.strictEqual(lots2.length, 532, 'Second generated lots must contain all 532 players');

// Check that every lot has lotNumber 1 to 532 and totalLots 532
for (let i = 0; i < 532; i++) {
  assert.strictEqual(lots1[i].lotNumber, i + 1, `Lot at index ${i} must have lotNumber ${i + 1}`);
  assert.strictEqual(lots1[i].totalLots, 532, 'totalLots must be 532');
  assert.strictEqual(lots1[i].status, 'PENDING', 'Initial lot status must be PENDING (REMAINING)');
}

// Check set progression order (Set 1 to Set 13)
let lastSetOrder = 1;
for (const lot of lots1) {
  const currentSetOrder = lot.player.set_order;
  assert(currentSetOrder >= lastSetOrder, `Set order must never regress: ${currentSetOrder} < ${lastSetOrder}`);
  lastSetOrder = currentSetOrder;
}
console.log('   ✓ Set progression follows monotonic sequence (Set 1 through Set 13).');

// Verify that within sets, order is randomized between generation runs
let samePositionCount = 0;
for (let i = 0; i < 532; i++) {
  if (lots1[i].player.id === lots2[i].player.id) {
    samePositionCount++;
  }
}
console.log(`   Matching lot positions between two separate runs: ${samePositionCount} / 532`);
assert(samePositionCount < 100, 'Two independent draws must randomize player order within sets');
console.log('   ✓ Intra-set player order is independently and impartially randomized.\n');

// 3. Test Tournament GameRoom Initialization, Start Auction & Persistence
console.log('3. Testing Tournament GameRoom Multiplayer Auction Lifecycle...');
const roomSettings: Partial<RoomSettings> = {
  season: '2026',
  poolMode: 'mega_all',
  tournamentId: 'tourney_test_123',
  startingPurse: 1200000000,
  timerDuration: 10,
  isPrivate: false,
  hostId: 'host_user_1',
  hostFranchiseId: 'CSK'
};

const broadcastLogs: any[] = [];
const room = new GameRoom(
  'BW-TEST',
  'HostCharan',
  roomSettings,
  (state, eventMsg) => {
    broadcastLogs.push({ state, eventMsg });
  }
);

room.members.set('host_user_1', {
  id: 'host_user_1',
  nickname: 'HostCharan',
  teamId: 'CSK',
  isHost: true,
  connected: true,
  lastSeen: Date.now()
});

room.members.set('guest_user_2', {
  id: 'guest_user_2',
  nickname: 'GuestRival',
  teamId: 'MI',
  isHost: false,
  connected: true,
  lastSeen: Date.now()
});

assert.strictEqual(room.status, 'LOBBY');
assert.strictEqual(room.lots.length, 532, 'Room must have 532 lots initialized');

// Host authorization check for starting auction
const nonHostStart = room.startAuction('guest_user_2');
assert.strictEqual(nonHostStart.success, false, 'Non-host must be rejected from starting auction');
console.log('   ✓ Non-host cannot start auction.');

const hostStart = room.startAuction('host_user_1');
assert.strictEqual(hostStart.success, true, 'Host must successfully start auction');
assert.strictEqual(room.status, 'AUCTION');
assert.strictEqual(room.currentLotIndex, 0);

const currentLot = room.currentLot;
assert(currentLot !== null, 'Current active lot must exist');
assert.strictEqual(currentLot.status, 'IN_PROGRESS', 'Active lot must have status IN_PROGRESS (LIVE)');
console.log(`   ✓ Auction started: Lot #1 is ${currentLot.player.name} (${currentLot.player.set_name})`);

// 4. Persistence & Reconnection Safeguard (No Reshuffling)
console.log('4. Testing Persistence and Reconnection (No Reshuffle Guarantee)...');
const snapshotLots = room.lots.map(l => l.player.id);
const serialized = room.toJSON();
const restoredRoom = GameRoom.fromJSON(serialized, () => {});

assert.strictEqual(restoredRoom.status, 'AUCTION');
assert.strictEqual(restoredRoom.lots.length, 532);
assert.strictEqual(restoredRoom.currentLotIndex, 0);

for (let i = 0; i < 532; i++) {
  assert.strictEqual(
    restoredRoom.lots[i].player.id,
    snapshotLots[i],
    `Restored room lot at index ${i} must match exact original draw`
  );
}
console.log('   ✓ Reconnection and deserialization retains 100% exact lot sequence without reshuffle.\n');

// 5. Bidding and Hammer Execution (SOLD status)
console.log('5. Testing Bidding and Player Purchase Transaction...');
// CSK places bid
const bid1 = room.placeBid('host_user_1', 20000000); // 2 Cr
assert.strictEqual(bid1.success, true, 'CSK 2 Cr bid should succeed');
assert.strictEqual(room.currentLot?.currentBid, 20000000);
assert.strictEqual(room.currentLot?.currentBidder, 'CSK');

// MI places higher bid
const bid2 = room.placeBid('guest_user_2', 22000000); // 2.2 Cr
assert.strictEqual(bid2.success, true, 'MI 2.2 Cr bid should succeed');
assert.strictEqual(room.currentLot?.currentBid, 22000000);
assert.strictEqual(room.currentLot?.currentBidder, 'MI');

// Try drawing next player while bidding is active -> MUST FAIL
const drawWhileBidding = room.drawRandomPlayer('host_user_1');
assert.strictEqual(drawWhileBidding.success, false, 'Must reject drawing player while bidding is active');
console.log('   ✓ Cannot draw new player while bidding is active.');

// Simulate timer expiry and finalize lot
(room as any).finalizeCurrentLot();
assert.strictEqual(room.currentLot?.status, 'SOLD', 'Lot status must be SOLD');
assert.strictEqual(room.currentLot?.winningTeam, 'MI');
assert.strictEqual(room.currentLot?.soldPrice, 22000000);
assert.strictEqual(room.teamPurse['MI'], 1200000000 - 22000000);
assert.strictEqual(room.teamSquads['MI'].length, 1);
assert.strictEqual(room.teamSquads['MI'][0].name, currentLot.player.name);
console.log(`   ✓ Player SOLD to MI for ₹2.20 Cr. Purse updated to ₹${(room.teamPurse['MI'] / 10000000).toFixed(2)} Cr.`);

// 6. Advancement & Idempotency
console.log('6. Testing Lot Advancement and Host-Only Control...');
const nonHostAdvance = room.advanceLot(0, undefined, 'guest_user_2');
assert.strictEqual(nonHostAdvance.success, false, 'Non-host advance must be rejected');
console.log('   ✓ Non-host cannot advance lot.');

// Host advances lot
const hostAdvance = room.advanceLot(0, room.currentResultId || undefined, 'host_user_1');
assert.strictEqual(hostAdvance.success, true, 'Host advance must succeed');
assert.strictEqual(room.currentLotIndex, 1, 'Current lot index must increment to 1');

// Duplicate advance attempt with old index must be rejected idempotently
const duplicateAdvance = room.advanceLot(0, undefined, 'host_user_1');
assert.strictEqual(duplicateAdvance.success, false, 'Duplicate advance must be rejected idempotently');
console.log('   ✓ Advance is idempotent: second advance on completed lot is safely rejected.');

const lot2 = room.currentLot;
assert(lot2 !== null);
assert.strictEqual(lot2.lotNumber, 2);
assert.strictEqual(lot2.status, 'IN_PROGRESS');
console.log(`   ✓ Advanced to Lot #2: ${lot2.player.name} (${lot2.player.set_name})`);

// Finalize lot 2 as UNSOLD
(room as any).finalizeCurrentLot();
assert.strictEqual(lot2.status, 'UNSOLD', 'Lot with 0 bids must become UNSOLD');
assert.strictEqual(lot2.player.auction_status, 'UNSOLD');
console.log(`   ✓ Lot #2 finalized as UNSOLD (0 bids).`);

// Host advances lot 2
room.advanceLot(1, undefined, 'host_user_1');
assert.strictEqual(room.currentLotIndex, 2);

// Check that SOLD player and UNSOLD player never reappear in pending pool
const completedIds = new Set(room.history.map(h => h.player.id));
assert(completedIds.has(currentLot.player.id), 'Sold player must be in history');
assert(completedIds.has(lot2.player.id), 'Unsold player must be in history');

// Draw random player from active set
const randomDraw = room.drawRandomPlayer('host_user_1');
assert.strictEqual(randomDraw.success, true, 'Host random draw in active set should succeed');
assert(!completedIds.has(room.currentLot!.player.id), 'Drawn player must never be a previously completed player');
console.log(`   ✓ Host randomly drew next player from Set 1: ${room.currentLot?.player.name}`);

console.log('\n====================================================');
console.log('ALL TESTS PASSED! 100% COMPLIANT WITH MEGA AUCTION SPEC.');
console.log('====================================================');
room.clearAllTimers();
process.exit(0);
