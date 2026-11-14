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
  room.cancelTradeRequest(aliceId, refreshTrade.trade!.id);

  // ========================================================
  // Scenario 9: Player + Cash (Offering Team Pays Cash)
  // ========================================================
  console.log('\n--- Scenario 9: Player + Cash (Offering Franchise Pays Cash) ---');
  const cskPursePreTrade9 = room.teamPurse['CSK'];
  const rcbPursePreTrade9 = room.teamPurse['RCB'];
  const tradeCash9 = 30000000; // ₹3 Cr

  const plusCashTrade1 = room.createTradeRequest(aliceId, {
    targetTeamId: 'RCB',
    type: 'PLAYER_PLUS_CASH',
    offeredPlayerId: 'p5',
    requestedPlayerId: 'p4',
    moneyAmount: tradeCash9,
    cashPayer: 'OFFERING_TEAM'
  });
  assert(plusCashTrade1.success, 'Player + Cash trade created (CSK pays ₹3 Cr)');
  assert(plusCashTrade1.trade?.cashPayer === 'OFFERING_TEAM', 'cashPayer set to OFFERING_TEAM');
  assert(room.status === 'PAUSED', 'Auction paused during Player + Cash review');

  // Charlie accepts
  const acceptPlusCash1 = room.respondTradeRequest(charlieId, plusCashTrade1.trade!.id, 'ACCEPT');
  assert(acceptPlusCash1.success, 'Player + Cash trade accepted by RCB');
  assert(room.teamPurse['CSK'] === cskPursePreTrade9 - tradeCash9, 'CSK purse deducted by ₹3 Cr');
  assert(room.teamPurse['RCB'] === rcbPursePreTrade9 + tradeCash9, 'RCB purse credited by ₹3 Cr');
  assert(room.teamSquads['CSK'].some(p => p.id === 'p4'), 'CSK received player p4');
  assert(room.teamSquads['RCB'].some(p => p.id === 'p5'), 'RCB received player p5');

  // ========================================================
  // Scenario 10: Player + Cash (Receiving Team Pays Cash)
  // ========================================================
  console.log('\n--- Scenario 10: Player + Cash (Receiving Franchise Pays Cash) ---');
  const cskPursePreTrade10 = room.teamPurse['CSK'];
  const miPursePreTrade10 = room.teamPurse['MI'];
  const tradeCash10 = 50000000; // ₹5 Cr

  const plusCashTrade2 = room.createTradeRequest(aliceId, {
    targetTeamId: 'MI',
    type: 'PLAYER_PLUS_CASH',
    offeredPlayerId: 'p4',
    requestedPlayerId: 'p1',
    moneyAmount: tradeCash10,
    cashPayer: 'RECEIVING_TEAM'
  });
  assert(plusCashTrade2.success, 'Player + Cash trade created (MI pays ₹5 Cr)');
  assert(plusCashTrade2.trade?.cashPayer === 'RECEIVING_TEAM', 'cashPayer set to RECEIVING_TEAM');

  // Bob accepts
  const acceptPlusCash2 = room.respondTradeRequest(bobId, plusCashTrade2.trade!.id, 'ACCEPT');
  assert(acceptPlusCash2.success, 'Player + Cash trade accepted by MI');
  assert(room.teamPurse['CSK'] === cskPursePreTrade10 + tradeCash10, 'CSK purse credited by ₹5 Cr');
  assert(room.teamPurse['MI'] === miPursePreTrade10 - tradeCash10, 'MI purse deducted by ₹5 Cr');
  assert(room.teamSquads['CSK'].some(p => p.id === 'p1'), 'CSK received player p1');
  assert(room.teamSquads['MI'].some(p => p.id === 'p4'), 'MI received player p4');

  // ========================================================
  // Scenario 11: End Auction & 10-Minute Post-Auction Window
  // ========================================================
  console.log('\n--- Scenario 11: End Auction & 10-Minute Post-Auction Window ---');
  const finishRes = room.finishAuction(aliceId);
  assert(finishRes.success, 'Top Host successfully ended auction');
  assert(room.status === 'COMPLETED', 'Room status set to COMPLETED');
  assert(room.postAuctionTradeStatus === 'ACTIVE', 'Post-auction trade status is ACTIVE');
  assert(room.postAuctionTradeDeadline !== null, 'Post-auction trade deadline timestamp is set');
  const durationRemainingMs = room.postAuctionTradeDeadline! - Date.now();
  assert(durationRemainingMs > 590000 && durationRemainingMs <= 600000, 'Authoritative window set to exactly 10 minutes');

  // Trading allowed during 10-minute post-auction window
  const postAuctionTrade = room.createTradeRequest(aliceId, {
    targetTeamId: 'MI',
    type: 'PLAYER_FOR_PLAYER',
    offeredPlayerId: 'p1',
    requestedPlayerId: 'p4'
  });
  assert(postAuctionTrade.success, 'Trade successfully proposed during 10-minute post-auction window');
  assert(room.status === 'COMPLETED', 'Status remains COMPLETED during post-auction trade review');

  // Bob accepts post-auction trade
  const postAuctionAccept = room.respondTradeRequest(bobId, postAuctionTrade.trade!.id, 'ACCEPT');
  assert(postAuctionAccept.success, 'Post-auction trade successfully accepted');
  assert(room.teamSquads['CSK'].some(p => p.id === 'p4'), 'CSK received p4 post-auction');
  assert(room.teamSquads['MI'].some(p => p.id === 'p1'), 'MI received p1 post-auction');

  // ========================================================
  // Scenario 12: Playing XI Selection & IPL Rule Validations
  // ========================================================
  console.log('\n--- Scenario 12: Playing XI Selection & IPL Rule Validations ---');
  // Add 12 players to CSK squad to form a complete Playing XI + Impact player
  const cskPlayers: Player[] = [];
  for (let i = 10; i < 22; i++) {
    // 3 overseas (i=10,11,12) and 9 domestic
    const isOv = i <= 12;
    const p = createDummyPlayer(`csk_${i}`, `CSK Player ${i}`, isOv);
    cskPlayers.push(p);
    room.teamSquads['CSK'].push({ ...p, team_id: 'CSK' });
  }

  // Save partial draft (6 players)
  const draftIds = cskPlayers.slice(0, 6).map(p => p.id);
  const saveDraftRes = room.savePlayingXI(aliceId, 'CSK', {
    playingXIIds: draftIds,
    captainId: draftIds[0],
    viceCaptainId: draftIds[1]
  });
  assert(saveDraftRes.success, 'Playing XI draft saved successfully');
  assert(room.teamPlayingXI['CSK'].playingXIIds.length === 6, 'Draft contains 6 players');
  assert(room.teamPlayingXI['CSK'].isConfirmed === false, 'Draft is not confirmed yet');

  // Try to confirm with only 6 players (Should fail)
  const prematureConfirm = room.confirmPlayingXI(aliceId, 'CSK');
  assert(!prematureConfirm.success, 'Cannot confirm Playing XI with fewer than 11 players');

  // Try to exceed 4 overseas players in Playing XI (Should fail)
  const ov1 = createDummyPlayer('ov1', 'Overseas 1', true);
  const ov2 = createDummyPlayer('ov2', 'Overseas 2', true);
  room.teamSquads['CSK'].push({ ...ov1, team_id: 'CSK' });
  room.teamSquads['CSK'].push({ ...ov2, team_id: 'CSK' });
  // Currently cskPlayers[0..2] are overseas, adding ov1 and ov2 gives 5 overseas
  const fiveOverseasXI = [cskPlayers[0].id, cskPlayers[1].id, cskPlayers[2].id, ov1.id, ov2.id, ...cskPlayers.slice(3, 9).map(p => p.id)];
  const excessOverseasRes = room.savePlayingXI(aliceId, 'CSK', { playingXIIds: fiveOverseasXI });
  assert(!excessOverseasRes.success, 'Playing XI rejects more than 4 overseas players');

  // Form valid 11 players (3 overseas + 8 domestic), select Captain, Vice-Captain, Impact Player
  const valid11Ids = cskPlayers.slice(0, 11).map(p => p.id);
  const impactId = cskPlayers[11].id;
  const captainId = valid11Ids[0];
  const viceCaptainId = valid11Ids[1];

  const validSaveRes = room.savePlayingXI(aliceId, 'CSK', {
    playingXIIds: valid11Ids,
    captainId,
    viceCaptainId,
    impactPlayerId: impactId
  });
  assert(validSaveRes.success, 'Valid 11 players + Captain + VC + Impact Player saved');

  // Confirm Playing XI
  const confirmRes = room.confirmPlayingXI(aliceId, 'CSK');
  assert(confirmRes.success, 'Playing XI successfully confirmed and locked');
  assert(room.teamPlayingXI['CSK'].isConfirmed === true, 'CSK Playing XI isConfirmed is true');
  assert(room.teamPlayingXI['CSK'].captainId === captainId, 'Captain ID matches');
  assert(room.teamPlayingXI['CSK'].viceCaptainId === viceCaptainId, 'Vice-Captain ID matches');
  assert(room.teamPlayingXI['CSK'].impactPlayerId === impactId, 'Impact Player matches');

  // Unauthorized team cannot edit CSK's Playing XI
  const unauthEdit = room.savePlayingXI(bobId, 'CSK', { playingXIIds: [] });
  assert(!unauthEdit.success, 'Unauthorized member cannot edit another team Playing XI');

  // ========================================================
  // Scenario 13: Player Traded Away Auto-Sanitizes Playing XI
  // ========================================================
  console.log('\n--- Scenario 13: Traded Player Auto-Sanitizes Playing XI ---');
  // Trade away the CSK captain (captainId) to MI
  const tradeCap = room.createTradeRequest(aliceId, {
    targetTeamId: 'MI',
    type: 'PLAYER_FOR_PLAYER',
    offeredPlayerId: captainId,
    requestedPlayerId: 'p2'
  });
  assert(tradeCap.success, 'Trade for Captain proposed');
  const acceptCap = room.respondTradeRequest(bobId, tradeCap.trade!.id, 'ACCEPT');
  assert(acceptCap.success, 'Trade for Captain accepted');

  // Verify captain was safely removed from CSK Playing XI and status unlocked
  const cskXI = room.teamPlayingXI['CSK'];
  assert(!cskXI.playingXIIds.includes(captainId), 'Traded player automatically removed from Playing XI');
  assert(cskXI.captainId === null, 'Captain unset after trade departure');
  assert(cskXI.isConfirmed === false, 'Playing XI confirmation unlocked for squad adjustment');

  // ========================================================
  // Scenario 14: Close Post-Auction Trade Window
  // ========================================================
  console.log('\n--- Scenario 14: Close Post-Auction Window Locks Trading Permanently ---');
  const closeWindowRes = room.closePostAuctionTradeWindow(aliceId);
  assert(closeWindowRes.success, 'Post-auction trade window closed');
  assert(room.postAuctionTradeStatus === 'CLOSED', 'Status set to CLOSED');

  // New trade proposal must be rejected
  const rejectedPostCloseTrade = room.createTradeRequest(aliceId, {
    targetTeamId: 'MI',
    type: 'PLAYER_FOR_PLAYER',
    offeredPlayerId: 'p4',
    requestedPlayerId: 'p1'
  });
  assert(!rejectedPostCloseTrade.success, 'Trades blocked permanently once 10-minute window closes');

  // ========================================================
  // Scenario 15: Full Storage Persistence on Reconnect
  // ========================================================
  console.log('\n--- Scenario 15: Full Storage Persistence Across Reload ---');
  const serialized = room.toJSON();
  const loadedRoom = GameRoom.fromJSON(serialized, () => {});
  assert(loadedRoom.status === 'COMPLETED', 'Status COMPLETED preserved');
  assert(loadedRoom.postAuctionTradeStatus === 'CLOSED', 'postAuctionTradeStatus CLOSED preserved');
  assert(loadedRoom.teamPlayingXI['CSK'] !== undefined, 'CSK Playing XI preserved');
  assert(loadedRoom.teamPlayingXI['CSK'].playingXIIds.length === 10, 'Playing XI count (10) preserved');

  console.log(`\n=== TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) process.exit(1);
}

runTradeTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
