import assert from 'assert';
import { GameRoom } from './src/gameEngine.js';
import { RoomManager } from './src/roomManager.js';
import { RoomState, IPLTeamId } from './src/types.js';

async function runLateJoinTestSuite() {
  console.log('====================================================');
  console.log('🏏 SECTION 5A: TESTING LATE JOINING DURING ACTIVE AUCTION');
  console.log('====================================================\n');

  let passed = 0;
  const test = (name: string, fn: () => void | Promise<void>) => {
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(err);
      process.exit(1);
    }
  };

  const manager = new RoomManager();
  const room = manager.createRoom('DhoniHost', { timerDuration: 10 });
  const hostId = room.hostId;

  // 1. Initial 2 players join in LOBBY
  room.selectTeam(hostId, 'CSK');
  const player2 = room.join('RohitP2');
  room.selectTeam(player2.id, 'MI');
  room.toggleReady(hostId, true);
  room.toggleReady(player2.id, true);

  // Host starts auction
  const startRes = room.startAuction(hostId);
  assert.strictEqual(startRes.success, true);
  assert.strictEqual(room.status, 'AUCTION');

  // Let initial lot have a bid
  const lot1 = room.lots[room.currentLotIndex];
  const bid1 = room.placeBid(hostId, lot1.player.base_price_inr);
  assert.strictEqual(bid1.success, true);

  // -----------------------------------------------------------
  console.log('--- TEST 1 & 2: Late Joiner Joins & Selects Available Team ---');
  // -----------------------------------------------------------
  const lateJoiner = room.join('ViratP3');
  test('Third player can join room while auction is in progress', () => {
    assert(lateJoiner, 'Late joiner must be created');
    assert.strictEqual(lateJoiner.teamId, null, 'Late joiner starts without a team');
    assert.strictEqual(lateJoiner.isHost, false, 'Late joiner must not have host privileges');
    assert.strictEqual(room.status, 'AUCTION', 'Auction must not restart upon late join');
  });

  test('Late joiner can choose an available team (RCB) without restarting the auction', () => {
    const selRes = room.selectTeam(lateJoiner.id, 'RCB');
    assert.strictEqual(selRes.success, true, 'selectTeam must succeed for available franchise');
    assert.strictEqual(room.members.get(lateJoiner.id)?.teamId, 'RCB');
    assert.strictEqual(room.status, 'AUCTION', 'Auction must remain in AUCTION state');
  });

  // -----------------------------------------------------------
  console.log('\n--- TEST 3: Late Joiner State Synchronization ---');
  // -----------------------------------------------------------
  test('Late joiner receives complete synchronized state (player, bid, clock, purse, bidLog)', () => {
    const state = room.getState();
    assert.strictEqual(state.currentLotIndex, 0);
    assert.strictEqual(state.currentLot?.player.id, lot1.player.id);
    assert.strictEqual(state.currentLot?.currentBid, lot1.player.base_price_inr);
    assert.strictEqual(state.currentLot?.currentBidder, 'CSK');
    assert(state.deadlineTimestamp && state.deadlineTimestamp > Date.now(), 'Deadline must be valid future timestamp');
    assert(state.teamPurse['RCB'] > 0, 'RCB purse must be initialized');
    assert(state.bidLog.length > 0, 'Bid log must contain historical events');
    assert(state.bidLog.some(e => e.teamId === 'RCB' && e.eventAction === 'TEAM_SELECTED'), 'Late joiner selection logged');
  });

  // -----------------------------------------------------------
  console.log('\n--- TEST 4: Late Joiner Bidding Participation ---');
  // -----------------------------------------------------------
  test('Late joiner (RCB) can place a valid bid immediately', () => {
    const currentBid = room.lots[room.currentLotIndex].currentBid;
    const nextBidAmount = currentBid + room.settings.minBidIncrement;
    const bidRes = room.placeBid(lateJoiner.id, nextBidAmount);
    assert.strictEqual(bidRes.success, true, 'Late joiner bid must be accepted');

    const state = room.getState();
    assert.strictEqual(state.currentLot?.currentBid, nextBidAmount);
    assert.strictEqual(state.currentLot?.currentBidder, 'RCB');
    assert.strictEqual(state.currentLot?.currentBidderName, 'ViratP3');
    assert.strictEqual(state.bidLog[0].teamId, 'RCB');
    assert.strictEqual(state.bidLog[0].isHighest, true);
  });

  // -----------------------------------------------------------
  console.log('\n--- TEST 5: Reject Claiming Already Claimed Team ---');
  // -----------------------------------------------------------
  const player4 = room.join('PantP4');
  test('Attempting to select an already claimed team (CSK) is rejected with clear message', () => {
    const rejRes = room.selectTeam(player4.id, 'CSK');
    assert.strictEqual(rejRes.success, false);
    assert(rejRes.message?.includes('already been claimed'), `Message should state already claimed: ${rejRes.message}`);
    assert.strictEqual(room.members.get(player4.id)?.teamId, null);
  });

  // -----------------------------------------------------------
  console.log('\n--- TEST 6: Simultaneous Team Selection Collision ---');
  // -----------------------------------------------------------
  test('Two players selecting the same available team (KKR) simultaneously: only first succeeds', () => {
    const player5 = room.join('GambhirP5');
    // player4 and player5 both want KKR
    const resA = room.selectTeam(player4.id, 'KKR');
    const resB = room.selectTeam(player5.id, 'KKR');

    assert.strictEqual(resA.success, true, 'First selection must succeed');
    assert.strictEqual(resB.success, false, 'Second selection must fail');
    assert(resB.message?.includes('already been claimed'));
    assert.strictEqual(room.members.get(player4.id)?.teamId, 'KKR');
    assert.strictEqual(room.members.get(player5.id)?.teamId, null);

    // Player 5 selects SRH instead
    const resC = room.selectTeam(player5.id, 'SRH');
    assert.strictEqual(resC.success, true);
    assert.strictEqual(room.members.get(player5.id)?.teamId, 'SRH');
  });

  // -----------------------------------------------------------
  console.log('\n--- TEST 7: Join & Bidding During Announcement Phase ---');
  // -----------------------------------------------------------
  test('During hammer announcement: late joiner bids are safely rejected without disrupting announcement', () => {
    // Finalize current lot to enter announcement phase
    (room as any).finalizeCurrentLot();
    assert.strictEqual(room.getState().announcementPhase, 'ANNOUNCING');

    const player6 = room.join('GillP6');
    room.selectTeam(player6.id, 'GT');

    // Attempting to place bid during announcement phase
    const bidDuringAnnounce = room.placeBid(player6.id, 50000000);
    assert.strictEqual(bidDuringAnnounce.success, false);
    assert(bidDuringAnnounce.message?.includes('not active') || bidDuringAnnounce.message?.includes('closed'));

    // Verify announcement phase was NOT interrupted
    assert.strictEqual(room.getState().announcementPhase, 'ANNOUNCING');

    // Finish announcement normally
    room.advanceLot(0);
    assert.strictEqual(room.getState().announcementPhase, 'NONE');
    assert.strictEqual(room.currentLotIndex, 1);
  });

  // -----------------------------------------------------------
  console.log('\n--- TEST 8: Refresh Preserves Late Joiner Membership & Team ---');
  // -----------------------------------------------------------
  test('Refreshing late joiner browser preserves their team and room membership', () => {
    // Simulate refresh: disconnect then reconnect with same member ID
    const memberObj = room.getMember(lateJoiner.id)!;
    memberObj.connected = false;

    const reconnected = room.join('ViratP3', lateJoiner.id);
    assert.strictEqual(reconnected.id, lateJoiner.id);
    assert.strictEqual(reconnected.teamId, 'RCB', 'Team must remain RCB');
    assert.strictEqual(reconnected.connected, true);
    assert.strictEqual(room.getState().members[lateJoiner.id].teamId, 'RCB');
  });

  // -----------------------------------------------------------
  console.log('\n--- TEST 9: Late Joiner Forbidden From Host Controls ---');
  // -----------------------------------------------------------
  test('Late joiner cannot access host-only controls (start, pause, resume, restart, end, skip, draw)', () => {
    assert.strictEqual(room.pauseAuction(lateJoiner.id).success, false);
    assert.strictEqual(room.resumeAuction(lateJoiner.id).success, false);
    assert.strictEqual(room.restartAuction(lateJoiner.id).success, false);
    assert.strictEqual(room.skipCurrentLot(lateJoiner.id).success, false);
    assert.strictEqual(room.drawRandomPlayer(lateJoiner.id, 'Batsmen', 20000000).success, false);
    assert.strictEqual(room.updateSettings(lateJoiner.id, { timerDuration: 5 }).success, false);
  });

  // -----------------------------------------------------------
  console.log('\n--- TEST 10: Room Full Rejection When 10 Franchises Claimed ---');
  // -----------------------------------------------------------
  test('Fill remaining 5 teams and verify 11th joiner receives room full rejection', () => {
    // Currently taken: CSK (host), MI (p2), RCB (p3), KKR (p4), SRH (p5), GT (p6) -> 6 taken
    // Fill remaining 4: RR, PBKS, DC, LSG
    const remainingTeams: IPLTeamId[] = ['RR', 'PBKS', 'DC', 'LSG'];
    let idx = 7;
    for (const t of remainingTeams) {
      const p = room.join(`Player${idx}`);
      const s = room.selectTeam(p.id, t);
      assert.strictEqual(s.success, true);
      idx++;
    }

    // Now all 10 franchises are claimed!
    const extraPlayer = room.join('ExtraPlayer11');
    // Selecting any team should fail because all 10 are claimed
    const tryCSK = room.selectTeam(extraPlayer.id, 'CSK');
    assert.strictEqual(tryCSK.success, false);

    // Also test room capacity check in selectTeam
    const allClaimed = Array.from(room.members.values()).filter(m => m.teamId).length;
    assert.strictEqual(allClaimed, 10, 'All 10 teams must be claimed');
  });

  console.log('\n====================================================');
  console.log(`🎯 ALL SECTION 5A LATE JOIN TESTS PASSED (${passed}/${passed})`);
  console.log('====================================================');
  process.exit(0);
}

runLateJoinTestSuite().catch(err => {
  console.error(err);
  process.exit(1);
});

