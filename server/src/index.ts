import express from 'express';
import http from 'http';
import path from 'path';
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

// Serve static frontend from client/dist if available
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

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
  const { hostNickname, settings } = req.body;
  if (!hostNickname || typeof hostNickname !== 'string' || !hostNickname.trim()) {
    return res.status(400).json({ error: 'Valid host nickname is required' });
  }

  const room = roomManager.createRoom(hostNickname.trim(), settings || {});

  res.json({
    success: true,
    roomCode: room.roomCode,
    hostId: room.hostId,
    sessionToken: room.hostId,
    state: room.getState()
  });
});

// Get Room State
app.get('/api/rooms/:code', (req, res) => {
  const code = req.params.code.toUpperCase().trim();
  const room = roomManager.getRoom(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({
    success: true,
    roomCode: room.roomCode,
    state: room.getState()
  });
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

// SPA fallback for HTML5 routing
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// HTTP Server & WebSockets
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  roomManager.handleConnection(ws);
});

server.listen(port, host, () => {
  console.log(`[BID WARS SERVER] Live at http://${host}:${port}`);
  console.log(`[BID WARS WSS] Real-time engine ready at ws://${host}:${port}`);
});
