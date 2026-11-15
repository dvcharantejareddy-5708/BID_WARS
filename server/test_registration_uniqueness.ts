import * as dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

import { createClient } from '@supabase/supabase-js';
import { tournamentStorage } from './src/tournamentStorage';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runRegistrationVerification() {
  console.log('================================================================');
  console.log('    REGISTRATION UNIQUENESS & SUPABASE SOURCE OF TRUTH TEST      ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail || ''}`);
      failed++;
    }
  }

  // 1. Verify Supabase profiles table is currently empty
  const { data: currentProfiles } = await supabaseAdmin.from('profiles').select('id');
  console.log(`Current Supabase profiles count: ${currentProfiles?.length || 0}`);

  // 2. Test isNameAvailable when Supabase is empty
  // Previously, usernames like 'hii' or 'Striker_el4i' or 'Rohit_b1tx' were blocked by stale local json file!
  const isAvailableHii = await tournamentStorage.isNameAvailable('hii');
  assert(isAvailableHii === true, "isNameAvailable('hii') returns true when Supabase profiles table is empty");

  const isAvailableStriker = await tournamentStorage.isNameAvailable('Striker_el4i');
  assert(isAvailableStriker === true, "isNameAvailable('Striker_el4i') returns true when Supabase profiles table is empty");

  const isAvailableFresh = await tournamentStorage.isNameAvailable('FreshPlayer2026');
  assert(isAvailableFresh === true, "isNameAvailable('FreshPlayer2026') returns true");

  // 3. Test case-insensitivity and whitespace trimming
  const isAvailableSpaced = await tournamentStorage.isNameAvailable('   FreshPlayer2026   ');
  assert(isAvailableSpaced === true, "isNameAvailable handles leading/trailing whitespace");

  // 4. Test isEmailAvailable when Supabase is empty
  const isEmailAvail = await tournamentStorage.isEmailAvailable('player_new@gmail.com');
  assert(isEmailAvail === true, "isEmailAvailable('player_new@gmail.com') returns true");

  // 5. Insert a profile in Supabase to verify that Supabase IS the authoritative gate
  const testUserId = '00000000-0000-0000-0000-000000000999';
  const testName = 'Champion_999';
  const testEmail = 'champion_999@gmail.com';

  console.log(`\nInserting test profile '${testName}' into Supabase profiles table...`);
  await supabaseAdmin.from('profiles').upsert({
    id: testUserId,
    username: testName,
    in_game_name: testName,
    email: testEmail,
    updated_at: new Date().toISOString()
  });

  // Now verify that isNameAvailable rejects exact match and case-insensitive match
  const takenExact = await tournamentStorage.isNameAvailable('Champion_999');
  assert(takenExact === false, "isNameAvailable('Champion_999') correctly returns FALSE for existing Supabase user");

  const takenLower = await tournamentStorage.isNameAvailable('champion_999');
  assert(takenLower === false, "isNameAvailable('champion_999') correctly returns FALSE (case-insensitive check)");

  const takenUpper = await tournamentStorage.isNameAvailable('CHAMPION_999');
  assert(takenUpper === false, "isNameAvailable('CHAMPION_999') correctly returns FALSE (uppercase check)");

  const takenWhitespace = await tournamentStorage.isNameAvailable('  champion_999  ');
  assert(takenWhitespace === false, "isNameAvailable('  champion_999  ') correctly returns FALSE (trimmed whitespace check)");

  // Verify excludeUserId works (e.g. updating one's own profile)
  const selfExcluded = await tournamentStorage.isNameAvailable('Champion_999', testUserId);
  assert(selfExcluded === true, "isNameAvailable allows user to retain their own existing username (excludeUserId)");

  // Verify email uniqueness against Supabase
  const emailTaken = await tournamentStorage.isEmailAvailable('champion_999@gmail.com');
  assert(emailTaken === false, "isEmailAvailable('champion_999@gmail.com') correctly returns FALSE for existing email");

  const emailSelf = await tournamentStorage.isEmailAvailable('champion_999@gmail.com', testUserId);
  assert(emailSelf === true, "isEmailAvailable allows user to retain their own email (excludeUserId)");

  // Clean up test profile from Supabase
  await supabaseAdmin.from('profiles').delete().eq('id', testUserId);
  console.log('Cleaned up test profile from Supabase.\n');

  // Verify it is free again after deletion from Supabase
  const freedName = await tournamentStorage.isNameAvailable('Champion_999');
  assert(freedName === true, "Champion_999 is immediately available again after deletion from Supabase");

  console.log('================================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runRegistrationVerification().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

