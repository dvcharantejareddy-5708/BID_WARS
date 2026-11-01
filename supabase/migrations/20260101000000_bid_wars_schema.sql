-- ==============================================================================
-- BID WARS: REAL-TIME MULTIPLAYER IPL AUCTION GAME (2026 EDITION)
-- SUPABASE POSTGRESQL SCHEMA & STORED PROCEDURES
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. AUCTION SEASONS
CREATE TABLE IF NOT EXISTS auction_seasons (
    year INT PRIMARY KEY,
    name TEXT NOT NULL,
    default_purse BIGINT NOT NULL DEFAULT 1200000000, -- 120 Crore INR
    min_squad INT NOT NULL DEFAULT 18,
    max_squad INT NOT NULL DEFAULT 25,
    max_overseas INT NOT NULL DEFAULT 8,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO auction_seasons (year, name, default_purse, min_squad, max_squad, max_overseas, is_active)
VALUES 
    (2026, 'IPL 2026 Auction', 1200000000, 18, 25, 8, true),
    (2025, 'IPL 2025 Mega Auction', 1200000000, 18, 25, 8, false)
ON CONFLICT (year) DO NOTHING;

-- 2. PLAYERS MASTER TABLE
CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    s_no INT NOT NULL,
    name TEXT NOT NULL,
    raw_name TEXT NOT NULL,
    nationality TEXT NOT NULL DEFAULT 'India',
    is_overseas BOOLEAN NOT NULL DEFAULT false,
    primary_role TEXT NOT NULL CHECK (primary_role IN ('BATTER', 'BOWLER', 'ALL_ROUNDER')),
    category TEXT NOT NULL CHECK (category IN ('Batsmen', 'All-rounders', 'Bowlers', 'Wicket-keepers')),
    is_wicketkeeper BOOLEAN NOT NULL DEFAULT false,
    year INT NOT NULL REFERENCES auction_seasons(year),
    base_price_inr BIGINT NOT NULL,
    base_price_display TEXT NOT NULL,
    set_code TEXT NOT NULL,
    set_name TEXT NOT NULL,
    set_order INT NOT NULL,
    is_marquee BOOLEAN NOT NULL DEFAULT false,
    is_retained BOOLEAN NOT NULL DEFAULT false,
    eligibility TEXT NOT NULL CHECK (eligibility IN ('auction_eligible', 'retained')),
    image_url TEXT,
    image_source TEXT,
    verification_status TEXT NOT NULL DEFAULT 'VERIFIED_OFFICIAL_DOCUMENT',
    data_source TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_year ON players(year);
CREATE INDEX IF NOT EXISTS idx_players_category ON players(category);
CREATE INDEX IF NOT EXISTS idx_players_base_price ON players(base_price_inr);
CREATE INDEX IF NOT EXISTS idx_players_set_order ON players(set_order, base_price_inr DESC);

-- 3. ROOMS TABLE
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_code TEXT UNIQUE NOT NULL,
    room_name TEXT NOT NULL,
    host_id TEXT NOT NULL,
    season INT NOT NULL DEFAULT 2026 REFERENCES auction_seasons(year),
    pool_mode TEXT NOT NULL DEFAULT 'auction_pool', -- 'auction_pool' or 'mega_all'
    starting_purse BIGINT NOT NULL DEFAULT 1200000000,
    timer_duration INT NOT NULL DEFAULT 10 CHECK (timer_duration BETWEEN 5 AND 20),
    min_squad INT NOT NULL DEFAULT 18,
    max_squad INT NOT NULL DEFAULT 25,
    max_overseas INT NOT NULL DEFAULT 8,
    min_bid_increment BIGINT NOT NULL DEFAULT 2000000, -- 20 Lakh
    play_mode TEXT NOT NULL DEFAULT 'friends_only', -- 'friends_only' or 'friends_bots'
    bot_count INT NOT NULL DEFAULT 0,
    allow_duplicate_teams BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'LOBBY' CHECK (status IN ('LOBBY', 'AUCTION', 'PAUSED', 'COMPLETED')),
    current_lot_index INT NOT NULL DEFAULT 0,
    deadline_timestamp BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);

-- 4. ROOM MEMBERS (PARTICIPANTS)
CREATE TABLE IF NOT EXISTS room_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL,
    nickname TEXT NOT NULL,
    is_host BOOLEAN NOT NULL DEFAULT false,
    is_ready BOOLEAN NOT NULL DEFAULT false,
    is_bot BOOLEAN NOT NULL DEFAULT false,
    bot_strategy TEXT CHECK (bot_strategy IN ('balanced', 'aggressive', 'budget', 'specialist')),
    connected BOOLEAN NOT NULL DEFAULT true,
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (room_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_room_members_room ON room_members(room_id);

-- 5. ROOM TEAMS (RESERVATION OF IPL FRANCHISES)
CREATE TABLE IF NOT EXISTS room_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL CHECK (team_id IN ('CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'PBKS', 'DC', 'GT', 'LSG')),
    member_id TEXT REFERENCES room_members(id) ON DELETE SET NULL,
    is_bot BOOLEAN NOT NULL DEFAULT false,
    remaining_purse BIGINT NOT NULL,
    reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (room_id, team_id) -- CRITICAL: Guarantees 1 human/bot per franchise per room!
);

CREATE INDEX IF NOT EXISTS idx_room_teams_room ON room_teams(room_id);

-- 6. AUCTION LOTS (ORDER OF PLAYERS IN A ROOM'S AUCTION)
CREATE TABLE IF NOT EXISTS auction_lots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL REFERENCES players(id),
    lot_number INT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'SOLD', 'UNSOLD', 'SKIPPED')),
    current_bid BIGINT NOT NULL DEFAULT 0,
    winning_team TEXT CHECK (winning_team IN ('CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'PBKS', 'DC', 'GT', 'LSG')),
    winning_member_id TEXT,
    sold_price BIGINT,
    started_at TIMESTAMPTZ,
    finalized_at TIMESTAMPTZ,
    UNIQUE (room_id, lot_number)
);

CREATE INDEX IF NOT EXISTS idx_auction_lots_room ON auction_lots(room_id, lot_number);

-- 7. BIDS TABLE
CREATE TABLE IF NOT EXISTS bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    lot_id UUID NOT NULL REFERENCES auction_lots(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL REFERENCES players(id),
    team_id TEXT NOT NULL CHECK (team_id IN ('CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'PBKS', 'DC', 'GT', 'LSG')),
    bidder_name TEXT NOT NULL,
    amount BIGINT NOT NULL,
    is_bot BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bids_lot ON bids(lot_id, created_at DESC);

-- 8. SQUAD PURCHASES
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL CHECK (team_id IN ('CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'PBKS', 'DC', 'GT', 'LSG')),
    player_id TEXT NOT NULL REFERENCES players(id),
    lot_id UUID NOT NULL REFERENCES auction_lots(id),
    amount BIGINT NOT NULL,
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (room_id, player_id) -- Prevents same player from being bought twice in the same room!
);

CREATE INDEX IF NOT EXISTS idx_purchases_room_team ON purchases(room_id, team_id);

-- 9. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    performer TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_room ON audit_logs(room_id, created_at DESC);

-- ==============================================================================
-- ATOMIC STORED PROCEDURES (SERVER-AUTHORITATIVE ENGINE)
-- ==============================================================================

-- Atomic Team Reservation Procedure
CREATE OR REPLACE FUNCTION reserve_franchise(
    p_room_id UUID,
    p_member_id TEXT,
    p_team_id TEXT
) RETURNS JSONB AS $$
DECLARE
    v_existing_team TEXT;
    v_room_status TEXT;
BEGIN
    -- Check room status: must be in LOBBY
    SELECT status INTO v_room_status FROM rooms WHERE id = p_room_id;
    IF v_room_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Room not found');
    END IF;
    IF v_room_status <> 'LOBBY' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Auction has already started. Team selection is locked.');
    END IF;

    -- Release previous reservation for this member in this room
    UPDATE room_teams
    SET member_id = NULL
    WHERE room_id = p_room_id AND member_id = p_member_id;

    -- Try to reserve target franchise
    UPDATE room_teams
    SET member_id = p_member_id, reserved_at = NOW()
    WHERE room_id = p_room_id AND team_id = p_team_id AND member_id IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Franchise already taken by another participant');
    END IF;

    RETURN jsonb_build_object('success', true, 'team_id', p_team_id);
END;
$$ LANGUAGE plpgsql;

-- Atomic Bid Validation and Execution Procedure
CREATE OR REPLACE FUNCTION place_auction_bid(
    p_room_id UUID,
    p_lot_id UUID,
    p_team_id TEXT,
    p_bidder_name TEXT,
    p_bid_amount BIGINT,
    p_is_bot BOOLEAN
) RETURNS JSONB AS $$
DECLARE
    v_lot RECORD;
    v_room RECORD;
    v_player RECORD;
    v_team RECORD;
    v_current_squad_count INT;
    v_current_overseas_count INT;
    v_remaining_purse BIGINT;
    v_min_spend_required BIGINT;
    v_min_reserve_price BIGINT := 3000000; -- 30 Lakh minimum player price
    v_next_deadline BIGINT;
BEGIN
    -- 1. Fetch Room
    SELECT * INTO v_room FROM rooms WHERE id = p_room_id FOR UPDATE;
    IF v_room.status <> 'AUCTION' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Auction is currently not active');
    END IF;

    -- 2. Fetch Lot
    SELECT * INTO v_lot FROM auction_lots WHERE id = p_lot_id FOR UPDATE;
    IF v_lot.status <> 'IN_PROGRESS' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Current lot is not active for bidding');
    END IF;

    -- Check if this team is already the highest bidder
    IF v_lot.winning_team = p_team_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Your team already holds the highest bid');
    END IF;

    -- 3. Fetch Player
    SELECT * INTO v_player FROM players WHERE id = v_lot.player_id;

    -- 4. Fetch Team
    SELECT * INTO v_team FROM room_teams WHERE room_id = p_room_id AND team_id = p_team_id FOR UPDATE;
    v_remaining_purse := v_team.remaining_purse;

    -- 5. Check Bid Amount Validity
    IF v_lot.current_bid = 0 THEN
        IF p_bid_amount < v_player.base_price_inr THEN
            RETURN jsonb_build_object('success', false, 'message', 'Opening bid must meet or exceed base price');
        END IF;
    ELSE
        IF p_bid_amount < (v_lot.current_bid + v_room.min_bid_increment) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Bid does not meet minimum increment requirement');
        END IF;
    END IF;

    -- 6. Check Squad Limits
    SELECT COUNT(*) INTO v_current_squad_count FROM purchases WHERE room_id = p_room_id AND team_id = p_team_id;
    IF v_current_squad_count >= v_room.max_squad THEN
        RETURN jsonb_build_object('success', false, 'message', 'Maximum squad size of 25 reached');
    END IF;

    -- 7. Check Overseas Limit
    IF v_player.is_overseas THEN
        SELECT COUNT(*) INTO v_current_overseas_count 
        FROM purchases pu 
        JOIN players pl ON pu.player_id = pl.id 
        WHERE pu.room_id = p_room_id AND pu.team_id = p_team_id AND pl.is_overseas = true;

        IF v_current_overseas_count >= v_room.max_overseas THEN
            RETURN jsonb_build_object('success', false, 'message', 'Maximum overseas player limit (8) reached');
        END IF;
    END IF;

    -- 8. Mathematical Squad Feasibility Check:
    -- Team must retain enough purse to fill minimum squad (18 players) at minimum base price (30 Lakh)
    -- slots_needed = max(0, min_squad - (current_squad + 1))
    -- min_spend_required = slots_needed * 3000000
    IF (v_room.min_squad - (v_current_squad_count + 1)) > 0 THEN
        v_min_spend_required := (v_room.min_squad - (v_current_squad_count + 1)) * v_min_reserve_price;
    ELSE
        v_min_spend_required := 0;
    END IF;

    IF (v_remaining_purse - p_bid_amount) < v_min_spend_required THEN
        RETURN jsonb_build_object('success', false, 'message', 'Bid rejected: Insufficient funds to legally fulfill minimum 18-player squad requirement');
    END IF;

    -- 9. Record Bid & Update Lot
    INSERT INTO bids (room_id, lot_id, player_id, team_id, bidder_name, amount, is_bot)
    VALUES (p_room_id, p_lot_id, v_player.id, p_team_id, p_bidder_name, p_bid_amount, p_is_bot);

    -- Reset timer deadline
    v_next_deadline := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT + (v_room.timer_duration * 1000);

    UPDATE auction_lots
    SET current_bid = p_bid_amount,
        winning_team = p_team_id,
        winning_member_id = p_bidder_name
    WHERE id = p_lot_id;

    UPDATE rooms
    SET deadline_timestamp = v_next_deadline, updated_at = NOW()
    WHERE id = p_room_id;

    RETURN jsonb_build_object(
        'success', true,
        'amount', p_bid_amount,
        'team_id', p_team_id,
        'bidder_name', p_bidder_name,
        'deadline_timestamp', v_next_deadline
    );
END;
$$ LANGUAGE plpgsql;

-- Finalize Lot Procedure (Atomic Sold / Unsold)
CREATE OR REPLACE FUNCTION finalize_auction_lot(
    p_room_id UUID,
    p_lot_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_lot RECORD;
    v_room RECORD;
    v_winning_team TEXT;
    v_sold_price BIGINT;
BEGIN
    SELECT * INTO v_lot FROM auction_lots WHERE id = p_lot_id FOR UPDATE;
    IF v_lot.status <> 'IN_PROGRESS' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Lot is not in progress');
    END IF;

    IF v_lot.current_bid > 0 AND v_lot.winning_team IS NOT NULL THEN
        -- SOLD
        v_winning_team := v_lot.winning_team;
        v_sold_price := v_lot.current_bid;

        -- Deduct from team purse
        UPDATE room_teams
        SET remaining_purse = remaining_purse - v_sold_price
        WHERE room_id = p_room_id AND team_id = v_winning_team;

        -- Insert into purchases
        INSERT INTO purchases (room_id, team_id, player_id, lot_id, amount)
        VALUES (p_room_id, v_winning_team, v_lot.player_id, p_lot_id, v_sold_price);

        -- Mark Lot as SOLD
        UPDATE auction_lots
        SET status = 'SOLD',
            sold_price = v_sold_price,
            finalized_at = NOW()
        WHERE id = p_lot_id;

        RETURN jsonb_build_object('success', true, 'status', 'SOLD', 'team', v_winning_team, 'price', v_sold_price);
    ELSE
        -- UNSOLD
        UPDATE auction_lots
        SET status = 'UNSOLD',
            finalized_at = NOW()
        WHERE id = p_lot_id;

        RETURN jsonb_build_object('success', true, 'status', 'UNSOLD');
    END IF;
END;
$$ LANGUAGE plpgsql;

