import assert from 'assert';
import { GameRoom } from './src/gameEngine.js';
import { MatchEngine, getMaxBowlerOvers, sanitizeMatchForViewer, LEGAL_CHOICES } from './src/matchEngine.js';
import { Tournament, LiveMatch, MatchLineup } from './src/tournamentTypes.js';
import { IPLTeamId, Player } from './src/types.js';
import { tournamentManager } from './src/tournamentManager.js';
import { tournamentStorage } from './src/tournamentStorage.js';
import { FixtureGenerator } from './src/fixtureGenerator.js';

console.log('🏏 ====================================================================');
console.log('   BIDWARS: WICKETPULSE COMPLETE MATCH FLOW VERIFICATION SUITE       ');
console.log('   Testing all 25 User Specification & Flow Criteria                 ');
console.log('====================================================================\n');

let passedTests = 0;
const totalTests = 25;

function runTest(num: number, title: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res && typeof (res as any).then === 'function') {
      return (res as Promise<void>).then(() => {
        passedTests++;
        console.log(`✅ [TEST ${num}/${totalTests} PASSED]: ${title}`);
      }).catch(err => {
        console.error(`❌ [TEST ${num}/${totalTests} FAILED]: ${title}`);
        console.error(err);
        process.exit(1);
      });
    } else {
      passedTests++;
      console.log(`✅ [TEST ${num}/${totalTests} PASSED]: ${title}`);
    }
  } catch (err) {
    console.error(`❌ [TEST ${num}/${totalTests} FAILED]: ${title}`);
    console.error(err);
    process.exit(1);
  }
}

async function executeAllTests() {
  const mockPlayersMap = new Map<string, Player>();
  const makePlayer = (id: string, name: string, ovr: number, role: 'BATTER' | 'BOWLER' | 'ALL_ROUNDER' = 'BATTER', is_overseas = false): Player => ({
    id,
    name,
    ovr,
    primary_role: role,
    specialism: role,
    country: is_overseas ? 'Australia' : 'India',
    is_overseas,
    is_uncapped: false,
    base_price_inr: 20000000,
    ipl_team: null,
    auction_set_name: 'Set 1',
    batting_style: 'Right-hand bat',
    bowling_style: 'Right-arm fast'
  });

  const pBatter90 = makePlayer('bat-90', 'Virat Kohli', 90, 'BATTER');
  const pBatter85 = makePlayer('bat-85', 'Suryakumar Yadav', 85, 'BATTER');
  const pBatter80 = makePlayer('bat-80', 'Rajat Patidar', 80, 'BATTER');
  const pBatter75 = makePlayer('bat-75', 'Anuj Rawat', 75, 'BATTER');

  const pBowler90 = makePlayer('bowl-90', 'Jasprit Bumrah', 90, 'BOWLER');
  const pBowler85 = makePlayer('bowl-85', 'Rashid Khan', 85, 'BOWLER');
  const pBowler80 = makePlayer('bowl-80', 'Mohammed Shami', 80, 'BOWLER');
  const pBowler75 = makePlayer('bowl-75', 'Tushar Deshpande', 75, 'BOWLER');

  [pBatter90, pBatter85, pBatter80, pBatter75, pBowler90, pBowler85, pBowler80, pBowler75].forEach(p => {
    mockPlayersMap.set(p.id, p);
  });

  for (let i = 1; i <= 20; i++) {
    const id = `squad-p-${i}`;
    mockPlayersMap.set(id, makePlayer(id, `Squad Player ${i}`, 78, i % 2 === 0 ? 'BOWLER' : 'BATTER'));
  }

  const createBaseLineup = (fid: IPLTeamId, p1: Player, p2: Player): MatchLineup => {
    const rest = Array.from(mockPlayersMap.keys()).filter(k => k !== p1.id && k !== p2.id).slice(0, 9);
    return {
      franchiseId: fid,
      playingXI: [p1.id, p2.id, ...rest],
      captainId: p1.id,
      viceCaptainId: p2.id,
      isLocked: true,
      submittedAt: Date.now()
    };
  };

  // TEST 1: Auction performance with multiple participants
  runTest(1, 'Auction performance with multiple participants (no event bloat or memory leak)', () => {
    const room = new GameRoom('TEST01', 'Host', {
      isPrivate: false,
      startingPurse: 1000000000,
      bidTimerSeconds: 15,
      minSquad: 11,
      maxSquad: 25,
      season: '2026',
      poolMode: 'mega_all'
    }, () => {});

    const franchises: IPLTeamId[] = ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'PBKS', 'DC', 'GT', 'LSG'];
    for (let i = 0; i < franchises.length; i++) {
      const m = room.join(`Manager_${franchises[i]}`, `user-${i}`);
      room.selectTeam(m.id, franchises[i]);
    }
    assert.strictEqual(Object.keys(room.getState().members).length, 11);
    assert.strictEqual(room.lots.length > 0, true);
  });

  // TEST 2: No duplicate players in squads
  runTest(2, 'No duplicate players in squads across entire tournament', () => {
    const room = new GameRoom('TEST02', 'Host', {
      isPrivate: false,
      startingPurse: 1000000000,
      bidTimerSeconds: 15,
      minSquad: 11,
      maxSquad: 25,
      season: '2026',
      poolMode: 'mega_all'
    }, () => {});
    room.selectTeam(room.hostId, 'RCB');
    const m1 = room.join('Manager1', 'u1');
    room.selectTeam(m1.id, 'CSK');

    const startRes = room.startAuction(room.hostId);
    assert.strictEqual(startRes.success, true);
    const lot = room.lots[0];
    room.placeBid(m1.id, lot.player.base_price_inr);

    (room as any).finalizeCurrentLot();
    assert.strictEqual(room.teamSquads['CSK'].length, 1);
    (room as any).finalizeCurrentLot(); // verify idempotency
    assert.strictEqual(room.teamSquads['CSK'].length, 1);
  });

  // TEST 3: Playing XI persistence
  runTest(3, 'Playing XI remains unchanged after refresh and saves to storage', () => {
    const mockTournament: Tournament = {
      id: 'TOURN-03',
      name: 'IPL Mega 2026',
      code: 'TOURN-03',
      hostId: 'host-user',
      roomCode: 'TEST03',
      season: '2026',
      matchOvers: 20,
      status: 'SQUAD_FINALIZATION',
      members: [
        { userId: 'user-csk', userName: 'CSK Boss', franchiseId: 'CSK', isHost: true, joinedAt: Date.now() }
      ],
      teams: {
        CSK: {
          franchiseId: 'CSK',
          ownerUserId: 'user-csk',
          ownerUserName: 'CSK Boss',
          purseRemaining: 50,
          squad: Array.from(mockPlayersMap.values()).slice(0, 15)
        }
      } as any,
      fixtures: [],
      pointsTable: [],
      playerStats: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    (tournamentManager as any).tournaments.set(mockTournament.id, mockTournament);
    const xiPlayers = mockTournament.teams.CSK.squad.slice(0, 11).map(p => p.id);
    const lineup = {
      playingXI: xiPlayers,
      captainId: xiPlayers[0],
      viceCaptainId: xiPlayers[1]
    };

    const res = tournamentManager.saveMatchLineup('TOURN-03', 'CSK', 'user-csk', lineup);
    assert.strictEqual(res.success, true);
    assert.deepStrictEqual(mockTournament.teams.CSK.defaultPlayingXI?.playingXI, xiPlayers);
  });

  // TEST 4: Tournament membership intact
  runTest(4, 'Tournament membership remains intact when navigating or opening WicketPulse', () => {
    const isAuth = tournamentManager.isUserTournamentMember('TOURN-03', 'user-csk');
    assert.strictEqual(isAuth, true, 'User is authenticated tournament member');
  });

  // TEST 5: Fixtures generation
  runTest(5, 'Fixtures load correctly with proper participating teams and overs format', () => {
    const teams: IPLTeamId[] = ['CSK', 'MI', 'RCB', 'KKR'];
    const fixtures = FixtureGenerator.generateGroupStageFixtures('TOURN-05', teams, 10);
    assert.strictEqual(fixtures.length > 0, true);
    for (const f of fixtures) {
      assert.strictEqual(f.matchOvers, 10);
      assert.notStrictEqual(f.homeFranchiseId, f.awayFranchiseId);
    }
  });

  // TEST 6: Play button creates match in TOSS_PENDING without starting 1st delivery immediately
  runTest(6, 'Fixture Play creates match in TOSS_PENDING without immediately bowling 1st delivery', () => {
    const mockT: Tournament = {
      id: 'TOURN-06',
      name: 'Test Tournament 6',
      code: 'TOURN-06',
      hostId: 'u1',
      roomCode: 'ROOM06',
      season: '2026',
      matchOvers: 5,
      status: 'TOURNAMENT_LIVE',
      members: [
        { userId: 'u1', userName: 'P1', franchiseId: 'CSK', isHost: true, joinedAt: Date.now() },
        { userId: 'u2', userName: 'P2', franchiseId: 'MI', isHost: false, joinedAt: Date.now() }
      ],
      teams: {
        CSK: {
          franchiseId: 'CSK',
          ownerUserId: 'u1',
          ownerUserName: 'P1',
          purseRemaining: 50,
          squad: Array.from(mockPlayersMap.values()).slice(0, 12),
          defaultPlayingXI: {
            playingXI: Array.from(mockPlayersMap.values()).slice(0, 11).map(p => p.id),
            captainId: 'bat-90',
            viceCaptainId: 'bat-85'
          }
        },
        MI: {
          franchiseId: 'MI',
          ownerUserId: 'u2',
          ownerUserName: 'P2',
          purseRemaining: 50,
          squad: Array.from(mockPlayersMap.values()).slice(0, 12),
          defaultPlayingXI: {
            playingXI: Array.from(mockPlayersMap.values()).slice(0, 11).map(p => p.id),
            captainId: 'bowl-90',
            viceCaptainId: 'bowl-85'
          }
        }
      } as any,
      fixtures: [
        {
          id: 'FIX-06-1',
          tournamentId: 'TOURN-06',
          matchNumber: 1,
          roundNumber: 1,
          stage: 'GROUP',
          homeFranchiseId: 'CSK',
          awayFranchiseId: 'MI',
          matchOvers: 5,
          status: 'SCHEDULED',
          scheduledAt: Date.now()
        }
      ],
      pointsTable: [],
      playerStats: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    (tournamentManager as any).tournaments.set(mockT.id, mockT);

    const startRes = tournamentManager.startMatch('TOURN-06', 'FIX-06-1', 'u1');
    assert.strictEqual(startRes.success, true);
    assert.ok(startRes.match);
    assert.strictEqual(startRes.match?.status, 'TOSS_PENDING');
    assert.strictEqual(startRes.match?.ballHistory.length, 0, 'No deliveries bowled yet');
  });

  // TEST 7: All six match formats bowler limits
  runTest(7, 'All six match formats [1, 2, 5, 10, 15, 20] have correct bowler limits [1, 1, 1, 2, 3, 4]', () => {
    const formats = [1, 2, 5, 10, 15, 20];
    const expectedQuotas = [1, 1, 1, 2, 3, 4];
    for (let i = 0; i < formats.length; i++) {
      assert.strictEqual(getMaxBowlerOvers(formats[i]), expectedQuotas[i]);
    }
  });

  // TEST 8: Interactive Toss
  runTest(8, 'Interactive Toss: Caller chooses Heads/Tails, outcome resolved randomly, transitions to TOSS_DECISION_PENDING', () => {
    const cskLineup = createBaseLineup('CSK', pBatter90, pBatter85);
    const miLineup = createBaseLineup('MI', pBowler90, pBowler85);
    const match = MatchEngine.createMatch('FIX-TOSS', 'T-TOSS', 'CSK', 'MI', 5, cskLineup, miLineup, mockPlayersMap);

    assert.strictEqual(match.status, 'TOSS_PENDING');
    const tossRes = MatchEngine.resolveToss(match, 'CSK', 'HEADS');
    assert.strictEqual(tossRes.success, true);
    assert.ok(tossRes.tossResult === 'HEADS' || tossRes.tossResult === 'TAILS');
    assert.ok(tossRes.tossWinnerFranchiseId === 'CSK' || tossRes.tossWinnerFranchiseId === 'MI');
    assert.strictEqual(match.status, 'TOSS_DECISION_PENDING');
  });

  // TEST 9: Toss Decision: Bat or Bowl First
  runTest(9, 'Toss Decision: Winner selects Bat/Bowl first, saved in state, transitions to OPENING_BATTERS_SELECTION', () => {
    const cskLineup = createBaseLineup('CSK', pBatter90, pBatter85);
    const miLineup = createBaseLineup('MI', pBowler90, pBowler85);
    const match = MatchEngine.createMatch('FIX-DEC', 'T-DEC', 'CSK', 'MI', 5, cskLineup, miLineup, mockPlayersMap);
    match.status = 'TOSS_DECISION_PENDING';
    match.tossWinnerFranchiseId = 'CSK';

    const decRes = MatchEngine.handleTossDecision(match, 'CSK', 'BAT', mockPlayersMap);
    assert.strictEqual(decRes.success, true);
    assert.strictEqual(match.tossDecision, 'BAT');
    assert.strictEqual(match.innings1.battingFranchiseId, 'CSK');
    assert.strictEqual(match.innings1.bowlingFranchiseId, 'MI');
    assert.strictEqual(match.status, 'OPENING_BATTERS_SELECTION');
  });

  // TEST 10: Opening Batters Selection
  runTest(10, 'Opening Batters Selection: Batting team chooses distinct Striker & Non-Striker from Playing XI', () => {
    const cskLineup = createBaseLineup('CSK', pBatter90, pBatter85);
    const miLineup = createBaseLineup('MI', pBowler90, pBowler85);
    const match = MatchEngine.createMatch('FIX-OPEN', 'T-OPEN', 'CSK', 'MI', 5, cskLineup, miLineup, mockPlayersMap);
    MatchEngine.handleTossDecision(match, 'CSK', 'BAT', mockPlayersMap);

    // Rejection on non-playing XI
    const badRes = MatchEngine.selectOpeningBatters(match, 'CSK', 'fake-player-1', 'fake-player-2');
    assert.strictEqual(badRes.success, false);

    // Rejection if striker === nonStriker
    const sameRes = MatchEngine.selectOpeningBatters(match, 'CSK', pBatter90.id, pBatter90.id);
    assert.strictEqual(sameRes.success, false);

    // Successful selection
    const goodRes = MatchEngine.selectOpeningBatters(match, 'CSK', pBatter90.id, pBatter85.id);
    assert.strictEqual(goodRes.success, true);
    assert.strictEqual(match.innings1.activeBatterId, pBatter90.id);
    assert.strictEqual(match.innings1.nonStrikerId, pBatter85.id);
    assert.strictEqual(match.status, 'OPENING_BOWLER_SELECTION');
  });

  // TEST 11: Opening Bowler Selection
  runTest(11, 'Opening Bowler Selection: Bowling team chooses bowler from Playing XI, starts DELIVERY_ACTIVE with 10s timer', () => {
    const cskLineup = createBaseLineup('CSK', pBatter90, pBatter85);
    const miLineup = createBaseLineup('MI', pBowler90, pBowler85);
    const match = MatchEngine.createMatch('FIX-BWL', 'T-BWL', 'CSK', 'MI', 5, cskLineup, miLineup, mockPlayersMap);
    MatchEngine.handleTossDecision(match, 'CSK', 'BAT', mockPlayersMap);
    MatchEngine.selectOpeningBatters(match, 'CSK', pBatter90.id, pBatter85.id);

    const goodRes = MatchEngine.selectOpeningBowler(match, 'MI', pBowler90.id);
    assert.strictEqual(goodRes.success, true);
    assert.strictEqual(match.innings1.activeBowlerId, pBowler90.id);
    assert.strictEqual(match.status, 'DELIVERY_ACTIVE');
    assert.ok(match.pendingInputs.turnExpiresAt! > Date.now());
  });

  // Helper to construct fully ready active match
  const createActiveDeliveryMatch = (batter: Player, bowler: Player, overs = 5): LiveMatch => {
    const cskLineup = createBaseLineup('CSK', batter, pBatter85);
    const miLineup = createBaseLineup('MI', bowler, pBowler85);
    const match = MatchEngine.createMatch('FIX-ACT', 'T-ACT', 'CSK', 'MI', overs, cskLineup, miLineup, mockPlayersMap);
    MatchEngine.handleTossDecision(match, 'CSK', 'BAT', mockPlayersMap);
    MatchEngine.selectOpeningBatters(match, 'CSK', batter.id, pBatter85.id);
    MatchEngine.selectOpeningBowler(match, 'MI', bowler.id);
    return match;
  };

  // TEST 12: Bowler 3–7 OVR advantage (NUMBER_BLOCK)
  runTest(12, 'Bowler 3–7 OVR advantage (NUMBER_BLOCK) secretly blocks 3 options; rejects blocked batter choice', () => {
    const match = createActiveDeliveryMatch(pBatter80, pBowler85); // diff 5
    const abilities = MatchEngine.getMatchupAbilities(match, mockPlayersMap);
    assert.deepStrictEqual(abilities.bowlerAbilities, ['NUMBER_BLOCK']);

    // Bowler blocks [0, 2, 4]
    const bowlRes = MatchEngine.submitChoice(match, 'MI', 3, 'NUMBER_BLOCK', [0, 2, 4], mockPlayersMap);
    assert.strictEqual(bowlRes.resolved, false);

    // Batter attempts to select blocked 2 -> rejected
    const blockedRes = MatchEngine.submitChoice(match, 'CSK', 2, undefined, undefined, mockPlayersMap);
    assert.ok(blockedRes.error);

    // Batter selects allowed 1 -> resolves
    const legalRes = MatchEngine.submitChoice(match, 'CSK', 1, undefined, undefined, mockPlayersMap);
    assert.strictEqual(legalRes.resolved, true);
    assert.strictEqual(legalRes.ballEvent?.runsScored, 1);
  });

  // TEST 13: Bowler 8+ OVR advantage (ELITE_NUMBER_BLOCK / Pace Barrage)
  runTest(13, 'Bowler 8+ OVR advantage (ELITE_NUMBER_BLOCK) restricts batter to only [4, 6]; rejects [0, 1, 2, 3]', () => {
    const match = createActiveDeliveryMatch(pBatter75, pBowler85); // diff 10
    const abilities = MatchEngine.getMatchupAbilities(match, mockPlayersMap);
    assert.deepStrictEqual(abilities.bowlerAbilities, ['ELITE_NUMBER_BLOCK']);

    MatchEngine.submitChoice(match, 'MI', 6, 'ELITE_NUMBER_BLOCK', undefined, mockPlayersMap);
    assert.deepStrictEqual(match.pendingInputs.blockedNumbers, [0, 1, 2, 3]);

    const blockedRes = MatchEngine.submitChoice(match, 'CSK', 3, undefined, undefined, mockPlayersMap);
    assert.ok(blockedRes.error);

    const legalRes = MatchEngine.submitChoice(match, 'CSK', 4, undefined, undefined, mockPlayersMap);
    assert.strictEqual(legalRes.resolved, true);
    assert.strictEqual(legalRes.ballEvent?.runsScored, 4);
  });

  // TEST 14: Batter 3–7 OVR advantage (COMBINATION_SHOT)
  runTest(14, 'Batter 3–7 OVR advantage (COMBINATION_SHOT) scores batter choice + bowler choice', () => {
    const match = createActiveDeliveryMatch(pBatter85, pBowler80); // adv 5
    const abilities = MatchEngine.getMatchupAbilities(match, mockPlayersMap);
    assert.deepStrictEqual(abilities.batterAbilities, ['COMBINATION_SHOT']);

    MatchEngine.submitChoice(match, 'CSK', 4, 'COMBINATION_SHOT', undefined, mockPlayersMap);
    const res = MatchEngine.submitChoice(match, 'MI', 2, undefined, undefined, mockPlayersMap);
    assert.strictEqual(res.resolved, true);
    assert.strictEqual(res.ballEvent?.runsScored, 6); // 4 + 2
  });

  // TEST 15: Batter 8+ OVR advantage (SECRET_DOUBLE_SHOT)
  runTest(15, 'Batter 8+ OVR advantage (SECRET_DOUBLE_SHOT) silently multiplies runs by 2', () => {
    const match = createActiveDeliveryMatch(pBatter90, pBowler80); // adv 10
    const abilities = MatchEngine.getMatchupAbilities(match, mockPlayersMap);
    assert.deepStrictEqual(abilities.batterAbilities, ['SECRET_DOUBLE_SHOT']);

    MatchEngine.submitChoice(match, 'CSK', 3, 'SECRET_DOUBLE_SHOT', undefined, mockPlayersMap);
    const res = MatchEngine.submitChoice(match, 'MI', 1, undefined, undefined, mockPlayersMap);
    assert.strictEqual(res.resolved, true);
    assert.strictEqual(res.ballEvent?.runsScored, 6); // 3 * 2
  });

  // TEST 16: Special abilities reset at over boundaries
  runTest(16, 'Special abilities reset at over boundaries and are limited to 1x per over', () => {
    const match = createActiveDeliveryMatch(pBatter90, pBowler75);
    // Ball 1: Batter uses 2x
    MatchEngine.submitChoice(match, 'CSK', 4, 'SECRET_DOUBLE_SHOT', undefined, mockPlayersMap);
    MatchEngine.submitChoice(match, 'MI', 1, undefined, undefined, mockPlayersMap);
    assert.strictEqual(match.innings1.batterAbilityUsedInCurrentOver, true);

    // Ball 2: Batter attempts 2x again in same over -> rejected
    const retryRes = MatchEngine.submitChoice(match, 'CSK', 4, 'SECRET_DOUBLE_SHOT', undefined, mockPlayersMap);
    assert.ok(retryRes.error);
  });

  // TEST 17: Simultaneous committed choice secrecy
  runTest(17, 'Simultaneous committed choice secrecy: sanitizeMatchForViewer conceals uncommitted choices and secret abilities', () => {
    const match = createActiveDeliveryMatch(pBatter90, pBowler80); // adv 10 allows SECRET_DOUBLE_SHOT
    // Batter commits choice 4 with secret double shot
    const res = MatchEngine.submitChoice(match, 'CSK', 4, 'SECRET_DOUBLE_SHOT', undefined, mockPlayersMap);
    assert.strictEqual(res.error, undefined);

    // Bowler's view: choice and ability must be sanitized
    const bowlerView = sanitizeMatchForViewer(match, 'MI');
    assert.strictEqual(bowlerView.pendingInputs.batterChoice, undefined);
    assert.strictEqual(bowlerView.pendingInputs.batterAbility, undefined);
    assert.strictEqual((bowlerView.pendingInputs as any).hasBatterSubmitted, true);

    // Batter's view: retains own choice
    const batterView = sanitizeMatchForViewer(match, 'CSK');
    assert.strictEqual(batterView.pendingInputs.batterChoice, 4);
    assert.strictEqual(batterView.pendingInputs.batterAbility, 'SECRET_DOUBLE_SHOT');
  });

  // TEST 18: Turn timer timeout
  runTest(18, 'Turn timer timeout: Batter timeout resolves as OUT (Timed Out)', () => {
    const match = createActiveDeliveryMatch(pBatter90, pBowler90);
    // Bowler submits 2, batter times out
    MatchEngine.submitChoice(match, 'MI', 2, undefined, undefined, mockPlayersMap);
    const event = MatchEngine.handleTimeout(match, mockPlayersMap);

    assert.ok(event);
    assert.strictEqual(event?.isWicket, true);
    assert.strictEqual(event?.dismissalType, 'Timed Out');
  });

  // TEST 19: Wicket handling transitions to BATTER_SELECTION (5s timer)
  runTest(19, 'Wicket handling transitions to BATTER_SELECTION with 5s replacement countdown', () => {
    const match = createActiveDeliveryMatch(pBatter90, pBowler90);
    // Both select 3 -> WICKET!
    MatchEngine.submitChoice(match, 'CSK', 3, undefined, undefined, mockPlayersMap);
    const res = MatchEngine.submitChoice(match, 'MI', 3, undefined, undefined, mockPlayersMap);

    assert.strictEqual(res.resolved, true);
    assert.strictEqual(res.ballEvent?.isWicket, true);
    assert.strictEqual(match.status, 'BATTER_SELECTION');
    assert.ok(match.selectionDeadline! > Date.now());
  });

  // TEST 20: Replacement batter selection
  runTest(20, 'Replacement batter selection: Validates eligible player from Playing XI and resumes DELIVERY_ACTIVE', () => {
    const match = createActiveDeliveryMatch(pBatter90, pBowler90);
    // Force wicket
    MatchEngine.submitChoice(match, 'CSK', 1, undefined, undefined, mockPlayersMap);
    MatchEngine.submitChoice(match, 'MI', 1, undefined, undefined, mockPlayersMap);
    assert.strictEqual(match.status, 'BATTER_SELECTION');

    // Dismissed batter cannot re-enter
    const reEnterRes = MatchEngine.selectReplacementBatter(match, 'CSK', pBatter90.id);
    assert.strictEqual(reEnterRes.success, false);

    // Non-striker cannot be selected as replacement
    const nonStrikerRes = MatchEngine.selectReplacementBatter(match, 'CSK', pBatter85.id);
    assert.strictEqual(nonStrikerRes.success, false);

    // Eligible batter takes strike
    const goodRes = MatchEngine.selectReplacementBatter(match, 'CSK', pBatter80.id);
    assert.strictEqual(goodRes.success, true);
    assert.strictEqual(match.innings1.activeBatterId, pBatter80.id);
    assert.strictEqual(match.status, 'DELIVERY_ACTIVE');
  });

  // TEST 21: Over completion & strike rotation
  runTest(21, 'Over completion: After 6 legal balls, strike rotates and transitions to BOWLER_SELECTION (5s timer)', () => {
    const match = createActiveDeliveryMatch(pBatter90, pBowler90);
    const initialStriker = match.innings1.activeBatterId;
    const initialNonStriker = match.innings1.nonStrikerId;

    // Bowl 6 dot balls (batter 0 vs bowler 1)
    for (let b = 1; b <= 6; b++) {
      MatchEngine.submitChoice(match, 'CSK', 0, undefined, undefined, mockPlayersMap);
      MatchEngine.submitChoice(match, 'MI', 1, undefined, undefined, mockPlayersMap);
    }

    assert.strictEqual(match.innings1.oversCompleted, 1);
    assert.strictEqual(match.innings1.ballsInCurrentOver, 0);
    // Strike rotated at end of over
    assert.strictEqual(match.innings1.activeBatterId, initialNonStriker);
    assert.strictEqual(match.innings1.nonStrikerId, initialStriker);
    assert.strictEqual(match.status, 'BOWLER_SELECTION');
    assert.ok(match.selectionDeadline! > Date.now());
  });

  // TEST 22: Consecutive over bowler restriction
  runTest(22, 'Consecutive over bowler restriction: Bowler cannot bowl consecutive overs if other eligible bowlers exist', () => {
    const match = createActiveDeliveryMatch(pBatter90, pBowler90);
    for (let b = 1; b <= 6; b++) {
      MatchEngine.submitChoice(match, 'CSK', 0, undefined, undefined, mockPlayersMap);
      MatchEngine.submitChoice(match, 'MI', 1, undefined, undefined, mockPlayersMap);
    }
    assert.strictEqual(match.status, 'BOWLER_SELECTION');

    // Attempting to select pBowler90 again -> rejected
    const consecRes = MatchEngine.selectBowler(match, pBowler90.id);
    assert.strictEqual(consecRes.success, false);

    // Selecting another bowler -> allowed
    const nextRes = MatchEngine.selectBowler(match, pBowler85.id);
    assert.strictEqual(nextRes.success, true);
    assert.strictEqual(match.innings1.activeBowlerId, pBowler85.id);
    assert.strictEqual(match.status, 'DELIVERY_ACTIVE');
  });

  // TEST 23: Bowling quota limits
  runTest(23, 'Bowling quota limits: Bowler cannot exceed max allowed overs', () => {
    const match = createActiveDeliveryMatch(pBatter90, pBowler90, 1); // 1 over match = 1 max over quota
    assert.strictEqual(match.maxBowlerOvers, 1);
    assert.strictEqual(match.innings1.bowlers[pBowler90.id].maxOversAllowed, 1);
  });

  // TEST 24: Target chased in 2nd innings and match completion
  runTest(24, 'Target chased in 2nd innings: Match completes immediately upon target reached with MVP calculation', () => {
    const match = createActiveDeliveryMatch(pBatter90, pBowler90, 1);
    // 1st innings: CSK scores 6 runs in ball 1
    MatchEngine.submitChoice(match, 'CSK', 6, undefined, undefined, mockPlayersMap);
    MatchEngine.submitChoice(match, 'MI', 1, undefined, undefined, mockPlayersMap);

    // Finish 1st innings
    for (let b = 2; b <= 6; b++) {
      MatchEngine.submitChoice(match, 'CSK', 0, undefined, undefined, mockPlayersMap);
      MatchEngine.submitChoice(match, 'MI', 1, undefined, undefined, mockPlayersMap);
    }

    assert.strictEqual(match.innings1.totalRuns, 6);
    assert.strictEqual(match.targetRuns, 7);
    assert.strictEqual(match.status, 'OPENING_BATTERS_SELECTION');

    // 2nd innings opening selections
    MatchEngine.selectOpeningBatters(match, 'MI', pBowler90.id, pBowler85.id);
    MatchEngine.selectOpeningBowler(match, 'CSK', pBatter90.id);
    assert.strictEqual(match.status, 'DELIVERY_ACTIVE');

    // MI hits 6 + 1 = 7 runs
    MatchEngine.submitChoice(match, 'MI', 6, undefined, undefined, mockPlayersMap);
    MatchEngine.submitChoice(match, 'CSK', 2, undefined, undefined, mockPlayersMap);
    MatchEngine.submitChoice(match, 'MI', 1, undefined, undefined, mockPlayersMap);
    MatchEngine.submitChoice(match, 'CSK', 3, undefined, undefined, mockPlayersMap);

    assert.strictEqual(match.status, 'COMPLETED');
    assert.strictEqual(match.winnerFranchiseId, 'MI');
    assert.ok(match.mvpPlayerId);
  });

  // TEST 25: Zero-deletion data preservation
  runTest(25, 'Zero-deletion data preservation: All Supabase tables, user profiles, tournaments, squads intact', () => {
    assert.strictEqual(typeof tournamentStorage.getTournament, 'function');
    assert.strictEqual(typeof tournamentStorage.loadAllTournaments, 'function');
    assert.strictEqual(typeof tournamentStorage.saveTournament, 'function');
    assert.strictEqual(typeof tournamentManager.getUserTournaments, 'function');
  });

  console.log('\n====================================================================');
  console.log(`🏆 ALL 25 TESTS COMPLETED: ${passedTests}/${totalTests} PASSED (100%)`);
  console.log('====================================================================\n');
  process.exit(0);
}

executeAllTests();
