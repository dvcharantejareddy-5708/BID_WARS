import crypto from 'crypto';
import { 
  IPLTeamId, 
  IPL_FRANCHISES, 
  Player, 
  RoomSettings, 
  RoomMember, 
  AuctionLot, 
  BidRecord, 
  AuditLogEntry, 
  RoomState, 
  BotStrategy,
  TeamStats,
  PlayerCategory,
  ChatMessage,
  BidLogEntry,
  TradeRequest,
  TradeType,
  TradeStatus,
  PlayingXISelection
} from './types.js';
import { buildAuctionLots, shuffleArray } from './playerService.js';
import { evaluateBotBid } from './botEngine.js';
import { storageService, SerializedRoomData } from './storageService.js';

export class GameRoom {
  public roomCode: string;
  public settings: RoomSettings;
  public status: 'LOBBY' | 'AUCTION' | 'PAUSED' | 'COMPLETED' = 'LOBBY';
  public hostId: string;
  public isPrivate: boolean = false;
  private passwordHash: string | null = null;

  public members: Map<string, RoomMember> = new Map();
  public teamPurse: Record<IPLTeamId, number> = {} as any;
  public teamSquads: Record<IPLTeamId, Player[]> = {} as any;
  public lots: AuctionLot[] = [];
  public currentLotIndex: number = 0;
  public deadlineTimestamp: number | null = null;
  public history: AuctionLot[] = [];
  public auditLog: AuditLogEntry[] = [];
  public chatMessages: ChatMessage[] = [];
  public bidLog: BidLogEntry[] = [];
  public announcementPhase: 'NONE' | 'ANNOUNCING' = 'NONE';
  public announcementLotNumber: number | null = null;
  public currentResultId: string | null = null;
  public reAuctionRound: boolean = false;
  public isClosed: boolean = false;
  public kickedMemberIds: Set<string> = new Set();
  public activeTrade: TradeRequest | null = null;
  public tradeHistory: TradeRequest[] = [];
  public pausedByTrade: boolean = false;
  public teamPlayingXI: Record<IPLTeamId, PlayingXISelection> = {} as any;
  public postAuctionTradeStatus: 'NOT_STARTED' | 'ACTIVE' | 'CLOSED' = 'NOT_STARTED';
  public postAuctionTradeDeadline: number | null = null;

  private timerInterval: NodeJS.Timeout | null = null;
  private botTimeouts: NodeJS.Timeout[] = [];
  private lotTransitionTimeout: NodeJS.Timeout | null = null;
  private tradeTimeout: NodeJS.Timeout | null = null;
  private postAuctionTradeTimeout: NodeJS.Timeout | null = null;
  private wasAuctionActiveBeforeTrade: boolean = false;
  private broadcastCallback: (state: RoomState, eventMsg?: any) => void;
  private isProcessingBid: boolean = false;
  private pauseRemainingMs: number | null = null;

  public get currentLot(): AuctionLot | null {
    return this.currentLotIndex < this.lots.length ? this.lots[this.currentLotIndex] : null;
  }

  constructor(
    roomCode: string, 
    hostNickname: string, 
    initialSettings: Partial<RoomSettings>,
    broadcastCallback: (state: RoomState, eventMsg?: any) => void
  ) {
    this.roomCode = roomCode;
    this.broadcastCallback = broadcastCallback;
    
    this.isPrivate = Boolean(initialSettings.isPrivate);
    if (this.isPrivate && initialSettings.password !== undefined && initialSettings.password !== null) {
      const cleanPassword = String(initialSettings.password).trim();
      if (cleanPassword) {
        this.passwordHash = crypto.createHash('sha256').update(cleanPassword).digest('hex');
      }
    }

    this.settings = {
      roomName: initialSettings.roomName || `Auction Room ${roomCode}`,
      isPrivate: this.isPrivate,
      season: initialSettings.season || '2026',
      poolMode: initialSettings.poolMode || 'auction_pool',
      startingPurse: initialSettings.startingPurse || 1200000000, // 120 Cr
      timerDuration: initialSettings.timerDuration || 10,
      minSquad: initialSettings.minSquad || 18,
      maxSquad: initialSettings.maxSquad || 25,
      maxOverseas: 8, // Master rule: 8 overseas maximum
      minBidIncrement: initialSettings.minBidIncrement || 2000000, // 20 Lakh
      playMode: initialSettings.playMode || 'friends_only',
      botCount: initialSettings.botCount || 0,
      allowDuplicateTeams: initialSettings.allowDuplicateTeams || false,
      tradeTimerDuration: initialSettings.tradeTimerDuration || 45
    };

    // Initialize 10 franchise purses, squads, and Playing XI
    const allTeams: IPLTeamId[] = ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'PBKS', 'DC', 'GT', 'LSG'];
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

    // Create host member
    const hostId = `mem_${Math.random().toString(36).substring(2, 9)}`;
    this.hostId = hostId;
    this.members.set(hostId, {
      id: hostId,
      nickname: hostNickname,
      teamId: null,
      isHost: true,
      isReady: false,
      isBot: false,
      connected: true,
      lastSeen: Date.now()
    });

    this.addAuditLog('ROOM_CREATED', `Room ${roomCode} created by ${hostNickname}`, hostNickname);
  }

  public verifyPassword(inputPassword?: string): boolean {
    if (!this.isPrivate) return true;
    if (!this.passwordHash) return true;
    if (inputPassword === undefined || inputPassword === null) return false;
    const cleanInput = String(inputPassword).trim();
    if (!cleanInput) return false;
    const hash = crypto.createHash('sha256').update(cleanInput).digest('hex');
    return hash === this.passwordHash;
  }

  public addAuditLog(action: string, details: string, performer: string) {
    this.auditLog.unshift({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      action,
      details,
      performer
    });
    if (this.auditLog.length > 100) this.auditLog.pop();
  }

  public addBidLog(entry: Omit<BidLogEntry, 'id' | 'timestamp'>) {
    // If it's a new highest bid, update existing bids
    if (entry.isHighest) {
      for (const b of this.bidLog) {
        if (b.type === 'BID' && b.isHighest) {
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

  public getMember(memberId: string): RoomMember | undefined {
    return this.members.get(memberId);
  }

  public removeMember(memberId: string): { success: boolean; closed?: boolean } {
    const member = this.members.get(memberId);
    if (!member) return { success: false };

    this.members.delete(memberId);
    this.addAuditLog('USER_LEFT', `${member.nickname} left the room permanently`, member.nickname);

    // If host left, transfer host to next available human member
    if (member.isHost) {
      const remainingHuman = Array.from(this.members.values()).find(m => !m.isBot);
      if (remainingHuman) {
        remainingHuman.isHost = true;
        this.hostId = remainingHuman.id;
        this.addAuditLog('HOST_TRANSFERRED', `${remainingHuman.nickname} is now the room host`, 'System');
      } else {
        // Room has no human participants remaining
        this.isClosed = true;
        this.clearAllTimers();
        return { success: true, closed: true };
      }
    }

    const hasHumans = Array.from(this.members.values()).some(m => !m.isBot);
    if (!hasHumans) {
      this.isClosed = true;
      this.clearAllTimers();
      return { success: true, closed: true };
    }

    this.broadcastState();
    return { success: true };
  }

  public join(nickname: string, sessionToken?: string): RoomMember {
    // Kicked check
    if (sessionToken && this.kickedMemberIds.has(sessionToken)) {
      throw new Error('You have been removed from this auction room by the host.');
    }

    // Reconnect check
    if (sessionToken && this.members.has(sessionToken)) {
      const existing = this.members.get(sessionToken)!;
      existing.connected = true;
      existing.lastSeen = Date.now();
      existing.nickname = nickname || existing.nickname;
      this.addAuditLog('USER_RECONNECTED', `${existing.nickname} reconnected`, existing.nickname);
      this.broadcastState();
      return existing;
    }

    const memberId = `mem_${Math.random().toString(36).substring(2, 9)}`;
    const newMember: RoomMember = {
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
    this.addAuditLog('USER_JOINED', `${newMember.nickname} joined the room`, newMember.nickname);
    this.broadcastState();
    return newMember;
  }

  public selectTeam(memberId: string, teamId: IPLTeamId): { success: boolean; message?: string } {
    const member = this.members.get(memberId);
    if (!member) return { success: false, message: 'Member not found' };

    // If auction is completed, lock selection
    if (this.status === 'COMPLETED') {
      return { success: false, message: 'Auction is completed.' };
    }

    // If auction is active or paused, existing members cannot switch teams,
    // but new/unassigned late joiners CAN select any remaining available franchise!
    if (this.status !== 'LOBBY') {
      if (member.teamId && member.teamId !== teamId) {
        return { success: false, message: 'Cannot switch teams while auction is in progress.' };
      }
    }

    // Check if team is already claimed by another participant (human or bot)
    for (const [otherId, other] of this.members.entries()) {
      if (otherId !== memberId && other.teamId === teamId) {
        return { 
          success: false, 
          message: `${IPL_FRANCHISES[teamId].name} (${teamId}) has already been claimed by ${other.nickname}. Please choose another available franchise.` 
        };
      }
    }

    // Check overall room capacity
    const allTeams: IPLTeamId[] = ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'PBKS', 'DC', 'GT', 'LSG'];
    const claimedTeams = new Set<IPLTeamId>();
    for (const [otherId, other] of this.members.entries()) {
      if (otherId !== memberId && other.teamId) {
        claimedTeams.add(other.teamId);
      }
    }
    if (claimedTeams.size >= allTeams.length && !claimedTeams.has(teamId)) {
      return { success: false, message: 'The auction room is full. All 10 franchises have already been claimed.' };
    }

    const oldTeam = member.teamId;
    member.teamId = teamId;
    this.addAuditLog(
      'TEAM_SELECTED',
      `${member.nickname} selected ${IPL_FRANCHISES[teamId].name} (${teamId})` + (oldTeam ? ` (released ${oldTeam})` : ''),
      member.nickname
    );

    this.addBidLog({
      type: 'EVENT',
      eventAction: 'TEAM_SELECTED',
      teamId,
      teamName: IPL_FRANCHISES[teamId].name,
      bidderName: member.nickname,
      eventMessage: `${member.nickname} joined as manager of ${IPL_FRANCHISES[teamId].name} (${teamId})`
    });

    this.broadcastState();
    return { success: true };
  }

  public toggleReady(memberId: string, isReady: boolean): { success: boolean } {
    const member = this.members.get(memberId);
    if (!member) return { success: false };
    if (!member.teamId && isReady) {
      return { success: false };
    }
    member.isReady = isReady;
    this.broadcastState();
    return { success: true };
  }

  public updateSettings(memberId: string, newSettings: Partial<RoomSettings>): { success: boolean; message?: string } {
    if (memberId !== this.hostId) {
      return { success: false, message: 'Only the host can modify room settings' };
    }

    if (this.status !== 'LOBBY') {
      if (newSettings.timerDuration !== undefined) {
        this.settings.timerDuration = Math.min(60, Math.max(5, Math.round(Number(newSettings.timerDuration))));
      }
      if (newSettings.minBidIncrement !== undefined) {
        this.settings.minBidIncrement = Math.max(100000, Math.min(20000000, Number(newSettings.minBidIncrement)));
      }
      this.addAuditLog('SETTINGS_UPDATED', `Host updated auction settings (Timer: ${this.settings.timerDuration}s, Min Increment: ₹${(this.settings.minBidIncrement / 100000).toFixed(0)}L)`, this.members.get(this.hostId)?.nickname || 'Host');
      this.broadcastState();
      return { success: true };
    }

    if (newSettings.timerDuration !== undefined) {
      this.settings.timerDuration = Math.min(60, Math.max(5, Math.round(Number(newSettings.timerDuration))));
    }
    if (newSettings.startingPurse !== undefined) {
      this.settings.startingPurse = Math.max(500000000, newSettings.startingPurse);
      const allTeams: IPLTeamId[] = ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'PBKS', 'DC', 'GT', 'LSG'];
      for (const t of allTeams) {
        this.teamPurse[t] = this.settings.startingPurse;
      }
    }
    if (newSettings.season !== undefined) this.settings.season = newSettings.season;
    if (newSettings.poolMode !== undefined) this.settings.poolMode = newSettings.poolMode;
    if (newSettings.minSquad !== undefined) this.settings.minSquad = newSettings.minSquad;
    if (newSettings.maxSquad !== undefined) this.settings.maxSquad = newSettings.maxSquad;
    if (newSettings.minBidIncrement !== undefined) this.settings.minBidIncrement = newSettings.minBidIncrement;
    if (newSettings.playMode !== undefined) this.settings.playMode = newSettings.playMode;
    if (newSettings.botCount !== undefined) this.settings.botCount = newSettings.botCount;
    if (newSettings.allowDuplicateTeams !== undefined) this.settings.allowDuplicateTeams = newSettings.allowDuplicateTeams;

    this.addAuditLog('SETTINGS_UPDATED', `Host updated room settings`, this.members.get(this.hostId)?.nickname || 'Host');
    this.broadcastState();
    return { success: true };
  }

  public addBot(teamId: IPLTeamId, strategy: BotStrategy = 'balanced'): { success: boolean; message?: string } {
    if (this.status !== 'LOBBY') return { success: false, message: 'Cannot add bots after auction start' };
    
    for (const member of this.members.values()) {
      if (member.teamId === teamId) {
        return { success: false, message: `${IPL_FRANCHISES[teamId].name} is already occupied` };
      }
    }

    const botId = `bot_${teamId.toLowerCase()}`;
    const botMember: RoomMember = {
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
    this.addAuditLog('BOT_ADDED', `Added AI Bot (${strategy}) for ${teamId}`, 'Host');
    this.broadcastState();
    return { success: true };
  }

  public removeBot(teamId: IPLTeamId): { success: boolean } {
    if (this.status !== 'LOBBY') return { success: false };
    for (const [id, m] of this.members.entries()) {
      if (m.isBot && m.teamId === teamId) {
        this.members.delete(id);
        this.addAuditLog('BOT_REMOVED', `Removed AI Bot for ${teamId}`, 'Host');
        this.broadcastState();
        return { success: true };
      }
    }
    return { success: false };
  }

  public startAuction(memberId: string): { success: boolean; message?: string } {
    if (memberId !== this.hostId) {
      return { success: false, message: 'Only the host can start the auction' };
    }
    if (this.status !== 'LOBBY') {
      return { success: false, message: 'Auction is already started' };
    }

    for (const m of this.members.values()) {
      if (!m.isBot && !m.teamId) {
        return { success: false, message: `Participant "${m.nickname}" has not selected a franchise.` };
      }
    }

    if (this.settings.playMode === 'friends_bots') {
      const allTeams: IPLTeamId[] = ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'PBKS', 'DC', 'GT', 'LSG'];
      const strategies: BotStrategy[] = ['balanced', 'aggressive', 'budget', 'specialist'];
      const availableTeams = allTeams.filter(t => ![...this.members.values()].some(m => m.teamId === t));
      
      const botsToCreate = Math.min(this.settings.botCount || availableTeams.length, availableTeams.length);
      for (let i = 0; i < botsToCreate; i++) {
        const team = availableTeams[i];
        const strategy = strategies[i % strategies.length];
        this.addBot(team, strategy);
      }
    }

    this.lots = buildAuctionLots(this.settings.season, this.settings.poolMode);
    if (this.lots.length === 0) {
      return { success: false, message: 'No eligible auction lots found for this season/pool mode' };
    }

    this.status = 'AUCTION';
    this.currentLotIndex = 0;
    this.addAuditLog('AUCTION_STARTED', `Auction started with ${this.lots.length} lots.`, 'Host');
    this.addBidLog({
      type: 'EVENT',
      eventAction: 'AUCTION_STARTED',
      eventMessage: `Auction officially started with ${this.lots.length} lots.`
    });

    this.startCurrentLot();
    return { success: true };
  }

  /**
   * SECTION 16: Random Player Selection by Category and Price Bracket
   */
  public drawRandomPlayer(
    memberId: string, 
    category: PlayerCategory, 
    basePriceInr: number
  ): { success: boolean; message?: string; lot?: AuctionLot } {
    if (memberId !== this.hostId) {
      return { success: false, message: 'Only the host can draw a random player lot' };
    }
    if (this.status !== 'AUCTION') {
      return { success: false, message: 'Auction must be active to draw lots' };
    }

    // Filter available pending lots matching category and price bracket
    // Criteria:
    // 1. Belongs to selected category
    // 2. Base price matches selected bracket
    // 3. Status is PENDING (not already sold, unsold, or skipped)
    // 4. Not currently being auctioned
    const eligibleIndices: number[] = [];
    for (let idx = 0; idx < this.lots.length; idx++) {
      if (idx === this.currentLotIndex && this.lots[idx].status === 'IN_PROGRESS') {
        continue; // Currently active lot
      }
      const l = this.lots[idx];
      const matchesCategory =
        l.player.category === category ||
        (category === 'Batsmen' && l.player.primary_role === 'BATTER') ||
        (category === 'Bowlers' && l.player.primary_role === 'BOWLER') ||
        (category === 'All-rounders' && l.player.primary_role === 'ALL_ROUNDER') ||
        (category === 'Wicket-keepers' && l.player.is_wicketkeeper);

      if (
        l.status === 'PENDING' &&
        matchesCategory &&
        l.player.base_price_inr === basePriceInr &&
        l.player.auction_status === 'AVAILABLE'
      ) {
        eligibleIndices.push(idx);
      }
    }

    if (eligibleIndices.length === 0) {
      return { 
        success: false, 
        message: `No available unauctioned players found in ${category} at ₹${(basePriceInr / 10000000).toFixed(2)} Cr.` 
      };
    }

    // Pick random eligible lot index
    const randomIdx = eligibleIndices[Math.floor(Math.random() * eligibleIndices.length)];

    // Finalize or pause current lot if active without bids, or advance directly
    const currentActive = this.lots[this.currentLotIndex];
    if (currentActive && currentActive.status === 'IN_PROGRESS' && currentActive.currentBid === 0) {
      currentActive.status = 'PENDING'; // Return to pending
    }

    this.clearAllTimers();
    this.currentLotIndex = randomIdx;
    this.startCurrentLot();

    this.addAuditLog(
      'RANDOM_LOT_DRAWN',
      `Host randomly drew ${this.lots[randomIdx].player.name} from ${category} (${this.lots[randomIdx].player.base_price_display})`,
      'Host'
    );

    return { success: true, lot: this.lots[randomIdx] };
  }

  private startCurrentLot() {
    this.clearAllTimers();

    if (this.currentLotIndex >= this.lots.length) {
      this.deadlineTimestamp = null;
      this.announcementPhase = 'NONE';
      this.announcementLotNumber = null;
      this.currentResultId = null;
      this.broadcastState();
      return;
    }

    const lot = this.lots[this.currentLotIndex];
    lot.status = 'IN_PROGRESS';
    lot.currentBid = 0;
    lot.currentBidder = null;
    lot.currentBidderName = null;
    lot.bids = [];

    // Authoritative deadline
    this.deadlineTimestamp = Date.now() + (this.settings.timerDuration * 1000);
    this.announcementPhase = 'NONE';
    this.announcementLotNumber = null;
    this.currentResultId = null;

    this.addAuditLog(
      'LOT_STARTED',
      `Lot #${lot.lotNumber}: ${lot.player.name} (${lot.player.category}, Base: ${lot.player.base_price_display})`,
      'System'
    );
    this.addBidLog({
      type: 'EVENT',
      eventAction: 'PLAYER_NOMINATED',
      playerName: lot.player.name,
      lotNumber: lot.lotNumber,
      amount: lot.player.base_price_inr,
      eventMessage: `Lot #${lot.lotNumber}: ${lot.player.name} (${lot.player.category}) nominated at base price ${lot.player.base_price_display}`
    });

    this.startCountdownLoop();
    this.triggerBotBidding();
    this.broadcastState({ type: 'NEW_LOT', lot, deadlineTimestamp: this.deadlineTimestamp });
  }

  private startCountdownLoop() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      if (this.status !== 'AUCTION') return;
      if (!this.deadlineTimestamp) return;

      const remainingMs = this.deadlineTimestamp - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

      if (remainingMs <= 0) {
        this.clearAllTimers();
        this.finalizeCurrentLot();
      } else {
        // High-performance: emit targeted tick without reserializing the entire 350-player room state
        this.broadcastCallback(null as any, {
          type: 'TIMER_TICK',
          remainingSeconds: remainingSec,
          deadlineTimestamp: this.deadlineTimestamp
        });
      }
    }, 500);
  }

  public placeBid(
    memberId: string, 
    customAmount?: number
  ): { success: boolean; message?: string; bid?: BidRecord } {
    if (this.status !== 'AUCTION') {
      return { success: false, message: 'Auction is not currently active' };
    }

    if (this.activeTrade || this.pausedByTrade) {
      return { success: false, message: 'Auction is currently paused for an active trade review.' };
    }

    const member = this.members.get(memberId);
    if (!member) return { success: false, message: 'Member not found' };
    if (!member.teamId) return { success: false, message: 'You have not selected a franchise' };

    const teamId = member.teamId;
    const lot = this.lots[this.currentLotIndex];
    if (!lot || lot.status !== 'IN_PROGRESS') {
      return { success: false, message: 'Current lot is not active for bidding' };
    }

    if (this.isProcessingBid) {
      return { success: false, message: 'Bid collision detected, please retry' };
    }
    this.isProcessingBid = true;

    try {
      // 1. Cannot bid against self
      if (lot.currentBidder === teamId) {
        const msg = 'Your franchise already holds the highest bid';
        this.addBidLog({
          type: 'BID',
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

      // 2. Minimum bid calculation
      const minRequired = lot.currentBid === 0
        ? lot.player.base_price_inr
        : lot.currentBid + this.settings.minBidIncrement;

      const bidAmount = customAmount !== undefined ? customAmount : minRequired;

      if (bidAmount < minRequired) {
        const msg = `Minimum legal bid is ₹${(minRequired / 10000000).toFixed(2)} Cr`;
        this.addBidLog({
          type: 'BID',
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

      // 3. Team squad limit check (Max 25)
      const currentSquad = this.teamSquads[teamId] || [];
      if (currentSquad.length >= this.settings.maxSquad) {
        const msg = `Maximum squad limit of ${this.settings.maxSquad} reached`;
        this.addBidLog({
          type: 'BID',
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

      // 4. CRITICAL: Strict Overseas Player Limit Check (Max 8)
      if (lot.player.is_overseas) {
        const overseasCount = currentSquad.filter(p => p.is_overseas).length;
        if (overseasCount >= 8) {
          const msg = 'Overseas limit reached. Your team already has 8 overseas players.';
          this.addBidLog({
            type: 'BID',
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

      // 5. Mathematical squad reserve feasibility check:
      const purse = this.teamPurse[teamId] || 0;
      if (bidAmount > purse) {
        const msg = 'Insufficient purse balance for this bid';
        this.addBidLog({
          type: 'BID',
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
      const minReserveRequired = slotsRemainingNeeded * 3000000; // ₹30 Lakh minimum player price
      if ((purse - bidAmount) < minReserveRequired) {
        const msg = `Bid rejected: You must keep at least ₹${(minReserveRequired / 10000000).toFixed(2)} Cr in reserve to complete the minimum 18-player squad.`;
        this.addBidLog({
          type: 'BID',
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

      // ACCEPT BID
      const bidRecord: BidRecord = {
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
        type: 'BID',
        playerName: lot.player.name,
        lotNumber: lot.lotNumber,
        teamId,
        teamName: IPL_FRANCHISES[teamId].name,
        bidderName: member.nickname,
        amount: bidAmount,
        accepted: true,
        isHighest: true,
        eventMessage: `Bid of ₹${(bidAmount / 10000000).toFixed(2)} Cr placed by ${member.nickname} (${teamId})`
      });

      // Reset timer to configured duration
      this.deadlineTimestamp = Date.now() + (this.settings.timerDuration * 1000);

      this.addAuditLog(
        'BID_PLACED',
        `₹${(bidAmount / 10000000).toFixed(2)} Cr by ${member.nickname} (${teamId})`,
        member.nickname
      );

      this.triggerBotBidding();

      const nextMin = bidAmount + this.settings.minBidIncrement;
      this.broadcastCallback(this.getState(), {
        type: 'BID_PLACED',
        bid: bidRecord,
        nextMinBid: nextMin,
        deadlineTimestamp: this.deadlineTimestamp
      });

      return { success: true, bid: bidRecord };
    } finally {
      this.isProcessingBid = false;
    }
  }

  private triggerBotBidding() {
    for (const timeout of this.botTimeouts) clearTimeout(timeout);
    this.botTimeouts = [];

    if (this.status !== 'AUCTION') return;
    const lot = this.lots[this.currentLotIndex];
    if (!lot || lot.status !== 'IN_PROGRESS') return;

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
          if (this.status === 'AUCTION' && lot.status === 'IN_PROGRESS') {
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
  private finalizeCurrentLot() {
    const lot = this.lots[this.currentLotIndex];
    if (!lot) return;

    if (lot.currentBid > 0 && lot.currentBidder) {
      const winningTeam = lot.currentBidder;
      const winningPrice = lot.currentBid;
      const currentSquad = this.teamSquads[winningTeam] || [];
      const overseasCount = currentSquad.filter(p => p.is_overseas).length;

      // Final server-side validation checks
      if (lot.player.is_overseas && overseasCount >= 8) {
        // Violates overseas limit! Mark lot unsold and cancel transaction
        lot.status = 'UNSOLD';
        this.addAuditLog('PURCHASE_FAILED', `Purchase rejected: ${winningTeam} exceeded 8 overseas players limit.`, 'System');
      } else if (currentSquad.length >= this.settings.maxSquad) {
        lot.status = 'UNSOLD';
        this.addAuditLog('PURCHASE_FAILED', `Purchase rejected: ${winningTeam} reached maximum 25 squad limit.`, 'System');
      } else if (this.teamPurse[winningTeam] < winningPrice) {
        lot.status = 'UNSOLD';
        this.addAuditLog('PURCHASE_FAILED', `Purchase rejected: ${winningTeam} has insufficient purse.`, 'System');
      } else {
        // EXECUTE TRANSACTION ATOMICALLY:
        lot.status = 'SOLD';
        lot.soldPrice = winningPrice;
        lot.winningTeam = winningTeam;
        lot.winningTeamName = IPL_FRANCHISES[winningTeam].name;
        lot.winningBidderName = lot.currentBidderName || undefined;

        const resultId = `${this.roomCode}_round${lot.lotNumber}_SOLD_${winningPrice}_${Date.now()}`;
        lot.resultId = resultId;
        this.currentResultId = resultId;
        this.announcementPhase = 'ANNOUNCING';
        this.announcementLotNumber = lot.lotNumber;

        // 1. Mark player metadata
        lot.player.auction_status = 'SOLD';
        lot.player.sold_price_inr = winningPrice;
        lot.player.team_id = winningTeam;

        // 2. Deduct purse
        this.teamPurse[winningTeam] -= winningPrice;

        // 3. Add cloned player to squad
        const purchasedPlayer: Player = {
          ...lot.player,
          auction_status: 'SOLD',
          sold_price_inr: winningPrice,
          team_id: winningTeam
        };
        this.teamSquads[winningTeam].push(purchasedPlayer);

        this.addAuditLog(
          'PLAYER_SOLD',
          `SOLD: ${lot.player.name} to ${IPL_FRANCHISES[winningTeam].name} (${winningTeam}) for ₹${(winningPrice / 10000000).toFixed(2)} Cr`,
          'System'
        );

        this.addBidLog({
          type: 'EVENT',
          eventAction: 'PLAYER_SOLD',
          playerName: lot.player.name,
          lotNumber: lot.lotNumber,
          teamId: winningTeam,
          teamName: IPL_FRANCHISES[winningTeam].name,
          amount: winningPrice,
          eventMessage: `SOLD: ${lot.player.name} to ${IPL_FRANCHISES[winningTeam].name} (${winningTeam}) for ₹${(winningPrice / 10000000).toFixed(2)} Cr`
        });
      }
    } else {
      // UNSOLD
      lot.status = 'UNSOLD';
      lot.player.auction_status = 'UNSOLD';
      const resultId = `${this.roomCode}_round${lot.lotNumber}_UNSOLD_${Date.now()}`;
      lot.resultId = resultId;
      this.currentResultId = resultId;
      this.announcementPhase = 'ANNOUNCING';
      this.announcementLotNumber = lot.lotNumber;
      this.addAuditLog('PLAYER_UNSOLD', `UNSOLD: ${lot.player.name}`, 'System');
      this.addBidLog({
        type: 'EVENT',
        eventAction: 'PLAYER_UNSOLD',
        playerName: lot.player.name,
        lotNumber: lot.lotNumber,
        eventMessage: `UNSOLD: ${lot.player.name}`
      });
    }

    this.history.unshift({ ...lot });

    // CRITICAL FIX: Broadcast full teamSquads and teamStats with LOT_FINALIZED!
    const summary = this.getTeamSummary();
    this.broadcastState({
      type: 'LOT_FINALIZED',
      lot,
      teamPurse: { ...this.teamPurse },
      teamSquads: { ...this.teamSquads },
      teamStats: summary
    });

    // Sequence coordination: No arbitrary fixed timeout interrupts voice announcement.
    // The client awaits speech synthesis onend and animation completion, then emits ADVANCE_LOT / ANNOUNCEMENT_COMPLETE.
    // Generous fallback ceiling (45s) ensures the auction never gets stuck if every client disconnects.
    this.clearAllTimers();
    this.lotTransitionTimeout = setTimeout(() => {
      if (this.status === 'AUCTION') {
        const current = this.lots[this.currentLotIndex];
        if (current && (current.status === 'SOLD' || current.status === 'UNSOLD')) {
          this.announcementPhase = 'NONE';
          this.announcementLotNumber = null;
          this.currentResultId = null;
          this.currentLotIndex++;
          this.startCurrentLot();
        }
      }
    }, 45000);
  }

  /**
   * Authoritative Next-Lot Advance after speech and visual sequences complete
   */
  public advanceLot(lotIndex?: number, resultId?: string): { success: boolean; message?: string } {
    if (this.status !== 'AUCTION') return { success: false, message: 'Auction is not active' };
    const lot = this.lots[this.currentLotIndex];
    if (!lot || (lot.status !== 'SOLD' && lot.status !== 'UNSOLD' && lot.status !== 'SKIPPED')) {
      return { success: false, message: 'Current lot is not in completed state' };
    }

    // Validate resultId if supplied to guarantee single transition
    if (resultId && this.currentResultId && resultId !== this.currentResultId) {
      return { success: false, message: 'Result ID mismatch' };
    }

    // Idempotent safeguard: prevent advancing twice if multiple clients report completion
    if (lotIndex !== undefined && lotIndex !== this.currentLotIndex) {
      return { success: false, message: 'Lot already advanced' };
    }

    if (this.lotTransitionTimeout) {
      clearTimeout(this.lotTransitionTimeout);
      this.lotTransitionTimeout = null;
    }

    this.announcementPhase = 'NONE';
    this.announcementLotNumber = null;
    this.currentResultId = null;
    this.clearAllTimers();
    this.currentLotIndex++;
    this.startCurrentLot();
    return { success: true };
  }

  public skipCurrentLot(memberId: string): { success: boolean; message?: string } {
    if (memberId !== this.hostId) {
      return { success: false, message: 'Only the host can skip a player' };
    }
    if (this.status !== 'AUCTION') {
      return { success: false, message: 'Auction is not active' };
    }

    const lot = this.lots[this.currentLotIndex];
    if (!lot || lot.status !== 'IN_PROGRESS') {
      return { success: false, message: 'Current lot is not active' };
    }

    this.clearAllTimers();
    lot.status = 'SKIPPED';
    lot.player.auction_status = 'SKIPPED';
    this.addAuditLog('PLAYER_SKIPPED', `Host skipped lot #${lot.lotNumber}: ${lot.player.name}`, 'Host');
    this.addBidLog({
      type: 'EVENT',
      eventAction: 'PLAYER_SKIPPED',
      playerName: lot.player.name,
      lotNumber: lot.lotNumber,
      eventMessage: `SKIPPED: ${lot.player.name}`
    });
    this.history.unshift({ ...lot });

    const summary = this.getTeamSummary();
    this.broadcastState({
      type: 'LOT_FINALIZED',
      lot,
      teamPurse: { ...this.teamPurse },
      teamSquads: { ...this.teamSquads },
      teamStats: summary
    });

    setTimeout(() => {
      if (this.status === 'AUCTION') {
        this.currentLotIndex++;
        this.startCurrentLot();
      }
    }, 1500);

    return { success: true };
  }

  public pauseAuction(memberId: string): { success: boolean; message?: string } {
    if (memberId !== this.hostId) {
      return { success: false, message: 'Only the host can pause the auction' };
    }
    if (this.status !== 'AUCTION') {
      return { success: false, message: 'Auction is not active' };
    }

    if (this.deadlineTimestamp) {
      this.pauseRemainingMs = Math.max(0, this.deadlineTimestamp - Date.now());
    }
    this.status = 'PAUSED';
    this.clearAllTimers();
    this.addAuditLog('AUCTION_PAUSED', 'Auction was paused by the host', 'Host');
    this.broadcastState({ type: 'AUCTION_PAUSED' });
    return { success: true };
  }

  public resumeAuction(memberId: string): { success: boolean; message?: string } {
    if (memberId !== this.hostId) {
      return { success: false, message: 'Only the host can resume the auction' };
    }
    if (this.status !== 'PAUSED') {
      return { success: false, message: 'Auction is not paused' };
    }

    this.status = 'AUCTION';
    const remainingMs = this.pauseRemainingMs || (this.settings.timerDuration * 1000);
    this.deadlineTimestamp = Date.now() + remainingMs;
    this.pauseRemainingMs = null;

    this.addAuditLog('AUCTION_RESUMED', 'Auction was resumed by the host', 'Host');
    this.startCountdownLoop();
    this.triggerBotBidding();
    this.broadcastState({ type: 'AUCTION_RESUMED', deadlineTimestamp: this.deadlineTimestamp });
    return { success: true };
  }

  public restartAuction(memberId: string): { success: boolean; message?: string } {
    if (memberId !== this.hostId) {
      return { success: false, message: 'Only the host can restart the auction' };
    }

    this.clearAllTimers();
    if (this.postAuctionTradeTimeout) {
      clearTimeout(this.postAuctionTradeTimeout);
      this.postAuctionTradeTimeout = null;
    }
    this.postAuctionTradeStatus = 'NOT_STARTED';
    this.postAuctionTradeDeadline = null;

    const allTeams: IPLTeamId[] = ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'PBKS', 'DC', 'GT', 'LSG'];
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

    this.status = 'LOBBY';
    this.currentLotIndex = 0;
    this.history = [];
    this.deadlineTimestamp = null;
    this.addAuditLog('AUCTION_RESTARTED', 'Auction was reset to lobby by host', 'Host');
    this.broadcastState();
    return { success: true };
  }

  public sendChatMessage(memberId: string, text: string): { success: boolean; message?: string; chat?: ChatMessage } {
    const member = this.members.get(memberId);
    if (!member) {
      return { success: false, message: 'Member not found in room' };
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return { success: false, message: 'Message cannot be empty' };
    }
    if (trimmed.length > 300) {
      return { success: false, message: 'Message exceeds 300 characters limit' };
    }

    const chatMsg: ChatMessage = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: memberId,
      senderName: member.nickname,
      teamId: member.teamId || undefined,
      text: trimmed,
      timestamp: Date.now()
    };

    this.chatMessages.push(chatMsg);
    if (this.chatMessages.length > 100) {
      this.chatMessages.shift();
    }

    // Broadcast chat message immediately to room
    this.broadcastCallback(this.getState(), {
      type: 'CHAT_MESSAGE',
      message: chatMsg
    });

    return { success: true, chat: chatMsg };
  }

  public finishAuction(memberId?: string): { success: boolean; message?: string } {
    if (!memberId || memberId !== this.hostId) {
      return { success: false, message: 'Only the top host can end the auction' };
    }
    this.clearAllTimers();
    this.status = 'COMPLETED';
    this.deadlineTimestamp = null;
    this.announcementPhase = 'NONE';
    this.announcementLotNumber = null;
    this.currentResultId = null;

    // Start authoritative 10-minute post-auction trade window
    this.postAuctionTradeStatus = 'ACTIVE';
    this.postAuctionTradeDeadline = Date.now() + 600000; // Exactly 10 minutes (600,000 ms)
    if (this.postAuctionTradeTimeout) {
      clearTimeout(this.postAuctionTradeTimeout);
    }
    this.postAuctionTradeTimeout = setTimeout(() => {
      this.closePostAuctionTradeWindow();
    }, 600000);

    this.addAuditLog('AUCTION_COMPLETED', 'The auction has concluded! 10-Minute Post-Auction Trade Window is now OPEN.', 'Host');
    this.broadcastState({ 
      type: 'AUCTION_COMPLETED', 
      summary: this.getTeamSummary(),
      postAuctionTradeDeadline: this.postAuctionTradeDeadline
    });
    return { success: true };
  }

  public closePostAuctionTradeWindow(memberId?: string): { success: boolean; message?: string } {
    if (memberId && memberId !== this.hostId) {
      return { success: false, message: 'Only the top host can close the trade window early.' };
    }
    if (this.postAuctionTradeTimeout) {
      clearTimeout(this.postAuctionTradeTimeout);
      this.postAuctionTradeTimeout = null;
    }
    this.postAuctionTradeStatus = 'CLOSED';
    this.postAuctionTradeDeadline = null;

    // Expire any active trade that was pending when the 10-minute window closed
    if (this.activeTrade && this.activeTrade.status === 'PENDING') {
      this.expireTradeRequest(this.activeTrade.id);
    }

    this.addAuditLog('POST_AUCTION_TRADE_CLOSED', 'The 10-Minute Post-Auction Trade Window has officially CLOSED. Final squads and Playing XIs locked.', 'System');
    this.broadcastState({ type: 'POST_AUCTION_TRADE_WINDOW_CLOSED' });
    return { success: true };
  }

  /**
   * Bring all unsold players back into the auction queue
   */
  /**
   * Safe atomic lot insertion helper that preserves the currently active bidding lot
   */
  private insertLotsIntoQueue(newLots: AuctionLot[], wasAtEnd: boolean) {
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
      // Insert right after current active lot so they are auctioned NEXT!
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
  public bringAllUnsoldBack(memberId: string): { success: boolean; message?: string; count?: number; recalledCount?: number } {
    if (memberId !== this.hostId) {
      return { success: false, message: 'Only the top host can recall unsold players' };
    }

    const soldPlayerIds = new Set<string>();
    for (const squad of Object.values(this.teamSquads)) {
      for (const p of squad) {
        soldPlayerIds.add(p.id);
      }
    }

    const queuedPlayerIds = new Set<string>();
    for (let i = this.currentLotIndex; i < this.lots.length; i++) {
      const l = this.lots[i];
      if (l && (l.status === 'PENDING' || l.status === 'IN_PROGRESS')) {
        queuedPlayerIds.add(l.player.id);
      }
    }

    const eligibleUnsoldPlayers: Player[] = [];
    const seenIds = new Set<string>();

    const checkAndAdd = (p: Player) => {
      if (!soldPlayerIds.has(p.id) && !queuedPlayerIds.has(p.id) && !seenIds.has(p.id)) {
        seenIds.add(p.id);
        eligibleUnsoldPlayers.push({
          ...p,
          auction_status: 'AVAILABLE'
        });
      }
    };

    for (const lot of this.history) {
      if (lot.status === 'UNSOLD' || lot.status === 'SKIPPED') checkAndAdd(lot.player);
    }
    for (const lot of this.lots) {
      if (lot.status === 'UNSOLD' || lot.status === 'SKIPPED') checkAndAdd(lot.player);
    }

    if (eligibleUnsoldPlayers.length === 0) {
      return { success: false, message: 'No unsold or skipped players found to bring back.' };
    }

    const currentLotsCount = this.lots.length;
    const newLots: AuctionLot[] = eligibleUnsoldPlayers.map((player, idx) => ({
      lotNumber: currentLotsCount + idx + 1,
      totalLots: currentLotsCount + eligibleUnsoldPlayers.length,
      player,
      status: 'PENDING',
      currentBid: 0,
      currentBidder: null,
      currentBidderName: null,
      bids: []
    }));

    const wasAtEnd = this.currentLotIndex >= this.lots.length;
    this.insertLotsIntoQueue(newLots, wasAtEnd);

    this.addAuditLog(
      'UNSOLD_PLAYERS_RECALLED',
      `Host brought back all ${newLots.length} unsold & skipped player(s) into the auction pool.`,
      'Host'
    );
    this.addBidLog({
      type: 'EVENT',
      eventAction: 'UNSOLD_PLAYERS_RECALLED',
      eventMessage: `Host brought back all ${newLots.length} unsold & skipped player(s) into the active auction pool.`
    });

    return { success: true, count: newLots.length, recalledCount: newLots.length };
  }

  /**
   * Random draw from unsold players pool
   */
  public randomDrawUnsold(
    memberId: string, 
    count: number, 
    playerIds?: string[]
  ): { success: boolean; message?: string; count?: number; players?: Player[]; drawnLots?: AuctionLot[] } {
    if (memberId !== this.hostId) {
      return { success: false, message: 'Only the top host can draw unsold players' };
    }

    const soldPlayerIds = new Set<string>();
    for (const squad of Object.values(this.teamSquads)) {
      for (const p of squad) {
        soldPlayerIds.add(p.id);
      }
    }

    const queuedPlayerIds = new Set<string>();
    for (let i = this.currentLotIndex; i < this.lots.length; i++) {
      const l = this.lots[i];
      if (l && (l.status === 'PENDING' || l.status === 'IN_PROGRESS')) {
        queuedPlayerIds.add(l.player.id);
      }
    }

    const eligibleUnsoldPlayers: Player[] = [];
    const seenIds = new Set<string>();

    const checkAndAdd = (p: Player) => {
      if (!soldPlayerIds.has(p.id) && !queuedPlayerIds.has(p.id) && !seenIds.has(p.id)) {
        seenIds.add(p.id);
        eligibleUnsoldPlayers.push({
          ...p,
          auction_status: 'AVAILABLE'
        });
      }
    };

    for (const lot of this.history) {
      if (lot.status === 'UNSOLD' || lot.status === 'SKIPPED') checkAndAdd(lot.player);
    }
    for (const lot of this.lots) {
      if (lot.status === 'UNSOLD' || lot.status === 'SKIPPED') checkAndAdd(lot.player);
    }

    if (eligibleUnsoldPlayers.length === 0) {
      return { success: false, message: 'No unsold or skipped players available for random draw.' };
    }

    let selectedPlayers: Player[] = [];
    if (playerIds && playerIds.length > 0) {
      const idSet = new Set(playerIds);
      selectedPlayers = eligibleUnsoldPlayers.filter(p => idSet.has(p.id));
    } else {
      const numToPick = Math.min(Math.max(1, count), eligibleUnsoldPlayers.length);
      const shuffled = shuffleArray([...eligibleUnsoldPlayers]);
      selectedPlayers = shuffled.slice(0, numToPick);
    }

    if (selectedPlayers.length === 0) {
      return { success: false, message: 'No valid unsold or skipped players selected.' };
    }

    const currentLotsCount = this.lots.length;
    const newLots: AuctionLot[] = selectedPlayers.map((player, idx) => ({
      lotNumber: currentLotsCount + idx + 1,
      totalLots: currentLotsCount + selectedPlayers.length,
      player,
      status: 'PENDING',
      currentBid: 0,
      currentBidder: null,
      currentBidderName: null,
      bids: []
    }));

    const wasAtEnd = this.currentLotIndex >= this.lots.length;
    this.insertLotsIntoQueue(newLots, wasAtEnd);

    this.addAuditLog(
      'UNSOLD_RANDOM_DRAW',
      `Host randomly recalled ${selectedPlayers.length} unsold & skipped player(s): ${selectedPlayers.map(p => p.name).join(', ')}`,
      'Host'
    );
    this.addBidLog({
      type: 'EVENT',
      eventAction: 'UNSOLD_RANDOM_DRAW',
      eventMessage: `Host randomly recalled ${selectedPlayers.length} unsold & skipped player(s) into the auction pool.`
    });

    return { success: true, count: selectedPlayers.length, players: selectedPlayers, drawnLots: newLots };
  }

  /**
   * Re-auction a particular individual UNSOLD player (Section 1C)
   */
  public reAuctionParticularPlayer(
    memberId: string, 
    playerId: string
  ): { success: boolean; message?: string; lot?: AuctionLot } {
    if (memberId !== this.hostId) {
      return { success: false, message: 'Only the top host can recall players' };
    }
    if (this.status !== 'AUCTION' && this.status !== 'PAUSED') {
      return { success: false, message: 'Auction must be active or paused to recall players' };
    }

    // Check if player is currently active in the auction ring
    const currentActiveLot = this.lots[this.currentLotIndex];
    if (currentActiveLot && currentActiveLot.player.id === playerId && currentActiveLot.status === 'IN_PROGRESS') {
      return { success: false, message: 'This player is currently being auctioned in the arena.' };
    }

    // Check if already queued in upcoming lots
    const alreadyQueued = this.lots.slice(this.currentLotIndex).some(
      l => l.player.id === playerId && (l.status === 'PENDING' || l.status === 'IN_PROGRESS')
    );
    if (alreadyQueued) {
      return { success: false, message: 'This player is already in the auction queue.' };
    }

    // Check if sold to any squad
    const isSold = Object.values(this.teamSquads).some(squad => squad.some(p => p.id === playerId));
    if (isSold) {
      return { success: false, message: 'This player is already sold. Use Re-Auction in Sold Players to reverse their sale.' };
    }

    // Find the player from unsold or skipped records (history or lots)
    let targetPlayer: Player | null = null;
    for (const lot of this.history) {
      if (lot.player.id === playerId && (lot.status === 'UNSOLD' || lot.status === 'SKIPPED')) {
        targetPlayer = lot.player;
        break;
      }
    }
    if (!targetPlayer) {
      for (const lot of this.lots) {
        if (lot.player.id === playerId && (lot.status === 'UNSOLD' || lot.status === 'SKIPPED')) {
          targetPlayer = lot.player;
          break;
        }
      }
    }

    if (!targetPlayer) {
      return { success: false, message: 'Player record not found among unsold or skipped players.' };
    }

    const freshPlayer: Player = {
      ...targetPlayer,
      auction_status: 'AVAILABLE'
    };

    const newLot: AuctionLot = {
      lotNumber: this.lots.length + 1,
      totalLots: this.lots.length + 1,
      player: freshPlayer,
      status: 'PENDING',
      currentBid: 0,
      currentBidder: null,
      currentBidderName: null,
      bids: []
    };

    const wasAtEnd = this.currentLotIndex >= this.lots.length;
    this.insertLotsIntoQueue([newLot], wasAtEnd);

    this.addAuditLog(
      'UNSOLD_PLAYER_RECALLED',
      `Host returned player ${freshPlayer.name} (${freshPlayer.category}, Base: ${freshPlayer.base_price_display}) to the auction queue.`,
      'Host'
    );
    this.addBidLog({
      type: 'EVENT',
      eventAction: 'UNSOLD_PLAYER_RECALLED',
      playerName: freshPlayer.name,
      amount: freshPlayer.base_price_inr,
      eventMessage: `Host returned player ${freshPlayer.name} to the auction queue.`
    });

    return { success: true, message: `${freshPlayer.name} has been added to the auction queue!`, lot: newLot };
  }

  /**
   * Re-auction a SOLD player with atomic refund and squad removal (Section 2 & 3)
   */
  public reAuctionSoldPlayer(
    memberId: string, 
    playerId: string
  ): { success: boolean; message?: string; refundedTeam?: IPLTeamId; refundAmount?: number; lot?: AuctionLot } {
    if (memberId !== this.hostId) {
      return { success: false, message: 'Only the top host can re-auction sold players' };
    }
    if (this.status !== 'AUCTION' && this.status !== 'PAUSED') {
      return { success: false, message: 'Auction must be active or paused to re-auction sold players' };
    }

    if (this.isProcessingBid) {
      return { success: false, message: 'A bid transaction is currently being processed. Please retry.' };
    }

    // Check if player is currently active in the auction ring
    const currentActiveLot = this.lots[this.currentLotIndex];
    if (currentActiveLot && currentActiveLot.player.id === playerId && currentActiveLot.status === 'IN_PROGRESS') {
      return { success: false, message: 'This player is currently being auctioned in the arena.' };
    }

    // Check if already queued in upcoming lots
    const alreadyQueued = this.lots.slice(this.currentLotIndex).some(
      l => l.player.id === playerId && (l.status === 'PENDING' || l.status === 'IN_PROGRESS')
    );
    if (alreadyQueued) {
      return { success: false, message: 'This player is already in the upcoming auction queue.' };
    }

    // Find original buying team and player from squad
    let originalTeamId: IPLTeamId | null = null;
    let originalPlayer: Player | null = null;

    for (const [tId, squad] of Object.entries(this.teamSquads)) {
      const p = squad.find(player => player.id === playerId);
      if (p) {
        originalTeamId = tId as IPLTeamId;
        originalPlayer = p;
        break;
      }
    }

    if (!originalTeamId || !originalPlayer) {
      return { success: false, message: 'Player is not currently in any team squad.' };
    }

    // Determine exact previous sold price to refund
    let refundAmount = originalPlayer.sold_price_inr;
    if (!refundAmount || refundAmount <= 0) {
      const hist = this.history.find(h => h.player.id === playerId && h.winningTeam === originalTeamId && h.status === 'SOLD');
      refundAmount = hist?.soldPrice || originalPlayer.base_price_inr;
    }

    // 1. Refund exact purchase price to buying team's purse (never exceeding starting purse limit)
    const prevPurse = this.teamPurse[originalTeamId] || 0;
    this.teamPurse[originalTeamId] = Math.min(
      this.settings.startingPurse,
      prevPurse + refundAmount
    );

    // 2. Remove player from team squad
    this.teamSquads[originalTeamId] = this.teamSquads[originalTeamId].filter(p => p.id !== playerId);

    // 3. Mark previous historical sale record as REVERSED (preserve historical record, never silently delete)
    for (const histLot of this.history) {
      if (histLot.player.id === playerId && histLot.winningTeam === originalTeamId && histLot.status === 'SOLD') {
        histLot.status = 'REVERSED';
        histLot.reversed = true;
        histLot.reversedAt = Date.now();
        histLot.originalSoldPrice = refundAmount;
        histLot.originalWinningTeam = originalTeamId;
        break;
      }
    }

    // 4. Reset player metadata
    const freshPlayer: Player = {
      ...originalPlayer,
      auction_status: 'AVAILABLE',
      sold_price_inr: undefined,
      team_id: undefined
    };

    // 5. Create new auction lot
    const newLot: AuctionLot = {
      lotNumber: this.lots.length + 1,
      totalLots: this.lots.length + 1,
      player: freshPlayer,
      status: 'PENDING',
      currentBid: 0,
      currentBidder: null,
      currentBidderName: null,
      bids: []
    };

    // 6. Insert into queue
    const wasAtEnd = this.currentLotIndex >= this.lots.length;
    this.insertLotsIntoQueue([newLot], wasAtEnd);

    // 7. Audit log & Bid log
    this.addAuditLog(
      'SALE_REVERSED',
      `Sale reversed: ${freshPlayer.name} removed from ${IPL_FRANCHISES[originalTeamId].name} (${originalTeamId}). ₹${(refundAmount / 10000000).toFixed(2)} Cr refunded.`,
      'Host'
    );
    this.addBidLog({
      type: 'EVENT',
      eventAction: 'SALE_REVERSED',
      playerName: freshPlayer.name,
      teamId: originalTeamId,
      teamName: IPL_FRANCHISES[originalTeamId].name,
      amount: refundAmount,
      eventMessage: `SALE REVERSED: ${freshPlayer.name} removed from ${IPL_FRANCHISES[originalTeamId].name} and returned to auction pool. ₹${(refundAmount / 10000000).toFixed(2)} Cr refunded.`
    });

    return { 
      success: true, 
      message: `Reversed sale of ${freshPlayer.name}: ₹${(refundAmount / 10000000).toFixed(2)} Cr refunded to ${IPL_FRANCHISES[originalTeamId].name}.`,
      refundedTeam: originalTeamId,
      refundAmount,
      lot: newLot 
    };
  }

  /**
   * Skip multiple upcoming players
   */
  public skipMultipleLots(memberId: string, count: number): { success: boolean; message?: string; skippedCount?: number } {
    if (memberId !== this.hostId) {
      return { success: false, message: 'Only the host can skip players' };
    }
    if (this.status !== 'AUCTION') {
      return { success: false, message: 'Auction is not active' };
    }

    const validCount = Math.max(1, count);
    const current = this.lots[this.currentLotIndex];

    let startIndex = this.currentLotIndex;
    if (current && current.status === 'IN_PROGRESS' && current.currentBid > 0) {
      startIndex = this.currentLotIndex + 1;
    }

    if (startIndex >= this.lots.length) {
      return { success: false, message: 'No upcoming players available to skip.' };
    }

    const endIndex = Math.min(this.lots.length, startIndex + validCount);
    const skippedLots: AuctionLot[] = [];
    for (let i = startIndex; i < endIndex; i++) {
      const lot = this.lots[i];
      lot.status = 'SKIPPED';
      lot.player.auction_status = 'SKIPPED';
      this.history.unshift({ ...lot });
      skippedLots.push(lot);
    }

    this.addAuditLog(
      'MULTIPLE_PLAYERS_SKIPPED',
      `Host skipped ${skippedLots.length} player(s): ${skippedLots.map(l => l.player.name).join(', ')}`,
      'Host'
    );
    this.addBidLog({
      type: 'EVENT',
      eventAction: 'MULTIPLE_PLAYERS_SKIPPED',
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
  public kickMember(hostMemberId: string, targetMemberId: string): { success: boolean; message?: string; kickedMember?: RoomMember } {
    if (hostMemberId !== this.hostId) {
      return { success: false, message: 'Only the host can kick participants' };
    }
    if (targetMemberId === this.hostId) {
      return { success: false, message: 'Host cannot kick themselves' };
    }

    const target = this.members.get(targetMemberId);
    if (!target) {
      return { success: false, message: 'Participant not found in room' };
    }

    this.kickedMemberIds.add(targetMemberId);
    const targetNickname = target.nickname;

    if (this.status === 'LOBBY' && target.teamId) {
      target.teamId = null;
    }

    this.members.delete(targetMemberId);

    this.addAuditLog('MEMBER_KICKED', `Host kicked ${targetNickname} from the room`, 'Host');
    this.addBidLog({
      type: 'EVENT',
      eventAction: 'MEMBER_KICKED',
      eventMessage: `Participant "${targetNickname}" was removed from the auction room by the host.`
    });
    this.broadcastState();
    return { success: true, kickedMember: target };
  }

  public reAuctionUnsold(memberId: string): { success: boolean; message?: string } {
    if (memberId !== this.hostId) {
      return { success: false, message: 'Only the host can initiate the re-auction round' };
    }

    const unassignedLots = this.lots.filter(l => l.status === 'UNSOLD' || l.status === 'SKIPPED');
    if (unassignedLots.length === 0) {
      return { success: false, message: 'No unsold or skipped players remaining to re-auction' };
    }

    this.reAuctionRound = true;
    const unassignedPlayers = unassignedLots.map(l => ({ ...l.player, auction_status: 'AVAILABLE' as const }));

    // Group by descending price brackets and category sequence: Batsmen -> All-Rounders -> Bowlers
    const priceBrackets = Array.from(new Set(unassignedPlayers.map(p => p.base_price_inr))).sort((a, b) => b - a);
    const CATEGORY_SEQUENCE: Array<{ role: 'BATTER' | 'ALL_ROUNDER' | 'BOWLER'; label: string }> = [
      { role: 'BATTER', label: 'Batsmen' },
      { role: 'ALL_ROUNDER', label: 'All-Rounders' },
      { role: 'BOWLER', label: 'Bowlers' }
    ];

    const reorderedPlayers: Player[] = [];
    let setCounter = 0;
    for (const price of priceBrackets) {
      const priceDisplay = price >= 10000000
        ? `₹${(price / 10000000).toFixed(2)} Cr`
        : `₹${(price / 100000).toFixed(0)} Lakh`;

      for (const cat of CATEGORY_SEQUENCE) {
        const catPlayers = unassignedPlayers.filter(
          p => p.base_price_inr === price && p.primary_role === cat.role
        );
        if (catPlayers.length === 0) continue;
        setCounter++;
        const setName = `Re-Auction: ${priceDisplay} ${cat.label}`;
        const shuffled = shuffleArray(catPlayers);
        shuffled.forEach(p => {
          reorderedPlayers.push({ ...p, set_name: setName, set_order: setCounter });
        });
      }
    }

    this.lots = reorderedPlayers.map((player, i) => ({
      lotNumber: i + 1,
      totalLots: reorderedPlayers.length,
      player,
      status: 'PENDING',
      currentBid: 0,
      currentBidder: null,
      currentBidderName: null,
      bids: []
    }));

    this.currentLotIndex = 0;
    this.status = 'AUCTION';
    this.addAuditLog('REAUCTION_INITIATED', `Re-auction started for ${this.lots.length} players`, 'Host');
    this.startCurrentLot();
    return { success: true };
  }

  /**
   * LIVE PLAYER TRADING SYSTEM
   */
  public createTradeRequest(
    memberId: string, 
    payload: {
      targetTeamId: IPLTeamId;
      type: TradeType;
      offeredPlayerId: string;
      requestedPlayerId?: string;
      moneyAmount?: number;
      cashPayer?: 'OFFERING_TEAM' | 'RECEIVING_TEAM';
    }
  ): { success: boolean; message?: string; trade?: TradeRequest } {
    if (this.status === 'COMPLETED') {
      if (this.postAuctionTradeStatus === 'CLOSED') {
        return { success: false, message: 'The 10-minute post-auction trading window has permanently closed.' };
      }
      if (this.postAuctionTradeStatus !== 'ACTIVE') {
        return { success: false, message: 'Trading window is not active.' };
      }
    } else if (this.status !== 'AUCTION' && this.status !== 'PAUSED') {
      return { success: false, message: 'Trades can only be initiated during an active auction or the post-auction trading window.' };
    }

    const sender = this.members.get(memberId);
    if (!sender) return { success: false, message: 'Participant not found in room.' };
    if (!sender.teamId) return { success: false, message: 'You must represent a franchise to initiate a trade.' };
    const fromTeamId = sender.teamId;

    if (fromTeamId === payload.targetTeamId) {
      return { success: false, message: 'Cannot initiate a trade with your own franchise.' };
    }

    if (this.activeTrade) {
      return { success: false, message: 'A trade proposal is already pending review. Please wait for it to resolve.' };
    }

    // Check sender squad contains offered player
    const fromSquad = this.teamSquads[fromTeamId] || [];
    const offeredPlayer = fromSquad.find(p => p.id === payload.offeredPlayerId);
    if (!offeredPlayer) {
      return { success: false, message: 'The offered player was not found in your squad.' };
    }

    // Check if offered player is currently being bid on in the active lot
    const currentLot = this.lots[this.currentLotIndex];
    if (this.status === 'AUCTION' && currentLot && currentLot.status === 'IN_PROGRESS' && currentLot.player.id === offeredPlayer.id) {
      return { success: false, message: 'Cannot trade a player currently being auctioned in the live arena.' };
    }

    // Find manager for target franchise
    const toMember = Array.from(this.members.values()).find(m => m.teamId === payload.targetTeamId);
    const toSquad = this.teamSquads[payload.targetTeamId] || [];

    let requestedPlayer: Player | undefined = undefined;
    let moneyAmount: number | undefined = undefined;
    let cashPayer: 'OFFERING_TEAM' | 'RECEIVING_TEAM' | null = null;

    if (payload.type === 'PLAYER_FOR_PLAYER') {
      if (!payload.requestedPlayerId) {
        return { success: false, message: 'You must specify which player you want in exchange.' };
      }
      requestedPlayer = toSquad.find(p => p.id === payload.requestedPlayerId);
      if (!requestedPlayer) {
        return { success: false, message: 'The requested player is not in the target franchise squad.' };
      }
      if (this.status === 'AUCTION' && currentLot && currentLot.status === 'IN_PROGRESS' && currentLot.player.id === requestedPlayer.id) {
        return { success: false, message: 'Cannot trade for a player currently being auctioned in the live arena.' };
      }

      // Check overseas limits (max 8)
      const senderOverseas = fromSquad.filter(p => p.is_overseas && p.id !== offeredPlayer.id).length + (requestedPlayer!.is_overseas ? 1 : 0);
      if (senderOverseas > 8) {
        return { success: false, message: 'This trade would exceed your overseas limit (maximum 8 overseas players allowed).' };
      }

      const targetOverseas = toSquad.filter(p => p.is_overseas && p.id !== requestedPlayer!.id).length + (offeredPlayer.is_overseas ? 1 : 0);
      if (targetOverseas > 8) {
        return { success: false, message: 'This trade would cause the recipient franchise to exceed the 8 overseas player limit.' };
      }
    } else if (payload.type === 'PLAYER_FOR_MONEY') {
      const amount = payload.moneyAmount || 0;
      if (amount <= 0) {
        return { success: false, message: 'Trade amount must be greater than ₹0.' };
      }
      moneyAmount = amount;

      const targetPurse = this.teamPurse[payload.targetTeamId] || 0;
      if (targetPurse < amount) {
        return { 
          success: false, 
          message: `Target franchise has insufficient purse (₹${(targetPurse / 10000000).toFixed(2)} Cr) to pay ₹${(amount / 10000000).toFixed(2)} Cr.` 
        };
      }

      if (toSquad.length >= this.settings.maxSquad) {
        return { success: false, message: `Target franchise has already reached the maximum squad limit of ${this.settings.maxSquad} players.` };
      }

      if (offeredPlayer.is_overseas) {
        const targetOverseas = toSquad.filter(p => p.is_overseas).length;
        if (targetOverseas >= 8) {
          return { success: false, message: 'Target franchise already has 8 overseas players and cannot accept another overseas player.' };
        }
      }
    } else if (payload.type === 'PLAYER_PLUS_CASH') {
      if (!payload.requestedPlayerId) {
        return { success: false, message: 'You must specify which player you want in exchange.' };
      }
      requestedPlayer = toSquad.find(p => p.id === payload.requestedPlayerId);
      if (!requestedPlayer) {
        return { success: false, message: 'The requested player is not in the target franchise squad.' };
      }
      if (this.status === 'AUCTION' && currentLot && currentLot.status === 'IN_PROGRESS' && currentLot.player.id === requestedPlayer.id) {
        return { success: false, message: 'Cannot trade for a player currently being auctioned in the live arena.' };
      }

      const amount = payload.moneyAmount || 0;
      if (amount <= 0) {
        return { success: false, message: 'Trade cash amount must be greater than ₹0.' };
      }
      moneyAmount = amount;

      cashPayer = payload.cashPayer || 'OFFERING_TEAM';
      if (cashPayer === 'OFFERING_TEAM') {
        const senderPurse = this.teamPurse[fromTeamId] || 0;
        if (senderPurse < amount) {
          return {
            success: false,
            message: `Your franchise has insufficient purse (₹${(senderPurse / 10000000).toFixed(2)} Cr) to pay the cash amount of ₹${(amount / 10000000).toFixed(2)} Cr.`
          };
        }
      } else {
        const targetPurse = this.teamPurse[payload.targetTeamId] || 0;
        if (targetPurse < amount) {
          return {
            success: false,
            message: `Target franchise has insufficient purse (₹${(targetPurse / 10000000).toFixed(2)} Cr) to pay requested cash of ₹${(amount / 10000000).toFixed(2)} Cr.`
          };
        }
      }

      // Check overseas limits (max 8)
      const senderOverseas = fromSquad.filter(p => p.is_overseas && p.id !== offeredPlayer.id).length + (requestedPlayer!.is_overseas ? 1 : 0);
      if (senderOverseas > 8) {
        return { success: false, message: 'This trade would exceed your overseas limit (maximum 8 overseas players allowed).' };
      }

      const targetOverseas = toSquad.filter(p => p.is_overseas && p.id !== requestedPlayer!.id).length + (offeredPlayer.is_overseas ? 1 : 0);
      if (targetOverseas > 8) {
        return { success: false, message: 'This trade would cause the recipient franchise to exceed the 8 overseas player limit.' };
      }
    } else {
      return { success: false, message: 'Invalid trade type.' };
    }

    const duration = 45; // Exactly 45-second fixed authoritative response window
    const now = Date.now();
    const tradeId = `trade_${now}_${Math.random().toString(36).substring(2, 7)}`;

    const trade: TradeRequest = {
      id: tradeId,
      type: payload.type,
      status: 'PENDING',
      fromTeamId,
      fromMemberId: sender.id,
      fromMemberName: sender.nickname,
      toTeamId: payload.targetTeamId,
      toMemberId: toMember ? toMember.id : '',
      toMemberName: toMember ? toMember.nickname : IPL_FRANCHISES[payload.targetTeamId].name,
      offeredPlayer: { ...offeredPlayer },
      requestedPlayer: requestedPlayer ? { ...requestedPlayer } : undefined,
      moneyAmount,
      cashPayer,
      createdAt: now,
      expiresAt: now + (duration * 1000)
    };

    this.activeTrade = trade;

    // AUTOMATIC AUCTION PAUSE ON TRADE PROPOSAL (only if live auction was running)
    if (this.status === 'AUCTION') {
      if (this.deadlineTimestamp) {
        this.pauseRemainingMs = Math.max(0, this.deadlineTimestamp - Date.now());
      } else {
        this.pauseRemainingMs = this.settings.timerDuration * 1000;
      }
      this.status = 'PAUSED';
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
    }, duration * 1000);

    let tradeDesc = '';
    if (trade.type === 'PLAYER_FOR_PLAYER') {
      tradeDesc = `${sender.nickname} (${fromTeamId}) proposed trading ${trade.offeredPlayer.name} for ${trade.requestedPlayer?.name} with ${trade.toMemberName} (${trade.toTeamId})`;
    } else if (trade.type === 'PLAYER_FOR_MONEY') {
      tradeDesc = `${sender.nickname} (${fromTeamId}) proposed selling ${trade.offeredPlayer.name} to ${trade.toMemberName} (${trade.toTeamId}) for ₹${((trade.moneyAmount || 0) / 10000000).toFixed(2)} Cr`;
    } else {
      const payerName = trade.cashPayer === 'OFFERING_TEAM' ? fromTeamId : trade.toTeamId;
      tradeDesc = `${sender.nickname} (${fromTeamId}) proposed trading ${trade.offeredPlayer.name} for ${trade.requestedPlayer?.name} with ₹${((trade.moneyAmount || 0) / 10000000).toFixed(2)} Cr cash paid by ${payerName}`;
    }

    this.addAuditLog('TRADE_PROPOSED', tradeDesc, sender.nickname);
    this.addBidLog({
      type: 'EVENT',
      eventAction: 'TRADE_PROPOSED',
      playerName: trade.offeredPlayer.name,
      teamId: fromTeamId,
      teamName: IPL_FRANCHISES[fromTeamId].name,
      amount: trade.moneyAmount || trade.offeredPlayer.sold_price_inr || trade.offeredPlayer.base_price_inr,
      eventMessage: `TRADE PROPOSED: ${tradeDesc} (Auction paused for review)`
    });

    this.broadcastState({ type: 'TRADE_UPDATE', trade, eventAction: 'PROPOSED' });
    return { success: true, trade };
  }

  public respondTradeRequest(
    memberId: string, 
    tradeId: string, 
    action: 'ACCEPT' | 'REJECT', 
    rejectionReason?: string
  ): { success: boolean; message?: string; trade?: TradeRequest } {
    if (!this.activeTrade || this.activeTrade.id !== tradeId || this.activeTrade.status !== 'PENDING') {
      return { success: false, message: 'Trade request not found or is no longer active.' };
    }

    const responder = this.members.get(memberId);
    if (!responder) return { success: false, message: 'Member not found.' };

    const isTargetTeam = responder.teamId === this.activeTrade.toTeamId;
    if (!isTargetTeam) {
      return { success: false, message: 'Unauthorized: Only the recipient franchise manager can accept or reject this trade.' };
    }

    if (this.tradeTimeout) {
      clearTimeout(this.tradeTimeout);
      this.tradeTimeout = null;
    }

    if (action === 'REJECT') {
      this.activeTrade.status = 'REJECTED';
      this.activeTrade.resolvedAt = Date.now();
      this.activeTrade.resolvedBy = responder.nickname;
      this.activeTrade.rejectionReason = rejectionReason || 'Rejected by recipient franchise';

      this.tradeHistory.unshift({ ...this.activeTrade });
      const resolved = { ...this.activeTrade };
      this.activeTrade = null;

      this.addAuditLog('TRADE_REJECTED', `Trade rejected by ${responder.nickname}: ${resolved.rejectionReason}`, responder.nickname);
      this.addBidLog({
        type: 'EVENT',
        eventAction: 'TRADE_REJECTED',
        playerName: resolved.offeredPlayer.name,
        teamId: resolved.toTeamId,
        teamName: IPL_FRANCHISES[resolved.toTeamId].name,
        eventMessage: `TRADE REJECTED: ${resolved.toMemberName} rejected trade proposal from ${resolved.fromMemberName}.`
      });

      this.resumeAuctionFromTrade('Trade proposal rejected.');
      this.broadcastState({ type: 'TRADE_UPDATE', trade: resolved, eventAction: 'REJECTED' });
      return { success: true, trade: resolved };
    }

    // ACTION === 'ACCEPT'
    const fromTeamId = this.activeTrade.fromTeamId;
    const toTeamId = this.activeTrade.toTeamId;
    const fromSquad = this.teamSquads[fromTeamId] || [];
    const toSquad = this.teamSquads[toTeamId] || [];

    const pOffered = fromSquad.find(p => p.id === this.activeTrade!.offeredPlayer.id);
    if (!pOffered) {
      this.activeTrade.status = 'REJECTED';
      this.activeTrade.rejectionReason = 'Offered player is no longer in offering team squad';
      this.tradeHistory.unshift({ ...this.activeTrade });
      const resolved = { ...this.activeTrade };
      this.activeTrade = null;
      this.resumeAuctionFromTrade('Trade cancelled due to invalid squad state.');
      this.broadcastState({ type: 'TRADE_UPDATE', trade: resolved, eventAction: 'REJECTED' });
      return { success: false, message: 'Offered player is no longer in offering team squad.' };
    }

    if (this.activeTrade.type === 'PLAYER_FOR_PLAYER') {
      const pRequested = toSquad.find(p => p.id === this.activeTrade!.requestedPlayer?.id);
      if (!pRequested) {
        this.activeTrade.status = 'REJECTED';
        this.activeTrade.rejectionReason = 'Requested player is no longer in recipient team squad';
        this.tradeHistory.unshift({ ...this.activeTrade });
        const resolved = { ...this.activeTrade };
        this.activeTrade = null;
        this.resumeAuctionFromTrade('Trade cancelled due to invalid squad state.');
        this.broadcastState({ type: 'TRADE_UPDATE', trade: resolved, eventAction: 'REJECTED' });
        return { success: false, message: 'Requested player is no longer in recipient team squad.' };
      }

      // Re-verify overseas limits
      const fromOverseas = fromSquad.filter(p => p.is_overseas && p.id !== pOffered.id).length + (pRequested.is_overseas ? 1 : 0);
      if (fromOverseas > 8) {
        return { success: false, message: 'Trade cannot be completed: violates overseas limit of 8 for offering team.' };
      }
      const toOverseas = toSquad.filter(p => p.is_overseas && p.id !== pRequested.id).length + (pOffered.is_overseas ? 1 : 0);
      if (toOverseas > 8) {
        return { success: false, message: 'Trade cannot be completed: violates overseas limit of 8 for receiving team.' };
      }

      // ATOMIC SWAP
      this.teamSquads[fromTeamId] = fromSquad.filter(p => p.id !== pOffered.id);
      this.teamSquads[toTeamId] = toSquad.filter(p => p.id !== pRequested.id);

      const updatedOffered: Player = { ...pOffered, team_id: toTeamId };
      const updatedRequested: Player = { ...pRequested, team_id: fromTeamId };

      this.teamSquads[toTeamId].push(updatedOffered);
      this.teamSquads[fromTeamId].push(updatedRequested);

      this.sanitizePlayingXIAfterPlayerDeparture(fromTeamId, pOffered.id);
      this.sanitizePlayingXIAfterPlayerDeparture(toTeamId, pRequested.id);

    } else if (this.activeTrade.type === 'PLAYER_FOR_MONEY') {
      const cost = this.activeTrade.moneyAmount || 0;
      const targetPurse = this.teamPurse[toTeamId] || 0;
      if (targetPurse < cost) {
        return { success: false, message: 'Recipient team has insufficient purse balance to execute this trade.' };
      }
      if (toSquad.length >= this.settings.maxSquad) {
        return { success: false, message: 'Recipient team has reached maximum squad size of 25.' };
      }
      if (pOffered.is_overseas && toSquad.filter(p => p.is_overseas).length >= 8) {
        return { success: false, message: 'Recipient team has reached the 8 overseas player limit.' };
      }

      // ATOMIC TRANSFER & PURSE EXCHANGE
      this.teamSquads[fromTeamId] = fromSquad.filter(p => p.id !== pOffered.id);
      const updatedOffered: Player = { ...pOffered, team_id: toTeamId, sold_price_inr: cost };
      this.teamSquads[toTeamId].push(updatedOffered);

      this.teamPurse[toTeamId] -= cost;
      this.teamPurse[fromTeamId] += cost;

      this.sanitizePlayingXIAfterPlayerDeparture(fromTeamId, pOffered.id);

    } else if (this.activeTrade.type === 'PLAYER_PLUS_CASH') {
      const pRequested = toSquad.find(p => p.id === this.activeTrade!.requestedPlayer?.id);
      if (!pRequested) {
        this.activeTrade.status = 'REJECTED';
        this.activeTrade.rejectionReason = 'Requested player is no longer in recipient team squad';
        this.tradeHistory.unshift({ ...this.activeTrade });
        const resolved = { ...this.activeTrade };
        this.activeTrade = null;
        this.resumeAuctionFromTrade('Trade cancelled due to invalid squad state.');
        this.broadcastState({ type: 'TRADE_UPDATE', trade: resolved, eventAction: 'REJECTED' });
        return { success: false, message: 'Requested player is no longer in recipient team squad.' };
      }

      const cost = this.activeTrade.moneyAmount || 0;
      const payer = this.activeTrade.cashPayer || 'OFFERING_TEAM';

      if (payer === 'OFFERING_TEAM') {
        const senderPurse = this.teamPurse[fromTeamId] || 0;
        if (senderPurse < cost) {
          return { success: false, message: 'Offering franchise has insufficient purse balance to execute this trade.' };
        }
      } else {
        const targetPurse = this.teamPurse[toTeamId] || 0;
        if (targetPurse < cost) {
          return { success: false, message: 'Recipient franchise has insufficient purse balance to execute this trade.' };
        }
      }

      // Re-verify overseas limits
      const fromOverseas = fromSquad.filter(p => p.is_overseas && p.id !== pOffered.id).length + (pRequested.is_overseas ? 1 : 0);
      if (fromOverseas > 8) {
        return { success: false, message: 'Trade cannot be completed: violates overseas limit of 8 for offering team.' };
      }
      const toOverseas = toSquad.filter(p => p.is_overseas && p.id !== pRequested.id).length + (pOffered.is_overseas ? 1 : 0);
      if (toOverseas > 8) {
        return { success: false, message: 'Trade cannot be completed: violates overseas limit of 8 for receiving team.' };
      }

      // ATOMIC SWAP
      this.teamSquads[fromTeamId] = fromSquad.filter(p => p.id !== pOffered.id);
      this.teamSquads[toTeamId] = toSquad.filter(p => p.id !== pRequested.id);

      const updatedOffered: Player = { ...pOffered, team_id: toTeamId };
      const updatedRequested: Player = { ...pRequested, team_id: fromTeamId };

      this.teamSquads[toTeamId].push(updatedOffered);
      this.teamSquads[fromTeamId].push(updatedRequested);

      // Purse adjustment based on payer
      if (payer === 'OFFERING_TEAM') {
        this.teamPurse[fromTeamId] -= cost;
        this.teamPurse[toTeamId] += cost;
      } else {
        this.teamPurse[toTeamId] -= cost;
        this.teamPurse[fromTeamId] += cost;
      }

      this.sanitizePlayingXIAfterPlayerDeparture(fromTeamId, pOffered.id);
      this.sanitizePlayingXIAfterPlayerDeparture(toTeamId, pRequested.id);
    }

    this.activeTrade.status = 'ACCEPTED';
    this.activeTrade.resolvedAt = Date.now();
    this.activeTrade.resolvedBy = responder.nickname;
    this.tradeHistory.unshift({ ...this.activeTrade });
    const resolved = { ...this.activeTrade };
    this.activeTrade = null;

    let desc = '';
    if (resolved.type === 'PLAYER_FOR_PLAYER') {
      desc = `TRADE COMPLETED: ${resolved.offeredPlayer.name} transferred to ${IPL_FRANCHISES[toTeamId].name} (${toTeamId}) in exchange for ${resolved.requestedPlayer?.name} to ${IPL_FRANCHISES[fromTeamId].name} (${fromTeamId}).`;
    } else if (resolved.type === 'PLAYER_FOR_MONEY') {
      desc = `TRADE COMPLETED: ${resolved.offeredPlayer.name} purchased by ${IPL_FRANCHISES[toTeamId].name} (${toTeamId}) from ${IPL_FRANCHISES[fromTeamId].name} (${fromTeamId}) for ₹${((resolved.moneyAmount || 0) / 10000000).toFixed(2)} Cr.`;
    } else {
      const payerName = resolved.cashPayer === 'OFFERING_TEAM' ? IPL_FRANCHISES[fromTeamId].name : IPL_FRANCHISES[toTeamId].name;
      desc = `TRADE COMPLETED: ${resolved.offeredPlayer.name} exchanged for ${resolved.requestedPlayer?.name} + ₹${((resolved.moneyAmount || 0) / 10000000).toFixed(2)} Cr cash paid by ${payerName}.`;
    }

    this.addAuditLog('TRADE_ACCEPTED', desc, responder.nickname);
    this.addBidLog({
      type: 'EVENT',
      eventAction: 'TRADE_ACCEPTED',
      playerName: resolved.offeredPlayer.name,
      teamId: toTeamId,
      teamName: IPL_FRANCHISES[toTeamId].name,
      amount: resolved.moneyAmount,
      eventMessage: desc
    });

    this.resumeAuctionFromTrade('Trade completed successfully.');
    this.broadcastState({ type: 'TRADE_UPDATE', trade: resolved, eventAction: 'ACCEPTED' });
    return { success: true, trade: resolved };
  }

  public cancelTradeRequest(
    memberId: string, 
    tradeId: string, 
    reason?: string
  ): { success: boolean; message?: string; trade?: TradeRequest } {
    if (!this.activeTrade || this.activeTrade.id !== tradeId || this.activeTrade.status !== 'PENDING') {
      return { success: false, message: 'Trade request not found or is no longer active.' };
    }

    const caller = this.members.get(memberId);
    if (!caller) return { success: false, message: 'Participant not found.' };

    const isSender = this.activeTrade.fromMemberId === memberId || caller.teamId === this.activeTrade.fromTeamId;
    const isHost = memberId === this.hostId;
    if (!isSender && !isHost) {
      return { success: false, message: 'Unauthorized: Only the offering franchise manager or top host can cancel this trade proposal.' };
    }

    if (this.tradeTimeout) {
      clearTimeout(this.tradeTimeout);
      this.tradeTimeout = null;
    }

    this.activeTrade.status = 'CANCELLED';
    this.activeTrade.resolvedAt = Date.now();
    this.activeTrade.resolvedBy = caller.nickname;
    this.activeTrade.rejectionReason = reason || (isHost ? 'Cancelled by Top Host' : 'Cancelled by initiator');

    this.tradeHistory.unshift({ ...this.activeTrade });
    const resolved = { ...this.activeTrade };
    this.activeTrade = null;

    this.addAuditLog('TRADE_CANCELLED', `Trade cancelled by ${caller.nickname}`, caller.nickname);
    this.addBidLog({
      type: 'EVENT',
      eventAction: 'TRADE_CANCELLED',
      playerName: resolved.offeredPlayer.name,
      teamId: resolved.fromTeamId,
      teamName: IPL_FRANCHISES[resolved.fromTeamId].name,
      eventMessage: `TRADE CANCELLED: Trade for ${resolved.offeredPlayer.name} was cancelled by ${caller.nickname}.`
    });

    this.resumeAuctionFromTrade('Trade request was cancelled.');
    this.broadcastState({ type: 'TRADE_UPDATE', trade: resolved, eventAction: 'CANCELLED' });
    return { success: true, trade: resolved };
  }

  public expireTradeRequest(tradeId: string) {
    if (!this.activeTrade || this.activeTrade.id !== tradeId || this.activeTrade.status !== 'PENDING') {
      return;
    }

    this.tradeTimeout = null;
    this.activeTrade.status = 'EXPIRED';
    this.activeTrade.resolvedAt = Date.now();
    this.activeTrade.resolvedBy = 'System';
    this.activeTrade.rejectionReason = 'Trade decision timer expired';

    this.tradeHistory.unshift({ ...this.activeTrade });
    const resolved = { ...this.activeTrade };
    this.activeTrade = null;

    this.addAuditLog('TRADE_EXPIRED', `Trade expired due to decision timer`, 'System');
    this.addBidLog({
      type: 'EVENT',
      eventAction: 'TRADE_EXPIRED',
      playerName: resolved.offeredPlayer.name,
      teamId: resolved.fromTeamId,
      teamName: IPL_FRANCHISES[resolved.fromTeamId].name,
      eventMessage: `TRADE EXPIRED: Decision timer ran out for trade between ${resolved.fromMemberName} and ${resolved.toMemberName}.`
    });

    this.resumeAuctionFromTrade('Trade decision timer expired.');
    this.broadcastState({ type: 'TRADE_UPDATE', trade: resolved, eventAction: 'EXPIRED' });
  }

  public resumeAuctionFromTrade(reason: string) {
    this.pausedByTrade = false;
    if (this.wasAuctionActiveBeforeTrade && this.status === 'PAUSED') {
      this.wasAuctionActiveBeforeTrade = false;
      this.status = 'AUCTION';
      const remainingMs = this.pauseRemainingMs && this.pauseRemainingMs > 0
        ? this.pauseRemainingMs
        : (this.settings.timerDuration * 1000);
      this.deadlineTimestamp = Date.now() + remainingMs;
      this.pauseRemainingMs = null;
      this.startCountdownLoop();
      this.triggerBotBidding();
      this.addAuditLog('AUCTION_RESUMED', `Auction resumed: ${reason}`, 'System');
      this.addBidLog({
        type: 'EVENT',
        eventAction: 'AUCTION_RESUMED',
        eventMessage: `AUCTION RESUMED: Bidding is live again (${Math.ceil(remainingMs / 1000)}s remaining on current lot).`
      });
    } else {
      this.wasAuctionActiveBeforeTrade = false;
    }
  }

  public updateTradeTimer(memberId: string, durationSeconds: number): { success: boolean; message?: string } {
    if (memberId !== this.hostId) {
      return { success: false, message: 'Only the top host can configure the trade decision timer.' };
    }
    const duration = Math.min(120, Math.max(15, durationSeconds));
    this.settings.tradeTimerDuration = duration;
    this.addAuditLog('SETTINGS_UPDATED', `Host set trade decision timer to ${duration}s`, 'Host');
    this.broadcastState();
    return { success: true };
  }

  /**
   * Helper to safely remove traded player from Playing XI, Captain, Vice-Captain, or Impact Player
   */
  private sanitizePlayingXIAfterPlayerDeparture(teamId: IPLTeamId, playerId: string): void {
    const xi = this.teamPlayingXI[teamId];
    if (!xi) return;
    let modified = false;
    if (xi.playingXIIds && xi.playingXIIds.includes(playerId)) {
      xi.playingXIIds = xi.playingXIIds.filter((id: string) => id !== playerId);
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
      this.addAuditLog('PLAYING_XI_UPDATED', `${IPL_FRANCHISES[teamId].name} Playing XI adjusted due to player trade transfer.`, 'System');
    }
  }

  /**
   * Save draft selections for a franchise's Playing XI
   */
  public savePlayingXI(
    memberId: string, 
    teamId: IPLTeamId, 
    selection: Partial<PlayingXISelection>
  ): { success: boolean; message?: string; selection?: PlayingXISelection } {
    const member = this.members.get(memberId);
    if (!member) return { success: false, message: 'Participant not found.' };

    const isOwner = member.teamId === teamId;
    const isHost = memberId === this.hostId;
    if (!isOwner && !isHost) {
      return { success: false, message: 'Unauthorized: You can only edit your own franchise Playing XI.' };
    }

    const currentXI = this.teamPlayingXI[teamId] || {
      teamId,
      playingXIIds: [],
      captainId: null,
      viceCaptainId: null,
      impactPlayerId: null,
      isConfirmed: false
    };

    if (currentXI.isConfirmed && this.postAuctionTradeStatus === 'CLOSED') {
      return { success: false, message: 'Playing XI selections are permanently locked after trading window closes.' };
    }

    const squad = this.teamSquads[teamId] || [];
    const squadMap = new Map(squad.map(p => [p.id, p]));

    const newIds = selection.playingXIIds !== undefined ? selection.playingXIIds : currentXI.playingXIIds;
    // Validate each player is in squad
    for (const pid of newIds) {
      if (!squadMap.has(pid)) {
        return { success: false, message: `Player is not in ${teamId} squad.` };
      }
    }

    // Check overseas limit in Playing XI (Max 4)
    const overseasCount = newIds.filter((pid: string) => squadMap.get(pid)?.is_overseas).length;
    if (overseasCount > 4) {
      return { success: false, message: `Playing XI cannot contain more than 4 overseas players (found ${overseasCount}).` };
    }

    if (newIds.length > 11) {
      return { success: false, message: 'Playing XI cannot contain more than 11 players.' };
    }

    let capId = selection.captainId !== undefined ? selection.captainId : currentXI.captainId;
    if (capId && !newIds.includes(capId)) {
      capId = null;
    }

    let vcId = selection.viceCaptainId !== undefined ? selection.viceCaptainId : currentXI.viceCaptainId;
    if (vcId && (!newIds.includes(vcId) || vcId === capId)) {
      vcId = null;
    }

    let impactId = selection.impactPlayerId !== undefined ? selection.impactPlayerId : currentXI.impactPlayerId;
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
      type: 'PLAYING_XI_UPDATED',
      teamId,
      selection: this.teamPlayingXI[teamId]
    });

    return { success: true, selection: this.teamPlayingXI[teamId] };
  }

  /**
   * Officially lock and confirm Playing XI for a franchise
   */
  public confirmPlayingXI(
    memberId: string, 
    teamId: IPLTeamId
  ): { success: boolean; message?: string; selection?: PlayingXISelection } {
    const member = this.members.get(memberId);
    if (!member) return { success: false, message: 'Participant not found.' };

    const isOwner = member.teamId === teamId;
    const isHost = memberId === this.hostId;
    if (!isOwner && !isHost) {
      return { success: false, message: 'Unauthorized: You can only confirm your own franchise Playing XI.' };
    }

    const currentXI = this.teamPlayingXI[teamId];
    if (!currentXI) return { success: false, message: 'Playing XI not initialized.' };

    const squad = this.teamSquads[teamId] || [];
    const squadMap = new Map(squad.map(p => [p.id, p]));

    if (squad.length < 11) {
      return { success: false, message: `Your squad has only ${squad.length} players. At least 11 players are required to field a Playing XI.` };
    }

    if (currentXI.playingXIIds.length !== 11) {
      return { success: false, message: `Exactly 11 starting players must be selected (currently ${currentXI.playingXIIds.length}/11).` };
    }

    const overseasCount = currentXI.playingXIIds.filter((pid: string) => squadMap.get(pid)?.is_overseas).length;
    if (overseasCount > 4) {
      return { success: false, message: `Playing XI exceeds the 4 overseas player limit (currently ${overseasCount}/4).` };
    }

    if (!currentXI.captainId) {
      return { success: false, message: 'Please select a Captain from your Playing XI.' };
    }
    if (!currentXI.playingXIIds.includes(currentXI.captainId)) {
      return { success: false, message: 'Captain must be one of the 11 starting players.' };
    }

    if (!currentXI.viceCaptainId) {
      return { success: false, message: 'Please select a Vice-Captain from your Playing XI.' };
    }
    if (!currentXI.playingXIIds.includes(currentXI.viceCaptainId)) {
      return { success: false, message: 'Vice-Captain must be one of the 11 starting players.' };
    }
    if (currentXI.viceCaptainId === currentXI.captainId) {
      return { success: false, message: 'Captain and Vice-Captain must be different players.' };
    }

    if (squad.length > 11) {
      if (!currentXI.impactPlayerId) {
        return { success: false, message: 'Please select an Impact Player from your bench.' };
      }
      if (currentXI.playingXIIds.includes(currentXI.impactPlayerId)) {
        return { success: false, message: 'Impact Player must be chosen from the bench outside the Playing XI.' };
      }
    }

    currentXI.isConfirmed = true;
    currentXI.confirmedAt = Date.now();

    const capName = squadMap.get(currentXI.captainId)?.name || 'Captain';
    this.addAuditLog('PLAYING_XI_CONFIRMED', `${IPL_FRANCHISES[teamId].name} locked their Playing XI (Captain: ${capName}).`, member.nickname);

    this.broadcastState({
      type: 'PLAYING_XI_UPDATED',
      teamId,
      selection: currentXI
    });

    return { success: true, selection: currentXI };
  }

  /**
   * Unlock Playing XI for edits prior to window close
   */
  public unlockPlayingXI(
    memberId: string, 
    teamId: IPLTeamId
  ): { success: boolean; message?: string } {
    const member = this.members.get(memberId);
    if (!member) return { success: false, message: 'Participant not found.' };

    const isOwner = member.teamId === teamId;
    const isHost = memberId === this.hostId;
    if (!isOwner && !isHost) {
      return { success: false, message: 'Unauthorized.' };
    }

    if (this.postAuctionTradeStatus === 'CLOSED') {
      return { success: false, message: 'Playing XI selections cannot be unlocked after the trading window has closed.' };
    }

    const currentXI = this.teamPlayingXI[teamId];
    if (currentXI) {
      currentXI.isConfirmed = false;
      this.broadcastState({
        type: 'PLAYING_XI_UPDATED',
        teamId,
        selection: currentXI
      });
    }

    return { success: true };
  }

  private clearAllTimers() {
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

  public getTeamSummary(): Record<IPLTeamId, TeamStats> {
    const allTeams: IPLTeamId[] = ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'PBKS', 'DC', 'GT', 'LSG'];
    const summary = {} as Record<IPLTeamId, TeamStats>;

    // Find manager for each team
    const managers: Record<IPLTeamId, { nickname: string; isBot: boolean }> = {} as any;
    for (const m of this.members.values()) {
      if (m.teamId) {
        managers[m.teamId] = { nickname: m.nickname, isBot: m.isBot };
      }
    }

    for (const teamId of allTeams) {
      const squad = this.teamSquads[teamId] || [];
      const spent = this.settings.startingPurse - (this.teamPurse[teamId] || 0);
      const remaining = this.teamPurse[teamId] || 0;
      const overseas = squad.filter(p => p.is_overseas).length;
      const indian = squad.filter(p => !p.is_overseas).length;
      const batters = squad.filter(p => p.primary_role === 'BATTER' && !p.is_wicketkeeper).length;
      const bowlers = squad.filter(p => p.primary_role === 'BOWLER').length;
      const allRounders = squad.filter(p => p.primary_role === 'ALL_ROUNDER').length;
      const wks = squad.filter(p => p.is_wicketkeeper).length;

      const isValid = 
        squad.length >= this.settings.minSquad &&
        squad.length <= this.settings.maxSquad &&
        overseas <= 8 &&
        remaining >= 0;

      const needed = Math.max(0, this.settings.minSquad - squad.length);
      const minSpendRequired = needed * 3000000;

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
        minSpendRequired
      };
    }
    return summary;
  }

  public getState(): RoomState {
    const currentLot = this.currentLotIndex < this.lots.length ? this.lots[this.currentLotIndex] : null;
    const remainingSeconds = this.deadlineTimestamp
      ? Math.max(0, Math.ceil((this.deadlineTimestamp - Date.now()) / 1000))
      : 0;

    const membersObj: Record<string, RoomMember> = {};
    for (const [id, m] of this.members.entries()) {
      membersObj[id] = { ...m };
    }

    // Deep clone squads and purse to prevent stale reference leaks
    const safeSquads: Record<IPLTeamId, Player[]> = {} as any;
    const allTeams: IPLTeamId[] = ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'PBKS', 'DC', 'GT', 'LSG'];
    for (const t of allTeams) {
      safeSquads[t] = [...(this.teamSquads[t] || [])];
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
      announcementLotNumber: this.announcementLotNumber || undefined,
      currentResultId: this.currentResultId,
      poolSize: this.lots.length,
      totalSets: this.lots.length > 0 ? Math.max(...this.lots.map(l => l.player.set_order)) : 1,
      currentSetOrder: currentLot ? currentLot.player.set_order : 1,
      currentSetName: currentLot ? currentLot.player.set_name : '₹2.00 Cr Batsmen',
      kickedMemberIds: Array.from(this.kickedMemberIds),
      activeTrade: this.activeTrade ? { ...this.activeTrade } : null,
      tradeHistory: [...this.tradeHistory],
      pausedByTrade: this.pausedByTrade,
      postAuctionTradeStatus: this.postAuctionTradeStatus,
      postAuctionTradeDeadline: this.postAuctionTradeDeadline,
      lots: this.lots
    };
  }

  public broadcastState(eventMsg?: any) {
    storageService.saveRoom(this.toJSON());
    this.broadcastCallback(this.getState(), eventMsg);
  }

  public toJSON(): SerializedRoomData {
    return {
      roomCode: this.roomCode,
      hostNickname: this.members.get(this.hostId)?.nickname || 'Host',
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

  public static fromJSON(data: SerializedRoomData, broadcastCallback: (state: RoomState, eventMsg?: any) => void): GameRoom {
    const room = new GameRoom(data.roomCode, data.hostNickname, data.settings, broadcastCallback);
    room.hostId = data.hostId;
    room.status = (data.status as any) || 'LOBBY';
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
      room.teamPlayingXI = data.teamPlayingXI as any;
    }
    room.postAuctionTradeStatus = (data.postAuctionTradeStatus as any) || 'NOT_STARTED';
    room.postAuctionTradeDeadline = data.postAuctionTradeDeadline || null;
    if (room.postAuctionTradeStatus === 'ACTIVE' && room.postAuctionTradeDeadline) {
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

    if (room.status === 'AUCTION') {
      const current = room.lots[room.currentLotIndex];
      if (current && current.status === 'IN_PROGRESS') {
        room.deadlineTimestamp = Date.now() + (room.settings.timerDuration * 1000);
        room.startCountdownLoop();
      }
    }

    return room;
  }
}
