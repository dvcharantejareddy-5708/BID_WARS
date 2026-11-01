export type IPLTeamId =
  | 'CSK'
  | 'MI'
  | 'RCB'
  | 'KKR'
  | 'SRH'
  | 'RR'
  | 'PBKS'
  | 'DC'
  | 'GT'
  | 'LSG';

export interface IPLFranchise {
  id: IPLTeamId;
  name: string;
  shortName: string;
  city: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  emblemText: string;
}

export const IPL_FRANCHISES: Record<IPLTeamId, IPLFranchise> = {
  CSK: {
    id: 'CSK',
    name: 'Chennai Super Kings',
    shortName: 'CSK',
    city: 'Chennai',
    primaryColor: '#F9CD05',
    secondaryColor: '#005FA2',
    accentColor: '#F9CD05',
    textColor: '#1A1A1A',
    emblemText: '🦁 Whistle Podu'
  },
  MI: {
    id: 'MI',
    name: 'Mumbai Indians',
    shortName: 'MI',
    city: 'Mumbai',
    primaryColor: '#004BA0',
    secondaryColor: '#D1AB3E',
    accentColor: '#0078FF',
    textColor: '#FFFFFF',
    emblemText: '🌀 One Family'
  },
  RCB: {
    id: 'RCB',
    name: 'Royal Challengers Bengaluru',
    shortName: 'RCB',
    city: 'Bengaluru',
    primaryColor: '#EC1C24',
    secondaryColor: '#2B2A29',
    accentColor: '#D1AB3E',
    textColor: '#FFFFFF',
    emblemText: '👑 Play Bold'
  },
  KKR: {
    id: 'KKR',
    name: 'Kolkata Knight Riders',
    shortName: 'KKR',
    city: 'Kolkata',
    primaryColor: '#3A225D',
    secondaryColor: '#D1AB3E',
    accentColor: '#7B42BC',
    textColor: '#FFFFFF',
    emblemText: '⚔️ Korbo Lorbo Jeetbo'
  },
  SRH: {
    id: 'SRH',
    name: 'Sunrisers Hyderabad',
    shortName: 'SRH',
    city: 'Hyderabad',
    primaryColor: '#F26522',
    secondaryColor: '#000000',
    accentColor: '#FF823A',
    textColor: '#FFFFFF',
    emblemText: '🦅 Orange Army'
  },
  RR: {
    id: 'RR',
    name: 'Rajasthan Royals',
    shortName: 'RR',
    city: 'Jaipur',
    primaryColor: '#EA1A85',
    secondaryColor: '#001D48',
    accentColor: '#FF4D94',
    textColor: '#FFFFFF',
    emblemText: '👑 Halla Bol'
  },
  PBKS: {
    id: 'PBKS',
    name: 'Punjab Kings',
    shortName: 'PBKS',
    city: 'Mohali',
    primaryColor: '#ED1B24',
    secondaryColor: '#A7A9AC',
    accentColor: '#D71921',
    textColor: '#FFFFFF',
    emblemText: '🦁 Sadda Punjab'
  },
  DC: {
    id: 'DC',
    name: 'Delhi Capitals',
    shortName: 'DC',
    city: 'Delhi',
    primaryColor: '#004C97',
    secondaryColor: '#EF3B24',
    accentColor: '#0072CE',
    textColor: '#FFFFFF',
    emblemText: '🐯 Roar Macha'
  },
  GT: {
    id: 'GT',
    name: 'Gujarat Titans',
    shortName: 'GT',
    city: 'Ahmedabad',
    primaryColor: '#1B2133',
    secondaryColor: '#BCA136',
    accentColor: '#2C3E6B',
    textColor: '#FFFFFF',
    emblemText: '⚡ Aava De'
  },
  LSG: {
    id: 'LSG',
    name: 'Lucknow Super Giants',
    shortName: 'LSG',
    city: 'Lucknow',
    primaryColor: '#0057B8',
    secondaryColor: '#E65828',
    accentColor: '#00A3E0',
    textColor: '#FFFFFF',
    emblemText: '🦅 Ab Apni Baari Hai'
  }
};

export type PlayerCategory = 'Batsmen' | 'All-rounders' | 'Bowlers' | 'Wicket-keepers';
export type PrimaryRole = 'BATTER' | 'BOWLER' | 'ALL_ROUNDER';

export interface Player {
  id: string;
  s_no: number;
  name: string;
  raw_name: string;
  nationality: string;
  is_overseas: boolean;
  primary_role: PrimaryRole;
  category: PlayerCategory;
  is_wicketkeeper: boolean;
  year: number;
  base_price_inr: number;
  base_price_display: string;
  set_code: string;
  set_name: string;
  set_order: number;
  is_marquee: boolean;
  is_retained: boolean;
  eligibility: 'auction_eligible' | 'retained';
  image_url: string;
  image_source: string;
  verification_status: string;
  data_source: string;
}

export type BotStrategy = 'balanced' | 'aggressive' | 'budget' | 'specialist';

export interface RoomSettings {
  roomName: string;
  season: '2026' | '2025';
  poolMode: 'auction_pool' | 'mega_all';
  startingPurse: number;       // default 120,00,00,000 (120 Cr)
  timerDuration: number;       // 5 to 20 seconds, default 10
  minSquad: number;            // default 18
  maxSquad: number;            // default 25
  maxOverseas: number;         // default 8
  minBidIncrement: number;     // default 20,00,000 (20L)
  playMode: 'friends_only' | 'friends_bots';
  botCount: number;
  allowDuplicateTeams: boolean;
}

export interface RoomMember {
  id: string;
  nickname: string;
  teamId: IPLTeamId | null;
  isHost: boolean;
  isReady: boolean;
  isBot: boolean;
  botStrategy?: BotStrategy;
  connected: boolean;
  lastSeen: number;
}

export interface BidRecord {
  bidId: string;
  lotId: string;
  playerId: string;
  amount: number;
  teamId: IPLTeamId;
  teamName: string;
  bidderName: string;
  timestamp: number;
  isBot: boolean;
}

export type LotStatus = 'PENDING' | 'IN_PROGRESS' | 'SOLD' | 'UNSOLD' | 'SKIPPED';

export interface AuctionLot {
  lotNumber: number;
  totalLots: number;
  player: Player;
  status: LotStatus;
  currentBid: number;
  currentBidder: IPLTeamId | null;
  currentBidderName: string | null;
  bids: BidRecord[];
  soldPrice?: number;
  winningTeam?: IPLTeamId;
  winningTeamName?: string;
  winningBidderName?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: string;
  details: string;
  performer: string;
}

export interface TeamStats {
  teamId: IPLTeamId;
  totalSpent: number;
  remainingPurse: number;
  squadCount: number;
  overseasCount: number;
  battersCount: number;
  bowlersCount: number;
  allRoundersCount: number;
  wicketKeepersCount: number;
  isValidSquad: boolean;
  minSpendRequired: number;
}

export interface RoomState {
  roomCode: string;
  status: 'LOBBY' | 'AUCTION' | 'PAUSED' | 'COMPLETED';
  settings: RoomSettings;
  hostId: string;
  members: Record<string, RoomMember>;
  teamPurse: Record<IPLTeamId, number>;
  teamSquads: Record<IPLTeamId, Player[]>;
  currentLotIndex: number;
  currentLot: AuctionLot | null;
  deadlineTimestamp: number | null;
  remainingSeconds: number;
  history: AuctionLot[];
  auditLog: AuditLogEntry[];
  poolSize: number;
  totalSets: number;
  currentSetOrder: number;
  currentSetName: string;
}

// Client to Server Message Events
export type ClientMessage =
  | { type: 'JOIN_ROOM'; roomCode: string; nickname: string; sessionToken?: string }
  | { type: 'SELECT_TEAM'; teamId: IPLTeamId }
  | { type: 'TOGGLE_READY'; isReady: boolean }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<RoomSettings> }
  | { type: 'START_AUCTION' }
  | { type: 'PLACE_BID'; amount?: number } // if omitted, uses next legal increment
  | { type: 'SKIP_PLAYER' }
  | { type: 'PAUSE_AUCTION' }
  | { type: 'RESUME_AUCTION' }
  | { type: 'RESTART_AUCTION' }
  | { type: 'END_AUCTION' }
  | { type: 'REAUCTION_UNSOLD' }
  | { type: 'PING' };

// Server to Client Message Events
export type ServerMessage =
  | { type: 'SYNC_STATE'; state: RoomState; myMemberId: string }
  | { type: 'TIMER_TICK'; remainingSeconds: number; deadlineTimestamp: number }
  | { type: 'BID_PLACED'; bid: BidRecord; nextMinBid: number; deadlineTimestamp: number }
  | { type: 'LOT_FINALIZED'; lot: AuctionLot; teamPurse: Record<IPLTeamId, number> }
  | { type: 'NEW_LOT'; lot: AuctionLot; deadlineTimestamp: number }
  | { type: 'AUCTION_PAUSED'; reason?: string }
  | { type: 'AUCTION_RESUMED'; deadlineTimestamp: number }
  | { type: 'AUCTION_COMPLETED'; summary: any }
  | { type: 'ERROR'; message: string; code?: string }
  | { type: 'PONG' };
