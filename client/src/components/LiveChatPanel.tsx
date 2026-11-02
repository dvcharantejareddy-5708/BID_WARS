import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Shield, Clock } from 'lucide-react';
import { ChatMessage, IPL_FRANCHISES } from '../types.js';
import { TeamLogo } from './TeamLogo.js';

interface LiveChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  myMemberId: string;
  onSendMessage: (text: string) => void;
}

export const LiveChatPanel: React.FC<LiveChatPanelProps> = ({
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
    <div className="fixed sm:absolute right-0 top-14 bottom-0 z-40 w-full sm:w-80 md:w-88 bg-[#172840] border-l border-[#344B65] shadow-2xl flex flex-col animate-slideLeft selection:bg-[#F3C969]/30 selection:text-white">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-[#344B65] flex items-center justify-between bg-[#101B2D] text-[#F4F6FA]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#203650] text-[#F3C969] flex items-center justify-center border border-[#344B65]">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-heading font-black text-xs uppercase tracking-wider text-[#F4F6FA]">Live Room Chat</h3>
            <p className="text-[10px] text-[#B0BED0]">Real-time banter & strategy</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-[#172840] hover:bg-[#203650] border border-[#344B65] text-[#B0BED0] hover:text-[#F4F6FA] flex items-center justify-center transition-colors"
          title="Close Chat"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#101B2D]/60">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[#B0BED0]">
            <MessageSquare className="w-8 h-8 text-[#344B65] mb-2" />
            <p className="text-xs font-heading font-bold uppercase text-[#F4F6FA]">No messages yet</p>
            <p className="text-[11px] text-[#B0BED0] mt-0.5">
              Send the first message to discuss bids and auction tactics with fellow managers!
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
                    <span className="font-heading font-black uppercase text-[10px] text-[#F4F6FA]">
                      {franchise.shortName}
                    </span>
                  )}
                  <span className={`font-heading font-bold uppercase ${isMe ? 'text-[#3DBB83]' : 'text-[#B0BED0]'}`}>
                    {msg.senderName} {isMe && '(You)'}
                  </span>
                  <span className="text-[#B0BED0]/60 font-number text-[9px]">{timeStr}</span>
                </div>

                {/* Message bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs break-words leading-relaxed shadow-xs ${
                    isMe
                      ? 'bg-[#2858A5] text-[#F4F6FA] font-medium rounded-tr-xs border border-[#344B65]'
                      : 'bg-[#203650] border border-[#344B65] text-[#F4F6FA] rounded-tl-xs'
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
      <form onSubmit={handleSend} className="p-3 border-t border-[#344B65] bg-[#172840]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            maxLength={300}
            className="flex-1 bg-[#101B2D] border border-[#344B65] rounded-xl px-3 py-2 text-xs text-[#F4F6FA] placeholder-[#B0BED0]/50 focus:outline-none focus:border-[#3DBB83]"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-8 h-8 rounded-xl bg-[#3DBB83] hover:bg-[#2A9B6A] disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all shrink-0 shadow-sm"
          >
            <Send className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </form>
    </div>
  );
};
