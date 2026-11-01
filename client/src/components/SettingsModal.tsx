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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="glass-panel max-w-md w-full rounded-2xl p-6 border border-navy-600/70 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-cyan-400/20 text-cyan-300 flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-white">Audio & Preferences</h3>
            <p className="text-xs text-slate-400">Personal settings and house rules</p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          {/* Audio setting */}
          <div className="bg-navy-900/90 border border-navy-800 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {isMuted ? <VolumeX className="w-4 h-4 text-ruby-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
              <div>
                <span className="font-bold text-white block">Synthesized Audio Effects</span>
                <span className="text-[11px] text-slate-400">Countdown beeps, gavel strike & auction sounds</span>
              </div>
            </div>

            <button
              onClick={handleToggleSound}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                isMuted ? 'bg-navy-800 text-slate-400 border border-navy-700' : 'bg-cyan-400 text-black shadow-glow-cyan'
              }`}
            >
              {isMuted ? 'MUTED' : 'ENABLED'}
            </button>
          </div>

          {/* Current House Rules */}
          <div className="bg-navy-900/90 border border-navy-800 rounded-xl p-3.5 space-y-2">
            <span className="font-bold text-white block mb-1">Active House Rules</span>
            <div className="flex justify-between py-1 border-b border-navy-800 text-slate-300">
              <span className="text-slate-400">Starting Purse:</span>
              <span className="font-mono font-bold text-cyan-300">₹{(settings.startingPurse / 10000000).toFixed(0)} Crore</span>
            </div>
            <div className="flex justify-between py-1 border-b border-navy-800 text-slate-300">
              <span className="text-slate-400">Timer Duration:</span>
              <span className="font-mono font-bold text-amber-300">{settings.timerDuration} Seconds</span>
            </div>
            <div className="flex justify-between py-1 border-b border-navy-800 text-slate-300">
              <span className="text-slate-400">Min Squad Target:</span>
              <span className="font-mono text-white">{settings.minSquad} players</span>
            </div>
            <div className="flex justify-between py-1 border-b border-navy-800 text-slate-300">
              <span className="text-slate-400">Max Overseas:</span>
              <span className="font-mono text-white">{settings.maxOverseas} players</span>
            </div>
            <div className="flex justify-between py-1 text-slate-300">
              <span className="text-slate-400">Min Bid Increment:</span>
              <span className="font-mono text-white">₹{(settings.minBidIncrement / 100000).toFixed(0)} Lakh</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-2.5 px-4 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-200 text-xs font-semibold border border-navy-600"
        >
          Done
        </button>
      </div>
    </div>
  );
};
