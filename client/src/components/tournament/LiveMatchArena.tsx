import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Trophy,
  Clock,
  Zap,
  Shield,
  Flame,
  FileText,
  AlertCircle,
  Eye,
  CheckCircle2,
  Sparkles,
  Users,
  ChevronRight,
  ChevronDown,
  Lock,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { IPLTeamId, IPL_FRANCHISES, Player } from '../../types';
import { AuthUser } from '../../services/auth';
import {
  LiveMatch,
  Tournament,
  WicketPulseChoice,
  HandCricketChoice,
  BowlerAbilityType,
  BatterAbilityType
} from '../../tournamentTypes';
import { TournamentApi } from '../../services/tournamentApi';
import { OvrBadge } from '../OvrBadge';
import { HeaderBackButton } from '../common/HeaderBackButton';
import { ScorecardModal } from './ScorecardModal';

interface LiveMatchArenaProps {
  initialMatch: LiveMatch;
  user: AuthUser;
  tournamentId: string;
  tournament?: Tournament;
  onExit: () => void;
}

export const LiveMatchArena: React.FC<LiveMatchArenaProps> = ({
  initialMatch,
  user,
  tournamentId,
  tournament,
  onExit
}) => {
  const [match, setMatch] = useState<LiveMatch>(initialMatch);
  const [selectedChoice, setSelectedChoice] = useState<WicketPulseChoice | null>(null);
  const [activeBowlerAbility, setActiveBowlerAbility] = useState<BowlerAbilityType | null>(null);
  const [activeBatterAbility, setActiveBatterAbility] = useState<BatterAbilityType | null>(null);
  const [selectedBlockedNumbers, setSelectedBlockedNumbers] = useState<number[]>([]);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isSquadPanelOpen, setIsSquadPanelOpen] = useState(false);
  const [activeSquadTab, setActiveSquadTab] = useState<'HOME' | 'AWAY'>('HOME');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScorecardOpen, setIsScorecardOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inn = match.currentInnings === 1 ? match.innings1 : match.innings2;

  // Build full player lookup map from tournament squads
  const playerMap = useMemo(() => {
    const map = new Map<string, Player>();
    if (tournament && tournament.teams) {
      for (const t of Object.values(tournament.teams)) {
        if (t && t.squad) {
          for (const p of t.squad) {
            if (p && p.id) map.set(p.id, p);
          }
        }
      }
    }
    return map;
  }, [tournament]);

  // Identify user role and permissions in match
  const homeOwnerId = tournament?.teams[match.homeFranchiseId]?.ownerUserId;
  const awayOwnerId = tournament?.teams[match.awayFranchiseId]?.ownerUserId;
  const battingOwnerId = tournament && inn ? tournament.teams[inn.battingFranchiseId]?.ownerUserId : undefined;
  const bowlingOwnerId = tournament && inn ? tournament.teams[inn.bowlingFranchiseId]?.ownerUserId : undefined;

  const isHost = tournament ? user.id === tournament.hostId : false;
  const isHomeOwner = user.id === homeOwnerId;
  const isAwayOwner = user.id === awayOwnerId;
  const isBattingOwner = user.id === battingOwnerId;
  const isBowlingOwner = user.id === bowlingOwnerId;
  const isParticipant = isHomeOwner || isAwayOwner || isHost || !tournament;
  const isSpectator = !isParticipant;
  const canMakeTossDecision = isHomeOwner || isHost || !tournament;

  // My current franchise in this match
  const myFranchiseId: IPLTeamId = useMemo(() => {
    if (isBattingOwner) return inn?.battingFranchiseId || match.homeFranchiseId;
    if (isBowlingOwner) return inn?.bowlingFranchiseId || match.awayFranchiseId;
    if (isHomeOwner) return match.homeFranchiseId;
    if (isAwayOwner) return match.awayFranchiseId;
    return inn?.battingFranchiseId || match.homeFranchiseId;
  }, [isBattingOwner, isBowlingOwner, isHomeOwner, isAwayOwner, inn, match]);

  // Real-time polling / sync with server for live match state
  useEffect(() => {
    const interval = setInterval(async () => {
      if (match.status === 'COMPLETED') return;
      try {
        const updated = await TournamentApi.getLiveMatch(match.id, myFranchiseId);
        if (updated) {
          setMatch(updated);
        }
      } catch {}
    }, 1200);

    return () => clearInterval(interval);
  }, [match.id, match.status, myFranchiseId]);

  // Turn Timer countdown
  useEffect(() => {
    if (match.status === 'COMPLETED' || match.status === 'TOSS') return;

    const timer = setInterval(() => {
      const expiresAt = match.pendingInputs?.turnExpiresAt || 0;
      if (expiresAt > 0) {
        const diff = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
        setSecondsRemaining(diff);

        if (diff <= 0 && !isSubmitting) {
          TournamentApi.triggerTimeout(match.id, myFranchiseId).then(res => {
            if (res.match) {
              setMatch(res.match);
              setSelectedChoice(null);
            }
          });
        }
      }
    }, 500);

    return () => clearInterval(timer);
  }, [match.id, match.pendingInputs?.turnExpiresAt, match.status, isSubmitting, myFranchiseId]);

  // Trigger celebration on match completed
  useEffect(() => {
    if (match.status === 'COMPLETED') {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}
    }
  }, [match.status]);

  // WicketPulse Choice Submission
  const handleSubmitPick = async (choice: WicketPulseChoice) => {
    if (isSubmitting || match.status === 'COMPLETED' || isSpectator) return;
    setIsSubmitting(true);
    setError(null);
    setSelectedChoice(choice);

    try {
      const res = await TournamentApi.submitChoice(match.id, {
        franchiseId: myFranchiseId,
        choice,
        ability: activeBowlerAbility || activeBatterAbility || undefined,
        blockedNumbers: selectedBlockedNumbers.length === 3 ? selectedBlockedNumbers : undefined
      });

      if (res.error) {
        setError(res.error);
      } else if (res.match) {
        setMatch(res.match);
        if (res.resolved) {
          setSelectedChoice(null);
          setActiveBowlerAbility(null);
          setActiveBatterAbility(null);
          setSelectedBlockedNumbers([]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error submitting delivery choice');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toss Handler
  const handleTossDecision = async (decision: 'BAT' | 'BOWL') => {
    try {
      const res = await TournamentApi.submitToss(match.id, match.homeFranchiseId, decision);
      setMatch(res);
    } catch (err: any) {
      setError(err.message || 'Toss error');
    }
  };

  if (!inn) return null;

  const battingF = IPL_FRANCHISES[inn.battingFranchiseId];
  const bowlingF = IPL_FRANCHISES[inn.bowlingFranchiseId];
  const homeF = IPL_FRANCHISES[match.homeFranchiseId];
  const awayF = IPL_FRANCHISES[match.awayFranchiseId];

  const activeBatter = inn.batters[inn.activeBatterId];
  const nonStriker = inn.nonStrikerId ? inn.batters[inn.nonStrikerId] : undefined;
  const activeBowler = inn.bowlers[inn.activeBowlerId];

  const strikerPlayer = playerMap.get(inn.activeBatterId);
  const nonStrikerPlayer = inn.nonStrikerId ? playerMap.get(inn.nonStrikerId) : undefined;
  const bowlerPlayer = playerMap.get(inn.activeBowlerId);

  // OVR Difference Calculation
  const batterOvr = activeBatter?.ovr || strikerPlayer?.ovr || 75;
  const bowlerOvr = activeBowler?.ovr || bowlerPlayer?.ovr || 75;
  const bowlerAdv = bowlerOvr - batterOvr;
  const batterAdv = batterOvr - bowlerOvr;

  const currentRunRate =
    inn.oversCompleted > 0 || inn.ballsInCurrentOver > 0
      ? (inn.totalRuns / (inn.oversCompleted + inn.ballsInCurrentOver / 6)).toFixed(2)
      : '0.00';

  const requiredRuns = inn.targetRuns ? inn.targetRuns - inn.totalRuns : 0;
  const remainingBalls = match.matchOvers * 6 - (inn.oversCompleted * 6 + inn.ballsInCurrentOver);
  const requiredRunRate =
    remainingBalls > 0 && inn.targetRuns
      ? (requiredRuns / (remainingBalls / 6)).toFixed(2)
      : '0.00';

  // Submission statuses
  const pending = match.pendingInputs || {};
  const hasMyChoiceLocked =
    selectedChoice !== null ||
    (isBattingOwner && (pending as any).hasBatterSubmitted) ||
    (isBowlingOwner && (pending as any).hasBowlerSubmitted);

  return (
    <div className="min-h-screen bg-[#07080F] text-white flex flex-col font-sans select-none">
      {/* 1. TOP BROADCAST HEADER */}
      <header className="bg-[#0D0E1A] border-b border-[#1E2246] px-4 md:px-8 py-2.5 shrink-0 flex items-center justify-between sticky top-0 z-30 shadow-lg">
        <div className="flex items-center gap-3">
          <HeaderBackButton label="Tournament Hub" onClick={onExit} />
          <div className="h-5 w-px bg-[#1E2246] hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-black text-sm uppercase tracking-wider text-white">
                {homeF.shortName} <span className="text-gray-500 font-normal">vs</span> {awayF.shortName}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#C8FF3D]/10 text-[#C8FF3D] border border-[#C8FF3D]/30">
                {match.status}
              </span>
            </div>
            <div className="text-[11px] text-gray-400 font-medium">
              {match.matchOvers} Overs Format • Innings {match.currentInnings}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSquadPanelOpen(!isSquadPanelOpen)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-heading font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isSquadPanelOpen
                ? 'bg-[#C8FF3D] border-[#C8FF3D] text-[#0A0B14]'
                : 'bg-[#12142A] border-[#2A2F60] text-gray-300 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Playing XIs & Squads</span>
          </button>

          <button
            onClick={() => setIsScorecardOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[#12142A] border border-[#2A2F60] text-gray-300 hover:text-white text-xs font-heading font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#C8FF3D]" />
            <span>Scorecard</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="p-3 bg-red-500/10 border-b border-red-500/30 text-red-400 text-xs flex items-center justify-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. MAIN MATCH CONTENT CONTAINER */}
      <div className="grow max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col justify-between space-y-6">
        {/* TOSS STATE OVERLAY */}
        {match.status === 'TOSS' && (
          <div className="my-auto bg-[#12142A] border border-[#2A2F60] rounded-3xl p-8 text-center max-w-lg mx-auto shadow-2xl animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-[#FFC93D]/10 border border-[#FFC93D]/30 text-[#FFC93D] flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-heading font-black uppercase tracking-wider mb-2 text-white">
              Match Toss Ceremony
            </h2>
            <p className="text-xs text-gray-400 mb-6">
              <span className="text-[#FFC93D] font-bold">{IPL_FRANCHISES[match.homeFranchiseId].name}</span> has won the toss.
            </p>
            {canMakeTossDecision ? (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleTossDecision('BAT')}
                  className="py-4 rounded-2xl bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] font-heading font-black uppercase text-sm tracking-wider shadow-[0_0_20px_rgba(200,255,61,0.3)] hover:scale-102 transition-all cursor-pointer"
                >
                  Bat First 🏏
                </button>
                <button
                  onClick={() => handleTossDecision('BOWL')}
                  className="py-4 rounded-2xl bg-[#7C5CFF] hover:bg-[#6A48F5] text-white font-heading font-black uppercase text-sm tracking-wider shadow-[0_0_20px_rgba(124,92,255,0.3)] hover:scale-102 transition-all cursor-pointer"
                >
                  Bowl First 🎯
                </button>
              </div>
            ) : (
              <div className="p-4 bg-[#0A0B14] border border-[#1E2246] rounded-2xl text-center space-y-1">
                <span className="text-xs font-bold text-[#FFC93D] uppercase tracking-wider block">
                  Awaiting Host Decision
                </span>
                <p className="text-xs text-gray-400">
                  Waiting for {IPL_FRANCHISES[match.homeFranchiseId].name} captain to choose to Bat or Bowl first.
                </p>
              </div>
            )}
          </div>
        )}

        {/* MATCH COMPLETED VIEW */}
        {match.status === 'COMPLETED' && (
          <div className="my-auto bg-[#12142A] border border-[#C8FF3D]/40 rounded-3xl p-8 text-center max-w-xl mx-auto shadow-[0_0_40px_rgba(200,255,61,0.15)] animate-fade-in space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#C8FF3D]/20 text-[#C8FF3D] flex items-center justify-center mx-auto border border-[#C8FF3D]/50 shadow-[0_0_20px_rgba(200,255,61,0.3)]">
              <Trophy className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-heading font-black uppercase tracking-wider text-white">
              {match.resultSummary || 'Match Completed!'}
            </h2>
            <div className="p-4 bg-[#0A0B14] border border-[#1E2246] rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-gray-300">
                <span>{IPL_FRANCHISES[match.innings1.battingFranchiseId].name}</span>
                <span className="text-white font-number text-base font-black">
                  {match.innings1.totalRuns}/{match.innings1.totalWickets}{' '}
                  <span className="text-xs text-gray-400">({match.innings1.oversCompleted}.{match.innings1.ballsInCurrentOver} ov)</span>
                </span>
              </div>
              {match.innings2 && (
                <div className="flex items-center justify-between text-xs font-bold text-gray-300 pt-2 border-t border-[#1E2246]">
                  <span>{IPL_FRANCHISES[match.innings2.battingFranchiseId].name}</span>
                  <span className="text-white font-number text-base font-black">
                    {match.innings2.totalRuns}/{match.innings2.totalWickets}{' '}
                    <span className="text-xs text-gray-400">({match.innings2.oversCompleted}.{match.innings2.ballsInCurrentOver} ov)</span>
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                onClick={() => setIsScorecardOpen(true)}
                className="px-6 py-3 rounded-xl bg-[#1E2246] hover:bg-[#282E5C] border border-[#2A2F60] text-white font-heading font-bold text-xs uppercase tracking-wider hover:border-[#C8FF3D] transition-all cursor-pointer"
              >
                View Full Scorecard
              </button>
              <button
                onClick={onExit}
                className="px-6 py-3 rounded-xl bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] font-heading font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(200,255,61,0.25)] transition-all cursor-pointer"
              >
                Back to Tournament Hub
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE INNINGS BOARD */}
        {(match.status === 'INNINGS_1' || match.status === 'INNINGS_2') && (
          <>
            {/* 3. BROADCAST SCOREBOARD RIBBON */}
            <div className="bg-[#12142A] border border-[#2A2F60] rounded-3xl p-5 shadow-2xl relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-6">
                {/* Batting Team Giant Score */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#0A0B14] border border-[#2A2F60] p-1 flex items-center justify-center shrink-0 shadow-md">
                    <img
                      src={battingF.logoUrl}
                      alt={battingF.name}
                      className="w-full h-full object-contain"
                      onError={e => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl md:text-5xl font-heading font-black text-white tracking-tight">
                        {inn.totalRuns}<span className="text-gray-400 text-3xl md:text-4xl">/{inn.totalWickets}</span>
                      </span>
                      <span className="text-sm md:text-base font-bold text-gray-400">
                        ({inn.oversCompleted}.{inn.ballsInCurrentOver}/{match.matchOvers} ov)
                      </span>
                    </div>
                    <div className="text-xs text-gray-300 font-medium flex flex-wrap items-center gap-3 mt-1">
                      <span className="text-white font-bold">{battingF.name}</span>
                      <span>•</span>
                      <span>CRR: <span className="text-[#C8FF3D] font-bold">{currentRunRate}</span></span>
                      {inn.targetRuns && (
                        <>
                          <span>•</span>
                          <span>Target: <span className="text-white font-bold">{inn.targetRuns}</span></span>
                          <span>•</span>
                          <span>
                            Need <span className="text-[#FF3B5C] font-bold">{Math.max(0, requiredRuns)}</span> from{' '}
                            <span className="text-white font-bold">{Math.max(0, remainingBalls)}b</span> (RRR: {requiredRunRate})
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Turn Timer & Opponent Info */}
                <div className="flex items-center gap-5">
                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Bowling Team</span>
                    <span className="text-xs font-bold text-white font-heading">{bowlingF.name}</span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[#0A0B14] border border-[#2A2F60] p-1 items-center justify-center shrink-0 shadow-md hidden sm:flex">
                    <img
                      src={bowlingF.logoUrl}
                      alt={bowlingF.name}
                      className="w-full h-full object-contain"
                      onError={e => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div
                    className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl border transition-all ${
                      secondsRemaining <= 5
                        ? 'border-[#FF3B5C] bg-[#FF3B5C]/15 text-[#FF3B5C] shadow-[0_0_15px_rgba(255,59,92,0.3)] animate-pulse'
                        : 'border-[#C8FF3D]/40 bg-[#C8FF3D]/5 text-[#C8FF3D]'
                    }`}
                  >
                    <span className="text-xl font-heading font-black leading-none">{secondsRemaining}</span>
                    <span className="text-[9px] uppercase font-bold tracking-tighter opacity-80">SEC</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. CENTRAL DUEL ARENA: STRIKER vs BOWLER vs NON-STRIKER */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* STRIKER ON BAT (5 cols) */}
              <div className="md:col-span-5 bg-[#12142A] border border-[#2A2F60] rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#1E2246] mb-4">
                    <span className="text-xs font-heading font-black uppercase tracking-wider text-[#C8FF3D] flex items-center gap-1.5">
                      <Zap className="w-4 h-4 fill-current" /> Striker on Strike
                    </span>
                    <OvrBadge ovr={batterOvr} size="sm" />
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#0A0B14] border border-[#23274D] overflow-hidden flex items-center justify-center shrink-0 shadow-md">
                      {strikerPlayer?.image_url ? (
                        <img
                          src={strikerPlayer.image_url}
                          alt={activeBatter?.name || 'Batter'}
                          className="w-full h-full object-cover object-top"
                          onError={e => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="font-heading font-black text-sm text-[#C8FF3D]">
                          {(activeBatter?.name || 'BAT').slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-heading font-black text-white truncate max-w-[200px]">
                        {activeBatter?.name || 'Striker'}
                      </h3>
                      <div className="text-[11px] text-gray-400 mt-1 font-medium">
                        Score: <span className="text-white font-bold font-number">{activeBatter?.runs || 0}</span> ({activeBatter?.balls || 0}b) • 4s: {activeBatter?.fours || 0} • 6s: {activeBatter?.sixes || 0}
                      </div>
                      <div className="text-[10px] text-[#C8FF3D] font-bold mt-0.5">
                        SR: {activeBatter && activeBatter.balls > 0 ? ((activeBatter.runs / activeBatter.balls) * 100).toFixed(1) : '0.0'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Batter Special Ability Trigger */}
                {batterAdv >= 3 && (
                  <div className="mt-4 pt-3 border-t border-[#1E2246]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-gray-400 uppercase font-heading font-black">
                        ⭐ Batting OVR Advantage ({batterAdv > 0 ? `+${batterAdv}` : batterAdv} OVR)
                      </span>
                      {inn.batterAbilityUsedInCurrentOver && (
                        <span className="text-[9px] uppercase font-bold text-gray-500">Used in Over</span>
                      )}
                    </div>

                    {batterAdv >= 8 ? (
                      <button
                        type="button"
                        disabled={inn.batterAbilityUsedInCurrentOver || isSpectator || hasMyChoiceLocked}
                        onClick={() =>
                          setActiveBatterAbility(activeBatterAbility === 'SECRET_DOUBLE_SHOT' ? null : 'SECRET_DOUBLE_SHOT')
                        }
                        className={`w-full py-2 px-3 rounded-xl text-xs font-heading font-black uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          inn.batterAbilityUsedInCurrentOver
                            ? 'bg-[#1E2246] text-gray-600 border border-gray-800 cursor-not-allowed'
                            : activeBatterAbility === 'SECRET_DOUBLE_SHOT'
                            ? 'bg-[#FF3B5C] text-white shadow-[0_0_15px_rgba(255,59,92,0.4)]'
                            : 'bg-[#1E2246] text-[#FF3B5C] border border-[#FF3B5C]/40 hover:border-[#FF3B5C]'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>{activeBatterAbility === 'SECRET_DOUBLE_SHOT' ? '✓ 2X Secret Multiplier Active' : 'Activate 2X Secret Multiplier'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={inn.batterAbilityUsedInCurrentOver || isSpectator || hasMyChoiceLocked}
                        onClick={() =>
                          setActiveBatterAbility(activeBatterAbility === 'COMBINATION_SHOT' ? null : 'COMBINATION_SHOT')
                        }
                        className={`w-full py-2 px-3 rounded-xl text-xs font-heading font-black uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          inn.batterAbilityUsedInCurrentOver
                            ? 'bg-[#1E2246] text-gray-600 border border-gray-800 cursor-not-allowed'
                            : activeBatterAbility === 'COMBINATION_SHOT'
                            ? 'bg-[#7C5CFF] text-white shadow-[0_0_15px_rgba(124,92,255,0.4)]'
                            : 'bg-[#1E2246] text-[#7C5CFF] border border-[#7C5CFF]/40 hover:border-[#7C5CFF]'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>{activeBatterAbility === 'COMBINATION_SHOT' ? '✓ Bonus Shot Active' : 'Activate Bonus Shot'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* NON-STRIKER CARD (2 cols on md+) */}
              <div className="md:col-span-2 bg-[#12142A] border border-[#2A2F60] rounded-3xl p-4 relative overflow-hidden flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#1E2246] mb-3">
                    <span className="text-[10px] font-heading font-black uppercase tracking-wider text-gray-400">
                      Non-Striker
                    </span>
                    {nonStriker && <OvrBadge ovr={nonStriker.ovr || 75} size="xs" />}
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-xl bg-[#0A0B14] border border-[#23274D] overflow-hidden flex items-center justify-center shrink-0 mb-2 shadow-sm">
                      {nonStrikerPlayer?.image_url ? (
                        <img
                          src={nonStrikerPlayer.image_url}
                          alt={nonStriker?.name || 'Non-Striker'}
                          className="w-full h-full object-cover object-top"
                          onError={e => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="font-heading font-black text-xs text-gray-400">
                          {(nonStriker?.name || 'NS').slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-heading font-bold text-white truncate max-w-full">
                      {nonStriker?.name || 'Non-Striker'}
                    </h4>
                    <span className="text-[10px] text-gray-400 font-number mt-0.5">
                      {nonStriker?.runs || 0}* ({nonStriker?.balls || 0}b)
                    </span>
                  </div>
                </div>

                <div className="text-[9px] text-center text-gray-500 uppercase font-bold pt-2 border-t border-[#1E2246]">
                  Rotates on Odd Runs
                </div>
              </div>

              {/* CURRENT BOWLER (5 cols) */}
              <div className="md:col-span-5 bg-[#12142A] border border-[#2A2F60] rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#1E2246] mb-4">
                    <span className="text-xs font-heading font-black uppercase tracking-wider text-[#FF3B5C] flex items-center gap-1.5">
                      <Shield className="w-4 h-4 fill-current" /> Active Bowler
                    </span>
                    <OvrBadge ovr={bowlerOvr} size="sm" />
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#0A0B14] border border-[#23274D] overflow-hidden flex items-center justify-center shrink-0 shadow-md">
                      {bowlerPlayer?.image_url ? (
                        <img
                          src={bowlerPlayer.image_url}
                          alt={activeBowler?.name || 'Bowler'}
                          className="w-full h-full object-cover object-top"
                          onError={e => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="font-heading font-black text-sm text-[#FF3B5C]">
                          {(activeBowler?.name || 'BWL').slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-heading font-black text-white truncate max-w-[200px]">
                        {activeBowler?.name || 'Bowler'}
                      </h3>
                      <div className="text-[11px] text-gray-400 mt-1 font-medium">
                        Figures: <span className="text-white font-bold font-number">{activeBowler?.wickets || 0} wkts</span> for <span className="text-white font-bold font-number">{activeBowler?.runs || 0}</span> ({activeBowler?.overs || 0}.{activeBowler?.balls || 0} ov)
                      </div>
                      <div className="text-[10px] text-[#FF3B5C] font-bold mt-0.5">
                        Quota: {activeBowler?.overs || 0}/{activeBowler?.maxOversAllowed || match.maxBowlerOvers} overs max
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bowler Special Ability Trigger */}
                {bowlerAdv >= 3 && (
                  <div className="mt-4 pt-3 border-t border-[#1E2246]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-gray-400 uppercase font-heading font-black">
                        🛡️ Bowling OVR Advantage ({bowlerAdv > 0 ? `+${bowlerAdv}` : bowlerAdv} OVR)
                      </span>
                      {activeBowler?.abilityUsedInCurrentOver && (
                        <span className="text-[9px] uppercase font-bold text-gray-500">Used in Over</span>
                      )}
                    </div>

                    {bowlerAdv >= 8 ? (
                      <button
                        type="button"
                        disabled={activeBowler?.abilityUsedInCurrentOver || isSpectator || hasMyChoiceLocked}
                        onClick={() =>
                          setActiveBowlerAbility(activeBowlerAbility === 'ELITE_NUMBER_BLOCK' ? null : 'ELITE_NUMBER_BLOCK')
                        }
                        className={`w-full py-2 px-3 rounded-xl text-xs font-heading font-black uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          activeBowler?.abilityUsedInCurrentOver
                            ? 'bg-[#1E2246] text-gray-600 border border-gray-800 cursor-not-allowed'
                            : activeBowlerAbility === 'ELITE_NUMBER_BLOCK'
                            ? 'bg-[#FF3B5C] text-white shadow-[0_0_15px_rgba(255,59,92,0.4)]'
                            : 'bg-[#1E2246] text-[#FF3B5C] border border-[#FF3B5C]/40 hover:border-[#FF3B5C]'
                        }`}
                      >
                        <Shield className="w-3.5 h-3.5 fill-current" />
                        <span>{activeBowlerAbility === 'ELITE_NUMBER_BLOCK' ? '✓ Pace Barrage Active (Only 4 & 6 enabled)' : 'Pace Barrage (Allow Only 4 & 6)'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={activeBowler?.abilityUsedInCurrentOver || isSpectator || hasMyChoiceLocked}
                        onClick={() => setIsBlockModalOpen(true)}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-heading font-black uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          activeBowler?.abilityUsedInCurrentOver
                            ? 'bg-[#1E2246] text-gray-600 border border-gray-800 cursor-not-allowed'
                            : activeBowlerAbility === 'NUMBER_BLOCK'
                            ? 'bg-[#FFC93D] text-[#0A0B14] shadow-[0_0_15px_rgba(255,201,61,0.4)]'
                            : 'bg-[#1E2246] text-[#FFC93D] border border-[#FFC93D]/40 hover:border-[#FFC93D]'
                        }`}
                      >
                        <Shield className="w-3.5 h-3.5 fill-current" />
                        <span>
                          {activeBowlerAbility === 'NUMBER_BLOCK'
                            ? `✓ 3 Numbers Blocked: [${selectedBlockedNumbers.join(', ')}]`
                            : 'Block Exactly 3 Scoring Numbers'}
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 5. HAND-CRICKET SCORING CONTROLS */}
            {isSpectator ? (
              <div className="bg-[#12142A] border border-[#2A2F60] rounded-3xl p-6 text-center space-y-2 shadow-2xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7C5CFF]/15 text-[#7C5CFF] border border-[#7C5CFF]/30 text-xs font-heading font-black uppercase tracking-wider">
                  <Eye className="w-4 h-4" /> Live Spectator Mode
                </div>
                <h3 className="font-heading font-black text-base uppercase text-white">
                  Live WicketPulse Duel: {battingF.shortName} vs {bowlingF.shortName}
                </h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  Managers are submitting their delivery selections simultaneously in real-time. Score updates authoritatively upon resolution.
                </p>
              </div>
            ) : (
              <div className="bg-[#12142A] border border-[#2A2F60] rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-heading font-black uppercase tracking-wider text-white">
                      {isBattingOwner ? '🏏 Select Batting Number' : '🎯 Select Bowling Delivery Number'}
                    </span>
                    {hasMyChoiceLocked && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#C8FF3D]/10 text-[#C8FF3D] border border-[#C8FF3D]/30 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Locked
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-400">
                    Hand-Cricket Rule: <span className="text-white font-bold">Same Number = WICKET</span> • <span className="text-[#C8FF3D] font-bold">Different = RUNS SCORED</span>
                  </span>
                </div>

                {/* 6 Scoring Option Buttons */}
                <div className="grid grid-cols-6 gap-3">
                  {([0, 1, 2, 3, 4, 6] as WicketPulseChoice[]).map(num => {
                    const isBlocked = match.pendingInputs?.blockedNumbers?.includes(num);
                    const isSelected = selectedChoice === num;

                    return (
                      <button
                        key={num}
                        type="button"
                        disabled={isBlocked || isSubmitting || hasMyChoiceLocked}
                        onClick={() => handleSubmitPick(num)}
                        className={`h-22 rounded-2xl font-heading font-black text-2xl md:text-3xl border transition-all flex flex-col items-center justify-center relative cursor-pointer ${
                          isBlocked
                            ? 'bg-red-950/20 border-red-900/40 text-red-500/40 cursor-not-allowed opacity-60'
                            : isSelected
                            ? 'bg-[#C8FF3D] border-[#C8FF3D] text-[#0A0B14] shadow-[0_0_25px_rgba(200,255,61,0.5)] scale-105'
                            : 'bg-[#0D0E1A] border-[#2A2F60] text-white hover:border-[#C8FF3D] hover:bg-[#1E2246] hover:scale-102 active:scale-95'
                        }`}
                      >
                        <span className="font-number">{num}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                          {num === 0 ? 'DOT' : num === 4 ? 'FOUR' : num === 6 ? 'SIX' : 'RUNS'}
                        </span>
                        {isBlocked && (
                          <span className="absolute top-1.5 right-1.5 text-[8px] font-black uppercase text-red-500 px-1 py-0.5 bg-red-950/60 rounded">
                            BLOCKED
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Locked in waiting state banner */}
                {hasMyChoiceLocked && (
                  <div className="p-3 bg-[#0D0E1A] border border-[#C8FF3D]/30 rounded-2xl flex items-center justify-center gap-2.5 text-xs font-heading font-bold text-[#C8FF3D] animate-pulse">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>Your choice is committed and locked! Waiting for opponent to select...</span>
                  </div>
                )}
              </div>
            )}

            {/* 6. LIVE BALL-BY-BALL TIMELINE & SCORECARD */}
            <div className="bg-[#12142A] border border-[#2A2F60] rounded-3xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-heading font-black uppercase tracking-wider text-gray-300">
                  Recent Over-by-Over Timeline
                </h4>
                <span className="text-[11px] text-gray-400">
                  Last 10 Deliveries
                </span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {match.ballHistory.slice(-12).map((ball, idx) => {
                  const isW = ball.isWicket;
                  const is6 = ball.runsScored === 6;
                  const is4 = ball.runsScored === 4;
                  return (
                    <div
                      key={ball.id || idx}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-heading font-black shrink-0 border shadow-sm transition-all ${
                        isW
                          ? 'bg-[#FF3B5C] border-[#FF3B5C] text-white shadow-[0_0_12px_rgba(255,59,92,0.4)]'
                          : is6
                          ? 'bg-[#7C5CFF] border-[#7C5CFF] text-white shadow-[0_0_12px_rgba(124,92,255,0.4)]'
                          : is4
                          ? 'bg-[#0078FF] border-[#0078FF] text-white shadow-[0_0_12px_rgba(0,120,255,0.4)]'
                          : ball.runsScored === 0
                          ? 'bg-[#1E2246] border-[#2A2F60] text-gray-400'
                          : 'bg-[#C8FF3D]/20 border-[#C8FF3D] text-[#C8FF3D]'
                      }`}
                      title={`${ball.commentary} (Batter [${ball.batterInput}] vs Bowler [${ball.bowlerInput}])`}
                    >
                      {isW ? 'W' : ball.runsScored}
                    </div>
                  );
                })}
                {match.ballHistory.length === 0 && (
                  <span className="text-xs text-gray-500 italic">No deliveries yet. Match underway.</span>
                )}
              </div>

              {match.ballHistory.length > 0 && (
                <div className="p-3 bg-[#0D0E1A] rounded-2xl border border-[#1E2246] text-xs text-gray-300 flex items-center gap-2">
                  <span className="text-[#C8FF3D] font-bold font-heading uppercase text-[10px] px-2 py-0.5 rounded bg-[#C8FF3D]/10 shrink-0">
                    Latest Ball
                  </span>
                  <span className="truncate">{match.ballHistory[match.ballHistory.length - 1].commentary}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 7. BOWLER 3-NUMBER BLOCK SELECTION MODAL */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12142A] border border-[#2A2F60] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E2246]">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#FFC93D]" />
                <h3 className="font-heading font-black text-base uppercase text-white">
                  Select 3 Numbers to Block
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBlockModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-300">
              Pick exactly <span className="text-[#FFC93D] font-bold">3 scoring choices</span> that the batter cannot select for this delivery:
            </p>

            <div className="grid grid-cols-3 gap-3">
              {([0, 1, 2, 3, 4, 6] as WicketPulseChoice[]).map(num => {
                const isSelected = selectedBlockedNumbers.includes(num);
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedBlockedNumbers(selectedBlockedNumbers.filter(n => n !== num));
                      } else {
                        if (selectedBlockedNumbers.length < 3) {
                          setSelectedBlockedNumbers([...selectedBlockedNumbers, num]);
                        }
                      }
                    }}
                    className={`h-16 rounded-2xl font-heading font-black text-2xl border transition-all flex flex-col items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'bg-[#FFC93D] border-[#FFC93D] text-[#0A0B14] shadow-[0_0_15px_rgba(255,201,61,0.4)]'
                        : 'bg-[#0D0E1A] border-[#2A2F60] text-white hover:border-[#FFC93D]'
                    }`}
                  >
                    <span>{num}</span>
                    <span className="text-[9px] uppercase font-bold opacity-70">
                      {isSelected ? 'BLOCKED' : 'ALLOW'}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-gray-400 font-medium">
                Selected: <span className="text-white font-bold">{selectedBlockedNumbers.length}/3</span>
              </span>
              <button
                type="button"
                disabled={selectedBlockedNumbers.length !== 3}
                onClick={() => {
                  setActiveBowlerAbility('NUMBER_BLOCK');
                  setIsBlockModalOpen(false);
                }}
                className={`px-5 py-2.5 rounded-xl font-heading font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  selectedBlockedNumbers.length === 3
                    ? 'bg-[#FFC93D] text-[#0A0B14] shadow-[0_0_15px_rgba(255,201,61,0.3)]'
                    : 'bg-[#1E2246] text-gray-600 border border-gray-800 cursor-not-allowed'
                }`}
              >
                Confirm Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. SQUADS SIDE PANEL (Playing XIs & Bench) */}
      {isSquadPanelOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0D0E1A] border-l border-[#1E2246] shadow-2xl flex flex-col animate-slide-left">
          <div className="p-4 border-b border-[#1E2246] flex items-center justify-between bg-[#12142A]">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#C8FF3D]" />
              <h3 className="font-heading font-black text-sm uppercase text-white">
                Team Squads & Playing XIs
              </h3>
            </div>
            <button
              onClick={() => setIsSquadPanelOpen(false)}
              className="text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 p-2 bg-[#0A0B14] border-b border-[#1E2246]">
            <button
              onClick={() => setActiveSquadTab('HOME')}
              className={`py-2 text-xs font-heading font-black uppercase rounded-xl transition-all ${
                activeSquadTab === 'HOME'
                  ? 'bg-[#1E2246] text-[#C8FF3D] border border-[#C8FF3D]/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {homeF.name}
            </button>
            <button
              onClick={() => setActiveSquadTab('AWAY')}
              className={`py-2 text-xs font-heading font-black uppercase rounded-xl transition-all ${
                activeSquadTab === 'AWAY'
                  ? 'bg-[#1E2246] text-[#C8FF3D] border border-[#C8FF3D]/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {awayF.name}
            </button>
          </div>

          <div className="grow overflow-y-auto p-4 space-y-3">
            {(() => {
              const currentFid = activeSquadTab === 'HOME' ? match.homeFranchiseId : match.awayFranchiseId;
              const teamData = tournament?.teams[currentFid];
              const squad = teamData?.squad || [];
              const lineup = match.lineups[currentFid]?.playingXI || [];

              return (
                <div className="space-y-4">
                  <div>
                    <h5 className="text-[11px] font-heading font-black uppercase tracking-wider text-[#C8FF3D] mb-2">
                      Playing XI (11 Starters)
                    </h5>
                    <div className="space-y-1.5">
                      {lineup.map(pid => {
                        const p = playerMap.get(pid);
                        const isStriker = pid === inn.activeBatterId;
                        const isNonStriker = pid === inn.nonStrikerId;
                        const isBowler = pid === inn.activeBowlerId;
                        const isOut = inn.batters[pid]?.isOut;

                        return (
                          <div
                            key={pid}
                            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                              isStriker
                                ? 'bg-[#C8FF3D]/10 border-[#C8FF3D]'
                                : isBowler
                                ? 'bg-[#FF3B5C]/10 border-[#FF3B5C]'
                                : isNonStriker
                                ? 'bg-[#0078FF]/10 border-[#0078FF]'
                                : 'bg-[#12142A] border-[#1E2246]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <div className="w-8 h-8 rounded-lg bg-[#0A0B14] border border-[#2A2F60] overflow-hidden flex items-center justify-center shrink-0">
                                {p?.image_url ? (
                                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover object-top" />
                                ) : (
                                  <span className="font-heading font-black text-[10px] text-gray-400">
                                    {(p?.name || pid).slice(0, 2)}
                                  </span>
                                )}
                              </div>
                              <div className="truncate">
                                <span className={`font-bold block truncate ${isOut ? 'line-through text-gray-500' : 'text-white'}`}>
                                  {p?.name || pid}
                                </span>
                                <span className="text-[10px] text-gray-400">{p?.primary_role || 'Player'}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isStriker && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#C8FF3D] text-[#0A0B14]">
                                  BAT
                                </span>
                              )}
                              {isBowler && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#FF3B5C] text-white">
                                  BOWL
                                </span>
                              )}
                              {isNonStriker && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#0078FF] text-white">
                                  NS
                                </span>
                              )}
                              {isOut && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-red-950 text-red-400">
                                  OUT
                                </span>
                              )}
                              <OvrBadge ovr={p?.ovr || 75} size="xs" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {squad.length > 11 && (
                    <div>
                      <h5 className="text-[11px] font-heading font-black uppercase tracking-wider text-gray-400 mb-2">
                        Bench Players
                      </h5>
                      <div className="space-y-1.5">
                        {squad
                          .filter(p => !lineup.includes(p.id))
                          .map(p => (
                            <div
                              key={p.id}
                              className="p-2.5 rounded-xl bg-[#0A0B14] border border-[#1E2246] flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <div className="w-8 h-8 rounded-lg bg-[#12142A] border border-[#2A2F60] overflow-hidden flex items-center justify-center shrink-0">
                                  {p.image_url ? (
                                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover object-top" />
                                  ) : (
                                    <span className="font-heading font-black text-[10px] text-gray-500">
                                      {p.name.slice(0, 2)}
                                    </span>
                                  )}
                                </div>
                                <span className="text-gray-300 font-medium truncate">{p.name}</span>
                              </div>
                              <OvrBadge ovr={p.ovr} size="xs" />
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 9. SCORECARD MODAL */}
      {isScorecardOpen && (
        <ScorecardModal match={match} onClose={() => setIsScorecardOpen(false)} />
      )}
    </div>
  );
};
