import React, { useState, useMemo } from 'react';
import { Search, Filter, Globe, Sparkles, X, Shield, Award, CheckCircle2, Plane } from 'lucide-react';
import { Player, PlayerCategory } from '../types.js';
import { OvrBadge } from './OvrBadge.js';
import playersData2026 from '../data/players2026.json';
import playersData2025 from '../data/players2025.json';

interface PlayerExplorerProps {
  season?: '2026' | '2025';
}

export const PlayerExplorer: React.FC<PlayerExplorerProps> = ({ season = '2026' }) => {
  const [currentSeason, setCurrentSeason] = useState<'2026' | '2025'>(season);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPrice, setSelectedPrice] = useState<string>('ALL');
  const [selectedNationality, setSelectedNationality] = useState<string>('ALL');
  const [selectedPool, setSelectedPool] = useState<string>('ALL');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const rawPlayers: Player[] = (currentSeason === '2025' ? playersData2025 : playersData2026) as any;

  const filteredPlayers = useMemo(() => {
    return rawPlayers.filter(p => {
      // Search term
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesCountry = (p.country || p.nationality || '').toLowerCase().includes(q);
        const matchesSet = (p.set_name || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCountry && !matchesSet) return false;
      }

      // Category filter
      if (selectedCategory !== 'ALL') {
        if (selectedCategory === 'WICKET_KEEPERS' && !p.is_wicketkeeper) return false;
        if (selectedCategory !== 'WICKET_KEEPERS' && p.category !== selectedCategory) return false;
      }

      // Price filter
      if (selectedPrice !== 'ALL') {
        if (p.base_price_display !== selectedPrice) return false;
      }

      // Nationality
      if (selectedNationality === 'INDIAN' && p.is_overseas) return false;
      if (selectedNationality === 'OVERSEAS' && !p.is_overseas) return false;

      // Pool filter
      if (selectedPool === 'AUCTION_POOL' && p.is_retained) return false;
      if (selectedPool === 'RETAINED' && !p.is_retained) return false;
      if (selectedPool === 'MARQUEE' && !p.is_marquee) return false;

      return true;
    });
  }, [rawPlayers, search, selectedCategory, selectedPrice, selectedNationality, selectedPool]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 relative">
      {/* Header */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-[#00E676]/10 text-[#00E676] text-xs font-bold px-3 py-0.5 rounded-full border border-[#00E676]/30">
              OFFICIAL VERIFIED PLAYER DATABASE
            </span>
            <span className="text-xs text-[#8E8E93] font-mono">
              Total {rawPlayers.length} Verified Players
            </span>
          </div>
          <h1 className="text-3xl font-extrabold font-display text-white">
            Player Explorer
          </h1>
          <p className="text-xs sm:text-sm text-[#8E8E93] mt-1">
            Search and inspect the complete 532-player master database with official base prices and verified Indian/Overseas status.
          </p>
        </div>

        {/* Season Switcher */}
        <div className="flex items-center gap-2 bg-[#151515] border border-[#262626] p-1.5 rounded-2xl">
          <button
            onClick={() => setCurrentSeason('2026')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              currentSeason === '2026' ? 'bg-[#00E676] text-black font-extrabold shadow-md' : 'text-[#8E8E93] hover:text-white'
            }`}
          >
            2026 Season
          </button>
          <button
            onClick={() => setCurrentSeason('2025')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              currentSeason === '2025' ? 'bg-[#00E676] text-black font-extrabold shadow-md' : 'text-[#8E8E93] hover:text-white'
            }`}
          >
            2025 Historical
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-3xl p-5 space-y-4 shadow-xl">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by player name, nationality, or set name..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#151515] border border-[#262626] rounded-2xl text-sm text-white placeholder-[#8E8E93] focus:outline-none focus:border-[#00E676] transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8E8E93] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* Category */}
          <div>
            <label className="block text-[10px] text-[#8E8E93] uppercase font-bold mb-1">Role Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-[#151515] border border-[#262626] text-white rounded-xl p-2.5 outline-none focus:border-[#00E676]"
            >
              <option value="ALL">All Categories</option>
              <option value="Batsmen">Batsmen</option>
              <option value="Bowlers">Bowlers</option>
              <option value="All-rounders">All-Rounders</option>
              <option value="WICKET_KEEPERS">Wicket-Keepers</option>
            </select>
          </div>

          {/* Base Price */}
          <div>
            <label className="block text-[10px] text-[#8E8E93] uppercase font-bold mb-1">Base Price Bracket</label>
            <select
              value={selectedPrice}
              onChange={(e) => setSelectedPrice(e.target.value)}
              className="w-full bg-[#151515] border border-[#262626] text-white rounded-xl p-2.5 outline-none focus:border-[#00E676]"
            >
              <option value="ALL">All Prices</option>
              <option value="2 Crore">₹2 Crore</option>
              <option value="1.5 Crore">₹1.5 Crore</option>
              <option value="1.25 Crore">₹1.25 Crore</option>
              <option value="1 Crore">₹1 Crore</option>
              <option value="75 Lakh">₹75 Lakh</option>
              <option value="50 Lakh">₹50 Lakh</option>
              <option value="40 Lakh">₹40 Lakh</option>
              <option value="30 Lakh">₹30 Lakh</option>
            </select>
          </div>

          {/* Nationality */}
          <div>
            <label className="block text-[10px] text-[#8E8E93] uppercase font-bold mb-1">Nationality</label>
            <select
              value={selectedNationality}
              onChange={(e) => setSelectedNationality(e.target.value)}
              className="w-full bg-[#151515] border border-[#262626] text-white rounded-xl p-2.5 outline-none focus:border-[#00E676]"
            >
              <option value="ALL">All Nationalities</option>
              <option value="INDIAN">Indian Players (🇮🇳)</option>
              <option value="OVERSEAS">Overseas Players (✈)</option>
            </select>
          </div>

          {/* Pool Status */}
          <div>
            <label className="block text-[10px] text-[#8E8E93] uppercase font-bold mb-1">Pool Status</label>
            <select
              value={selectedPool}
              onChange={(e) => setSelectedPool(e.target.value)}
              className="w-full bg-[#151515] border border-[#262626] text-white rounded-xl p-2.5 outline-none focus:border-[#00E676]"
            >
              <option value="ALL">All Pools</option>
              <option value="AUCTION_POOL">Auction Pool (359)</option>
              <option value="RETAINED">Retained (173)</option>
              <option value="MARQUEE">Marquee Stars</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[#8E8E93] pt-1">
          <span>Showing <strong>{filteredPlayers.length}</strong> of {rawPlayers.length} players</span>
          {(search || selectedCategory !== 'ALL' || selectedPrice !== 'ALL' || selectedNationality !== 'ALL' || selectedPool !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('ALL');
                setSelectedPrice('ALL');
                setSelectedNationality('ALL');
                setSelectedPool('ALL');
              }}
              className="text-[#00E676] hover:underline font-semibold"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Players Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredPlayers.slice(0, 100).map((player) => (
          <div
            key={player.id}
            onClick={() => setSelectedPlayer(player)}
            className={`bg-[#0D0D0D] rounded-3xl p-5 border transition-all cursor-pointer flex flex-col justify-between hover:scale-[1.02] hover:border-[#00E676]/60 shadow-lg ${
              player.is_marquee ? 'border-[#FFC857]/60 shadow-[0_0_15px_rgba(255,200,87,0.15)]' : 'border-[#262626]'
            }`}
          >
            <div>
              {/* Top Tags */}
              <div className="flex items-center justify-between gap-1 mb-3">
                <span className="text-[10px] font-bold bg-[#151515] border border-[#262626] px-2.5 py-0.5 rounded-full text-white">
                  {player.category}
                </span>

                <div className="flex items-center gap-1.5">
                  <OvrBadge ovr={player.ovr} size="xs" />
                  {player.is_overseas ? (
                    <span className="text-[9px] bg-[#00E676]/10 text-[#00E676] font-bold px-2 py-0.5 rounded-full border border-[#00E676]/30 flex items-center gap-0.5">
                      <Plane className="w-2.5 h-2.5" /> OS
                    </span>
                  ) : (
                    <span className="text-[10px]">🇮🇳</span>
                  )}
                  {player.is_marquee && (
                    <span className="text-[9px] bg-[#FFC857]/20 text-[#FFC857] font-bold px-1.5 py-0.5 rounded-full border border-[#FFC857]/30">
                      MARQUEE
                    </span>
                  )}
                  {player.is_retained && (
                    <span className="text-[9px] bg-purple-500/20 text-purple-300 font-bold px-1.5 py-0.5 rounded-full border border-purple-500/30">
                      RETAINED
                    </span>
                  )}
                </div>
              </div>

              {/* Player Portrait & Name */}
              <div className="flex items-center gap-3 my-2">
                <div className="w-12 h-12 rounded-2xl bg-[#151515] border border-[#262626] overflow-hidden flex items-center justify-center shrink-0">
                  <img
                    src={player.image_url}
                    alt={player.name}
                    onError={(e: any) => {
                      e.target.style.display = 'none';
                    }}
                    className="w-full h-full object-cover object-top"
                  />
                  <span className="font-display font-bold text-xs text-[#00E676]">
                    {player.name.slice(0, 2)}
                  </span>
                </div>

                <div>
                  <h4 className="font-display font-bold text-sm text-white leading-tight">
                    {player.name}
                  </h4>
                  <p className="text-[11px] text-[#8E8E93] flex items-center gap-1 mt-0.5">
                    <Globe className="w-3 h-3 text-[#8E8E93]" />
                    <span>{player.nationality}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom: Base Price & Set */}
            <div className="pt-3 border-t border-[#262626] flex items-center justify-between text-xs">
              <span className="text-[#8E8E93] text-[11px] font-mono">Lot #{player.s_no}</span>
              <span className="font-mono font-bold text-[#FFC857]">
                {player.base_price_display}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredPlayers.length > 100 && (
        <p className="text-center text-xs text-[#8E8E93] italic py-4">
          Showing first 100 results. Use the search bar above to filter specific players.
        </p>
      )}

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0D0D0D] max-w-md w-full rounded-3xl p-6 sm:p-7 border border-[#262626] shadow-2xl relative">
            <button
              onClick={() => setSelectedPlayer(null)}
              className="absolute top-5 right-5 text-[#8E8E93] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-[#151515] border border-[#262626] overflow-hidden flex items-center justify-center shrink-0">
                {selectedPlayer.image_url ? (
                  <img
                    src={selectedPlayer.image_url}
                    alt={selectedPlayer.name}
                    onError={(e: any) => { e.target.style.display = 'none'; }}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <span className="font-display font-bold text-sm text-[#00E676]">
                    {selectedPlayer.name.slice(0, 2)}
                  </span>
                )}
              </div>

              <div>
                <h3 className="font-display font-bold text-lg text-white">
                  {selectedPlayer.name}
                </h3>
                <p className="text-xs text-[#8E8E93]">
                  {selectedPlayer.nationality} · {selectedPlayer.category}
                </p>
              </div>
            </div>

            <div className="bg-[#151515] border border-[#262626] rounded-2xl p-4 space-y-2.5 text-xs mb-5">
              <div className="flex justify-between items-center py-1 border-b border-[#262626]">
                <span className="text-[#8E8E93]">Cricket Ability Rating (OVR):</span>
                <OvrBadge ovr={selectedPlayer.ovr} size="sm" />
              </div>
              <div className="flex justify-between py-1 border-b border-[#262626]">
                <span className="text-[#8E8E93]">Master List S.No:</span>
                <span className="font-mono font-bold text-white">#{selectedPlayer.s_no}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#262626]">
                <span className="text-[#8E8E93]">Official Base Price:</span>
                <span className="font-mono font-bold text-[#FFC857]">{selectedPlayer.base_price_display}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#262626]">
                <span className="text-[#8E8E93]">Classification:</span>
                <span className="font-semibold text-white">
                  {selectedPlayer.is_overseas ? '✈ Overseas Player' : '🇮🇳 Indian Domestic Player'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#262626]">
                <span className="text-[#8E8E93]">Auction Set:</span>
                <span className="font-medium text-[#00E676]">{selectedPlayer.set_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#262626]">
                <span className="text-[#8E8E93]">Wicket-Keeper:</span>
                <span className="font-medium text-white">{selectedPlayer.is_wicketkeeper ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#262626]">
                <span className="text-[#8E8E93]">Eligibility Status:</span>
                <span className="font-medium text-[#00E676] capitalize">{selectedPlayer.eligibility.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#8E8E93]">Verification:</span>
                <span className="text-[#00E676] flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {selectedPlayer.verification_status}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedPlayer(null)}
              className="w-full py-3 px-4 rounded-full bg-[#151515] hover:bg-[#202020] text-slate-200 text-xs font-semibold border border-[#262626] transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
