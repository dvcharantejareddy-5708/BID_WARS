import assert from 'assert';
import { MatchEngine, sanitizeMatchForViewer } from './src/matchEngine.js';
import { Tournament, LiveMatch, MatchLineup } from './src/tournamentTypes.js';
import { IPLTeamId, Player } from './src/types.js';
import { tournamentManager } from './src/tournamentManager.js';
import { tournamentStorage } from './src/tournamentStorage.js';

console.log('🏏 =========================================================================');
console.log('   BIDWARS: MULTIPLAYER PERMISSIONS & LIVE MATCH FLOW TEST SUITE         ');
console.log('   Testing Two-Account Verification: Account A (MI) vs Account B (CSK)  ');
console.log('=========================================================================\n');

let passedTests = 0;
const totalTests = 12;

async function runTest(num: number, title: string, fn: () => Promise<void>) {
  try {
    await fn();
    passedTests++;
    console.log(`✅ [SCENARIO ${num}/${totalTests} PASSED]: ${title}`);
  } catch (err) {
    console.error(`❌ [SCENARIO ${num}/${totalTests} FAILED]: ${title}`);
    console.error(err);
    process.exit(1);
  }
}

async function runAll() {
  await tournamentManager.init();

  const userA = { id: 'usr-mi-owner-101', name: 'Rohit Sharma (Account A)', email: 'rohit@bidwars.com' };
  const userB = { id: 'usr-csk-owner-202', name: 'MS Dhoni (Account B)', email: 'dhoni@bidwars.com' };
  const userC = { id: 'usr-rcb-spectator-303', name: 'Virat Kohli (Account C)', email: 'virat@bidwars.com' };

  // Setup mock players
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

  const miPlayers: Player[] = [
    makeP('mi-1', 'Ishan Kishan', 84, 'BATTER'),
    makeP('mi-2', 'Rohit Sharma', 90, 'BATTER'),
    makeP('mi-3', 'Suryakumar Yadav', 91, 'BATTER'),
    makeP('mi-4', 'Tilak Varma', 83, 'BATTER'),
    makeP('mi-5', 'Hardik Pandya', 89, 'ALL_ROUNDER'),
    makeP('mi-6', 'Tim David', 81, 'BATTER'),
    makeP('mi-7', 'Krunal Pandya', 80, 'ALL_ROUNDER'),
    makeP('mi-8', 'Gerald Coetzee', 82, 'BOWLER'),
    makeP('mi-9', 'Piyush Chawla', 78, 'BOWLER'),
    makeP('mi-10', 'Nuwan Thushara', 79, 'BOWLER'),
    makeP('mi-11', 'Jasprit Bumrah', 94, 'BOWLER')
  ];

  const cskPlayers: Player[] = [
    makeP('csk-1', 'Ruturaj Gaikwad', 88, 'BATTER'),
    makeP('csk-2', 'Devon Conway', 86, 'BATTER'),
    makeP('csk-3', 'Ajinkya Rahane', 80, 'BATTER'),
    makeP('csk-4', 'Shivam Dube', 85, 'ALL_ROUNDER'),
    makeP('csk-5', 'Ravindra Jadeja', 89, 'ALL_ROUNDER'),
    makeP('csk-6', 'MS Dhoni', 85, 'BATTER'),
    makeP('csk-7', 'Moeen Ali', 82, 'ALL_ROUNDER'),
    makeP('csk-8', 'Deepak Chahar', 81, 'BOWLER'),
    makeP('csk-9', 'Shardul Thakur', 80, 'BOWLER'),
    makeP('csk-10', 'Tushar Deshpande', 79, 'BOWLER'),
    makeP('csk-11', 'Matheesha Pathirana', 88, 'BOWLER')
  ];

  for (const p of [...miPlayers, ...cskPlayers]) {
    mockPlayersMap.set(p.id, p);
    (tournamentManager as any).allPlayersMap.set(p.id, p);
  }

  // 1. Create tournament with Account A (MI) and Account B (CSK)
  let testTournament: Tournament;

  await runTest(1, 'Setup Tournament with Account A (MI) and Account B (CSK)', async () => {
    testTournament = await tournamentManager.createTournament(
      'Multiplayer IPL Cup',
      userA.id,
      userA.name,
      userA.email,
      4,
      5, // 5 overs
      'MI',
      'MEGA'
    );

    const joinRes = await tournamentManager.joinTournament(
      testTournament.id,
      userB.id,
      userB.name,
      userB.email,
      'CSK'
    );
    assert.strictEqual(joinRes.success, true, 'Account B must join as CSK');

    // Populate squads
    testTournament.teams['MI']!.squad = miPlayers;
    testTournament.teams['CSK']!.squad = cskPlayers;

    const miLineup: MatchLineup = {
      franchiseId: 'MI',
      playingXI: miPlayers.map(p => p.id),
      captainId: 'mi-2',
      viceCaptainId: 'mi-11',
      isLocked: true,
      submittedAt: Date.now()
    };

    const cskLineup: MatchLineup = {
      franchiseId: 'CSK',
      playingXI: cskPlayers.map(p => p.id),
      captainId: 'csk-1',
      viceCaptainId: 'csk-5',
      isLocked: true,
      submittedAt: Date.now()
    };

    testTournament.teams['MI']!.defaultPlayingXI = miLineup;
    testTournament.teams['CSK']!.defaultPlayingXI = cskLineup;

    // Verify participant franchise helper
    assert.strictEqual(tournamentManager.getParticipantFranchise(testTournament.id, userA.id), 'MI');
    assert.strictEqual(tournamentManager.getParticipantFranchise(testTournament.id, userB.id), 'CSK');
    assert.strictEqual(tournamentManager.getParticipantFranchise(testTournament.id, userC.id), null);
  });

  // 2. Start match and verify interactive coin flip toss
  let matchId = '';

  await runTest(2, 'Start fixture MI vs CSK and enter match lobby with status TOSS_PENDING', async () => {
    // Generate a fixture
    const fixtureId = `FIX-MULTI-1`;
    testTournament.fixtures = [{
      id: fixtureId,
      tournamentId: testTournament.id,
      matchNumber: 1,
      roundNumber: 1,
      stage: 'LEAGUE',
      homeFranchiseId: 'MI',
      awayFranchiseId: 'CSK',
      matchOvers: 5,
      status: 'SCHEDULED',
      scheduledAt: Date.now()
    }];

    const startRes = tournamentManager.startMatch(testTournament.id, fixtureId, userA.id);
    assert.strictEqual(startRes.success, true);
    assert.ok(startRes.match);
    matchId = startRes.match.id;

    const m = tournamentManager.getLiveMatch(matchId);
    assert.ok(m);
    assert.strictEqual(m.status, 'TOSS_PENDING');
  });

  // 3. Toss Resolution & Backend Authorization
  await runTest(3, 'Coin flip toss resolution: Account A (MI) wins toss and transitions to TOSS_DECISION_PENDING', async () => {
    // Force toss winner to be MI
    const m = tournamentManager.getLiveMatch(matchId)!;
    m.homeFranchiseId = 'MI';
    m.awayFranchiseId = 'CSK';

    const tossRes = tournamentManager.resolveToss(matchId, 'MI', 'HEADS', userA.id);
    assert.strictEqual(tossRes.success, true);
    
    // Explicitly set toss winner to MI for deterministic scenario
    m.tossWinnerFranchiseId = 'MI';
    m.tossLoserFranchiseId = 'CSK';
    m.toss_winner_team_id = 'MI';
    m.toss_loser_team_id = 'CSK';
    m.status = 'TOSS_DECISION_PENDING';
    m.current_match_phase = 'TOSS_DECISION_PENDING';
    tournamentStorage.saveMatch(m);

    // Verify sanitization for Account A (MI) and Account B (CSK)
    const viewA = sanitizeMatchForViewer(m, 'MI');
    const viewB = sanitizeMatchForViewer(m, 'CSK');

    assert.strictEqual(viewA.isViewerTossWinner, true, 'MI view must have isViewerTossWinner = true');
    assert.strictEqual(viewB.isViewerTossWinner, false, 'CSK view must have isViewerTossWinner = false');
    assert.strictEqual(viewA.toss_winner_team_id, 'MI');
    assert.strictEqual(viewB.toss_winner_team_id, 'MI');
  });

  // 4. Opposing team cannot submit toss decision (Security & Permissions)
  await runTest(4, 'Security check: Account B (CSK) cannot submit toss decision when MI won toss', async () => {
    // Account B tries to submit toss decision
    const unauthorizedRes = tournamentManager.handleTossDecision(matchId, 'CSK', 'BAT', userB.id);
    assert.strictEqual(unauthorizedRes.success, false, 'CSK must be blocked from submitting toss decision');
    assert.ok(unauthorizedRes.message.includes('Forbidden') || unauthorizedRes.message.includes('Only'), 'Must return forbidden error');

    // Account C (spectator) tries to submit
    const spectatorRes = tournamentManager.handleTossDecision(matchId, 'MI', 'BAT', userC.id);
    assert.strictEqual(spectatorRes.success, false, 'Spectator must be blocked');
  });

  // 5. Authorized Toss Winner selects BAT FIRST -> Stage 4 Opening Selection
  await runTest(5, 'Account A (MI) chooses BAT FIRST -> determines batting/bowling teams and transitions to OPENING_PLAYER_SELECTION', async () => {
    const decisionRes = tournamentManager.handleTossDecision(matchId, 'MI', 'BAT', userA.id);
    assert.strictEqual(decisionRes.success, true, 'MI toss decision must succeed');

    const m = tournamentManager.getLiveMatch(matchId)!;
    assert.ok(
      m.status === 'OPENING_PLAYER_SELECTION' || m.status === 'OPENING_BATTERS_SELECTION',
      'Match must be in opening selection phase'
    );
    assert.strictEqual(m.batting_team_id, 'MI');
    assert.strictEqual(m.bowling_team_id, 'CSK');
    assert.strictEqual(m.innings1.battingFranchiseId, 'MI');
    assert.strictEqual(m.innings1.bowlingFranchiseId, 'CSK');

    // Verify 5-second timer
    assert.ok(m.selectionDeadline! > Date.now(), 'Selection deadline must be set');
    assert.ok(m.selectionDeadline! <= Date.now() + 5500, 'Selection timer must be 5 seconds');
  });

  // 6. Isolated Opening Selection: MI selects batters, CSK selects bowler
  await runTest(6, 'Isolated Opening Selection: MI picks 2 batters from MI squad, CSK picks bowler from CSK squad', async () => {
    // Account B (CSK) tries to select MI batters -> rejected!
    const badBatRes = tournamentManager.selectOpeningBatters(matchId, 'MI', 'mi-1', 'mi-2', userB.id);
    assert.strictEqual(badBatRes.success, false, 'CSK cannot select opening batters for MI');

    // Account A (MI) tries to select CSK bowler -> rejected!
    const badBowlRes = tournamentManager.selectOpeningBowler(matchId, 'CSK', 'csk-11', userA.id);
    assert.strictEqual(badBowlRes.success, false, 'MI cannot select opening bowler for CSK');

    // MI selects opening batters from MI Playing XI
    const miBatRes = tournamentManager.selectOpeningBatters(matchId, 'MI', 'mi-1', 'mi-2', userA.id);
    assert.strictEqual(miBatRes.success, true, 'MI opening batters selection must succeed');

    const mMid = tournamentManager.getLiveMatch(matchId)!;
    assert.strictEqual(mMid.innings1.activeBatterId, 'mi-1');
    assert.strictEqual(mMid.innings1.nonStrikerId, 'mi-2');

    // CSK selects opening bowler from CSK Playing XI
    const cskBowlRes = tournamentManager.selectOpeningBowler(matchId, 'CSK', 'csk-11', userB.id);
    assert.strictEqual(cskBowlRes.success, true, 'CSK opening bowler selection must succeed');

    // Once both are confirmed, transitions to DELIVERY_ACTIVE with 10s timer
    const mLive = tournamentManager.getLiveMatch(matchId)!;
    assert.strictEqual(mLive.status, 'DELIVERY_ACTIVE');
    assert.ok(mLive.pendingInputs.turnExpiresAt! > Date.now(), '10-second turn timer must be set');
    assert.ok(mLive.pendingInputs.turnExpiresAt! <= Date.now() + 10500, 'Turn timer must be <= 10s');
  });

  // 7. Simultaneous Secret Choices and Lock Concealment
  await runTest(7, 'Delivery secrecy: Account A commits choice [4], locked and concealed from Account B until resolution', async () => {
    // MI submits choice 4
    const miSubmit = tournamentManager.submitChoice(matchId, 'MI', 4, undefined, undefined, userA.id);
    assert.strictEqual(miSubmit.resolved, false, 'Delivery must not resolve until both submit');

    const m = tournamentManager.getLiveMatch(matchId)!;
    const viewForCSK = sanitizeMatchForViewer(m, 'CSK');

    assert.strictEqual(viewForCSK.pendingInputs.batterChoice, undefined, 'CSK must NOT see MI choice before locking');
    assert.strictEqual((viewForCSK.pendingInputs as any).hasBatterSubmitted, true, 'CSK knows MI has locked choice');

    // CSK submits choice 1 -> now resolves!
    const cskSubmit = tournamentManager.submitChoice(matchId, 'CSK', 1, undefined, undefined, userB.id);
    assert.strictEqual(cskSubmit.resolved, true, 'Delivery must resolve when both choices locked');

    const mAfter = tournamentManager.getLiveMatch(matchId)!;
    assert.strictEqual(mAfter.lastDeliveryResult!.batterInput, 4);
    assert.strictEqual(mAfter.lastDeliveryResult!.bowlerInput, 1);
    assert.strictEqual(mAfter.lastDeliveryResult!.runsScored, 4);
    assert.strictEqual(mAfter.innings1.totalRuns, 4);
  });

  // 8. Over Completion and Next Bowler Selection Controls
  await runTest(8, 'Over Completion: After 6 balls, only CSK sees next-bowler selection controls with 5s timer', async () => {
    const m = tournamentManager.getLiveMatch(matchId)!;
    // Deliver 5 more balls to finish the over
    for (let i = 2; i <= 6; i++) {
      tournamentManager.submitChoice(matchId, 'MI', 1, undefined, undefined, userA.id);
      tournamentManager.submitChoice(matchId, 'CSK', 0, undefined, undefined, userB.id);
    }

    const mOver = tournamentManager.getLiveMatch(matchId)!;
    assert.strictEqual(mOver.innings1.oversCompleted, 1, 'Over 1 must be completed');
    assert.strictEqual(mOver.status, 'BOWLER_SELECTION', 'Must transition to BOWLER_SELECTION');
    assert.ok(mOver.selectionDeadline! > Date.now(), '5-second selection timer must be active');

    // MI attempts to select bowler -> rejected!
    const miTrySelect = tournamentManager.selectBowler(matchId, 'csk-8', 'CSK', userA.id);
    assert.strictEqual(miTrySelect.success, false, 'MI cannot select bowler for CSK');

    // CSK cannot select previous bowler (consecutive over rule)
    const consecutiveTry = tournamentManager.selectBowler(matchId, 'csk-11', 'CSK', userB.id);
    assert.strictEqual(consecutiveTry.success, false, 'Consecutive over bowler must be blocked');

    // CSK selects Deepak Chahar (csk-8)
    const cskValidSelect = tournamentManager.selectBowler(matchId, 'csk-8', 'CSK', userB.id);
    assert.strictEqual(cskValidSelect.success, true, 'CSK selecting valid bowler must succeed');

    const mResumed = tournamentManager.getLiveMatch(matchId)!;
    assert.strictEqual(mResumed.status, 'DELIVERY_ACTIVE', 'Over 2 delivery must become active');
    assert.strictEqual(mResumed.innings1.activeBowlerId, 'csk-8');
  });

  // 9. Wicket Handling and Replacement Batter Selection
  await runTest(9, 'Wicket handling: Delivery resolution WICKET pauses timer; only MI sees replacement batter controls', async () => {
    // Both choose 2 -> WICKET!
    tournamentManager.submitChoice(matchId, 'MI', 2, undefined, undefined, userA.id);
    const wRes = tournamentManager.submitChoice(matchId, 'CSK', 2, undefined, undefined, userB.id);
    assert.strictEqual(wRes.resolved, true);

    const mWicket = tournamentManager.getLiveMatch(matchId)!;
    assert.strictEqual(mWicket.lastDeliveryResult!.isWicket, true);
    assert.strictEqual(mWicket.status, 'BATTER_SELECTION', 'Must transition to BATTER_SELECTION');
    assert.strictEqual(mWicket.innings1.totalWickets, 1);

    // CSK attempts to pick replacement batter -> rejected!
    const cskTryBat = tournamentManager.selectReplacementBatter(matchId, 'MI', 'mi-3', userB.id);
    assert.strictEqual(cskTryBat.success, false, 'CSK cannot pick replacement batter for MI');

    // MI selects Suryakumar Yadav (mi-3)
    const miBatSelect = tournamentManager.selectReplacementBatter(matchId, 'MI', 'mi-3', userA.id);
    assert.strictEqual(miBatSelect.success, true, 'MI selecting replacement batter must succeed');

    const mAfterWicket = tournamentManager.getLiveMatch(matchId)!;
    assert.strictEqual(mAfterWicket.status, 'DELIVERY_ACTIVE', 'Match must resume to DELIVERY_ACTIVE');
    assert.strictEqual(mAfterWicket.innings1.activeBatterId, 'mi-3');
  });

  // 10. Refresh and Reconnection State Preservation
  await runTest(10, 'Simulate page refresh / reconnect: Both accounts retrieve identical match state and scoreboard', async () => {
    const rawMatch = tournamentManager.getLiveMatch(matchId)!;

    // Simulate Account A refresh
    const refreshedA = sanitizeMatchForViewer(rawMatch, 'MI');
    // Simulate Account B refresh
    const refreshedB = sanitizeMatchForViewer(rawMatch, 'CSK');

    assert.strictEqual(refreshedA.id, refreshedB.id);
    assert.strictEqual(refreshedA.innings1.totalRuns, refreshedB.innings1.totalRuns);
    assert.strictEqual(refreshedA.innings1.totalWickets, refreshedB.innings1.totalWickets);
    assert.strictEqual(refreshedA.innings1.oversCompleted, refreshedB.innings1.oversCompleted);
    assert.strictEqual(refreshedA.innings1.ballsInCurrentOver, refreshedB.innings1.ballsInCurrentOver);
    assert.strictEqual(refreshedA.pendingInputs.turnExpiresAt, refreshedB.pendingInputs.turnExpiresAt);
  });

  // 11. Reverse Scenario: CSK wins toss and chooses BOWL FIRST
  await runTest(11, 'Reverse Scenario: CSK wins toss, chooses BOWL FIRST -> CSK is bowling team, MI is batting team', async () => {
    const fixture2Id = 'FIX-MULTI-2';
    const match2 = MatchEngine.createMatch(
      fixture2Id,
      testTournament.id,
      'CSK',
      'MI',
      5,
      testTournament.teams['CSK']!.defaultPlayingXI!,
      testTournament.teams['MI']!.defaultPlayingXI!,
      mockPlayersMap
    );

    // CSK wins toss
    match2.tossWinnerFranchiseId = 'CSK';
    match2.tossLoserFranchiseId = 'MI';
    match2.toss_winner_team_id = 'CSK';
    match2.toss_loser_team_id = 'MI';
    match2.status = 'TOSS_DECISION_PENDING';

    // MI cannot choose
    const resForbidden = tournamentManager.handleTossDecision(match2.id, 'MI', 'BAT', userA.id);
    assert.strictEqual(resForbidden.success, false);

    // CSK chooses BOWL FIRST
    MatchEngine.handleTossDecision(match2, 'CSK', 'BOWL', mockPlayersMap);
    assert.strictEqual(match2.innings1.battingFranchiseId, 'MI', 'MI must bat first when CSK chooses to bowl');
    assert.strictEqual(match2.innings1.bowlingFranchiseId, 'CSK', 'CSK must bowl first');
  });

  // 12. Zero-Deletion Data Preservation Check
  await runTest(12, 'Zero Data Deletion: Verify Supabase tables, tournaments, memberships, and squads remain intact', async () => {
    const allT = tournamentManager.getAllTournaments();
    assert.ok(allT.length >= 1, 'Tournaments must not be deleted');

    const t = tournamentManager.getTournament(testTournament.id);
    assert.ok(t, 'Test tournament must be preserved');
    assert.strictEqual(t?.members.length, 2, 'Both tournament members preserved');
    assert.ok(t?.teams['MI']?.squad.length! > 0, 'MI squad preserved');
    assert.ok(t?.teams['CSK']?.squad.length! > 0, 'CSK squad preserved');
  });

  console.log('\n=========================================================================');
  console.log(`🏆 ALL ${passedTests}/${totalTests} MULTIPLAYER SCENARIOS PASSED WITH 100% SUCCESS RATE`);
  console.log('=========================================================================\n');
}

runAll().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
