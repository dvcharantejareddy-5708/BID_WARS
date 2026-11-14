import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { RoomManager } from './roomManager.js';
import { getAllPlayers, getPlayerById } from './playerService.js';
import { tournamentManager } from './tournamentManager.js';
import { tournamentStorage } from './tournamentStorage.js';
import { supabase } from './supabase.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3001', 10);
const host = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const roomManager = new RoomManager();
// Restore persisted rooms from durable disk / Supabase
roomManager.loadPersistedRooms().catch((err) => {
  console.error('[Startup] Failed to restore persisted rooms:', err);
});

// Serve static frontend from client/dist if available (unified fullstack deployment / Render)
const resolveClientDistPath = (): string => {
  const candidates = [
    path.join(__dirname, '../../client/dist'),
    path.join(__dirname, '../client/dist'),
    path.join(process.cwd(), 'client/dist'),
    path.join(process.cwd(), '../client/dist')
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'index.html'))) {
      return candidate;
    }
  }
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0];
};

const clientDistPath = resolveClientDistPath();
if (fs.existsSync(clientDistPath)) {
  console.log(`[Static] Serving frontend from ${clientDistPath}`);
  app.use(express.static(clientDistPath));
}

// REST API Endpoints

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    game: 'BID WARS',
    edition: '2026',
    timestamp: Date.now()
  });
});

// Create Room
app.post('/api/rooms', (req, res) => {
  try {
    const { hostNickname, settings } = req.body || {};
    if (!hostNickname || typeof hostNickname !== 'string' || !hostNickname.trim()) {
      return res.status(400).json({ error: 'Valid host nickname is required' });
    }

    // Validate private room password requirement
    if (settings && settings.isPrivate) {
      const pwd = settings.password !== undefined && settings.password !== null ? String(settings.password).trim() : '';
      if (!pwd || pwd.length < 4) {
        return res.status(400).json({ error: 'Password for private rooms must be at least 4 characters' });
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
  } catch (err: any) {
    console.error('[API] Error creating room:', err);
    return res.status(500).json({ error: err.message || 'Failed to create room' });
  }
});

// Verify Room Password (REST API for pre-validation and direct joins)
app.post('/api/rooms/:code/verify-password', (req, res) => {
  try {
    const code = req.params.code.toUpperCase().trim();
    const { password } = req.body || {};
    const room = roomManager.getRoom(code);
    if (!room) {
      return res.status(404).json({ error: `Room "${code}" not found` });
    }
    if (!room.isPrivate) {
      return res.json({ success: true, verified: true, message: 'Room is public' });
    }
    const isValid = room.verifyPassword(password);
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect room password', verified: false });
    }
    return res.json({ success: true, verified: true, message: 'Password verified' });
  } catch (err: any) {
    console.error('[API] Error verifying password:', err);
    return res.status(500).json({ error: err.message || 'Error verifying password' });
  }
});

// Get Room State
app.get('/api/rooms/:code', (req, res) => {
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
  } catch (err: any) {
    console.error('[API] Error getting room:', err);
    return res.status(500).json({ error: err.message || 'Error fetching room state' });
  }
});

// Search & Filter Players
app.get('/api/players', (req, res) => {
  const season = (req.query.season as any) === '2025' ? '2025' : '2026';
  const category = req.query.category as string;
  const role = req.query.role as string;
  const search = (req.query.search as string || '').toLowerCase().trim();
  const nationality = req.query.nationality as string; // 'India' or 'Overseas'
  const pool = req.query.pool as string; // 'auction' or 'retained'
  const marqueeOnly = req.query.marquee === 'true';

  let list = getAllPlayers(season);

  if (category) {
    list = list.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }
  if (role) {
    list = list.filter(p => p.primary_role.toLowerCase() === role.toLowerCase());
  }
  if (search) {
    list = list.filter(p => 
      p.name.toLowerCase().includes(search) || 
      p.nationality.toLowerCase().includes(search) ||
      p.set_name.toLowerCase().includes(search)
    );
  }
  if (nationality === 'India') {
    list = list.filter(p => !p.is_overseas);
  } else if (nationality === 'Overseas') {
    list = list.filter(p => p.is_overseas);
  }
  if (pool === 'auction') {
    list = list.filter(p => !p.is_retained);
  } else if (pool === 'retained') {
    list = list.filter(p => p.is_retained);
  }
  if (marqueeOnly) {
    list = list.filter(p => p.is_marquee);
  }

  res.json({
    total: list.length,
    season,
    players: list
  });
});

// Single Player Detail
app.get('/api/players/:id', (req, res) => {
  const season = (req.query.season as any) === '2025' ? '2025' : '2026';
  const player = getPlayerById(req.params.id, season);
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }
  res.json({ player });
});

// ==========================================
// 4. USERNAME + PASSWORD AUTHENTICATION API
// ==========================================

// Register new account with unique username and secure password
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, confirmPassword, recoveryEmail } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    const cleanUser = String(username).trim();
    if (cleanUser.length < 3 || cleanUser.length > 20) {
      return res.status(400).json({ error: 'Username must be between 3 and 20 characters' });
    }
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(cleanUser)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, underscores, and hyphens' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Atomic uniqueness check
    const isAvailable = await tournamentStorage.isNameAvailable(cleanUser);
    if (!isAvailable) {
      return res.status(409).json({ error: `Username "${cleanUser}" is already taken. Please choose another.` });
    }

    // Generate secure password salt and hash using crypto.scrypt
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = crypto.scryptSync(password, salt, 64).toString('hex');

    // Deterministic, unpredictable internal auth identity for Supabase Auth
    const authSecret = process.env.AUTH_SECRET_SALT || 'bidwars_auth_default_secret_salt_2026';
    const authHash = crypto.createHmac('sha256', authSecret).update(cleanUser.toLowerCase()).digest('hex').slice(0, 32);
    const internalEmail = `usr_${authHash}@bidwars.com`;

    let userId: string = crypto.randomUUID();
    let supabaseSession = null;

    if (supabase) {
      try {
        const { data: suData, error: suError } = await supabase.auth.signUp({
          email: internalEmail,
          password: password,
          options: {
            data: {
              username: cleanUser,
              in_game_name: cleanUser
            }
          }
        });
        if (!suError && suData?.user) {
          userId = suData.user.id;
          if (suData.session) {
            supabaseSession = {
              access_token: suData.session.access_token,
              refresh_token: suData.session.refresh_token
            };
          }
        }
      } catch (err) {
        console.warn('[Auth] Supabase Auth signUp fallback:', err);
      }
    }

    const profile = await tournamentStorage.saveProfile({
      id: userId,
      username: cleanUser,
      inGameName: cleanUser,
      recoveryEmail: recoveryEmail ? String(recoveryEmail).trim() : undefined,
      passwordHash,
      salt,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    return res.status(201).json({
      success: true,
      user: {
        id: profile.id,
        username: profile.username || cleanUser,
        inGameName: profile.inGameName || cleanUser
      },
      session: supabaseSession
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// Login with username and password
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const cleanUser = String(username).trim();
    const profile = await tournamentStorage.getProfileByUsername(cleanUser);

    if (!profile || !profile.passwordHash || !profile.salt) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Verify password in constant time using crypto.timingSafeEqual
    const computedHash = crypto.scryptSync(password, profile.salt, 64).toString('hex');
    const hashBuf = Buffer.from(computedHash, 'hex');
    const targetBuf = Buffer.from(profile.passwordHash, 'hex');

    if (hashBuf.length !== targetBuf.length || !crypto.timingSafeEqual(hashBuf, targetBuf)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Authenticate with Supabase Auth if available
    let supabaseSession = null;
    if (supabase) {
      try {
        const authSecret = process.env.AUTH_SECRET_SALT || 'bidwars_auth_default_secret_salt_2026';
        const authHash = crypto.createHmac('sha256', authSecret).update(cleanUser.toLowerCase()).digest('hex').slice(0, 32);
        const internalEmail = `usr_${authHash}@bidwars.com`;

        const { data: siData } = await supabase.auth.signInWithPassword({
          email: internalEmail,
          password: password
        });

        if (siData?.session) {
          supabaseSession = {
            access_token: siData.session.access_token,
            refresh_token: siData.session.refresh_token
          };
        }
      } catch (err) {
        console.warn('[Auth] Supabase signIn fallback:', err);
      }
    }

    return res.json({
      success: true,
      user: {
        id: profile.id,
        username: profile.username || profile.inGameName,
        inGameName: profile.inGameName,
        avatar: profile.avatarUrl
      },
      session: supabaseSession
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// Password recovery using registered username and recovery email
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { username, recoveryEmail, newPassword, confirmPassword } = req.body || {};
    if (!username || !recoveryEmail || !newPassword) {
      return res.status(400).json({ error: 'Username, recovery email, and new password are required' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const profile = await tournamentStorage.getProfileByUsername(username);
    if (!profile) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (!profile.recoveryEmail || profile.recoveryEmail.trim().toLowerCase() !== String(recoveryEmail).trim().toLowerCase()) {
      return res.status(403).json({ error: 'The provided recovery email does not match our records for this username.' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = crypto.scryptSync(newPassword, salt, 64).toString('hex');

    await tournamentStorage.saveProfile({
      ...profile,
      passwordHash,
      salt,
      updatedAt: Date.now()
    });

    return res.json({ success: true, message: 'Password has been reset successfully. Please log in with your new password.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Password reset failed' });
  }
});

// ==========================================
// USER PROFILES & IN-GAME NAME ENDPOINTS
// ==========================================

// Check if an In-Game Name is available
app.get('/api/profiles/check-name', async (req, res) => {
  try {
    const name = String(req.query.name || '').trim();
    const excludeUserId = req.query.excludeUserId as string | undefined;
    if (!name || name.length < 3 || name.length > 20) {
      return res.json({ available: false, message: 'Name must be between 3 and 20 characters.' });
    }
    if (!/^[a-zA-Z0-9_ -]{3,20}$/.test(name)) {
      return res.json({ available: false, message: 'Name can only contain letters, numbers, spaces, underscores, and hyphens.' });
    }
    const available = await tournamentStorage.isNameAvailable(name, excludeUserId);
    return res.json({ available, message: available ? 'Name is available' : 'This In-Game Name is already taken.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get user profile by Supabase UUID
app.get('/api/profiles/:id', async (req, res) => {
  try {
    const profile = await tournamentStorage.getProfile(req.params.id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    return res.json({ success: true, profile });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create or update user profile with In-Game Name
app.post('/api/profiles', async (req, res) => {
  try {
    const { id, inGameName, email, avatarUrl } = req.body || {};
    if (!id || !inGameName) {
      return res.status(400).json({ error: 'id and inGameName are required' });
    }
    const cleanName = String(inGameName).trim();
    if (cleanName.length < 3 || cleanName.length > 20) {
      return res.status(400).json({ error: 'In-Game Name must be between 3 and 20 characters' });
    }
    if (!/^[a-zA-Z0-9_ -]{3,20}$/.test(cleanName)) {
      return res.status(400).json({ error: 'In-Game Name can only contain letters, numbers, spaces, underscores, and hyphens.' });
    }
    const isAvailable = await tournamentStorage.isNameAvailable(cleanName, id);
    if (!isAvailable) {
      return res.status(409).json({ error: 'This In-Game Name is already taken. Please choose another.' });
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// TOURNAMENT REST API ENDPOINTS
// ==========================================

// List tournaments (STRICT PRIVACY: Only returns user's created or joined tournaments)
app.get('/api/tournaments', async (req, res) => {
  try {
    await tournamentManager.init();
    const userId = req.query.userId as string | undefined;
    if (userId) {
      const tournaments = tournamentManager.getUserTournaments(userId);
      return res.json({ success: true, tournaments });
    }
    // Fallback: If no userId specified, return open registration tournaments
    const tournaments = tournamentManager.getAllTournaments().filter(t => t.status === 'REGISTRATION');
    return res.json({ success: true, tournaments });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error fetching tournaments' });
  }
});

// Single tournament details (Strict privacy: non-members cannot access active tournaments)
app.get('/api/tournaments/:id', async (req, res) => {
  try {
    await tournamentManager.init();
    const tournament = tournamentManager.getTournament(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    const userId = req.query.userId as string | undefined;
    if (tournament.status !== 'REGISTRATION') {
      if (!userId || (tournament.hostId !== userId && !tournament.members.some(m => m.userId === userId))) {
        return res.status(403).json({ error: 'Access denied: You must be an authorized member of this tournament.' });
      }
    }
    return res.json({ success: true, tournament });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error fetching tournament' });
  }
});

// Delete tournament (STRICT: Only the original tournament creator can delete)
app.delete('/api/tournaments/:id', async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: 'userId is required for tournament deletion' });
    }
    const result = await tournamentManager.deleteTournament(req.params.id, userId);
    if (!result.success) {
      return res.status(result.message?.includes('Access denied') ? 403 : 400).json({ error: result.message });
    }
    return res.json({ success: true, message: 'Tournament deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error deleting tournament' });
  }
});

// Create tournament
app.post('/api/tournaments', async (req, res) => {
  try {
    const { name, hostId, hostName, hostEmail, teamsCount, matchOvers, hostFranchiseId } = req.body || {};
    if (!hostId || !hostName || !hostFranchiseId) {
      return res.status(400).json({ error: 'hostId, hostName, and hostFranchiseId are required' });
    }
    const tCount = [4, 6, 8, 10].includes(Number(teamsCount)) ? Number(teamsCount) as 4 | 6 | 8 | 10 : 8;
    const mOvers = [1, 2, 5, 10, 15, 20].includes(Number(matchOvers)) ? Number(matchOvers) as 1 | 2 | 5 | 10 | 15 | 20 : 5;

    const tournament = await tournamentManager.createTournament(
      name || 'IPL Tournament',
      hostId,
      hostName,
      hostEmail,
      tCount,
      mOvers,
      hostFranchiseId
    );

    return res.status(201).json({ success: true, tournament });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create tournament' });
  }
});

// Join tournament (Strict 1 account = 1 team check)
app.post('/api/tournaments/:id/join', async (req, res) => {
  try {
    const { userId, userName, userEmail, franchiseId } = req.body || {};
    if (!userId || !userName || !franchiseId) {
      return res.status(400).json({ error: 'userId, userName, and franchiseId are required' });
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error joining tournament' });
  }
});

// Start tournament auction stage
app.post('/api/tournaments/:id/start-auction', async (req, res) => {
  try {
    const { userId } = req.body || {};
    const result = await tournamentManager.startAuction(req.params.id, userId);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error starting auction' });
  }
});

// Import completed auction squads
app.post('/api/tournaments/:id/import-auction', async (req, res) => {
  try {
    const result = await tournamentManager.importAuctionSquads(req.params.id);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error importing squads' });
  }
});

// Start live tournament & generate fixtures
app.post('/api/tournaments/:id/start-live', async (req, res) => {
  try {
    const { userId } = req.body || {};
    const result = await tournamentManager.startLiveTournament(req.params.id, userId);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error starting live tournament' });
  }
});

// Save match lineup
app.post('/api/tournaments/:id/lineup', (req, res) => {
  try {
    const { franchiseId, userId, lineup } = req.body || {};
    if (!franchiseId || !userId || !lineup) {
      return res.status(400).json({ error: 'franchiseId, userId, and lineup are required' });
    }
    const result = tournamentManager.saveMatchLineup(req.params.id, franchiseId, userId, lineup);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error saving lineup' });
  }
});

// Start a scheduled match
app.post('/api/tournaments/:id/matches/:fixtureId/start', (req, res) => {
  try {
    const { userId } = req.body || {};
    const result = tournamentManager.startMatch(req.params.id, req.params.fixtureId, userId);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    return res.json({ success: true, match: result.match });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error starting match' });
  }
});

// Get Live Match
app.get('/api/matches/:matchId', (req, res) => {
  const match = tournamentManager.getLiveMatch(req.params.matchId);
  if (!match) {
    return res.status(404).json({ error: 'Match not found' });
  }
  return res.json({ success: true, match });
});

// Match Toss
app.post('/api/matches/:matchId/toss', (req, res) => {
  try {
    const { tossWinnerFranchiseId, decision } = req.body || {};
    const result = tournamentManager.handleToss(req.params.matchId, tossWinnerFranchiseId, decision);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    return res.json({ success: true, match: result.match });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error handling toss' });
  }
});

// Submit ball choice
app.post('/api/matches/:matchId/choice', (req, res) => {
  try {
    const { franchiseId, choice, ability, blockedNumbers } = req.body || {};
    const result = tournamentManager.submitChoice(
      req.params.matchId,
      franchiseId,
      choice,
      ability,
      blockedNumbers
    );
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    return res.json({ success: true, resolved: result.resolved, ballEvent: result.ballEvent, match: result.match });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error submitting choice' });
  }
});

// Handle turn timeout
app.post('/api/matches/:matchId/timeout', (req, res) => {
  try {
    const result = tournamentManager.handleTimeout(req.params.matchId);
    return res.json({ success: true, resolved: result.resolved, ballEvent: result.ballEvent, match: result.match });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error handling timeout' });
  }
});

// API 404 handler - Unmatched /api/* routes must ALWAYS return JSON 404, never HTML
app.all('/api/*', (req, res) => {
  res.status(404).json({
    error: `API endpoint not found: ${req.method} ${req.path}`,
    statusCode: 404
  });
});

// Fallback for unmatched frontend client routes (SPA routing in standalone/dev mode)
app.get('*', (req, res) => {
  const indexPath = path.join(clientDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}`, statusCode: 404 });
});

// Global Error Handler - Guarantees API errors always return valid JSON
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API Error]', err);
  const status = typeof err.status === 'number' ? err.status : (typeof err.statusCode === 'number' ? err.statusCode : 500);
  const message = err.message || 'Internal server error';
  if (res.headersSent) {
    return next(err);
  }
  return res.status(status).json({
    error: message,
    statusCode: status
  });
});

// Detect serverless environment (Vercel Functions / AWS Lambda) to prevent port-binding conflicts
const isServerless = Boolean(
  process.env.VERCEL || 
  process.env.VERCEL_ENV || 
  process.env.VERCEL_URL || 
  process.env.VERCEL_REGION || 
  process.env.AWS_LAMBDA_FUNCTION_NAME || 
  process.env.NOW_REGION || 
  process.env.LAMBDA_TASK_ROOT
);

// HTTP Server & WebSockets
let server: http.Server = http.createServer(app);
let wss: WebSocketServer | null = null;

if (!isServerless) {
  wss = new WebSocketServer({ server });
  wss.on('connection', (ws) => {
    roomManager.handleConnection(ws);
  });
}

// Start permanent HTTP listener only when directly executed (standalone/persistent mode)
const isDirectExecution = Boolean(
  process.argv[1] && (
    process.argv[1].endsWith('index.ts') || 
    process.argv[1].endsWith('index.js')
  ) && !process.argv[1].includes('___vc')
);

if (!isServerless && isDirectExecution && process.env.NODE_ENV !== 'test') {
  server.listen(port, host, () => {
    console.log(`[BID WARS SERVER] Live at http://${host}:${port}`);
    console.log(`[BID WARS WSS] Real-time engine ready at ws://${host}:${port}`);
  });
}

// Attach HTTP server and WebSocket server references to Express app
(app as any).server = server;
if (wss) {
  (app as any).wss = wss;
}

export default app;
export { app, server, roomManager, tournamentManager };

