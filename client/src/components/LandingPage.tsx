import React, { useState, useRef } from 'react';
import { 
  Trophy, 
  Users, 
  ChevronRight, 
  Sliders, 
  Bot, 
  Clock, 
  Lock, 
  Eye, 
  EyeOff,
  Radio,
  ArrowDown
} from 'lucide-react';
import { RoomSettings } from '../types.js';
import { BidWarsLogo } from './BidWarsLogo.js';
import { CoinsIcon, GavelIcon, TrophyIcon as TrophyBrandIcon } from './BrandIcons.js';

interface LandingPageProps {
  onCreateRoom: (nickname: string, settings: Partial<RoomSettings>) => void;
  onJoinRoom: (roomCode: string, password?: string) => void;
  onSwitchToTournament?: () => void;
  isLoading: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onCreateRoom, onJoinRoom, onSwitchToTournament, isLoading }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const actionHubRef = useRef<HTMLDivElement>(null);
  
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

  // Hero interactive preview card simulated bid state
  const [previewBid, setPreviewBid] = useState(8.75);
  const [previewTeam, setPreviewTeam] = useState('STORM SULTANS');

  const scrollToActions = (tab: 'create' | 'join') => {
    setActiveTab(tab);
    actionHubRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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

  const handlePreviewRaise = () => {
    setPreviewBid(prev => Number((prev + 0.25).toFixed(2)));
    setPreviewTeam('YOU (NEON NAWABS)');
  };

  return (
    <div className="min-h-screen bg-[#0A0B14] text-[#F4F6FA] flex flex-col justify-between selection:bg-[#C8FF3D] selection:text-[#0A0B14] font-body relative overflow-x-hidden">
      {/* Background Atmosphere Radial Glows */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#7C5CFF]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-48 right-10 w-[500px] h-[500px] bg-[#C8FF3D]/8 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-[450px] h-[450px] bg-[#FF3B5C]/8 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Brand Navigation Bar matching Page 2 of PDF */}
      <nav className="relative z-20 max-w-7xl mx-auto w-full px-4 sm:px-8 py-5 flex items-center justify-between">
        <BidWarsLogo size="md" />

        {/* Center Nav Links */}
        <div className="hidden md:flex items-center gap-7 text-xs font-sans font-semibold text-[#8A92B2]">
          <button 
            type="button" 
            onClick={() => scrollToActions('create')} 
            className="hover:text-white transition-colors"
          >
            Play
          </button>
          <button 
            type="button" 
            onClick={() => scrollToActions('create')} 
            className="hover:text-white transition-colors"
          >
            Teams
          </button>
          <button 
            type="button" 
            onClick={() => scrollToActions('join')} 
            className="hover:text-white transition-colors"
          >
            Leaderboard
          </button>
          <button 
            type="button" 
            onClick={() => setShowAdvanced(true)} 
            className="hover:text-white transition-colors"
          >
            Rules
          </button>
        </div>

        {/* Right CTA button */}
        <div className="flex items-center gap-3">
          {onSwitchToTournament && (
            <button
              type="button"
              onClick={onSwitchToTournament}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-[#7C5CFF] to-[#0078FF] text-white font-sans font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(124,92,255,0.35)] hover:scale-105 active:scale-95 flex items-center gap-1.5"
            >
              <span>🏆</span>
              <span>Tournament Mode</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => scrollToActions('join')}
            className="px-5 py-2.5 rounded-full bg-[#C8FF3D] hover:bg-[#AEE620] text-[#0A0B14] font-sans font-bold text-xs uppercase tracking-wider transition-all shadow-lime-glow hover:scale-105 active:scale-95"
          >
            Join an auction
          </button>
        </div>
      </nav>

      {/* Hero Section matching Page 2 of PDF */}
      <section className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-8 pt-6 sm:pt-12 pb-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Column: Headline and Pitch */}
        <div className="lg:col-span-7 space-y-6">
          {/* Live Status Badge */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#12142A] border border-[#23274D] text-xs font-mono font-medium text-[#C8FF3D] shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#C8FF3D] animate-ping" />
            <span className="tracking-wider uppercase text-[11px]">LIVE AUCTION ROOMS OPEN</span>
          </div>

          {/* Main Title: Hammer your XI. */}
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-display font-extrabold uppercase tracking-tight text-white leading-[0.95]">
            Hammer<br />
            your <span className="text-[#C8FF3D]">XI.</span>
          </h1>

          {/* Brand Body Copy */}
          <p className="text-base sm:text-lg text-[#8A92B2] max-w-xl font-sans leading-relaxed">
            Eight franchises. One purse. Zero mercy. Outbid your friends, build the perfect squad and win the room.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => scrollToActions('create')}
              className="px-7 py-3.5 rounded-full bg-[#C8FF3D] hover:bg-[#AEE620] text-[#0A0B14] font-sans font-bold text-sm uppercase tracking-wider transition-all shadow-lime-glow hover:scale-105 active:scale-95"
            >
              Start bidding
            </button>
            {onSwitchToTournament && (
              <button
                type="button"
                onClick={onSwitchToTournament}
                className="px-6 py-3.5 rounded-full bg-gradient-to-r from-[#7C5CFF] to-[#0078FF] hover:opacity-95 text-white font-sans font-bold text-sm uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(124,92,255,0.35)] hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <span>🏆</span>
                <span>Play Tournament Mode</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => scrollToActions('join')}
              className="px-6 py-3.5 rounded-full bg-[#12142A] hover:bg-[#181A36] text-white border border-[#23274D] hover:border-[#7C5CFF] font-sans font-bold text-sm tracking-wider transition-all"
            >
              How it works
            </button>
          </div>
        </div>

        {/* Right Column: Interactive Live Auction Preview Card matching Page 2 */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-md bg-[#12142A] border border-[#23274D] rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden group hover:border-[#7C5CFF] transition-all">
            {/* Top violet/lime edge accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-signature-gradient" />

            {/* Lot Tag & Countdown */}
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 rounded-full bg-[#181A36] border border-[#23274D] text-[11px] font-mono font-bold text-[#8A92B2] uppercase tracking-wider">
                LOT 07 · ALL-ROUNDER
              </span>
              <span className="text-sm font-mono font-bold text-[#FF3B5C] bg-[#FF3B5C]/10 px-2.5 py-0.5 rounded-full border border-[#FF3B5C]/30 animate-pulse">
                00:12
              </span>
            </div>

            {/* Player Name */}
            <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-white uppercase tracking-tight mb-2">
              ARJUN VEER
            </h3>

            {/* Current Bid info */}
            <div className="text-[11px] font-sans font-bold uppercase tracking-wider text-[#8A92B2] mb-1">
              CURRENT BID · <span className="text-[#F4F6FA]">{previewTeam}</span>
            </div>

            {/* Huge Bid Amount in Hammer Lime */}
            <div className="text-5xl sm:text-6xl font-display font-extrabold text-[#C8FF3D] tracking-tight mb-6">
              ₹{previewBid.toFixed(2)} <span className="text-2xl sm:text-3xl font-display">Cr</span>
            </div>

            {/* Bid CTA Button */}
            <button
              type="button"
              onClick={handlePreviewRaise}
              className="w-full py-4 rounded-2xl bg-[#C8FF3D] hover:bg-[#AEE620] text-[#0A0B14] font-display font-extrabold text-sm uppercase tracking-wider transition-all shadow-lime-glow hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>BID ₹{(previewBid + 0.25).toFixed(2)} Cr</span>
            </button>
            <p className="text-[10px] text-center text-[#8A92B2] mt-2 font-mono">
              Click button above to test live bidding raise
            </p>
          </div>
        </div>
      </section>

      {/* 3 Storytelling Feature Cards matching Page 2 */}
      <section className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Budget is a weapon */}
          <div className="bg-[#12142A] border border-[#23274D] rounded-3xl p-6 sm:p-7 shadow-card-dark hover:border-[#FFC93D]/60 transition-all group">
            <div className="w-11 h-11 rounded-2xl bg-[#FFC93D]/15 text-[#FFC93D] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <CoinsIcon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-display font-bold text-white uppercase tracking-tight mb-2">
              Budget is a weapon
            </h3>
            <p className="text-xs sm:text-sm text-[#8A92B2] font-sans leading-relaxed">
              Every crore you save is a bluff you can call later.
            </p>
          </div>

          {/* Card 2: Live bid wars */}
          <div className="bg-[#12142A] border border-[#23274D] rounded-3xl p-6 sm:p-7 shadow-card-dark hover:border-[#FF3B5C]/60 transition-all group">
            <div className="w-11 h-11 rounded-2xl bg-[#FF3B5C]/15 text-[#FF3B5C] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <GavelIcon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-display font-bold text-white uppercase tracking-tight mb-2">
              Live bid wars
            </h3>
            <p className="text-xs sm:text-sm text-[#8A92B2] font-sans leading-relaxed">
              Twelve-second clocks reset on every raise. Nerves decide.
            </p>
          </div>

          {/* Card 3: Win the room */}
          <div className="bg-[#12142A] border border-[#23274D] rounded-3xl p-6 sm:p-7 shadow-card-dark hover:border-[#7C5CFF]/60 transition-all group">
            <div className="w-11 h-11 rounded-2xl bg-[#7C5CFF]/15 text-[#7C5CFF] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <TrophyBrandIcon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-display font-bold text-white uppercase tracking-tight mb-2">
              Win the room
            </h3>
            <p className="text-xs sm:text-sm text-[#8A92B2] font-sans leading-relaxed">
              Squads are scored, ranked and crowned with a victory banner.
            </p>
          </div>
        </div>
      </section>

      {/* Main Action Hub: Create Room vs Join Room */}
      <section ref={actionHubRef} id="action-hub" className="relative z-10 max-w-3xl w-full mx-auto px-4 py-12">
        <div className="text-center mb-6">
          <span className="text-xs font-mono font-bold text-[#C8FF3D] uppercase tracking-wider">
            ENTER THE ARENA
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-white uppercase tracking-tight mt-1">
            {activeTab === 'create' ? 'Host a Private Auction' : 'Join an Active Room'}
          </h2>
        </div>

        <div className="bg-[#12142A] rounded-3xl p-6 sm:p-9 border border-[#23274D] shadow-2xl relative">
          {/* Edge signature gradient highlight */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-signature-gradient" />

          {/* Tab Switcher: Create vs Join */}
          <div className="grid grid-cols-2 gap-2 bg-[#0A0B14] p-1.5 rounded-2xl border border-[#23274D] mb-7">
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`py-3 px-4 rounded-xl font-display text-xs sm:text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                activeTab === 'create'
                  ? 'bg-[#C8FF3D] text-[#0A0B14] shadow-lime-glow-sm'
                  : 'text-[#8A92B2] hover:text-white hover:bg-[#181A36]'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Create Room</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('join')}
              className={`py-3 px-4 rounded-xl font-display text-xs sm:text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                activeTab === 'join'
                  ? 'bg-[#C8FF3D] text-[#0A0B14] shadow-lime-glow-sm'
                  : 'text-[#8A92B2] hover:text-white hover:bg-[#181A36]'
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
                <label className="block text-xs font-sans font-bold uppercase tracking-wider text-[#8A92B2] mb-1.5">
                  Host Nickname <span className="text-[#FF3B5C]">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={24}
                  value={hostNickname}
                  onChange={(e) => setHostNickname(e.target.value)}
                  placeholder="e.g. CaptainCool, KingKohli"
                  className="w-full bg-[#181A36] border border-[#23274D] focus:border-[#C8FF3D] focus:ring-1 focus:ring-[#C8FF3D] rounded-xl px-4 py-3 text-sm text-[#F4F6FA] placeholder-[#586082] outline-none transition-all font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-sans font-bold uppercase tracking-wider text-[#8A92B2] mb-1.5">
                  Room Name (Optional)
                </label>
                <input
                  type="text"
                  maxLength={40}
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. Champions Mega Auction 2026"
                  className="w-full bg-[#181A36] border border-[#23274D] focus:border-[#C8FF3D] focus:ring-1 focus:ring-[#C8FF3D] rounded-xl px-4 py-3 text-sm text-[#F4F6FA] placeholder-[#586082] outline-none transition-all font-sans"
                />
              </div>

              {/* Password Protection Selector */}
              <div className="bg-[#181A36] border border-[#23274D] rounded-2xl p-4 space-y-3">
                <span className="block text-xs font-sans font-bold uppercase tracking-wider text-[#8A92B2]">Room Privacy Access</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPrivate(false)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                      !isPrivate ? 'bg-[#C8FF3D] text-[#0A0B14] shadow-lime-glow-sm' : 'bg-[#12142A] text-[#8A92B2] border border-[#23274D] hover:text-[#F4F6FA]'
                    }`}
                  >
                    <span>Open Room</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPrivate(true)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                      isPrivate ? 'bg-[#FFC93D] text-[#0A0B14] shadow-gold-glow' : 'bg-[#12142A] text-[#8A92B2] border border-[#23274D] hover:text-[#F4F6FA]'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Private (Password)</span>
                  </button>
                </div>

                {isPrivate && (
                  <div className="pt-2 border-t border-[#23274D]">
                    <label className="block text-[11px] font-sans font-bold uppercase tracking-wider text-[#8A92B2] mb-1">
                      Set Room Password (min 4 characters) <span className="text-[#FFC93D]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required={isPrivate}
                        minLength={4}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter room password..."
                        className="w-full bg-[#12142A] border border-[#23274D] focus:border-[#C8FF3D] rounded-xl pl-3 pr-10 py-2.5 text-xs text-[#F4F6FA] placeholder-[#586082] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A92B2] hover:text-[#F4F6FA]"
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
                <div className="bg-[#181A36] border border-[#23274D] rounded-2xl p-3.5">
                  <span className="block text-xs font-sans font-bold uppercase tracking-wider text-[#8A92B2] mb-1.5">Auction Season</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSeason('2026')}
                      className={`py-2 px-2 rounded-xl text-xs font-sans font-bold uppercase transition-all ${
                        season === '2026' ? 'bg-[#C8FF3D] text-[#0A0B14] shadow-lime-glow-sm' : 'bg-[#12142A] text-[#8A92B2] border border-[#23274D] hover:text-[#F4F6FA]'
                      }`}
                    >
                      2026 Official
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeason('2025')}
                      className={`py-2 px-2 rounded-xl text-xs font-sans font-bold uppercase transition-all ${
                        season === '2025' ? 'bg-[#C8FF3D] text-[#0A0B14] shadow-lime-glow-sm' : 'bg-[#12142A] text-[#8A92B2] border border-[#23274D] hover:text-[#F4F6FA]'
                      }`}
                    >
                      2025 Historical
                    </button>
                  </div>
                </div>

                {/* Pool Mode */}
                <div className="bg-[#181A36] border border-[#23274D] rounded-2xl p-3.5">
                  <span className="block text-xs font-sans font-bold uppercase tracking-wider text-[#8A92B2] mb-1.5">Player Pool</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPoolMode('auction_pool')}
                      title="Only 359 un-retained players enter auction"
                      className={`py-2 px-2 rounded-xl text-xs font-sans font-bold uppercase transition-all ${
                        poolMode === 'auction_pool' ? 'bg-[#C8FF3D] text-[#0A0B14] shadow-lime-glow-sm' : 'bg-[#12142A] text-[#8A92B2] border border-[#23274D] hover:text-[#F4F6FA]'
                      }`}
                    >
                      Pool (359)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPoolMode('mega_all')}
                      title="All 532 players including retained stars"
                      className={`py-2 px-2 rounded-xl text-xs font-sans font-bold uppercase transition-all ${
                        poolMode === 'mega_all' ? 'bg-[#C8FF3D] text-[#0A0B14] shadow-lime-glow-sm' : 'bg-[#12142A] text-[#8A92B2] border border-[#23274D] hover:text-[#F4F6FA]'
                      }`}
                    >
                      Mega (532)
                    </button>
                  </div>
                </div>
              </div>

              {/* Timer Duration Slider */}
              <div className="bg-[#181A36] border border-[#23274D] rounded-2xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-sans font-bold uppercase tracking-wider text-[#8A92B2] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#7C5CFF]" />
                    Bid Countdown Timer
                  </span>
                  <span className="text-sm font-mono font-bold text-[#C8FF3D]">
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
                  className="w-full accent-[#C8FF3D] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#586082] font-mono mt-1">
                  <span>5s (Lightning)</span>
                  <span>10s (Standard)</span>
                  <span>20s (Deliberate)</span>
                </div>
              </div>

              {/* Play Mode & Bots */}
              <div className="bg-[#181A36] border border-[#23274D] rounded-2xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-sans font-bold uppercase tracking-wider text-[#8A92B2] flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-[#7C5CFF]" />
                    Play Mode
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPlayMode('friends_only')}
                      className={`px-3 py-1.5 text-xs rounded-xl font-sans font-bold uppercase transition-all ${
                        playMode === 'friends_only' ? 'bg-[#C8FF3D] text-[#0A0B14] shadow-lime-glow-sm' : 'bg-[#12142A] text-[#8A92B2] border border-[#23274D] hover:text-[#F4F6FA]'
                      }`}
                    >
                      Friends Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlayMode('friends_bots')}
                      className={`px-3 py-1.5 text-xs rounded-xl font-sans font-bold uppercase transition-all ${
                        playMode === 'friends_bots' ? 'bg-[#C8FF3D] text-[#0A0B14] shadow-lime-glow-sm' : 'bg-[#12142A] text-[#8A92B2] border border-[#23274D] hover:text-[#F4F6FA]'
                      }`}
                    >
                      Friends + AI Bots
                    </button>
                  </div>
                </div>

                {playMode === 'friends_bots' && (
                  <div className="mt-3 pt-3 border-t border-[#23274D] flex items-center justify-between">
                    <span className="text-xs text-[#8A92B2]">AI Bot Franchises:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="1"
                        max="9"
                        value={botCount}
                        onChange={(e) => setBotCount(parseInt(e.target.value))}
                        className="w-28 accent-[#C8FF3D]"
                      />
                      <span className="text-xs font-mono font-bold text-[#C8FF3D] w-12 text-right">
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
                  className="flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-wider text-[#C8FF3D] hover:underline transition-colors py-1"
                >
                  <Sliders className="w-3 h-3" />
                  <span>{showAdvanced ? 'Hide Advanced House Rules' : 'Show Advanced House Rules'}</span>
                </button>

                {showAdvanced && (
                  <div className="mt-2 p-4 bg-[#181A36] border border-[#23274D] rounded-2xl space-y-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-[#8A92B2]">Starting Franchise Purse:</span>
                      <span className="font-mono font-bold text-[#FFC93D]">₹{startingPurseCr} Crore</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#8A92B2]">Squad Limits:</span>
                      <span className="font-mono font-bold text-[#F4F6FA]">Min 18 · Max 25</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#8A92B2]">Max Overseas Players:</span>
                      <span className="font-mono text-[#FFC93D] font-bold">8 per franchise (strictly enforced)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#8A92B2]">Minimum Bid Increment:</span>
                      <span className="font-mono font-bold text-[#F4F6FA]">₹{minBidIncrementLakh} Lakh</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || !hostNickname.trim()}
                className="w-full mt-3 bg-[#C8FF3D] hover:bg-[#AEE620] text-[#0A0B14] font-display font-bold uppercase tracking-wider py-4 px-6 rounded-2xl transition-all shadow-lime-glow flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed group text-base"
              >
                <span>{isLoading ? 'Creating Room...' : 'Launch Auction Room'}</span>
                <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1 stroke-[3]" />
              </button>
            </form>
          )}

          {/* JOIN ROOM FORM */}
          {activeTab === 'join' && (
            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-sans font-bold uppercase tracking-wider text-[#8A92B2] mb-1.5">
                  Enter 6-Character Room Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={8}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. BW-7821"
                  className="w-full bg-[#181A36] border border-[#23274D] focus:border-[#C8FF3D] focus:ring-1 focus:ring-[#C8FF3D] rounded-2xl px-4 py-3.5 text-xl font-mono text-center tracking-widest text-[#FFC93D] placeholder-[#586082] uppercase outline-none transition-all font-bold"
                />
              </div>

              {/* Optional Room Password entry upfront */}
              <div className="bg-[#181A36] border border-[#23274D] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-sans font-bold uppercase tracking-wider text-[#8A92B2] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#FFC93D]" />
                    Private Room Password (if required)
                  </span>
                  <button
                    type="button"
                    onClick={() => setHasPassword(!hasPassword)}
                    className="text-[11px] font-sans font-bold uppercase text-[#C8FF3D] hover:underline"
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
                      className="w-full bg-[#12142A] border border-[#23274D] focus:border-[#C8FF3D] rounded-xl pl-3 pr-10 py-2.5 text-xs text-[#F4F6FA] placeholder-[#586082] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowJoinPassword(!showJoinPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A92B2] hover:text-[#F4F6FA]"
                    >
                      {showJoinPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !joinCode.trim()}
                className="w-full bg-[#C8FF3D] hover:bg-[#AEE620] text-[#0A0B14] font-display font-bold uppercase tracking-wider py-4 px-6 rounded-2xl transition-all shadow-lime-glow flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed group text-base"
              >
                <span>{isLoading ? 'Verifying Room...' : 'Proceed to Team Selection'}</span>
                <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1 stroke-[3]" />
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Brand Footer */}
      <footer className="relative z-10 border-t border-[#23274D] py-8 text-center text-xs text-[#8A92B2] font-sans">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-white tracking-wider">BIDWARS</span>
            <span>·</span>
            <span>Hammer your XI.</span>
          </div>
          <p className="text-[11px] text-[#586082]">
            IPL 2026 Mega Auction Simulator · Electric · Cutthroat · Premium · Playful
          </p>
        </div>
      </footer>
    </div>
  );
};
