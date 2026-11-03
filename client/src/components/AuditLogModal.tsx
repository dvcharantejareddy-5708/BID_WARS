import React from 'react';
import { FileText, Clock, X } from 'lucide-react';
import { AuditLogEntry } from '../types.js';

interface AuditLogModalProps {
  logs: AuditLogEntry[];
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ logs, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0B14]/80 backdrop-blur-md animate-fadeIn font-body">
      <div className="bg-[#12142A] max-w-2xl w-full max-h-[80vh] flex flex-col rounded-3xl border border-[#23274D] shadow-2xl relative overflow-hidden text-white">
        {/* Header */}
        <div className="p-6 border-b border-[#23274D] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0A0B14] text-[#C8FF3D] border border-[#23274D] flex items-center justify-center">
              <FileText className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-heading font-black uppercase tracking-tight text-base text-white">Authoritative Audit Log</h3>
              <p className="text-[11px] text-[#9E9EB8]">Chronological ledger of bids, purchases, and host controls</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#9E9EB8] hover:text-white transition-colors p-1.5 rounded-xl hover:bg-[#181B38]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Log Entries */}
        <div className="p-6 overflow-y-auto space-y-2.5 flex-1 custom-scrollbar">
          {logs.length === 0 ? (
            <p className="text-xs text-[#9E9EB8] italic text-center py-8">No recorded activity yet.</p>
          ) : (
            logs.map((log) => {
              const date = new Date(log.timestamp);
              const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

              return (
                <div
                  key={log.id}
                  className="bg-[#0A0B14] border border-[#23274D] rounded-2xl p-3.5 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-extrabold text-[#C8FF3D] uppercase tracking-wider">{log.action}</span>
                      <span className="text-[#9E9EB8] font-medium">by {log.performer}</span>
                    </div>
                    <p className="text-white">{log.details}</p>
                  </div>

                  <span className="text-[11px] font-number text-[#9E9EB8] whitespace-nowrap flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#FFC93D]" />
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
