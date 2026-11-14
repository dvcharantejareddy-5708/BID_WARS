import React, { useState } from 'react';
import { Trophy, Calendar, Table, Award, Users, Play, FileText, CheckCircle2 } from 'lucide-react';
import { Tournament, Fixture, LiveMatch } from '../../tournamentTypes';
import { AuthUser } from '../../services/auth';
import { IPL_FRANCHISES } from '../../types';
import { PointsTableView } from './PointsTableView';
import { PlayerStatsView } from './PlayerStatsView';
import { MatchPrepModal } from './MatchPrepModal';
import { ScorecardModal } from './ScorecardModal';
import { TournamentApi } from '../../services/tournamentApi';
import { OvrBadge } from '../OvrBadge';
import { HeaderBackButton } from '../common/HeaderBackButton';

interface TournamentHubProps {
  tournament: Tournament;
  user: AuthUser;
  onBack: () => void;
  onOpenMatch: (match: LiveMatch) => void;
  onRefresh: () => void;
}

export const TournamentHub: React.FC<TournamentHubProps> = ({
  tournament,
  user,
  onBack,
  onOpenMatch,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'FIXTURES' | 'STANDINGS' | 'STATS' | 'SQUAD'>('FIXTURES');
  const [selectedFixtureForPrep, setSelectedFixtureForPrep] = useState<Fixture | null>(null);
  const [selectedMatchForScorecard, setSelectedMatchForScorecard] = useState<LiveMatch | null>(null);
  const [isLoadingMatch, setIsLoadingMatch] = useState(false);

  const myMember = tournament.members.find(m => m.userId === user.id);
  const myFranchise = myMember?.franchiseId;
  const myTeam = myFranchise ? tournament.teams[myFranchise] : null;

  const handlePlayFixture = async (fixture: Fixture) => {
    setIsLoadingMatch(true);
    try {
      if (fixture.status === 'IN_PROGRESS' && fixture.matchId) {
        const m = await TournamentApi.getLiveMatch(fixture.matchId);
        if (m) onOpenMatch(m);
      } else {
        const liveMatch = await TournamentApi.startMatch(tournament.id, fixture.id, user.id);
        onOpenMatch(liveMatch);
      }
    } catch (err) {
      console.error('Error starting match:', err);
    } finally {
      setIsLoadingMatch(false);
    }
  };

  const handleViewScorecard = async (fixture: Fixture) => {
    if (!fixture.matchId) return;
    try {
      const m = await TournamentApi.getLiveMatch(fixture.matchId);
      if (m) setSelectedMatchForScorecard(m);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[#07080F] text-white p-4 md:p-8">
      {/* Top Tournament Header */}
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <HeaderBackButton label="Dashboard" onClick={onBack} />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider font-heading">
                {tournament.name}
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-[#C8FF3D]/10 text-[#C8FF3D] border border-[#C8FF3D]/30">
                {tournament.status}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Match Format: {tournament.matchOvers} Overs • {tournament.members.length} Teams • Mode: Hand-Cricket
            </p>
          </div>
        </div>

        {/* User Franchise Pill */}
        {myFranchise && (
          <div className="flex items-center gap-3 px-4 py-2 bg-[#12142A] border border-[#2A2F60] rounded-xl">
            <img
              src={IPL_FRANCHISES[myFranchise].logoUrl}
              alt={IPL_FRANCHISES[myFranchise].name}
              className="w-7 h-7 object-contain rounded-full bg-black/40"
              onError={e => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="text-left">
              <div className="text-xs font-black text-white">{IPL_FRANCHISES[myFranchise].shortName}</div>
              <div className="text-[10px] text-gray-400">My Franchise</div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto mb-8 border-b border-[#1E2246] flex items-center gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('FIXTURES')}
          className={`py-3 px-5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'FIXTURES'
              ? 'border-[#C8FF3D] text-[#C8FF3D]'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Fixtures & Matches ({tournament.fixtures.length})
        </button>

        <button
          onClick={() => setActiveTab('STANDINGS')}
          className={`py-3 px-5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'STANDINGS'
              ? 'border-[#C8FF3D] text-[#C8FF3D]'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Table className="w-4 h-4" />
          Points Table
        </button>

        <button
          onClick={() => setActiveTab('STATS')}
          className={`py-3 px-5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'STATS'
              ? 'border-[#C8FF3D] text-[#C8FF3D]'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Award className="w-4 h-4" />
          Tournament Leaders & Caps
        </button>

        {myTeam && (
          <button
            onClick={() => setActiveTab('SQUAD')}
            className={`py-3 px-5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'SQUAD'
                ? 'border-[#C8FF3D] text-[#C8FF3D]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            My Squad ({myTeam.squad.length})
          </button>
        )}
      </div>

      {/* Tab Panels */}
      <div className="max-w-7xl mx-auto">
        {/* FIXTURES TAB */}
        {activeTab === 'FIXTURES' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tournament.fixtures.map(f => {
              const homeF = IPL_FRANCHISES[f.homeFranchiseId];
              const awayF = IPL_FRANCHISES[f.awayFranchiseId];
              const isMyMatch = f.homeFranchiseId === myFranchise || f.awayFranchiseId === myFranchise;
              const isCompleted = f.status === 'COMPLETED';
              const isInProgress = f.status === 'IN_PROGRESS';

              return (
                <div
                  key={f.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isMyMatch
                      ? 'bg-[#12142A] border-[#C8FF3D]/50 shadow-[0_0_15px_rgba(200,255,61,0.08)]'
                      : 'bg-[#0D0E1A] border-[#1E2246]'
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[#1E2246] mb-4 text-xs text-gray-400">
                    <span className="font-bold text-white uppercase tracking-wider">
                      Match {f.matchNumber} • {f.stage}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      isCompleted
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : isInProgress
                        ? 'bg-[#FF3B5C]/20 text-[#FF3B5C] border border-[#FF3B5C]/40 animate-pulse'
                        : 'bg-[#1E2246] text-gray-400'
                    }`}>
                      {f.status}
                    </span>
                  </div>

                  {/* Teams Duel Card */}
                  <div className="flex items-center justify-between py-2">
                    {/* Home Team */}
                    <div className="flex items-center gap-3 w-5/12">
                      <img
                        src={homeF.logoUrl}
                        alt={homeF.name}
                        className="w-10 h-10 object-contain rounded-full bg-black/40 p-1"
                        onError={e => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="truncate">
                        <div className="font-black text-sm text-white">{homeF.shortName}</div>
                        <div className="text-[11px] text-gray-400 truncate">{homeF.name}</div>
                      </div>
                    </div>

                    <div className="text-center font-black text-xs text-gray-500 w-2/12">
                      VS
                    </div>

                    {/* Away Team */}
                    <div className="flex items-center justify-end gap-3 w-5/12 text-right">
                      <div className="truncate">
                        <div className="font-black text-sm text-white">{awayF.shortName}</div>
                        <div className="text-[11px] text-gray-400 truncate">{awayF.name}</div>
                      </div>
                      <img
                        src={awayF.logoUrl}
                        alt={awayF.name}
                        className="w-10 h-10 object-contain rounded-full bg-black/40 p-1"
                        onError={e => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </div>

                  {/* Match Result / Action Button */}
                  <div className="mt-4 pt-3 border-t border-[#1E2246] flex items-center justify-between">
                    <div className="text-xs">
                      {isCompleted ? (
                        <span className="text-[#C8FF3D] font-bold">{f.matchResultSummary}</span>
                      ) : (
                        <span className="text-gray-400">{f.matchOvers} Overs Per Innings</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Set Lineup for my team */}
                      {isMyMatch && !isCompleted && myTeam && (
                        <button
                          onClick={() => setSelectedFixtureForPrep(f)}
                          className="px-3 py-1.5 rounded-lg bg-[#1E2246] text-gray-300 hover:text-white text-xs font-bold transition-colors"
                        >
                          Playing XI
                        </button>
                      )}

                      {/* Play or Spectate */}
                      {!isCompleted && (
                        <button
                          disabled={isLoadingMatch}
                          onClick={() => handlePlayFixture(f)}
                          className="px-4 py-1.5 rounded-lg bg-[#C8FF3D] text-[#0A0B14] font-black text-xs uppercase tracking-wider shadow-[0_0_12px_rgba(200,255,61,0.2)] hover:opacity-95 transition-all flex items-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          {isMyMatch ? (isInProgress ? 'Resume' : 'Play') : 'Spectate'}
                        </button>
                      )}

                      {isCompleted && f.matchId && (
                        <button
                          onClick={() => handleViewScorecard(f)}
                          className="px-3 py-1.5 rounded-lg bg-[#1E2246] text-gray-300 hover:text-white text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#C8FF3D]" />
                          Scorecard
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* STANDINGS TAB */}
        {activeTab === 'STANDINGS' && (
          <PointsTableView
            pointsTable={tournament.pointsTable}
            qualifyingCount={tournament.teamsCount === 4 ? 2 : 4}
          />
        )}

        {/* STATS TAB */}
        {activeTab === 'STATS' && (
          <PlayerStatsView stats={tournament.playerStats} />
        )}

        {/* MY SQUAD TAB */}
        {activeTab === 'SQUAD' && myTeam && (
          <div className="bg-[#12142A] border border-[#2A2F60] rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#1E2246] mb-6">
              <div>
                <h3 className="text-lg font-black uppercase text-white font-heading">
                  {IPL_FRANCHISES[myTeam.franchiseId].name} Squad
                </h3>
                <p className="text-xs text-gray-400">
                  Total Players: {myTeam.squad.length} • Purse Remaining: ₹{myTeam.purseRemaining.toFixed(2)} Cr
                </p>
              </div>

              <button
                onClick={() => {
                  const upcoming = tournament.fixtures.find(f =>
                    f.status !== 'COMPLETED' &&
                    (f.homeFranchiseId === myFranchise || f.awayFranchiseId === myFranchise)
                  );
                  if (upcoming) setSelectedFixtureForPrep(upcoming);
                }}
                className="px-4 py-2 rounded-xl bg-[#C8FF3D] text-[#0A0B14] font-black uppercase text-xs tracking-wider shadow-[0_0_15px_rgba(200,255,61,0.2)]"
              >
                Configure Playing XI
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {myTeam.squad.map(player => (
                <div
                  key={player.id}
                  className="p-3 bg-[#0D0E1A] border border-[#1E2246] rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={player.image_url || '/players/default.png'}
                      alt={player.name}
                      className="w-10 h-10 object-cover rounded-full bg-black/40 border border-[#2A2F60]"
                      onError={e => {
                        (e.target as HTMLImageElement).src = '/logos/ipl.png';
                      }}
                    />
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-1.5">
                        {player.name}
                        {player.is_overseas && (
                          <span className="text-[10px] px-1 bg-blue-500/20 text-blue-400 rounded">✈️</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 capitalize">
                        {player.category} • {player.primary_role}
                      </div>
                    </div>
                  </div>
                  <OvrBadge ovr={player.ovr || 75} size="sm" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Match Prep Modal */}
      {selectedFixtureForPrep && myFranchise && myTeam && (
        <MatchPrepModal
          isOpen={Boolean(selectedFixtureForPrep)}
          onClose={() => setSelectedFixtureForPrep(null)}
          tournamentId={tournament.id}
          fixtureId={selectedFixtureForPrep.id}
          franchiseId={myFranchise}
          squad={myTeam.squad}
          userId={user.id}
          initialPlayingXI={myTeam.defaultPlayingXI?.playingXI}
          initialCaptainId={myTeam.defaultPlayingXI?.captainId}
          initialViceCaptainId={myTeam.defaultPlayingXI?.viceCaptainId}
          initialImpactPlayerId={myTeam.defaultPlayingXI?.impactPlayerId}
          onSavedAndReady={() => {
            onRefresh();
            handlePlayFixture(selectedFixtureForPrep);
          }}
        />
      )}

      {/* Scorecard Modal */}
      {selectedMatchForScorecard && (
        <ScorecardModal
          match={selectedMatchForScorecard}
          onClose={() => setSelectedMatchForScorecard(null)}
        />
      )}
    </div>
  );
};

