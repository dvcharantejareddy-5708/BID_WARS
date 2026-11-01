// Self-contained Web Audio API Sound Synthesizer for BID WARS

class SoundManager {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;

  constructor() {
    // Check localStorage for saved mute preference
    const saved = localStorage.getItem('bid_wars_muted');
    if (saved !== null) {
      this.isMuted = saved === 'true';
    }
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private activeAnnouncementText: string | null = null;
  private activeAnnouncementCallback: (() => void) | null = null;
  private speechKeepAliveInterval: any = null;

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('bid_wars_muted', String(this.isMuted));
    if (this.isMuted) {
      this.stopSpeech();
      if (this.activeAnnouncementCallback) {
        const cb = this.activeAnnouncementCallback;
        this.activeAnnouncementCallback = null;
        this.activeAnnouncementText = null;
        cb();
      }
    }
    return this.isMuted;
  }

  /**
   * Stop speech synthesis only when explicitly called (e.g. user toggles mute)
   */
  public stopSpeech() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (this.speechKeepAliveInterval) {
          clearInterval(this.speechKeepAliveInterval);
          this.speechKeepAliveInterval = null;
        }
        window.speechSynthesis.cancel();
      } catch {}
    }
  }

  /**
   * Authoritative Voice Announcement on confirmed sale:
   * “[Player Name] sold to [Team Abbreviation] for [Final Price]!”
   * Example: “Steve Smith sold to RCB for 12 crores!”
   * Awaits completion (onend) naturally without arbitrary timeouts.
   */
  public speakSoldAnnouncement(
    playerName: string, 
    teamAbbreviation: string, 
    priceDisplay: string,
    onComplete?: () => void
  ) {
    if (this.isMuted) {
      onComplete?.();
      return;
    }
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onComplete?.();
      return;
    }

    const text = `${playerName} sold to ${teamAbbreviation} for ${priceDisplay}!`;

    // Prevent duplicate triggers if identical speech is already actively playing
    if (this.activeAnnouncementText === text && window.speechSynthesis.speaking) {
      if (onComplete) {
        this.activeAnnouncementCallback = onComplete;
      }
      return;
    }

    try {
      if (this.speechKeepAliveInterval) {
        clearInterval(this.speechKeepAliveInterval);
        this.speechKeepAliveInterval = null;
      }

      this.activeAnnouncementText = text;
      this.activeAnnouncementCallback = onComplete || null;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0; // natural, clear pacing
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Select preferred natural English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => 
        v.lang.startsWith('en') && (
          v.name.includes('Natural') || 
          v.name.includes('India') || 
          v.name.includes('Google') || 
          v.name.includes('Guy') ||
          v.name.includes('David')
        )
      );
      if (preferred) {
        utterance.voice = preferred;
      }

      // CRITICAL FIX FOR CHROMIUM: Store in global & instance scope so Chrome GC doesn't drop utterance mid-speech!
      (window as any).__soldUtterance = utterance;

      let completed = false;
      let failsafeTimer: any = null;

      const handleDone = (source: string) => {
        if (!completed) {
          completed = true;
          if (failsafeTimer) clearTimeout(failsafeTimer);
          if (this.speechKeepAliveInterval) {
            clearInterval(this.speechKeepAliveInterval);
            this.speechKeepAliveInterval = null;
          }
          (window as any).__soldUtterance = null;
          this.activeAnnouncementText = null;

          const cb = this.activeAnnouncementCallback;
          this.activeAnnouncementCallback = null;
          cb?.();
        }
      };

      utterance.onend = () => {
        handleDone('onend');
      };

      utterance.onerror = (e) => {
        console.warn('Speech synthesis ended with error or cancel:', e);
        handleDone('onerror');
      };

      // Failsafe safety fallback (20s): solely protects against browser engine crashes
      failsafeTimer = setTimeout(() => {
        handleDone('failsafe');
      }, 20000);

      // Chromium keep-alive interval: Chrome can pause speech longer than 2.5s without this
      this.speechKeepAliveInterval = setInterval(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        } else {
          if (this.speechKeepAliveInterval) {
            clearInterval(this.speechKeepAliveInterval);
            this.speechKeepAliveInterval = null;
          }
        }
      }, 1000);

      // Start speaking immediately
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis exception:', e);
      this.activeAnnouncementText = null;
      this.activeAnnouncementCallback = null;
      onComplete?.();
    }
  }

  /**
   * Countdown tick:
   * Crisp digital beep for the final 5 seconds.
   * Higher pitch for <2 seconds.
   */
  public playCountdownTick(secondsLeft: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const freq = secondsLeft <= 2 ? 880 : 587.33; // A5 or D5
      osc.type = secondsLeft <= 2 ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch {
      // AudioContext may be blocked before interaction
    }
  }

  /**
   * Bid placed sound:
   * Metallic coin/bell sound.
   */
  public playBidSound() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(987.77, now); // B5
      osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.15); // E6

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1975.53, now);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.25);
      osc2.stop(now + 0.25);
    } catch {}
  }

  /**
   * Sold gavel sound:
   * Deep thud + wood resonance + celebratory chord.
   */
  public playSoldGavel() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Gavel strike (filtered noise + low pulse)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);

      // Chime chord: C5 - E5 - G5 - C6
      const chordNotes = [523.25, 659.25, 783.99, 1046.50];
      chordNotes.forEach((freq, idx) => {
        const o = this.ctx!.createOscillator();
        const g = this.ctx!.createGain();
        const noteStart = now + 0.08 + (idx * 0.06);

        o.type = 'sine';
        o.frequency.setValueAtTime(freq, noteStart);

        g.gain.setValueAtTime(0.1, noteStart);
        g.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.6);

        o.connect(g);
        g.connect(this.ctx!.destination);

        o.start(noteStart);
        o.stop(noteStart + 0.6);
      });
    } catch {}
  }

  /**
   * Unsold sound:
   * Downward referee whistle / neutral buzzer.
   */
  public playUnsoldSound() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.4);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch {}
  }

  /**
   * Error / Illegal Action thud
   */
  public playErrorSound() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(150, now);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {}
  }
}

export const soundManager = new SoundManager();

/**
 * Format numeric INR into clear spoken currency for auction announcement
 * Example:
 * 120000000 -> "12 crores"
 * 80000000 -> "8 crores"
 * 50000000 -> "5 crores"
 * 15000000 -> "1.5 crores"
 * 5000000 -> "50 lakhs"
 */
export function formatPriceForSpeech(priceInr: number): string {
  if (priceInr >= 10000000) {
    const cr = priceInr / 10000000;
    const formatted = cr % 1 === 0 ? cr.toString() : cr.toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1');
    return `${formatted} ${cr === 1 ? 'crore' : 'crores'}`;
  }
  const lakh = priceInr / 100000;
  const formatted = lakh % 1 === 0 ? lakh.toString() : lakh.toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1');
  return `${formatted} ${lakh === 1 ? 'lakh' : 'lakhs'}`;
}


