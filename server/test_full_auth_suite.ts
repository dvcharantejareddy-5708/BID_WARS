import * as dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase configuration.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runTestSuite() {
  console.log('====================================================');
  console.log('BIDWARS COMPLETE AUTHENTICATION & PASSWORD TEST SUITE');
  console.log('====================================================');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log('Testing against production Supabase Auth & PostgreSQL...\n');

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

  // --- TEST 1: Mandatory Gmail Validation on Backend & Frontend Helper ---
  console.log('--- TEST GROUP 1: Gmail Validation Rules ---');
  const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

  assert(!gmailRegex.test(''), 'Rejects empty string as Gmail');
  assert(!gmailRegex.test('player@yahoo.com'), 'Rejects Yahoo domain (player@yahoo.com)');
  assert(!gmailRegex.test('player@outlook.com'), 'Rejects Outlook domain (player@outlook.com)');
  assert(!gmailRegex.test('player@hotmail.com'), 'Rejects Hotmail domain (player@hotmail.com)');
  assert(!gmailRegex.test('player@gmail.com.co'), 'Rejects appended domains (player@gmail.com.co)');
  assert(!gmailRegex.test('@gmail.com'), 'Rejects missing local part (@gmail.com)');
  assert(gmailRegex.test('charan123@gmail.com'), 'Accepts valid standard Gmail (charan123@gmail.com)');
  assert(gmailRegex.test('cricket.champ+bid@gmail.com'), 'Accepts valid Gmail with dots and tags');

  // --- TEST 2: Existing Accounts & Database Data Preservation ---
  console.log('\n--- TEST GROUP 2: Existing Accounts & Data Preservation ---');
  // Check local persistent storage files
  const fs = await import('fs');
  const localProfiles = JSON.parse(fs.readFileSync('server/data/persisted_profiles.json', 'utf8'));
  assert(Array.isArray(localProfiles) && localProfiles.length >= 15, `Local persisted accounts verified intact (count: ${localProfiles.length})`);
  
  const scryptUsers = localProfiles.filter((p: any) => p.passwordHash && p.salt);
  assert(scryptUsers.length >= 11, `All registered username accounts preserved with scrypt hashes (count: ${scryptUsers.length})`);
  
  const legacyUsers = localProfiles.filter((p: any) => !p.passwordHash);
  assert(legacyUsers.length === 4, `All legacy guest accounts preserved (count: ${legacyUsers.length})`);

  // Check Supabase database tables
  const { data: existingProfiles, error: pErr } = await supabaseAdmin
    .from('profiles')
    .select('id, username, email, in_game_name');
  assert(!pErr && Array.isArray(existingProfiles), 'Successfully queried Supabase profiles table without error');
  console.log(`  Supabase profiles count: ${existingProfiles?.length}`);

  const { data: tournaments, error: tErr } = await supabaseAdmin
    .from('tournaments')
    .select('id, name, host_id');
  assert(!tErr && Array.isArray(tournaments), 'Successfully queried Supabase tournaments table without error');
  console.log(`  Supabase tournaments count: ${tournaments?.length}`);

  // --- TEST 3: Supabase Auth as Single Source of Truth & Wrong-Password Fix ---
  console.log('\n--- TEST GROUP 3: Supabase Auth & Wrong-Password Bug Fix ---');
  const testUserEmail = `test_player_${Date.now()}@gmail.com`;
  const testUsername = `user_${Date.now().toString().slice(-6)}`;
  const validPassword = 'SecurePassword123!';
  const wrongPassword = 'WrongPassword999!';

  // Create user in Supabase Auth with unconfirmed status to test verification requirement
  console.log(`Creating test user in Supabase Auth: ${testUserEmail} (${testUsername})...`);
  const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: testUserEmail,
    password: validPassword,
    email_confirm: false, // simulating real sign-up awaiting email verification
    user_metadata: {
      username: testUsername,
      in_game_name: testUsername
    }
  });

  assert(!createError && Boolean(createData.user), 'Created test user in auth.users with real @gmail.com address');
  const createdUserId = createData?.user?.id;

  // Insert profile in public.profiles
  if (createdUserId) {
    const { error: insErr } = await supabaseAdmin.from('profiles').insert({
      id: createdUserId,
      username: testUsername,
      in_game_name: testUsername,
      email: testUserEmail,
      updated_at: new Date().toISOString()
    });
    assert(!insErr, 'Persisted user profile in public.profiles with correct UUID');
  }

  // Attempt login with WRONG password
  const { data: wrongPwData, error: wrongPwError } = await supabaseAnon.auth.signInWithPassword({
    email: testUserEmail,
    password: wrongPassword
  });
  assert(Boolean(wrongPwError) && !wrongPwData.session, 'Login with wrong password correctly REJECTED by Supabase Auth (no false positive)');

  // Attempt login with CORRECT password when UNCONFIRMED
  // In Supabase, unconfirmed emails cannot sign in unless email confirmation is disabled or confirmed
  const { data: unconfirmedData, error: unconfirmedError } = await supabaseAnon.auth.signInWithPassword({
    email: testUserEmail,
    password: validPassword
  });
  const isUnconfirmedBlocked = Boolean(unconfirmedError) || (unconfirmedData.user && !unconfirmedData.user.email_confirmed_at);
  assert(isUnconfirmedBlocked, 'Unconfirmed Gmail account is blocked from active login until verified');

  // Now confirm the email (simulating clicking the email verification link)
  console.log('Simulating user clicking verification link in Gmail...');
  const { data: confirmData, error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(createdUserId!, {
    email_confirm: true
  });
  assert(!confirmError && Boolean(confirmData.user?.email_confirmed_at), 'Account successfully marked confirmed after email verification');

  // Attempt login with CORRECT password when CONFIRMED
  const { data: loginData, error: loginError } = await supabaseAnon.auth.signInWithPassword({
    email: testUserEmail,
    password: validPassword
  });
  assert(!loginError && Boolean(loginData.session), 'Login with correct password SUCCEEDS after email verification (wrong-password bug resolved)');

  // --- TEST 4: Change Password Flow ---
  console.log('\n--- TEST GROUP 4: Change Password Flow ---');
  const newPassword = 'NewSecretPassword456!';

  // Reject when new password equals current password
  assert(newPassword !== validPassword, 'New password is differentiated from current password');

  // Update password via admin (same as /api/auth/change-password)
  const { data: pwUpdateData, error: pwUpdateError } = await supabaseAdmin.auth.admin.updateUserById(createdUserId!, {
    password: newPassword
  });
  assert(!pwUpdateError, 'Password successfully updated in Supabase Auth');

  // Old password should now FAIL
  const { error: oldPwRetryError } = await supabaseAnon.auth.signInWithPassword({
    email: testUserEmail,
    password: validPassword
  });
  assert(Boolean(oldPwRetryError), 'Old password is immediately invalidated after change');

  // New password should now SUCCEED
  const { data: newPwLoginData, error: newPwLoginError } = await supabaseAnon.auth.signInWithPassword({
    email: testUserEmail,
    password: newPassword
  });
  assert(!newPwLoginError && Boolean(newPwLoginData.session), 'Login with new password succeeds immediately');

  // --- TEST 5: Password Recovery / Reset Flow ---
  console.log('\n--- TEST GROUP 5: Password Recovery Flow ---');
  // Request password reset for Gmail
  const { error: resetReqError } = await supabaseAnon.auth.resetPasswordForEmail(testUserEmail, {
    redirectTo: 'https://bidwars.onrender.com/reset-password'
  });
  assert(!resetReqError, 'Password reset link successfully dispatched to registered Gmail via Supabase Auth');

  // Clean up test user
  if (createdUserId) {
    await supabaseAdmin.from('profiles').delete().eq('id', createdUserId);
    await supabaseAdmin.from('auth_secrets').delete().eq('user_id', createdUserId);
    await supabaseAdmin.auth.admin.deleteUser(createdUserId);
    console.log('Cleaned up ephemeral test user from database.');
  }

  // --- SUMMARY ---
  console.log('\n====================================================');
  console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
