import React, { useState, useMemo } from 'react';
import { Search, Plane, Award, XCircle, Clock } from 'lucide-react';
import { RoomState, Player, IPL_FRANCHISES } from '../types.js';
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
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5 selection:bg-[#C8FF3D]/30 selection:text-white font-body">
      {/* 3 Main Group Segmented Tabs */}
      <div className="bg-[#12142A] border border-[#23274D] rounded-2xl p-2 flex items-center justify-between gap-2 shadow-xl">
        <button
          onClick={() => setActiveGroup('SOLD')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-heading font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeGroup === 'SOLD'
              ? 'bg-[#C8FF3D] text-[#0A0B14] shadow-[0_0_20px_rgba(200,255,61,0.35)]'
              : 'text-[#9E9EB8] hover:text-white hover:bg-[#0A0B14]'
          }`}
        >
          <Award className="w-4 h-4 stroke-[2.5]" />
          <span>Sold Players</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-number font-black ${
            activeGroup === 'SOLD' ? 'bg-[#0A0B14] text-[#C8FF3D]' : 'bg-[#0A0B14] text-[#C8FF3D]'
          }`}>
            {soldList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveGroup('UNSOLD')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-heading font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeGroup === 'UNSOLD'
              ? 'bg-[#FF3B5C] text-white shadow-[0_0_20px_rgba(255,59,92,0.35)]'
              : 'text-[#9E9EB8] hover:text-white hover:bg-[#0A0B14]'
          }`}
        >
          <XCircle className="w-4 h-4 stroke-[2.5]" />
          <span>Unsold Players</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-number font-black ${
            activeGroup === 'UNSOLD' ? 'bg-[#0A0B14] text-[#FF3B5C]' : 'bg-[#0A0B14] text-[#9E9EB8]'
          }`}>
            {unsoldList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveGroup('REMAINING')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-heading font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeGroup === 'REMAINING'
              ? 'bg-[#7C5CFF] text-white shadow-[0_0_20px_rgba(124,92,255,0.35)]'
              : 'text-[#9E9EB8] hover:text-white hover:bg-[#0A0B14]'
          }`}
        >
          <Clock className="w-4 h-4 stroke-[2.5]" />
          <span>Remaining Pool</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-number font-black ${
            activeGroup === 'REMAINING' ? 'bg-[#0A0B14] text-[#7C5CFF]' : 'bg-[#0A0B14] text-[#7C5CFF]'
          }`}>
            {remainingList.length}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#12142A] border border-[#23274D] rounded-3xl p-5 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3.5 text-[#9E9EB8]" />
          <input
            type="text"
            placeholder={`Search ${activeGroup.toLowerCase()} players by name...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-[#0A0B14] border border-[#23274D] rounded-xl text-xs text-white placeholder-[#62658A] focus:outline-none focus:border-[#C8FF3D]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-[#0A0B14] border border-[#23274D] text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#C8FF3D] font-heading font-bold uppercase"
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
            className="bg-[#0A0B14] border border-[#23274D] text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#C8FF3D] font-heading font-bold uppercase"
          >
            <option value="ALL">All Nationalities</option>
            <option value="INDIAN">Indian (🇮🇳)</option>
            <option value="OVERSEAS">Overseas (✈)</option>
          </select>

          <select
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value)}
            className="bg-[#0A0B14] border border-[#23274D] text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#C8FF3D] font-heading font-bold uppercase"
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
      <div className="bg-[#12142A] border border-[#23274D] rounded-3xl p-6 shadow-xl">
        {/* GROUP 1: SOLD PLAYERS */}
        {activeGroup === 'SOLD' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-heading font-black uppercase tracking-wider text-[#C8FF3D] flex items-center gap-2">
                <Award className="w-4 h-4 stroke-[2.5]" />
                <span>Sold Players ({filteredSold.length})</span>
              </h2>
              <span className="text-[11px] text-[#9E9EB8]">Showing winning franchise & final hammer price</span>
            </div>

            {filteredSold.length === 0 ? (
              <div className="py-12 text-center text-[#9E9EB8]">
                <p className="text-sm font-heading font-extrabold uppercase text-white">No players sold yet</p>
                <p className="text-xs text-[#62658A] mt-1">Winning bids in the live auction will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#23274D] text-[#9E9EB8] font-heading font-extrabold uppercase tracking-wider text-[11px]">
                      <th className="pb-3.5 pl-3">#</th>
                      <th className="pb-3.5">Player Name</th>
                      <th className="pb-3.5">Category</th>
                      <th className="pb-3.5">Base Price</th>
                      <th className="pb-3.5 text-center">FINAL SOLD AMOUNT</th>
                      <th className="pb-3.5 pr-3 text-right">WINNING FRANCHISE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#23274D]">
                    {filteredSold.map(({ player: p, soldPrice, winningTeam }, idx) => {
                      const franchise = winningTeam ? (IPL_FRANCHISES as Record<string, any>)[winningTeam] : null;

                      return (
                        <tr key={p.id} className="hover:bg-[#181B38]/50 transition-colors">
                          <td className="py-3.5 pl-3 font-number text-[#9E9EB8]">{idx + 1}</td>
                          <td className="py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-[#0A0B14] border border-[#23274D] overflow-hidden flex items-center justify-center shrink-0">
                                {p.image_url ? (
                                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover object-top" />
                                ) : (
                                  <span className="font-heading font-black text-[10px] text-[#C8FF3D]">{p.name.slice(0, 2)}</span>
                                )}
                              </div>
                              <div>
                                <span className="font-heading font-bold uppercase text-white block">{p.name}</span>
                                <span className="text-[10px] text-[#9E9EB8] flex items-center gap-1">
                                  {p.is_overseas ? (
                                    <span className="text-[#7C5CFF] flex items-center gap-0.5 font-semibold">
                                      <Plane className="w-2.5 h-2.5" /> {p.nationality}
                                    </span>
                                  ) : (
                                    <span>🇮🇳 {p.nationality}</span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5">
                            <span className="bg-[#0A0B14] border border-[#23274D] px-2.5 py-1 rounded-lg text-[11px] text-[#C8FF3D] font-heading font-bold uppercase">
                              {p.category}
                            </span>
                          </td>
                          <td className="py-3.5 font-number text-[#9E9EB8]">
                            {p.base_price_display}
                          </td>
                          <td className="py-3.5 text-center">
                            <span className="bg-[#C8FF3D]/10 text-[#C8FF3D] border border-[#C8FF3D]/30 px-3.5 py-1 rounded-full font-number font-black text-sm inline-block shadow-xs">
                              ₹{(soldPrice / 10000000).toFixed(2)} Cr
                            </span>
                          </td>
                          <td className="py-3.5 pr-3 text-right">
                            {franchise ? (
                              <div className="inline-flex items-center gap-2">
                                <TeamLogo teamId={winningTeam} className="w-6 h-6 shrink-0 drop-shadow-xs" />
                                <span className="font-heading font-bold text-white text-xs uppercase">
                                  {franchise.name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-white font-heading font-bold uppercase">{winningTeam}</span>
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
              <h2 className="text-sm font-heading font-black uppercase tracking-wider text-[#FF3B5C] flex items-center gap-2">
                <XCircle className="w-4 h-4 stroke-[2.5]" />
                <span>Unsold Players ({filteredUnsold.length})</span>
              </h2>
              <span className="text-[11px] text-[#9E9EB8]">Eligible for host re-auction round</span>
            </div>

            {filteredUnsold.length === 0 ? (
              <div className="py-12 text-center text-[#9E9EB8]">
                <p className="text-sm font-heading font-extrabold uppercase text-white">No unsold players in this session</p>
                <p className="text-xs text-[#62658A] mt-1">Players who receive no bids will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#23274D] text-[#9E9EB8] font-heading font-extrabold uppercase tracking-wider text-[11px]">
                      <th className="pb-3.5 pl-3">#</th>
                      <th className="pb-3.5">Player Name</th>
                      <th className="pb-3.5">Category</th>
                      <th className="pb-3.5">Nationality</th>
                      <th className="pb-3.5">Base Price</th>
                      <th className="pb-3.5 pr-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#23274D]">
                    {filteredUnsold.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-[#181B38]/50 transition-colors">
                        <td className="py-3.5 pl-3 font-number text-[#9E9EB8]">{idx + 1}</td>
                        <td className="py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-[#0A0B14] border border-[#23274D] overflow-hidden flex items-center justify-center shrink-0">
                              {p.image_url ? (
                                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover object-top" />
                              ) : (
                                <span className="font-heading font-black text-[10px] text-[#FF3B5C]">{p.name.slice(0, 2)}</span>
                              )}
                            </div>
                            <span className="font-heading font-bold uppercase text-white">{p.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 text-[#9E9EB8]">
                          <span className="bg-[#0A0B14] border border-[#23274D] px-2.5 py-1 rounded-lg text-[11px] font-heading font-bold uppercase text-[#7C5CFF]">
                            {p.category}
                          </span>
                        </td>
                        <td className="py-3.5 text-[#9E9EB8]">
                          {p.is_overseas ? (
                            <span className="text-[#7C5CFF] flex items-center gap-1 font-semibold">
                              <Plane className="w-2.5 h-2.5" /> {p.nationality}
                            </span>
                          ) : (
                            <span>🇮🇳 {p.nationality}</span>
                          )}
                        </td>
                        <td className="py-3.5 font-number text-white">
                          {p.base_price_display}
                        </td>
                        <td className="py-3.5 pr-3 text-right">
                          <span className="bg-[#FF3B5C]/15 text-[#FF3B5C] border border-[#FF3B5C]/30 px-3 py-1 rounded-full text-[10px] font-heading font-extrabold uppercase">
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
              <h2 className="text-sm font-heading font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#7C5CFF]" />
                <span>Remaining Pool ({filteredRemaining.length})</span>
              </h2>
              <span className="text-[11px] text-[#9E9EB8]">Pending in the official auction pool</span>
            </div>

            {filteredRemaining.length === 0 ? (
              <div className="py-12 text-center text-[#9E9EB8]">
                <p className="text-sm font-heading font-extrabold uppercase text-white">No remaining players in the pool</p>
                <p className="text-xs text-[#62658A] mt-1">All lots have been brought forward for bidding.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#23274D] text-[#9E9EB8] font-heading font-extrabold uppercase tracking-wider text-[11px]">
                      <th className="pb-3.5 pl-3">S.No</th>
                      <th className="pb-3.5">Player Name</th>
                      <th className="pb-3.5">Category</th>
                      <th className="pb-3.5">Nationality</th>
                      <th className="pb-3.5">Set Name</th>
                      <th className="pb-3.5 pr-3 text-right">Official Base Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#23274D]">
                    {filteredRemaining.slice(0, 100).map((p) => (
                      <tr key={p.id} className="hover:bg-[#181B38]/50 transition-colors">
                        <td className="py-3 pl-3 font-number text-[#9E9EB8]">#{p.s_no}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-[#0A0B14] border border-[#23274D] overflow-hidden flex items-center justify-center shrink-0">
                              {p.image_url ? (
                                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover object-top" />
                              ) : (
                                <span className="font-heading font-black text-[9px] text-[#7C5CFF]">{p.name.slice(0, 2)}</span>
                              )}
                            </div>
                            <div>
                              <div className="font-heading font-bold uppercase text-white flex items-center gap-1.5">
                                <span>{p.name}</span>
                                {p.is_marquee && (
                                  <span className="text-[9px] bg-[#FFC93D]/15 text-[#FFC93D] px-1.5 py-0.5 rounded font-extrabold border border-[#FFC93D]/40 uppercase">
                                    MARQUEE
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-[#9E9EB8]">
                          <span className="bg-[#0A0B14] border border-[#23274D] px-2.5 py-1 rounded-lg text-[11px] font-heading font-bold uppercase text-[#C8FF3D]">
                            {p.category}
                          </span>
                        </td>
                        <td className="py-3">
                          {p.is_overseas ? (
                            <span className="text-[#7C5CFF] inline-flex items-center gap-1 text-[11px] font-semibold">
                              <Plane className="w-2.5 h-2.5" /> {p.nationality}
                            </span>
                          ) : (
                            <span className="text-[#9E9EB8] text-[11px]">🇮🇳 {p.nationality}</span>
                          )}
                        </td>
                        <td className="py-3 text-[11px] text-[#9E9EB8] truncate max-w-[160px]">
                          {p.set_name}
                        </td>
                        <td className="py-3 pr-3 text-right font-number font-black text-white">
                          {p.base_price_display}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {filteredRemaining.length > 100 && (
              <p className="text-center text-xs text-[#9E9EB8] italic pt-4">
                Showing first 100 of {filteredRemaining.length} remaining players. Use search or filters to narrow results.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
