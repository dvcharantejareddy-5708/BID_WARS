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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18243A]/75 backdrop-blur-sm">
      <div className="bg-white max-w-2xl w-full max-h-[80vh] flex flex-col rounded-2xl border border-[#D8D8D1] shadow-2xl relative overflow-hidden text-[#18243A]">
        {/* Header */}
        <div className="p-6 border-b border-[#D8D8D1] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E6EDF8] text-[#173B78] border border-[#D8D8D1] flex items-center justify-center">
              <FileText className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-heading font-bold uppercase tracking-wide text-base text-[#18243A]">Authoritative Audit Log</h3>
              <p className="text-[11px] text-[#647084]">Chronological ledger of bids, purchases, and host controls</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#647084] hover:text-[#18243A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Log Entries */}
        <div className="p-6 overflow-y-auto space-y-2.5 flex-1 custom-scrollbar">
          {logs.length === 0 ? (
            <p className="text-xs text-[#647084] italic text-center py-8">No recorded activity yet.</p>
          ) : (
            logs.map((log) => {
              const date = new Date(log.timestamp);
              const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

              return (
                <div
                  key={log.id}
                  className="bg-[#F3F0E8] border border-[#D8D8D1] rounded-xl p-3.5 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-[#176B48] uppercase tracking-wider">{log.action}</span>
                      <span className="text-[#647084] font-medium">by {log.performer}</span>
                    </div>
                    <p className="text-[#18243A]">{log.details}</p>
                  </div>

                  <span className="text-[11px] font-number text-[#647084] whitespace-nowrap flex items-center gap-1">
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
