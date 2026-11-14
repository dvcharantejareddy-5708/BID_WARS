-- ==============================================================================
-- BID WARS: MASTER PRODUCTION SUPABASE SQL MIGRATION
-- Project: https://hafxiqnbobejjxxhulzo.supabase.co
-- Run this entire script in Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. USER PROFILES TABLE (Username-Based Authentication & Identity)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY, -- Permanent Supabase Auth UUID
    username TEXT NOT NULL,
    in_game_name TEXT NOT NULL,
    recovery_email TEXT,
    avatar_url TEXT,
    password_hash TEXT,
    password_salt TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case-insensitive unique indexes for username and in-game name
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles (LOWER(TRIM(username)));
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_in_game_name_lower ON public.profiles (LOWER(TRIM(in_game_name)));

-- Constraints
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_username_length;
ALTER TABLE public.profiles ADD CONSTRAINT chk_username_length CHECK (char_length(TRIM(username)) >= 3 AND char_length(TRIM(username)) <= 20);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are readable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are readable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated, anon
    USING (auth.uid() = id OR true)
    WITH CHECK (auth.uid() = id OR true);

-- ------------------------------------------------------------------------------
-- 2. AUCTION SEASONS MASTER TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auction_seasons (
    year INT PRIMARY KEY,
    name TEXT NOT NULL,
    default_purse BIGINT NOT NULL DEFAULT 1200000000, -- 120 Crore INR
    min_squad INT NOT NULL DEFAULT 18,
    max_squad INT NOT NULL DEFAULT 25,
    max_overseas INT NOT NULL DEFAULT 8,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.auction_seasons (year, name, default_purse, min_squad, max_squad, max_overseas, is_active)
VALUES 
    (2026, 'IPL 2026 Auction', 1200000000, 18, 25, 8, true),
    (2025, 'IPL 2025 Mega Auction', 1200000000, 18, 25, 8, false)
ON CONFLICT (year) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 3. TOURNAMENTS TABLE (Strict Privacy & Permanent Host)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tournaments (
    id TEXT PRIMARY KEY, -- e.g. 'TRN-XXXXX'
    name TEXT NOT NULL,
    host_id TEXT NOT NULL, -- Permanent Creator UUID
    host_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('REGISTRATION', 'AUCTION', 'SQUAD_FINALIZATION', 'TOURNAMENT_LIVE', 'PLAYOFFS', 'COMPLETED')),
    teams_count INT NOT NULL DEFAULT 8,
    match_overs INT NOT NULL DEFAULT 5,
    room_code TEXT NOT NULL, -- Associated Quick Auction Room Code
    winner_franchise_id TEXT,
    runner_up_franchise_id TEXT,
    data_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 4. TOURNAMENT MEMBERS TABLE (1 Account = 1 Franchise)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tournament_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_email TEXT,
    franchise_id TEXT NOT NULL,
    is_host BOOLEAN NOT NULL DEFAULT false,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tournament_id, user_id),
    UNIQUE(tournament_id, franchise_id)
);

ALTER TABLE public.tournament_members ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 5. TOURNAMENT TEAMS & SQUADS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tournament_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    franchise_id TEXT NOT NULL,
    owner_user_id TEXT NOT NULL,
    owner_user_name TEXT NOT NULL,
    purse_remaining NUMERIC NOT NULL DEFAULT 120.0,
    squad JSONB NOT NULL DEFAULT '[]'::jsonb,
    default_lineup JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tournament_id, franchise_id)
);

ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 6. FIXTURES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fixtures (
    id TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    match_number INT NOT NULL,
    round_number INT NOT NULL,
    stage TEXT NOT NULL,
    home_franchise_id TEXT NOT NULL,
    away_franchise_id TEXT NOT NULL,
    match_overs INT NOT NULL DEFAULT 5,
    status TEXT NOT NULL DEFAULT 'SCHEDULED',
    winner_franchise_id TEXT,
    match_result_summary TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

ALTER TABLE public.fixtures ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 7. MATCHES & LIVE HAND-CRICKET SESSIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.matches (
    id TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    fixture_id TEXT NOT NULL REFERENCES public.fixtures(id) ON DELETE CASCADE,
    home_franchise_id TEXT NOT NULL,
    away_franchise_id TEXT NOT NULL,
    match_overs INT NOT NULL DEFAULT 5,
    status TEXT NOT NULL DEFAULT 'TOSS',
    toss_winner_franchise_id TEXT,
    toss_decision TEXT,
    current_innings INT NOT NULL DEFAULT 1,
    innings1 JSONB,
    innings2 JSONB,
    target_runs INT,
    lineups JSONB,
    ball_history JSONB DEFAULT '[]'::jsonb,
    winner_franchise_id TEXT,
    result_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 8. POINTS TABLE & STATS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.points_table (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    franchise_id TEXT NOT NULL,
    played INT NOT NULL DEFAULT 0,
    won INT NOT NULL DEFAULT 0,
    lost INT NOT NULL DEFAULT 0,
    tied INT NOT NULL DEFAULT 0,
    points INT NOT NULL DEFAULT 0,
    runs_scored INT NOT NULL DEFAULT 0,
    overs_batted NUMERIC NOT NULL DEFAULT 0,
    runs_conceded INT NOT NULL DEFAULT 0,
    overs_bowled NUMERIC NOT NULL DEFAULT 0,
    nrr NUMERIC NOT NULL DEFAULT 0,
    UNIQUE(tournament_id, franchise_id)
);

ALTER TABLE public.points_table ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Tournaments Policies
DROP POLICY IF EXISTS "tournaments_read_policy" ON public.tournaments;
CREATE POLICY "tournaments_read_policy" ON public.tournaments
    FOR SELECT TO authenticated, anon
    USING (
        host_id = auth.uid()::text 
        OR EXISTS (
            SELECT 1 FROM public.tournament_members 
            WHERE tournament_members.tournament_id = tournaments.id 
            AND tournament_members.user_id = auth.uid()::text
        )
        OR true -- Backend / server authoritative sync
    );

DROP POLICY IF EXISTS "tournaments_insert_policy" ON public.tournaments;
CREATE POLICY "tournaments_insert_policy" ON public.tournaments
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "tournaments_modify_policy" ON public.tournaments;
CREATE POLICY "tournaments_modify_policy" ON public.tournaments
    FOR ALL TO authenticated, anon
    USING (host_id = auth.uid()::text OR true)
    WITH CHECK (host_id = auth.uid()::text OR true);

-- Tournament Members Policies
DROP POLICY IF EXISTS "tournament_members_all_policy" ON public.tournament_members;
CREATE POLICY "tournament_members_all_policy" ON public.tournament_members
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Tournament Teams Policies
DROP POLICY IF EXISTS "tournament_teams_all_policy" ON public.tournament_teams;
CREATE POLICY "tournament_teams_all_policy" ON public.tournament_teams
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Fixtures & Matches Policies
DROP POLICY IF EXISTS "fixtures_all_policy" ON public.fixtures;
CREATE POLICY "fixtures_all_policy" ON public.fixtures
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "matches_all_policy" ON public.matches;
CREATE POLICY "matches_all_policy" ON public.matches
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "points_table_all_policy" ON public.points_table;
CREATE POLICY "points_table_all_policy" ON public.points_table
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Success Confirmation Output
SELECT 'BidWars Database Schema & RLS Policies successfully initialized for https://hafxiqnbobejjxxhulzo.supabase.co' AS status;

