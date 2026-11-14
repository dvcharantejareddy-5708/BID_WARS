import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Tournament } from '../../tournamentTypes';
import { TournamentApi } from '../../services/tournamentApi';

interface DeleteTournamentModalProps {
  isOpen: boolean;
  tournament: Tournament;
  userId: string;
  onClose: () => void;
  onDeleted: () => void;
}

export const DeleteTournamentModal: React.FC<DeleteTournamentModalProps> = ({
  isOpen,
  tournament,
  userId,
  onClose,
  onDeleted
}) => {
  const [confirmName, setConfirmName] = useState('');
  const [acknowledgedWarning, setAcknowledgedWarning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isHost = tournament.hostId === userId;
  const isMatch = confirmName.trim().toLowerCase() === tournament.name.trim().toLowerCase();
  const canDelete = isHost && isMatch && acknowledgedWarning && !isDeleting;

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canDelete) return;

    setIsDeleting(true);
    setError(null);

    const res = await TournamentApi.deleteTournament(tournament.id, userId);
    setIsDeleting(false);

    if (res.success) {
      onDeleted();
    } else {
      setError(res.error || 'Failed to delete tournament');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0A0B14] border border-[#FF3B5C]/40 rounded-2xl shadow-[0_0_50px_rgba(255,59,92,0.15)] overflow-hidden p-6 sm:p-7 space-y-6">
        {/* Top Danger Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#FF3B5C]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1E2246]">
          <div className="flex items-center gap-2.5 text-[#FF3B5C]">
            <Trash2 className="w-5 h-5" />
            <h3 className="font-heading font-black text-lg text-white uppercase tracking-wider">
              Delete Tournament
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1E2246] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Warning Callout */}
        <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-4 space-y-2 text-xs text-red-300">
          <div className="flex items-center gap-2 font-heading font-black text-white uppercase">
            <AlertTriangle className="w-4 h-4 text-[#FF3B5C]" />
            <span>Permanent Deletion Warning</span>
          </div>
          <p className="leading-relaxed">
            This action will permanently destroy <strong className="text-white">"{tournament.name}"</strong> (ID: {tournament.id}).
          </p>
          <ul className="list-disc list-inside text-[11px] text-gray-400 space-y-1 pt-1">
            <li>All {tournament.members.length} team memberships and franchises will be erased.</li>
            <li>Associated auction room ({tournament.roomCode}), squads, and purchases will be deleted.</li>
            <li>All scheduled fixtures, scorecards, ball-by-ball commentary, and tournament stats will be wiped.</li>
          </ul>
        </div>

        <form onSubmit={handleDelete} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-heading font-black uppercase tracking-wider text-gray-300 block">
              Type the tournament name <strong className="text-white">"{tournament.name}"</strong> to confirm:
            </label>
            <input
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={tournament.name}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#12142A] border border-[#1E2246] text-white text-xs font-bold focus:outline-none focus:border-[#FF3B5C]"
              disabled={isDeleting}
              autoFocus
            />
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={acknowledgedWarning}
              onChange={(e) => setAcknowledgedWarning(e.target.checked)}
              className="mt-0.5 rounded border-gray-600 text-[#FF3B5C] focus:ring-0"
              disabled={isDeleting}
            />
            <span className="text-xs text-gray-400 leading-snug">
              I understand that this action is irreversible and all tournament records will be permanently removed from cloud storage.
            </span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1E2246]">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl bg-[#12142A] hover:bg-[#1E2246] text-gray-300 hover:text-white text-xs font-heading font-black uppercase tracking-wider border border-[#2A2F60] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canDelete}
              className={`px-5 py-2 rounded-xl font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
                canDelete
                  ? 'bg-[#FF3B5C] hover:bg-[#E02849] text-white shadow-[0_0_15px_rgba(255,59,92,0.4)] cursor-pointer'
                  : 'bg-[#1E2246] text-gray-500 cursor-not-allowed'
              }`}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting Tournament...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Permanently Delete</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
