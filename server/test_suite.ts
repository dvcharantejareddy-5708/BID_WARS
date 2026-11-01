import { GameRoom } from './src/gameEngine.js';
import { IPL_FRANCHISES } from './src/types.js';
import { getAllPlayers } from './src/playerService.js';

console.log('====================================================');
console.log('🧪 RUNNING BID WARS AUTOMATED TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    console.log(`✅ PASS: ${desc}`);
    passedTests++;
  } else {
    console.error(`❌ FAIL: ${desc}`);
    failedTests++;
  }
}

async function runTests() {
  // Test 1: Player Database Completeness
  const players2026 = getAllPlayers('2026');
  assert(players2026.length === 532, `Total 532 verified players loaded (got ${players2026.length})`);
  const retainedCount = players2026.filter(p => p.is_retained).length;
  assert(retainedCount === 173, `173 Retained (R) players accurately classified (got ${retainedCount})`);
  const auctionPoolCount = players2026.filter(p => !p.is_retained).length;
  assert(auctionPoolCount === 359, `359 Auction Pool players available (got ${auctionPoolCount})`);
  const marqueeCount = players2026.filter(p => p.is_marquee).length;
  assert(marqueeCount > 0, `Marquee star players designated for SET -1 (got ${marqueeCount})`);

  // Test 2: Room Creation
  let broadcastCount = 0;
  const room = new GameRoom(
    'BW-TEST1',
    'HostDhoni',
    { timerDuration: 5, startingPurse: 1200000000 },
    () => { broadcastCount++; }
  );
  assert(room.roomCode === 'BW-TEST1', 'Room created with code BW-TEST1');
  assert(room.status === 'LOBBY', 'Initial room status is LOBBY');
  assert(room.settings.startingPurse === 1200000000, 'Starting purse set to ₹120 Crore');

  // Test 3: Multi-User Joining & Unique Franchise Reservation
  const hostMember = room.getMember(room.hostId)!;
  const user2 = room.join('RohitUser');
  const user3 = room.join('ViratUser');
  assert(room.members.size === 3, '3 participants joined room');

  // Select team for user 1 (CSK)
  const sel1 = room.selectTeam(hostMember.id, 'CSK');
  assert(sel1.success === true, 'Host successfully selected CSK');
  assert(hostMember.teamId === 'CSK', 'Host franchise assigned to CSK');

  // User 2 selects MI
  const sel3 = room.selectTeam(user2.id, 'MI');
  assert(sel3.success === true, 'User 2 successfully selected open franchise MI');

  // User 3 selects RCB
  const sel4 = room.selectTeam(user3.id, 'RCB');
  assert(sel4.success === true, 'User 3 successfully selected open franchise RCB');

  // Add AI Bot before auction starts
  const botTeam = 'KKR';
  const botAddRes = room.addBot(botTeam, 'aggressive');
  assert(botAddRes.success === true, 'AI Bot added to KKR franchise before auction');
  const botMember = [...room.members.values()].find(m => m.teamId === botTeam);
  assert(botMember?.isBot === true, 'Bot member exists with isBot flag');
  assert(botMember?.botStrategy === 'aggressive', 'Bot strategy set to aggressive');

  // Test 4: Host Permission Checks
  const nonHostStart = room.startAuction(user2.id);
  assert(nonHostStart.success === false, 'Non-host unauthorized attempt to start auction was rejected');

  // Toggle ready status
  room.toggleReady(hostMember.id, true);
  room.toggleReady(user2.id, true);
  room.toggleReady(user3.id, true);

  // Host starts auction
  const startRes = room.startAuction(hostMember.id);
  assert(startRes.success === true, 'Host successfully started auction');
  assert(room.status === 'AUCTION', 'Room status updated to AUCTION');
  assert(room.currentLot !== null, 'Current lot initialized');
  assert(Boolean(room.currentLot?.player.set_name), 'First set is initialized with official player set');

  const currentLot = room.currentLot!;
  const basePrice = currentLot.player.base_price_inr;

  // Test 5: Bidding Rules & Increment Validation
  // Bid below base price rejected
  const lowBid = room.placeBid(hostMember.id, basePrice - 1000000);
  assert(lowBid.success === false, 'Opening bid below base price was rejected');

  // Valid opening bid by CSK
  const validBid1 = room.placeBid(hostMember.id, basePrice);
  assert(validBid1.success === true, `Valid opening bid of ₹${basePrice / 10000000} Cr by CSK accepted`);
  assert(currentLot.currentBid === basePrice, 'Current bid updated to opening price');
  assert(currentLot.currentBidder === 'CSK', 'Highest bidder is CSK');

  // Self-bidding rejection: CSK tries to bid again
  const selfBid = room.placeBid(hostMember.id, basePrice + 2000000);
  assert(selfBid.success === false, 'Self-bidding rejected (team already holds highest bid)');

  // Bid below minimum increment rejected
  const subIncBid = room.placeBid(user2.id, basePrice + 100000);
  assert(subIncBid.success === false, 'Bid below min increment rejected');

  // Valid counter-bid by MI
  const validBid2 = room.placeBid(user2.id, basePrice + 2000000);
  assert(validBid2.success === true, 'Valid counter-bid by MI accepted');
  assert(currentLot.currentBidder === 'MI', 'Highest bidder updated to MI');

  // Test 6: Mathematical Squad Reserve Feasibility Protection
  // Simulate an extreme bid that would violate 18-player completion requirement
  // If team has 120 Cr, and needs 17 more players at 30L = 5.1 Cr reserve. Max possible bid is 114.9 Cr.
  const bankruptBid = room.placeBid(hostMember.id, 1180000000); // Leaves only 2 Cr, needs 5.1 Cr
  assert(bankruptBid.success === false, 'Mathematical squad feasibility check blocked bankrupting bid');

  // Test 7: Host Skip Player Action
  const nonHostSkip = room.skipCurrentLot(user2.id);
  assert(nonHostSkip.success === false, 'Non-host skip attempt was rejected');

  const hostSkip = room.skipCurrentLot(hostMember.id);
  assert(hostSkip.success === true, 'Host successfully skipped current lot');
  assert(currentLot.status === 'SKIPPED', 'Lot status updated to SKIPPED');
  assert(room.teamPurse['MI'] === 1200000000, 'Zero purse deducted from MI for skipped lot');

  // Wait for next lot to start
  await new Promise(r => setTimeout(r, 1600));
  assert(room.currentLotIndex === 1, 'Auction smoothly transitioned to Lot #2');

  // Test 8: Pause and Resume
  const pauseRes = room.pauseAuction(hostMember.id);
  assert(pauseRes.success === true, 'Host paused auction');
  assert(room.status === 'PAUSED', 'Room state is PAUSED');

  // Bidding while paused is rejected
  const pausedBid = room.placeBid(hostMember.id);
  assert(pausedBid.success === false, 'Bidding blocked while auction is paused');

  const resumeRes = room.resumeAuction(hostMember.id);
  assert(resumeRes.success === true, 'Host resumed auction');
  assert(room.status === 'AUCTION', 'Room state resumed to AUCTION');

  // Test 9: Bot Bidding & Rules (attempt to add bot during active auction rejected)
  const lateBotAdd = room.addBot('SRH', 'balanced');
  assert(lateBotAdd.success === false, 'Cannot add bots after auction start (correctly rejected)');

  // Test 10: Reconnection Handling
  const user2Token = user2.id;
  const reconnectedUser = room.join('RohitReconnected', user2Token);
  assert(reconnectedUser.id === user2.id, 'Session token matched existing member ID');
  assert(reconnectedUser.teamId === 'MI', 'Franchise reservation preserved during reconnection');
  assert(reconnectedUser.connected === true, 'Connection status restored to true');

  // Test 11: Final Squad Validation Report
  const summary = room.getTeamSummary();
  assert(Object.keys(summary).length === 10, 'Audit generated for all 10 IPL franchises');
  assert(summary['CSK'].squadCount === 0, 'CSK squad count is 0');
  assert(summary['CSK'].isValidSquad === false, 'Incomplete squad (<18 players) properly flagged as non-compliant');

  console.log('\n====================================================');
  console.log(`📊 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
