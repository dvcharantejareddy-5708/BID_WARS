import React from 'react';
import { AlertTriangle, X, FastForward } from 'lucide-react';
import { Player } from '../types.js';

interface SkipPlayerModalProps {
  player: Player | null;
  lotNumber: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSkip: () => void;
}

export const SkipPlayerModal: React.FC<SkipPlayerModalProps> = ({
  player,
  lotNumber,
  isOpen,
  onClose,
  onConfirmSkip
}) => {
  if (!isOpen || !player) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel max-w-md w-full rounded-2xl p-6 border border-amber-500/40 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-white">Skip Player Lot #{lotNumber}</h3>
            <p className="text-xs text-slate-400">Host Administrative Action</p>
          </div>
        </div>

        <div className="bg-navy-900/90 border border-navy-700 rounded-xl p-3.5 mb-5 text-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Player:</span>
            <strong className="text-white font-display">{player.name}</strong>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Category:</span>
            <span className="text-cyan-300 font-medium">{player.category}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Base Price:</span>
            <span className="text-amber-300 font-mono font-bold">{player.base_price_display}</span>
          </div>
          <p className="text-xs text-amber-300/90 pt-1 border-t border-navy-700/60">
            ⚠️ Skipping will immediately mark this lot as <strong>SKIPPED</strong>. No team will be charged, and the player will be available in the end-of-auction re-auction round.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-300 text-xs font-semibold transition-all border border-navy-600"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirmSkip();
              onClose();
            }}
            className="flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold font-display transition-all shadow-glow-amber flex items-center justify-center gap-1.5"
          >
            <FastForward className="w-4 h-4 fill-current" />
            <span>Confirm Skip</span>
          </button>
        </div>
      </div>
    </div>
  );
};
