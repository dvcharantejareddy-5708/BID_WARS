-- Migration: 20260102000000_tournament_mode_schema.sql
-- Description: BidWars Complete Persistent Multiplayer Tournament Mode Schema
-- Handles: Profiles, Tournaments, Members (1 team/user constraint), Teams, Fixtures,
--          Match Lineups, Live Hand-Cricket Matches, Ball Events, Points Table & Player Stats.

-- 1. PROFILES (Extends Supabase Auth users / persistent guest accounts)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TOURNAMENTS
CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  host_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'REGISTRATION' CHECK (status IN ('REGISTRATION', 'AUCTION', 'SQUAD_FINALIZATION', 'TOURNAMENT_LIVE', 'PLAYOFFS', 'COMPLETED')),
  teams_count INT NOT NULL CHECK (teams_count IN (4, 6, 8, 10)),
  match_overs INT NOT NULL CHECK (match_overs IN (1, 2, 5, 10, 15, 20)),
  room_code TEXT NOT NULL,
  format_details JSONB DEFAULT '{}'::jsonb,
  winner_franchise_id TEXT,
  runner_up_franchise_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TOURNAMENT MEMBERS (Strictly 1 user per franchise, and 1 team per user in a tournament)
CREATE TABLE IF NOT EXISTS tournament_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_email TEXT,
  user_name TEXT NOT NULL,
  franchise_id TEXT NOT NULL,
  is_host BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_tournament_user UNIQUE (tournament_id, user_id),
  CONSTRAINT uq_tournament_franchise UNIQUE (tournament_id, franchise_id)
);

-- 4. TOURNAMENT TEAMS (Squads, purse, and post-auction stats)
CREATE TABLE IF NOT EXISTS tournament_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  franchise_id TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  purse_remaining NUMERIC DEFAULT 120.0,
  squad_data JSONB DEFAULT '[]'::jsonb,
  playing_xi JSONB DEFAULT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_team_tournament_franchise UNIQUE (tournament_id, franchise_id)
);

-- 5. FIXTURES
CREATE TABLE IF NOT EXISTS fixtures (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  match_number INT NOT NULL,
  round_number INT DEFAULT 1,
  stage TEXT NOT NULL DEFAULT 'GROUP' CHECK (stage IN ('GROUP', 'SEMI_FINAL_1', 'SEMI_FINAL_2', 'QUALIFIER_1', 'ELIMINATOR', 'QUALIFIER_2', 'FINAL')),
  home_franchise_id TEXT NOT NULL,
  away_franchise_id TEXT NOT NULL,
  match_overs INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED')),
  match_id TEXT,
  winner_franchise_id TEXT,
  match_result_summary TEXT,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MATCHES (Server-Authoritative Hand-Cricket Match Instances)
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  fixture_id TEXT NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
  home_franchise_id TEXT NOT NULL,
  away_franchise_id TEXT NOT NULL,
  match_overs INT NOT NULL,
  toss_winner_franchise_id TEXT,
  toss_decision TEXT CHECK (toss_decision IN ('BAT', 'BOWL')),
  current_innings INT NOT NULL DEFAULT 1 CHECK (current_innings IN (1, 2)),
  status TEXT NOT NULL DEFAULT 'TOSS' CHECK (status IN ('TOSS', 'INNINGS_1', 'INNINGS_BREAK', 'INNINGS_2', 'COMPLETED')),
  innings_1_data JSONB DEFAULT '{}'::jsonb,
  innings_2_data JSONB DEFAULT '{}'::jsonb,
  live_state JSONB DEFAULT '{}'::jsonb,
  winner_franchise_id TEXT,
  result_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. MATCH LINEUPS (Match-Specific Playing XI)
CREATE TABLE IF NOT EXISTS match_lineups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  franchise_id TEXT NOT NULL,
  playing_xi JSONB NOT NULL,
  captain_id INT NOT NULL,
  vice_captain_id INT NOT NULL,
  impact_player_id INT,
  is_locked BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_match_team_lineup UNIQUE (match_id, franchise_id)
);

-- 8. BALL EVENTS (Complete Ball-by-Ball Hand-Cricket History)
CREATE TABLE IF NOT EXISTS ball_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
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

-- 9. POINTS TABLE (Auto-updated after every match)
CREATE TABLE IF NOT EXISTS points_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  franchise_id TEXT NOT NULL,
  played INT NOT NULL DEFAULT 0,
  won INT NOT NULL DEFAULT 0,
  lost INT NOT NULL DEFAULT 0,
  tied INT NOT NULL DEFAULT 0,
  nr INT NOT NULL DEFAULT 0,
  points INT NOT NULL DEFAULT 0,
  runs_scored INT NOT NULL DEFAULT 0,
  overs_batted NUMERIC(5, 2) NOT NULL DEFAULT 0,
  runs_conceded INT NOT NULL DEFAULT 0,
  overs_bowled NUMERIC(5, 2) NOT NULL DEFAULT 0,
  nrr NUMERIC(6, 3) NOT NULL DEFAULT 0.000,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_points_tournament_team UNIQUE (tournament_id, franchise_id)
);

-- 10. PLAYER TOURNAMENT STATS (Orange Cap, Purple Cap, MVP tracking)
CREATE TABLE IF NOT EXISTS player_tournament_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
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
  overs_bowled NUMERIC(5, 2) NOT NULL DEFAULT 0,
  maidens INT NOT NULL DEFAULT 0,
  runs_conceded INT NOT NULL DEFAULT 0,
  wickets INT NOT NULL DEFAULT 0,
  economy_rate NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  best_bowling TEXT DEFAULT '-',
  mvp_points NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_player_tournament UNIQUE (tournament_id, player_id)
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_tournament_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_members_user ON tournament_members(user_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_tournament ON fixtures(tournament_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_fixture ON matches(fixture_id);
CREATE INDEX IF NOT EXISTS idx_ball_events_match ON ball_events(match_id, innings);
CREATE INDEX IF NOT EXISTS idx_points_table_tournament ON points_table(tournament_id, points DESC, nrr DESC);
CREATE INDEX IF NOT EXISTS idx_player_stats_runs ON player_tournament_stats(tournament_id, runs DESC);
CREATE INDEX IF NOT EXISTS idx_player_stats_wickets ON player_tournament_stats(tournament_id, wickets DESC);

