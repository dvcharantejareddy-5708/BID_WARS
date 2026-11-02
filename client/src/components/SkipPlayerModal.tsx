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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A111D]/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#203650] max-w-md w-full rounded-2xl p-6 sm:p-7 border border-[#344B65] shadow-2xl relative text-[#F4F6FA]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#B0BED0] hover:text-[#F4F6FA] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-[#F3C969]/15 text-[#F3C969] flex items-center justify-center border border-[#F3C969]/30">
            <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-heading font-bold uppercase tracking-wide text-lg text-[#F4F6FA]">
              Skip {lotNumber ? `Lot #${lotNumber}` : 'Player'}
            </h3>
            <p className="text-xs text-[#B0BED0]">Host Administrative Action</p>
          </div>
        </div>

        <div className="bg-[#172840] border border-[#344B65] rounded-xl p-4 mb-5 text-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[#B0BED0] font-heading font-bold uppercase text-xs">Player:</span>
            <strong className="text-[#F4F6FA] font-heading font-bold uppercase">{displayName}</strong>
          </div>
          {player?.category && (
            <div className="flex items-center gap-2">
              <span className="text-[#B0BED0] font-heading font-bold uppercase text-xs">Category:</span>
              <span className="text-[#3DBB83] font-heading font-bold uppercase text-xs">{player.category}</span>
            </div>
          )}
          {player?.base_price_display && (
            <div className="flex items-center gap-2">
              <span className="text-[#B0BED0] font-heading font-bold uppercase text-xs">Base Price:</span>
              <span className="text-[#F3C969] font-number font-bold">{player.base_price_display}</span>
            </div>
          )}
          <p className="text-xs text-[#F3C969]/90 pt-2 border-t border-[#344B65]">
            ⚠️ Skipping will immediately mark this lot as <strong>SKIPPED</strong>. No team will be charged, and the player will be available in the re-auction round.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-[#172840] hover:bg-[#1D3048] text-[#F4F6FA] text-xs font-heading font-bold uppercase tracking-wider transition-all border border-[#344B65]"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 rounded-xl bg-[#F3C969] hover:bg-[#E0AC3C] text-[#101B2D] text-xs font-heading font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            <FastForward className="w-4 h-4 fill-current" />
            <span>Confirm Skip</span>
          </button>
        </div>
      </div>
    </div>
  );
};
