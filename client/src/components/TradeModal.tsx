import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ArrowLeftRight,
  Coins,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  Crown,
  History,
  Send,
  User,
  Users,
  Info,
  DollarSign,
  Flame,
  Globe2
} from 'lucide-react';
import { RoomState, IPLTeamId, Player, TradeRequest, TradeType, IPL_FRANCHISES } from '../types.js';
import { TeamLogo } from './TeamLogo.js';
import { OvrBadge } from './OvrBadge.js';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomState: RoomState;
  myMemberId: string | null;
  onCreateTrade: (payload: {
    toTeamId: IPLTeamId;
    tradeType: TradeType;
    offeredPlayerId: string;
    offeredPlayerIds?: string[];
    requestedPlayerId?: string;
    requestedPlayerIds?: string[];
    moneyAmount?: number;
    cashPayer?: 'OFFERING_TEAM' | 'RECEIVING_TEAM';
  }) => void;
  onRespondTrade: (tradeId: string, action: 'ACCEPT' | 'REJECT', rejectionReason?: string) => void;
  onCancelTrade: (tradeId: string, reason?: string) => void;
  onUpdateTradeTimer?: (durationSec: number) => void;
}

type TradeTab = 'propose' | 'active' | 'history' | 'settings';

export const TradeModal = React.memo<TradeModalProps>(({
  isOpen,
  onClose,
  roomState,
  myMemberId,
  onCreateTrade,
  onRespondTrade,
  onCancelTrade,
  onUpdateTradeTimer
}) => {
  const myMember = myMemberId ? roomState.members[myMemberId] : null;
  const myTeamId = myMember?.teamId || null;
  const isHost = Boolean(myMember?.isHost);

  // If there's an active trade, default to 'active' tab; otherwise 'propose'
  const [activeTab, setActiveTab] = useState<TradeTab>(
    roomState.activeTrade ? 'active' : 'propose'
  );

  // Switch to active tab if an active trade suddenly appears
  useEffect(() => {
    if (roomState.activeTrade) {
      setActiveTab('active');
    }
  }, [roomState.activeTrade?.id]);

  // Form states for Propose Trade
  const [selectedTargetTeam, setSelectedTargetTeam] = useState<IPLTeamId | null>(null);
  const [tradeType, setTradeType] = useState<TradeType>('PLAYER_FOR_PLAYER');
  const [selectedOfferedPlayerIds, setSelectedOfferedPlayerIds] = useState<string[]>([]);
  const [selectedRequestedPlayerIds, setSelectedRequestedPlayerIds] = useState<string[]>([]);
  const [cashPayer, setCashPayer] = useState<'OFFERING_TEAM' | 'RECEIVING_TEAM'>('OFFERING_TEAM');
  const [customMoneyInput, setCustomMoneyInput] = useState<string>('5');
  const [rejectReasonInput, setRejectReasonInput] = useState<string>('');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED'>('ALL');
  const [timerSettingInput, setTimerSettingInput] = useState<number>(roomState.settings.tradeTimerDuration || 45);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Format countdown as MM:SS (e.g. 00:45)
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Real-time countdown for active trade
  const [remainingTradeSec, setRemainingTradeSec] = useState<number>(0);

  useEffect(() => {
    if (!roomState.activeTrade) {
      setRemainingTradeSec(0);
      return;
    }
    const updateCountdown = () => {
      const remainingMs = Math.max(0, roomState.activeTrade!.expiresAt - Date.now());
      setRemainingTradeSec(Math.ceil(remainingMs / 1000));
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 500);
    return () => clearInterval(interval);
  }, [roomState.activeTrade?.expiresAt]);

  // My squad
  const mySquad = useMemo(() => {
    if (!myTeamId) return [];
    return roomState.teamSquads[myTeamId] || [];
  }, [myTeamId, roomState.teamSquads]);

  // Target team squad
  const targetSquad = useMemo(() => {
    if (!selectedTargetTeam) return [];
    return roomState.teamSquads[selectedTargetTeam] || [];
  }, [selectedTargetTeam, roomState.teamSquads]);

  // Available franchises to trade with (all other 9 franchises)
  const availableTargetTeams = useMemo(() => {
    const allTeams: IPLTeamId[] = ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'PBKS', 'DC', 'GT', 'LSG'];
    return allTeams.filter(t => t !== myTeamId);
  }, [myTeamId]);

  // Auto-select first target team if none selected
  useEffect(() => {
    if (!selectedTargetTeam && availableTargetTeams.length > 0) {
      setSelectedTargetTeam(availableTargetTeams[0]);
    }
  }, [availableTargetTeams, selectedTargetTeam]);

  // Auto-select first offered player if empty
  useEffect(() => {
    if (selectedOfferedPlayerIds.length === 0 && mySquad.length > 0) {
      setSelectedOfferedPlayerIds([mySquad[0].id]);
    }
  }, [mySquad, selectedOfferedPlayerIds.length]);

  // Auto-select first requested player when target squad changes and empty
  useEffect(() => {
    if (targetSquad.length > 0 && selectedRequestedPlayerIds.length === 0) {
      setSelectedRequestedPlayerIds([targetSquad[0].id]);
    } else if (targetSquad.length > 0 && selectedRequestedPlayerIds.length > 0) {
      // Filter out any IDs that no longer belong to target squad
      const validIds = selectedRequestedPlayerIds.filter(id => targetSquad.some(p => p.id === id));
      if (validIds.length === 0) {
        setSelectedRequestedPlayerIds([targetSquad[0].id]);
      } else if (validIds.length !== selectedRequestedPlayerIds.length) {
        setSelectedRequestedPlayerIds(validIds);
      }
    }
  }, [targetSquad, selectedTargetTeam]);

  // Toggle selection helpers
  const toggleOfferedPlayer = (playerId: string) => {
    setSelectedOfferedPlayerIds(prev => 
      prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    );
  };

  const removeOfferedPlayer = (playerId: string) => {
    setSelectedOfferedPlayerIds(prev => prev.filter(id => id !== playerId));
  };

  const toggleRequestedPlayer = (playerId: string) => {
    setSelectedRequestedPlayerIds(prev => 
      prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    );
  };

  const removeRequestedPlayer = (playerId: string) => {
    setSelectedRequestedPlayerIds(prev => prev.filter(id => id !== playerId));
  };

  // Offered players list
  const offeredPlayers = useMemo(() => {
    return mySquad.filter(p => selectedOfferedPlayerIds.includes(p.id));
  }, [mySquad, selectedOfferedPlayerIds]);

  // Requested players list
  const requestedPlayers = useMemo(() => {
    return targetSquad.filter(p => selectedRequestedPlayerIds.includes(p.id));
  }, [targetSquad, selectedRequestedPlayerIds]);

  // Backwards compatibility single player pointers
  const offeredPlayer = offeredPlayers[0] || null;
  const requestedPlayer = requestedPlayers[0] || null;

  // Convert Crores input to INR
  const moneyAmountInr = useMemo(() => {
    const parsed = parseFloat(customMoneyInput);
    if (isNaN(parsed) || parsed <= 0) return 0;
    return Math.round(parsed * 10000000);
  }, [customMoneyInput]);

  // Target team purse
  const targetPurse = selectedTargetTeam ? (roomState.teamPurse[selectedTargetTeam] || 0) : 0;
  const myPurse = myTeamId ? (roomState.teamPurse[myTeamId] || 0) : 0;

  // Valuation sums
  const offeredTotalValuation = useMemo(() => {
    return offeredPlayers.reduce((acc, p) => acc + (p.sold_price_inr || p.base_price_inr || 0), 0);
  }, [offeredPlayers]);

  const requestedTotalValuation = useMemo(() => {
    return requestedPlayers.reduce((acc, p) => acc + (p.sold_price_inr || p.base_price_inr || 0), 0);
  }, [requestedPlayers]);

  // Before & After calculations for Propose Tab
  const tradeValidation = useMemo(() => {
    if (!myTeamId) return { isValid: false, message: 'You must select a franchise to participate in trades.' };
    if (!selectedTargetTeam) return { isValid: false, message: 'Please select a target franchise.' };
    if (roomState.activeTrade) return { isValid: false, message: 'A trade proposal is already pending review across the room.' };
    if (offeredPlayers.length === 0) return { isValid: false, message: 'Please select at least one player to offer from your squad.' };

    // Prevent trading players currently up for auction
    const currentAuctionPlayerId = roomState.currentLot?.player?.id;
    if (currentAuctionPlayerId) {
      if (selectedOfferedPlayerIds.includes(currentAuctionPlayerId) || selectedRequestedPlayerIds.includes(currentAuctionPlayerId)) {
        return { isValid: false, message: 'Cannot trade a player currently active on the live auction block.' };
      }
    }

    const maxSquad = roomState.settings.maxSquad || 25;
    const isPlayerSwap = tradeType === 'PLAYER_FOR_PLAYER' || tradeType === 'PLAYER_PLUS_CASH';

    if (isPlayerSwap && requestedPlayers.length === 0) {
      return { isValid: false, message: 'Please select at least one player to request from the target franchise.' };
    }

    // Squad size calculation
    const mySquadCountAfter = mySquad.length - offeredPlayers.length + (isPlayerSwap ? requestedPlayers.length : 0);
    const targetSquadCountAfter = targetSquad.length - (isPlayerSwap ? requestedPlayers.length : 0) + offeredPlayers.length;

    if (mySquadCountAfter > maxSquad) {
      return { isValid: false, message: `Trade would cause your franchise to exceed the maximum squad size limit of ${maxSquad} players (${mySquadCountAfter}/${maxSquad}).` };
    }
    if (targetSquadCountAfter > maxSquad) {
      return { isValid: false, message: `Trade would cause ${IPL_FRANCHISES[selectedTargetTeam].name} to exceed the maximum squad size limit of ${maxSquad} players (${targetSquadCountAfter}/${maxSquad}).` };
    }

    // Overseas calculation
    const myRetainedOverseas = mySquad.filter(p => p.is_overseas && !selectedOfferedPlayerIds.includes(p.id)).length;
    const targetRetainedOverseas = targetSquad.filter(p => p.is_overseas && !selectedRequestedPlayerIds.includes(p.id)).length;

    const myNewOverseas = myRetainedOverseas + (isPlayerSwap ? requestedPlayers.filter(p => p.is_overseas).length : 0);
    const targetNewOverseas = targetRetainedOverseas + offeredPlayers.filter(p => p.is_overseas).length;

    if (myNewOverseas > 8) {
      return { isValid: false, message: `Trade would cause your franchise to exceed the 8 overseas player limit (${myNewOverseas}/8).` };
    }
    if (targetNewOverseas > 8) {
      return { isValid: false, message: `Trade would cause ${IPL_FRANCHISES[selectedTargetTeam].name} to exceed the 8 overseas player limit (${targetNewOverseas}/8).` };
    }

    // Purse calculations
    let myPurseAfter = myPurse;
    let targetPurseAfter = targetPurse;

    if (tradeType === 'PLAYER_PLUS_CASH') {
      if (moneyAmountInr <= 0) return { isValid: false, message: 'Trade cash amount must be greater than ₹0.' };

      if (cashPayer === 'OFFERING_TEAM') {
        if (myPurse < moneyAmountInr) {
          return { 
            isValid: false, 
            message: `Your franchise has insufficient purse (₹${(myPurse / 10000000).toFixed(2)} Cr) to offer ₹${(moneyAmountInr / 10000000).toFixed(2)} Cr cash.` 
          };
        }
        myPurseAfter = myPurse - moneyAmountInr;
        targetPurseAfter = targetPurse + moneyAmountInr;
      } else {
        if (targetPurse < moneyAmountInr) {
          return { 
            isValid: false, 
            message: `${IPL_FRANCHISES[selectedTargetTeam].name} has insufficient purse (₹${(targetPurse / 10000000).toFixed(2)} Cr) to pay requested ₹${(moneyAmountInr / 10000000).toFixed(2)} Cr cash.` 
          };
        }
        myPurseAfter = myPurse + moneyAmountInr;
        targetPurseAfter = targetPurse - moneyAmountInr;
      }
    } else if (tradeType === 'PLAYER_FOR_MONEY') {
      if (moneyAmountInr <= 0) return { isValid: false, message: 'Trade amount must be greater than ₹0.' };
      if (targetPurse < moneyAmountInr) {
        return { 
          isValid: false, 
          message: `${IPL_FRANCHISES[selectedTargetTeam].name} has insufficient purse (₹${(targetPurse / 10000000).toFixed(2)} Cr) to pay ₹${(moneyAmountInr / 10000000).toFixed(2)} Cr.` 
        };
      }
      myPurseAfter = myPurse + moneyAmountInr;
      targetPurseAfter = targetPurse - moneyAmountInr;
    }

    return {
      isValid: true,
      myOverseasAfter: myNewOverseas,
      targetOverseasAfter: targetNewOverseas,
      mySquadCountAfter,
      targetSquadCountAfter,
      myPurseAfter,
      targetPurseAfter
    };
  }, [
    myTeamId,
    selectedTargetTeam,
    roomState.activeTrade,
    roomState.currentLot,
    offeredPlayers,
    requestedPlayers,
    selectedOfferedPlayerIds,
    selectedRequestedPlayerIds,
    tradeType,
    cashPayer,
    mySquad,
    targetSquad,
    moneyAmountInr,
    targetPurse,
    myPurse,
    roomState.settings.maxSquad
  ]);

  if (!isOpen) return null;

  const handleSubmitTrade = () => {
    if (!tradeValidation.isValid || !selectedTargetTeam || offeredPlayers.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    const effectiveTradeType: TradeType = 
      tradeType === 'PLAYER_PLUS_CASH'
        ? 'PLAYER_PLUS_CASH'
        : tradeType === 'PLAYER_FOR_MONEY'
        ? 'PLAYER_FOR_MONEY'
        : (offeredPlayers.length > 1 || requestedPlayers.length > 1)
        ? 'MULTI_PLAYER'
        : 'PLAYER_FOR_PLAYER';

    onCreateTrade({
      toTeamId: selectedTargetTeam,
      tradeType: effectiveTradeType,
      offeredPlayerId: offeredPlayers[0]?.id || '',
      offeredPlayerIds: offeredPlayers.map(p => p.id),
      requestedPlayerId: (effectiveTradeType !== 'PLAYER_FOR_MONEY') ? requestedPlayers[0]?.id : undefined,
      requestedPlayerIds: (effectiveTradeType !== 'PLAYER_FOR_MONEY') ? requestedPlayers.map(p => p.id) : undefined,
      moneyAmount: (tradeType === 'PLAYER_FOR_MONEY' || tradeType === 'PLAYER_PLUS_CASH') ? moneyAmountInr : undefined,
      cashPayer: tradeType === 'PLAYER_PLUS_CASH' ? cashPayer : undefined
    });
    setTimeout(() => setIsSubmitting(false), 1500);
  };

  const activeTrade = roomState.activeTrade;
  const isIncomingTrade = activeTrade && activeTrade.toTeamId === myTeamId;
  const isOutgoingTrade = activeTrade && (activeTrade.fromTeamId === myTeamId || activeTrade.fromMemberId === myMemberId);

  // Filtered trade history
  const filteredHistory = (roomState.tradeHistory || []).filter(item => {
    if (historyFilter === 'ALL') return true;
    return item.status === historyFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn font-body">
      <div className="bg-[#12142A] border border-[#23274D] rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E2246] bg-[#0A0B14]/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#7C5CFF]/20 border border-[#7C5CFF]/40 flex items-center justify-center text-[#C8FF3D] shadow-[0_0_15px_rgba(124,92,255,0.3)]">
              <ArrowLeftRight className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-black text-lg text-white uppercase tracking-wider">
                  Live Player Trading
                </h2>
                {activeTrade && (
                  <span className="bg-[#FF3B5C]/20 border border-[#FF3B5C]/40 text-[#FF3B5C] text-[10px] font-heading font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B5C]" />
                    Review Active ({remainingTradeSec}s)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#8F9CAE]">
                Swap players or trade for purse credits in real time with fellow franchise managers.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#8F9CAE] hover:text-white hover:bg-[#1E2246] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-[#1E2246] bg-[#12142A] overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('propose')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-heading font-bold uppercase tracking-wider transition-all ${
              activeTab === 'propose'
                ? 'bg-[#C8FF3D] text-[#0A0B14] shadow-[0_0_15px_rgba(200,255,61,0.25)]'
                : 'text-[#8F9CAE] hover:text-white hover:bg-[#1E2246]'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Propose Trade</span>
          </button>

          <button
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-heading font-bold uppercase tracking-wider transition-all relative ${
              activeTab === 'active'
                ? 'bg-[#C8FF3D] text-[#0A0B14] shadow-[0_0_15px_rgba(200,255,61,0.25)]'
                : 'text-[#8F9CAE] hover:text-white hover:bg-[#1E2246]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Review</span>
            {activeTrade && (
              <span className="w-2 h-2 rounded-full bg-[#FF3B5C] animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-heading font-bold uppercase tracking-wider transition-all ${
              activeTab === 'history'
                ? 'bg-[#C8FF3D] text-[#0A0B14] shadow-[0_0_15px_rgba(200,255,61,0.25)]'
                : 'text-[#8F9CAE] hover:text-white hover:bg-[#1E2246]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History ({roomState.tradeHistory?.length || 0})</span>
          </button>

          {isHost && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-heading font-bold uppercase tracking-wider transition-all ml-auto ${
                activeTab === 'settings'
                  ? 'bg-[#FFC93D] text-[#0A0B14] shadow-[0_0_15px_rgba(255,201,61,0.25)]'
                  : 'text-[#FFC93D] hover:bg-[#FFC93D]/10'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Host Settings</span>
            </button>
          )}
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ======================================================== */}
          {/* TAB 1: PROPOSE TRADE                                    */}
          {/* ======================================================== */}
          {activeTab === 'propose' && (
            <div className="space-y-6 animate-fadeIn">
              {!myTeamId ? (
                <div className="bg-[#1E2246]/60 border border-[#FF3B5C]/40 p-6 rounded-2xl text-center space-y-2">
                  <ShieldAlert className="w-8 h-8 text-[#FF3B5C] mx-auto" />
                  <h3 className="font-heading font-bold text-white text-base">Franchise Required</h3>
                  <p className="text-xs text-[#8F9CAE]">You must select a franchise to participate in trading.</p>
                </div>
              ) : mySquad.length === 0 ? (
                <div className="bg-[#1E2246]/60 border border-[#FFC93D]/40 p-6 rounded-2xl text-center space-y-2">
                  <Coins className="w-8 h-8 text-[#FFC93D] mx-auto" />
                  <h3 className="font-heading font-bold text-white text-base">Squad Empty</h3>
                  <p className="text-xs text-[#8F9CAE]">You do not currently own any players to propose in a trade.</p>
                </div>
              ) : (
                <>
                  {/* Active trade blocking notice */}
                  {activeTrade && (
                    <div className="bg-[#FF3B5C]/15 border border-[#FF3B5C]/40 p-4 rounded-2xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-[#FF3B5C] shrink-0" />
                        <div>
                          <p className="text-xs font-heading font-bold text-white">Trade Currently Pending Review</p>
                          <p className="text-[11px] text-[#8F9CAE]">
                            Only one trade can be reviewed at a time. Please wait for the current trade to resolve.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('active')}
                        className="px-3 py-1.5 rounded-xl bg-[#FF3B5C] hover:bg-[#E02E4E] text-white font-heading font-bold text-xs uppercase"
                      >
                        View Active
                      </button>
                    </div>
                  )}

                  {/* 1. Target Franchise Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-heading font-extrabold text-[#C8FF3D] uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      <span>1. Select Target Franchise</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                      {availableTargetTeams.map(tId => {
                        const franch = IPL_FRANCHISES[tId];
                        const squad = roomState.teamSquads[tId] || [];
                        const purse = roomState.teamPurse[tId] || 0;
                        const isSelected = selectedTargetTeam === tId;

                        return (
                          <button
                            key={tId}
                            onClick={() => setSelectedTargetTeam(tId)}
                            className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 ${
                              isSelected
                                ? 'bg-[#7C5CFF]/25 border-[#C8FF3D] shadow-[0_0_15px_rgba(200,255,61,0.2)]'
                                : 'bg-[#0A0B14]/80 border-[#1E2246] hover:border-[#7C5CFF]/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <TeamLogo teamId={tId} className="w-6 h-6" />
                              <span className="font-heading font-black text-xs text-white">{tId}</span>
                            </div>
                            <div>
                              <p className="text-[11px] font-bold text-white truncate">{franch.name}</p>
                              <div className="flex items-center justify-between text-[10px] text-[#8F9CAE] mt-1 font-number">
                                <span>{squad.length} Players</span>
                                <span className="text-[#C8FF3D]">₹{(purse / 10000000).toFixed(1)} Cr</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Trade Type Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-heading font-extrabold text-[#C8FF3D] uppercase tracking-wider flex items-center gap-1.5">
                      <ArrowLeftRight className="w-4 h-4" />
                      <span>2. Choose Trade Type</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        onClick={() => setTradeType('PLAYER_FOR_PLAYER')}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                          tradeType === 'PLAYER_FOR_PLAYER'
                            ? 'bg-[#7C5CFF]/20 border-[#C8FF3D] shadow-[0_0_15px_rgba(200,255,61,0.2)]'
                            : 'bg-[#0A0B14]/60 border-[#1E2246] hover:bg-[#1E2246]/40'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-[#0A0B14] border border-[#C8FF3D]/30 flex items-center justify-center text-[#C8FF3D] shrink-0">
                          <ArrowLeftRight className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-heading font-black text-xs text-white truncate">Player for Player</p>
                          <p className="text-[10px] text-[#8F9CAE] truncate">Direct player swap.</p>
                        </div>
                      </button>

                      <button
                        onClick={() => setTradeType('PLAYER_FOR_MONEY')}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                          tradeType === 'PLAYER_FOR_MONEY'
                            ? 'bg-[#7C5CFF]/20 border-[#C8FF3D] shadow-[0_0_15px_rgba(200,255,61,0.2)]'
                            : 'bg-[#0A0B14]/60 border-[#1E2246] hover:bg-[#1E2246]/40'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-[#0A0B14] border border-[#FFC93D]/30 flex items-center justify-center text-[#FFC93D] shrink-0">
                          <Coins className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-heading font-black text-xs text-white truncate">Player for Money</p>
                          <p className="text-[10px] text-[#8F9CAE] truncate">Sell player for purse.</p>
                        </div>
                      </button>

                      <button
                        onClick={() => setTradeType('PLAYER_PLUS_CASH')}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                          tradeType === 'PLAYER_PLUS_CASH'
                            ? 'bg-[#7C5CFF]/20 border-[#C8FF3D] shadow-[0_0_15px_rgba(200,255,61,0.2)]'
                            : 'bg-[#0A0B14]/60 border-[#1E2246] hover:bg-[#1E2246]/40'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-[#0A0B14] border border-[#7C5CFF]/40 flex items-center justify-center text-[#C8FF3D] shrink-0">
                          <span className="font-number font-black text-xs text-[#C8FF3D]">+₹</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-heading font-black text-xs text-white truncate">Player + Cash</p>
                          <p className="text-[10px] text-[#8F9CAE] truncate">Swap player + cash.</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* 3. Asset Selection */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Left: Player(s) to Offer */}
                    <div className="bg-[#0A0B14]/80 border border-[#1E2246] p-4 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-[#1E2246]">
                        <div>
                          <span className="text-xs font-heading font-extrabold text-[#C8FF3D] uppercase tracking-wider">
                            You Offer ({selectedOfferedPlayerIds.length} Selected)
                          </span>
                          <p className="text-[10px] text-[#8F9CAE]">From your {myTeamId} franchise</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-[#8F9CAE] font-number block">{mySquad.length} Available</span>
                          <span className="text-xs font-number font-bold text-[#C8FF3D]">
                            Val: ₹{(offeredTotalValuation / 10000000).toFixed(2)} Cr
                          </span>
                        </div>
                      </div>

                      {/* Selected Offered Players Quick-Remove Chips */}
                      {offeredPlayers.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 p-2 bg-[#12142A]/80 border border-[#23274D] rounded-xl max-h-24 overflow-y-auto">
                          {offeredPlayers.map(p => (
                            <span
                              key={p.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#C8FF3D]/15 border border-[#C8FF3D]/40 text-[#C8FF3D] text-[11px] font-heading font-bold"
                            >
                              <span className="truncate max-w-[120px]">{p.name}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeOfferedPlayer(p.id);
                                }}
                                className="hover:text-white p-0.5 rounded focus:outline-none"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {mySquad.map(p => {
                          const isSelected = selectedOfferedPlayerIds.includes(p.id);
                          const isAuctioned = roomState.currentLot?.player?.id === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              disabled={isAuctioned}
                              onClick={() => toggleOfferedPlayer(p.id)}
                              className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                                isAuctioned
                                  ? 'bg-[#1E2246]/20 border-[#1E2246] opacity-50 cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-[#C8FF3D]/15 border-[#C8FF3D] text-white'
                                  : 'bg-[#12142A] border-[#1E2246] text-[#8F9CAE] hover:border-[#282E5C]'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                                  isSelected ? 'bg-[#C8FF3D] border-[#C8FF3D] text-[#0A0B14]' : 'border-[#62658A]'
                                }`}>
                                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-heading font-bold text-xs text-white truncate">{p.name}</p>
                                    <OvrBadge ovr={p.ovr} size="xs" />
                                    {isAuctioned && (
                                      <span className="text-[9px] bg-[#FF3B5C]/20 text-[#FF3B5C] px-1 rounded uppercase">Live Lot</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-[#8F9CAE]">
                                    <span>{p.category}</span>
                                    {p.is_overseas && (
                                      <span className="text-[#FFC93D] flex items-center gap-0.5">
                                        <Globe2 className="w-2.5 h-2.5" /> Overseas
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <span className="text-xs font-number font-bold text-[#C8FF3D] shrink-0">
                                {p.sold_price_inr ? `₹${(p.sold_price_inr / 10000000).toFixed(2)} Cr` : p.base_price_display}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right: Asset(s) to Receive */}
                    <div className="bg-[#0A0B14]/80 border border-[#1E2246] p-4 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-[#1E2246]">
                        <div>
                          <span className="text-xs font-heading font-extrabold text-[#7C5CFF] uppercase tracking-wider">
                            You Receive ({tradeType === 'PLAYER_FOR_MONEY' ? 'Cash' : `${selectedRequestedPlayerIds.length} Selected`})
                          </span>
                          <p className="text-[10px] text-[#8F9CAE]">From {selectedTargetTeam || 'Target'}</p>
                        </div>
                        {tradeType === 'PLAYER_FOR_MONEY' ? (
                          <div className="text-right">
                            <span className="text-[10px] text-[#C8FF3D] font-number block">
                              Purse: ₹{(targetPurse / 10000000).toFixed(2)} Cr
                            </span>
                          </div>
                        ) : (
                          <div className="text-right">
                            <span className="text-[10px] text-[#8F9CAE] font-number block">{targetSquad.length} Available</span>
                            <span className="text-xs font-number font-bold text-[#7C5CFF]">
                              Val: ₹{(requestedTotalValuation / 10000000).toFixed(2)} Cr
                            </span>
                          </div>
                        )}
                      </div>

                      {tradeType === 'PLAYER_FOR_PLAYER' || tradeType === 'PLAYER_PLUS_CASH' ? (
                        targetSquad.length === 0 ? (
                          <div className="text-center py-8 text-xs text-[#8F9CAE]">
                            Target franchise does not own any players to trade.
                          </div>
                        ) : (
                          <>
                            {/* Selected Requested Players Quick-Remove Chips */}
                            {requestedPlayers.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 p-2 bg-[#12142A]/80 border border-[#23274D] rounded-xl max-h-24 overflow-y-auto">
                                {requestedPlayers.map(p => (
                                  <span
                                    key={p.id}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#7C5CFF]/20 border border-[#7C5CFF]/40 text-[#7C5CFF] text-[11px] font-heading font-bold"
                                  >
                                    <span className="truncate max-w-[120px]">{p.name}</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeRequestedPlayer(p.id);
                                      }}
                                      className="hover:text-white p-0.5 rounded focus:outline-none"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                              {targetSquad.map(p => {
                                const isSelected = selectedRequestedPlayerIds.includes(p.id);
                                const isAuctioned = roomState.currentLot?.player?.id === p.id;
                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    disabled={isAuctioned}
                                    onClick={() => toggleRequestedPlayer(p.id)}
                                    className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                                      isAuctioned
                                        ? 'bg-[#1E2246]/20 border-[#1E2246] opacity-50 cursor-not-allowed'
                                        : isSelected
                                        ? 'bg-[#7C5CFF]/20 border-[#7C5CFF] text-white'
                                        : 'bg-[#12142A] border-[#1E2246] text-[#8F9CAE] hover:border-[#282E5C]'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                                        isSelected ? 'bg-[#7C5CFF] border-[#7C5CFF] text-white' : 'border-[#62658A]'
                                      }`}>
                                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <p className="font-heading font-bold text-xs text-white truncate">{p.name}</p>
                                          <OvrBadge ovr={p.ovr} size="xs" />
                                          {isAuctioned && (
                                            <span className="text-[9px] bg-[#FF3B5C]/20 text-[#FF3B5C] px-1 rounded uppercase">Live Lot</span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-[#8F9CAE]">
                                          <span>{p.category}</span>
                                          {p.is_overseas && (
                                            <span className="text-[#FFC93D] flex items-center gap-0.5">
                                              <Globe2 className="w-2.5 h-2.5" /> Overseas
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <span className="text-xs font-number font-bold text-[#7C5CFF] shrink-0">
                                      {p.sold_price_inr ? `₹${(p.sold_price_inr / 10000000).toFixed(2)} Cr` : p.base_price_display}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )
                      ) : (
                        <div className="space-y-3 pt-2">
                          <label className="text-[11px] text-[#8F9CAE]">Amount to charge (in ₹ Crores):</label>
                          <div className="flex items-center gap-2">
                            <span className="font-heading font-black text-white text-lg">₹</span>
                            <input
                              type="number"
                              min="0.2"
                              max="120"
                              step="0.5"
                              value={customMoneyInput}
                              onChange={e => setCustomMoneyInput(e.target.value)}
                              className="bg-[#12142A] border border-[#23274D] rounded-xl px-3 py-2 text-white font-number text-base font-bold w-full focus:outline-none focus:border-[#C8FF3D]"
                            />
                            <span className="font-heading font-bold text-white text-sm">Cr</span>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {[1, 2, 5, 10, 15, 20].map(amt => (
                              <button
                                key={amt}
                                type="button"
                                onClick={() => setCustomMoneyInput(String(amt))}
                                className="px-2.5 py-1 rounded-lg bg-[#12142A] hover:bg-[#1E2246] border border-[#23274D] text-[11px] font-number font-bold text-white"
                              >
                                +₹{amt} Cr
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cash Balancer for PLAYER_PLUS_CASH */}
                  {tradeType === 'PLAYER_PLUS_CASH' && (
                    <div className="bg-[#0A0B14]/90 border border-[#7C5CFF]/40 rounded-2xl p-4 space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between pb-2 border-b border-[#1E2246]">
                        <span className="text-xs font-heading font-extrabold text-[#FFC93D] uppercase tracking-wider flex items-center gap-1.5">
                          <Coins className="w-4 h-4 text-[#FFC93D]" />
                          <span>Cash Component Direction & Amount</span>
                        </span>
                        <span className="text-[10px] text-[#8F9CAE]">
                          My Purse: <strong className="text-[#C8FF3D]">₹{(myPurse / 10000000).toFixed(2)} Cr</strong> · Target Purse: <strong className="text-white">₹{(targetPurse / 10000000).toFixed(2)} Cr</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setCashPayer('OFFERING_TEAM')}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            cashPayer === 'OFFERING_TEAM'
                              ? 'bg-[#C8FF3D]/15 border-[#C8FF3D] text-white shadow-[0_0_10px_rgba(200,255,61,0.2)]'
                              : 'bg-[#12142A] border-[#1E2246] text-[#8F9CAE] hover:border-[#282E5C]'
                          }`}
                        >
                          <p className="font-heading font-black text-xs text-white">We Offer Cash (We Pay)</p>
                          <p className="text-[10px] text-[#8F9CAE] mt-0.5">
                            My franchise transfers {offeredPlayers.length} player(s) + ₹{customMoneyInput} Cr cash.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCashPayer('RECEIVING_TEAM')}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            cashPayer === 'RECEIVING_TEAM'
                              ? 'bg-[#7C5CFF]/20 border-[#7C5CFF] text-white shadow-[0_0_10px_rgba(124,92,255,0.2)]'
                              : 'bg-[#12142A] border-[#1E2246] text-[#8F9CAE] hover:border-[#282E5C]'
                          }`}
                        >
                          <p className="font-heading font-black text-xs text-white">We Request Cash (They Pay)</p>
                          <p className="text-[10px] text-[#8F9CAE] mt-0.5">
                            Target franchise transfers {requestedPlayers.length} player(s) + ₹{customMoneyInput} Cr cash.
                          </p>
                        </button>
                      </div>

                      <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                        <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                          <span className="font-heading font-black text-white text-base">₹</span>
                          <input
                            type="number"
                            min="0.2"
                            max="120"
                            step="0.5"
                            value={customMoneyInput}
                            onChange={e => setCustomMoneyInput(e.target.value)}
                            className="bg-[#12142A] border border-[#23274D] rounded-xl px-3 py-2 text-white font-number text-sm font-bold w-full focus:outline-none focus:border-[#C8FF3D]"
                          />
                          <span className="font-heading font-bold text-white text-xs">Cr</span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                          {[1, 2, 3, 5, 10].map(amt => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setCustomMoneyInput(String(amt))}
                              className="px-2.5 py-1 rounded-lg bg-[#12142A] hover:bg-[#1E2246] border border-[#23274D] text-[10px] font-number font-bold text-white"
                            >
                              +₹{amt} Cr
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 4. Live Impact Comparison Preview Card */}
                  <div className="bg-[#0A0B14] border border-[#23274D] rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#1E2246]">
                      <span className="text-xs font-heading font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-[#C8FF3D]" />
                        <span>Before & After Roster & Purse Impact Preview</span>
                      </span>
                      <div className="text-[11px] text-[#8F9CAE] font-number">
                        Total Value: Offered <strong className="text-[#C8FF3D]">₹{(offeredTotalValuation / 10000000).toFixed(2)} Cr</strong> vs Requested <strong className="text-[#7C5CFF]">₹{(requestedTotalValuation / 10000000).toFixed(2)} Cr</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Your Team Preview */}
                      <div className="p-3 rounded-xl bg-[#12142A] border border-[#1E2246] space-y-2">
                        <div className="flex items-center gap-2 font-heading font-black text-white">
                          <TeamLogo teamId={myTeamId} className="w-6 h-6" />
                          <span>Your Franchise ({myTeamId})</span>
                        </div>
                        <div className="space-y-1 text-[11px] text-[#8F9CAE]">
                          <div className="flex justify-between">
                            <span>Squad Size:</span>
                            <span className={`font-number font-bold ${(tradeValidation.mySquadCountAfter ?? 0) > 25 ? 'text-[#FF3B5C]' : 'text-white'}`}>
                              {mySquad.length} ➔ {tradeValidation.mySquadCountAfter ?? mySquad.length} / 25
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Overseas Players:</span>
                            <span className={`font-number font-bold ${(tradeValidation.myOverseasAfter ?? 0) > 8 ? 'text-[#FF3B5C]' : 'text-white'}`}>
                              {mySquad.filter(p => p.is_overseas).length}/8 ➔ {tradeValidation.myOverseasAfter ?? 0}/8
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Purse Balance:</span>
                            <span className={`font-number font-bold ${(tradeValidation.myPurseAfter ?? myPurse) < 0 ? 'text-[#FF3B5C]' : 'text-[#C8FF3D]'}`}>
                              ₹{(myPurse / 10000000).toFixed(2)} Cr ➔ ₹{((tradeValidation.myPurseAfter ?? myPurse) / 10000000).toFixed(2)} Cr
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Target Team Preview */}
                      <div className="p-3 rounded-xl bg-[#12142A] border border-[#1E2246] space-y-2">
                        <div className="flex items-center gap-2 font-heading font-black text-white">
                          {selectedTargetTeam && <TeamLogo teamId={selectedTargetTeam} className="w-6 h-6" />}
                          <span>Target Franchise ({selectedTargetTeam || '—'})</span>
                        </div>
                        <div className="space-y-1 text-[11px] text-[#8F9CAE]">
                          <div className="flex justify-between">
                            <span>Squad Size:</span>
                            <span className={`font-number font-bold ${(tradeValidation.targetSquadCountAfter ?? 0) > 25 ? 'text-[#FF3B5C]' : 'text-white'}`}>
                              {targetSquad.length} ➔ {tradeValidation.targetSquadCountAfter ?? targetSquad.length} / 25
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Overseas Players:</span>
                            <span className={`font-number font-bold ${(tradeValidation.targetOverseasAfter ?? 0) > 8 ? 'text-[#FF3B5C]' : 'text-white'}`}>
                              {targetSquad.filter(p => p.is_overseas).length}/8 ➔ {tradeValidation.targetOverseasAfter ?? 0}/8
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Purse Balance:</span>
                            <span className={`font-number font-bold ${(tradeValidation.targetPurseAfter ?? targetPurse) < 0 ? 'text-[#FF3B5C]' : 'text-[#C8FF3D]'}`}>
                              ₹{(targetPurse / 10000000).toFixed(2)} Cr ➔ ₹{((tradeValidation.targetPurseAfter ?? targetPurse) / 10000000).toFixed(2)} Cr
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {!tradeValidation.isValid && (
                      <div className="p-3 rounded-xl bg-[#FF3B5C]/15 border border-[#FF3B5C]/40 text-[#FF3B5C] text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{tradeValidation.message}</span>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      onClick={handleSubmitTrade}
                      disabled={!tradeValidation.isValid || Boolean(activeTrade)}
                      className={`w-full py-4 rounded-2xl font-heading font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg ${
                        tradeValidation.isValid && !activeTrade
                          ? 'bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] shadow-[0_0_20px_rgba(200,255,61,0.3)]'
                          : 'bg-[#1E2246] text-[#62658A] cursor-not-allowed border border-[#23274D]'
                      }`}
                    >
                      <Send className="w-4 h-4" />
                      <span>Propose Trade & Pause Live Auction</span>
                    </button>
                    <p className="text-[10px] text-center text-[#62658A] mt-2">
                      Submitting a valid trade request immediately halts the live auction clock for all participants until accepted, rejected, or expired.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: ACTIVE / PENDING TRADE                            */}
          {/* ======================================================== */}
          {activeTab === 'active' && (
            <div className="space-y-6 animate-fadeIn">
              {!activeTrade ? (
                <div className="text-center py-16 space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-[#0A0B14] border border-[#1E2246] flex items-center justify-center text-[#62658A] mx-auto">
                    <Clock className="w-8 h-8" />
                  </div>
                  <h3 className="font-heading font-bold text-white text-base uppercase tracking-wider">
                    No Trade Under Review
                  </h3>
                  <p className="text-xs text-[#8F9CAE] max-w-sm mx-auto">
                    There are currently no trade proposals awaiting a decision. The auction is running normally.
                  </p>
                  <button
                    onClick={() => setActiveTab('propose')}
                    className="mt-3 px-5 py-2.5 rounded-xl bg-[#C8FF3D] text-[#0A0B14] font-heading font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(200,255,61,0.25)]"
                  >
                    Propose a Trade
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Status Banner */}
                  <div className="bg-[#FF3B5C]/15 border border-[#FF3B5C]/40 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-[#FF3B5C] animate-ping" />
                      <div>
                        <h3 className="font-heading font-black text-sm text-white uppercase tracking-wider">
                          Trade Review In Progress — Live Auction Paused
                        </h3>
                        <p className="text-xs text-[#8F9CAE]">
                          {isIncomingTrade
                            ? 'Your franchise has received a trade proposal! Review terms and accept or decline.'
                            : isOutgoingTrade
                            ? 'Waiting for recipient franchise to accept or reject your proposal.'
                            : `Reviewing trade between ${activeTrade.fromTeamId} and ${activeTrade.toTeamId}.`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-[#0A0B14] px-4 py-2 rounded-xl border border-[#7C5CFF]/60 shadow-[0_0_12px_rgba(124,92,255,0.25)]">
                      <Clock className="w-4 h-4 text-[#C8FF3D] animate-pulse" />
                      <span className="font-heading font-black text-xs text-white uppercase tracking-wider">
                        TRADE REQUEST · <span className={`font-number font-extrabold text-sm ${remainingTradeSec <= 10 ? 'text-[#FF3B5C]' : 'text-[#C8FF3D]'}`}>{formatTimer(remainingTradeSec)}</span>
                      </span>
                    </div>
                  </div>

                  {/* Active Trade Details Card */}
                  <div className="bg-[#0A0B14] border border-[#23274D] rounded-2xl p-5 space-y-5 shadow-xl">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1E2246]">
                      <div className="flex items-center gap-2">
                        <span className="bg-[#7C5CFF]/20 text-[#7C5CFF] text-[10px] font-heading font-black px-2.5 py-1 rounded-lg border border-[#7C5CFF]/40 uppercase tracking-wider">
                          {activeTrade.type === 'PLAYER_FOR_PLAYER'
                            ? 'Player Exchange'
                            : activeTrade.type === 'PLAYER_PLUS_CASH'
                            ? 'Player + Cash'
                            : 'Player For Cash'}
                        </span>
                        <span className="text-xs text-[#8F9CAE]">
                          Proposed by <strong className="text-white">{activeTrade.fromMemberName}</strong> ({activeTrade.fromTeamId})
                        </span>
                      </div>
                      <span className="text-[10px] text-[#62658A] font-number">
                        ID: {activeTrade.id}
                      </span>
                    </div>

                    {/* Trade Exchange Representation */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                      {/* From Team Asset */}
                      <div className="bg-[#12142A] border border-[#1E2246] p-4 rounded-xl space-y-2">
                        <div className="flex items-center justify-between pb-1">
                          <div className="flex items-center gap-2">
                            <TeamLogo teamId={activeTrade.fromTeamId} className="w-6 h-6" />
                            <div>
                              <span className="font-heading font-black text-xs text-white">{activeTrade.fromTeamId}</span>
                              <p className="text-[10px] text-[#8F9CAE]">
                                {activeTrade.type === 'PLAYER_PLUS_CASH' && activeTrade.cashPayer === 'OFFERING_TEAM'
                                  ? `Transfers player(s) + ₹${((activeTrade.moneyAmount || 0) / 10000000).toFixed(2)} Cr cash:`
                                  : 'Transfers player(s):'}
                              </p>
                            </div>
                          </div>
                          {activeTrade.type === 'PLAYER_PLUS_CASH' && activeTrade.cashPayer === 'OFFERING_TEAM' && (
                            <span className="font-number font-extrabold text-[10px] text-[#C8FF3D] bg-[#C8FF3D]/10 px-2 py-0.5 rounded border border-[#C8FF3D]/30">
                              + ₹{((activeTrade.moneyAmount || 0) / 10000000).toFixed(2)} Cr Cash
                            </span>
                          )}
                        </div>

                        {/* List of offered players */}
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {((activeTrade.offeredPlayers && activeTrade.offeredPlayers.length > 0)
                            ? activeTrade.offeredPlayers
                            : (activeTrade.offeredPlayer ? [activeTrade.offeredPlayer] : [])
                          ).map(p => (
                            <div key={p.id} className="p-2.5 bg-[#0A0B14] rounded-lg border border-[#23274D] flex items-center justify-between">
                              <div>
                                <p className="font-heading font-black text-xs text-white">{p.name}</p>
                                <p className="text-[10px] text-[#8F9CAE]">{p.category} · {p.is_overseas ? 'Overseas' : 'Domestic'}</p>
                              </div>
                              <span className="font-number font-bold text-xs text-[#C8FF3D]">
                                {p.sold_price_inr ? `₹${(p.sold_price_inr / 10000000).toFixed(2)} Cr` : p.base_price_display}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* To Team Asset */}
                      <div className="bg-[#12142A] border border-[#1E2246] p-4 rounded-xl space-y-2">
                        <div className="flex items-center justify-between pb-1">
                          <div className="flex items-center gap-2">
                            <TeamLogo teamId={activeTrade.toTeamId} className="w-6 h-6" />
                            <div>
                              <span className="font-heading font-black text-xs text-white">{activeTrade.toTeamId}</span>
                              <p className="text-[10px] text-[#8F9CAE]">
                                {activeTrade.type === 'PLAYER_FOR_PLAYER' || activeTrade.type === 'MULTI_PLAYER'
                                  ? 'Transfers player(s):'
                                  : activeTrade.type === 'PLAYER_PLUS_CASH' && activeTrade.cashPayer === 'RECEIVING_TEAM'
                                  ? `Transfers player(s) + ₹${((activeTrade.moneyAmount || 0) / 10000000).toFixed(2)} Cr cash:`
                                  : activeTrade.type === 'PLAYER_PLUS_CASH'
                                  ? 'Transfers player(s):'
                                  : 'Transfers purse credits:'}
                              </p>
                            </div>
                          </div>
                          {activeTrade.type === 'PLAYER_PLUS_CASH' && activeTrade.cashPayer === 'RECEIVING_TEAM' && (
                            <span className="font-number font-extrabold text-[10px] text-[#FFC93D] bg-[#FFC93D]/10 px-2 py-0.5 rounded border border-[#FFC93D]/30">
                              + ₹{((activeTrade.moneyAmount || 0) / 10000000).toFixed(2)} Cr Cash
                            </span>
                          )}
                        </div>

                        {activeTrade.type === 'PLAYER_FOR_MONEY' ? (
                          <div className="p-3 bg-[#0A0B14] rounded-lg border border-[#23274D] flex items-center justify-between">
                            <div>
                              <p className="font-heading font-black text-sm text-white">Purse Payment</p>
                              <p className="text-[10px] text-[#8F9CAE]">Deducted from {activeTrade.toTeamId} balance</p>
                            </div>
                            <span className="font-number font-black text-base text-[#FFC93D]">
                              ₹{((activeTrade.moneyAmount || 0) / 10000000).toFixed(2)} Cr
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {((activeTrade.requestedPlayers && activeTrade.requestedPlayers.length > 0)
                              ? activeTrade.requestedPlayers
                              : (activeTrade.requestedPlayer ? [activeTrade.requestedPlayer] : [])
                            ).map(p => (
                              <div key={p.id} className="p-2.5 bg-[#0A0B14] rounded-lg border border-[#23274D] flex items-center justify-between">
                                <div>
                                  <p className="font-heading font-black text-xs text-white">{p.name}</p>
                                  <p className="text-[10px] text-[#8F9CAE]">{p.category} · {p.is_overseas ? 'Overseas' : 'Domestic'}</p>
                                </div>
                                <span className="font-number font-bold text-xs text-[#7C5CFF]">
                                  {p.sold_price_inr ? `₹${(p.sold_price_inr / 10000000).toFixed(2)} Cr` : p.base_price_display}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="pt-3 border-t border-[#1E2246] flex flex-wrap items-center justify-end gap-3">
                      {isIncomingTrade && (
                        <>
                          <input
                            type="text"
                            placeholder="Optional rejection reason..."
                            value={rejectReasonInput}
                            onChange={e => setRejectReasonInput(e.target.value)}
                            className="bg-[#12142A] border border-[#23274D] rounded-xl px-3 py-2 text-xs text-white w-full sm:w-64 focus:outline-none focus:border-[#FF3B5C]"
                          />
                          <button
                            onClick={() => {
                              if (isSubmitting) return;
                              setIsSubmitting(true);
                              onRespondTrade(activeTrade.id, 'REJECT', rejectReasonInput);
                              setTimeout(() => setIsSubmitting(false), 1500);
                            }}
                            disabled={isSubmitting}
                            className="px-5 py-2.5 rounded-xl bg-[#FF3B5C]/20 hover:bg-[#FF3B5C] border border-[#FF3B5C]/40 text-white font-heading font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                          >
                            Reject Trade
                          </button>
                          <button
                            onClick={() => {
                              if (isSubmitting) return;
                              setIsSubmitting(true);
                              onRespondTrade(activeTrade.id, 'ACCEPT');
                              setTimeout(() => setIsSubmitting(false), 1500);
                            }}
                            disabled={isSubmitting}
                            className="px-6 py-2.5 rounded-xl bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] font-heading font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(200,255,61,0.3)] disabled:opacity-50"
                          >
                            Accept Trade
                          </button>
                        </>
                      )}

                      {isOutgoingTrade && !isIncomingTrade && (
                        <button
                          onClick={() => {
                            if (isSubmitting) return;
                            setIsSubmitting(true);
                            onCancelTrade(activeTrade.id, 'Cancelled by initiator');
                            setTimeout(() => setIsSubmitting(false), 1500);
                          }}
                          disabled={isSubmitting}
                          className="px-5 py-2.5 rounded-xl bg-[#FF3B5C]/20 hover:bg-[#FF3B5C] border border-[#FF3B5C]/40 text-white font-heading font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                        >
                          Cancel Trade Proposal
                        </button>
                      )}

                      {isHost && !isIncomingTrade && (
                        <button
                          onClick={() => {
                            if (isSubmitting) return;
                            setIsSubmitting(true);
                            onCancelTrade(activeTrade.id, 'Cancelled by Top Host');
                            setTimeout(() => setIsSubmitting(false), 1500);
                          }}
                          disabled={isSubmitting}
                          className="px-4 py-2 rounded-xl bg-[#FFC93D]/20 hover:bg-[#FFC93D] hover:text-[#0A0B14] border border-[#FFC93D]/40 text-[#FFC93D] font-heading font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                        >
                          Host Force Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: TRADE HISTORY                                    */}
          {/* ======================================================== */}
          {activeTab === 'history' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                {(['ALL', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED'] as const).map(flt => (
                  <button
                    key={flt}
                    onClick={() => setHistoryFilter(flt)}
                    className={`px-3 py-1.5 rounded-xl font-heading font-bold text-xs uppercase transition-all ${
                      historyFilter === flt
                        ? 'bg-[#C8FF3D] text-[#0A0B14]'
                        : 'bg-[#0A0B14] border border-[#1E2246] text-[#8F9CAE] hover:text-white'
                    }`}
                  >
                    {flt}
                  </button>
                ))}
              </div>

              {filteredHistory.length === 0 ? (
                <div className="text-center py-12 text-xs text-[#8F9CAE]">
                  No trade history records matching filter.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {filteredHistory.map(tr => {
                    const isAccepted = tr.status === 'ACCEPTED';
                    const isRejected = tr.status === 'REJECTED';
                    const isCancelled = tr.status === 'CANCELLED';
                    const isExpired = tr.status === 'EXPIRED';

                    return (
                      <div
                        key={tr.id}
                        className="bg-[#0A0B14] border border-[#1E2246] p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-heading font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                isAccepted
                                  ? 'bg-[#C8FF3D]/20 text-[#C8FF3D] border border-[#C8FF3D]/40'
                                  : isRejected
                                  ? 'bg-[#FF3B5C]/20 text-[#FF3B5C] border border-[#FF3B5C]/40'
                                  : isCancelled
                                  ? 'bg-[#62658A]/20 text-[#8F9CAE] border border-[#62658A]/40'
                                  : 'bg-[#FFC93D]/20 text-[#FFC93D] border border-[#FFC93D]/40'
                              }`}
                            >
                              {tr.status}
                            </span>
                            <span className="font-heading font-bold text-white">
                              {tr.fromTeamId} ➔ {tr.toTeamId}
                            </span>
                            <span className="text-[#62658A]">·</span>
                            <span className="text-[11px] text-[#8F9CAE]">
                              {tr.type === 'PLAYER_FOR_PLAYER' || tr.type === 'MULTI_PLAYER'
                                ? 'Player Swap'
                                : tr.type === 'PLAYER_PLUS_CASH'
                                ? 'Player + Cash'
                                : 'Cash Sale'}
                            </span>
                          </div>

                          {(() => {
                            const offeredNames = (tr.offeredPlayers && tr.offeredPlayers.length > 0)
                              ? tr.offeredPlayers.map(p => p.name).join(', ')
                              : (tr.offeredPlayer?.name || 'Player');
                            const requestedNames = (tr.requestedPlayers && tr.requestedPlayers.length > 0)
                              ? tr.requestedPlayers.map(p => p.name).join(', ')
                              : (tr.requestedPlayer?.name || 'Player');

                            return (
                              <p className="text-[11px] text-[#C8FF3D]">
                                {tr.type === 'PLAYER_FOR_PLAYER' || tr.type === 'MULTI_PLAYER'
                                  ? `${offeredNames} ⮂ ${requestedNames}`
                                  : tr.type === 'PLAYER_PLUS_CASH'
                                  ? `${offeredNames} ⮂ ${requestedNames} (+ ₹${((tr.moneyAmount || 0) / 10000000).toFixed(2)} Cr ${tr.cashPayer === 'OFFERING_TEAM' ? tr.fromTeamId : tr.toTeamId})`
                                  : `${offeredNames} for ₹${((tr.moneyAmount || 0) / 10000000).toFixed(2)} Cr`}
                              </p>
                            );
                          })()}

                          {tr.rejectionReason && (
                            <p className="text-[10px] text-[#8F9CAE] italic">
                              Note: {tr.rejectionReason}
                            </p>
                          )}
                        </div>

                        <div className="text-right text-[10px] text-[#62658A] font-number shrink-0">
                          {tr.resolvedAt ? new Date(tr.resolvedAt).toLocaleTimeString() : new Date(tr.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: HOST SETTINGS (HOST ONLY)                        */}
          {/* ======================================================== */}
          {activeTab === 'settings' && isHost && (
            <div className="space-y-5 animate-fadeIn max-w-lg mx-auto">
              <div className="bg-[#0A0B14] border border-[#FFC93D]/30 p-5 rounded-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-[#FFC93D]" />
                  <h3 className="font-heading font-black text-sm text-white uppercase tracking-wider">
                    Trade Decision Timer Configuration
                  </h3>
                </div>
                <p className="text-xs text-[#8F9CAE]">
                  Configure the authoritative server timer allocated to franchise managers to accept or reject pending trade requests. If the timer expires, the trade is automatically cancelled and the live auction resumes.
                </p>

                <div className="space-y-2">
                  <label className="text-xs font-heading font-bold text-white">Duration (Seconds):</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[15, 30, 45, 60, 90, 120].map(sec => (
                      <button
                        key={sec}
                        onClick={() => setTimerSettingInput(sec)}
                        className={`py-2 rounded-xl font-number font-bold text-xs uppercase border transition-all ${
                          timerSettingInput === sec
                            ? 'bg-[#FFC93D] text-[#0A0B14] border-[#FFC93D] shadow-[0_0_10px_rgba(255,201,61,0.3)]'
                            : 'bg-[#12142A] border-[#1E2246] text-white hover:border-[#FFC93D]/50'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => onUpdateTradeTimer && onUpdateTradeTimer(timerSettingInput)}
                  className="w-full py-3 rounded-xl bg-[#FFC93D] hover:bg-[#F3B724] text-[#0A0B14] font-heading font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(255,201,61,0.25)]"
                >
                  Save Trade Timer Duration
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
});
