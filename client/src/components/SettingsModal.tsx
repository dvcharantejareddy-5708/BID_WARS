import React, { useState } from 'react';
import { Settings, Volume2, VolumeX, X } from 'lucide-react';
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
  isOpen,
  onClose
}) => {
  const [isMuted, setIsMuted] = useState(soundManager.isMuted);

  if (!isOpen) return null;

  const handleToggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0B14]/80 backdrop-blur-md animate-fadeIn font-body">
      <div className="bg-[#12142A] max-w-md w-full rounded-3xl p-6 sm:p-8 border border-[#23274D] shadow-2xl relative text-white">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#9E9EB8] hover:text-white transition-colors p-1.5 rounded-xl hover:bg-[#181B38]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#0A0B14] text-[#C8FF3D] border border-[#23274D] flex items-center justify-center shadow-sm">
            <Settings className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-heading font-black uppercase tracking-tight text-lg text-white">Settings & Rules</h3>
            <p className="text-xs text-[#9E9EB8]">Audio controls and room parameters</p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          {/* Audio setting */}
          <div className="bg-[#0A0B14] border border-[#23274D] rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isMuted ? <VolumeX className="w-5 h-5 text-[#FF3B5C]" /> : <Volume2 className="w-5 h-5 text-[#C8FF3D]" />}
              <div>
                <span className="font-heading font-bold uppercase text-white block">Sound Effects</span>
                <span className="text-[11px] text-[#9E9EB8]">Clock ticks, gavel strikes & speech</span>
              </div>
            </div>

            <button
              onClick={handleToggleSound}
              className={`px-4 py-2 rounded-xl font-heading font-extrabold uppercase tracking-wider text-xs transition-all ${
                isMuted ? 'bg-[#181B38] text-[#9E9EB8] border border-[#23274D]' : 'bg-[#C8FF3D] text-[#0A0B14] shadow-[0_0_15px_rgba(200,255,61,0.3)]'
              }`}
            >
              {isMuted ? 'MUTED' : 'ENABLED'}
            </button>
          </div>

          {/* Current House Rules */}
          <div className="bg-[#0A0B14] border border-[#23274D] rounded-2xl p-4 space-y-2.5">
            <span className="font-heading font-black uppercase text-white block mb-1">Active Room Rules</span>
            <div className="flex justify-between py-1.5 border-b border-[#23274D] text-white">
              <span className="text-[#9E9EB8]">Starting Purse:</span>
              <span className="font-number font-extrabold text-[#FFC93D]">₹{(settings.startingPurse / 10000000).toFixed(0)} Crore</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#23274D] text-white">
              <span className="text-[#9E9EB8]">Timer Per Lot:</span>
              <span className="font-number font-extrabold text-[#C8FF3D]">{settings.timerDuration} Seconds</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#23274D] text-white">
              <span className="text-[#9E9EB8]">Squad Range:</span>
              <span className="font-number text-white">{settings.minSquad} - {settings.maxSquad} players</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#23274D] text-white">
              <span className="text-[#9E9EB8]">Max Overseas:</span>
              <span className="font-number text-white">{settings.maxOverseas} players</span>
            </div>
            <div className="flex justify-between py-1.5 text-white">
              <span className="text-[#9E9EB8]">Min Bid Increment:</span>
              <span className="font-number text-white">₹{(settings.minBidIncrement / 100000).toFixed(0)} Lakh</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-3.5 px-4 rounded-xl bg-[#C8FF3D] hover:bg-[#B5F522] text-[#0A0B14] text-xs font-heading font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(200,255,61,0.3)]"
        >
          Close Settings
        </button>
      </div>
    </div>
  );
};
