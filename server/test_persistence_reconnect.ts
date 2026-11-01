import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameRoom } from './src/gameEngine.js';
import { RoomManager } from './src/roomManager.js';
import { storageService } from './src/storageService.js';
import { RoomState } from './src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runPersistenceAndReconnectTests() {
  console.log('====================================================');
  console.log('🔄 TESTING REFRESH, PERSISTENCE, BID LOG & HAMMER CLOCK');
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

  const asyncTest = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(err);
      process.exit(1);
    }
  };

  // -----------------------------------------------------------
  console.log('--- TEST GROUP 1: Room Reconnection (Browser Refresh) ---');
  // -----------------------------------------------------------

  const manager = new RoomManager();
  const room = manager.createRoom('DhoniCaptain', { timerDuration: 10 });
  const hostId = room.hostId;

  test('Host joins room and selects CSK franchise', () => {
    const sel = room.selectTeam(hostId, 'CSK');
    assert.strictEqual(sel.success, true);
    assert.strictEqual(room.members.get(hostId)?.teamId, 'CSK');
  });

  const member2 = room.join('RohitHitman');
  test('Second player joins room and selects MI franchise', () => {
    const sel = room.selectTeam(member2.id, 'MI');
    assert.strictEqual(sel.success, true);
    assert.strictEqual(room.members.get(member2.id)?.teamId, 'MI');
    assert.strictEqual(room.members.size, 2);
  });

  test('Simulate browser refresh: temporary disconnect does NOT delete member', () => {
    // Simulate socket disconnect on refresh
    const mem = room.getMember(member2.id)!;
    mem.connected = false;
    mem.lastSeen = Date.now();

    assert.strictEqual(room.members.size, 2, 'Member must still exist in room during refresh');
    assert.strictEqual(room.members.get(member2.id)?.connected, false);
    assert.strictEqual(room.members.get(member2.id)?.teamId, 'MI', 'Team assignment must be preserved');
  });

  test('Simulate page reload: rejoining with sessionToken restores connection and preserves seat', () => {
    const reconnected = room.join('RohitHitman', member2.id);
    assert.strictEqual(reconnected.id, member2.id, 'Must return identical member id');
    assert.strictEqual(reconnected.connected, true, 'Must mark member connected');
    assert.strictEqual(reconnected.teamId, 'MI', 'Must retain franchise assignment');
    assert.strictEqual(room.members.size, 2, 'Must not duplicate members on reconnect');
  });

  // -----------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Live Bid Log & Event Recording ---');
  // -----------------------------------------------------------

  test('Auction starts and logs AUCTION_STARTED in bidLog', () => {
    room.toggleReady(hostId, true);
    room.toggleReady(member2.id, true);
    const startRes = room.startAuction(hostId);
    assert.strictEqual(startRes.success, true);

    const bidLog = room.getState().bidLog;
    assert(bidLog.length > 0, 'bidLog must not be empty');
    assert(bidLog.some(e => e.eventAction === 'AUCTION_STARTED'), 'bidLog must record AUCTION_STARTED');
    assert(bidLog.some(e => e.eventAction === 'PLAYER_NOMINATED'), 'bidLog must record PLAYER_NOMINATED');
  });

  test('Bidding updates bidLog with accepted and highest bid flags', () => {
    const lot = room.lots[room.currentLotIndex];
    const basePrice = lot.player.base_price_inr;

    // CSK bids base price
    const bid1 = room.placeBid(hostId, basePrice);
    assert.strictEqual(bid1.success, true);

    let state = room.getState();
    const latestBid = state.bidLog[0];
    assert.strictEqual(latestBid.type, 'BID');
    assert.strictEqual(latestBid.teamId, 'CSK');
    assert.strictEqual(latestBid.amount, basePrice);
    assert.strictEqual(latestBid.accepted, true);
    assert.strictEqual(latestBid.isHighest, true);

    // MI raises bid
    const bid2Amount = basePrice + room.settings.minBidIncrement;
    const bid2 = room.placeBid(member2.id, bid2Amount);
    assert.strictEqual(bid2.success, true);

    state = room.getState();
    const miBid = state.bidLog[0];
    assert.strictEqual(miBid.teamId, 'MI');
    assert.strictEqual(miBid.amount, bid2Amount);
    assert.strictEqual(miBid.isHighest, true);

    // Check that previous CSK bid is no longer highest
    const cskBid = state.bidLog.find(b => b.teamId === 'CSK' && b.type === 'BID');
    assert.strictEqual(cskBid?.isHighest, false);
  });

  test('Illegal bid (e.g. self-bidding) logs rejected bid with rejection reason', () => {
    // MI tries to bid again while already holding highest bid
    const stateBefore = room.getState();
    const nextAmount = (stateBefore.currentLot?.currentBid || 0) + room.settings.minBidIncrement;
    const rejBid = room.placeBid(member2.id, nextAmount);
    assert.strictEqual(rejBid.success, false);

    const state = room.getState();
    const rejectedLog = state.bidLog[0];
    assert.strictEqual(rejectedLog.type, 'BID');
    assert.strictEqual(rejectedLog.teamId, 'MI');
    assert.strictEqual(rejectedLog.accepted, false);
    assert(rejectedLog.rejectionReason?.includes('highest bid'));
  });

  // -----------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Synchronized Hammer Announcement & Idempotent Advance ---');
  // -----------------------------------------------------------

  test('Lot finalization locks state in ANNOUNCING phase', () => {
    const lotIndex = room.currentLotIndex;
    const lot = room.lots[lotIndex];

    // Force finalize
    (room as any).finalizeCurrentLot();

    const state = room.getState();
    assert.strictEqual(state.announcementPhase, 'ANNOUNCING');
    assert.strictEqual(state.announcementLotNumber, lot.lotNumber);
    assert.strictEqual(state.currentLot?.status, 'SOLD');
    assert.strictEqual(state.currentLot?.winningTeam, 'MI');

    // Bid log recorded PLAYER_SOLD event
    const soldEvent = state.bidLog.find(e => e.eventAction === 'PLAYER_SOLD');
    assert(soldEvent, 'PLAYER_SOLD event must be recorded in bidLog');
  });

  test('advanceLot is idempotent and coordinates next player transition safely', () => {
    const initialIndex = room.currentLotIndex;

    // First advance from client completing announcement
    room.advanceLot(initialIndex);
    assert.strictEqual(room.currentLotIndex, initialIndex + 1, 'Lot index must advance by 1');
    assert.strictEqual(room.getState().announcementPhase, 'NONE', 'Announcement phase must clear');

    // Duplicate/late advance from another client should be safely ignored!
    room.advanceLot(initialIndex);
    assert.strictEqual(room.currentLotIndex, initialIndex + 1, 'Stale lot advance must NOT double-advance lot');
  });

  // -----------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Backend Persistence & Server Restart Recovery ---');
  // -----------------------------------------------------------

  await asyncTest('Room state serializes and saves to persistent storage', async () => {
    const json = room.toJSON();
    storageService.saveRoom(json);
    storageService.flushToDisk();

    const loaded = await storageService.loadRoom(room.roomCode);
    assert(loaded, 'Loaded room data must exist');
    assert.strictEqual(loaded.roomCode, room.roomCode);
    assert.strictEqual(loaded.teamPurse['MI'], room.teamPurse['MI']);
    assert.strictEqual(loaded.teamSquads['MI'].length, 1);
    assert.strictEqual(loaded.history.length, 1);
  });

  await asyncTest('Simulate server reboot: RoomManager restores full room state', async () => {
    const rebootManager = new RoomManager();
    await rebootManager.loadPersistedRooms();

    const restoredRoom = rebootManager.getRoom(room.roomCode);
    assert(restoredRoom, 'Restored room must exist in rebooted manager');

    const restoredState = restoredRoom.getState();
    assert.strictEqual(restoredState.roomCode, room.roomCode);
    assert.strictEqual(restoredState.status, 'AUCTION');
    assert.strictEqual(restoredState.teamSquads['MI'].length, 1);
    assert.strictEqual(restoredState.history.length, 1);
    assert.strictEqual(restoredState.bidLog.length, room.bidLog.length);
    assert.strictEqual(restoredState.members[hostId].teamId, 'CSK');
    assert.strictEqual(restoredState.members[member2.id].teamId, 'MI');
  });

  // -----------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Explicit LEAVE_ROOM Cleanup ---');
  // -----------------------------------------------------------

  test('Explicit LEAVE_ROOM removes player, preserves remaining players, transfers host if needed', () => {
    // Member 2 explicitly leaves
    room.removeMember(member2.id);
    assert(!room.members.has(member2.id), 'Explicit leave must remove member');
    assert.strictEqual(room.members.size, 1);
    assert.strictEqual(room.isClosed, false);

    // Host explicitly leaves
    room.removeMember(hostId);
    assert.strictEqual(room.isClosed, true, 'Room with zero human members must be marked closed');
  });

  console.log('\n====================================================');
  console.log(`🎯 ALL PERSISTENCE & RECONNECT TESTS PASSED (${passed}/${passed})`);
  console.log('====================================================');
}

runPersistenceAndReconnectTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

