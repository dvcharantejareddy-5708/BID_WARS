import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar.js';
import { LandingPage } from './components/LandingPage.js';
import { OnboardingFlow } from './components/OnboardingFlow.js';
import { WaitingLobby } from './components/WaitingLobby.js';
import { AuctionArena } from './components/AuctionArena.js';
import { MyTeamView } from './components/MyTeamView.js';
import { AllTeamsView } from './components/AllTeamsView.js';
import { PlayersView } from './components/PlayersView.js';
import { AuctionHistoryView } from './components/AuctionHistoryView.js';
import { LiveChatPanel } from './components/LiveChatPanel.js';
import { AuctionResults } from './components/AuctionResults.js';
import { FinalTeamManagement } from './components/FinalTeamManagement.js';
import { SettingsModal } from './components/SettingsModal.js';
import { PasswordModal } from './components/PasswordModal.js';
import { TournamentDashboard } from './components/tournament/TournamentDashboard.js';
import { socketService } from './services/socket.js';
import { authService } from './services/auth.js';
import { 
  RoomState, 
  ServerMessage, 
  IPLTeamId, 
  RoomSettings, 
  BotStrategy,
  PlayerCategory,
  ChatMessage,
  TradeType,
  PlayingXISelection
} from './types.js';

export function App() {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [myMemberId, setMyMemberId] = useState<string>('');
  const [connected, setConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Flow State
  // 'landing' | 'onboarding' | 'in_room'
  const [view, setView] = useState<'landing' | 'onboarding' | 'in_room'>('landing');
  const [gameMode, setGameMode] = useState<'QUICK_AUCTION' | 'TOURNAMENT'>('QUICK_AUCTION');
  const [activeTab, setActiveTab] = useState<'auction' | 'my-team' | 'all-teams' | 'players' | 'history' | 'settings'>('auction');

  // Live Chat State
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Modals
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalRoomCode, setPasswordModalRoomCode] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Onboarding temporary state
  const [pendingRoomCode, setPendingRoomCode] = useState<string>('');
  const [pendingNickname, setPendingNickname] = useState<string>('');
  const [pendingPassword, setPendingPassword] = useState<string>('');

  // Safe response parser that guarantees clean error extraction even on non-JSON server responses
  const parseJsonResponse = async <T = any>(res: Response, defaultError: string): Promise<T> => {
    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      const cleanText = text.replace(/<[^>]+>/g, '').trim();
      const errorMsg = cleanText
        ? (cleanText.length > 150 ? cleanText.slice(0, 150) + '...' : cleanText)
        : `Server returned an error (${res.status} ${res.statusText})`;
      throw new Error(errorMsg);
    }

    if (!res.ok) {
      throw new Error(data?.error || data?.message || defaultError);
    }

    return data;
  };

  // Handle incoming server messages
  const handleServerMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'SYNC_STATE': {
        setRoomState({
          ...msg.state,
          chatMessages: msg.state.chatMessages || [],
          bidLog: msg.state.bidLog || []
        });
        setChatMessages(msg.state.chatMessages || []);
        const currentMemberId = msg.myMemberId || myMemberId;
        if (msg.myMemberId) {
          setMyMemberId(msg.myMemberId);
          // Persist session across refreshes and restarts
          sessionStorage.setItem('bid_wars_member_id', msg.myMemberId);
          sessionStorage.setItem('bid_wars_room_code', msg.state.roomCode);
          localStorage.setItem('bid_wars_member_id', msg.myMemberId);
          localStorage.setItem('bid_wars_room_code', msg.state.roomCode);
        }

        const myMem = msg.state.members[currentMemberId];
        if (myMem?.nickname) {
          localStorage.setItem('bid_wars_nickname', myMem.nickname);
        }

        // If user already has a team assigned, route to in_room; otherwise route to onboarding to select a franchise
        if (myMem?.teamId) {
          setView('in_room');
        } else {
          setView('onboarding');
        }
        break;
      }
      case 'CHAT_MESSAGE': {
        // High-performance isolated chat state: prevents re-rendering AuctionArena or full page on chat
        setChatMessages(prev => {
          if (prev.some(m => m.id === msg.message.id)) return prev;
          return [...prev, msg.message];
        });
        setIsChatOpen(open => {
          if (!open) {
            setUnreadChatCount(count => count + 1);
          }
          return open;
        });
        break;
      }
      case 'PASSWORD_REQUIRED': {
        setPasswordModalRoomCode(msg.roomCode);
        setShowPasswordModal(true);
        setPasswordError('This room is password-protected. Please enter the password.');
        break;
      }
      case 'PASSWORD_VERIFIED': {
        setShowPasswordModal(false);
        setPasswordError('');
        break;
      }
      case 'TIMER_TICK': {
        // High-performance: do not re-render entire page on sub-second server ticks
        // Only update if deadline timestamp has drifted significantly (> 1000ms)
        setRoomState(prev => {
          if (!prev) return prev;
          const drift = Math.abs((prev.deadlineTimestamp || 0) - msg.deadlineTimestamp);
          if (drift < 1000) {
            return prev;
          }
          return {
            ...prev,
            deadlineTimestamp: msg.deadlineTimestamp
          };
        });
        break;
      }
      case 'BID_PLACED': {
        setRoomState(prev => {
          if (!prev || !prev.currentLot) return prev;
          // Prevent duplicate bid records during reconnects or rapid events
          const exists = prev.currentLot.bids.some(b => b.bidId === msg.bid.bidId);
          const updatedBids = exists ? prev.currentLot.bids : [msg.bid, ...prev.currentLot.bids];
          const updatedLot = {
            ...prev.currentLot,
            currentBid: msg.bid.amount,
            currentBidder: msg.bid.teamId,
            currentBidderName: msg.bid.bidderName,
            bids: updatedBids
          };
          return {
            ...prev,
            currentLot: updatedLot,
            deadlineTimestamp: msg.deadlineTimestamp
          };
        });
        break;
      }
      case 'NEW_LOT': {
        setRoomState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            currentLot: msg.lot,
            currentResultId: null,
            currentLotIndex: msg.lot.lotNumber - 1,
            deadlineTimestamp: msg.deadlineTimestamp,
            announcementPhase: 'NONE',
            announcementLotNumber: undefined
          };
        });
        break;
      }
      case 'LOT_FINALIZED': {
        setRoomState(prev => {
          if (!prev) return prev;
          // Prevent duplicate history entries on repeated messages or reconnects
          const exists = prev.history.some(h => h.lotNumber === msg.lot.lotNumber);
          const updatedHistory = exists ? prev.history : [msg.lot, ...prev.history];
          return {
            ...prev,
            currentLot: msg.lot,
            currentResultId: msg.lot.resultId || `${msg.lot.lotNumber}_${msg.lot.status}_${Date.now()}`,
            teamPurse: msg.teamPurse,
            teamSquads: msg.teamSquads || prev.teamSquads,
            teamStats: msg.teamStats || prev.teamStats,
            history: updatedHistory,
            announcementPhase: 'ANNOUNCING',
            announcementLotNumber: msg.lot.lotNumber
          };
        });
        break;
      }
      case 'AUCTION_PAUSED': {
        setRoomState(prev => prev ? { ...prev, status: 'PAUSED' } : prev);
        break;
      }
      case 'AUCTION_RESUMED': {
        setRoomState(prev => prev ? { ...prev, status: 'AUCTION', deadlineTimestamp: msg.deadlineTimestamp } : prev);
        break;
      }
      case 'AUCTION_COMPLETED': {
        setRoomState(prev => prev ? { ...prev, status: 'COMPLETED' } : prev);
        break;
      }
      case 'TRADE_UPDATE': {
        setRoomState(prev => {
          if (!prev) return prev;
          const isPending = msg.trade.status === 'PENDING';
          const exists = (prev.tradeHistory || []).some(t => t.id === msg.trade.id);
          const updatedHistory = exists
            ? prev.tradeHistory.map(t => t.id === msg.trade.id ? msg.trade : t)
            : [msg.trade, ...(prev.tradeHistory || [])];
          return {
            ...prev,
            activeTrade: isPending ? msg.trade : null,
            pausedByTrade: isPending,
            status: isPending ? 'PAUSED' : prev.status,
            tradeHistory: updatedHistory
          };
        });
        break;
      }
      case 'KICKED': {
        setRoomState(null);
        setMyMemberId('');
        sessionStorage.removeItem('bid_wars_room_code');
        sessionStorage.removeItem('bid_wars_member_id');
        localStorage.removeItem('bid_wars_room_code');
        localStorage.removeItem('bid_wars_member_id');
        setErrorMessage(msg.message || 'You have been removed from the auction room by the host.');
        setView('landing');
        break;
      }
      case 'ERROR': {
        if (msg.code === 'INVALID_PASSWORD') {
          setPasswordError(msg.message);
        } else {
          setErrorMessage(msg.message);
          setTimeout(() => setErrorMessage(''), 4000);
        }
        break;
      }
    }
  }, [myMemberId]);

  // Subscribe to WebSocket messages
  useEffect(() => {
    const unsubscribe = socketService.subscribe(handleServerMessage);
    return () => unsubscribe();
  }, [handleServerMessage]);

  // URL query parameter check & Auto-Reconnect from saved session on page refresh
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');

    const savedRoom = localStorage.getItem('bid_wars_room_code') || sessionStorage.getItem('bid_wars_room_code');
    const savedMember = localStorage.getItem('bid_wars_member_id') || sessionStorage.getItem('bid_wars_member_id');
    const savedNick = localStorage.getItem('bid_wars_nickname') || 'Manager';
    const savedPass = localStorage.getItem('bid_wars_password') || undefined;

    const targetRoom = (roomParam ? roomParam.toUpperCase() : savedRoom) || '';

    if (targetRoom && savedMember && (!roomParam || roomParam.toUpperCase() === savedRoom)) {
      setIsLoading(true);
      setPendingRoomCode(targetRoom);
      setPendingNickname(savedNick);
      if (savedPass) setPendingPassword(savedPass);

      socketService.connect(targetRoom, savedNick, savedMember, savedPass)
        .then(() => {
          setConnected(true);
        })
        .catch(err => {
          console.warn('[AutoReconnect] Failed to reconnect to room:', err);
          if (err?.message?.includes('not found') || err?.message?.includes('expired')) {
            localStorage.removeItem('bid_wars_room_code');
            localStorage.removeItem('bid_wars_member_id');
            sessionStorage.removeItem('bid_wars_room_code');
            sessionStorage.removeItem('bid_wars_member_id');
          }
          if (roomParam) {
            setPendingRoomCode(roomParam.toUpperCase());
            setView('onboarding');
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (roomParam) {
      setPendingRoomCode(roomParam.toUpperCase());
      setView('onboarding');
    }
  }, []);

  // CREATE ROOM HANDLER
  const handleCreateRoom = async (nickname: string, settings: Partial<RoomSettings>) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const apiBase = (import.meta.env.VITE_API_URL as string) || '';
      const res = await fetch(`${apiBase}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostNickname: nickname, settings })
      });

      const data = await parseJsonResponse(res, 'Failed to create room');

      setMyMemberId(data.hostId);
      setRoomState(data.state);
      setPendingRoomCode(data.roomCode);
      setPendingNickname(nickname);
      if (settings?.password) {
        setPendingPassword(settings.password);
      }

      // Persist session tokens
      localStorage.setItem('bid_wars_member_id', data.hostId);
      localStorage.setItem('bid_wars_room_code', data.roomCode);
      localStorage.setItem('bid_wars_nickname', nickname);
      sessionStorage.setItem('bid_wars_member_id', data.hostId);
      sessionStorage.setItem('bid_wars_room_code', data.roomCode);
      if (settings?.password) {
        localStorage.setItem('bid_wars_password', settings.password);
      }

      // Connect WebSocket
      await socketService.connect(data.roomCode, nickname, data.hostId, settings?.password);
      setConnected(true);

      // Advance directly to franchise selection
      setView('onboarding');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error connecting to server');
    } finally {
      setIsLoading(false);
    }
  };

  // JOIN ROOM PROMPT HANDLER
  const handleJoinRoom = async (roomCode: string, providedPassword?: string) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const apiBase = (import.meta.env.VITE_API_URL as string) || '';
      const res = await fetch(`${apiBase}/api/rooms/${roomCode}`);
      const data = await parseJsonResponse(res, `Room "${roomCode}" not found`);

      setPendingRoomCode(roomCode);
      setRoomState(data.state);

      // If room is private, verify password
      if (data.state && data.state.isPrivate) {
        setPasswordModalRoomCode(roomCode);
        if (providedPassword) {
          // If password was already entered on Landing Page, verify via REST API
          const vRes = await fetch(`${apiBase}/api/rooms/${roomCode}/verify-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: providedPassword })
          });
          const vData = await parseJsonResponse(vRes, 'Incorrect room password');
          if (vData.verified) {
            setPendingPassword(providedPassword);
            setView('onboarding');
            return;
          }
        }

        // Open password modal if not provided or verification needed
        setShowPasswordModal(true);
        setIsLoading(false);
        return;
      }

      setView('onboarding');
    } catch (err: any) {
      setErrorMessage(err.message || 'Room not found');
    } finally {
      setIsLoading(false);
    }
  };

  // ONBOARDING SELECTION CONFIRM (Name & Franchise)
  const handleConfirmOnboarding = async (nickname: string, teamId: IPLTeamId) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      if (!socketService.isConnected()) {
        const savedMemberId = localStorage.getItem('bid_wars_member_id') || sessionStorage.getItem('bid_wars_member_id') || undefined;
        await socketService.connect(pendingRoomCode, nickname, savedMemberId, pendingPassword);
        setConnected(true);
      }

      localStorage.setItem('bid_wars_room_code', pendingRoomCode);
      localStorage.setItem('bid_wars_nickname', nickname);
      sessionStorage.setItem('bid_wars_room_code', pendingRoomCode);
      if (pendingPassword) {
        localStorage.setItem('bid_wars_password', pendingPassword);
      }

      // Send team selection
      socketService.send({
        type: 'SELECT_TEAM',
        teamId
      });

      setView('in_room');
      setActiveTab('auction');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to select franchise');
    } finally {
      setIsLoading(false);
    }
  };

  // TOURNAMENT AUCTION ENTRY HANDLER
  // Connects with permanent Supabase Auth UUID and In-Game Name, skipping OnboardingFlow
  const handleEnterTournamentAuction = async (roomCode: string) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const activeUser = authService.getUser();
      if (!activeUser || !activeUser.isGoogleUser) {
        setErrorMessage('You must sign in with Google to enter tournament auction.');
        return;
      }
      const userInGameName = activeUser.inGameName || activeUser.name || 'Manager';
      const userSessionToken = activeUser.id;

      const apiBase = (import.meta.env.VITE_API_URL as string) || '';
      const res = await fetch(`${apiBase}/api/rooms/${roomCode}`);
      const data = await parseJsonResponse(res, `Tournament auction room "${roomCode}" not found`);

      setPendingRoomCode(roomCode);
      setPendingNickname(userInGameName);
      setMyMemberId(userSessionToken);
      setRoomState(data.state);

      // Persist session tokens
      localStorage.setItem('bid_wars_member_id', userSessionToken);
      localStorage.setItem('bid_wars_room_code', roomCode);
      localStorage.setItem('bid_wars_nickname', userInGameName);
      sessionStorage.setItem('bid_wars_member_id', userSessionToken);
      sessionStorage.setItem('bid_wars_room_code', roomCode);

      // Connect WebSocket with user's permanent UUID and in-game name
      await socketService.connect(roomCode, userInGameName, userSessionToken);
      setConnected(true);

      // Directly enter auction arena (skipping onboarding because tournament already assigned franchise)
      setView('in_room');
      setActiveTab('auction');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to enter tournament auction');
    } finally {
      setIsLoading(false);
    }
  };

  // Socket action dispatchers
  const handleToggleReady = (isReady: boolean) => {
    socketService.send({ type: 'TOGGLE_READY', isReady });
  };

  const handleSelectTeam = (teamId: IPLTeamId) => {
    socketService.send({ type: 'SELECT_TEAM', teamId });
  };

  const handleStartAuction = () => {
    socketService.send({ type: 'START_AUCTION' });
  };

  const handlePlaceBid = (amount?: number) => {
    socketService.send({ type: 'PLACE_BID', amount });
  };

  const handleSkipPlayer = () => {
    socketService.send({ type: 'SKIP_PLAYER' });
  };

  const handleDrawRandomPlayer = (category?: PlayerCategory, basePriceInr?: number) => {
    socketService.send({ type: 'DRAW_RANDOM_PLAYER', category, basePriceInr });
  };

  const handlePasswordSubmit = async (password: string) => {
    setPasswordError('');
    try {
      const apiBase = (import.meta.env.VITE_API_URL as string) || '';
      const vRes = await fetch(`${apiBase}/api/rooms/${passwordModalRoomCode}/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const vData = await parseJsonResponse(vRes, 'Incorrect room password');
      if (vData.verified) {
        setShowPasswordModal(false);
        setPasswordError('');
        setPendingPassword(password);

        // Also notify via socket if connected
        if (socketService.isConnected()) {
          socketService.send({
            type: 'JOIN_ROOM',
            roomCode: passwordModalRoomCode,
            nickname: pendingNickname || 'Manager',
            password
          });
        }
        setView('onboarding');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Incorrect room password');
    }
  };

  const handlePauseAuction = () => {
    socketService.send({ type: 'PAUSE_AUCTION' });
  };

  const handleResumeAuction = () => {
    socketService.send({ type: 'RESUME_AUCTION' });
  };

  const handleRestartAuction = () => {
    socketService.send({ type: 'RESTART_AUCTION' });
  };

  const handleEndAuction = () => {
    socketService.send({ type: 'END_AUCTION' });
  };

  const handleBringAllUnsoldBack = () => {
    socketService.send({ type: 'BRING_ALL_UNSOLD_BACK' });
  };

  const handleRandomDrawUnsold = (count: number, playerIds?: string[]) => {
    socketService.send({ type: 'RANDOM_DRAW_UNSOLD', count, playerIds });
  };

  const handleSkipMultiplePlayers = (count: number) => {
    socketService.send({ type: 'SKIP_MULTIPLE_PLAYERS', count });
  };

  const handleKickMember = (targetMemberId: string) => {
    socketService.send({ type: 'KICK_MEMBER', targetMemberId });
  };

  const handleUpdateTimer = (timerDuration: number) => {
    socketService.send({ type: 'UPDATE_TIMER', timerDuration });
  };

  const handleUpdateSettings = (settings: any) => {
    socketService.send({ type: 'UPDATE_SETTINGS', settings });
  };

  const handleReAuctionSoldPlayer = (playerId: string) => {
    socketService.send({ type: 'REAUCTION_SOLD_PLAYER', playerId });
  };

  const handleReAuctionParticularPlayer = (playerId: string) => {
    socketService.send({ type: 'REAUCTION_PARTICULAR_PLAYER', playerId });
  };

  const handleReAuctionUnsold = () => {
    socketService.send({ type: 'REAUCTION_UNSOLD' });
  };

  const handleAdvanceLot = (lotIndex?: number, resultId?: string) => {
    socketService.send({ 
      type: 'ANNOUNCEMENT_COMPLETE', 
      lotIndex: lotIndex ?? (roomState?.currentLotIndex || 0),
      resultId: resultId ?? roomState?.currentResultId ?? roomState?.currentLot?.resultId
    });
  };

  const handleSendChatMessage = (text: string) => {
    socketService.send({ type: 'SEND_CHAT_MESSAGE', text });
  };

  const handleCreateTrade = (payload: {
    toTeamId: IPLTeamId;
    tradeType: TradeType;
    offeredPlayerId: string;
    requestedPlayerId?: string;
    moneyAmount?: number;
    cashPayer?: 'OFFERING_TEAM' | 'RECEIVING_TEAM';
  }) => {
    socketService.send({
      type: 'CREATE_TRADE_REQUEST',
      ...payload
    });
  };

  const handleRespondTrade = (tradeId: string, action: 'ACCEPT' | 'REJECT', rejectionReason?: string) => {
    socketService.send({
      type: 'RESPOND_TRADE_REQUEST',
      tradeId,
      action,
      rejectionReason
    });
  };

  const handleCancelTrade = (tradeId: string, reason?: string) => {
    socketService.send({
      type: 'CANCEL_TRADE_REQUEST',
      tradeId,
      reason
    });
  };

  const handleUpdateTradeTimer = (tradeTimerDuration: number) => {
    socketService.send({
      type: 'UPDATE_TRADE_TIMER',
      tradeTimerDuration
    });
  };

  const handleSavePlayingXI = (teamId: IPLTeamId, selection: Partial<PlayingXISelection>) => {
    socketService.send({
      type: 'SAVE_PLAYING_XI',
      teamId,
      selection
    });
  };

  const handleConfirmPlayingXI = (teamId: IPLTeamId) => {
    socketService.send({
      type: 'CONFIRM_PLAYING_XI',
      teamId
    });
  };

  const handleUnlockPlayingXI = (teamId: IPLTeamId) => {
    socketService.send({
      type: 'UNLOCK_PLAYING_XI',
      teamId
    });
  };

  const handleCloseTradeWindow = () => {
    socketService.send({
      type: 'CLOSE_POST_AUCTION_TRADE_WINDOW'
    });
  };

  const handleToggleChat = () => {
    setIsChatOpen(open => {
      if (!open) setUnreadChatCount(0);
      return !open;
    });
  };

  const handleLeaveRoom = () => {
    const isTournament = Boolean(roomState?.settings?.tournamentId);
    try {
      socketService.send({ type: 'LEAVE_ROOM' });
    } catch {}
    socketService.disconnect();
    localStorage.removeItem('bid_wars_member_id');
    localStorage.removeItem('bid_wars_room_code');
    localStorage.removeItem('bid_wars_nickname');
    localStorage.removeItem('bid_wars_password');
    sessionStorage.removeItem('bid_wars_member_id');
    sessionStorage.removeItem('bid_wars_room_code');
    setRoomState(null);
    setMyMemberId('');
    setView('landing');
    if (isTournament) {
      setGameMode('TOURNAMENT');
    }
  };

  const myMember = roomState?.members[myMemberId];
  const mySquadCount = myMember?.teamId && roomState ? (roomState.teamSquads[myMember.teamId] || []).length : 0;

  return (
    <div className="min-h-screen bg-[#0A0B14] text-[#F4F6FA] flex flex-col selection:bg-[#C8FF3D] selection:text-[#0A0B14]">
      {/* Top Navigation */}
      <Navbar
        roomCode={roomState?.roomCode}
        connected={connected || socketService.isConnected()}
        myMember={myMember}
        activeTab={activeTab}
        setActiveTab={(t) => {
          if (t === 'settings') {
            setShowSettingsModal(true);
          } else {
            setActiveTab(t);
          }
        }}
        onLeaveRoom={handleLeaveRoom}
        squadCount={mySquadCount}
        onToggleChat={handleToggleChat}
        isChatOpen={isChatOpen}
        unreadChatCount={unreadChatCount}
      />

      {/* Global Error Notification */}
      {errorMessage && (
        <div className="fixed top-16 right-4 z-50 bg-[#FF3B5C] text-white px-4 py-2.5 rounded-xl shadow-crimson-glow text-xs font-semibold flex items-center gap-2 border border-white/20">
          <span>⚠️ {errorMessage}</span>
        </div>
      )}

      {/* Main Content Views */}
      <main className="flex-1 relative">
        {/* VIEW 1: LANDING PAGE & TOURNAMENT DASHBOARD */}
        {view === 'landing' && gameMode === 'TOURNAMENT' && (
          <TournamentDashboard
            onSwitchToQuickAuction={() => setGameMode('QUICK_AUCTION')}
            onEnterAuctionRoom={(roomCode) => handleEnterTournamentAuction(roomCode)}
          />
        )}

        {view === 'landing' && gameMode === 'QUICK_AUCTION' && (
          <LandingPage
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onSwitchToTournament={() => setGameMode('TOURNAMENT')}
            isLoading={isLoading}
          />
        )}

        {/* VIEW 2: MANDATORY ONBOARDING (NAME & FRANCHISE SELECTION) */}
        {view === 'onboarding' && (
          <OnboardingFlow
            roomCode={pendingRoomCode}
            initialNickname={pendingNickname}
            members={roomState?.members || {}}
            myMemberId={myMemberId}
            isAuctionActive={roomState?.status === 'AUCTION' || roomState?.status === 'PAUSED'}
            onConfirmSelection={handleConfirmOnboarding}
            onBackToLanding={() => setView('landing')}
            isSubmitting={isLoading}
            errorMessage={errorMessage}
          />
        )}

        {/* VIEW 3: IN ROOM */}
        {view === 'in_room' && roomState && (
          <>
            {/* LOBBY STATE */}
            {roomState.status === 'LOBBY' && (
              <WaitingLobby
                roomState={roomState}
                myMemberId={myMemberId}
                onToggleReady={handleToggleReady}
                onSelectTeam={handleSelectTeam}
                onStartAuction={handleStartAuction}
                onChangeTeamClick={() => setView('onboarding')}
              />
            )}

            {/* AUCTION IN PROGRESS OR PAUSED */}
            {(roomState.status === 'AUCTION' || roomState.status === 'PAUSED') && (
              <>
                {activeTab === 'auction' && (
                  <AuctionArena
                    roomState={roomState}
                    myMemberId={myMemberId}
                    onPlaceBid={handlePlaceBid}
                    onSkipPlayer={handleSkipPlayer}
                    onDrawRandomPlayer={handleDrawRandomPlayer}
                    onPauseAuction={handlePauseAuction}
                    onResumeAuction={handleResumeAuction}
                    onRestartAuction={handleRestartAuction}
                    onEndAuction={handleEndAuction}
                    onAdvanceLot={handleAdvanceLot}
                    onBringAllUnsoldBack={handleBringAllUnsoldBack}
                    onRandomDrawUnsold={handleRandomDrawUnsold}
                    onSkipMultiplePlayers={handleSkipMultiplePlayers}
                    onKickMember={handleKickMember}
                    onUpdateTimer={handleUpdateTimer}
                    onUpdateSettings={handleUpdateSettings}
                    onReAuctionSoldPlayer={handleReAuctionSoldPlayer}
                    onReAuctionParticularPlayer={handleReAuctionParticularPlayer}
                    onCreateTrade={handleCreateTrade}
                    onRespondTrade={handleRespondTrade}
                    onCancelTrade={handleCancelTrade}
                    onUpdateTradeTimer={handleUpdateTradeTimer}
                  />
                )}

                {activeTab === 'my-team' && (
                  <MyTeamView
                    roomState={roomState}
                    myMemberId={myMemberId}
                  />
                )}

                {activeTab === 'all-teams' && (
                  <AllTeamsView
                    roomState={roomState}
                    myMemberId={myMemberId}
                  />
                )}

                {activeTab === 'players' && (
                  <PlayersView
                    roomState={roomState}
                    myMemberId={myMemberId}
                    onReAuctionSoldPlayer={handleReAuctionSoldPlayer}
                    onReAuctionParticularPlayer={handleReAuctionParticularPlayer}
                  />
                )}

                {activeTab === 'history' && (
                  <AuctionHistoryView
                    history={roomState.history}
                    season={roomState.settings.season}
                    roomCode={roomState.roomCode}
                  />
                )}
              </>
            )}

            {/* AUCTION COMPLETED — DEDICATED FINAL TEAM MANAGEMENT & PLAYING XI */}
            {roomState.status === 'COMPLETED' && (
              <FinalTeamManagement
                roomState={roomState}
                myMemberId={myMemberId}
                onCreateTrade={handleCreateTrade}
                onRespondTrade={handleRespondTrade}
                onCancelTrade={handleCancelTrade}
                onUpdateTradeTimer={handleUpdateTradeTimer}
                onSavePlayingXI={handleSavePlayingXI}
                onConfirmPlayingXI={handleConfirmPlayingXI}
                onUnlockPlayingXI={handleUnlockPlayingXI}
                onCloseTradeWindow={handleCloseTradeWindow}
                onReAuctionUnsold={handleReAuctionUnsold}
                onRestartAuction={handleRestartAuction}
              />
            )}

            {/* Live Real-Time Chat Drawer */}
            <LiveChatPanel
              isOpen={isChatOpen}
              onClose={() => setIsChatOpen(false)}
              messages={chatMessages}
              myMemberId={myMemberId}
              onSendMessage={handleSendChatMessage}
            />
          </>
        )}
      </main>

      {/* Modals */}
      <PasswordModal
        isOpen={showPasswordModal}
        roomCode={passwordModalRoomCode}
        onClose={() => setShowPasswordModal(false)}
        onSubmit={handlePasswordSubmit}
        error={passwordError}
      />

      {roomState && (
        <SettingsModal
          settings={roomState.settings}
          isHost={myMember?.isHost ?? false}
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </div>
  );
}

export default App;

