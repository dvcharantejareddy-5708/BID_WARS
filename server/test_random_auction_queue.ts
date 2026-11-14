import { buildAuctionLots } from './src/playerService';
import { GameRoom } from './src/gameEngine';

function runRandomAuctionQueueTests() {
  console.log('====================================================');
  console.log('RUNNING BIDWARS MANDATORY RANDOM AUCTION QUEUE TESTS');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      if (detail) console.error(`   Detail: ${detail}`);
      failed++;
    }
  }

  // TEST 1: Build auction lots generates exactly 259 auction-eligible players for default auction pool
  const lots1 = buildAuctionLots('2026', 'auction_pool');
  assert(lots1.length === 259, 'Lot count is exactly 259 for 2026 auction_pool', `Got ${lots1.length}`);

  // TEST 2: Check for no duplicate players in the generated queue
  const playerIds = lots1.map(l => l.player.id);
  const uniquePlayerIds = new Set(playerIds);
  assert(uniquePlayerIds.size === lots1.length, 'No duplicate players in generated lots', `Unique: ${uniquePlayerIds.size}, Total: ${lots1.length}`);

  // TEST 3: Strict descending base price order across groups
  // Groups should be 200L -> 150L -> 125L -> 100L -> 75L -> 50L -> 40L -> 30L
  const expectedPrices = [20000000, 15000000, 12500000, 10000000, 7500000, 5000000, 4000000, 3000000];
  let priceOrderValid = true;
  let lastPriceIndex = -1;
  let priceViolationDetail = '';

  for (let i = 0; i < lots1.length; i++) {
    const lotPrice = lots1[i].player.base_price_inr;
    const currentPriceIndex = expectedPrices.indexOf(lotPrice);
    if (currentPriceIndex === -1) {
      priceOrderValid = false;
      priceViolationDetail = `Player ${lots1[i].player.name} has unexpected base price: ${lotPrice}`;
      break;
    }
    if (currentPriceIndex < lastPriceIndex) {
      priceOrderValid = false;
      priceViolationDetail = `Price increased at index ${i}: ${lotPrice} after previous tier`;
      break;
    }
    lastPriceIndex = currentPriceIndex;
  }
  assert(priceOrderValid, 'Strict descending base-price order across all 259 lots', priceViolationDetail);

  // TEST 4: Category sequence within each base price tier (Batters -> All-Rounders -> Bowlers -> Wicket-Keepers)
  const categoryOrder = ['Batsmen', 'All-rounders', 'Bowlers', 'Wicket-keepers'];
  let categoryOrderValid = true;
  let catViolationDetail = '';

  let currentTierPrice = lots1[0].player.base_price_inr;
  let lastCatIndex = -1;

  for (let i = 0; i < lots1.length; i++) {
    const p = lots1[i].player;
    if (p.base_price_inr !== currentTierPrice) {
      // New price tier starts, reset category index tracker
      currentTierPrice = p.base_price_inr;
      lastCatIndex = -1;
    }
    const catIdx = categoryOrder.indexOf(p.category);
    if (catIdx === -1) {
      categoryOrderValid = false;
      catViolationDetail = `Unknown category for ${p.name}: ${p.category}`;
      break;
    }
    if (catIdx < lastCatIndex) {
      categoryOrderValid = false;
      catViolationDetail = `Category out of order in price tier ${currentTierPrice}: ${p.category} (idx ${catIdx}) appeared after (idx ${lastCatIndex}) at lot ${i}`;
      break;
    }
    lastCatIndex = catIdx;
  }
  assert(categoryOrderValid, 'Strict category sequence (Bat -> All -> Bowl -> WK) within each price tier', catViolationDetail);

  // TEST 5: Fisher-Yates Randomization: Multiple queues must have different orderings
  const lots2 = buildAuctionLots('2026', 'auction_pool');
  const lots3 = buildAuctionLots('2026', 'auction_pool');
  
  // They should have the same players, but different order within categories
  const ids1 = lots1.map(l => l.player.id).join(',');
  const ids2 = lots2.map(l => l.player.id).join(',');
  const ids3 = lots3.map(l => l.player.id).join(',');

  assert(ids1 !== ids2 && ids2 !== ids3 && ids1 !== ids3, 'Fisher-Yates shuffle produces distinct random orderings between rooms');

  // TEST 6: GameRoom constructor initializes randomized lots immediately on room creation
  const room = new GameRoom(
    'QUEUETEST',
    'HostUser',
    {
      season: '2026',
      startingPurse: 1200000000,
      minBidIncrement: 2000000,
      timerDuration: 15,
      poolMode: 'auction_pool',
      overseasLimit: 8,
      squadSizeLimit: 25,
      isPrivate: false
    },
    () => {}
  );

  const roomStateInit = room.getState();
  const hostId = roomStateInit.hostId;
  assert(roomStateInit.lots && roomStateInit.lots.length === 259, 'GameRoom initializes 259 lots immediately on room creation', `Got ${roomStateInit.lots?.length}`);

  // TEST 7: Queue persistence across startAuction()
  // When starting the auction, existing queue must NOT be re-shuffled
  room.selectTeam(hostId, 'CSK');
  const firstLotPlayerId = room.getState().lots[0].player.id;
  const startRes = room.startAuction(hostId);
  assert(startRes.success === true, 'startAuction succeeds after selecting team', startRes.message);
  const firstLotAfterStart = room.getState().lots[0].player.id;
  assert(firstLotPlayerId === firstLotAfterStart, 'startAuction() preserves previously generated queue without re-shuffling');

  // TEST 8: Draw Random Player Action
  // Draws unauctioned player from active group
  const drawRes = room.drawRandomPlayer(hostId);
  assert(drawRes.success === true, 'Host successfully executes drawRandomPlayer', drawRes.message);

  const drawnLot = room.getState().lots[room.getState().currentLotIndex];
  assert(drawnLot !== undefined, 'Active lot exists after drawRandomPlayer');
  assert(drawnLot.player.base_price_inr === 20000000, 'Drawn player is from active price tier (₹2.00 Cr)', `Price: ${drawnLot.player.base_price_inr}`);

  // TEST 9: Draw Random Player cannot be executed by non-host
  const nonHostDraw = room.drawRandomPlayer('random-member-id');
  assert(nonHostDraw.success === false, 'Non-host cannot execute drawRandomPlayer');

  // TEST 10: Draw Random Player rejected when active bid exists on current lot
  const curIdx = room.getState().currentLotIndex;
  (room as any).lots[curIdx].status = 'IN_PROGRESS';
  (room as any).lots[curIdx].currentBid = 22000000;
  (room as any).lots[curIdx].currentBidder = 'some-bidder';
  const drawWithBid = room.drawRandomPlayer(hostId);
  assert(drawWithBid.success === false, 'drawRandomPlayer rejected when active bids exist on current lot', drawWithBid.message);
  (room as any).lots[curIdx].currentBid = 0;
  (room as any).lots[curIdx].currentBidder = null;

  // TEST 11: Draw Random Player never selects an already sold player
  const testSoldPlayerId = lots1[15].player.id;
  (room as any).teamSquads['CSK'].push({ id: testSoldPlayerId, name: lots1[15].player.name } as any);

  let noSoldDrawn = true;
  for (let d = 0; d < 5; d++) {
    room.drawRandomPlayer(hostId);
    const activePId = room.getState().lots[room.getState().currentLotIndex].player.id;
    if (activePId === testSoldPlayerId) {
      noSoldDrawn = false;
      break;
    }
  }
  assert(noSoldDrawn, 'drawRandomPlayer never draws a sold player');

  // TEST 12: Storage persistence check
  const serialized = room.toJSON();
  assert(serialized.lots.length === 259, 'Serialized room maintains full 259 lot queue');
  const reconstructed = GameRoom.fromJSON(serialized, () => {});
  const reconstructedState = reconstructed.getState();
  assert(reconstructedState.lots.length === 259, 'Reconstructed room has full 259 lot queue');

  const matchesOrder = reconstructedState.lots.every((l, idx) => l.player.id === room.getState().lots[idx].player.id);
  assert(matchesOrder, 'Reconstructed room queue order matches live room identically without any re-shuffling');

  console.log('====================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runRandomAuctionQueueTests();
