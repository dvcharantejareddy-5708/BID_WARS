import React, { useState } from 'react';
import { Settings, Volume2, VolumeX, Eye, Shield, X, Sliders } from 'lucide-react';
import { RoomSettings } from '../types.js';
import { soundManager } from '../services/audio.js';

interface SettingsModalProps {
  settings: RoomSettings;
  isHost: boolean;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSettings?: (newSettings: Partial<RoomSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  isHost,
  isOpen,
  onClose,
  onUpdateSettings
}) => {
  const [isMuted, setIsMuted] = useState(soundManager.isMuted);

  if (!isOpen) return null;

  const handleToggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0D0D0D] max-w-md w-full rounded-3xl p-6 sm:p-7 border border-[#262626] shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#8E8E93] hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/30 flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-white">Audio & House Rules</h3>
            <p className="text-xs text-[#8E8E93]">Personal settings and room parameters</p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          {/* Audio setting */}
          <div className="bg-[#151515] border border-[#262626] rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isMuted ? <VolumeX className="w-5 h-5 text-[#FF5252]" /> : <Volume2 className="w-5 h-5 text-[#00E676]" />}
              <div>
                <span className="font-bold text-white block">Synthesized Audio Effects</span>
                <span className="text-[11px] text-[#8E8E93]">Countdown beeps, gavel strike & auction sounds</span>
              </div>
            </div>

            <button
              onClick={handleToggleSound}
              className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all ${
                isMuted ? 'bg-[#202020] text-[#8E8E93] border border-[#262626]' : 'bg-[#00E676] text-black shadow-md'
              }`}
            >
              {isMuted ? 'MUTED' : 'ENABLED'}
            </button>
          </div>

          {/* Current House Rules */}
          <div className="bg-[#151515] border border-[#262626] rounded-2xl p-4 space-y-2">
            <span className="font-bold text-white block mb-1">Active Room Rules</span>
            <div className="flex justify-between py-1.5 border-b border-[#262626] text-slate-300">
              <span className="text-[#8E8E93]">Starting Purse:</span>
              <span className="font-mono font-bold text-[#00E676]">₹{(settings.startingPurse / 10000000).toFixed(0)} Crore</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#262626] text-slate-300">
              <span className="text-[#8E8E93]">Timer Duration:</span>
              <span className="font-mono font-bold text-[#FFC857]">{settings.timerDuration} Seconds</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#262626] text-slate-300">
              <span className="text-[#8E8E93]">Squad Range:</span>
              <span className="font-mono text-white">{settings.minSquad} - {settings.maxSquad} players</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#262626] text-slate-300">
              <span className="text-[#8E8E93]">Max Overseas:</span>
              <span className="font-mono text-white">{settings.maxOverseas} players</span>
            </div>
            <div className="flex justify-between py-1.5 text-slate-300">
              <span className="text-[#8E8E93]">Min Bid Increment:</span>
              <span className="font-mono text-white">₹{(settings.minBidIncrement / 100000).toFixed(0)} Lakh</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-3 px-4 rounded-full bg-[#151515] hover:bg-[#202020] text-slate-200 text-xs font-semibold border border-[#262626] transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
};
