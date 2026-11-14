import React, { useState, useMemo, useEffect } from 'react';
import {
  Shield,
  Crown,
  Star,
  Zap,
  CheckCircle2,
  Lock,
  Unlock,
  AlertTriangle,
  Globe2,
  Users,
  UserCheck,
  X,
  Save,
  Check,
  Sparkles,
  Flame,
  Award
} from 'lucide-react';
import { Player, IPLTeamId, IPL_FRANCHISES, PlayingXISelection } from '../types.js';
import { TeamLogo } from './TeamLogo.js';

interface PlayingXISelectorProps {
  teamId: IPLTeamId;
  squad: Player[];
  selection?: PlayingXISelection;
  isMyTeam: boolean;
  isHost: boolean;
  isWindowClosed?: boolean;
  onSaveDraft: (selection: Partial<PlayingXISelection>) => void;
  onConfirmTeam: () => void;
  onUnlockTeam: () => void;
  onClose?: () => void;
}

export const PlayingXISelector: React.FC<PlayingXISelectorProps> = ({
  teamId,
  squad,
  selection,
  isMyTeam,
  isHost,
  isWindowClosed = false,
  onSaveDraft,
  onConfirmTeam,
  onUnlockTeam,
  onClose
}) => {
  const teamInfo = IPL_FRANCHISES[teamId];
  const canEdit = (isMyTeam || isHost) && !isWindowClosed && !selection?.isConfirmed;

  // Local working state
  const [selectedIds, setSelectedIds] = useState<string[]>(selection?.playingXIIds || []);
  const [captainId, setCaptainId] = useState<string | null>(selection?.captainId || null);
  const [viceCaptainId, setViceCaptainId] = useState<string | null>(selection?.viceCaptainId || null);
  const [impactPlayerId, setImpactPlayerId] = useState<string | null>(selection?.impactPlayerId || null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Sync from props
  useEffect(() => {
    if (selection) {
      setSelectedIds(selection.playingXIIds || []);
      setCaptainId(selection.captainId || null);
      setViceCaptainId(selection.viceCaptainId || null);
      setImpactPlayerId(selection.impactPlayerId || null);
    }
  }, [selection?.confirmedAt, selection?.isConfirmed, selection?.playingXIIds]);

  const squadMap = useMemo(() => new Map(squad.map(p => [p.id, p])), [squad]);

  // Selected players
  const startingXIPlayers = useMemo(() => {
    return selectedIds.map(id => squadMap.get(id)).filter(Boolean) as Player[];
  }, [selectedIds, squadMap]);

  // Bench players (not in starting 11)
  const benchPlayers = useMemo(() => {
    return squad.filter(p => !selectedIds.includes(p.id));
  }, [squad, selectedIds]);

  // Overseas count in starting 11
  const overseasCountInXI = useMemo(() => {
    return startingXIPlayers.filter(p => p.is_overseas).length;
  }, [startingXIPlayers]);

  // Role distribution in starting 11
  const roleBreakdown = useMemo(() => {
    const batters = startingXIPlayers.filter(p => p.category === 'Batsmen').length;
    const allRounders = startingXIPlayers.filter(p => p.category === 'All-rounders').length;
    const bowlers = startingXIPlayers.filter(p => p.category === 'Bowlers').length;
    const wks = startingXIPlayers.filter(p => p.is_wicketkeeper).length;
    return { batters, allRounders, bowlers, wks };
  }, [startingXIPlayers]);

  // Validation
  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    if (squad.length < 11) {
      errs.push(`Squad has only ${squad.length} players. At least 11 required.`);
    }
    if (selectedIds.length !== 11) {
      errs.push(`Select exactly 11 starting players (${selectedIds.length}/11 selected).`);
    }
    if (overseasCountInXI > 4) {
      errs.push(`Maximum 4 overseas players allowed in Playing XI (${overseasCountInXI}/4 selected).`);
    }
    if (!captainId) {
      errs.push('Select a Captain from your Playing XI.');
    } else if (!selectedIds.includes(captainId)) {
      errs.push('Captain must be one of the 11 starting players.');
    }
    if (!viceCaptainId) {
      errs.push('Select a Vice-Captain from your Playing XI.');
    } else if (!selectedIds.includes(viceCaptainId)) {
      errs.push('Vice-Captain must be one of the 11 starting players.');
    } else if (viceCaptainId === captainId) {
      errs.push('Captain and Vice-Captain cannot be the same player.');
    }
    if (squad.length > 11) {
      if (!impactPlayerId) {
        errs.push('Select an Impact Player from your bench.');
      } else if (selectedIds.includes(impactPlayerId)) {
        errs.push('Impact Player must be from the bench (outside the starting 11).');
      }
    }
    return errs;
  }, [squad.length, selectedIds, overseasCountInXI, captainId, viceCaptainId, impactPlayerId]);

  const isValidForConfirmation = validationErrors.length === 0;

  // Toggle player in/out of starting XI
  const handleTogglePlayer = (player: Player) => {
    if (!canEdit) return;

    if (selectedIds.includes(player.id)) {
      // Remove
      const next = selectedIds.filter(id => id !== player.id);
      setSelectedIds(next);
      if (captainId === player.id) setCaptainId(null);
      if (viceCaptainId === player.id) setViceCaptainId(null);
    } else {
      // Add
      if (selectedIds.length >= 11) {
        showFeedback('Playing XI already has 11 players. Remove a player first.');
        return;
      }
      if (player.is_overseas && overseasCountInXI >= 4) {
        showFeedback('Cannot add overseas player: Maximum 4 overseas limit reached.');
        return;
      }
      const next = [...selectedIds, player.id];
      setSelectedIds(next);
      // If was selected as impact player, remove from impact player
      if (impactPlayerId === player.id) {
        setImpactPlayerId(null);
      }
    }
  };

  const showFeedback = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleSaveDraft = () => {
    onSaveDraft({
      playingXIIds: selectedIds,
      captainId,
      viceCaptainId,
      impactPlayerId
    });
    showFeedback('Playing XI draft saved to server!');
  };

  const handleConfirmSubmit = () => {
    if (!isValidForConfirmation) return;
    onSaveDraft({
      playingXIIds: selectedIds,
      captainId,
      viceCaptainId,
      impactPlayerId
    });
    onConfirmTeam();
    setShowConfirmModal(false);
  };

  // Filtered squad list
  const filteredSquad = useMemo(() => {
    if (activeCategoryFilter === 'ALL') return squad;
    if (activeCategoryFilter === 'OVERSEAS') return squad.filter(p => p.is_overseas);
    if (activeCategoryFilter === 'WK') return squad.filter(p => p.is_wicketkeeper);
    return squad.filter(p => p.category === activeCategoryFilter);
  }, [squad, activeCategoryFilter]);

  return (
    <div className="bg-[#12142A] border border-[#23274D] rounded-3xl overflow-hidden shadow-2xl font-body relative">
      {/* Toast Notification */}
      {saveToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#C8FF3D] text-[#0A0B14] font-heading font-black text-xs uppercase tracking-wider px-4 py-2 rounded-xl shadow-[0_0_20px_rgba(200,255,61,0.4)] animate-fadeIn">
          {saveToast}
        </div>
      )}

      {/* HEADER BAR */}
      <div className="px-6 py-4 bg-[#0A0B14]/90 border-b border-[#1E2246] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TeamLogo teamId={teamId} className="w-10 h-10" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-black text-lg text-white uppercase tracking-wider">
                {teamInfo.name} · Official Playing XI
              </h2>
              {selection?.isConfirmed ? (
                <span className="bg-[#C8FF3D]/20 border border-[#C8FF3D]/50 text-[#C8FF3D] text-[10px] font-heading font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
                  <Lock className="w-3 h-3" />
                  CONFIRMED & LOCKED
                </span>
              ) : (
                <span className="bg-[#FFC93D]/20 border border-[#FFC93D]/50 text-[#FFC93D] text-[10px] font-heading font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
                  <Unlock className="w-3 h-3" />
                  SELECTION IN PROGRESS
                </span>
              )}
            </div>
            <p className="text-xs text-[#8F9CAE]">
              Select 11 starters (max 4 overseas), Captain (C), Vice-Captain (VC), and Impact Player (IP).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selection?.isConfirmed && canEdit && (
            <button
              onClick={onUnlockTeam}
              className="px-3.5 py-1.5 rounded-xl bg-[#1E2246] hover:bg-[#282E5C] text-[#8F9CAE] hover:text-white text-xs font-heading font-bold flex items-center gap-1.5 transition-all"
            >
              <Unlock className="w-3.5 h-3.5 text-[#FFC93D]" />
              Unlock for Edits
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#8F9CAE] hover:text-white hover:bg-[#1E2246] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* METRIC BADGES & STATUS STRIP */}
      <div className="px-6 py-3 bg-[#0E1020] border-b border-[#1E2246] grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs">
        {/* Starters counter */}
        <div className="p-2.5 rounded-xl bg-[#12142A] border border-[#1E2246] text-center">
          <span className="text-[10px] text-[#8F9CAE] uppercase font-heading font-bold block">Starters</span>
          <span className={`font-number font-black text-sm ${selectedIds.length === 11 ? 'text-[#C8FF3D]' : 'text-white'}`}>
            {selectedIds.length} / 11
          </span>
        </div>

        {/* Overseas in XI */}
        <div className="p-2.5 rounded-xl bg-[#12142A] border border-[#1E2246] text-center">
          <span className="text-[10px] text-[#8F9CAE] uppercase font-heading font-bold block">Overseas in XI</span>
          <span className={`font-number font-black text-sm ${overseasCountInXI > 4 ? 'text-[#FF3B5C]' : 'text-[#FFC93D]'}`}>
            {overseasCountInXI} / 4 Max
          </span>
        </div>

        {/* Batters */}
        <div className="p-2.5 rounded-xl bg-[#12142A] border border-[#1E2246] text-center">
          <span className="text-[10px] text-[#8F9CAE] uppercase font-heading font-bold block">Batters</span>
          <span className="font-number font-black text-sm text-white">
            {roleBreakdown.batters}
          </span>
        </div>

        {/* All-rounders */}
        <div className="p-2.5 rounded-xl bg-[#12142A] border border-[#1E2246] text-center">
          <span className="text-[10px] text-[#8F9CAE] uppercase font-heading font-bold block">All-Rounders</span>
          <span className="font-number font-black text-sm text-[#7C5CFF]">
            {roleBreakdown.allRounders}
          </span>
        </div>

        {/* Bowlers */}
        <div className="p-2.5 rounded-xl bg-[#12142A] border border-[#1E2246] text-center">
          <span className="text-[10px] text-[#8F9CAE] uppercase font-heading font-bold block">Bowlers</span>
          <span className="font-number font-black text-sm text-[#3DBB83]">
            {roleBreakdown.bowlers}
          </span>
        </div>

        {/* Wicketkeepers */}
        <div className="p-2.5 rounded-xl bg-[#12142A] border border-[#1E2246] text-center">
          <span className="text-[10px] text-[#8F9CAE] uppercase font-heading font-bold block">WKs</span>
          <span className={`font-number font-black text-sm ${roleBreakdown.wks >= 1 ? 'text-[#C8FF3D]' : 'text-[#FF3B5C]'}`}>
            {roleBreakdown.wks}
          </span>
        </div>
      </div>

      {/* MAIN TWO-COLUMN LAYOUT: SQUAD SELECTION (LEFT) & PLAYING XI ON THE FIELD (RIGHT) */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN: FULL SQUAD ROSTER (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-heading font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#C8FF3D]" />
              <span>Squad Roster ({squad.length} Players)</span>
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1">
            {['ALL', 'Batsmen', 'All-rounders', 'Bowlers', 'WK', 'OVERSEAS'].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-heading font-extrabold uppercase transition-all ${
                  activeCategoryFilter === cat
                    ? 'bg-[#C8FF3D] text-[#0A0B14]'
                    : 'bg-[#0A0B14] text-[#8F9CAE] hover:text-white border border-[#1E2246]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Player Cards List */}
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {filteredSquad.map(player => {
              const isSelectedInXI = selectedIds.includes(player.id);
              const isImpact = impactPlayerId === player.id;
              const isCap = captainId === player.id;
              const isVC = viceCaptainId === player.id;

              return (
                <div
                  key={player.id}
                  onClick={() => canEdit && handleTogglePlayer(player)}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isSelectedInXI
                      ? 'bg-[#1E2246]/80 border-[#C8FF3D] shadow-[0_0_15px_rgba(200,255,61,0.15)] cursor-pointer'
                      : isImpact
                      ? 'bg-[#FFC93D]/10 border-[#FFC93D] cursor-pointer'
                      : canEdit
                      ? 'bg-[#0A0B14]/70 border-[#1E2246] hover:border-[#282E5C] cursor-pointer'
                      : 'bg-[#0A0B14]/40 border-[#1E2246]/40 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Number / Checkbox indicator */}
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border text-xs font-number font-bold ${
                        isSelectedInXI
                          ? 'bg-[#C8FF3D] border-[#C8FF3D] text-[#0A0B14]'
                          : isImpact
                          ? 'bg-[#FFC93D] border-[#FFC93D] text-[#0A0B14]'
                          : 'bg-[#12142A] border-[#23274D] text-[#62658A]'
                      }`}
                    >
                      {isSelectedInXI ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : isImpact ? (
                        'IP'
                      ) : (
                        '+'
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-heading font-black text-sm text-white truncate">
                          {player.name}
                        </p>
                        {isCap && (
                          <span className="bg-[#FFC93D] text-[#0A0B14] font-heading font-black text-[9px] px-1.5 py-0.2 rounded font-number">
                            (C)
                          </span>
                        )}
                        {isVC && (
                          <span className="bg-[#7C5CFF] text-white font-heading font-black text-[9px] px-1.5 py-0.2 rounded font-number">
                            (VC)
                          </span>
                        )}
                        {isImpact && (
                          <span className="bg-[#FF3B5C] text-white font-heading font-black text-[9px] px-1.5 py-0.2 rounded font-number">
                            (IP)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-[#8F9CAE] mt-0.5">
                        <span>{player.category}</span>
                        {player.is_wicketkeeper && (
                          <span className="text-[#C8FF3D] flex items-center gap-0.5 font-bold">
                            <Shield className="w-2.5 h-2.5" /> WK
                          </span>
                        )}
                        {player.is_overseas && (
                          <span className="text-[#FFC93D] flex items-center gap-0.5 font-bold">
                            <Globe2 className="w-2.5 h-2.5" /> Overseas
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-number font-bold text-xs text-[#C8FF3D] block">
                      {player.sold_price_inr
                        ? `₹${(player.sold_price_inr / 10000000).toFixed(2)} Cr`
                        : player.base_price_display}
                    </span>
                    <span className="text-[10px] text-[#62658A]">
                      {isSelectedInXI ? 'Selected' : isImpact ? 'Impact Player' : 'Bench'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: STARTING XI LINEUP & ROLES (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#1E2246]">
            <div>
              <span className="text-xs font-heading font-black text-[#C8FF3D] uppercase tracking-wider flex items-center gap-1.5">
                <Star className="w-4 h-4 text-[#C8FF3D]" />
                <span>Confirmed Playing XI Lineup (11 Starting)</span>
              </span>
              <p className="text-[11px] text-[#8F9CAE]">
                Assign Captain (C), Vice-Captain (VC), and Impact Player (IP).
              </p>
            </div>

            {canEdit && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-3 py-1.5 rounded-xl bg-[#1E2246] hover:bg-[#282E5C] text-white text-xs font-heading font-bold flex items-center gap-1.5 transition-all"
                >
                  <Save className="w-3.5 h-3.5 text-[#C8FF3D]" />
                  Save Draft
                </button>

                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={!isValidForConfirmation}
                  className="px-4 py-1.5 rounded-xl bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] text-xs font-heading font-black uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(200,255,61,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Confirm Team
                </button>
              </div>
            )}
          </div>

          {/* Validation Errors Box (if any) */}
          {validationErrors.length > 0 && canEdit && (
            <div className="p-3.5 rounded-2xl bg-[#FF3B5C]/10 border border-[#FF3B5C]/30 space-y-1 text-xs">
              <span className="font-heading font-black text-[#FF3B5C] uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Selection Requirements Remaining:</span>
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-[#8F9CAE] text-[11px]">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 11 Starting Player Slots */}
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {startingXIPlayers.length === 0 ? (
              <div className="text-center py-12 rounded-2xl bg-[#0A0B14]/60 border border-[#1E2246] space-y-2">
                <Users className="w-8 h-8 text-[#62658A] mx-auto" />
                <p className="font-heading font-bold text-sm text-white uppercase tracking-wider">
                  No Starting Players Selected
                </p>
                <p className="text-xs text-[#8F9CAE]">
                  Click players from your squad roster on the left to add them to your Starting XI.
                </p>
              </div>
            ) : (
              startingXIPlayers.map((player, idx) => {
                const isCap = captainId === player.id;
                const isVC = viceCaptainId === player.id;

                return (
                  <div
                    key={player.id}
                    className="p-2.5 rounded-xl bg-[#0A0B14] border border-[#1E2246] flex items-center justify-between gap-3 hover:border-[#282E5C] transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-[#12142A] border border-[#23274D] flex items-center justify-center font-number font-black text-xs text-[#8F9CAE] shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-heading font-bold text-xs text-white truncate">{player.name}</p>
                          {player.is_overseas && (
                            <span className="text-[#FFC93D] flex items-center gap-0.5 text-[10px] font-bold">
                              <Globe2 className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#8F9CAE]">{player.category}</p>
                      </div>
                    </div>

                    {/* Role Badges / Buttons (Captain & Vice Captain) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {canEdit ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              if (isCap) setCaptainId(null);
                              else {
                                setCaptainId(player.id);
                                if (viceCaptainId === player.id) setViceCaptainId(null);
                              }
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-heading font-black tracking-wider transition-all ${
                              isCap
                                ? 'bg-[#FFC93D] text-[#0A0B14] shadow-[0_0_8px_rgba(255,201,61,0.4)]'
                                : 'bg-[#12142A] text-[#8F9CAE] hover:text-white border border-[#23274D]'
                            }`}
                          >
                            C
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (isVC) setViceCaptainId(null);
                              else {
                                setViceCaptainId(player.id);
                                if (captainId === player.id) setCaptainId(null);
                              }
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-heading font-black tracking-wider transition-all ${
                              isVC
                                ? 'bg-[#7C5CFF] text-white shadow-[0_0_8px_rgba(124,92,255,0.4)]'
                                : 'bg-[#12142A] text-[#8F9CAE] hover:text-white border border-[#23274D]'
                            }`}
                          >
                            VC
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTogglePlayer(player)}
                            className="p-1 rounded text-[#8F9CAE] hover:text-[#FF3B5C] transition-colors"
                            title="Remove from XI"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-1">
                          {isCap && (
                            <span className="px-2 py-0.5 rounded bg-[#FFC93D] text-[#0A0B14] text-[10px] font-heading font-black">
                              CAPTAIN
                            </span>
                          )}
                          {isVC && (
                            <span className="px-2 py-0.5 rounded bg-[#7C5CFF] text-white text-[10px] font-heading font-black">
                              VICE-CAPTAIN
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* IMPACT PLAYER SELECTION STRIP */}
          <div className="bg-[#0A0B14] border border-[#FF3B5C]/30 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-heading font-black text-[#FF3B5C] uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#FF3B5C]" />
                <span>Impact Player (Outside Starting 11)</span>
              </span>
              {impactPlayerId && squadMap.get(impactPlayerId) && (
                <span className="text-xs font-heading font-bold text-white">
                  {squadMap.get(impactPlayerId)!.name}
                </span>
              )}
            </div>

            {canEdit ? (
              <div className="flex items-center gap-2">
                <select
                  value={impactPlayerId || ''}
                  onChange={e => setImpactPlayerId(e.target.value || null)}
                  className="bg-[#12142A] border border-[#23274D] rounded-xl px-3 py-2 text-xs text-white w-full focus:outline-none focus:border-[#FF3B5C]"
                >
                  <option value="">-- Choose Impact Player from Bench --</option>
                  {benchPlayers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category} {p.is_overseas ? '· Overseas' : ''})
                    </option>
                  ))}
                </select>
                {impactPlayerId && (
                  <button
                    type="button"
                    onClick={() => setImpactPlayerId(null)}
                    className="p-2 text-[#8F9CAE] hover:text-[#FF3B5C]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-[#8F9CAE]">
                {impactPlayerId && squadMap.get(impactPlayerId)
                  ? `${squadMap.get(impactPlayerId)!.name} (${squadMap.get(impactPlayerId)!.category})`
                  : 'No Impact Player designated'}
              </p>
            )}
          </div>
        </div>

      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#12142A] border-2 border-[#C8FF3D] rounded-3xl p-6 max-w-md w-full shadow-[0_0_50px_rgba(200,255,61,0.25)] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#C8FF3D]/10 border border-[#C8FF3D] flex items-center justify-center text-[#C8FF3D]">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading font-black text-lg text-white uppercase tracking-wider">
                  Lock Playing XI
                </h3>
                <p className="text-xs text-[#8F9CAE]">{teamInfo.name} · Season 2026</p>
              </div>
            </div>

            <p className="text-xs text-[#B0BED0] leading-relaxed">
              Are you sure you want to officially lock your Starting XI? All selections (11 players, Captain, Vice-Captain, and Impact Player) will be submitted to the room. You can still unlock and adjust until the post-auction trading window closes.
            </p>

            <div className="p-3 bg-[#0A0B14] rounded-xl border border-[#23274D] space-y-1 text-xs">
              <div className="flex justify-between text-white">
                <span>Captain:</span>
                <span className="font-heading font-bold text-[#FFC93D]">
                  {squadMap.get(captainId || '')?.name || '—'}
                </span>
              </div>
              <div className="flex justify-between text-white">
                <span>Vice-Captain:</span>
                <span className="font-heading font-bold text-[#7C5CFF]">
                  {squadMap.get(viceCaptainId || '')?.name || '—'}
                </span>
              </div>
              <div className="flex justify-between text-white">
                <span>Impact Player:</span>
                <span className="font-heading font-bold text-[#FF3B5C]">
                  {squadMap.get(impactPlayerId || '')?.name || '—'}
                </span>
              </div>
              <div className="flex justify-between text-white">
                <span>Overseas Starters:</span>
                <span className="font-number font-bold text-[#C8FF3D]">
                  {overseasCountInXI} / 4
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-[#1E2246] hover:bg-[#282E5C] text-[#8F9CAE] hover:text-white text-xs font-heading font-bold"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="px-6 py-2 rounded-xl bg-[#C8FF3D] hover:bg-[#B5F02B] text-[#0A0B14] text-xs font-heading font-black uppercase tracking-wider shadow-[0_0_15px_rgba(200,255,61,0.3)]"
              >
                Confirm Team
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
