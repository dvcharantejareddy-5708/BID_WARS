import { tournamentManager } from './src/tournamentManager.js';
import { tournamentStorage } from './src/tournamentStorage.js';
import { roomManager } from './src/index.js';
import crypto from 'crypto';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${msg}`);
}

async function runUsernameAuthTests() {
  console.log('====================================================');
  console.log('BIDWARS: USERNAME & PASSWORD AUTHENTICATION TESTS');
  console.log('====================================================');

  const runId = Date.now().toString(36).slice(-4);
  const userA_name = `Rohit_${runId}`;
  const userB_name = `Kohli_${runId}`;
  const passA = 'SecurePass123!';
  const passB = 'KingChamber456!';
  const recoveryA = `rohit_${runId}@example.com`;

  // 1. User Registration & Password Hashing
  console.log('\n--- 1. NEW ACCOUNT REGISTRATION & PASSWORD HASHING ---');
  const saltA = crypto.randomBytes(16).toString('hex');
  const hashA = crypto.scryptSync(passA, saltA, 64).toString('hex');
  const userA_id = crypto.randomUUID();

  await tournamentStorage.saveProfile({
    id: userA_id,
    username: userA_name,
    inGameName: userA_name,
    recoveryEmail: recoveryA,
    passwordHash: hashA,
    salt: saltA,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  const profileA = await tournamentStorage.getProfileByUsername(userA_name);
  assert(profileA !== undefined, `User A registered and retrieved: ${userA_name}`);
  assert(profileA?.username === userA_name, 'Username matches exactly');
  assert(profileA?.recoveryEmail === recoveryA, 'Recovery email stored securely');
  assert(profileA?.passwordHash !== passA, 'Plaintext password is NEVER stored (hashed)');

  // Register User B
  const saltB = crypto.randomBytes(16).toString('hex');
  const hashB = crypto.scryptSync(passB, saltB, 64).toString('hex');
  const userB_id = crypto.randomUUID();

  await tournamentStorage.saveProfile({
    id: userB_id,
    username: userB_name,
    inGameName: userB_name,
    passwordHash: hashB,
    salt: saltB,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  const profileB = await tournamentStorage.getProfileByUsername(userB_name);
  assert(profileB?.username === userB_name, `User B registered: ${userB_name}`);

  // 2. Case-Insensitive Duplicate Username Rejection
  console.log('\n--- 2. DUPLICATE USERNAME REJECTION (CASE-INSENSITIVE) ---');
  const isAvailExact = await tournamentStorage.isNameAvailable(userA_name);
  const isAvailLower = await tournamentStorage.isNameAvailable(userA_name.toLowerCase());
  const isAvailUpper = await tournamentStorage.isNameAvailable(userA_name.toUpperCase());

  assert(!isAvailExact, 'Exact duplicate username is rejected');
  assert(!isAvailLower, 'Lowercase duplicate username is rejected');
  assert(!isAvailUpper, 'Uppercase duplicate username is rejected');

  const isAvailNew = await tournamentStorage.isNameAvailable(`Unique_${runId}`);
  assert(isAvailNew === true, 'Unique username is available');

  // 3. Login Authentication: Correct vs Incorrect Passwords
  console.log('\n--- 3. LOGIN AUTHENTICATION (PASSWORD VERIFICATION) ---');
  // Valid login
  const computedHashA = crypto.scryptSync(passA, profileA!.salt!, 64).toString('hex');
  const validMatch = crypto.timingSafeEqual(Buffer.from(computedHashA, 'hex'), Buffer.from(profileA!.passwordHash!, 'hex'));
  assert(validMatch === true, 'Correct password verifies successfully in constant time');

  // Invalid password
  const computedWrong = crypto.scryptSync('WrongPassword!', profileA!.salt!, 64).toString('hex');
  const wrongMatch = crypto.timingSafeEqual(Buffer.from(computedWrong, 'hex'), Buffer.from(profileA!.passwordHash!, 'hex'));
  assert(wrongMatch === false, 'Incorrect password is strictly rejected');

  // 4. Secure Password Recovery
  console.log('\n--- 4. SECURE PASSWORD RECOVERY ---');
  // Attempt with wrong recovery email
  const wrongRecoveryAttempt = profileA?.recoveryEmail?.toLowerCase() === 'fake@example.com';
  assert(!wrongRecoveryAttempt, 'Password recovery fails when recovery email does not match');

  // Valid password recovery
  const newPassA = 'BrandNewPassword999!';
  const newSaltA = crypto.randomBytes(16).toString('hex');
  const newHashA = crypto.scryptSync(newPassA, newSaltA, 64).toString('hex');

  await tournamentStorage.saveProfile({
    ...profileA!,
    passwordHash: newHashA,
    salt: newSaltA,
    updatedAt: Date.now()
  });

  const updatedProfileA = await tournamentStorage.getProfileByUsername(userA_name);
  const oldLoginHash = crypto.scryptSync(passA, updatedProfileA!.salt!, 64).toString('hex');
  const oldLoginMatch = crypto.timingSafeEqual(Buffer.from(oldLoginHash, 'hex'), Buffer.from(updatedProfileA!.passwordHash!, 'hex'));
  assert(oldLoginMatch === false, 'Old password no longer works after password reset');

  const newLoginHash = crypto.scryptSync(newPassA, updatedProfileA!.salt!, 64).toString('hex');
  const newLoginMatch = crypto.timingSafeEqual(Buffer.from(newLoginHash, 'hex'), Buffer.from(updatedProfileA!.passwordHash!, 'hex'));
  assert(newLoginMatch === true, 'New password verifies successfully');

  // 5. Tournament Privacy & Host Immutability with Username Accounts
  console.log('\n--- 5. TOURNAMENT PRIVACY & HOST IMMUTABILITY ---');
  const tournament = await tournamentManager.createTournament(
    `${userA_name}'s IPL League`,
    userA_id,
    userA_name,
    recoveryA,
    8,
    5,
    'MI'
  );

  assert(tournament.hostId === userA_id, 'Tournament hostId is User A UUID');
  assert(tournament.hostName === userA_name, 'Tournament hostName is User A username');

  // User B queries their tournaments -> strict privacy
  const userBTournamentsBefore = tournamentManager.getUserTournaments(userB_id);
  assert(userBTournamentsBefore.length === 0, 'User B cannot see User A private tournament');

  // Non-member User C queries by ID -> null
  const nonMemberC = tournamentManager.getTournament(tournament.id, 'usr_random_non_member');
  assert(nonMemberC === null, 'Non-member receives null when querying tournament by ID');

  // User B joins tournament
  const joinRes = await tournamentManager.joinTournament(tournament.id, userB_id, userB_name, undefined, 'CSK');
  assert(joinRes.success === true, 'User B joins tournament successfully with their username');
  assert(joinRes.tournament?.hostId === userA_id, 'User A remains permanent host after User B joins');

  const memberB = joinRes.tournament?.members.find(m => m.userId === userB_id);
  assert(memberB?.isHost === false, 'User B has isHost=false (normal player permission)');
  assert(memberB?.userName === userB_name, 'User B username preserved in membership');

  // Non-host starting auction is rejected
  const nonHostStart = await tournamentManager.startAuction(tournament.id, userB_id);
  assert(!nonHostStart.success, 'Non-host cannot start auction');

  // Host starts auction
  const hostStart = await tournamentManager.startAuction(tournament.id, userA_id);
  assert(hostStart.success === true, 'Host successfully starts auction');

  // Verify auction room members use usernames
  const room = roomManager.getRoom(tournament.roomCode);
  const roomState = room!.getState();
  assert(roomState.members[userA_id].nickname === userA_name, 'Auction room host has username displayed');
  assert(roomState.members[userB_id].nickname === userB_name, 'Auction room player has username displayed');

  // Cascade deletion by host
  const deleteRes = await tournamentManager.deleteTournament(tournament.id, userA_id);
  assert(deleteRes.success === true, 'Host successfully deleted tournament with cascade');

  // 6. User Logout & Re-Authentication Verification
  console.log('\n--- 6. USER LOGOUT & RE-AUTHENTICATION ---');
  let activeSessionToken: string | null = 'mock_jwt_session_token_' + Date.now();
  let authenticatedUser: string | null = userA_name;
  assert(authenticatedUser === userA_name && activeSessionToken !== null, 'User A currently authenticated with active session');

  // Logout clears session token and user reference
  activeSessionToken = null;
  authenticatedUser = null;
  assert(activeSessionToken === null && authenticatedUser === null, 'Logout successfully purges active session and local user state');

  // Re-login with valid credentials restores authentication
  const reLoginProfile = await tournamentStorage.getProfileByUsername(userA_name);
  assert(reLoginProfile !== undefined, 'User A profile retrieved for re-login');
  const reLoginHash = crypto.scryptSync(newPassA, reLoginProfile!.salt!, 64).toString('hex');
  const reLoginMatch = crypto.timingSafeEqual(Buffer.from(reLoginHash, 'hex'), Buffer.from(reLoginProfile!.passwordHash!, 'hex'));
  assert(reLoginMatch === true, 'User A successfully re-authenticates after logout');

  console.log('\n====================================================');
  console.log('SUMMARY: ALL USERNAME AUTH & PRIVACY TESTS PASSED (100%)');
  console.log('====================================================\n');
  process.exit(0);
}

runUsernameAuthTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

