import { getAllPlayers, buildAuctionLots } from './src/playerService.js';
import { GameRoom } from './src/gameEngine.js';
import { RoomManager } from './src/roomManager.js';
import { Player, IPLTeamId, IPL_FRANCHISES } from './src/types.js';

async function runTestSuite() {
  console.log('====================================================');
  console.log('🏏 BID WARS IPL AUCTION: FULL VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (detail) console.error(`     Detail: ${detail}`);
    }
  }

  // TEST SUITE 1: Player Database & Classification
  console.log('--- TEST GROUP 1: Verified Player Database ---');
  const players2026 = getAllPlayers('2026');

  assert(players2026.length === 532, 'Total player database count is 532', `Found: ${players2026.length}`);
  
  const overseasPlayers = players2026.filter(p => p.is_overseas);
  const indianPlayers = players2026.filter(p => !p.is_overseas);
  assert(overseasPlayers.length === 162, 'Overseas player count matches verified PDF exactly (162)', `Found: ${overseasPlayers.length}`);
  assert(indianPlayers.length === 370, 'Indian player count matches verified PDF exactly (370)', `Found: ${indianPlayers.length}`);

  const retainedPlayers = players2026.filter(p => p.is_retained);
  const auctionPool = players2026.filter(p => !p.is_retained);
  assert(retainedPlayers.length === 173, 'Retained players count is 173', `Found: ${retainedPlayers.length}`);
  assert(auctionPool.length === 359, 'Auction pool players count is 359', `Found: ${auctionPool.length}`);

  // Base price distribution check
  const prices = new Set(players2026.map(p => p.base_price_inr));
  assert(prices.has(20000000) && prices.has(15000000) && prices.has(10000000) && prices.has(3000000), 
    'Official base prices preserved (₹2 Cr, ₹1.5 Cr, ₹1 Cr, ₹30L, etc.)');

  // TEST SUITE 2: Atomic Purchase Transaction & Squad Sync
  console.log('\n--- TEST GROUP 2: Atomic Purchase & Squad Synchronization ---');
  let lastBroadcastEvent: any = null;
  const room = new GameRoom(
    'BW-TEST1',
    'HostManager',
    { timerDuration: 2, startingPurse: 1200000000 },
    (state, event) => {
      if (event) lastBroadcastEvent = event;
    }
  );

  const hostId = room.hostId;
  room.selectTeam(hostId, 'CSK');
  room.toggleReady(hostId, true);
  room.startAuction(hostId);

  const initialPurse = room.getState().teamPurse['CSK'];
  const firstLot = room.currentLot!;
  const firstPlayer = firstLot.player;
  const bidAmount = firstPlayer.base_price_inr;

  // Place winning bid
  const bidRes = room.placeBid(hostId, bidAmount);
  assert(bidRes.success, 'Host placed valid opening bid on first lot');

  // Manually trigger lot finalization
  (room as any).finalizeCurrentLot();

  const stateAfterSale = room.getState();
  const cskSquad = stateAfterSale.teamSquads['CSK'];
  const cskPurse = stateAfterSale.teamPurse['CSK'];

  assert(cskSquad.length === 1, 'Winning team squad count increased to 1', `Count: ${cskSquad.length}`);
  assert(cskSquad[0].id === firstPlayer.id, 'Purchased player exists in team squad', `Player: ${cskSquad[0]?.name}`);
  assert(cskPurse === initialPurse - bidAmount, 'Purse deducted by exact winning price', 
    `Purse: ₹${cskPurse} (Expected ₹${initialPurse - bidAmount})`);
  assert(lastBroadcastEvent?.type === 'LOT_FINALIZED', 'LOT_FINALIZED event broadcasted');
  assert(lastBroadcastEvent?.teamSquads['CSK']?.length === 1, 'LOT_FINALIZED contains synchronized squad');

  // TEST SUITE 3: Strict 8 Overseas Limit Enforcement
  console.log('\n--- TEST GROUP 3: Overseas Player Limit (Strict Max 8) ---');
  // Fill CSK with 8 overseas players
  const dummyOverseas = overseasPlayers.slice(0, 8);
  (room as any).teamSquads['CSK'] = dummyOverseas.map(p => ({ ...p, is_overseas: true }));

  assert(room.getState().teamSquads['CSK'].length === 8, 'CSK now has 8 overseas players');

  // Now create a lot with an overseas player and attempt to bid
  const nextOverseasPlayer = overseasPlayers[8];
  (room as any).lots[(room as any).currentLotIndex] = {
    lotNumber: 99,
    totalLots: 100,
    player: { ...nextOverseasPlayer, is_overseas: true, base_price_inr: 20000000 },
    status: 'IN_PROGRESS',
    currentBid: 0,
    currentBidder: null,
    currentBidderName: null,
    bids: []
  };

  const overseasBidRes = room.placeBid(hostId, 20000000);
  assert(!overseasBidRes.success, 'Overseas bid rejected when team already has 8 overseas players');
  assert(overseasBidRes.message?.includes('Overseas limit reached'), 'Rejection error message mentions 8 overseas limit',
    `Message: ${overseasBidRes.message}`);

  // But bidding on an Indian player must succeed!
  const indianPlayer = indianPlayers[0];
  (room as any).lots[(room as any).currentLotIndex] = {
    lotNumber: 100,
    totalLots: 100,
    player: { ...indianPlayer, is_overseas: false, base_price_inr: 20000000 },
    status: 'IN_PROGRESS',
    currentBid: 0,
    currentBidder: null,
    currentBidderName: null,
    bids: []
  };

  const indianBidRes = room.placeBid(hostId, 20000000);
  assert(indianBidRes.success, 'Indian player bid succeeds even when team has 8 overseas players');

  // TEST SUITE 4: Private Room Password Protection
  console.log('\n--- TEST GROUP 4: Private Room Password Protection ---');
  const privateRoom = new GameRoom(
    'BW-PASS',
    'SecuredHost',
    { isPrivate: true, password: 'IPLSecret2026!' },
    () => {}
  );

  assert(privateRoom.isPrivate, 'Room created with isPrivate = true');
  assert(!privateRoom.verifyPassword('WrongPass'), 'Wrong password rejected');
  assert(privateRoom.verifyPassword('IPLSecret2026!'), 'Correct password verified successfully');

  // TEST SUITE 5: Section 16 Random Player Selection
  console.log('\n--- TEST GROUP 5: Section 16 Random Player Selection ---');
  const randomRoom = new GameRoom(
    'BW-RANDOM',
    'HostDraw',
    { poolMode: 'mega_all' },
    () => {}
  );
  const randHostId = randomRoom.hostId;
  randomRoom.selectTeam(randHostId, 'MI');
  randomRoom.toggleReady(randHostId, true);
  const startRes = randomRoom.startAuction(randHostId);
  assert(startRes.success, 'Auction started successfully for random draw testing');

  const drawRes = randomRoom.drawRandomPlayer(randHostId, 'Batsmen', 20000000);
  assert(drawRes.success, 'drawRandomPlayer succeeded for Batsmen at ₹2.00 Cr', drawRes.message);
  assert(drawRes.lot?.player.category === 'Batsmen' || drawRes.lot?.player.primary_role === 'BATTER', 'Drawn player is a Batsman (or Wicketkeeper-Batsman)', `Category: ${drawRes.lot?.player.category}, Role: ${drawRes.lot?.player.primary_role}`);
  assert(drawRes.lot?.player.base_price_inr === 20000000, 'Drawn player has ₹2.00 Cr base price');
  assert(randomRoom.currentLot?.player.id === drawRes.lot?.player.id, 'Room currentLot set to drawn player');

  // TEST SUITE 6: Compulsory Live Chat System
  console.log('\n--- TEST GROUP 6: Compulsory Live Chat Feature ---');
  let lastChatBroadcast: any = null;
  const chatRoom = new GameRoom(
    'BW-CHAT',
    'ChatUser1',
    {},
    (state, event) => {
      if (event?.type === 'CHAT_MESSAGE') lastChatBroadcast = event;
    }
  );
  const user1 = chatRoom.hostId;
  chatRoom.selectTeam(user1, 'RCB');

  // Test empty message rejection
  const emptyRes = chatRoom.sendChatMessage(user1, '   ');
  assert(!emptyRes.success, 'Empty/whitespace chat message rejected');

  // Test valid message sending & broadcast
  const sendRes = chatRoom.sendChatMessage(user1, 'Hello fellow IPL managers! Good luck with the bidding.');
  assert(sendRes.success, 'Chat message sent successfully');
  assert(sendRes.chat?.senderName === 'ChatUser1', 'Sender name correctly associated');
  assert(sendRes.chat?.teamId === 'RCB', 'Sender franchise team correctly attached');
  assert(chatRoom.getState().chatMessages.length === 1, 'Chat message persisted in room state');
  assert(lastChatBroadcast?.type === 'CHAT_MESSAGE', 'CHAT_MESSAGE event broadcasted in real time');
  assert(lastChatBroadcast?.message?.text.includes('Good luck with the bidding'), 'Broadcasted text matches sent message');

  // --- TEST GROUP 7: Fixed Category Order & Within-Category Randomization ---
  console.log('\n--- TEST GROUP 7: Fixed Category Order & Within-Category Randomization ---');
  const session1Lots = buildAuctionLots('2026', 'auction_pool');
  const session2Lots = buildAuctionLots('2026', 'auction_pool');

  assert(session1Lots.length === 359, 'Auction pool contains exactly 359 eligible players');

  // 1. First category is ₹2 Crore Batsmen
  const initialLot = session1Lots[0];
  assert(initialLot.player.base_price_inr === 20000000, 'First lot is from the ₹2.00 Crore bracket');
  assert(initialLot.player.primary_role === 'BATTER', 'First lot is a Batsman (primary_role BATTER)');
  assert(initialLot.player.set_name.includes('₹2.00 Cr Batsmen'), 'First lot set_name is ₹2.00 Cr Batsmen');

  // Count ₹2 Cr Batsmen
  const twoCrBattersCount = session1Lots.filter(l => l.player.base_price_inr === 20000000 && l.player.primary_role === 'BATTER').length;
  assert(twoCrBattersCount === 11, 'All 11 ₹2.00 Cr Batsmen are present');

  // Verify all first 11 lots are ₹2 Cr Batsmen
  for (let i = 0; i < twoCrBattersCount; i++) {
    assert(session1Lots[i].player.base_price_inr === 20000000, `Lot #${i+1} is ₹2.00 Cr`);
    assert(session1Lots[i].player.primary_role === 'BATTER', `Lot #${i+1} is a Batsman`);
  }

  // 2. Next category is ₹2 Crore All-Rounders
  const twoCrAllRoundersCount = session1Lots.filter(l => l.player.base_price_inr === 20000000 && l.player.primary_role === 'ALL_ROUNDER').length;
  assert(twoCrAllRoundersCount === 13, 'All 13 ₹2.00 Cr All-Rounders are present');
  for (let i = 0; i < twoCrAllRoundersCount; i++) {
    const lot = session1Lots[twoCrBattersCount + i];
    assert(lot.player.base_price_inr === 20000000, `Lot #${twoCrBattersCount + i + 1} is ₹2.00 Cr`);
    assert(lot.player.primary_role === 'ALL_ROUNDER', `Lot #${twoCrBattersCount + i + 1} is an All-Rounder`);
  }

  // 3. Next category is ₹2 Crore Bowlers
  const twoCrBowlersCount = session1Lots.filter(l => l.player.base_price_inr === 20000000 && l.player.primary_role === 'BOWLER').length;
  assert(twoCrBowlersCount === 16, 'All 16 ₹2.00 Cr Bowlers are present');
  const twoCrTotal = twoCrBattersCount + twoCrAllRoundersCount;
  for (let i = 0; i < twoCrBowlersCount; i++) {
    const lot = session1Lots[twoCrTotal + i];
    assert(lot.player.base_price_inr === 20000000, `Lot #${twoCrTotal + i + 1} is ₹2.00 Cr`);
    assert(lot.player.primary_role === 'BOWLER', `Lot #${twoCrTotal + i + 1} is a Bowler`);
  }

  // 4. Verify descending price brackets & category progression
  // Check ₹1.00 Cr categories exist in order: Batsmen -> All-Rounders -> Bowlers
  const oneCrLots = session1Lots.filter(l => l.player.base_price_inr === 10000000);
  assert(oneCrLots.length === 17, '₹1.00 Cr bracket has 17 players');
  const oneCrBatters = oneCrLots.filter(l => l.player.primary_role === 'BATTER');
  const oneCrAR = oneCrLots.filter(l => l.player.primary_role === 'ALL_ROUNDER');
  const oneCrBowlers = oneCrLots.filter(l => l.player.primary_role === 'BOWLER');
  assert(oneCrBatters.length === 4, '₹1.00 Cr Batsmen count is 4');
  assert(oneCrAR.length === 8, '₹1.00 Cr All-Rounders count is 8');
  assert(oneCrBowlers.length === 5, '₹1.00 Cr Bowlers count is 5');

  // 5. Randomization within category: different sessions must produce different orders
  const session1BatterNames = session1Lots.slice(0, twoCrBattersCount).map(l => l.player.name);
  const session2BatterNames = session2Lots.slice(0, twoCrBattersCount).map(l => l.player.name);
  const isOrderDifferent = JSON.stringify(session1BatterNames) !== JSON.stringify(session2BatterNames);
  assert(isOrderDifferent, 'Different auction sessions produce different randomized player orders within ₹2 Cr Batsmen');

  // 6. Zero duplicates across entire auction
  const uniquePlayerIds = new Set(session1Lots.map(l => l.player.id));
  assert(uniquePlayerIds.size === session1Lots.length, 'No duplicate players anywhere in the generated lots');

  // --- TEST GROUP 8: All 10 Uploaded Team Logos ---
  console.log('\n--- TEST GROUP 8: All 10 Uploaded IPL Team Logos ---');
  const fsModule = await import('fs');
  const pathModule = await import('path');
  const allTeamKeys: IPLTeamId[] = ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'PBKS', 'DC', 'GT', 'LSG'];

  for (const teamKey of allTeamKeys) {
    const franchise = IPL_FRANCHISES[teamKey];
    assert(Boolean(franchise.logoUrl), `${teamKey} has configured logoUrl: ${franchise.logoUrl}`);
    const filePath = pathModule.resolve('./client/public', franchise.logoUrl.replace('/', ''));
    const exists = fsModule.existsSync(filePath);
    assert(exists, `${teamKey} logo file exists on disk: ${filePath}`);
    const size = exists ? fsModule.statSync(filePath).size : 0;
    assert(size > 5000, `${teamKey} logo file is non-empty (${size} bytes)`);
  }

  // --- TEST GROUP 9: Extracted Player Photos from PDF Document ---
  console.log('\n--- TEST GROUP 9: Extracted Player Photos & Fallback Silhouettes ---');
  const playersDir = pathModule.resolve('./client/public/players');
  const playersDirExists = fsModule.existsSync(playersDir);
  assert(playersDirExists, 'client/public/players directory exists');

  const photoFiles = fsModule.readdirSync(playersDir).filter(f => f.endsWith('.png'));
  assert(photoFiles.length === 173, `Exactly 173 player photos extracted from PDF (found ${photoFiles.length})`);

  // Verify verified top players have photos
  const samplePhotoPlayers = [
    { id: 'ipl2026_001', name: 'Abdul Samad' },
    { id: 'ipl2026_002', name: 'Aiden Markram' },
    { id: 'ipl2026_008', name: 'Cameron Green' },
    { id: 'ipl2026_009', name: 'David Miller' },
    { id: 'ipl2026_134', name: 'Jasprit Bumrah' }
  ];

  for (const sp of samplePhotoPlayers) {
    const photoPath = pathModule.join(playersDir, `${sp.id}.png`);
    const fileExists = fsModule.existsSync(photoPath);
    assert(fileExists, `Photo file exists for ${sp.name} (${sp.id}.png)`);
    if (fileExists) {
      const fileSize = fsModule.statSync(photoPath).size;
      assert(fileSize > 2000, `Photo file for ${sp.name} is a valid PNG image (${fileSize} bytes)`);
    }
  }

  // Verify players database reflects photo paths and fallback silhouettes
  const playersDb: Player[] = JSON.parse(fsModule.readFileSync('./server/src/data/players2026.json', 'utf-8'));
  const pWithPhotos = playersDb.filter(p => Boolean(p.image_url));
  const pWithoutPhotos = playersDb.filter(p => !p.image_url);

  assert(pWithPhotos.length === 173, `173 players in database have image_url set (got ${pWithPhotos.length})`);
  assert(pWithoutPhotos.length === 359, `359 players in database cleanly fall back to silhouette (got ${pWithoutPhotos.length})`);

  // Verify non-photo player has null image_url so fallback is triggered
  const p5 = playersDb.find(p => p.s_no === 5);
  assert(p5 && p5.image_url === null, 'Player without photo in PDF (S.No 5 Aniket Verma) has image_url = null');

  console.log('\n====================================================');
  console.log(`🎯 TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('====================================================');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
