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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md selection:bg-[#C8FF45] selection:text-black">
      <div className="bg-[#141F33] max-w-2xl w-full max-h-[80vh] flex flex-col rounded-3xl border border-[#26354D] shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[#26354D] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#C8FF45]/10 text-[#C8FF45] border border-[#C8FF45]/30 flex items-center justify-center">
              <FileText className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-heading font-black uppercase tracking-wide text-base text-[#F4F7FC]">Authoritative Audit Log</h3>
              <p className="text-[11px] text-[#9BAAC0]">Chronological ledger of bids, purchases, and host controls</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#9BAAC0] hover:text-[#F4F7FC] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Log Entries */}
        <div className="p-6 overflow-y-auto space-y-2.5 flex-1">
          {logs.length === 0 ? (
            <p className="text-xs text-[#9BAAC0] italic text-center py-8">No recorded activity yet.</p>
          ) : (
            logs.map((log) => {
              const date = new Date(log.timestamp);
              const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

              return (
                <div
                  key={log.id}
                  className="bg-[#0E1626] border border-[#26354D] rounded-2xl p-3.5 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-black text-[#C8FF45] uppercase tracking-wider">{log.action}</span>
                      <span className="text-[#9BAAC0] font-medium">by {log.performer}</span>
                    </div>
                    <p className="text-[#F4F7FC]">{log.details}</p>
                  </div>

                  <span className="text-[11px] font-number text-[#9BAAC0] whitespace-nowrap flex items-center gap-1">
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
