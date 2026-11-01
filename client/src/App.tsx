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
import { SettingsModal } from './components/SettingsModal.js';
import { PasswordModal } from './components/PasswordModal.js';
import { socketService } from './services/socket.js';
import { 
  RoomState, 
  ServerMessage, 
  IPLTeamId, 
  RoomSettings, 
  BotStrategy,
  PlayerCategory 
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
  const [activeTab, setActiveTab] = useState<'auction' | 'my-team' | 'all-teams' | 'players' | 'history' | 'settings'>('auction');

  // Live Chat State
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  // Modals
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalRoomCode, setPasswordModalRoomCode] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Onboarding temporary state
  const [pendingRoomCode, setPendingRoomCode] = useState<string>('');
  const [pendingNickname, setPendingNickname] = useState<string>('');

  // Handle incoming server messages
  const handleServerMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'SYNC_STATE': {
        setRoomState({
          ...msg.state,
          chatMessages: msg.state.chatMessages || []
        });
        if (msg.myMemberId) {
          setMyMemberId(msg.myMemberId);
          // Save session
          sessionStorage.setItem('bid_wars_member_id', msg.myMemberId);
          sessionStorage.setItem('bid_wars_room_code', msg.state.roomCode);
        }

        // If user already has a team assigned or auction has started, go to in_room
        const myMem = msg.state.members[msg.myMemberId || myMemberId];
        if (myMem?.teamId || msg.state.status !== 'LOBBY') {
          setView('in_room');
        }
        break;
      }
      case 'CHAT_MESSAGE': {
        setRoomState(prev => {
          if (!prev) return prev;
          const existing = prev.chatMessages || [];
          return {
            ...prev,
            chatMessages: [...existing, msg.message]
          };
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
        setRoomState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            remainingSeconds: msg.remainingSeconds,
            deadlineTimestamp: msg.deadlineTimestamp
          };
        });
        break;
      }
      case 'BID_PLACED': {
        setRoomState(prev => {
          if (!prev || !prev.currentLot) return prev;
          const updatedLot = {
            ...prev.currentLot,
            currentBid: msg.bid.amount,
            currentBidder: msg.bid.teamId,
            currentBidderName: msg.bid.bidderName,
            bids: [msg.bid, ...prev.currentLot.bids]
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
            currentLotIndex: msg.lot.lotNumber - 1,
            deadlineTimestamp: msg.deadlineTimestamp
          };
        });
        break;
      }
      case 'LOT_FINALIZED': {
        setRoomState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            currentLot: msg.lot,
            teamPurse: msg.teamPurse,
            teamSquads: msg.teamSquads || prev.teamSquads,
            teamStats: msg.teamStats || prev.teamStats,
            history: [msg.lot, ...prev.history]
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

  // URL query parameter check (for shared invite links)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
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

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create room');
      }

      setMyMemberId(data.hostId);
      setRoomState(data.state);
      setPendingRoomCode(data.roomCode);
      setPendingNickname(nickname);

      // Connect WebSocket
      await socketService.connect(data.roomCode, nickname, data.hostId);
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
  const handleJoinRoom = async (roomCode: string) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const apiBase = (import.meta.env.VITE_API_URL as string) || '';
      const res = await fetch(`${apiBase}/api/rooms/${roomCode}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Room not found');
      }

      setPendingRoomCode(roomCode);
      setRoomState(data.state);
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
        const savedMemberId = sessionStorage.getItem('bid_wars_member_id') || undefined;
        await socketService.connect(pendingRoomCode, nickname, savedMemberId);
        setConnected(true);
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

  const handleDrawRandomPlayer = (category: PlayerCategory, basePriceInr: number) => {
    socketService.send({ type: 'DRAW_RANDOM_PLAYER', category, basePriceInr });
  };

  const handlePasswordSubmit = (password: string) => {
    socketService.send({
      type: 'JOIN_ROOM',
      roomCode: passwordModalRoomCode,
      nickname: pendingNickname || 'Manager',
      password
    });
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

  const handleReAuctionUnsold = () => {
    socketService.send({ type: 'REAUCTION_UNSOLD' });
  };

  const handleAdvanceLot = (lotIndex?: number) => {
    socketService.send({ type: 'ADVANCE_LOT', lotIndex });
  };

  const handleSendChatMessage = (text: string) => {
    socketService.send({ type: 'SEND_CHAT_MESSAGE', text });
  };

  const handleToggleChat = () => {
    setIsChatOpen(open => {
      if (!open) setUnreadChatCount(0);
      return !open;
    });
  };

  const handleLeaveRoom = () => {
    socketService.disconnect();
    sessionStorage.removeItem('bid_wars_member_id');
    sessionStorage.removeItem('bid_wars_room_code');
    setRoomState(null);
    setMyMemberId('');
    setView('landing');
  };

  const myMember = roomState?.members[myMemberId];
  const mySquadCount = myMember?.teamId && roomState ? (roomState.teamSquads[myMember.teamId] || []).length : 0;

  return (
    <div className="min-h-screen bg-[#000000] text-slate-100 flex flex-col selection:bg-[#00E676] selection:text-black">
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
        <div className="fixed top-16 right-4 z-50 bg-ruby-500/90 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold animate-bounce flex items-center gap-2">
          <span>⚠️ {errorMessage}</span>
        </div>
      )}

      {/* Main Content Views */}
      <main className="flex-1 relative">
        {/* VIEW 1: LANDING PAGE */}
        {view === 'landing' && (
          <LandingPage
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
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

            {/* AUCTION COMPLETED */}
            {roomState.status === 'COMPLETED' && (
              <AuctionResults
                roomState={roomState}
                myMemberId={myMemberId}
                onReAuctionUnsold={handleReAuctionUnsold}
                onRestartAuction={handleRestartAuction}
              />
            )}

            {/* Live Real-Time Chat Drawer */}
            <LiveChatPanel
              isOpen={isChatOpen}
              onClose={() => setIsChatOpen(false)}
              messages={roomState.chatMessages || []}
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

