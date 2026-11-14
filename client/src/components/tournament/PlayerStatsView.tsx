import React, { useState } from 'react';
import { Trophy, Award, Flame, Zap } from 'lucide-react';
import { PlayerTournamentStats } from '../../tournamentTypes';
import { IPL_FRANCHISES } from '../../types';

interface PlayerStatsViewProps {
  stats: Record<string, PlayerTournamentStats>;
}

export const PlayerStatsView: React.FC<PlayerStatsViewProps> = ({ stats }) => {
  const [tab, setTab] = useState<'ORANGE' | 'PURPLE' | 'MVP'>('ORANGE');

  const statsList = Object.values(stats);

  const orangeCapList = [...statsList]
    .filter(s => s.runs > 0)
    .sort((a, b) => b.runs - a.runs)
    .slice(0, 10);

  const purpleCapList = [...statsList]
    .filter(s => s.wickets > 0)
    .sort((a, b) => b.wickets - a.wickets)
    .slice(0, 10);

  const mvpList = [...statsList]
    .sort((a, b) => b.mvpPoints - a.mvpPoints)
    .slice(0, 10);

  return (
    <div className="bg-[#12142A] border border-[#2A2F60] rounded-2xl overflow-hidden shadow-xl">
      {/* Category Tabs */}
      <div className="p-4 border-b border-[#1E2246] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('ORANGE')}
            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
              tab === 'ORANGE'
                ? 'bg-[#FF9900] text-black shadow-[0_0_15px_rgba(255,153,0,0.3)]'
                : 'bg-[#0D0E1A] text-gray-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            Orange Cap (Runs)
          </button>
          <button
            onClick={() => setTab('PURPLE')}
            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
              tab === 'PURPLE'
                ? 'bg-[#7C5CFF] text-white shadow-[0_0_15px_rgba(124,92,255,0.3)]'
                : 'bg-[#0D0E1A] text-gray-400 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Purple Cap (Wickets)
          </button>
          <button
            onClick={() => setTab('MVP')}
            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
              tab === 'MVP'
                ? 'bg-[#C8FF3D] text-[#0A0B14] shadow-[0_0_15px_rgba(200,255,61,0.3)]'
                : 'bg-[#0D0E1A] text-gray-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            MVP Leaderboard
          </button>
        </div>
      </div>

      {/* Content Table */}
      <div className="overflow-x-auto p-2">
        {tab === 'ORANGE' && (
          <table className="w-full text-left text-xs md:text-sm">
            <thead>
              <tr className="text-gray-400 bg-[#0D0E1A] border-b border-[#1E2246] uppercase text-[11px] font-bold">
                <th className="py-3 px-4 w-12 text-center">POS</th>
                <th className="py-3 px-4">PLAYER</th>
                <th className="py-3 px-3 text-center">MAT</th>
                <th className="py-3 px-3 text-right font-black text-white">RUNS</th>
                <th className="py-3 px-3 text-right">BF</th>
                <th className="py-3 px-3 text-right">SR</th>
                <th className="py-3 px-3 text-right">4s</th>
                <th className="py-3 px-4 text-right">6s</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2246]">
              {orangeCapList.map((p, idx) => {
                const f = IPL_FRANCHISES[p.franchiseId];
                return (
                  <tr key={p.playerId} className="hover:bg-[#1E2246]">
                    <td className="py-3 px-4 text-center font-black">
                      <span className={idx === 0 ? 'text-[#FF9900] font-black' : 'text-gray-500'}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2.5">
                      <span>{p.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1E2246] text-gray-400">
                        {f?.shortName || p.franchiseId}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-gray-400">{p.matchesPlayed}</td>
                    <td className="py-3 px-3 text-right font-black text-[#FF9900] text-base">
                      {p.runs}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-400">{p.ballsFaced}</td>
                    <td className="py-3 px-3 text-right text-gray-400">{p.strikeRate}</td>
                    <td className="py-3 px-3 text-right text-gray-400">{p.fours}</td>
                    <td className="py-3 px-4 text-right text-gray-400">{p.sixes}</td>
                  </tr>
                );
              })}
              {orangeCapList.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500 italic">
                    No batting data recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {tab === 'PURPLE' && (
          <table className="w-full text-left text-xs md:text-sm">
            <thead>
              <tr className="text-gray-400 bg-[#0D0E1A] border-b border-[#1E2246] uppercase text-[11px] font-bold">
                <th className="py-3 px-4 w-12 text-center">POS</th>
                <th className="py-3 px-4">PLAYER</th>
                <th className="py-3 px-3 text-center">MAT</th>
                <th className="py-3 px-3 text-right font-black text-white">WKTS</th>
                <th className="py-3 px-3 text-right">OVERS</th>
                <th className="py-3 px-3 text-right">RUNS</th>
                <th className="py-3 px-4 text-right">ECON</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2246]">
              {purpleCapList.map((p, idx) => {
                const f = IPL_FRANCHISES[p.franchiseId];
                return (
                  <tr key={p.playerId} className="hover:bg-[#1E2246]">
                    <td className="py-3 px-4 text-center font-black">
                      <span className={idx === 0 ? 'text-[#7C5CFF] font-black' : 'text-gray-500'}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2.5">
                      <span>{p.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1E2246] text-gray-400">
                        {f?.shortName || p.franchiseId}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-gray-400">{p.matchesPlayed}</td>
                    <td className="py-3 px-3 text-right font-black text-[#7C5CFF] text-base">
                      {p.wickets}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-400">{p.oversBowled.toFixed(1)}</td>
                    <td className="py-3 px-3 text-right text-gray-400">{p.runsConceded}</td>
                    <td className="py-3 px-4 text-right text-gray-400">{p.economyRate}</td>
                  </tr>
                );
              })}
              {purpleCapList.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500 italic">
                    No bowling data recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {tab === 'MVP' && (
          <table className="w-full text-left text-xs md:text-sm">
            <thead>
              <tr className="text-gray-400 bg-[#0D0E1A] border-b border-[#1E2246] uppercase text-[11px] font-bold">
                <th className="py-3 px-4 w-12 text-center">POS</th>
                <th className="py-3 px-4">PLAYER</th>
                <th className="py-3 px-3 text-center">MAT</th>
                <th className="py-3 px-3 text-right font-black text-white">MVP POINTS</th>
                <th className="py-3 px-3 text-right">RUNS</th>
                <th className="py-3 px-4 text-right">WKTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2246]">
              {mvpList.map((p, idx) => {
                const f = IPL_FRANCHISES[p.franchiseId];
                return (
                  <tr key={p.playerId} className="hover:bg-[#1E2246]">
                    <td className="py-3 px-4 text-center font-black">
                      <span className={idx === 0 ? 'text-[#C8FF3D] font-black' : 'text-gray-500'}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2.5">
                      <span>{p.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1E2246] text-gray-400">
                        {f?.shortName || p.franchiseId}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-gray-400">{p.matchesPlayed}</td>
                    <td className="py-3 px-3 text-right font-black text-[#C8FF3D] text-base">
                      {p.mvpPoints.toFixed(1)}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-400">{p.runs}</td>
                    <td className="py-3 px-4 text-right text-gray-400">{p.wickets}</td>
                  </tr>
                );
              })}
              {mvpList.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 italic">
                    No MVP stats recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

