import React, { useState } from 'react';
import { X, ShieldCheck, Star, Users, Zap } from 'lucide-react';
import { IPLTeamId, Player, IPL_FRANCHISES } from '../../types';
import { OvrBadge } from '../OvrBadge';
import { TournamentApi } from '../../services/tournamentApi';

interface MatchPrepModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  fixtureId: string;
  franchiseId: IPLTeamId;
  squad: Player[];
  userId: string;
  initialPlayingXI?: string[];
  initialCaptainId?: string;
  initialViceCaptainId?: string;
  initialImpactPlayerId?: string;
  onSavedAndReady: () => void;
}

export const MatchPrepModal: React.FC<MatchPrepModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
  fixtureId,
  franchiseId,
  squad,
  userId,
  initialPlayingXI,
  initialCaptainId,
  initialViceCaptainId,
  initialImpactPlayerId,
  onSavedAndReady
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (initialPlayingXI && initialPlayingXI.length === 11) return initialPlayingXI;
    // Default: top 11 by OVR
    const sorted = [...squad].sort((a, b) => (b.ovr || 75) - (a.ovr || 75));
    return sorted.slice(0, 11).map(p => p.id);
  });

  const [captainId, setCaptainId] = useState<string>(() => {
    return initialCaptainId || selectedIds[0] || '';
  });

  const [viceCaptainId, setViceCaptainId] = useState<string>(() => {
    return initialViceCaptainId || selectedIds[1] || '';
  });

  const [impactPlayerId, setImpactPlayerId] = useState<string>(() => {
    if (initialImpactPlayerId) return initialImpactPlayerId;
    const bench = squad.filter(p => !selectedIds.includes(p.id));
    return bench[0]?.id || '';
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const f = IPL_FRANCHISES[franchiseId];

  const togglePlayer = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length <= 1) return;
      const next = selectedIds.filter(pid => pid !== id);
      setSelectedIds(next);
      if (captainId === id) setCaptainId(next[0] || '');
      if (viceCaptainId === id) setViceCaptainId(next[1] || next[0] || '');
    } else {
      if (selectedIds.length >= 11) {
        setError('Maximum 11 players in Playing XI. Unselect another player first.');
        return;
      }
      setError(null);
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSaveAndStart = async () => {
    if (selectedIds.length !== 11) {
      setError(`You must select exactly 11 players for your Playing XI (currently ${selectedIds.length})`);
      return;
    }
    if (!captainId) {
      setError('Please select a Captain');
      return;
    }
    if (!viceCaptainId || viceCaptainId === captainId) {
      setError('Please select a different Vice-Captain');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await TournamentApi.saveLineup(tournamentId, {
        franchiseId,
        userId,
        lineup: {
          playingXI: selectedIds,
          captainId,
          viceCaptainId,
          impactPlayerId: impactPlayerId || undefined
        }
      });

      onSavedAndReady();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error saving Playing XI');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl bg-[#0D0E1A] border border-[#2A2F60] rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#1E2246] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={f.logoUrl}
              alt={f.name}
              className="w-10 h-10 object-contain rounded-full bg-black/40 p-1"
              onError={e => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider font-heading">
                Match Playing XI Selection — {f.shortName}
              </h2>
              <p className="text-xs text-gray-400">
                Select your 11 starters, Captain (C), Vice-Captain (VC), and Impact Player
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#1E2246] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2 shrink-0">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Counter Bar */}
        <div className="px-6 py-3 bg-[#12142A] border-b border-[#1E2246] flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-4">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#C8FF3D]" />
              Starters Selected: <span className={selectedIds.length === 11 ? 'text-[#C8FF3D]' : 'text-amber-400'}>{selectedIds.length}/11</span>
            </span>
            <span className="text-gray-400">
              Total Squad: <span className="text-white font-medium">{squad.length}</span>
            </span>
          </div>
          <div className="text-gray-400">
            Click player card to toggle in/out of Playing XI
          </div>
        </div>

        {/* Squad Selection Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3 grow">
          {squad.map(player => {
            const isSelected = selectedIds.includes(player.id);
            const isCap = captainId === player.id;
            const isVc = viceCaptainId === player.id;
            const isImpact = impactPlayerId === player.id;

            return (
              <div
                key={player.id}
                onClick={() => togglePlayer(player.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-[#1E2246] border-[#C8FF3D] shadow-[0_0_12px_rgba(200,255,61,0.1)]'
                    : 'bg-[#12142A] border-[#2A2F60] opacity-65 hover:opacity-100 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={player.image_url || '/players/default.png'}
                      alt={player.name}
                      className="w-11 h-11 object-cover rounded-full bg-black/40 border border-[#2A2F60]"
                      onError={e => {
                        (e.target as HTMLImageElement).src = '/logos/ipl.png';
                      }}
                    />
                    {isCap && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#FFC93D] text-[#0A0B14] font-black text-[10px] flex items-center justify-center shadow">
                        C
                      </span>
                    )}
                    {isVc && !isCap && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#7C5CFF] text-white font-black text-[10px] flex items-center justify-center shadow">
                        VC
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white flex items-center gap-1.5">
                      {player.name}
                      {player.is_overseas && (
                        <span className="text-[10px] px-1 bg-blue-500/20 text-blue-400 rounded">✈️</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 capitalize">
                      {player.category} • {player.primary_role}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <OvrBadge ovr={player.ovr || 75} size="sm" />

                  {isSelected && (
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        type="button"
                        onClick={() => setCaptainId(player.id)}
                        className={`px-2 py-1 rounded text-[10px] font-black uppercase transition-colors ${
                          isCap ? 'bg-[#FFC93D] text-[#0A0B14]' : 'bg-[#0D0E1A] text-gray-400 hover:text-white'
                        }`}
                        title="Set Captain"
                      >
                        C
                      </button>
                      <button
                        type="button"
                        onClick={() => setViceCaptainId(player.id)}
                        className={`px-2 py-1 rounded text-[10px] font-black uppercase transition-colors ${
                          isVc ? 'bg-[#7C5CFF] text-white' : 'bg-[#0D0E1A] text-gray-400 hover:text-white'
                        }`}
                        title="Set Vice Captain"
                      >
                        VC
                      </button>
                    </div>
                  )}

                  {!isSelected && (
                    <button
                      type="button"
                      onClick={() => setImpactPlayerId(player.id)}
                      className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                        isImpact ? 'bg-[#FF3B5C] text-white' : 'bg-[#0D0E1A] text-gray-400 hover:text-white'
                      }`}
                      title="Set Impact Player Bench Sub"
                    >
                      Impact
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#1E2246] bg-[#0D0E1A] flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-400">
            {selectedIds.length === 11 ? (
              <span className="text-[#C8FF3D] font-bold flex items-center gap-1">
                <Star className="w-3.5 h-3.5" /> Ready for match
              </span>
            ) : (
              <span>Select {11 - selectedIds.length} more players</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-gray-400 hover:text-white font-medium text-xs uppercase"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAndStart}
              disabled={isSaving || selectedIds.length !== 11}
              className="px-6 py-2.5 rounded-xl bg-[#C8FF3D] text-[#0A0B14] font-black uppercase text-xs tracking-wider shadow-[0_0_20px_rgba(200,255,61,0.25)] disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <Zap className="w-4 h-4 fill-current" />
              {isSaving ? 'Locking Lineup...' : 'Lock Lineup & Play'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

