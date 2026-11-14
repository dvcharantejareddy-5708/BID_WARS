import React, { useState, useEffect } from 'react';
import { Trophy, Plus, LogIn, LogOut, ShieldCheck, Flame, RefreshCw, Settings, AlertCircle, UserPlus, KeyRound } from 'lucide-react';
import { AuthUser, authService } from '../../services/auth';
import { Tournament } from '../../tournamentTypes';
import { TournamentApi } from '../../services/tournamentApi';
import { CreateTournamentModal } from './CreateTournamentModal';
import { TournamentLobby } from './TournamentLobby';
import { TournamentHub } from './TournamentHub';
import { LiveMatchArena } from './LiveMatchArena';
import { ProfileSettingsModal } from './ProfileSettingsModal';
import { HeaderBackButton } from '../common/HeaderBackButton';
import { AuthModal } from '../auth/AuthModal';
import { LiveMatch } from '../../tournamentTypes';

interface TournamentDashboardProps {
  onSwitchToQuickAuction: () => void;
  onEnterAuctionRoom: (roomCode: string) => void;
}

export const TournamentDashboard: React.FC<TournamentDashboardProps> = ({
  onSwitchToQuickAuction,
  onEnterAuctionRoom
}) => {
  const [user, setUser] = useState<AuthUser | null>(authService.getUser());
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [viewState, setViewState] = useState<'DASHBOARD' | 'LOBBY' | 'HUB' | 'MATCH'>('DASHBOARD');
  const [activeLiveMatch, setActiveLiveMatch] = useState<LiveMatch | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = authService.onAuthStateChange(u => {
      setUser(u);
    });
    return unsub;
  }, []);

  const loadTournaments = async () => {
    if (!user || !user.isRegisteredUser) {
      setTournaments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // STRICT PRIVACY: Only fetch tournaments belonging to this authenticated user
      const list = await TournamentApi.getTournaments(user.id);
      setTournaments(list);
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
  }, [user?.id, user?.isRegisteredUser]);

  const handleSignOut = async () => {
    await authService.signOut();
    setUser(null);
    setTournaments([]);
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
    if (!user || !user.isRegisteredUser) {
      setIsAuthModalOpen(true);
      setAuthModalMode('login');
      return;
    }
    if (!joinCode.trim()) return;
    setJoinError(null);
    try {
      const t = await TournamentApi.getTournament(joinCode.trim().toUpperCase(), user.id);
      if (t) {
        handleOpenTournament(t);
        setJoinCode('');
      } else {
        setJoinError('Tournament not found or private. You must be an authorized member to access it.');
      }
    } catch (err: any) {
      setJoinError(err.message || 'Error finding tournament');
    }
  };

  // Sub-views (only accessible when authenticated)
  if (user && user.isRegisteredUser) {
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
          onEnterAuction={() => {
            onEnterAuctionRoom(activeTournament.roomCode);
          }}
          onEnterHub={() => {
            setViewState('HUB');
            loadTournaments();
          }}
          onRefresh={loadTournaments}
        />
      );
    }
  }

  // =========================================================================
  // VIEW 1: UNAUTHENTICATED ACCESS GATE (USERNAME + PASSWORD AUTHENTICATION)
  // Prevents unauthenticated users from entering Tournament Mode
  // =========================================================================
  if (!user || !user.isRegisteredUser) {
    return (
      <div className="min-h-screen bg-[#0A0B14] py-8 px-4 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#C8FF3D]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-xl bg-gradient-to-b from-[#12142A] to-[#0A0B14] border border-[#2A2F60] rounded-3xl p-8 shadow-2xl relative z-10 space-y-6 text-center">
          {/* Top navigation Back button */}
          <div className="flex items-center justify-between pb-4 border-b border-[#1E2246]">
            <HeaderBackButton onBack={onSwitchToQuickAuction} label="Quick Auction" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C8FF3D]" /> Supabase Security
            </span>
          </div>

          {/* Tournament Mode Brand Banner */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1E2246] border border-[#C8FF3D]/30 text-[#C8FF3D] text-xs font-heading font-black uppercase tracking-widest shadow-lime-glow-sm">
              <Trophy className="w-4 h-4" /> IPL Tournament Mode
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black text-white uppercase tracking-wider">
              Lead Your IPL Franchise to Glory
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-md mx-auto">
              Compete in real-time auctions, select match Playing XIs, unleash OVR special abilities in live hand-cricket, and track permanent team records across seasons.
            </p>
          </div>

          {/* BidWars Username/Password Action Hub */}
          <div className="p-6 bg-[#0A0B14]/80 border border-[#1E2246] rounded-2xl space-y-4">
            <span className="text-xs font-bold text-gray-400 block uppercase tracking-wider">
              Sign in with your BidWars account to continue:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => {
                  setAuthModalMode('login');
                  setIsAuthModalOpen(true);
                }}
                className="w-full py-3 px-5 rounded-xl bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(200,255,61,0.25)] hover:scale-[1.02] cursor-pointer"
              >
                <LogIn className="w-4 h-4 stroke-[3]" />
                <span>Sign In</span>
              </button>

              <button
                onClick={() => {
                  setAuthModalMode('register');
                  setIsAuthModalOpen(true);
                }}
                className="w-full py-3 px-5 rounded-xl bg-[#12142A] hover:bg-[#181B38] border border-[#2A2F60] hover:border-[#C8FF3D] text-white font-heading font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-[#C8FF3D]" />
                <span>Create Account</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500 pt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C8FF3D]" />
              <span>Independent account system with encrypted credentials in Supabase</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onSwitchToQuickAuction}
              className="text-xs text-gray-400 hover:text-[#C8FF3D] underline transition-colors cursor-pointer"
            >
              Or play casual Quick Auction without signing in
            </button>
          </div>
        </div>

        {/* Auth Modal (Login / Register / Forgot Password) */}
        <AuthModal
          isOpen={isAuthModalOpen}
          initialMode={authModalMode}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={(u) => {
            setUser(u);
            setIsAuthModalOpen(false);
          }}
        />
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: AUTHENTICATED TOURNAMENT DASHBOARD
  // =========================================================================
  const displayInGameName = user.username || user.inGameName || 'Manager';

  return (
    <div className="min-h-screen bg-[#0A0B14] text-[#F4F6FA] py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Header Bar */}
      <div className="max-w-7xl mx-auto mb-8 border-b border-[#1E2246] pb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <HeaderBackButton onBack={onSwitchToQuickAuction} label="Quick Auction" />
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C8FF3D] to-[#7C5CFF] flex items-center justify-center shadow-neon-glow">
            <Trophy className="w-5 h-5 text-[#0A0B14]" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider font-heading flex items-center gap-2">
              IPL Tournament Hub
            </h1>
            <p className="text-xs text-gray-400">
              Multiplayer Tournaments • Live Hand-Cricket • Permanent Supabase Cloud Storage
            </p>
          </div>
        </div>

        {/* User Account Bar with In-Game Name */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#12142A] border border-[#2A2F60] px-3.5 py-1.5 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-[#1E2246] text-[#C8FF3D] flex items-center justify-center font-bold text-xs border border-[#C8FF3D]">
              {displayInGameName.charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{displayInGameName}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#C8FF3D]/20 text-[#C8FF3D] border border-[#C8FF3D]/40 font-mono">
                  PLAYER
                </span>
              </div>
              <div className="text-[10px] text-gray-400 truncate max-w-[150px]">
                {user.email || 'Verified Account'}
              </div>
            </div>

            {/* Profile Settings Icon */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1E2246] transition-colors ml-1 cursor-pointer"
              title="Profile Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Sign Out Icon */}
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg text-gray-400 hover:text-[#FF3B5C] hover:bg-[#1E2246] transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
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
          <p className="text-xs md:text-sm text-gray-300 max-w-xl mt-1 leading-relaxed">
            Build your team in the live auction, select match Playing XIs, unleash OVR special abilities in real-time hand-cricket, and climb the points table to the championship!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3.5 rounded-xl bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] font-black uppercase text-xs md:text-sm tracking-wider shadow-[0_0_25px_rgba(200,255,61,0.3)] hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create Tournament</span>
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
            className="px-5 py-2.5 rounded-xl bg-[#1E2246] hover:bg-[#282E5C] border border-[#2A2F60] text-white hover:border-[#C8FF3D] font-bold text-xs uppercase tracking-wider transition-colors shrink-0 cursor-pointer"
          >
            Join
          </button>
        </form>
        {joinError && <div className="text-xs text-red-400 mt-2 font-medium">{joinError}</div>}
      </div>

      {/* Tournaments Grid (Strict Privacy: Authenticated User Only) */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[#1E2246] mb-6">
          <h3 className="text-lg font-black uppercase tracking-wider flex items-center gap-2 text-white">
            <Trophy className="w-5 h-5 text-[#C8FF3D]" />
            Your IPL Tournaments ({tournaments.length})
          </h3>
          <button
            onClick={loadTournaments}
            className="p-2 rounded-lg bg-[#12142A] border border-[#2A2F60] text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-gray-500">Loading tournaments...</div>
        ) : tournaments.length === 0 ? (
          <div className="py-16 text-center bg-[#12142A] border border-[#2A2F60] rounded-2xl p-8 space-y-3">
            <Trophy className="w-12 h-12 text-gray-600 mx-auto" />
            <h4 className="text-lg font-black uppercase text-gray-300">No Tournaments Joined</h4>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              You are currently not participating in any active tournaments. Create your own tournament or join an existing tournament using its code.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-2 px-5 py-2.5 rounded-xl bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] font-black uppercase text-xs tracking-wider cursor-pointer"
            >
              Create Tournament
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map(t => {
              const isHost = t.hostId === user.id;
              const myMember = t.members.find(m => m.userId === user.id);
              const statusColors: Record<string, string> = {
                REGISTRATION: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                AUCTION: 'bg-[#C8FF3D]/10 text-[#C8FF3D] border-[#C8FF3D]/30 animate-pulse',
                SQUAD_FINALIZATION: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
                TOURNAMENT_LIVE: 'bg-[#FF3B5C]/10 text-[#FF3B5C] border-[#FF3B5C]/30',
                PLAYOFFS: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
                COMPLETED: 'bg-gray-500/10 text-gray-400 border-gray-500/30'
              };

              return (
                <div
                  key={t.id}
                  onClick={() => handleOpenTournament(t)}
                  className="bg-[#12142A] border border-[#2A2F60] hover:border-[#C8FF3D] rounded-2xl p-6 transition-all hover:shadow-[0_0_20px_rgba(200,255,61,0.15)] cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1E2246] text-gray-400 border border-[#2A2F60]">
                        {t.id}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${statusColors[t.status] || 'bg-gray-500/20 text-gray-400'}`}
                      >
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h4 className="text-lg font-black text-white uppercase group-hover:text-[#C8FF3D] transition-colors mb-2 font-heading">
                      {t.name}
                    </h4>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-4 bg-[#0A0B14] p-3 rounded-xl border border-[#1E2246]">
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase block">Franchises</span>
                        <span className="font-bold text-white">
                          {t.members.length} / {t.teamsCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase block">Overs / Match</span>
                        <span className="font-bold text-white">{t.matchOvers} Overs</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase block">Your Team</span>
                        <span className="font-bold text-[#C8FF3D]">{myMember?.franchiseId || 'None'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase block">Role</span>
                        <span className="font-bold text-white">{isHost ? 'HOST (Creator)' : 'Player'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#1E2246] flex items-center justify-between text-xs">
                    <span className="text-[11px] text-gray-500">Host: {t.hostName}</span>
                    <span className="font-bold text-[#C8FF3D] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      Enter &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Profile Settings Modal */}
      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        user={user}
        onClose={() => setIsProfileModalOpen(false)}
        onUpdated={(newName) => {
          setUser({ ...user, username: newName, inGameName: newName });
          loadTournaments();
        }}
      />

      {/* Create Tournament Modal */}
      <CreateTournamentModal
        isOpen={isCreateModalOpen}
        user={user}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(newTourn) => {
          setActiveTournament(newTourn);
          setViewState('LOBBY');
          loadTournaments();
        }}
      />
    </div>
  );
};
