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
    <div className="fixed sm:absolute right-0 top-14 bottom-0 z-40 w-full sm:w-80 md:w-88 bg-[#0D0D0D] border-l border-[#262626] shadow-2xl flex flex-col animate-slideLeft">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-[#262626] flex items-center justify-between bg-[#121212]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#00E676]/10 text-[#00E676] flex items-center justify-center border border-[#00E676]/30">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-xs text-white">Live Room Chat</h3>
            <p className="text-[10px] text-[#8E8E93]">Real-time banter & strategy</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-[#181818] hover:bg-[#222222] text-[#8E8E93] hover:text-white flex items-center justify-center transition-colors"
          title="Close Chat"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[#8E8E93]">
            <MessageSquare className="w-8 h-8 text-[#262626] mb-2" />
            <p className="text-xs font-semibold text-slate-300">No messages yet</p>
            <p className="text-[11px] text-[#8E8E93] mt-0.5">
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
                    <span className="font-bold text-[10px] text-white">
                      {franchise.shortName}
                    </span>
                  )}
                  <span className={`font-semibold ${isMe ? 'text-[#00E676]' : 'text-slate-300'}`}>
                    {msg.senderName} {isMe && '(You)'}
                  </span>
                  <span className="text-[#8E8E93] font-mono text-[9px]">{timeStr}</span>
                </div>

                {/* Message bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs break-words leading-relaxed ${
                    isMe
                      ? 'bg-[#00E676] text-black font-medium rounded-tr-sm'
                      : 'bg-[#181818] border border-[#262626] text-white rounded-tl-sm'
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
      <form onSubmit={handleSend} className="p-3 border-t border-[#262626] bg-[#121212]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            maxLength={300}
            className="flex-1 bg-[#181818] border border-[#262626] rounded-xl px-3 py-2 text-xs text-white placeholder-[#8E8E93] focus:outline-none focus:border-[#00E676]"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-8 h-8 rounded-xl bg-[#00E676] hover:bg-[#00c966] disabled:opacity-30 disabled:cursor-not-allowed text-black flex items-center justify-center transition-all shrink-0 shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};

