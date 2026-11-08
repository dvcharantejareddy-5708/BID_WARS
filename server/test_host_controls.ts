import { RoomManager } from './src/roomManager.js';

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

async function runHostControlsTests() {
  console.log('====================================================');
  console.log('⚡ TESTING HOST CONTROLS & AUCTION MANAGEMENT');
  console.log('====================================================\n');

  const manager = new RoomManager();
  const room = manager.createRoom('HostDhoni', {
    timerDuration: 10,
    minBidIncrement: 2000000,
    isPrivate: false
  });

  const hostId = room.hostId;
  room.selectTeam(hostId, 'CSK');

  const p2 = room.join('PlayerRohit');
  room.selectTeam(p2.id, 'MI');

  const p3 = room.join('PlayerKohli');
  room.selectTeam(p3.id, 'RCB');

  room.toggleReady(hostId, true);
  room.toggleReady(p2.id, true);
  room.toggleReady(p3.id, true);

  console.log('--- TEST GROUP 1: Start Auction & Verify Host Permission Enforcements ---');
  const startRes = room.startAuction(hostId);
  assert(startRes.success, 'Auction started successfully by host');
  assert(room.getState().status === 'AUCTION', 'Room state is AUCTION');

  // Non-host attempts
  const nonHostTimer = room.updateSettings(p2.id, { timerDuration: 15 });
  assert(!nonHostTimer.success, 'Non-host cannot update auction settings');

  const nonHostEnd = room.finishAuction(p2.id);
  assert(!nonHostEnd.success, 'Non-host cannot end the auction');

  const nonHostKick = room.kickMember(p2.id, p3.id);
  assert(!nonHostKick.success, 'Non-host cannot kick participants');

  const nonHostRecall = room.bringAllUnsoldBack(p2.id);
  assert(!nonHostRecall.success, 'Non-host cannot recall unsold players');

  const nonHostDraw = room.randomDrawUnsold(p2.id, 2);
  assert(!nonHostDraw.success, 'Non-host cannot randomly draw unsold players');

  const nonHostSkip = room.skipMultipleLots(p2.id, 2);
  assert(!nonHostSkip.success, 'Non-host cannot skip multiple players');

  console.log('\n--- TEST GROUP 2: Timer Duration & Auction Settings Update During Auction ---');
  const timerRes = room.updateSettings(hostId, { timerDuration: 15, minBidIncrement: 5000000 });
  assert(timerRes.success, 'Host updated timer duration and min bid increment during active auction');
  assert(room.getState().settings.timerDuration === 15, 'State reflects new timer duration 15s');
  assert(room.getState().settings.minBidIncrement === 5000000, 'State reflects new min bid increment 50L');

  console.log('\n--- TEST GROUP 3: Skip Multiple Players ---');
  const initialLotIndex = room.getState().currentLotIndex;
  const skipRes = room.skipMultipleLots(hostId, 3);
  assert(skipRes.success, `Host skipped 3 players: ${skipRes.message}`);
  assert(room.getState().currentLotIndex === initialLotIndex + 3, 'currentLotIndex advanced by 3');
  const skippedEntries = room.getState().history.filter(h => h.status === 'SKIPPED');
  assert(skippedEntries.length === 3, 'History contains 3 SKIPPED records');

  console.log('\n--- TEST GROUP 4: Mark Lots Unsold & Bring All Unsold Back ---');
  // Let current lot go unsold
  const lotBeforeUnsold = room.getState().currentLot!;
  (room as any).finalizeCurrentLot(); // Closes lot with 0 bids -> UNSOLD
  const unsoldInHistory = room.getState().history.filter(h => h.status === 'UNSOLD');
  assert(unsoldInHistory.length >= 1, 'Lot recorded as UNSOLD in history');

  const preRecallPoolSize = room.getState().poolSize;
  const recallRes = room.bringAllUnsoldBack(hostId);
  assert(recallRes.success, `Host recalled unsold players: ${recallRes.message}`);
  assert(recallRes.recalledCount! >= 1, `Recalled ${recallRes.recalledCount} unsold player(s)`);
  assert(room.getState().poolSize === preRecallPoolSize + recallRes.recalledCount!, 'Pool size expanded with recalled players');

  // Verify calling it again immediately when no new unsold players exist reports 0 duplicates
  const recallAgain = room.bringAllUnsoldBack(hostId);
  assert(!recallAgain.success, 'Duplicate recall prevented when no additional unsold players remain');

  console.log('\n--- TEST GROUP 5: Random Draw for Unsold Players ---');
  // Advance to next lot and mark unsold
  (room as any).currentLotIndex++;
  (room as any).startCurrentLot();
  (room as any).finalizeCurrentLot();
  const unsoldNow = room.getState().history.filter(h => h.status === 'UNSOLD');
  assert(unsoldNow.length >= 2, 'At least 2 unsold records exist');

  const poolBeforeDraw = room.getState().poolSize;
  const drawRes = room.randomDrawUnsold(hostId, 1);
  assert(drawRes.success, `Host randomly drew unsold player: ${drawRes.message}`);
  assert(drawRes.drawnLots?.length === 1, 'Exactly 1 lot drawn');
  assert(room.getState().poolSize === poolBeforeDraw + 1, 'Pool size increased by 1');

  console.log('\n--- TEST GROUP 5B: Draw Particular Unsold Player by ID (Section 1C) ---');
  // Mark another lot unsold to have an unsold player to target
  (room as any).currentLotIndex++;
  (room as any).startCurrentLot();
  const targetedUnsoldPlayer = room.getState().currentLot!.player;
  (room as any).finalizeCurrentLot();

  // Non-host attempts to recall particular player -> must be rejected
  const nonHostParticular = room.reAuctionParticularPlayer(p3.id, targetedUnsoldPlayer.id);
  assert(!nonHostParticular.success, 'Non-host cannot recall particular unsold player');

  // Host recalls particular unsold player
  const hostParticular = room.reAuctionParticularPlayer(hostId, targetedUnsoldPlayer.id);
  assert(hostParticular.success, `Host successfully recalled particular player: ${targetedUnsoldPlayer.name}`);
  assert(hostParticular.lot?.player.id === targetedUnsoldPlayer.id, 'Recalled lot has matching player ID');
  assert(hostParticular.lot?.status === 'PENDING', 'Recalled lot is set to PENDING');

  // Duplicate recall of same player while already queued must be rejected
  const duplicateParticular = room.reAuctionParticularPlayer(hostId, targetedUnsoldPlayer.id);
  assert(!duplicateParticular.success, 'Duplicate recall of already queued player is rejected');

  console.log('\n--- TEST GROUP 5C: Re-Auction Sold Player & Financial Refund Integrity (Section 2 & 3) ---');
  // Advance to next lot and sell it to CSK for 5 Cr
  (room as any).currentLotIndex++;
  (room as any).startCurrentLot();
  const playerToSell = room.getState().currentLot!.player;
  const cskPurseBefore = room.getState().teamPurse['CSK'];
  const sellPrice = 50000000; // 5 Cr

  // CSK places bid and wins
  room.placeBid(hostId, sellPrice);
  (room as any).finalizeCurrentLot();

  assert(room.getState().teamPurse['CSK'] === cskPurseBefore - sellPrice, 'CSK purse deducted by exactly 5 Cr');
  const cskSquadAfterSale = room.getState().teamSquads['CSK'];
  assert(cskSquadAfterSale.some(p => p.id === playerToSell.id), 'CSK squad contains purchased player');

  // Non-host attempts to re-auction sold player -> must be rejected
  const nonHostSoldReAuction = room.reAuctionSoldPlayer(p3.id, playerToSell.id);
  assert(!nonHostSoldReAuction.success, 'Non-host cannot re-auction sold player');

  // Host re-auctions the sold player
  const poolBeforeSoldReAuction = room.getState().poolSize;
  const soldReAuctionRes = room.reAuctionSoldPlayer(hostId, playerToSell.id);
  assert(soldReAuctionRes.success, `Host successfully reversed sale and returned ${playerToSell.name} to auction`);
  assert(room.getState().teamPurse['CSK'] === cskPurseBefore, 'CSK purse restored by exactly 5 Cr refund');
  assert(!room.getState().teamSquads['CSK'].some(p => p.id === playerToSell.id), 'Player removed from CSK squad');
  assert(room.getState().poolSize === poolBeforeSoldReAuction + 1, 'Pool size incremented with re-auctioned lot');

  // Verify historical record is marked REVERSED rather than silently deleted
  const reversedHistRecord = room.getState().history.find(h => h.player.id === playerToSell.id && h.status === 'REVERSED');
  assert(reversedHistRecord !== undefined, 'Historical record preserved with status REVERSED');

  // Now advance to the re-auctioned lot and sell to RCB for 8 Cr
  // Advance current lot to the re-auctioned lot
  (room as any).currentLotIndex++;
  (room as any).startCurrentLot();
  assert(room.getState().currentLot?.player.id === playerToSell.id, 'Re-auctioned player is active in the next round');

  const rcbPurseBefore = room.getState().teamPurse['RCB'];
  const newSellPrice = 80000000; // 8 Cr
  room.placeBid(p3.id, newSellPrice); // RCB bids 8 Cr
  (room as any).finalizeCurrentLot();

  assert(room.getState().teamPurse['RCB'] === rcbPurseBefore - newSellPrice, 'RCB purse deducted by exactly 8 Cr');
  assert(room.getState().teamSquads['RCB'].some(p => p.id === playerToSell.id), 'RCB squad now contains the re-sold player');
  assert(!room.getState().teamSquads['CSK'].some(p => p.id === playerToSell.id), 'CSK squad remains unaffected (no duplicate player)');

  console.log('\n--- TEST GROUP 6: Kick Participant & Prevention of Re-joining ---');
  // Host cannot kick self
  const kickSelfRes = room.kickMember(hostId, hostId);
  assert(!kickSelfRes.success, 'Host cannot kick themselves');

  // Host kicks p2 (PlayerRohit)
  const kickP2Res = room.kickMember(hostId, p2.id);
  assert(kickP2Res.success, `Host kicked participant ${p2.nickname}`);
  assert(!room.getState().members[p2.id], 'PlayerRohit is no longer in active room members');
  assert(room.getState().kickedMemberIds?.includes(p2.id) === true, 'PlayerRohit ID is in kickedMemberIds list');

  // Attempt to re-join using the kicked session token
  let rejectedJoin = false;
  try {
    room.join('PlayerRohit_Fake', p2.id);
  } catch (err: any) {
    rejectedJoin = true;
    assert(err.message.includes('removed from this auction room'), 'Kicked player re-join blocked with expected message');
  }
  assert(rejectedJoin, 'Exception thrown preventing kicked player from joining');

  console.log('\n--- TEST GROUP 7: End Auction & Completed State ---');
  const endRes = room.finishAuction(hostId);
  assert(endRes.success, 'Host successfully ended the auction');
  assert(room.getState().status === 'COMPLETED', 'Room status transitioned to COMPLETED');

  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log('====================================================\n');

  if (totalTests === passedTests) {
    console.log('🎯 ALL HOST CONTROL TESTS PASSED PERFECTLY!\n');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runHostControlsTests().catch(err => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
