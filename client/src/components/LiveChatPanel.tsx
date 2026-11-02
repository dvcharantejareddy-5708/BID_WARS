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
    <div className="fixed sm:absolute right-0 top-14 bottom-0 z-40 w-full sm:w-80 md:w-88 bg-white border-l border-[#D8D8D1] shadow-2xl flex flex-col animate-slideLeft selection:bg-[#E6EDF8] selection:text-[#173B78]">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-blue-900 flex items-center justify-between bg-[#173B78] text-white">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/10 text-[#F0C65B] flex items-center justify-center border border-white/20">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-heading font-black text-xs uppercase tracking-wider text-white">Live Room Chat</h3>
            <p className="text-[10px] text-blue-200">Real-time banter & strategy</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-colors"
          title="Close Chat"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#F3F0E8]/40">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[#647084]">
            <MessageSquare className="w-8 h-8 text-[#D8D8D1] mb-2" />
            <p className="text-xs font-heading font-bold uppercase text-[#18243A]">No messages yet</p>
            <p className="text-[11px] text-[#647084] mt-0.5">
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
                    <span className="font-heading font-black uppercase text-[10px] text-[#18243A]">
                      {franchise.shortName}
                    </span>
                  )}
                  <span className={`font-heading font-bold uppercase ${isMe ? 'text-[#176B48]' : 'text-[#647084]'}`}>
                    {msg.senderName} {isMe && '(You)'}
                  </span>
                  <span className="text-[#647084]/80 font-number text-[9px]">{timeStr}</span>
                </div>

                {/* Message bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs break-words leading-relaxed shadow-xs ${
                    isMe
                      ? 'bg-[#173B78] text-white font-medium rounded-tr-xs'
                      : 'bg-white border border-[#D8D8D1] text-[#18243A] rounded-tl-xs'
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
      <form onSubmit={handleSend} className="p-3 border-t border-[#D8D8D1] bg-white">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            maxLength={300}
            className="flex-1 bg-[#F3F0E8] border border-[#D8D8D1] rounded-xl px-3 py-2 text-xs text-[#18243A] placeholder-[#647084] focus:outline-none focus:border-[#173B78] focus:bg-white"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-8 h-8 rounded-xl bg-[#176B48] hover:bg-[#125638] disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all shrink-0 shadow-sm"
          >
            <Send className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </form>
    </div>
  );
};

