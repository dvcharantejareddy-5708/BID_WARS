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

async function runTradeTests() {
  console.log('=== STARTING 3-TEAM TRADE VALIDATION TEST SUITE ===');
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

  // 1. SETUP ROOM WITH 3 CONNECTED TEAMS: Team A (CSK), Team B (MI), Team C (RCB)
  const room = new GameRoom('ROOM3', 'Alice', { timerDuration: 15 }, () => {});
  const aliceId = room.hostId; // Team A (CSK) - Top Host
  const bob = room.join('Bob');
  const bobId = bob.id; // Team B (MI)
  const charlie = room.join('Charlie');
  const charlieId = charlie.id; // Team C (RCB)

  room.selectTeam(aliceId, 'CSK');
  room.selectTeam(bobId, 'MI');
  room.selectTeam(charlieId, 'RCB');

  // Populate squads
  const p1 = createDummyPlayer('p1', 'Virat Kohli', false);
  const p2 = createDummyPlayer('p2', 'Rohit Sharma', false);
  const p3 = createDummyPlayer('p3', 'Glenn Maxwell', true);
  const p4 = createDummyPlayer('p4', 'Jasprit Bumrah', false);

  room.teamSquads['CSK'].push({ ...p1, team_id: 'CSK', auction_status: 'SOLD', sold_price_inr: 20000000 });
  room.teamSquads['MI'].push({ ...p2, team_id: 'MI', auction_status: 'SOLD', sold_price_inr: 20000000 });
  room.teamSquads['MI'].push({ ...p3, team_id: 'MI', auction_status: 'SOLD', sold_price_inr: 15000000 });
  room.teamSquads['RCB'].push({ ...p4, team_id: 'RCB', auction_status: 'SOLD', sold_price_inr: 20000000 });

  // Start Auction
  room.startAuction(aliceId);
  assert(room.status === 'AUCTION', 'Auction started with Team A, B, and C connected');
  const initialLot = room.currentLot;
  assert(initialLot !== null, 'Initial auction lot is active');
  const initialLotNumber = initialLot!.lotNumber;

  // Let Team C place a bid
  const openingBid = room.placeBid(charlieId);
  assert(openingBid.success, 'Team C placed initial leading bid');
  assert(room.currentLot!.currentBidder === 'RCB', 'Team C is current highest bidder');

  // ========================================================
  // REQUIREMENT 1 & 2: Team A proposes trade to Team B
  // ========================================================
  console.log('\n--- Scenario 1: Team A Proposes to Team B ---');
  const tradeReq = room.createTradeRequest(aliceId, {
    targetTeamId: 'MI',
    type: 'PLAYER_FOR_PLAYER',
    offeredPlayerId: 'p1',
    requestedPlayerId: 'p2'
  });
  assert(tradeReq.success, 'Trade proposal created successfully');
  const tradeId = tradeReq.trade!.id;

  // Verify visible to all 3 teams via getState()
  const stateA = room.getState();
  assert(stateA.activeTrade !== null, 'Team A sees active trade in room state');
  assert(stateA.activeTrade!.id === tradeId, 'Active trade ID matches');
  assert(stateA.activeTrade!.fromTeamId === 'CSK', 'Requesting team is CSK (Team A)');
  assert(stateA.activeTrade!.toTeamId === 'MI', 'Receiving team is MI (Team B)');
  assert(stateA.activeTrade!.status === 'PENDING', 'Status is PENDING');

  // Verify countdown begins at 45 seconds
  const remainingSec = Math.ceil((stateA.activeTrade!.expiresAt - stateA.activeTrade!.createdAt) / 1000);
  assert(remainingSec === 45, `Countdown initialized to exactly 45 seconds (got ${remainingSec}s)`);

  // Verify auction is paused for everyone, lot and leader preserved
  assert(room.status === 'PAUSED', 'Live auction automatically paused for all participants');
  assert(room.pausedByTrade === true, 'pausedByTrade is set to true');
  assert(room.currentLot!.lotNumber === initialLotNumber, 'Current lot preserved during trade pause');
  assert(room.currentLot!.currentBidder === 'RCB', 'Highest bidder (Team C) preserved during trade pause');

  // Bids must be blocked during pause
  const blockedBid = room.placeBid(bobId);
  assert(!blockedBid.success, 'Bidding blocked while trade is pending');

  // ========================================================
  // REQUIREMENT 2 & 15: Unauthorized backend requests rejected
  // ========================================================
  console.log('\n--- Scenario 2: Strict Permission Enforcements ---');
  // Team A (sender) cannot accept its own proposal
  const senderAccept = room.respondTradeRequest(aliceId, tradeId, 'ACCEPT');
  assert(!senderAccept.success, 'Team A (sender) is rejected from accepting its own proposal');

  // Team C (uninvolved) cannot accept or reject
  const uninvolvedAccept = room.respondTradeRequest(charlieId, tradeId, 'ACCEPT');
  assert(!uninvolvedAccept.success, 'Team C (uninvolved) is rejected from accepting');
  const uninvolvedReject = room.respondTradeRequest(charlieId, tradeId, 'REJECT');
  assert(!uninvolvedReject.success, 'Team C (uninvolved) is rejected from rejecting');

  // Team C cannot cancel
  const uninvolvedCancel = room.cancelTradeRequest(charlieId, tradeId);
  assert(!uninvolvedCancel.success, 'Team C (uninvolved) is rejected from cancelling');

  // ========================================================
  // REQUIREMENT 7: Team B accepts trade
  // ========================================================
  console.log('\n--- Scenario 3: Team B Accepts Trade ---');
  const acceptRes = room.respondTradeRequest(bobId, tradeId, 'ACCEPT');
  assert(acceptRes.success, 'Team B (receiving team) successfully accepted trade');
  assert(room.activeTrade === null, 'Active trade cleared upon acceptance');
  assert(room.tradeHistory[0].status === 'ACCEPTED', 'Recorded in trade history as ACCEPTED');

  // Verify atomic player swap
  assert(room.teamSquads['CSK'].some(p => p.id === 'p2'), 'CSK now owns p2 (Rohit)');
  assert(!room.teamSquads['CSK'].some(p => p.id === 'p1'), 'CSK no longer owns p1');
  assert(room.teamSquads['MI'].some(p => p.id === 'p1'), 'MI now owns p1 (Virat)');
  assert(!room.teamSquads['MI'].some(p => p.id === 'p2'), 'MI no longer owns p2');

  // Verify auction automatically resumed
  assert(room.status === 'AUCTION', 'Auction automatically resumed after trade acceptance');
  assert(room.currentLot!.lotNumber === initialLotNumber, 'Same player lot is active after resume');
  assert(room.currentLot!.currentBidder === 'RCB', 'Same leading bidder preserved after resume');

  // Bids allowed again
  const resumeBid = room.placeBid(aliceId);
  assert(resumeBid.success, 'Bidding functions normally after auction resumption');

  // ========================================================
  // REQUIREMENT 8: Rejection Scenario
  // ========================================================
  console.log('\n--- Scenario 4: Rejection and Auto-Resume ---');
  const tradeReq2 = room.createTradeRequest(aliceId, {
    targetTeamId: 'MI',
    type: 'PLAYER_FOR_PLAYER',
    offeredPlayerId: 'p2',
    requestedPlayerId: 'p3'
  });
  assert(tradeReq2.success && room.status === 'PAUSED', 'Trade 2 created and auction paused');

  const rejectRes = room.respondTradeRequest(bobId, tradeReq2.trade!.id, 'REJECT', 'Keeping player');
  assert(rejectRes.success, 'Team B successfully rejected Trade 2');
  assert(room.activeTrade === null, 'Active trade cleared after rejection');
  assert(room.tradeHistory[0].status === 'REJECTED', 'Trade recorded in history as REJECTED');
  assert(room.status === 'AUCTION', 'Auction resumed after rejection');

  // ========================================================
  // REQUIREMENT 9: Cancellation by Sender
  // ========================================================
  console.log('\n--- Scenario 5: Cancellation and Auto-Resume ---');
  const tradeReq3 = room.createTradeRequest(aliceId, {
    targetTeamId: 'MI',
    type: 'PLAYER_FOR_PLAYER',
    offeredPlayerId: 'p2',
    requestedPlayerId: 'p3'
  });
  assert(tradeReq3.success && room.status === 'PAUSED', 'Trade 3 created and auction paused');

  const cancelRes = room.cancelTradeRequest(aliceId, tradeReq3.trade!.id);
  assert(cancelRes.success, 'Team A (initiator) successfully cancelled trade');
  assert(room.activeTrade === null, 'Active trade cleared after cancellation');
  assert(room.tradeHistory[0].status === 'CANCELLED', 'Trade recorded in history as CANCELLED');
  assert(room.status === 'AUCTION', 'Auction resumed after cancellation');

  // ========================================================
  // REQUIREMENT 10: Automatic Expiration after Timer
  // ========================================================
  console.log('\n--- Scenario 6: Automatic 45s Expiration ---');
  const tradeReq4 = room.createTradeRequest(aliceId, {
    targetTeamId: 'MI',
    type: 'PLAYER_FOR_PLAYER',
    offeredPlayerId: 'p2',
    requestedPlayerId: 'p3'
  });
  assert(tradeReq4.success && room.status === 'PAUSED', 'Trade 4 created and auction paused');

  // Simulate authoritative server timer expiration
  room.expireTradeRequest(tradeReq4.trade!.id);
  assert(room.activeTrade === null, 'Active trade cleared upon expiration');
  assert(room.tradeHistory[0].status === 'EXPIRED', 'Trade recorded in history as EXPIRED');
  assert(room.status === 'AUCTION', 'Auction resumed after expiration');

  // Neither team can accept an expired trade
  const lateAccept = room.respondTradeRequest(bobId, tradeReq4.trade!.id, 'ACCEPT');
  assert(!lateAccept.success, 'Expired trade cannot be accepted by receiving team');

  // ========================================================
  // REQUIREMENT 14: Player for Money Trade Execution
  // ========================================================
  console.log('\n--- Scenario 7: Player For Money Execution ---');
  const cskPurseBefore = room.teamPurse['CSK'];
  const miPurseBefore = room.teamPurse['MI'];
  const cashAmount = 100000000; // 10 Cr

  const moneyTrade = room.createTradeRequest(aliceId, {
    targetTeamId: 'MI',
    type: 'PLAYER_FOR_MONEY',
    offeredPlayerId: 'p2',
    moneyAmount: cashAmount
  });
  assert(moneyTrade.success && room.status === 'PAUSED', 'Player-for-money trade created and auction paused');

  const acceptMoney = room.respondTradeRequest(bobId, moneyTrade.trade!.id, 'ACCEPT');
  assert(acceptMoney.success, 'Player-for-money trade accepted');
  assert(room.teamPurse['CSK'] === cskPurseBefore + cashAmount, 'CSK purse credited by ₹10 Cr');
  assert(room.teamPurse['MI'] === miPurseBefore - cashAmount, 'MI purse debited by ₹10 Cr');
  assert(room.teamSquads['MI'].some(p => p.id === 'p2'), 'MI received player p2');
  assert(!room.teamSquads['CSK'].some(p => p.id === 'p2'), 'CSK squad deducted player p2');
  assert(room.status === 'AUCTION', 'Auction resumed after money trade');

  // ========================================================
  // REQUIREMENT 11: Reconnect & Refresh State Preservation
  // ========================================================
  console.log('\n--- Scenario 8: Reconnect & Refresh Preserves Countdown ---');
  const p5 = createDummyPlayer('p5', 'MS Dhoni', false);
  room.teamSquads['CSK'].push({ ...p5, team_id: 'CSK', auction_status: 'SOLD', sold_price_inr: 20000000 });

  const refreshTrade = room.createTradeRequest(aliceId, {
    targetTeamId: 'RCB',
    type: 'PLAYER_FOR_MONEY',
    offeredPlayerId: 'p5',
    moneyAmount: 20000000
  });
  assert(refreshTrade.success, 'Trade created for refresh test');
  // Simulate serialized room data and deserialization (as happens on reload/storage)
  const json = room.toJSON();
  const restoredRoom = GameRoom.fromJSON(json, () => {});
  assert(restoredRoom.activeTrade !== null, 'Active trade preserved across reload');
  assert(restoredRoom.activeTrade!.id === refreshTrade.trade!.id, 'Trade ID preserved across reload');
  assert(restoredRoom.status === 'PAUSED', 'PAUSED status preserved across reload');
  assert(restoredRoom.pausedByTrade === true, 'pausedByTrade preserved across reload');

  // Clean up
  restoredRoom.cancelTradeRequest(aliceId, refreshTrade.trade!.id);

  console.log(`\n=== TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) process.exit(1);
}

runTradeTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
