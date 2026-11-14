import React, { useState, useEffect } from 'react';
import { Trophy, Plus, LogIn, LogOut, ShieldCheck, Flame, Users, Sparkles, RefreshCw, Settings, AlertCircle, KeyRound, ExternalLink } from 'lucide-react';
import { AuthUser, authService } from '../../services/auth';
import { Tournament } from '../../tournamentTypes';
import { TournamentApi } from '../../services/tournamentApi';
import { CreateTournamentModal } from './CreateTournamentModal';
import { TournamentLobby } from './TournamentLobby';
import { TournamentHub } from './TournamentHub';
import { LiveMatchArena } from './LiveMatchArena';
import { InGameNameModal } from './InGameNameModal';
import { ProfileSettingsModal } from './ProfileSettingsModal';
import { HeaderBackButton } from '../common/HeaderBackButton';
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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAuthNoticeOpen, setIsAuthNoticeOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [viewState, setViewState] = useState<'DASHBOARD' | 'LOBBY' | 'HUB' | 'MATCH'>('DASHBOARD');
  const [activeLiveMatch, setActiveLiveMatch] = useState<LiveMatch | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  // Test Account Login inputs (for instant multi-account verification)
  const [testEmail, setTestEmail] = useState('');
  const [testName, setTestName] = useState('');

  useEffect(() => {
    const unsub = authService.onAuthStateChange(u => {
      if (u) setUser(u);
    });
    return unsub;
  }, []);

  const loadTournaments = async () => {
    setIsLoading(true);
    try {
      // STRICT PRIVACY: Only fetch tournaments belonging to this authenticated user
      const list = await TournamentApi.getTournaments(user.isGoogleUser ? user.id : undefined);
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
  }, [user.id, user.isGoogleUser]);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    const res = await authService.signInWithGoogle();
    if (res.error) {
      setAuthError(res.error);
      setIsAuthNoticeOpen(true);
    }
  };

  const handleSimulatedTestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail.trim() || !testName.trim()) return;
    const res = await authService.signInWithGoogleTestAccount(testEmail, testName);
    if (res.success) {
      setIsAuthNoticeOpen(false);
      setTestEmail('');
      setTestName('');
    } else {
      setAuthError(res.error || 'Login failed');
    }
  };

  const handleSignOut = async () => {
    await authService.signOut();
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
    if (!user.isGoogleUser) {
      setJoinError('You must sign in with Google to join tournaments.');
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
        setJoinError('Tournament not found or private');
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

  // Check if newly signed in user needs to create their In-Game Name
  const needsInGameName = user.isGoogleUser && (!user.inGameName || user.inGameName.trim().length === 0);

  return (
    <div className="min-h-screen bg-[#07080F] text-white p-4 md:p-8 font-sans">
      {/* Top Brand Navigation with Header Back Button */}
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#1E2246] mb-8">
        <div className="flex items-center gap-4">
          <HeaderBackButton label="Quick Auction" onClick={onSwitchToQuickAuction} />
          
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#C8FF3D] to-[#7C5CFF] p-0.5 shadow-[0_0_20px_rgba(200,255,61,0.2)]">
              <div className="w-full h-full bg-[#0A0B14] rounded-2xl flex items-center justify-center font-black text-[#C8FF3D] text-base">
                BW
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider font-heading">
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
        </div>

        {/* User Account Bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={onSwitchToQuickAuction}
            className="px-4 py-2 rounded-xl bg-[#12142A] border border-[#2A2F60] text-gray-300 hover:text-white hover:border-[#C8FF3D] text-xs font-bold uppercase tracking-wider transition-all hidden md:inline-flex"
          >
            Quick Auction Mode
          </button>

          {/* User Profile / Google Sign In */}
          <div className="flex items-center gap-3 pl-3 border-l border-[#1E2246]">
            {user.isGoogleUser ? (
              <div className="flex items-center gap-2.5 bg-[#12142A] border border-[#1E2246] px-3 py-1.5 rounded-xl">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full border border-[#C8FF3D]" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#7C5CFF]/30 text-[#C8FF3D] font-black text-xs flex items-center justify-center border border-[#7C5CFF]">
                    {(user.inGameName || user.name).charAt(0)}
                  </div>
                )}
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-heading font-black text-white leading-none">
                    {user.inGameName || user.name}
                  </div>
                  <div className="text-[10px] text-[#C8FF3D] font-mono leading-none mt-1">Google Verified</div>
                </div>

                {/* Profile Settings Icon */}
                <button
                  onClick={() => setIsProfileModalOpen(true)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1E2246] transition-colors"
                  title="Profile Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>

                <button
                  onClick={handleSignOut}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-[#FF3B5C] hover:bg-[#1E2246] transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="px-4 py-2 rounded-xl bg-[#12142A] hover:bg-[#181B38] border border-[#C8FF3D]/40 hover:border-[#C8FF3D] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(200,255,61,0.15)]"
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
          <p className="text-xs md:text-sm text-gray-300 max-w-xl mt-1 leading-relaxed">
            Build your team in the live auction, select match Playing XIs, unleash OVR special abilities in real-time hand-cricket, and climb the points table to the championship!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              if (!user.isGoogleUser) {
                handleGoogleSignIn();
              } else {
                setIsCreateModalOpen(true);
              }
            }}
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

      {/* Tournaments Grid (Strict Privacy) */}
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
          <div className="py-16 text-center bg-[#12142A] border border-[#2A2F60] rounded-2xl p-8 space-y-3">
            <Trophy className="w-12 h-12 text-gray-600 mx-auto" />
            <h4 className="text-lg font-black uppercase text-gray-300">No Tournaments Joined</h4>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              You are currently not participating in any active tournaments. Create your own tournament or join an existing tournament using its code.
            </p>
            <button
              onClick={() => {
                if (!user.isGoogleUser) {
                  handleGoogleSignIn();
                } else {
                  setIsCreateModalOpen(true);
                }
              }}
              className="mt-2 px-5 py-2.5 rounded-xl bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] font-black uppercase text-xs tracking-wider"
            >
              Create Tournament
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map(t => {
              const myMem = t.members.find(m => m.userId === user.id);
              const isHost = t.hostId === user.id;

              return (
                <div
                  key={t.id}
                  onClick={() => handleOpenTournament(t)}
                  className="bg-[#12142A] border border-[#2A2F60] hover:border-[#C8FF3D] rounded-2xl p-6 transition-all cursor-pointer flex flex-col justify-between group shadow-xl hover:shadow-[0_0_20px_rgba(200,255,61,0.1)] space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        t.status === 'REGISTRATION'
                          ? 'bg-[#FFC93D]/10 text-[#FFC93D] border-[#FFC93D]/30'
                          : t.status === 'AUCTION'
                          ? 'bg-[#7C5CFF]/15 text-[#7C5CFF] border-[#7C5CFF]/30'
                          : 'bg-[#C8FF3D]/10 text-[#C8FF3D] border-[#C8FF3D]/30'
                      }`}>
                        {t.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-mono text-gray-400">{t.id}</span>
                    </div>

                    <h4 className="text-lg font-black uppercase text-white group-hover:text-[#C8FF3D] transition-colors leading-tight">
                      {t.name}
                    </h4>

                    <div className="text-xs text-gray-400 space-y-1">
                      <div>Format: <strong className="text-white">{t.matchOvers} Overs</strong> • Teams: <strong className="text-white">{t.members.length}/{t.teamsCount}</strong></div>
                      <div>Host: <strong className="text-[#C8FF3D]">{t.hostName}</strong> {isHost ? '(You)' : ''}</div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#1E2246] flex items-center justify-between text-xs">
                    {myMem ? (
                      <span className="text-white font-bold">Your Franchise: <span className="text-[#C8FF3D]">{myMem.franchiseId}</span></span>
                    ) : (
                      <span className="text-gray-500">Not joined</span>
                    )}
                    <span className="text-gray-400 group-hover:text-white font-bold text-xs uppercase flex items-center gap-1">
                      Open &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mandatory In-Game Name Registration Modal for first-time Google Sign In */}
      {needsInGameName && (
        <InGameNameModal
          isOpen={true}
          user={user}
          onSuccess={(inGameName) => {
            setUser({ ...user, inGameName });
            loadTournaments();
          }}
        />
      )}

      {/* Profile Settings Modal */}
      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        user={user}
        onClose={() => setIsProfileModalOpen(false)}
        onUpdated={(newName) => {
          setUser({ ...user, inGameName: newName });
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

      {/* Supabase Google Auth Guidance & Multi-Account Test Modal */}
      {isAuthNoticeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#0A0B14] border border-[#2A2F60] rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E2246]">
              <div className="flex items-center gap-2 text-[#C8FF3D]">
                <KeyRound className="w-5 h-5" />
                <h3 className="font-heading font-black text-base text-white uppercase tracking-wider">
                  Google Authentication Setup &amp; Test Login
                </h3>
              </div>
              <button
                onClick={() => setIsAuthNoticeOpen(false)}
                className="text-gray-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            {authError && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs">
                {authError}
              </div>
            )}

            <div className="space-y-3 text-xs text-gray-300 leading-relaxed bg-[#12142A] p-4 rounded-xl border border-[#1E2246]">
              <p className="font-bold text-white uppercase text-[11px] tracking-wider">
                To enable live Google OAuth in production:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-gray-400 text-[11px]">
                <li>In your Supabase Dashboard &rarr; <strong>Authentication</strong> &rarr; <strong>Providers</strong> &rarr; Enable <strong>Google</strong>.</li>
                <li>Enter your Google Cloud Console Client ID and Secret.</li>
                <li>Set Authorized Redirect URI in Google Console to: <code className="text-[#C8FF3D] font-mono">https://&lt;your-project-ref&gt;.supabase.co/auth/v1/callback</code></li>
                <li>Add <code className="text-white font-mono">VITE_SUPABASE_URL</code> and <code className="text-white font-mono">VITE_SUPABASE_ANON_KEY</code> to your client environment.</li>
              </ol>
            </div>

            {/* Simulated Multi-Account Login Form (For Testing User A & User B Separately) */}
            <form onSubmit={handleSimulatedTestLogin} className="space-y-3 border-t border-[#1E2246] pt-4">
              <span className="text-xs font-heading font-black uppercase text-white block">
                Instant Test Sign-In (Simulated Google UUIDs):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="email"
                  placeholder="e.g. userA@gmail.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[#12142A] border border-[#1E2246] text-white text-xs font-bold focus:outline-none focus:border-[#C8FF3D]"
                  required
                />
                <input
                  type="text"
                  placeholder="e.g. User A (Teja)"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[#12142A] border border-[#1E2246] text-white text-xs font-bold focus:outline-none focus:border-[#C8FF3D]"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAuthNoticeOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#12142A] text-xs font-bold uppercase text-gray-400 hover:text-white"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C8FF3D] text-[#0A0B14] font-heading font-black text-xs uppercase tracking-wider"
                >
                  Sign In Test Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
