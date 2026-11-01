import React from 'react';
import { FileText, Clock, User, Shield, X } from 'lucide-react';
import { AuditLogEntry } from '../types.js';

interface AuditLogModalProps {
  logs: AuditLogEntry[];
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ logs, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="glass-panel max-w-2xl w-full max-h-[80vh] flex flex-col rounded-2xl border border-navy-600/70 shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-navy-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-400/20 text-cyan-300 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white">Authoritative Audit Log</h3>
              <p className="text-[11px] text-slate-400">Chronological ledger of bids, purchases, and host controls</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Log Entries */}
        <div className="p-5 overflow-y-auto space-y-2 flex-1">
          {logs.length === 0 ? (
            <p className="text-xs text-slate-500 italic text-center py-8">No recorded activity yet.</p>
          ) : (
            logs.map((log) => {
              const date = new Date(log.timestamp);
              const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

              return (
                <div
                  key={log.id}
                  className="bg-navy-900/80 border border-navy-800 rounded-xl p-3 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-cyan-300 font-mono">{log.action}</span>
                      <span className="text-slate-400 font-medium">by {log.performer}</span>
                    </div>
                    <p className="text-slate-200">{log.details}</p>
                  </div>

                  <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeStr}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
