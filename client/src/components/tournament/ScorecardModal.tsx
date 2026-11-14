import React from 'react';
import { X, Trophy, FileText } from 'lucide-react';
import { LiveMatch } from '../../tournamentTypes';
import { IPL_FRANCHISES } from '../../types';
import { OvrBadge } from '../OvrBadge';

interface ScorecardModalProps {
  match: LiveMatch;
  onClose: () => void;
}

export const ScorecardModal: React.FC<ScorecardModalProps> = ({ match, onClose }) => {
  const renderInningsTable = (inn: typeof match.innings1, title: string) => {
    if (!inn) return null;
    const f = IPL_FRANCHISES[inn.battingFranchiseId];
    const bowlF = IPL_FRANCHISES[inn.bowlingFranchiseId];

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between pb-3 border-b border-[#1E2246] mb-3">
          <div className="flex items-center gap-2">
            <img
              src={f.logoUrl}
              alt={f.name}
              className="w-6 h-6 object-contain rounded-full bg-black/40"
              onError={e => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="font-black text-sm uppercase text-white">
              {title} — {f.name} ({inn.totalRuns}/{inn.totalWickets} in {inn.oversCompleted}.{inn.ballsInCurrentOver} ov)
            </span>
          </div>
        </div>

        {/* Batting Table */}
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-[#1E2246] pb-2">
                <th className="py-2">Batter</th>
                <th className="py-2">Dismissal</th>
                <th className="py-2 text-right">R</th>
                <th className="py-2 text-right">B</th>
                <th className="py-2 text-right">4s</th>
                <th className="py-2 text-right">6s</th>
                <th className="py-2 text-right">SR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2246]/40">
              {Object.values(inn.batters)
                .filter(b => b.balls > 0 || !b.isOut)
                .map(b => {
                  const sr = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={b.playerId} className="text-gray-300">
                      <td className="py-2 font-bold text-white flex items-center gap-1.5">
                        {b.name}
                        {b.isCaptain && <span className="text-[10px] text-[#FFC93D] font-black">(C)</span>}
                        {b.isViceCaptain && <span className="text-[10px] text-[#7C5CFF] font-black">(VC)</span>}
                      </td>
                      <td className="py-2 text-gray-500">{b.isOut ? (b.dismissal || 'c & b') : 'Not Out'}</td>
                      <td className="py-2 text-right font-black text-white">{b.runs}</td>
                      <td className="py-2 text-right text-gray-400">{b.balls}</td>
                      <td className="py-2 text-right text-gray-400">{b.fours}</td>
                      <td className="py-2 text-right text-gray-400">{b.sixes}</td>
                      <td className="py-2 text-right text-gray-400">{sr}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Bowling Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-[#1E2246] pb-2">
                <th className="py-2">Bowler ({bowlF.shortName})</th>
                <th className="py-2 text-right">O</th>
                <th className="py-2 text-right">M</th>
                <th className="py-2 text-right">R</th>
                <th className="py-2 text-right">W</th>
                <th className="py-2 text-right">ECON</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2246]/40">
              {Object.values(inn.bowlers)
                .filter(b => b.overs > 0 || b.balls > 0)
                .map(b => {
                  const oversDec = b.overs + b.balls / 6;
                  const econ = oversDec > 0 ? (b.runs / oversDec).toFixed(2) : '0.00';
                  return (
                    <tr key={b.playerId} className="text-gray-300">
                      <td className="py-2 font-bold text-white">{b.name}</td>
                      <td className="py-2 text-right font-medium">{b.overs}.{b.balls}</td>
                      <td className="py-2 text-right text-gray-400">{b.maidens}</td>
                      <td className="py-2 text-right text-gray-400">{b.runs}</td>
                      <td className="py-2 text-right font-black text-[#C8FF3D]">{b.wickets}</td>
                      <td className="py-2 text-right text-gray-400">{econ}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-[#0D0E1A] border border-[#2A2F60] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#1E2246] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#C8FF3D]/10 text-[#C8FF3D] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider font-heading">
                Match Official Scorecard
              </h2>
              <p className="text-xs text-gray-400">
                {match.resultSummary || 'Match in progress'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#1E2246] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto grow">
          {renderInningsTable(match.innings1, '1st Innings')}
          {match.innings2 && renderInningsTable(match.innings2, '2nd Innings')}
        </div>
      </div>
    </div>
  );
};

