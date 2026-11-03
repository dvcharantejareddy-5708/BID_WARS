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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0B14]/80 backdrop-blur-md animate-fadeIn font-body">
      <div className="bg-[#12142A] max-w-md w-full rounded-3xl p-6 sm:p-8 border border-[#23274D] shadow-2xl relative text-white">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#9E9EB8] hover:text-white transition-colors p-1.5 rounded-xl hover:bg-[#181B38]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-[#0A0B14] text-[#FFC93D] flex items-center justify-center border border-[#23274D]">
            <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-heading font-black uppercase tracking-tight text-lg text-white">
              Skip {lotNumber ? `Lot #${lotNumber}` : 'Player'}
            </h3>
            <p className="text-xs text-[#9E9EB8]">Host administrative action</p>
          </div>
        </div>

        <div className="bg-[#0A0B14] border border-[#23274D] rounded-2xl p-4 mb-6 text-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[#9E9EB8] font-heading font-extrabold uppercase text-xs">Player:</span>
            <strong className="text-white font-heading font-bold uppercase">{displayName}</strong>
          </div>
          {player?.category && (
            <div className="flex items-center gap-2">
              <span className="text-[#9E9EB8] font-heading font-extrabold uppercase text-xs">Category:</span>
              <span className="text-[#C8FF3D] font-medium">{player.category}</span>
            </div>
          )}
          <p className="text-xs text-[#9E9EB8] pt-2 border-t border-[#23274D] leading-relaxed">
            Skipping marks this player lot as SKIPPED and advances the auction to the next lot immediately.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-[#0A0B14] hover:bg-[#181B38] text-[#9E9EB8] hover:text-white text-xs font-heading font-bold uppercase tracking-wider transition-all border border-[#23274D]"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 rounded-xl bg-[#FF3B5C] hover:bg-[#E02E4E] text-white text-xs font-heading font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(255,59,92,0.3)] flex items-center justify-center gap-1.5"
          >
            <FastForward className="w-4 h-4" />
            <span>Confirm Skip</span>
          </button>
        </div>
      </div>
    </div>
  );
};
