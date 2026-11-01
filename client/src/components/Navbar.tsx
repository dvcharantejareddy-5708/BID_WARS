import React, { useState } from 'react';
import { Volume2, VolumeX, Copy, Check, Radio, Users, Shield, Compass, FileText, Settings, LogOut } from 'lucide-react';
import { IPLTeamId, IPL_FRANCHISES, RoomMember } from '../types.js';
import { soundManager } from '../services/audio.js';

interface NavbarProps {
  roomCode?: string;
  connected: boolean;
  myMember?: RoomMember;
  activeTab: 'auction' | 'my-team' | 'all-teams' | 'explorer' | 'audit' | 'settings';
  setActiveTab: (tab: any) => void;
  onLeaveRoom?: () => void;
  squadCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  roomCode,
  connected,
  myMember,
  activeTab,
  setActiveTab,
  onLeaveRoom,
  squadCount = 0
}) => {
  const [isMuted, setIsMuted] = useState(soundManager.isMuted);
  const [copied, setCopied] = useState(false);

  const handleToggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const handleCopyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const myTeam = myMember?.teamId ? IPL_FRANCHISES[myMember.teamId] : null;

  return (
    <header className="sticky top-0 z-50 bg-[#0B1020]/90 backdrop-blur-md border-b border-navy-700/80 px-4 lg:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo & Tagline */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏏</span>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-wider font-display text-white">
                  BID<span className="text-cyan-400">WARS</span>
                </span>
                <span className="bg-amber-400/20 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-400/30 uppercase tracking-wider">
                  2026
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide hidden sm:block">
                BUILD YOUR XI. WIN THE AUCTION.
              </span>
            </div>
          </div>
        </div>

        {/* Center Navigation Tabs (Only visible when in a room) */}
        {roomCode && (
          <nav className="hidden md:flex items-center bg-navy-800/80 p-1 rounded-xl border border-navy-700">
            <button
              onClick={() => setActiveTab('auction')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'auction'
                  ? 'bg-cyan-400 text-black shadow-glow-cyan'
                  : 'text-slate-300 hover:text-white hover:bg-navy-700/60'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Auction Arena</span>
            </button>

            <button
              onClick={() => setActiveTab('my-team')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'my-team'
                  ? 'bg-cyan-400 text-black shadow-glow-cyan'
                  : 'text-slate-300 hover:text-white hover:bg-navy-700/60'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>My Team</span>
              {squadCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'my-team' ? 'bg-black text-cyan-400' : 'bg-navy-600 text-slate-200'
                }`}>
                  {squadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('all-teams')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'all-teams'
                  ? 'bg-cyan-400 text-black shadow-glow-cyan'
                  : 'text-slate-300 hover:text-white hover:bg-navy-700/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>All Teams</span>
            </button>

            <button
              onClick={() => setActiveTab('explorer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'explorer'
                  ? 'bg-cyan-400 text-black shadow-glow-cyan'
                  : 'text-slate-300 hover:text-white hover:bg-navy-700/60'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Players</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'audit'
                  ? 'bg-cyan-400 text-black shadow-glow-cyan'
                  : 'text-slate-300 hover:text-white hover:bg-navy-700/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Audit Log</span>
            </button>
          </nav>
        )}

        {/* Right Controls: Room Code, Team Badge, Sound & Leave */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {roomCode && (
            <button
              onClick={handleCopyCode}
              title="Click to copy Room Code"
              className="flex items-center gap-1.5 bg-navy-800 hover:bg-navy-700 text-cyan-300 border border-cyan-400/30 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all shadow-sm"
            >
              <span>{roomCode}</span>
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 opacity-70" />}
            </button>
          )}

          {/* User & Team Badge */}
          {myMember && (
            <div className="flex items-center gap-2 bg-navy-800/90 border border-navy-700 px-2.5 py-1 rounded-lg">
              {myTeam ? (
                <div 
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm"
                  style={{ backgroundColor: myTeam.primaryColor, color: myTeam.textColor }}
                >
                  {myTeam.id.slice(0, 2)}
                </div>
              ) : (
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
              <span className="text-xs font-semibold text-slate-200 max-w-[90px] truncate">
                {myMember.nickname}
              </span>
              {myMember.isHost && (
                <span className="text-[9px] bg-amber-400/20 text-amber-300 font-bold px-1 rounded">
                  HOST
                </span>
              )}
            </div>
          )}

          {/* Connection Status indicator */}
          <div className="flex items-center gap-1" title={connected ? 'Live Connected' : 'Connecting...'}>
            <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-400 shadow-glow-emerald' : 'bg-ruby-500 animate-ping'}`} />
          </div>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            aria-label={isMuted ? 'Unmute sound effects' : 'Mute sound effects'}
            className="p-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 hover:text-white border border-navy-700 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-ruby-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Leave Room */}
          {roomCode && onLeaveRoom && (
            <button
              onClick={onLeaveRoom}
              title="Leave Room"
              className="p-1.5 rounded-lg bg-navy-800 hover:bg-ruby-500/20 text-slate-400 hover:text-ruby-400 border border-navy-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Tab Navigation Bar */}
      {roomCode && (
        <div className="flex md:hidden items-center justify-around mt-2 pt-2 border-t border-navy-700/60 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('auction')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 ${
              activeTab === 'auction' ? 'bg-cyan-400 text-black font-bold' : 'text-slate-400'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>Auction</span>
          </button>
          <button
            onClick={() => setActiveTab('my-team')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 ${
              activeTab === 'my-team' ? 'bg-cyan-400 text-black font-bold' : 'text-slate-400'
            }`}
          >
            <Shield className="w-3 h-3" />
            <span>My Team</span>
          </button>
          <button
            onClick={() => setActiveTab('all-teams')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 ${
              activeTab === 'all-teams' ? 'bg-cyan-400 text-black font-bold' : 'text-slate-400'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>Teams</span>
          </button>
          <button
            onClick={() => setActiveTab('explorer')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 ${
              activeTab === 'explorer' ? 'bg-cyan-400 text-black font-bold' : 'text-slate-400'
            }`}
          >
            <Compass className="w-3 h-3" />
            <span>Players</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 ${
              activeTab === 'audit' ? 'bg-cyan-400 text-black font-bold' : 'text-slate-400'
            }`}
          >
            <FileText className="w-3 h-3" />
            <span>Logs</span>
          </button>
        </div>
      )}
    </header>
  );
};
