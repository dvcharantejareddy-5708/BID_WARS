import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Trophy,
  Users,
  Clock,
  Lock,
  Eye,
  EyeOff,
  Radio,
  ArrowRight,
  Sparkles,
  Shield,
  Flame,
  X,
  CheckCircle2,
  TrendingUp,
  Zap,
  Menu,
  LogOut,
  User,
  RotateCcw,
  Volume2,
  VolumeX,
  ChevronDown
} from 'lucide-react';
import { RoomSettings } from '../types.js';
import { BidWarsLogo } from './BidWarsLogo.js';
import { CoinsIcon, GavelIcon, TrophyIcon as TrophyBrandIcon, PlayerIcon } from './BrandIcons.js';
import { authService, AuthUser } from '../services/auth.js';
import { AuthModal } from './auth/AuthModal.js';
import { CustomCursor } from './CustomCursor.js';

interface LandingPageProps {
  onCreateRoom: (nickname: string, settings: Partial<RoomSettings>) => void;
  onJoinRoom: (roomCode: string, password?: string) => void;
  onSwitchToTournament?: () => void;
  isLoading: boolean;
}

// All 10 official franchise teams for the squad orbit
const FRANCHISE_LOGOS = [
  { id: 'CSK', name: 'Chennai Super Kings', src: '/logos/csk.jpg', color: '#F9CD05' },
  { id: 'MI', name: 'Mumbai Indians', src: '/logos/mi.jpg', color: '#004BA0' },
  { id: 'RCB', name: 'Royal Challengers Bengaluru', src: '/logos/rcb.png', color: '#EC1C24' },
  { id: 'KKR', name: 'Kolkata Knight Riders', src: '/logos/kkr.jpg', color: '#3A225D' },
  { id: 'GT', name: 'Gujarat Titans', src: '/logos/gt.jpg', color: '#1B2133' },
  { id: 'LSG', name: 'Lucknow Super Giants', src: '/logos/lsg.webp', color: '#A72056' },
  { id: 'DC', name: 'Delhi Capitals', src: '/logos/dc.jpg', color: '#00008B' },
  { id: 'RR', name: 'Rajasthan Royals', src: '/logos/rr.png', color: '#EA1A85' },
  { id: 'SRH', name: 'Sunrisers Hyderabad', src: '/logos/srh.jpeg', color: '#F26522' },
  { id: 'PBKS', name: 'Punjab Kings', src: '/logos/pbks.jpeg', color: '#DD1F2D' }
];

// Helper for cubic-bezier interpolation
function cubicBezier(p1x: number, p1y: number, p2x: number, p2y: number) {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;

  function sampleCurveX(t: number) {
    return ((ax * t + bx) * t + cx) * t;
  }
  function sampleCurveY(t: number) {
    return ((ay * t + by) * t + cy) * t;
  }
  function solveCurveX(x: number) {
    let t0 = 0;
    let t1 = 1;
    let t2 = x;
    for (let i = 0; i < 8; i++) {
      const x2 = sampleCurveX(t2) - x;
      if (Math.abs(x2) < 1e-4) return sampleCurveY(t2);
      const d2 = (3 * ax * t2 + 2 * bx) * t2 + cx;
      if (Math.abs(d2) < 1e-4) break;
      t2 -= x2 / d2;
    }
    while (t0 < t1) {
      const x2 = sampleCurveX(t2);
      if (Math.abs(x2 - x) < 1e-4) return sampleCurveY(t2);
      if (x > x2) t0 = t2;
      else t1 = t2;
      t2 = (t1 - t0) * 0.5 + t0;
    }
    return sampleCurveY(t2);
  }
  return solveCurveX;
}

const easeDoors = cubicBezier(0.77, 0, 0.175, 1);
const easeLetters = cubicBezier(0.16, 1, 0.3, 1);
const easeForeground = cubicBezier(0.25, 1, 0.5, 1);

export const LandingPage: React.FC<LandingPageProps> = ({
  onCreateRoom,
  onJoinRoom,
  onSwitchToTournament,
  isLoading
}) => {
  // Navigation & Scroll
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(authService.getUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  // Modals & Panels
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // Quick Auction Form State
  const [hostNickname, setHostNickname] = useState('');
  const [roomName, setRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [season, setSeason] = useState<'2026' | '2025'>('2026');
  const [poolMode, setPoolMode] = useState<'auction_pool' | 'mega_all'>('auction_pool');
  const [timerDuration, setTimerDuration] = useState<number>(10);
  const [startingPurseCr, setStartingPurseCr] = useState<number>(120);
  const [playMode, setPlayMode] = useState<'friends_only' | 'friends_bots'>('friends_bots');
  const [botCount, setBotCount] = useState<number>(5);
  const [minBidIncrementLakh, setMinBidIncrementLakh] = useState<number>(20);

  // Join Room Form State
  const [joinCode, setJoinCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [showJoinPassword, setShowJoinPassword] = useState(false);

  // Interactive BidWars Auction Showcase Simulation State
  const [showcaseBid, setShowcaseBid] = useState(18.5);
  const [showcaseBidder, setShowcaseBidder] = useState('ROYAL CHALLENGERS');
  const [showcaseTimer, setShowcaseTimer] = useState(8);
  const [isBidJustRaised, setIsBidJustRaised] = useState(false);

  // Feature Section Interactive States
  const [activeRoleFilter, setActiveRoleFilter] = useState<'ALL' | 'BAT' | 'BOWL' | 'AR' | 'WK'>('ALL');
  const [selectedFranchiseOrbit, setSelectedFranchiseOrbit] = useState<string>('CSK');
  const [matchOverBalls, setMatchOverBalls] = useState<number[]>([1, 4, 0, 6, 2]);

  // =========================================================================
  // MASTER ANIMATION CLOCK (0.00s to 7.40s) — HARBORLUX CHOREOGRAPHY
  // =========================================================================
  const [timelineSec, setTimelineSec] = useState<number>(0);
  const [isIntroComplete, setIsIntroComplete] = useState<boolean>(false);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const startTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Check reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const triggerReplay = useCallback(() => {
    startTimeRef.current = null;
    setIsIntroComplete(false);
    setTimelineSec(0);
    setHasStarted(true);
  }, []);

  const skipIntro = useCallback(() => {
    setTimelineSec(7.4);
    setIsIntroComplete(true);
  }, []);

  // Main RAF timeline loop
  useEffect(() => {
    if (prefersReducedMotion) {
      setTimelineSec(7.4);
      setIsIntroComplete(true);
      return;
    }

    // Auto-start after a tiny mount delay for asset readiness
    const startTimer = setTimeout(() => {
      setHasStarted(true);
    }, 100);

    return () => clearTimeout(startTimer);
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!hasStarted || prefersReducedMotion) return;

    const animateTimeline = (now: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = now;
      }
      const elapsedSec = (now - startTimeRef.current) / 1000;

      if (elapsedSec >= 7.4) {
        setTimelineSec(7.4);
        setIsIntroComplete(true);
      } else {
        setTimelineSec(elapsedSec);
        animFrameRef.current = requestAnimationFrame(animateTimeline);
      }
    };

    animFrameRef.current = requestAnimationFrame(animateTimeline);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [hasStarted, prefersReducedMotion]);

  // Derived animation properties according to the exact Harborlux 7.4s timeline:
  // 1. Left door: 0.02s–1.13s (slides left from center seam)
  const leftDoorProgress = useMemo(() => {
    if (timelineSec < 0.02) return 0;
    if (timelineSec >= 1.13) return 1;
    const raw = (timelineSec - 0.02) / (1.13 - 0.02);
    return easeDoors(raw);
  }, [timelineSec]);

  // 2. Right door: 0.02s–1.24s (slides right from center seam)
  const rightDoorProgress = useMemo(() => {
    if (timelineSec < 0.02) return 0;
    if (timelineSec >= 1.24) return 1;
    const raw = (timelineSec - 0.02) / (1.24 - 0.02);
    return easeDoors(raw);
  }, [timelineSec]);

  // 3. Aerial still to wide camera transition: 1.25s–2.85s (zoom & pan down)
  const cameraZoomScale = useMemo(() => {
    if (timelineSec < 1.25) return 1.35;
    if (timelineSec >= 2.85) return 1.05;
    const p = (timelineSec - 1.25) / (2.85 - 1.25);
    return 1.35 - (1.35 - 1.05) * p;
  }, [timelineSec]);

  const cameraPanY = useMemo(() => {
    if (timelineSec < 1.25) return -7;
    if (timelineSec >= 2.85) return 0;
    const p = (timelineSec - 1.25) / (2.85 - 1.25);
    return -7 + 7 * p;
  }, [timelineSec]);

  // 4. Opening aerial crossfades into wide stadium composition: 2.45s–2.95s
  const aerialOpacity = useMemo(() => {
    if (timelineSec < 2.45) return 1;
    if (timelineSec >= 2.95) return 0;
    return 1 - (timelineSec - 2.45) / (2.95 - 2.45);
  }, [timelineSec]);

  const wideStadiumOpacity = useMemo(() => {
    if (timelineSec < 2.45) return 0;
    if (timelineSec >= 2.95) return 1;
    return (timelineSec - 2.45) / (2.95 - 2.45);
  }, [timelineSec]);

  // 5. Navigation: 2.45s–2.75s (fades in moving slightly downward)
  const navOpacity = useMemo(() => {
    if (timelineSec < 2.45) return 0;
    if (timelineSec >= 2.75) return 1;
    return (timelineSec - 2.45) / (2.75 - 2.45);
  }, [timelineSec]);

  const navTranslateY = useMemo(() => {
    if (timelineSec < 2.45) return -14;
    if (timelineSec >= 2.75) return 0;
    const p = (timelineSec - 2.45) / (2.75 - 2.45);
    return -14 * (1 - p);
  }, [timelineSec]);

  // 6. Kicker: 2.45s–3.10s (fades in and rises slightly)
  const kickerOpacity = useMemo(() => {
    if (timelineSec < 2.45) return 0;
    if (timelineSec >= 3.10) return 1;
    return (timelineSec - 2.45) / (3.10 - 2.45);
  }, [timelineSec]);

  const kickerTranslateY = useMemo(() => {
    if (timelineSec < 2.45) return 18;
    if (timelineSec >= 3.10) return 0;
    const p = (timelineSec - 2.45) / (3.10 - 2.45);
    return 18 * (1 - easeLetters(p));
  }, [timelineSec]);

  // 7. S Q U A D letters: reveal from left to right starting at 2.45s
  const letterTimings = useMemo(() => [
    { start: 2.45, end: 2.95 }, // S
    { start: 2.60, end: 3.10 }, // Q
    { start: 2.75, end: 3.25 }, // U
    { start: 2.90, end: 3.40 }, // A
    { start: 3.05, end: 3.55 }  // D
  ], []);

  const getLetterStyle = useCallback((index: number) => {
    const timing = letterTimings[index];
    if (timelineSec < timing.start) {
      return { opacity: 0, transform: 'translateY(42px)' };
    }
    if (timelineSec >= timing.end) {
      return { opacity: 1, transform: 'translateY(0px)' };
    }
    const raw = (timelineSec - timing.start) / (timing.end - timing.start);
    const eased = easeLetters(raw);
    return {
      opacity: eased,
      transform: `translateY(${42 * (1 - eased)}px)`
    };
  }, [timelineSec, letterTimings]);

  // 8. Top shade: 2.90s–3.70s (gradually darkens upper background)
  const topShadeOpacity = useMemo(() => {
    if (timelineSec < 2.90) return 0;
    if (timelineSec >= 3.70) return 0.85;
    const p = (timelineSec - 2.90) / (3.70 - 2.90);
    return 0.85 * p;
  }, [timelineSec]);

  // 9. Back layer: 2.90s–4.30s (moves upward by ~1.5%)
  const backLayerTranslateY = useMemo(() => {
    if (timelineSec < 2.90) return 1.5;
    if (timelineSec >= 4.30) return 0;
    const p = (timelineSec - 2.90) / (4.30 - 2.90);
    return 1.5 * (1 - p);
  }, [timelineSec]);

  // 10. Mid layer: 2.90s–4.60s (moves upward by ~4%, holds, then returns)
  const midLayerTranslateY = useMemo(() => {
    if (timelineSec < 2.90) return 0;
    if (timelineSec >= 4.60) return 0;
    const p = (timelineSec - 2.90) / (4.60 - 2.90);
    // Sine arc peaking at 3.75s (p = 0.5)
    return -4 * Math.sin(p * Math.PI);
  }, [timelineSec]);

  // 11. Headline rising into position: 3.00s–4.80s
  const headlineTranslateY = useMemo(() => {
    if (timelineSec < 3.00) return 22;
    if (timelineSec >= 4.80) return 0;
    const p = (timelineSec - 3.00) / (4.80 - 3.00);
    return 22 * (1 - easeLetters(p));
  }, [timelineSec]);

  // 12. Foreground subject: 3.35s–6.00s (rises from below) and 6.00s–7.30s (settles with overshoot)
  const foregroundStyle = useMemo(() => {
    if (timelineSec < 3.35) {
      return { opacity: 0, transform: 'translateY(110%)' };
    }
    if (timelineSec >= 7.30) {
      return { opacity: 1, transform: 'translateY(0%)' };
    }
    if (timelineSec < 6.00) {
      const p = (timelineSec - 3.35) / (6.00 - 3.35);
      const eased = easeForeground(p);
      const y = 110 - (110 - (-2)) * eased;
      return { opacity: Math.min(1, p * 1.5), transform: `translateY(${y}%)` };
    }
    // 6.00s to 7.30s: subtle settling from -2% down to 0%
    const p = (timelineSec - 6.00) / (7.30 - 6.00);
    const eased = easeLetters(p);
    const y = -2 + 2 * eased;
    return { opacity: 1, transform: `translateY(${y}%)` };
  }, [timelineSec]);

  // =========================================================================
  // CONTINUOUS ATMOSPHERIC LOOP (POST-7.4s PARTICLES & AMBIENT HAZE)
  // =========================================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Subtle golden stadium embers & light dust motes
    const particlesCount = 45;
    const particles = Array.from({ length: particlesCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.5,
      speedY: -(Math.random() * 0.4 + 0.1),
      speedX: (Math.random() - 0.5) * 0.25,
      opacity: Math.random() * 0.5 + 0.15,
      hue: Math.random() > 0.4 ? 'rgba(214,173,85,' : 'rgba(240,206,130,'
    }));

    let animId: number;
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        p.y += p.speedY;
        p.x += p.speedX;

        if (p.y < 0) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.hue}${p.opacity})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(214,173,85,0.4)';
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auth listener
  useEffect(() => {
    const unsub = authService.onAuthStateChange(u => {
      setCurrentUser(u);
    });
    return unsub;
  }, []);

  // Interactive showcase simulated timer
  useEffect(() => {
    const timer = setInterval(() => {
      setShowcaseTimer(prev => (prev > 1 ? prev - 1 : 10));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Quick auction form submission
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostNickname.trim()) return;

    onCreateRoom(hostNickname.trim(), {
      roomName: roomName.trim() || `${hostNickname.trim()}'s League Arena`,
      isPrivate,
      password: isPrivate ? password : '',
      season,
      poolMode,
      timerDuration,
      startingPurse: startingPurseCr * 10000000,
      playMode,
      botCount: playMode === 'friends_bots' ? botCount : 0,
      minBidIncrement: minBidIncrementLakh * 100000
    });
  };

  // Join room form submission
  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    onJoinRoom(joinCode.trim().toUpperCase(), joinPassword.trim() || undefined);
  };

  return (
    <div className="relative w-full min-h-screen bg-[#0B0B0C] text-[#F5F3ED] font-sans overflow-x-hidden selection:bg-[#D6AD55] selection:text-[#0B0B0C]">
      {/* Custom Mouse Cursor */}
      <CustomCursor />

      {/* =================================================================== */}
      {/* 1. PINNED VIEWPORT NAVIGATION (Fades in at 2.45s–2.75s)            */}
      {/* =================================================================== */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
          isScrolled
            ? 'bg-[#0B0B0C]/95 backdrop-blur-md border-b border-[#D6AD55]/20 shadow-[0_4px_24px_rgba(0,0,0,0.8)]'
            : 'bg-transparent'
        }`}
        style={{
          opacity: navOpacity,
          transform: `translateY(${navTranslateY}px)`,
          pointerEvents: timelineSec >= 2.45 ? 'auto' : 'none'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3 xl:gap-6">
          {/* Left: BidWars Logo & BIDWARS LEAGUE 2026 Edition Label */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            <BidWarsLogo size="sm" />
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#111111] border border-[#D6AD55]/30 text-[10px] font-mono text-[#D6AD55] font-semibold tracking-wider uppercase select-none whitespace-nowrap shrink-0">
              BIDWARS LEAGUE 2026
            </span>
          </div>

          {/* Center: Desktop Navigation Links (Single Line, No Wrapping) */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-7 text-xs font-semibold tracking-wider uppercase text-[#AAA69B] whitespace-nowrap">
            <a
              href="#stage"
              className="hover:text-[#F0CE82] transition-colors py-1 cursor-pointer whitespace-nowrap shrink-0"
            >
              Home
            </a>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="hover:text-[#F0CE82] transition-colors py-1 cursor-pointer whitespace-nowrap shrink-0"
            >
              Auction Arena
            </button>
            <button
              type="button"
              onClick={onSwitchToTournament}
              className="hover:text-[#F0CE82] transition-colors py-1 cursor-pointer whitespace-nowrap shrink-0"
            >
              Tournament Mode
            </button>
            <button
              type="button"
              onClick={onSwitchToTournament}
              className="hover:text-[#F0CE82] transition-colors py-1 cursor-pointer whitespace-nowrap shrink-0"
            >
              WicketPulse
            </button>
            <a
              href="#auction-section"
              className="hover:text-[#F0CE82] transition-colors py-1 cursor-pointer whitespace-nowrap shrink-0"
            >
              How It Works
            </a>
            <a
              href="#engine-section"
              className="hover:text-[#F0CE82] transition-colors py-1 cursor-pointer whitespace-nowrap shrink-0"
            >
              Showcase
            </a>
          </nav>

          {/* Right: Auth / Profile & Enter Arena CTA */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111111] border border-[#D6AD55]/30 text-xs text-[#F5F3ED] whitespace-nowrap">
                  <User className="w-3.5 h-3.5 text-[#D6AD55]" />
                  <span className="font-semibold">{currentUser.username || currentUser.email?.split('@')[0]}</span>
                </div>
                <button
                  type="button"
                  onClick={() => authService.signOut()}
                  className="p-2 rounded-xl bg-[#111111] border border-white/10 hover:border-[#D6AD55]/40 text-[#AAA69B] hover:text-[#F5F3ED] transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthModalMode('login');
                  setIsAuthModalOpen(true);
                }}
                className="hidden sm:inline-flex items-center px-4 py-2 rounded-xl bg-[#111111] hover:bg-[#18181A] border border-[#D6AD55]/30 hover:border-[#D6AD55]/60 text-xs font-semibold uppercase tracking-wider text-[#F5F3ED] transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                Sign In
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#F0CE82] via-[#D6AD55] to-[#B88B35] text-[#0B0B0C] font-bold text-xs uppercase tracking-wider shadow-[0_4px_16px_rgba(214,173,85,0.3)] hover:brightness-110 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Enter Arena</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-[#111111] border border-white/10 text-[#F5F3ED]"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-[#0B0B0C]/98 border-b border-[#D6AD55]/30 px-6 py-6 space-y-4 animate-fadeIn">
            <nav className="flex flex-col gap-3 text-sm font-semibold uppercase tracking-wider text-[#AAA69B]">
              <a
                href="#stage"
                onClick={() => setIsMobileMenuOpen(false)}
                className="hover:text-[#F0CE82] py-1.5"
              >
                Home
              </a>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsCreateModalOpen(true);
                }}
                className="text-left hover:text-[#F0CE82] py-1.5"
              >
                Auction Arena
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onSwitchToTournament && onSwitchToTournament();
                }}
                className="text-left hover:text-[#F0CE82] py-1.5"
              >
                Tournament Mode
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onSwitchToTournament && onSwitchToTournament();
                }}
                className="text-left hover:text-[#F0CE82] py-1.5"
              >
                WicketPulse
              </button>
              <a
                href="#auction-section"
                onClick={() => setIsMobileMenuOpen(false)}
                className="hover:text-[#F0CE82] py-1.5"
              >
                How It Works
              </a>
              <a
                href="#engine-section"
                onClick={() => setIsMobileMenuOpen(false)}
                className="hover:text-[#F0CE82] py-1.5"
              >
                Showcase
              </a>
            </nav>

            {!currentUser && (
              <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setAuthModalMode('login');
                    setIsAuthModalOpen(true);
                  }}
                  className="text-xs font-semibold text-[#D6AD55] uppercase"
                >
                  Sign In to Account
                </button>
                <span className="text-[10px] font-mono text-[#AAA69B]">BIDWARS LEAGUE 2026</span>
              </div>
            )}
          </div>
        )}
      </header>

      {/* =================================================================== */}
      {/* 2. THE CINEMATIC 16:9 HERO STAGE (Exact Harborlux Choreography)     */}
      {/* =================================================================== */}
      <section
        id="stage"
        className="relative w-full h-screen min-h-[640px] max-h-[1100px] overflow-hidden bg-[#0B0B0C] isolate"
      >
        {/* Centered 16:9 Cinematic Viewport Container */}
        <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none">
          <div className="relative w-full h-full max-w-[1920px] pointer-events-auto overflow-hidden">
            
            {/* LAYER 1: BACK ATMOSPHERE, AERIAL & WIDE STADIUM BACKGROUND (Z-10) */}
            <div
              className="absolute inset-0 z-10 w-full h-full bg-[#0B0B0C] overflow-hidden"
              style={{
                transform: `translateY(${backLayerTranslateY}%)`
              }}
            >
              {/* Distant stadium floodlight glow cones */}
              <div className="absolute -top-1/4 left-1/4 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(214,173,85,0.18)_0%,transparent_70%)] blur-3xl pointer-events-none" />
              <div className="absolute -top-1/4 right-1/4 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(240,206,130,0.15)_0%,transparent_70%)] blur-3xl pointer-events-none" />

              {/* Aerial Stadium Still & Camera Zoom (0.00s to 2.95s) */}
              {aerialOpacity > 0 && (
                <div
                  className="absolute inset-0 w-full h-full overflow-hidden"
                  style={{ opacity: aerialOpacity }}
                >
                  <img
                    src="/stadium-aerial.jpg"
                    alt="BidWars Stadium Aerial"
                    className="w-full h-full object-cover origin-center"
                    style={{
                      transform: `scale(${cameraZoomScale}) translateY(${cameraPanY}%)`,
                      transition: 'transform 0.05s linear'
                    }}
                  />
                </div>
              )}

              {/* Wide Stadium Bowl Midground (Crossfades in at 2.45s–2.95s) */}
              <div
                className="absolute inset-0 w-full h-full overflow-hidden"
                style={{
                  opacity: wideStadiumOpacity,
                  transform: `translateY(${midLayerTranslateY}%)`
                }}
              >
                <img
                  src="/stadium-wide.jpg"
                  alt="BidWars Arena Bowl"
                  className="w-full h-full object-cover object-center sm:object-bottom"
                />
              </div>
            </div>

            {/* LAYER 2: ATMOSPHERIC HAZE, EDITORIAL SCRIM & PARTICLES (Z-20) */}
            <div className="absolute inset-0 z-20 pointer-events-none">
              {/* Left-side & bottom editorial gradient scrim for crisp headline legibility */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B0C]/90 via-[#0B0B0C]/55 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0C] via-transparent to-[#0B0B0C]/40" />

              {/* Continuous Atmospheric Particle Canvas */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{
                  opacity: timelineSec >= 2.4 ? Math.min(1, (timelineSec - 2.4) / 1.0) : 0
                }}
              />

              {/* Top Shade Gradient for Navigation Contrast */}
              <div
                className="absolute top-0 inset-x-0 h-36 bg-gradient-to-b from-[#0B0B0C]/90 via-[#0B0B0C]/50 to-transparent"
                style={{ opacity: topShadeOpacity }}
              />
            </div>

            {/* LAYER 3: FOREGROUND AUCTION MANAGER SILHOUETTE — CENTRE-RIGHT (Z-30) */}
            <div
              className="absolute inset-0 z-30 flex justify-end items-end pointer-events-none overflow-hidden pr-0 sm:pr-[3%] lg:pr-[7%]"
            >
              <img
                src="/stadium-foreground.png"
                alt="BidWars Auction Manager Foreground Silhouette"
                className="max-h-[52%] sm:max-h-[66%] lg:max-h-[76%] w-auto object-contain object-bottom opacity-65 sm:opacity-95 drop-shadow-[0_20px_40px_rgba(0,0,0,0.9)]"
                style={foregroundStyle}
              />
            </div>

            {/* LAYER 4: LEFT EDITORIAL HERO CONTENT — ALWAYS READABLE & IN FRONT (Z-40) */}
            <div
              className="relative z-40 max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 h-full flex items-center pointer-events-none"
              style={{
                transform: `translateY(${headlineTranslateY}px)`
              }}
            >
              <div className="max-w-xl lg:max-w-2xl text-left select-none pt-12 sm:pt-8">
                {/* Kicker: BUILD YOUR DREAM */}
                <div
                  className="mb-1.5 sm:mb-2 text-xs sm:text-sm md:text-base font-mono font-bold uppercase tracking-[0.3em] text-[#F0CE82] drop-shadow-[0_2px_12px_rgba(214,173,85,0.4)]"
                  style={{
                    opacity: kickerOpacity,
                    transform: `translateY(${kickerTranslateY}px)`
                  }}
                >
                  BUILD YOUR DREAM
                </div>

                {/* Giant Headline: S Q U A D (Letter-by-letter left-to-right entrance) */}
                <h1 className="font-bebas text-[clamp(4.5rem,13vw,11.5rem)] leading-[0.88] uppercase tracking-[-0.02em] text-[#F5F3ED] drop-shadow-[0_12px_32px_rgba(0,0,0,0.95)] flex items-center justify-start gap-1 sm:gap-2">
                  {['S', 'Q', 'U', 'A', 'D'].map((char, idx) => (
                    <span
                      key={idx}
                      className="inline-block transition-transform duration-75"
                      style={getLetterStyle(idx)}
                    >
                      {char}
                    </span>
                  ))}
                </h1>

                {/* Supporting Quote, Description & CTAs */}
                <div
                  className="mt-3 sm:mt-4 space-y-2 transition-opacity duration-500"
                  style={{
                    opacity: timelineSec >= 3.2 ? Math.min(1, (timelineSec - 3.2) / 0.8) : 0,
                    transform: `translateY(${timelineSec >= 3.2 ? 0 : 15}px)`
                  }}
                >
                  <p className="text-sm sm:text-base font-serif italic text-[#D6AD55] tracking-wide max-w-lg">
                    &ldquo;Balance overseas firepower with domestic match-winners to forge a dynasty.&rdquo;
                  </p>
                  <p className="text-xs sm:text-sm text-[#AAA69B] max-w-md leading-relaxed">
                    Build your squad, compete in strategic auctions, and take your team through the BidWars League.
                  </p>

                  {/* Primary & Secondary Action CTAs */}
                  <div className="pt-4 flex flex-wrap items-center justify-start gap-3 sm:gap-4 pointer-events-auto">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(true)}
                      className="px-5 sm:px-7 py-3 rounded-xl bg-gradient-to-r from-[#F0CE82] via-[#D6AD55] to-[#B88B35] text-[#0B0B0C] font-bold text-xs sm:text-sm uppercase tracking-wider shadow-[0_6px_24px_rgba(214,173,85,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                    >
                      <span>ENTER ARENA</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </button>

                    <a
                      href="#auction-section"
                      className="px-5 sm:px-6 py-3 rounded-xl bg-[#111111]/85 hover:bg-[#18181A] border border-[#D6AD55]/40 hover:border-[#D6AD55] text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#F5F3ED] transition-all cursor-pointer backdrop-blur-sm"
                    >
                      EXPLORE GAME MODES
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* LAYER 6: THE OPENING DOORS (Z-60) — (0.02s to 1.24s) */}
            {timelineSec < 1.3 && (
              <div className="absolute inset-0 z-[60] w-full h-full pointer-events-none overflow-hidden">
                {/* Left Door */}
                <div
                  className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-[#0E0F12] via-[#141519] to-[#111111] border-r border-[#D6AD55]/40 shadow-[10px_0_40px_rgba(0,0,0,0.9)] flex items-center justify-end pr-4 sm:pr-8"
                  style={{
                    transform: `translateX(-${leftDoorProgress * 100}%)`,
                    willChange: 'transform'
                  }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(214,173,85,0.08)_0%,transparent_70%)]" />
                  <div className="h-4/5 w-1 bg-gradient-to-b from-transparent via-[#D6AD55]/60 to-transparent mr-2" />
                  <div className="flex flex-col items-end opacity-40 select-none">
                    <span className="font-bebas text-3xl sm:text-5xl text-[#D6AD55] tracking-widest">BID</span>
                    <span className="text-[9px] font-mono tracking-widest text-[#AAA69B]">GATE A</span>
                  </div>
                </div>

                {/* Right Door */}
                <div
                  className="absolute top-0 bottom-0 right-0 w-1/2 bg-gradient-to-l from-[#0E0F12] via-[#141519] to-[#111111] border-l border-[#D6AD55]/40 shadow-[-10px_0_40px_rgba(0,0,0,0.9)] flex items-center justify-start pl-4 sm:pr-8"
                  style={{
                    transform: `translateX(${rightDoorProgress * 100}%)`,
                    willChange: 'transform'
                  }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(214,173,85,0.08)_0%,transparent_70%)]" />
                  <div className="h-4/5 w-1 bg-gradient-to-b from-transparent via-[#D6AD55]/60 to-transparent ml-2" />
                  <div className="flex flex-col items-start opacity-40 select-none ml-2">
                    <span className="font-bebas text-3xl sm:text-5xl text-[#F0CE82] tracking-widest">WARS</span>
                    <span className="text-[9px] font-mono tracking-widest text-[#AAA69B]">ARENA</span>
                  </div>
                </div>
              </div>
            )}

            {/* REPLAY INTRO & SKIP CONTROLS (Bottom Right) */}
            <div className="absolute bottom-6 right-5 sm:right-8 z-50 flex items-center gap-2">
              {isIntroComplete ? (
                <button
                  type="button"
                  onClick={triggerReplay}
                  className="px-3 py-1.5 rounded-full bg-[#111111]/85 hover:bg-[#18181A] border border-[#D6AD55]/35 hover:border-[#D6AD55] text-[10px] font-mono uppercase tracking-wider text-[#D6AD55] flex items-center gap-1.5 shadow-lg backdrop-blur-sm transition-all cursor-pointer"
                  title="Replay Cinematic 7.4s Intro"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>REPLAY INTRO</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={skipIntro}
                  className="px-2.5 py-1 rounded-full bg-[#111111]/75 hover:bg-[#18181A] border border-white/20 text-[10px] font-mono uppercase tracking-wider text-[#AAA69B] hover:text-white backdrop-blur-sm transition-all cursor-pointer"
                >
                  SKIP INTRO
                </button>
              )}
            </div>

            {/* Clear Bottom-Left Scroll Indicator (Does not overlap silhouette or railing) */}
            {isIntroComplete && (
              <div className="absolute bottom-7 left-5 sm:left-8 lg:left-12 z-50 flex items-center gap-2 opacity-80 pointer-events-none">
                <ChevronDown className="w-4 h-4 text-[#D6AD55] animate-bounce" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#AAA69B]">SCROLL TO EXPLORE</span>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 3. FEATURE SECTION 1: PREMIER CRICKET AUCTION 2026                 */}
      {/* =================================================================== */}
      <section
        id="auction-section"
        className="relative w-full py-24 sm:py-32 px-4 sm:px-6 lg:px-8 border-t border-[#D6AD55]/20 bg-gradient-to-b from-[#0B0B0C] via-[#0F1014] to-[#0B0B0C] overflow-hidden"
      >
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111111] border border-[#D6AD55]/40 text-xs font-mono text-[#D6AD55] uppercase tracking-widest mb-4">
              <GavelIcon className="w-3.5 h-3.5 text-[#D6AD55]" />
              <span>LIVE BIDDING ENGINE</span>
            </div>
            <h2 className="font-bebas text-4xl sm:text-6xl uppercase tracking-tight text-[#F5F3ED] mb-4">
              PREMIER CRICKET AUCTION 2026
            </h2>
            <p className="text-sm sm:text-base text-[#AAA69B] leading-relaxed">
              Experience competitive player auctions, build a balanced squad, and manage your purse with strategic decisions.
            </p>
          </div>

          {/* Interactive Bidding Card Showcase */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Tactical Bidding Mechanics */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-6 rounded-2xl bg-[#111111] border border-[#D6AD55]/25 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono text-[#D6AD55] uppercase tracking-wider font-bold">FRANCHISE PURSE LIMIT</span>
                  <span className="text-xs font-mono text-[#F0CE82] font-bold">₹120.00 CRORE</span>
                </div>
                <div className="w-full bg-[#1A1A1E] h-2.5 rounded-full overflow-hidden p-0.5 border border-white/5">
                  <div className="bg-gradient-to-r from-[#F0CE82] via-[#D6AD55] to-[#927545] h-full rounded-full w-[68%]" />
                </div>
                <p className="mt-3 text-xs text-[#AAA69B]">
                  Real-time budget exhaustion limits, squad slot minimums, and dynamic bid increment enforcement.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#111111] border border-white/10 hover:border-[#D6AD55]/30 transition-all">
                <h4 className="font-bebas text-xl text-[#F5F3ED] uppercase tracking-wide mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#D6AD55]" />
                  <span>SPLIT-SECOND PADDLE SYNCHRONIZATION</span>
                </h4>
                <p className="text-xs text-[#AAA69B] leading-relaxed">
                  Sub-50ms Supabase WebSocket updates ensure every paddle raise is registered instantly across all ten franchise tables simultaneously.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#111111] border border-white/10 hover:border-[#D6AD55]/30 transition-all">
                <h4 className="font-bebas text-xl text-[#F5F3ED] uppercase tracking-wide mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#D6AD55]" />
                  <span>DYNAMIC BID INCREMENTS & TIMER</span>
                </h4>
                <p className="text-xs text-[#AAA69B] leading-relaxed">
                  Automated base-to-marquee bid increments with configurable countdown timers and instant gavel lock when bidding closes.
                </p>
              </div>
            </div>

            {/* Right: Live Interactive Auction Hammer & Player Card */}
            <div className="lg:col-span-7 relative">
              <div className="relative mx-auto max-w-lg rounded-3xl bg-[#141519] border border-[#D6AD55]/40 p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden">
                {/* Gold aura glow */}
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-[radial-gradient(circle,rgba(214,173,85,0.25)_0%,transparent_70%)] blur-2xl pointer-events-none" />

                {/* Top status bar */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#D6AD55]">
                      HAMMER ACTIVE
                    </span>
                  </div>
                  <div className="text-xs font-mono text-[#AAA69B]">
                    TIMER: <span className="font-bold text-[#F0CE82]">{showcaseTimer}s</span>
                  </div>
                </div>

                {/* Player Spotlight */}
                <div className="flex flex-col sm:flex-row items-center gap-5 mb-6">
                  <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-[#1A1A1E] border-2 border-[#D6AD55]/40 p-2 shrink-0 flex items-center justify-center overflow-hidden shadow-lg">
                    <img
                      src="/players/ipl2026_001.png"
                      alt="Spotlight Marquee Player"
                      className="w-full h-full object-cover rounded-xl"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logos/rcb.png';
                      }}
                    />
                    <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-[#0B0B0C]/80 border border-[#D6AD55]/30 text-[9px] font-mono text-[#D6AD55]">
                      BAT · 94 OVR
                    </div>
                  </div>

                  <div className="text-center sm:text-left flex-1">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#AAA69B]">SET 1 · MARQUEE BATTER</span>
                    <h3 className="font-bebas text-2xl sm:text-3xl text-[#F5F3ED] uppercase tracking-wide">
                      VIRAT KOHLI
                    </h3>
                    <p className="text-xs text-[#AAA69B] mb-2">Right-Hand Top Order Anchor · Former Captain</p>
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#111111] border border-white/10 text-[10px] font-mono text-[#D6AD55]">
                        BASE: ₹2.00 CR
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#111111] border border-white/10 text-[10px] font-mono text-emerald-400">
                        STATUS: HOT
                      </span>
                    </div>
                  </div>
                </div>

                {/* Current Bid Display */}
                <div className="rounded-2xl bg-[#0B0B0C] border border-[#D6AD55]/30 p-4 sm:p-5 mb-6 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#AAA69B]">CURRENT HIGHEST BID</span>
                    <div className="font-bebas text-3xl sm:text-4xl text-[#F0CE82] tracking-wider">
                      ₹{showcaseBid.toFixed(2)} CR
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#AAA69B]">LEADER</span>
                    <div className="text-xs sm:text-sm font-bold text-[#F5F3ED] tracking-wide">
                      {showcaseBidder}
                    </div>
                  </div>
                </div>

                {/* Simulated Interactive Paddle Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowcaseBid(prev => +(prev + 0.50).toFixed(2));
                      setShowcaseBidder('CHENNAI SUPER KINGS');
                      setShowcaseTimer(10);
                      setIsBidJustRaised(true);
                      setTimeout(() => setIsBidJustRaised(false), 600);
                    }}
                    className={`py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isBidJustRaised
                        ? 'bg-[#F0CE82] text-[#0B0B0C] scale-98'
                        : 'bg-gradient-to-r from-[#F0CE82] to-[#D6AD55] text-[#0B0B0C] hover:brightness-110 shadow-md'
                    }`}
                  >
                    <GavelIcon className="w-4 h-4 text-[#0B0B0C]" />
                    <span>RAISE ₹0.50 CR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="py-3 px-4 rounded-xl bg-[#111111] hover:bg-[#18181A] border border-[#D6AD55]/40 text-[#F5F3ED] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>JOIN ARENA</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 4. FEATURE SECTION 2: SQUAD ARCHITECTURE & STRATEGY                */}
      {/* =================================================================== */}
      <section
        id="squad-section"
        className="relative w-full py-24 sm:py-32 px-4 sm:px-6 lg:px-8 border-t border-[#D6AD55]/20 bg-[#0B0B0C] overflow-hidden"
      >
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111111] border border-[#D6AD55]/40 text-xs font-mono text-[#D6AD55] uppercase tracking-widest mb-4">
              <Shield className="w-3.5 h-3.5 text-[#D6AD55]" />
              <span>ROSTER COMPOSITION</span>
            </div>
            <h2 className="font-bebas text-4xl sm:text-6xl uppercase tracking-tight text-[#F5F3ED] mb-4">
              SQUAD ARCHITECTURE & STRATEGY
            </h2>
            <p className="text-sm sm:text-base text-[#AAA69B] leading-relaxed">
              Create a powerful squad with the right balance of batters, bowlers, all-rounders, and wicketkeepers.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Spinning Circular Squad Orbit Visualization with 10 Official Franchises */}
            <div className="lg:col-span-6 flex items-center justify-center relative py-6">
              <div className="orbit-container relative w-72 h-72 sm:w-96 sm:h-96 rounded-full border border-[#D6AD55]/20 flex items-center justify-center">
                {/* Outer Rotating Dashed Ring */}
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#D6AD55]/30 animate-orbit" />

                {/* Inner Counter-Rotating Gold Accent Ring */}
                <div className="absolute inset-8 sm:inset-10 rounded-full border border-[#D6AD55]/20 animate-orbit-reverse" />

                {/* Spinning Orbit Wrapper for all 10 Franchise Team Logos */}
                <div className="absolute inset-0 flex items-center justify-center animate-orbit">
                  {FRANCHISE_LOGOS.map((f, idx) => {
                    const angle = (idx / FRANCHISE_LOGOS.length) * (2 * Math.PI);
                    const radiusPct = 44; // percentage of container
                    const leftPct = 50 + Math.cos(angle) * radiusPct;
                    const topPct = 50 + Math.sin(angle) * radiusPct;

                    return (
                      <div
                        key={f.id}
                        style={{
                          left: `${leftPct}%`,
                          top: `${topPct}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                        className="absolute z-10"
                      >
                        {/* Counter-rotating node keeps each logo upright while orbiting */}
                        <button
                          type="button"
                          onClick={() => setSelectedFranchiseOrbit(f.id)}
                          className={`animate-orbit-reverse w-11 h-11 sm:w-13 sm:h-13 rounded-full p-1 bg-[#141519] border transition-all duration-300 cursor-pointer shadow-lg hover:scale-125 ${
                            selectedFranchiseOrbit === f.id
                              ? 'border-[#F0CE82] ring-2 ring-[#D6AD55]/60 scale-115 shadow-[0_0_18px_rgba(214,173,85,0.5)]'
                              : 'border-white/15 hover:border-[#D6AD55]/70'
                          }`}
                          title={f.name}
                        >
                          <img
                            src={f.src}
                            alt={f.name}
                            className="w-full h-full object-cover rounded-full"
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Stationary Centered Shield Badge */}
                <div className="relative z-20 w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#111111] border-2 border-[#D6AD55] flex flex-col items-center justify-center shadow-[0_0_32px_rgba(214,173,85,0.35)] text-center p-2 transition-transform duration-300 hover:scale-105">
                  <Shield className="w-6 h-6 text-[#D6AD55] mb-1 animate-pulse" />
                  <span className="font-bebas text-base sm:text-lg text-[#F5F3ED] uppercase tracking-wider">
                    {selectedFranchiseOrbit}
                  </span>
                  <span className="text-[8px] font-mono text-[#D6AD55] uppercase tracking-widest">
                    BIDWARS LEAGUE
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Squad Rules & Animated Role Breakdown */}
            <div className="lg:col-span-6 space-y-4">
              {/* Role filter buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                {(['ALL', 'BAT', 'BOWL', 'AR', 'WK'] as const).map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setActiveRoleFilter(role)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                      activeRoleFilter === role
                        ? 'bg-gradient-to-r from-[#F0CE82] to-[#D6AD55] text-[#0B0B0C] shadow-[0_0_12px_rgba(214,173,85,0.35)] scale-105'
                        : 'bg-[#111111] text-[#AAA69B] hover:text-white border border-white/10 hover:border-[#D6AD55]/40'
                    }`}
                  >
                    {role === 'ALL' ? 'ALL ROLES' : role}
                  </button>
                ))}
              </div>

              {/* Animated Role Target Indicator */}
              <div className="p-4 rounded-2xl bg-[#141519] border border-[#D6AD55]/30 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#D6AD55] font-bold uppercase">
                    {activeRoleFilter === 'ALL'
                      ? 'BALANCED 25-MAN SQUAD TARGET'
                      : `${activeRoleFilter} CORE ALLOCATION`}
                  </span>
                  <span className="text-[#F0CE82] font-bold">
                    {activeRoleFilter === 'ALL'
                      ? '100% OPTIMAL'
                      : activeRoleFilter === 'BAT'
                      ? '7–8 SPECIALISTS'
                      : activeRoleFilter === 'BOWL'
                      ? '7–8 BOWLERS'
                      : activeRoleFilter === 'AR'
                      ? '4–5 ALL-ROUNDERS'
                      : '2–3 KEEPERS'}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#0B0B0C] overflow-hidden border border-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#F0CE82] via-[#D6AD55] to-[#927545] transition-all duration-500 ease-out"
                    style={{
                      width:
                        activeRoleFilter === 'ALL'
                          ? '100%'
                          : activeRoleFilter === 'BAT'
                          ? '34%'
                          : activeRoleFilter === 'BOWL'
                          ? '32%'
                          : activeRoleFilter === 'AR'
                          ? '22%'
                          : '12%'
                    }}
                  />
                </div>
              </div>

              {/* Composition Requirements List */}
              <div className="p-5 rounded-2xl bg-[#111111] border border-[#D6AD55]/25 hover:border-[#D6AD55]/60 transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-between">
                <div>
                  <h4 className="font-bebas text-xl text-[#F5F3ED] uppercase tracking-wide">
                    TOTAL SQUAD ROSTER
                  </h4>
                  <p className="text-xs text-[#AAA69B]">18 to 25 players maximum per franchise table</p>
                </div>
                <span className="text-sm font-mono font-bold text-[#F0CE82]">25 MAX</span>
              </div>

              <div className="p-5 rounded-2xl bg-[#111111] border border-white/10 hover:border-[#D6AD55]/50 transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-between">
                <div>
                  <h4 className="font-bebas text-xl text-[#F5F3ED] uppercase tracking-wide">
                    OVERSEAS PLAYER CAP
                  </h4>
                  <p className="text-xs text-[#AAA69B]">Maximum 8 overseas stars per squad, 4 in Playing XI</p>
                </div>
                <span className="text-sm font-mono font-bold text-[#D6AD55]">8 MAX</span>
              </div>

              <div className="p-5 rounded-2xl bg-[#111111] border border-white/10 hover:border-[#D6AD55]/50 transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-between">
                <div>
                  <h4 className="font-bebas text-xl text-[#F5F3ED] uppercase tracking-wide">
                    TACTICAL PLAYING XI
                  </h4>
                  <p className="text-xs text-[#AAA69B]">Min 5 bowling options, 1 specialist wicketkeeper</p>
                </div>
                <span className="text-sm font-mono font-bold text-emerald-400">11 REQUIRED</span>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onSwitchToTournament}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#F0CE82] via-[#D6AD55] to-[#B88B35] text-[#0B0B0C] font-bold text-xs uppercase tracking-wider shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>MANAGE FRANCHISE ROSTER</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 5. FEATURE SECTION 3: MULTIPLAYER MATCH ENGINE                     */}
      {/* =================================================================== */}
      <section
        id="engine-section"
        className="relative w-full py-24 sm:py-32 px-4 sm:px-6 lg:px-8 border-t border-[#D6AD55]/20 bg-gradient-to-b from-[#0B0B0C] via-[#0E1015] to-[#0B0B0C] overflow-hidden"
      >
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111111] border border-[#D6AD55]/40 text-xs font-mono text-[#D6AD55] uppercase tracking-widest mb-4">
              <Flame className="w-3.5 h-3.5 text-[#D6AD55]" />
              <span>WICKETPULSE ENGINE</span>
            </div>
            <h2 className="font-bebas text-4xl sm:text-6xl uppercase tracking-tight text-[#F5F3ED] mb-4">
              MULTIPLAYER MATCH ENGINE
            </h2>
            <p className="text-sm sm:text-base text-[#AAA69B] leading-relaxed">
              Take your auction-built squad into competitive multiplayer cricket with WicketPulse.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Ball-by-Ball Match Engine Visuals */}
            <div className="lg:col-span-7">
              <div className="rounded-3xl bg-[#141519] border border-[#D6AD55]/30 p-6 sm:p-8 shadow-2xl space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-bebas text-xl text-[#F5F3ED] uppercase tracking-wide">
                      FINAL SHOWDOWN · OVER 19.5
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#D6AD55] font-bold">WICKETPULSE MULTIPLAYER</span>
                </div>

                {/* Scorecard Visual */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[#0B0B0C] border border-white/10">
                    <span className="text-[10px] font-mono text-[#AAA69B] uppercase">BATTING</span>
                    <div className="font-bebas text-2xl text-[#F5F3ED]">184 / 4</div>
                    <span className="text-[10px] text-emerald-400 font-mono">REQ: 8 OFF 2 BALLS</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0B0B0C] border border-white/10">
                    <span className="text-[10px] font-mono text-[#AAA69B] uppercase">BOWLING TACTIC</span>
                    <div className="font-bebas text-2xl text-[#F0CE82]">YORKER SPEAR</div>
                    <span className="text-[10px] text-[#AAA69B] font-mono">PACE VARIATION +2</span>
                  </div>
                </div>

                {/* Over Balls Visual */}
                <div>
                  <span className="text-xs font-mono text-[#AAA69B] uppercase tracking-wider mb-2 block">
                    CURRENT OVER PROGRESSION:
                  </span>
                  <div className="flex items-center gap-2">
                    {matchOverBalls.map((b, i) => (
                      <span
                        key={i}
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-xs border ${
                          b === 6
                            ? 'bg-[#D6AD55] text-[#0B0B0C] border-[#F0CE82]'
                            : b === 4
                            ? 'bg-[#1E2246] text-[#F0CE82] border-[#D6AD55]/40'
                            : b === 0
                            ? 'bg-[#111111] text-[#AAA69B] border-white/10'
                            : 'bg-[#111111] text-[#F5F3ED] border-white/10'
                        }`}
                      >
                        {b}
                      </span>
                    ))}
                    <span className="w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-xs bg-white/5 border border-dashed border-[#D6AD55] text-[#D6AD55] animate-pulse">
                      ?
                    </span>
                  </div>
                </div>

                {/* Interactive delivery button */}
                <button
                  type="button"
                  onClick={() => {
                    const outcomes = [0, 1, 2, 4, 6];
                    const next = outcomes[Math.floor(Math.random() * outcomes.length)];
                    setMatchOverBalls(prev => [...prev.slice(1), next]);
                  }}
                  className="w-full py-3 rounded-xl bg-[#111111] hover:bg-[#18181A] border border-[#D6AD55]/50 text-xs font-mono font-bold uppercase tracking-wider text-[#D6AD55] hover:text-[#F0CE82] transition-colors cursor-pointer"
                >
                  SIMULATE NEXT TACTICAL DELIVERY ⚡
                </button>
              </div>
            </div>

            {/* Right: Feature Highlights */}
            <div className="lg:col-span-5 space-y-5">
              <div className="p-6 rounded-2xl bg-[#111111] border border-white/10">
                <h4 className="font-bebas text-xl text-[#F5F3ED] uppercase tracking-wide mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#D6AD55]" />
                  <span>BALL-BY-BALL MULTIPLAYER DYNAMICS</span>
                </h4>
                <p className="text-xs text-[#AAA69B] leading-relaxed">
                  Both human managers select batting aggression and bowling line/length simultaneously with instant server-verified resolution.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#111111] border border-white/10">
                <h4 className="font-bebas text-xl text-[#F5F3ED] uppercase tracking-wide mb-2 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[#D6AD55]" />
                  <span>LEAGUE ROUND ROBIN TO PLAYOFFS</span>
                </h4>
                <p className="text-xs text-[#AAA69B] leading-relaxed">
                  Compete through a 14-match regular league table. Top 4 teams advance to the Page-Playoff system to hoist the BidWars Trophy.
                </p>
              </div>

              <button
                type="button"
                onClick={onSwitchToTournament}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#F0CE82] via-[#D6AD55] to-[#B88B35] text-[#0B0B0C] font-bold text-xs uppercase tracking-wider shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>ENTER TOURNAMENT HUB</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 6. FOOTER                                                          */}
      {/* =================================================================== */}
      <footer className="w-full border-t border-[#D6AD55]/20 bg-[#0B0B0C] py-12 px-4 sm:px-6 lg:px-8 text-xs text-[#AAA69B]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <BidWarsLogo size="sm" />
            <span className="text-[10px] font-mono text-[#D6AD55] uppercase tracking-wider">
              BIDWARS LEAGUE 2026
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs uppercase font-mono">
            <a href="#stage" className="hover:text-[#F0CE82] transition-colors">Home</a>
            <button type="button" onClick={() => setIsCreateModalOpen(true)} className="hover:text-[#F0CE82] transition-colors">Auction</button>
            <button type="button" onClick={onSwitchToTournament} className="hover:text-[#F0CE82] transition-colors">Tournament</button>
            <button type="button" onClick={onSwitchToTournament} className="hover:text-[#F0CE82] transition-colors">WicketPulse</button>
          </div>

          <div className="text-[10px] font-mono text-[#74777D] text-center md:text-right">
            © 2026 BIDWARS. ALL RIGHTS RESERVED. · NON-COMMERCIAL FAN SIMULATOR.
          </div>
        </div>
      </footer>

      {/* =================================================================== */}
      {/* 7. QUICK AUCTION MODAL                                             */}
      {/* =================================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-xl bg-[#141519] border border-[#D6AD55]/40 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.9)] max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#141519] z-10 px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <GavelIcon className="w-5 h-5 text-[#D6AD55]" />
                <h3 className="font-bebas text-2xl uppercase tracking-wide text-[#F5F3ED]">
                  HOST AUCTION ROOM
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#AAA69B] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#D6AD55] mb-1.5">
                  FRANCHISE MANAGER NICKNAME *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CaptainKav, TheGavelGod"
                  value={hostNickname}
                  onChange={e => setHostNickname(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0B0B0C] border border-white/10 focus:border-[#D6AD55] text-sm text-[#F5F3ED] placeholder-[#74777D] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#AAA69B] mb-1.5">
                  ROOM NAME (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Premier Mega Arena"
                  value={roomName}
                  onChange={e => setRoomName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0B0B0C] border border-white/10 focus:border-[#D6AD55] text-sm text-[#F5F3ED] placeholder-[#74777D] focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#AAA69B] mb-1.5">
                    STARTING PURSE (CR)
                  </label>
                  <select
                    value={startingPurseCr}
                    onChange={e => setStartingPurseCr(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0B0B0C] border border-white/10 focus:border-[#D6AD55] text-xs text-[#F5F3ED] focus:outline-none"
                  >
                    <option value={120}>₹120 Cr (Mega Auction)</option>
                    <option value={100}>₹100 Cr (Standard)</option>
                    <option value={80}>₹80 Cr (Budget Crunch)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#AAA69B] mb-1.5">
                    BID TIMER (SECONDS)
                  </label>
                  <select
                    value={timerDuration}
                    onChange={e => setTimerDuration(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0B0B0C] border border-white/10 focus:border-[#D6AD55] text-xs text-[#F5F3ED] focus:outline-none"
                  >
                    <option value={10}>10s (Standard Blitz)</option>
                    <option value={15}>15s (Strategic)</option>
                    <option value={8}>8s (Rapid Fire)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="private-check"
                  checked={isPrivate}
                  onChange={e => setIsPrivate(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#0B0B0C] border-white/20 text-[#D6AD55] focus:ring-[#D6AD55]"
                />
                <label htmlFor="private-check" className="text-xs text-[#AAA69B] cursor-pointer">
                  Require password to join this room
                </label>
              </div>

              {isPrivate && (
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#AAA69B] mb-1.5">
                    ROOM PASSWORD
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter room password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0B0B0C] border border-white/10 focus:border-[#D6AD55] text-sm text-[#F5F3ED] placeholder-[#74777D] focus:outline-none transition-colors"
                  />
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#AAA69B] cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F0CE82] via-[#D6AD55] to-[#B88B35] text-[#0B0B0C] font-bold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? 'CREATING...' : 'LAUNCH ARENA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 8. AUTH MODAL INTEGRATION                                          */}
      {/* =================================================================== */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthModalOpen(false);
        }}
      />
    </div>
  );
};
