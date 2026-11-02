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
    <div className="fixed sm:absolute right-0 top-14 bottom-0 z-40 w-full sm:w-80 md:w-88 bg-[#0E1626] border-l border-[#26354D] shadow-2xl flex flex-col animate-slideLeft selection:bg-[#C8FF45] selection:text-black">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-[#26354D] flex items-center justify-between bg-[#141F33]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#C8FF45]/10 text-[#C8FF45] flex items-center justify-center border border-[#C8FF45]/30">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-heading font-black text-xs uppercase tracking-wider text-[#F4F7FC]">Live Room Chat</h3>
            <p className="text-[10px] text-[#9BAAC0]">Real-time banter & strategy</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-[#0E1626] hover:bg-[#1B2942] border border-[#26354D] text-[#9BAAC0] hover:text-[#F4F7FC] flex items-center justify-center transition-colors"
          title="Close Chat"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[#9BAAC0]">
            <MessageSquare className="w-8 h-8 text-[#26354D] mb-2" />
            <p className="text-xs font-heading font-bold uppercase text-[#F4F7FC]">No messages yet</p>
            <p className="text-[11px] text-[#9BAAC0] mt-0.5">
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
                    <span className="font-heading font-black uppercase text-[10px] text-[#F4F7FC]">
                      {franchise.shortName}
                    </span>
                  )}
                  <span className={`font-heading font-bold uppercase ${isMe ? 'text-[#C8FF45]' : 'text-[#9BAAC0]'}`}>
                    {msg.senderName} {isMe && '(You)'}
                  </span>
                  <span className="text-[#9BAAC0]/60 font-number text-[9px]">{timeStr}</span>
                </div>

                {/* Message bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs break-words leading-relaxed ${
                    isMe
                      ? 'bg-[#C8FF45] text-black font-semibold rounded-tr-sm shadow-sm'
                      : 'bg-[#141F33] border border-[#26354D] text-[#F4F7FC] rounded-tl-sm'
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
      <form onSubmit={handleSend} className="p-3 border-t border-[#26354D] bg-[#141F33]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            maxLength={300}
            className="flex-1 bg-[#0E1626] border border-[#26354D] rounded-xl px-3 py-2 text-xs text-[#F4F7FC] placeholder-[#54627A] focus:outline-none focus:border-[#C8FF45]"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-8 h-8 rounded-xl bg-[#C8FF45] hover:bg-[#B0E635] disabled:opacity-30 disabled:cursor-not-allowed text-black flex items-center justify-center transition-all shrink-0 shadow-glow-lime"
          >
            <Send className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </form>
    </div>
  );
};

