-- ==============================================================================
-- BID WARS: MASTER PRODUCTION SUPABASE SQL MIGRATION (AUDITED & SECURED)
-- Project: https://hafxiqnbobejjxxhulzo.supabase.co
--
-- Security & Operational Compliance:
-- 1. Targeted policy cleanup: Purges policies exclusively from tables explicitly
--    managed by BidWars (no blanket public schema drops).
-- 2. Sensitive credentials migrated securely from profiles into auth_secrets
--    before dropping columns, preserving user UUID mapping without data loss.
-- 3. auction_rooms secured: RLS enabled with zero public/anon read policy.
--    Accessible exclusively via backend service_role.
-- 4. Strengthened tournament_members INSERT authorization at database layer:
--    Verifies tournament is in REGISTRATION, not full, franchise is unclaimed,
--    user has not already joined, and non-hosts cannot claim host authority.
-- 5. Non-recursive SECURITY DEFINER authorization helpers with hardened search_path.
-- 6. Server-Authoritative match scoring: zero client write permissions on fixtures,
--    matches, ball_events, and points_table.
-- 7. Column-level GRANT enforcement on tournament_teams and tournaments: team
--    owners can only edit Playing XI lineup; purse, squad and results immutable.
-- 8. Complete Quick Auction schema (seasons, players, rooms, procedures) preserved.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- CLEANUP STEP: TARGETED PURGE OF POLICIES ON BIDWARS MANAGED TABLES ONLY
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN (
              'profiles', 'auth_secrets', 'tournaments', 'tournament_members', 'tournament_teams', 
              'fixtures', 'matches', 'match_lineups', 'ball_events', 'points_table', 
              'player_tournament_stats', 'players', 'auction_seasons', 'rooms', 'room_members', 
              'room_teams', 'auction_lots', 'bids', 'purchases', 'audit_logs', 'auction_rooms'
          )
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 1. USER PROFILES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY, -- Maps directly to auth.users.id
    username TEXT NOT NULL,
    in_game_name TEXT NOT NULL,
    display_name TEXT,
    email TEXT,
    recovery_email TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reconcile columns across previous migrations
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS in_game_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS recovery_email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Case-insensitive unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles (LOWER(TRIM(username)));
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_in_game_name_lower ON public.profiles (LOWER(TRIM(in_game_name)));

-- Constraints
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_username_length;
ALTER TABLE public.profiles ADD CONSTRAINT chk_username_length CHECK (char_length(TRIM(username)) >= 3 AND char_length(TRIM(username)) <= 20);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 1B. PRIVATE AUTH CREDENTIALS TABLE & SAFE DATA MIGRATION
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auth_secrets (
    user_id UUID PRIMARY KEY,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.auth_secrets ENABLE ROW LEVEL SECURITY;
-- Strictly NO policies for anon or authenticated. Accessible exclusively via service_role.

-- MIGRATION SAFETY CHECK: Migrate any existing credentials from profiles into auth_secrets
-- before dropping columns. Ensures zero credential loss.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'password_hash'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'password_salt'
    ) THEN
        INSERT INTO public.auth_secrets (user_id, username, password_hash, password_salt, created_at, updated_at)
        SELECT 
            p.id,
            COALESCE(p.username, p.in_game_name, 'user'),
            p.password_hash,
            p.password_salt,
            COALESCE(p.created_at, NOW()),
            COALESCE(p.updated_at, NOW())
        FROM public.profiles p
        WHERE p.password_hash IS NOT NULL 
          AND p.password_salt IS NOT NULL
        ON CONFLICT (user_id) DO UPDATE SET
            password_hash = EXCLUDED.password_hash,
            password_salt = EXCLUDED.password_salt,
            updated_at = NOW();

        -- Only drop the columns from profiles AFTER data migration is completed
        ALTER TABLE public.profiles DROP COLUMN IF EXISTS password_hash;
        ALTER TABLE public.profiles DROP COLUMN IF EXISTS password_salt;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. AUCTION SEASONS, PLAYERS & AUCTION ROOMS MASTER TABLES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auction_seasons (
    year INT PRIMARY KEY,
    name TEXT NOT NULL,
    default_purse BIGINT NOT NULL DEFAULT 1200000000,
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

ALTER TABLE public.auction_seasons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auction_seasons_public_read" ON public.auction_seasons;
CREATE POLICY "auction_seasons_public_read" ON public.auction_seasons FOR SELECT TO authenticated, anon USING (true);

CREATE TABLE IF NOT EXISTS public.players (
    id TEXT PRIMARY KEY,
    s_no INT NOT NULL,
    name TEXT NOT NULL,
    raw_name TEXT NOT NULL,
    nationality TEXT NOT NULL DEFAULT 'India',
    is_overseas BOOLEAN NOT NULL DEFAULT false,
    primary_role TEXT NOT NULL,
    category TEXT NOT NULL,
    is_wicketkeeper BOOLEAN NOT NULL DEFAULT false,
    year INT NOT NULL REFERENCES public.auction_seasons(year),
    base_price_inr BIGINT NOT NULL,
    base_price_display TEXT NOT NULL,
    set_code TEXT NOT NULL,
    set_name TEXT NOT NULL,
    set_order INT NOT NULL,
    is_marquee BOOLEAN NOT NULL DEFAULT false,
    is_retained BOOLEAN NOT NULL DEFAULT false,
    eligibility TEXT NOT NULL,
    image_url TEXT,
    image_source TEXT,
    verification_status TEXT NOT NULL DEFAULT 'VERIFIED_OFFICIAL_DOCUMENT',
    data_source TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_year ON public.players(year);
CREATE INDEX IF NOT EXISTS idx_players_category ON public.players(category);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "players_public_read" ON public.players;
CREATE POLICY "players_public_read" ON public.players FOR SELECT TO authenticated, anon USING (true);

-- Auction Rooms Table (State storage for Quick Auction engine)
-- SECURE: RLS enabled with NO public or anonymous read policy. Accessible only via backend service_role.
CREATE TABLE IF NOT EXISTS public.auction_rooms (
    room_code TEXT PRIMARY KEY,
    state_json JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.auction_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auction_rooms_read_all" ON public.auction_rooms;

-- ------------------------------------------------------------------------------
-- 3. QUICK AUCTION RELATIONAL TABLES (Migration 1 Preservation)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_code TEXT UNIQUE NOT NULL,
    room_name TEXT NOT NULL,
    host_id TEXT NOT NULL,
    season INT NOT NULL DEFAULT 2026 REFERENCES public.auction_seasons(year),
    pool_mode TEXT NOT NULL DEFAULT 'auction_pool',
    starting_purse BIGINT NOT NULL DEFAULT 1200000000,
    timer_duration INT NOT NULL DEFAULT 10,
    min_squad INT NOT NULL DEFAULT 18,
    max_squad INT NOT NULL DEFAULT 25,
    max_overseas INT NOT NULL DEFAULT 8,
    min_bid_increment BIGINT NOT NULL DEFAULT 2000000,
    play_mode TEXT NOT NULL DEFAULT 'friends_only',
    bot_count INT NOT NULL DEFAULT 0,
    allow_duplicate_teams BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'LOBBY',
    current_lot_index INT NOT NULL DEFAULT 0,
    deadline_timestamp BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rooms_select_participant" ON public.rooms;
CREATE POLICY "rooms_select_participant" ON public.rooms FOR SELECT TO authenticated, anon USING (true);

CREATE TABLE IF NOT EXISTS public.room_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL,
    nickname TEXT NOT NULL,
    is_host BOOLEAN NOT NULL DEFAULT false,
    is_ready BOOLEAN NOT NULL DEFAULT false,
    is_bot BOOLEAN NOT NULL DEFAULT false,
    bot_strategy TEXT,
    connected BOOLEAN NOT NULL DEFAULT true,
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (room_id, member_id)
);

ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "room_members_select" ON public.room_members;
CREATE POLICY "room_members_select" ON public.room_members FOR SELECT TO authenticated, anon USING (true);

CREATE TABLE IF NOT EXISTS public.room_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL,
    member_id TEXT,
    is_bot BOOLEAN NOT NULL DEFAULT false,
    remaining_purse BIGINT NOT NULL,
    reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (room_id, team_id)
);

-- Safe migration / ALTER TABLE block for room_teams
-- FIX for ERROR 42804: room_members.id is UUID while member_id was declared TEXT.
-- In BidWars, member_id is a TEXT identifier (e.g. 'mem_...', 'usr_...', socket id, or 'bot_...').
-- The foreign key relationship references the composite key (room_id, member_id) on room_members.
DO $$
BEGIN
    -- 1. Drop the legacy invalid foreign key constraint if it exists
    ALTER TABLE public.room_teams DROP CONSTRAINT IF EXISTS room_teams_member_id_fkey;
    ALTER TABLE public.room_teams DROP CONSTRAINT IF EXISTS room_teams_room_member_fkey;

    -- 2. If room_teams.member_id was previously created as UUID, convert it to TEXT safely
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'room_teams' 
          AND column_name = 'member_id' 
          AND data_type = 'uuid'
    ) THEN
        -- Map any room_members row UUIDs to the actual member_id text before type conversion
        UPDATE public.room_teams rt
        SET member_id = rm.member_id::uuid
        FROM public.room_members rm
        WHERE rt.room_id = rm.room_id
          AND rt.member_id = rm.id
          AND rm.member_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

        ALTER TABLE public.room_teams ALTER COLUMN member_id TYPE TEXT USING member_id::text;
    END IF;

    -- 3. Preserve relationships: If member_id currently stores room_members surrogate UUIDs as text,
    -- resolve them to the actual room_members.member_id text identifiers
    UPDATE public.room_teams rt
    SET member_id = rm.member_id
    FROM public.room_members rm
    WHERE rt.room_id = rm.room_id
      AND rt.member_id = rm.id::text;

    -- 4. Recreate the proper composite foreign key referencing room_members(room_id, member_id)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'room_teams_room_member_fkey'
    ) THEN
        BEGIN
            ALTER TABLE public.room_teams
                ADD CONSTRAINT room_teams_room_member_fkey
                FOREIGN KEY (room_id, member_id)
                REFERENCES public.room_members(room_id, member_id)
                ON DELETE SET NULL (member_id)
                NOT VALID;
        EXCEPTION WHEN syntax_error OR feature_not_supported THEN
            -- Fallback for environments without PG15 column-specific ON DELETE SET NULL
            ALTER TABLE public.room_teams
                ADD CONSTRAINT room_teams_room_member_fkey
                FOREIGN KEY (room_id, member_id)
                REFERENCES public.room_members(room_id, member_id)
                ON DELETE NO ACTION
                NOT VALID;
        END;

        -- Validate constraint safely without blocking on legacy orphaned rows
        BEGIN
            ALTER TABLE public.room_teams VALIDATE CONSTRAINT room_teams_room_member_fkey;
        EXCEPTION WHEN foreign_key_violation THEN
            RAISE NOTICE 'room_teams_room_member_fkey added as NOT VALID due to existing orphaned historical rows';
        END;
    END IF;
END $$;

ALTER TABLE public.room_teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "room_teams_select" ON public.room_teams;
CREATE POLICY "room_teams_select" ON public.room_teams FOR SELECT TO authenticated, anon USING (true);

CREATE TABLE IF NOT EXISTS public.auction_lots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL REFERENCES public.players(id),
    lot_number INT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    current_bid BIGINT NOT NULL DEFAULT 0,
    winning_team TEXT,
    winning_member_id TEXT,
    sold_price BIGINT,
    started_at TIMESTAMPTZ,
    finalized_at TIMESTAMPTZ,
    UNIQUE (room_id, lot_number)
);

ALTER TABLE public.auction_lots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auction_lots_select" ON public.auction_lots;
CREATE POLICY "auction_lots_select" ON public.auction_lots FOR SELECT TO authenticated, anon USING (true);

CREATE TABLE IF NOT EXISTS public.bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    lot_id UUID NOT NULL REFERENCES public.auction_lots(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL REFERENCES public.players(id),
    team_id TEXT NOT NULL,
    bidder_name TEXT NOT NULL,
    amount BIGINT NOT NULL,
    is_bot BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bids_select" ON public.bids;
CREATE POLICY "bids_select" ON public.bids FOR SELECT TO authenticated, anon USING (true);

CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL,
    player_id TEXT NOT NULL REFERENCES public.players(id),
    lot_id UUID NOT NULL REFERENCES public.auction_lots(id),
    amount BIGINT NOT NULL,
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (room_id, player_id)
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "purchases_select" ON public.purchases;
CREATE POLICY "purchases_select" ON public.purchases FOR SELECT TO authenticated, anon USING (true);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    performer TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT TO authenticated, anon USING (true);

-- ------------------------------------------------------------------------------
-- 4. TOURNAMENTS TABLE (Strict Privacy & Permanent Host Authority)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tournaments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    host_id TEXT NOT NULL,
    host_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('REGISTRATION', 'AUCTION', 'SQUAD_FINALIZATION', 'TOURNAMENT_LIVE', 'PLAYOFFS', 'COMPLETED')),
    teams_count INT NOT NULL DEFAULT 8,
    match_overs INT NOT NULL DEFAULT 5,
    room_code TEXT NOT NULL,
    winner_franchise_id TEXT,
    runner_up_franchise_id TEXT,
    format_details JSONB DEFAULT '{}'::jsonb,
    data_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS format_details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS data_payload JSONB;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS host_name TEXT DEFAULT '';

-- Data reconciliation
UPDATE public.tournaments SET data_payload = format_details WHERE data_payload IS NULL AND format_details IS NOT NULL;

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 5. TOURNAMENT MEMBERS TABLE (1 User = 1 Franchise Constraint)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tournament_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_email TEXT,
    franchise_id TEXT NOT NULL,
    is_host BOOLEAN NOT NULL DEFAULT false,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tournament_user ON public.tournament_members (tournament_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tournament_franchise ON public.tournament_members (tournament_id, franchise_id);

ALTER TABLE public.tournament_members ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 6. NON-RECURSIVE SECURITY DEFINER AUTHORIZATION FUNCTIONS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_tournament_member(p_tournament_id TEXT, p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.tournament_members
        WHERE tournament_id = p_tournament_id
          AND user_id = p_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.is_tournament_host(p_tournament_id TEXT, p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.tournaments
        WHERE id = p_tournament_id
          AND host_id = p_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.has_tournament_access(p_tournament_id TEXT, p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT (
        public.is_tournament_host(p_tournament_id, p_user_id)
        OR public.is_tournament_member(p_tournament_id, p_user_id)
    );
$$;

-- STRENGTHENED INSERT AUTHORIZATION VALIDATOR
-- Evaluates tournament status, franchise availability, user uniqueness and host authority
CREATE OR REPLACE FUNCTION public.can_join_tournament(
    p_tournament_id TEXT,
    p_user_id TEXT,
    p_franchise_id TEXT,
    p_is_host BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_status TEXT;
    v_teams_count INT;
    v_current_count INT;
    v_host_id TEXT;
BEGIN
    -- 1. Fetch tournament metadata
    SELECT status, teams_count, host_id
    INTO v_status, v_teams_count, v_host_id
    FROM public.tournaments
    WHERE id = p_tournament_id;

    IF v_status IS NULL THEN
        RETURN FALSE; -- Tournament does not exist
    END IF;

    -- 2. Verify tournament is currently accepting registrations
    IF v_status <> 'REGISTRATION' THEN
        RETURN FALSE;
    END IF;

    -- 3. Verify host authority integrity: only original creator can join as host
    IF p_is_host IS TRUE AND p_user_id <> v_host_id THEN
        RETURN FALSE;
    END IF;

    -- 4. Verify user has not already joined this tournament (1 team per user)
    IF EXISTS (
        SELECT 1 FROM public.tournament_members
        WHERE tournament_id = p_tournament_id AND user_id = p_user_id
    ) THEN
        RETURN FALSE;
    END IF;

    -- 5. Verify target franchise is unclaimed (1 user per franchise)
    IF EXISTS (
        SELECT 1 FROM public.tournament_members
        WHERE tournament_id = p_tournament_id AND franchise_id = p_franchise_id
    ) THEN
        RETURN FALSE;
    END IF;

    -- 6. Verify tournament capacity has not been exceeded
    SELECT COUNT(*) INTO v_current_count
    FROM public.tournament_members
    WHERE tournament_id = p_tournament_id;

    IF v_current_count >= v_teams_count THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$;

-- Protect helper functions from unauthorized direct execution
REVOKE EXECUTE ON FUNCTION public.is_tournament_member(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_tournament_member(TEXT, TEXT) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_tournament_host(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_tournament_host(TEXT, TEXT) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_tournament_access(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_tournament_access(TEXT, TEXT) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.can_join_tournament(TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_join_tournament(TEXT, TEXT, TEXT, BOOLEAN) TO authenticated, service_role;

-- Tournament Policies using Helper Functions
DROP POLICY IF EXISTS "tournaments_member_select" ON public.tournaments;
CREATE POLICY "tournaments_member_select" ON public.tournaments
    FOR SELECT TO authenticated
    USING (
        host_id = auth.uid()::text
        OR public.is_tournament_member(id, auth.uid()::text)
    );

DROP POLICY IF EXISTS "tournaments_host_insert" ON public.tournaments;
CREATE POLICY "tournaments_host_insert" ON public.tournaments
    FOR INSERT TO authenticated
    WITH CHECK (host_id = auth.uid()::text);

DROP POLICY IF EXISTS "tournaments_host_update" ON public.tournaments;
CREATE POLICY "tournaments_host_update" ON public.tournaments
    FOR UPDATE TO authenticated
    USING (host_id = auth.uid()::text)
    WITH CHECK (host_id = auth.uid()::text);

DROP POLICY IF EXISTS "tournaments_host_delete" ON public.tournaments;
CREATE POLICY "tournaments_host_delete" ON public.tournaments
    FOR DELETE TO authenticated
    USING (host_id = auth.uid()::text);

-- Restrict direct client UPDATE columns on tournaments (winner, status & code are server-authoritative)
REVOKE UPDATE ON public.tournaments FROM authenticated, anon;
GRANT UPDATE (name, updated_at) ON public.tournaments TO authenticated;

-- Tournament Members Policies (Non-recursive & Strictly Validated)
DROP POLICY IF EXISTS "tournament_members_select" ON public.tournament_members;
CREATE POLICY "tournament_members_select" ON public.tournament_members
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()::text
        OR public.has_tournament_access(tournament_id, auth.uid()::text)
    );

DROP POLICY IF EXISTS "tournament_members_insert" ON public.tournament_members;
CREATE POLICY "tournament_members_insert" ON public.tournament_members
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()::text
        AND public.can_join_tournament(tournament_id, auth.uid()::text, franchise_id, is_host)
    );

DROP POLICY IF EXISTS "tournament_members_delete" ON public.tournament_members;
CREATE POLICY "tournament_members_delete" ON public.tournament_members
    FOR DELETE TO authenticated
    USING (
        user_id = auth.uid()::text
        OR public.is_tournament_host(tournament_id, auth.uid()::text)
    );

-- ------------------------------------------------------------------------------
-- 7. TOURNAMENT TEAMS & SQUADS TABLE (Column-Level Protection)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tournament_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    franchise_id TEXT NOT NULL,
    owner_user_id TEXT NOT NULL,
    owner_user_name TEXT NOT NULL,
    purse_remaining NUMERIC NOT NULL DEFAULT 120.0,
    squad JSONB NOT NULL DEFAULT '[]'::jsonb,
    squad_data JSONB DEFAULT '[]'::jsonb,
    default_lineup JSONB,
    playing_xi JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_team_tournament_franchise ON public.tournament_teams (tournament_id, franchise_id);

ALTER TABLE public.tournament_teams ADD COLUMN IF NOT EXISTS squad JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.tournament_teams ADD COLUMN IF NOT EXISTS squad_data JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.tournament_teams ADD COLUMN IF NOT EXISTS default_lineup JSONB;
ALTER TABLE public.tournament_teams ADD COLUMN IF NOT EXISTS playing_xi JSONB;
ALTER TABLE public.tournament_teams ADD COLUMN IF NOT EXISTS owner_user_name TEXT DEFAULT '';

-- Data reconciliation
UPDATE public.tournament_teams SET squad = squad_data WHERE (squad IS NULL OR squad = '[]'::jsonb) AND squad_data IS NOT NULL;
UPDATE public.tournament_teams SET default_lineup = playing_xi WHERE default_lineup IS NULL AND playing_xi IS NOT NULL;

ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tournament_teams_select" ON public.tournament_teams;
CREATE POLICY "tournament_teams_select" ON public.tournament_teams
    FOR SELECT TO authenticated
    USING (public.has_tournament_access(tournament_id, auth.uid()::text));

-- Only the franchise owner can update their team row
DROP POLICY IF EXISTS "tournament_teams_owner_update" ON public.tournament_teams;
CREATE POLICY "tournament_teams_owner_update" ON public.tournament_teams
    FOR UPDATE TO authenticated
    USING (owner_user_id = auth.uid()::text)
    WITH CHECK (owner_user_id = auth.uid()::text);

-- CRITICAL PROTECTION: Block client modification of purse, squad, franchise_id or tournament_id
-- Team owners can ONLY modify their Playing XI lineup. Purse and squad are server-authoritative!
REVOKE UPDATE ON public.tournament_teams FROM authenticated, anon;
GRANT UPDATE (default_lineup, playing_xi, updated_at) ON public.tournament_teams TO authenticated;

-- ------------------------------------------------------------------------------
-- 8. FIXTURES TABLE (Server-Authoritative Results)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fixtures (
    id TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    match_number INT NOT NULL,
    round_number INT NOT NULL DEFAULT 1,
    stage TEXT NOT NULL DEFAULT 'GROUP',
    home_franchise_id TEXT NOT NULL,
    away_franchise_id TEXT NOT NULL,
    match_overs INT NOT NULL DEFAULT 5,
    status TEXT NOT NULL DEFAULT 'SCHEDULED',
    match_id TEXT,
    winner_franchise_id TEXT,
    match_result_summary TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

ALTER TABLE public.fixtures ADD COLUMN IF NOT EXISTS match_id TEXT;
ALTER TABLE public.fixtures ENABLE ROW LEVEL SECURITY;

-- Read-only for authenticated tournament members.
-- Writes strictly reserved for backend service_role.
DROP POLICY IF EXISTS "fixtures_select" ON public.fixtures;
CREATE POLICY "fixtures_select" ON public.fixtures
    FOR SELECT TO authenticated
    USING (public.has_tournament_access(tournament_id, auth.uid()::text));

-- ------------------------------------------------------------------------------
-- 9. MATCHES & LIVE WICKETPULSE SESSIONS (Server-Authoritative Engine)
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
    innings_1_data JSONB,
    innings_2_data JSONB,
    live_state JSONB,
    target_runs INT,
    lineups JSONB,
    ball_history JSONB DEFAULT '[]'::jsonb,
    winner_franchise_id TEXT,
    result_summary TEXT,
    result_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS innings_1_data JSONB;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS innings_2_data JSONB;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS live_state JSONB;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS result_text TEXT;

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Read-only for tournament members.
-- Scoring updates, deliveries & outcomes executed exclusively by backend match engine.
DROP POLICY IF EXISTS "matches_select" ON public.matches;
CREATE POLICY "matches_select" ON public.matches
    FOR SELECT TO authenticated
    USING (public.has_tournament_access(tournament_id, auth.uid()::text));

-- ------------------------------------------------------------------------------
-- 10. POINTS TABLE (Server-Authoritative Standings)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.points_table (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    franchise_id TEXT NOT NULL,
    played INT NOT NULL DEFAULT 0,
    won INT NOT NULL DEFAULT 0,
    lost INT NOT NULL DEFAULT 0,
    tied INT NOT NULL DEFAULT 0,
    nr INT NOT NULL DEFAULT 0,
    points INT NOT NULL DEFAULT 0,
    runs_scored INT NOT NULL DEFAULT 0,
    overs_batted NUMERIC NOT NULL DEFAULT 0,
    runs_conceded INT NOT NULL DEFAULT 0,
    overs_bowled NUMERIC NOT NULL DEFAULT 0,
    nrr NUMERIC NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_points_tournament_team ON public.points_table (tournament_id, franchise_id);

ALTER TABLE public.points_table ADD COLUMN IF NOT EXISTS nr INT DEFAULT 0;
ALTER TABLE public.points_table ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "points_table_select" ON public.points_table;
CREATE POLICY "points_table_select" ON public.points_table
    FOR SELECT TO authenticated
    USING (public.has_tournament_access(tournament_id, auth.uid()::text));

-- ------------------------------------------------------------------------------
-- 11. MATCH LINEUPS, BALL EVENTS & PLAYER STATS TABLES (Migration 2 Preservation)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.match_lineups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id TEXT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    franchise_id TEXT NOT NULL,
    playing_xi JSONB NOT NULL,
    captain_id INT NOT NULL,
    vice_captain_id INT NOT NULL,
    impact_player_id INT,
    is_locked BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_match_team_lineup ON public.match_lineups (match_id, franchise_id);

ALTER TABLE public.match_lineups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "match_lineups_select" ON public.match_lineups;
CREATE POLICY "match_lineups_select" ON public.match_lineups
    FOR SELECT TO authenticated
    USING (public.has_tournament_access(tournament_id, auth.uid()::text));

CREATE TABLE IF NOT EXISTS public.ball_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id TEXT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    tournament_id TEXT NOT NULL,
    innings INT NOT NULL CHECK (innings IN (1, 2)),
    over_number INT NOT NULL,
    ball_number INT NOT NULL,
    batter_id INT NOT NULL,
    batter_name TEXT NOT NULL,
    batter_ovr INT NOT NULL,
    bowler_id INT NOT NULL,
    bowler_name TEXT NOT NULL,
    bowler_ovr INT NOT NULL,
    ovr_diff INT NOT NULL,
    bowler_ability_used TEXT,
    batter_ability_used TEXT,
    blocked_numbers JSONB DEFAULT '[]'::jsonb,
    batter_input INT,
    bowler_input INT,
    is_wicket BOOLEAN DEFAULT FALSE,
    dismissal_type TEXT,
    runs_scored INT NOT NULL DEFAULT 0,
    total_runs_after INT NOT NULL,
    wickets_after INT NOT NULL,
    commentary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ball_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ball_events_select" ON public.ball_events;
CREATE POLICY "ball_events_select" ON public.ball_events
    FOR SELECT TO authenticated
    USING (public.has_tournament_access(tournament_id, auth.uid()::text));

CREATE TABLE IF NOT EXISTS public.player_tournament_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    player_id INT NOT NULL,
    player_name TEXT NOT NULL,
    franchise_id TEXT NOT NULL,
    matches_played INT NOT NULL DEFAULT 0,
    innings_batted INT NOT NULL DEFAULT 0,
    runs INT NOT NULL DEFAULT 0,
    balls_faced INT NOT NULL DEFAULT 0,
    fours INT NOT NULL DEFAULT 0,
    sixes INT NOT NULL DEFAULT 0,
    highest_score INT NOT NULL DEFAULT 0,
    strike_rate NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    overs_bowled NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    maidens INT NOT NULL DEFAULT 0,
    runs_conceded INT NOT NULL DEFAULT 0,
    wickets INT NOT NULL DEFAULT 0,
    economy_rate NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    best_bowling TEXT DEFAULT '-',
    mvp_points NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_player_tournament ON public.player_tournament_stats (tournament_id, player_id);

ALTER TABLE public.player_tournament_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "player_tournament_stats_select" ON public.player_tournament_stats;
CREATE POLICY "player_tournament_stats_select" ON public.player_tournament_stats
    FOR SELECT TO authenticated
    USING (public.has_tournament_access(tournament_id, auth.uid()::text));

-- Success confirmation
SELECT 'BidWars Master Database Schema & Secure RLS Policies successfully initialized.' AS status;
