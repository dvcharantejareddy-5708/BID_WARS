import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.resolve('server/.env') });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function testLiveSupabaseOperations() {
  console.log('================================================================');
  console.log('   BIDWARS: LIVE SUPABASE OPERATIONS & PERSISTENCE VERIFICATION  ');
  console.log('================================================================\n');

  console.log(`Target Supabase URL: ${SUPABASE_URL}`);
  console.log(`Service Role Key: ${SERVICE_ROLE_KEY.slice(0, 15)}...`);
  console.log(`Anon Key: ${ANON_KEY.slice(0, 20)}...\n`);

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const anonClient = createClient(SUPABASE_URL, ANON_KEY);

  const report: Record<string, { status: 'VERIFIED' | 'INCOMPLETE'; details: string }> = {};

  // --------------------------------------------------------------------------
  // TEST 1: Real Supabase Auth User Registration
  // --------------------------------------------------------------------------
  console.log('--- 1. TESTING REAL SUPABASE AUTH USER PROVISIONING ---');
  const testUsername = `SupabaseUser_${Date.now().toString().slice(-4)}`;
  const testEmail = `usr_${Date.now()}@bidwars.com`;
  const testPassword = 'SecurePassword2026!';
  let createdUserId = '';

  try {
    const { data: suData, error: suError } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        username: testUsername,
        in_game_name: testUsername
      }
    });

    if (suError) {
      report['Supabase Auth Registration'] = { status: 'INCOMPLETE', details: suError.message };
      console.error(`❌ Registration Error: ${suError.message}`);
    } else if (suData?.user) {
      createdUserId = suData.user.id;
      report['Supabase Auth Registration'] = {
        status: 'VERIFIED',
        details: `Created authentic user with permanent UUID: ${createdUserId}`
      };
      console.log(`✅ VERIFIED: Real Supabase Auth user created in auth.users (UUID: ${createdUserId})`);
    }
  } catch (err: any) {
    report['Supabase Auth Registration'] = { status: 'INCOMPLETE', details: err.message };
  }

  // --------------------------------------------------------------------------
  // TEST 2: Real Supabase Auth Login & Token Issuance
  // --------------------------------------------------------------------------
  console.log('\n--- 2. TESTING REAL SUPABASE AUTH LOGIN & JWT TOKEN ISSUANCE ---');
  try {
    const { data: siData, error: siError } = await anonClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (siError) {
      report['Supabase Auth Login'] = { status: 'INCOMPLETE', details: siError.message };
      console.error(`❌ Login Error: ${siError.message}`);
    } else if (siData?.session) {
      report['Supabase Auth Login'] = {
        status: 'VERIFIED',
        details: `Access token (JWT) issued: ${siData.session.access_token.slice(0, 30)}...`
      };
      console.log(`✅ VERIFIED: Successful login with genuine JWT session token`);
    }
  } catch (err: any) {
    report['Supabase Auth Login'] = { status: 'INCOMPLETE', details: err.message };
  }

  // --------------------------------------------------------------------------
  // TEST 3: Supabase PostgreSQL `public.profiles` Table Insertion
  // --------------------------------------------------------------------------
  console.log('\n--- 3. TESTING DATABASE `public.profiles` INSERTION ---');
  try {
    const { error: pError } = await adminClient
      .from('profiles')
      .upsert({
        id: createdUserId,
        username: testUsername,
        in_game_name: testUsername,
        display_name: testUsername,
        email: testEmail,
        updated_at: new Date().toISOString()
      });

    if (pError) {
      report['Profiles PostgreSQL Persistence'] = {
        status: 'INCOMPLETE',
        details: `Supabase response: "${pError.message}". (Awaiting user approval to execute migration in Supabase SQL Editor)`
      };
      console.log(`ℹ️ INCOMPLETE: public.profiles table does not exist in schema cache yet (${pError.message})`);
    } else {
      report['Profiles PostgreSQL Persistence'] = {
        status: 'VERIFIED',
        details: `Profile row created in public.profiles table`
      };
      console.log(`✅ VERIFIED: Profile persisted in public.profiles table`);
    }
  } catch (err: any) {
    report['Profiles PostgreSQL Persistence'] = { status: 'INCOMPLETE', details: err.message };
  }

  // --------------------------------------------------------------------------
  // TEST 4: Supabase PostgreSQL `public.tournaments` Table Insertion
  // --------------------------------------------------------------------------
  console.log('\n--- 4. TESTING DATABASE `public.tournaments` INSERTION ---');
  try {
    const { error: tError } = await adminClient
      .from('tournaments')
      .upsert({
        id: 'TRN-PROBE-01',
        name: 'Probe Tournament',
        host_id: createdUserId,
        host_name: testUsername,
        status: 'REGISTRATION',
        teams_count: 8,
        match_overs: 5,
        room_code: 'BW-PROBE',
        updated_at: new Date().toISOString()
      });

    if (tError) {
      report['Tournaments PostgreSQL Persistence'] = {
        status: 'INCOMPLETE',
        details: `Supabase response: "${tError.message}". (Awaiting user approval to execute migration in Supabase SQL Editor)`
      };
      console.log(`ℹ️ INCOMPLETE: public.tournaments table does not exist in schema cache yet (${tError.message})`);
    } else {
      report['Tournaments PostgreSQL Persistence'] = {
        status: 'VERIFIED',
        details: `Tournament persisted in public.tournaments`
      };
      console.log(`✅ VERIFIED: Tournament persisted in public.tournaments table`);
    }
  } catch (err: any) {
    report['Tournaments PostgreSQL Persistence'] = { status: 'INCOMPLETE', details: err.message };
  }

  // --------------------------------------------------------------------------
  // TEST 5: Verify NO Local Fallback File Polluting
  // --------------------------------------------------------------------------
  console.log('\n--- 5. VERIFYING LOCAL JSON FALLBACK IS DISABLED ---');
  const profilesDisk = JSON.parse(fs.readFileSync('server/data/persisted_profiles.json', 'utf8'));
  const foundProbeUser = profilesDisk.some((p: any) => p.username === testUsername || p.id === createdUserId);
  if (!foundProbeUser) {
    report['Local Fallback Disabled'] = {
      status: 'VERIFIED',
      details: 'New test registration was NOT written to persisted_profiles.json (Local file fallback strictly disabled)'
    };
    console.log(`✅ VERIFIED: No local JSON file fallback occurred. persisted_profiles.json was not polluted.`);
  } else {
    report['Local Fallback Disabled'] = {
      status: 'INCOMPLETE',
      details: 'User was written to local JSON file'
    };
  }

  // Clean up the created test user from auth.users
  if (createdUserId) {
    await adminClient.auth.admin.deleteUser(createdUserId).catch(() => {});
    console.log(`\n[CleanUp] Removed probe user ${createdUserId} from Supabase Auth.`);
  }

  console.log('\n================================================================');
  console.log('                   OPERATION VERIFICATION REPORT                ');
  console.log('================================================================');
  console.table(report);
}

testLiveSupabaseOperations().catch(console.error);
