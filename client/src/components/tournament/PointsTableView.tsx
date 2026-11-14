import React from 'react';
import { PointsTableRow } from '../../tournamentTypes';
import { IPL_FRANCHISES } from '../../types';

interface PointsTableViewProps {
  pointsTable: PointsTableRow[];
  qualifyingCount?: number;
}

export const PointsTableView: React.FC<PointsTableViewProps> = ({
  pointsTable,
  qualifyingCount = 4
}) => {
  return (
    <div className="bg-[#12142A] border border-[#2A2F60] rounded-2xl overflow-hidden shadow-xl">
      <div className="p-5 border-b border-[#1E2246] flex items-center justify-between">
        <h3 className="text-base font-black uppercase tracking-wider text-white">
          Tournament Standings & Points Table
        </h3>
        <span className="text-xs text-[#C8FF3D] font-bold">
          Top {qualifyingCount} Qualify for Playoffs
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs md:text-sm">
          <thead>
            <tr className="text-gray-400 bg-[#0D0E1A] border-b border-[#1E2246] uppercase text-[11px] font-bold">
              <th className="py-3 px-4 w-12 text-center">POS</th>
              <th className="py-3 px-4">TEAM</th>
              <th className="py-3 px-3 text-center">P</th>
              <th className="py-3 px-3 text-center">W</th>
              <th className="py-3 px-3 text-center">L</th>
              <th className="py-3 px-3 text-center">T</th>
              <th className="py-3 px-3 text-center font-black text-white">PTS</th>
              <th className="py-3 px-4 text-right">NRR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E2246]">
            {pointsTable.map((row, idx) => {
              const f = IPL_FRANCHISES[row.franchiseId];
              const isQualified = idx < qualifyingCount;

              return (
                <tr
                  key={row.franchiseId}
                  className={`transition-colors ${
                    isQualified ? 'bg-[#C8FF3D]/[0.02] hover:bg-[#1E2246]' : 'hover:bg-[#1E2246]'
                  }`}
                >
                  <td className="py-3 px-4 text-center font-black">
                    <span className={isQualified ? 'text-[#C8FF3D]' : 'text-gray-500'}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-white flex items-center gap-3">
                    <img
                      src={f.logoUrl}
                      alt={f.name}
                      className="w-7 h-7 object-contain rounded-full bg-black/40 p-0.5"
                      onError={e => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="flex flex-col">
                      <span className="font-black text-xs md:text-sm">{f.shortName}</span>
                      <span className="text-[10px] text-gray-400 hidden sm:inline">{f.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center text-gray-300 font-medium">{row.played}</td>
                  <td className="py-3 px-3 text-center text-emerald-400 font-bold">{row.won}</td>
                  <td className="py-3 px-3 text-center text-red-400 font-bold">{row.lost}</td>
                  <td className="py-3 px-3 text-center text-gray-400 font-medium">{row.tied}</td>
                  <td className="py-3 px-3 text-center font-black text-white text-base">
                    {row.points}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold">
                    <span className={row.nrr >= 0 ? 'text-[#C8FF3D]' : 'text-red-400'}>
                      {row.nrr > 0 ? `+${row.nrr.toFixed(3)}` : row.nrr.toFixed(3)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

