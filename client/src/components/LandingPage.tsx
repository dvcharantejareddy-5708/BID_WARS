import React, { useState, useEffect, useRef } from 'react';
import {
  Trophy,
  Users,
  ChevronRight,
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
  User
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

interface HeroSlide {
  id: number;
  tag: string;
  title: string;
  subtitle: string;
  quote: string;
  stats: string;
  badge: string;
  thumbnailTitle: string;
  thumbnailDesc: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 1,
    tag: '01 / BIDWARS LEAGUE 2026',
    title: 'THE AUCTION STARTS HERE',
    subtitle: 'Step into the high-stakes cricket auction arena. Outbid rival franchise owners under the hammer with live purse dynamics.',
    quote: 'Every bid is a statement. Assemble world-class talent under the hammer.',
    stats: '10 FRANCHISES · 120 CR PURSE · REAL-TIME MULTIPLAYER',
    badge: 'LIVE BIDDING SIMULATOR',
    thumbnailTitle: 'THE HAMMER',
    thumbnailDesc: 'Live Purse & Gavel'
  },
  {
    id: 2,
    tag: '02 / SQUAD ARCHITECTURE & STRATEGY',
    title: 'BUILD YOUR SQUAD',
    subtitle: 'Balance explosive overseas match-winners with domestic pillars. Craft the ultimate 25-man roster within financial limits.',
    quote: 'Balance overseas firepower with domestic match-winners to forge a dynasty.',
    stats: '25 SQUAD CAP · 8 OVERSEAS · RTM CARDS',
    badge: 'SQUAD ARCHITECTURE',
    thumbnailTitle: 'THE SQUAD',
    thumbnailDesc: '10 Franchises'
  },
  {
    id: 3,
    tag: '03 / MULTIPLAYER MATCH ENGINE',
    title: 'RULE THE TOURNAMENT',
    subtitle: 'Take your drafted Playing XI into WicketPulse ball-by-ball tactical matches. Battle through league stages and hoist the trophy.',
    quote: 'From hammer wars to ball-by-ball WicketPulse showdowns.',
    stats: 'ROUND ROBIN · PLAYOFFS · FINAL SHOWDOWN',
    badge: 'WICKETPULSE ENGINE',
    thumbnailTitle: 'THE TROPHY',
    thumbnailDesc: 'Playoffs & Finale'
  }
];

// All 10 official franchise teams for the squad orbit
const FRANCHISE_LOGOS = [
  { name: 'Chennai Super Kings', src: '/logos/csk.jpg' },
  { name: 'Mumbai Indians', src: '/logos/mi.jpg' },
  { name: 'Royal Challengers Bengaluru', src: '/logos/rcb.png' },
  { name: 'Kolkata Knight Riders', src: '/logos/kkr.jpg' },
  { name: 'Gujarat Titans', src: '/logos/gt.jpg' },
  { name: 'Lucknow Super Giants', src: '/logos/lsg.webp' },
  { name: 'Delhi Capitals', src: '/logos/dc.jpg' },
  { name: 'Rajasthan Royals', src: '/logos/rr.png' },
  { name: 'Sunrisers Hyderabad', src: '/logos/srh.jpeg' },
  { name: 'Punjab Kings', src: '/logos/pbks.jpeg' }
];

interface GameModeCard {
  id: string;
  tag: string;
  title: string;
  description: string;
  metric: string;
  icon: 'gavel' | 'trophy' | 'pulse' | 'shield' | 'flame' | 'users' | 'trending' | 'sparkles';
  badgeColor: string;
  action: 'create' | 'tournament' | 'join' | 'modal';
  fullDetails?: {
    overview: string;
    highlights: string[];
    rules: string[];
  };
}

const GAME_MODES: GameModeCard[] = [
  {
    id: 'quick_auction',
    tag: 'FAST PACED',
    title: 'Quick Auction Blitz',
    description: 'Host a rapid 10-team auction with automated bots or friends. Full hammer mechanics in under 15 minutes.',
    metric: '10-15 MINS',
    icon: 'gavel',
    badgeColor: '#D6AD55',
    action: 'create',
    fullDetails: {
      overview: 'Experience the exhilarating intensity of a mega auction in a fast-paced format. Perfect for quick sessions with friends or testing strategic auction algorithms against adaptive AI bidders.',
      highlights: ['Customizable 5s - 30s bid timers', 'Adjustable purse from 80 Cr to 150 Cr', 'Smart bot bidding with team-need analysis', 'Real-time live budget tracking'],
      rules: ['Minimum 18 players per squad', 'Maximum 8 overseas players', 'Standard professional incremental bid ladders']
    }
  },
  {
    id: 'tournament_mode',
    tag: 'FULL SEASON',
    title: 'Mega Tournament Mode',
    description: 'A complete franchise campaign: live mega auction followed by full league fixtures, standings, and playoffs.',
    metric: '10 TEAMS · LEAGUE',
    icon: 'trophy',
    badgeColor: '#E9C77D',
    action: 'tournament',
    fullDetails: {
      overview: 'The definitive franchise ownership experience. Take a team from the auction floor through home and away fixtures, manage squad rotations, and qualify for the Eliminator and Qualifier stages.',
      highlights: ['Persistent tournament standings & NRR', 'Head-to-head fixtures with friends', 'Multi-user persistent squad storage', 'Championship podium and awards'],
      rules: ['Round-robin group matches', 'Top 4 teams advance to playoffs', 'Qualifier 1, Eliminator, Qualifier 2, Final']
    }
  },
  {
    id: 'wicketpulse',
    tag: 'MULTIPLAYER',
    title: 'WicketPulse Match Engine',
    description: 'Strategic ball-by-ball multiplayer cricket game. Outthink your opponent with bowling tactics and batting aggression.',
    metric: 'LIVE DUEL',
    icon: 'pulse',
    badgeColor: '#48B982',
    action: 'tournament',
    fullDetails: {
      overview: 'WicketPulse converts your drafted squad into an interactive tactical match. Every ball is an intense mental duel between batsman shot selection and bowler line & length.',
      highlights: ['Real-time Supabase multiplayer synchronization', 'Individual player stats & stamina', 'Pace vs spin bowling variations', 'Dynamic powerplay fielding restrictions'],
      rules: ['20 overs per innings', 'Authentic bowler over limits (4 overs max)', 'Dynamic target chases with Duckworth-Lewis handling']
    }
  },
  {
    id: 'squad_builder',
    tag: 'MANAGEMENT',
    title: 'Franchise Squad Builder',
    description: 'Manage 25-man rosters with RTM cards, player roles, overseas constraints, and balance metrics.',
    metric: '25 ROSTER CAP',
    icon: 'shield',
    badgeColor: '#D6AD55',
    action: 'create',
    fullDetails: {
      overview: 'Auction victory requires balanced roster composition. Ensure your franchise satisfies all wicketkeeper, all-rounder, overseas, and pace/spin bowling requirements.',
      highlights: ['Right-to-Match (RTM) strategic usage', 'Overseas player limit enforcement (8 max)', 'Purse allocation analytics', 'Backup player depth chart'],
      rules: ['Must have at least 2 wicketkeepers', 'Minimum 5 bowling options required', 'Strict purse ceiling cannot be breached']
    }
  },
  {
    id: 'live_bidding',
    tag: 'ARENA',
    title: 'Live Bidding Arena',
    description: 'High-octane paddle wars with real-time bidding counter, audio gavel strikes, and countdown tension.',
    metric: 'REAL-TIME',
    icon: 'flame',
    badgeColor: '#E05252',
    action: 'create',
    fullDetails: {
      overview: 'Feel the adrenaline of the auction hall. Raise your franchise paddle, watch rival bids counter in real time, and make split-second decisions before the gavel drops for the final time.',
      highlights: ['Audio cues for bid paddle raises and SOLD hammer strikes', 'Instant bid increment calculator', 'Visual franchise paddles on table', 'Bid history timeline audit'],
      rules: ['Going once, going twice, SOLD mechanic', 'Bids cannot be retracted once submitted', 'Zero-purse bidders are disqualified from current lot']
    }
  },
  {
    id: 'tactical_xi',
    tag: 'TACTICS',
    title: 'Playing XI Match Tactician',
    description: 'Lock your matchday XI, assign captaincy and wicketkeeper gloves, and tailor batting orders to match conditions.',
    metric: '11 SQUAD LOCK',
    icon: 'users',
    badgeColor: '#E9C77D',
    action: 'tournament',
    fullDetails: {
      overview: 'Drafting the squad is only half the battle. Strategically deploy your 11 players based on pitch conditions, boundary dimensions, and opponent strengths.',
      highlights: ['Captaincy boost & tactical leadership', 'Designated wicketkeeper gloveman', 'Flexible batting order adjustment', 'Impact Player substitution option'],
      rules: ['Maximum 4 overseas players in Playing XI', 'Must include minimum 5 bowling options', 'Locked before toss is conducted']
    }
  },
  {
    id: 'leaderboards',
    tag: 'STATISTICS',
    title: 'Franchise Leaderboards',
    description: 'Track purse efficiency, trophy count, win-loss ratios, and historical auction valuation records.',
    metric: 'GLOBAL STATS',
    icon: 'trending',
    badgeColor: '#D6AD55',
    action: 'modal',
    fullDetails: {
      overview: 'Compare your managerial performance against the BidWars community. Track historical purse savings, most valuable squad valuations, and championship conversion rates.',
      highlights: ['Global franchise owner rankings', 'Purse efficiency percentage', 'Auction ROI performance metrics', 'Hall of Fame squads'],
      rules: ['Updated automatically at conclusion of each tournament', 'Verified match data only', 'Seasonal resets with permanent badge trophies']
    }
  },
  {
    id: 'championship',
    tag: 'TROPHY',
    title: 'Championship Trophy',
    description: 'The ultimate prize. Navigate the grueling Qualifier 1, Eliminator, Qualifier 2, and hoist the cup in the Grand Finale.',
    metric: 'GRAND FINALE',
    icon: 'sparkles',
    badgeColor: '#D6AD55',
    action: 'tournament',
    fullDetails: {
      overview: 'Where legends are crowned. The top four franchises from the league phase clash in a high-stakes playoff bracket to decide the BidWars champion.',
      highlights: ['Broadcast-style championship presentation', 'Man of the Match & MVP awards', 'Golden Bat and Golden Ball accolades', 'Permanent franchise championship star'],
      rules: ['Top 2 play Qualifier 1 (winner to Final)', '3rd & 4th play Eliminator', 'Qualifier 2 pits Q1 loser vs Eliminator winner']
    }
  }
];

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

  // Hero Slider
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const slideTimerRef = useRef<number | null>(null);
  const [isHoveringHero, setIsHoveringHero] = useState(false);

  // Modals & Panels
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [activeCardDetail, setActiveCardDetail] = useState<GameModeCard | null>(null);

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

  // Interactive BidWars Auction Showcase Card Simulation
  const [showcaseBid, setShowcaseBid] = useState(14.75);
  const [showcaseBidder, setShowcaseBidder] = useState('ROYAL CHALLENGERS');
  const [showcaseTimer, setShowcaseTimer] = useState(8);
  const [isBidJustRaised, setIsBidJustRaised] = useState(false);

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auth state listener
  useEffect(() => {
    const unsub = authService.onAuthStateChange(u => {
      setCurrentUser(u);
    });

    if (typeof window !== 'undefined' && sessionStorage.getItem('bidwars_open_login_after_reset') === 'true') {
      sessionStorage.removeItem('bidwars_open_login_after_reset');
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
    }

    return unsub;
  }, []);

  // Hero Carousel Autoplay
  useEffect(() => {
    if (isHoveringHero) return;

    slideTimerRef.current = window.setInterval(() => {
      triggerSlideChange((currentSlideIndex + 1) % HERO_SLIDES.length);
    }, 6500);

    return () => {
      if (slideTimerRef.current) clearInterval(slideTimerRef.current);
    };
  }, [currentSlideIndex, isHoveringHero]);

  // Interactive showcase simulated timer
  useEffect(() => {
    const timer = setInterval(() => {
      setShowcaseTimer(prev => (prev > 1 ? prev - 1 : 10));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const triggerSlideChange = (nextIndex: number) => {
    if (nextIndex === currentSlideIndex || isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlideIndex(nextIndex);
    setTimeout(() => {
      setIsTransitioning(false);
    }, 450);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostNickname.trim()) return;
    if (isPrivate && (!password.trim() || password.trim().length < 4)) {
      alert('Password for private rooms must be at least 4 characters');
      return;
    }

    onCreateRoom(hostNickname.trim(), {
      roomName: roomName.trim() || undefined,
      isPrivate,
      password: isPrivate ? password.trim() : undefined,
      season,
      poolMode,
      timerDuration,
      startingPurse: startingPurseCr * 10000000,
      playMode,
      botCount: playMode === 'friends_bots' ? botCount : 0,
      minBidIncrement: minBidIncrementLakh * 100000,
      minSquad: 18,
      maxSquad: 25,
      maxOverseas: 8
    });
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    onJoinRoom(joinCode.trim().toUpperCase(), joinPassword.trim() || undefined);
  };

  const handleShowcaseBidRaise = (amountCr: number) => {
    setShowcaseBid(prev => Number((prev + amountCr).toFixed(2)));
    setShowcaseBidder('YOU (NEON NAWABS)');
    setShowcaseTimer(10);
    setIsBidJustRaised(true);
    setTimeout(() => setIsBidJustRaised(false), 600);
  };

  const handleLogout = async () => {
    await authService.signOut();
    setCurrentUser(null);
  };

  const currentSlide = HERO_SLIDES[currentSlideIndex];

  return (
    <div className="min-h-screen bg-[#0D0F12] text-[#F5F3ED] font-sans selection:bg-[#D6AD55] selection:text-[#08090B] relative overflow-x-hidden">
      {/* Custom Precision Cursor */}
      <CustomCursor />

      {/* ======================================================== */}
      {/* 1. COMPACT, POLISHED FIXED NAVIGATION BAR (68px)         */}
      {/* ======================================================== */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 h-16 sm:h-[68px] transition-all duration-300 flex items-center px-3 sm:px-6 lg:px-8 border-b ${isScrolled
          ? 'bg-[#0D0F12]/95 backdrop-blur-md border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.6)]'
          : 'bg-[#0D0F12]/80 backdrop-blur-sm border-white/[0.04]'
          }`}
      >
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Official BidWars Logo & IPL Edition Badge (Never Overlapping) */}
          <div className="flex items-center gap-2.5 sm:gap-4 shrink-0 min-w-0">
            <BidWarsLogo size="sm" />
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#15181D] border border-[#D6AD55]/30 text-[10px] font-mono text-[#D6AD55] font-semibold tracking-wider uppercase select-none shrink-0">
              IPL 2026 EDITION
            </span>
          </div>

          {/* Center: Desktop Editorial Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-xs font-semibold tracking-wider uppercase text-[#AAA9A2]">
            {[
              { label: 'Auction Arena', onClick: () => setIsCreateModalOpen(true) },
              { label: 'Tournament Mode', onClick: onSwitchToTournament },
              { label: 'WicketPulse', onClick: onSwitchToTournament },
              { label: 'How It Works', onClick: () => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }) },
              { label: 'Showcase', onClick: () => document.getElementById('feature-showcase')?.scrollIntoView({ behavior: 'smooth' }) }
            ].map(item => (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="group relative py-1 text-[#AAA9A2] hover:text-[#F5F3ED] transition-colors duration-200 cursor-pointer"
              >
                <span>{item.label}</span>
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-gradient-to-r from-[#D6AD55] to-[#E9C77D] transition-all duration-300 ease-out group-hover:w-full" />
              </button>
            ))}
          </nav>

          {/* Right: Authentication & CTA Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {currentUser && currentUser.isRegisteredUser ? (
              <div className="flex items-center gap-1.5 sm:gap-2 bg-[#15181D] border border-white/10 px-2.5 sm:px-3 py-1.5 rounded-full text-xs text-[#F5F3ED]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#48B982] animate-pulse" />
                <span className="font-mono text-[#D6AD55] font-semibold text-xs flex items-center gap-1.5 max-w-[100px] sm:max-w-none truncate">
                  <User className="w-3.5 h-3.5 text-[#D6AD55] shrink-0" />
                  <span className="truncate">{currentUser.username}</span>
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign out"
                  className="ml-0.5 text-[#74777D] hover:text-[#E05252] transition-colors p-0.5 cursor-pointer"
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
                className="hidden sm:inline-flex items-center text-xs font-semibold text-[#AAA9A2] hover:text-white px-2.5 sm:px-3 py-2 transition-colors cursor-pointer"
              >
                SIGN IN
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-[#E9C77D] via-[#D6AD55] to-[#927545] text-[#08090B] font-bold text-xs tracking-wider uppercase shadow-[0_2px_10px_rgba(214,173,85,0.25)] hover:brightness-105 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <GavelIcon className="w-3.5 h-3.5 text-[#08090B]" />
              <span className="hidden xs:inline">ENTER ARENA</span>
              <span className="xs:hidden">ARENA</span>
            </button>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#15181D] border border-white/10 flex items-center justify-center text-[#AAA9A2] hover:text-white transition-colors cursor-pointer shrink-0"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer Overlay */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-x-0 top-16 sm:top-[68px] bg-[#0D0F12]/98 border-b border-white/10 p-5 shadow-2xl backdrop-blur-xl animate-fadeIn z-50">
            <div className="flex flex-col gap-3 text-sm font-semibold tracking-wide uppercase">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsCreateModalOpen(true);
                }}
                className="text-left py-2 px-3 rounded-lg hover:bg-white/5 text-[#F5F3ED] cursor-pointer"
              >
                Auction Arena
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onSwitchToTournament && onSwitchToTournament();
                }}
                className="text-left py-2 px-3 rounded-lg hover:bg-white/5 text-[#F5F3ED] cursor-pointer"
              >
                Tournament Mode
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onSwitchToTournament && onSwitchToTournament();
                }}
                className="text-left py-2 px-3 rounded-lg hover:bg-white/5 text-[#F5F3ED] cursor-pointer"
              >
                WicketPulse Duel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-left py-2 px-3 rounded-lg hover:bg-white/5 text-[#AAA9A2] cursor-pointer"
              >
                How It Works
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  document.getElementById('feature-showcase')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-left py-2 px-3 rounded-lg hover:bg-white/5 text-[#AAA9A2] cursor-pointer"
              >
                Feature Showcase
              </button>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                {!currentUser && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setAuthModalMode('login');
                      setIsAuthModalOpen(true);
                    }}
                    className="text-xs font-semibold text-[#D6AD55] uppercase cursor-pointer"
                  >
                    SIGN IN TO ACCOUNT
                  </button>
                )}
                <span className="text-[10px] font-mono text-[#74777D]">IPL 2026 AUCTION ENGINE</span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ======================================================== */}
      {/* 2. BALANCED TWO-COLUMN HERO COMPOSITION                  */}
      {/* ======================================================== */}
      <section
        className="relative w-full min-h-[calc(100vh-68px)] pt-20 pb-16 flex items-center overflow-hidden"
        onMouseEnter={() => setIsHoveringHero(true)}
        onMouseLeave={() => setIsHoveringHero(false)}
      >
        {/* Realistic Cricket Stadium Atmosphere Backdrop */}
        <div className="absolute inset-0 bg-[#08090B]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_15%,rgba(214,173,85,0.12),rgba(8,9,11,0.95)_70%)]" />
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(233,199,125,0.08)_0%,transparent_65%)] blur-3xl pointer-events-none" />
          <div className="absolute top-10 right-1/4 w-[450px] h-[450px] bg-[radial-gradient(circle,rgba(214,173,85,0.08)_0%,transparent_60%)] blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
        </div>

        {/* Content Container */}
        <div className="relative z-30 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

            {/* ---------------------------------------------------- */}
            {/* LEFT COLUMN: Headings, Editorial Quote, Actions      */}
            {/* ---------------------------------------------------- */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              {/* Eyebrow Tag */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#15181D]/90 border border-[#D6AD55]/30 backdrop-blur-md mb-4 w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D6AD55] animate-ping" />
                <span className="font-mono text-[11px] font-semibold tracking-widest text-[#E9C77D] uppercase">
                  {currentSlide.tag}
                </span>
              </div>

              {/* Bold, Proportional Sports-Editorial Headline */}
              <h1 className="font-bebas text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight uppercase leading-[0.98] sm:leading-[0.96] text-[#F5F3ED] mb-3 max-w-xl break-words">
                {currentSlide.title}
              </h1>

              {/* Editorial Cormorant Accent Quote */}
              <p className="font-cormorant italic text-base sm:text-lg lg:text-xl text-[#E9C77D] font-medium mb-3 max-w-lg leading-snug">
                "{currentSlide.quote}"
              </p>

              {/* Supporting Manrope Description */}
              <p className="text-xs sm:text-sm text-[#AAA9A2] leading-relaxed max-w-md mb-5 sm:mb-6">
                {currentSlide.subtitle}
              </p>

              {/* Meta Statistics Badges */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs font-mono text-[#AAA9A2] mb-5 sm:mb-6">
                <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-[#15181D]/80 border border-white/10 flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
                  <span className="text-[#D6AD55] font-bold">120 CR</span> PURSE
                </div>
                <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-[#15181D]/80 border border-white/10 flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
                  <span className="text-[#D6AD55] font-bold">10</span> TEAMS
                </div>
                <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-[#15181D]/80 border border-white/10 flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
                  <span className="text-[#48B982] font-bold">LIVE</span> SYNC
                </div>
              </div>

              {/* Left Column Primary CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#E9C77D] via-[#D6AD55] to-[#927545] text-[#08090B] font-bold text-xs uppercase tracking-wider shadow-[0_4px_16px_rgba(214,173,85,0.35)] hover:brightness-105 active:scale-95 transition-all cursor-pointer"
                >
                  <GavelIcon className="w-4 h-4 text-[#08090B]" />
                  <span>START QUICK AUCTION</span>
                </button>
                <button
                  type="button"
                  onClick={onSwitchToTournament}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#15181D] hover:bg-[#1B1E23] border border-white/10 hover:border-[#D6AD55]/40 text-[#F5F3ED] font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  <Trophy className="w-4 h-4 text-[#E9C77D]" />
                  <span>TOURNAMENT MODE</span>
                </button>
              </div>
            </div>

            {/* ---------------------------------------------------- */}
            {/* RIGHT COLUMN: Squad Orbit & Section Navigation Rail  */}
            {/* ---------------------------------------------------- */}
            <div className="lg:col-span-5 flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-5 sm:gap-8 mt-4 sm:mt-6 lg:mt-0">

              {/* Circular Visual Artwork Container (Orbit / Hammer / Trophy) */}
              <div className="relative flex-1 flex items-center justify-center min-h-[260px] sm:min-h-[320px] w-full max-w-[320px] sm:max-w-none">
                {/* Slide 0: The Hammer Artwork */}
                {currentSlideIndex === 0 && (
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-[220px] h-[220px] sm:w-[260px] sm:h-[260px] rounded-full bg-gradient-to-tr from-[#D6AD55]/15 to-transparent blur-2xl animate-pulse" />
                    <img
                      src="/auction-hammer.png"
                      alt="Auction Hammer"
                      className="w-[180px] sm:w-[250px] object-contain drop-shadow-[0_16px_32px_rgba(0,0,0,0.85)] filter contrast-125 transform -rotate-12 hover:rotate-0 transition-transform duration-500"
                    />
                  </div>
                )}

                {/* Slide 1: Squad Orbit Visualization (10 Franchises, Zero Collision) */}
                {currentSlideIndex === 1 && (
                  <div className="relative w-[250px] h-[250px] sm:w-[300px] sm:h-[300px] flex items-center justify-center">
                    {/* Concentric Subtle Orbit Paths */}
                    <div className="absolute inset-0 rounded-full border border-[#D6AD55]/20 animate-spin" style={{ animationDuration: '50s' }}>
                      {/* 10 Franchise Logos Distributed on Circle */}
                      {FRANCHISE_LOGOS.map((franchise, idx) => {
                        const angleRad = (idx * 36) * (Math.PI / 180);
                        // Radius ~43% of container puts logos comfortably outside center element
                        const leftPercent = 50 + 43 * Math.cos(angleRad);
                        const topPercent = 50 + 43 * Math.sin(angleRad);
                        return (
                          <div
                            key={franchise.name}
                            className="absolute w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#D6AD55]/50 bg-[#0D0F12] shadow-md p-0.5 overflow-hidden transform -translate-x-1/2 -translate-y-1/2"
                            style={{
                              left: `${leftPercent}%`,
                              top: `${topPercent}%`
                            }}
                            title={franchise.name}
                          >
                            <img
                              src={franchise.src}
                              alt={franchise.name}
                              className="w-full h-full object-cover rounded-full"
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Visually Centered '10 SQUADS' Element */}
                    <div className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#15181D] border-2 border-[#D6AD55] flex flex-col items-center justify-center shadow-[0_0_20px_rgba(214,173,85,0.3)]">
                      <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-[#D6AD55] mb-0.5" />
                      <span className="text-[9px] sm:text-[10px] font-mono uppercase font-bold text-[#F5F3ED] tracking-wider">10 SQUADS</span>
                      <span className="text-[7px] sm:text-[8px] font-mono text-[#D6AD55]">IPL 2026</span>
                    </div>
                  </div>
                )}

                {/* Slide 2: The Trophy Artwork */}
                {currentSlideIndex === 2 && (
                  <div className="relative flex flex-col items-center justify-center">
                    <div className="absolute w-[220px] h-[220px] sm:w-[260px] sm:h-[260px] rounded-full bg-[radial-gradient(circle,rgba(214,173,85,0.25)_0%,transparent_70%)] blur-2xl" />
                    <Trophy className="w-32 h-32 sm:w-40 sm:h-40 text-[#E9C77D] drop-shadow-[0_12px_24px_rgba(0,0,0,0.9)] stroke-[1.2]" />
                    <div className="mt-2.5 px-3 py-1 rounded-full bg-[#15181D] border border-[#D6AD55]/40">
                      <span className="font-mono text-[9px] sm:text-[10px] text-[#D6AD55] font-bold tracking-widest uppercase">IPL 2026 CHAMPION</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Section Navigation Rail (Vertical on desktop, horizontal below on mobile) */}
              <div className="shrink-0 flex flex-row lg:flex-col items-center gap-3 sm:gap-4 select-none lg:pl-3 lg:border-l lg:border-white/[0.06]">
                {HERO_SLIDES.map((slide, idx) => {
                  const isActive = idx === currentSlideIndex;
                  return (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => triggerSlideChange(idx)}
                      className="group flex flex-col items-center gap-1 cursor-pointer focus:outline-none transition-all"
                    >
                      {/* Circular Button */}
                      <div
                        className={`relative rounded-full flex items-center justify-center transition-all duration-300 ${isActive
                          ? 'w-10 h-10 sm:w-11 sm:h-11 bg-[#15181D] border-2 border-[#D6AD55] shadow-[0_0_16px_rgba(214,173,85,0.4)] scale-105'
                          : 'w-8 h-8 sm:w-9 sm:h-9 bg-[#15181D]/70 border border-white/15 opacity-60 hover:opacity-100'
                          }`}
                      >
                        {idx === 0 && <GavelIcon className={`${isActive ? 'w-4 h-4 sm:w-5 sm:h-5 text-[#D6AD55]' : 'w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#AAA9A2]'}`} />}
                        {idx === 1 && <Shield className={`${isActive ? 'w-4 h-4 sm:w-5 sm:h-5 text-[#D6AD55]' : 'w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#AAA9A2]'}`} />}
                        {idx === 2 && <Trophy className={`${isActive ? 'w-4 h-4 sm:w-5 sm:h-5 text-[#D6AD55]' : 'w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#AAA9A2]'}`} />}
                      </div>

                      {/* Clean Aligned Text Label */}
                      <span className={`text-[9px] font-mono tracking-wider uppercase transition-colors ${isActive ? 'text-[#D6AD55] font-bold' : 'text-[#74777D] group-hover:text-[#AAA9A2]'
                        }`}>
                        0{slide.id}
                      </span>
                    </button>
                  );
                })}
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. HERO ACTION PANEL                                     */}
      {/* ======================================================== */}
      <div className="relative z-40 max-w-5xl mx-auto px-4 -mt-4 sm:-mt-6">
        <div className="w-full bg-[#15181D]/95 backdrop-blur-xl border border-[#D6AD55]/30 rounded-2xl p-3 sm:p-4 shadow-[0_16px_40px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Field 1: Quick Auction */}
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-3 p-3 rounded-xl bg-[#1B1E23] hover:bg-[#22262D] border border-white/[0.06] hover:border-[#D6AD55]/40 transition-all text-left cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-lg bg-[#D6AD55]/10 border border-[#D6AD55]/25 flex items-center justify-center shrink-0 group-hover:bg-[#D6AD55]/20 transition-colors">
                <GavelIcon className="w-4 h-4 text-[#D6AD55]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-mono font-bold tracking-wider uppercase text-[#D6AD55]">MODE 01</span>
                <span className="text-sm font-bold text-[#F5F3ED] truncate">Quick Auction</span>
                <span className="text-[10px] text-[#74777D] truncate">Instant 10-team room</span>
              </div>
            </button>

            {/* Field 2: Tournament Mode */}
            <button
              type="button"
              onClick={onSwitchToTournament}
              className="flex items-center gap-3 p-3 rounded-xl bg-[#1B1E23] hover:bg-[#22262D] border border-white/[0.06] hover:border-[#D6AD55]/40 transition-all text-left cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-lg bg-[#E9C77D]/10 border border-[#E9C77D]/25 flex items-center justify-center shrink-0 group-hover:bg-[#E9C77D]/20 transition-colors">
                <Trophy className="w-4 h-4 text-[#E9C77D]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-mono font-bold tracking-wider uppercase text-[#E9C77D]">MODE 02</span>
                <span className="text-sm font-bold text-[#F5F3ED] truncate">Tournament</span>
                <span className="text-[10px] text-[#74777D] truncate">League & Playoffs</span>
              </div>
            </button>

            {/* Field 3: Join Room */}
            <button
              type="button"
              onClick={() => setIsJoinModalOpen(true)}
              className="flex items-center gap-3 p-3 rounded-xl bg-[#1B1E23] hover:bg-[#22262D] border border-white/[0.06] hover:border-[#D6AD55]/40 transition-all text-left cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                <Users className="w-4 h-4 text-[#AAA9A2] group-hover:text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-mono font-bold tracking-wider uppercase text-[#AAA9A2]">ROOM CODE</span>
                <span className="text-sm font-bold text-[#F5F3ED] truncate">Join Room</span>
                <span className="text-[10px] text-[#74777D] truncate">Enter 6-digit code</span>
              </div>
            </button>

            {/* Action CTA: Enter Arena */}
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-[#E9C77D] via-[#D6AD55] to-[#927545] text-[#08090B] font-bold text-xs tracking-wider uppercase shadow-[0_4px_16px_rgba(214,173,85,0.35)] hover:brightness-105 active:scale-98 transition-all cursor-pointer"
            >
              <span>ENTER ARENA</span>
              <ArrowRight className="w-4 h-4 text-[#08090B]" />
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. RECOMMENDED GAME MODES & EXPERIENCES (8 Cards Grid)   */}
      {/* ======================================================== */}
      <section className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#D6AD55] tracking-widest uppercase mb-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>FRANCHISE EXPERIENCES</span>
            </div>
            <h2 className="font-bebas text-3xl sm:text-4xl lg:text-5xl uppercase tracking-tight text-[#F5F3ED]">
              ENGINEERED FOR CRICKET PURISTS
            </h2>
          </div>
          <p className="mt-2 md:mt-0 text-xs sm:text-sm text-[#AAA9A2] max-w-md font-sans">
            Every mode replicates real IPL auction rules, purse restrictions, and matchday tactical battles.
          </p>
        </div>

        {/* 8 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {GAME_MODES.map(mode => (
            <div
              key={mode.id}
              className="group relative bg-[#15181D] hover:bg-[#1B1E23] border border-white/[0.08] hover:border-[#D6AD55]/40 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(0,0,0,0.6)] cursor-pointer"
              onClick={() => {
                if (mode.action === 'create') setIsCreateModalOpen(true);
                else if (mode.action === 'tournament') onSwitchToTournament && onSwitchToTournament();
                else setActiveCardDetail(mode);
              }}
            >
              <div>
                {/* Header Tag & Metric */}
                <div className="flex items-center justify-between mb-3.5">
                  <span
                    className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08]"
                    style={{ color: mode.badgeColor }}
                  >
                    {mode.tag}
                  </span>
                  <span className="text-[10px] font-mono text-[#74777D] font-medium">{mode.metric}</span>
                </div>

                {/* Mode Icon */}
                <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-3.5 group-hover:border-[#D6AD55]/30 group-hover:bg-[#D6AD55]/10 transition-colors">
                  {mode.icon === 'gavel' && <GavelIcon className="w-4 h-4 text-[#D6AD55]" />}
                  {mode.icon === 'trophy' && <Trophy className="w-4 h-4 text-[#E9C77D]" />}
                  {mode.icon === 'pulse' && <Zap className="w-4 h-4 text-[#48B982]" />}
                  {mode.icon === 'shield' && <Shield className="w-4 h-4 text-[#D6AD55]" />}
                  {mode.icon === 'flame' && <Flame className="w-4 h-4 text-[#E05252]" />}
                  {mode.icon === 'users' && <Users className="w-4 h-4 text-[#E9C77D]" />}
                  {mode.icon === 'trending' && <TrendingUp className="w-4 h-4 text-[#D6AD55]" />}
                  {mode.icon === 'sparkles' && <Sparkles className="w-4 h-4 text-[#D6AD55]" />}
                </div>

                {/* Title */}
                <h3 className="font-bebas text-xl sm:text-2xl tracking-wide uppercase text-[#F5F3ED] group-hover:text-[#E9C77D] transition-colors mb-1.5">
                  {mode.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-[#AAA9A2] leading-relaxed line-clamp-3">
                  {mode.description}
                </p>
              </div>

              {/* Bottom Explore Link */}
              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-semibold text-[#D6AD55] group-hover:text-[#E9C77D]">
                <span>VIEW SPECS</span>
                <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. EDITORIAL "HOW IT WORKS"                              */}
      {/* ======================================================== */}
      <section id="how-it-works" className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/[0.06]">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-mono text-[#D6AD55] tracking-widest uppercase font-bold">FOUR-PHASE CYCLE</span>
          <h2 className="font-bebas text-3xl sm:text-4xl uppercase tracking-tight text-[#F5F3ED] mt-1.5">
            HOW TO PLAY BIDWARS
          </h2>
          <p className="font-cormorant italic text-base sm:text-lg text-[#E9C77D] mt-1.5">
            "From the opening gavel strike to the championship victory lap."
          </p>
        </div>

        {/* 4 Steps Horizontal Track */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 relative">
          {[
            {
              step: '01',
              title: 'ASSEMBLE & CONFIGURE',
              desc: 'Create or join a private room. Customize purse limits (up to 120 Cr), timer pace, overseas quotas, and invite managers or bots.'
            },
            {
              step: '02',
              title: 'BID UNDER THE HAMMER',
              desc: 'Engage in live multiplayer bidding wars. Read opponent purses, leverage RTM cards, track remaining slots, and land marquee players.'
            },
            {
              step: '03',
              title: 'FORM PLAYING XI',
              desc: 'Select your starting eleven adhering to the 4-overseas limit. Assign captaincy, designated wicketkeeper, and balance pace vs spin attacks.'
            },
            {
              step: '04',
              title: 'CONQUER WICKETPULSE',
              desc: 'Simulate head-to-head matches in the ball-by-ball WicketPulse engine. Battle through the points table to lift the championship trophy.'
            }
          ].map(item => (
            <div
              key={item.step}
              className="relative bg-[#15181D] border border-white/[0.08] rounded-2xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#1B1E23] border border-[#D6AD55]/30 flex items-center justify-center font-mono font-bold text-sm text-[#D6AD55] mb-3">
                  {item.step}
                </div>
                <h3 className="font-bebas text-lg tracking-wide uppercase text-[#F5F3ED] mb-1.5">
                  {item.title}
                </h3>
                <p className="text-xs text-[#AAA9A2] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 6. BIDWARS FEATURE SHOWCASE (Interactive Auction Card)   */}
      {/* ======================================================== */}
      <section id="feature-showcase" className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/[0.06]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left Info Column */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#15181D] border border-[#D6AD55]/30 text-xs font-mono text-[#D6AD55] mb-3">
              <Flame className="w-3.5 h-3.5 text-[#E05252]" />
              <span>LIVE HAMMER PHYSICS</span>
            </div>

            <h2 className="font-bebas text-3xl sm:text-4xl lg:text-5xl uppercase tracking-tight text-[#F5F3ED] leading-none mb-3">
              EVERY PLAYER. EVERY BID. EVERY DECISION.
            </h2>

            <p className="text-xs sm:text-sm text-[#AAA9A2] leading-relaxed mb-5">
              Experience the pressure of the auction table with split-second paddle raises, automated budget exhaustion calculations, and full franchise roster audit.
            </p>

            <ul className="space-y-3 text-xs text-[#AAA9A2] font-medium mb-6">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#D6AD55] shrink-0" />
                <span>Real-time Supabase WebSockets with sub-50ms paddle synchronization</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#D6AD55] shrink-0" />
                <span>Official IPL 2026 player database with comprehensive stats & roles</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#D6AD55] shrink-0" />
                <span>Automated RTM (Right-to-Match) matching and franchise priority rules</span>
              </li>
            </ul>

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#E9C77D] via-[#D6AD55] to-[#927545] text-[#08090B] font-bold text-xs uppercase tracking-wider shadow-[0_4px_16px_rgba(214,173,85,0.3)] hover:brightness-105 active:scale-95 transition-all cursor-pointer"
            >
              <GavelIcon className="w-4 h-4 text-[#08090B]" />
              <span>HOST YOUR AUCTION ROOM</span>
            </button>
          </div>

          {/* Right Column: Interactive Simulated Auction Card */}
          <div className="relative">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#D6AD55]/15 to-[#E9C77D]/10 blur-xl pointer-events-none" />

            <div className="relative bg-[#15181D] border border-[#D6AD55]/30 rounded-2xl p-5 sm:p-6 shadow-[0_20px_40px_rgba(0,0,0,0.8)]">
              {/* Card Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08] mb-5">
                <div>
                  <span className="text-[10px] font-mono text-[#D6AD55] font-bold tracking-widest uppercase">LOT #42 · MARQUEE BATSMAN</span>
                  <h3 className="font-bebas text-2xl sm:text-3xl uppercase tracking-wide text-[#F5F3ED]">
                    VIRAT KOHLI
                  </h3>
                  <span className="text-xs text-[#AAA9A2]">Top-Order Anchor · Right-Handed · India</span>
                </div>

                {/* Circular Countdown Timer */}
                <div className="w-12 h-12 rounded-full bg-[#1B1E23] border-2 border-[#D6AD55] flex flex-col items-center justify-center font-mono text-center">
                  <span className={`text-sm font-bold ${showcaseTimer <= 3 ? 'text-[#E05252] animate-ping' : 'text-[#D6AD55]'}`}>
                    {showcaseTimer}s
                  </span>
                  <span className="text-[7px] text-[#74777D] uppercase">TIMER</span>
                </div>
              </div>

              {/* Live Bid Board */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="p-3 rounded-xl bg-[#1B1E23] border border-white/[0.06]">
                  <span className="text-[9px] font-mono text-[#74777D] uppercase">BASE PRICE</span>
                  <p className="font-mono text-lg text-[#F5F3ED] font-bold mt-0.5">₹2.00 Cr</p>
                </div>
                <div className={`p-3 rounded-xl bg-[#1B1E23] border transition-all duration-300 ${isBidJustRaised ? 'border-[#D6AD55] bg-[#D6AD55]/10 scale-102' : 'border-white/[0.06]'}`}>
                  <span className="text-[9px] font-mono text-[#D6AD55] uppercase font-bold">CURRENT HIGHEST BID</span>
                  <p className="font-mono text-xl text-[#E9C77D] font-bold mt-0.5">₹{showcaseBid.toFixed(2)} Cr</p>
                </div>
              </div>

              {/* Leading Franchise Pill */}
              <div className="p-2.5 rounded-xl bg-[#1B1E23]/80 border border-white/[0.08] flex items-center justify-between mb-5 text-xs">
                <span className="text-[#AAA9A2]">LEADING BIDDER:</span>
                <span className="font-mono font-bold text-[#F5F3ED] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#48B982]" />
                  {showcaseBidder}
                </span>
              </div>

              {/* Interactive Bid Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleShowcaseBidRaise(0.25)}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#E9C77D] to-[#D6AD55] text-[#08090B] font-bold font-mono text-xs uppercase tracking-wider shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <GavelIcon className="w-3.5 h-3.5 text-[#08090B]" />
                  <span>BID +₹25 L</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleShowcaseBidRaise(0.50)}
                  className="py-2.5 px-3 rounded-xl bg-[#1B1E23] hover:bg-[#252930] border border-[#D6AD55]/40 text-[#E9C77D] font-bold font-mono text-xs uppercase tracking-wider active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <GavelIcon className="w-3.5 h-3.5 text-[#E9C77D]" />
                  <span>BID +₹50 L</span>
                </button>
              </div>

              <div className="mt-3 text-center">
                <span className="text-[9px] font-mono text-[#74777D] tracking-wider uppercase">
                  INTERACTIVE PREVIEW · CLICK BUTTONS TO TEST MECHANICS
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 7. CHAMPIONSHIP ROAD TO THE TITLE SHOWCASE               */}
      {/* ======================================================== */}
      <section className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/[0.06]">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-mono text-[#D6AD55] tracking-widest uppercase font-bold">THE ROAD TO GLORY</span>
          <h2 className="font-bebas text-3xl sm:text-4xl uppercase tracking-tight text-[#F5F3ED] mt-1.5">
            LEAGUE STANDINGS & PLAYOFFS
          </h2>
          <p className="text-xs sm:text-sm text-[#AAA9A2] mt-1.5 font-sans">
            Every match counts toward net run rate and tournament qualification.
          </p>
        </div>

        {/* Standings Preview Table */}
        <div className="max-w-4xl mx-auto bg-[#15181D] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-5 py-3.5 bg-[#1B1E23] border-b border-white/[0.06] flex items-center justify-between">
            <span className="font-mono text-xs text-[#D6AD55] font-bold uppercase tracking-wider">IPL 2026 STANDINGS TABLE</span>
            <span className="text-[10px] font-mono text-[#74777D]">ROUND ROBIN STAGE</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] text-[10px] font-mono text-[#74777D] uppercase">
                  <th className="py-2.5 px-4 sm:px-6">POS</th>
                  <th className="py-2.5 px-4 sm:px-6">FRANCHISE</th>
                  <th className="py-2.5 px-3 text-center">P</th>
                  <th className="py-2.5 px-3 text-center">W</th>
                  <th className="py-2.5 px-3 text-center">L</th>
                  <th className="py-2.5 px-3 text-center">NRR</th>
                  <th className="py-2.5 px-4 sm:px-6 text-right">PTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-xs">
                {[
                  { pos: '01', team: 'Chennai Super Kings', p: 14, w: 10, l: 4, nrr: '+0.842', pts: 20, tag: 'QUALIFIED Q1' },
                  { pos: '02', team: 'Mumbai Indians', p: 14, w: 9, l: 5, nrr: '+0.512', pts: 18, tag: 'QUALIFIED Q1' },
                  { pos: '03', team: 'Royal Challengers Bengaluru', p: 14, w: 8, l: 6, nrr: '+0.320', pts: 16, tag: 'ELIMINATOR' },
                  { pos: '04', team: 'Kolkata Knight Riders', p: 14, w: 8, l: 6, nrr: '+0.114', pts: 16, tag: 'ELIMINATOR' }
                ].map((row) => (
                  <tr key={row.pos} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 sm:px-6 font-mono font-bold text-[#D6AD55]">{row.pos}</td>
                    <td className="py-3 px-4 sm:px-6 font-semibold text-[#F5F3ED] flex items-center gap-2">
                      <span className="truncate">{row.team}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#D6AD55]/10 text-[#D6AD55] border border-[#D6AD55]/20 shrink-0">
                        {row.tag}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-[#AAA9A2]">{row.p}</td>
                    <td className="py-3 px-3 text-center font-mono text-[#48B982] font-semibold">{row.w}</td>
                    <td className="py-3 px-3 text-center font-mono text-[#E05252]">{row.l}</td>
                    <td className="py-3 px-3 text-center font-mono text-[#AAA9A2]">{row.nrr}</td>
                    <td className="py-3 px-4 sm:px-6 text-right font-mono font-bold text-[#F5F3ED] text-sm">{row.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3.5 bg-[#1B1E23]/60 border-t border-white/[0.06] text-center">
            <button
              type="button"
              onClick={onSwitchToTournament}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-[#D6AD55] hover:text-[#E9C77D] font-bold tracking-wider uppercase transition-colors cursor-pointer"
            >
              <span>OPEN FULL TOURNAMENT FIXTURES & STANDINGS</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 8. FOOTER                                                */}
      {/* ======================================================== */}
      <footer className="relative z-20 bg-[#08090B] border-t border-white/[0.08] pt-12 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-white/[0.06]">
            {/* Col 1: Wordmark & Tagline */}
            <div className="md:col-span-1">
              <BidWarsLogo size="sm" />
              <p className="font-bebas text-base tracking-wider text-[#D6AD55] uppercase mt-2.5">
                BUILD YOUR SQUAD. OWN THE GAME.
              </p>
              <p className="text-xs text-[#74777D] mt-1.5 leading-relaxed font-sans">
                Real-time multiplayer cricket auction and tournament simulation platform.
              </p>
              <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-[#48B982]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#48B982] animate-pulse" />
                <span>ALL SYSTEMS OPERATIONAL</span>
              </div>
            </div>

            {/* Col 2: Game Modes */}
            <div>
              <h4 className="font-mono text-xs font-bold text-[#F5F3ED] uppercase tracking-wider mb-3">GAME MODES</h4>
              <ul className="space-y-2 text-xs text-[#AAA9A2]">
                <li><button type="button" onClick={() => setIsCreateModalOpen(true)} className="hover:text-[#D6AD55] transition-colors">Quick Auction Blitz</button></li>
                <li><button type="button" onClick={onSwitchToTournament} className="hover:text-[#D6AD55] transition-colors">Mega Tournament</button></li>
                <li><button type="button" onClick={onSwitchToTournament} className="hover:text-[#D6AD55] transition-colors">WicketPulse Engine</button></li>
                <li><button type="button" onClick={() => setIsCreateModalOpen(true)} className="hover:text-[#D6AD55] transition-colors">Squad Architect</button></li>
              </ul>
            </div>

            {/* Col 3: Resources */}
            <div>
              <h4 className="font-mono text-xs font-bold text-[#F5F3ED] uppercase tracking-wider mb-3">RESOURCES</h4>
              <ul className="space-y-2 text-xs text-[#AAA9A2]">
                <li><button type="button" onClick={() => setIsCreateModalOpen(true)} className="hover:text-[#D6AD55] transition-colors">IPL 2026 Auction Rules</button></li>
                <li><button type="button" onClick={() => setIsCreateModalOpen(true)} className="hover:text-[#D6AD55] transition-colors">Purse & Bid Increments</button></li>
                <li><button type="button" onClick={() => setIsCreateModalOpen(true)} className="hover:text-[#D6AD55] transition-colors">RTM Card Mechanics</button></li>
                <li><button type="button" onClick={onSwitchToTournament} className="hover:text-[#D6AD55] transition-colors">WicketPulse Guide</button></li>
              </ul>
            </div>

            {/* Col 4: Legal & Ethics */}
            <div>
              <h4 className="font-mono text-xs font-bold text-[#F5F3ED] uppercase tracking-wider mb-3">LEGAL & ETHICS</h4>
              <ul className="space-y-2 text-xs text-[#74777D]">
                <li>Non-commercial cricket fan simulator.</li>
                <li>Player names & imagery property of respective rights holders.</li>
                <li>Zero real money gambling. Entertainment only.</li>
                <li className="text-[10px] text-[#74777D] pt-1">© 2026 BIDWARS. ALL RIGHTS RESERVED.</li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#74777D] font-mono gap-3">
            <span>VERSION 2.6.4 (IPL MEGA POOL READY)</span>
            <div className="flex items-center gap-5">
              <span>PRIVACY POLICY</span>
              <span>TERMS OF SERVICE</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ======================================================== */}
      {/* 9. CREATE ROOM / QUICK AUCTION MODAL                     */}
      {/* ======================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-xl bg-[#15181D] border border-[#D6AD55]/40 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.9)] max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-[#15181D] z-10 px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <GavelIcon className="w-5 h-5 text-[#D6AD55]" />
                <h3 className="font-bebas text-2xl uppercase tracking-wide text-[#F5F3ED]">
                  HOST AUCTION ROOM
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#AAA9A2] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
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
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1B1E23] border border-white/10 focus:border-[#D6AD55] text-sm text-[#F5F3ED] placeholder-[#74777D] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#AAA9A2] mb-1.5">
                  ROOM NAME (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. IPL 2026 Mega Arena"
                  value={roomName}
                  onChange={e => setRoomName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1B1E23] border border-white/10 focus:border-[#D6AD55] text-sm text-[#F5F3ED] placeholder-[#74777D] focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#AAA9A2] mb-1.5">
                    PLAY MODE
                  </label>
                  <select
                    value={playMode}
                    onChange={e => setPlayMode(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1B1E23] border border-white/10 focus:border-[#D6AD55] text-xs font-semibold text-[#F5F3ED] focus:outline-none"
                  >
                    <option value="friends_bots">Friends + AI Bots</option>
                    <option value="friends_only">Friends Only (Multiplayer)</option>
                  </select>
                </div>

                {playMode === 'friends_bots' ? (
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#AAA9A2] mb-1.5">
                      AI BOTS ({botCount})
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={9}
                      value={botCount}
                      onChange={e => setBotCount(Number(e.target.value))}
                      className="w-full mt-2 accent-[#D6AD55]"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#AAA9A2] mb-1.5">
                      TIMER PER LOT
                    </label>
                    <select
                      value={timerDuration}
                      onChange={e => setTimerDuration(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#1B1E23] border border-white/10 focus:border-[#D6AD55] text-xs font-semibold text-[#F5F3ED] focus:outline-none"
                    >
                      <option value={8}>8s (Blitz)</option>
                      <option value={10}>10s (Standard)</option>
                      <option value={15}>15s (Tactical)</option>
                      <option value={20}>20s (Relaxed)</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#AAA9A2] mb-1.5">
                    STARTING PURSE
                  </label>
                  <select
                    value={startingPurseCr}
                    onChange={e => setStartingPurseCr(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1B1E23] border border-white/10 focus:border-[#D6AD55] text-xs font-semibold text-[#F5F3ED] focus:outline-none"
                  >
                    <option value={100}>₹100 Cr</option>
                    <option value={120}>₹120 Cr (Official 2026)</option>
                    <option value={140}>₹140 Cr</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#AAA9A2] mb-1.5">
                    PLAYER POOL
                  </label>
                  <select
                    value={poolMode}
                    onChange={e => setPoolMode(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1B1E23] border border-white/10 focus:border-[#D6AD55] text-xs font-semibold text-[#F5F3ED] focus:outline-none"
                  >
                    <option value="auction_pool">Official Auction Pool (2026)</option>
                    <option value="mega_all">Mega Pool (All Available)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#1B1E23] border border-white/[0.06] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#F5F3ED] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#D6AD55]" />
                    Private Protected Room
                  </span>
                  <span className="text-[10px] text-[#74777D] block">Require password to join</span>
                </div>
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={e => setIsPrivate(e.target.checked)}
                  className="w-4 h-4 accent-[#D6AD55] cursor-pointer"
                />
              </div>

              {isPrivate && (
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#D6AD55] mb-1.5">
                    ROOM PASSWORD *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={isPrivate}
                      placeholder="At least 4 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#1B1E23] border border-white/10 focus:border-[#D6AD55] text-sm text-[#F5F3ED] placeholder-[#74777D] focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#74777D] hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#E9C77D] via-[#D6AD55] to-[#927545] text-[#08090B] font-bold text-xs uppercase tracking-wider shadow-lg hover:brightness-105 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 mt-4"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-[#08090B] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <GavelIcon className="w-4 h-4 text-[#08090B]" />
                    <span>CREATE ROOM & LAUNCH</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 10. JOIN ROOM MODAL                                      */}
      {/* ======================================================== */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#15181D] border border-[#D6AD55]/40 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.9)] p-6">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08] mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#D6AD55]" />
                <h3 className="font-bebas text-2xl uppercase tracking-wide text-[#F5F3ED]">
                  JOIN AUCTION ROOM
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsJoinModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#AAA9A2] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#D6AD55] mb-1.5">
                  6-DIGIT ROOM CODE *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. 7X9K2P"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-xl bg-[#1B1E23] border border-white/10 focus:border-[#D6AD55] text-center font-mono font-bold text-lg text-[#D6AD55] tracking-widest placeholder-[#74777D] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#AAA9A2] mb-1.5">
                  ROOM PASSWORD (IF PROTECTED)
                </label>
                <div className="relative">
                  <input
                    type={showJoinPassword ? 'text' : 'password'}
                    placeholder="Enter password if private"
                    value={joinPassword}
                    onChange={e => setJoinPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#1B1E23] border border-white/10 focus:border-[#D6AD55] text-sm text-[#F5F3ED] placeholder-[#74777D] focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowJoinPassword(!showJoinPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#74777D] hover:text-white"
                  >
                    {showJoinPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !joinCode.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#E9C77D] via-[#D6AD55] to-[#927545] text-[#08090B] font-bold text-xs uppercase tracking-wider shadow-lg hover:brightness-105 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-[#08090B] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Users className="w-4 h-4 text-[#08090B]" />
                    <span>CONNECT TO ARENA</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 11. MODE DETAIL SHEET MODAL                              */}
      {/* ======================================================== */}
      {activeCardDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#15181D] border border-[#D6AD55]/40 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.9)] p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08] mb-4">
              <div>
                <span className="text-[10px] font-mono text-[#D6AD55] font-bold uppercase tracking-widest">
                  {activeCardDetail.tag} · {activeCardDetail.metric}
                </span>
                <h3 className="font-bebas text-2xl sm:text-3xl uppercase tracking-wide text-[#F5F3ED]">
                  {activeCardDetail.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveCardDetail(null)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#AAA9A2] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeCardDetail.fullDetails && (
              <div className="space-y-4 text-xs text-[#AAA9A2]">
                <p className="text-xs sm:text-sm leading-relaxed text-[#F5F3ED]">
                  {activeCardDetail.fullDetails.overview}
                </p>

                <div>
                  <h4 className="font-mono text-xs font-bold text-[#D6AD55] uppercase tracking-wider mb-1.5">
                    KEY CAPABILITIES
                  </h4>
                  <ul className="space-y-1 list-disc list-inside text-[#AAA9A2]">
                    {activeCardDetail.fullDetails.highlights.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-mono text-xs font-bold text-[#D6AD55] uppercase tracking-wider mb-1.5">
                    OFFICIAL REGULATIONS
                  </h4>
                  <ul className="space-y-1 list-disc list-inside text-[#AAA9A2]">
                    {activeCardDetail.fullDetails.rules.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="mt-5 pt-3.5 border-t border-white/[0.08] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveCardDetail(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#AAA9A2] cursor-pointer"
              >
                CLOSE
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = activeCardDetail.action;
                  setActiveCardDetail(null);
                  if (action === 'create') setIsCreateModalOpen(true);
                  else if (action === 'tournament') onSwitchToTournament && onSwitchToTournament();
                  else if (action === 'join') setIsJoinModalOpen(true);
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#E9C77D] to-[#D6AD55] text-[#08090B] font-bold text-xs uppercase tracking-wider shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer"
              >
                LAUNCH MODE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 12. AUTH MODAL INTEGRATION                               */}
      {/* ======================================================== */}
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
