import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { RoomManager } from './roomManager.js';
import { getAllPlayers, getPlayerById } from './playerService.js';
import './supabase.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3001', 10);
const host = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());

const roomManager = new RoomManager();

// Serve static frontend from client/dist if available locally (standalone/dev mode)
const clientDistPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
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

// HTTP Server & WebSockets
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  roomManager.handleConnection(ws);
});

// Start permanent HTTP listener only when directly executed (standalone/dev mode)
const isMainModule = Boolean(process.argv[1] && (
  process.argv[1].endsWith('index.ts') || 
  process.argv[1].endsWith('index.js')
));

if (!process.env.VERCEL && isMainModule && process.env.NODE_ENV !== 'test') {
  server.listen(port, host, () => {
    console.log(`[BID WARS SERVER] Live at http://${host}:${port}`);
    console.log(`[BID WARS WSS] Real-time engine ready at ws://${host}:${port}`);
  });
}

export default app;
export { app, server, roomManager };

