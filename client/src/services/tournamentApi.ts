import { IPLTeamId } from '../types';
import {
  Tournament,
  LiveMatch,
  BallEvent,
  WicketPulseChoice,
  HandCricketChoice,
  BowlerAbilityType,
  BatterAbilityType
} from '../tournamentTypes';

const API_BASE = '/api';

export class TournamentApi {
  public static async getTournaments(userId?: string): Promise<Tournament[]> {
    const url = userId ? `${API_BASE}/tournaments?userId=${encodeURIComponent(userId)}` : `${API_BASE}/tournaments`;
    const res = await fetch(url);
    const data = await res.json();
    return data.tournaments || [];
  }

  public static async getTournament(id: string, userId?: string): Promise<Tournament | null> {
    const url = userId ? `${API_BASE}/tournaments/${id}?userId=${encodeURIComponent(userId)}` : `${API_BASE}/tournaments/${id}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.tournament || null;
  }

  public static async deleteTournament(id: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(`${API_BASE}/tournaments/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to delete tournament' };
    }
    return { success: true };
  }

  public static async createTournament(payload: {
    name: string;
    hostId: string;
    hostName: string;
    hostEmail?: string;
    teamsCount: 4 | 6 | 8 | 10;
    matchOvers: 1 | 2 | 5 | 10 | 15 | 20;
    hostFranchiseId: IPLTeamId;
    auctionType?: 'MEGA' | 'MINI';
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

  public static async startAuction(tournamentId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/start-auction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to start tournament auction' };
    }
    return { success: true };
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

  public static async getLiveMatch(matchId: string, franchiseId?: string, userId?: string): Promise<LiveMatch | null> {
    const params = new URLSearchParams();
    if (franchiseId) params.append('franchiseId', franchiseId);
    if (userId) params.append('userId', userId);
    const queryString = params.toString();
    const url = queryString ? `${API_BASE}/matches/${matchId}?${queryString}` : `${API_BASE}/matches/${matchId}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.match || null;
  }

  public static async submitTossCoinFlip(
    matchId: string,
    callerFranchiseId: IPLTeamId,
    call: 'HEADS' | 'TAILS',
    userId?: string
  ): Promise<{ success: boolean; tossWinnerFranchiseId?: IPLTeamId; tossResult?: 'HEADS' | 'TAILS'; match?: LiveMatch; message: string }> {
    const res = await fetch(`${API_BASE}/matches/${matchId}/toss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callerFranchiseId, call, userId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Toss error');
    return data;
  }

  public static async submitTossDecision(
    matchId: string,
    tossWinnerFranchiseId: IPLTeamId,
    decision: 'BAT' | 'BOWL',
    userId?: string
  ): Promise<{ success: boolean; match?: LiveMatch; message: string }> {
    const res = await fetch(`${API_BASE}/matches/${matchId}/toss-decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tossWinnerFranchiseId, decision, userId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Toss decision error');
    return data;
  }

  public static async selectOpeningBatters(
    matchId: string,
    franchiseId: IPLTeamId,
    strikerId: string,
    nonStrikerId: string,
    userId?: string
  ): Promise<{ success: boolean; match?: LiveMatch; message: string }> {
    const res = await fetch(`${API_BASE}/matches/${matchId}/opening-batters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ franchiseId, strikerId, nonStrikerId, userId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Opening batters selection error');
    return data;
  }

  public static async selectOpeningBowler(
    matchId: string,
    franchiseId: IPLTeamId,
    bowlerId: string,
    userId?: string
  ): Promise<{ success: boolean; match?: LiveMatch; message: string }> {
    const res = await fetch(`${API_BASE}/matches/${matchId}/opening-bowler`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ franchiseId, bowlerId, userId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Opening bowler selection error');
    return data;
  }

  public static async selectReplacementBatter(
    matchId: string,
    franchiseId: IPLTeamId,
    replacementBatterId: string,
    userId?: string
  ): Promise<{ success: boolean; match?: LiveMatch; message: string }> {
    const res = await fetch(`${API_BASE}/matches/${matchId}/select-batter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ franchiseId, replacementBatterId, userId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Replacement batter selection error');
    return data;
  }

  public static async selectBowler(
    matchId: string,
    bowlerId: string,
    franchiseId?: IPLTeamId,
    userId?: string
  ): Promise<{ success: boolean; match?: LiveMatch; message: string }> {
    const res = await fetch(`${API_BASE}/matches/${matchId}/select-bowler`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bowlerId, franchiseId, userId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Bowler selection error');
    return data;
  }

  public static async submitToss(
    matchId: string,
    tossWinnerFranchiseId: IPLTeamId,
    decision: 'BAT' | 'BOWL',
    userId?: string
  ): Promise<LiveMatch> {
    const res = await fetch(`${API_BASE}/matches/${matchId}/toss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tossWinnerFranchiseId, decision, userId })
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
      userId?: string;
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
    matchId: string,
    franchiseId?: string,
    userId?: string
  ): Promise<{ resolved: boolean; ballEvent?: BallEvent; match?: LiveMatch }> {
    const res = await fetch(`${API_BASE}/matches/${matchId}/timeout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ franchiseId, userId })
    });
    const data = await res.json();
    if (!res.ok) return { resolved: false };
    return data;
  }
}

