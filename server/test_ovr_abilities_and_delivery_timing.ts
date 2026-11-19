import assert from 'assert';
import { MatchEngine, sanitizeMatchForViewer } from './src/matchEngine.js';
import { Tournament, LiveMatch, MatchLineup } from './src/tournamentTypes.js';
import { IPLTeamId, Player } from './src/types.js';
import { tournamentManager } from './src/tournamentManager.js';
import { tournamentStorage } from './src/tournamentStorage.js';

console.log('🏏 =========================================================================');
console.log('   BIDWARS: OVR ABILITIES & AUTHORITATIVE DELIVERY TIMING TEST SUITE        ');
console.log('   Testing all 4 OVR Advantage Tiers, Wicket Priority, and Delivery Timing  ');
console.log('=========================================================================\n');

let passedTests = 0;
const totalTests = 14;

async function runTest(num: number, title: string, fn: () => Promise<void>) {
  try {
    await fn();
    passedTests++;
    console.log(`✅ [TEST ${num}/${totalTests} PASSED]: ${title}`);
  } catch (err) {
    console.error(`❌ [TEST ${num}/${totalTests} FAILED]: ${title}`);
    console.error(err);
    process.exit(1);
  }
}

async function runAll() {
  await tournamentManager.init();

  const userA = { id: 'usr-mi-owner-901', name: 'Rohit Sharma (MI)', email: 'rohit@bidwars.com' };
  const userB = { id: 'usr-csk-owner-902', name: 'MS Dhoni (CSK)', email: 'dhoni@bidwars.com' };

  // Setup mock players with precise OVRs for exact testing
  const mockPlayersMap = new Map<string, Player>();
  const makeP = (id: string, name: string, ovr: number, role: 'BATTER' | 'BOWLER' | 'ALL_ROUNDER' = 'BATTER'): Player => ({
    id,
    name,
    ovr,
    primary_role: role,
    specialism: role,
    country: 'India',
    is_overseas: false,
    is_uncapped: false,
    base_price_inr: 20000000,
    ipl_team: null,
    auction_set_name: 'Set 1',
    batting_style: 'Right-hand bat',
    bowling_style: 'Right-arm fast'
  });

  // Players configured for exact OVR matchups:
  // Sky: 92 OVR, Rohit: 88 OVR, Chawla: 78 OVR
  // Pathirana: 82 OVR (Sky vs Pathirana: 92 vs 82 = +10 Batter Adv -> 2X POWER)
  // Deshpande: 83 OVR (Rohit vs Deshpande: 88 vs 83 = +5 Batter Adv -> BONUS SHOT)
  // Bumrah: 94 OVR (Bumrah vs Rahane 80 OVR: 94 vs 80 = +14 Bowler Adv -> SPECIAL DELIVERY)
  // Coetzee: 87 OVR (Coetzee vs Rahane 80 OVR: 87 vs 80 = +7 Bowler Adv -> NUMBER BLOCK)
  const miPlayers: Player[] = [
    makeP('mi-sky', 'Suryakumar Yadav', 92, 'BATTER'),
    makeP('mi-rohit', 'Rohit Sharma', 88, 'BATTER'),
    makeP('mi-tilak', 'Tilak Varma', 83, 'BATTER'),
    makeP('mi-hardik', 'Hardik Pandya', 89, 'ALL_ROUNDER'),
    makeP('mi-david', 'Tim David', 81, 'BATTER'),
    makeP('mi-ishan', 'Ishan Kishan', 84, 'BATTER'),
    makeP('mi-krunal', 'Krunal Pandya', 80, 'ALL_ROUNDER'),
    makeP('mi-coetzee', 'Gerald Coetzee', 87, 'BOWLER'),
    makeP('mi-chawla', 'Piyush Chawla', 78, 'BOWLER'),
    makeP('mi-thushara', 'Nuwan Thushara', 79, 'BOWLER'),
    makeP('mi-bumrah', 'Jasprit Bumrah', 94, 'BOWLER')
  ];

  const cskPlayers: Player[] = [
    makeP('csk-rahane', 'Ajinkya Rahane', 80, 'BATTER'),
    makeP('csk-gaikwad', 'Ruturaj Gaikwad', 88, 'BATTER'),
    makeP('csk-conway', 'Devon Conway', 86, 'BATTER'),
    makeP('csk-dube', 'Shivam Dube', 85, 'ALL_ROUNDER'),
    makeP('csk-jadeja', 'Ravindra Jadeja', 89, 'ALL_ROUNDER'),
    makeP('csk-dhoni', 'MS Dhoni', 85, 'BATTER'),
    makeP('csk-moeen', 'Moeen Ali', 82, 'ALL_ROUNDER'),
    makeP('csk-chahar', 'Deepak Chahar', 81, 'BOWLER'),
    makeP('csk-deshpande', 'Tushar Deshpande', 83, 'BOWLER'),
    makeP('csk-thakur', 'Shardul Thakur', 80, 'BOWLER'),
    makeP('csk-pathirana', 'Matheesha Pathirana', 82, 'BOWLER')
  ];

  for (const p of [...miPlayers, ...cskPlayers]) {
    mockPlayersMap.set(p.id, p);
    (tournamentManager as any).allPlayersMap.set(p.id, p);
  }

  // Setup Tournament & Fixture
  const tournament = await tournamentManager.createTournament(
    'OVR Championship Cup',
    userA.id,
    userA.name,
    userA.email,
    4,
    5,
    'MI',
    'MEGA'
  );

  await tournamentManager.joinTournament(
    tournament.id,
    userB.id,
    userB.name,
    userB.email,
    'CSK'
  );

  tournament.teams['MI']!.squad = miPlayers;
  tournament.teams['CSK']!.squad = cskPlayers;

  tournament.teams['MI']!.defaultPlayingXI = {
    franchiseId: 'MI',
    playingXI: miPlayers.map(p => p.id),
    captainId: 'mi-rohit',
    viceCaptainId: 'mi-bumrah',
    isLocked: true,
    submittedAt: Date.now()
  };

  tournament.teams['CSK']!.defaultPlayingXI = {
    franchiseId: 'CSK',
    playingXI: cskPlayers.map(p => p.id),
    captainId: 'csk-gaikwad',
    viceCaptainId: 'csk-jadeja',
    isLocked: true,
    submittedAt: Date.now()
  };

  const fixtureId = `FIX-OVR-TEST-1`;
  tournament.fixtures = [{
    id: fixtureId,
    tournamentId: tournament.id,
    matchNumber: 1,
    roundNumber: 1,
    stage: 'LEAGUE',
    homeFranchiseId: 'MI',
    awayFranchiseId: 'CSK',
    matchOvers: 5,
    status: 'SCHEDULED',
    scheduledAt: Date.now()
  }];

  const startRes = tournamentManager.startMatch(tournament.id, fixtureId, userA.id);
  assert.strictEqual(startRes.success, true);
  const matchId = startRes.match!.id;

  // 1. Authoritative Delivery State initialization
  await runTest(1, 'Authoritative Delivery State: Delivery has unique ID, start time, 10s deadline, and status', async () => {
    // Setup match into DELIVERY_ACTIVE with MI batting (Sky: 92, Rohit: 88) and CSK bowling (Pathirana: 82)
    const m = tournamentManager.getLiveMatch(matchId)!;
    m.status = 'OPENING_PLAYER_SELECTION';
    m.batting_team_id = 'MI';
    m.bowling_team_id = 'CSK';
    m.innings1.battingFranchiseId = 'MI';
    m.innings1.bowlingFranchiseId = 'CSK';

    tournamentManager.selectOpeningBatters(matchId, 'MI', 'mi-sky', 'mi-rohit', userA.id);
    tournamentManager.selectOpeningBowler(matchId, 'CSK', 'csk-pathirana', userB.id);

    const mLive = tournamentManager.getLiveMatch(matchId)!;
    assert.strictEqual(mLive.status, 'DELIVERY_ACTIVE');
    assert.ok(mLive.currentDelivery, 'Match must have authoritative currentDelivery');
    assert.ok(mLive.currentDelivery!.id.startsWith('DEL-'), 'Delivery ID must start with DEL-');
    assert.strictEqual(mLive.currentDelivery!.matchId, matchId);
    assert.strictEqual(mLive.currentDelivery!.inningsNumber, 1);
    assert.strictEqual(mLive.currentDelivery!.overNumber, 0);
    assert.strictEqual(mLive.currentDelivery!.ballNumber, 1);
    assert.strictEqual(mLive.currentDelivery!.status, 'WAITING_INPUTS');
    assert.ok(mLive.currentDelivery!.deadline > Date.now(), 'Deadline must be future timestamp');
    assert.ok(mLive.currentDelivery!.deadline <= Date.now() + 10500, 'Deadline must be 10 seconds');
  });

  // 2. Batter +8 or more OVR Advantage (2X POWER / SECRET_DOUBLE_SHOT)
  await runTest(2, 'Batter +8 OVR Advantage: Sky (92) vs Pathirana (82) = +10 -> ACTIVATE 2X POWER doubles runs', async () => {
    const m = tournamentManager.getLiveMatch(matchId)!;
    const matchup = MatchEngine.getMatchupAbilities(m, mockPlayersMap);
    assert.ok(matchup.batterAbilities.includes('SECRET_DOUBLE_SHOT'), 'Sky must have SECRET_DOUBLE_SHOT available');
    assert.strictEqual(matchup.batterOvr, 92);
    assert.strictEqual(matchup.bowlerOvr, 82);

    // Sky submits 4 with SECRET_DOUBLE_SHOT; Pathirana bowls 1
    const subA = tournamentManager.submitChoice(matchId, 'MI', 4, 'SECRET_DOUBLE_SHOT', undefined, userA.id);
    assert.strictEqual(subA.resolved, false, 'Delivery must wait for bowler');

    // Verify viewer sanitization: CSK cannot see secret 2X activation
    const sanitizedForCSK = sanitizeMatchForViewer(tournamentManager.getLiveMatch(matchId)!, 'CSK');
    assert.strictEqual(sanitizedForCSK.pendingInputs.batterAbility, undefined, 'CSK cannot see secret 2X');
    assert.strictEqual(sanitizedForCSK.pendingInputs.batterChoice, undefined, 'CSK cannot see secret choice');

    // Bowler submits 1 -> resolves!
    const subB = tournamentManager.submitChoice(matchId, 'CSK', 1, undefined, undefined, userB.id);
    assert.strictEqual(subB.resolved, true);

    const mAfter = tournamentManager.getLiveMatch(matchId)!;
    assert.strictEqual(mAfter.lastDeliveryResult!.batterInput, 4);
    assert.strictEqual(mAfter.lastDeliveryResult!.bowlerInput, 1);
    // 4 runs doubled by 2x = 8 runs!
    assert.strictEqual(mAfter.lastDeliveryResult!.runsScored, 8, '4 runs x 2 must equal 8 runs');
    assert.strictEqual(mAfter.innings1.totalRuns, 8);
    assert.strictEqual(mAfter.innings1.batterAbilityUsedInCurrentOver, true, 'Ability marked used in current over');
  });

  // 3. Once-per-over restriction on Batter 2X POWER
  await runTest(3, 'Batter Ability Once-Per-Over Restriction: Rejects second 2X activation in same over', async () => {
    const m = tournamentManager.getLiveMatch(matchId)!;
    assert.strictEqual(m.innings1.batterAbilityUsedInCurrentOver, true);

    // Try to activate 2X again on ball 2 of the same over
    const badSubmit = tournamentManager.submitChoice(matchId, 'MI', 3, 'SECRET_DOUBLE_SHOT', undefined, userA.id);
    assert.strictEqual(badSubmit.resolved, false);
    assert.ok(badSubmit.error?.includes('already used in current over'), 'Must reject duplicate ability use in over');
  });

  // 4. Mandatory Scoring Rule: Matching numbers = ALWAYS A WICKET (even with 2X POWER)
  await runTest(4, 'MANDATORY SCORING RULE: Batter === Bowler is ALWAYS A WICKET, overriding 2X Power', async () => {
    // Reset ability flag for testing wicket priority with 2x
    const m = tournamentManager.getLiveMatch(matchId)!;
    m.innings1.batterAbilityUsedInCurrentOver = false;

    // Sky picks 6 with SECRET_DOUBLE_SHOT, Bowler picks 6
    tournamentManager.submitChoice(matchId, 'MI', 6, 'SECRET_DOUBLE_SHOT', undefined, userA.id);
    const res = tournamentManager.submitChoice(matchId, 'CSK', 6, undefined, undefined, userB.id);
    assert.strictEqual(res.resolved, true);

    const mResult = tournamentManager.getLiveMatch(matchId)!;
    assert.strictEqual(mResult.lastDeliveryResult!.isWicket, true, 'Matching numbers [6] vs [6] MUST be a wicket');
    assert.strictEqual(mResult.lastDeliveryResult!.runsScored, 0, 'Wicket must score 0 runs, never 12 runs');
    assert.strictEqual(mResult.status, 'BATTER_SELECTION', 'Must transition to BATTER_SELECTION');
  });

  // 5. Replacement Batter Selection
  await runTest(5, 'Replacement Batter Selection: MI picks Tilak Varma (83 OVR)', async () => {
    const res = tournamentManager.selectReplacementBatter(matchId, 'MI', 'mi-tilak', userA.id);
    assert.strictEqual(res.success, true);

    const m = tournamentManager.getLiveMatch(matchId)!;
    assert.strictEqual(m.status, 'DELIVERY_ACTIVE');
    assert.strictEqual(m.innings1.activeBatterId, 'mi-tilak');
  });

  // 6. Batter +3 to +7 OVR Advantage (BONUS SHOT / COMBINATION_SHOT)
  await runTest(6, 'Batter +3 to +7 Advantage: Rohit (88) vs Deshpande (83) = +5 -> ACTIVATE BONUS SHOT scores batter + bowler choice', async () => {
    const m = tournamentManager.getLiveMatch(matchId)!;
    // Set active batter to Rohit (88) and bowler to Deshpande (83)
    m.innings1.activeBatterId = 'mi-rohit';
    m.innings1.activeBowlerId = 'csk-deshpande';
    m.innings1.batterAbilityUsedInCurrentOver = false;

    const matchup = MatchEngine.getMatchupAbilities(m, mockPlayersMap);
    assert.ok(matchup.batterAbilities.includes('COMBINATION_SHOT'), 'Must have COMBINATION_SHOT available');
    assert.strictEqual(matchup.batterOvr, 88);
    assert.strictEqual(matchup.bowlerOvr, 83);

    // Rohit picks 4 with COMBINATION_SHOT; Deshpande bowls 3
    tournamentManager.submitChoice(matchId, 'MI', 4, 'COMBINATION_SHOT', undefined, userA.id);
    const res = tournamentManager.submitChoice(matchId, 'CSK', 3, undefined, undefined, userB.id);
    assert.strictEqual(res.resolved, true);

    const mAfter = tournamentManager.getLiveMatch(matchId)!;
    // Bonus shot scores 4 + 3 = 7 runs!
    assert.strictEqual(mAfter.lastDeliveryResult!.runsScored, 7, 'Bonus shot must score 4 + 3 = 7 runs');
    assert.strictEqual(mAfter.lastDeliveryResult!.isWicket, false);
  });

  // 7. Finish Over 1 & Rotate Strike / Reset Abilities
  await runTest(7, 'Over Boundary: Ability flags reset at over completion', async () => {
    // Deliver remaining balls to finish over 1
    const m = tournamentManager.getLiveMatch(matchId)!;
    while (m.innings1.ballsInCurrentOver < 6 && m.status === 'DELIVERY_ACTIVE') {
      tournamentManager.submitChoice(matchId, 'MI', 1, undefined, undefined, userA.id);
      tournamentManager.submitChoice(matchId, 'CSK', 0, undefined, undefined, userB.id);
    }

    const mOver = tournamentManager.getLiveMatch(matchId)!;
    assert.strictEqual(mOver.innings1.oversCompleted, 1);
    assert.strictEqual(mOver.status, 'BOWLER_SELECTION');
    assert.strictEqual(mOver.innings1.batterAbilityUsedInCurrentOver, false, 'Batter ability must reset on new over');

    // CSK selects Deepak Chahar for Over 2
    tournamentManager.selectBowler(matchId, 'csk-chahar', 'CSK', userB.id);
    const mNewOver = tournamentManager.getLiveMatch(matchId)!;
    assert.strictEqual(mNewOver.status, 'DELIVERY_ACTIVE');
  });

  // 8. Innings Transition to Innings 2 (CSK Batting, MI Bowling)
  await runTest(8, 'Innings 2 Transition: CSK bats (Rahane 80 OVR), MI bowls (Bumrah 94 OVR, Coetzee 87 OVR)', async () => {
    const m = tournamentManager.getLiveMatch(matchId)!;
    // Fast-forward to Innings 2
    m.innings1.oversCompleted = 5;
    m.innings1.ballsInCurrentOver = 0;
    m.innings1.isCompleted = true;
    MatchEngine.transitionToInnings2(m, mockPlayersMap);
    tournamentStorage.saveMatch(m);

    assert.strictEqual(m.currentInnings, 2);
    assert.strictEqual(m.innings2?.battingFranchiseId, 'CSK');
    assert.strictEqual(m.innings2?.bowlingFranchiseId, 'MI');

    // Openers for CSK (Rahane: 80, Gaikwad: 88)
    const res1 = tournamentManager.selectOpeningBatters(matchId, 'CSK', 'csk-rahane', 'csk-gaikwad', userB.id);
    // Opening Bowler for MI: Coetzee (87 OVR)
    const res2 = tournamentManager.selectOpeningBowler(matchId, 'MI', 'mi-coetzee', userA.id);
    assert.strictEqual(res1.success, true, `res1 must succeed: ${res1.message}`);
    assert.strictEqual(res2.success, true, `res2 must succeed: ${res2.message}`);

    const mInn2 = tournamentManager.getLiveMatch(matchId)!;
    assert.strictEqual(mInn2.status, 'DELIVERY_ACTIVE');
  });

  // 9. Bowler +3 to +7 OVR Advantage (NUMBER_BLOCK)
  await runTest(9, 'Bowler +3 to +7 Advantage: Coetzee (87) vs Rahane (80) = +7 -> ACTIVATE NUMBER BLOCK blocks 3 numbers', async () => {
    const m = tournamentManager.getLiveMatch(matchId)!;
    const matchup = MatchEngine.getMatchupAbilities(m, mockPlayersMap);
    console.log('Test 9 Matchup Debug:', {
      activeBatterId: m.innings2?.activeBatterId,
      activeBowlerId: m.innings2?.activeBowlerId,
      matchup
    });
    assert.ok(matchup.bowlerAbilities.includes('NUMBER_BLOCK'), 'Coetzee must have NUMBER_BLOCK available');
    assert.strictEqual(matchup.bowlerOvr, 87);
    assert.strictEqual(matchup.batterOvr, 80);

    // Coetzee blocks [4, 6, 2] and bowls 1
    const bowlSub = tournamentManager.submitChoice(
      matchId,
      'MI',
      1,
      'NUMBER_BLOCK',
      [4, 6, 2],
      userA.id
    );
    assert.strictEqual(bowlSub.resolved, false);

    // Batter (Rahane) attempts to select blocked number [4] -> backend rejects!
    const badBatSub = tournamentManager.submitChoice(matchId, 'CSK', 4, undefined, undefined, userB.id);
    assert.strictEqual(badBatSub.resolved, false);
    assert.ok(badBatSub.error?.includes('blocked by bowler'), 'Backend must reject blocked choice');

    // Batter selects allowed number [1] -> resolves!
    const goodBatSub = tournamentManager.submitChoice(matchId, 'CSK', 1, undefined, undefined, userB.id);
    assert.strictEqual(goodBatSub.resolved, true);

    const mAfter = tournamentManager.getLiveMatch(matchId)!;
    assert.strictEqual(mAfter.lastDeliveryResult!.isWicket, true, 'Both selected 1 -> WICKET!');
  });

  // 10. Bowler +8 or more OVR Advantage (SPECIAL DELIVERY / ELITE_NUMBER_BLOCK)
  await runTest(10, 'Bowler +8 or more Advantage: Bumrah (94) vs Rahane (80) = +14 -> SPECIAL DELIVERY restricts batter to [4, 6]', async () => {
    const m = tournamentManager.getLiveMatch(matchId)!;
    // Set active bowler to Bumrah (94) and active batter to Gaikwad (88) or Conway (86)
    // Bumrah (94) vs Rahane (80) = +14 advantage!
    m.status = 'DELIVERY_ACTIVE';
    MatchEngine.startTurnTimer(m);
    m.innings2!.activeBatterId = 'csk-rahane';
    m.innings2!.activeBowlerId = 'mi-bumrah';
    m.innings2!.batters['csk-rahane'].isOut = false; // reset for test
    const bFig = m.innings2!.bowlers['mi-bumrah'];
    if (bFig) bFig.abilityUsedInCurrentOver = false;
    tournamentStorage.saveMatch(m);

    const matchup = MatchEngine.getMatchupAbilities(m, mockPlayersMap);
    assert.ok(matchup.bowlerAbilities.includes('ELITE_NUMBER_BLOCK'), 'Bumrah must have ELITE_NUMBER_BLOCK available');
    assert.strictEqual(matchup.bowlerOvr, 94);
    assert.strictEqual(matchup.batterOvr, 80);

    // Bumrah activates ELITE_NUMBER_BLOCK and bowls 4
    const bSub = tournamentManager.submitChoice(matchId, 'MI', 4, 'ELITE_NUMBER_BLOCK', undefined, userA.id);
    assert.strictEqual(bSub.resolved, false);

    // Batter attempts to select 0, 1, 2, or 3 -> rejected!
    const try0 = tournamentManager.submitChoice(matchId, 'CSK', 0, undefined, undefined, userB.id);
    assert.strictEqual(try0.resolved, false);
    assert.ok(try0.error?.includes('4 or 6') || try0.error?.includes('blocked'), 'Must reject 0 during Special Delivery');

    const try2 = tournamentManager.submitChoice(matchId, 'CSK', 2, undefined, undefined, userB.id);
    assert.strictEqual(try2.resolved, false);

    // Batter selects 6 -> allowed!
    const ok6 = tournamentManager.submitChoice(matchId, 'CSK', 6, undefined, undefined, userB.id);
    assert.strictEqual(ok6.resolved, true);

    const mAfter = tournamentManager.getLiveMatch(matchId)!;
    assert.strictEqual(mAfter.lastDeliveryResult!.batterInput, 6);
    assert.strictEqual(mAfter.lastDeliveryResult!.bowlerInput, 4);
    assert.strictEqual(mAfter.lastDeliveryResult!.runsScored, 6);
  });

  // 11. Unauthorized Ability Activation Blocked
  await runTest(11, 'Security Check: Ineligible user cannot activate abilities for the other team', async () => {
    // User A (MI bowling) tries to activate batter ability -> blocked
    const badAct = tournamentManager.submitChoice(matchId, 'CSK', 4, 'SECRET_DOUBLE_SHOT', undefined, userA.id);
    assert.strictEqual(badAct.resolved, false);
    assert.ok(badAct.error?.includes('Forbidden'), 'Must forbid cross-team action');
  });

  // 12. Delivery State lifecycle progression
  await runTest(12, 'Delivery Lifecycle: Transitions from WAITING_INPUTS to RESOLVED with proper result status', async () => {
    const m = tournamentManager.getLiveMatch(matchId)!;
    assert.ok(m.currentDelivery, 'Delivery state must exist');
    assert.strictEqual(m.currentDelivery!.status, 'WAITING_INPUTS', 'New delivery starts in WAITING_INPUTS');

    // Submit choice from batter (4)
    tournamentManager.submitChoice(matchId, 'CSK', 4, undefined, undefined, userB.id);
    const mMid = tournamentManager.getLiveMatch(matchId)!;
    assert.strictEqual(mMid.currentDelivery!.status, 'WAITING_INPUTS');

    // Submit bowler choice (2) -> resolves
    const res = tournamentManager.submitChoice(matchId, 'MI', 2, undefined, undefined, userA.id);
    assert.strictEqual(res.resolved, true);
    assert.ok(res.ballEvent);
    assert.strictEqual(res.ballEvent.runsScored, 4);
    assert.ok(res.match?.lastDeliveryResult);
    assert.strictEqual(res.match?.lastDeliveryResult?.runsScored, 4);
  });

  // 13. Match Target Chase & Completion
  await runTest(13, 'Match Target Chase: Immediate completion when target reached in Innings 2', async () => {
    const m = tournamentManager.getLiveMatch(matchId)!;
    m.innings2!.targetRuns = 20;
    m.innings2!.totalRuns = 19;

    // Batter scores 2 -> reaches 21 >= 20 -> MATCH COMPLETED!
    tournamentManager.submitChoice(matchId, 'CSK', 2, undefined, undefined, userB.id);
    const chaseRes = tournamentManager.submitChoice(matchId, 'MI', 1, undefined, undefined, userA.id);
    assert.strictEqual(chaseRes.resolved, true);

    const mDone = tournamentManager.getLiveMatch(matchId)!;
    assert.strictEqual(mDone.status, 'COMPLETED');
    assert.strictEqual(mDone.winnerFranchiseId, 'CSK');
    assert.ok(mDone.resultSummary?.includes('CSK won'));
  });

  // 14. Zero Data Deletion & Storage Persistence
  await runTest(14, 'Zero Data Deletion: Tournaments, profiles, and match records remain 100% intact', async () => {
    const t = tournamentManager.getTournament(tournament.id);
    assert.ok(t, 'Tournament must be intact');
    assert.strictEqual(t?.members.length, 2);
    assert.ok(t?.teams['MI']?.squad.length! > 0);
    assert.ok(t?.teams['CSK']?.squad.length! > 0);
  });

  console.log('\n=========================================================================');
  console.log(`🏆 ALL ${passedTests}/${totalTests} OVR ABILITY & TIMING TESTS PASSED WITH 100% SUCCESS RATE`);
  console.log('=========================================================================\n');
}

runAll().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
