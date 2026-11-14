import { tournamentManager } from './src/tournamentManager.js';
import { tournamentStorage } from './src/tournamentStorage.js';
import { roomManager } from './src/index.js';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${msg}`);
}

async function runProductionTests() {
  console.log('====================================================');
  console.log('BIDWARS: PRODUCTION-READY MULTI-USER & SECURITY TESTS');
  console.log('====================================================');

  const runId = Date.now().toString(36).slice(-4);
  const userA_id = 'usr_test_user_a_' + runId;
  const userB_id = 'usr_test_user_b_' + runId;
  const userC_id = 'usr_test_user_c_' + runId;
  const nameA = `Striker_${runId}`;
  const nameB = `Blaster_${runId}`;

  // 1. Profile & Unique In-Game Name Registration
  console.log('\n--- 1. IN-GAME NAME UNIQUENESS & PROFILE REGISTRATION ---');
  await tournamentStorage.saveProfile({
    id: userA_id,
    inGameName: nameA,
    email: 'usera@example.com',
    avatarUrl: 'https://example.com/a.jpg',
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  const profileA = await tournamentStorage.getProfile(userA_id);
  assert(profileA?.inGameName === nameA, `User A saved with in-game name ${nameA}`);

  await tournamentStorage.saveProfile({
    id: userB_id,
    inGameName: nameB,
    email: 'userb@example.com',
    avatarUrl: 'https://example.com/b.jpg',
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  const profileB = await tournamentStorage.getProfile(userB_id);
  assert(profileB?.inGameName === nameB, `User B saved with in-game name ${nameB}`);

  // Case-insensitive duplicate check
  const isAvailableExact = await tournamentStorage.isNameAvailable(nameA);
  const isAvailableLower = await tournamentStorage.isNameAvailable(nameA.toLowerCase());
  const isAvailableUpper = await tournamentStorage.isNameAvailable(nameA.toUpperCase());
  assert(!isAvailableExact && !isAvailableLower && !isAvailableUpper, 'Case-insensitive duplicate names are strictly rejected');

  const isAvailableOwn = await tournamentStorage.isNameAvailable(nameA, userA_id);
  assert(isAvailableOwn === true, 'User A can keep their own in-game name');

  const isAvailableNew = await tournamentStorage.isNameAvailable('NewLegend_' + runId);
  assert(isAvailableNew === true, 'Unused in-game name is available');

  // 2. Strict Tournament Privacy & Permanent Host
  console.log('\n--- 2. TOURNAMENT CREATION & STRICT PRIVACY ---');
  const tournament = await tournamentManager.createTournament(
    'IPL Champions League',
    userA_id,
    nameA,
    'usera@example.com',
    8,
    5,
    'CSK'
  );

  assert(tournament.hostId === userA_id, 'Tournament hostId strictly equals User A UUID');
  assert(tournament.members.length === 1, 'Initially only host is member');
  assert(tournament.members[0].isHost === true, 'User A has isHost=true');
  assert(tournament.members[0].userName === nameA, 'User A member record has In-Game Name');

  // Privacy: User B queries their tournaments
  const userBTournamentsBefore = tournamentManager.getUserTournaments(userB_id);
  assert(userBTournamentsBefore.length === 0, 'User B cannot see private tournament created by User A');

  // Privacy: Non-member User C queries tournament by ID
  const tournamentForC = tournamentManager.getTournament(tournament.id, userC_id);
  assert(tournamentForC === null, 'Non-member User C gets null when querying tournament by ID');

  // Creator User A queries by ID
  const tournamentForA = tournamentManager.getTournament(tournament.id, userA_id);
  assert(tournamentForA !== null && tournamentForA.id === tournament.id, 'Creator User A can view tournament');

  // 3. Joining Tournament & Privacy Update
  console.log('\n--- 3. JOINING TOURNAMENT & IN-GAME IDENTITY PRESERVATION ---');
  const joinRes = await tournamentManager.joinTournament(
    tournament.id,
    userB_id,
    nameB,
    'userb@example.com',
    'MI'
  );

  assert(joinRes.success === true, 'User B joined tournament successfully');
  const joinedTournament = joinRes.tournament!;
  assert(joinedTournament.members.length === 2, 'Tournament now has 2 members');
  const memberB = joinedTournament.members.find(m => m.userId === userB_id);
  assert(memberB?.isHost === false, 'User B joined as regular participant (cannot usurp host)');
  assert(memberB?.userName === nameB, 'User B member record has MasterBlaster in-game name');
  assert(memberB?.franchiseId === 'MI', 'User B has MI franchise assigned');

  // Host remains unchanged
  assert(joinedTournament.hostId === userA_id, 'Host remains permanently User A after User B joins');

  // Privacy: User B queries their tournaments after joining
  const userBTournamentsAfter = tournamentManager.getUserTournaments(userB_id);
  assert(userBTournamentsAfter.length === 1 && userBTournamentsAfter[0].id === tournament.id, 'User B now sees tournament after joining');

  // 4. Host Permissions: Start Auction
  console.log('\n--- 4. HOST CONTROLS: ONLY HOST CAN START AUCTION ---');
  const nonHostStartRes = await tournamentManager.startAuction(tournament.id, userB_id);
  assert(!nonHostStartRes.success, 'Non-host starting auction is rejected');
  assert(nonHostStartRes.message?.includes('Only the original tournament host') || false, 'Rejected with host permission message');

  // Host starts auction
  const hostStartRes = await tournamentManager.startAuction(tournament.id, userA_id);
  assert(hostStartRes.success === true, 'Host successfully started auction');
  const startedTournament = tournamentManager.getTournament(tournament.id, userA_id)!;
  assert(startedTournament.status === 'AUCTION', 'Tournament status is now AUCTION');

  // 5. Verification of Underlying Auction Room & No "playerl7eu"
  console.log('\n--- 5. AUCTION ROOM PRE-REGISTRATION & IDENTITY VERIFICATION ---');
  const auctionRoom = roomManager.getRoom(tournament.roomCode);
  assert(auctionRoom !== undefined, 'Underlying auction room exists');

  const roomState = auctionRoom!.getState();
  assert(roomState.settings.tournamentId === tournament.id, 'Room settings point to tournamentId');
  assert(roomState.settings.hostId === userA_id, 'Room settings hostId is User A UUID');

  // Check pre-registered members
  const memberAInRoom = roomState.members[userA_id];
  const memberBInRoom = roomState.members[userB_id];

  assert(memberAInRoom !== undefined, 'User A is pre-registered in auction room with their UUID');
  assert(memberAInRoom.nickname === nameA, `User A nickname is "${memberAInRoom?.nickname}" (NOT playerl7eu)`);
  assert(memberAInRoom.teamId === 'CSK', 'User A has CSK franchise locked');
  assert(memberAInRoom.isHost === true, 'User A has isHost=true in auction room');

  assert(memberBInRoom !== undefined, 'User B is pre-registered in auction room with their UUID');
  assert(memberBInRoom.nickname === nameB, `User B nickname is "${memberBInRoom?.nickname}" (NOT playerl7eu)`);
  assert(memberBInRoom.teamId === 'MI', 'User B has MI franchise locked');
  assert(memberBInRoom.isHost === false, 'User B has isHost=false in auction room');

  // Verify no anonymous guest IDs exist
  const memberKeys = Object.keys(roomState.members);
  const anonymousKeys = memberKeys.filter(k => k.startsWith('usr_l7eu') || k.includes('guest'));
  assert(anonymousKeys.length === 0, 'No anonymous guest or random playerl7eu IDs exist in auction room');

  // 6. Tournament Deletion: Host Only & Cascade
  console.log('\n--- 6. TOURNAMENT DELETION & CASCADE CLEANUP ---');
  const nonHostDeleteRes = await tournamentManager.deleteTournament(tournament.id, userB_id);
  assert(!nonHostDeleteRes.success, 'Non-host delete is strictly rejected');
  assert(nonHostDeleteRes.message?.includes('Only the original tournament creator') || false, 'Rejection explains host requirement');

  // Host deletes tournament
  const hostDeleteRes = await tournamentManager.deleteTournament(tournament.id, userA_id);
  assert(hostDeleteRes.success === true, 'Host successfully deleted tournament');

  // Verify tournament is removed from manager & storage
  const tournamentAfterDelete = tournamentManager.getTournament(tournament.id, userA_id);
  assert(tournamentAfterDelete === null, 'Tournament is removed from memory');

  const allTournamentsA = tournamentManager.getUserTournaments(userA_id);
  assert(allTournamentsA.find(t => t.id === tournament.id) === undefined, 'Tournament gone from User A dashboard');

  // Verify underlying auction room was cascaded and deleted
  const auctionRoomAfterDelete = roomManager.getRoom(tournament.roomCode);
  assert(auctionRoomAfterDelete === undefined, 'Underlying auction room was deleted and cascaded');

  console.log('\n====================================================');
  console.log('SUMMARY: ALL PRODUCTION-READY TESTS PASSED (100%)');
  console.log('====================================================\n');
}

runProductionTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
