import { IPLTeamId } from '../types';
import {
  Tournament,
  LiveMatch,
  BallEvent,
  HandCricketChoice,
  BowlerAbilityType,
  BatterAbilityType
} from '../tournamentTypes';

const API_BASE = '/api';

export class TournamentApi {
  public static async getTournaments(): Promise<Tournament[]> {
    const res = await fetch(`${API_BASE}/tournaments`);
    const data = await res.json();
    return data.tournaments || [];
  }

  public static async getTournament(id: string): Promise<Tournament | null> {
    const res = await fetch(`${API_BASE}/tournaments/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.tournament || null;
  }

  public static async createTournament(payload: {
    name: string;
    hostId: string;
    hostName: string;
    hostEmail?: string;
    teamsCount: 4 | 6 | 8 | 10;
    matchOvers: 1 | 2 | 5 | 10 | 15 | 20;
    hostFranchiseId: IPLTeamId;
  }): Promise<Tournament> {
    const res = await fetch(`${API_BASE}/tournaments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create tournament');
    return data.tournament;
  }

  public static async joinTournament(
    tournamentId: string,
    payload: {
      userId: string;
      userName: string;
      userEmail?: string;
      franchiseId: IPLTeamId;
    }
  ): Promise<{ success: boolean; tournament?: Tournament; error?: string }> {
    const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to join tournament' };
    }
    return { success: true, tournament: data.tournament };
  }

  public static async startAuction(tournamentId: string, userId: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/start-auction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    return res.ok;
  }

  public static async importAuctionSquads(tournamentId: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/import-auction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    return res.ok;
  }

  public static async startLiveTournament(tournamentId: string, userId: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/start-live`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    return res.ok;
  }

  public static async saveLineup(
    tournamentId: string,
    payload: {
      franchiseId: IPLTeamId;
      userId: string;
      lineup: { playingXI: string[]; captainId: string; viceCaptainId: string; impactPlayerId?: string };
    }
  ): Promise<boolean> {
    const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/lineup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  }

  public static async startMatch(tournamentId: string, fixtureId: string, userId: string): Promise<LiveMatch> {
    const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/matches/${fixtureId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to start match');
    return data.match;
  }

  public static async getLiveMatch(matchId: string): Promise<LiveMatch | null> {
    const res = await fetch(`${API_BASE}/matches/${matchId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.match || null;
  }

  public static async submitToss(
    matchId: string,
    tossWinnerFranchiseId: IPLTeamId,
    decision: 'BAT' | 'BOWL'
  ): Promise<LiveMatch> {
    const res = await fetch(`${API_BASE}/matches/${matchId}/toss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tossWinnerFranchiseId, decision })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Toss error');
    return data.match;
  }

  public static async submitChoice(
    matchId: string,
    payload: {
      franchiseId: IPLTeamId;
      choice: HandCricketChoice;
      ability?: BowlerAbilityType | BatterAbilityType;
      blockedNumbers?: number[];
    }
  ): Promise<{ resolved: boolean; ballEvent?: BallEvent; match?: LiveMatch; error?: string }> {
    const res = await fetch(`${API_BASE}/matches/${matchId}/choice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) return { resolved: false, error: data.error };
    return data;
  }

  public static async triggerTimeout(
    matchId: string
  ): Promise<{ resolved: boolean; ballEvent?: BallEvent; match?: LiveMatch }> {
    const res = await fetch(`${API_BASE}/matches/${matchId}/timeout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    return await res.json();
  }
}

