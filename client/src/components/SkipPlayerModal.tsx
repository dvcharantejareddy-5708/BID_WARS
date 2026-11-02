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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn selection:bg-[#C8FF45] selection:text-black">
      <div className="bg-[#141F33] max-w-md w-full rounded-3xl p-6 sm:p-7 border border-[#26354D] shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#9BAAC0] hover:text-[#F4F7FC] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-[#FFC857]/20 text-[#FFC857] flex items-center justify-center border border-[#FFC857]/30">
            <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-heading font-black uppercase tracking-wide text-lg text-[#F4F7FC]">
              Skip {lotNumber ? `Lot #${lotNumber}` : 'Player'}
            </h3>
            <p className="text-xs text-[#9BAAC0]">Host Administrative Action</p>
          </div>
        </div>

        <div className="bg-[#0E1626] border border-[#26354D] rounded-2xl p-4 mb-5 text-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[#9BAAC0] font-heading font-bold uppercase text-xs">Player:</span>
            <strong className="text-[#F4F7FC] font-heading font-black uppercase">{displayName}</strong>
          </div>
          {player?.category && (
            <div className="flex items-center gap-2">
              <span className="text-[#9BAAC0] font-heading font-bold uppercase text-xs">Category:</span>
              <span className="text-[#C8FF45] font-heading font-bold uppercase text-xs">{player.category}</span>
            </div>
          )}
          {player?.base_price_display && (
            <div className="flex items-center gap-2">
              <span className="text-[#9BAAC0] font-heading font-bold uppercase text-xs">Base Price:</span>
              <span className="text-[#FFC857] font-number font-black">{player.base_price_display}</span>
            </div>
          )}
          <p className="text-xs text-[#FFC857] pt-2 border-t border-[#26354D]">
            ⚠️ Skipping will immediately mark this lot as <strong>SKIPPED</strong>. No team will be charged, and the player will be available in the re-auction round.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-[#0E1626] hover:bg-[#1B2942] text-[#9BAAC0] hover:text-[#F4F7FC] text-xs font-heading font-bold uppercase tracking-wider transition-all border border-[#26354D]"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 rounded-xl bg-[#FFC857] hover:bg-[#ffcf6e] text-black text-xs font-heading font-black uppercase tracking-wider transition-all shadow-glow-gold flex items-center justify-center gap-1.5"
          >
            <FastForward className="w-4 h-4 fill-current" />
            <span>Confirm Skip</span>
          </button>
        </div>
      </div>
    </div>
  );
};
