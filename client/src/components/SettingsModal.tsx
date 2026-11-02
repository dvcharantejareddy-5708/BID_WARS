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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18243A]/75 backdrop-blur-sm">
      <div className="bg-white max-w-md w-full rounded-2xl p-6 sm:p-7 border border-[#D8D8D1] shadow-2xl relative text-[#18243A]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#647084] hover:text-[#18243A] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#E6EDF8] text-[#173B78] border border-[#D8D8D1] flex items-center justify-center">
            <Settings className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-heading font-bold uppercase tracking-wide text-base text-[#18243A]">Audio & House Rules</h3>
            <p className="text-xs text-[#647084]">Personal settings and room parameters</p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          {/* Audio setting */}
          <div className="bg-[#F3F0E8] border border-[#D8D8D1] rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isMuted ? <VolumeX className="w-5 h-5 text-[#C74444]" /> : <Volume2 className="w-5 h-5 text-[#176B48]" />}
              <div>
                <span className="font-heading font-bold uppercase text-[#18243A] block">Synthesized Audio Effects</span>
                <span className="text-[11px] text-[#647084]">Countdown beeps, gavel strike & auction sounds</span>
              </div>
            </div>

            <button
              onClick={handleToggleSound}
              className={`px-4 py-1.5 rounded-full font-heading font-bold uppercase tracking-wider text-xs transition-all ${
                isMuted ? 'bg-[#E6EDF8] text-[#647084] border border-[#D8D8D1]' : 'bg-[#176B48] text-white shadow-sm'
              }`}
            >
              {isMuted ? 'MUTED' : 'ENABLED'}
            </button>
          </div>

          {/* Current House Rules */}
          <div className="bg-[#F3F0E8] border border-[#D8D8D1] rounded-xl p-4 space-y-2">
            <span className="font-heading font-bold uppercase text-[#18243A] block mb-1">Active Room Rules</span>
            <div className="flex justify-between py-1.5 border-b border-[#D8D8D1] text-[#18243A]">
              <span className="text-[#647084]">Starting Purse:</span>
              <span className="font-number font-bold text-[#176B48]">₹{(settings.startingPurse / 10000000).toFixed(0)} Crore</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#D8D8D1] text-[#18243A]">
              <span className="text-[#647084]">Timer Duration:</span>
              <span className="font-number font-bold text-[#173B78]">{settings.timerDuration} Seconds</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#D8D8D1] text-[#18243A]">
              <span className="text-[#647084]">Squad Range:</span>
              <span className="font-number text-[#18243A]">{settings.minSquad} - {settings.maxSquad} players</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#D8D8D1] text-[#18243A]">
              <span className="text-[#647084]">Max Overseas:</span>
              <span className="font-number text-[#18243A]">{settings.maxOverseas} players</span>
            </div>
            <div className="flex justify-between py-1.5 text-[#18243A]">
              <span className="text-[#647084]">Min Bid Increment:</span>
              <span className="font-number text-[#18243A]">₹{(settings.minBidIncrement / 100000).toFixed(0)} Lakh</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-3 px-4 rounded-xl bg-[#173B78] hover:bg-[#122E5E] text-white text-xs font-heading font-bold uppercase tracking-wider transition-all shadow-md"
        >
          Close Settings
        </button>
      </div>
    </div>
  );
};
