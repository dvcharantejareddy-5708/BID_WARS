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
    <header className="sticky top-0 z-50 bg-[#080D18]/95 backdrop-blur-md border-b border-[#26354D] px-4 lg:px-6 py-2.5 transition-all font-body">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Logo & Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-xl">🏏</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-heading font-black tracking-wider text-[#F4F7FC]">
              BID<span className="text-[#C8FF45]">WARS</span>
            </span>
            <span className="bg-[#C8FF45]/15 text-[#C8FF45] text-[10px] font-heading font-bold px-2 py-0.5 rounded border border-[#C8FF45]/30 uppercase tracking-wider">
              IPL 2026
            </span>
          </div>
        </div>

        {/* Center Navigation Tabs (When inside a room) */}
        {roomCode && (
          <nav className="hidden md:flex items-center bg-[#0E1626] p-1 rounded-xl border border-[#26354D] gap-1">
            <button
              onClick={() => setActiveTab('auction')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all ${
                activeTab === 'auction'
                  ? 'bg-[#C8FF45] text-black shadow-glow-lime'
                  : 'text-[#9BAAC0] hover:text-[#F4F7FC] hover:bg-[#141F33]'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Auction</span>
            </button>

            <button
              onClick={() => setActiveTab('my-team')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all ${
                activeTab === 'my-team'
                  ? 'bg-[#C8FF45] text-black shadow-glow-lime'
                  : 'text-[#9BAAC0] hover:text-[#F4F7FC] hover:bg-[#141F33]'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>My Team</span>
              {squadCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-number ${
                  activeTab === 'my-team' ? 'bg-black text-[#C8FF45]' : 'bg-[#26354D] text-[#F4F7FC]'
                }`}>
                  {squadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('all-teams')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all ${
                activeTab === 'all-teams'
                  ? 'bg-[#C8FF45] text-black shadow-glow-lime'
                  : 'text-[#9BAAC0] hover:text-[#F4F7FC] hover:bg-[#141F33]'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>All Teams</span>
            </button>

            <button
              onClick={() => setActiveTab('players')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all ${
                activeTab === 'players'
                  ? 'bg-[#C8FF45] text-black shadow-glow-lime'
                  : 'text-[#9BAAC0] hover:text-[#F4F7FC] hover:bg-[#141F33]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Players</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all ${
                activeTab === 'history'
                  ? 'bg-[#C8FF45] text-black shadow-glow-lime'
                  : 'text-[#9BAAC0] hover:text-[#F4F7FC] hover:bg-[#141F33]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Auction History</span>
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
              className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-heading font-bold uppercase tracking-wider transition-all shadow-sm ${
                isChatOpen
                  ? 'bg-[#C8FF45] text-black border-[#C8FF45]'
                  : 'bg-[#141F33] hover:bg-[#1B2942] text-[#9BAAC0] hover:text-[#F4F7FC] border-[#26354D]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chat</span>
              {unreadChatCount > 0 && !isChatOpen && (
                <span className="bg-[#C8FF45] text-black text-[10px] font-number px-1.5 py-0.2 rounded-full animate-bounce">
                  {unreadChatCount}
                </span>
              )}
            </button>
          )}

          {roomCode && (
            <button
              onClick={handleCopyCode}
              title="Click to copy Room Code"
              className="flex items-center gap-1.5 bg-[#141F33] hover:bg-[#1B2942] text-[#C8FF45] border border-[#26354D] px-2.5 py-1.5 rounded-xl text-xs font-number transition-all shadow-sm"
            >
              {isPrivate && <Lock className="w-3 h-3 text-[#FFC857]" />}
              <span>{roomCode}</span>
              {copied ? <Check className="w-3.5 h-3.5 text-[#C8FF45]" /> : <Copy className="w-3.5 h-3.5 opacity-60" />}
            </button>
          )}

          {myMember && (
            <div className="flex items-center gap-1.5 bg-[#141F33] border border-[#26354D] px-2.5 py-1.5 rounded-xl">
              {myTeam ? (
                <TeamLogo teamId={myTeam.id} className="w-5 h-5" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-[#FFC857] animate-pulse" />
              )}
              <span className="text-xs font-semibold text-[#F4F7FC] max-w-[80px] truncate">
                {myMember.nickname}
              </span>
              {myMember.isHost && (
                <span className="text-[9px] bg-[#FFC857]/20 text-[#FFC857] font-heading font-extrabold px-1.5 rounded uppercase tracking-wider">
                  HOST
                </span>
              )}
            </div>
          )}

          <div className="flex items-center" title={connected ? 'Live Connected' : 'Connecting...'}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-[#C8FF45]' : 'bg-[#FF647C] animate-ping'}`} />
          </div>

          <button
            onClick={handleToggleSound}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            className="p-1.5 rounded-xl bg-[#141F33] hover:bg-[#1B2942] text-[#9BAAC0] hover:text-[#F4F7FC] border border-[#26354D] transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-[#FF647C]" /> : <Volume2 className="w-4 h-4 text-[#C8FF45]" />}
          </button>

          {roomCode && onLeaveRoom && (
            <button
              onClick={onLeaveRoom}
              title="Leave Room"
              className="p-1.5 rounded-xl bg-[#141F33] hover:bg-[#FF647C]/15 text-[#9BAAC0] hover:text-[#FF647C] border border-[#26354D] transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Tab Navigation Bar */}
      {roomCode && (
        <div className="flex md:hidden items-center justify-around mt-2 pt-2 border-t border-[#26354D] overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('auction')}
            className={`px-2.5 py-1 text-xs font-heading font-bold uppercase tracking-wider rounded-lg flex items-center gap-1 ${
              activeTab === 'auction' ? 'bg-[#C8FF45] text-black' : 'text-[#9BAAC0]'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>Auction</span>
          </button>
          <button
            onClick={() => setActiveTab('my-team')}
            className={`px-2.5 py-1 text-xs font-heading font-bold uppercase tracking-wider rounded-lg flex items-center gap-1 ${
              activeTab === 'my-team' ? 'bg-[#C8FF45] text-black' : 'text-[#9BAAC0]'
            }`}
          >
            <Shield className="w-3 h-3" />
            <span>My Team</span>
          </button>
          <button
            onClick={() => setActiveTab('all-teams')}
            className={`px-2.5 py-1 text-xs font-heading font-bold uppercase tracking-wider rounded-lg flex items-center gap-1 ${
              activeTab === 'all-teams' ? 'bg-[#C8FF45] text-black' : 'text-[#9BAAC0]'
            }`}
          >
            <Trophy className="w-3 h-3" />
            <span>Teams</span>
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={`px-2.5 py-1 text-xs font-heading font-bold uppercase tracking-wider rounded-lg flex items-center gap-1 ${
              activeTab === 'players' ? 'bg-[#C8FF45] text-black' : 'text-[#9BAAC0]'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>Players</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-2.5 py-1 text-xs font-heading font-bold uppercase tracking-wider rounded-lg flex items-center gap-1 ${
              activeTab === 'history' ? 'bg-[#C8FF45] text-black' : 'text-[#9BAAC0]'
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
