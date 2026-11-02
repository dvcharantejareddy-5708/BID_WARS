import React, { useState } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  Radio, 
  Shield, 
  Users, 
  History, 
  LogOut, 
  Lock,
  MessageSquare,
  ListFilter,
  Trophy
} from 'lucide-react';
import { IPL_FRANCHISES, RoomMember } from '../types.js';
import { soundManager } from '../services/audio.js';
import { TeamLogo } from './TeamLogo.js';

interface NavbarProps {
  roomCode?: string;
  isPrivate?: boolean;
  connected: boolean;
  myMember?: RoomMember;
  activeTab: 'auction' | 'my-team' | 'all-teams' | 'players' | 'history' | 'settings';
  setActiveTab: (tab: any) => void;
  onLeaveRoom?: () => void;
  squadCount?: number;
  onToggleChat?: () => void;
  isChatOpen?: boolean;
  unreadChatCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  roomCode,
  isPrivate,
  connected,
  myMember,
  activeTab,
  setActiveTab,
  onLeaveRoom,
  squadCount = 0,
  onToggleChat,
  isChatOpen = false,
  unreadChatCount = 0
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
    <header className="sticky top-0 z-50 bg-[#101B2D] text-white border-b border-[#344B65] px-3.5 lg:px-6 py-2 transition-all shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Logo & Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-xl">🏏</span>
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-heading font-bold tracking-wider text-white">
              BID<span className="text-[#F3C969]">WARS</span>
            </span>
            <span className="bg-[#3DBB83] text-white text-[11px] font-heading font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              IPL 2026
            </span>
          </div>
        </div>

        {/* Center Navigation Tabs (When inside a room) */}
        {roomCode && (
          <nav className="hidden md:flex items-center bg-[#172840]/80 p-1 rounded-lg border border-[#344B65] gap-1">
            <button
              onClick={() => setActiveTab('auction')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-heading font-bold uppercase tracking-wider transition-all ${
                activeTab === 'auction'
                  ? 'bg-[#3DBB83] text-white shadow-sm'
                  : 'text-[#B0BED0] hover:text-white hover:bg-white/10'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-[#F3C969]" />
              <span>Auction Arena</span>
            </button>

            <button
              onClick={() => setActiveTab('my-team')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-heading font-bold uppercase tracking-wider transition-all ${
                activeTab === 'my-team'
                  ? 'bg-[#3DBB83] text-white shadow-sm'
                  : 'text-[#B0BED0] hover:text-white hover:bg-white/10'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>My Team</span>
              {squadCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-number ${
                  activeTab === 'my-team' ? 'bg-[#F3C969] text-[#101B2D]' : 'bg-white/20 text-white'
                }`}>
                  {squadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('all-teams')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-heading font-bold uppercase tracking-wider transition-all ${
                activeTab === 'all-teams'
                  ? 'bg-[#3DBB83] text-white shadow-sm'
                  : 'text-[#B0BED0] hover:text-white hover:bg-white/10'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>All Teams</span>
            </button>

            <button
              onClick={() => setActiveTab('players')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-heading font-bold uppercase tracking-wider transition-all ${
                activeTab === 'players'
                  ? 'bg-[#3DBB83] text-white shadow-sm'
                  : 'text-[#B0BED0] hover:text-white hover:bg-white/10'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Players</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-heading font-bold uppercase tracking-wider transition-all ${
                activeTab === 'history'
                  ? 'bg-[#3DBB83] text-white shadow-sm'
                  : 'text-[#B0BED0] hover:text-white hover:bg-white/10'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
            </button>
          </nav>
        )}

        {/* Right Controls: Chat Button + Room info + Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Live Chat Toggle Button with Unread Badge */}
          {roomCode && onToggleChat && (
            <button
              onClick={onToggleChat}
              title="Toggle Live Chat"
              className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-heading font-bold uppercase tracking-wider transition-all shadow-sm ${
                isChatOpen
                  ? 'bg-[#176B48] text-white border-white/30'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chat</span>
              {unreadChatCount > 0 && !isChatOpen && (
                <span className="bg-[#F3C969] text-[#101B2D] text-[10px] font-number px-1.5 py-0.2 rounded-full font-bold">
                  {unreadChatCount}
                </span>
              )}
            </button>
          )}

          {roomCode && (
            <button
              onClick={handleCopyCode}
              title="Click to copy Room Code"
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-2.5 py-1.5 rounded-lg text-xs font-number transition-all shadow-sm"
            >
              {isPrivate && <Lock className="w-3 h-3 text-[#F0C65B]" />}
              <span>{roomCode}</span>
              {copied ? <Check className="w-3.5 h-3.5 text-[#F0C65B]" /> : <Copy className="w-3.5 h-3.5 opacity-60" />}
            </button>
          )}

          {myMember && (
            <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 px-2.5 py-1.5 rounded-lg">
              {myTeam ? (
                <TeamLogo teamId={myTeam.id} className="w-5 h-5" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-[#F0C65B] animate-pulse" />
              )}
              <span className="text-xs font-semibold text-white max-w-[85px] truncate">
                {myMember.nickname}
              </span>
              {myMember.isHost && (
                <span className="text-[9px] bg-[#F3C969] text-[#101B2D] font-heading font-bold px-1.5 rounded uppercase tracking-wider">
                  HOST
                </span>
              )}
            </div>
          )}

          <div className="flex items-center" title={connected ? 'Live Connected' : 'Connecting...'}>
            <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-[#176B48] ring-2 ring-white/30' : 'bg-[#C74444] animate-ping'}`} />
          </div>

          <button
            onClick={handleToggleSound}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-[#C74444]" /> : <Volume2 className="w-4 h-4 text-white" />}
          </button>

          {roomCode && onLeaveRoom && (
            <button
              onClick={onLeaveRoom}
              title="Leave Room"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-[#C74444] text-white border border-white/15 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Tab Navigation Bar */}
      {roomCode && (
        <div className="flex md:hidden items-center justify-around mt-1.5 pt-1.5 border-t border-white/15 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('auction')}
            className={`px-2.5 py-1 text-xs font-heading font-bold uppercase tracking-wider rounded flex items-center gap-1 ${
              activeTab === 'auction' ? 'bg-[#176B48] text-white' : 'text-white/80'
            }`}
          >
            <Radio className="w-3 h-3 text-[#F0C65B]" />
            <span>Arena</span>
          </button>
          <button
            onClick={() => setActiveTab('my-team')}
            className={`px-2.5 py-1 text-xs font-heading font-bold uppercase tracking-wider rounded flex items-center gap-1 ${
              activeTab === 'my-team' ? 'bg-[#176B48] text-white' : 'text-white/80'
            }`}
          >
            <Shield className="w-3 h-3" />
            <span>My Team</span>
          </button>
          <button
            onClick={() => setActiveTab('all-teams')}
            className={`px-2.5 py-1 text-xs font-heading font-bold uppercase tracking-wider rounded flex items-center gap-1 ${
              activeTab === 'all-teams' ? 'bg-[#176B48] text-white' : 'text-white/80'
            }`}
          >
            <Trophy className="w-3 h-3" />
            <span>Teams</span>
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={`px-2.5 py-1 text-xs font-heading font-bold uppercase tracking-wider rounded flex items-center gap-1 ${
              activeTab === 'players' ? 'bg-[#176B48] text-white' : 'text-white/80'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>Players</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-2.5 py-1 text-xs font-heading font-bold uppercase tracking-wider rounded flex items-center gap-1 ${
              activeTab === 'history' ? 'bg-[#176B48] text-white' : 'text-white/80'
            }`}
          >
            <History className="w-3 h-3" />
            <span>History</span>
          </button>
        </div>
      )}
    </header>
  );
};
