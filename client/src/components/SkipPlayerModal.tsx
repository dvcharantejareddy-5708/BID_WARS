import React from 'react';
import { AlertTriangle, X, FastForward } from 'lucide-react';
import { Player } from '../types.js';

interface SkipPlayerModalProps {
  player?: Player | null;
  playerName?: string;
  lotNumber?: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSkip?: () => void;
  onConfirm?: () => void;
}

export const SkipPlayerModal: React.FC<SkipPlayerModalProps> = ({
  player,
  playerName,
  lotNumber,
  isOpen,
  onClose,
  onConfirmSkip,
  onConfirm
}) => {
  if (!isOpen) return null;

  const displayName = player?.name || playerName || 'Current Player';
  const handleConfirm = () => {
    if (onConfirmSkip) onConfirmSkip();
    if (onConfirm) onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0D0D0D] max-w-md w-full rounded-3xl p-6 sm:p-7 border border-[#262626] shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#8E8E93] hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-[#FFC857]/20 text-[#FFC857] flex items-center justify-center border border-[#FFC857]/30">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-white">
              Skip {lotNumber ? `Lot #${lotNumber}` : 'Player'}
            </h3>
            <p className="text-xs text-[#8E8E93]">Host Administrative Action</p>
          </div>
        </div>

        <div className="bg-[#151515] border border-[#262626] rounded-2xl p-4 mb-5 text-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[#8E8E93]">Player:</span>
            <strong className="text-white font-display">{displayName}</strong>
          </div>
          {player?.category && (
            <div className="flex items-center gap-2">
              <span className="text-[#8E8E93]">Category:</span>
              <span className="text-[#00E676] font-medium">{player.category}</span>
            </div>
          )}
          {player?.base_price_display && (
            <div className="flex items-center gap-2">
              <span className="text-[#8E8E93]">Base Price:</span>
              <span className="text-[#FFC857] font-mono font-bold">{player.base_price_display}</span>
            </div>
          )}
          <p className="text-xs text-[#FFC857] pt-2 border-t border-[#262626]">
            ⚠️ Skipping will immediately mark this lot as <strong>SKIPPED</strong>. No team will be charged, and the player will be available in the re-auction round.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-full bg-[#151515] hover:bg-[#202020] text-slate-300 text-xs font-semibold transition-all border border-[#262626]"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 rounded-full bg-[#FFC857] hover:bg-[#ffcf6e] text-black text-xs font-black font-display transition-all shadow-[0_2px_12px_rgba(255,200,87,0.25)] flex items-center justify-center gap-1.5"
          >
            <FastForward className="w-4 h-4 fill-current" />
            <span>Confirm Skip</span>
          </button>
        </div>
      </div>
    </div>
  );
};
