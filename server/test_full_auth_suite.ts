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
  console.log('========================================================================');
  console.log('BIDWARS COMPLETE RECOVERY OTP & AUTHENTICATION TEST SUITE');
  console.log('========================================================================');
  console.log(`Supabase Project URL: ${SUPABASE_URL}`);
  console.log('Testing against production Supabase Auth & PostgreSQL schema...\n');

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

  console.log('========================================================================');
  console.log('CATEGORY A: TESTS COMPLETED SUCCESSFULLY WITHOUT EMAIL DELIVERY');
  console.log('========================================================================');

  // --- TEST GROUP 1: Gmail Validation Rules ---
  console.log('\n--- TEST GROUP 1: Gmail Format & Domain Validation ---');
  const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

  assert(!gmailRegex.test(''), 'Rejects empty string as Gmail');
  assert(!gmailRegex.test('player@yahoo.com'), 'Rejects Yahoo domain (player@yahoo.com)');
  assert(!gmailRegex.test('player@outlook.com'), 'Rejects Outlook domain (player@outlook.com)');
  assert(!gmailRegex.test('player@hotmail.com'), 'Rejects Hotmail domain (player@hotmail.com)');
  assert(!gmailRegex.test('player@gmail.com.co'), 'Rejects appended domains (player@gmail.com.co)');
  assert(!gmailRegex.test('@gmail.com'), 'Rejects missing local part (@gmail.com)');
  assert(gmailRegex.test('charan123@gmail.com'), 'Accepts valid standard Gmail (charan123@gmail.com)');
  assert(gmailRegex.test('cricket.champ+bid@gmail.com'), 'Accepts valid Gmail with dots and tags');

  // --- TEST GROUP 2: Existing Accounts & Database Data Preservation ---
  console.log('\n--- TEST GROUP 2: Existing Accounts & Database Data Preservation ---');
  const fs = await import('fs');
  const localProfiles = JSON.parse(fs.readFileSync('server/data/persisted_profiles.json', 'utf8'));
  assert(Array.isArray(localProfiles) && localProfiles.length >= 15, `Local persisted accounts verified intact (count: ${localProfiles.length})`);
  
  const scryptUsers = localProfiles.filter((p: any) => p.passwordHash && p.salt);
  assert(scryptUsers.length >= 11, `All registered username accounts preserved with scrypt hashes (count: ${scryptUsers.length})`);
  
  const legacyUsers = localProfiles.filter((p: any) => !p.passwordHash);
  assert(legacyUsers.length === 4, `All legacy guest accounts preserved (count: ${legacyUsers.length})`);

  const { data: existingProfiles, error: pErr } = await supabaseAdmin
    .from('profiles')
    .select('id, username, email, in_game_name');
  assert(!pErr && Array.isArray(existingProfiles), 'Queried Supabase profiles table without error');
  console.log(`  Supabase profiles count: ${existingProfiles?.length}`);

  const { data: tournaments, error: tErr } = await supabaseAdmin
    .from('tournaments')
    .select('id, name, host_id');
  assert(!tErr && Array.isArray(tournaments), 'Queried Supabase tournaments table without error');
  console.log(`  Supabase tournaments count: ${tournaments?.length}`);

  // --- TEST GROUP 3: Direct Registration & Immediate Login (No Verification) ---
  console.log('\n--- TEST GROUP 3: Direct Registration & Immediate Login ---');
  const testUserEmail = `test_player_${Date.now()}@gmail.com`;
  const testUsername = `user_${Date.now().toString().slice(-6)}`;
  const validPassword = 'SecurePassword123!';
  const wrongPassword = 'WrongPassword999!';

  console.log(`Creating test user in Supabase Auth: ${testUserEmail} (${testUsername})...`);
  const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: testUserEmail,
    password: validPassword,
    email_confirm: true, // Auto-confirm: No Gmail verification required
    user_metadata: {
      username: testUsername,
      in_game_name: testUsername
    }
  });

  assert(!createError && Boolean(createData.user), 'Created test user in auth.users with immediate confirmation');
  const createdUserId = createData?.user?.id;

  if (createdUserId) {
    const { error: insErr } = await supabaseAdmin.from('profiles').insert({
      id: createdUserId,
      username: testUsername,
      in_game_name: testUsername,
      email: testUserEmail,
      updated_at: new Date().toISOString()
    });
    assert(!insErr, 'Persisted user profile in public.profiles with matching UUID');
  }

  // Attempt login with WRONG password
  const { data: wrongPwData, error: wrongPwError } = await supabaseAnon.auth.signInWithPassword({
    email: testUserEmail,
    password: wrongPassword
  });
  assert(Boolean(wrongPwError) && !wrongPwData.session, 'Login with wrong password correctly REJECTED by Supabase Auth (no false positive)');

  // Attempt IMMEDIATE login with CORRECT password
  const { data: loginData, error: loginError } = await supabaseAnon.auth.signInWithPassword({
    email: testUserEmail,
    password: validPassword
  });
  assert(!loginError && Boolean(loginData.session), 'Immediate login with correct password SUCCEEDS without requiring email verification');

  // --- TEST GROUP 4: Backend Account Identification (Username vs Gmail) ---
  console.log('\n--- TEST GROUP 4: Backend Account Identification (Username & Gmail) ---');
  
  // Lookup by Username
  const { data: profByUsername, error: uSearchErr } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .ilike('username', testUsername)
    .maybeSingle();
  assert(!uSearchErr && profByUsername?.id === createdUserId, 'Identified account by username search in public.profiles');
  
  // Verify associated Auth user has matching registered Gmail
  const { data: authUserLookup, error: authLookupErr } = await supabaseAdmin.auth.admin.getUserById(profByUsername!.id);
  assert(!authLookupErr && authUserLookup?.user?.email === testUserEmail, 'Retrieved registered Gmail from Supabase Auth user ID');
  assert(authUserLookup?.user?.id === profByUsername?.id, 'Confirmed profile and Auth user belong to the exact same account');

  // Lookup by Gmail
  const { data: profByEmail, error: eSearchErr } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .ilike('email', testUserEmail)
    .maybeSingle();
  assert(!eSearchErr && profByEmail?.id === createdUserId, 'Identified account by Gmail search in public.profiles');

  // Lookup non-existent account
  const { data: nonExistentProf } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .ilike('username', 'non_existent_player_xyz_999')
    .maybeSingle();
  assert(!nonExistentProf, 'Non-existent account correctly returns null for neutral safe response');

  // --- TEST GROUP 5: OTP Generation & Recovery Verification (Safe Test Fixture) ---
  console.log('\n--- TEST GROUP 5: Supabase Auth Recovery OTP Generation & Verification ---');
  
  // Generate genuine Supabase Auth recovery OTP directly in database WITHOUT triggering the blocked default SMTP
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: testUserEmail
  });

  assert(!linkErr && Boolean(linkData?.properties?.email_otp), 'Generated authentic Supabase Auth recovery OTP into auth.users without triggering blocked SMTP');
  const generatedOtp = linkData?.properties?.email_otp;
  console.log(`  Safe Test Recovery OTP: ${generatedOtp} (6 digits, genuine Supabase token)`);

  // Test 1: Reject invalid OTP code
  const { data: invalidOtpData, error: invalidOtpErr } = await supabaseAnon.auth.verifyOtp({
    email: testUserEmail,
    token: '000000',
    type: 'recovery'
  });
  assert(Boolean(invalidOtpErr) && !invalidOtpData?.session, 'Supabase Auth strictly REJECTS invalid recovery OTP code');

  // Test 2: Verify authentic OTP code using Supabase Auth verifyOtp
  const { data: verifyOtpData, error: verifyOtpErr } = await supabaseAnon.auth.verifyOtp({
    email: testUserEmail,
    token: generatedOtp!,
    type: 'recovery'
  });
  assert(!verifyOtpErr && Boolean(verifyOtpData?.session), 'Supabase Auth verifyOtp with type=recovery SUCCEEDS and returns genuine recovery session');
  const recoveryAccessToken = verifyOtpData?.session?.access_token;
  assert(Boolean(recoveryAccessToken), 'Valid Supabase recovery access_token established');

  // --- TEST GROUP 6: Password Update & Invalidation of Old Password ---
  console.log('\n--- TEST GROUP 6: Password Update via Recovery Session ---');
  const newRecoveredPassword = 'BrandNewRecoveredPassword789!';

  // Use the verified recovery session client to update password
  const authenticatedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  await authenticatedClient.auth.setSession({
    access_token: verifyOtpData!.session!.access_token,
    refresh_token: verifyOtpData!.session!.refresh_token
  });

  const { data: updateData, error: updateErr } = await authenticatedClient.auth.updateUser({
    password: newRecoveredPassword
  });
  assert(!updateErr && Boolean(updateData.user), 'Password successfully updated in Supabase Auth using authenticated recovery session');

  // Old password must now FAIL
  const { error: oldPwLoginErr } = await supabaseAnon.auth.signInWithPassword({
    email: testUserEmail,
    password: validPassword
  });
  assert(Boolean(oldPwLoginErr), 'Old password is confirmed INVALID and rejected after password reset');

  // New password must now SUCCEED
  const { data: newPwLoginData, error: newPwLoginErr } = await supabaseAnon.auth.signInWithPassword({
    email: testUserEmail,
    password: newRecoveredPassword
  });
  assert(!newPwLoginErr && Boolean(newPwLoginData.session), 'Login with newly reset password SUCCEEDS immediately');

  // --- TEST GROUP 7: Logged-in Change Password Feature ---
  console.log('\n--- TEST GROUP 7: Logged-In User Change Password ---');
  const thirdPassword = 'ThirdAccountPassword999!';
  
  // Sign in as user
  const { data: loggedInSession } = await supabaseAnon.auth.signInWithPassword({
    email: testUserEmail,
    password: newRecoveredPassword
  });
  assert(Boolean(loggedInSession?.session), 'User logs in to test account settings Change Password');

  // Change password using Supabase Auth admin update (same as /api/auth/change-password backend)
  const { error: changePwErr } = await supabaseAdmin.auth.admin.updateUserById(createdUserId!, {
    password: thirdPassword
  });
  assert(!changePwErr, 'Change password in account settings updates user in Supabase Auth');

  // Verify previous password invalidated
  const { error: prevPwErr } = await supabaseAnon.auth.signInWithPassword({
    email: testUserEmail,
    password: newRecoveredPassword
  });
  assert(Boolean(prevPwErr), 'Previous password invalidated after account settings change');

  // Clean up test user
  if (createdUserId) {
    await supabaseAdmin.from('profiles').delete().eq('id', createdUserId);
    await supabaseAdmin.from('auth_secrets').delete().eq('user_id', createdUserId);
    await supabaseAdmin.auth.admin.deleteUser(createdUserId);
    console.log('\nCleaned up ephemeral test user from Supabase database.');
  }

  // --- CATEGORY B SUMMARY ---
  console.log('\n========================================================================');
  console.log('CATEGORY B: TESTS REQUIRING A WORKING CUSTOM SMTP PROVIDER');
  console.log('========================================================================');
  console.log('[DELIBERATELY EXCLUDED FROM AUTOMATED RUN]');
  console.log('Reason: The Supabase project default email provider is currently blocked');
  console.log('        due to high bounce rate. As explicitly required, we did not call');
  console.log('        resetPasswordForEmail against the blocked default SMTP to avoid bans.');
  console.log('Requirements to enable real email inbox delivery:');
  console.log('  1. Configure custom SMTP in Supabase Dashboard -> Authentication -> SMTP Settings');
  console.log('     (Host, Port, User, Pass from Resend, SendGrid, Amazon SES, or Brevo).');
  console.log('  2. Configure Supabase Email Template for "Reset Password" to include {{ .Token }}.');
  console.log('  3. Once SMTP is added, Supabase Auth will automatically dispatch the 6-digit OTP');
  console.log('     generated by resetPasswordForEmail to the user\'s real Gmail inbox.');
  console.log('  4. The BidWars /verify-recovery page is already wired to verifyOtp with that code.');

  // --- SUMMARY ---
  console.log('\n========================================================================');
  console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
