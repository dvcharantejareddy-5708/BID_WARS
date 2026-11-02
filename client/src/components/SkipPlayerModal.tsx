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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18243A]/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white max-w-md w-full rounded-2xl p-6 sm:p-7 border border-[#D8D8D1] shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#647084] hover:text-[#18243A] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-[#F0C65B]/20 text-[#B8860B] flex items-center justify-center border border-[#F0C65B]/40">
            <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-heading font-bold uppercase tracking-wide text-lg text-[#18243A]">
              Skip {lotNumber ? `Lot #${lotNumber}` : 'Player'}
            </h3>
            <p className="text-xs text-[#647084]">Host Administrative Action</p>
          </div>
        </div>

        <div className="bg-[#F3F0E8] border border-[#D8D8D1] rounded-xl p-4 mb-5 text-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[#647084] font-heading font-bold uppercase text-xs">Player:</span>
            <strong className="text-[#18243A] font-heading font-bold uppercase">{displayName}</strong>
          </div>
          {player?.category && (
            <div className="flex items-center gap-2">
              <span className="text-[#647084] font-heading font-bold uppercase text-xs">Category:</span>
              <span className="text-[#176B48] font-heading font-bold uppercase text-xs">{player.category}</span>
            </div>
          )}
          {player?.base_price_display && (
            <div className="flex items-center gap-2">
              <span className="text-[#647084] font-heading font-bold uppercase text-xs">Base Price:</span>
              <span className="text-[#173B78] font-number font-bold">{player.base_price_display}</span>
            </div>
          )}
          <p className="text-xs text-[#B8860B] pt-2 border-t border-[#D8D8D1]">
            ⚠️ Skipping will immediately mark this lot as <strong>SKIPPED</strong>. No team will be charged, and the player will be available in the re-auction round.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-[#E6EDF8] hover:bg-[#D5E2F5] text-[#173B78] text-xs font-heading font-bold uppercase tracking-wider transition-all border border-[#D8D8D1]"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 rounded-xl bg-[#B8860B] hover:bg-[#996D07] text-white text-xs font-heading font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            <FastForward className="w-4 h-4 fill-current" />
            <span>Confirm Skip</span>
          </button>
        </div>
      </div>
    </div>
  );
};
