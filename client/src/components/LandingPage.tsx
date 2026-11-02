import React, { useState } from 'react';
import { Trophy, Users, Shield, ChevronRight, Sliders, Bot, Clock, Sparkles, Lock, Eye, EyeOff, Check } from 'lucide-react';
import { RoomSettings } from '../types.js';

interface LandingPageProps {
  onCreateRoom: (nickname: string, settings: Partial<RoomSettings>) => void;
  onJoinRoom: (roomCode: string, password?: string) => void;
  isLoading: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onCreateRoom, onJoinRoom, isLoading }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  
  // Create Room Form State
  const [hostNickname, setHostNickname] = useState('');
  const [roomName, setRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
  const [joinPassword, setJoinPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [showJoinPassword, setShowJoinPassword] = useState(false);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostNickname.trim()) return;
    if (isPrivate && (!password.trim() || password.trim().length < 4)) {
      alert('Password for private rooms must be at least 4 characters');
      return;
    }

    onCreateRoom(hostNickname.trim(), {
      roomName: roomName.trim() || undefined,
      isPrivate,
      password: isPrivate ? password.trim() : undefined,
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
    onJoinRoom(joinCode.trim().toUpperCase(), joinPassword.trim() || undefined);
  };

  return (
    <div className="min-h-screen bg-[#080D18] text-[#F4F7FC] flex flex-col justify-between selection:bg-[#C8FF45] selection:text-black">
      {/* Hero Header */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-12 pb-6 text-center">
        <div className="inline-flex items-center gap-2 bg-[#0E1626] border border-[#26354D] px-3.5 py-1.5 rounded-full text-xs font-heading font-black tracking-wider uppercase text-[#C8FF45] mb-6">
          <Sparkles className="w-3.5 h-3.5 text-[#C8FF45]" />
          <span>IPL AUCTION SIMULATOR · 2026 EDITION</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black font-heading tracking-tight uppercase mb-3">
          BID <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C8FF45] via-white to-[#54C8FF]">WARS</span>
        </h1>
        <p className="text-sm sm:text-lg text-[#9BAAC0] max-w-2xl mx-auto font-heading font-bold tracking-wide uppercase mb-1">
          BUILD YOUR XI. WIN THE AUCTION.
        </p>
        <p className="text-xs text-[#9BAAC0]/80 max-w-xl mx-auto">
          Multiplayer real-time live bidding against friends and AI bot strategists. Featuring the complete verified 532-player official 2026 master list.
        </p>
      </div>

      {/* Main Action Panel */}
      <div className="relative z-10 max-w-2xl w-full mx-auto px-4 pb-14">
        <div className="bg-[#141F33] rounded-2xl p-6 sm:p-8 border border-[#26354D] shadow-2xl">
          {/* Tab Switcher: Create vs Join */}
          <div className="grid grid-cols-2 gap-2 bg-[#0E1626] p-1.5 rounded-xl border border-[#26354D] mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`py-2.5 px-4 rounded-lg font-heading text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                activeTab === 'create'
                  ? 'bg-[#C8FF45] text-black shadow-glow-lime'
                  : 'text-[#9BAAC0] hover:text-[#F4F7FC] hover:bg-[#1B2942]'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Create Room</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('join')}
              className={`py-2.5 px-4 rounded-lg font-heading text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                activeTab === 'join'
                  ? 'bg-[#C8FF45] text-black shadow-glow-lime'
                  : 'text-[#9BAAC0] hover:text-[#F4F7FC] hover:bg-[#1B2942]'
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
                <label className="block text-xs font-heading font-bold uppercase tracking-wider text-[#9BAAC0] mb-1.5">
                  Host Nickname <span className="text-[#C8FF45]">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={24}
                  value={hostNickname}
                  onChange={(e) => setHostNickname(e.target.value)}
                  placeholder="e.g. CaptainCool, KingKohli"
                  className="w-full bg-[#0E1626] border border-[#26354D] focus:border-[#C8FF45] focus:ring-1 focus:ring-[#C8FF45] rounded-xl px-4 py-2.5 text-sm text-[#F4F7FC] placeholder-[#54627A] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-heading font-bold uppercase tracking-wider text-[#9BAAC0] mb-1.5">
                  Room Name (Optional)
                </label>
                <input
                  type="text"
                  maxLength={40}
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. Champions Mega Auction 2026"
                  className="w-full bg-[#0E1626] border border-[#26354D] focus:border-[#C8FF45] focus:ring-1 focus:ring-[#C8FF45] rounded-xl px-4 py-2.5 text-sm text-[#F4F7FC] placeholder-[#54627A] outline-none transition-all"
                />
              </div>

              {/* Password Protection Selector */}
              <div className="bg-[#0E1626] border border-[#26354D] rounded-xl p-3.5 space-y-2.5">
                <span className="block text-xs font-heading font-bold uppercase tracking-wider text-[#9BAAC0]">Room Privacy Access</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPrivate(false)}
                    className={`py-2 px-3 rounded-lg text-xs font-heading font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                      !isPrivate ? 'bg-[#C8FF45] text-black shadow-glow-lime' : 'bg-[#141F33] text-[#9BAAC0] hover:text-[#F4F7FC]'
                    }`}
                  >
                    <span>Open Room</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPrivate(true)}
                    className={`py-2 px-3 rounded-lg text-xs font-heading font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                      isPrivate ? 'bg-[#FFC857] text-black shadow-glow-gold' : 'bg-[#141F33] text-[#9BAAC0] hover:text-[#F4F7FC]'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Private (Password)</span>
                  </button>
                </div>

                {isPrivate && (
                  <div className="pt-2 border-t border-[#26354D]">
                    <label className="block text-[11px] font-heading font-bold uppercase tracking-wider text-[#9BAAC0] mb-1">
                      Set Room Password (min 4 characters) <span className="text-[#FFC857]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required={isPrivate}
                        minLength={4}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter room password..."
                        className="w-full bg-[#141F33] border border-[#26354D] focus:border-[#FFC857] rounded-xl pl-3 pr-10 py-2 text-xs text-[#F4F7FC] placeholder-[#54627A] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9BAAC0] hover:text-[#F4F7FC]"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Settings Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Season */}
                <div className="bg-[#0E1626] border border-[#26354D] rounded-xl p-3">
                  <span className="block text-xs font-heading font-bold uppercase tracking-wider text-[#9BAAC0] mb-1">Auction Season</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSeason('2026')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-heading font-bold uppercase transition-all ${
                        season === '2026' ? 'bg-[#C8FF45] text-black font-black' : 'bg-[#141F33] text-[#9BAAC0] hover:text-[#F4F7FC]'
                      }`}
                    >
                      2026 Official
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeason('2025')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-heading font-bold uppercase transition-all ${
                        season === '2025' ? 'bg-[#C8FF45] text-black font-black' : 'bg-[#141F33] text-[#9BAAC0] hover:text-[#F4F7FC]'
                      }`}
                    >
                      2025 Historical
                    </button>
                  </div>
                </div>

                {/* Pool Mode */}
                <div className="bg-[#0E1626] border border-[#26354D] rounded-xl p-3">
                  <span className="block text-xs font-heading font-bold uppercase tracking-wider text-[#9BAAC0] mb-1">Player Pool</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPoolMode('auction_pool')}
                      title="Only 359 un-retained players enter auction"
                      className={`py-1.5 px-2 rounded-lg text-xs font-heading font-bold uppercase transition-all ${
                        poolMode === 'auction_pool' ? 'bg-[#C8FF45] text-black font-black' : 'bg-[#141F33] text-[#9BAAC0] hover:text-[#F4F7FC]'
                      }`}
                    >
                      Pool (359)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPoolMode('mega_all')}
                      title="All 532 players including retained stars"
                      className={`py-1.5 px-2 rounded-lg text-xs font-heading font-bold uppercase transition-all ${
                        poolMode === 'mega_all' ? 'bg-[#C8FF45] text-black font-black' : 'bg-[#141F33] text-[#9BAAC0] hover:text-[#F4F7FC]'
                      }`}
                    >
                      Mega (532)
                    </button>
                  </div>
                </div>
              </div>

              {/* Timer Duration Slider */}
              <div className="bg-[#0E1626] border border-[#26354D] rounded-xl p-3.5">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-heading font-bold uppercase tracking-wider text-[#9BAAC0] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#C8FF45]" />
                    Bid Countdown Timer
                  </span>
                  <span className="text-sm font-number font-black text-[#C8FF45]">
                    {timerDuration}s
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="20"
                  step="1"
                  value={timerDuration}
                  onChange={(e) => setTimerDuration(parseInt(e.target.value))}
                  className="w-full accent-[#C8FF45] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#9BAAC0] font-number mt-1">
                  <span>5s (Lightning)</span>
                  <span>10s (Standard)</span>
                  <span>20s (Deliberate)</span>
                </div>
              </div>

              {/* Play Mode & Bots */}
              <div className="bg-[#0E1626] border border-[#26354D] rounded-xl p-3.5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-heading font-bold uppercase tracking-wider text-[#9BAAC0] flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-[#FFC857]" />
                    Play Mode
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setPlayMode('friends_only')}
                      className={`px-2.5 py-1 text-xs rounded-md font-heading font-bold uppercase transition-all ${
                        playMode === 'friends_only' ? 'bg-[#FFC857] text-black font-black' : 'bg-[#141F33] text-[#9BAAC0] hover:text-[#F4F7FC]'
                      }`}
                    >
                      Friends Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlayMode('friends_bots')}
                      className={`px-2.5 py-1 text-xs rounded-md font-heading font-bold uppercase transition-all ${
                        playMode === 'friends_bots' ? 'bg-[#FFC857] text-black font-black' : 'bg-[#141F33] text-[#9BAAC0] hover:text-[#F4F7FC]'
                      }`}
                    >
                      Friends + AI Bots
                    </button>
                  </div>
                </div>

                {playMode === 'friends_bots' && (
                  <div className="mt-2.5 pt-2.5 border-t border-[#26354D] flex items-center justify-between">
                    <span className="text-xs text-[#9BAAC0]">AI Bot Franchises:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="1"
                        max="9"
                        value={botCount}
                        onChange={(e) => setBotCount(parseInt(e.target.value))}
                        className="w-28 accent-[#FFC857]"
                      />
                      <span className="text-xs font-number font-black text-[#FFC857] w-8 text-right">
                        {botCount} bots
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* House Rules */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1.5 text-xs font-heading font-bold uppercase tracking-wider text-[#9BAAC0] hover:text-[#C8FF45] transition-colors py-1"
                >
                  <Sliders className="w-3 h-3" />
                  <span>{showAdvanced ? 'Hide Advanced House Rules' : 'Show Advanced House Rules'}</span>
                </button>

                {showAdvanced && (
                  <div className="mt-2 p-3 bg-[#0E1626] border border-[#26354D] rounded-xl space-y-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-[#9BAAC0]">Starting Franchise Purse:</span>
                      <span className="font-number font-black text-[#C8FF45]">₹{startingPurseCr} Crore</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#9BAAC0]">Squad Limits:</span>
                      <span className="font-number text-[#F4F7FC]">Min 18 · Max 25</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#9BAAC0]">Max Overseas Players:</span>
                      <span className="font-number text-[#FFC857] font-bold">8 per franchise (strictly enforced)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#9BAAC0]">Minimum Bid Increment:</span>
                      <span className="font-number font-black text-[#F4F7FC]">₹{minBidIncrementLakh} Lakh</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || !hostNickname.trim()}
                className="w-full mt-2 bg-[#C8FF45] hover:bg-[#B0E635] text-black font-heading font-black uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all shadow-glow-lime flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed group text-base"
              >
                <span>{isLoading ? 'Creating Room...' : 'Launch Auction Room'}</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1 stroke-[3]" />
              </button>
            </form>
          )}

          {/* JOIN ROOM FORM */}
          {activeTab === 'join' && (
            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-heading font-bold uppercase tracking-wider text-[#9BAAC0] mb-1.5">
                  Enter 6-Character Room Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={8}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. BW-7821"
                  className="w-full bg-[#0E1626] border border-[#26354D] focus:border-[#C8FF45] focus:ring-1 focus:ring-[#C8FF45] rounded-xl px-4 py-3 text-lg font-number text-center tracking-widest text-[#C8FF45] placeholder-[#54627A] uppercase outline-none transition-all font-black"
                />
              </div>

              {/* Optional Room Password entry upfront */}
              <div className="bg-[#0E1626] border border-[#26354D] rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-heading font-bold uppercase tracking-wider text-[#9BAAC0] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#FFC857]" />
                    Private Room Password (if required)
                  </span>
                  <button
                    type="button"
                    onClick={() => setHasPassword(!hasPassword)}
                    className="text-[11px] font-heading font-bold uppercase text-[#C8FF45] hover:underline"
                  >
                    {hasPassword ? 'Remove' : '+ Add Password'}
                  </button>
                </div>

                {hasPassword && (
                  <div className="relative">
                    <input
                      type={showJoinPassword ? 'text' : 'password'}
                      value={joinPassword}
                      onChange={(e) => setJoinPassword(e.target.value)}
                      placeholder="Enter room password..."
                      className="w-full bg-[#141F33] border border-[#26354D] focus:border-[#FFC857] rounded-xl pl-3 pr-10 py-2.5 text-xs text-[#F4F7FC] placeholder-[#54627A] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowJoinPassword(!showJoinPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9BAAC0] hover:text-[#F4F7FC]"
                    >
                      {showJoinPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !joinCode.trim()}
                className="w-full bg-[#C8FF45] hover:bg-[#B0E635] text-black font-heading font-black uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all shadow-glow-lime flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed group text-base"
              >
                <span>{isLoading ? 'Verifying Room...' : 'Proceed to Team Selection'}</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1 stroke-[3]" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
