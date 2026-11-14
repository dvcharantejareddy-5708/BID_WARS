import { IPLTeamId, Player, RoomSettings } from './types.js';
import {
  Tournament,
  TournamentMember,
  TournamentTeam,
  Fixture,
  MatchLineup,
  LiveMatch,
  BallEvent,
  PointsTableRow,
  PlayerTournamentStats,
  HandCricketChoice,
  BowlerAbilityType,
  BatterAbilityType
} from './tournamentTypes.js';
import { MatchEngine } from './matchEngine.js';
import { FixtureGenerator } from './fixtureGenerator.js';
import { tournamentStorage } from './tournamentStorage.js';
import { supabase } from './supabase.js';
import { roomManager } from './index.js';
import { getAllPlayers } from './playerService.js';

export class TournamentManager {
  private tournaments: Map<string, Tournament> = new Map();
  private liveMatches: Map<string, LiveMatch> = new Map();
  private allPlayersMap: Map<string, Player> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    this.initPlayersMap();
  }

  private initPlayersMap() {
    try {
      const players = getAllPlayers('2026');
      for (const p of players) {
        this.allPlayersMap.set(p.id, p);
      }
    } catch (err) {
      console.warn('[TournamentManager] Could not preload players:', err);
    }
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    const loaded = await tournamentStorage.loadAllTournaments();
    for (const t of loaded) {
      this.tournaments.set(t.id, t);
    }
    this.isInitialized = true;
    console.log(`[TournamentManager] Initialized with ${this.tournaments.size} tournaments`);
  }

  public getAllTournaments(): Tournament[] {
    return Array.from(this.tournaments.values());
  }

  /**
   * STRICT PRIVACY: Returns only tournaments created or joined by this user
   */
  public getUserTournaments(userId: string): Tournament[] {
    if (!userId) return [];
    return Array.from(this.tournaments.values()).filter(t =>
      t.hostId === userId || t.members.some(m => m.userId === userId)
    );
  }

  public getTournament(id: string, userId?: string): Tournament | null {
    const tournament = this.tournaments.get(id);
    if (!tournament) return null;
    if (userId) {
      const isMember = tournament.hostId === userId || tournament.members.some(m => m.userId === userId);
      if (!isMember) return null;
    }
    return tournament;
  }

  public getLiveMatch(matchId: string): LiveMatch | undefined {
    return this.liveMatches.get(matchId);
  }

  /**
   * Generates a clean Tournament ID
   */
  private generateTournamentId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'TRN-';
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
  public async createTournament(
    name: string,
    hostId: string,
    hostName: string,
    hostEmail: string | undefined,
    teamsCount: 4 | 6 | 8 | 10,
    matchOvers: 1 | 2 | 5 | 10 | 15 | 20,
    hostFranchiseId: IPLTeamId
  ): Promise<Tournament> {
    await this.init();

    const tournamentId = this.generateTournamentId();
    const now = Date.now();

    // Create an underlying Quick Auction room in roomManager to guarantee 100% auction reuse
    const roomSettings: Partial<RoomSettings> = {
      season: '2026',
      startingPurse: 1200000000,
      timerDuration: 15,
      isPrivate: false,
      tournamentId,
      hostId,
      hostFranchiseId
    };
    const auctionRoom = roomManager.createRoom(hostName, roomSettings);

    // Pre-register and lock host franchise in auction room
    auctionRoom.preRegisterMember(hostId, hostName, hostFranchiseId, true);
    auctionRoom.selectTeam(hostId, hostFranchiseId);

    const hostMember: TournamentMember = {
      userId: hostId,
      userEmail: hostEmail,
      userName: hostName,
      franchiseId: hostFranchiseId,
      isHost: true,
      joinedAt: now
    };

    const hostTeam: TournamentTeam = {
      franchiseId: hostFranchiseId,
      ownerUserId: hostId,
      ownerUserName: hostName,
      purseRemaining: 120,
      squad: []
    };

    const tournament: Tournament = {
      id: tournamentId,
      name: name.trim() || `IPL Tournament ${tournamentId}`,
      hostId,
      hostName,
      status: 'REGISTRATION',
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
  public async joinTournament(
    tournamentId: string,
    userId: string,
    userName: string,
    userEmail: string | undefined,
    franchiseId: IPLTeamId
  ): Promise<{ success: boolean; tournament?: Tournament; message?: string }> {
    await this.init();
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) {
      return { success: false, message: 'Tournament not found' };
    }

    if (tournament.status !== 'REGISTRATION') {
      return { success: false, message: `Cannot join tournament in ${tournament.status} state` };
    }

    // Rule: 1 Google account can control only ONE team in this tournament
    const existingUserMember = tournament.members.find(m => m.userId === userId);
    if (existingUserMember) {
      return {
        success: false,
        message: `You already control team ${existingUserMember.franchiseId} in this tournament. Each account may only control 1 team.`
      };
    }

    // Rule: Franchise cannot be claimed by multiple users
    const existingFranchiseMember = tournament.members.find(m => m.franchiseId === franchiseId);
    if (existingFranchiseMember) {
      return {
        success: false,
        message: `Franchise ${franchiseId} is already claimed by ${existingFranchiseMember.userName}. Please choose another team.`
      };
    }

    // Check maximum teams
    if (tournament.members.length >= tournament.teamsCount) {
      return { success: false, message: `Tournament is full (${tournament.teamsCount} teams maximum)` };
    }

    const now = Date.now();
    const newMember: TournamentMember = {
      userId,
      userEmail,
      userName,
      franchiseId,
      isHost: false,
      joinedAt: now
    };

    const newTeam: TournamentTeam = {
      franchiseId,
      ownerUserId: userId,
      ownerUserName: userName,
      purseRemaining: 120,
      squad: []
    };

    tournament.members.push(newMember);
    tournament.teams[franchiseId] = newTeam;
    tournament.updatedAt = now;

    // Pre-register member and lock chosen franchise in underlying auction room
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
  public async deleteTournament(
    tournamentId: string,
    userId: string
  ): Promise<{ success: boolean; message?: string }> {
    await this.init();
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) {
      return { success: false, message: 'Tournament not found' };
    }

    if (tournament.hostId !== userId) {
      return { success: false, message: 'Access denied: Only the original tournament creator can delete this tournament.' };
    }

    // Cascading deletion: remove underlying auction room
    if (tournament.roomCode) {
      roomManager.deleteRoom(tournament.roomCode);
    }

    // Delete tournament from memory and durable storage
    this.tournaments.delete(tournamentId);
    tournamentStorage.deleteTournament(tournamentId);

    // Cascading deletion from Supabase if configured
    if (supabase) {
      try {
        await supabase.from('tournaments').delete().eq('id', tournamentId);
      } catch (err) {
        console.warn('[TournamentManager] Supabase deleteTournament fallback:', err);
      }
    }

    return { success: true };
  }

  /**
   * Start the Auction stage for this tournament
   * STRICT: Only the original creator/host can start the auction
   */
  public async startAuction(
    tournamentId: string,
    userId: string
  ): Promise<{ success: boolean; message?: string }> {
    await this.init();
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return { success: false, message: 'Tournament not found' };

    if (tournament.hostId !== userId) {
      return { success: false, message: 'Access denied: Only the original tournament host can start the auction.' };
    }

    // Check pre-auction state
    if (tournament.status !== 'REGISTRATION') {
      return { success: false, message: `Cannot start auction for tournament in ${tournament.status} state.` };
    }

    // Start underlying auction room if in LOBBY state
    const room = roomManager.getRoom(tournament.roomCode);
    if (room && room.getState().status === 'LOBBY') {
      const startRes = room.startAuction(tournament.hostId);
      if (!startRes.success) {
        return { success: false, message: startRes.message || 'Failed to start auction engine' };
      }
    }

    tournament.status = 'AUCTION';
    tournament.updatedAt = Date.now();
    tournamentStorage.saveTournament(tournament);
    return { success: true };
  }

  /**
   * Finalizes auction squads: imports squads & purses from the completed Quick Auction room
   * into Tournament teams, creates default lineups, and moves to SQUAD_FINALIZATION.
   */
  public async importAuctionSquads(
    tournamentId: string
  ): Promise<{ success: boolean; message?: string }> {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return { success: false, message: 'Tournament not found' };

    const room = roomManager.getRoom(tournament.roomCode);
    if (!room) {
      return { success: false, message: 'Auction room not found' };
    }

    const state = room.getState();
    const teamSquads = state.teamSquads;
    const teamPurses = state.teamPurse;

    for (const member of tournament.members) {
      const fid = member.franchiseId;
      const squad = teamSquads[fid] || [];
      const purse = teamPurses[fid] !== undefined ? teamPurses[fid] / 10000000 : 0; // Convert to Crores

      // Generate default Playing XI (top 11 players by OVR)
      const sorted = [...squad].sort((a, b) => (b.ovr || 75) - (a.ovr || 75));
      const playingXI = sorted.slice(0, 11).map(p => p.id);
      const captainId = playingXI[0] || '';
      const viceCaptainId = playingXI[1] || '';
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

    tournament.status = 'SQUAD_FINALIZATION';
    tournament.updatedAt = Date.now();
    tournamentStorage.saveTournament(tournament);
    return { success: true };
  }

  /**
   * Generates fixtures and launches tournament into TOURNAMENT_LIVE
   */
  public async startLiveTournament(
    tournamentId: string,
    userId: string
  ): Promise<{ success: boolean; message?: string }> {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return { success: false, message: 'Tournament not found' };

    if (tournament.hostId !== userId) {
      return { success: false, message: 'Only tournament host can start live matches' };
    }

    const teamIds = tournament.members.map(m => m.franchiseId);
    const fixtures = FixtureGenerator.generateGroupStageFixtures(tournamentId, teamIds, tournament.matchOvers);

    // Initialize points table
    const pointsTable: PointsTableRow[] = teamIds.map(fid => ({
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
    tournament.status = 'TOURNAMENT_LIVE';
    tournament.updatedAt = Date.now();

    tournamentStorage.saveTournament(tournament);
    return { success: true };
  }

  /**
   * Save match-specific Playing XI for a team
   */
  public saveMatchLineup(
    tournamentId: string,
    franchiseId: IPLTeamId,
    userId: string,
    lineup: { playingXI: string[]; captainId: string; viceCaptainId: string; impactPlayerId?: string }
  ): { success: boolean; message?: string } {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return { success: false, message: 'Tournament not found' };

    const member = tournament.members.find(m => m.franchiseId === franchiseId);
    if (!member) return { success: false, message: 'Franchise not found' };

    if (member.userId !== userId && tournament.hostId !== userId) {
      return { success: false, message: 'Unauthorized: you do not own this franchise' };
    }

    const team = tournament.teams[franchiseId];
    if (!team) return { success: false, message: 'Team data not found' };

    // Validate 11 starters
    if (!lineup.playingXI || lineup.playingXI.length !== 11) {
      return { success: false, message: 'Playing XI must contain exactly 11 players' };
    }

    team.defaultPlayingXI = { ...lineup };
    tournament.updatedAt = Date.now();
    tournamentStorage.saveTournament(tournament);
    return { success: true };
  }

  /**
   * Start a scheduled match
   */
  public startMatch(
    tournamentId: string,
    fixtureId: string,
    userId: string
  ): { success: boolean; match?: LiveMatch; message?: string } {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return { success: false, message: 'Tournament not found' };

    const fixture = tournament.fixtures.find(f => f.id === fixtureId);
    if (!fixture) return { success: false, message: 'Fixture not found' };

    if (fixture.status === 'COMPLETED') {
      return { success: false, message: 'Match is already completed' };
    }

    const homeTeam = tournament.teams[fixture.homeFranchiseId];
    const awayTeam = tournament.teams[fixture.awayFranchiseId];

    if (!homeTeam || !awayTeam) {
      return { success: false, message: 'Team details missing' };
    }

    // Build lineups
    const getLineup = (team: TournamentTeam, fid: IPLTeamId): MatchLineup => {
      if (team.defaultPlayingXI && team.defaultPlayingXI.playingXI.length === 11) {
        return {
          franchiseId: fid,
          playingXI: [...team.defaultPlayingXI.playingXI],
          captainId: team.defaultPlayingXI.captainId,
          viceCaptainId: team.defaultPlayingXI.viceCaptainId,
          impactPlayerId: team.defaultPlayingXI.impactPlayerId,
          isLocked: true,
          submittedAt: Date.now()
        };
      }
      // Auto-fallback: top 11 by OVR
      const sorted = [...team.squad].sort((a, b) => (b.ovr || 75) - (a.ovr || 75));
      const pXI = sorted.slice(0, 11).map(p => p.id);
      return {
        franchiseId: fid,
        playingXI: pXI,
        captainId: pXI[0] || '',
        viceCaptainId: pXI[1] || '',
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

    fixture.status = 'IN_PROGRESS';
    fixture.matchId = liveMatch.id;
    this.liveMatches.set(liveMatch.id, liveMatch);

    tournament.updatedAt = Date.now();
    tournamentStorage.saveTournament(tournament);

    return { success: true, match: liveMatch };
  }

  /**
   * Handle toss decision
   */
  public handleToss(
    matchId: string,
    tossWinnerFranchiseId: IPLTeamId,
    decision: 'BAT' | 'BOWL'
  ): { success: boolean; match?: LiveMatch; message?: string } {
    const match = this.liveMatches.get(matchId);
    if (!match) return { success: false, message: 'Match not found' };

    MatchEngine.handleToss(match, tossWinnerFranchiseId, decision, this.allPlayersMap);
    return { success: true, match };
  }

  /**
   * Submit hand-cricket selection for active delivery
   */
  public submitChoice(
    matchId: string,
    franchiseId: IPLTeamId,
    choice: HandCricketChoice,
    ability?: BowlerAbilityType | BatterAbilityType,
    blockedNumbers?: number[]
  ): { resolved: boolean; ballEvent?: BallEvent; match?: LiveMatch; error?: string } {
    const match = this.liveMatches.get(matchId);
    if (!match) return { resolved: false, error: 'Match not found' };

    const res = MatchEngine.submitChoice(
      match,
      franchiseId,
      choice,
      ability,
      blockedNumbers,
      this.allPlayersMap
    );

    if (res.resolved) {
      if (match.status === 'COMPLETED') {
        this.onMatchCompleted(match);
      }
      return { resolved: true, ballEvent: res.ballEvent, match };
    }

    return { resolved: false, match };
  }

  /**
   * Handle 15s turn timeout
   */
  public handleTimeout(matchId: string): { resolved: boolean; ballEvent?: BallEvent; match?: LiveMatch } {
    const match = this.liveMatches.get(matchId);
    if (!match) return { resolved: false };

    const event = MatchEngine.handleTimeout(match, this.allPlayersMap);
    if (event) {
      if (match.status === 'COMPLETED') {
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
  private onMatchCompleted(match: LiveMatch): void {
    const tournament = this.tournaments.get(match.tournamentId);
    if (!tournament) return;

    const fixture = tournament.fixtures.find(f => f.id === match.fixtureId);
    if (fixture) {
      fixture.status = 'COMPLETED';
      fixture.winnerFranchiseId = match.winnerFranchiseId;
      fixture.matchResultSummary = match.resultSummary;
      fixture.completedAt = Date.now();
    }

    // Update Points Table
    const inn1 = match.innings1;
    const inn2 = match.innings2;

    const updateTeamPoints = (
      fid: IPLTeamId,
      isWinner: boolean,
      isTie: boolean,
      runsScored: number,
      oversBatted: number,
      runsConceded: number,
      oversBowled: number
    ) => {
      let row = tournament.pointsTable.find(p => p.franchiseId === fid);
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

    // Sort Points Table
    tournament.pointsTable.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.nrr !== a.nrr) return b.nrr - a.nrr;
      return b.won - a.won;
    });

    // Update Player Tournament Stats
    const updateStatsFromInnings = (inn: typeof inn1, fid: IPLTeamId) => {
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
            bestBowling: '-',
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
        stat.strikeRate = stat.ballsFaced > 0 ? Number(((stat.runs / stat.ballsFaced) * 100).toFixed(2)) : 0;
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

    // Check Playoff progression
    const allGroupMatchesCompleted = tournament.fixtures
      .filter(f => f.stage === 'GROUP')
      .every(f => f.status === 'COMPLETED');

    if (allGroupMatchesCompleted) {
      tournament.status = 'PLAYOFFS';
      const standings = tournament.pointsTable.map(p => p.franchiseId);
      const playoffFixtures = tournament.fixtures.filter(f => f.stage !== 'GROUP');

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
        // If no more playoffs and final was played, tournament is completed!
        const finalMatch = tournament.fixtures.find(f => f.stage === 'FINAL');
        if (finalMatch && finalMatch.status === 'COMPLETED') {
          tournament.status = 'COMPLETED';
          tournament.winnerFranchiseId = finalMatch.winnerFranchiseId;
          tournament.runnerUpFranchiseId =
            finalMatch.winnerFranchiseId === finalMatch.homeFranchiseId
              ? finalMatch.awayFranchiseId
              : finalMatch.homeFranchiseId;
        }
      }
    }

    tournament.updatedAt = Date.now();
    tournamentStorage.saveTournament(tournament);
  }
}

export const tournamentManager = new TournamentManager();
