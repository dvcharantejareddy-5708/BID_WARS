import React, { useState, useMemo } from 'react';
import { Search, Filter, Globe, Plane, Award, XCircle, Clock, Tag } from 'lucide-react';
import { RoomState, Player, IPL_FRANCHISES, PlayerCategory, IPLTeamId } from '../types.js';
import { TeamLogo } from './TeamLogo.js';
import playersData2026 from '../data/players2026.json';
import playersData2025 from '../data/players2025.json';

interface PlayersViewProps {
  roomState: RoomState;
}

export const PlayersView: React.FC<PlayersViewProps> = ({ roomState }) => {
  const [activeGroup, setActiveGroup] = useState<'SOLD' | 'UNSOLD' | 'REMAINING'>('REMAINING');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [nationalityFilter, setNationalityFilter] = useState<'ALL' | 'INDIAN' | 'OVERSEAS'>('ALL');
  const [priceFilter, setPriceFilter] = useState<string>('ALL');

  const season = roomState.settings.season || '2026';
  const allMasterPlayers: Player[] = (season === '2025' ? playersData2025 : playersData2026) as any;

  // Build categorized player lists based on authoritative roomState
  const { soldList, unsoldList, remainingList } = useMemo(() => {
    // Collect sold players from teamSquads & history
    const soldPlayerMap = new Map<string, { player: Player; soldPrice: number; winningTeam: string }>();
    
    // First from history
    for (const lot of roomState.history) {
      if (lot.status === 'SOLD' && lot.winningTeam && lot.soldPrice) {
        soldPlayerMap.set(lot.player.id, {
          player: lot.player,
          soldPrice: lot.soldPrice,
          winningTeam: lot.winningTeam
        });
      }
    }

    // Also check teamSquads for consistency
    for (const [teamId, squad] of Object.entries(roomState.teamSquads)) {
      for (const p of squad) {
        if (!soldPlayerMap.has(p.id)) {
          const hist = roomState.history.find(h => h.player.id === p.id && h.winningTeam === teamId);
          soldPlayerMap.set(p.id, {
            player: p,
            soldPrice: hist?.soldPrice || p.base_price_inr,
            winningTeam: teamId
          });
        }
      }
    }

    const sold = Array.from(soldPlayerMap.values());

    // Collect latest unsold players
    const unsoldPlayerIds = new Set<string>();
    for (const lot of roomState.history) {
      if (lot.status === 'UNSOLD' || lot.status === 'SKIPPED') {
        if (!soldPlayerMap.has(lot.player.id)) {
          unsoldPlayerIds.add(lot.player.id);
        }
      }
    }
    const unsold = allMasterPlayers.filter(p => unsoldPlayerIds.has(p.id));

    // Remaining: Not sold, not unsold, not currently on auction
    const currentLotPlayerId = roomState.currentLot?.player.id;
    const remaining = allMasterPlayers.filter(p => 
      !soldPlayerMap.has(p.id) && 
      !unsoldPlayerIds.has(p.id) && 
      p.id !== currentLotPlayerId
    );

    return {
      soldList: sold,
      unsoldList: unsold,
      remainingList: remaining
    };
  }, [roomState.history, roomState.teamSquads, roomState.currentLot, allMasterPlayers]);

  // Filter items based on user criteria
  const filteredSold = useMemo(() => {
    return soldList.filter(({ player: p }) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (roleFilter !== 'ALL' && p.category !== roleFilter) return false;
      if (nationalityFilter === 'INDIAN' && p.is_overseas) return false;
      if (nationalityFilter === 'OVERSEAS' && !p.is_overseas) return false;
      if (priceFilter !== 'ALL' && p.base_price_display !== priceFilter) return false;
      return true;
    });
  }, [soldList, search, roleFilter, nationalityFilter, priceFilter]);

  const filteredUnsold = useMemo(() => {
    return unsoldList.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (roleFilter !== 'ALL' && p.category !== roleFilter) return false;
      if (nationalityFilter === 'INDIAN' && p.is_overseas) return false;
      if (nationalityFilter === 'OVERSEAS' && !p.is_overseas) return false;
      if (priceFilter !== 'ALL' && p.base_price_display !== priceFilter) return false;
      return true;
    });
  }, [unsoldList, search, roleFilter, nationalityFilter, priceFilter]);

  const filteredRemaining = useMemo(() => {
    return remainingList.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (roleFilter !== 'ALL' && p.category !== roleFilter) return false;
      if (nationalityFilter === 'INDIAN' && p.is_overseas) return false;
      if (nationalityFilter === 'OVERSEAS' && !p.is_overseas) return false;
      if (priceFilter !== 'ALL' && p.base_price_display !== priceFilter) return false;
      return true;
    });
  }, [remainingList, search, roleFilter, nationalityFilter, priceFilter]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5 selection:bg-[#E6EDF8] selection:text-[#173B78]">
      {/* 3 Main Group Segmented Tabs */}
      <div className="bg-white border border-[#D8D8D1] rounded-2xl p-2 flex items-center justify-between gap-2 shadow-sm">
        <button
          onClick={() => setActiveGroup('SOLD')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-heading font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeGroup === 'SOLD'
              ? 'bg-[#167447] text-white shadow-sm'
              : 'text-[#647084] hover:text-[#18243A] hover:bg-[#F3F0E8]'
          }`}
        >
          <Award className="w-4 h-4 stroke-[2.5]" />
          <span>Sold Players</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-number font-black ${
            activeGroup === 'SOLD' ? 'bg-white/20 text-white' : 'bg-[#E6EDF8] text-[#173B78]'
          }`}>
            {soldList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveGroup('UNSOLD')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-heading font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeGroup === 'UNSOLD'
              ? 'bg-[#C74444] text-white shadow-sm'
              : 'text-[#647084] hover:text-[#18243A] hover:bg-[#F3F0E8]'
          }`}
        >
          <XCircle className="w-4 h-4 stroke-[2.5]" />
          <span>Unsold Players</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-number font-black ${
            activeGroup === 'UNSOLD' ? 'bg-white/20 text-white' : 'bg-[#F3F0E8] text-[#647084]'
          }`}>
            {unsoldList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveGroup('REMAINING')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-heading font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeGroup === 'REMAINING'
              ? 'bg-[#173B78] text-white shadow-sm'
              : 'text-[#647084] hover:text-[#18243A] hover:bg-[#F3F0E8]'
          }`}
        >
          <Clock className="w-4 h-4 stroke-[2.5]" />
          <span>Remaining Players</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-number font-black ${
            activeGroup === 'REMAINING' ? 'bg-white/20 text-white' : 'bg-[#E6EDF8] text-[#173B78]'
          }`}>
            {remainingList.length}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#D8D8D1] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#647084]" />
          <input
            type="text"
            placeholder={`Search ${activeGroup.toLowerCase()} players by name...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#F3F0E8] border border-[#D8D8D1] rounded-xl text-xs text-[#18243A] placeholder-[#647084] focus:outline-none focus:border-[#173B78] focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-[#F3F0E8] border border-[#D8D8D1] text-[#18243A] rounded-xl px-2.5 py-2 focus:outline-none focus:border-[#173B78] focus:bg-white font-heading font-bold uppercase"
          >
            <option value="ALL">All Categories</option>
            <option value="Batsmen">Batsmen</option>
            <option value="Bowlers">Bowlers</option>
            <option value="All-rounders">All-Rounders</option>
            <option value="Wicket-keepers">Wicket-Keepers</option>
          </select>

          <select
            value={nationalityFilter}
            onChange={(e) => setNationalityFilter(e.target.value as any)}
            className="bg-[#F3F0E8] border border-[#D8D8D1] text-[#18243A] rounded-xl px-2.5 py-2 focus:outline-none focus:border-[#173B78] focus:bg-white font-heading font-bold uppercase"
          >
            <option value="ALL">All Nationalities</option>
            <option value="INDIAN">Indian (🇮🇳)</option>
            <option value="OVERSEAS">Overseas (✈)</option>
          </select>

          <select
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value)}
            className="bg-[#F3F0E8] border border-[#D8D8D1] text-[#18243A] rounded-xl px-2.5 py-2 focus:outline-none focus:border-[#173B78] focus:bg-white font-heading font-bold uppercase"
          >
            <option value="ALL">All Base Prices</option>
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
      </div>

      {/* Main Players List Container */}
      <div className="bg-white border border-[#D8D8D1] rounded-2xl p-5 shadow-sm">
        {/* GROUP 1: SOLD PLAYERS */}
        {activeGroup === 'SOLD' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-heading font-black uppercase tracking-wider text-[#167447] flex items-center gap-1.5">
                <Award className="w-4 h-4 stroke-[2.5]" />
                <span>Sold Players ({filteredSold.length})</span>
              </h2>
              <span className="text-[11px] text-[#647084]">Showing winning team & final price</span>
            </div>

            {filteredSold.length === 0 ? (
              <div className="py-12 text-center text-[#647084]">
                <p className="text-sm font-heading font-bold uppercase text-[#18243A]">No players sold yet</p>
                <p className="text-xs text-[#647084] mt-1">Winning bids in the live auction will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#D8D8D1] text-[#647084] font-heading font-bold uppercase tracking-wider text-[11px]">
                      <th className="pb-3 pl-3">#</th>
                      <th className="pb-3">Player Name</th>
                      <th className="pb-3">Category</th>
                      <th className="pb-3">Base Price</th>
                      <th className="pb-3 text-center">FINAL SOLD AMOUNT</th>
                      <th className="pb-3 pr-3 text-right">WINNING FRANCHISE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D8D8D1]">
                    {filteredSold.map(({ player: p, soldPrice, winningTeam }, idx) => {
                      const franchise = winningTeam ? (IPL_FRANCHISES as Record<string, any>)[winningTeam] : null;

                      return (
                        <tr key={p.id} className="hover:bg-[#F3F0E8]/70 transition-colors">
                          <td className="py-3 pl-3 font-number text-[#647084]">{idx + 1}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-[#E6EDF8] border border-[#D8D8D1] overflow-hidden flex items-center justify-center shrink-0">
                                {p.image_url ? (
                                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover object-top" />
                                ) : (
                                  <span className="font-heading font-black text-[10px] text-[#173B78]">{p.name.slice(0, 2)}</span>
                                )}
                              </div>
                              <div>
                                <span className="font-heading font-black uppercase text-[#18243A] block">{p.name}</span>
                                <span className="text-[10px] text-[#647084] flex items-center gap-1">
                                  {p.is_overseas ? (
                                    <span className="text-[#176B48] flex items-center gap-0.5 font-semibold">
                                      <Plane className="w-2.5 h-2.5" /> {p.nationality}
                                    </span>
                                  ) : (
                                    <span>🇮🇳 {p.nationality}</span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3">
                            <span className="bg-[#E6EDF8] border border-[#D8D8D1] px-2 py-0.5 rounded text-[11px] text-[#173B78] font-heading font-bold uppercase">
                              {p.category}
                            </span>
                          </td>
                          <td className="py-3 font-number text-[#647084]">
                            {p.base_price_display}
                          </td>
                          <td className="py-3 text-center">
                            <span className="bg-[#167447]/10 text-[#167447] border border-[#167447]/30 px-3 py-1 rounded-full font-number font-black text-sm inline-block shadow-xs">
                              ₹{(soldPrice / 10000000).toFixed(2)} Cr
                            </span>
                          </td>
                          <td className="py-3 pr-3 text-right">
                            {franchise ? (
                              <div className="inline-flex items-center gap-2">
                                <TeamLogo teamId={winningTeam} className="w-6 h-6 shrink-0 shadow-xs" />
                                <span className="font-heading font-bold text-[#18243A] text-xs uppercase">
                                  {franchise.name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[#18243A] font-heading font-bold uppercase">{winningTeam}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* GROUP 2: UNSOLD PLAYERS */}
        {activeGroup === 'UNSOLD' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-heading font-black uppercase tracking-wider text-[#C74444] flex items-center gap-1.5">
                <XCircle className="w-4 h-4 stroke-[2.5]" />
                <span>Unsold Players ({filteredUnsold.length})</span>
              </h2>
              <span className="text-[11px] text-[#647084]">Eligible for re-auction round</span>
            </div>

            {filteredUnsold.length === 0 ? (
              <div className="py-12 text-center text-[#647084]">
                <p className="text-sm font-heading font-bold uppercase text-[#18243A]">No unsold players in this session</p>
                <p className="text-xs text-[#647084] mt-1">Players who receive no bids will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#D8D8D1] text-[#647084] font-heading font-bold uppercase tracking-wider text-[11px]">
                      <th className="pb-3 pl-3">#</th>
                      <th className="pb-3">Player Name</th>
                      <th className="pb-3">Category</th>
                      <th className="pb-3">Nationality</th>
                      <th className="pb-3">Base Price</th>
                      <th className="pb-3 pr-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D8D8D1]">
                    {filteredUnsold.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-[#F3F0E8]/70 transition-colors">
                        <td className="py-3 pl-3 font-number text-[#647084]">{idx + 1}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#E6EDF8] border border-[#D8D8D1] overflow-hidden flex items-center justify-center shrink-0">
                              {p.image_url ? (
                                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover object-top" />
                              ) : (
                                <span className="font-heading font-black text-[10px] text-[#C74444]">{p.name.slice(0, 2)}</span>
                              )}
                            </div>
                            <span className="font-heading font-black uppercase text-[#18243A]">{p.name}</span>
                          </div>
                        </td>
                        <td className="py-3 text-[#647084]">
                          <span className="bg-[#E6EDF8] border border-[#D8D8D1] px-2 py-0.5 rounded text-[11px] font-heading font-bold uppercase text-[#173B78]">
                            {p.category}
                          </span>
                        </td>
                        <td className="py-3 text-[#647084]">
                          {p.is_overseas ? (
                            <span className="text-[#176B48] flex items-center gap-1 font-semibold">
                              <Plane className="w-2.5 h-2.5" /> {p.nationality}
                            </span>
                          ) : (
                            <span>🇮🇳 {p.nationality}</span>
                          )}
                        </td>
                        <td className="py-3 font-number text-[#18243A]">
                          {p.base_price_display}
                        </td>
                        <td className="py-3 pr-3 text-right">
                          <span className="bg-[#C74444]/10 text-[#C74444] border border-[#C74444]/30 px-3 py-1 rounded-full text-[10px] font-heading font-black uppercase">
                            UNSOLD
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* GROUP 3: REMAINING PLAYERS */}
        {activeGroup === 'REMAINING' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-heading font-black uppercase tracking-wider text-[#18243A] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#173B78]" />
                <span>Remaining Players to be Auctioned ({filteredRemaining.length})</span>
              </h2>
              <span className="text-[11px] text-[#647084]">Pending in the official auction pool</span>
            </div>

            {filteredRemaining.length === 0 ? (
              <div className="py-12 text-center text-[#647084]">
                <p className="text-sm font-heading font-bold uppercase text-[#18243A]">No remaining players in the pool</p>
                <p className="text-xs text-[#647084] mt-1">All lots have been brought forward for bidding.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#D8D8D1] text-[#647084] font-heading font-bold uppercase tracking-wider text-[11px]">
                      <th className="pb-3 pl-3">S.No</th>
                      <th className="pb-3">Player Name</th>
                      <th className="pb-3">Category</th>
                      <th className="pb-3">Nationality</th>
                      <th className="pb-3">Set Name</th>
                      <th className="pb-3 pr-3 text-right">Official Base Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D8D8D1]">
                    {filteredRemaining.slice(0, 100).map((p, idx) => (
                      <tr key={p.id} className="hover:bg-[#F3F0E8]/70 transition-colors">
                        <td className="py-2.5 pl-3 font-number text-[#647084]">#{p.s_no}</td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-[#E6EDF8] border border-[#D8D8D1] overflow-hidden flex items-center justify-center shrink-0">
                              {p.image_url ? (
                                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover object-top" />
                              ) : (
                                <span className="font-heading font-black text-[9px] text-[#173B78]">{p.name.slice(0, 2)}</span>
                              )}
                            </div>
                            <div>
                              <div className="font-heading font-black uppercase text-[#18243A] flex items-center gap-1.5">
                                <span>{p.name}</span>
                                {p.is_marquee && (
                                  <span className="text-[9px] bg-[#F0C65B]/25 text-[#925C05] px-1.5 py-0.5 rounded font-black border border-[#F0C65B] uppercase">
                                    MARQUEE
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 text-[#647084]">
                          <span className="bg-[#E6EDF8] border border-[#D8D8D1] px-2 py-0.5 rounded text-[11px] font-heading font-bold uppercase text-[#173B78]">
                            {p.category}
                          </span>
                        </td>
                        <td className="py-2.5">
                          {p.is_overseas ? (
                            <span className="text-[#176B48] inline-flex items-center gap-1 text-[11px] font-semibold">
                              <Plane className="w-2.5 h-2.5" /> {p.nationality}
                            </span>
                          ) : (
                            <span className="text-[#647084] text-[11px]">🇮🇳 {p.nationality}</span>
                          )}
                        </td>
                        <td className="py-2.5 text-[11px] text-[#647084] truncate max-w-[160px]">
                          {p.set_name}
                        </td>
                        <td className="py-2.5 pr-3 text-right font-number font-black text-[#18243A]">
                          {p.base_price_display}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {filteredRemaining.length > 100 && (
              <p className="text-center text-xs text-[#647084] italic pt-3">
                Showing first 100 of {filteredRemaining.length} remaining players. Use the search or filter to narrow results.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
