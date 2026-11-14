-- Migration: 20260103000000_tournament_production_security.sql
-- Description: BidWars Production Row Level Security, In-Game Name Uniqueness & Strict Privacy Policies

-- 1. PROFILES UPDATE: Support dedicated In-Game Name with unique constraint
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS in_game_name TEXT;

-- Update existing profiles where in_game_name is null to display_name
UPDATE profiles SET in_game_name = display_name WHERE in_game_name IS NULL;

-- Make in_game_name required with 3-20 char validation
ALTER TABLE profiles ALTER COLUMN in_game_name SET NOT NULL;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_in_game_name_len;
ALTER TABLE profiles ADD CONSTRAINT chk_in_game_name_len CHECK (char_length(in_game_name) >= 3 AND char_length(in_game_name) <= 20);

-- Case-insensitive unique index for in-game names
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_in_game_name_lower ON profiles (LOWER(in_game_name));

-- 2. ENABLE ROW LEVEL SECURITY ACROSS ALL TOURNAMENT TABLES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE ball_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_tournament_stats ENABLE ROW LEVEL SECURITY;

-- 3. PROFILES POLICIES
DROP POLICY IF EXISTS "Profiles are readable by authenticated users" ON profiles;
CREATE POLICY "Profiles are readable by authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. TOURNAMENTS STRICT PRIVACY POLICIES
-- Only tournament creator or authorized members can see tournament details
DROP POLICY IF EXISTS "Tournaments visible to creator and members only" ON tournaments;
CREATE POLICY "Tournaments visible to creator and members only"
  ON tournaments FOR SELECT
  TO authenticated
  USING (
    host_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM tournament_members
      WHERE tournament_members.tournament_id = tournaments.id
      AND tournament_members.user_id = auth.uid()::text
    )
  );

-- Only authenticated users can create tournaments
DROP POLICY IF EXISTS "Authenticated users can create tournaments" ON tournaments;
CREATE POLICY "Authenticated users can create tournaments"
  ON tournaments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = host_id);

-- Only tournament creator / host can update tournament settings
DROP POLICY IF EXISTS "Only tournament host can update tournament" ON tournaments;
CREATE POLICY "Only tournament host can update tournament"
  ON tournaments FOR UPDATE
  TO authenticated
  USING (host_id = auth.uid()::text)
  WITH CHECK (host_id = auth.uid()::text);

-- Only tournament creator / host can delete tournament
DROP POLICY IF EXISTS "Only tournament host can delete tournament" ON tournaments;
CREATE POLICY "Only tournament host can delete tournament"
  ON tournaments FOR DELETE
  TO authenticated
  USING (host_id = auth.uid()::text);

-- 5. TOURNAMENT MEMBERS POLICIES
DROP POLICY IF EXISTS "Members visible to tournament participants" ON tournament_members;
CREATE POLICY "Members visible to tournament participants"
  ON tournament_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM tournament_members tm
      WHERE tm.tournament_id = tournament_members.tournament_id
      AND tm.user_id = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_members.tournament_id
      AND t.host_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Users can join tournaments as member" ON tournament_members;
CREATE POLICY "Users can join tournaments as member"
  ON tournament_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Host or user can remove membership" ON tournament_members;
CREATE POLICY "Host or user can remove membership"
  ON tournament_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_members.tournament_id
      AND t.host_id = auth.uid()::text
    )
  );

-- 6. TOURNAMENT TEAMS & SQUADS POLICIES
DROP POLICY IF EXISTS "Teams visible to tournament members" ON tournament_teams;
CREATE POLICY "Teams visible to tournament members"
  ON tournament_teams FOR SELECT
  TO authenticated
  USING (
    owner_user_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM tournament_members tm
      WHERE tm.tournament_id = tournament_teams.tournament_id
      AND tm.user_id = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_teams.tournament_id
      AND t.host_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Team owners or host can manage team" ON tournament_teams;
CREATE POLICY "Team owners or host can manage team"
  ON tournament_teams FOR ALL
  TO authenticated
  USING (
    owner_user_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_teams.tournament_id
      AND t.host_id = auth.uid()::text
    )
  );

-- 7. FIXTURES & MATCHES POLICIES
DROP POLICY IF EXISTS "Fixtures visible to tournament members" ON fixtures;
CREATE POLICY "Fixtures visible to tournament members"
  ON fixtures FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tournament_members tm
      WHERE tm.tournament_id = fixtures.tournament_id
      AND tm.user_id = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = fixtures.tournament_id
      AND t.host_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Matches visible to tournament members" ON matches;
CREATE POLICY "Matches visible to tournament members"
  ON matches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tournament_members tm
      WHERE tm.tournament_id = matches.tournament_id
      AND tm.user_id = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = matches.tournament_id
      AND t.host_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Ball events visible to tournament members" ON ball_events;
CREATE POLICY "Ball events visible to tournament members"
  ON ball_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tournament_members tm
      WHERE tm.tournament_id = ball_events.tournament_id
      AND tm.user_id = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = ball_events.tournament_id
      AND t.host_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Points table visible to tournament members" ON points_table;
CREATE POLICY "Points table visible to tournament members"
  ON points_table FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tournament_members tm
      WHERE tm.tournament_id = points_table.tournament_id
      AND tm.user_id = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = points_table.tournament_id
      AND t.host_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Player stats visible to tournament members" ON player_tournament_stats;
CREATE POLICY "Player stats visible to tournament members"
  ON player_tournament_stats FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tournament_members tm
      WHERE tm.tournament_id = player_tournament_stats.tournament_id
      AND tm.user_id = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = player_tournament_stats.tournament_id
      AND t.host_id = auth.uid()::text
    )
  );

