import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Clock,
  Zap,
  Shield,
  FileText,
  AlertCircle,
  Eye,
  Sparkles,
  Users,
  Lock,
  X,
  CheckCircle2,
  Radio,
  ArrowRightLeft
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { IPLTeamId, IPL_FRANCHISES, Player } from '../../types';
import { AuthUser } from '../../services/auth';
import {
  LiveMatch,
  Tournament,
  WicketPulseChoice,
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
  const [secondsRemaining, setSecondsRemaining] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingTossDecision, setIsSubmittingTossDecision] = useState(false);
  const [isScorecardOpen, setIsScorecardOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Opening & Replacement selections state
  const [selectedStrikerId, setSelectedStrikerId] = useState<string>('');
  const [selectedNonStrikerId, setSelectedNonStrikerId] = useState<string>('');
  const [selectedOpeningBowlerId, setSelectedOpeningBowlerId] = useState<string>('');
  const [isFlippingCoin, setIsFlippingCoin] = useState(false);

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

  // 1. Identify user's tournament team with authoritative resolution
  const myFranchiseId: IPLTeamId = useMemo(() => {
    if (tournament && tournament.members) {
      const member = tournament.members.find(m => m.userId === user.id);
      if (member?.franchiseId) return member.franchiseId;
    }
    if (tournament && tournament.teams) {
      for (const [fid, team] of Object.entries(tournament.teams)) {
        if (team && team.ownerUserId === user.id) return fid as IPLTeamId;
      }
    }
    if (match.viewerFranchiseId) {
      return match.viewerFranchiseId;
    }
    return match.homeFranchiseId;
  }, [tournament, user.id, match.viewerFranchiseId, match.homeFranchiseId]);

  // Participation in this specific fixture
  const isHomeTeam = myFranchiseId === match.homeFranchiseId;
  const isAwayTeam = myFranchiseId === match.awayFranchiseId;
  const isParticipant = isHomeTeam || isAwayTeam;
  const isSpectator = !isParticipant;

  const currentBattingTeamId = inn?.battingFranchiseId || match.batting_team_id || match.homeFranchiseId;
  const currentBowlingTeamId = inn?.bowlingFranchiseId || match.bowling_team_id || match.awayFranchiseId;

  const isMyTeamBatting = isParticipant && myFranchiseId === currentBattingTeamId;
  const isMyTeamBowling = isParticipant && myFranchiseId === currentBowlingTeamId;

  // Toss permissions: ONLY the toss-winning team captain can decide bat/bowl!
  const tossWinnerTeamId = match.tossWinnerFranchiseId || match.toss_winner_team_id;
  const isTossWinner = Boolean(tossWinnerTeamId && myFranchiseId === tossWinnerTeamId);
  const canMakeTossDecision = isTossWinner;

  // Polling loop for authoritative match state synchronization
  useEffect(() => {
    const interval = setInterval(async () => {
      if (match.status === 'COMPLETED') return;
      try {
        const updated = await TournamentApi.getLiveMatch(match.id, myFranchiseId, user.id);
        if (updated) {
          setMatch(updated);
        }
      } catch {}
    }, 800);

    return () => clearInterval(interval);
  }, [match.id, match.status, myFranchiseId, user.id]);

  // Turn Timer countdown (strictly derived from authoritative server deadline)
  useEffect(() => {
    if (match.status === 'COMPLETED' || match.status === 'TOSS_PENDING' || match.status === 'TOSS') return;

    const timer = setInterval(() => {
      const serverDeadline =
        match.currentDelivery?.deadline ||
        match.pendingInputs?.turnExpiresAt ||
        match.selectionDeadline ||
        0;

      if (serverDeadline > 0) {
        const diff = Math.max(0, Math.ceil((serverDeadline - Date.now()) / 1000));
        setSecondsRemaining(diff);

        // Auto timeout call when deadline expires
        if (diff <= 0 && !isSubmitting && isParticipant) {
          TournamentApi.triggerTimeout(match.id, myFranchiseId, user.id).then(res => {
            if (res.match) {
              setMatch(res.match);
              setSelectedChoice(null);
            }
          });
        }
      }
    }, 300);

    return () => clearInterval(timer);
  }, [
    match.id,
    match.currentDelivery?.deadline,
    match.pendingInputs?.turnExpiresAt,
    match.selectionDeadline,
    match.status,
    isSubmitting,
    isParticipant,
    myFranchiseId,
    user.id
  ]);

  // Synchronized reset whenever server advances to a new delivery ID
  const currentDeliveryId = match.currentDelivery?.id;
  useEffect(() => {
    setSelectedChoice(null);
    setActiveBowlerAbility(null);
    setActiveBatterAbility(null);
    setSelectedBlockedNumbers([]);
  }, [currentDeliveryId]);

  // Reset selected choice if new delivery begins without explicit delivery ID change
  useEffect(() => {
    if (
      match.status === 'DELIVERY_ACTIVE' &&
      !match.pendingInputs?.batterChoice &&
      !match.pendingInputs?.bowlerChoice &&
      !match.pendingInputs?.hasBatterSubmitted &&
      !match.pendingInputs?.hasBowlerSubmitted
    ) {
      setSelectedChoice(null);
    }
  }, [match.status, match.pendingInputs?.turnStartTime]);

  // Trigger celebration on match completed
  useEffect(() => {
    if (match.status === 'COMPLETED') {
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch {}
    }
  }, [match.status]);

  // WicketPulse Choice Submission
  const handleSubmitPick = async (choice: WicketPulseChoice) => {
    if (isSubmitting || match.status === 'COMPLETED' || isSpectator || hasMyChoiceLocked) return;
    setIsSubmitting(true);
    setError(null);
    setSelectedChoice(choice);

    try {
      const res = await TournamentApi.submitChoice(match.id, {
        franchiseId: myFranchiseId,
        choice,
        ability: isMyTeamBowling
          ? activeBowlerAbility || undefined
          : isMyTeamBatting
          ? activeBatterAbility || undefined
          : undefined,
        blockedNumbers:
          activeBowlerAbility === 'NUMBER_BLOCK' && selectedBlockedNumbers.length === 3
            ? selectedBlockedNumbers
            : undefined,
        userId: user.id
      });

      if (res.error) {
        setError(res.error);
        setSelectedChoice(null);
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
      setSelectedChoice(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toss Handlers
  const handleTossCoinFlip = async (call: 'HEADS' | 'TAILS') => {
    if (isFlippingCoin || !isParticipant) return;
    setIsFlippingCoin(true);
    setError(null);
    try {
      const res = await TournamentApi.submitTossCoinFlip(match.id, myFranchiseId, call, user.id);
      if (res.match) {
        setMatch(res.match);
      }
    } catch (err: any) {
      setError(err.message || 'Toss error');
    } finally {
      setIsFlippingCoin(false);
    }
  };

  const handleTossDecision = async (decision: 'BAT' | 'BOWL') => {
    const winnerFid = match.tossWinnerFranchiseId || match.toss_winner_team_id || myFranchiseId;
    if (isSubmittingTossDecision || !canMakeTossDecision) return;
    setIsSubmittingTossDecision(true);
    setError(null);
    try {
      const res = await TournamentApi.submitTossDecision(match.id, winnerFid, decision, user.id);
      if (res.match) {
        setMatch(res.match);
      }
    } catch (err: any) {
      setError(err.message || 'Toss decision error');
      setIsSubmittingTossDecision(false);
    }
  };

  // Opening Selections Handlers
  const handleSelectOpeningBatters = async () => {
    if (!inn || !isMyTeamBatting) return;
    if (!selectedStrikerId || !selectedNonStrikerId || selectedStrikerId === selectedNonStrikerId) {
      setError('Please select two distinct players for Striker and Non-Striker');
      return;
    }
    setError(null);
    try {
      const res = await TournamentApi.selectOpeningBatters(
        match.id,
        currentBattingTeamId,
        selectedStrikerId,
        selectedNonStrikerId,
        user.id
      );
      if (res.match) {
        setMatch(res.match);
      }
    } catch (err: any) {
      setError(err.message || 'Opening batters selection error');
    }
  };

  const handleSelectOpeningBowler = async () => {
    if (!inn || !isMyTeamBowling) return;
    if (!selectedOpeningBowlerId) {
      setError('Please select an opening bowler');
      return;
    }
    setError(null);
    try {
      const res = await TournamentApi.selectOpeningBowler(
        match.id,
        currentBowlingTeamId,
        selectedOpeningBowlerId,
        user.id
      );
      if (res.match) {
        setMatch(res.match);
      }
    } catch (err: any) {
      setError(err.message || 'Opening bowler selection error');
    }
  };

  // Replacement Batter & Bowler Handlers
  const handleSelectReplacementBatter = async (batterId: string) => {
    if (!inn || !isMyTeamBatting) return;
    setError(null);
    try {
      const res = await TournamentApi.selectReplacementBatter(
        match.id,
        currentBattingTeamId,
        batterId,
        user.id
      );
      if (res.match) {
        setMatch(res.match);
      }
    } catch (err: any) {
      setError(err.message || 'Replacement batter selection error');
    }
  };

  const handleSelectBowler = async (bowlerId: string) => {
    if (!inn || !isMyTeamBowling) return;
    setError(null);
    try {
      const res = await TournamentApi.selectBowler(
        match.id,
        bowlerId,
        currentBowlingTeamId,
        user.id
      );
      if (res.match) {
        setMatch(res.match);
      }
    } catch (err: any) {
      setError(err.message || 'Bowler selection error');
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

  // Exact OVR Difference Calculation
  const batterOvr = activeBatter?.ovr || strikerPlayer?.ovr || 75;
  const bowlerOvr = activeBowler?.ovr || bowlerPlayer?.ovr || 75;
  const ovrDifference = batterOvr - bowlerOvr;
  const batterAdv = Math.max(0, ovrDifference);
  const bowlerAdv = Math.max(0, bowlerOvr - batterOvr);

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

  // Submission lock status for viewer
  const pending = match.pendingInputs || {};
  const hasBatterSubmitted = Boolean(pending.hasBatterSubmitted || pending.batterChoice !== undefined);
  const hasBowlerSubmitted = Boolean(pending.hasBowlerSubmitted || pending.bowlerChoice !== undefined);

  const hasMyChoiceLocked =
    selectedChoice !== null ||
    (isMyTeamBatting && hasBatterSubmitted) ||
    (isMyTeamBowling && hasBowlerSubmitted);

  const areBothChoicesLocked = hasBatterSubmitted && hasBowlerSubmitted;

  // Determine current match phase instruction text
  const getPhaseInstruction = () => {
    if (match.status === 'BATTER_SELECTION') {
      return isMyTeamBatting
        ? 'YOUR TEAM LOST A WICKET — SELECT THE NEXT BATTER'
        : `WAITING FOR ${battingF.name} TO SELECT THE NEXT BATTER`;
    }
    if (match.status === 'BOWLER_SELECTION' || match.status === 'OVER_COMPLETED') {
      return isMyTeamBowling
        ? 'OVER COMPLETED — SELECT THE NEXT BOWLER'
        : `WAITING FOR ${bowlingF.name} TO SELECT THE NEXT BOWLER`;
    }
    if (areBothChoicesLocked) {
      return 'CHOICES LOCKED — CALCULATING RESULT';
    }
    if (isMyTeamBatting) {
      if (hasMyChoiceLocked) {
        return 'YOUR CHOICE IS LOCKED — WAITING FOR BOWLER';
      }
      return 'YOUR TURN — SELECT YOUR RUNS';
    }
    if (isMyTeamBowling) {
      if (hasMyChoiceLocked) {
        return 'YOUR CHOICE IS LOCKED — WAITING FOR BATTER';
      }
      return 'YOUR TURN — SELECT YOUR DELIVERY';
    }
    return 'LIVE WICKETPULSE DELIVERY IN PROGRESS';
  };

  return (
    <div className="min-h-screen bg-[#07080F] text-white flex flex-col font-sans select-none">
      {/* ============================================================== */}
      {/* 1. TOP BROADCAST HEADER                                        */}
      {/* ============================================================== */}
      <header className="bg-[#0D0E1A] border-b border-[#1E2246] px-4 md:px-8 py-2.5 shrink-0 flex items-center justify-between sticky top-0 z-30 shadow-lg">
        <div className="flex items-center gap-3">
          <HeaderBackButton label="Tournament Hub" onClick={onExit} />
          <div className="h-5 w-px bg-[#1E2246] hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-black text-sm uppercase tracking-wider text-white">
                {tournament?.name || 'BidWars Tournament'} •{' '}
                <span className="text-[#C8FF3D]">
                  {match.fixtureId ? `Match ${match.fixtureId.split('-').pop()}` : 'Live Fixture'}
                </span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#C8FF3D]/10 text-[#C8FF3D] border border-[#C8FF3D]/30 flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 animate-pulse text-[#C8FF3D]" />
                {match.status.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="text-[11px] text-gray-400 font-medium flex items-center gap-1.5">
              <span>
                {homeF.shortName} vs {awayF.shortName}
              </span>
              <span>•</span>
              <span>Innings {match.currentInnings}</span>
              <span>•</span>
              <span>
                You manage{' '}
                <span className="text-[#C8FF3D] font-bold">
                  {IPL_FRANCHISES[myFranchiseId]?.name || myFranchiseId}
                </span>{' '}
                ({isMyTeamBatting ? 'Batting' : isMyTeamBowling ? 'Bowling' : 'Spectator'})
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
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
            type="button"
            onClick={() => setIsScorecardOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[#12142A] border border-[#2A2F60] text-gray-300 hover:text-white text-xs font-heading font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#C8FF3D]" />
            <span>Scorecard</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="p-3 bg-red-500/10 border-b border-red-500/30 text-red-400 text-xs flex items-center justify-center gap-2 font-medium animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. MAIN MATCH CONTENT CONTAINER                                */}
      {/* ============================================================== */}
      <div className="grow max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col justify-between space-y-5">
        {/* ============================================================== */}
        {/* STAGE: TOSS PENDING                                            */}
        {/* ============================================================== */}
        {(match.status === 'TOSS_PENDING' || match.status === 'TOSS') && (
          <div className="my-auto bg-[#12142A] border border-[#2A2F60] rounded-3xl p-8 text-center max-w-lg mx-auto shadow-2xl animate-fade-in space-y-6">
            <div className="w-20 h-20 rounded-full bg-[#FFC93D]/10 border-2 border-[#FFC93D]/40 text-[#FFC93D] flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(255,201,61,0.25)] relative">
              <span className={`text-3xl font-heading font-black ${isFlippingCoin ? 'animate-spin' : ''}`}>
                🪙
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-heading font-black uppercase tracking-wider text-white">
                WicketPulse Match Toss
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                {homeF.name} vs {awayF.name} • Calling the Coin Toss
              </p>
            </div>

            {isParticipant ? (
              <div className="space-y-3">
                <span className="text-xs text-[#FFC93D] font-bold block uppercase tracking-wider">
                  Select Heads or Tails to Flip
                </span>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    disabled={isFlippingCoin}
                    onClick={() => handleTossCoinFlip('HEADS')}
                    className="py-3.5 rounded-xl bg-[#0D0E1A] border border-[#2A2F60] hover:border-[#FFC93D] text-white hover:text-[#FFC93D] font-heading font-bold uppercase text-sm tracking-wider transition-all cursor-pointer shadow-sm"
                  >
                    HEADS
                  </button>
                  <button
                    type="button"
                    disabled={isFlippingCoin}
                    onClick={() => handleTossCoinFlip('TAILS')}
                    className="py-3.5 rounded-xl bg-[#0D0E1A] border border-[#2A2F60] hover:border-[#FFC93D] text-white hover:text-[#FFC93D] font-heading font-bold uppercase text-sm tracking-wider transition-all cursor-pointer shadow-sm"
                  >
                    TAILS
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-[#0A0B14] border border-[#1E2246] rounded-2xl text-center space-y-1">
                <span className="text-xs font-bold text-[#FFC93D] uppercase tracking-wider block">
                  Coin Flip in Progress
                </span>
                <p className="text-xs text-gray-400">
                  Waiting for team managers to call Heads or Tails.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* STAGE: TOSS DECISION PENDING                                   */}
        {/* ============================================================== */}
        {match.status === 'TOSS_DECISION_PENDING' && (
          <div className="my-auto bg-[#12142A] border border-[#2A2F60] rounded-3xl p-8 text-center max-w-lg mx-auto shadow-2xl animate-fade-in space-y-5">
            <div className="w-16 h-16 rounded-full bg-[#C8FF3D]/10 border border-[#C8FF3D]/30 text-[#C8FF3D] flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-[#FFC93D] px-2.5 py-1 bg-[#FFC93D]/10 rounded-full border border-[#FFC93D]/30">
                Coin Landed: {match.tossResult || 'HEADS'}
              </span>
              <h2 className="text-2xl font-heading font-black uppercase tracking-wider mt-3 text-white">
                {IPL_FRANCHISES[tossWinnerTeamId || match.homeFranchiseId]?.name} WON THE TOSS
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                {canMakeTossDecision
                  ? 'Choose whether to bat or bowl first.'
                  : `Waiting for ${IPL_FRANCHISES[tossWinnerTeamId || match.homeFranchiseId]?.shortName} to make its decision.`}
              </p>
            </div>

            {canMakeTossDecision ? (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    disabled={isSubmittingTossDecision}
                    onClick={() => handleTossDecision('BAT')}
                    className="py-3.5 rounded-xl bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] font-heading font-bold uppercase text-xs tracking-wider shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    BAT FIRST
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingTossDecision}
                    onClick={() => handleTossDecision('BOWL')}
                    className="py-3.5 rounded-xl bg-[#1A1E2B] hover:bg-[#222738] border border-white/10 text-white font-heading font-bold uppercase text-xs tracking-wider shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    BOWL FIRST
                  </button>
                </div>
                {isSubmittingTossDecision && (
                  <span className="text-xs text-[#C8FF3D] font-bold block animate-pulse">
                    Submitting toss decision to backend...
                  </span>
                )}
              </div>
            ) : (
              <div className="p-4 bg-[#0A0B14] border border-[#1E2246] rounded-2xl text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFC93D]/10 text-[#FFC93D] border border-[#FFC93D]/30 text-xs font-bold uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  Waiting for {IPL_FRANCHISES[tossWinnerTeamId || match.homeFranchiseId]?.shortName} to make its decision.
                </div>
                <p className="text-xs text-gray-400">
                  Decision will be broadcast to both teams once submitted.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* STAGE: OPENING PLAYER SELECTION (ISOLATED TEAM VIEWS)          */}
        {/* ============================================================== */}
        {(match.status === 'OPENING_PLAYER_SELECTION' ||
          match.status === 'OPENING_BATTERS_SELECTION' ||
          match.status === 'OPENING_BOWLER_SELECTION') && (
          <div className="my-auto bg-[#12142A] border border-[#2A2F60] rounded-3xl p-6 md:p-8 max-w-2xl mx-auto shadow-2xl animate-fade-in space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E2246]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#C8FF3D] block">
                  Stage 4 • Playing XI Opening Selection
                </span>
                <h2 className="text-xl md:text-2xl font-heading font-black uppercase text-white">
                  {isMyTeamBatting
                    ? 'SELECT YOUR TWO OPENING BATTERS'
                    : isMyTeamBowling
                    ? 'SELECT YOUR OPENING BOWLER'
                    : 'OPENING PLAYER SELECTION'}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 bg-[#FF3B5C]/10 border border-[#FF3B5C]/30 rounded-xl text-xs font-heading font-black text-[#FF3B5C] animate-pulse">
                  ⏱️ {secondsRemaining}s
                </div>
                <div className="px-3 py-1 bg-[#1E2246] border border-[#2A2F60] rounded-xl text-xs font-heading font-bold text-[#C8FF3D]">
                  {isMyTeamBatting ? `${battingF.shortName} Batting` : `${bowlingF.shortName} Bowling`}
                </div>
              </div>
            </div>

            {/* BATTING TEAM SELECTION INTERFACE */}
            {isMyTeamBatting && (
              <div className="space-y-4">
                <p className="text-xs text-gray-300">
                  Select two distinct players from your <span className="text-[#C8FF3D] font-bold">{battingF.name}</span> confirmed Playing XI:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto p-1">
                  {(match.lineups[currentBattingTeamId]?.playingXI || []).map(pid => {
                    const p = playerMap.get(pid);
                    const isStriker = selectedStrikerId === pid;
                    const isNonStriker = selectedNonStrikerId === pid;

                    return (
                      <div
                        key={pid}
                        className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                          isStriker
                            ? 'bg-[#C8FF3D]/10 border-[#C8FF3D]'
                            : isNonStriker
                            ? 'bg-[#0078FF]/10 border-[#0078FF]'
                            : 'bg-[#0D0E1A] border-[#2A2F60]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="w-10 h-10 rounded-xl bg-[#0A0B14] border border-[#23274D] overflow-hidden flex items-center justify-center shrink-0">
                            {p?.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover object-top" />
                            ) : (
                              <span className="font-heading font-black text-xs text-gray-400">
                                {(p?.name || pid).slice(0, 2)}
                              </span>
                            )}
                          </div>
                          <div className="truncate">
                            <span className="font-bold text-xs text-white block truncate">{p?.name || pid}</span>
                            <span className="text-[10px] text-gray-400">{p?.primary_role || 'Batter'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (isStriker) setSelectedStrikerId('');
                              else {
                                setSelectedStrikerId(pid);
                                if (selectedNonStrikerId === pid) setSelectedNonStrikerId('');
                              }
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-heading font-black uppercase cursor-pointer ${
                              isStriker ? 'bg-[#C8FF3D] text-[#0A0B14]' : 'bg-[#1E2246] text-gray-300 hover:text-white'
                            }`}
                          >
                            Striker
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (isNonStriker) setSelectedNonStrikerId('');
                              else {
                                setSelectedNonStrikerId(pid);
                                if (selectedStrikerId === pid) setSelectedStrikerId('');
                              }
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-heading font-black uppercase cursor-pointer ${
                              isNonStriker ? 'bg-[#0078FF] text-white' : 'bg-[#1E2246] text-gray-300 hover:text-white'
                            }`}
                          >
                            Non-Striker
                          </button>
                          <OvrBadge ovr={p?.ovr || 75} size="xs" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    Striker:{' '}
                    <span className="text-white font-bold">
                      {selectedStrikerId ? playerMap.get(selectedStrikerId)?.name || 'Selected' : 'None'}
                    </span>{' '}
                    • Non-Striker:{' '}
                    <span className="text-white font-bold">
                      {selectedNonStrikerId ? playerMap.get(selectedNonStrikerId)?.name || 'Selected' : 'None'}
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={!selectedStrikerId || !selectedNonStrikerId || selectedStrikerId === selectedNonStrikerId}
                    onClick={handleSelectOpeningBatters}
                    className={`px-6 py-3 rounded-xl font-heading font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      selectedStrikerId && selectedNonStrikerId && selectedStrikerId !== selectedNonStrikerId
                        ? 'bg-[#C8FF3D] text-[#0A0B14] shadow-sm'
                        : 'bg-[#1E2246] text-gray-600 border border-gray-800 cursor-not-allowed'
                    }`}
                  >
                    Confirm Openers
                  </button>
                </div>
              </div>
            )}

            {/* BOWLING TEAM SELECTION INTERFACE */}
            {isMyTeamBowling && (
              <div className="space-y-4">
                <p className="text-xs text-gray-300">
                  Select which player from your <span className="text-[#FF3B5C] font-bold">{bowlingF.name}</span> confirmed Playing XI will bowl Over 1:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto p-1">
                  {(match.lineups[currentBowlingTeamId]?.playingXI || []).map(pid => {
                    const p = playerMap.get(pid);
                    const isSelected = selectedOpeningBowlerId === pid;

                    return (
                      <div
                        key={pid}
                        onClick={() => setSelectedOpeningBowlerId(pid)}
                        className={`p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#FF3B5C]/15 border-[#FF3B5C] shadow-[0_0_15px_rgba(255,59,92,0.3)]'
                            : 'bg-[#0D0E1A] border-[#2A2F60] hover:border-[#FF3B5C]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="w-10 h-10 rounded-xl bg-[#0A0B14] border border-[#23274D] overflow-hidden flex items-center justify-center shrink-0">
                            {p?.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover object-top" />
                            ) : (
                              <span className="font-heading font-black text-xs text-gray-400">
                                {(p?.name || pid).slice(0, 2)}
                              </span>
                            )}
                          </div>
                          <div className="truncate">
                            <span className="font-bold text-xs text-white block truncate">{p?.name || pid}</span>
                            <span className="text-[10px] text-gray-400">{p?.primary_role || 'Bowler'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <OvrBadge ovr={p?.ovr || 75} size="xs" />
                          <span
                            className={`text-[10px] font-heading font-black uppercase px-2 py-1 rounded-lg ${
                              isSelected ? 'bg-[#FF3B5C] text-white' : 'bg-[#1E2246] text-gray-400'
                            }`}
                          >
                            {isSelected ? '✓ Picked' : 'Select'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    Selected Bowler:{' '}
                    <span className="text-white font-bold">
                      {selectedOpeningBowlerId ? playerMap.get(selectedOpeningBowlerId)?.name || 'Selected' : 'None'}
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={!selectedOpeningBowlerId}
                    onClick={handleSelectOpeningBowler}
                    className={`px-6 py-3 rounded-xl font-heading font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      selectedOpeningBowlerId
                        ? 'bg-[#FF3B5C] text-white shadow-sm'
                        : 'bg-[#1E2246] text-gray-600 border border-gray-800 cursor-not-allowed'
                    }`}
                  >
                    Confirm Bowler
                  </button>
                </div>
              </div>
            )}

            {/* WAITING NOTIFICATION FOR CONFIRMED OPPONENT */}
            {!isSpectator && (
              <div className="pt-2 text-center text-xs text-gray-400">
                {isMyTeamBatting && !match.openingSelections?.bowlingConfirmed && (
                  <span>Waiting for {bowlingF.shortName} to select its opening bowler.</span>
                )}
                {isMyTeamBowling && !match.openingSelections?.battingConfirmed && (
                  <span>Waiting for {battingF.shortName} to select its opening batters.</span>
                )}
              </div>
            )}

            {/* SPECTATOR INTERFACE */}
            {isSpectator && (
              <div className="p-6 bg-[#0A0B14] border border-[#1E2246] rounded-2xl text-center space-y-2">
                <span className="text-xs font-bold text-[#C8FF3D] uppercase tracking-wider block">
                  Opening Selections in Progress
                </span>
                <p className="text-xs text-gray-400">
                  Waiting for {battingF.name} and {bowlingF.name} to complete their opening player selections.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* STAGE: MATCH COMPLETED                                         */}
        {/* ============================================================== */}
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
                  <span className="text-xs text-gray-400">
                    ({match.innings1.oversCompleted}.{match.innings1.ballsInCurrentOver} ov)
                  </span>
                </span>
              </div>
              {match.innings2 && (
                <div className="flex items-center justify-between text-xs font-bold text-gray-300 pt-2 border-t border-[#1E2246]">
                  <span>{IPL_FRANCHISES[match.innings2.battingFranchiseId].name}</span>
                  <span className="text-white font-number text-base font-black">
                    {match.innings2.totalRuns}/{match.innings2.totalWickets}{' '}
                    <span className="text-xs text-gray-400">
                      ({match.innings2.oversCompleted}.{match.innings2.ballsInCurrentOver} ov)
                    </span>
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => setIsScorecardOpen(true)}
                className="px-6 py-3 rounded-xl bg-[#1E2246] hover:bg-[#282E5C] border border-[#2A2F60] text-white font-heading font-bold text-xs uppercase tracking-wider hover:border-[#C8FF3D] transition-all cursor-pointer"
              >
                View Full Scorecard
              </button>
              <button
                type="button"
                onClick={onExit}
                className="px-6 py-3 rounded-xl bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] font-heading font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(200,255,61,0.25)] transition-all cursor-pointer"
              >
                Back to Tournament Hub
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* LIVE MATCH DASHBOARD: EXACT PART 7 & PART 4 BROADCAST LAYOUT   */}
        {/* 1. Scoreboard -> 2. Central Gameplay Area -> 3. Player Cards   */}
        {/* -> 4. In-line Modals -> 5. Scorecard & Timeline                */}
        {/* ============================================================== */}
        {match.status !== 'TOSS' &&
          match.status !== 'TOSS_PENDING' &&
          match.status !== 'TOSS_DECISION_PENDING' &&
          match.status !== 'OPENING_PLAYER_SELECTION' &&
          match.status !== 'OPENING_BATTERS_SELECTION' &&
          match.status !== 'OPENING_BOWLER_SELECTION' &&
          match.status !== 'COMPLETED' &&
          match.status !== 'ABANDONED' && (
            <>
              {/* -------------------------------------------------------- */}
              {/* 1. TOP LIVE SCOREBOARD                                   */}
              {/* -------------------------------------------------------- */}
              <div className="bg-[#12142A] border border-[#2A2F60] rounded-3xl p-5 shadow-2xl relative overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-6">
                  {/* Batting Team Score */}
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
                          {inn.totalRuns}
                          <span className="text-gray-400 text-3xl md:text-4xl">/{inn.totalWickets}</span>
                        </span>
                        <span className="text-sm md:text-base font-bold text-gray-400">
                          ({inn.oversCompleted}.{inn.ballsInCurrentOver}/{match.matchOvers} OVERS)
                        </span>
                      </div>
                      <div className="text-xs text-gray-300 font-medium flex flex-wrap items-center gap-3 mt-1">
                        <span className="text-white font-bold">{battingF.name}</span>
                        <span>•</span>
                        <span>
                          CRR: <span className="text-[#C8FF3D] font-bold">{currentRunRate}</span>
                        </span>
                        {inn.targetRuns && (
                          <>
                            <span>•</span>
                            <span>
                              Target: <span className="text-white font-bold">{inn.targetRuns}</span>
                            </span>
                            <span>•</span>
                            <span>
                              Need <span className="text-[#FF3B5C] font-bold">{Math.max(0, requiredRuns)}</span> from{' '}
                              <span className="text-white font-bold">{Math.max(0, remainingBalls)}b</span> (RRR:{' '}
                              {requiredRunRate})
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 10-Second Timer & Bowling Team */}
                  <div className="flex items-center gap-5">
                    <div className="text-right hidden sm:block">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                        Bowling Team
                      </span>
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
                      className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl border transition-all ${
                        secondsRemaining <= 4
                          ? 'border-[#FF3B5C] bg-[#FF3B5C]/15 text-[#FF3B5C] shadow-[0_0_15px_rgba(255,59,92,0.3)] animate-pulse'
                          : 'border-[#C8FF3D]/40 bg-[#C8FF3D]/5 text-[#C8FF3D]'
                      }`}
                    >
                      <span className="text-2xl font-heading font-black leading-none">{secondsRemaining}</span>
                      <span className="text-[9px] uppercase font-bold tracking-tighter opacity-80">SEC</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* -------------------------------------------------------- */}
              {/* 2. CENTRAL GAMEPLAY AREA                                 */}
              {/* -------------------------------------------------------- */}
              <div className="space-y-4">
                {/* PROMINENT CURRENT PHASE BANNER */}
                <div
                  className={`p-4 rounded-2xl border flex items-center justify-between text-xs md:text-sm font-heading font-black tracking-wider uppercase transition-all shadow-xl ${
                    areBothChoicesLocked
                      ? 'bg-purple-950/40 border-purple-500/50 text-purple-300'
                      : hasMyChoiceLocked
                      ? 'bg-[#0D0E1A] border-[#C8FF3D]/40 text-[#C8FF3D]'
                      : 'bg-[#12142A] border-[#2A2F60] text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-3 h-3 rounded-full shrink-0 ${
                        areBothChoicesLocked
                          ? 'bg-purple-400 animate-ping'
                          : hasMyChoiceLocked
                          ? 'bg-[#C8FF3D] animate-pulse'
                          : 'bg-[#0078FF] animate-pulse'
                      }`}
                    />
                    <span>{getPhaseInstruction()}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-normal lowercase tracking-normal text-gray-400">
                    <span className="font-heading font-bold uppercase text-[10px] text-gray-300">
                      Ball {inn.oversCompleted}.{inn.ballsInCurrentOver + 1}
                    </span>
                  </div>
                </div>

                {/* COMPACT OVR COMPARISON BANNER */}
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 py-2.5 px-4 bg-[#0D0E1A] border border-[#1E2246] rounded-2xl text-xs font-heading font-black shadow-md">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400">BATTER:</span>
                    <span className="text-[#C8FF3D]">{batterOvr} OVR</span>
                    <span className="text-gray-500">({activeBatter?.name || 'Striker'})</span>
                  </div>
                  <span className="text-gray-600 hidden sm:inline">•</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400">BOWLER:</span>
                    <span className="text-[#FF3B5C]">{bowlerOvr} OVR</span>
                    <span className="text-gray-500">({activeBowler?.name || 'Bowler'})</span>
                  </div>
                  <span className="text-gray-600 hidden sm:inline">•</span>
                  <div>
                    {batterAdv >= 3 ? (
                      <span className="px-2 py-0.5 rounded-full bg-[#C8FF3D]/15 text-[#C8FF3D] border border-[#C8FF3D]/30 uppercase text-[10px] font-mono">
                        BATTER ADVANTAGE: +{batterAdv}
                      </span>
                    ) : bowlerAdv >= 3 ? (
                      <span className="px-2 py-0.5 rounded-full bg-[#FF3B5C]/15 text-[#FF3B5C] border border-[#FF3B5C]/30 uppercase text-[10px] font-mono">
                        BOWLER ADVANTAGE: +{bowlerAdv}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 uppercase text-[10px]">
                        BALANCED MATCHUP (DIFF: {Math.abs(batterAdv)})
                      </span>
                    )}
                  </div>
                </div>

                {/* ABILITY CONTROLS (WHEN ELIGIBLE) */}
                {isMyTeamBatting && batterAdv >= 3 && (
                  <div className="bg-[#12142A] border border-[#C8FF3D]/30 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="space-y-0.5 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-1.5">
                        <Zap className="w-4 h-4 text-[#C8FF3D] fill-current" />
                        <span className="text-xs font-heading font-black uppercase text-[#C8FF3D]">
                          Batting Ability Available (+{batterAdv} OVR Advantage)
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        {batterAdv >= 8
                          ? 'Applies 2x multiplier to non-wicket runs scored (Dismissal strictly takes precedence on equal choices).'
                          : "Adds bowler's delivery number to your score on non-wicket deliveries."}
                      </p>
                    </div>

                    <div className="shrink-0 w-full sm:w-auto">
                      {inn.batterAbilityUsedInCurrentOver ? (
                        <button
                          type="button"
                          disabled
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#1E2246] border border-gray-800 text-gray-500 font-heading font-black text-xs uppercase cursor-not-allowed"
                        >
                          USED THIS OVER
                        </button>
                      ) : batterAdv >= 8 ? (
                        <button
                          type="button"
                          disabled={hasMyChoiceLocked || isSubmitting}
                          onClick={() =>
                            setActiveBatterAbility(
                              activeBatterAbility === 'SECRET_DOUBLE_SHOT' ? null : 'SECRET_DOUBLE_SHOT'
                            )
                          }
                          className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-heading font-black text-xs uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            activeBatterAbility === 'SECRET_DOUBLE_SHOT'
                              ? 'bg-[#FF3B5C] text-white shadow-[0_0_20px_rgba(255,59,92,0.4)] scale-102'
                              : 'bg-[#1E2246] text-[#FF3B5C] border border-[#FF3B5C]/50 hover:bg-[#FF3B5C] hover:text-white'
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>
                            {activeBatterAbility === 'SECRET_DOUBLE_SHOT'
                              ? '✓ 2X POWER ACTIVE'
                              : 'ACTIVATE 2X POWER'}
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={hasMyChoiceLocked || isSubmitting}
                          onClick={() =>
                            setActiveBatterAbility(
                              activeBatterAbility === 'COMBINATION_SHOT' ? null : 'COMBINATION_SHOT'
                            )
                          }
                          className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-heading font-black text-xs uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            activeBatterAbility === 'COMBINATION_SHOT'
                              ? 'bg-[#7C5CFF] text-white shadow-[0_0_20px_rgba(124,92,255,0.4)] scale-102'
                              : 'bg-[#1E2246] text-[#7C5CFF] border border-[#7C5CFF]/50 hover:bg-[#7C5CFF] hover:text-white'
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>
                            {activeBatterAbility === 'COMBINATION_SHOT'
                              ? '✓ BONUS SHOT ACTIVE'
                              : 'ACTIVATE BONUS SHOT'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {isMyTeamBowling && bowlerAdv >= 3 && (
                  <div className="bg-[#12142A] border border-[#FF3B5C]/30 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="space-y-0.5 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-1.5">
                        <Shield className="w-4 h-4 text-[#FF3B5C] fill-current" />
                        <span className="text-xs font-heading font-black uppercase text-[#FF3B5C]">
                          Bowling Ability Available (+{bowlerAdv} OVR Advantage)
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        {bowlerAdv >= 8
                          ? 'Restricts batter to only 4 and 6; blocks 0, 1, 2, 3.'
                          : 'Block exactly 3 scoring numbers from [0, 1, 2, 3, 4, 6] for this delivery.'}
                      </p>
                    </div>

                    <div className="shrink-0 w-full sm:w-auto">
                      {activeBowler?.abilityUsedInCurrentOver ? (
                        <button
                          type="button"
                          disabled
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#1E2246] border border-gray-800 text-gray-500 font-heading font-black text-xs uppercase cursor-not-allowed"
                        >
                          USED THIS OVER
                        </button>
                      ) : bowlerAdv >= 8 ? (
                        <button
                          type="button"
                          disabled={hasMyChoiceLocked || isSubmitting}
                          onClick={() =>
                            setActiveBowlerAbility(
                              activeBowlerAbility === 'ELITE_NUMBER_BLOCK' ? null : 'ELITE_NUMBER_BLOCK'
                            )
                          }
                          className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-heading font-black text-xs uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            activeBowlerAbility === 'ELITE_NUMBER_BLOCK'
                              ? 'bg-[#FF3B5C] text-white shadow-[0_0_20px_rgba(255,59,92,0.4)] scale-102'
                              : 'bg-[#1E2246] text-[#FF3B5C] border border-[#FF3B5C]/50 hover:bg-[#FF3B5C] hover:text-white'
                          }`}
                        >
                          <Shield className="w-3.5 h-3.5 fill-current" />
                          <span>
                            {activeBowlerAbility === 'ELITE_NUMBER_BLOCK'
                              ? '✓ SPECIAL DELIVERY ACTIVE'
                              : 'ACTIVATE SPECIAL DELIVERY'}
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={hasMyChoiceLocked || isSubmitting}
                          onClick={() => setIsBlockModalOpen(true)}
                          className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-heading font-black text-xs uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            activeBowlerAbility === 'NUMBER_BLOCK'
                              ? 'bg-[#FFC93D] text-[#0A0B14] shadow-[0_0_20px_rgba(255,201,61,0.4)] scale-102'
                              : 'bg-[#1E2246] text-[#FFC93D] border border-[#FFC93D]/50 hover:bg-[#FFC93D] hover:text-[#0A0B14]'
                          }`}
                        >
                          <Shield className="w-3.5 h-3.5 fill-current" />
                          <span>
                            {activeBowlerAbility === 'NUMBER_BLOCK'
                              ? `✓ NUMBER BLOCK ACTIVE ([${selectedBlockedNumbers.join(', ')}])`
                              : 'ACTIVATE NUMBER BLOCK'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* NUMBER SELECTION BUTTONS (6 LARGE, HIGHLY RESPONSIVE CONTROLS) */}
                {isSpectator ? (
                  <div className="bg-[#12142A] border border-[#2A2F60] rounded-3xl p-6 text-center space-y-2 shadow-xl">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7C5CFF]/15 text-[#7C5CFF] border border-[#7C5CFF]/30 text-xs font-heading font-black uppercase tracking-wider">
                      <Eye className="w-4 h-4" /> Live Spectator Mode
                    </div>
                    <h3 className="font-heading font-black text-sm uppercase text-white">
                      Live WicketPulse Delivery in Progress
                    </h3>
                    <p className="text-xs text-gray-400 max-w-md mx-auto">
                      Managers from {battingF.shortName} and {bowlingF.shortName} are submitting secret numbers
                      simultaneously.
                    </p>
                  </div>
                ) : (
                  <div className="bg-[#12142A] border-2 border-[#2A2F60] hover:border-[#3E4580] rounded-3xl p-5 md:p-6 shadow-2xl space-y-4 transition-all">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-heading font-black uppercase tracking-wider text-white">
                          {isMyTeamBatting ? 'Select Batting Number' : 'Select Bowling Delivery Number'}
                        </span>
                        {hasMyChoiceLocked && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#C8FF3D]/10 text-[#C8FF3D] border border-[#C8FF3D]/30 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400">
                        Fundamental Rule: <span className="text-white font-bold">Same Number = WICKET</span> •{' '}
                        <span className="text-[#C8FF3D] font-bold">Different = RUNS</span>
                      </span>
                    </div>

                    {/* 6 Large Prominently Positioned Number Selection Buttons */}
                    <div className="grid grid-cols-6 gap-2 sm:gap-3">
                      {([0, 1, 2, 3, 4, 6] as WicketPulseChoice[]).map(num => {
                        const isSelectionPending =
                          match.status === 'BATTER_SELECTION' ||
                          match.status === 'BOWLER_SELECTION' ||
                          match.status === 'OVER_COMPLETED';

                        const isPaceBarrageActive =
                          match.pendingInputs?.bowlerAbility === 'ELITE_NUMBER_BLOCK' ||
                          activeBowlerAbility === 'ELITE_NUMBER_BLOCK';

                        const isRestrictedByPaceBarrage =
                          isMyTeamBatting && isPaceBarrageActive && num !== 4 && num !== 6;

                        const isBlocked =
                          match.pendingInputs?.blockedNumbers?.includes(num) || isRestrictedByPaceBarrage;

                        const isSelected = selectedChoice === num;

                        return (
                          <button
                            key={num}
                            type="button"
                            disabled={isBlocked || isSubmitting || hasMyChoiceLocked || isSelectionPending}
                            onClick={() => handleSubmitPick(num)}
                            className={`h-20 sm:h-24 md:h-28 rounded-2xl font-heading font-black text-2xl md:text-3xl border transition-all flex flex-col items-center justify-center relative cursor-pointer ${
                              isBlocked || isSelectionPending
                                ? 'bg-red-950/20 border-red-900/40 text-red-500/40 cursor-not-allowed opacity-50'
                                : isSelected
                                ? 'bg-[#C8FF3D] border-[#C8FF3D] text-[#0A0B14] shadow-[0_0_25px_rgba(200,255,61,0.5)] scale-105'
                                : 'bg-[#0D0E1A] border-[#2A2F60] text-white hover:border-[#C8FF3D] hover:bg-[#1E2246] hover:scale-102 active:scale-95'
                            }`}
                          >
                            <span className="font-number">{num}</span>
                            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider opacity-70">
                              {num === 0 ? 'DOT' : num === 4 ? 'FOUR' : num === 6 ? 'SIX' : `${num} RUNS`}
                            </span>
                            {isBlocked && (
                              <span className="absolute top-1.5 right-1.5 text-[8px] font-black uppercase text-red-500 px-1 py-0.5 bg-red-950/70 rounded">
                                {isRestrictedByPaceBarrage ? 'RESTRICTED' : 'BLOCKED'}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Waiting feedback banner when choice locked */}
                    {hasMyChoiceLocked && (
                      <div className="p-3 bg-[#0D0E1A] border border-[#C8FF3D]/30 rounded-2xl flex items-center justify-center gap-2.5 text-xs font-heading font-bold text-[#C8FF3D] animate-pulse">
                        <Clock className="w-4 h-4 shrink-0" />
                        <span>
                          {isMyTeamBatting
                            ? 'YOUR CHOICE IS LOCKED — WAITING FOR BOWLER'
                            : 'YOUR CHOICE IS LOCKED — WAITING FOR BATTER'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* COMPACT PLAYER CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* STRIKER ON BAT (5 cols) */}
                  <div className="md:col-span-5 bg-[#12142A] border border-[#2A2F60] rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between shadow-xl">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-[#1E2246] mb-3">
                        <span className="text-xs font-heading font-black uppercase tracking-wider text-[#C8FF3D] flex items-center gap-1.5">
                          <Zap className="w-4 h-4 fill-current" /> Striker on Crease
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
                            Score:{' '}
                            <span className="text-white font-bold font-number">{activeBatter?.runs || 0}</span> (
                            {activeBatter?.balls || 0}b) • 4s: {activeBatter?.fours || 0} • 6s:{' '}
                            {activeBatter?.sixes || 0}
                          </div>
                          <div className="text-[10px] text-[#C8FF3D] font-bold mt-0.5">
                            SR:{' '}
                            {activeBatter && activeBatter.balls > 0
                              ? ((activeBatter.runs / activeBatter.balls) * 100).toFixed(1)
                              : '0.0'}
                          </div>
                        </div>
                      </div>
                    </div>
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
                      <div className="flex items-center justify-between pb-3 border-b border-[#1E2246] mb-3">
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
                            Figures:{' '}
                            <span className="text-white font-bold font-number">{activeBowler?.wickets || 0} wkts</span>{' '}
                            for <span className="text-white font-bold font-number">{activeBowler?.runs || 0}</span> (
                            {activeBowler?.overs || 0}.{activeBowler?.balls || 0} ov)
                          </div>
                          <div className="text-[10px] text-[#FF3B5C] font-bold mt-0.5">
                            Quota: {activeBowler?.overs || 0}/{activeBowler?.maxOversAllowed || match.maxBowlerOvers}{' '}
                            overs max
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* -------------------------------------------------------- */}
              {/* 3. INLINE MODALS & SELECTION NOTIFICATIONS              */}
              {/* -------------------------------------------------------- */}
              {/* LATEST DELIVERY RESULT BANNER */}
              {match.lastDeliveryResult && (
                <div
                  className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-heading font-black shadow-lg animate-fade-in ${
                    match.lastDeliveryResult.isWicket
                      ? 'bg-red-950/40 border-red-500/60 text-red-300'
                      : match.lastDeliveryResult.runsScored === 6
                      ? 'bg-purple-950/40 border-purple-500/60 text-purple-300'
                      : match.lastDeliveryResult.runsScored === 4
                      ? 'bg-blue-950/40 border-blue-500/60 text-blue-300'
                      : 'bg-[#12142A] border-[#2A2F60] text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-black shrink-0 text-base shadow-md ${
                        match.lastDeliveryResult.isWicket
                          ? 'bg-red-500 text-white'
                          : match.lastDeliveryResult.runsScored === 6
                          ? 'bg-purple-500 text-white'
                          : match.lastDeliveryResult.runsScored === 4
                          ? 'bg-blue-500 text-white'
                          : 'bg-[#C8FF3D] text-[#0A0B14]'
                      }`}
                    >
                      {match.lastDeliveryResult.isWicket ? 'W' : match.lastDeliveryResult.runsScored}
                    </span>
                    <div>
                      <span className="block text-white uppercase text-sm md:text-base font-black">
                        {match.lastDeliveryResult.isWicket
                          ? 'WICKET!'
                          : match.lastDeliveryResult.runsScored === 6
                          ? '6 RUNS — MAXIMUM!'
                          : match.lastDeliveryResult.runsScored === 4
                          ? '4 RUNS — BOUNDARY!'
                          : match.lastDeliveryResult.runsScored === 0
                          ? 'DOT BALL'
                          : `${match.lastDeliveryResult.runsScored} RUNS`}
                      </span>
                      <p className="text-[11px] text-gray-300 font-normal mt-0.5">
                        {match.lastDeliveryResult.commentary}
                      </p>
                      <span className="text-[10px] text-gray-400 font-medium">
                        Ball {match.lastDeliveryResult.overNumber}.{match.lastDeliveryResult.ballNumber} • Batter [
                        {match.lastDeliveryResult.batterInput}] vs Bowler [{match.lastDeliveryResult.bowlerInput}]
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* WICKET: REPLACEMENT BATTER SELECTION */}
              {match.status === 'BATTER_SELECTION' && (
                <div className="bg-[#12142A] border-2 border-red-500/50 rounded-3xl p-6 shadow-2xl space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between pb-3 border-b border-[#1E2246]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <h3 className="font-heading font-bold text-sm uppercase text-white">
                        WICKET — {isMyTeamBatting ? 'SELECT THE NEXT BATTER' : 'WAITING FOR NEXT BATTER'} ({secondsRemaining}s)
                      </h3>
                    </div>
                    <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded-xl text-xs font-heading font-black">
                      {secondsRemaining}s remaining
                    </span>
                  </div>

                  {isMyTeamBatting ? (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-300">
                        Select which batter from your confirmed Playing XI takes strike next:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {(match.lineups[currentBattingTeamId]?.playingXI || [])
                          .filter(
                            pid =>
                              !inn.batters[pid]?.isOut &&
                              pid !== inn.nonStrikerId &&
                              pid !== inn.activeBatterId
                          )
                          .map(pid => {
                            const p = playerMap.get(pid);
                            return (
                              <button
                                key={pid}
                                type="button"
                                onClick={() => handleSelectReplacementBatter(pid)}
                                className="p-3 rounded-2xl bg-[#0D0E1A] border border-[#2A2F60] hover:border-[#C8FF3D] hover:bg-[#1E2246] transition-all flex items-center justify-between cursor-pointer"
                              >
                                <div className="flex items-center gap-2.5 truncate">
                                  <div className="w-9 h-9 rounded-xl bg-[#0A0B14] border border-[#23274D] overflow-hidden flex items-center justify-center shrink-0">
                                    {p?.image_url ? (
                                      <img
                                        src={p.image_url}
                                        alt={p.name}
                                        className="w-full h-full object-cover object-top"
                                      />
                                    ) : (
                                      <span className="font-heading font-black text-xs text-gray-400">
                                        {(p?.name || pid).slice(0, 2)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-left truncate">
                                    <span className="font-bold text-xs text-white block truncate">
                                      {p?.name || pid}
                                    </span>
                                    <span className="text-[10px] text-gray-400">{p?.primary_role || 'Batter'}</span>
                                  </div>
                                </div>
                                <OvrBadge ovr={p?.ovr || 75} size="xs" />
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-[#0A0B14] border border-[#1E2246] rounded-2xl text-center space-y-1">
                      <span className="text-xs font-bold text-red-400 uppercase tracking-wider block">
                        WAITING FOR OPPONENT TO SELECT THE NEXT BATTER
                      </span>
                      <p className="text-xs text-gray-400">
                        {battingF.name} has {secondsRemaining} seconds to choose who takes strike.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* OVER COMPLETED: NEXT BOWLER SELECTION */}
              {(match.status === 'BOWLER_SELECTION' || match.status === 'OVER_COMPLETED') && (
                <div className="bg-[#12142A] border-2 border-[#7C5CFF]/50 rounded-3xl p-6 shadow-2xl space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between pb-3 border-b border-[#1E2246]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#C8FF3D]" />
                      <h3 className="font-heading font-bold text-sm uppercase text-white">
                        OVER COMPLETED —{' '}
                        {isMyTeamBowling ? 'SELECT THE NEXT BOWLER' : 'WAITING FOR NEXT BOWLER'} ({secondsRemaining}s)
                      </h3>
                    </div>
                    <span className="px-3 py-1 bg-[#7C5CFF]/10 text-[#7C5CFF] border border-[#7C5CFF]/30 rounded-xl text-xs font-heading font-black">
                      {secondsRemaining}s remaining
                    </span>
                  </div>

                  {isMyTeamBowling ? (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-300">
                        Select which bowler will deliver Over {inn.oversCompleted + 1} (Quota max{' '}
                        {match.maxBowlerOvers} overs):
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {(match.lineups[currentBowlingTeamId]?.playingXI || []).map(pid => {
                          const p = playerMap.get(pid);
                          const bFig = inn.bowlers[pid];
                          const oversBowled = bFig?.overs || 0;
                          const maxAllowed = bFig?.maxOversAllowed || match.maxBowlerOvers;
                          const isPreviousBowler = pid === inn.previousOverBowlerId;
                          const isQuotaReached = oversBowled >= maxAllowed;

                          const otherEligible = Object.values(inn.bowlers).some(
                            b => b.playerId !== pid && b.overs < b.maxOversAllowed
                          );
                          const isConsecutiveForbidden = isPreviousBowler && otherEligible;
                          const isDisabled = isQuotaReached || isConsecutiveForbidden;

                          return (
                            <button
                              key={pid}
                              type="button"
                              disabled={isDisabled}
                              onClick={() => handleSelectBowler(pid)}
                              className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                                isDisabled
                                  ? 'bg-[#0A0B14] border-gray-800 text-gray-600 opacity-50 cursor-not-allowed'
                                  : 'bg-[#0D0E1A] border-[#2A2F60] hover:border-[#7C5CFF] hover:bg-[#1E2246] cursor-pointer'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <div className="w-9 h-9 rounded-xl bg-[#0A0B14] border border-[#23274D] overflow-hidden flex items-center justify-center shrink-0">
                                  {p?.image_url ? (
                                    <img
                                      src={p.image_url}
                                      alt={p.name}
                                      className="w-full h-full object-cover object-top"
                                    />
                                  ) : (
                                    <span className="font-heading font-black text-xs text-gray-400">
                                      {(p?.name || pid).slice(0, 2)}
                                    </span>
                                  )}
                                </div>
                                <div className="text-left truncate">
                                  <span className="font-bold text-xs text-white block truncate">
                                    {p?.name || pid}
                                  </span>
                                  <span className="text-[10px] text-gray-400">
                                    {oversBowled}/{maxAllowed} ov {isPreviousBowler ? '• Last Over' : ''}
                                  </span>
                                </div>
                              </div>
                              <OvrBadge ovr={p?.ovr || 75} size="xs" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-[#0A0B14] border border-[#1E2246] rounded-2xl text-center space-y-1">
                      <span className="text-xs font-bold text-[#7C5CFF] uppercase tracking-wider block">
                        WAITING FOR OPPONENT TO SELECT THE NEXT BOWLER
                      </span>
                      <p className="text-xs text-gray-400">
                        {bowlingF.name} has {secondsRemaining} seconds to choose bowler for Over {inn.oversCompleted + 1}.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* -------------------------------------------------------- */}
              {/* 4. LOWER SECTION: BALL-BY-BALL TIMELINE & OVER RESULTS   */}
              {/* -------------------------------------------------------- */}
              <div className="bg-[#12142A] border border-[#2A2F60] rounded-3xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-heading font-black uppercase tracking-wider text-gray-300">
                    Over-by-Over Delivery Results
                  </h4>
                  <span className="text-[11px] text-gray-400">Last 12 Deliveries</span>
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
                    <span className="truncate">
                      {match.ballHistory[match.ballHistory.length - 1].commentary}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
      </div>

      {/* ============================================================== */}
      {/* 5. BOWLER 3-NUMBER BLOCK MODAL                                 */}
      {/* ============================================================== */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12142A] border border-[#2A2F60] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E2246]">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#FFC93D]" />
                <h3 className="font-heading font-black text-base uppercase text-white">
                  ACTIVATE NUMBER BLOCK
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBlockModalOpen(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-300">
              Pick exactly <span className="text-[#FFC93D] font-bold">3 scoring choices</span> that the batter
              cannot select for this delivery:
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

      {/* ============================================================== */}
      {/* 6. SQUADS SIDE PANEL (Playing XIs & Bench)                      */}
      {/* ============================================================== */}
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
              type="button"
              onClick={() => setIsSquadPanelOpen(false)}
              className="text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 p-2 bg-[#0A0B14] border-b border-[#1E2246]">
            <button
              type="button"
              onClick={() => setActiveSquadTab('HOME')}
              className={`py-2 text-xs font-heading font-black uppercase rounded-xl transition-all cursor-pointer ${
                activeSquadTab === 'HOME'
                  ? 'bg-[#1E2246] text-[#C8FF3D] border border-[#C8FF3D]/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {homeF.name}
            </button>
            <button
              type="button"
              onClick={() => setActiveSquadTab('AWAY')}
              className={`py-2 text-xs font-heading font-black uppercase rounded-xl transition-all cursor-pointer ${
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
              const lineup = match.lineups[currentFid]?.playingXI || [];

              return (
                <div className="space-y-4">
                  <div>
                    <h5 className="text-[11px] font-heading font-black uppercase tracking-wider text-[#C8FF3D] mb-2">
                      Confirmed Playing XI (11 Starters)
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
                                : isOut
                                ? 'bg-red-950/20 border-red-900/40 opacity-60'
                                : 'bg-[#12142A] border-[#1E2246]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <div className="w-8 h-8 rounded-lg bg-[#0A0B14] border border-[#23274D] overflow-hidden flex items-center justify-center shrink-0">
                                {p?.image_url ? (
                                  <img
                                    src={p.image_url}
                                    alt={p.name}
                                    className="w-full h-full object-cover object-top"
                                  />
                                ) : (
                                  <span className="font-heading font-black text-[10px] text-gray-400">
                                    {(p?.name || pid).slice(0, 2)}
                                  </span>
                                )}
                              </div>
                              <div className="truncate">
                                <span
                                  className={`font-bold block truncate ${
                                    isOut ? 'line-through text-gray-500' : 'text-white'
                                  }`}
                                >
                                  {p?.name || pid}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {p?.primary_role || 'Player'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <OvrBadge ovr={p?.ovr || 75} size="xs" />
                              {isStriker && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-heading font-black uppercase bg-[#C8FF3D] text-[#0A0B14]">
                                  Striker
                                </span>
                              )}
                              {isNonStriker && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-heading font-black uppercase bg-[#0078FF] text-white">
                                  Non-Str
                                </span>
                              )}
                              {isBowler && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-heading font-black uppercase bg-[#FF3B5C] text-white">
                                  Bowler
                                </span>
                              )}
                              {isOut && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-heading font-black uppercase bg-red-900/60 text-red-300">
                                  OUT
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. DETAILED SCORECARD MODAL                                    */}
      {/* ============================================================== */}
      {isScorecardOpen && (
        <ScorecardModal match={match} onClose={() => setIsScorecardOpen(false)} />
      )}
    </div>
  );
};
