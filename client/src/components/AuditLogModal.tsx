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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0D0D0D] max-w-2xl w-full max-h-[80vh] flex flex-col rounded-3xl border border-[#262626] shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/30 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white">Authoritative Audit Log</h3>
              <p className="text-[11px] text-[#8E8E93]">Chronological ledger of bids, purchases, and host controls</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#8E8E93] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Log Entries */}
        <div className="p-6 overflow-y-auto space-y-2.5 flex-1">
          {logs.length === 0 ? (
            <p className="text-xs text-[#8E8E93] italic text-center py-8">No recorded activity yet.</p>
          ) : (
            logs.map((log) => {
              const date = new Date(log.timestamp);
              const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

              return (
                <div
                  key={log.id}
                  className="bg-[#151515] border border-[#262626] rounded-2xl p-3.5 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#00E676] font-mono">{log.action}</span>
                      <span className="text-[#8E8E93] font-medium">by {log.performer}</span>
                    </div>
                    <p className="text-white">{log.details}</p>
                  </div>

                  <span className="text-[11px] font-mono text-[#8E8E93] whitespace-nowrap flex items-center gap-1">
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
