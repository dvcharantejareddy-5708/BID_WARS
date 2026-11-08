import { RoomManager } from './src/roomManager.js';
import { IPL_FRANCHISES } from './src/types.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

async function runAuctionFlowFeedTests() {
  console.log('====================================================');
  console.log('⚡ TESTING LIVE BID FEED, TRANSITION LOCKS & FLOW');
  console.log('====================================================\n');

  console.log('--- TEST GROUP 1: Live Bid Feed & Rapid Bidding ---');
  const manager = new RoomManager();
  const room = manager.createRoom('Dhoni', {
    timerDuration: 10,
    minBidIncrement: 2000000,
    isPrivate: false
  });

  const hostId = room.hostId;
  room.selectTeam(hostId, 'CSK');

  const p2 = room.join('Rohit');
  room.selectTeam(p2.id, 'MI');

  const p3 = room.join('Kohli');
  room.selectTeam(p3.id, 'RCB');

  room.toggleReady(hostId, true);
  room.toggleReady(p2.id, true);
  room.toggleReady(p3.id, true);

  const startRes = room.startAuction(hostId);
  assert(startRes.success, 'Auction started successfully');
  const lot1 = room.getState().currentLot!;
  assert(lot1 !== null, 'Lot 1 is active');
  assert(lot1.bids.length === 0, 'Initial lot has empty bids array');

  // Place rapid consecutive bids
  const bid1 = room.placeBid(hostId, lot1.player.base_price_inr);
  assert(bid1.success, `CSK placed opening bid of ₹${(lot1.player.base_price_inr / 10000000).toFixed(2)} Cr`);

  const bid2 = room.placeBid(p2.id, lot1.player.base_price_inr + 2000000);
  assert(bid2.success, `MI placed higher bid of ₹${((lot1.player.base_price_inr + 2000000) / 10000000).toFixed(2)} Cr`);

  const bid3 = room.placeBid(p3.id, lot1.player.base_price_inr + 4000000);
  assert(bid3.success, `RCB placed leading bid of ₹${((lot1.player.base_price_inr + 4000000) / 10000000).toFixed(2)} Cr`);

  const updatedLot1 = room.getState().currentLot!;
  assert(updatedLot1.bids.length === 3, `Lot 1 records exactly 3 accepted bids (got ${updatedLot1.bids.length})`);
  assert(updatedLot1.bids[0].teamId === 'RCB', 'bids[0] is the latest & highest bidder (RCB)');
  assert(updatedLot1.bids[0].amount === lot1.player.base_price_inr + 4000000, 'bids[0] amount matches highest bid');
  assert(updatedLot1.currentBidder === 'RCB', 'currentBidder is RCB');

  console.log('\n--- TEST GROUP 2: Finalize Lot & Authoritative Result ID ---');
  // Trigger lot finalization (hammer impact)
  (room as any).finalizeCurrentLot();
  const finalizedState = room.getState();
  const resultId = finalizedState.currentResultId;
  assert(typeof resultId === 'string' && resultId.length > 0, `Authoritative resultId created: ${resultId}`);
  assert(finalizedState.announcementPhase === 'ANNOUNCING', 'announcementPhase is locked to ANNOUNCING');

  // Attempting to place bid during hammer announcement MUST fail
  const lateBid = room.placeBid(hostId, lot1.player.base_price_inr + 6000000);
  assert(!lateBid.success, 'New bids rejected during hammer announcement lock');

  // Advance lot with mismatching resultId MUST be rejected
  const fakeAdvance = room.advanceLot(0, 'fake_result_id_123');
  assert(!fakeAdvance.success, 'advanceLot with invalid/spoofed resultId is rejected');
  assert(room.getState().announcementPhase === 'ANNOUNCING', 'State remains in ANNOUNCING phase after rejected advance');

  // Advance lot with valid authoritative resultId MUST succeed
  const validAdvance = room.advanceLot(0, resultId!);
  assert(validAdvance.success, 'advanceLot with valid authoritative resultId succeeds');

  const lot2State = room.getState();
  assert(lot2State.currentLotIndex === 1, `Advanced to Lot #2 (index 1)`);
  assert(lot2State.announcementPhase === 'NONE', 'announcementPhase reset to NONE');
  assert(lot2State.currentResultId === null, 'currentResultId reset to null for next player');
  assert(lot2State.currentLot!.bids.length === 0, 'Next player (Lot #2) has cleanly reset empty bids array');

  console.log('\n--- TEST GROUP 3: Idempotent Announcement Complete Call ---');
  // Repeat advance call with already-consumed resultId MUST be safely ignored
  const repeatedAdvance = room.advanceLot(0, resultId!);
  assert(!repeatedAdvance.success, 'Repeated/duplicate advanceLot call safely ignored (idempotent)');

  console.log('\n====================================================');
  console.log(`🎯 ALL FLOW & FEED TESTS PASSED (${passedTests}/${totalTests})`);
  console.log('====================================================\n');
  process.exit(totalTests === passedTests ? 0 : 1);
}

runAuctionFlowFeedTests().catch(console.error);
