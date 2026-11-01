import React, { useState } from 'react';
import { Trophy, Users, Zap, Shield, ChevronRight, Sliders, Bot, Clock, Sparkles } from 'lucide-react';
import { RoomSettings } from '../types.js';

interface LandingPageProps {
  onCreateRoom: (nickname: string, settings: Partial<RoomSettings>) => void;
  onJoinRoom: (roomCode: string) => void;
  isLoading: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onCreateRoom, onJoinRoom, isLoading }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  
  // Create Room Form State
  const [hostNickname, setHostNickname] = useState('');
  const [roomName, setRoomName] = useState('');
  const [season, setSeason] = useState<'2026' | '2025'>('2026');
  const [poolMode, setPoolMode] = useState<'auction_pool' | 'mega_all'>('auction_pool');
  const [timerDuration, setTimerDuration] = useState<number>(10);
  const [startingPurseCr, setStartingPurseCr] = useState<number>(120);
  const [playMode, setPlayMode] = useState<'friends_only' | 'friends_bots'>('friends_bots');
  const [botCount, setBotCount] = useState<number>(5);
  const [minBidIncrementLakh, setMinBidIncrementLakh] = useState<number>(20);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Join Room Form State
  const [joinCode, setJoinCode] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostNickname.trim()) return;

    onCreateRoom(hostNickname.trim(), {
      roomName: roomName.trim() || undefined,
      season,
      poolMode,
      timerDuration,
      startingPurse: startingPurseCr * 10000000,
      playMode,
      botCount: playMode === 'friends_bots' ? botCount : 0,
      minBidIncrement: minBidIncrementLakh * 100000,
      minSquad: 18,
      maxSquad: 25,
      maxOverseas: 8
    });
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    onJoinRoom(joinCode.trim().toUpperCase());
  };

  return (
    <div className="min-h-screen bg-[#0B1020] text-slate-100 flex flex-col justify-between selection:bg-cyan-400 selection:text-black">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[20%] w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[15%] w-[650px] h-[650px] bg-amber-500/10 rounded-full blur-[160px]" />
      </div>

      {/* Hero Header */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-12 pb-6 text-center">
        <div className="inline-flex items-center gap-2 bg-navy-800/90 border border-cyan-400/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-cyan-300 shadow-glow-cyan mb-6">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
          <span>IPL AUCTION SIMULATOR · 2026 EDITION</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight font-display mb-4">
          BID <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-400">WARS</span>
        </h1>
        <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto font-medium mb-2">
          BUILD YOUR XI. WIN THE AUCTION.
        </p>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
          Multiplayer real-time live bidding against friends and AI bot strategists. Featuring the complete verified 532-player official 2026 master list.
        </p>
      </div>

      {/* Interactive Main Action Panel */}
      <div className="relative z-10 max-w-2xl w-full mx-auto px-4 pb-16">
        <div className="glass-panel rounded-2xl p-6 sm:p-8 shadow-2xl border border-navy-600/60 backdrop-blur-xl">
          {/* Tab Switcher: Create vs Join */}
          <div className="grid grid-cols-2 gap-2 bg-navy-900/90 p-1.5 rounded-xl border border-navy-700/80 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`py-2.5 px-4 rounded-lg font-display text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'create'
                  ? 'bg-cyan-400 text-black shadow-glow-cyan'
                  : 'text-slate-400 hover:text-white hover:bg-navy-800/60'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Create Room</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('join')}
              className={`py-2.5 px-4 rounded-lg font-display text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'join'
                  ? 'bg-cyan-400 text-black shadow-glow-cyan'
                  : 'text-slate-400 hover:text-white hover:bg-navy-800/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Join Room</span>
            </button>
          </div>

          {/* CREATE ROOM FORM */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Your Nickname <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={24}
                  value={hostNickname}
                  onChange={(e) => setHostNickname(e.target.value)}
                  placeholder="e.g. CaptainCool, KingKohli"
                  className="w-full bg-navy-900/90 border border-navy-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Room Name (Optional)
                </label>
                <input
                  type="text"
                  maxLength={40}
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. Champions Mega Auction 2026"
                  className="w-full bg-navy-900/90 border border-navy-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all"
                />
              </div>

              {/* Quick Settings Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Season */}
                <div className="bg-navy-900/60 border border-navy-700/80 rounded-xl p-3">
                  <span className="block text-xs font-semibold text-slate-300 mb-1">Auction Season</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSeason('2026')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                        season === '2026' ? 'bg-cyan-400 text-black' : 'bg-navy-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      2026 (Official)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeason('2025')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                        season === '2025' ? 'bg-cyan-400 text-black' : 'bg-navy-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      2025 (Historical)
                    </button>
                  </div>
                </div>

                {/* Pool Mode */}
                <div className="bg-navy-900/60 border border-navy-700/80 rounded-xl p-3">
                  <span className="block text-xs font-semibold text-slate-300 mb-1">Player Pool</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPoolMode('auction_pool')}
                      title="Only 359 un-retained players enter auction"
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                        poolMode === 'auction_pool' ? 'bg-cyan-400 text-black' : 'bg-navy-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Auction Pool (359)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPoolMode('mega_all')}
                      title="All 532 players including retained stars"
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                        poolMode === 'mega_all' ? 'bg-cyan-400 text-black' : 'bg-navy-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Mega All (532)
                    </button>
                  </div>
                </div>
              </div>

              {/* Timer Duration Slider (5 to 20 seconds) */}
              <div className="bg-navy-900/60 border border-navy-700/80 rounded-xl p-3.5">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    Bid Countdown Timer
                  </span>
                  <span className="text-sm font-bold text-cyan-300 font-mono">
                    {timerDuration} seconds
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="20"
                  step="1"
                  value={timerDuration}
                  onChange={(e) => setTimerDuration(parseInt(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>5s (Lightning)</span>
                  <span>10s (Standard)</span>
                  <span>20s (Deliberate)</span>
                </div>
              </div>

              {/* Play Mode & Bots */}
              <div className="bg-navy-900/60 border border-navy-700/80 rounded-xl p-3.5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-amber-400" />
                    Play Mode
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setPlayMode('friends_only')}
                      className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all ${
                        playMode === 'friends_only' ? 'bg-amber-400 text-black' : 'bg-navy-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Friends Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlayMode('friends_bots')}
                      className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all ${
                        playMode === 'friends_bots' ? 'bg-amber-400 text-black' : 'bg-navy-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Friends + AI Bots
                    </button>
                  </div>
                </div>

                {playMode === 'friends_bots' && (
                  <div className="mt-2.5 pt-2.5 border-t border-navy-700/60 flex items-center justify-between">
                    <span className="text-xs text-slate-400">AI Bot Franchises:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="1"
                        max="9"
                        value={botCount}
                        onChange={(e) => setBotCount(parseInt(e.target.value))}
                        className="w-28 accent-amber-400"
                      />
                      <span className="text-xs font-mono font-bold text-amber-300 w-8 text-right">
                        {botCount} bots
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Advanced Settings Accordion */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition-colors py-1"
                >
                  <Sliders className="w-3 h-3" />
                  <span>{showAdvanced ? 'Hide Advanced House Rules' : 'Show Advanced House Rules'}</span>
                </button>

                {showAdvanced && (
                  <div className="mt-2 p-3 bg-navy-950/70 border border-navy-700 rounded-xl space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Starting Franchise Purse:</span>
                      <span className="font-bold text-cyan-300 font-mono">₹{startingPurseCr} Crore</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Squad Limits:</span>
                      <span className="font-mono text-slate-200">Min 18 · Max 25</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Max Overseas Players:</span>
                      <span className="font-mono text-slate-200">8 per team</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Minimum Bid Increment:</span>
                      <span className="font-bold text-amber-300 font-mono">₹{minBidIncrementLakh} Lakh</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !hostNickname.trim()}
                className="w-full mt-2 bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-black font-display font-bold py-3.5 px-6 rounded-xl transition-all shadow-glow-cyan flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group text-base"
              >
                <span>{isLoading ? 'Creating Room...' : 'Launch Auction Room'}</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </form>
          )}

          {/* JOIN ROOM FORM */}
          {activeTab === 'join' && (
            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Enter 6-Character Room Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={8}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. BW-7821"
                  className="w-full bg-navy-900/90 border border-navy-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl px-4 py-3 text-lg font-mono text-center tracking-widest text-cyan-300 placeholder-slate-500 uppercase outline-none transition-all"
                />
              </div>

              <p className="text-xs text-slate-400 leading-relaxed text-center">
                Entering a valid room code will take you directly to <strong>Player Name</strong> and <strong>Franchise Selection</strong>.
              </p>

              <button
                type="submit"
                disabled={isLoading || !joinCode.trim()}
                className="w-full bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-black font-display font-bold py-3.5 px-6 rounded-xl transition-all shadow-glow-cyan flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group text-base"
              >
                <span>{isLoading ? 'Verifying Room...' : 'Proceed to Team Selection'}</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 pb-12 w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-4 border border-navy-700/60">
            <div className="w-8 h-8 rounded-lg bg-cyan-400/20 text-cyan-300 flex items-center justify-center mb-3">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="font-display font-bold text-sm text-slate-100 mb-1">Server-Authoritative</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Synchronized timer and serialized atomic bid execution prevent race conditions or double-purchases.
            </p>
          </div>

          <div className="glass-card rounded-xl p-4 border border-navy-700/60">
            <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center mb-3">
              <Shield className="w-4 h-4" />
            </div>
            <h4 className="font-display font-bold text-sm text-slate-100 mb-1">532 Verified Players</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Directly imported from the official 2026 IPL master list with authentic base prices and marquee sets.
            </p>
          </div>

          <div className="glass-card rounded-xl p-4 border border-navy-700/60">
            <div className="w-8 h-8 rounded-lg bg-purple-400/20 text-purple-300 flex items-center justify-center mb-3">
              <Bot className="w-4 h-4" />
            </div>
            <h4 className="font-display font-bold text-sm text-slate-100 mb-1">AI Bot Strategists</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Play solo or with friends. AI bots evaluate squad balance, budget reserves, and strategic needs.
            </p>
          </div>

          <div className="glass-card rounded-xl p-4 border border-navy-700/60">
            <div className="w-8 h-8 rounded-lg bg-emerald-400/20 text-emerald-300 flex items-center justify-center mb-3">
              <Trophy className="w-4 h-4" />
            </div>
            <h4 className="font-display font-bold text-sm text-slate-100 mb-1">Squad Math Feasibility</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Strict reserve calculation prevents teams from bankrupting themselves before completing 18 players.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
