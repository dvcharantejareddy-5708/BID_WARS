import React, { useState } from 'react';
import { X, Trophy, Users, Clock, ShieldCheck, Flame } from 'lucide-react';
import { IPLTeamId, IPL_FRANCHISES } from '../../types';
import { AuthUser } from '../../services/auth';
import { TournamentApi } from '../../services/tournamentApi';
import { Tournament } from '../../tournamentTypes';

interface CreateTournamentModalProps {
  user: AuthUser;
  isOpen: boolean;
  onClose: () => void;
  onCreated: (tournament: Tournament) => void;
}

export const CreateTournamentModal: React.FC<CreateTournamentModalProps> = ({
  user,
  isOpen,
  onClose,
  onCreated
}) => {
  const [name, setName] = useState('');
  const [teamsCount, setTeamsCount] = useState<4 | 6 | 8 | 10>(8);
  const [matchOvers, setMatchOvers] = useState<1 | 2 | 5 | 10 | 15 | 20>(5);
  const [selectedFranchise, setSelectedFranchise] = useState<IPLTeamId>('CSK');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const displayName = user.username || user.inGameName || 'Manager';
      const tournament = await TournamentApi.createTournament({
        name: name.trim() || `${displayName}'s IPL Championship`,
        hostId: user.id,
        hostName: displayName,
        hostEmail: user.email,
        teamsCount,
        matchOvers,
        hostFranchiseId: selectedFranchise
      });

      onCreated(tournament);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create tournament');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#0D0E1A] border border-[#2A2F60] rounded-2xl shadow-2xl overflow-hidden">
        {/* Glow header banner */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#C8FF3D] via-[#7C5CFF] to-[#FF3B5C]" />

        <div className="p-6 md:p-8 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-[#1E2246]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#C8FF3D]/10 border border-[#C8FF3D]/30 flex items-center justify-center text-[#C8FF3D]">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider font-heading">
                  Create IPL Tournament
                </h2>
                <p className="text-xs text-gray-400">Host a persistent multiplayer tournament with auction & hand-cricket</p>
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
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* Tournament Name */}
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                Tournament Title
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Dream11 Super League 2026"
                className="w-full px-4 py-3 bg-[#12142A] border border-[#2A2F60] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#C8FF3D] transition-colors text-sm"
              />
            </div>

            {/* Teams Count */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#C8FF3D]" />
                  Number of Franchises
                </label>
                <span className="text-[11px] text-gray-400">1 account controls 1 team</span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {([4, 6, 8, 10] as const).map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setTeamsCount(num)}
                    className={`py-3 px-2 rounded-xl font-bold text-sm border transition-all text-center ${
                      teamsCount === num
                        ? 'bg-[#C8FF3D]/10 border-[#C8FF3D] text-[#C8FF3D] shadow-[0_0_15px_rgba(200,255,61,0.15)]'
                        : 'bg-[#12142A] border-[#2A2F60] text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-lg font-black">{num}</div>
                    <div className="text-[10px] text-gray-400 uppercase">
                      {num === 4 ? 'Double RR' : num === 10 ? '2 Groups' : 'Round Robin'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Match Overs */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#7C5CFF]" />
                  Overs Per Innings
                </label>
                <span className="text-[11px] text-gray-400">
                  Bowler quota: {Math.max(1, Math.ceil(matchOvers / 5))} over(s) max
                </span>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {([1, 2, 5, 10, 15, 20] as const).map(ovr => (
                  <button
                    key={ovr}
                    type="button"
                    onClick={() => setMatchOvers(ovr)}
                    className={`py-2.5 rounded-xl font-bold text-sm border transition-all text-center ${
                      matchOvers === ovr
                        ? 'bg-[#7C5CFF]/20 border-[#7C5CFF] text-white shadow-[0_0_15px_rgba(124,92,255,0.25)]'
                        : 'bg-[#12142A] border-[#2A2F60] text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <span className="text-base font-black">{ovr}</span>
                    <span className="text-[10px] block opacity-70">OVR</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Choose Your Franchise */}
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[#FF3B5C]" />
                Select Your Host Franchise
              </label>
              <div className="grid grid-cols-5 gap-2.5">
                {(Object.keys(IPL_FRANCHISES) as IPLTeamId[]).map(fid => {
                  const f = IPL_FRANCHISES[fid];
                  const isSelected = selectedFranchise === fid;
                  return (
                    <button
                      key={fid}
                      type="button"
                      onClick={() => setSelectedFranchise(fid)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                        isSelected
                          ? 'border-[#C8FF3D] bg-[#1E2246] shadow-[0_0_12px_rgba(200,255,61,0.2)]'
                          : 'border-[#2A2F60] bg-[#12142A] hover:border-gray-500'
                      }`}
                    >
                      <img
                        src={f.logoUrl}
                        alt={f.name}
                        className="w-9 h-9 object-contain rounded-full bg-black/40 p-0.5"
                        onError={e => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <span className={`text-xs font-bold ${isSelected ? 'text-[#C8FF3D]' : 'text-gray-300'}`}>
                        {f.shortName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-[#1E2246] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-gray-400 hover:text-white font-medium text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 rounded-xl bg-[#C8FF3D] hover:bg-[#b5ee2e] text-[#0A0B14] font-black uppercase text-sm tracking-wider shadow-[0_0_20px_rgba(200,255,61,0.3)] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Tournament'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

