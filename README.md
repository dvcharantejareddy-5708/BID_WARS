# 🏏 BID WARS — Real-Time Multiplayer IPL Auction Game (2026 Edition)

> **"BUILD YOUR XI. WIN THE AUCTION."**

**BID WARS** is a real-time multiplayer IPL cricket auction simulator where friends compete live to build their dream squad within official franchise salary caps and squad constraints.

---

## ⚡ Key Highlights & Production Architecture

- **Server-Authoritative Real-Time Engine**: Built with a synchronized WebSocket coordinator and server timestamps (`deadlineTimestamp`). The server is the single source of truth for all timer expirations, bids, purse deductions, squad additions, and lot state transitions.
- **Accurate 532-Player Master List**: Extracted directly from the official 2026 IPL mega auction master document:
  - **532 Total Players**: 8 base-price brackets (₹2 Cr, ₹1.5 Cr, ₹1.25 Cr, ₹1 Cr, ₹75L, ₹50L, ₹40L, ₹30L).
  - **173 Retained (R) Players**: Accurately tagged.
  - **359 Auction Pool Players**: Full open auction pool.
  - **16 Marquee Stars**: Grouped into dedicated **SET -1 — MARQUEE PLAYERS**.
  - **Role Categories**: Batters, Bowlers, All-rounders, with Wicket-keepers as a distinct filterable attribute.
- **Mandatory Flow & Single Franchise Reservation**:
  - `Enter room code` ➔ `Enter player name` ➔ `Select IPL team` ➔ `Confirm selection` ➔ `Enter waiting lobby`.
  - Atomically locks chosen franchise on the server. Exactly **one manager per franchise** per room.
- **Mathematical Squad Reserve Protection**:
  - Prevents bankrupting a franchise before filling the mandatory minimum 18-player squad:
  $$\text{Remaining Purse} - \text{Bid} \ge (18 - (\text{Squad Size} + 1)) \times ₹30\text{ Lakh}$$
- **AI Bot Strategists**:
  - 4 Distinct Strategies: *Balanced Builder*, *Aggressive Buyer*, *Budget Strategist*, *Specialist Hunter*.
  - Bots evaluate lot value, role needs, and budget constraints with realistic human-like decision jitter (1.2s - 3.8s).
- **Host Controls & Audit Trail**:
  - Skip Player (with confirmation modal, zero purse deduction, moves to end-of-auction re-auction pool).
  - Pause & Resume, Restart, and End Auction.
  - Immutable chronological audit ledger of all events.
- **Post-Auction Compliance Audit & CSV Export**:
  - Checks every team for minimum 18 players, maximum 25 players, maximum 8 overseas players, and positive purse.
  - Instant one-click CSV report export.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS.
- **Icons & Graphics**: Lucide React, Canvas Confetti.
- **Audio**: Self-contained Web Audio API synthesizer (digital countdown beeps for final 5 seconds, wooden gavel impact on SOLD, referee whistle on UNSOLD, cash register coin ding on bid).
- **Backend**: Node.js, Express, TypeScript, WebSocket (`ws`).
- **Database / Schema**: Supabase PostgreSQL migration (`supabase/migrations/20260101000000_bid_wars_schema.sql`) with tables, constraints, foreign keys, RLS policies, and stored procedures (`reserve_franchise`, `place_auction_bid`, `finalize_auction_lot`).

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js 18+ and npm installed.

### 2. Install Dependencies
```bash
# Install root, server, and client dependencies
npm --prefix server install
npm --prefix client install
```

### 3. Run Development Servers
In two separate terminals (or with npm concurrently):

**Terminal 1 (Backend WebSocket & API Server on Port 3001):**
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend Client on Port 5173):**
```bash
cd client
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🌐 Testing Real Multiplayer Live

1. Open `http://localhost:5173` in Browser 1 (Host).
2. Click **Create Room**, enter your nickname (e.g., `Dhoni`), configure timer (e.g. 10s), purse (₹120 Cr), and click **Launch Auction Room**.
3. Select an open franchise (e.g., **CSK**). You will enter the **Waiting Lobby** with your unique 6-character room code (e.g., `BW-7821`).
4. Copy the room code or click **Copy Invite Link**.
5. Open an Incognito window or a second browser (Client 2).
6. Enter the room code, enter nickname (e.g., `Rohit`), and select an open franchise (e.g., **MI**).
7. Notice that **CSK** is disabled and marked as `TAKEN (Dhoni)`.
8. Both users mark **Ready**. Host clicks **Start Auction**.
9. Both browser windows instantly synchronize to the same lot, circular countdown timer, and live bidding feed!

---

## 🧪 Automated Test Suite

Run the automated test suite covering all 24 required game logic scenarios:
```bash
cd server
npx tsx test_suite.ts
```
Results: **46 PASSED, 0 FAILED** (squad feasibility, timer reset, self-bidding rejection, franchise locks, bot logic, host authorization, and audit logs).

Run real-time WebSocket multiplayer integration test:
```bash
cd server
npx tsx test_multiplayer.ts
```

---

## 🗄️ Database Schema & Supabase Deployment

The full PostgreSQL migration is located at:
`supabase/migrations/20260101000000_bid_wars_schema.sql`

To deploy to Supabase:
1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run the SQL migration script.
3. Add your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `.env`.

---

## 🏏 10 Official IPL Franchises

| ID | Franchise Name | Emblem & Motto | Color Scheme |
|---|---|---|---|
| **CSK** | Chennai Super Kings | 🦁 Whistle Podu | Yellow / Navy Blue |
| **MI** | Mumbai Indians | 🌀 One Family | Royal Blue / Gold |
| **RCB** | Royal Challengers Bengaluru | 👑 Play Bold | Crimson Red / Black / Gold |
| **KKR** | Kolkata Knight Riders | ⚔️ Korbo Lorbo Jeetbo | Deep Purple / Gold |
| **SRH** | Sunrisers Hyderabad | 🦅 Orange Army | Sunset Orange / Black |
| **RR** | Rajasthan Royals | 👑 Halla Bol | Hot Pink / Navy Blue |
| **PBKS** | Punjab Kings | 🦁 Sadda Punjab | Crimson / Silver |
| **DC** | Delhi Capitals | 🐯 Roar Macha | Navy Blue / Red |
| **GT** | Gujarat Titans | ⚡ Aava De | Dark Navy / Gold |
| **LSG** | Lucknow Super Giants | 🦅 Ab Apni Baari Hai | Cyan / Blue / Orange |
