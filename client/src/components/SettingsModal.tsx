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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A111D]/80 backdrop-blur-md">
      <div className="bg-[#203650] max-w-md w-full rounded-2xl p-6 sm:p-7 border border-[#344B65] shadow-2xl relative text-[#F4F6FA]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#B0BED0] hover:text-[#F4F6FA] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#172840] text-[#F3C969] border border-[#344B65] flex items-center justify-center">
            <Settings className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-heading font-bold uppercase tracking-wide text-base text-[#F4F6FA]">Audio & House Rules</h3>
            <p className="text-xs text-[#B0BED0]">Personal settings and room parameters</p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          {/* Audio setting */}
          <div className="bg-[#172840] border border-[#344B65] rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isMuted ? <VolumeX className="w-5 h-5 text-[#E85D5D]" /> : <Volume2 className="w-5 h-5 text-[#3DBB83]" />}
              <div>
                <span className="font-heading font-bold uppercase text-[#F4F6FA] block">Synthesized Audio Effects</span>
                <span className="text-[11px] text-[#B0BED0]">Countdown beeps, gavel strike & auction sounds</span>
              </div>
            </div>

            <button
              onClick={handleToggleSound}
              className={`px-4 py-1.5 rounded-full font-heading font-bold uppercase tracking-wider text-xs transition-all ${
                isMuted ? 'bg-[#203650] text-[#B0BED0] border border-[#344B65]' : 'bg-[#3DBB83] text-white shadow-sm'
              }`}
            >
              {isMuted ? 'MUTED' : 'ENABLED'}
            </button>
          </div>

          {/* Current House Rules */}
          <div className="bg-[#172840] border border-[#344B65] rounded-xl p-4 space-y-2">
            <span className="font-heading font-bold uppercase text-[#F4F6FA] block mb-1">Active Room Rules</span>
            <div className="flex justify-between py-1.5 border-b border-[#344B65] text-[#F4F6FA]">
              <span className="text-[#B0BED0]">Starting Purse:</span>
              <span className="font-number font-bold text-[#3DBB83]">₹{(settings.startingPurse / 10000000).toFixed(0)} Crore</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#344B65] text-[#F4F6FA]">
              <span className="text-[#B0BED0]">Timer Duration:</span>
              <span className="font-number font-bold text-[#F3C969]">{settings.timerDuration} Seconds</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#344B65] text-[#F4F6FA]">
              <span className="text-[#B0BED0]">Squad Range:</span>
              <span className="font-number text-[#F4F6FA]">{settings.minSquad} - {settings.maxSquad} players</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#344B65] text-[#F4F6FA]">
              <span className="text-[#B0BED0]">Max Overseas:</span>
              <span className="font-number text-[#F4F6FA]">{settings.maxOverseas} players</span>
            </div>
            <div className="flex justify-between py-1.5 text-[#F4F6FA]">
              <span className="text-[#B0BED0]">Min Bid Increment:</span>
              <span className="font-number text-[#F4F6FA]">₹{(settings.minBidIncrement / 100000).toFixed(0)} Lakh</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-3 px-4 rounded-xl bg-[#2858A5] hover:bg-[#1D4280] text-white text-xs font-heading font-bold uppercase tracking-wider transition-all shadow-md"
        >
          Close Settings
        </button>
      </div>
    </div>
  );
};
