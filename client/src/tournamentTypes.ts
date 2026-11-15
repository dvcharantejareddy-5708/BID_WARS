import { IPLTeamId, Player } from './types';

export type TournamentStatus =
  | 'REGISTRATION'
  | 'AUCTION'
  | 'SQUAD_FINALIZATION'
  | 'TOURNAMENT_LIVE'
  | 'PLAYOFFS'
  | 'COMPLETED';

export type TournamentFormatStage =
  | 'GROUP'
  | 'QUALIFIER_1'
  | 'ELIMINATOR'
  | 'QUALIFIER_2'
  | 'SEMI_FINAL_1'
  | 'SEMI_FINAL_2'
  | 'FINAL';

export type MatchStatus =
  | 'WAITING_FOR_PLAYERS'
  | 'TOSS'
  | 'TOSS_PENDING'
  | 'TOSS_RESOLVED'
  | 'TOSS_DECISION_PENDING'
  | 'OPENING_PLAYER_SELECTION'
  | 'OPENING_BATTERS_SELECTION'
  | 'OPENING_BOWLER_SELECTION'
  | 'DELIVERY_ACTIVE'
  | 'WAITING_FOR_OPPONENT'
  | 'DELIVERY_RESOLVING'
  | 'DELIVERY_RESULT'
  | 'BATTER_SELECTION'
  | 'OVER_COMPLETED'
  | 'BOWLER_SELECTION'
  | 'INNINGS_1'
  | 'INNINGS_BREAK'
  | 'INNINGS_2'
  | 'INNINGS_COMPLETED'
  | 'COMPLETED'
  | 'ABANDONED';

export type WicketPulseChoice = 0 | 1 | 2 | 3 | 4 | 6;
export type HandCricketChoice = WicketPulseChoice;

export type BowlerAbilityType = 'NUMBER_BLOCK' | 'ELITE_NUMBER_BLOCK';
export type BatterAbilityType = 'COMBINATION_SHOT' | 'SECRET_DOUBLE_SHOT';

export interface TournamentMember {
  userId: string;
  userEmail?: string;
  userName: string;
  userAvatar?: string;
  franchiseId: IPLTeamId;
  isHost: boolean;
  joinedAt: number;
}

export interface TournamentTeam {
  franchiseId: IPLTeamId;
  ownerUserId: string;
  ownerUserName: string;
  purseRemaining: number;
  squad: Player[];
  defaultPlayingXI?: {
    playingXI: string[];
    captainId: string;
    viceCaptainId: string;
    impactPlayerId?: string;
  };
}

export interface Fixture {
  id: string;
  tournamentId: string;
  matchNumber: number;
  roundNumber: number;
  stage: TournamentFormatStage;
  homeFranchiseId: IPLTeamId;
  awayFranchiseId: IPLTeamId;
  matchOvers: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  matchId?: string;
  winnerFranchiseId?: IPLTeamId;
  matchResultSummary?: string;
  scheduledAt: number;
  completedAt?: number;
}

export interface MatchLineup {
  franchiseId: IPLTeamId;
  playingXI: string[];
  captainId: string;
  viceCaptainId: string;
  impactPlayerId?: string;
  isLocked: boolean;
  submittedAt: number;
}

export interface BatterInningsScore {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  dismissal?: string;
  ovr: number;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
}

export interface BowlerInningsFigure {
  playerId: string;
  name: string;
  overs: number;
  balls: number;
  maidens: number;
  runs: number;
  wickets: number;
  ovr: number;
  maxOversAllowed: number;
  abilityUsedInCurrentOver?: boolean;
}

export interface InningsState {
  inningsNumber: 1 | 2;
  battingFranchiseId: IPLTeamId;
  bowlingFranchiseId: IPLTeamId;
  totalRuns: number;
  totalWickets: number;
  oversCompleted: number;
  ballsInCurrentOver: number;
  targetRuns?: number;
  activeBatterId: string;
  nonStrikerId?: string;
  activeBowlerId: string;
  previousOverBowlerId?: string;
  batterAbilityUsedInCurrentOver?: boolean;
  battingOrder: string[];
  nextBatterIndex: number;
  batters: Record<string, BatterInningsScore>;
  bowlers: Record<string, BowlerInningsFigure>;
  fallOfWickets: { wicket: number; runs: number; overStr: string; playerOutName: string }[];
  isCompleted: boolean;
}

export interface BallEvent {
  id: string;
  matchId: string;
  tournamentId: string;
  innings: 1 | 2;
  overNumber: number;
  ballNumber: number;
  batterId: string;
  batterName: string;
  batterOvr: number;
  bowlerId: string;
  bowlerName: string;
  bowlerOvr: number;
  ovrDiff: number;
  bowlerAbilityUsed?: BowlerAbilityType;
  batterAbilityUsed?: BatterAbilityType;
  blockedNumbers?: number[];
  batterInput: HandCricketChoice;
  bowlerInput: HandCricketChoice;
  isWicket: boolean;
  dismissalType?: string;
  runsScored: number;
  totalRunsAfter: number;
  wicketsAfter: number;
  commentary: string;
  timestamp: number;
}

export interface DeliveryResultSummary {
  ballNumber: number;
  overNumber: number;
  batterName: string;
  bowlerName: string;
  batterInput: number;
  bowlerInput: number;
  runsScored: number;
  isWicket: boolean;
  commentary: string;
  timestamp: number;
}

export interface LiveMatch {
  id: string;
  tournamentId: string;
  fixtureId: string;
  homeFranchiseId: IPLTeamId;
  awayFranchiseId: IPLTeamId;
  matchOvers: number;
  maxBowlerOvers: number;
  status: MatchStatus;
  tossCallerFranchiseId?: IPLTeamId;
  tossCall?: 'HEADS' | 'TAILS';
  tossResult?: 'HEADS' | 'TAILS';
  tossWinnerFranchiseId?: IPLTeamId;
  tossLoserFranchiseId?: IPLTeamId;
  tossDecision?: 'BAT' | 'BOWL';
  // Explicit snake_case fields required by specification
  toss_winner_team_id?: IPLTeamId;
  toss_loser_team_id?: IPLTeamId;
  toss_choice?: 'BAT' | 'BOWL' | 'HEADS' | 'TAILS';
  batting_team_id?: IPLTeamId;
  bowling_team_id?: IPLTeamId;
  current_match_phase?: MatchStatus;
  openingSelections?: {
    battingConfirmed?: boolean;
    bowlingConfirmed?: boolean;
  };
  selectionDeadline?: number;
  lastDeliveryResult?: DeliveryResultSummary;
  currentInnings: 1 | 2;
  innings1: InningsState;
  innings2?: InningsState;
  targetRuns?: number;
  lineups: Record<IPLTeamId, MatchLineup>;
  pendingInputs: {
    turnExpiresAt?: number;
    turnStartTime?: number;
    batterChoice?: HandCricketChoice;
    bowlerChoice?: HandCricketChoice;
    batterAbility?: BatterAbilityType;
    bowlerAbility?: BowlerAbilityType;
    blockedNumbers?: number[];
  };
  impactPlayersUsed: Record<IPLTeamId, boolean>;
  ballHistory: BallEvent[];
  winnerFranchiseId?: IPLTeamId;
  resultSummary?: string;
  mvpPlayerId?: string;
  // Role & viewer specific fields injected by server
  viewerFranchiseId?: IPLTeamId;
  viewerRole?: 'BATTING' | 'BOWLING' | 'SPECTATOR';
  isViewerTossWinner?: boolean;
  isViewerBattingTeam?: boolean;
  isViewerBowlingTeam?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PointsTableRow {
  franchiseId: IPLTeamId;
  played: number;
  won: number;
  lost: number;
  tied: number;
  nr: number;
  points: number;
  runsScored: number;
  oversBatted: number;
  runsConceded: number;
  oversBowled: number;
  nrr: number;
}

export interface PlayerTournamentStats {
  playerId: string;
  name: string;
  franchiseId: IPLTeamId;
  matchesPlayed: number;
  inningsBatted: number;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  highestScore: number;
  strikeRate: number;
  oversBowled: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  economyRate: number;
  bestBowling: string;
  mvpPoints: number;
}

export type TournamentAuctionType = 'MEGA' | 'MINI';

export interface Tournament {
  id: string;
  code?: string;
  name: string;
  hostId: string;
  hostName: string;
  status: TournamentStatus;
  auctionType?: TournamentAuctionType; // 'MEGA' (532 players) | 'MINI' (359 players)
  teamsCount: 4 | 6 | 8 | 10;
  matchOvers: 1 | 2 | 5 | 10 | 15 | 20;
  roomCode: string;
  members: TournamentMember[];
  teams: Partial<Record<IPLTeamId, TournamentTeam>>;
  fixtures: Fixture[];
  pointsTable: PointsTableRow[];
  playerStats: Record<string, PlayerTournamentStats>;
  winnerFranchiseId?: IPLTeamId;
  runnerUpFranchiseId?: IPLTeamId;
  createdAt: number;
  updatedAt: number;
}

