import { WebSocket } from 'ws';
import http from 'http';
import express from 'express';
import { WebSocketServer } from 'ws';
import { RoomManager } from './src/roomManager.js';
import { ServerMessage } from './src/types.js';

console.log('====================================================');
console.log('🌐 RUNNING BID WARS REAL-TIME MULTIPLAYER INTEGRATION TEST');
console.log('====================================================\n');

async function testMultiplayer() {
  const app = express();
  app.use(express.json());
  const roomManager = new RoomManager();

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });
  wss.on('connection', ws => roomManager.handleConnection(ws));

  await new Promise<void>(res => server.listen(3099, '127.0.0.1', () => res()));
  console.log('Test Server listening on port 3099');

  // Create room
  const room = roomManager.createRoom('HostGauti', {
    timerDuration: 6,
    startingPurse: 1200000000
  });
  const roomCode = room.roomCode;
  const hostId = room.hostId;
  console.log(`Room created: ${roomCode}, HostId: ${hostId}`);

  // Client 1 (Host) WebSocket
  const ws1 = new WebSocket(`ws://127.0.0.1:3099`);
  const ws1Messages: ServerMessage[] = [];

  // Client 2 (Friend) WebSocket
  const ws2 = new WebSocket(`ws://127.0.0.1:3099`);
  const ws2Messages: ServerMessage[] = [];

  await Promise.all([
    new Promise(res => ws1.on('open', res)),
    new Promise(res => ws2.on('open', res))
  ]);
  console.log('Both client WebSockets connected to test server');

  ws1.on('message', data => ws1Messages.push(JSON.parse(data.toString())));
  ws2.on('message', data => ws2Messages.push(JSON.parse(data.toString())));

  // 1. Client 1 Joins as Host
  ws1.send(JSON.stringify({
    type: 'JOIN_ROOM',
    roomCode,
    nickname: 'HostGauti',
    sessionToken: hostId
  }));

  // 2. Client 2 Joins as Friend
  ws2.send(JSON.stringify({
    type: 'JOIN_ROOM',
    roomCode,
    nickname: 'FriendHardik'
  }));

  await new Promise(r => setTimeout(r, 400));
  console.log('Both clients joined room');

  // 3. Client 1 selects KKR
  ws1.send(JSON.stringify({
    type: 'SELECT_TEAM',
    teamId: 'KKR'
  }));

  // 4. Client 2 selects MI
  ws2.send(JSON.stringify({
    type: 'SELECT_TEAM',
    teamId: 'MI'
  }));

  await new Promise(r => setTimeout(r, 400));
  console.log('Franchises selected by both clients (KKR & MI)');

  // 5. Ready up and start auction
  ws1.send(JSON.stringify({ type: 'TOGGLE_READY', isReady: true }));
  ws2.send(JSON.stringify({ type: 'TOGGLE_READY', isReady: true }));
  await new Promise(r => setTimeout(r, 200));

  ws1.send(JSON.stringify({ type: 'START_AUCTION' }));
  console.log('Auction started by Host');

  await new Promise(r => setTimeout(r, 500));

  // Check that both clients received NEW_LOT
  const c1NewLot = ws1Messages.find(m => m.type === 'NEW_LOT');
  const c2NewLot = ws2Messages.find(m => m.type === 'NEW_LOT');
  if (c1NewLot && c2NewLot) {
    console.log('✅ PASS: Both clients received synchronized NEW_LOT');
  } else {
    console.error('❌ FAIL: Clients did not both receive NEW_LOT');
    process.exit(1);
  }

  // 6. Client 1 places bid
  ws1.send(JSON.stringify({ type: 'PLACE_BID' }));
  await new Promise(r => setTimeout(r, 500));

  // Check that Client 2 received BID_PLACED
  const c2BidPlaced = ws2Messages.find(m => m.type === 'BID_PLACED');
  if (c2BidPlaced) {
    console.log(`✅ PASS: Client 2 received real-time broadcast of Client 1's bid (₹${(c2BidPlaced as any).bid.amount / 10000000} Cr)`);
  } else {
    console.error('❌ FAIL: Client 2 did not receive BID_PLACED event');
    process.exit(1);
  }

  // 7. Client 2 places counter bid
  ws2.send(JSON.stringify({ type: 'PLACE_BID' }));
  await new Promise(r => setTimeout(r, 500));

  const c1CounterBid = ws1Messages.filter(m => m.type === 'BID_PLACED');
  if (c1CounterBid.length >= 2) {
    console.log('✅ PASS: Client 1 received real-time broadcast of Client 2\'s counter-bid');
  } else {
    console.error('❌ FAIL: Client 1 did not receive counter-bid');
    process.exit(1);
  }

  // Clean up
  ws1.close();
  ws2.close();
  server.close();

  console.log('\n====================================================');
  console.log('🎉 ALL MULTIPLAYER SYNCHRONIZATION TESTS PASSED');
  console.log('====================================================');
  process.exit(0);
}

testMultiplayer().catch(err => {
  console.error('Multiplayer test error:', err);
  process.exit(1);
});

