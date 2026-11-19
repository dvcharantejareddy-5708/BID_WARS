// server/src/index.ts
import express from "express";
import http from "http";
import path5 from "path";
import fs4 from "fs";
import crypto2 from "crypto";
import { fileURLToPath as fileURLToPath4 } from "url";
import { WebSocketServer } from "ws";
import cors from "cors";
import dotenv2 from "dotenv";

// server/src/roomManager.ts
import { WebSocket } from "ws";

// server/src/gameEngine.ts
import crypto from "crypto";

// server/src/types.ts
var IPL_FRANCHISES = {
  CSK: {
    id: "CSK",
    name: "Chennai Super Kings",
    shortName: "CSK",
    city: "Chennai",
    primaryColor: "#F9CD05",
    secondaryColor: "#005FA2",
    accentColor: "#F9CD05",
    textColor: "#1A1A1A",
    emblemText: "\u{1F981} Whistle Podu",
    logoUrl: "/logos/csk.jpg"
  },
  MI: {
    id: "MI",
    name: "Mumbai Indians",
    shortName: "MI",
    city: "Mumbai",
    primaryColor: "#004BA0",
    secondaryColor: "#D1AB3E",
    accentColor: "#0078FF",
    textColor: "#FFFFFF",
    emblemText: "\u{1F300} One Family",
    logoUrl: "/logos/mi.jpg"
  },
  RCB: {
    id: "RCB",
    name: "Royal Challengers Bengaluru",
    shortName: "RCB",
    city: "Bengaluru",
    primaryColor: "#EC1C24",
    secondaryColor: "#2B2A29",
    accentColor: "#D1AB3E",
    textColor: "#FFFFFF",
    emblemText: "\u{1F451} Play Bold",
    logoUrl: "/logos/rcb.png"
  },
  KKR: {
    id: "KKR",
    name: "Kolkata Knight Riders",
    shortName: "KKR",
    city: "Kolkata",
    primaryColor: "#3A225D",
    secondaryColor: "#D1AB3E",
    accentColor: "#7B42BC",
    textColor: "#FFFFFF",
    emblemText: "\u2694\uFE0F Korbo Lorbo Jeetbo",
    logoUrl: "/logos/kkr.jpg"
  },
  SRH: {
    id: "SRH",
    name: "Sunrisers Hyderabad",
    shortName: "SRH",
    city: "Hyderabad",
    primaryColor: "#F26522",
    secondaryColor: "#000000",
    accentColor: "#FF823A",
    textColor: "#FFFFFF",
    emblemText: "\u{1F985} Orange Army",
    logoUrl: "/logos/srh.jpeg"
  },
  RR: {
    id: "RR",
    name: "Rajasthan Royals",
    shortName: "RR",
    city: "Jaipur",
    primaryColor: "#EA1A85",
    secondaryColor: "#004BA0",
    accentColor: "#FF69B4",
    textColor: "#FFFFFF",
    emblemText: "\u{1F451} Halla Bol",
    logoUrl: "/logos/rr.png"
  },
  PBKS: {
    id: "PBKS",
    name: "Punjab Kings",
    shortName: "PBKS",
    city: "Mohali",
    primaryColor: "#DD1F2D",
    secondaryColor: "#D1AB3E",
    accentColor: "#ED1B24",
    textColor: "#FFFFFF",
    emblemText: "\u{1F981} Sadda Punjab",
    logoUrl: "/logos/pbks.jpeg"
  },
  DC: {
    id: "DC",
    name: "Delhi Capitals",
    shortName: "DC",
    city: "Delhi",
    primaryColor: "#004C97",
    secondaryColor: "#EF1B23",
    accentColor: "#2563EB",
    textColor: "#FFFFFF",
    emblemText: "\u{1F42F} Roar Macha",
    logoUrl: "/logos/dc.jpg"
  },
  GT: {
    id: "GT",
    name: "Gujarat Titans",
    city: "Ahmedabad",
    shortName: "GT",
    primaryColor: "#1B2133",
    secondaryColor: "#D1AB3E",
    accentColor: "#0B4973",
    textColor: "#FFFFFF",
    emblemText: "\u26A1 Aava De",
    logoUrl: "/logos/gt.jpg"
  },
  LSG: {
    id: "LSG",
    name: "Lucknow Super Giants",
    shortName: "LSG",
    city: "Lucknow",
    primaryColor: "#A72056",
    secondaryColor: "#F9CD05",
    accentColor: "#0057B7",
    textColor: "#FFFFFF",
    emblemText: "\u{1F418} Gazab Andaz",
    logoUrl: "/logos/lsg.webp"
  }
};

// server/src/playerService.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
var require2 = createRequire(import.meta.url);
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var getDataPath = (filename) => {
  const candidates = [
    path.join(__dirname, "data", filename),
    path.join(__dirname, "..", "dist", "data", filename),
    path.join(__dirname, "..", "src", "data", filename),
    path.join(__dirname, "..", "data", filename),
    path.join(process.cwd(), "dist", "data", filename),
    path.join(process.cwd(), "server", "dist", "data", filename),
    path.join(process.cwd(), "src", "data", filename),
    path.join(process.cwd(), "server", "src", "data", filename),
    path.join(process.cwd(), "data", filename),
    path.join("/var/task", "server", "dist", "data", filename),
    path.join("/var/task", "dist", "data", filename),
    path.join("/var/task", "server", "src", "data", filename),
    path.join("/var/task", "src", "data", filename)
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
};
function loadDataset(filename) {
  try {
    if (filename === "players2026.json") {
      try {
        return require2("./data/players2026.json");
      } catch {
        return require2("../src/data/players2026.json");
      }
    } else if (filename === "players2025.json") {
      try {
        return require2("./data/players2025.json");
      } catch {
        return require2("../src/data/players2025.json");
      }
    }
  } catch (err) {
  }
  try {
    const p = getDataPath(filename);
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, "utf-8"));
    }
    console.error(`[PlayerService] Dataset file not found at any candidate path: ${filename}`);
  } catch (err) {
    console.error(`[PlayerService] Failed to load dataset ${filename}:`, err);
  }
  return [];
}
var players2026 = loadDataset("players2026.json");
var players2025 = loadDataset("players2025.json");
function getAllPlayers(season = "2026") {
  return season === "2025" ? players2025 : players2026;
}
function getPlayerById(id, season = "2026") {
  const list = getAllPlayers(season);
  return list.find((p) => p.id === id);
}
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function buildAuctionLots(season = "2026", poolMode = "auction_pool", customMarqueeIds = []) {
  let pool = getAllPlayers(season);
  if (poolMode === "auction_pool") {
    pool = pool.filter((p) => !p.is_retained || customMarqueeIds.includes(p.id));
  }
  const priceBrackets = Array.from(new Set(pool.map((p) => p.base_price_inr))).sort((a, b) => b - a);
  const CATEGORY_SEQUENCE = [
    {
      category: "Batters",
      label: "Batters",
      matcher: (p) => {
        if (p.is_wicketkeeper || p.category === "Wicket-keepers") return true;
        return p.primary_role === "BATTER" || p.role === "BATTER" || p.category === "Batsmen";
      }
    },
    {
      category: "All-rounders",
      label: "All-Rounders",
      matcher: (p) => {
        if (p.is_wicketkeeper || p.category === "Wicket-keepers") return false;
        return p.primary_role === "ALL_ROUNDER" || p.role === "ALL_ROUNDER" || p.category === "All-rounders";
      }
    },
    {
      category: "Bowlers",
      label: "Bowlers",
      matcher: (p) => {
        if (p.is_wicketkeeper || p.category === "Wicket-keepers") return false;
        return p.primary_role === "BOWLER" || p.role === "BOWLER" || p.category === "Bowlers";
      }
    }
  ];
  const orderedPlayers = [];
  let setOrderCounter = 0;
  for (const price of priceBrackets) {
    const priceDisplay = price >= 1e7 ? `\u20B9${(price / 1e7).toFixed(2)} Cr` : `\u20B9${(price / 1e5).toFixed(0)} Lakh`;
    for (const cat of CATEGORY_SEQUENCE) {
      const categoryPlayers = pool.filter((p) => {
        if (p.base_price_inr !== price) return false;
        return cat.matcher(p);
      });
      if (categoryPlayers.length === 0) {
        continue;
      }
      setOrderCounter++;
      const setName = `${priceDisplay} ${cat.label}`;
      const randomizedCategoryPlayers = shuffleArray(categoryPlayers);
      randomizedCategoryPlayers.forEach((player) => {
        orderedPlayers.push({
          ...player,
          set_name: setName,
          set_order: setOrderCounter,
          auction_status: "AVAILABLE"
        });
      });
    }
  }
  const total = orderedPlayers.length;
  return orderedPlayers.map((player, idx) => ({
    lotNumber: idx + 1,
    totalLots: total,
    player,
    status: "PENDING",
    currentBid: 0,
    currentBidder: null,
    currentBidderName: null,
    bids: []
  }));
}
function buildTournamentAuctionLots(season = "2026", poolMode = "mega_all") {
  return buildAuctionLots(season, poolMode);
}

// server/src/botEngine.ts
function evaluateBotBid(botMember, teamId, player, currentBid, currentBidder, squad, remainingPurse, settings) {
  if (currentBidder === teamId) {
    return { shouldBid: false, maxWillingToPay: 0, delayMs: 0 };
  }
  if (squad.length >= settings.maxSquad) {
    return { shouldBid: false, maxWillingToPay: 0, delayMs: 0 };
  }
  const currentOverseas = squad.filter((p) => p.is_overseas).length;
  if (player.is_overseas && currentOverseas >= settings.maxOverseas) {
    return { shouldBid: false, maxWillingToPay: 0, delayMs: 0 };
  }
  const nextBid = currentBid === 0 ? player.base_price_inr : currentBid + settings.minBidIncrement;
  const slotsRemainingNeeded = Math.max(0, settings.minSquad - (squad.length + 1));
  const minReserveRequired = slotsRemainingNeeded * 3e6;
  if (remainingPurse - nextBid < minReserveRequired) {
    return { shouldBid: false, maxWillingToPay: 0, delayMs: 0 };
  }
  const strategy = botMember.botStrategy || "balanced";
  const basePrice = player.base_price_inr;
  let multiplier = 1.2;
  const batters = squad.filter((p) => p.primary_role === "BATTER" && !p.is_wicketkeeper).length;
  const bowlers = squad.filter((p) => p.primary_role === "BOWLER").length;
  const allRounders = squad.filter((p) => p.primary_role === "ALL_ROUNDER").length;
  const wks = squad.filter((p) => p.is_wicketkeeper).length;
  let needFactor = 1;
  if (player.is_wicketkeeper) {
    needFactor = wks < 2 ? 1.6 : wks < 3 ? 1.1 : 0.6;
  } else if (player.primary_role === "BATTER") {
    needFactor = batters < 5 ? 1.5 : batters < 7 ? 1.2 : 0.7;
  } else if (player.primary_role === "BOWLER") {
    needFactor = bowlers < 5 ? 1.5 : bowlers < 7 ? 1.2 : 0.7;
  } else if (player.primary_role === "ALL_ROUNDER") {
    needFactor = allRounders < 3 ? 1.6 : allRounders < 5 ? 1.2 : 0.8;
  }
  const marqueeBonus = player.is_marquee ? 1.8 : basePrice >= 2e7 ? 1.4 : 1;
  switch (strategy) {
    case "aggressive":
      multiplier = 2.8 * marqueeBonus * needFactor;
      break;
    case "balanced":
      multiplier = 1.9 * marqueeBonus * needFactor;
      break;
    case "budget":
      multiplier = player.is_marquee ? 1.4 : 1.3 * needFactor;
      break;
    case "specialist":
      if (player.primary_role === "ALL_ROUNDER" || player.primary_role === "BOWLER" && basePrice >= 15e6) {
        multiplier = 2.6 * marqueeBonus;
      } else {
        multiplier = 1.4 * needFactor;
      }
      break;
  }
  const jitter = 0.85 + Math.random() * 0.3;
  let maxWilling = Math.floor(basePrice * multiplier * jitter);
  const absoluteMaxPossible = remainingPurse - minReserveRequired;
  maxWilling = Math.min(maxWilling, absoluteMaxPossible);
  if (!player.is_marquee && maxWilling > remainingPurse * 0.35) {
    maxWilling = Math.floor(remainingPurse * 0.35);
  }
  if (nextBid <= maxWilling) {
    const delayMs = Math.floor(1200 + Math.random() * 2400);
    return { shouldBid: true, maxWillingToPay: maxWilling, delayMs };
  }
  return { shouldBid: false, maxWillingToPay: 0, delayMs: 0 };
}

// server/src/storageService.ts
import fs2 from "fs";
import path3 from "path";
import os from "os";
import { fileURLToPath as fileURLToPath2 } from "url";

// server/src/supabase.ts
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path2 from "path";
dotenv.config({ path: path2.resolve(process.cwd(), "server/.env") });
dotenv.config();
var supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
var anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
var serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
var supabase = null;
var supabaseAdmin = null;
if (supabaseUrl && !supabaseUrl.includes("your-project")) {
  const clientKey = anonKey || serviceRoleKey;
  if (clientKey) {
    try {
      supabase = createClient(supabaseUrl, clientKey);
      console.log("[Supabase] Initialized database client successfully");
    } catch (err) {
      console.warn("[Supabase] Failed to initialize Supabase client:", err);
    }
  }
  if (serviceRoleKey && !serviceRoleKey.includes("your-service")) {
    try {
      supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      console.log("[Supabase] Initialized Admin Service Role client successfully");
    } catch (err) {
      console.warn("[Supabase] Failed to initialize Admin client:", err);
    }
  }
} else {
  console.log("[Engine] Running in high-performance server-authoritative in-memory mode (Zero-config ready)");
}

// server/src/storageService.ts
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path3.dirname(__filename2);
var getStorageFilePath = () => {
  const isServerless2 = Boolean(
    process.env.VERCEL || process.env.VERCEL_ENV || process.env.VERCEL_URL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT
  );
  const defaultDir = isServerless2 ? path3.join(os.tmpdir(), "bidwars_data") : path3.join(process.cwd(), "server", "data");
  if (!fs2.existsSync(defaultDir)) {
    try {
      fs2.mkdirSync(defaultDir, { recursive: true });
    } catch {
    }
  }
  return path3.join(defaultDir, "persisted_rooms.json");
};
var storageFilePath = getStorageFilePath();
var StorageService = class {
  saveTimeout = null;
  pendingRooms = /* @__PURE__ */ new Map();
  roomsCache = /* @__PURE__ */ new Map();
  isLoaded = false;
  constructor() {
    this.init();
  }
  init() {
    try {
      const dir = path3.dirname(storageFilePath);
      if (!fs2.existsSync(dir)) {
        fs2.mkdirSync(dir, { recursive: true });
      }
    } catch (err) {
      console.warn("[Storage] Could not create storage directory:", err);
    }
  }
  /**
   * Load a single persisted room by roomCode
   */
  async loadRoom(roomCode) {
    if (!this.isLoaded) {
      await this.loadAllRooms();
    }
    return this.roomsCache.get(roomCode.toUpperCase());
  }
  /**
   * Load all persisted rooms from durable disk storage and/or Supabase
   */
  async loadAllRooms() {
    this.roomsCache.clear();
    try {
      if (fs2.existsSync(storageFilePath)) {
        const raw = fs2.readFileSync(storageFilePath, "utf-8");
        if (raw.trim()) {
          const list = JSON.parse(raw);
          for (const r of list) {
            if (r.roomCode) this.roomsCache.set(r.roomCode.toUpperCase(), r);
          }
          console.log(`[Storage] Loaded ${this.roomsCache.size} persisted rooms from disk`);
        }
      }
    } catch (err) {
      console.error("[Storage] Error reading persisted rooms from disk:", err);
    }
    const clientToUse = supabaseAdmin || supabase;
    if (clientToUse) {
      try {
        const { data, error } = await clientToUse.from("auction_rooms").select("room_code, state_json, updated_at").limit(100);
        if (!error && data) {
          for (const row of data) {
            const parsed = typeof row.state_json === "string" ? JSON.parse(row.state_json) : row.state_json;
            if (parsed && parsed.roomCode) {
              const code = parsed.roomCode.toUpperCase();
              const diskRoom = this.roomsCache.get(code);
              if (!diskRoom || (parsed.updatedAt || 0) > (diskRoom.updatedAt || 0)) {
                this.roomsCache.set(code, parsed);
              }
            }
          }
          console.log(`[Storage] Synced rooms with Supabase database`);
        }
      } catch (err) {
        console.warn("[Storage] Supabase fetch fallback to disk:", err);
      }
    }
    this.isLoaded = true;
    return Array.from(this.roomsCache.values());
  }
  /**
   * Schedule room state persistence (debounced by 300ms to handle rapid bids)
   */
  saveRoom(room) {
    const updated = {
      ...room,
      updatedAt: Date.now()
    };
    this.pendingRooms.set(room.roomCode, updated);
    this.roomsCache.set(room.roomCode.toUpperCase(), updated);
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.flushToDisk();
    }, 300);
  }
  /**
   * Remove a room permanently (e.g. when closed or deleted)
   */
  deleteRoom(roomCode) {
    this.pendingRooms.delete(roomCode);
    this.roomsCache.delete(roomCode.toUpperCase());
    this.flushToDisk(roomCode);
  }
  /**
   * Write pending room states directly to disk and sync to Supabase
   */
  flushToDisk(deletedRoomCode) {
    try {
      if (deletedRoomCode) {
        this.roomsCache.delete(deletedRoomCode.toUpperCase());
      }
      const list = Array.from(this.roomsCache.values());
      const tempPath = `${storageFilePath}.tmp`;
      fs2.writeFileSync(tempPath, JSON.stringify(list), "utf-8");
      fs2.renameSync(tempPath, storageFilePath);
      const clientToUse = supabaseAdmin || supabase;
      if (clientToUse && this.pendingRooms.size > 0) {
        const toSync = Array.from(this.pendingRooms.values());
        this.pendingRooms.clear();
        for (const item of toSync) {
          Promise.resolve(
            clientToUse.from("auction_rooms").upsert({
              room_code: item.roomCode,
              state_json: item,
              updated_at: (/* @__PURE__ */ new Date()).toISOString()
            })
          ).catch(() => {
          });
        }
      } else {
        this.pendingRooms.clear();
      }
    } catch (err) {
      console.error("[Storage] Error flushing room state to disk:", err);
    }
  }
};
var storageService = new StorageService();

// server/src/gameEngine.ts
var GameRoom = class _GameRoom {
  roomCode;
  settings;
  status = "LOBBY";
  hostId;
  isPrivate = false;
  passwordHash = null;
  members = /* @__PURE__ */ new Map();
  teamPurse = {};
  teamSquads = {};
  lots = [];
  currentLotIndex = 0;
  deadlineTimestamp = null;
  history = [];
  auditLog = [];
  chatMessages = [];
  bidLog = [];
  announcementPhase = "NONE";
  announcementLotNumber = null;
  currentResultId = null;
  reAuctionRound = false;
  isClosed = false;
  kickedMemberIds = /* @__PURE__ */ new Set();
  activeTrade = null;
  tradeHistory = [];
  pausedByTrade = false;
  teamPlayingXI = {};
  postAuctionTradeStatus = "NOT_STARTED";
  postAuctionTradeDeadline = null;
  onAuctionCompletedCallback;
  timerInterval = null;
  botTimeouts = [];
  lotTransitionTimeout = null;
  tradeTimeout = null;
  postAuctionTradeTimeout = null;
  wasAuctionActiveBeforeTrade = false;
  broadcastCallback;
  isProcessingBid = false;
  pauseRemainingMs = null;
  get currentLot() {
    return this.currentLotIndex < this.lots.length ? this.lots[this.currentLotIndex] : null;
  }
  constructor(roomCode, hostNickname, initialSettings, broadcastCallback) {
    this.roomCode = roomCode;
    this.broadcastCallback = broadcastCallback;
    this.isPrivate = Boolean(initialSettings.isPrivate);
    if (this.isPrivate && initialSettings.password !== void 0 && initialSettings.password !== null) {
      const cleanPassword = String(initialSettings.password).trim();
      if (cleanPassword) {
        this.passwordHash = crypto.createHash("sha256").update(cleanPassword).digest("hex");
      }
    }
    this.settings = {
      roomName: initialSettings.roomName || `Auction Room ${roomCode}`,
      isPrivate: this.isPrivate,
      season: initialSettings.season || "2026",
      poolMode: initialSettings.poolMode || "auction_pool",
      startingPurse: initialSettings.startingPurse || 12e8,
      // 120 Cr
      timerDuration: initialSettings.timerDuration || 10,
      minSquad: initialSettings.minSquad || 18,
      maxSquad: initialSettings.maxSquad || 25,
      maxOverseas: 8,
      // Master rule: 8 overseas maximum
      minBidIncrement: initialSettings.minBidIncrement || 2e6,
      // 20 Lakh
      playMode: initialSettings.playMode || "friends_only",
      botCount: initialSettings.botCount || 0,
      allowDuplicateTeams: initialSettings.allowDuplicateTeams || false,
      tradeTimerDuration: initialSettings.tradeTimerDuration || 45,
      tournamentId: initialSettings.tournamentId,
      hostId: initialSettings.hostId,
      hostFranchiseId: initialSettings.hostFranchiseId
    };
    const allTeams = ["CSK", "MI", "RCB", "KKR", "SRH", "RR", "PBKS", "DC", "GT", "LSG"];
    for (const team of allTeams) {
      this.teamPurse[team] = this.settings.startingPurse;
      this.teamSquads[team] = [];
      this.teamPlayingXI[team] = {
        teamId: team,
        playingXIIds: [],
        captainId: null,
        viceCaptainId: null,
        impactPlayerId: null,
        isConfirmed: false
      };
    }
    const hostId = initialSettings.hostId || `mem_${Math.random().toString(36).substring(2, 9)}`;
    this.hostId = hostId;
    this.members.set(hostId, {
      id: hostId,
      nickname: hostNickname,
      teamId: initialSettings.hostFranchiseId || null,
      isHost: true,
      isReady: false,
      isBot: false,
      connected: true,
      lastSeen: Date.now()
    });
    this.addAuditLog("ROOM_CREATED", `Room ${roomCode} created by ${hostNickname}`, hostNickname);
    this.lots = this.settings.tournamentId || this.settings.poolMode === "mega_all" ? buildTournamentAuctionLots(this.settings.season) : buildAuctionLots(this.settings.season, this.settings.poolMode);
  }
  verifyPassword(inputPassword) {
    if (!this.isPrivate) return true;
    if (!this.passwordHash) return true;
    if (inputPassword === void 0 || inputPassword === null) return false;
    const cleanInput = String(inputPassword).trim();
    if (!cleanInput) return false;
    const hash = crypto.createHash("sha256").update(cleanInput).digest("hex");
    return hash === this.passwordHash;
  }
  addAuditLog(action, details, performer) {
    this.auditLog.unshift({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      action,
      details,
      performer
    });
    if (this.auditLog.length > 100) this.auditLog.pop();
  }
  addBidLog(entry) {
    if (entry.isHighest) {
      for (const b of this.bidLog) {
        if (b.type === "BID" && b.isHighest) {
          b.isHighest = false;
        }
      }
    }
    this.bidLog.unshift({
      id: `bidlog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      ...entry
    });
    if (this.bidLog.length > 200) this.bidLog.pop();
  }
  getMember(memberId) {
    return this.members.get(memberId);
  }
  removeMember(memberId) {
    const member = this.members.get(memberId);
    if (!member) return { success: false };
    this.members.delete(memberId);
    this.addAuditLog("USER_LEFT", `${member.nickname} left the room permanently`, member.nickname);
    if (member.isHost) {
      const remainingHuman = Array.from(this.members.values()).find((m) => !m.isBot);
      if (remainingHuman) {
        remainingHuman.isHost = true;
        this.hostId = remainingHuman.id;
        this.addAuditLog("HOST_TRANSFERRED", `${remainingHuman.nickname} is now the room host`, "System");
      } else {
        this.isClosed = true;
        this.clearAllTimers();
        return { success: true, closed: true };
      }
    }
    const hasHumans = Array.from(this.members.values()).some((m) => !m.isBot);
    if (!hasHumans) {
      this.isClosed = true;
      this.clearAllTimers();
      return { success: true, closed: true };
    }
    this.broadcastState();
    return { success: true };
  }
  preRegisterMember(memberId, nickname, franchiseId, isHost = false) {
    if (this.members.has(memberId)) {
      const existing = this.members.get(memberId);
      existing.nickname = nickname.trim().slice(0, 24);
      existing.teamId = franchiseId;
      existing.isHost = isHost || existing.isHost;
      return existing;
    }
    const member = {
      id: memberId,
      nickname: nickname.trim().slice(0, 24),
      teamId: franchiseId,
      isHost,
      isReady: true,
      isBot: false,
      connected: false,
      lastSeen: Date.now()
    };
    this.members.set(memberId, member);
    this.broadcastState();
    return member;
  }
  join(nickname, sessionToken) {
    if (sessionToken && this.kickedMemberIds.has(sessionToken)) {
      throw new Error("You have been removed from this auction room by the host.");
    }
    if (this.settings.tournamentId && sessionToken) {
      if (!this.members.has(sessionToken)) {
        throw new Error("Access denied. You are not a registered participant of this tournament auction.");
      }
    }
    if (sessionToken && this.members.has(sessionToken)) {
      const existing = this.members.get(sessionToken);
      existing.connected = true;
      existing.lastSeen = Date.now();
      if (nickname && nickname.trim()) {
        existing.nickname = nickname.trim().slice(0, 24);
      }
      this.addAuditLog("USER_RECONNECTED", `${existing.nickname} connected`, existing.nickname);
      this.broadcastState();
      return existing;
    }
    if (this.settings.tournamentId) {
      throw new Error("Access denied. Please join this tournament from the Tournament Dashboard.");
    }
    const memberId = sessionToken || `mem_${Math.random().toString(36).substring(2, 9)}`;
    const newMember = {
      id: memberId,
      nickname: nickname.trim().slice(0, 24),
      teamId: null,
      isHost: false,
      isReady: false,
      isBot: false,
      connected: true,
      lastSeen: Date.now()
    };
    this.members.set(memberId, newMember);
    this.addAuditLog("USER_JOINED", `${newMember.nickname} joined the room`, newMember.nickname);
    this.broadcastState();
    return newMember;
    this.broadcastState();
    return newMember;
  }
  selectTeam(memberId, teamId) {
    const member = this.members.get(memberId);
    if (!member) return { success: false, message: "Member not found" };
    if (this.status === "COMPLETED") {
      return { success: false, message: "Auction is completed." };
    }
    if (this.status !== "LOBBY") {
      if (member.teamId && member.teamId !== teamId) {
        return { success: false, message: "Cannot switch teams while auction is in progress." };
      }
    }
    for (const [otherId, other] of this.members.entries()) {
      if (otherId !== memberId && other.teamId === teamId) {
        return {
          success: false,
          message: `${IPL_FRANCHISES[teamId].name} (${teamId}) has already been claimed by ${other.nickname}. Please choose another available franchise.`
        };
      }
    }
    const allTeams = ["CSK", "MI", "RCB", "KKR", "SRH", "RR", "PBKS", "DC", "GT", "LSG"];
    const claimedTeams = /* @__PURE__ */ new Set();
    for (const [otherId, other] of this.members.entries()) {
      if (otherId !== memberId && other.teamId) {
        claimedTeams.add(other.teamId);
      }
    }
    if (claimedTeams.size >= allTeams.length && !claimedTeams.has(teamId)) {
      return { success: false, message: "The auction room is full. All 10 franchises have already been claimed." };
    }
    const oldTeam = member.teamId;
    member.teamId = teamId;
    this.addAuditLog(
      "TEAM_SELECTED",
      `${member.nickname} selected ${IPL_FRANCHISES[teamId].name} (${teamId})` + (oldTeam ? ` (released ${oldTeam})` : ""),
      member.nickname
    );
    this.addBidLog({
      type: "EVENT",
      eventAction: "TEAM_SELECTED",
      teamId,
      teamName: IPL_FRANCHISES[teamId].name,
      bidderName: member.nickname,
      eventMessage: `${member.nickname} joined as manager of ${IPL_FRANCHISES[teamId].name} (${teamId})`
    });
    this.broadcastState();
    return { success: true };
  }
  toggleReady(memberId, isReady) {
    const member = this.members.get(memberId);
    if (!member) return { success: false };
    if (!member.teamId && isReady) {
      return { success: false };
    }
    member.isReady = isReady;
    this.broadcastState();
    return { success: true };
  }
  updateSettings(memberId, newSettings) {
    if (memberId !== this.hostId) {
      return { success: false, message: "Only the host can modify room settings" };
    }
    if (this.status !== "LOBBY") {
      if (newSettings.timerDuration !== void 0) {
        this.settings.timerDuration = Math.min(60, Math.max(5, Math.round(Number(newSettings.timerDuration))));
      }
      if (newSettings.minBidIncrement !== void 0) {
        this.settings.minBidIncrement = Math.max(1e5, Math.min(2e7, Number(newSettings.minBidIncrement)));
      }
      this.addAuditLog("SETTINGS_UPDATED", `Host updated auction settings (Timer: ${this.settings.timerDuration}s, Min Increment: \u20B9${(this.settings.minBidIncrement / 1e5).toFixed(0)}L)`, this.members.get(this.hostId)?.nickname || "Host");
      this.broadcastState();
      return { success: true };
    }
    if (newSettings.timerDuration !== void 0) {
      this.settings.timerDuration = Math.min(60, Math.max(5, Math.round(Number(newSettings.timerDuration))));
    }
    if (newSettings.startingPurse !== void 0) {
      this.settings.startingPurse = Math.max(5e8, newSettings.startingPurse);
      const allTeams = ["CSK", "MI", "RCB", "KKR", "SRH", "RR", "PBKS", "DC", "GT", "LSG"];
      for (const t of allTeams) {
        this.teamPurse[t] = this.settings.startingPurse;
      }
    }
    if (newSettings.season !== void 0) this.settings.season = newSettings.season;
    if (newSettings.poolMode !== void 0) this.settings.poolMode = newSettings.poolMode;
    if (newSettings.minSquad !== void 0) this.settings.minSquad = newSettings.minSquad;
    if (newSettings.maxSquad !== void 0) this.settings.maxSquad = newSettings.maxSquad;
    if (newSettings.minBidIncrement !== void 0) this.settings.minBidIncrement = newSettings.minBidIncrement;
    if (newSettings.playMode !== void 0) this.settings.playMode = newSettings.playMode;
    if (newSettings.botCount !== void 0) this.settings.botCount = newSettings.botCount;
    if (newSettings.allowDuplicateTeams !== void 0) this.settings.allowDuplicateTeams = newSettings.allowDuplicateTeams;
    this.addAuditLog("SETTINGS_UPDATED", `Host updated room settings`, this.members.get(this.hostId)?.nickname || "Host");
    this.broadcastState();
    return { success: true };
  }
  addBot(teamId, strategy = "balanced") {
    if (this.status !== "LOBBY") return { success: false, message: "Cannot add bots after auction start" };
    for (const member of this.members.values()) {
      if (member.teamId === teamId) {
        return { success: false, message: `${IPL_FRANCHISES[teamId].name} is already occupied` };
      }
    }
    const botId = `bot_${teamId.toLowerCase()}`;
    const botMember = {
      id: botId,
      nickname: `${teamId} Bot [AI]`,
      teamId,
      isHost: false,
      isReady: true,
      isBot: true,
      botStrategy: strategy,
      connected: true,
      lastSeen: Date.now()
    };
    this.members.set(botId, botMember);
    this.addAuditLog("BOT_ADDED", `Added AI Bot (${strategy}) for ${teamId}`, "Host");
    this.broadcastState();
    return { success: true };
  }
  removeBot(teamId) {
    if (this.status !== "LOBBY") return { success: false };
    for (const [id, m] of this.members.entries()) {
      if (m.isBot && m.teamId === teamId) {
        this.members.delete(id);
        this.addAuditLog("BOT_REMOVED", `Removed AI Bot for ${teamId}`, "Host");
        this.broadcastState();
        return { success: true };
      }
    }
    return { success: false };
  }
  startAuction(memberId) {
    if (memberId !== this.hostId) {
      return { success: false, message: "Only the host can start the auction" };
    }
    if (this.status !== "LOBBY") {
      return { success: false, message: "Auction is already started" };
    }
    for (const m of this.members.values()) {
      if (!m.isBot && !m.teamId) {
        return { success: false, message: `Participant "${m.nickname}" has not selected a franchise.` };
      }
    }
    if (this.settings.playMode === "friends_bots") {
      const allTeams = ["CSK", "MI", "RCB", "KKR", "SRH", "RR", "PBKS", "DC", "GT", "LSG"];
      const strategies = ["balanced", "aggressive", "budget", "specialist"];
      const availableTeams = allTeams.filter((t) => ![...this.members.values()].some((m) => m.teamId === t));
      const botsToCreate = Math.min(this.settings.botCount || availableTeams.length, availableTeams.length);
      for (let i = 0; i < botsToCreate; i++) {
        const team = availableTeams[i];
        const strategy = strategies[i % strategies.length];
        this.addBot(team, strategy);
      }
    }
    if (!this.lots || this.lots.length === 0 || this.status === "LOBBY") {
      this.lots = this.settings.tournamentId || this.settings.poolMode === "mega_all" ? buildTournamentAuctionLots(this.settings.season) : buildAuctionLots(this.settings.season, this.settings.poolMode);
    }
    if (this.lots.length === 0) {
      return { success: false, message: "No eligible auction lots found for this season/pool mode" };
    }
    this.status = "AUCTION";
    this.currentLotIndex = 0;
    this.addAuditLog("AUCTION_STARTED", `Auction started with ${this.lots.length} lots.`, "Host");
    this.addBidLog({
      type: "EVENT",
      eventAction: "AUCTION_STARTED",
      eventMessage: `Auction officially started with ${this.lots.length} lots.`
    });
    this.startCurrentLot();
    return { success: true };
  }
  /**
   * SECTION 16: Mandatory Random Player Selection from Current Active Group or Specified Bracket
   * Complies with Section 6 of Specification:
   * - Selects an eligible player randomly from the current active base-price and category group.
   * - Never selects a player from a lower base price before current group is finished.
   * - Never selects a later category before current category is finished.
   * - Never selects sold or previously auctioned players.
   * - Automatically advances category / price group when exhausted.
   */
  drawRandomPlayer(memberId, category, basePriceInr) {
    if (memberId !== this.hostId) {
      return { success: false, message: "Only the host can draw a random player lot" };
    }
    if (this.status !== "AUCTION") {
      return { success: false, message: "Auction must be active to draw lots" };
    }
    const currentActive = this.lots[this.currentLotIndex];
    if (currentActive && currentActive.status === "IN_PROGRESS" && currentActive.currentBid > 0) {
      return {
        success: false,
        message: `Cannot draw a new player while bidding is active on ${currentActive.player.name} (Current Bid: \u20B9${(currentActive.currentBid / 1e7).toFixed(2)} Cr). Wait for lot to conclude.`
      };
    }
    const completedPlayerIds = /* @__PURE__ */ new Set();
    for (const h of this.history) {
      if (h.player?.id) completedPlayerIds.add(h.player.id);
    }
    for (const squad of Object.values(this.teamSquads)) {
      for (const p of squad) {
        if (p?.id) completedPlayerIds.add(p.id);
      }
    }
    const pendingLotsWithIndex = [];
    for (let idx = 0; idx < this.lots.length; idx++) {
      if (idx === this.currentLotIndex && this.lots[idx].status === "IN_PROGRESS") {
        continue;
      }
      const l = this.lots[idx];
      if (l.status === "PENDING" && l.player.auction_status === "AVAILABLE" && !completedPlayerIds.has(l.player.id)) {
        pendingLotsWithIndex.push({ lot: l, index: idx });
      }
    }
    if (pendingLotsWithIndex.length === 0) {
      return { success: false, message: "No eligible remaining unauctioned players in the queue" };
    }
    let targetCandidates = [];
    if (category && basePriceInr) {
      targetCandidates = pendingLotsWithIndex.filter(({ lot: l }) => {
        const matchesCategory = l.player.category === category || category === "Batsmen" && (l.player.primary_role === "BATTER" || l.player.category === "Batsmen" || l.player.category === "Wicket-keepers" || l.player.is_wicketkeeper) || category === "Bowlers" && (l.player.primary_role === "BOWLER" || l.player.category === "Bowlers") && !l.player.is_wicketkeeper && l.player.category !== "Wicket-keepers" || category === "All-rounders" && (l.player.primary_role === "ALL_ROUNDER" || l.player.category === "All-rounders") && !l.player.is_wicketkeeper && l.player.category !== "Wicket-keepers" || category === "Wicket-keepers" && (l.player.is_wicketkeeper || l.player.category === "Wicket-keepers");
        return matchesCategory && l.player.base_price_inr === basePriceInr;
      });
      if (targetCandidates.length === 0) {
        return {
          success: false,
          message: `No remaining eligible players found in ${category} at \u20B9${(basePriceInr / 1e7).toFixed(2)} Cr.`
        };
      }
    } else {
      const activeSetOrder = Math.min(...pendingLotsWithIndex.map(({ lot }) => lot.player.set_order));
      targetCandidates = pendingLotsWithIndex.filter(({ lot }) => lot.player.set_order === activeSetOrder);
      if (targetCandidates.length === 0) {
        targetCandidates = pendingLotsWithIndex;
      }
    }
    const chosen = targetCandidates[Math.floor(Math.random() * targetCandidates.length)];
    const chosenLot = chosen.lot;
    const originalIdx = chosen.index;
    if (currentActive && currentActive.status === "IN_PROGRESS" && currentActive.currentBid === 0) {
      currentActive.status = "PENDING";
    }
    this.lots[originalIdx] = this.lots[this.currentLotIndex];
    this.lots[this.currentLotIndex] = chosenLot;
    this.clearAllTimers();
    this.startCurrentLot();
    this.addAuditLog(
      "RANDOM_LOT_DRAWN",
      `Host randomly drew ${chosenLot.player.name} (${chosenLot.player.set_name})`,
      "Host"
    );
    this.broadcastState();
    return { success: true, lot: chosenLot };
  }
  startCurrentLot() {
    this.clearAllTimers();
    if (this.currentLotIndex >= this.lots.length) {
      this.deadlineTimestamp = null;
      this.announcementPhase = "NONE";
      this.announcementLotNumber = null;
      this.currentResultId = null;
      this.finishAuction(this.hostId);
      return;
    }
    const lot = this.lots[this.currentLotIndex];
    lot.status = "IN_PROGRESS";
    lot.currentBid = 0;
    lot.currentBidder = null;
    lot.currentBidderName = null;
    lot.bids = [];
    this.deadlineTimestamp = Date.now() + this.settings.timerDuration * 1e3;
    this.announcementPhase = "NONE";
    this.announcementLotNumber = null;
    this.currentResultId = null;
    this.addAuditLog(
      "LOT_STARTED",
      `Lot #${lot.lotNumber}: ${lot.player.name} (${lot.player.category}, Base: ${lot.player.base_price_display})`,
      "System"
    );
    this.addBidLog({
      type: "EVENT",
      eventAction: "PLAYER_NOMINATED",
      playerName: lot.player.name,
      lotNumber: lot.lotNumber,
      amount: lot.player.base_price_inr,
      eventMessage: `Lot #${lot.lotNumber}: ${lot.player.name} (${lot.player.category}) nominated at base price ${lot.player.base_price_display}`
    });
    this.startCountdownLoop();
    this.triggerBotBidding();
    this.broadcastState({ type: "NEW_LOT", lot, deadlineTimestamp: this.deadlineTimestamp });
  }
  startCountdownLoop() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.status !== "AUCTION") return;
      if (!this.deadlineTimestamp) return;
      const remainingMs = this.deadlineTimestamp - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1e3));
      if (remainingMs <= 0) {
        this.clearAllTimers();
        this.finalizeCurrentLot();
      } else {
        this.broadcastCallback(null, {
          type: "TIMER_TICK",
          remainingSeconds: remainingSec,
          deadlineTimestamp: this.deadlineTimestamp
        });
      }
    }, 500);
  }
  placeBid(memberId, customAmount) {
    if (this.status !== "AUCTION") {
      return { success: false, message: "Auction is not currently active" };
    }
    if (this.activeTrade || this.pausedByTrade) {
      return { success: false, message: "Auction is currently paused for an active trade review." };
    }
    const member = this.members.get(memberId);
    if (!member) return { success: false, message: "Member not found" };
    if (!member.teamId) return { success: false, message: "You have not selected a franchise" };
    const teamId = member.teamId;
    const lot = this.lots[this.currentLotIndex];
    if (!lot || lot.status !== "IN_PROGRESS") {
      return { success: false, message: "Current lot is not active for bidding" };
    }
    if (this.isProcessingBid) {
      return { success: false, message: "Bid collision detected, please retry" };
    }
    this.isProcessingBid = true;
    try {
      if (lot.currentBidder === teamId) {
        const msg = "Your franchise already holds the highest bid";
        this.addBidLog({
          type: "BID",
          playerName: lot.player.name,
          lotNumber: lot.lotNumber,
          teamId,
          teamName: IPL_FRANCHISES[teamId].name,
          bidderName: member.nickname,
          amount: customAmount || lot.currentBid,
          accepted: false,
          rejectionReason: msg,
          eventMessage: `Bid rejected: ${msg}`
        });
        return { success: false, message: msg };
      }
      const minRequired = lot.currentBid === 0 ? lot.player.base_price_inr : lot.currentBid + this.settings.minBidIncrement;
      const bidAmount = customAmount !== void 0 ? customAmount : minRequired;
      if (bidAmount < minRequired) {
        const msg = `Minimum legal bid is \u20B9${(minRequired / 1e7).toFixed(2)} Cr`;
        this.addBidLog({
          type: "BID",
          playerName: lot.player.name,
          lotNumber: lot.lotNumber,
          teamId,
          teamName: IPL_FRANCHISES[teamId].name,
          bidderName: member.nickname,
          amount: bidAmount,
          accepted: false,
          rejectionReason: msg,
          eventMessage: `Bid rejected: ${msg}`
        });
        return { success: false, message: msg };
      }
      const currentSquad = this.teamSquads[teamId] || [];
      if (currentSquad.length >= this.settings.maxSquad) {
        const msg = `Maximum squad limit of ${this.settings.maxSquad} reached`;
        this.addBidLog({
          type: "BID",
          playerName: lot.player.name,
          lotNumber: lot.lotNumber,
          teamId,
          teamName: IPL_FRANCHISES[teamId].name,
          bidderName: member.nickname,
          amount: bidAmount,
          accepted: false,
          rejectionReason: msg,
          eventMessage: `Bid rejected: ${msg}`
        });
        return { success: false, message: msg };
      }
      if (lot.player.is_overseas) {
        const overseasCount = currentSquad.filter((p) => p.is_overseas).length;
        if (overseasCount >= 8) {
          const msg = "Overseas limit reached. Your team already has 8 overseas players.";
          this.addBidLog({
            type: "BID",
            playerName: lot.player.name,
            lotNumber: lot.lotNumber,
            teamId,
            teamName: IPL_FRANCHISES[teamId].name,
            bidderName: member.nickname,
            amount: bidAmount,
            accepted: false,
            rejectionReason: msg,
            eventMessage: `Bid rejected: ${msg}`
          });
          return { success: false, message: msg };
        }
      }
      const purse = this.teamPurse[teamId] || 0;
      if (bidAmount > purse) {
        const msg = "Insufficient purse balance for this bid";
        this.addBidLog({
          type: "BID",
          playerName: lot.player.name,
          lotNumber: lot.lotNumber,
          teamId,
          teamName: IPL_FRANCHISES[teamId].name,
          bidderName: member.nickname,
          amount: bidAmount,
          accepted: false,
          rejectionReason: msg,
          eventMessage: `Bid rejected: ${msg}`
        });
        return { success: false, message: msg };
      }
      const slotsRemainingNeeded = Math.max(0, this.settings.minSquad - (currentSquad.length + 1));
      const minReserveRequired = slotsRemainingNeeded * 3e6;
      if (purse - bidAmount < minReserveRequired) {
        const msg = `Bid rejected: You must keep at least \u20B9${(minReserveRequired / 1e7).toFixed(2)} Cr in reserve to complete the minimum 18-player squad.`;
        this.addBidLog({
          type: "BID",
          playerName: lot.player.name,
          lotNumber: lot.lotNumber,
          teamId,
          teamName: IPL_FRANCHISES[teamId].name,
          bidderName: member.nickname,
          amount: bidAmount,
          accepted: false,
          rejectionReason: msg,
          eventMessage: msg
        });
        return { success: false, message: msg };
      }
      const bidRecord = {
        bidId: `bid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        lotId: `lot_${lot.lotNumber}`,
        playerId: lot.player.id,
        amount: bidAmount,
        teamId,
        teamName: IPL_FRANCHISES[teamId].name,
        bidderName: member.nickname,
        timestamp: Date.now(),
        isBot: member.isBot
      };
      lot.currentBid = bidAmount;
      lot.currentBidder = teamId;
      lot.currentBidderName = member.nickname;
      lot.bids.unshift(bidRecord);
      this.addBidLog({
        type: "BID",
        playerName: lot.player.name,
        lotNumber: lot.lotNumber,
        teamId,
        teamName: IPL_FRANCHISES[teamId].name,
        bidderName: member.nickname,
        amount: bidAmount,
        accepted: true,
        isHighest: true,
        eventMessage: `Bid of \u20B9${(bidAmount / 1e7).toFixed(2)} Cr placed by ${member.nickname} (${teamId})`
      });
      this.deadlineTimestamp = Date.now() + this.settings.timerDuration * 1e3;
      this.addAuditLog(
        "BID_PLACED",
        `\u20B9${(bidAmount / 1e7).toFixed(2)} Cr by ${member.nickname} (${teamId})`,
        member.nickname
      );
      this.triggerBotBidding();
      const nextMin = bidAmount + this.settings.minBidIncrement;
      this.broadcastCallback(this.getState(), {
        type: "BID_PLACED",
        bid: bidRecord,
        nextMinBid: nextMin,
        deadlineTimestamp: this.deadlineTimestamp
      });
      return { success: true, bid: bidRecord };
    } finally {
      this.isProcessingBid = false;
    }
  }
  triggerBotBidding() {
    for (const timeout of this.botTimeouts) clearTimeout(timeout);
    this.botTimeouts = [];
    if (this.status !== "AUCTION") return;
    const lot = this.lots[this.currentLotIndex];
    if (!lot || lot.status !== "IN_PROGRESS") return;
    for (const member of this.members.values()) {
      if (!member.isBot || !member.teamId) continue;
      const teamId = member.teamId;
      const squad = this.teamSquads[teamId] || [];
      const purse = this.teamPurse[teamId] || 0;
      const decision = evaluateBotBid(
        member,
        teamId,
        lot.player,
        lot.currentBid,
        lot.currentBidder,
        squad,
        purse,
        this.settings
      );
      if (decision.shouldBid) {
        const timeout = setTimeout(() => {
          if (this.status === "AUCTION" && lot.status === "IN_PROGRESS") {
            this.placeBid(member.id);
          }
        }, decision.delayMs);
        this.botTimeouts.push(timeout);
      }
    }
  }
  /**
   * ATOMIC AUTHORITATIVE PURCHASE TRANSACTION
   */
  finalizeCurrentLot() {
    const lot = this.lots[this.currentLotIndex];
    if (!lot) return;
    if (lot.status === "SOLD" || lot.status === "UNSOLD") {
      return;
    }
    if (lot.currentBid > 0 && lot.currentBidder) {
      const winningTeam = lot.currentBidder;
      const winningPrice = lot.currentBid;
      const currentSquad = this.teamSquads[winningTeam] || [];
      const overseasCount = currentSquad.filter((p) => p.is_overseas).length;
      if (lot.player.is_overseas && overseasCount >= 8) {
        lot.status = "UNSOLD";
        this.addAuditLog("PURCHASE_FAILED", `Purchase rejected: ${winningTeam} exceeded 8 overseas players limit.`, "System");
      } else if (currentSquad.length >= this.settings.maxSquad) {
        lot.status = "UNSOLD";
        this.addAuditLog("PURCHASE_FAILED", `Purchase rejected: ${winningTeam} reached maximum 25 squad limit.`, "System");
      } else if (this.teamPurse[winningTeam] < winningPrice) {
        lot.status = "UNSOLD";
        this.addAuditLog("PURCHASE_FAILED", `Purchase rejected: ${winningTeam} has insufficient purse.`, "System");
      } else {
        lot.status = "SOLD";
        lot.soldPrice = winningPrice;
        lot.winningTeam = winningTeam;
        lot.winningTeamName = IPL_FRANCHISES[winningTeam].name;
        lot.winningBidderName = lot.currentBidderName || void 0;
        const resultId = `${this.roomCode}_round${lot.lotNumber}_SOLD_${winningPrice}_${Date.now()}`;
        lot.resultId = resultId;
        this.currentResultId = resultId;
        this.announcementPhase = "ANNOUNCING";
        this.announcementLotNumber = lot.lotNumber;
        lot.player.auction_status = "SOLD";
        lot.player.sold_price_inr = winningPrice;
        lot.player.team_id = winningTeam;
        this.teamPurse[winningTeam] -= winningPrice;
        const allTeams = ["CSK", "MI", "RCB", "KKR", "SRH", "RR", "PBKS", "DC", "GT", "LSG"];
        for (const t of allTeams) {
          if (this.teamSquads[t]) {
            this.teamSquads[t] = this.teamSquads[t].filter((p) => p.id !== lot.player.id);
          }
        }
        const purchasedPlayer = {
          ...lot.player,
          auction_status: "SOLD",
          sold_price_inr: winningPrice,
          team_id: winningTeam
        };
        if (!this.teamSquads[winningTeam]) {
          this.teamSquads[winningTeam] = [];
        }
        this.teamSquads[winningTeam].push(purchasedPlayer);
        this.addAuditLog(
          "PLAYER_SOLD",
          `SOLD: ${lot.player.name} to ${IPL_FRANCHISES[winningTeam].name} (${winningTeam}) for \u20B9${(winningPrice / 1e7).toFixed(2)} Cr`,
          "System"
        );
        this.addBidLog({
          type: "EVENT",
          eventAction: "PLAYER_SOLD",
          playerName: lot.player.name,
          lotNumber: lot.lotNumber,
          teamId: winningTeam,
          teamName: IPL_FRANCHISES[winningTeam].name,
          amount: winningPrice,
          eventMessage: `SOLD: ${lot.player.name} to ${IPL_FRANCHISES[winningTeam].name} (${winningTeam}) for \u20B9${(winningPrice / 1e7).toFixed(2)} Cr`
        });
      }
    } else {
      lot.status = "UNSOLD";
      lot.player.auction_status = "UNSOLD";
      const resultId = `${this.roomCode}_round${lot.lotNumber}_UNSOLD_${Date.now()}`;
      lot.resultId = resultId;
      this.currentResultId = resultId;
      this.announcementPhase = "ANNOUNCING";
      this.announcementLotNumber = lot.lotNumber;
      this.addAuditLog("PLAYER_UNSOLD", `UNSOLD: ${lot.player.name}`, "System");
      this.addBidLog({
        type: "EVENT",
        eventAction: "PLAYER_UNSOLD",
        playerName: lot.player.name,
        lotNumber: lot.lotNumber,
        eventMessage: `UNSOLD: ${lot.player.name}`
      });
    }
    this.history.unshift({ ...lot });
    const summary = this.getTeamSummary();
    this.broadcastState({
      type: "LOT_FINALIZED",
      lot,
      teamPurse: { ...this.teamPurse },
      teamSquads: { ...this.teamSquads },
      teamStats: summary
    });
    this.clearAllTimers();
    this.lotTransitionTimeout = setTimeout(() => {
      if (this.status === "AUCTION") {
        const current = this.lots[this.currentLotIndex];
        if (current && (current.status === "SOLD" || current.status === "UNSOLD")) {
          this.announcementPhase = "NONE";
          this.announcementLotNumber = null;
          this.currentResultId = null;
          this.currentLotIndex++;
          this.startCurrentLot();
        }
      }
    }, 45e3);
  }
  /**
   * Authoritative Next-Lot Advance after speech and visual sequences complete
   * Host-only control when triggered by client; internal server timers pass undefined memberId.
   */
  advanceLot(lotIndex, resultId, memberId) {
    if (this.status !== "AUCTION") return { success: false, message: "Auction is not active" };
    if (memberId && memberId !== this.hostId) {
      return { success: false, message: "Only the host can advance the auction" };
    }
    const lot = this.lots[this.currentLotIndex];
    if (!lot || lot.status !== "SOLD" && lot.status !== "UNSOLD" && lot.status !== "SKIPPED") {
      return { success: false, message: "Current lot is not in completed state" };
    }
    if (resultId && this.currentResultId && resultId !== this.currentResultId) {
      return { success: false, message: "Result ID mismatch" };
    }
    if (lotIndex !== void 0 && lotIndex !== this.currentLotIndex) {
      return { success: false, message: "Lot already advanced" };
    }
    if (this.lotTransitionTimeout) {
      clearTimeout(this.lotTransitionTimeout);
      this.lotTransitionTimeout = null;
    }
    this.announcementPhase = "NONE";
    this.announcementLotNumber = null;
    this.currentResultId = null;
    this.clearAllTimers();
    this.currentLotIndex++;
    this.startCurrentLot();
    return { success: true };
  }
  skipCurrentLot(memberId) {
    if (memberId !== this.hostId) {
      return { success: false, message: "Only the host can skip a player" };
    }
    if (this.status !== "AUCTION") {
      return { success: false, message: "Auction is not active" };
    }
    const lot = this.lots[this.currentLotIndex];
    if (!lot || lot.status !== "IN_PROGRESS") {
      return { success: false, message: "Current lot is not active" };
    }
    this.clearAllTimers();
    lot.status = "SKIPPED";
    lot.player.auction_status = "SKIPPED";
    this.addAuditLog("PLAYER_SKIPPED", `Host skipped lot #${lot.lotNumber}: ${lot.player.name}`, "Host");
    this.addBidLog({
      type: "EVENT",
      eventAction: "PLAYER_SKIPPED",
      playerName: lot.player.name,
      lotNumber: lot.lotNumber,
      eventMessage: `SKIPPED: ${lot.player.name}`
    });
    this.history.unshift({ ...lot });
    const summary = this.getTeamSummary();
    this.broadcastState({
      type: "LOT_FINALIZED",
      lot,
      teamPurse: { ...this.teamPurse },
      teamSquads: { ...this.teamSquads },
      teamStats: summary
    });
    setTimeout(() => {
      if (this.status === "AUCTION") {
        this.currentLotIndex++;
        this.startCurrentLot();
      }
    }, 1500);
    return { success: true };
  }
  pauseAuction(memberId) {
    if (memberId !== this.hostId) {
      return { success: false, message: "Only the host can pause the auction" };
    }
    if (this.status !== "AUCTION") {
      return { success: false, message: "Auction is not active" };
    }
    if (this.deadlineTimestamp) {
      this.pauseRemainingMs = Math.max(0, this.deadlineTimestamp - Date.now());
    }
    this.status = "PAUSED";
    this.clearAllTimers();
    this.addAuditLog("AUCTION_PAUSED", "Auction was paused by the host", "Host");
    this.broadcastState({ type: "AUCTION_PAUSED" });
    return { success: true };
  }
  resumeAuction(memberId) {
    if (memberId !== this.hostId) {
      return { success: false, message: "Only the host can resume the auction" };
    }
    if (this.status !== "PAUSED") {
      return { success: false, message: "Auction is not paused" };
    }
    this.status = "AUCTION";
    const remainingMs = this.pauseRemainingMs || this.settings.timerDuration * 1e3;
    this.deadlineTimestamp = Date.now() + remainingMs;
    this.pauseRemainingMs = null;
    this.addAuditLog("AUCTION_RESUMED", "Auction was resumed by the host", "Host");
    this.startCountdownLoop();
    this.triggerBotBidding();
    this.broadcastState({ type: "AUCTION_RESUMED", deadlineTimestamp: this.deadlineTimestamp });
    return { success: true };
  }
  restartAuction(memberId) {
    if (memberId !== this.hostId) {
      return { success: false, message: "Only the host can restart the auction" };
    }
    this.clearAllTimers();
    if (this.postAuctionTradeTimeout) {
      clearTimeout(this.postAuctionTradeTimeout);
      this.postAuctionTradeTimeout = null;
    }
    this.postAuctionTradeStatus = "NOT_STARTED";
    this.postAuctionTradeDeadline = null;
    const allTeams = ["CSK", "MI", "RCB", "KKR", "SRH", "RR", "PBKS", "DC", "GT", "LSG"];
    for (const team of allTeams) {
      this.teamPurse[team] = this.settings.startingPurse;
      this.teamSquads[team] = [];
      this.teamPlayingXI[team] = {
        teamId: team,
        playingXIIds: [],
        captainId: null,
        viceCaptainId: null,
        impactPlayerId: null,
        isConfirmed: false
      };
    }
    this.status = "LOBBY";
    this.currentLotIndex = 0;
    this.history = [];
    this.deadlineTimestamp = null;
    this.lots = this.settings.tournamentId || this.settings.poolMode === "mega_all" ? buildTournamentAuctionLots(this.settings.season) : buildAuctionLots(this.settings.season, this.settings.poolMode);
    this.addAuditLog("AUCTION_RESTARTED", "Auction was reset to lobby by host with a newly randomized queue", "Host");
    this.broadcastState();
    return { success: true };
  }
  sendChatMessage(memberId, text) {
    const member = this.members.get(memberId);
    if (!member) {
      return { success: false, message: "Member not found in room" };
    }
    const trimmed = text.trim();
    if (!trimmed) {
      return { success: false, message: "Message cannot be empty" };
    }
    if (trimmed.length > 300) {
      return { success: false, message: "Message exceeds 300 characters limit" };
    }
    const chatMsg = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: memberId,
      senderName: member.nickname,
      teamId: member.teamId || void 0,
      text: trimmed,
      timestamp: Date.now()
    };
    this.chatMessages.push(chatMsg);
    if (this.chatMessages.length > 100) {
      this.chatMessages.shift();
    }
    this.broadcastCallback(this.getState(), {
      type: "CHAT_MESSAGE",
      message: chatMsg
    });
    return { success: true, chat: chatMsg };
  }
  finishAuction(memberId) {
    if (!memberId || memberId !== this.hostId) {
      return { success: false, message: "Only the top host can end the auction" };
    }
    this.clearAllTimers();
    this.status = "COMPLETED";
    this.deadlineTimestamp = null;
    this.announcementPhase = "NONE";
    this.announcementLotNumber = null;
    this.currentResultId = null;
    this.postAuctionTradeStatus = "ACTIVE";
    this.postAuctionTradeDeadline = Date.now() + 6e5;
    if (this.postAuctionTradeTimeout) {
      clearTimeout(this.postAuctionTradeTimeout);
    }
    this.postAuctionTradeTimeout = setTimeout(() => {
      this.closePostAuctionTradeWindow();
    }, 6e5);
    this.addAuditLog("AUCTION_COMPLETED", "The auction has concluded! 10-Minute Post-Auction Trade Window is now OPEN.", "Host");
    this.broadcastState({
      type: "AUCTION_COMPLETED",
      summary: this.getTeamSummary(),
      postAuctionTradeDeadline: this.postAuctionTradeDeadline
    });
    if (this.onAuctionCompletedCallback) {
      try {
        this.onAuctionCompletedCallback(this.roomCode);
      } catch (err) {
        console.error(`[AuctionRoom ${this.roomCode}] onAuctionCompletedCallback error:`, err);
      }
    }
    return { success: true };
  }
  closePostAuctionTradeWindow(memberId) {
    if (memberId && memberId !== this.hostId) {
      return { success: false, message: "Only the top host can close the trade window early." };
    }
    if (this.postAuctionTradeTimeout) {
      clearTimeout(this.postAuctionTradeTimeout);
      this.postAuctionTradeTimeout = null;
    }
    this.postAuctionTradeStatus = "CLOSED";
    this.postAuctionTradeDeadline = null;
    if (this.activeTrade && this.activeTrade.status === "PENDING") {
      this.expireTradeRequest(this.activeTrade.id);
    }
    this.addAuditLog("POST_AUCTION_TRADE_CLOSED", "The 10-Minute Post-Auction Trade Window has officially CLOSED. Final squads and Playing XIs locked.", "System");
    this.broadcastState({ type: "POST_AUCTION_TRADE_WINDOW_CLOSED" });
    return { success: true };
  }
  /**
   * Bring all unsold players back into the auction queue
   */
  /**
   * Safe atomic lot insertion helper that preserves the currently active bidding lot
   */
  insertLotsIntoQueue(newLots, wasAtEnd) {
    if (wasAtEnd) {
      const startIndex = this.lots.length;
      this.lots.push(...newLots);
      this.lots.forEach((l, idx) => {
        l.lotNumber = idx + 1;
        l.totalLots = this.lots.length;
      });
      this.currentLotIndex = startIndex;
      this.startCurrentLot();
    } else {
      this.lots.splice(this.currentLotIndex + 1, 0, ...newLots);
      this.lots.forEach((l, idx) => {
        l.lotNumber = idx + 1;
        l.totalLots = this.lots.length;
      });
      this.broadcastState();
    }
  }
  /**
   * Bring all unsold players back into the auction queue
   */
  bringAllUnsoldBack(memberId) {
    if (memberId !== this.hostId) {
      return { success: false, message: "Only the top host can recall unsold players" };
    }
    const soldPlayerIds = /* @__PURE__ */ new Set();
    for (const squad of Object.values(this.teamSquads)) {
      for (const p of squad) {
        soldPlayerIds.add(p.id);
      }
    }
    const queuedPlayerIds = /* @__PURE__ */ new Set();
    for (let i = this.currentLotIndex; i < this.lots.length; i++) {
      const l = this.lots[i];
      if (l && (l.status === "PENDING" || l.status === "IN_PROGRESS")) {
        queuedPlayerIds.add(l.player.id);
      }
    }
    const eligibleUnsoldPlayers = [];
    const seenIds = /* @__PURE__ */ new Set();
    const checkAndAdd = (p) => {
      if (!soldPlayerIds.has(p.id) && !queuedPlayerIds.has(p.id) && !seenIds.has(p.id)) {
        seenIds.add(p.id);
        eligibleUnsoldPlayers.push({
          ...p,
          auction_status: "AVAILABLE"
        });
      }
    };
    for (const lot of this.history) {
      if (lot.status === "UNSOLD" || lot.status === "SKIPPED") checkAndAdd(lot.player);
    }
    for (const lot of this.lots) {
      if (lot.status === "UNSOLD" || lot.status === "SKIPPED") checkAndAdd(lot.player);
    }
    if (eligibleUnsoldPlayers.length === 0) {
      return { success: false, message: "No unsold or skipped players found to bring back." };
    }
    const currentLotsCount = this.lots.length;
    const newLots = eligibleUnsoldPlayers.map((player, idx) => ({
      lotNumber: currentLotsCount + idx + 1,
      totalLots: currentLotsCount + eligibleUnsoldPlayers.length,
      player,
      status: "PENDING",
      currentBid: 0,
      currentBidder: null,
      currentBidderName: null,
      bids: []
    }));
    const wasAtEnd = this.currentLotIndex >= this.lots.length;
    this.insertLotsIntoQueue(newLots, wasAtEnd);
    this.addAuditLog(
      "UNSOLD_PLAYERS_RECALLED",
      `Host brought back all ${newLots.length} unsold & skipped player(s) into the auction pool.`,
      "Host"
    );
    this.addBidLog({
      type: "EVENT",
      eventAction: "UNSOLD_PLAYERS_RECALLED",
      eventMessage: `Host brought back all ${newLots.length} unsold & skipped player(s) into the active auction pool.`
    });
    return { success: true, count: newLots.length, recalledCount: newLots.length };
  }
  /**
   * Random draw from unsold players pool
   */
  randomDrawUnsold(memberId, count, playerIds) {
    if (memberId !== this.hostId) {
      return { success: false, message: "Only the top host can draw unsold players" };
    }
    const soldPlayerIds = /* @__PURE__ */ new Set();
    for (const squad of Object.values(this.teamSquads)) {
      for (const p of squad) {
        soldPlayerIds.add(p.id);
      }
    }
    const queuedPlayerIds = /* @__PURE__ */ new Set();
    for (let i = this.currentLotIndex; i < this.lots.length; i++) {
      const l = this.lots[i];
      if (l && (l.status === "PENDING" || l.status === "IN_PROGRESS")) {
        queuedPlayerIds.add(l.player.id);
      }
    }
    const eligibleUnsoldPlayers = [];
    const seenIds = /* @__PURE__ */ new Set();
    const checkAndAdd = (p) => {
      if (!soldPlayerIds.has(p.id) && !queuedPlayerIds.has(p.id) && !seenIds.has(p.id)) {
        seenIds.add(p.id);
        eligibleUnsoldPlayers.push({
          ...p,
          auction_status: "AVAILABLE"
        });
      }
    };
    for (const lot of this.history) {
      if (lot.status === "UNSOLD" || lot.status === "SKIPPED") checkAndAdd(lot.player);
    }
    for (const lot of this.lots) {
      if (lot.status === "UNSOLD" || lot.status === "SKIPPED") checkAndAdd(lot.player);
    }
    if (eligibleUnsoldPlayers.length === 0) {
      return { success: false, message: "No unsold or skipped players available for random draw." };
    }
    let selectedPlayers = [];
    if (playerIds && playerIds.length > 0) {
      const idSet = new Set(playerIds);
      selectedPlayers = eligibleUnsoldPlayers.filter((p) => idSet.has(p.id));
    } else {
      const numToPick = Math.min(Math.max(1, count), eligibleUnsoldPlayers.length);
      const shuffled = shuffleArray([...eligibleUnsoldPlayers]);
      selectedPlayers = shuffled.slice(0, numToPick);
    }
    if (selectedPlayers.length === 0) {
      return { success: false, message: "No valid unsold or skipped players selected." };
    }
    const currentLotsCount = this.lots.length;
    const newLots = selectedPlayers.map((player, idx) => ({
      lotNumber: currentLotsCount + idx + 1,
      totalLots: currentLotsCount + selectedPlayers.length,
      player,
      status: "PENDING",
      currentBid: 0,
      currentBidder: null,
      currentBidderName: null,
      bids: []
    }));
    const wasAtEnd = this.currentLotIndex >= this.lots.length;
    this.insertLotsIntoQueue(newLots, wasAtEnd);
    this.addAuditLog(
      "UNSOLD_RANDOM_DRAW",
      `Host randomly recalled ${selectedPlayers.length} unsold & skipped player(s): ${selectedPlayers.map((p) => p.name).join(", ")}`,
      "Host"
    );
    this.addBidLog({
      type: "EVENT",
      eventAction: "UNSOLD_RANDOM_DRAW",
      eventMessage: `Host randomly recalled ${selectedPlayers.length} unsold & skipped player(s) into the auction pool.`
    });
    return { success: true, count: selectedPlayers.length, players: selectedPlayers, drawnLots: newLots };
  }
  /**
   * Re-auction a particular individual UNSOLD player (Section 1C)
   */
  reAuctionParticularPlayer(memberId, playerId) {
    if (memberId !== this.hostId) {
      return { success: false, message: "Only the top host can recall players" };
    }
    if (this.status !== "AUCTION" && this.status !== "PAUSED") {
      return { success: false, message: "Auction must be active or paused to recall players" };
    }
    const currentActiveLot = this.lots[this.currentLotIndex];
    if (currentActiveLot && currentActiveLot.player.id === playerId && currentActiveLot.status === "IN_PROGRESS") {
      return { success: false, message: "This player is currently being auctioned in the arena." };
    }
    const alreadyQueued = this.lots.slice(this.currentLotIndex).some(
      (l) => l.player.id === playerId && (l.status === "PENDING" || l.status === "IN_PROGRESS")
    );
    if (alreadyQueued) {
      return { success: false, message: "This player is already in the auction queue." };
    }
    const isSold = Object.values(this.teamSquads).some((squad) => squad.some((p) => p.id === playerId));
    if (isSold) {
      return { success: false, message: "This player is already sold. Use Re-Auction in Sold Players to reverse their sale." };
    }
    let targetPlayer = null;
    for (const lot of this.history) {
      if (lot.player.id === playerId && (lot.status === "UNSOLD" || lot.status === "SKIPPED")) {
        targetPlayer = lot.player;
        break;
      }
    }
    if (!targetPlayer) {
      for (const lot of this.lots) {
        if (lot.player.id === playerId && (lot.status === "UNSOLD" || lot.status === "SKIPPED")) {
          targetPlayer = lot.player;
          break;
        }
      }
    }
    if (!targetPlayer) {
      return { success: false, message: "Player record not found among unsold or skipped players." };
    }
    const freshPlayer = {
      ...targetPlayer,
      auction_status: "AVAILABLE"
    };
    const newLot = {
      lotNumber: this.lots.length + 1,
      totalLots: this.lots.length + 1,
      player: freshPlayer,
      status: "PENDING",
      currentBid: 0,
      currentBidder: null,
      currentBidderName: null,
      bids: []
    };
    const wasAtEnd = this.currentLotIndex >= this.lots.length;
    this.insertLotsIntoQueue([newLot], wasAtEnd);
    this.addAuditLog(
      "UNSOLD_PLAYER_RECALLED",
      `Host returned player ${freshPlayer.name} (${freshPlayer.category}, Base: ${freshPlayer.base_price_display}) to the auction queue.`,
      "Host"
    );
    this.addBidLog({
      type: "EVENT",
      eventAction: "UNSOLD_PLAYER_RECALLED",
      playerName: freshPlayer.name,
      amount: freshPlayer.base_price_inr,
      eventMessage: `Host returned player ${freshPlayer.name} to the auction queue.`
    });
    return { success: true, message: `${freshPlayer.name} has been added to the auction queue!`, lot: newLot };
  }
  /**
   * Re-auction a SOLD player with atomic refund and squad removal (Section 2 & 3)
   */
  reAuctionSoldPlayer(memberId, playerId) {
    if (memberId !== this.hostId) {
      return { success: false, message: "Only the top host can re-auction sold players" };
    }
    if (this.status !== "AUCTION" && this.status !== "PAUSED") {
      return { success: false, message: "Auction must be active or paused to re-auction sold players" };
    }
    if (this.isProcessingBid) {
      return { success: false, message: "A bid transaction is currently being processed. Please retry." };
    }
    const currentActiveLot = this.lots[this.currentLotIndex];
    if (currentActiveLot && currentActiveLot.player.id === playerId && currentActiveLot.status === "IN_PROGRESS") {
      return { success: false, message: "This player is currently being auctioned in the arena." };
    }
    const alreadyQueued = this.lots.slice(this.currentLotIndex).some(
      (l) => l.player.id === playerId && (l.status === "PENDING" || l.status === "IN_PROGRESS")
    );
    if (alreadyQueued) {
      return { success: false, message: "This player is already in the upcoming auction queue." };
    }
    let originalTeamId = null;
    let originalPlayer = null;
    for (const [tId, squad] of Object.entries(this.teamSquads)) {
      const p = squad.find((player) => player.id === playerId);
      if (p) {
        originalTeamId = tId;
        originalPlayer = p;
        break;
      }
    }
    if (!originalTeamId || !originalPlayer) {
      return { success: false, message: "Player is not currently in any team squad." };
    }
    let refundAmount = originalPlayer.sold_price_inr;
    if (!refundAmount || refundAmount <= 0) {
      const hist = this.history.find((h) => h.player.id === playerId && h.winningTeam === originalTeamId && h.status === "SOLD");
      refundAmount = hist?.soldPrice || originalPlayer.base_price_inr;
    }
    const prevPurse = this.teamPurse[originalTeamId] || 0;
    this.teamPurse[originalTeamId] = Math.min(
      this.settings.startingPurse,
      prevPurse + refundAmount
    );
    this.teamSquads[originalTeamId] = this.teamSquads[originalTeamId].filter((p) => p.id !== playerId);
    for (const histLot of this.history) {
      if (histLot.player.id === playerId && histLot.winningTeam === originalTeamId && histLot.status === "SOLD") {
        histLot.status = "REVERSED";
        histLot.reversed = true;
        histLot.reversedAt = Date.now();
        histLot.originalSoldPrice = refundAmount;
        histLot.originalWinningTeam = originalTeamId;
        break;
      }
    }
    const freshPlayer = {
      ...originalPlayer,
      auction_status: "AVAILABLE",
      sold_price_inr: void 0,
      team_id: void 0
    };
    const newLot = {
      lotNumber: this.lots.length + 1,
      totalLots: this.lots.length + 1,
      player: freshPlayer,
      status: "PENDING",
      currentBid: 0,
      currentBidder: null,
      currentBidderName: null,
      bids: []
    };
    const wasAtEnd = this.currentLotIndex >= this.lots.length;
    this.insertLotsIntoQueue([newLot], wasAtEnd);
    this.addAuditLog(
      "SALE_REVERSED",
      `Sale reversed: ${freshPlayer.name} removed from ${IPL_FRANCHISES[originalTeamId].name} (${originalTeamId}). \u20B9${(refundAmount / 1e7).toFixed(2)} Cr refunded.`,
      "Host"
    );
    this.addBidLog({
      type: "EVENT",
      eventAction: "SALE_REVERSED",
      playerName: freshPlayer.name,
      teamId: originalTeamId,
      teamName: IPL_FRANCHISES[originalTeamId].name,
      amount: refundAmount,
      eventMessage: `SALE REVERSED: ${freshPlayer.name} removed from ${IPL_FRANCHISES[originalTeamId].name} and returned to auction pool. \u20B9${(refundAmount / 1e7).toFixed(2)} Cr refunded.`
    });
    return {
      success: true,
      message: `Reversed sale of ${freshPlayer.name}: \u20B9${(refundAmount / 1e7).toFixed(2)} Cr refunded to ${IPL_FRANCHISES[originalTeamId].name}.`,
      refundedTeam: originalTeamId,
      refundAmount,
      lot: newLot
    };
  }
  /**
   * Skip multiple upcoming players
   */
  skipMultipleLots(memberId, count) {
    if (memberId !== this.hostId) {
      return { success: false, message: "Only the host can skip players" };
    }
    if (this.status !== "AUCTION") {
      return { success: false, message: "Auction is not active" };
    }
    const validCount = Math.max(1, count);
    const current = this.lots[this.currentLotIndex];
    let startIndex = this.currentLotIndex;
    if (current && current.status === "IN_PROGRESS" && current.currentBid > 0) {
      startIndex = this.currentLotIndex + 1;
    }
    if (startIndex >= this.lots.length) {
      return { success: false, message: "No upcoming players available to skip." };
    }
    const endIndex = Math.min(this.lots.length, startIndex + validCount);
    const skippedLots = [];
    for (let i = startIndex; i < endIndex; i++) {
      const lot = this.lots[i];
      lot.status = "SKIPPED";
      lot.player.auction_status = "SKIPPED";
      this.history.unshift({ ...lot });
      skippedLots.push(lot);
    }
    this.addAuditLog(
      "MULTIPLE_PLAYERS_SKIPPED",
      `Host skipped ${skippedLots.length} player(s): ${skippedLots.map((l) => l.player.name).join(", ")}`,
      "Host"
    );
    this.addBidLog({
      type: "EVENT",
      eventAction: "MULTIPLE_PLAYERS_SKIPPED",
      eventMessage: `Host skipped ${skippedLots.length} upcoming player lot(s).`
    });
    if (startIndex === this.currentLotIndex) {
      this.clearAllTimers();
      this.currentLotIndex = endIndex;
      this.startCurrentLot();
    } else {
      this.broadcastState();
    }
    return { success: true, skippedCount: skippedLots.length };
  }
  /**
   * Kick participant from room
   */
  kickMember(hostMemberId, targetMemberId) {
    if (hostMemberId !== this.hostId) {
      return { success: false, message: "Only the host can kick participants" };
    }
    if (targetMemberId === this.hostId) {
      return { success: false, message: "Host cannot kick themselves" };
    }
    const target = this.members.get(targetMemberId);
    if (!target) {
      return { success: false, message: "Participant not found in room" };
    }
    this.kickedMemberIds.add(targetMemberId);
    const targetNickname = target.nickname;
    if (this.status === "LOBBY" && target.teamId) {
      target.teamId = null;
    }
    this.members.delete(targetMemberId);
    this.addAuditLog("MEMBER_KICKED", `Host kicked ${targetNickname} from the room`, "Host");
    this.addBidLog({
      type: "EVENT",
      eventAction: "MEMBER_KICKED",
      eventMessage: `Participant "${targetNickname}" was removed from the auction room by the host.`
    });
    this.broadcastState();
    return { success: true, kickedMember: target };
  }
  reAuctionUnsold(memberId) {
    if (memberId !== this.hostId) {
      return { success: false, message: "Only the host can initiate the re-auction round" };
    }
    const unassignedLots = this.lots.filter((l) => l.status === "UNSOLD" || l.status === "SKIPPED");
    if (unassignedLots.length === 0) {
      return { success: false, message: "No unsold or skipped players remaining to re-auction" };
    }
    this.reAuctionRound = true;
    const unassignedPlayers = unassignedLots.map((l) => ({ ...l.player, auction_status: "AVAILABLE" }));
    const priceBrackets = Array.from(new Set(unassignedPlayers.map((p) => p.base_price_inr))).sort((a, b) => b - a);
    const CATEGORY_SEQUENCE = [
      { role: "BATTER", label: "Batsmen" },
      { role: "ALL_ROUNDER", label: "All-Rounders" },
      { role: "BOWLER", label: "Bowlers" }
    ];
    const reorderedPlayers = [];
    let setCounter = 0;
    for (const price of priceBrackets) {
      const priceDisplay = price >= 1e7 ? `\u20B9${(price / 1e7).toFixed(2)} Cr` : `\u20B9${(price / 1e5).toFixed(0)} Lakh`;
      for (const cat of CATEGORY_SEQUENCE) {
        const catPlayers = unassignedPlayers.filter(
          (p) => p.base_price_inr === price && p.primary_role === cat.role
        );
        if (catPlayers.length === 0) continue;
        setCounter++;
        const setName = `Re-Auction: ${priceDisplay} ${cat.label}`;
        const shuffled = shuffleArray(catPlayers);
        shuffled.forEach((p) => {
          reorderedPlayers.push({ ...p, set_name: setName, set_order: setCounter });
        });
      }
    }
    this.lots = reorderedPlayers.map((player, i) => ({
      lotNumber: i + 1,
      totalLots: reorderedPlayers.length,
      player,
      status: "PENDING",
      currentBid: 0,
      currentBidder: null,
      currentBidderName: null,
      bids: []
    }));
    this.currentLotIndex = 0;
    this.status = "AUCTION";
    this.addAuditLog("REAUCTION_INITIATED", `Re-auction started for ${this.lots.length} players`, "Host");
    this.startCurrentLot();
    return { success: true };
  }
  /**
   * LIVE PLAYER TRADING SYSTEM (Multi-Player & Player-Plus-Money Trades)
   */
  createTradeRequest(memberId, payload) {
    if (this.status === "COMPLETED") {
      if (this.postAuctionTradeStatus === "CLOSED") {
        return { success: false, message: "The 10-minute post-auction trading window has permanently closed." };
      }
      if (this.postAuctionTradeStatus !== "ACTIVE") {
        return { success: false, message: "Trading window is not active." };
      }
    } else if (this.status !== "AUCTION" && this.status !== "PAUSED") {
      return { success: false, message: "Trades can only be initiated during an active auction or the post-auction trading window." };
    }
    const sender = this.members.get(memberId);
    if (!sender) return { success: false, message: "Participant not found in room." };
    if (!sender.teamId) return { success: false, message: "You must represent a franchise to initiate a trade." };
    const fromTeamId = sender.teamId;
    const targetTeamId = payload.targetTeamId || payload.toTeamId;
    if (!targetTeamId) {
      return { success: false, message: "Recipient franchise is required." };
    }
    if (fromTeamId === targetTeamId) {
      return { success: false, message: "Cannot initiate a trade with your own franchise." };
    }
    if (this.activeTrade) {
      return { success: false, message: "A trade proposal is already pending review. Please wait for it to resolve." };
    }
    const rawOfferedIds = payload.offeredPlayerIds && payload.offeredPlayerIds.length > 0 ? payload.offeredPlayerIds : payload.offeredPlayerId ? [payload.offeredPlayerId] : [];
    const rawRequestedIds = payload.requestedPlayerIds && payload.requestedPlayerIds.length > 0 ? payload.requestedPlayerIds : payload.requestedPlayerId ? [payload.requestedPlayerId] : [];
    const offeredIds = Array.from(new Set(rawOfferedIds));
    if (offeredIds.length !== rawOfferedIds.length) {
      return { success: false, message: "Duplicate players cannot be selected in the trade offer." };
    }
    const requestedIds = Array.from(new Set(rawRequestedIds));
    if (requestedIds.length !== rawRequestedIds.length) {
      return { success: false, message: "Duplicate players cannot be selected in the trade request." };
    }
    const rawMoney = Math.max(0, payload.moneyAmount || 0);
    if (offeredIds.length === 0 && rawMoney === 0) {
      return { success: false, message: "You must offer at least one player or cash amount." };
    }
    if (requestedIds.length === 0 && rawMoney === 0) {
      return { success: false, message: "You must request at least one player or cash amount." };
    }
    if (offeredIds.length === 0 && requestedIds.length === 0) {
      return { success: false, message: "A trade must involve at least one player." };
    }
    const fromSquad = this.teamSquads[fromTeamId] || [];
    const offeredPlayers = [];
    for (const id of offeredIds) {
      const p = fromSquad.find((pl) => pl.id === id);
      if (!p) {
        return { success: false, message: `The offered player (ID: ${id}) was not found in your squad.` };
      }
      offeredPlayers.push(p);
    }
    const toSquad = this.teamSquads[targetTeamId] || [];
    const requestedPlayers = [];
    for (const id of requestedIds) {
      const p = toSquad.find((pl) => pl.id === id);
      if (!p) {
        return { success: false, message: `The requested player (ID: ${id}) was not found in the recipient squad.` };
      }
      requestedPlayers.push(p);
    }
    const currentLot = this.lots[this.currentLotIndex];
    if (this.status === "AUCTION" && currentLot && currentLot.status === "IN_PROGRESS") {
      const activePlayerId = currentLot.player.id;
      if (offeredIds.includes(activePlayerId) || requestedIds.includes(activePlayerId)) {
        return { success: false, message: "Cannot trade a player currently being auctioned in the live arena." };
      }
    }
    const toMember = Array.from(this.members.values()).find((m) => m.teamId === targetTeamId);
    const postTradeFromSquadSize = fromSquad.length - offeredPlayers.length + requestedPlayers.length;
    if (postTradeFromSquadSize > this.settings.maxSquad) {
      return { success: false, message: `Your franchise would exceed the maximum squad limit of ${this.settings.maxSquad} players (would have ${postTradeFromSquadSize}).` };
    }
    const postTradeToSquadSize = toSquad.length - requestedPlayers.length + offeredPlayers.length;
    if (postTradeToSquadSize > this.settings.maxSquad) {
      return { success: false, message: `Recipient franchise would exceed the maximum squad limit of ${this.settings.maxSquad} players (would have ${postTradeToSquadSize}).` };
    }
    const postTradeFromOverseas = fromSquad.filter((p) => p.is_overseas && !offeredIds.includes(p.id)).length + requestedPlayers.filter((p) => p.is_overseas).length;
    if (postTradeFromOverseas > 8) {
      return { success: false, message: `This trade would cause your squad to exceed the limit of 8 overseas players (would have ${postTradeFromOverseas}).` };
    }
    const postTradeToOverseas = toSquad.filter((p) => p.is_overseas && !requestedIds.includes(p.id)).length + offeredPlayers.filter((p) => p.is_overseas).length;
    if (postTradeToOverseas > 8) {
      return { success: false, message: `This trade would cause recipient squad to exceed the limit of 8 overseas players (would have ${postTradeToOverseas}).` };
    }
    let moneyAmount = void 0;
    let cashPayer = null;
    if (rawMoney > 0) {
      moneyAmount = rawMoney;
      cashPayer = payload.cashPayer || "OFFERING_TEAM";
      if (cashPayer === "OFFERING_TEAM") {
        const senderPurse = this.teamPurse[fromTeamId] || 0;
        if (senderPurse < moneyAmount) {
          return {
            success: false,
            message: `Your franchise has insufficient purse (\u20B9${(senderPurse / 1e7).toFixed(2)} Cr) to pay the cash amount of \u20B9${(moneyAmount / 1e7).toFixed(2)} Cr.`
          };
        }
      } else {
        const targetPurse = this.teamPurse[targetTeamId] || 0;
        if (targetPurse < moneyAmount) {
          return {
            success: false,
            message: `Target franchise has insufficient purse (\u20B9${(targetPurse / 1e7).toFixed(2)} Cr) to pay the requested cash of \u20B9${(moneyAmount / 1e7).toFixed(2)} Cr.`
          };
        }
      }
    }
    let finalTradeType;
    if (moneyAmount && moneyAmount > 0) {
      if (offeredPlayers.length > 0 && requestedPlayers.length > 0) {
        finalTradeType = "PLAYER_PLUS_CASH";
      } else {
        finalTradeType = "PLAYER_FOR_MONEY";
      }
    } else {
      if (offeredPlayers.length > 1 || requestedPlayers.length > 1) {
        finalTradeType = "MULTI_PLAYER";
      } else {
        finalTradeType = "PLAYER_FOR_PLAYER";
      }
    }
    const duration = 45;
    const now = Date.now();
    const tradeId = `trade_${now}_${Math.random().toString(36).substring(2, 7)}`;
    const trade = {
      id: tradeId,
      type: finalTradeType,
      status: "PENDING",
      fromTeamId,
      fromMemberId: sender.id,
      fromMemberName: sender.nickname,
      toTeamId: targetTeamId,
      toMemberId: toMember ? toMember.id : "",
      toMemberName: toMember ? toMember.nickname : IPL_FRANCHISES[targetTeamId].name,
      offeredPlayer: offeredPlayers[0],
      requestedPlayer: requestedPlayers[0],
      offeredPlayers: [...offeredPlayers],
      requestedPlayers: [...requestedPlayers],
      moneyAmount,
      cashPayer,
      createdAt: now,
      expiresAt: now + duration * 1e3
    };
    this.activeTrade = trade;
    if (this.status === "AUCTION") {
      if (this.deadlineTimestamp) {
        this.pauseRemainingMs = Math.max(0, this.deadlineTimestamp - Date.now());
      } else {
        this.pauseRemainingMs = this.settings.timerDuration * 1e3;
      }
      this.status = "PAUSED";
      this.pausedByTrade = true;
      this.wasAuctionActiveBeforeTrade = true;
      this.clearAllTimers();
    } else {
      this.pausedByTrade = true;
      this.wasAuctionActiveBeforeTrade = false;
    }
    if (this.tradeTimeout) clearTimeout(this.tradeTimeout);
    this.tradeTimeout = setTimeout(() => {
      this.expireTradeRequest(trade.id);
    }, duration * 1e3);
    const offNames = offeredPlayers.map((p) => p.name).join(", ") || "No Players";
    const reqNames = requestedPlayers.map((p) => p.name).join(", ") || "No Players";
    let tradeDesc = `${sender.nickname} (${fromTeamId}) proposed trading [${offNames}] for [${reqNames}] with ${trade.toMemberName} (${trade.toTeamId})`;
    if (moneyAmount && cashPayer) {
      const payerName = cashPayer === "OFFERING_TEAM" ? fromTeamId : trade.toTeamId;
      tradeDesc += ` with \u20B9${(moneyAmount / 1e7).toFixed(2)} Cr cash paid by ${payerName}`;
    }
    this.addAuditLog("TRADE_PROPOSED", tradeDesc, sender.nickname);
    this.addBidLog({
      type: "EVENT",
      eventAction: "TRADE_PROPOSED",
      playerName: offeredPlayers[0]?.name || "Cash Trade",
      teamId: fromTeamId,
      teamName: IPL_FRANCHISES[fromTeamId].name,
      amount: moneyAmount || offeredPlayers[0]?.sold_price_inr || offeredPlayers[0]?.base_price_inr,
      eventMessage: `TRADE PROPOSED: ${tradeDesc} (Auction paused for review)`
    });
    this.broadcastState({ type: "TRADE_UPDATE", trade, eventAction: "PROPOSED" });
    return { success: true, trade };
  }
  respondTradeRequest(memberId, tradeId, action, rejectionReason) {
    if (!this.activeTrade || this.activeTrade.id !== tradeId || this.activeTrade.status !== "PENDING") {
      return { success: false, message: "Trade request not found or is no longer active." };
    }
    const responder = this.members.get(memberId);
    if (!responder) return { success: false, message: "Member not found." };
    const isTargetTeam = responder.teamId === this.activeTrade.toTeamId;
    if (!isTargetTeam) {
      return { success: false, message: "Unauthorized: Only the recipient franchise manager can accept or reject this trade." };
    }
    if (this.tradeTimeout) {
      clearTimeout(this.tradeTimeout);
      this.tradeTimeout = null;
    }
    if (action === "REJECT") {
      this.activeTrade.status = "REJECTED";
      this.activeTrade.resolvedAt = Date.now();
      this.activeTrade.resolvedBy = responder.nickname;
      this.activeTrade.rejectionReason = rejectionReason || "Rejected by recipient franchise";
      this.tradeHistory.unshift({ ...this.activeTrade });
      const resolved2 = { ...this.activeTrade };
      this.activeTrade = null;
      this.addAuditLog("TRADE_REJECTED", `Trade rejected by ${responder.nickname}: ${resolved2.rejectionReason}`, responder.nickname);
      this.addBidLog({
        type: "EVENT",
        eventAction: "TRADE_REJECTED",
        playerName: resolved2.offeredPlayers[0]?.name || "Trade",
        teamId: resolved2.toTeamId,
        teamName: IPL_FRANCHISES[resolved2.toTeamId].name,
        eventMessage: `TRADE REJECTED: ${resolved2.toMemberName} rejected trade proposal from ${resolved2.fromMemberName}.`
      });
      this.resumeAuctionFromTrade("Trade proposal rejected.");
      this.broadcastState({ type: "TRADE_UPDATE", trade: resolved2, eventAction: "REJECTED" });
      return { success: true, trade: resolved2 };
    }
    const fromTeamId = this.activeTrade.fromTeamId;
    const toTeamId = this.activeTrade.toTeamId;
    const fromSquad = this.teamSquads[fromTeamId] || [];
    const toSquad = this.teamSquads[toTeamId] || [];
    const offIds = this.activeTrade.offeredPlayers.map((p) => p.id);
    const reqIds = this.activeTrade.requestedPlayers.map((p) => p.id);
    const stillOffered = offIds.every((id) => fromSquad.some((p) => p.id === id));
    if (!stillOffered) {
      this.activeTrade.status = "REJECTED";
      this.activeTrade.rejectionReason = "One or more offered players are no longer in offering team squad";
      this.tradeHistory.unshift({ ...this.activeTrade });
      const resolved2 = { ...this.activeTrade };
      this.activeTrade = null;
      this.resumeAuctionFromTrade("Trade cancelled due to invalid squad state.");
      this.broadcastState({ type: "TRADE_UPDATE", trade: resolved2, eventAction: "REJECTED" });
      return { success: false, message: "One or more offered players are no longer in offering team squad." };
    }
    const stillRequested = reqIds.every((id) => toSquad.some((p) => p.id === id));
    if (!stillRequested) {
      this.activeTrade.status = "REJECTED";
      this.activeTrade.rejectionReason = "One or more requested players are no longer in recipient team squad";
      this.tradeHistory.unshift({ ...this.activeTrade });
      const resolved2 = { ...this.activeTrade };
      this.activeTrade = null;
      this.resumeAuctionFromTrade("Trade cancelled due to invalid squad state.");
      this.broadcastState({ type: "TRADE_UPDATE", trade: resolved2, eventAction: "REJECTED" });
      return { success: false, message: "One or more requested players are no longer in recipient team squad." };
    }
    const postFromSquad = fromSquad.length - offIds.length + reqIds.length;
    const postToSquad = toSquad.length - reqIds.length + offIds.length;
    if (postFromSquad > this.settings.maxSquad || postToSquad > this.settings.maxSquad) {
      return { success: false, message: `Trade violates maximum squad size limit of ${this.settings.maxSquad}.` };
    }
    const fromOverseas = fromSquad.filter((p) => p.is_overseas && !offIds.includes(p.id)).length + this.activeTrade.requestedPlayers.filter((p) => p.is_overseas).length;
    if (fromOverseas > 8) {
      return { success: false, message: "Trade cannot be completed: violates overseas limit of 8 for offering team." };
    }
    const toOverseas = toSquad.filter((p) => p.is_overseas && !reqIds.includes(p.id)).length + this.activeTrade.offeredPlayers.filter((p) => p.is_overseas).length;
    if (toOverseas > 8) {
      return { success: false, message: "Trade cannot be completed: violates overseas limit of 8 for receiving team." };
    }
    const cost = this.activeTrade.moneyAmount || 0;
    const payer = this.activeTrade.cashPayer;
    if (cost > 0 && payer) {
      if (payer === "OFFERING_TEAM") {
        const senderPurse = this.teamPurse[fromTeamId] || 0;
        if (senderPurse < cost) {
          return { success: false, message: "Offering franchise has insufficient purse balance to execute this trade." };
        }
      } else {
        const targetPurse = this.teamPurse[toTeamId] || 0;
        if (targetPurse < cost) {
          return { success: false, message: "Recipient franchise has insufficient purse balance to execute this trade." };
        }
      }
    }
    this.teamSquads[fromTeamId] = fromSquad.filter((p) => !offIds.includes(p.id));
    this.teamSquads[toTeamId] = toSquad.filter((p) => !reqIds.includes(p.id));
    for (const p of this.activeTrade.offeredPlayers) {
      if (!this.teamSquads[toTeamId].some((existing) => existing.id === p.id)) {
        this.teamSquads[toTeamId].push({ ...p, team_id: toTeamId });
      }
      this.sanitizePlayingXIAfterPlayerDeparture(fromTeamId, p.id);
    }
    for (const p of this.activeTrade.requestedPlayers) {
      if (!this.teamSquads[fromTeamId].some((existing) => existing.id === p.id)) {
        this.teamSquads[fromTeamId].push({ ...p, team_id: fromTeamId });
      }
      this.sanitizePlayingXIAfterPlayerDeparture(toTeamId, p.id);
    }
    if (cost > 0 && payer) {
      if (payer === "OFFERING_TEAM") {
        this.teamPurse[fromTeamId] -= cost;
        this.teamPurse[toTeamId] += cost;
      } else {
        this.teamPurse[toTeamId] -= cost;
        this.teamPurse[fromTeamId] += cost;
      }
    }
    this.activeTrade.status = "ACCEPTED";
    this.activeTrade.resolvedAt = Date.now();
    this.activeTrade.resolvedBy = responder.nickname;
    this.tradeHistory.unshift({ ...this.activeTrade });
    const resolved = { ...this.activeTrade };
    this.activeTrade = null;
    const offNames = resolved.offeredPlayers.map((p) => p.name).join(", ") || "No Players";
    const reqNames = resolved.requestedPlayers.map((p) => p.name).join(", ") || "No Players";
    let execDesc = `TRADE COMPLETED: ${IPL_FRANCHISES[fromTeamId].name} traded [${offNames}] to ${IPL_FRANCHISES[toTeamId].name} for [${reqNames}]`;
    if (cost > 0 && payer) {
      const pName = payer === "OFFERING_TEAM" ? IPL_FRANCHISES[fromTeamId].name : IPL_FRANCHISES[toTeamId].name;
      execDesc += ` + \u20B9${(cost / 1e7).toFixed(2)} Cr cash paid by ${pName}`;
    }
    this.addAuditLog("TRADE_ACCEPTED", execDesc, responder.nickname);
    this.addBidLog({
      type: "EVENT",
      eventAction: "TRADE_ACCEPTED",
      playerName: resolved.offeredPlayers[0]?.name || "Trade Executed",
      teamId: toTeamId,
      teamName: IPL_FRANCHISES[toTeamId].name,
      amount: cost,
      eventMessage: execDesc
    });
    this.resumeAuctionFromTrade("Trade proposal accepted and executed.");
    this.broadcastState({ type: "TRADE_UPDATE", trade: resolved, eventAction: "ACCEPTED" });
    return { success: true, trade: resolved };
  }
  cancelTradeRequest(memberId, tradeId, reason) {
    if (!this.activeTrade || this.activeTrade.id !== tradeId || this.activeTrade.status !== "PENDING") {
      return { success: false, message: "Trade request not found or is no longer active." };
    }
    const caller = this.members.get(memberId);
    if (!caller) return { success: false, message: "Participant not found." };
    const isSender = this.activeTrade.fromMemberId === memberId || caller.teamId === this.activeTrade.fromTeamId;
    const isHost = memberId === this.hostId;
    if (!isSender && !isHost) {
      return { success: false, message: "Unauthorized: Only the offering franchise manager or top host can cancel this trade proposal." };
    }
    if (this.tradeTimeout) {
      clearTimeout(this.tradeTimeout);
      this.tradeTimeout = null;
    }
    this.activeTrade.status = "CANCELLED";
    this.activeTrade.resolvedAt = Date.now();
    this.activeTrade.resolvedBy = caller.nickname;
    this.activeTrade.rejectionReason = reason || (isHost ? "Cancelled by Top Host" : "Cancelled by initiator");
    this.tradeHistory.unshift({ ...this.activeTrade });
    const resolved = { ...this.activeTrade };
    this.activeTrade = null;
    this.addAuditLog("TRADE_CANCELLED", `Trade cancelled by ${caller.nickname}`, caller.nickname);
    this.addBidLog({
      type: "EVENT",
      eventAction: "TRADE_CANCELLED",
      playerName: resolved.offeredPlayers[0]?.name || resolved.offeredPlayer?.name || "Trade",
      teamId: resolved.fromTeamId,
      teamName: IPL_FRANCHISES[resolved.fromTeamId].name,
      eventMessage: `TRADE CANCELLED: Trade was cancelled by ${caller.nickname}.`
    });
    this.resumeAuctionFromTrade("Trade request was cancelled.");
    this.broadcastState({ type: "TRADE_UPDATE", trade: resolved, eventAction: "CANCELLED" });
    return { success: true, trade: resolved };
  }
  expireTradeRequest(tradeId) {
    if (!this.activeTrade || this.activeTrade.id !== tradeId || this.activeTrade.status !== "PENDING") {
      return;
    }
    this.tradeTimeout = null;
    this.activeTrade.status = "EXPIRED";
    this.activeTrade.resolvedAt = Date.now();
    this.activeTrade.resolvedBy = "System";
    this.activeTrade.rejectionReason = "Trade decision timer expired";
    this.tradeHistory.unshift({ ...this.activeTrade });
    const resolved = { ...this.activeTrade };
    this.activeTrade = null;
    this.addAuditLog("TRADE_EXPIRED", `Trade expired due to decision timer`, "System");
    this.addBidLog({
      type: "EVENT",
      eventAction: "TRADE_EXPIRED",
      playerName: resolved.offeredPlayers[0]?.name || resolved.offeredPlayer?.name || "Trade",
      teamId: resolved.fromTeamId,
      teamName: IPL_FRANCHISES[resolved.fromTeamId].name,
      eventMessage: `TRADE EXPIRED: Decision timer ran out for trade between ${resolved.fromMemberName} and ${resolved.toMemberName}.`
    });
    this.resumeAuctionFromTrade("Trade decision timer expired.");
    this.broadcastState({ type: "TRADE_UPDATE", trade: resolved, eventAction: "EXPIRED" });
  }
  resumeAuctionFromTrade(reason) {
    this.pausedByTrade = false;
    if (this.wasAuctionActiveBeforeTrade && this.status === "PAUSED") {
      this.wasAuctionActiveBeforeTrade = false;
      this.status = "AUCTION";
      const remainingMs = this.pauseRemainingMs && this.pauseRemainingMs > 0 ? this.pauseRemainingMs : this.settings.timerDuration * 1e3;
      this.deadlineTimestamp = Date.now() + remainingMs;
      this.pauseRemainingMs = null;
      this.startCountdownLoop();
      this.triggerBotBidding();
      this.addAuditLog("AUCTION_RESUMED", `Auction resumed: ${reason}`, "System");
      this.addBidLog({
        type: "EVENT",
        eventAction: "AUCTION_RESUMED",
        eventMessage: `AUCTION RESUMED: Bidding is live again (${Math.ceil(remainingMs / 1e3)}s remaining on current lot).`
      });
    } else {
      this.wasAuctionActiveBeforeTrade = false;
    }
  }
  updateTradeTimer(memberId, durationSeconds) {
    if (memberId !== this.hostId) {
      return { success: false, message: "Only the top host can configure the trade decision timer." };
    }
    const duration = Math.min(120, Math.max(15, durationSeconds));
    this.settings.tradeTimerDuration = duration;
    this.addAuditLog("SETTINGS_UPDATED", `Host set trade decision timer to ${duration}s`, "Host");
    this.broadcastState();
    return { success: true };
  }
  /**
   * Helper to safely remove traded player from Playing XI, Captain, Vice-Captain, or Impact Player
   */
  sanitizePlayingXIAfterPlayerDeparture(teamId, playerId) {
    const xi = this.teamPlayingXI[teamId];
    if (!xi) return;
    let modified = false;
    if (xi.playingXIIds && xi.playingXIIds.includes(playerId)) {
      xi.playingXIIds = xi.playingXIIds.filter((id) => id !== playerId);
      modified = true;
    }
    if (xi.captainId === playerId) {
      xi.captainId = null;
      modified = true;
    }
    if (xi.viceCaptainId === playerId) {
      xi.viceCaptainId = null;
      modified = true;
    }
    if (xi.impactPlayerId === playerId) {
      xi.impactPlayerId = null;
      modified = true;
    }
    if (modified) {
      xi.isConfirmed = false;
      this.addAuditLog("PLAYING_XI_UPDATED", `${IPL_FRANCHISES[teamId].name} Playing XI adjusted due to player trade transfer.`, "System");
    }
  }
  /**
   * Save draft selections for a franchise's Playing XI
   */
  savePlayingXI(memberId, teamId, selection) {
    const member = this.members.get(memberId);
    if (!member) return { success: false, message: "Participant not found." };
    const isOwner = member.teamId === teamId;
    const isHost = memberId === this.hostId;
    if (!isOwner && !isHost) {
      return { success: false, message: "Unauthorized: You can only edit your own franchise Playing XI." };
    }
    const currentXI = this.teamPlayingXI[teamId] || {
      teamId,
      playingXIIds: [],
      captainId: null,
      viceCaptainId: null,
      impactPlayerId: null,
      isConfirmed: false
    };
    if (currentXI.isConfirmed && this.postAuctionTradeStatus === "CLOSED") {
      return { success: false, message: "Playing XI selections are permanently locked after trading window closes." };
    }
    const squad = this.teamSquads[teamId] || [];
    const squadMap = new Map(squad.map((p) => [p.id, p]));
    const newIds = selection.playingXIIds !== void 0 ? selection.playingXIIds : currentXI.playingXIIds;
    for (const pid of newIds) {
      if (!squadMap.has(pid)) {
        return { success: false, message: `Player is not in ${teamId} squad.` };
      }
    }
    const overseasCount = newIds.filter((pid) => squadMap.get(pid)?.is_overseas).length;
    if (overseasCount > 4) {
      return { success: false, message: `Playing XI cannot contain more than 4 overseas players (found ${overseasCount}).` };
    }
    if (newIds.length > 11) {
      return { success: false, message: "Playing XI cannot contain more than 11 players." };
    }
    let capId = selection.captainId !== void 0 ? selection.captainId : currentXI.captainId;
    if (capId && !newIds.includes(capId)) {
      capId = null;
    }
    let vcId = selection.viceCaptainId !== void 0 ? selection.viceCaptainId : currentXI.viceCaptainId;
    if (vcId && (!newIds.includes(vcId) || vcId === capId)) {
      vcId = null;
    }
    let impactId = selection.impactPlayerId !== void 0 ? selection.impactPlayerId : currentXI.impactPlayerId;
    if (impactId && (!squadMap.has(impactId) || newIds.includes(impactId))) {
      impactId = null;
    }
    this.teamPlayingXI[teamId] = {
      teamId,
      playingXIIds: newIds,
      captainId: capId,
      viceCaptainId: vcId,
      impactPlayerId: impactId,
      isConfirmed: false
    };
    this.broadcastState({
      type: "PLAYING_XI_UPDATED",
      teamId,
      selection: this.teamPlayingXI[teamId]
    });
    return { success: true, selection: this.teamPlayingXI[teamId] };
  }
  /**
   * Officially lock and confirm Playing XI for a franchise
   */
  confirmPlayingXI(memberId, teamId) {
    const member = this.members.get(memberId);
    if (!member) return { success: false, message: "Participant not found." };
    const isOwner = member.teamId === teamId;
    const isHost = memberId === this.hostId;
    if (!isOwner && !isHost) {
      return { success: false, message: "Unauthorized: You can only confirm your own franchise Playing XI." };
    }
    const currentXI = this.teamPlayingXI[teamId];
    if (!currentXI) return { success: false, message: "Playing XI not initialized." };
    const squad = this.teamSquads[teamId] || [];
    const squadMap = new Map(squad.map((p) => [p.id, p]));
    if (squad.length < 11) {
      return { success: false, message: `Your squad has only ${squad.length} players. At least 11 players are required to field a Playing XI.` };
    }
    if (currentXI.playingXIIds.length !== 11) {
      return { success: false, message: `Exactly 11 starting players must be selected (currently ${currentXI.playingXIIds.length}/11).` };
    }
    const overseasCount = currentXI.playingXIIds.filter((pid) => squadMap.get(pid)?.is_overseas).length;
    if (overseasCount > 4) {
      return { success: false, message: `Playing XI exceeds the 4 overseas player limit (currently ${overseasCount}/4).` };
    }
    if (!currentXI.captainId) {
      return { success: false, message: "Please select a Captain from your Playing XI." };
    }
    if (!currentXI.playingXIIds.includes(currentXI.captainId)) {
      return { success: false, message: "Captain must be one of the 11 starting players." };
    }
    if (!currentXI.viceCaptainId) {
      return { success: false, message: "Please select a Vice-Captain from your Playing XI." };
    }
    if (!currentXI.playingXIIds.includes(currentXI.viceCaptainId)) {
      return { success: false, message: "Vice-Captain must be one of the 11 starting players." };
    }
    if (currentXI.viceCaptainId === currentXI.captainId) {
      return { success: false, message: "Captain and Vice-Captain must be different players." };
    }
    if (squad.length > 11) {
      if (!currentXI.impactPlayerId) {
        return { success: false, message: "Please select an Impact Player from your bench." };
      }
      if (currentXI.playingXIIds.includes(currentXI.impactPlayerId)) {
        return { success: false, message: "Impact Player must be chosen from the bench outside the Playing XI." };
      }
    }
    currentXI.isConfirmed = true;
    currentXI.confirmedAt = Date.now();
    const capName = squadMap.get(currentXI.captainId)?.name || "Captain";
    this.addAuditLog("PLAYING_XI_CONFIRMED", `${IPL_FRANCHISES[teamId].name} locked their Playing XI (Captain: ${capName}).`, member.nickname);
    this.broadcastState({
      type: "PLAYING_XI_UPDATED",
      teamId,
      selection: currentXI
    });
    return { success: true, selection: currentXI };
  }
  /**
   * Unlock Playing XI for edits prior to window close
   */
  unlockPlayingXI(memberId, teamId) {
    const member = this.members.get(memberId);
    if (!member) return { success: false, message: "Participant not found." };
    const isOwner = member.teamId === teamId;
    const isHost = memberId === this.hostId;
    if (!isOwner && !isHost) {
      return { success: false, message: "Unauthorized." };
    }
    if (this.postAuctionTradeStatus === "CLOSED") {
      return { success: false, message: "Playing XI selections cannot be unlocked after the trading window has closed." };
    }
    const currentXI = this.teamPlayingXI[teamId];
    if (currentXI) {
      currentXI.isConfirmed = false;
      this.broadcastState({
        type: "PLAYING_XI_UPDATED",
        teamId,
        selection: currentXI
      });
    }
    return { success: true };
  }
  clearAllTimers() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.lotTransitionTimeout) {
      clearTimeout(this.lotTransitionTimeout);
      this.lotTransitionTimeout = null;
    }
    for (const timeout of this.botTimeouts) clearTimeout(timeout);
    this.botTimeouts = [];
  }
  getTeamSummary() {
    const allTeams = ["CSK", "MI", "RCB", "KKR", "SRH", "RR", "PBKS", "DC", "GT", "LSG"];
    const summary = {};
    const managers = {};
    for (const m of this.members.values()) {
      if (m.teamId) {
        managers[m.teamId] = { nickname: m.nickname, isBot: m.isBot };
      }
    }
    for (const teamId of allTeams) {
      const squad = this.teamSquads[teamId] || [];
      const spent = this.settings.startingPurse - (this.teamPurse[teamId] || 0);
      const remaining = this.teamPurse[teamId] || 0;
      const overseas = squad.filter((p) => p.is_overseas).length;
      const indian = squad.filter((p) => !p.is_overseas).length;
      const batters = squad.filter((p) => p.primary_role === "BATTER" && !p.is_wicketkeeper).length;
      const bowlers = squad.filter((p) => p.primary_role === "BOWLER").length;
      const allRounders = squad.filter((p) => p.primary_role === "ALL_ROUNDER").length;
      const wks = squad.filter((p) => p.is_wicketkeeper).length;
      const isValid = squad.length >= this.settings.minSquad && squad.length <= this.settings.maxSquad && overseas <= 8 && remaining >= 0;
      const needed = Math.max(0, this.settings.minSquad - squad.length);
      const minSpendRequired = needed * 3e6;
      const squadOvrValues = squad.map((p) => p.ovr || 70);
      const avgSquadOvr = squadOvrValues.length > 0 ? Math.round(squadOvrValues.reduce((a, b) => a + b, 0) / squadOvrValues.length * 10) / 10 : 0;
      const xiIds = this.teamPlayingXI[teamId]?.playingXIIds || [];
      const xiPlayers = squad.filter((p) => xiIds.includes(p.id));
      const xiOvrValues = xiPlayers.map((p) => p.ovr || 70);
      const avgPlayingXIOvr = xiOvrValues.length > 0 ? Math.round(xiOvrValues.reduce((a, b) => a + b, 0) / xiOvrValues.length * 10) / 10 : 0;
      let highestOvrPlayer = null;
      let lowestOvrPlayer = null;
      if (squad.length > 0) {
        const sortedByOvr = [...squad].sort((a, b) => (b.ovr || 0) - (a.ovr || 0));
        const highest = sortedByOvr[0];
        const lowest = sortedByOvr[sortedByOvr.length - 1];
        highestOvrPlayer = { name: highest.name, ovr: highest.ovr || 70, id: highest.id };
        lowestOvrPlayer = { name: lowest.name, ovr: lowest.ovr || 70, id: lowest.id };
      }
      const calcRoleAvg = (players) => {
        if (players.length === 0) return 0;
        return Math.round(players.reduce((sum, p) => sum + (p.ovr || 70), 0) / players.length * 10) / 10;
      };
      const roleOvrBalance = {
        battersAvgOvr: calcRoleAvg(squad.filter((p) => p.primary_role === "BATTER" && !p.is_wicketkeeper)),
        allRoundersAvgOvr: calcRoleAvg(squad.filter((p) => p.primary_role === "ALL_ROUNDER")),
        bowlersAvgOvr: calcRoleAvg(squad.filter((p) => p.primary_role === "BOWLER")),
        wicketKeepersAvgOvr: calcRoleAvg(squad.filter((p) => p.is_wicketkeeper))
      };
      summary[teamId] = {
        teamId,
        teamName: IPL_FRANCHISES[teamId].name,
        managerName: managers[teamId] ? managers[teamId].nickname : null,
        isBot: managers[teamId] ? managers[teamId].isBot : false,
        initialPurse: this.settings.startingPurse,
        totalSpent: spent,
        remainingPurse: remaining,
        squadCount: squad.length,
        indianCount: indian,
        overseasCount: overseas,
        remainingOverseasSlots: Math.max(0, 8 - overseas),
        battersCount: batters,
        bowlersCount: bowlers,
        allRoundersCount: allRounders,
        wicketKeepersCount: wks,
        isValidSquad: isValid,
        minSpendRequired,
        avgSquadOvr,
        avgPlayingXIOvr,
        highestOvrPlayer,
        lowestOvrPlayer,
        roleOvrBalance
      };
    }
    return summary;
  }
  getState() {
    const currentLot = this.currentLotIndex < this.lots.length ? this.lots[this.currentLotIndex] : null;
    const remainingSeconds = this.deadlineTimestamp ? Math.max(0, Math.ceil((this.deadlineTimestamp - Date.now()) / 1e3)) : 0;
    const membersObj = {};
    for (const [id, m] of this.members.entries()) {
      membersObj[id] = { ...m };
    }
    const safeSquads = {};
    const allTeams = ["CSK", "MI", "RCB", "KKR", "SRH", "RR", "PBKS", "DC", "GT", "LSG"];
    for (const t of allTeams) {
      safeSquads[t] = [...this.teamSquads[t] || []];
    }
    return {
      roomCode: this.roomCode,
      status: this.status,
      isPrivate: this.isPrivate,
      settings: { ...this.settings, isPrivate: this.isPrivate },
      hostId: this.hostId,
      members: membersObj,
      teamPurse: { ...this.teamPurse },
      teamSquads: safeSquads,
      teamStats: this.getTeamSummary(),
      teamPlayingXI: { ...this.teamPlayingXI },
      currentLotIndex: this.currentLotIndex,
      currentLot: currentLot ? { ...currentLot, bids: [...currentLot.bids] } : null,
      deadlineTimestamp: this.deadlineTimestamp,
      remainingSeconds,
      history: [...this.history],
      auditLog: [...this.auditLog],
      chatMessages: [...this.chatMessages],
      bidLog: [...this.bidLog],
      announcementPhase: this.announcementPhase,
      announcementLotNumber: this.announcementLotNumber || void 0,
      currentResultId: this.currentResultId,
      poolSize: this.lots.length,
      totalSets: this.lots.length > 0 ? Math.max(...this.lots.map((l) => l.player.set_order)) : 1,
      currentSetOrder: currentLot ? currentLot.player.set_order : 1,
      currentSetName: currentLot ? currentLot.player.set_name : "\u20B92.00 Cr Batsmen",
      kickedMemberIds: Array.from(this.kickedMemberIds),
      activeTrade: this.activeTrade ? { ...this.activeTrade } : null,
      tradeHistory: [...this.tradeHistory],
      pausedByTrade: this.pausedByTrade,
      postAuctionTradeStatus: this.postAuctionTradeStatus,
      postAuctionTradeDeadline: this.postAuctionTradeDeadline,
      lots: this.lots
    };
  }
  broadcastState(eventMsg) {
    storageService.saveRoom(this.toJSON());
    this.broadcastCallback(this.getState(), eventMsg);
  }
  toJSON() {
    return {
      roomCode: this.roomCode,
      hostNickname: this.members.get(this.hostId)?.nickname || "Host",
      hostId: this.hostId,
      settings: this.settings,
      status: this.status,
      isPrivate: this.isPrivate,
      passwordHash: this.passwordHash,
      members: Array.from(this.members.values()),
      teamPurse: { ...this.teamPurse },
      teamSquads: { ...this.teamSquads },
      currentLotIndex: this.currentLotIndex,
      lots: this.lots,
      history: this.history,
      auditLog: this.auditLog,
      chatMessages: this.chatMessages,
      bidLog: this.bidLog,
      activeTrade: this.activeTrade,
      tradeHistory: this.tradeHistory,
      pausedByTrade: this.pausedByTrade,
      teamPlayingXI: { ...this.teamPlayingXI },
      postAuctionTradeStatus: this.postAuctionTradeStatus,
      postAuctionTradeDeadline: this.postAuctionTradeDeadline,
      kickedMemberIds: Array.from(this.kickedMemberIds),
      updatedAt: Date.now()
    };
  }
  static fromJSON(data, broadcastCallback) {
    const room = new _GameRoom(data.roomCode, data.hostNickname, data.settings, broadcastCallback);
    room.hostId = data.hostId;
    room.status = data.status || "LOBBY";
    room.isPrivate = Boolean(data.isPrivate);
    room.passwordHash = data.passwordHash || null;
    room.teamPurse = data.teamPurse || room.teamPurse;
    room.teamSquads = data.teamSquads || room.teamSquads;
    room.currentLotIndex = data.currentLotIndex || 0;
    if (data.lots && data.lots.length > 0) {
      room.lots = data.lots;
    }
    room.history = data.history || [];
    room.auditLog = data.auditLog || [];
    room.chatMessages = data.chatMessages || [];
    room.bidLog = data.bidLog || [];
    room.activeTrade = data.activeTrade || null;
    room.tradeHistory = data.tradeHistory || [];
    room.pausedByTrade = Boolean(data.pausedByTrade);
    if (data.teamPlayingXI) {
      room.teamPlayingXI = data.teamPlayingXI;
    }
    room.postAuctionTradeStatus = data.postAuctionTradeStatus || "NOT_STARTED";
    room.postAuctionTradeDeadline = data.postAuctionTradeDeadline || null;
    if (room.postAuctionTradeStatus === "ACTIVE" && room.postAuctionTradeDeadline) {
      const remainingMs = room.postAuctionTradeDeadline - Date.now();
      if (remainingMs > 0) {
        room.postAuctionTradeTimeout = setTimeout(() => {
          room.closePostAuctionTradeWindow();
        }, remainingMs);
      } else {
        room.closePostAuctionTradeWindow();
      }
    }
    room.kickedMemberIds = new Set(data.kickedMemberIds || []);
    room.members.clear();
    if (data.members) {
      for (const m of data.members) {
        room.members.set(m.id, { ...m, connected: false });
      }
    }
    if (room.status === "AUCTION") {
      const current = room.lots[room.currentLotIndex];
      if (current && current.status === "IN_PROGRESS") {
        room.deadlineTimestamp = Date.now() + room.settings.timerDuration * 1e3;
        room.startCountdownLoop();
      }
    }
    return room;
  }
};

// server/src/roomManager.ts
var RoomManager = class {
  rooms = /* @__PURE__ */ new Map();
  connections = /* @__PURE__ */ new Map();
  onAuctionCompletedListeners = [];
  onPlayingXIUpdatedListeners = [];
  constructor() {
  }
  addAuctionCompletedListener(listener) {
    this.onAuctionCompletedListeners.push(listener);
  }
  addPlayingXIUpdatedListener(listener) {
    this.onPlayingXIUpdatedListeners.push(listener);
  }
  triggerPlayingXIUpdated(roomCode, tournamentId, teamId, selection) {
    for (const listener of this.onPlayingXIUpdatedListeners) {
      try {
        listener(roomCode, tournamentId, teamId, selection);
      } catch (err) {
        console.error(`[RoomManager] PlayingXI listener error:`, err);
      }
    }
  }
  triggerAuctionCompleted(roomCode) {
    for (const listener of this.onAuctionCompletedListeners) {
      try {
        listener(roomCode);
      } catch (err) {
        console.error(`[RoomManager] Auction completed listener error for ${roomCode}:`, err);
      }
    }
  }
  async loadPersistedRooms() {
    try {
      const persisted = await storageService.loadAllRooms();
      for (const jsonState of persisted) {
        const code = jsonState.roomCode;
        if (code && !this.rooms.has(code)) {
          const room = GameRoom.fromJSON(
            jsonState,
            (state, eventMsg) => this.broadcastToRoom(code, state, eventMsg)
          );
          room.onAuctionCompletedCallback = (c) => this.triggerAuctionCompleted(c);
          this.rooms.set(code, room);
        }
      }
      console.log(`[RoomManager] Loaded ${this.rooms.size} persisted rooms.`);
    } catch (err) {
      console.error("[RoomManager] Failed to load persisted rooms:", err);
    }
  }
  generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "BW-";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (this.rooms.has(code)) {
      return this.generateRoomCode();
    }
    return code;
  }
  createRoom(hostNickname, settings) {
    const roomCode = this.generateRoomCode();
    const room = new GameRoom(
      roomCode,
      hostNickname,
      settings,
      (state, eventMsg) => this.broadcastToRoom(roomCode, state, eventMsg)
    );
    room.onAuctionCompletedCallback = (c) => this.triggerAuctionCompleted(c);
    this.rooms.set(roomCode, room);
    storageService.saveRoom(room.toJSON());
    return room;
  }
  getRoom(roomCode) {
    return this.rooms.get(roomCode.toUpperCase().trim());
  }
  deleteRoom(roomCode) {
    const code = roomCode.toUpperCase().trim();
    const room = this.rooms.get(code);
    if (room) {
      room.clearAllTimers();
    }
    this.rooms.delete(code);
    storageService.deleteRoom(code);
  }
  handleConnection(ws) {
    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        this.handleMessage(ws, msg);
      } catch (err) {
        this.sendError(ws, "Invalid message format");
      }
    });
    ws.on("close", () => {
      this.handleDisconnect(ws);
    });
    ws.on("error", () => {
      this.handleDisconnect(ws);
    });
  }
  handleMessage(ws, msg) {
    if (msg.type === "PING") {
      ws.send(JSON.stringify({ type: "PONG" }));
      return;
    }
    if (msg.type === "VERIFY_PASSWORD") {
      const room2 = this.getRoom(msg.roomCode);
      if (!room2) {
        this.sendError(ws, "Room not found");
        return;
      }
      if (room2.verifyPassword(msg.password)) {
        ws.send(JSON.stringify({ type: "PASSWORD_VERIFIED", token: "pass_ok" }));
      } else {
        ws.send(JSON.stringify({ type: "ERROR", message: "Incorrect room password", code: "INVALID_PASSWORD" }));
      }
      return;
    }
    if (msg.type === "JOIN_ROOM") {
      const room2 = this.getRoom(msg.roomCode);
      if (!room2) {
        this.sendError(ws, `Room "${msg.roomCode}" not found`);
        return;
      }
      if (msg.sessionToken && room2.kickedMemberIds.has(msg.sessionToken)) {
        ws.send(JSON.stringify({
          type: "KICKED",
          message: "You have been removed from this auction room by the host."
        }));
        return;
      }
      if (room2.isPrivate) {
        const isHostReconnect = msg.sessionToken && msg.sessionToken === room2.hostId;
        const isExistingMember = msg.sessionToken && room2.members.has(msg.sessionToken);
        if (!isHostReconnect && !isExistingMember) {
          if (!msg.password || !room2.verifyPassword(msg.password)) {
            ws.send(JSON.stringify({
              type: "PASSWORD_REQUIRED",
              roomCode: room2.roomCode,
              roomName: room2.settings.roomName
            }));
            return;
          }
        }
      }
      const isExisting = msg.sessionToken && room2.members.has(msg.sessionToken);
      if (!isExisting) {
        const allTeams = ["CSK", "MI", "RCB", "KKR", "SRH", "RR", "PBKS", "DC", "GT", "LSG"];
        const occupiedCount = Array.from(room2.members.values()).filter((m) => m.teamId).length;
        if (occupiedCount >= allTeams.length) {
          this.sendError(ws, "The auction room is full. All 10 franchises have already been claimed.", "ROOM_FULL");
          return;
        }
      }
      const member = room2.join(msg.nickname, msg.sessionToken);
      this.connections.set(ws, {
        ws,
        roomCode: room2.roomCode,
        memberId: member.id
      });
      const syncMsg = {
        type: "SYNC_STATE",
        state: room2.getState(),
        myMemberId: member.id
      };
      ws.send(JSON.stringify(syncMsg));
      return;
    }
    const conn = this.connections.get(ws);
    if (!conn) {
      this.sendError(ws, "You must join a room first");
      return;
    }
    const room = this.rooms.get(conn.roomCode);
    if (!room) {
      this.sendError(ws, "Room expired or closed");
      return;
    }
    switch (msg.type) {
      case "SELECT_TEAM": {
        const res = room.selectTeam(conn.memberId, msg.teamId);
        if (!res.success) {
          this.sendError(ws, res.message || "Failed to select team");
        }
        break;
      }
      case "TOGGLE_READY": {
        room.toggleReady(conn.memberId, msg.isReady);
        break;
      }
      case "UPDATE_SETTINGS": {
        const res = room.updateSettings(conn.memberId, msg.settings);
        if (!res.success) {
          this.sendError(ws, res.message || "Failed to update settings");
        }
        break;
      }
      case "START_AUCTION": {
        const res = room.startAuction(conn.memberId);
        if (!res.success) {
          this.sendError(ws, res.message || "Failed to start auction");
        }
        break;
      }
      case "PLACE_BID": {
        const res = room.placeBid(conn.memberId, msg.amount);
        if (!res.success) {
          this.sendError(ws, res.message || "Bid rejected");
        }
        break;
      }
      case "SKIP_PLAYER": {
        const res = room.skipCurrentLot(conn.memberId);
        if (!res.success) {
          this.sendError(ws, res.message || "Failed to skip lot");
        }
        break;
      }
      case "DRAW_RANDOM_PLAYER": {
        const res = room.drawRandomPlayer(conn.memberId, msg.category, msg.basePriceInr);
        if (!res.success) {
          this.sendError(ws, res.message || "Failed to draw random lot");
        }
        break;
      }
      case "SEND_CHAT_MESSAGE": {
        const res = room.sendChatMessage(conn.memberId, msg.text);
        if (!res.success) {
          this.sendError(ws, res.message || "Failed to send chat message");
        }
        break;
      }
      case "PAUSE_AUCTION": {
        const res = room.pauseAuction(conn.memberId);
        if (!res.success) {
          this.sendError(ws, res.message || "Failed to pause");
        }
        break;
      }
      case "RESUME_AUCTION": {
        const res = room.resumeAuction(conn.memberId);
        if (!res.success) {
          this.sendError(ws, res.message || "Failed to resume");
        }
        break;
      }
      case "RESTART_AUCTION": {
        const res = room.restartAuction(conn.memberId);
        if (!res.success) {
          this.sendError(ws, res.message || "Failed to restart");
        }
        break;
      }
      case "END_AUCTION": {
        const res = room.finishAuction(conn.memberId);
        if (!res.success) {
          this.sendError(ws, res.message || "Only the host can end the auction");
          return;
        }
        break;
      }
      case "BRING_ALL_UNSOLD_BACK": {
        const res = room.bringAllUnsoldBack(conn.memberId);
        if (!res.success) {
          this.sendError(ws, res.message || "Failed to recall unsold players");
        }
        break;
      }
      case "RANDOM_DRAW_UNSOLD": {
        const res = room.randomDrawUnsold(conn.memberId, msg.count, msg.playerIds);
        if (!res.success) {
          this.sendError(ws, res.message || "Failed to draw unsold players");
        }
        break;
      }
      case "REAUCTION_PARTICULAR_PLAYER": {
        const res = room.reAuctionParticularPlayer(conn.memberId, msg.playerId);
        if (!res.success) {
          this.sendError(ws, res.message || "Failed to re-auction unsold player");
        }
        break;
      }
      case "REAUCTION_SOLD_PLAYER": {
        const res = room.reAuctionSoldPlayer(conn.memberId, msg.playerId);
        if (!res.success) {
          this.sendError(ws, res.message || "Failed to re-auction sold player");
        }
        break;
      }
      case "SKIP_MULTIPLE_PLAYERS": {
        const res = room.skipMultipleLots(conn.memberId, msg.count);
        if (!res.success) {
          this.sendError(ws, res.message || "Failed to skip players");
        }
        break;
      }
      case "UPDATE_TIMER": {
        const res = room.updateSettings(conn.memberId, { timerDuration: msg.timerDuration });
        if (!res.success) {
          this.sendError(ws, res.message || "Failed to update timer");
        }
        break;
      }
      case "KICK_MEMBER": {
        const targetMemberId = msg.targetMemberId;
        const res = room.kickMember(conn.memberId, targetMemberId);
        if (!res.success) {
          this.sendError(ws, res.message || "Failed to remove participant");
          break;
        }
        for (const [clientWs, clientConn] of this.connections.entries()) {
          if (clientConn.roomCode === room.roomCode && clientConn.memberId === targetMemberId) {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({
                type: "KICKED",
                message: "You have been removed from the auction room by the host."
              }));
              clientWs.close();
            }
            this.connections.delete(clientWs);
          }
        }
        break;
      }
      case "REAUCTION_UNSOLD": {
        const res = room.reAuctionUnsold(conn.memberId);
        if (!res.success) {
          this.sendError(ws, res.message || "Failed to start re-auction");
        }
        break;
      }
      case "ADVANCE_LOT": {
        const res = room.advanceLot(msg.lotIndex, void 0, conn.memberId);
        if (!res.success && res.message) {
          this.sendError(ws, res.message);
        }
        break;
      }
      case "ANNOUNCEMENT_COMPLETE": {
        const res = room.advanceLot(msg.lotIndex, msg.resultId, conn.memberId);
        if (!res.success && res.message) {
          this.sendError(ws, res.message);
        }
        break;
      }
      case "CREATE_TRADE_REQUEST": {
        const res = room.createTradeRequest(conn.memberId, {
          targetTeamId: msg.toTeamId,
          type: msg.tradeType,
          offeredPlayerId: msg.offeredPlayerId,
          requestedPlayerId: msg.requestedPlayerId,
          offeredPlayerIds: msg.offeredPlayerIds,
          requestedPlayerIds: msg.requestedPlayerIds,
          moneyAmount: msg.moneyAmount,
          cashPayer: msg.cashPayer
        });
        if (!res.success) {
          this.sendError(ws, res.message || "Failed to create trade request");
        }
        break;
      }
      case "RESPOND_TRADE_REQUEST": {
        const res = room.respondTradeRequest(conn.memberId, msg.tradeId, msg.action, msg.rejectionReason);
        if (!res.success) {
          this.sendError(ws, res.message || "Failed to respond to trade request");
        }
        break;
      }
      case "CANCEL_TRADE_REQUEST": {
        const res = room.cancelTradeRequest(conn.memberId, msg.tradeId, msg.reason);
        if (!res.success) {
          this.sendError(ws, res.message || "Failed to cancel trade request");
        }
        break;
      }
      case "UPDATE_TRADE_TIMER": {
        const res = room.updateTradeTimer(conn.memberId, msg.tradeTimerDuration);
        if (!res.success) {
          this.sendError(ws, res.message || "Failed to update trade timer");
        }
        break;
      }
      case "SAVE_PLAYING_XI": {
        const res = room.savePlayingXI(conn.memberId, msg.teamId, msg.selection);
        if (!res.success) {
          this.sendError(ws, res.message || "Failed to save Playing XI draft");
        } else if (room.settings.tournamentId) {
          this.triggerPlayingXIUpdated(room.roomCode, room.settings.tournamentId, msg.teamId, res.selection);
        }
        break;
      }
      case "CONFIRM_PLAYING_XI": {
        const res = room.confirmPlayingXI(conn.memberId, msg.teamId);
        if (!res.success) {
          this.sendError(ws, res.message || "Failed to confirm Playing XI");
        } else if (room.settings.tournamentId) {
          this.triggerPlayingXIUpdated(room.roomCode, room.settings.tournamentId, msg.teamId, res.selection);
        }
        break;
      }
      case "UNLOCK_PLAYING_XI": {
        const res = room.unlockPlayingXI(conn.memberId, msg.teamId);
        if (!res.success) {
          this.sendError(ws, res.message || "Failed to unlock Playing XI");
        }
        break;
      }
      case "CLOSE_POST_AUCTION_TRADE_WINDOW": {
        const res = room.closePostAuctionTradeWindow(conn.memberId);
        if (!res.success) {
          this.sendError(ws, res.message || "Failed to close trade window");
        }
        break;
      }
      case "LEAVE_ROOM": {
        this.connections.delete(ws);
        room.removeMember(conn.memberId);
        if (room.isClosed) {
          this.rooms.delete(conn.roomCode);
          storageService.deleteRoom(conn.roomCode);
        }
        ws.send(JSON.stringify({ type: "LEFT_ROOM" }));
        break;
      }
    }
  }
  handleDisconnect(ws) {
    const conn = this.connections.get(ws);
    if (!conn) return;
    this.connections.delete(ws);
    const room = this.rooms.get(conn.roomCode);
    if (!room) return;
    const member = room.getMember(conn.memberId);
    if (member) {
      member.connected = false;
      member.lastSeen = Date.now();
      room.addAuditLog("USER_DISCONNECTED", `${member.nickname} disconnected (grace period active)`, member.nickname);
      room.broadcastState();
    }
  }
  broadcastToRoom(roomCode, state, eventMsg) {
    const rawEvent = eventMsg ? JSON.stringify(eventMsg) : null;
    const rawState = state ? JSON.stringify({ type: "SYNC_STATE", state }) : null;
    for (const [ws, conn] of this.connections.entries()) {
      if (conn.roomCode === roomCode && ws.readyState === WebSocket.OPEN) {
        if (rawState) {
          ws.send(rawState);
        }
        if (rawEvent) {
          ws.send(rawEvent);
        }
      }
    }
  }
  sendError(ws, message, code) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ERROR", message, code }));
    }
  }
};
var roomManager = new RoomManager();

// server/src/matchEngine.ts
var LEGAL_CHOICES = [0, 1, 2, 3, 4, 6];
function getMaxBowlerOvers(matchOvers) {
  if (matchOvers <= 1) return 1;
  if (matchOvers <= 2) return 1;
  if (matchOvers <= 5) return 1;
  if (matchOvers <= 10) return 2;
  if (matchOvers <= 15) return 3;
  return 4;
}
var MatchEngine = class {
  /**
   * Initializes a new live match from fixture and confirmed lineups
   */
  static createMatch(fixtureId, tournamentId, homeFranchiseId, awayFranchiseId, matchOvers, homeLineup, awayLineup, playersMap) {
    const maxBowlerOvers = getMaxBowlerOvers(matchOvers);
    const match = {
      id: `MATCH-${fixtureId}`,
      tournamentId,
      fixtureId,
      homeFranchiseId,
      awayFranchiseId,
      matchOvers,
      maxBowlerOvers,
      status: "TOSS_PENDING",
      tossCallerFranchiseId: homeFranchiseId,
      currentInnings: 1,
      innings1: this.initializeInnings(1, homeFranchiseId, awayFranchiseId, homeLineup, awayLineup, playersMap, maxBowlerOvers),
      lineups: {
        [homeFranchiseId]: homeLineup,
        [awayFranchiseId]: awayLineup
      },
      pendingInputs: {},
      impactPlayersUsed: {
        [homeFranchiseId]: false,
        [awayFranchiseId]: false
      },
      ballHistory: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    return match;
  }
  /**
   * Initialize innings state for batting & bowling lineups
   */
  static initializeInnings(inningsNumber, battingFranchiseId, bowlingFranchiseId, battingLineup, bowlingLineup, playersMap, maxBowlerOvers, targetRuns) {
    const battingOrder = [...battingLineup.playingXI];
    const activeBatterId = battingOrder[0];
    const nonStrikerId = battingOrder[1];
    const batters = {};
    for (const pid of battingOrder) {
      const p = playersMap.get(pid);
      batters[pid] = {
        playerId: pid,
        name: p?.name || `Player ${pid}`,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        isOut: false,
        ovr: p?.ovr || 75,
        isCaptain: pid === battingLineup.captainId,
        isViceCaptain: pid === battingLineup.viceCaptainId
      };
    }
    const bowlers = {};
    for (const pid of bowlingLineup.playingXI) {
      const p = playersMap.get(pid);
      bowlers[pid] = {
        playerId: pid,
        name: p?.name || `Player ${pid}`,
        overs: 0,
        balls: 0,
        maidens: 0,
        runs: 0,
        wickets: 0,
        ovr: p?.ovr || 75,
        maxOversAllowed: maxBowlerOvers,
        abilityUsedInCurrentOver: false
      };
    }
    const activeBowlerId = bowlingLineup.playingXI[bowlingLineup.playingXI.length - 1];
    return {
      inningsNumber,
      battingFranchiseId,
      bowlingFranchiseId,
      totalRuns: 0,
      totalWickets: 0,
      oversCompleted: 0,
      ballsInCurrentOver: 0,
      targetRuns,
      activeBatterId,
      nonStrikerId,
      activeBowlerId,
      batterAbilityUsedInCurrentOver: false,
      battingOrder,
      nextBatterIndex: 2,
      batters,
      bowlers,
      fallOfWickets: [],
      isCompleted: false
    };
  }
  /**
   * Interactive Toss: Caller selects HEADS or TAILS, outcome generated randomly,
   * winner announced, and transitions to TOSS_DECISION_PENDING.
   */
  static resolveToss(match, callerFranchiseId, call) {
    if (match.status !== "TOSS" && match.status !== "TOSS_PENDING") {
      return { success: false, message: "Toss is already completed or not active" };
    }
    if (callerFranchiseId !== match.homeFranchiseId && callerFranchiseId !== match.awayFranchiseId) {
      return { success: false, message: "Invalid toss caller team" };
    }
    const tossResult = Math.random() < 0.5 ? "HEADS" : "TAILS";
    const isWinner = call === tossResult;
    const opponentFranchiseId = callerFranchiseId === match.homeFranchiseId ? match.awayFranchiseId : match.homeFranchiseId;
    const tossWinnerFranchiseId = isWinner ? callerFranchiseId : opponentFranchiseId;
    const tossLoserFranchiseId = isWinner ? opponentFranchiseId : callerFranchiseId;
    match.tossCallerFranchiseId = callerFranchiseId;
    match.tossCall = call;
    match.tossResult = tossResult;
    match.tossWinnerFranchiseId = tossWinnerFranchiseId;
    match.tossLoserFranchiseId = tossLoserFranchiseId;
    match.status = "TOSS_DECISION_PENDING";
    match.selectionDeadline = Date.now() + 15e3;
    match.updatedAt = Date.now();
    match.toss_winner_team_id = tossWinnerFranchiseId;
    match.toss_loser_team_id = tossLoserFranchiseId;
    match.toss_choice = call;
    match.current_match_phase = match.status;
    return {
      success: true,
      tossWinnerFranchiseId,
      tossResult,
      message: `${tossWinnerFranchiseId} won the toss (${tossResult} landed, call was ${call})!`
    };
  }
  /**
   * Toss Decision: Toss winner decides to BAT or BOWL first.
   * Transitions match to OPENING_PLAYER_SELECTION with a 5-second selection timer.
   */
  static handleTossDecision(match, tossWinnerFranchiseId, decision, playersMap) {
    if (match.status !== "TOSS_DECISION_PENDING" && match.status !== "TOSS" && match.status !== "TOSS_PENDING") {
      return { success: false, message: "Match is not awaiting a toss decision" };
    }
    if (match.tossWinnerFranchiseId && match.tossWinnerFranchiseId !== tossWinnerFranchiseId) {
      return { success: false, message: `Only the toss winning team (${match.tossWinnerFranchiseId}) can choose Bat/Bowl` };
    }
    match.tossWinnerFranchiseId = tossWinnerFranchiseId;
    const opponentFranchiseId = tossWinnerFranchiseId === match.homeFranchiseId ? match.awayFranchiseId : match.homeFranchiseId;
    match.tossLoserFranchiseId = opponentFranchiseId;
    match.tossDecision = decision;
    const battingFirst = decision === "BAT" ? tossWinnerFranchiseId : opponentFranchiseId;
    const bowlingFirst = battingFirst === match.homeFranchiseId ? match.awayFranchiseId : match.homeFranchiseId;
    match.innings1 = this.initializeInnings(
      1,
      battingFirst,
      bowlingFirst,
      match.lineups[battingFirst],
      match.lineups[bowlingFirst],
      playersMap,
      match.maxBowlerOvers
    );
    match.status = "OPENING_BATTERS_SELECTION";
    match.currentInnings = 1;
    match.selectionDeadline = Date.now() + 5e3;
    match.openingSelections = {
      battingConfirmed: false,
      bowlingConfirmed: false
    };
    match.updatedAt = Date.now();
    match.toss_winner_team_id = tossWinnerFranchiseId;
    match.toss_loser_team_id = match.tossLoserFranchiseId;
    match.toss_choice = decision;
    match.batting_team_id = battingFirst;
    match.bowling_team_id = bowlingFirst;
    match.current_match_phase = match.status;
    return {
      success: true,
      message: `${tossWinnerFranchiseId} chose to ${decision} first. Select opening players.`
    };
  }
  /**
   * Resolves the toss and determines who bats and bowls first (Legacy fallback)
   */
  static handleToss(match, tossWinnerFranchiseId, decision, playersMap) {
    this.handleTossDecision(match, tossWinnerFranchiseId, decision, playersMap);
  }
  /**
   * Batting team selects opening 2 batters (Striker & Non-Striker) from confirmed Playing XI.
   */
  static selectOpeningBatters(match, franchiseId, strikerId, nonStrikerId) {
    const inn = match.currentInnings === 1 ? match.innings1 : match.innings2;
    if (!inn) return { success: false, message: "Invalid innings" };
    if (match.status !== "OPENING_PLAYER_SELECTION" && match.status !== "OPENING_BATTERS_SELECTION") {
      return { success: false, message: "Match is not in opening batters selection phase" };
    }
    if (franchiseId !== inn.battingFranchiseId) {
      return { success: false, message: "Only batting team can select opening batters" };
    }
    if (!strikerId || !nonStrikerId || strikerId === nonStrikerId) {
      return { success: false, message: "Striker and Non-Striker must be two distinct players" };
    }
    const lineup = match.lineups[franchiseId]?.playingXI || [];
    if (!lineup.includes(strikerId) || !lineup.includes(nonStrikerId)) {
      return { success: false, message: "Both openers must be in the confirmed Playing XI" };
    }
    inn.activeBatterId = strikerId;
    inn.nonStrikerId = nonStrikerId;
    const remaining = lineup.filter((pid) => pid !== strikerId && pid !== nonStrikerId);
    inn.battingOrder = [strikerId, nonStrikerId, ...remaining];
    inn.nextBatterIndex = 2;
    if (!match.openingSelections) {
      match.openingSelections = {};
    }
    match.openingSelections.battingConfirmed = true;
    const isBowlingConfirmed = Boolean(match.openingSelections.bowlingConfirmed);
    if (isBowlingConfirmed) {
      match.status = "DELIVERY_ACTIVE";
      this.startTurnTimer(match);
      match.selectionDeadline = void 0;
    } else {
      if (match.status === "OPENING_BATTERS_SELECTION") {
        match.status = "OPENING_BOWLER_SELECTION";
        match.selectionDeadline = Date.now() + 5e3;
      }
    }
    match.updatedAt = Date.now();
    match.current_match_phase = match.status;
    return { success: true, message: "Opening batters confirmed." };
  }
  /**
   * Bowling team selects opening bowler from confirmed Playing XI.
   */
  static selectOpeningBowler(match, franchiseId, bowlerId) {
    const inn = match.currentInnings === 1 ? match.innings1 : match.innings2;
    if (!inn) return { success: false, message: "Invalid innings" };
    if (match.status !== "OPENING_PLAYER_SELECTION" && match.status !== "OPENING_BOWLER_SELECTION") {
      return { success: false, message: "Match is not in opening bowler selection phase" };
    }
    if (franchiseId !== inn.bowlingFranchiseId) {
      return { success: false, message: "Only bowling team can select opening bowler" };
    }
    const lineup = match.lineups[franchiseId]?.playingXI || [];
    if (!lineup.includes(bowlerId)) {
      return { success: false, message: "Selected bowler must be in the confirmed Playing XI" };
    }
    inn.activeBowlerId = bowlerId;
    if (!match.openingSelections) {
      match.openingSelections = {};
    }
    match.openingSelections.bowlingConfirmed = true;
    const isBattingConfirmed = Boolean(match.openingSelections.battingConfirmed);
    if (isBattingConfirmed) {
      match.status = "DELIVERY_ACTIVE";
      this.startTurnTimer(match);
      match.selectionDeadline = void 0;
    }
    match.updatedAt = Date.now();
    match.current_match_phase = match.status;
    return { success: true, message: "Opening bowler confirmed." };
  }
  /**
   * Batting team selects replacement batter after a wicket fell.
   * Transitions from BATTER_SELECTION back to DELIVERY_ACTIVE.
   */
  static selectReplacementBatter(match, franchiseId, replacementBatterId) {
    const inn = match.currentInnings === 1 ? match.innings1 : match.innings2;
    if (!inn) return { success: false, message: "Invalid innings" };
    if (match.status !== "BATTER_SELECTION") {
      return { success: false, message: "Match is not currently waiting for a batter replacement" };
    }
    if (franchiseId !== inn.battingFranchiseId) {
      return { success: false, message: "Only batting team can select replacement batter" };
    }
    const lineup = match.lineups[franchiseId]?.playingXI || [];
    if (!lineup.includes(replacementBatterId)) {
      return { success: false, message: "Selected batter must be in the confirmed Playing XI" };
    }
    if (replacementBatterId === inn.nonStrikerId) {
      return { success: false, message: "Player is already batting at the non-striker end" };
    }
    const batterFig = inn.batters[replacementBatterId];
    if (batterFig?.isOut) {
      return { success: false, message: "Dismissed batter cannot re-enter to bat" };
    }
    inn.activeBatterId = replacementBatterId;
    match.status = "DELIVERY_ACTIVE";
    this.startTurnTimer(match);
    match.updatedAt = Date.now();
    return { success: true, message: `${batterFig?.name || replacementBatterId} has taken strike!` };
  }
  /**
   * Selects the active bowler for the upcoming over
   */
  static selectBowler(match, bowlerId) {
    const innings = match.currentInnings === 1 ? match.innings1 : match.innings2;
    if (!innings) return { success: false, message: "Invalid innings state" };
    if (innings.ballsInCurrentOver > 0) {
      return { success: false, message: "Cannot change bowler in the middle of an over" };
    }
    const bowlerFig = innings.bowlers[bowlerId];
    if (!bowlerFig) return { success: false, message: "Player is not in the bowling lineup" };
    if (bowlerFig.overs >= bowlerFig.maxOversAllowed) {
      return { success: false, message: `Bowler has already bowled their quota of ${bowlerFig.maxOversAllowed} overs` };
    }
    if (innings.oversCompleted > 0 && innings.previousOverBowlerId === bowlerId) {
      const otherEligible = Object.values(innings.bowlers).some(
        (b) => b.playerId !== bowlerId && b.overs < b.maxOversAllowed
      );
      if (otherEligible) {
        return { success: false, message: "Bowler cannot bowl two consecutive overs" };
      }
    }
    innings.activeBowlerId = bowlerId;
    bowlerFig.abilityUsedInCurrentOver = false;
    match.status = "DELIVERY_ACTIVE";
    this.startTurnTimer(match);
    match.updatedAt = Date.now();
    return { success: true, message: "Bowler selected successfully" };
  }
  /**
   * Starts or resets the 10-second synchronized turn timer and authoritative delivery state
   */
  static startTurnTimer(match) {
    const inn = match.currentInnings === 1 ? match.innings1 : match.innings2;
    const overNumber = inn ? inn.oversCompleted : 0;
    const ballNumber = inn ? inn.ballsInCurrentOver + 1 : 1;
    const now = Date.now();
    const deadline = now + 1e4;
    const deliveryId = `DEL-${match.id}-${match.currentInnings}-${overNumber}-${ballNumber}-${now}`;
    match.currentDelivery = {
      id: deliveryId,
      matchId: match.id,
      inningsNumber: match.currentInnings,
      overNumber,
      ballNumber,
      startTime: now,
      deadline,
      status: "WAITING_INPUTS"
    };
    match.pendingInputs = {
      turnStartTime: now,
      turnExpiresAt: deadline,
      batterChoice: void 0,
      bowlerChoice: void 0,
      batterAbility: void 0,
      bowlerAbility: void 0,
      blockedNumbers: void 0,
      hasBatterSubmitted: false,
      hasBowlerSubmitted: false
    };
  }
  /**
   * Check available abilities for the current batter & bowler matchup
   */
  static getMatchupAbilities(match, playersMap) {
    const innings = match.currentInnings === 1 ? match.innings1 : match.innings2;
    if (!innings) return { batterAbilities: [], bowlerAbilities: [], batterOvr: 75, bowlerOvr: 75, diff: 0 };
    const batter = innings.batters[innings.activeBatterId];
    const bowler = innings.bowlers[innings.activeBowlerId];
    const batterOvr = batter?.ovr || 75;
    const bowlerOvr = bowler?.ovr || 75;
    const diff = bowlerOvr - batterOvr;
    const bowlerAbilities = [];
    const batterAbilities = [];
    if (!bowler?.abilityUsedInCurrentOver) {
      if (diff >= 8) {
        bowlerAbilities.push("ELITE_NUMBER_BLOCK");
      } else if (diff >= 3) {
        bowlerAbilities.push("NUMBER_BLOCK");
      }
    }
    const batterAdv = batterOvr - bowlerOvr;
    if (!innings.batterAbilityUsedInCurrentOver) {
      if (batterAdv >= 8) {
        batterAbilities.push("SECRET_DOUBLE_SHOT");
      } else if (batterAdv >= 3) {
        batterAbilities.push("COMBINATION_SHOT");
      }
    }
    return { batterAbilities, bowlerAbilities, batterOvr, bowlerOvr, diff };
  }
  /**
   * Registers input from either batter or bowler
   */
  static submitChoice(match, franchiseId, choice, ability, blockedNumbers, playersMap) {
    const innings = match.currentInnings === 1 ? match.innings1 : match.innings2;
    if (!innings || innings.isCompleted || match.status === "COMPLETED") {
      return { resolved: false, error: "Match is not in an active ball state" };
    }
    const isBattingTeam = franchiseId === innings.battingFranchiseId;
    const isBowlingTeam = franchiseId === innings.bowlingFranchiseId;
    if (!isBattingTeam && !isBowlingTeam) {
      return { resolved: false, error: "Team is not part of this match" };
    }
    const batter = innings.batters[innings.activeBatterId];
    const bowler = innings.bowlers[innings.activeBowlerId];
    const batterOvr = batter?.ovr || 75;
    const bowlerOvr = bowler?.ovr || 75;
    const bowlerAdv = bowlerOvr - batterOvr;
    const batterAdv = batterOvr - bowlerOvr;
    if (isBowlingTeam) {
      if (match.pendingInputs.bowlerChoice !== void 0) {
        return { resolved: false, error: "Bowler choice already submitted and locked for this delivery." };
      }
      if (!LEGAL_CHOICES.includes(choice)) {
        return { resolved: false, error: "Invalid delivery choice" };
      }
      if (ability === "NUMBER_BLOCK" || ability === "ELITE_NUMBER_BLOCK") {
        const bowlerFig = innings.bowlers[innings.activeBowlerId];
        if (!bowlerFig || bowlerFig.abilityUsedInCurrentOver) {
          return { resolved: false, error: "Bowler special ability already used in current over" };
        }
        if (ability === "ELITE_NUMBER_BLOCK") {
          if (bowlerAdv < 8) {
            return { resolved: false, error: "Special Delivery requires at least 8 OVR advantage" };
          }
        } else if (ability === "NUMBER_BLOCK") {
          if (bowlerAdv < 3) {
            return { resolved: false, error: "Number Block requires 3\u20137 OVR advantage" };
          }
          if (!blockedNumbers || blockedNumbers.length !== 3 || new Set(blockedNumbers).size !== 3 || !blockedNumbers.every((n) => LEGAL_CHOICES.includes(n))) {
            return { resolved: false, error: "Bowler must select exactly 3 unique scoring options to block from [0, 1, 2, 3, 4, 6]" };
          }
        }
      }
      match.pendingInputs.bowlerChoice = choice;
      match.pendingInputs.hasBowlerSubmitted = true;
      if (ability === "ELITE_NUMBER_BLOCK") {
        match.pendingInputs.bowlerAbility = "ELITE_NUMBER_BLOCK";
        match.pendingInputs.blockedNumbers = [0, 1, 2, 3];
      } else if (ability === "NUMBER_BLOCK" && blockedNumbers) {
        match.pendingInputs.bowlerAbility = "NUMBER_BLOCK";
        match.pendingInputs.blockedNumbers = blockedNumbers;
      }
    }
    if (isBattingTeam) {
      if (match.pendingInputs.batterChoice !== void 0) {
        return { resolved: false, error: "Batter choice already submitted and locked for this delivery." };
      }
      if (!LEGAL_CHOICES.includes(choice)) {
        return { resolved: false, error: "Invalid scoring choice" };
      }
      if (match.pendingInputs.bowlerAbility === "ELITE_NUMBER_BLOCK" && (choice === 0 || choice === 1 || choice === 2 || choice === 3)) {
        return { resolved: false, error: "Special Delivery active! You can only select 4 or 6." };
      }
      if (match.pendingInputs.blockedNumbers && match.pendingInputs.blockedNumbers.includes(choice)) {
        return { resolved: false, error: `Selection ${choice} is blocked by bowler's special ability!` };
      }
      if (ability === "COMBINATION_SHOT" || ability === "SECRET_DOUBLE_SHOT") {
        if (innings.batterAbilityUsedInCurrentOver) {
          return { resolved: false, error: "Batter special ability already used in current over" };
        }
        if (ability === "SECRET_DOUBLE_SHOT") {
          if (batterAdv < 8) {
            return { resolved: false, error: "2X Power requires at least 8 OVR advantage" };
          }
        } else if (ability === "COMBINATION_SHOT") {
          if (batterAdv < 3) {
            return { resolved: false, error: "Bonus Shot requires 3\u20137 OVR advantage" };
          }
        }
      }
      match.pendingInputs.batterChoice = choice;
      match.pendingInputs.hasBatterSubmitted = true;
      if (ability === "SECRET_DOUBLE_SHOT") {
        match.pendingInputs.batterAbility = "SECRET_DOUBLE_SHOT";
      } else if (ability === "COMBINATION_SHOT") {
        match.pendingInputs.batterAbility = "COMBINATION_SHOT";
      }
    }
    if (match.pendingInputs.batterChoice !== void 0 && match.pendingInputs.bowlerChoice !== void 0) {
      const event = this.resolveBall(match, playersMap);
      return { resolved: true, ballEvent: event };
    }
    return { resolved: false };
  }
  /**
   * Resolves a turn or selection on timeout:
   * - In BATTER_SELECTION: auto-picks next available batter
   * - In BOWLER_SELECTION: auto-picks next eligible bowler
   * - In OPENING_BATTERS_SELECTION: auto-picks default top 2 batters
   * - In OPENING_BOWLER_SELECTION: auto-picks default bowler
   * - In active delivery:
   *   Batter timeout = OUT (Timed Out)
   *   Bowler timeout = random legal choice
   */
  static handleTimeout(match, playersMap) {
    const innings = match.currentInnings === 1 ? match.innings1 : match.innings2;
    if (!innings || innings.isCompleted || match.status === "COMPLETED") return null;
    if (match.status === "OPENING_PLAYER_SELECTION" || match.status === "OPENING_BATTERS_SELECTION" || match.status === "OPENING_BOWLER_SELECTION") {
      const battingLineup = match.lineups[innings.battingFranchiseId]?.playingXI || [];
      const bowlingLineup = match.lineups[innings.bowlingFranchiseId]?.playingXI || [];
      if (!innings.activeBatterId || !innings.nonStrikerId || innings.activeBatterId === innings.nonStrikerId) {
        const sId = battingLineup[0] || "";
        const nsId = battingLineup[1] || "";
        this.selectOpeningBatters(match, innings.battingFranchiseId, sId, nsId);
      }
      if (!innings.activeBowlerId) {
        const bId = bowlingLineup[bowlingLineup.length - 1] || bowlingLineup[0] || "";
        this.selectOpeningBowler(match, innings.bowlingFranchiseId, bId);
      }
      return null;
    }
    if (match.status === "BATTER_SELECTION") {
      const eligible = innings.battingOrder.find(
        (pid) => !innings.batters[pid]?.isOut && pid !== innings.nonStrikerId
      );
      if (eligible) {
        this.selectReplacementBatter(match, innings.battingFranchiseId, eligible);
      } else {
        innings.isCompleted = true;
        if (innings.inningsNumber === 1) {
          this.transitionToInnings2(match, playersMap);
        } else {
          this.finalizeMatch(match);
        }
      }
      return null;
    }
    if (match.status === "BOWLER_SELECTION") {
      const eligible = Object.values(innings.bowlers).find(
        (b) => b.playerId !== innings.previousOverBowlerId && b.overs < b.maxOversAllowed
      ) || Object.values(innings.bowlers).find((b) => b.overs < b.maxOversAllowed);
      if (eligible) {
        this.selectBowler(match, eligible.playerId);
      }
      return null;
    }
    if (match.pendingInputs.bowlerChoice === void 0) {
      const randIdx = Math.floor(Math.random() * LEGAL_CHOICES.length);
      match.pendingInputs.bowlerChoice = LEGAL_CHOICES[randIdx];
    }
    if (match.pendingInputs.batterChoice === void 0) {
      return this.resolveTimedOutBatter(match);
    }
    return this.resolveBall(match, playersMap);
  }
  /**
   * Resolves a timed-out dismissal for the active batter
   */
  static resolveTimedOutBatter(match) {
    const innings = match.currentInnings === 1 ? match.innings1 : match.innings2;
    const batter = innings.batters[innings.activeBatterId];
    const bowler = innings.bowlers[innings.activeBowlerId];
    batter.isOut = true;
    batter.dismissal = "Timed Out (10s exceeded)";
    batter.balls += 1;
    innings.ballsInCurrentOver += 1;
    bowler.balls += 1;
    bowler.wickets += 1;
    innings.totalWickets += 1;
    const overStr = `${innings.oversCompleted}.${innings.ballsInCurrentOver}`;
    innings.fallOfWickets.push({
      wicket: innings.totalWickets,
      runs: innings.totalRuns,
      overStr,
      playerOutName: batter.name
    });
    const ballEvent = {
      id: `BALL-${match.id}-${innings.inningsNumber}-${innings.oversCompleted}-${innings.ballsInCurrentOver}-${Date.now()}`,
      matchId: match.id,
      tournamentId: match.tournamentId,
      innings: innings.inningsNumber,
      overNumber: innings.oversCompleted,
      ballNumber: innings.ballsInCurrentOver,
      batterId: batter.playerId,
      batterName: batter.name,
      batterOvr: batter.ovr,
      bowlerId: bowler.playerId,
      bowlerName: bowler.name,
      bowlerOvr: bowler.ovr,
      ovrDiff: bowler.ovr - batter.ovr,
      batterInput: 0,
      bowlerInput: match.pendingInputs.bowlerChoice || 0,
      isWicket: true,
      dismissalType: "Timed Out",
      runsScored: 0,
      totalRunsAfter: innings.totalRuns,
      wicketsAfter: innings.totalWickets,
      commentary: `\u23F1\uFE0F TIMED OUT! ${batter.name} exceeded the 10-second decision window. Dismissed!`,
      timestamp: Date.now()
    };
    match.lastDeliveryResult = {
      ballNumber: innings.ballsInCurrentOver,
      overNumber: innings.oversCompleted,
      batterName: batter.name,
      bowlerName: bowler.name,
      batterInput: 0,
      bowlerInput: match.pendingInputs.bowlerChoice || 0,
      runsScored: 0,
      isWicket: true,
      commentary: ballEvent.commentary,
      timestamp: Date.now()
    };
    match.ballHistory.push(ballEvent);
    if (match.currentDelivery) {
      match.currentDelivery.status = "RESOLVED";
      match.currentDelivery.resultStatus = "TIMED_OUT";
    }
    this.postBallProcessing(match, innings, 0, true);
    return ballEvent;
  }
  /**
   * Resolves a ball delivery when both inputs are present
   */
  static resolveBall(match, playersMap) {
    const innings = match.currentInnings === 1 ? match.innings1 : match.innings2;
    const batter = innings.batters[innings.activeBatterId];
    const bowler = innings.bowlers[innings.activeBowlerId];
    const batterChoice = match.pendingInputs.batterChoice;
    const bowlerChoice = match.pendingInputs.bowlerChoice;
    const bowlerAbility = match.pendingInputs.bowlerAbility;
    const batterAbility = match.pendingInputs.batterAbility;
    const blockedNumbers = match.pendingInputs.blockedNumbers;
    if (bowlerAbility) {
      bowler.abilityUsedInCurrentOver = true;
    }
    if (batterAbility) {
      innings.batterAbilityUsedInCurrentOver = true;
    }
    const isWicket = batterChoice === bowlerChoice;
    let runsScored = 0;
    let commentary = "";
    if (isWicket) {
      batter.isOut = true;
      batter.dismissal = `c & b ${bowler.name}`;
      batter.balls += 1;
      bowler.wickets += 1;
      bowler.balls += 1;
      innings.ballsInCurrentOver += 1;
      innings.totalWickets += 1;
      commentary = `\u{1F6A8} WICKET! Both selected [${batterChoice}]. ${batter.name} is OUT! Caught & bowled by ${bowler.name}.`;
      if (bowlerAbility) {
        commentary = `\u{1F525} [${bowlerAbility}] SUCCESS! Both picked [${batterChoice}]. ${batter.name} is OUT!`;
      }
      const overStr = `${innings.oversCompleted}.${innings.ballsInCurrentOver}`;
      innings.fallOfWickets.push({
        wicket: innings.totalWickets,
        runs: innings.totalRuns,
        overStr,
        playerOutName: batter.name
      });
    } else {
      runsScored = batterChoice;
      if (batterAbility === "COMBINATION_SHOT") {
        runsScored = batterChoice + bowlerChoice;
        commentary = `\u26A1 COMBINATION SHOT! Batter picked [${batterChoice}], Bowler picked [${bowlerChoice}]. ${runsScored} runs scored!`;
      } else if (batterAbility === "SECRET_DOUBLE_SHOT") {
        runsScored = batterChoice * 2;
        commentary = `\u{1F4A5} SECRET DOUBLE SHOT UNLEASHED! Batter [${batterChoice}] x 2 = ${runsScored} RUNS!`;
      } else {
        if (runsScored === 4) {
          commentary = `\u{1F3AF} FOUR! Beautifully timed drive for 4 runs. Batter [${batterChoice}] vs Bowler [${bowlerChoice}].`;
        } else if (runsScored === 6) {
          commentary = `\u{1F680} SIX! Clears the boundary rope! Massive 6 runs. Batter [${batterChoice}] vs Bowler [${bowlerChoice}].`;
        } else if (runsScored === 0) {
          commentary = `\u{1F6E1}\uFE0F DOT BALL. Batter defended [0]. Bowler delivered [${bowlerChoice}].`;
        } else {
          commentary = `\u{1F3C3} ${runsScored} run(s) taken. Batter [${batterChoice}] vs Bowler [${bowlerChoice}].`;
        }
      }
      batter.runs += runsScored;
      batter.balls += 1;
      if (runsScored === 4) batter.fours += 1;
      if (runsScored === 6) batter.sixes += 1;
      bowler.runs += runsScored;
      bowler.balls += 1;
      innings.ballsInCurrentOver += 1;
      innings.totalRuns += runsScored;
    }
    const ballEvent = {
      id: `BALL-${match.id}-${innings.inningsNumber}-${innings.oversCompleted}-${innings.ballsInCurrentOver}-${Date.now()}`,
      matchId: match.id,
      tournamentId: match.tournamentId,
      innings: innings.inningsNumber,
      overNumber: innings.oversCompleted,
      ballNumber: innings.ballsInCurrentOver,
      batterId: batter.playerId,
      batterName: batter.name,
      batterOvr: batter.ovr,
      bowlerId: bowler.playerId,
      bowlerName: bowler.name,
      bowlerOvr: bowler.ovr,
      ovrDiff: bowler.ovr - batter.ovr,
      bowlerAbilityUsed: bowlerAbility,
      batterAbilityUsed: batterAbility,
      blockedNumbers,
      batterInput: batterChoice,
      bowlerInput: bowlerChoice,
      isWicket,
      dismissalType: isWicket ? "Caught & Bowled" : void 0,
      runsScored,
      totalRunsAfter: innings.totalRuns,
      wicketsAfter: innings.totalWickets,
      commentary,
      timestamp: Date.now()
    };
    match.lastDeliveryResult = {
      ballNumber: innings.ballsInCurrentOver,
      overNumber: innings.oversCompleted,
      batterName: batter.name,
      bowlerName: bowler.name,
      batterInput: batterChoice,
      bowlerInput: bowlerChoice,
      runsScored,
      isWicket,
      commentary,
      timestamp: Date.now()
    };
    match.ballHistory.push(ballEvent);
    if (match.currentDelivery) {
      match.currentDelivery.status = "RESOLVED";
      match.currentDelivery.resultStatus = isWicket ? "WICKET" : runsScored === 6 || runsScored === 4 ? "BOUNDARY" : runsScored === 0 ? "DOT" : "RUNS";
    }
    this.postBallProcessing(match, innings, runsScored, isWicket, playersMap);
    return ballEvent;
  }
  /**
   * Post-ball updates: strike rotation, over completion, innings completion, match target chase
   */
  static postBallProcessing(match, innings, runsScored, isWicket, playersMap) {
    const allOut = innings.totalWickets >= 10;
    const overFinished = innings.ballsInCurrentOver >= 6;
    if (innings.inningsNumber === 2 && innings.targetRuns !== void 0) {
      if (innings.totalRuns >= innings.targetRuns) {
        innings.isCompleted = true;
        this.finalizeMatch(match);
        return;
      }
    }
    if (allOut) {
      innings.isCompleted = true;
      if (innings.inningsNumber === 1) {
        this.transitionToInnings2(match, playersMap);
      } else {
        this.finalizeMatch(match);
      }
      return;
    }
    if (overFinished) {
      innings.oversCompleted += 1;
      innings.ballsInCurrentOver = 0;
      innings.batterAbilityUsedInCurrentOver = false;
      innings.previousOverBowlerId = innings.activeBowlerId;
      const bowler = innings.bowlers[innings.activeBowlerId];
      if (bowler) {
        bowler.overs += 1;
        bowler.balls = 0;
        bowler.abilityUsedInCurrentOver = false;
      }
      if (innings.nonStrikerId) {
        const temp = innings.activeBatterId;
        innings.activeBatterId = innings.nonStrikerId;
        innings.nonStrikerId = temp;
      }
      if (innings.oversCompleted >= match.matchOvers) {
        innings.isCompleted = true;
        if (innings.inningsNumber === 1) {
          this.transitionToInnings2(match, playersMap);
        } else {
          this.finalizeMatch(match);
        }
        return;
      }
      match.status = "BOWLER_SELECTION";
      match.selectionDeadline = Date.now() + 5e3;
      match.updatedAt = Date.now();
      return;
    }
    if (isWicket) {
      match.status = "BATTER_SELECTION";
      match.selectionDeadline = Date.now() + 5e3;
      match.updatedAt = Date.now();
      return;
    }
    if (runsScored === 1 || runsScored === 3) {
      if (innings.nonStrikerId) {
        const temp = innings.activeBatterId;
        innings.activeBatterId = innings.nonStrikerId;
        innings.nonStrikerId = temp;
      }
    }
    match.status = "DELIVERY_ACTIVE";
    this.startTurnTimer(match);
    match.updatedAt = Date.now();
  }
  /**
   * Transition from 1st innings to 2nd innings
   */
  static transitionToInnings2(match, playersMap) {
    const inn1 = match.innings1;
    const targetRuns = inn1.totalRuns + 1;
    match.targetRuns = targetRuns;
    match.currentInnings = 2;
    const battingSecond = inn1.bowlingFranchiseId;
    const bowlingSecond = inn1.battingFranchiseId;
    const pMap = playersMap || /* @__PURE__ */ new Map();
    match.innings2 = this.initializeInnings(
      2,
      battingSecond,
      bowlingSecond,
      match.lineups[battingSecond],
      match.lineups[bowlingSecond],
      pMap,
      match.maxBowlerOvers,
      targetRuns
    );
    match.openingSelections = {
      battingConfirmed: false,
      bowlingConfirmed: false
    };
    match.status = "OPENING_BATTERS_SELECTION";
    match.selectionDeadline = Date.now() + 5e3;
    match.updatedAt = Date.now();
    match.current_match_phase = match.status;
  }
  /**
   * Finalizes the match result and calculates MVP
   */
  static finalizeMatch(match) {
    match.status = "COMPLETED";
    const inn1 = match.innings1;
    const inn2 = match.innings2;
    if (!inn2) {
      match.winnerFranchiseId = inn1.battingFranchiseId;
      match.resultSummary = `${inn1.battingFranchiseId} declared winner.`;
      match.updatedAt = Date.now();
      return;
    }
    const team1 = inn1.battingFranchiseId;
    const team2 = inn2.battingFranchiseId;
    if (inn2.totalRuns >= inn2.targetRuns) {
      const wicketsRemaining = 10 - inn2.totalWickets;
      match.winnerFranchiseId = team2;
      match.resultSummary = `${team2} won by ${wicketsRemaining} wicket${wicketsRemaining === 1 ? "" : "s"}!`;
    } else if (inn2.totalRuns === inn1.totalRuns) {
      const team1Boundaries = Object.values(inn1.batters).reduce((sum, b) => sum + b.fours + b.sixes, 0);
      const team2Boundaries = Object.values(inn2.batters).reduce((sum, b) => sum + b.fours + b.sixes, 0);
      if (team2Boundaries > team1Boundaries) {
        match.winnerFranchiseId = team2;
        match.resultSummary = `Match TIED! ${team2} won on boundary count (${team2Boundaries} vs ${team1Boundaries})!`;
      } else if (team1Boundaries > team2Boundaries) {
        match.winnerFranchiseId = team1;
        match.resultSummary = `Match TIED! ${team1} won on boundary count (${team1Boundaries} vs ${team2Boundaries})!`;
      } else {
        match.winnerFranchiseId = team1;
        match.resultSummary = `Match TIED! Level on runs and boundaries.`;
      }
    } else {
      const runMargin = inn1.totalRuns - inn2.totalRuns;
      match.winnerFranchiseId = team1;
      match.resultSummary = `${team1} won by ${runMargin} run${runMargin === 1 ? "" : "s"}!`;
    }
    let bestMvpPoints = -1;
    let mvpPlayerId;
    const evaluatePoints = (batters, bowlers) => {
      for (const b of Object.values(batters)) {
        const pts = b.runs * 1 + b.fours * 1 + b.sixes * 2;
        if (pts > bestMvpPoints) {
          bestMvpPoints = pts;
          mvpPlayerId = b.playerId;
        }
      }
      for (const b of Object.values(bowlers)) {
        const pts = b.wickets * 25 + b.maidens * 10;
        if (pts > bestMvpPoints) {
          bestMvpPoints = pts;
          mvpPlayerId = b.playerId;
        }
      }
    };
    evaluatePoints(inn1.batters, inn1.bowlers);
    evaluatePoints(inn2.batters, inn2.bowlers);
    match.mvpPlayerId = mvpPlayerId;
    match.updatedAt = Date.now();
  }
  /**
   * Allows a team to substitute an Impact Player
   */
  static substituteImpactPlayer(match, franchiseId, playerOutId, playerIn) {
    if (match.impactPlayersUsed[franchiseId]) {
      return { success: false, message: "Impact player already used for this team" };
    }
    const lineup = match.lineups[franchiseId];
    if (!lineup) return { success: false, message: "Lineup not found" };
    const idx = lineup.playingXI.indexOf(playerOutId);
    if (idx === -1) return { success: false, message: "Player out is not in Playing XI" };
    lineup.playingXI[idx] = playerIn.id;
    match.impactPlayersUsed[franchiseId] = true;
    const inn = match.currentInnings === 1 ? match.innings1 : match.innings2;
    if (inn) {
      if (inn.battingFranchiseId === franchiseId && !inn.batters[playerIn.id]) {
        inn.batters[playerIn.id] = {
          playerId: playerIn.id,
          name: playerIn.name,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          isOut: false,
          ovr: playerIn.ovr
        };
        const orderIdx = inn.battingOrder.indexOf(playerOutId);
        if (orderIdx !== -1) inn.battingOrder[orderIdx] = playerIn.id;
      }
      if (inn.bowlingFranchiseId === franchiseId && !inn.bowlers[playerIn.id]) {
        inn.bowlers[playerIn.id] = {
          playerId: playerIn.id,
          name: playerIn.name,
          overs: 0,
          balls: 0,
          maidens: 0,
          runs: 0,
          wickets: 0,
          ovr: playerIn.ovr,
          maxOversAllowed: match.maxBowlerOvers
        };
      }
    }
    match.updatedAt = Date.now();
    return { success: true, message: `Impact Player ${playerIn.name} brought on for ${playerOutId}` };
  }
};
function sanitizeMatchForViewer(match, viewerFranchiseId) {
  if (!match) return match;
  const clone = JSON.parse(JSON.stringify(match));
  const inputs = clone.pendingInputs || {};
  const inn = clone.currentInnings === 1 ? clone.innings1 : clone.innings2;
  const battingTeam = inn?.battingFranchiseId || clone.batting_team_id;
  const bowlingTeam = inn?.bowlingFranchiseId || clone.bowling_team_id;
  const hasBatterSubmitted = inputs.batterChoice !== void 0;
  const hasBowlerSubmitted = inputs.bowlerChoice !== void 0;
  inputs.hasBatterSubmitted = hasBatterSubmitted;
  inputs.hasBowlerSubmitted = hasBowlerSubmitted;
  if (viewerFranchiseId !== battingTeam) {
    delete inputs.batterChoice;
    delete inputs.batterAbility;
  }
  if (viewerFranchiseId !== bowlingTeam) {
    delete inputs.bowlerChoice;
    delete inputs.bowlerAbility;
    delete inputs.blockedNumbers;
  }
  clone.viewerFranchiseId = viewerFranchiseId;
  clone.toss_winner_team_id = clone.tossWinnerFranchiseId;
  clone.toss_loser_team_id = clone.tossLoserFranchiseId;
  clone.toss_choice = clone.tossDecision || clone.tossCall;
  clone.batting_team_id = battingTeam;
  clone.bowling_team_id = bowlingTeam;
  clone.current_match_phase = clone.status;
  clone.isViewerTossWinner = Boolean(viewerFranchiseId && viewerFranchiseId === clone.tossWinnerFranchiseId);
  clone.isViewerBattingTeam = Boolean(viewerFranchiseId && viewerFranchiseId === battingTeam);
  clone.isViewerBowlingTeam = Boolean(viewerFranchiseId && viewerFranchiseId === bowlingTeam);
  clone.viewerRole = clone.isViewerBattingTeam ? "BATTING" : clone.isViewerBowlingTeam ? "BOWLING" : "SPECTATOR";
  return clone;
}

// server/src/fixtureGenerator.ts
var FixtureGenerator = class {
  /**
   * Generates fixtures based on tournament team count
   */
  static generateGroupStageFixtures(tournamentId, teamIds, matchOvers) {
    const fixtures = [];
    const n = teamIds.length;
    let matchNumber = 1;
    if (n === 4) {
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          fixtures.push({
            id: `FIX-${tournamentId}-M${matchNumber}`,
            tournamentId,
            matchNumber,
            roundNumber: 1,
            stage: "GROUP",
            homeFranchiseId: teamIds[i],
            awayFranchiseId: teamIds[j],
            matchOvers,
            status: "SCHEDULED",
            scheduledAt: Date.now() + matchNumber * 6e4
          });
          matchNumber++;
        }
      }
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          fixtures.push({
            id: `FIX-${tournamentId}-M${matchNumber}`,
            tournamentId,
            matchNumber,
            roundNumber: 2,
            stage: "GROUP",
            homeFranchiseId: teamIds[j],
            awayFranchiseId: teamIds[i],
            matchOvers,
            status: "SCHEDULED",
            scheduledAt: Date.now() + matchNumber * 6e4
          });
          matchNumber++;
        }
      }
    } else if (n === 6 || n === 8) {
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          fixtures.push({
            id: `FIX-${tournamentId}-M${matchNumber}`,
            tournamentId,
            matchNumber,
            roundNumber: 1,
            stage: "GROUP",
            homeFranchiseId: teamIds[i],
            awayFranchiseId: teamIds[j],
            matchOvers,
            status: "SCHEDULED",
            scheduledAt: Date.now() + matchNumber * 6e4
          });
          matchNumber++;
        }
      }
    } else if (n === 10) {
      const groupA = teamIds.slice(0, 5);
      const groupB = teamIds.slice(5, 10);
      for (let i = 0; i < groupA.length; i++) {
        for (let j = i + 1; j < groupA.length; j++) {
          fixtures.push({
            id: `FIX-${tournamentId}-M${matchNumber}`,
            tournamentId,
            matchNumber,
            roundNumber: 1,
            stage: "GROUP",
            homeFranchiseId: groupA[i],
            awayFranchiseId: groupA[j],
            matchOvers,
            status: "SCHEDULED",
            scheduledAt: Date.now() + matchNumber * 6e4
          });
          matchNumber++;
        }
      }
      for (let i = 0; i < groupB.length; i++) {
        for (let j = i + 1; j < groupB.length; j++) {
          fixtures.push({
            id: `FIX-${tournamentId}-M${matchNumber}`,
            tournamentId,
            matchNumber,
            roundNumber: 1,
            stage: "GROUP",
            homeFranchiseId: groupB[i],
            awayFranchiseId: groupB[j],
            matchOvers,
            status: "SCHEDULED",
            scheduledAt: Date.now() + matchNumber * 6e4
          });
          matchNumber++;
        }
      }
    } else {
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          fixtures.push({
            id: `FIX-${tournamentId}-M${matchNumber}`,
            tournamentId,
            matchNumber,
            roundNumber: 1,
            stage: "GROUP",
            homeFranchiseId: teamIds[i],
            awayFranchiseId: teamIds[j],
            matchOvers,
            status: "SCHEDULED",
            scheduledAt: Date.now() + matchNumber * 6e4
          });
          matchNumber++;
        }
      }
    }
    return fixtures;
  }
  /**
   * Generates playoff fixtures based on standings
   */
  static generateNextPlayoffFixture(tournamentId, teamsCount, standings, completedPlayoffs, matchOvers) {
    const nextMatchNum = (completedPlayoffs.length > 0 ? Math.max(...completedPlayoffs.map((p) => p.matchNumber)) : 0) + 1;
    if (teamsCount === 4) {
      const hasFinal = completedPlayoffs.some((p) => p.stage === "FINAL");
      if (!hasFinal && standings.length >= 2) {
        return {
          id: `FIX-${tournamentId}-FINAL`,
          tournamentId,
          matchNumber: nextMatchNum,
          roundNumber: 3,
          stage: "FINAL",
          homeFranchiseId: standings[0],
          awayFranchiseId: standings[1],
          matchOvers,
          status: "SCHEDULED",
          scheduledAt: Date.now()
        };
      }
    } else if (teamsCount === 6 || teamsCount === 8) {
      const q1 = completedPlayoffs.find((p) => p.stage === "QUALIFIER_1");
      const elim = completedPlayoffs.find((p) => p.stage === "ELIMINATOR");
      const q2 = completedPlayoffs.find((p) => p.stage === "QUALIFIER_2");
      const finalMatch = completedPlayoffs.find((p) => p.stage === "FINAL");
      if (!q1 && standings.length >= 2) {
        return {
          id: `FIX-${tournamentId}-Q1`,
          tournamentId,
          matchNumber: nextMatchNum,
          roundNumber: 2,
          stage: "QUALIFIER_1",
          homeFranchiseId: standings[0],
          awayFranchiseId: standings[1],
          matchOvers,
          status: "SCHEDULED",
          scheduledAt: Date.now()
        };
      }
      if (!elim && standings.length >= 4) {
        return {
          id: `FIX-${tournamentId}-ELIM`,
          tournamentId,
          matchNumber: nextMatchNum,
          roundNumber: 2,
          stage: "ELIMINATOR",
          homeFranchiseId: standings[2],
          awayFranchiseId: standings[3],
          matchOvers,
          status: "SCHEDULED",
          scheduledAt: Date.now()
        };
      }
      if (q1 && elim && q1.status === "COMPLETED" && elim.status === "COMPLETED" && !q2) {
        const loserQ1 = q1.winnerFranchiseId === q1.homeFranchiseId ? q1.awayFranchiseId : q1.homeFranchiseId;
        const winnerElim = elim.winnerFranchiseId;
        return {
          id: `FIX-${tournamentId}-Q2`,
          tournamentId,
          matchNumber: nextMatchNum,
          roundNumber: 3,
          stage: "QUALIFIER_2",
          homeFranchiseId: loserQ1,
          awayFranchiseId: winnerElim,
          matchOvers,
          status: "SCHEDULED",
          scheduledAt: Date.now()
        };
      }
      if (q1 && q2 && q1.status === "COMPLETED" && q2.status === "COMPLETED" && !finalMatch) {
        const winnerQ1 = q1.winnerFranchiseId;
        const winnerQ2 = q2.winnerFranchiseId;
        return {
          id: `FIX-${tournamentId}-FINAL`,
          tournamentId,
          matchNumber: nextMatchNum,
          roundNumber: 4,
          stage: "FINAL",
          homeFranchiseId: winnerQ1,
          awayFranchiseId: winnerQ2,
          matchOvers,
          status: "SCHEDULED",
          scheduledAt: Date.now()
        };
      }
    } else if (teamsCount === 10) {
      const sf1 = completedPlayoffs.find((p) => p.stage === "SEMI_FINAL_1");
      const sf2 = completedPlayoffs.find((p) => p.stage === "SEMI_FINAL_2");
      const finalMatch = completedPlayoffs.find((p) => p.stage === "FINAL");
      if (!sf1 && standings.length >= 4) {
        return {
          id: `FIX-${tournamentId}-SF1`,
          tournamentId,
          matchNumber: nextMatchNum,
          roundNumber: 2,
          stage: "SEMI_FINAL_1",
          homeFranchiseId: standings[0],
          awayFranchiseId: standings[3],
          matchOvers,
          status: "SCHEDULED",
          scheduledAt: Date.now()
        };
      }
      if (!sf2 && standings.length >= 4) {
        return {
          id: `FIX-${tournamentId}-SF2`,
          tournamentId,
          matchNumber: nextMatchNum,
          roundNumber: 2,
          stage: "SEMI_FINAL_2",
          homeFranchiseId: standings[1],
          awayFranchiseId: standings[2],
          matchOvers,
          status: "SCHEDULED",
          scheduledAt: Date.now()
        };
      }
      if (sf1 && sf2 && sf1.status === "COMPLETED" && sf2.status === "COMPLETED" && !finalMatch) {
        return {
          id: `FIX-${tournamentId}-FINAL`,
          tournamentId,
          matchNumber: nextMatchNum,
          roundNumber: 3,
          stage: "FINAL",
          homeFranchiseId: sf1.winnerFranchiseId,
          awayFranchiseId: sf2.winnerFranchiseId,
          matchOvers,
          status: "SCHEDULED",
          scheduledAt: Date.now()
        };
      }
    }
    return null;
  }
};

// server/src/tournamentStorage.ts
import fs3 from "fs";
import path4 from "path";
import os2 from "os";
import { fileURLToPath as fileURLToPath3 } from "url";
var __filename3 = fileURLToPath3(import.meta.url);
var __dirname3 = path4.dirname(__filename3);
var getTournamentStorageFilePath = () => {
  const isServerless2 = Boolean(
    process.env.VERCEL || process.env.VERCEL_ENV || process.env.VERCEL_URL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT
  );
  const defaultDir = isServerless2 ? path4.join(os2.tmpdir(), "bidwars_data") : path4.join(process.cwd(), "server", "data");
  if (!fs3.existsSync(defaultDir)) {
    try {
      fs3.mkdirSync(defaultDir, { recursive: true });
    } catch {
    }
  }
  return path4.join(defaultDir, "persisted_tournaments.json");
};
var storageFilePath2 = getTournamentStorageFilePath();
var profilesFilePath = path4.join(path4.dirname(storageFilePath2), "persisted_profiles.json");
var matchesFilePath = path4.join(path4.dirname(storageFilePath2), "persisted_matches.json");
var TournamentStorageService = class {
  saveTimeout = null;
  tournamentsCache = /* @__PURE__ */ new Map();
  pendingSaves = /* @__PURE__ */ new Map();
  profilesCache = /* @__PURE__ */ new Map();
  matchesCache = /* @__PURE__ */ new Map();
  isLoaded = false;
  isProfilesLoaded = false;
  isMatchesLoaded = false;
  constructor() {
    this.init();
  }
  init() {
    try {
      const dir = path4.dirname(storageFilePath2);
      if (!fs3.existsSync(dir)) {
        fs3.mkdirSync(dir, { recursive: true });
      }
    } catch (err) {
      console.warn("[TournamentStorage] Could not create storage directory:", err);
    }
  }
  async loadAllTournaments() {
    this.tournamentsCache.clear();
    try {
      if (fs3.existsSync(storageFilePath2)) {
        const raw = fs3.readFileSync(storageFilePath2, "utf-8");
        if (raw.trim()) {
          const list = JSON.parse(raw);
          for (const t of list) {
            if (t.id) this.tournamentsCache.set(t.id, t);
          }
          console.log(`[TournamentStorage] Loaded ${this.tournamentsCache.size} tournaments from disk`);
        }
      }
    } catch (err) {
      console.error("[TournamentStorage] Error reading tournaments from disk:", err);
    }
    const clientToUse = supabaseAdmin || supabase;
    if (clientToUse) {
      try {
        const { data, error } = await clientToUse.from("tournaments").select("*").limit(100);
        if (!error && data) {
          for (const row of data) {
            const rawFormat = row.format_details || row.data_payload;
            let formatObj = null;
            if (rawFormat) {
              formatObj = typeof rawFormat === "string" ? JSON.parse(rawFormat) : rawFormat;
            }
            if (!formatObj && row.id) {
              formatObj = {
                id: row.id,
                name: row.name,
                hostId: row.host_id,
                hostName: row.host_name || "Host",
                status: row.status,
                auctionType: "MEGA",
                teamsCount: row.teams_count || 8,
                matchOvers: row.match_overs || 5,
                roomCode: row.room_code,
                members: [],
                teams: {},
                fixtures: [],
                pointsTable: [],
                playerStats: {},
                createdAt: new Date(row.created_at || Date.now()).getTime(),
                updatedAt: new Date(row.updated_at || Date.now()).getTime()
              };
            }
            if (formatObj && row.id) {
              if (row.host_name && !formatObj.hostName) {
                formatObj.hostName = row.host_name;
              }
              const disk = this.tournamentsCache.get(row.id);
              if (!disk || (formatObj.updatedAt || 0) >= (disk.updatedAt || 0)) {
                this.tournamentsCache.set(row.id, formatObj);
              }
            }
          }
          console.log(`[TournamentStorage] Synced ${this.tournamentsCache.size} tournaments with Supabase`);
        } else if (error) {
          console.warn("[TournamentStorage] Supabase load warning:", error.message);
        }
      } catch (err) {
        console.warn("[TournamentStorage] Supabase sync fallback:", err);
      }
    }
    this.isLoaded = true;
    return Array.from(this.tournamentsCache.values());
  }
  async getTournament(id) {
    if (!this.isLoaded) {
      await this.loadAllTournaments();
    }
    return this.tournamentsCache.get(id);
  }
  saveTournament(tournament) {
    const updated = {
      ...tournament,
      updatedAt: Date.now()
    };
    this.pendingSaves.set(tournament.id, updated);
    this.tournamentsCache.set(tournament.id, updated);
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.flushToDisk();
    }, 300);
  }
  deleteTournament(id) {
    this.pendingSaves.delete(id);
    this.tournamentsCache.delete(id);
    this.flushToDisk(id);
  }
  flushToDisk(deletedId) {
    try {
      if (deletedId) {
        this.tournamentsCache.delete(deletedId);
      }
      const list = Array.from(this.tournamentsCache.values());
      const tempPath = `${storageFilePath2}.tmp`;
      fs3.writeFileSync(tempPath, JSON.stringify(list), "utf-8");
      fs3.renameSync(tempPath, storageFilePath2);
      const clientToUse = supabaseAdmin || supabase;
      if (clientToUse && this.pendingSaves.size > 0) {
        const toSync = Array.from(this.pendingSaves.values());
        this.pendingSaves.clear();
        (async () => {
          for (const t of toSync) {
            try {
              const { error: tErr } = await clientToUse.from("tournaments").upsert({
                id: t.id,
                name: t.name,
                host_id: t.hostId,
                host_name: t.hostName || "Host",
                status: t.status,
                teams_count: t.teamsCount,
                match_overs: t.matchOvers,
                room_code: t.roomCode,
                format_details: t,
                data_payload: t,
                winner_franchise_id: t.winnerFranchiseId,
                runner_up_franchise_id: t.runnerUpFranchiseId,
                updated_at: (/* @__PURE__ */ new Date()).toISOString()
              });
              if (tErr) {
                console.error(`[TournamentStorage] Supabase tournament upsert error for ${t.id}:`, tErr);
                continue;
              }
              if (t.members && t.members.length > 0) {
                for (const m of t.members) {
                  const { error: mErr } = await clientToUse.from("tournament_members").upsert({
                    tournament_id: t.id,
                    user_id: m.userId,
                    user_name: m.userName,
                    user_email: m.userEmail || null,
                    franchise_id: m.franchiseId,
                    is_host: Boolean(m.isHost),
                    joined_at: new Date(m.joinedAt || Date.now()).toISOString()
                  }, { onConflict: "tournament_id,user_id" });
                  if (mErr) {
                    console.error(`[TournamentStorage] Member upsert error (${t.id}, ${m.userId}):`, mErr);
                  }
                }
              }
              if (t.fixtures && t.fixtures.length > 0) {
                for (const f of t.fixtures) {
                  const { error: fErr } = await clientToUse.from("fixtures").upsert({
                    id: f.id,
                    tournament_id: t.id,
                    match_number: f.matchNumber,
                    round_number: f.roundNumber,
                    stage: f.stage,
                    home_franchise_id: f.homeFranchiseId,
                    away_franchise_id: f.awayFranchiseId,
                    match_overs: f.matchOvers,
                    status: f.status,
                    match_id: f.matchId || null,
                    winner_franchise_id: f.winnerFranchiseId || null,
                    match_result_summary: f.matchResultSummary || null,
                    scheduled_at: new Date(f.scheduledAt).toISOString(),
                    completed_at: f.completedAt ? new Date(f.completedAt).toISOString() : null
                  });
                  if (fErr) {
                    console.error(`[TournamentStorage] Fixture upsert error (${t.id}, ${f.id}):`, fErr);
                  }
                }
              }
              if (t.teams) {
                for (const team of Object.values(t.teams)) {
                  const { error: tmErr } = await clientToUse.from("tournament_teams").upsert({
                    tournament_id: t.id,
                    franchise_id: team.franchiseId,
                    owner_user_id: team.ownerUserId,
                    owner_user_name: team.ownerUserName,
                    purse_remaining: team.purseRemaining,
                    squad: team.squad,
                    default_lineup: team.defaultPlayingXI,
                    updated_at: (/* @__PURE__ */ new Date()).toISOString()
                  }, { onConflict: "tournament_id,franchise_id" });
                  if (tmErr) {
                    console.error(`[TournamentStorage] Team upsert error (${t.id}, ${team.franchiseId}):`, tmErr);
                  }
                }
              }
            } catch (syncErr) {
              console.error(`[TournamentStorage] Error syncing tournament ${t.id} to Supabase:`, syncErr);
            }
          }
        })();
      } else {
        this.pendingSaves.clear();
      }
    } catch (err) {
      console.error("[TournamentStorage] Error flushing tournaments to disk:", err);
    }
  }
  // ==========================================
  // PROFILE STORAGE METHODS
  // ==========================================
  async loadAllProfiles() {
    if (this.isProfilesLoaded) {
      return Array.from(this.profilesCache.values());
    }
    this.profilesCache.clear();
    const clientToUse = supabaseAdmin || supabase;
    if (clientToUse) {
      try {
        const { data, error } = await clientToUse.from("profiles").select("*").limit(1e3);
        if (!error && Array.isArray(data)) {
          for (const row of data) {
            if (row.id) {
              this.profilesCache.set(row.id, {
                id: row.id,
                username: row.username || row.in_game_name || row.display_name,
                inGameName: row.in_game_name || row.username || row.display_name,
                email: row.email,
                recoveryEmail: row.recovery_email,
                avatarUrl: row.avatar_url,
                passwordHash: row.password_hash,
                salt: row.password_salt,
                createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
                updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
              });
            }
          }
          console.log(`[TournamentStorage] Synced ${data.length} profiles from Supabase database`);
          this.isProfilesLoaded = true;
          return Array.from(this.profilesCache.values());
        }
      } catch (err) {
        console.warn("[TournamentStorage] Supabase profile sync fallback:", err);
      }
    }
    try {
      if (fs3.existsSync(profilesFilePath)) {
        const raw = fs3.readFileSync(profilesFilePath, "utf-8");
        if (raw.trim()) {
          const list = JSON.parse(raw);
          for (const p of list) {
            if (p.id) this.profilesCache.set(p.id, p);
          }
        }
      }
    } catch (err) {
      console.warn("[TournamentStorage] Disk profile read fallback:", err);
    }
    this.isProfilesLoaded = true;
    return Array.from(this.profilesCache.values());
  }
  async getProfile(userId) {
    const clientToUse = supabaseAdmin || supabase;
    if (clientToUse) {
      try {
        const { data, error } = await clientToUse.from("profiles").select("*").eq("id", userId).maybeSingle();
        if (!error && data) {
          const prof = {
            id: data.id,
            username: data.username || data.in_game_name,
            inGameName: data.in_game_name || data.username,
            email: data.email,
            recoveryEmail: data.recovery_email,
            avatarUrl: data.avatar_url,
            passwordHash: data.password_hash,
            salt: data.password_salt,
            createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
            updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : Date.now()
          };
          this.profilesCache.set(data.id, prof);
          return prof;
        }
      } catch {
      }
    }
    await this.loadAllProfiles();
    return this.profilesCache.get(userId);
  }
  async getProfileByUsername(username) {
    const cleanLower = username.trim().toLowerCase();
    const clientToUse = supabaseAdmin || supabase;
    if (clientToUse) {
      try {
        const { data, error } = await clientToUse.from("profiles").select("*").or(`username.ilike.${cleanLower},in_game_name.ilike.${cleanLower}`).maybeSingle();
        if (!error && data) {
          const prof = {
            id: data.id,
            username: data.username || data.in_game_name,
            inGameName: data.in_game_name || data.username,
            email: data.email,
            recoveryEmail: data.recovery_email,
            avatarUrl: data.avatar_url,
            passwordHash: data.password_hash,
            salt: data.password_salt,
            createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
            updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : Date.now()
          };
          this.profilesCache.set(data.id, prof);
          return prof;
        }
      } catch {
      }
    }
    await this.loadAllProfiles();
    for (const p of this.profilesCache.values()) {
      const uName = (p.username || p.inGameName || "").trim().toLowerCase();
      if (uName === cleanLower) {
        return p;
      }
    }
    return void 0;
  }
  async isEmailAvailable(email, excludeUserId) {
    const cleanLower = email.trim().toLowerCase();
    if (!cleanLower) return false;
    const clientToUse = supabaseAdmin || supabase;
    if (clientToUse) {
      try {
        const { data, error } = await clientToUse.from("profiles").select("id, email, recovery_email").or(`email.ilike.${cleanLower},recovery_email.ilike.${cleanLower}`);
        if (!error && Array.isArray(data)) {
          const conflict = data.find((row) => !excludeUserId || row.id !== excludeUserId);
          return !conflict;
        }
      } catch (err) {
        console.warn("[TournamentStorage] Supabase isEmailAvailable check fallback:", err);
      }
    }
    await this.loadAllProfiles();
    for (const [id, p] of this.profilesCache.entries()) {
      if (excludeUserId && id === excludeUserId) continue;
      const existingEmail = (p.email || p.recoveryEmail || "").trim().toLowerCase();
      if (existingEmail === cleanLower) {
        return false;
      }
    }
    return true;
  }
  async getProfileByEmail(email) {
    const cleanLower = email.trim().toLowerCase();
    const clientToUse = supabaseAdmin || supabase;
    if (clientToUse) {
      try {
        const { data, error } = await clientToUse.from("profiles").select("*").ilike("email", cleanLower).maybeSingle();
        if (!error && data) {
          const prof = {
            id: data.id,
            username: data.username || data.in_game_name,
            inGameName: data.in_game_name || data.username,
            email: data.email,
            recoveryEmail: data.recovery_email,
            avatarUrl: data.avatar_url,
            createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
            updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : Date.now()
          };
          this.profilesCache.set(data.id, prof);
          return prof;
        }
      } catch {
      }
    }
    await this.loadAllProfiles();
    for (const p of this.profilesCache.values()) {
      const uEmail = (p.email || p.recoveryEmail || "").trim().toLowerCase();
      if (uEmail === cleanLower) {
        return p;
      }
    }
    return void 0;
  }
  async getLegacyCredentials(username) {
    const cleanLower = username.trim().toLowerCase();
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from("auth_secrets").select("user_id, username, password_hash, password_salt").ilike("username", cleanLower).maybeSingle();
        if (!error && data && data.password_hash && data.password_salt) {
          return {
            id: data.user_id,
            username: data.username,
            inGameName: data.username,
            passwordHash: data.password_hash,
            salt: data.password_salt
          };
        }
      } catch {
      }
    }
    try {
      if (fs3.existsSync(profilesFilePath)) {
        const raw = fs3.readFileSync(profilesFilePath, "utf-8");
        if (raw.trim()) {
          const list = JSON.parse(raw);
          for (const p of list) {
            const uName = (p.username || p.inGameName || "").trim().toLowerCase();
            if (uName === cleanLower && p.passwordHash && p.salt) {
              return {
                id: p.id,
                username: p.username || p.inGameName,
                inGameName: p.inGameName || p.username,
                passwordHash: p.passwordHash,
                salt: p.salt
              };
            }
          }
        }
      }
    } catch {
    }
    return void 0;
  }
  async updateCredentials(userId, passwordHash, salt) {
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from("auth_secrets").upsert({
          user_id: userId,
          password_hash: passwordHash,
          password_salt: salt,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        });
      } catch (err) {
        console.error("[tournamentStorage] updateCredentials error:", err);
      }
    }
  }
  async isNameAvailable(name, excludeUserId) {
    const cleanLower = name.trim().toLowerCase();
    if (!cleanLower) return false;
    const clientToUse = supabaseAdmin || supabase;
    if (clientToUse) {
      try {
        const { data, error } = await clientToUse.from("profiles").select("id, username, in_game_name").or(`username.ilike.${cleanLower},in_game_name.ilike.${cleanLower}`);
        if (!error && Array.isArray(data)) {
          const conflict = data.find((row) => !excludeUserId || row.id !== excludeUserId);
          return !conflict;
        }
      } catch (err) {
        console.warn("[TournamentStorage] Supabase isNameAvailable check fallback:", err);
      }
    }
    await this.loadAllProfiles();
    for (const [id, p] of this.profilesCache.entries()) {
      if (excludeUserId && id === excludeUserId) continue;
      const existingName = (p.username || p.inGameName || "").trim().toLowerCase();
      if (existingName === cleanLower) {
        return false;
      }
    }
    return true;
  }
  async saveProfile(profile) {
    const cleanUsername = (profile.username || profile.inGameName).trim();
    const updated = {
      ...profile,
      username: cleanUsername,
      inGameName: cleanUsername,
      updatedAt: Date.now()
    };
    const clientToUse = supabaseAdmin || supabase;
    if (!clientToUse) {
      throw new Error("Supabase database service is not configured. Local JSON fallback persistence is strictly disabled.");
    }
    const { error } = await clientToUse.from("profiles").upsert({
      id: updated.id,
      username: updated.username,
      in_game_name: updated.inGameName,
      display_name: updated.inGameName,
      email: updated.email,
      recovery_email: updated.recoveryEmail,
      avatar_url: updated.avatarUrl,
      updated_at: new Date(updated.updatedAt).toISOString()
    });
    if (error) {
      console.error("[TournamentStorage] Supabase saveProfile error:", error.message);
      throw new Error(`Failed to persist profile to Supabase database: ${error.message}`);
    }
    if (updated.passwordHash && updated.salt && supabaseAdmin) {
      try {
        await supabaseAdmin.from("auth_secrets").upsert({
          user_id: updated.id,
          username: updated.username,
          password_hash: updated.passwordHash,
          password_salt: updated.salt,
          updated_at: new Date(updated.updatedAt).toISOString()
        });
      } catch (secErr) {
        console.warn("[TournamentStorage] auth_secrets backup notice:", secErr.message);
      }
    }
    this.profilesCache.set(profile.id, updated);
    console.log(`[TournamentStorage] Profile "${updated.username}" successfully persisted in Supabase database`);
    return updated;
  }
  /**
   * Load all persisted matches from local disk and Supabase public.matches
   */
  async loadAllMatches() {
    this.matchesCache.clear();
    try {
      if (fs3.existsSync(matchesFilePath)) {
        const raw = fs3.readFileSync(matchesFilePath, "utf-8");
        if (raw.trim()) {
          const list = JSON.parse(raw);
          for (const m of list) {
            if (m.id) this.matchesCache.set(m.id, m);
          }
          console.log(`[TournamentStorage] Loaded ${this.matchesCache.size} matches from disk`);
        }
      }
    } catch (err) {
      console.warn("[TournamentStorage] Error reading matches file:", err);
    }
    const clientToUse = supabaseAdmin || supabase;
    if (clientToUse) {
      try {
        const { data, error } = await clientToUse.from("matches").select("*");
        if (!error && Array.isArray(data)) {
          for (const row of data) {
            if (row.id) {
              const liveState = row.live_state || {
                id: row.id,
                tournamentId: row.tournament_id,
                fixtureId: row.fixture_id,
                homeFranchiseId: row.home_franchise_id,
                awayFranchiseId: row.away_franchise_id,
                matchOvers: row.match_overs,
                maxBowlerOvers: Math.ceil((row.match_overs || 5) / 5),
                status: row.status,
                tossWinnerFranchiseId: row.toss_winner_franchise_id,
                tossDecision: row.toss_decision,
                currentInnings: row.current_innings,
                innings1: row.innings1 || row.innings_1_data,
                innings2: row.innings2 || row.innings_2_data,
                targetRuns: row.target_runs,
                lineups: row.lineups || {},
                pendingInputs: {},
                impactPlayersUsed: {},
                ballHistory: row.ball_history || [],
                winnerFranchiseId: row.winner_franchise_id,
                resultSummary: row.result_summary || row.result_text,
                createdAt: new Date(row.created_at || Date.now()).getTime(),
                updatedAt: new Date(row.updated_at || Date.now()).getTime()
              };
              this.matchesCache.set(row.id, liveState);
            }
          }
        }
      } catch (err) {
        console.warn("[TournamentStorage] Supabase load matches notice:", err.message);
      }
    }
    this.isMatchesLoaded = true;
    return Array.from(this.matchesCache.values());
  }
  getMatch(matchId) {
    return this.matchesCache.get(matchId);
  }
  saveMatch(match) {
    if (!match || !match.id) return;
    this.matchesCache.set(match.id, match);
    try {
      const list = Array.from(this.matchesCache.values());
      fs3.writeFileSync(matchesFilePath, JSON.stringify(list, null, 2), "utf-8");
    } catch (err) {
      console.warn("[TournamentStorage] Error writing matches file:", err);
    }
    const clientToUse = supabaseAdmin || supabase;
    if (clientToUse) {
      (async () => {
        try {
          const { error } = await clientToUse.from("matches").upsert(
            {
              id: match.id,
              tournament_id: match.tournamentId,
              fixture_id: match.fixtureId,
              home_franchise_id: match.homeFranchiseId,
              away_franchise_id: match.awayFranchiseId,
              match_overs: match.matchOvers,
              status: match.status,
              toss_winner_franchise_id: match.tossWinnerFranchiseId || null,
              toss_decision: match.tossDecision || null,
              current_innings: match.currentInnings,
              innings1: match.innings1,
              innings2: match.innings2 || null,
              live_state: match,
              target_runs: match.targetRuns || null,
              lineups: match.lineups,
              ball_history: match.ballHistory,
              winner_franchise_id: match.winnerFranchiseId || null,
              result_summary: match.resultSummary || null,
              updated_at: new Date(match.updatedAt || Date.now()).toISOString()
            },
            { onConflict: "id" }
          );
          if (error) {
            console.warn("[TournamentStorage] Supabase saveMatch warning:", error.message);
          }
        } catch (err) {
          console.warn("[TournamentStorage] Supabase saveMatch async exception:", err?.message || err);
        }
      })();
    }
  }
};
var tournamentStorage = new TournamentStorageService();

// server/src/tournamentManager.ts
var TournamentManager = class {
  tournaments = /* @__PURE__ */ new Map();
  liveMatches = /* @__PURE__ */ new Map();
  allPlayersMap = /* @__PURE__ */ new Map();
  isInitialized = false;
  generatingFixtures = /* @__PURE__ */ new Set();
  constructor() {
    this.initPlayersMap();
    try {
      roomManager.addAuctionCompletedListener((roomCode) => {
        this.onAuctionCompleted(roomCode).catch((err) => {
          console.error(`[TournamentManager] Auto fixture generation error for room ${roomCode}:`, err);
        });
      });
      roomManager.addPlayingXIUpdatedListener((roomCode, tournamentId, teamId, selection) => {
        this.syncRoomPlayingXI(tournamentId, teamId, selection);
      });
    } catch (err) {
      console.warn("[TournamentManager] Could not register auction listener:", err);
    }
  }
  initPlayersMap() {
    try {
      const players = getAllPlayers("2026");
      for (const p of players) {
        this.allPlayersMap.set(p.id, p);
      }
    } catch (err) {
      console.warn("[TournamentManager] Could not preload players:", err);
    }
  }
  async init() {
    if (this.isInitialized) return;
    const loaded = await tournamentStorage.loadAllTournaments();
    for (const t of loaded) {
      this.tournaments.set(t.id, t);
    }
    const matches = await tournamentStorage.loadAllMatches();
    for (const m of matches) {
      this.liveMatches.set(m.id, m);
    }
    this.isInitialized = true;
    console.log(`[TournamentManager] Initialized with ${this.tournaments.size} tournaments and ${this.liveMatches.size} live matches`);
  }
  getAllTournaments() {
    return Array.from(this.tournaments.values());
  }
  /**
   * STRICT PRIVACY: Returns only tournaments created or joined by this user
   */
  getUserTournaments(userId) {
    if (!userId) return [];
    return Array.from(this.tournaments.values()).filter(
      (t) => t.hostId === userId || t.members.some((m) => m.userId === userId)
    );
  }
  getTournamentByRoomCode(roomCode) {
    const cleanCode = roomCode.trim().toUpperCase();
    for (const t of this.tournaments.values()) {
      if (t.roomCode && t.roomCode.trim().toUpperCase() === cleanCode) {
        return t;
      }
    }
    return void 0;
  }
  getTournament(id, userId) {
    let tournament = this.tournaments.get(id);
    if (!tournament) {
      const clean = id.trim().toUpperCase();
      for (const t of this.tournaments.values()) {
        if (t.code?.toUpperCase() === clean || t.roomCode && t.roomCode.toUpperCase() === clean) {
          tournament = t;
          break;
        }
      }
    }
    if (!tournament) return null;
    if ((tournament.status === "AUCTION" || !tournament.fixtures || tournament.fixtures.length === 0) && tournament.roomCode) {
      const room = roomManager.getRoom(tournament.roomCode);
      if (room && room.getState().status === "COMPLETED") {
        this.syncAuctionCompleted(tournament.roomCode);
      }
    }
    if (userId) {
      const isMember = tournament.hostId === userId || tournament.members.some((m) => m.userId === userId);
      if (!isMember) return null;
    }
    return tournament;
  }
  isUserTournamentMember(tournamentId, userId) {
    const tournament = this.getTournament(tournamentId);
    if (!tournament) return false;
    return tournament.hostId === userId || tournament.members.some((m) => m.userId === userId);
  }
  /**
   * Synchronous authoritative fixture generation triggered upon backend auction completion
   */
  syncAuctionCompleted(roomCode) {
    const tournament = this.getTournamentByRoomCode(roomCode);
    if (!tournament) return false;
    if (tournament.fixtures && tournament.fixtures.length > 0 && tournament.status !== "AUCTION") {
      return true;
    }
    if (this.generatingFixtures.has(tournament.id)) {
      return true;
    }
    this.generatingFixtures.add(tournament.id);
    try {
      console.log(`[TournamentManager] Auto-generating fixtures for tournament ${tournament.id} (${tournament.name})...`);
      const room = roomManager.getRoom(roomCode);
      if (room) {
        const state = room.getState();
        const teamSquads = state.teamSquads;
        const teamPurses = state.teamPurse;
        for (const member of tournament.members) {
          const fid = member.franchiseId;
          const rawSquad = teamSquads[fid] || [];
          const purse = teamPurses[fid] !== void 0 ? teamPurses[fid] / 1e7 : 0;
          const seenPids = /* @__PURE__ */ new Set();
          const squad = rawSquad.filter((p) => {
            if (!p || !p.id || seenPids.has(p.id)) return false;
            seenPids.add(p.id);
            return true;
          });
          const sorted = [...squad].sort((a, b) => (b.ovr || 75) - (a.ovr || 75));
          const playingXI = sorted.slice(0, 11).map((p) => p.id);
          const captainId = playingXI[0] || "";
          const viceCaptainId = playingXI[1] || "";
          const impactPlayerId = sorted[11]?.id;
          tournament.teams[fid] = {
            franchiseId: fid,
            ownerUserId: member.userId,
            ownerUserName: member.userName,
            purseRemaining: purse,
            squad,
            defaultPlayingXI: {
              playingXI,
              captainId,
              viceCaptainId,
              impactPlayerId
            }
          };
        }
      }
      const teamIds = tournament.members.map((m) => m.franchiseId);
      const fixtures = FixtureGenerator.generateGroupStageFixtures(tournament.id, teamIds, tournament.matchOvers);
      const pointsTable = teamIds.map((fid) => ({
        franchiseId: fid,
        played: 0,
        won: 0,
        lost: 0,
        tied: 0,
        nr: 0,
        points: 0,
        runsScored: 0,
        oversBatted: 0,
        runsConceded: 0,
        oversBowled: 0,
        nrr: 0
      }));
      tournament.fixtures = fixtures;
      tournament.pointsTable = pointsTable;
      tournament.status = "TOURNAMENT_LIVE";
      tournament.updatedAt = Date.now();
      tournamentStorage.saveTournament(tournament);
      console.log(`[TournamentManager] Successfully auto-generated ${fixtures.length} fixtures for tournament ${tournament.id}`);
      if (room) {
        room.broadcastState({
          type: "TOURNAMENT_FIXTURES_GENERATED",
          tournamentId: tournament.id,
          fixturesCount: fixtures.length,
          status: tournament.status
        });
      }
      return true;
    } catch (err) {
      console.error(`[TournamentManager] Error auto-generating fixtures for tournament ${tournament.id}:`, err);
      return false;
    } finally {
      this.generatingFixtures.delete(tournament.id);
    }
  }
  /**
   * Automatic fixture generation triggered authoritatively by backend auction completion
   */
  async onAuctionCompleted(roomCode) {
    return this.syncAuctionCompleted(roomCode);
  }
  getLiveMatch(matchId) {
    let match = this.liveMatches.get(matchId);
    if (!match) {
      match = tournamentStorage.getMatch(matchId);
      if (match) {
        this.liveMatches.set(matchId, match);
      }
    }
    return match;
  }
  /**
   * Generates a clean Tournament ID
   */
  generateTournamentId() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "TRN-";
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (this.tournaments.has(code)) {
      return this.generateTournamentId();
    }
    return code;
  }
  /**
   * 1. Create a new persistent tournament
   * Enforces 1 user account = 1 team constraint from the start
   */
  async createTournament(name, hostId, hostName, hostEmail, teamsCount, matchOvers, hostFranchiseId, auctionType = "MEGA") {
    await this.init();
    const tournamentId = this.generateTournamentId();
    const now = Date.now();
    const poolMode = auctionType === "MINI" ? "auction_pool" : "mega_all";
    const roomSettings = {
      season: "2026",
      poolMode,
      startingPurse: 12e8,
      timerDuration: 15,
      isPrivate: false,
      tournamentId,
      hostId,
      hostFranchiseId
    };
    const auctionRoom = roomManager.createRoom(hostName, roomSettings);
    auctionRoom.preRegisterMember(hostId, hostName, hostFranchiseId, true);
    auctionRoom.selectTeam(hostId, hostFranchiseId);
    const hostMember = {
      userId: hostId,
      userEmail: hostEmail,
      userName: hostName,
      franchiseId: hostFranchiseId,
      isHost: true,
      joinedAt: now
    };
    const hostTeam = {
      franchiseId: hostFranchiseId,
      ownerUserId: hostId,
      ownerUserName: hostName,
      purseRemaining: 120,
      squad: []
    };
    const tournament = {
      id: tournamentId,
      name: name.trim() || `IPL Tournament ${tournamentId}`,
      hostId,
      hostName,
      status: "REGISTRATION",
      auctionType,
      teamsCount,
      matchOvers,
      roomCode: auctionRoom.roomCode,
      members: [hostMember],
      teams: {
        [hostFranchiseId]: hostTeam
      },
      fixtures: [],
      pointsTable: [],
      playerStats: {},
      createdAt: now,
      updatedAt: now
    };
    this.tournaments.set(tournamentId, tournament);
    tournamentStorage.saveTournament(tournament);
    return tournament;
  }
  /**
   * 2. Join an existing tournament
   * STRICT CONSTRAINT: 1 Google account / user ID can control only ONE team in a tournament.
   * Also ensures the chosen franchise isn't already claimed.
   */
  async joinTournament(tournamentId, userId, userName, userEmail, franchiseId) {
    await this.init();
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) {
      return { success: false, message: "Tournament not found" };
    }
    if (tournament.status !== "REGISTRATION") {
      return { success: false, message: `Cannot join tournament in ${tournament.status} state` };
    }
    const existingUserMember = tournament.members.find((m) => m.userId === userId);
    if (existingUserMember) {
      return {
        success: false,
        message: `You already control team ${existingUserMember.franchiseId} in this tournament. Each account may only control 1 team.`
      };
    }
    const existingFranchiseMember = tournament.members.find((m) => m.franchiseId === franchiseId);
    if (existingFranchiseMember) {
      return {
        success: false,
        message: `Franchise ${franchiseId} is already claimed by ${existingFranchiseMember.userName}. Please choose another team.`
      };
    }
    if (tournament.members.length >= tournament.teamsCount) {
      return { success: false, message: `Tournament is full (${tournament.teamsCount} teams maximum)` };
    }
    const now = Date.now();
    const newMember = {
      userId,
      userEmail,
      userName,
      franchiseId,
      isHost: false,
      joinedAt: now
    };
    const newTeam = {
      franchiseId,
      ownerUserId: userId,
      ownerUserName: userName,
      purseRemaining: 120,
      squad: []
    };
    tournament.members.push(newMember);
    tournament.teams[franchiseId] = newTeam;
    tournament.updatedAt = now;
    const auctionRoom = roomManager.getRoom(tournament.roomCode);
    if (auctionRoom) {
      auctionRoom.preRegisterMember(userId, userName, franchiseId, false);
      auctionRoom.selectTeam(userId, franchiseId);
    }
    tournamentStorage.saveTournament(tournament);
    return { success: true, tournament };
  }
  /**
   * Delete tournament (STRICT: Only the original tournament creator can delete)
   */
  async deleteTournament(tournamentId, userId) {
    await this.init();
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) {
      return { success: false, message: "Tournament not found" };
    }
    if (tournament.hostId !== userId) {
      return { success: false, message: "Access denied: Only the original tournament creator can delete this tournament." };
    }
    if (tournament.roomCode) {
      roomManager.deleteRoom(tournament.roomCode);
    }
    this.tournaments.delete(tournamentId);
    tournamentStorage.deleteTournament(tournamentId);
    const clientToUse = supabaseAdmin || supabase;
    if (clientToUse) {
      try {
        await clientToUse.from("tournaments").delete().eq("id", tournamentId);
      } catch (err) {
        console.warn("[TournamentManager] Supabase deleteTournament fallback:", err);
      }
    }
    return { success: true };
  }
  /**
   * Start the Auction stage for this tournament
   * STRICT: Only the original creator/host can start the auction
   */
  async startAuction(tournamentId, userId) {
    await this.init();
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return { success: false, message: "Tournament not found" };
    if (tournament.hostId !== userId) {
      return { success: false, message: "Access denied: Only the original tournament host can start the auction." };
    }
    if (tournament.status !== "REGISTRATION") {
      return { success: false, message: `Cannot start auction for tournament in ${tournament.status} state.` };
    }
    const room = roomManager.getRoom(tournament.roomCode);
    if (room && room.getState().status === "LOBBY") {
      const startRes = room.startAuction(tournament.hostId);
      if (!startRes.success) {
        return { success: false, message: startRes.message || "Failed to start auction engine" };
      }
    }
    tournament.status = "AUCTION";
    tournament.updatedAt = Date.now();
    tournamentStorage.saveTournament(tournament);
    return { success: true };
  }
  /**
   * Finalizes auction squads: imports squads & purses from the completed Quick Auction room
   * into Tournament teams, creates default lineups, and moves to SQUAD_FINALIZATION.
   */
  async importAuctionSquads(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return { success: false, message: "Tournament not found" };
    const room = roomManager.getRoom(tournament.roomCode);
    if (!room) {
      return { success: false, message: "Auction room not found" };
    }
    const state = room.getState();
    const teamSquads = state.teamSquads;
    const teamPurses = state.teamPurse;
    for (const member of tournament.members) {
      const fid = member.franchiseId;
      const rawSquad = teamSquads[fid] || [];
      const purse = teamPurses[fid] !== void 0 ? teamPurses[fid] / 1e7 : 0;
      const seenPids = /* @__PURE__ */ new Set();
      const squad = rawSquad.filter((p) => {
        if (!p || !p.id || seenPids.has(p.id)) return false;
        seenPids.add(p.id);
        return true;
      });
      const roomXI = state.teamPlayingXI ? state.teamPlayingXI[fid] : null;
      let playingXI = [];
      let captainId = "";
      let viceCaptainId = "";
      let impactPlayerId = void 0;
      if (roomXI && Array.isArray(roomXI.playingXIIds) && roomXI.playingXIIds.length === 11) {
        playingXI = [...roomXI.playingXIIds];
        captainId = roomXI.captainId || playingXI[0] || "";
        viceCaptainId = roomXI.viceCaptainId || playingXI[1] || "";
        impactPlayerId = roomXI.impactPlayerId || void 0;
      } else {
        const sorted = [...squad].sort((a, b) => (b.ovr || 75) - (a.ovr || 75));
        playingXI = sorted.slice(0, 11).map((p) => p.id);
        captainId = playingXI[0] || "";
        viceCaptainId = playingXI[1] || "";
        impactPlayerId = sorted[11]?.id;
      }
      tournament.teams[fid] = {
        franchiseId: fid,
        ownerUserId: member.userId,
        ownerUserName: member.userName,
        purseRemaining: purse,
        squad,
        defaultPlayingXI: {
          playingXI,
          captainId,
          viceCaptainId,
          impactPlayerId
        }
      };
    }
    tournament.status = "SQUAD_FINALIZATION";
    tournament.updatedAt = Date.now();
    tournamentStorage.saveTournament(tournament);
    return { success: true };
  }
  /**
   * Generates fixtures and launches tournament into TOURNAMENT_LIVE
   */
  async startLiveTournament(tournamentId, userId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return { success: false, message: "Tournament not found" };
    if (tournament.hostId !== userId) {
      return { success: false, message: "Only tournament host can start live matches" };
    }
    const teamIds = tournament.members.map((m) => m.franchiseId);
    const fixtures = FixtureGenerator.generateGroupStageFixtures(tournamentId, teamIds, tournament.matchOvers);
    const pointsTable = teamIds.map((fid) => ({
      franchiseId: fid,
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      nr: 0,
      points: 0,
      runsScored: 0,
      oversBatted: 0,
      runsConceded: 0,
      oversBowled: 0,
      nrr: 0
    }));
    tournament.fixtures = fixtures;
    tournament.pointsTable = pointsTable;
    tournament.status = "TOURNAMENT_LIVE";
    tournament.updatedAt = Date.now();
    tournamentStorage.saveTournament(tournament);
    return { success: true };
  }
  /**
   * Save match-specific Playing XI for a team
   */
  saveMatchLineup(tournamentId, franchiseId, userId, lineup) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return { success: false, message: "Tournament not found" };
    const member = tournament.members.find((m) => m.franchiseId === franchiseId);
    if (!member) return { success: false, message: "Franchise not found" };
    if (member.userId !== userId && tournament.hostId !== userId) {
      return { success: false, message: "Unauthorized: you do not own this franchise" };
    }
    const team = tournament.teams[franchiseId];
    if (!team) return { success: false, message: "Team data not found" };
    if (!lineup.playingXI || lineup.playingXI.length !== 11) {
      return { success: false, message: "Playing XI must contain exactly 11 players" };
    }
    const squadMap = new Map(team.squad.map((p) => [p.id, p]));
    const uniqueIds = new Set(lineup.playingXI);
    if (uniqueIds.size !== 11) {
      return { success: false, message: "Playing XI cannot contain duplicate players" };
    }
    let overseasCount = 0;
    for (const pid of lineup.playingXI) {
      const p = squadMap.get(pid);
      if (!p) {
        return { success: false, message: `Player ${pid} does not belong to ${franchiseId} squad` };
      }
      if (p.is_overseas) overseasCount++;
    }
    if (overseasCount > 4) {
      return { success: false, message: `Playing XI cannot contain more than 4 overseas players (found ${overseasCount})` };
    }
    if (!lineup.captainId || !uniqueIds.has(lineup.captainId)) {
      return { success: false, message: "Captain must be selected from the 11 starting players" };
    }
    if (!lineup.viceCaptainId || !uniqueIds.has(lineup.viceCaptainId) || lineup.viceCaptainId === lineup.captainId) {
      return { success: false, message: "Vice-Captain must be a distinct player selected from the 11 starting players" };
    }
    team.defaultPlayingXI = { ...lineup };
    tournament.updatedAt = Date.now();
    tournamentStorage.saveTournament(tournament);
    return { success: true };
  }
  /**
   * Sync Playing XI saved from auction/squad finalization screen
   */
  syncRoomPlayingXI(tournamentId, franchiseId, selection) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return;
    const team = tournament.teams[franchiseId];
    if (!team) return;
    if (selection && Array.isArray(selection.playingXIIds)) {
      team.defaultPlayingXI = {
        playingXI: [...selection.playingXIIds],
        captainId: selection.captainId || selection.playingXIIds[0] || "",
        viceCaptainId: selection.viceCaptainId || selection.playingXIIds[1] || "",
        impactPlayerId: selection.impactPlayerId
      };
      tournament.updatedAt = Date.now();
      tournamentStorage.saveTournament(tournament);
    }
  }
  /**
   * Start a scheduled match
   */
  startMatch(tournamentId, fixtureId, userId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return { success: false, message: "Tournament not found" };
    const fixture = tournament.fixtures.find((f) => f.id === fixtureId);
    if (!fixture) return { success: false, message: "Fixture not found" };
    if (fixture.status === "COMPLETED") {
      return { success: false, message: "Match is already completed" };
    }
    if (fixture.status === "IN_PROGRESS" && fixture.matchId) {
      let existing = this.liveMatches.get(fixture.matchId);
      if (!existing) {
        existing = tournamentStorage.getMatch(fixture.matchId);
        if (existing) {
          this.liveMatches.set(fixture.matchId, existing);
        }
      }
      if (existing) {
        return { success: true, match: existing };
      }
    }
    const homeTeam = tournament.teams[fixture.homeFranchiseId];
    const awayTeam = tournament.teams[fixture.awayFranchiseId];
    if (!homeTeam || !awayTeam) {
      return { success: false, message: "Team details missing" };
    }
    const getLineup = (team, fid) => {
      const squadIds = new Set(team.squad.map((p) => p.id));
      if (team.defaultPlayingXI && Array.isArray(team.defaultPlayingXI.playingXI) && team.defaultPlayingXI.playingXI.length === 11 && team.defaultPlayingXI.playingXI.every((pid) => squadIds.has(pid))) {
        return {
          franchiseId: fid,
          playingXI: [...team.defaultPlayingXI.playingXI],
          captainId: team.defaultPlayingXI.captainId || team.defaultPlayingXI.playingXI[0] || "",
          viceCaptainId: team.defaultPlayingXI.viceCaptainId || team.defaultPlayingXI.playingXI[1] || "",
          impactPlayerId: team.defaultPlayingXI.impactPlayerId,
          isLocked: true,
          submittedAt: Date.now()
        };
      }
      const sorted = [...team.squad].sort((a, b) => (b.ovr || 75) - (a.ovr || 75));
      const pXI = sorted.slice(0, 11).map((p) => p.id);
      return {
        franchiseId: fid,
        playingXI: pXI,
        captainId: pXI[0] || "",
        viceCaptainId: pXI[1] || "",
        impactPlayerId: sorted[11]?.id,
        isLocked: true,
        submittedAt: Date.now()
      };
    };
    const homeLineup = getLineup(homeTeam, fixture.homeFranchiseId);
    const awayLineup = getLineup(awayTeam, fixture.awayFranchiseId);
    const liveMatch = MatchEngine.createMatch(
      fixture.id,
      tournamentId,
      fixture.homeFranchiseId,
      fixture.awayFranchiseId,
      fixture.matchOvers,
      homeLineup,
      awayLineup,
      this.allPlayersMap
    );
    fixture.status = "IN_PROGRESS";
    fixture.matchId = liveMatch.id;
    this.liveMatches.set(liveMatch.id, liveMatch);
    tournamentStorage.saveMatch(liveMatch);
    tournament.updatedAt = Date.now();
    tournamentStorage.saveTournament(tournament);
    return { success: true, match: liveMatch };
  }
  /**
   * Identifies the verified IPL team a user owns in a tournament
   */
  getParticipantFranchise(tournamentId, userId) {
    if (!tournamentId || !userId) return null;
    const tournament = this.getTournament(tournamentId);
    if (!tournament) return null;
    if (tournament.members) {
      const member = tournament.members.find((m) => m.userId === userId);
      if (member?.franchiseId) return member.franchiseId;
    }
    if (tournament.teams) {
      for (const [fid, team] of Object.entries(tournament.teams)) {
        if (team && team.ownerUserId === userId) {
          return fid;
        }
      }
    }
    return null;
  }
  /**
   * Resolve interactive coin flip toss
   */
  resolveToss(matchId, callerFranchiseId, call, userId) {
    const match = this.getLiveMatch(matchId);
    if (!match) return { success: false, message: "Match not found" };
    if (userId) {
      const userFranchise = this.getParticipantFranchise(match.tournamentId, userId);
      if (!userFranchise || userFranchise !== callerFranchiseId) {
        return {
          success: false,
          message: `Forbidden: You are not authorized to call toss for ${callerFranchiseId}`
        };
      }
    }
    const res = MatchEngine.resolveToss(match, callerFranchiseId, call);
    if (!res.success) return { success: false, message: res.message };
    tournamentStorage.saveMatch(match);
    return {
      success: true,
      match,
      tossWinnerFranchiseId: res.tossWinnerFranchiseId,
      tossResult: res.tossResult,
      message: res.message
    };
  }
  /**
   * Handle toss decision: Bat or Bowl first
   * Strictly enforces that only the authenticated user belonging to the toss winning team can submit.
   */
  handleTossDecision(matchId, tossWinnerFranchiseId, decision, userId) {
    const match = this.getLiveMatch(matchId);
    if (!match) return { success: false, message: "Match not found" };
    const expectedWinner = match.tossWinnerFranchiseId || tossWinnerFranchiseId;
    if (userId) {
      const userFranchise = this.getParticipantFranchise(match.tournamentId, userId);
      if (!userFranchise || userFranchise !== expectedWinner) {
        return {
          success: false,
          message: `Forbidden: Only ${expectedWinner} can submit the toss decision. You do not own this team.`
        };
      }
    }
    const res = MatchEngine.handleTossDecision(match, tossWinnerFranchiseId, decision, this.allPlayersMap);
    if (!res.success) return { success: false, message: res.message };
    tournamentStorage.saveMatch(match);
    return { success: true, match, message: res.message };
  }
  /**
   * Handle toss decision (legacy fallback)
   */
  handleToss(matchId, tossWinnerFranchiseId, decision) {
    const match = this.getLiveMatch(matchId);
    if (!match) return { success: false, message: "Match not found" };
    MatchEngine.handleToss(match, tossWinnerFranchiseId, decision, this.allPlayersMap);
    tournamentStorage.saveMatch(match);
    return { success: true, match };
  }
  /**
   * Batting team selects opening striker & non-striker
   */
  selectOpeningBatters(matchId, franchiseId, strikerId, nonStrikerId, userId) {
    const match = this.getLiveMatch(matchId);
    if (!match) return { success: false, message: "Match not found" };
    const inn = match.currentInnings === 1 ? match.innings1 : match.innings2;
    const battingTeam = inn?.battingFranchiseId || match.batting_team_id;
    if (userId && battingTeam) {
      const userFranchise = this.getParticipantFranchise(match.tournamentId, userId);
      if (!userFranchise || userFranchise !== battingTeam) {
        return {
          success: false,
          message: `Forbidden: Only the batting team (${battingTeam}) can select opening batters.`
        };
      }
    }
    const res = MatchEngine.selectOpeningBatters(match, franchiseId, strikerId, nonStrikerId);
    if (!res.success) return { success: false, message: res.message };
    tournamentStorage.saveMatch(match);
    return { success: true, match, message: res.message };
  }
  /**
   * Bowling team selects opening bowler
   */
  selectOpeningBowler(matchId, franchiseId, bowlerId, userId) {
    const match = this.getLiveMatch(matchId);
    if (!match) return { success: false, message: "Match not found" };
    const inn = match.currentInnings === 1 ? match.innings1 : match.innings2;
    const bowlingTeam = inn?.bowlingFranchiseId || match.bowling_team_id;
    if (userId && bowlingTeam) {
      const userFranchise = this.getParticipantFranchise(match.tournamentId, userId);
      if (!userFranchise || userFranchise !== bowlingTeam) {
        return {
          success: false,
          message: `Forbidden: Only the bowling team (${bowlingTeam}) can select opening bowler.`
        };
      }
    }
    const res = MatchEngine.selectOpeningBowler(match, franchiseId, bowlerId);
    if (!res.success) return { success: false, message: res.message };
    tournamentStorage.saveMatch(match);
    return { success: true, match, message: res.message };
  }
  /**
   * Batting team selects replacement batter after wicket
   */
  selectReplacementBatter(matchId, franchiseId, replacementBatterId, userId) {
    const match = this.getLiveMatch(matchId);
    if (!match) return { success: false, message: "Match not found" };
    const inn = match.currentInnings === 1 ? match.innings1 : match.innings2;
    const battingTeam = inn?.battingFranchiseId || match.batting_team_id;
    if (userId && battingTeam) {
      const userFranchise = this.getParticipantFranchise(match.tournamentId, userId);
      if (!userFranchise || userFranchise !== battingTeam) {
        return {
          success: false,
          message: `Forbidden: Only the batting team (${battingTeam}) can select a replacement batter.`
        };
      }
    }
    const res = MatchEngine.selectReplacementBatter(match, franchiseId, replacementBatterId);
    if (!res.success) return { success: false, message: res.message };
    tournamentStorage.saveMatch(match);
    return { success: true, match, message: res.message };
  }
  /**
   * Bowling team selects bowler for the new over
   */
  selectBowler(matchId, bowlerId, franchiseId, userId) {
    const match = this.getLiveMatch(matchId);
    if (!match) return { success: false, message: "Match not found" };
    const inn = match.currentInnings === 1 ? match.innings1 : match.innings2;
    const bowlingTeam = inn?.bowlingFranchiseId || match.bowling_team_id;
    if (userId && bowlingTeam) {
      const userFranchise = this.getParticipantFranchise(match.tournamentId, userId);
      if (!userFranchise || userFranchise !== bowlingTeam) {
        return {
          success: false,
          message: `Forbidden: Only the bowling team (${bowlingTeam}) can select the next bowler.`
        };
      }
    }
    const res = MatchEngine.selectBowler(match, bowlerId);
    if (!res.success) return { success: false, message: res.message };
    tournamentStorage.saveMatch(match);
    return { success: true, match, message: res.message };
  }
  /**
   * Submit hand-cricket selection for active delivery
   */
  submitChoice(matchId, franchiseId, choice, ability, blockedNumbers, userId) {
    const match = this.getLiveMatch(matchId);
    if (!match) return { resolved: false, error: "Match not found" };
    if (userId) {
      const userFranchise = this.getParticipantFranchise(match.tournamentId, userId);
      if (!userFranchise || userFranchise !== franchiseId) {
        return {
          resolved: false,
          error: `Forbidden: You belong to ${userFranchise || "no team"} and cannot submit selections for ${franchiseId}.`
        };
      }
    }
    const res = MatchEngine.submitChoice(
      match,
      franchiseId,
      choice,
      ability,
      blockedNumbers,
      this.allPlayersMap
    );
    if (res.error) {
      return { resolved: false, match, error: res.error };
    }
    tournamentStorage.saveMatch(match);
    if (res.resolved) {
      if (match.status === "COMPLETED") {
        this.onMatchCompleted(match);
      }
      return { resolved: true, ballEvent: res.ballEvent, match };
    }
    return { resolved: false, match };
  }
  /**
   * Handle 15s turn timeout
   */
  handleTimeout(matchId) {
    const match = this.getLiveMatch(matchId);
    if (!match) return { resolved: false };
    const event = MatchEngine.handleTimeout(match, this.allPlayersMap);
    tournamentStorage.saveMatch(match);
    if (event) {
      if (match.status === "COMPLETED") {
        this.onMatchCompleted(match);
      }
      return { resolved: true, ballEvent: event, match };
    }
    return { resolved: false, match };
  }
  /**
   * Post-match completion processing:
   * Updates fixture, points table (wins, losses, NRR), cumulative player stats, and playoff schedules
   */
  onMatchCompleted(match) {
    const tournament = this.tournaments.get(match.tournamentId);
    if (!tournament) return;
    const fixture = tournament.fixtures.find((f) => f.id === match.fixtureId);
    if (!fixture || fixture.status === "COMPLETED") {
      return;
    }
    fixture.status = "COMPLETED";
    fixture.winnerFranchiseId = match.winnerFranchiseId;
    fixture.matchResultSummary = match.resultSummary;
    fixture.completedAt = Date.now();
    const inn1 = match.innings1;
    const inn2 = match.innings2;
    const updateTeamPoints = (fid, isWinner, isTie, runsScored, oversBatted, runsConceded, oversBowled) => {
      let row = tournament.pointsTable.find((p) => p.franchiseId === fid);
      if (!row) {
        row = {
          franchiseId: fid,
          played: 0,
          won: 0,
          lost: 0,
          tied: 0,
          nr: 0,
          points: 0,
          runsScored: 0,
          oversBatted: 0,
          runsConceded: 0,
          oversBowled: 0,
          nrr: 0
        };
        tournament.pointsTable.push(row);
      }
      row.played += 1;
      if (isWinner) {
        row.won += 1;
        row.points += 2;
      } else if (isTie) {
        row.tied += 1;
        row.points += 1;
      } else {
        row.lost += 1;
      }
      row.runsScored += runsScored;
      row.oversBatted += oversBatted;
      row.runsConceded += runsConceded;
      row.oversBowled += oversBowled;
      const batRate = row.oversBatted > 0 ? row.runsScored / row.oversBatted : 0;
      const bowlRate = row.oversBowled > 0 ? row.runsConceded / row.oversBowled : 0;
      row.nrr = Number((batRate - bowlRate).toFixed(3));
    };
    if (inn1 && inn2) {
      const isTeam1Winner = match.winnerFranchiseId === inn1.battingFranchiseId;
      const isTeam2Winner = match.winnerFranchiseId === inn2.battingFranchiseId;
      const isTie = !isTeam1Winner && !isTeam2Winner;
      const inn1OversDecimal = inn1.oversCompleted + inn1.ballsInCurrentOver / 6;
      const inn2OversDecimal = inn2.oversCompleted + inn2.ballsInCurrentOver / 6;
      updateTeamPoints(
        inn1.battingFranchiseId,
        isTeam1Winner,
        isTie,
        inn1.totalRuns,
        inn1OversDecimal,
        inn2.totalRuns,
        inn2OversDecimal
      );
      updateTeamPoints(
        inn2.battingFranchiseId,
        isTeam2Winner,
        isTie,
        inn2.totalRuns,
        inn2OversDecimal,
        inn1.totalRuns,
        inn1OversDecimal
      );
    }
    tournament.pointsTable.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.nrr !== a.nrr) return b.nrr - a.nrr;
      return b.won - a.won;
    });
    const updateStatsFromInnings = (inn, fid) => {
      for (const b of Object.values(inn.batters)) {
        if (!tournament.playerStats[b.playerId]) {
          tournament.playerStats[b.playerId] = {
            playerId: b.playerId,
            name: b.name,
            franchiseId: fid,
            matchesPlayed: 0,
            inningsBatted: 0,
            runs: 0,
            ballsFaced: 0,
            fours: 0,
            sixes: 0,
            highestScore: 0,
            strikeRate: 0,
            oversBowled: 0,
            maidens: 0,
            runsConceded: 0,
            wickets: 0,
            economyRate: 0,
            bestBowling: "-",
            mvpPoints: 0
          };
        }
        const stat = tournament.playerStats[b.playerId];
        stat.matchesPlayed += 1;
        if (b.balls > 0) stat.inningsBatted += 1;
        stat.runs += b.runs;
        stat.ballsFaced += b.balls;
        stat.fours += b.fours;
        stat.sixes += b.sixes;
        if (b.runs > stat.highestScore) stat.highestScore = b.runs;
        stat.strikeRate = stat.ballsFaced > 0 ? Number((stat.runs / stat.ballsFaced * 100).toFixed(2)) : 0;
        stat.mvpPoints += b.runs + b.fours + b.sixes * 2;
      }
      for (const b of Object.values(inn.bowlers)) {
        if (tournament.playerStats[b.playerId]) {
          const stat = tournament.playerStats[b.playerId];
          const oversDecimal = b.overs + b.balls / 6;
          stat.oversBowled += oversDecimal;
          stat.maidens += b.maidens;
          stat.runsConceded += b.runs;
          stat.wickets += b.wickets;
          stat.economyRate = stat.oversBowled > 0 ? Number((stat.runsConceded / stat.oversBowled).toFixed(2)) : 0;
          stat.mvpPoints += b.wickets * 25 + b.maidens * 10;
        }
      }
    };
    if (inn1) updateStatsFromInnings(inn1, inn1.battingFranchiseId);
    if (inn2) updateStatsFromInnings(inn2, inn2.battingFranchiseId);
    const allGroupMatchesCompleted = tournament.fixtures.filter((f) => f.stage === "GROUP").every((f) => f.status === "COMPLETED");
    if (allGroupMatchesCompleted) {
      tournament.status = "PLAYOFFS";
      const standings = tournament.pointsTable.map((p) => p.franchiseId);
      const playoffFixtures = tournament.fixtures.filter((f) => f.stage !== "GROUP");
      const nextPlayoff = FixtureGenerator.generateNextPlayoffFixture(
        tournament.id,
        tournament.teamsCount,
        standings,
        playoffFixtures,
        tournament.matchOvers
      );
      if (nextPlayoff) {
        tournament.fixtures.push(nextPlayoff);
      } else {
        const finalMatch = tournament.fixtures.find((f) => f.stage === "FINAL");
        if (finalMatch && finalMatch.status === "COMPLETED") {
          tournament.status = "COMPLETED";
          tournament.winnerFranchiseId = finalMatch.winnerFranchiseId;
          tournament.runnerUpFranchiseId = finalMatch.winnerFranchiseId === finalMatch.homeFranchiseId ? finalMatch.awayFranchiseId : finalMatch.homeFranchiseId;
        }
      }
    }
    tournament.updatedAt = Date.now();
    tournamentStorage.saveTournament(tournament);
  }
};
var tournamentManager = new TournamentManager();

// server/src/index.ts
dotenv2.config();
var isServerless = Boolean(
  process.env.VERCEL || process.env.VERCEL_ENV || process.env.VERCEL_URL || process.env.VERCEL_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_REGION || process.env.LAMBDA_TASK_ROOT
);
console.log(`[Diagnostic Init] Server module loaded. isServerless=${isServerless}, env=${process.env.NODE_ENV}, VERCEL=${process.env.VERCEL ? "yes" : "no"}, time=${(/* @__PURE__ */ new Date()).toISOString()}`);
process.on("uncaughtException", (err) => {
  console.error("[Diagnostic UncaughtException]", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[Diagnostic UnhandledRejection]", reason);
});
var __filename4 = fileURLToPath4(import.meta.url);
var __dirname4 = path5.dirname(__filename4);
var app = express();
var port = parseInt(process.env.PORT || "3001", 10);
var host = process.env.HOST || "0.0.0.0";
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  console.log(`[Diagnostic Req] ${req.method} ${req.originalUrl || req.url}`);
  next();
});
if (!isServerless) {
  roomManager.loadPersistedRooms().catch((err) => {
    console.error("[Startup] Failed to restore persisted rooms:", err);
  });
}
var resolveClientDistPath = () => {
  const candidates = [
    path5.join(__dirname4, "../../client/dist"),
    path5.join(__dirname4, "../client/dist"),
    path5.join(process.cwd(), "client/dist"),
    path5.join(process.cwd(), "../client/dist")
  ];
  for (const candidate of candidates) {
    if (fs4.existsSync(candidate) && fs4.existsSync(path5.join(candidate, "index.html"))) {
      return candidate;
    }
  }
  for (const candidate of candidates) {
    if (fs4.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0];
};
var clientDistPath = resolveClientDistPath();
if (fs4.existsSync(clientDistPath)) {
  console.log(`[Static] Serving frontend from ${clientDistPath}`);
  app.use(express.static(clientDistPath));
}
app.get(["/api/health", "/health"], (req, res) => {
  res.setHeader("Content-Type", "application/json");
  return res.status(200).json({
    status: "ok",
    game: "BID WARS",
    edition: "2026",
    timestamp: Date.now(),
    serverless: isServerless,
    supabaseConfigured: Boolean(supabase),
    adminConfigured: Boolean(supabaseAdmin),
    hasUrl: Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
    hasAnonKey: Boolean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
    hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  });
});
app.post("/api/rooms", (req, res) => {
  try {
    const { hostNickname, settings } = req.body || {};
    if (!hostNickname || typeof hostNickname !== "string" || !hostNickname.trim()) {
      return res.status(400).json({ error: "Valid host nickname is required" });
    }
    if (settings && settings.isPrivate) {
      const pwd = settings.password !== void 0 && settings.password !== null ? String(settings.password).trim() : "";
      if (!pwd || pwd.length < 4) {
        return res.status(400).json({ error: "Password for private rooms must be at least 4 characters" });
      }
    }
    const room = roomManager.createRoom(hostNickname.trim(), settings || {});
    return res.status(201).json({
      success: true,
      roomCode: room.roomCode,
      hostId: room.hostId,
      sessionToken: room.hostId,
      state: room.getState()
    });
  } catch (err) {
    console.error("[API] Error creating room:", err);
    return res.status(500).json({ error: err.message || "Failed to create room" });
  }
});
app.post("/api/rooms/:code/verify-password", (req, res) => {
  try {
    const code = req.params.code.toUpperCase().trim();
    const { password } = req.body || {};
    const room = roomManager.getRoom(code);
    if (!room) {
      return res.status(404).json({ error: `Room "${code}" not found` });
    }
    if (!room.isPrivate) {
      return res.json({ success: true, verified: true, message: "Room is public" });
    }
    const isValid = room.verifyPassword(password);
    if (!isValid) {
      return res.status(401).json({ error: "Incorrect room password", verified: false });
    }
    return res.json({ success: true, verified: true, message: "Password verified" });
  } catch (err) {
    console.error("[API] Error verifying password:", err);
    return res.status(500).json({ error: err.message || "Error verifying password" });
  }
});
app.get("/api/rooms/:code", (req, res) => {
  try {
    const code = req.params.code.toUpperCase().trim();
    const room = roomManager.getRoom(code);
    if (!room) {
      return res.status(404).json({ error: `Room "${code}" not found` });
    }
    return res.json({
      success: true,
      roomCode: room.roomCode,
      state: room.getState()
    });
  } catch (err) {
    console.error("[API] Error getting room:", err);
    return res.status(500).json({ error: err.message || "Error fetching room state" });
  }
});
app.get("/api/players", (req, res) => {
  const season = req.query.season === "2025" ? "2025" : "2026";
  const category = req.query.category;
  const role = req.query.role;
  const search = (req.query.search || "").toLowerCase().trim();
  const nationality = req.query.nationality;
  const pool = req.query.pool;
  const marqueeOnly = req.query.marquee === "true";
  let list = getAllPlayers(season);
  if (category) {
    list = list.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }
  if (role) {
    list = list.filter((p) => p.primary_role.toLowerCase() === role.toLowerCase());
  }
  if (search) {
    list = list.filter(
      (p) => p.name.toLowerCase().includes(search) || p.nationality.toLowerCase().includes(search) || p.set_name.toLowerCase().includes(search)
    );
  }
  if (nationality === "India") {
    list = list.filter((p) => !p.is_overseas);
  } else if (nationality === "Overseas") {
    list = list.filter((p) => p.is_overseas);
  }
  if (pool === "auction") {
    list = list.filter((p) => !p.is_retained);
  } else if (pool === "retained") {
    list = list.filter((p) => p.is_retained);
  }
  if (marqueeOnly) {
    list = list.filter((p) => p.is_marquee);
  }
  res.json({
    total: list.length,
    season,
    players: list
  });
});
app.get("/api/players/:id", (req, res) => {
  const season = req.query.season === "2025" ? "2025" : "2026";
  const player = getPlayerById(req.params.id, season);
  if (!player) {
    return res.status(404).json({ error: "Player not found" });
  }
  res.json({ player });
});
app.post(["/api/auth/register", "/auth/register"], async (req, res) => {
  try {
    const { username, password, confirmPassword, email, gmail } = req.body || {};
    const inputEmail = email || gmail;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    const cleanUser = String(username).trim();
    if (cleanUser.length < 3 || cleanUser.length > 20) {
      return res.status(400).json({ error: "Username must be between 3 and 20 characters" });
    }
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(cleanUser)) {
      return res.status(400).json({ error: "Username can only contain letters, numbers, underscores, and hyphens" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }
    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }
    if (!inputEmail || !String(inputEmail).trim()) {
      return res.status(400).json({ error: "Gmail address is required." });
    }
    const cleanEmail = String(inputEmail).trim().toLowerCase();
    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(cleanEmail)) {
      return res.status(400).json({ error: "Invalid Gmail format. Enter a valid address ending in @gmail.com." });
    }
    const isNameAvailable = await tournamentStorage.isNameAvailable(cleanUser);
    if (!isNameAvailable) {
      return res.status(409).json({ error: `Username "${cleanUser}" is already taken. Please choose another.` });
    }
    const isEmailAvailable = await tournamentStorage.isEmailAvailable(cleanEmail);
    if (!isEmailAvailable) {
      return res.status(409).json({ error: "This Gmail address is already registered to another account." });
    }
    if (!supabaseAdmin && !supabase) {
      return res.status(503).json({
        error: "Supabase authentication service is unavailable. Local fallback storage is strictly disabled."
      });
    }
    const clientUrl = process.env.CLIENT_URL || "https://bidwars.onrender.com";
    let userId = "";
    let emailConfirmed = false;
    let supabaseSession = null;
    if (supabaseAdmin) {
      const { data: suData, error: suError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        // Immediate account activation
        user_metadata: {
          username: cleanUser,
          in_game_name: cleanUser
        }
      });
      if (suError) {
        console.error("[Auth] Supabase Admin createUser error:", suError);
        if (suError.message.toLowerCase().includes("already") || suError.status === 422) {
          return res.status(409).json({ error: "This Gmail address is already registered to another account." });
        }
        return res.status(500).json({ error: `Supabase Auth error: ${suError.message}` });
      }
      if (!suData?.user) {
        return res.status(500).json({ error: "Failed to create user in Supabase Auth" });
      }
      userId = suData.user.id;
      emailConfirmed = true;
      if (supabase) {
        const { data: siData } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });
        if (siData?.session) {
          supabaseSession = {
            access_token: siData.session.access_token,
            refresh_token: siData.session.refresh_token
          };
        }
      }
    } else if (supabase) {
      const { data: suData, error: suError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            username: cleanUser,
            in_game_name: cleanUser
          },
          emailRedirectTo: clientUrl
        }
      });
      if (suError) {
        console.error("[Auth] Supabase Auth signUp error:", suError);
        if (suError.message.toLowerCase().includes("already") || suError.status === 400 || suError.status === 422) {
          return res.status(409).json({ error: "This Gmail address or username is already taken." });
        }
        return res.status(500).json({ error: `Supabase Auth error: ${suError.message}` });
      }
      if (!suData?.user) {
        return res.status(500).json({ error: "Failed to create user in Supabase Auth" });
      }
      userId = suData.user.id;
      emailConfirmed = true;
      if (suData.session) {
        supabaseSession = {
          access_token: suData.session.access_token,
          refresh_token: suData.session.refresh_token
        };
      }
    }
    const salt = crypto2.randomBytes(16).toString("hex");
    const passwordHash = crypto2.scryptSync(password, salt, 64).toString("hex");
    let profile;
    try {
      profile = await tournamentStorage.saveProfile({
        id: userId,
        username: cleanUser,
        inGameName: cleanUser,
        email: cleanEmail,
        recoveryEmail: cleanEmail,
        passwordHash,
        salt,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    } catch (dbErr) {
      if (supabaseAdmin && userId) {
        await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {
        });
      }
      return res.status(500).json({ error: `Database persistence error: ${dbErr.message}` });
    }
    return res.status(201).json({
      success: true,
      emailConfirmed: true,
      message: "Account created successfully!",
      user: {
        id: profile.id,
        username: profile.username || cleanUser,
        inGameName: profile.inGameName || cleanUser,
        email: cleanEmail
      },
      session: supabaseSession
    });
  } catch (err) {
    console.error("[Auth] Registration error:", err);
    return res.status(500).json({ error: err.message || "Registration failed" });
  }
});
app.post("/api/auth/resend-verification", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !String(email).trim().toLowerCase().endsWith("@gmail.com")) {
      return res.status(400).json({ error: "Valid Gmail address is required" });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const clientUrl = process.env.CLIENT_URL || "https://bidwars.onrender.com";
    if (supabase) {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: cleanEmail,
        options: {
          emailRedirectTo: clientUrl
        }
      });
      if (error) {
        return res.status(400).json({ error: error.message });
      }
    }
    return res.json({ success: true, message: "Verification email resent. Please check your Gmail inbox." });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to resend verification email" });
  }
});
app.post(["/api/auth/login", "/auth/login"], async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    const cleanUser = String(username).trim();
    let profile = await tournamentStorage.getProfileByUsername(cleanUser);
    let userEmail = "";
    if (profile && profile.email) {
      userEmail = profile.email.trim().toLowerCase();
    } else {
      const authSecret = process.env.AUTH_SECRET_SALT || "bidwars_auth_default_secret_salt_2026";
      const authHash = crypto2.createHmac("sha256", authSecret).update(cleanUser.toLowerCase()).digest("hex").slice(0, 32);
      userEmail = `usr_${authHash}@bidwars.com`;
    }
    if (supabase) {
      const { data: siData, error: siError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: String(password)
      });
      if (siData?.session && siData.user) {
        if (!profile) {
          profile = await tournamentStorage.getProfile(siData.user.id);
        }
        return res.json({
          success: true,
          user: {
            id: siData.user.id,
            username: profile?.username || cleanUser,
            inGameName: profile?.inGameName || cleanUser,
            email: userEmail,
            avatar: profile?.avatarUrl
          },
          session: {
            access_token: siData.session.access_token,
            refresh_token: siData.session.refresh_token
          }
        });
      }
      if (siError && siError.message && siError.message.toLowerCase().includes("email not confirmed")) {
        return res.status(403).json({
          error: "Please verify your Gmail address before logging in.",
          unverified: true,
          email: userEmail
        });
      }
    }
    const legacyCreds = await tournamentStorage.getLegacyCredentials(cleanUser);
    if (legacyCreds && legacyCreds.passwordHash && legacyCreds.salt) {
      const computedHash = crypto2.scryptSync(password, legacyCreds.salt, 64).toString("hex");
      const hashBuf = Buffer.from(computedHash, "hex");
      const targetBuf = Buffer.from(legacyCreds.passwordHash, "hex");
      if (hashBuf.length === targetBuf.length && crypto2.timingSafeEqual(hashBuf, targetBuf)) {
        if (supabaseAdmin) {
          try {
            await supabaseAdmin.auth.admin.createUser({
              id: legacyCreds.id.length === 36 ? legacyCreds.id : void 0,
              email: userEmail,
              password: String(password),
              email_confirm: true,
              user_metadata: {
                username: legacyCreds.username || cleanUser,
                in_game_name: legacyCreds.inGameName || cleanUser
              }
            });
          } catch {
            await supabaseAdmin.auth.admin.updateUserById(legacyCreds.id, { password: String(password) }).catch(() => {
            });
          }
          if (supabase) {
            const { data: retrySi } = await supabase.auth.signInWithPassword({
              email: userEmail,
              password: String(password)
            });
            if (retrySi?.session) {
              return res.json({
                success: true,
                user: {
                  id: retrySi.user.id,
                  username: legacyCreds.username || cleanUser,
                  inGameName: legacyCreds.inGameName || cleanUser,
                  email: userEmail
                },
                session: {
                  access_token: retrySi.session.access_token,
                  refresh_token: retrySi.session.refresh_token
                }
              });
            }
          }
        }
      }
    }
    if (!supabase && !supabaseAdmin) {
      return res.status(503).json({
        error: "Authentication database unavailable. Please verify SUPABASE_URL and SUPABASE_ANON_KEY environment variables."
      });
    }
    return res.status(401).json({ error: "Invalid username or password" });
  } catch (err) {
    console.error("[Auth] Login error:", err);
    return res.status(500).json({ error: err.message || "Login failed" });
  }
});
app.post("/api/auth/change-password", async (req, res) => {
  try {
    const { userId, currentPassword, newPassword, confirmPassword } = req.body || {};
    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required." });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "New passwords do not match." });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long." });
    }
    const profile = await tournamentStorage.getProfile(userId);
    if (!profile) {
      return res.status(404).json({ error: "User profile not found." });
    }
    const userEmail = profile.email || profile.recoveryEmail;
    if (!userEmail) {
      return res.status(400).json({ error: "Account does not have a registered email address." });
    }
    if (!supabase) {
      return res.status(503).json({ error: "Authentication service unavailable." });
    }
    const { data: verifyData, error: verifyError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: String(currentPassword)
    });
    if (verifyError || !verifyData?.user) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }
    if (supabaseAdmin) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: String(newPassword)
      });
      if (updateError) {
        return res.status(500).json({ error: `Failed to update password: ${updateError.message}` });
      }
    }
    const salt = crypto2.randomBytes(16).toString("hex");
    const passwordHash = crypto2.scryptSync(newPassword, salt, 64).toString("hex");
    await tournamentStorage.updateCredentials(userId, passwordHash, salt).catch(() => {
    });
    return res.json({ success: true, message: "Password updated successfully!" });
  } catch (err) {
    console.error("[Auth] change-password error:", err);
    return res.status(500).json({ error: err.message || "Failed to change password." });
  }
});
async function resolveAccountForRecovery(rawIdentifier) {
  const clean = String(rawIdentifier || "").trim();
  if (!clean) return null;
  const isEmail = clean.includes("@");
  if (isEmail) {
    const cleanEmail = clean.toLowerCase();
    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(cleanEmail)) {
      throw new Error("Invalid Gmail format. Enter a valid address ending in @gmail.com.");
    }
    let profile = await tournamentStorage.getProfileByEmail(cleanEmail);
    if (supabaseAdmin) {
      try {
        const { data: userList, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1e3 });
        if (!listErr && userList?.users) {
          const authUser = userList.users.find((u) => (u.email || "").toLowerCase() === cleanEmail);
          if (authUser) {
            if (!profile) {
              profile = await tournamentStorage.getProfile(authUser.id);
            }
            if (profile && profile.id !== authUser.id) {
              console.warn("[Recovery] Profile and Auth user ID mismatch for email:", cleanEmail);
              return null;
            }
            return {
              userId: authUser.id,
              email: (authUser.email || cleanEmail).toLowerCase(),
              username: profile?.username || profile?.inGameName || authUser.user_metadata?.username || cleanEmail.split("@")[0]
            };
          }
        }
      } catch (err) {
        console.warn("[Recovery] Admin user search warning:", err.message);
      }
    }
    if (profile && profile.email) {
      return {
        userId: profile.id,
        email: profile.email.toLowerCase(),
        username: profile.username || profile.inGameName
      };
    }
    return null;
  } else {
    const cleanUser = clean;
    const profile = await tournamentStorage.getProfileByUsername(cleanUser);
    if (!profile) return null;
    if (supabaseAdmin && profile.id) {
      try {
        const { data: authUserData, error: authUserErr } = await supabaseAdmin.auth.admin.getUserById(profile.id);
        if (!authUserErr && authUserData?.user) {
          const authUser = authUserData.user;
          const authEmail = (authUser.email || "").trim().toLowerCase();
          if (authUser.id === profile.id && authEmail.endsWith("@gmail.com")) {
            return {
              userId: authUser.id,
              email: authEmail,
              username: profile.username || profile.inGameName
            };
          }
        }
      } catch (err) {
        console.warn("[Recovery] Admin getUserById warning:", err.message);
      }
    }
    const profileEmail = (profile.email || profile.recoveryEmail || "").trim().toLowerCase();
    if (profileEmail.endsWith("@gmail.com")) {
      return {
        userId: profile.id,
        email: profileEmail,
        username: profile.username || profile.inGameName
      };
    }
    return null;
  }
}
var recoveryCooldowns = /* @__PURE__ */ new Map();
app.post("/api/auth/send-recovery-otp", async (req, res) => {
  try {
    const { identifier } = req.body || {};
    if (!identifier || !String(identifier).trim()) {
      return res.status(400).json({ error: "Username or Gmail address is required." });
    }
    const cleanId = String(identifier).trim();
    const cooldownKey = cleanId.toLowerCase();
    const now = Date.now();
    const lastRequest = recoveryCooldowns.get(cooldownKey) || 0;
    if (now - lastRequest < 6e4) {
      const waitSeconds = Math.ceil((6e4 - (now - lastRequest)) / 1e3);
      return res.status(429).json({
        error: `Please wait ${waitSeconds} seconds before requesting another recovery code.`
      });
    }
    recoveryCooldowns.set(cooldownKey, now);
    const neutralMsg = "If an account matches this username or Gmail, a recovery code has been sent.";
    let account;
    try {
      account = await resolveAccountForRecovery(cleanId);
    } catch (fmtErr) {
      return res.status(400).json({ error: fmtErr.message });
    }
    if (!account) {
      return res.json({ success: true, message: neutralMsg, identifier: cleanId });
    }
    if (supabase) {
      try {
        await supabase.auth.resetPasswordForEmail(account.email);
      } catch (err) {
        console.warn("[Recovery] resetPasswordForEmail notification:", err.message);
      }
    }
    return res.json({
      success: true,
      message: neutralMsg,
      identifier: cleanId
    });
  } catch (err) {
    console.error("[Auth] send-recovery-otp error:", err);
    return res.status(500).json({ error: err.message || "Error processing recovery code request" });
  }
});
app.post("/api/auth/verify-recovery-otp", async (req, res) => {
  try {
    const { identifier, code } = req.body || {};
    if (!identifier || !code) {
      return res.status(400).json({ error: "Username/Gmail and recovery code are required." });
    }
    const cleanCode = String(code).trim();
    if (!/^[0-9a-zA-Z]{6,8}$/.test(cleanCode)) {
      return res.status(400).json({ error: "Invalid recovery code format. Please enter the 6-digit code." });
    }
    let account;
    try {
      account = await resolveAccountForRecovery(String(identifier).trim());
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!account || !account.email) {
      return res.status(400).json({ error: "Invalid, expired, or already-used recovery code. Please request a new code." });
    }
    if (!supabase) {
      return res.status(503).json({ error: "Authentication service unavailable." });
    }
    const { data: vData, error: vErr } = await supabase.auth.verifyOtp({
      email: account.email,
      token: cleanCode,
      type: "recovery"
    });
    if (vErr || !vData?.session) {
      return res.status(400).json({
        error: vErr?.message || "Invalid, expired, or already-used recovery code. Please request a new code."
      });
    }
    recoveryCooldowns.delete(String(identifier).trim().toLowerCase());
    recoveryCooldowns.delete(account.email);
    return res.json({
      success: true,
      message: "Recovery code verified successfully.",
      session: {
        access_token: vData.session.access_token,
        refresh_token: vData.session.refresh_token
      },
      user: {
        id: vData.user?.id || account.userId,
        username: account.username,
        email: account.email
      }
    });
  } catch (err) {
    console.error("[Auth] verify-recovery-otp error:", err);
    return res.status(500).json({ error: err.message || "Error verifying recovery code" });
  }
});
app.post("/api/auth/forgot-password", async (req, res) => {
  const identifier = req.body?.identifier || req.body?.email;
  req.body = { identifier };
  return app._router.handle(req, res, () => {
  });
});
app.post("/api/auth/sync-password", async (_req, res) => {
  return res.json({ success: true, message: "Password managed authoritatively by Supabase Auth" });
});
app.get("/api/profiles/check-name", async (req, res) => {
  try {
    const name = String(req.query.name || "").trim();
    const excludeUserId = req.query.excludeUserId;
    if (!name || name.length < 3 || name.length > 20) {
      return res.json({ available: false, message: "Name must be between 3 and 20 characters." });
    }
    if (!/^[a-zA-Z0-9_ -]{3,20}$/.test(name)) {
      return res.json({ available: false, message: "Name can only contain letters, numbers, spaces, underscores, and hyphens." });
    }
    const available = await tournamentStorage.isNameAvailable(name, excludeUserId);
    return res.json({ available, message: available ? "Name is available" : "This In-Game Name is already taken." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
app.get("/api/profiles/:id", async (req, res) => {
  try {
    const profile = await tournamentStorage.getProfile(req.params.id);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    return res.json({ success: true, profile });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
app.post("/api/profiles", async (req, res) => {
  try {
    const { id, inGameName, email, avatarUrl } = req.body || {};
    if (!id || !inGameName) {
      return res.status(400).json({ error: "id and inGameName are required" });
    }
    const cleanName = String(inGameName).trim();
    if (cleanName.length < 3 || cleanName.length > 20) {
      return res.status(400).json({ error: "In-Game Name must be between 3 and 20 characters" });
    }
    if (!/^[a-zA-Z0-9_ -]{3,20}$/.test(cleanName)) {
      return res.status(400).json({ error: "In-Game Name can only contain letters, numbers, spaces, underscores, and hyphens." });
    }
    const isAvailable = await tournamentStorage.isNameAvailable(cleanName, id);
    if (!isAvailable) {
      return res.status(409).json({ error: "This In-Game Name is already taken. Please choose another." });
    }
    const profile = await tournamentStorage.saveProfile({
      id,
      email,
      inGameName: cleanName,
      avatarUrl,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    return res.json({ success: true, profile });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
app.get("/api/tournaments", async (req, res) => {
  try {
    await tournamentManager.init();
    const userId = req.query.userId;
    if (userId) {
      const tournaments2 = tournamentManager.getUserTournaments(userId);
      return res.json({ success: true, tournaments: tournaments2 });
    }
    const tournaments = tournamentManager.getAllTournaments().filter((t) => t.status === "REGISTRATION");
    return res.json({ success: true, tournaments });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error fetching tournaments" });
  }
});
app.get("/api/tournaments/:id", async (req, res) => {
  try {
    await tournamentManager.init();
    const tournament = tournamentManager.getTournament(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }
    const userId = req.query.userId;
    if (tournament.status !== "REGISTRATION") {
      if (!userId || tournament.hostId !== userId && !tournament.members.some((m) => m.userId === userId)) {
        return res.status(403).json({ error: "Access denied: You must be an authorized member of this tournament." });
      }
    }
    return res.json({ success: true, tournament });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error fetching tournament" });
  }
});
app.delete("/api/tournaments/:id", async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: "userId is required for tournament deletion" });
    }
    const result = await tournamentManager.deleteTournament(req.params.id, userId);
    if (!result.success) {
      return res.status(result.message?.includes("Access denied") ? 403 : 400).json({ error: result.message });
    }
    return res.json({ success: true, message: "Tournament deleted successfully" });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error deleting tournament" });
  }
});
app.post("/api/tournaments", async (req, res) => {
  try {
    const { name, hostId, hostName, hostEmail, teamsCount, matchOvers, hostFranchiseId, auctionType } = req.body || {};
    if (!hostId || !hostName || !hostFranchiseId) {
      return res.status(400).json({ error: "hostId, hostName, and hostFranchiseId are required" });
    }
    const tCount = [4, 6, 8, 10].includes(Number(teamsCount)) ? Number(teamsCount) : 8;
    const mOvers = [1, 2, 5, 10, 15, 20].includes(Number(matchOvers)) ? Number(matchOvers) : 5;
    const aType = auctionType === "MINI" ? "MINI" : "MEGA";
    const tournament = await tournamentManager.createTournament(
      name || "IPL Tournament",
      hostId,
      hostName,
      hostEmail,
      tCount,
      mOvers,
      hostFranchiseId,
      aType
    );
    return res.status(201).json({ success: true, tournament });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to create tournament" });
  }
});
app.post("/api/tournaments/:id/join", async (req, res) => {
  try {
    const { userId, userName, userEmail, franchiseId } = req.body || {};
    if (!userId || !userName || !franchiseId) {
      return res.status(400).json({ error: "userId, userName, and franchiseId are required" });
    }
    const result = await tournamentManager.joinTournament(
      req.params.id,
      userId,
      userName,
      userEmail,
      franchiseId
    );
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    return res.json({ success: true, tournament: result.tournament });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error joining tournament" });
  }
});
app.post("/api/tournaments/:id/start-auction", async (req, res) => {
  try {
    const { userId } = req.body || {};
    const result = await tournamentManager.startAuction(req.params.id, userId);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error starting auction" });
  }
});
app.post("/api/tournaments/:id/import-auction", async (req, res) => {
  try {
    const result = await tournamentManager.importAuctionSquads(req.params.id);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error importing squads" });
  }
});
app.post("/api/tournaments/:id/start-live", async (req, res) => {
  try {
    const { userId } = req.body || {};
    const result = await tournamentManager.startLiveTournament(req.params.id, userId);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error starting live tournament" });
  }
});
app.post("/api/tournaments/:id/lineup", (req, res) => {
  try {
    const { franchiseId, userId, lineup } = req.body || {};
    if (!franchiseId || !userId || !lineup) {
      return res.status(400).json({ error: "franchiseId, userId, and lineup are required" });
    }
    const result = tournamentManager.saveMatchLineup(req.params.id, franchiseId, userId, lineup);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error saving lineup" });
  }
});
app.post("/api/tournaments/:id/matches/:fixtureId/start", (req, res) => {
  try {
    const { userId } = req.body || {};
    const result = tournamentManager.startMatch(req.params.id, req.params.fixtureId, userId);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    return res.json({ success: true, match: result.match });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error starting match" });
  }
});
app.get("/api/matches/:matchId", (req, res) => {
  const match = tournamentManager.getLiveMatch(req.params.matchId);
  if (!match) {
    return res.status(404).json({ error: "Match not found" });
  }
  const userId = req.query.userId || req.headers["x-user-id"] || void 0;
  let viewerFranchiseId = req.query.franchiseId || void 0;
  if (userId) {
    const verifiedFranchise = tournamentManager.getParticipantFranchise(match.tournamentId, userId);
    if (verifiedFranchise) {
      viewerFranchiseId = verifiedFranchise;
    }
  }
  return res.json({ success: true, match: sanitizeMatchForViewer(match, viewerFranchiseId) });
});
app.post("/api/matches/:matchId/toss", (req, res) => {
  try {
    const { callerFranchiseId, call, tossWinnerFranchiseId, decision } = req.body || {};
    const userId = req.body?.userId || req.headers["x-user-id"] || void 0;
    if (decision && tossWinnerFranchiseId) {
      const result2 = tournamentManager.handleToss(req.params.matchId, tossWinnerFranchiseId, decision);
      if (!result2.success) {
        return res.status(400).json({ error: result2.message });
      }
      return res.json({
        success: true,
        match: result2.match ? sanitizeMatchForViewer(result2.match, tossWinnerFranchiseId) : void 0
      });
    }
    if (!callerFranchiseId || !call) {
      return res.status(400).json({ error: "Caller franchise and call (HEADS/TAILS) required" });
    }
    const result = tournamentManager.resolveToss(req.params.matchId, callerFranchiseId, call, userId);
    if (!result.success) {
      return res.status(result.message.includes("Forbidden") ? 403 : 400).json({ error: result.message });
    }
    return res.json({
      success: true,
      tossWinnerFranchiseId: result.tossWinnerFranchiseId,
      tossResult: result.tossResult,
      message: result.message,
      match: result.match ? sanitizeMatchForViewer(result.match, callerFranchiseId) : void 0
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error handling toss" });
  }
});
app.post("/api/matches/:matchId/toss-decision", (req, res) => {
  try {
    const { tossWinnerFranchiseId, decision } = req.body || {};
    const userId = req.body?.userId || req.headers["x-user-id"] || void 0;
    if (!tossWinnerFranchiseId || !decision) {
      return res.status(400).json({ error: "Toss winner and decision (BAT/BOWL) are required" });
    }
    const result = tournamentManager.handleTossDecision(req.params.matchId, tossWinnerFranchiseId, decision, userId);
    if (!result.success) {
      return res.status(result.message.includes("Forbidden") ? 403 : 400).json({ error: result.message });
    }
    return res.json({
      success: true,
      message: result.message,
      match: result.match ? sanitizeMatchForViewer(result.match, tossWinnerFranchiseId) : void 0
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error handling toss decision" });
  }
});
app.post("/api/matches/:matchId/opening-batters", (req, res) => {
  try {
    const { franchiseId, strikerId, nonStrikerId } = req.body || {};
    const userId = req.body?.userId || req.headers["x-user-id"] || void 0;
    const result = tournamentManager.selectOpeningBatters(req.params.matchId, franchiseId, strikerId, nonStrikerId, userId);
    if (!result.success) {
      return res.status(result.message.includes("Forbidden") ? 403 : 400).json({ error: result.message });
    }
    return res.json({
      success: true,
      message: result.message,
      match: result.match ? sanitizeMatchForViewer(result.match, franchiseId) : void 0
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error selecting opening batters" });
  }
});
app.post("/api/matches/:matchId/opening-bowler", (req, res) => {
  try {
    const { franchiseId, bowlerId } = req.body || {};
    const userId = req.body?.userId || req.headers["x-user-id"] || void 0;
    const result = tournamentManager.selectOpeningBowler(req.params.matchId, franchiseId, bowlerId, userId);
    if (!result.success) {
      return res.status(result.message.includes("Forbidden") ? 403 : 400).json({ error: result.message });
    }
    return res.json({
      success: true,
      message: result.message,
      match: result.match ? sanitizeMatchForViewer(result.match, franchiseId) : void 0
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error selecting opening bowler" });
  }
});
app.post("/api/matches/:matchId/select-batter", (req, res) => {
  try {
    const { franchiseId, replacementBatterId } = req.body || {};
    const userId = req.body?.userId || req.headers["x-user-id"] || void 0;
    const result = tournamentManager.selectReplacementBatter(req.params.matchId, franchiseId, replacementBatterId, userId);
    if (!result.success) {
      return res.status(result.message.includes("Forbidden") ? 403 : 400).json({ error: result.message });
    }
    return res.json({
      success: true,
      message: result.message,
      match: result.match ? sanitizeMatchForViewer(result.match, franchiseId) : void 0
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error selecting replacement batter" });
  }
});
app.post("/api/matches/:matchId/select-bowler", (req, res) => {
  try {
    const { bowlerId, franchiseId } = req.body || {};
    const userId = req.body?.userId || req.headers["x-user-id"] || void 0;
    const result = tournamentManager.selectBowler(req.params.matchId, bowlerId, franchiseId, userId);
    if (!result.success) {
      return res.status(result.message.includes("Forbidden") ? 403 : 400).json({ error: result.message });
    }
    return res.json({
      success: true,
      message: result.message,
      match: result.match ? sanitizeMatchForViewer(result.match, franchiseId) : void 0
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error selecting bowler" });
  }
});
app.post("/api/matches/:matchId/choice", (req, res) => {
  try {
    const { franchiseId, choice, ability, blockedNumbers } = req.body || {};
    const userId = req.body?.userId || req.headers["x-user-id"] || void 0;
    const result = tournamentManager.submitChoice(
      req.params.matchId,
      franchiseId,
      choice,
      ability,
      blockedNumbers,
      userId
    );
    if (result.error) {
      return res.status(result.error.includes("Forbidden") ? 403 : 400).json({ error: result.error });
    }
    return res.json({
      success: true,
      resolved: result.resolved,
      ballEvent: result.ballEvent,
      match: result.match ? sanitizeMatchForViewer(result.match, franchiseId) : void 0
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error submitting choice" });
  }
});
app.post("/api/matches/:matchId/timeout", (req, res) => {
  try {
    const { franchiseId } = req.body || {};
    const result = tournamentManager.handleTimeout(req.params.matchId);
    return res.json({
      success: true,
      resolved: result.resolved,
      ballEvent: result.ballEvent,
      match: result.match ? sanitizeMatchForViewer(result.match, franchiseId) : void 0
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error handling timeout" });
  }
});
app.all("/api/*", (req, res) => {
  res.status(404).json({
    error: `API endpoint not found: ${req.method} ${req.path}`,
    statusCode: 404
  });
});
app.get("*", (req, res) => {
  const indexPath = path5.join(clientDistPath, "index.html");
  if (fs4.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}`, statusCode: 404 });
});
app.use((err, req, res, next) => {
  console.error("[API Error]", err);
  const status = typeof err.status === "number" ? err.status : typeof err.statusCode === "number" ? err.statusCode : 500;
  const message = err.message || "Internal server error";
  if (res.headersSent) {
    return next(err);
  }
  return res.status(status).json({
    error: message,
    statusCode: status
  });
});
var server = isServerless ? null : http.createServer(app);
var wss = null;
if (!isServerless && server) {
  wss = new WebSocketServer({ server });
  wss.on("connection", (ws) => {
    roomManager.handleConnection(ws);
  });
}
var isDirectExecution = Boolean(
  process.argv[1] && (process.argv[1].endsWith("index.ts") || process.argv[1].endsWith("index.js")) && !process.argv[1].includes("___vc")
);
if (!isServerless && isDirectExecution && server && process.env.NODE_ENV !== "test") {
  server.listen(port, host, () => {
    console.log(`[BID WARS SERVER] Live at http://${host}:${port}`);
    console.log(`[BID WARS WSS] Real-time engine ready at ws://${host}:${port}`);
  });
}
if (server) {
  app.server = server;
}
if (wss) {
  app.wss = wss;
}
app.default = app;
var index_default = app;
export {
  app,
  index_default as default,
  isServerless,
  roomManager,
  server,
  tournamentManager
};
