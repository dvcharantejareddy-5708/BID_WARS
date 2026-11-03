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
  Trophy
} from 'lucide-react';
import { IPL_FRANCHISES, RoomMember } from '../types.js';
import { soundManager } from '../services/audio.js';
import { TeamLogo } from './TeamLogo.js';
import { BidWarsLogo } from './BidWarsLogo.js';

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
    <header className="sticky top-0 z-50 bg-[#0A0B14]/95 backdrop-blur-md text-white border-b border-[#23274D] px-3.5 lg:px-6 py-2.5 transition-all shadow-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Logo & Brand matching PDF */}
        <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => roomCode && setActiveTab('auction')}>
          <BidWarsLogo size="sm" />
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-[#12142A] border border-[#23274D] text-[10px] font-mono font-medium text-[#C8FF3D] uppercase tracking-wider">
            IPL 2026
          </span>
        </div>

        {/* Center Navigation Tabs (When inside a room) */}
        {roomCode && (
          <nav className="hidden md:flex items-center bg-[#12142A] p-1 rounded-xl border border-[#23274D] gap-1">
            <button
              onClick={() => setActiveTab('auction')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-heading uppercase tracking-wider transition-all ${
                activeTab === 'auction'
                  ? 'bg-[#C8FF3D] text-[#0A0B14] font-bold shadow-lime-glow-sm'
                  : 'text-[#8A92B2] hover:text-white hover:bg-[#181A36]'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Arena</span>
            </button>

            <button
              onClick={() => setActiveTab('my-team')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-heading uppercase tracking-wider transition-all ${
                activeTab === 'my-team'
                  ? 'bg-[#C8FF3D] text-[#0A0B14] font-bold shadow-lime-glow-sm'
                  : 'text-[#8A92B2] hover:text-white hover:bg-[#181A36]'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>My Team</span>
              {squadCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  activeTab === 'my-team' ? 'bg-[#0A0B14] text-[#C8FF3D]' : 'bg-[#23274D] text-[#8A92B2]'
                }`}>
                  {squadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('all-teams')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-heading uppercase tracking-wider transition-all ${
                activeTab === 'all-teams'
                  ? 'bg-[#C8FF3D] text-[#0A0B14] font-bold shadow-lime-glow-sm'
                  : 'text-[#8A92B2] hover:text-white hover:bg-[#181A36]'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>All Teams</span>
            </button>

            <button
              onClick={() => setActiveTab('players')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-heading uppercase tracking-wider transition-all ${
                activeTab === 'players'
                  ? 'bg-[#C8FF3D] text-[#0A0B14] font-bold shadow-lime-glow-sm'
                  : 'text-[#8A92B2] hover:text-white hover:bg-[#181A36]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Players</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-heading uppercase tracking-wider transition-all ${
                activeTab === 'history'
                  ? 'bg-[#C8FF3D] text-[#0A0B14] font-bold shadow-lime-glow-sm'
                  : 'text-[#8A92B2] hover:text-white hover:bg-[#181A36]'
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
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-heading uppercase tracking-wider transition-all ${
                isChatOpen
                  ? 'bg-[#7C5CFF] text-white border-[#7C5CFF] shadow-violet-glow'
                  : 'bg-[#12142A] hover:bg-[#181A36] text-[#F4F6FA] border-[#23274D] hover:border-[#7C5CFF]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chat</span>
              {unreadChatCount > 0 && !isChatOpen && (
                <span className="bg-[#FF3B5C] text-white text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold animate-pulse">
                  {unreadChatCount}
                </span>
              )}
            </button>
          )}

          {roomCode && (
            <button
              onClick={handleCopyCode}
              title="Click to copy Room Code"
              className="flex items-center gap-1.5 bg-[#12142A] hover:bg-[#181A36] text-[#FFC93D] border border-[#23274D] px-3 py-1.5 rounded-xl text-xs font-mono transition-all hover:border-[#FFC93D]/40"
            >
              {isPrivate && <Lock className="w-3 h-3 text-[#FFC93D]" />}
              <span>{roomCode}</span>
              {copied ? <Check className="w-3.5 h-3.5 text-[#C8FF3D]" /> : <Copy className="w-3.5 h-3.5 opacity-60" />}
            </button>
          )}

          {myMember && (
            <div className="flex items-center gap-2 bg-[#12142A] border border-[#23274D] px-3 py-1.5 rounded-xl">
              {myTeam ? (
                <TeamLogo teamId={myTeam.id} className="w-5 h-5" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-[#C8FF3D] animate-ping" />
              )}
              <span className="text-xs font-semibold text-white max-w-[85px] truncate font-sans">
                {myMember.nickname}
              </span>
              {myMember.isHost && (
                <span className="text-[9px] bg-[#FFC93D] text-[#0A0B14] font-display font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                  HOST
                </span>
              )}
            </div>
          )}

          <div className="flex items-center" title={connected ? 'Live Connected' : 'Connecting...'}>
            <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-[#C8FF3D] ring-2 ring-[#C8FF3D]/30 shadow-lime-glow-sm' : 'bg-[#FF3B5C] animate-ping'}`} />
          </div>

          <button
            onClick={handleToggleSound}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            className="p-2 rounded-xl bg-[#12142A] hover:bg-[#181A36] text-white border border-[#23274D] transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-[#FF3B5C]" /> : <Volume2 className="w-4 h-4 text-[#C8FF3D]" />}
          </button>

          {roomCode && onLeaveRoom && (
            <button
              onClick={onLeaveRoom}
              title="Leave Room"
              className="p-2 rounded-xl bg-[#12142A] hover:bg-[#FF3B5C]/20 text-[#8A92B2] hover:text-[#FF3B5C] border border-[#23274D] hover:border-[#FF3B5C]/40 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Tab Navigation Bar */}
      {roomCode && (
        <div className="flex md:hidden items-center justify-around mt-2 pt-2 border-t border-[#23274D] overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('auction')}
            className={`px-3 py-1.5 text-xs font-heading uppercase tracking-wider rounded-lg flex items-center gap-1 ${
              activeTab === 'auction' ? 'bg-[#C8FF3D] text-[#0A0B14] font-bold shadow-lime-glow-sm' : 'text-[#8A92B2]'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>Arena</span>
          </button>
          <button
            onClick={() => setActiveTab('my-team')}
            className={`px-3 py-1.5 text-xs font-heading uppercase tracking-wider rounded-lg flex items-center gap-1 ${
              activeTab === 'my-team' ? 'bg-[#C8FF3D] text-[#0A0B14] font-bold shadow-lime-glow-sm' : 'text-[#8A92B2]'
            }`}
          >
            <Shield className="w-3 h-3" />
            <span>My Team</span>
          </button>
          <button
            onClick={() => setActiveTab('all-teams')}
            className={`px-3 py-1.5 text-xs font-heading uppercase tracking-wider rounded-lg flex items-center gap-1 ${
              activeTab === 'all-teams' ? 'bg-[#C8FF3D] text-[#0A0B14] font-bold shadow-lime-glow-sm' : 'text-[#8A92B2]'
            }`}
          >
            <Trophy className="w-3 h-3" />
            <span>Teams</span>
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={`px-3 py-1.5 text-xs font-heading uppercase tracking-wider rounded-lg flex items-center gap-1 ${
              activeTab === 'players' ? 'bg-[#C8FF3D] text-[#0A0B14] font-bold shadow-lime-glow-sm' : 'text-[#8A92B2]'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>Players</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 text-xs font-heading uppercase tracking-wider rounded-lg flex items-center gap-1 ${
              activeTab === 'history' ? 'bg-[#C8FF3D] text-[#0A0B14] font-bold shadow-lime-glow-sm' : 'text-[#8A92B2]'
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
