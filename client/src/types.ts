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
  logoUrl: string;
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
    emblemText: '🦁 Whistle Podu',
    logoUrl: '/logos/csk.jpg'
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
    emblemText: '🌀 One Family',
    logoUrl: '/logos/mi.jpg'
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
    emblemText: '👑 Play Bold',
    logoUrl: '/logos/rcb.png'
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
    emblemText: '⚔️ Korbo Lorbo Jeetbo',
    logoUrl: '/logos/kkr.jpg'
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
    emblemText: '🦅 Orange Army',
    logoUrl: '/logos/srh.jpeg'
  },
  RR: {
    id: 'RR',
    name: 'Rajasthan Royals',
    shortName: 'RR',
    city: 'Jaipur',
    primaryColor: '#EA1A85',
    secondaryColor: '#004BA0',
    accentColor: '#FF69B4',
    textColor: '#FFFFFF',
    emblemText: '👑 Halla Bol',
    logoUrl: '/logos/rr.png'
  },
  PBKS: {
    id: 'PBKS',
    name: 'Punjab Kings',
    shortName: 'PBKS',
    city: 'Mohali',
    primaryColor: '#DD1F2D',
    secondaryColor: '#D1AB3E',
    accentColor: '#ED1B24',
    textColor: '#FFFFFF',
    emblemText: '🦁 Sadda Punjab',
    logoUrl: '/logos/pbks.jpeg'
  },
  DC: {
    id: 'DC',
    name: 'Delhi Capitals',
    shortName: 'DC',
    city: 'Delhi',
    primaryColor: '#004C97',
    secondaryColor: '#EF1B23',
    accentColor: '#2563EB',
    textColor: '#FFFFFF',
    emblemText: '🐯 Roar Macha',
    logoUrl: '/logos/dc.jpg'
  },
  GT: {
    id: 'GT',
    name: 'Gujarat Titans',
    city: 'Ahmedabad',
    shortName: 'GT',
    primaryColor: '#1B2133',
    secondaryColor: '#D1AB3E',
    accentColor: '#0B4973',
    textColor: '#FFFFFF',
    emblemText: '⚡ Aava De',
    logoUrl: '/logos/gt.jpg'
  },
  LSG: {
    id: 'LSG',
    name: 'Lucknow Super Giants',
    shortName: 'LSG',
    city: 'Lucknow',
    primaryColor: '#A72056',
    secondaryColor: '#F9CD05',
    accentColor: '#0057B7',
    textColor: '#FFFFFF',
    emblemText: '🐘 Gazab Andaz',
    logoUrl: '/logos/lsg.webp'
  }
};

export function resolveTeamId(input?: string | null): IPLTeamId | null {
  if (!input) return null;
  const clean = input.trim().toUpperCase();
  if (clean in IPL_FRANCHISES) return clean as IPLTeamId;

  for (const [key, f] of Object.entries(IPL_FRANCHISES)) {
    if (f.shortName.toUpperCase() === clean || f.name.toUpperCase() === clean) {
      return key as IPLTeamId;
    }
  }

  if (clean.includes('CHENNAI') || clean.includes('SUPER KINGS')) return 'CSK';
  if (clean.includes('MUMBAI') || clean.includes('INDIANS')) return 'MI';
  if (clean.includes('BANGALORE') || clean.includes('BENGALURU') || clean.includes('CHALLENGERS')) return 'RCB';
  if (clean.includes('KOLKATA') || clean.includes('KNIGHT')) return 'KKR';
  if (clean.includes('HYDERABAD') || clean.includes('SUNRISERS')) return 'SRH';
  if (clean.includes('RAJASTHAN') || clean.includes('ROYALS')) return 'RR';
  if (clean.includes('PUNJAB') || clean.includes('KINGS')) return 'PBKS';
  if (clean.includes('DELHI') || clean.includes('CAPITALS')) return 'DC';
  if (clean.includes('GUJARAT') || clean.includes('TITANS')) return 'GT';
  if (clean.includes('LUCKNOW') || clean.includes('GIANTS')) return 'LSG';

  return null;
}

export function resolveTeamFranchise(input?: string | null): IPLFranchise | null {
  const id = resolveTeamId(input);
  return id ? IPL_FRANCHISES[id] : null;
}

export type PlayerCategory = 'Batsmen' | 'All-rounders' | 'Bowlers' | 'Wicket-keepers';
export type PrimaryRole = 'BATTER' | 'BOWLER' | 'ALL_ROUNDER';

export interface Player {
  id: string;
  player_id: string;
  s_no: number;
  name: string;
  raw_name: string;
  country: string;
  nationality: string;
  player_category: 'INDIAN' | 'OVERSEAS';
  is_overseas: boolean;
  primary_role: PrimaryRole;
  role: PrimaryRole;
  category: PlayerCategory;
  is_wicketkeeper: boolean;
  year: number;
  base_price_inr: number;
  base_price_display: string;
  auction_status: 'AVAILABLE' | 'SOLD' | 'UNSOLD' | 'SKIPPED';
  sold_price_inr?: number;
  team_id?: IPLTeamId;
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
  isPrivate: boolean;
  password?: string;
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
  resultId?: string;
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
  teamName: string;
  managerName: string | null;
  isBot: boolean;
  initialPurse: number;
  totalSpent: number;
  remainingPurse: number;
  squadCount: number;
  indianCount: number;
  overseasCount: number;
  remainingOverseasSlots: number;
  battersCount: number;
  bowlersCount: number;
  allRoundersCount: number;
  wicketKeepersCount: number;
  isValidSquad: boolean;
  minSpendRequired: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  teamId?: IPLTeamId;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface BidLogEntry {
  id: string;
  type: 'BID' | 'EVENT';
  timestamp: number;
  lotNumber?: number;
  playerName?: string;
  teamId?: IPLTeamId;
  teamName?: string;
  bidderName?: string;
  amount?: number;
  accepted?: boolean;
  rejectionReason?: string;
  isHighest?: boolean;
  eventAction?: string;
  eventMessage?: string;
}

export interface RoomState {
  roomCode: string;
  status: 'LOBBY' | 'AUCTION' | 'PAUSED' | 'COMPLETED';
  isPrivate: boolean;
  settings: RoomSettings;
  hostId: string;
  members: Record<string, RoomMember>;
  teamPurse: Record<IPLTeamId, number>;
  teamSquads: Record<IPLTeamId, Player[]>;
  teamStats: Record<IPLTeamId, TeamStats>;
  currentLotIndex: number;
  currentLot: AuctionLot | null;
  deadlineTimestamp: number | null;
  remainingSeconds: number;
  history: AuctionLot[];
  auditLog: AuditLogEntry[];
  chatMessages: ChatMessage[];
  bidLog: BidLogEntry[];
  announcementPhase?: 'NONE' | 'ANNOUNCING';
  announcementLotNumber?: number;
  currentResultId?: string | null;
  poolSize: number;
  totalSets: number;
  currentSetOrder: number;
  currentSetName: string;
}

// Client to Server Message Events
export type ClientMessage =
  | { type: 'JOIN_ROOM'; roomCode: string; nickname: string; sessionToken?: string; password?: string }
  | { type: 'LEAVE_ROOM' }
  | { type: 'VERIFY_PASSWORD'; roomCode: string; password: string }
  | { type: 'SELECT_TEAM'; teamId: IPLTeamId }
  | { type: 'TOGGLE_READY'; isReady: boolean }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<RoomSettings> }
  | { type: 'START_AUCTION' }
  | { type: 'PLACE_BID'; amount?: number }
  | { type: 'SKIP_PLAYER' }
  | { type: 'DRAW_RANDOM_PLAYER'; category: PlayerCategory; basePriceInr: number }
  | { type: 'SEND_CHAT_MESSAGE'; text: string }
  | { type: 'PAUSE_AUCTION' }
  | { type: 'RESUME_AUCTION' }
  | { type: 'RESTART_AUCTION' }
  | { type: 'END_AUCTION' }
  | { type: 'REAUCTION_UNSOLD' }
  | { type: 'ADVANCE_LOT'; lotIndex?: number }
  | { type: 'ANNOUNCEMENT_COMPLETE'; lotIndex: number; resultId?: string }
  | { type: 'PING' };

// Server to Client Message Events
export type ServerMessage =
  | { type: 'SYNC_STATE'; state: RoomState; myMemberId: string }
  | { type: 'PASSWORD_REQUIRED'; roomCode: string; roomName: string }
  | { type: 'PASSWORD_VERIFIED'; token: string }
  | { type: 'TIMER_TICK'; remainingSeconds: number; deadlineTimestamp: number }
  | { type: 'BID_PLACED'; bid: BidRecord; nextMinBid: number; deadlineTimestamp: number }
  | { type: 'LOT_FINALIZED'; lot: AuctionLot; teamPurse: Record<IPLTeamId, number>; teamSquads: Record<IPLTeamId, Player[]>; teamStats: Record<IPLTeamId, TeamStats> }
  | { type: 'NEW_LOT'; lot: AuctionLot; deadlineTimestamp: number }
  | { type: 'CHAT_MESSAGE'; message: ChatMessage }
  | { type: 'AUCTION_PAUSED'; reason?: string }
  | { type: 'AUCTION_RESUMED'; deadlineTimestamp: number }
  | { type: 'AUCTION_COMPLETED'; summary: Record<IPLTeamId, TeamStats> }
  | { type: 'ERROR'; message: string; code?: string }
  | { type: 'PONG' };
