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
  ChatMessage
} from './types.js';
import { buildAuctionLots, shuffleArray } from './playerService.js';
import { evaluateBotBid } from './botEngine.js';

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
  public reAuctionRound: boolean = false;

  private timerInterval: NodeJS.Timeout | null = null;
  private botTimeouts: NodeJS.Timeout[] = [];
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
    if (this.isPrivate && initialSettings.password && initialSettings.password.trim()) {
      this.passwordHash = crypto.createHash('sha256').update(initialSettings.password.trim()).digest('hex');
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
      allowDuplicateTeams: initialSettings.allowDuplicateTeams || false
    };

    // Initialize 10 franchise purses and squads
    const allTeams: IPLTeamId[] = ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'PBKS', 'DC', 'GT', 'LSG'];
    for (const team of allTeams) {
      this.teamPurse[team] = this.settings.startingPurse;
      this.teamSquads[team] = [];
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
    if (!inputPassword) return false;
    const hash = crypto.createHash('sha256').update(inputPassword.trim()).digest('hex');
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

  public getMember(memberId: string): RoomMember | undefined {
    return this.members.get(memberId);
  }

  public join(nickname: string, sessionToken?: string): RoomMember {
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
    if (this.status !== 'LOBBY') {
      return { success: false, message: 'Team selection is locked once auction starts.' };
    }

    const member = this.members.get(memberId);
    if (!member) return { success: false, message: 'Member not found' };

    // Check if team is already taken by another human or bot
    for (const [otherId, other] of this.members.entries()) {
      if (otherId !== memberId && other.teamId === teamId) {
        return { success: false, message: `${IPL_FRANCHISES[teamId].name} is already taken by ${other.nickname}` };
      }
    }

    const oldTeam = member.teamId;
    member.teamId = teamId;
    this.addAuditLog(
      'TEAM_SELECTED',
      `${member.nickname} selected ${IPL_FRANCHISES[teamId].name} (${teamId})` + (oldTeam ? ` (released ${oldTeam})` : ''),
      member.nickname
    );

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
      return { success: false, message: 'Cannot modify core settings while auction is active' };
    }

    if (newSettings.timerDuration !== undefined) {
      this.settings.timerDuration = Math.min(20, Math.max(5, newSettings.timerDuration));
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
      this.finishAuction();
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

    this.addAuditLog(
      'LOT_STARTED',
      `Lot #${lot.lotNumber}: ${lot.player.name} (${lot.player.category}, Base: ${lot.player.base_price_display})`,
      'System'
    );

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
        this.broadcastCallback(this.getState(), {
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
        return { success: false, message: 'Your franchise already holds the highest bid' };
      }

      // 2. Minimum bid calculation
      const minRequired = lot.currentBid === 0
        ? lot.player.base_price_inr
        : lot.currentBid + this.settings.minBidIncrement;

      const bidAmount = customAmount !== undefined ? customAmount : minRequired;

      if (bidAmount < minRequired) {
        return { success: false, message: `Minimum legal bid is ₹${(minRequired / 10000000).toFixed(2)} Cr` };
      }

      // 3. Team squad limit check (Max 25)
      const currentSquad = this.teamSquads[teamId] || [];
      if (currentSquad.length >= this.settings.maxSquad) {
        return { success: false, message: `Maximum squad limit of ${this.settings.maxSquad} reached` };
      }

      // 4. CRITICAL: Strict Overseas Player Limit Check (Max 8)
      if (lot.player.is_overseas) {
        const overseasCount = currentSquad.filter(p => p.is_overseas).length;
        if (overseasCount >= 8) {
          return { 
            success: false, 
            message: 'Overseas limit reached. Your team already has 8 overseas players.' 
          };
        }
      }

      // 5. Mathematical squad reserve feasibility check:
      const purse = this.teamPurse[teamId] || 0;
      if (bidAmount > purse) {
        return { success: false, message: 'Insufficient purse balance for this bid' };
      }

      const slotsRemainingNeeded = Math.max(0, this.settings.minSquad - (currentSquad.length + 1));
      const minReserveRequired = slotsRemainingNeeded * 3000000; // ₹30 Lakh minimum player price
      if ((purse - bidAmount) < minReserveRequired) {
        return { 
          success: false, 
          message: `Bid rejected: You must keep at least ₹${(minReserveRequired / 10000000).toFixed(2)} Cr in reserve to complete the minimum 18-player squad.` 
        };
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
      }
    } else {
      // UNSOLD
      lot.status = 'UNSOLD';
      lot.player.auction_status = 'UNSOLD';
      this.addAuditLog('PLAYER_UNSOLD', `UNSOLD: ${lot.player.name}`, 'System');
    }

    this.history.unshift({ ...lot });

    // CRITICAL FIX: Broadcast full teamSquads and teamStats with LOT_FINALIZED!
    const summary = this.getTeamSummary();
    this.broadcastCallback(this.getState(), {
      type: 'LOT_FINALIZED',
      lot,
      teamPurse: { ...this.teamPurse },
      teamSquads: { ...this.teamSquads },
      teamStats: summary
    });

    // Advance to next lot after 2.8s transition pause
    setTimeout(() => {
      if (this.status === 'AUCTION') {
        this.currentLotIndex++;
        this.startCurrentLot();
      }
    }, 2800);
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
    this.history.unshift({ ...lot });

    const summary = this.getTeamSummary();
    this.broadcastCallback(this.getState(), {
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
    const allTeams: IPLTeamId[] = ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'PBKS', 'DC', 'GT', 'LSG'];
    for (const team of allTeams) {
      this.teamPurse[team] = this.settings.startingPurse;
      this.teamSquads[team] = [];
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

  public finishAuction() {
    this.clearAllTimers();
    this.status = 'COMPLETED';
    this.deadlineTimestamp = null;
    this.addAuditLog('AUCTION_COMPLETED', 'The auction has concluded successfully!', 'System');
    this.broadcastState({ type: 'AUCTION_COMPLETED', summary: this.getTeamSummary() });
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

  private clearAllTimers() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
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
      currentLotIndex: this.currentLotIndex,
      currentLot: currentLot ? { ...currentLot } : null,
      deadlineTimestamp: this.deadlineTimestamp,
      remainingSeconds,
      history: [...this.history],
      auditLog: [...this.auditLog],
      chatMessages: [...this.chatMessages],
      poolSize: this.lots.length,
      totalSets: this.lots.length > 0 ? Math.max(...this.lots.map(l => l.player.set_order)) : 1,
      currentSetOrder: currentLot ? currentLot.player.set_order : 1,
      currentSetName: currentLot ? currentLot.player.set_name : '₹2.00 Cr Batsmen'
    };
  }

  public broadcastState(eventMsg?: any) {
    this.broadcastCallback(this.getState(), eventMsg);
  }
}
