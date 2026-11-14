import React, { useState, useEffect, useRef } from 'react';
import {
  Trophy,
  Clock,
  Zap,
  Shield,
  Flame,
  ArrowLeft,
  FileText,
  AlertCircle,
  Eye,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { IPLTeamId, IPL_FRANCHISES } from '../../types';
import { AuthUser } from '../../services/auth';
import {
  LiveMatch,
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
  onExit: () => void;
}

export const LiveMatchArena: React.FC<LiveMatchArenaProps> = ({
  initialMatch,
  user,
  tournamentId,
  onExit
}) => {
  const [match, setMatch] = useState<LiveMatch>(initialMatch);
  const [selectedChoice, setSelectedChoice] = useState<HandCricketChoice | null>(null);
  const [activeBowlerAbility, setActiveBowlerAbility] = useState<BowlerAbilityType | null>(null);
  const [activeBatterAbility, setActiveBatterAbility] = useState<BatterAbilityType | null>(null);
  const [selectedBlockedNumbers, setSelectedBlockedNumbers] = useState<number[]>([]);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScorecardOpen, setIsScorecardOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Identify user role in match
  const myLineup = Object.entries(match.lineups).find(([fid]) => {
    // Check if user is associated with this franchise
    // In demo / standalone, if user is host or player
    return true;
  });

  const inn = match.currentInnings === 1 ? match.innings1 : match.innings2;
  const isBattingTeam = inn ? inn.battingFranchiseId in match.lineups : false;
  const isBowlingTeam = inn ? inn.bowlingFranchiseId in match.lineups : false;

  // Real-time polling / sync with server for live match state
  useEffect(() => {
    const interval = setInterval(async () => {
      if (match.status === 'COMPLETED') return;
      try {
        const updated = await TournamentApi.getLiveMatch(match.id);
        if (updated) {
          setMatch(updated);
        }
      } catch {}
    }, 1200);

    return () => clearInterval(interval);
  }, [match.id, match.status]);

  // Turn Timer countdown
  useEffect(() => {
    if (match.status === 'COMPLETED' || match.status === 'TOSS') return;

    const timer = setInterval(() => {
      const expiresAt = match.pendingInputs?.turnExpiresAt || 0;
      if (expiresAt > 0) {
        const diff = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
        setSecondsRemaining(diff);

        if (diff <= 0 && !isSubmitting) {
          // Trigger timeout resolution on backend
          TournamentApi.triggerTimeout(match.id).then(res => {
            if (res.match) {
              setMatch(res.match);
              setSelectedChoice(null);
            }
          });
        }
      }
    }, 500);

    return () => clearInterval(timer);
  }, [match.id, match.pendingInputs?.turnExpiresAt, match.status, isSubmitting]);

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

  // Hand Cricket Choice Submission
  const handleSubmitPick = async (choice: HandCricketChoice) => {
    if (isSubmitting || match.status === 'COMPLETED') return;
    setIsSubmitting(true);
    setError(null);
    setSelectedChoice(choice);

    try {
      // Determine which franchise to submit for
      const fid = inn?.battingFranchiseId || match.homeFranchiseId;
      const res = await TournamentApi.submitChoice(match.id, {
        franchiseId: fid,
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

  const activeBatter = inn.batters[inn.activeBatterId];
  const activeBowler = inn.bowlers[inn.activeBowlerId];

  // Calculate OVR diff
  const batterOvr = activeBatter?.ovr || 75;
  const bowlerOvr = activeBowler?.ovr || 75;
  const bowlerDiff = bowlerOvr - batterOvr;
  const batterDiff = batterOvr - bowlerOvr;

  const currentRunRate = inn.oversCompleted > 0 || inn.ballsInCurrentOver > 0
    ? ((inn.totalRuns / (inn.oversCompleted + inn.ballsInCurrentOver / 6))).toFixed(2)
    : '0.00';

  const requiredRuns = inn.targetRuns ? inn.targetRuns - inn.totalRuns : 0;
  const remainingBalls = match.matchOvers * 6 - (inn.oversCompleted * 6 + inn.ballsInCurrentOver);
  const requiredRunRate = remainingBalls > 0 && inn.targetRuns
    ? ((requiredRuns / (remainingBalls / 6))).toFixed(2)
    : '0.00';

  return (
    <div className="min-h-screen bg-[#07080F] text-white flex flex-col font-sans">
      {/* Top Match Bar */}
      <div className="bg-[#0D0E1A] border-b border-[#1E2246] px-4 md:px-8 py-3 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <HeaderBackButton label="Tournament Hub" onClick={onExit} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm uppercase tracking-wider text-white">
                {battingF.shortName} vs {bowlingF.shortName}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#C8FF3D]/10 text-[#C8FF3D] border border-[#C8FF3D]/30">
                {match.status}
              </span>
            </div>
            <div className="text-[11px] text-gray-400">
              {match.matchOvers} Overs Match • Innings {match.currentInnings}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsScorecardOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-[#12142A] border border-[#2A2F60] text-gray-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-[#C8FF3D]" />
            Scorecard
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border-b border-red-500/30 text-red-400 text-xs flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Arena Content */}
      <div className="grow max-w-6xl w-full mx-auto p-4 md:p-6 flex flex-col justify-between space-y-6">
        {/* TOSS STATE OVERLAY */}
        {match.status === 'TOSS' && (
          <div className="my-auto bg-[#12142A] border border-[#2A2F60] rounded-2xl p-8 text-center max-w-lg mx-auto shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-[#FFC93D]/10 border border-[#FFC93D]/30 text-[#FFC93D] flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-wider mb-2 font-heading">
              Match Toss Ceremony
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              {match.homeFranchiseId} has won the toss. Choose whether to Bat or Bowl first!
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleTossDecision('BAT')}
                className="py-3.5 rounded-xl bg-[#C8FF3D] text-[#0A0B14] font-black uppercase text-sm tracking-wider shadow-[0_0_15px_rgba(200,255,61,0.25)] hover:scale-105 transition-all"
              >
                Bat First 🏏
              </button>
              <button
                onClick={() => handleTossDecision('BOWL')}
                className="py-3.5 rounded-xl bg-[#7C5CFF] text-white font-black uppercase text-sm tracking-wider shadow-[0_0_15px_rgba(124,92,255,0.25)] hover:scale-105 transition-all"
              >
                Bowl First 🎯
              </button>
            </div>
          </div>
        )}

        {/* MATCH COMPLETED OVERLAY */}
        {match.status === 'COMPLETED' && (
          <div className="my-auto bg-[#12142A] border border-[#C8FF3D]/40 rounded-2xl p-8 text-center max-w-xl mx-auto shadow-[0_0_35px_rgba(200,255,61,0.15)] animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-[#C8FF3D]/20 text-[#C8FF3D] flex items-center justify-center mx-auto mb-4 border border-[#C8FF3D]/50 shadow-[0_0_20px_rgba(200,255,61,0.3)]">
              <Trophy className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-wider text-white font-heading">
              {match.resultSummary || 'Match Completed!'}
            </h2>
            <p className="text-xs text-gray-400 mt-2 mb-6">
              Scores: {match.innings1.battingFranchiseId} {match.innings1.totalRuns}/{match.innings1.totalWickets} • {match.innings2?.battingFranchiseId} {match.innings2?.totalRuns}/{match.innings2?.totalWickets}
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setIsScorecardOpen(true)}
                className="px-6 py-3 rounded-xl bg-[#1E2246] border border-[#2A2F60] text-white font-bold text-xs uppercase tracking-wider hover:border-[#C8FF3D] transition-all"
              >
                View Full Scorecard
              </button>
              <button
                onClick={onExit}
                className="px-6 py-3 rounded-xl bg-[#C8FF3D] text-[#0A0B14] font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(200,255,61,0.3)] transition-all"
              >
                Back to Tournament Hub
              </button>
            </div>
          </div>
        )}

        {/* LIVE MATCH BOARD (Active Innings) */}
        {(match.status === 'INNINGS_1' || match.status === 'INNINGS_2') && (
          <>
            {/* Scorecard Header Ribbon */}
            <div className="bg-[#12142A] border border-[#2A2F60] rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <img
                  src={battingF.logoUrl}
                  alt={battingF.name}
                  className="w-14 h-14 object-contain rounded-full bg-black/40 p-1 border border-[#2A2F60]"
                  onError={e => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl md:text-4xl font-black text-white font-heading">
                      {inn.totalRuns}/{inn.totalWickets}
                    </span>
                    <span className="text-sm md:text-base font-bold text-gray-400">
                      ({inn.oversCompleted}.{inn.ballsInCurrentOver}/{match.matchOvers} ov)
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 font-medium flex items-center gap-3 mt-1">
                    <span>CRR: <span className="text-[#C8FF3D] font-bold">{currentRunRate}</span></span>
                    {inn.targetRuns && (
                      <>
                        <span>•</span>
                        <span>Target: <span className="text-white font-bold">{inn.targetRuns}</span></span>
                        <span>•</span>
                        <span>Need <span className="text-[#FF3B5C] font-bold">{requiredRuns}</span> from <span className="text-white font-bold">{remainingBalls}b</span> (RRR: {requiredRunRate})</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Turn Countdown Circular/Linear */}
              <div className="flex items-center gap-3">
                <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl border ${
                  secondsRemaining <= 5
                    ? 'border-[#FF3B5C] bg-[#FF3B5C]/10 text-[#FF3B5C] animate-pulse'
                    : 'border-[#C8FF3D]/40 bg-[#C8FF3D]/5 text-[#C8FF3D]'
                }`}>
                  <span className="text-xl font-black leading-none">{secondsRemaining}</span>
                  <span className="text-[9px] uppercase font-bold tracking-tighter opacity-80">SEC</span>
                </div>
              </div>
            </div>

            {/* Duel Arena: Active Batter vs Active Bowler */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Batter Card */}
              <div className="bg-[#12142A] border border-[#2A2F60] rounded-2xl p-5 relative overflow-hidden">
                <div className="flex items-center justify-between pb-3 border-b border-[#1E2246] mb-4">
                  <span className="text-xs font-black uppercase tracking-wider text-[#C8FF3D] flex items-center gap-1.5">
                    <Zap className="w-4 h-4 fill-current" /> Striker on Bat
                  </span>
                  <OvrBadge ovr={batterOvr} size="sm" />
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-black/40 border border-[#2A2F60] flex items-center justify-center font-black text-xl text-white">
                    🏏
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">{activeBatter?.name || 'Batter'}</h3>
                    <div className="text-xs text-gray-400 mt-1">
                      Score: <span className="text-white font-bold">{activeBatter?.runs || 0}</span> ({activeBatter?.balls || 0} balls) • 4s: {activeBatter?.fours || 0} • 6s: {activeBatter?.sixes || 0}
                    </div>
                  </div>
                </div>

                {/* Batter Abilities Trigger */}
                {batterDiff >= 3 && (
                  <div className="mt-4 pt-3 border-t border-[#1E2246] flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 uppercase font-bold">OVR Ability:</span>
                    {batterDiff >= 8 ? (
                      <button
                        onClick={() => setActiveBatterAbility(activeBatterAbility === 'SECRET_DOUBLE_SHOT' ? null : 'SECRET_DOUBLE_SHOT')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                          activeBatterAbility === 'SECRET_DOUBLE_SHOT'
                            ? 'bg-[#FF3B5C] text-white shadow-[0_0_12px_rgba(255,59,92,0.4)]'
                            : 'bg-[#1E2246] text-[#FF3B5C] border border-[#FF3B5C]/30 hover:border-[#FF3B5C]'
                        }`}
                      >
                        ⚡ Secret Double Shot (2X Runs)
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveBatterAbility(activeBatterAbility === 'COMBINATION_SHOT' ? null : 'COMBINATION_SHOT')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                          activeBatterAbility === 'COMBINATION_SHOT'
                            ? 'bg-[#7C5CFF] text-white shadow-[0_0_12px_rgba(124,92,255,0.4)]'
                            : 'bg-[#1E2246] text-[#7C5CFF] border border-[#7C5CFF]/30 hover:border-[#7C5CFF]'
                        }`}
                      >
                        ⚡ Combination Shot (Score = Bat + Bowl)
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Bowler Card */}
              <div className="bg-[#12142A] border border-[#2A2F60] rounded-2xl p-5 relative overflow-hidden">
                <div className="flex items-center justify-between pb-3 border-b border-[#1E2246] mb-4">
                  <span className="text-xs font-black uppercase tracking-wider text-[#FF3B5C] flex items-center gap-1.5">
                    <Shield className="w-4 h-4" /> Active Bowler
                  </span>
                  <OvrBadge ovr={bowlerOvr} size="sm" />
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-black/40 border border-[#2A2F60] flex items-center justify-center font-black text-xl text-white">
                    🎯
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">{activeBowler?.name || 'Bowler'}</h3>
                    <div className="text-xs text-gray-400 mt-1">
                      Figures: <span className="text-white font-bold">{activeBowler?.wickets || 0} wkts</span> for <span className="text-white font-bold">{activeBowler?.runs || 0}</span> ({activeBowler?.overs || 0}.{activeBowler?.balls || 0} ov)
                    </div>
                  </div>
                </div>

                {/* Bowler Abilities Trigger */}
                {bowlerDiff >= 3 && !activeBowler?.abilityUsedInCurrentOver && (
                  <div className="mt-4 pt-3 border-t border-[#1E2246] flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 uppercase font-bold">OVR Ability:</span>
                    {bowlerDiff >= 8 ? (
                      <button
                        onClick={() => setActiveBowlerAbility(activeBowlerAbility === 'ELITE_NUMBER_BLOCK' ? null : 'ELITE_NUMBER_BLOCK')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                          activeBowlerAbility === 'ELITE_NUMBER_BLOCK'
                            ? 'bg-[#FF3B5C] text-white shadow-[0_0_12px_rgba(255,59,92,0.4)]'
                            : 'bg-[#1E2246] text-[#FF3B5C] border border-[#FF3B5C]/30 hover:border-[#FF3B5C]'
                        }`}
                      >
                        🔥 Elite Number Block (Batter can only pick 4 or 6!)
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveBowlerAbility(activeBowlerAbility === 'NUMBER_BLOCK' ? null : 'NUMBER_BLOCK')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                          activeBowlerAbility === 'NUMBER_BLOCK'
                            ? 'bg-[#FFC93D] text-[#0A0B14] shadow-[0_0_12px_rgba(255,201,61,0.4)]'
                            : 'bg-[#1E2246] text-[#FFC93D] border border-[#FFC93D]/30 hover:border-[#FFC93D]'
                        }`}
                      >
                        🛡️ Number Block (Block 3 Choices)
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* HAND-CRICKET ACTION BUTTONS: 0, 1, 2, 3, 4, 6 */}
            <div className="bg-[#12142A] border border-[#2A2F60] rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-wider text-gray-300">
                  Select Hand-Cricket Number
                </span>
                <span className="text-xs text-gray-400">
                  Same Number = OUT • Different = Runs Scored
                </span>
              </div>

              <div className="grid grid-cols-6 gap-3">
                {([0, 1, 2, 3, 4, 6] as HandCricketChoice[]).map(num => {
                  const isBlocked = match.pendingInputs?.blockedNumbers?.includes(num);
                  const isSelected = selectedChoice === num;

                  return (
                    <button
                      key={num}
                      disabled={isBlocked || isSubmitting}
                      onClick={() => handleSubmitPick(num)}
                      className={`h-20 rounded-xl font-black text-2xl md:text-3xl border transition-all flex flex-col items-center justify-center relative ${
                        isBlocked
                          ? 'bg-red-950/20 border-red-900/40 text-red-500/40 cursor-not-allowed'
                          : isSelected
                          ? 'bg-[#C8FF3D] border-[#C8FF3D] text-[#0A0B14] shadow-[0_0_25px_rgba(200,255,61,0.4)] scale-105'
                          : 'bg-[#0D0E1A] border-[#2A2F60] text-white hover:border-[#C8FF3D] hover:bg-[#1E2246]'
                      }`}
                    >
                      <span>{num}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                        {num === 0 ? 'DOT' : num === 4 ? 'FOUR' : num === 6 ? 'SIX' : 'RUNS'}
                      </span>
                      {isBlocked && (
                        <span className="absolute top-1 right-1 text-[9px] font-bold text-red-500">
                          BLOCKED
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ball-by-Ball Timeline & Commentary */}
            <div className="bg-[#12142A] border border-[#2A2F60] rounded-2xl p-5">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">
                Recent Ball-by-Ball Timeline
              </h4>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {match.ballHistory.slice(-10).map((ball, idx) => {
                  const isW = ball.isWicket;
                  const is6 = ball.runsScored === 6;
                  const is4 = ball.runsScored === 4;
                  return (
                    <div
                      key={ball.id || idx}
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 border ${
                        isW
                          ? 'bg-[#FF3B5C] border-[#FF3B5C] text-white'
                          : is6
                          ? 'bg-[#7C5CFF] border-[#7C5CFF] text-white'
                          : is4
                          ? 'bg-[#0078FF] border-[#0078FF] text-white'
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
                  <span className="text-xs text-gray-500 italic">No deliveries yet. Toss completed.</span>
                )}
              </div>

              {match.ballHistory.length > 0 && (
                <div className="mt-3 p-3 bg-[#0D0E1A] rounded-xl border border-[#1E2246] text-xs text-gray-300">
                  <span className="text-[#C8FF3D] font-bold">Latest Delivery: </span>
                  {match.ballHistory[match.ballHistory.length - 1].commentary}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Scorecard Modal */}
      {isScorecardOpen && (
        <ScorecardModal match={match} onClose={() => setIsScorecardOpen(false)} />
      )}
    </div>
  );
};

