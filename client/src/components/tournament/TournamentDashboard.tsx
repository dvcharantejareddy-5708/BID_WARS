import React, { useState, useEffect } from 'react';
import { Trophy, Plus, LogIn, LogOut, ArrowRight, ShieldCheck, Flame, Users, Clock, Sparkles, RefreshCw } from 'lucide-react';
import { AuthUser, authService } from '../../services/auth';
import { Tournament } from '../../tournamentTypes';
import { TournamentApi } from '../../services/tournamentApi';
import { CreateTournamentModal } from './CreateTournamentModal';
import { TournamentLobby } from './TournamentLobby';
import { TournamentHub } from './TournamentHub';
import { LiveMatchArena } from './LiveMatchArena';
import { LiveMatch } from '../../tournamentTypes';

interface TournamentDashboardProps {
  onSwitchToQuickAuction: () => void;
  onEnterAuctionRoom: (roomCode: string) => void;
}

export const TournamentDashboard: React.FC<TournamentDashboardProps> = ({
  onSwitchToQuickAuction,
  onEnterAuctionRoom
}) => {
  const [user, setUser] = useState<AuthUser>(authService.getUser());
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [viewState, setViewState] = useState<'DASHBOARD' | 'LOBBY' | 'HUB' | 'MATCH'>('DASHBOARD');
  const [activeLiveMatch, setActiveLiveMatch] = useState<LiveMatch | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = authService.onAuthStateChange(u => {
      if (u) setUser(u);
    });
    return unsub;
  }, []);

  const loadTournaments = async () => {
    setIsLoading(true);
    try {
      const list = await TournamentApi.getTournaments();
      setTournaments(list);
      // If we are currently viewing an active tournament, refresh it too
      if (activeTournament) {
        const updated = list.find(t => t.id === activeTournament.id);
        if (updated) setActiveTournament(updated);
      }
    } catch (err) {
      console.error('Failed to load tournaments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTournaments();
  }, []);

  const handleGoogleSignIn = async () => {
    await authService.signInWithGoogle();
  };

  const handleSignOut = async () => {
    await authService.signOut();
  };

  const handleOpenTournament = (t: Tournament) => {
    setActiveTournament(t);
    if (['TOURNAMENT_LIVE', 'PLAYOFFS', 'COMPLETED'].includes(t.status)) {
      setViewState('HUB');
    } else {
      setViewState('LOBBY');
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoinError(null);
    try {
      const t = await TournamentApi.getTournament(joinCode.trim().toUpperCase());
      if (t) {
        handleOpenTournament(t);
        setJoinCode('');
      } else {
        setJoinError('Tournament not found with that code');
      }
    } catch (err: any) {
      setJoinError(err.message || 'Error finding tournament');
    }
  };

  // Sub-views
  if (viewState === 'MATCH' && activeLiveMatch && activeTournament) {
    return (
      <LiveMatchArena
        initialMatch={activeLiveMatch}
        user={user}
        tournamentId={activeTournament.id}
        onExit={() => {
          setViewState('HUB');
          loadTournaments();
        }}
      />
    );
  }

  if (viewState === 'HUB' && activeTournament) {
    return (
      <TournamentHub
        tournament={activeTournament}
        user={user}
        onBack={() => {
          setViewState('DASHBOARD');
          loadTournaments();
        }}
        onOpenMatch={(m) => {
          setActiveLiveMatch(m);
          setViewState('MATCH');
        }}
        onRefresh={loadTournaments}
      />
    );
  }

  if (viewState === 'LOBBY' && activeTournament) {
    return (
      <TournamentLobby
        tournament={activeTournament}
        user={user}
        onBack={() => {
          setViewState('DASHBOARD');
          loadTournaments();
        }}
        onEnterAuction={(roomCode) => onEnterAuctionRoom(roomCode)}
        onRefresh={loadTournaments}
        onEnterHub={() => setViewState('HUB')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#07080F] text-white p-4 md:p-8 font-sans">
      {/* Top Brand Navigation */}
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#1E2246] mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#C8FF3D] to-[#7C5CFF] p-0.5 shadow-[0_0_20px_rgba(200,255,61,0.2)]">
            <div className="w-full h-full bg-[#0A0B14] rounded-2xl flex items-center justify-center font-black text-[#C8FF3D] text-lg">
              BW
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider font-heading">
                BIDWARS TOURNAMENT
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#C8FF3D]/10 text-[#C8FF3D] border border-[#C8FF3D]/30">
                IPL 2026
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Persistent Multiplayer Tournament • Auction Squads • Hand-Cricket Battles
            </p>
          </div>
        </div>

        {/* User Account Bar & Quick Auction Switch */}
        <div className="flex items-center gap-3">
          {/* Quick Auction Switch Button */}
          <button
            onClick={onSwitchToQuickAuction}
            className="px-4 py-2 rounded-xl bg-[#12142A] border border-[#2A2F60] text-gray-300 hover:text-white hover:border-[#C8FF3D] text-xs font-bold uppercase tracking-wider transition-all"
          >
            Quick Auction Mode
          </button>

          {/* User Profile / Google Sign In */}
          <div className="flex items-center gap-3 pl-3 border-l border-[#1E2246]">
            {user.isGoogleUser ? (
              <div className="flex items-center gap-2.5">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full border border-[#C8FF3D]" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#7C5CFF]/30 text-[#C8FF3D] font-black text-xs flex items-center justify-center border border-[#7C5CFF]">
                    {user.name.charAt(0)}
                  </div>
                )}
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-white leading-none">{user.name}</div>
                  <div className="text-[10px] text-gray-400 leading-none mt-1">Google Account</div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="px-3.5 py-2 rounded-xl bg-[#1E2246] border border-[#2A2F60] hover:border-gray-400 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all"
              >
                <LogIn className="w-4 h-4 text-[#C8FF3D]" />
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hero Action Bar */}
      <div className="max-w-7xl mx-auto mb-10 bg-gradient-to-r from-[#12142A] via-[#1E2246] to-[#12142A] border border-[#2A2F60] rounded-3xl p-6 md:p-8 shadow-2xl flex flex-wrap items-center justify-between gap-6">
        <div>
          <span className="text-xs font-black uppercase tracking-widest text-[#C8FF3D] flex items-center gap-1.5 mb-2">
            <Flame className="w-4 h-4" /> The Complete IPL Experience
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider font-heading">
            Lead Your Franchise to the IPL Trophy
          </h2>
          <p className="text-xs md:text-sm text-gray-300 max-w-xl mt-1">
            Build your team in the live auction, select match Playing XIs, unleash OVR special abilities in real-time hand-cricket, and climb the points table to the championship!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3.5 rounded-xl bg-[#C8FF3D] text-[#0A0B14] font-black uppercase text-xs md:text-sm tracking-wider shadow-[0_0_25px_rgba(200,255,61,0.3)] hover:scale-105 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Create Tournament
          </button>
        </div>
      </div>

      {/* Join By Code Form */}
      <div className="max-w-7xl mx-auto mb-8">
        <form onSubmit={handleJoinByCode} className="flex items-center gap-3 max-w-md">
          <input
            type="text"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value)}
            placeholder="Enter Tournament Code (e.g. TRN-XXXXX)"
            className="grow px-4 py-2.5 bg-[#12142A] border border-[#2A2F60] rounded-xl text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#C8FF3D] uppercase font-mono"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#1E2246] border border-[#2A2F60] text-white hover:border-[#C8FF3D] font-bold text-xs uppercase tracking-wider transition-colors shrink-0"
          >
            Join
          </button>
        </form>
        {joinError && <div className="text-xs text-red-400 mt-2">{joinError}</div>}
      </div>

      {/* Tournaments Grid */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[#1E2246] mb-6">
          <h3 className="text-lg font-black uppercase tracking-wider flex items-center gap-2 text-white">
            <Trophy className="w-5 h-5 text-[#C8FF3D]" />
            Your IPL Tournaments ({tournaments.length})
          </h3>
          <button
            onClick={loadTournaments}
            className="p-2 rounded-lg bg-[#12142A] border border-[#2A2F60] text-gray-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-gray-500">Loading tournaments...</div>
        ) : tournaments.length === 0 ? (
          <div className="py-16 text-center bg-[#12142A] border border-[#2A2F60] rounded-2xl p-8">
            <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h4 className="text-lg font-black uppercase text-gray-300">No Tournaments Yet</h4>
            <p className="text-xs text-gray-500 mt-1 mb-5">Create your first tournament to start an IPL season with friends!</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-[#C8FF3D] text-[#0A0B14] font-black uppercase text-xs tracking-wider"
            >
              Create Tournament
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map(t => {
              const myMem = t.members.find(m => m.userId === user.id);
              const isLive = ['TOURNAMENT_LIVE', 'PLAYOFFS'].includes(t.status);
              const isDone = t.status === 'COMPLETED';

              return (
                <div
                  key={t.id}
                  onClick={() => handleOpenTournament(t)}
                  className="bg-[#12142A] border border-[#2A2F60] hover:border-[#C8FF3D] rounded-2xl p-6 transition-all cursor-pointer flex flex-col justify-between group shadow-xl hover:shadow-[0_0_20px_rgba(200,255,61,0.1)]"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-[11px] text-gray-400 bg-[#0D0E1A] px-2 py-0.5 rounded border border-[#1E2246]">
                        {t.id}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        isDone
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : isLive
                          ? 'bg-[#C8FF3D]/10 text-[#C8FF3D] border-[#C8FF3D]/40'
                          : 'bg-[#7C5CFF]/10 text-[#7C5CFF] border-[#7C5CFF]/30'
                      }`}>
                        {t.status}
                      </span>
                    </div>

                    <h4 className="text-lg font-black text-white uppercase group-hover:text-[#C8FF3D] transition-colors font-heading mb-1">
                      {t.name}
                    </h4>
                    <p className="text-xs text-gray-400 mb-4">
                      Host: <span className="text-gray-300 font-medium">{t.hostName}</span>
                    </p>

                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-[#1E2246] text-center text-xs">
                      <div>
                        <div className="text-[10px] uppercase text-gray-500 font-bold">Teams</div>
                        <div className="font-black text-white">{t.members.length}/{t.teamsCount}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-gray-500 font-bold">Overs</div>
                        <div className="font-black text-white">{t.matchOvers} ov</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-gray-500 font-bold">Matches</div>
                        <div className="font-black text-white">{t.fixtures.length}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 flex items-center justify-between text-xs">
                    {myMem ? (
                      <span className="text-[#C8FF3D] font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Playing as {myMem.franchiseId}
                      </span>
                    ) : (
                      <span className="text-gray-400">Not joined</span>
                    )}

                    <span className="text-gray-400 group-hover:text-white flex items-center gap-1 font-bold">
                      {isLive ? 'Open Hub' : 'Enter Lobby'} <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Tournament Modal */}
      <CreateTournamentModal
        user={user}
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(newTrn) => {
          loadTournaments();
          handleOpenTournament(newTrn);
        }}
      />
    </div>
  );
};

