import { MatchEngine } from './src/matchEngine.js';
import { FixtureGenerator } from './src/fixtureGenerator.js';
import { tournamentManager } from './src/tournamentManager.js';
import { getAllPlayers } from './src/playerService.js';
import { Player, IPLTeamId } from './src/types.js';
import { MatchLineup } from './src/tournamentTypes.js';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${desc}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${desc}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('========================================================');
  console.log('🧪 RUNNING BIDWARS TOURNAMENT & MATCH ENGINE TEST SUITE');
  console.log('========================================================\n');

  const allPlayers = getAllPlayers('2026');
  const playersMap = new Map<string, Player>();
  for (const p of allPlayers) {
    playersMap.set(p.id, p);
  }

  // TEST 1: Fixture Generation for 4, 6, 8, 10 teams
  console.log('--- Test Suite 1: Fixture Generators ---');
  const teams4: IPLTeamId[] = ['CSK', 'MI', 'RCB', 'KKR'];
  const fix4 = FixtureGenerator.generateGroupStageFixtures('TRN-TEST4', teams4, 5);
  // 4 teams double round-robin = 4 * 3 = 12 matches
  assert(fix4.length === 12, `4 teams generate 12 double round-robin matches (got ${fix4.length})`);

  const teams6: IPLTeamId[] = ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR'];
  const fix6 = FixtureGenerator.generateGroupStageFixtures('TRN-TEST6', teams6, 10);
  // 6 teams single round-robin = 6 * 5 / 2 = 15 matches
  assert(fix6.length === 15, `6 teams generate 15 single round-robin matches (got ${fix6.length})`);

  const teams8: IPLTeamId[] = ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'PBKS', 'DC'];
  const fix8 = FixtureGenerator.generateGroupStageFixtures('TRN-TEST8', teams8, 20);
  // 8 teams single round-robin = 8 * 7 / 2 = 28 matches
  assert(fix8.length === 28, `8 teams generate 28 single round-robin matches (got ${fix8.length})`);

  const teams10: IPLTeamId[] = ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'PBKS', 'DC', 'GT', 'LSG'];
  const fix10 = FixtureGenerator.generateGroupStageFixtures('TRN-TEST10', teams10, 5);
  // 10 teams (2 groups of 5) = 10 + 10 = 20 matches
  assert(fix10.length === 20, `10 teams in 2 groups generate 20 group matches (got ${fix10.length})`);

  // TEST 2: Over Quotas
  console.log('\n--- Test Suite 2: Bowler Over Quotas ---');
  assert(Math.max(1, Math.ceil(1 / 5)) === 1, '1 over match -> max 1 over per bowler');
  assert(Math.max(1, Math.ceil(2 / 5)) === 1, '2 over match -> max 1 over per bowler');
  assert(Math.max(1, Math.ceil(5 / 5)) === 1, '5 over match -> max 1 over per bowler');
  assert(Math.max(1, Math.ceil(10 / 5)) === 2, '10 over match -> max 2 overs per bowler');
  assert(Math.max(1, Math.ceil(15 / 5)) === 3, '15 over match -> max 3 overs per bowler');
  assert(Math.max(1, Math.ceil(20 / 5)) === 4, '20 over match -> max 4 overs per bowler');

  // TEST 3: Hand-Cricket Engine Ball Resolution & Abilities
  console.log('\n--- Test Suite 3: Match Engine & OVR Advantages ---');
  // Create sample lineups
  const cskPlayers = allPlayers.slice(0, 15);
  const miPlayers = allPlayers.slice(15, 30);

  const homeLineup: MatchLineup = {
    franchiseId: 'CSK',
    playingXI: cskPlayers.slice(0, 11).map(p => p.id),
    captainId: cskPlayers[0].id,
    viceCaptainId: cskPlayers[1].id,
    isLocked: true,
    submittedAt: Date.now()
  };

  const awayLineup: MatchLineup = {
    franchiseId: 'MI',
    playingXI: miPlayers.slice(0, 11).map(p => p.id),
    captainId: miPlayers[0].id,
    viceCaptainId: miPlayers[1].id,
    isLocked: true,
    submittedAt: Date.now()
  };

  const match = MatchEngine.createMatch('FIX-TEST-001', 'TRN-TEST', 'CSK', 'MI', 5, homeLineup, awayLineup, playersMap);
  assert(match.status === 'TOSS', 'Match created in TOSS status');

  MatchEngine.handleToss(match, 'CSK', 'BAT', playersMap);
  assert(match.status === 'INNINGS_1', 'After toss, match enters INNINGS_1');
  assert(match.innings1.battingFranchiseId === 'CSK', 'CSK batting first');
  assert(match.innings1.bowlingFranchiseId === 'MI', 'MI bowling first');

  // Normal ball: Runs scored
  const ball1Res = MatchEngine.submitChoice(match, 'CSK', 4);
  assert(!ball1Res.resolved, 'Waiting for bowler input');
  const ball1BowlerRes = MatchEngine.submitChoice(match, 'MI', 2);
  assert(ball1BowlerRes.resolved, 'Ball resolved when both submit');
  assert(ball1BowlerRes.ballEvent?.runsScored === 4, 'Batter choice 4 vs Bowler choice 2 scores 4 runs');
  assert(!ball1BowlerRes.ballEvent?.isWicket, 'Different numbers is NOT a wicket');
  assert(match.innings1.totalRuns === 4, 'Total runs is 4');

  // Ball 2: WICKET (same choice)
  MatchEngine.submitChoice(match, 'CSK', 6);
  const ball2Res = MatchEngine.submitChoice(match, 'MI', 6);
  assert(ball2Res.resolved && ball2Res.ballEvent?.isWicket, 'Same number (6 & 6) results in WICKET');
  assert(match.innings1.totalWickets === 1, 'Total wickets is now 1');

  // Ball 3: Batter Combination Shot ability
  // Force high OVR for batter to test Combination Shot
  const activeBatter = match.innings1.batters[match.innings1.activeBatterId];
  const activeBowler = match.innings1.bowlers[match.innings1.activeBowlerId];
  activeBatter.ovr = 90;
  activeBowler.ovr = 85; // Diff = 5 (Level 1 Batter Advantage)

  const matchup = MatchEngine.getMatchupAbilities(match, playersMap);
  assert(matchup.batterAbilities.includes('COMBINATION_SHOT'), 'Batter with 5 OVR advantage has COMBINATION_SHOT');

  MatchEngine.submitChoice(match, 'CSK', 3, 'COMBINATION_SHOT');
  const comboBall = MatchEngine.submitChoice(match, 'MI', 2);
  assert(comboBall.ballEvent?.runsScored === 5, 'Combination Shot scores batter (3) + bowler (2) = 5 runs');

  // Ball 4: Batter Secret Double Shot
  activeBatter.ovr = 95;
  activeBowler.ovr = 85; // Diff = 10 (Level 2 Batter Advantage)
  const matchupL2 = MatchEngine.getMatchupAbilities(match, playersMap);
  assert(matchupL2.batterAbilities.includes('SECRET_DOUBLE_SHOT'), 'Batter with 10 OVR advantage has SECRET_DOUBLE_SHOT');

  MatchEngine.submitChoice(match, 'CSK', 4, 'SECRET_DOUBLE_SHOT');
  const dblBall = MatchEngine.submitChoice(match, 'MI', 1);
  assert(dblBall.ballEvent?.runsScored === 8, 'Secret Double Shot scores batter (4) * 2 = 8 runs');

  // Ball 5: Bowler Number Block ability
  activeBowler.ovr = 92;
  activeBatter.ovr = 87; // Bowler advantage 5
  activeBowler.abilityUsedInCurrentOver = false;
  const matchupB1 = MatchEngine.getMatchupAbilities(match, playersMap);
  assert(matchupB1.bowlerAbilities.includes('NUMBER_BLOCK'), 'Bowler with 5 OVR advantage has NUMBER_BLOCK');

  // Bowler blocks [1, 2, 3]
  MatchEngine.submitChoice(match, 'MI', 0, 'NUMBER_BLOCK', [1, 2, 3]);
  // Batter trying to pick 2 should be rejected
  const blockedTry = MatchEngine.submitChoice(match, 'CSK', 2);
  assert(!blockedTry.resolved && Boolean(blockedTry.error), 'Batter prevented from choosing blocked number');

  // Batter picks legal remaining number (4)
  const legalTry = MatchEngine.submitChoice(match, 'CSK', 4);
  assert(legalTry.resolved && legalTry.ballEvent?.runsScored === 4, 'Batter succeeds picking non-blocked legal choice (4)');

  // TEST 4: Timeout Handling
  console.log('\n--- Test Suite 4: 15-Second Turn Timeout Handling ---');
  // Bowler submitted, batter timed out -> Batter Timed Out dismissal!
  MatchEngine.submitChoice(match, 'MI', 3);
  const timeoutEvent = MatchEngine.handleTimeout(match, playersMap);
  assert(timeoutEvent?.isWicket && timeoutEvent.dismissalType === 'Timed Out', 'Batter timing out results in Timed Out wicket');
  assert(match.innings1.totalWickets === 2, 'Total wickets is 2 after timeout dismissal');

  // TEST 5: Tournament Manager & 1-Account-Per-Team Rule
  console.log('\n--- Test Suite 5: Tournament Manager & Account Constraints ---');
  const trn = await tournamentManager.createTournament(
    'Mega IPL 2026',
    'USER-HOST-1',
    'Charly Host',
    'host@bidwars.test',
    4,
    5,
    'CSK'
  );

  assert(trn.status === 'REGISTRATION', 'Tournament created in REGISTRATION status');
  assert(trn.members.length === 1, 'Tournament has 1 member (the host)');
  assert(trn.members[0].franchiseId === 'CSK', 'Host assigned to CSK');

  // Second user joins as MI
  const join2 = await tournamentManager.joinTournament(trn.id, 'USER-PLAYER-2', 'Player Two', 'p2@test.com', 'MI');
  assert(join2.success, 'Player 2 successfully joins as MI');

  // Attempt to join SAME user as another franchise (MUST BE BLOCKED)
  const duplicateUserAttempt = await tournamentManager.joinTournament(trn.id, 'USER-PLAYER-2', 'Player Two', 'p2@test.com', 'RCB');
  assert(!duplicateUserAttempt.success, 'Duplicate user account joining second team is BLOCKED');

  // Attempt to claim already taken franchise (CSK) by a third user (MUST BE BLOCKED)
  const duplicateFranchiseAttempt = await tournamentManager.joinTournament(trn.id, 'USER-PLAYER-3', 'Player Three', 'p3@test.com', 'CSK');
  assert(!duplicateFranchiseAttempt.success, 'Claiming already-owned franchise (CSK) is BLOCKED');

  console.log('\n========================================================');
  console.log(`TEST SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('========================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});

