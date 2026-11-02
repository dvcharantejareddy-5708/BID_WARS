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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A111D]/80 backdrop-blur-md">
      <div className="bg-[#203650] max-w-2xl w-full max-h-[80vh] flex flex-col rounded-2xl border border-[#344B65] shadow-2xl relative overflow-hidden text-[#F4F6FA]">
        {/* Header */}
        <div className="p-6 border-b border-[#344B65] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#172840] text-[#F3C969] border border-[#344B65] flex items-center justify-center">
              <FileText className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-heading font-bold uppercase tracking-wide text-base text-[#F4F6FA]">Authoritative Audit Log</h3>
              <p className="text-[11px] text-[#B0BED0]">Chronological ledger of bids, purchases, and host controls</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#B0BED0] hover:text-[#F4F6FA] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Log Entries */}
        <div className="p-6 overflow-y-auto space-y-2.5 flex-1 custom-scrollbar">
          {logs.length === 0 ? (
            <p className="text-xs text-[#B0BED0] italic text-center py-8">No recorded activity yet.</p>
          ) : (
            logs.map((log) => {
              const date = new Date(log.timestamp);
              const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

              return (
                <div
                  key={log.id}
                  className="bg-[#172840] border border-[#344B65] rounded-xl p-3.5 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-[#3DBB83] uppercase tracking-wider">{log.action}</span>
                      <span className="text-[#B0BED0] font-medium">by {log.performer}</span>
                    </div>
                    <p className="text-[#F4F6FA]">{log.details}</p>
                  </div>

                  <span className="text-[11px] font-number text-[#B0BED0] whitespace-nowrap flex items-center gap-1">
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
