import React, { useState, useMemo } from 'react';
import { Search, Filter, Globe, Sparkles, X, Shield, Award, CheckCircle2 } from 'lucide-react';
import { Player, PlayerCategory } from '../types.js';
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
        const matchesCountry = p.nationality.toLowerCase().includes(q);
        const matchesSet = p.set_name.toLowerCase().includes(q);
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
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-navy-600/70 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-cyan-400/20 text-cyan-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-cyan-400/30">
              OFFICIAL PLAYER DATABASE
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Total {rawPlayers.length} Verified Players
            </span>
          </div>
          <h1 className="text-3xl font-extrabold font-display text-white">
            Player Explorer
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Search and filter the complete 532-player master list with authentic base prices and auction sets.
          </p>
        </div>

        {/* Season Switcher */}
        <div className="flex items-center gap-2 bg-navy-900/90 border border-navy-700 p-1.5 rounded-xl">
          <button
            onClick={() => setCurrentSeason('2026')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentSeason === '2026' ? 'bg-cyan-400 text-black shadow-glow-cyan' : 'text-slate-400 hover:text-white'
            }`}
          >
            2026 Season
          </button>
          <button
            onClick={() => setCurrentSeason('2025')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentSeason === '2025' ? 'bg-cyan-400 text-black shadow-glow-cyan' : 'text-slate-400 hover:text-white'
            }`}
          >
            2025 Historical
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="glass-panel rounded-2xl p-5 border border-navy-600/70 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by player name, nationality (e.g. Australia, England), or set name..."
            className="w-full pl-10 pr-4 py-2.5 bg-navy-900/90 border border-navy-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* Category */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Role Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-navy-900 border border-navy-700 text-slate-200 rounded-lg p-2 outline-none focus:border-cyan-400"
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
            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Base Price Bracket</label>
            <select
              value={selectedPrice}
              onChange={(e) => setSelectedPrice(e.target.value)}
              className="w-full bg-navy-900 border border-navy-700 text-slate-200 rounded-lg p-2 outline-none focus:border-cyan-400"
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
            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Nationality</label>
            <select
              value={selectedNationality}
              onChange={(e) => setSelectedNationality(e.target.value)}
              className="w-full bg-navy-900 border border-navy-700 text-slate-200 rounded-lg p-2 outline-none focus:border-cyan-400"
            >
              <option value="ALL">All Nationalities</option>
              <option value="INDIAN">Indian Players</option>
              <option value="OVERSEAS">Overseas Players</option>
            </select>
          </div>

          {/* Pool Status */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Pool Status</label>
            <select
              value={selectedPool}
              onChange={(e) => setSelectedPool(e.target.value)}
              className="w-full bg-navy-900 border border-navy-700 text-slate-200 rounded-lg p-2 outline-none focus:border-cyan-400"
            >
              <option value="ALL">All Pools</option>
              <option value="AUCTION_POOL">Auction Pool (359)</option>
              <option value="RETAINED">Retained (173)</option>
              <option value="MARQUEE">Marquee Stars</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
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
              className="text-cyan-400 hover:underline"
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
            className={`glass-card rounded-2xl p-4 border transition-all cursor-pointer flex flex-col justify-between hover:scale-[1.02] ${
              player.is_marquee ? 'border-amber-400/40 bg-navy-800/80 shadow-glow-amber' : 'border-navy-700/80 bg-navy-900/70'
            }`}
          >
            <div>
              {/* Top Tags */}
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className="text-[10px] font-bold bg-navy-800 px-2 py-0.5 rounded text-cyan-300">
                  {player.category}
                </span>

                <div className="flex items-center gap-1">
                  {player.is_marquee && (
                    <span className="text-[9px] bg-amber-400/20 text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-400/30">
                      MARQUEE
                    </span>
                  )}
                  {player.is_retained && (
                    <span className="text-[9px] bg-purple-500/20 text-purple-300 font-bold px-1.5 py-0.2 rounded border border-purple-500/30">
                      RETAINED
                    </span>
                  )}
                </div>
              </div>

              {/* Player Portrait & Name */}
              <div className="flex items-center gap-3 my-2">
                <div className="w-12 h-12 rounded-xl bg-navy-800 border border-navy-700 overflow-hidden flex items-center justify-center shrink-0">
                  <img
                    src={player.image_url}
                    alt={player.name}
                    onError={(e: any) => {
                      e.target.style.display = 'none';
                    }}
                    className="w-full h-full object-cover object-top"
                  />
                  <span className="font-display font-bold text-xs text-cyan-400">
                    {player.name.slice(0, 2)}
                  </span>
                </div>

                <div>
                  <h4 className="font-display font-bold text-sm text-white leading-tight">
                    {player.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Globe className="w-3 h-3 text-slate-500" />
                    <span>{player.nationality}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom: Base Price & Set */}
            <div className="pt-2.5 border-t border-navy-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px] font-mono">Lot #{player.s_no}</span>
              <span className="font-mono font-bold text-amber-300">
                {player.base_price_display}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredPlayers.length > 100 && (
        <p className="text-center text-xs text-slate-500 italic py-4">
          Showing first 100 results. Use the search bar to find specific players.
        </p>
      )}

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel max-w-md w-full rounded-2xl p-6 border border-cyan-400/40 shadow-2xl relative">
            <button
              onClick={() => setSelectedPlayer(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-navy-800 border border-cyan-400/30 overflow-hidden flex items-center justify-center shrink-0">
                <img
                  src={selectedPlayer.image_url}
                  alt={selectedPlayer.name}
                  onError={(e: any) => { e.target.style.display = 'none'; }}
                  className="w-full h-full object-cover object-top"
                />
              </div>

              <div>
                <h3 className="font-display font-bold text-lg text-white">
                  {selectedPlayer.name}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedPlayer.nationality} · {selectedPlayer.category}
                </p>
              </div>
            </div>

            <div className="bg-navy-900/90 border border-navy-700 rounded-xl p-4 space-y-2 text-xs mb-5">
              <div className="flex justify-between py-1 border-b border-navy-800">
                <span className="text-slate-400">Master List S.No:</span>
                <span className="font-mono font-bold text-white">#{selectedPlayer.s_no}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-navy-800">
                <span className="text-slate-400">Official Base Price:</span>
                <span className="font-mono font-bold text-amber-300">{selectedPlayer.base_price_display}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-navy-800">
                <span className="text-slate-400">Auction Set:</span>
                <span className="font-medium text-cyan-300">{selectedPlayer.set_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-navy-800">
                <span className="text-slate-400">Wicket-Keeper:</span>
                <span className="font-medium text-white">{selectedPlayer.is_wicketkeeper ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-navy-800">
                <span className="text-slate-400">Eligibility Status:</span>
                <span className="font-medium text-emerald-400 capitalize">{selectedPlayer.eligibility.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Verification:</span>
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {selectedPlayer.verification_status}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedPlayer(null)}
              className="w-full py-2.5 px-4 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-200 text-xs font-semibold border border-navy-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
