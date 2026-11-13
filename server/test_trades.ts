import { GameRoom } from './src/gameEngine.js';
import { Player } from './src/types.js';

function createDummyPlayer(id: string, name: string, isOverseas: boolean = false, basePrice: number = 20000000): Player {
  return {
    id,
    name,
    country: isOverseas ? 'Australia' : 'India',
    is_overseas: isOverseas,
    primary_role: 'BATTER',
    category: 'Batsmen',
    base_price_inr: basePrice,
    base_price_display: '₹2.00 Cr',
    set_name: 'Marquee Batsmen',
    set_order: 1,
    tier: 'Platinum',
    matches: 50,
    runs: 1500,
    batting_strike_rate: 140,
    auction_status: 'AVAILABLE'
  };
}

function runTradeTests() {
  console.log('=== STARTING LIVE TRADING TEST SUITE ===');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✓ ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
      failed++;
    }
  }

  // Set up room
  const room = new GameRoom('TRADE1', 'HostAlice', { timerDuration: 10, tradeTimerDuration: 30 }, () => {});
  const hostId = room.hostId;
  const bobMember = room.join('Bob');
  const bobId = bobMember.id;

  room.selectTeam(hostId, 'CSK');
  room.selectTeam(bobId, 'MI');

  // Populate squads directly
  const virat = createDummyPlayer('p1', 'Virat Kohli', false);
  const rohit = createDummyPlayer('p2', 'Rohit Sharma', false);
  const warner = createDummyPlayer('p3', 'David Warner', true);
  const maxwell = createDummyPlayer('p4', 'Glenn Maxwell', true);

  room.teamSquads['CSK'].push({ ...virat, team_id: 'CSK', auction_status: 'SOLD', sold_price_inr: 20000000 });
  room.teamSquads['CSK'].push({ ...warner, team_id: 'CSK', auction_status: 'SOLD', sold_price_inr: 20000000 });
  room.teamSquads['MI'].push({ ...rohit, team_id: 'MI', auction_status: 'SOLD', sold_price_inr: 20000000 });
  room.teamSquads['MI'].push({ ...maxwell, team_id: 'MI', auction_status: 'SOLD', sold_price_inr: 20000000 });

  // 1. Validation tests
  console.log('\nTest 1: Trade Creation Validations');
  const invalidOwnTeam = room.createTradeRequest(hostId, {
    targetTeamId: 'CSK',
    type: 'PLAYER_FOR_PLAYER',
    offeredPlayerId: 'p1',
    requestedPlayerId: 'p2'
  });
  assert(!invalidOwnTeam.success, 'Rejects trading with own franchise');

  const invalidNotOwned = room.createTradeRequest(hostId, {
    targetTeamId: 'MI',
    type: 'PLAYER_FOR_PLAYER',
    offeredPlayerId: 'p999',
    requestedPlayerId: 'p2'
  });
  assert(!invalidNotOwned.success, 'Rejects offering player not in squad');

  const invalidReqNotOwned = room.createTradeRequest(hostId, {
    targetTeamId: 'MI',
    type: 'PLAYER_FOR_PLAYER',
    offeredPlayerId: 'p1',
    requestedPlayerId: 'p999'
  });
  assert(!invalidReqNotOwned.success, 'Rejects requesting player not in target squad');

  // 2. Start auction and test auto-pause
  console.log('\nTest 2: Automatic Auction Pause on Trade Creation');
  room.startAuction(hostId);
  assert(room.status === 'AUCTION', 'Auction successfully started');
  assert(room.deadlineTimestamp !== null, 'Auction has active deadline');

  const createRes = room.createTradeRequest(hostId, {
    targetTeamId: 'MI',
    type: 'PLAYER_FOR_PLAYER',
    offeredPlayerId: 'p1',
    requestedPlayerId: 'p2'
  });
  assert(createRes.success, 'Trade request created successfully');
  assert(room.activeTrade !== null, 'Active trade is registered in room');
  assert(room.status === 'PAUSED', 'Auction is automatically PAUSED');
  assert(room.pausedByTrade === true, 'pausedByTrade is set to true');

  // 3. Bidding blocked during trade pause
  console.log('\nTest 3: Bidding Blocked During Active Trade');
  const bidAttempt = room.placeBid(bobId);
  assert(!bidAttempt.success, 'Bid correctly rejected while auction paused for trade review');

  // 4. Concurrent trade attempt rejected
  console.log('\nTest 4: Concurrent Trade Rejected');
  const concurrentTrade = room.createTradeRequest(bobId, {
    targetTeamId: 'CSK',
    type: 'PLAYER_FOR_PLAYER',
    offeredPlayerId: 'p2',
    requestedPlayerId: 'p1'
  });
  assert(!concurrentTrade.success, 'Second concurrent trade proposal rejected');

  // 5. Rejection and Auto-Resume
  console.log('\nTest 5: Rejection and Automatic Resume');
  const rejectRes = room.respondTradeRequest(bobId, createRes.trade!.id, 'REJECT', 'Need better offer');
  assert(rejectRes.success, 'Recipient successfully rejected trade');
  assert(room.activeTrade === null, 'Active trade cleared');
  assert(room.tradeHistory.length === 1, 'Trade recorded in history');
  assert(room.tradeHistory[0].status === 'REJECTED', 'History status is REJECTED');
  assert(room.status === 'AUCTION', 'Auction automatically resumed to AUCTION status');
  assert(room.pausedByTrade === false, 'pausedByTrade cleared');

  // 6. Test Cancellation
  console.log('\nTest 6: Trade Cancellation');
  const trade2 = room.createTradeRequest(hostId, {
    targetTeamId: 'MI',
    type: 'PLAYER_FOR_PLAYER',
    offeredPlayerId: 'p1',
    requestedPlayerId: 'p2'
  });
  assert(trade2.success && room.status === 'PAUSED', 'Second trade initiated and auction paused');
  const cancelRes = room.cancelTradeRequest(hostId, trade2.trade!.id);
  assert(cancelRes.success, 'Initiator cancelled trade');
  assert(room.activeTrade === null, 'Active trade cleared');
  assert(room.status === 'AUCTION', 'Auction resumed upon cancellation');
  assert(room.tradeHistory[0].status === 'CANCELLED', 'History updated with CANCELLED');

  // 7. Test Player-for-Player Atomic Execution
  console.log('\nTest 7: Player-for-Player Execution');
  const trade3 = room.createTradeRequest(hostId, {
    targetTeamId: 'MI',
    type: 'PLAYER_FOR_PLAYER',
    offeredPlayerId: 'p1',
    requestedPlayerId: 'p2'
  });
  assert(trade3.success, 'Player-for-player trade proposed');
  const acceptP2P = room.respondTradeRequest(bobId, trade3.trade!.id, 'ACCEPT');
  assert(acceptP2P.success, 'Trade accepted by MI');

  const cskHasRohit = room.teamSquads['CSK'].some(p => p.id === 'p2' && p.team_id === 'CSK');
  const miHasVirat = room.teamSquads['MI'].some(p => p.id === 'p1' && p.team_id === 'MI');
  const cskLostVirat = !room.teamSquads['CSK'].some(p => p.id === 'p1');
  const miLostRohit = !room.teamSquads['MI'].some(p => p.id === 'p2');

  assert(cskHasRohit && miHasVirat && cskLostVirat && miLostRohit, 'Atomic swap of players completed with team_id updated');
  assert(room.status === 'AUCTION', 'Auction resumed after accepted trade');

  // 8. Test Player-for-Money Execution & Purse Updates
  console.log('\nTest 8: Player-for-Money Execution');
  const cskPurseBefore = room.teamPurse['CSK'];
  const miPurseBefore = room.teamPurse['MI'];
  const tradeAmount = 150000000; // 15 Cr

  const moneyTrade = room.createTradeRequest(hostId, {
    targetTeamId: 'MI',
    type: 'PLAYER_FOR_MONEY',
    offeredPlayerId: 'p2', // CSK selling Rohit to MI
    moneyAmount: tradeAmount
  });
  assert(moneyTrade.success, 'Player-for-money trade created');
  assert(room.status === 'PAUSED', 'Auction paused for money trade');

  const acceptMoney = room.respondTradeRequest(bobId, moneyTrade.trade!.id, 'ACCEPT');
  assert(acceptMoney.success, 'Money trade accepted by MI');

  assert(room.teamPurse['CSK'] === cskPurseBefore + tradeAmount, 'CSK credited with 15 Cr');
  assert(room.teamPurse['MI'] === miPurseBefore - tradeAmount, 'MI debited by 15 Cr');
  assert(room.teamSquads['MI'].some(p => p.id === 'p2'), 'MI received player p2');
  assert(!room.teamSquads['CSK'].some(p => p.id === 'p2'), 'CSK squad deducted player p2');
  assert(room.status === 'AUCTION', 'Auction resumed after money trade');

  // 9. Test Insufficient Purse Rejection
  console.log('\nTest 9: Insufficient Purse Rejection');
  const brokeTrade = room.createTradeRequest(hostId, {
    targetTeamId: 'MI',
    type: 'PLAYER_FOR_MONEY',
    offeredPlayerId: 'p3',
    moneyAmount: 999999999999 // Way too much money
  });
  assert(!brokeTrade.success, 'Rejects money trade when recipient has insufficient purse');

  // 10. Test Top Host Timer Update
  console.log('\nTest 10: Top Host Trade Timer Configuration');
  const updateTimerNonHost = room.updateTradeTimer(bobId, 60);
  assert(!updateTimerNonHost.success, 'Non-host cannot update trade timer');
  const updateTimerHost = room.updateTradeTimer(hostId, 60);
  assert(updateTimerHost.success, 'Top host can configure trade timer');
  assert(room.settings.tradeTimerDuration === 60, 'tradeTimerDuration updated to 60s');

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) process.exit(1);
}

runTradeTests();
