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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md selection:bg-[#C8FF45] selection:text-black">
      <div className="bg-[#141F33] max-w-md w-full rounded-3xl p-6 sm:p-7 border border-[#26354D] shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#9BAAC0] hover:text-[#F4F7FC] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-[#C8FF45]/10 text-[#C8FF45] border border-[#C8FF45]/30 flex items-center justify-center">
            <Settings className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-heading font-black uppercase tracking-wide text-base text-[#F4F7FC]">Audio & House Rules</h3>
            <p className="text-xs text-[#9BAAC0]">Personal settings and room parameters</p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          {/* Audio setting */}
          <div className="bg-[#0E1626] border border-[#26354D] rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isMuted ? <VolumeX className="w-5 h-5 text-[#FF647C]" /> : <Volume2 className="w-5 h-5 text-[#C8FF45]" />}
              <div>
                <span className="font-heading font-bold uppercase text-[#F4F7FC] block">Synthesized Audio Effects</span>
                <span className="text-[11px] text-[#9BAAC0]">Countdown beeps, gavel strike & auction sounds</span>
              </div>
            </div>

            <button
              onClick={handleToggleSound}
              className={`px-4 py-1.5 rounded-full font-heading font-black uppercase tracking-wider text-xs transition-all ${
                isMuted ? 'bg-[#141F33] text-[#9BAAC0] border border-[#26354D]' : 'bg-[#C8FF45] text-black shadow-glow-lime'
              }`}
            >
              {isMuted ? 'MUTED' : 'ENABLED'}
            </button>
          </div>

          {/* Current House Rules */}
          <div className="bg-[#0E1626] border border-[#26354D] rounded-2xl p-4 space-y-2">
            <span className="font-heading font-black uppercase text-[#F4F7FC] block mb-1">Active Room Rules</span>
            <div className="flex justify-between py-1.5 border-b border-[#26354D] text-[#F4F7FC]">
              <span className="text-[#9BAAC0]">Starting Purse:</span>
              <span className="font-number font-black text-[#C8FF45]">₹{(settings.startingPurse / 10000000).toFixed(0)} Crore</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#26354D] text-[#F4F7FC]">
              <span className="text-[#9BAAC0]">Timer Duration:</span>
              <span className="font-number font-black text-[#FFC857]">{settings.timerDuration} Seconds</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#26354D] text-[#F4F7FC]">
              <span className="text-[#9BAAC0]">Squad Range:</span>
              <span className="font-number text-[#F4F7FC]">{settings.minSquad} - {settings.maxSquad} players</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#26354D] text-[#F4F7FC]">
              <span className="text-[#9BAAC0]">Max Overseas:</span>
              <span className="font-number text-[#F4F7FC]">{settings.maxOverseas} players</span>
            </div>
            <div className="flex justify-between py-1.5 text-[#F4F7FC]">
              <span className="text-[#9BAAC0]">Min Bid Increment:</span>
              <span className="font-number text-[#F4F7FC]">₹{(settings.minBidIncrement / 100000).toFixed(0)} Lakh</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-3 px-4 rounded-xl bg-[#0E1626] hover:bg-[#1B2942] text-[#F4F7FC] text-xs font-heading font-bold uppercase tracking-wider border border-[#26354D] transition-all"
        >
          Close Settings
        </button>
      </div>
    </div>
  );
};
