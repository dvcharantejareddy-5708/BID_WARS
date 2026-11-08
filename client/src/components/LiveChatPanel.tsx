import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import { ChatMessage, IPL_FRANCHISES } from '../types.js';
import { TeamLogo } from './TeamLogo.js';

interface LiveChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  myMemberId: string;
  onSendMessage: (text: string) => void;
}

export const LiveChatPanel = React.memo<LiveChatPanelProps>(({
  isOpen,
  onClose,
  messages,
  myMemberId,
  onSendMessage
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInputText('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed sm:absolute right-0 top-14 bottom-0 z-40 w-full sm:w-80 md:w-88 bg-[#12142A] border-l border-[#23274D] shadow-2xl flex flex-col animate-slideLeft selection:bg-[#C8FF3D]/30 selection:text-white font-body">
      {/* Chat Header */}
      <div className="px-4 py-3.5 border-b border-[#23274D] flex items-center justify-between bg-[#0A0B14] text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#12142A] text-[#C8FF3D] flex items-center justify-center border border-[#23274D]">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-heading font-black text-xs uppercase tracking-wider text-white">Live Room Chat</h3>
            <p className="text-[10px] text-[#9E9EB8]">Tactics & table talk</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-7 h-7 rounded-xl bg-[#12142A] hover:bg-[#181B38] border border-[#23274D] text-[#9E9EB8] hover:text-white flex items-center justify-center transition-colors"
          title="Close Chat"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#0A0B14]/80 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[#9E9EB8]">
            <MessageSquare className="w-8 h-8 text-[#23274D] mb-2" />
            <p className="text-xs font-heading font-extrabold uppercase text-white">No messages yet</p>
            <p className="text-[11px] text-[#62658A] mt-0.5">
              Discuss bids and auction tactics with fellow managers in real time!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === myMemberId;
            const franchise = msg.teamId ? IPL_FRANCHISES[msg.teamId] : null;
            const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                {/* Sender info */}
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px]">
                  {msg.teamId && (
                    <TeamLogo teamId={msg.teamId} className="w-4 h-4 shadow-xs" />
                  )}
                  {franchise && (
                    <span className="font-heading font-black uppercase text-[10px] text-white">
                      {franchise.shortName}
                    </span>
                  )}
                  <span className={`font-heading font-bold uppercase ${isMe ? 'text-[#C8FF3D]' : 'text-[#9E9EB8]'}`}>
                    {msg.senderName} {isMe && '(You)'}
                  </span>
                  <span className="text-[#62658A] font-number text-[9px]">{timeStr}</span>
                </div>

                {/* Message bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs break-words leading-relaxed shadow-sm ${
                    isMe
                      ? 'bg-[#7C5CFF] text-white font-medium rounded-tr-xs'
                      : 'bg-[#181B38] border border-[#23274D] text-white rounded-tl-xs'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSend} className="p-3 border-t border-[#23274D] bg-[#12142A]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            maxLength={300}
            className="flex-1 bg-[#0A0B14] border border-[#23274D] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#62658A] focus:outline-none focus:border-[#C8FF3D]"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-9 h-9 rounded-xl bg-[#C8FF3D] hover:bg-[#B5F522] disabled:opacity-30 disabled:cursor-not-allowed text-[#0A0B14] flex items-center justify-center transition-all shrink-0 shadow-sm"
          >
            <Send className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </form>
    </div>
  );
});

LiveChatPanel.displayName = 'LiveChatPanel';
