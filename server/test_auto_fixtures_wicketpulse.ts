import { tournamentManager } from './src/tournamentManager.js';
import { tournamentStorage } from './src/tournamentStorage.js';
import { roomManager } from './src/index.js';
import { FixtureGenerator } from './src/fixtureGenerator.js';
import { IPLTeamId } from './src/types.js';
import crypto from 'crypto';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${msg}`);
}

async function runAutoFixtureAndWicketPulseTests() {
  console.log('====================================================');
  console.log('BIDWARS: AUTOMATIC FIXTURES & WICKETPULSE TEST SUITE');
  console.log('====================================================');

  const runId = Date.now().toString(36).slice(-4);
  const hostId = `usr_host_${runId}`;
  const hostName = `Captain_${runId}`;

  // 1. FORMAT SUPPORT VERIFICATION: 4, 6, 8, 10 TEAMS
  console.log('\n--- 1. VERIFY ALL TOURNAMENT FORMATS (4, 6, 8, 10 TEAMS) ---');
  const formats: Array<{ count: number; teams: IPLTeamId[]; expectedMinMatches: number }> = [
    { count: 4, teams: ['CSK', 'MI', 'RCB', 'KKR'], expectedMinMatches: 12 }, // Double round robin: 4*3 = 12
    { count: 6, teams: ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR'], expectedMinMatches: 15 }, // Single round robin: 6*5/2 = 15
    { count: 8, teams: ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'PBKS', 'DC'], expectedMinMatches: 28 }, // 8*7/2 = 28
    { count: 10, teams: ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'PBKS', 'DC', 'GT', 'LSG'], expectedMinMatches: 20 } // 2 groups of 5: 10 + 10 = 20
  ];

  for (const fmt of formats) {
    const fList = FixtureGenerator.generateGroupStageFixtures(`TRN-FMT-${fmt.count}`, fmt.teams, 5);
    assert(fList.length >= fmt.expectedMinMatches, `${fmt.count}-team format generated ${fList.length} matches (expected >= ${fmt.expectedMinMatches})`);
    
    // Check every team is included
    for (const tId of fmt.teams) {
      const hasMatch = fList.some(f => f.homeFranchiseId === tId || f.awayFranchiseId === tId);
      assert(hasMatch, `${fmt.count}-team schedule includes franchise ${tId}`);
    }

    // Check no self-play fixtures
    const hasSelfPlay = fList.some(f => f.homeFranchiseId === f.awayFranchiseId);
    assert(!hasSelfPlay, `${fmt.count}-team schedule has no self-matches (Team vs Self)`);

    // Check unique match IDs
    const idSet = new Set(fList.map(f => f.id));
    assert(idSet.size === fList.length, `${fmt.count}-team schedule has strictly unique fixture IDs`);
  }

  // 2. CREATE A 4-TEAM TOURNAMENT WITH UNDERLYING AUCTION ROOM
  console.log('\n--- 2. CREATE TOURNAMENT & SIMULATE AUCTION ---');
  const tournament = await tournamentManager.createTournament(
    `WicketPulse Cup ${runId}`,
    hostId,
    hostName,
    `${hostName}@example.com`,
    4,
    5,
    'MI'
  );

  assert(tournament !== undefined, 'Tournament created successfully');
  assert(tournament.status === 'REGISTRATION', 'Tournament starts in REGISTRATION');
  assert(tournament.fixtures.length === 0, 'No fixtures before auction completes');

  // Join other 3 teams
  const user2 = `usr_p2_${runId}`;
  const user3 = `usr_p3_${runId}`;
  const user4 = `usr_p4_${runId}`;

  await tournamentManager.joinTournament(tournament.id, user2, 'PlayerTwo', undefined, 'CSK');
  await tournamentManager.joinTournament(tournament.id, user3, 'PlayerThree', undefined, 'RCB');
  await tournamentManager.joinTournament(tournament.id, user4, 'PlayerFour', undefined, 'KKR');

  assert(tournament.members.length === 4, 'All 4 teams joined tournament');

  // Host starts auction
  const startAuctionRes = await tournamentManager.startAuction(tournament.id, hostId);
  assert(startAuctionRes.success === true, 'Host successfully started auction');
  assert(tournament.status === 'AUCTION', 'Tournament status is AUCTION');

  // 3. COMPLETE AUCTION & VERIFY AUTOMATIC FIXTURE GENERATION
  console.log('\n--- 3. AUTHORITATIVE AUCTION COMPLETION & AUTOMATIC FIXTURES ---');
  const room = roomManager.getRoom(tournament.roomCode);
  assert(room !== undefined, `Auction room ${tournament.roomCode} exists`);

  // Finish auction via authoritative backend event
  const finishRes = room!.finishAuction(hostId);
  assert(finishRes.success === true, 'Authoritative finishAuction executed');
  assert(room!.getState().status === 'COMPLETED', 'Room state is COMPLETED');

  // Wait brief microtask for async auto-generation listener
  await new Promise(r => setTimeout(r, 200));

  // Verify tournament updated automatically to TOURNAMENT_LIVE
  const liveTournament = tournamentManager.getTournament(tournament.id, hostId);
  assert(liveTournament !== null, 'Live tournament retrieved');
  assert(liveTournament?.status === 'TOURNAMENT_LIVE', `Tournament automatically transitioned to TOURNAMENT_LIVE (got: ${liveTournament?.status})`);
  assert(liveTournament?.fixtures.length === 12, `Tournament has 12 auto-generated fixtures (got: ${liveTournament?.fixtures.length})`);

  // Verify points table initialized for all 4 teams
  assert(liveTournament?.pointsTable.length === 4, 'Points table initialized for all 4 franchises');

  // 4. IDEMPOTENCY & RECONNECT / REFRESH VERIFICATION
  console.log('\n--- 4. IDEMPOTENT GENERATION ON RECONNECT & REFRESH ---');
  const fixturesBefore = liveTournament!.fixtures.length;

  // Trigger onAuctionCompleted a second time
  await tournamentManager.onAuctionCompleted(tournament.roomCode);
  const fixturesAfterSecondTrigger = liveTournament!.fixtures.length;
  assert(fixturesBefore === fixturesAfterSecondTrigger, 'Repeated auction completion does NOT duplicate fixtures');

  // Query tournament as User 2 (reconnect)
  const user2Tournament = tournamentManager.getTournament(tournament.id, user2);
  assert(user2Tournament?.fixtures.length === 12, 'Reconnecting user sees identical fixture schedule without duplicates');

  // 5. FUNCTIONAL PLAY OPTION & SQUAD LOAD
  console.log('\n--- 5. FUNCTIONAL PLAY OPTION & MATCH LAUNCH ---');
  const firstFixture = liveTournament!.fixtures[0];
  assert(firstFixture.status === 'SCHEDULED', `First fixture is SCHEDULED (Match #${firstFixture.matchNumber})`);

  // Start match
  const startMatchRes = tournamentManager.startMatch(tournament.id, firstFixture.id, hostId);
  assert(startMatchRes.success === true, 'PLAY button successfully launches match');
  assert(startMatchRes.match !== undefined, 'LiveMatch instance created');
  assert(firstFixture.status === 'IN_PROGRESS', 'Fixture status updated to IN_PROGRESS');
  assert(firstFixture.matchId === startMatchRes.match?.id, 'Fixture linked to Match ID');

  const match = startMatchRes.match!;
  assert(match.homeFranchiseId === firstFixture.homeFranchiseId, 'Match loaded correct Home franchise');
  assert(match.awayFranchiseId === firstFixture.awayFranchiseId, 'Match loaded correct Away franchise');
  assert(match.lineups[firstFixture.homeFranchiseId].playingXI.length === 11, 'Home team Playing XI has 11 players');
  assert(match.lineups[firstFixture.awayFranchiseId].playingXI.length === 11, 'Away team Playing XI has 11 players');

  // 6. PREVENT STARTING ALREADY COMPLETED MATCH
  console.log('\n--- 6. MATCH LIFECYCLE, RESULT SAVING & POINTS TABLE ---');
  // Reconnecting returns existing live match
  const reconnectMatch = tournamentManager.startMatch(tournament.id, firstFixture.id, hostId);
  assert(reconnectMatch.success === true && reconnectMatch.match?.id === match.id, 'Reconnecting to ongoing match returns active session');

  // Execute Toss: Home team bats
  const tossRes = tournamentManager.handleToss(match.id, match.homeFranchiseId, 'BAT');
  assert(tossRes.match !== undefined, 'Toss submitted successfully');
  assert(tossRes.match?.status === 'INNINGS_1', 'Match transitioned to INNINGS_1');

  // Simulate WicketPulse gameplay resolution to completion
  const battingFid = tossRes.match!.innings1.battingFranchiseId;
  const bowlingFid = tossRes.match!.innings1.bowlingFranchiseId;

  // Simulate quick deliveries: 10 wickets to end innings 1
  for (let b = 0; b < 10; b++) {
    tournamentManager.submitChoice(match.id, battingFid, 1);
    tournamentManager.submitChoice(match.id, bowlingFid, 1); // Same number = OUT
  }

  // Innings 2: 1 wicket to end match
  assert(match.status === 'INNINGS_2' || match.status === 'COMPLETED', `Match transitioned after innings 1 (status: ${match.status})`);
  if (match.status === 'INNINGS_2') {
    const inn2Batting = match.innings2!.battingFranchiseId;
    const inn2Bowling = match.innings2!.bowlingFranchiseId;
    for (let b = 0; b < 10; b++) {
      tournamentManager.submitChoice(match.id, inn2Batting, 2);
      tournamentManager.submitChoice(match.id, inn2Bowling, 2); // Out
    }
  }

  assert(match.status === 'COMPLETED', `Match successfully completed (status: ${match.status})`);
  assert(firstFixture.status === 'COMPLETED', `Fixture status automatically updated to COMPLETED`);
  assert(firstFixture.matchResultSummary !== undefined, `Fixture result summary saved: ${firstFixture.matchResultSummary}`);

  // Check Points Table updated
  const winnerRow = liveTournament!.pointsTable.find(p => p.franchiseId === firstFixture.winnerFranchiseId);
  assert(winnerRow !== undefined && winnerRow.won > 0 && winnerRow.points >= 2, `Points table updated: ${firstFixture.winnerFranchiseId} has ${winnerRow?.points} pts`);

  // Prevent re-starting completed match
  const restartCompleted = tournamentManager.startMatch(tournament.id, firstFixture.id, hostId);
  assert(!restartCompleted.success, 'Completed match CANNOT be restarted');
  assert(restartCompleted.message?.includes('already completed') === true, 'Correct error message on attempting to restart completed match');

  console.log('\n====================================================');
  console.log('ALL AUTO-FIXTURES & WICKETPULSE TESTS PASSED (100%)');
  console.log('====================================================\n');
  process.exit(0);
}

runAutoFixtureAndWicketPulseTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
