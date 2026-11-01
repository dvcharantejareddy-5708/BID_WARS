import React, { useState } from 'react';
import { Play, Copy, Check, Users, Shield, Bot, Clock, Sliders, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { RoomState, RoomMember, IPLTeamId, IPL_FRANCHISES, BotStrategy } from '../types.js';

interface WaitingLobbyProps {
  roomState: RoomState;
  myMemberId: string;
  onToggleReady: (isReady: boolean) => void;
  onSelectTeam: (teamId: IPLTeamId) => void;
  onStartAuction: () => void;
  onChangeTeamClick: () => void;
  onAddBot?: (teamId: IPLTeamId, strategy: BotStrategy) => void;
  onRemoveBot?: (teamId: IPLTeamId) => void;
}

export const WaitingLobby: React.FC<WaitingLobbyProps> = ({
  roomState,
  myMemberId,
  onToggleReady,
  onStartAuction,
  onChangeTeamClick
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const myMember = roomState.members[myMemberId];
  const isHost = myMember?.isHost;
  const isReady = myMember?.isReady ?? false;

  const handleCopyLink = () => {
    const url = `${window.location.origin}?room=${roomState.roomCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const membersList = Object.values(roomState.members);
  const humanMembers = membersList.filter(m => !m.isBot);
  const botMembers = membersList.filter(m => m.isBot);

  // Validation for starting auction
  const unassignedHumans = humanMembers.filter(m => !m.teamId);
  const unreadyHumans = humanMembers.filter(m => !m.isReady);
  const canStart = isHost && unassignedHumans.length === 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative">
      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] right-[10%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[10%] left-[10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 space-y-6">
        {/* Lobby Top Banner */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-navy-600/70 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-cyan-400/20 text-cyan-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-cyan-400/30">
                WAITING LOBBY
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Season {roomState.settings.season} · {roomState.poolSize} Players
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-white">
              {roomState.settings.roomName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Select your franchise and confirm readiness. The host will start once everyone is prepared.
            </p>
          </div>

          {/* Room Code & Share Link */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="bg-navy-900/90 border border-cyan-400/40 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 shadow-glow-cyan">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Room Code</span>
                <span className="text-lg font-mono font-black text-cyan-300 tracking-wider">
                  {roomState.roomCode}
                </span>
              </div>
              <button
                onClick={handleCopyLink}
                className="bg-navy-800 hover:bg-navy-700 text-cyan-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border border-cyan-400/30"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Invite Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* User Ready & Team Banner */}
        <div className="bg-navy-900/90 border border-navy-700 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {myMember?.teamId ? (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-black font-display text-base shadow-md shrink-0"
                style={{
                  backgroundColor: IPL_FRANCHISES[myMember.teamId].primaryColor,
                  color: IPL_FRANCHISES[myMember.teamId].textColor
                }}
              >
                {myMember.teamId}
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-ruby-500/20 text-ruby-400 flex items-center justify-center font-bold">
                !
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base text-white">
                  {myMember?.nickname}
                </h3>
                {myMember?.isHost && (
                  <span className="bg-amber-400/20 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-400/30">
                    HOST
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Franchise:{' '}
                {myMember?.teamId ? (
                  <strong className="text-cyan-300">{IPL_FRANCHISES[myMember.teamId].name}</strong>
                ) : (
                  <strong className="text-ruby-400">No franchise selected</strong>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onChangeTeamClick}
              className="px-3.5 py-2 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-300 hover:text-white border border-navy-600 text-xs font-semibold transition-all"
            >
              Change Team
            </button>

            <button
              onClick={() => onToggleReady(!isReady)}
              className={`px-5 py-2 rounded-xl font-display font-bold text-xs transition-all flex items-center gap-1.5 ${
                isReady
                  ? 'bg-emerald-400 text-black shadow-glow-emerald'
                  : 'bg-navy-700 hover:bg-navy-600 text-slate-200 border border-slate-500'
              }`}
            >
              {isReady ? (
                <>
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Ready!</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 opacity-70" />
                  <span>Mark Ready</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Grid: Participants & Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Participants List (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>Participants ({humanMembers.length} Humans, {botMembers.length} Bots)</span>
              </h3>
            </div>

            <div className="space-y-2.5">
              {/* Human Members */}
              {humanMembers.map((member) => {
                const team = member.teamId ? IPL_FRANCHISES[member.teamId] : null;
                const isMe = member.id === myMemberId;

                return (
                  <div
                    key={member.id}
                    className={`glass-card rounded-xl p-3.5 flex items-center justify-between border transition-all ${
                      isMe ? 'border-cyan-400/50 bg-navy-800/80' : 'border-navy-700/80 bg-navy-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {team ? (
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-black font-display text-xs shadow-sm shrink-0"
                          style={{ backgroundColor: team.primaryColor, color: team.textColor }}
                        >
                          {team.id}
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-navy-800 border border-dashed border-slate-600 flex items-center justify-center text-xs text-slate-500 font-bold shrink-0">
                          ?
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-sm text-white">
                            {member.nickname}
                          </span>
                          {isMe && (
                            <span className="text-[10px] text-cyan-400 font-semibold">(You)</span>
                          )}
                          {member.isHost && (
                            <span className="bg-amber-400/20 text-amber-300 text-[9px] font-bold px-1.5 py-0.2 rounded border border-amber-400/30">
                              HOST
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">
                          {team ? team.name : 'Choosing team...'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${member.connected ? 'bg-emerald-400' : 'bg-ruby-500'}`} />
                        <span className="text-[11px] text-slate-400">
                          {member.connected ? 'Connected' : 'Offline'}
                        </span>
                      </div>

                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                          member.isReady
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {member.isReady ? 'READY' : 'WAITING'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Bot Members */}
              {botMembers.map((bot) => {
                const team = bot.teamId ? IPL_FRANCHISES[bot.teamId] : null;
                return (
                  <div
                    key={bot.id}
                    className="glass-card rounded-xl p-3.5 flex items-center justify-between border border-navy-700/60 bg-navy-900/40 opacity-85"
                  >
                    <div className="flex items-center gap-3">
                      {team && (
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-black font-display text-xs shadow-sm shrink-0"
                          style={{ backgroundColor: team.primaryColor, color: team.textColor }}
                        >
                          {team.id}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-sm text-slate-200">
                            {bot.nickname}
                          </span>
                          <span className="bg-purple-500/20 text-purple-300 text-[10px] font-bold px-1.5 py-0.2 rounded border border-purple-500/30 flex items-center gap-1">
                            <Bot className="w-2.5 h-2.5" />
                            AI BOT
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Strategy: <span className="capitalize text-slate-300 font-medium">{bot.botStrategy}</span>
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      READY
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Settings & Host Start */}
          <div className="space-y-4">
            <div className="glass-panel rounded-2xl p-5 border border-navy-600/70">
              <h3 className="font-display font-bold text-base text-white mb-3 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Auction Configuration</span>
              </h3>

              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex justify-between py-1.5 border-b border-navy-700/60">
                  <span className="text-slate-400">Starting Purse:</span>
                  <span className="font-bold text-cyan-300 font-mono">
                    ₹{(roomState.settings.startingPurse / 10000000).toFixed(0)} Crore
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-navy-700/60">
                  <span className="text-slate-400">Timer Per Lot:</span>
                  <span className="font-bold text-amber-300 font-mono">
                    {roomState.settings.timerDuration} Seconds
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-navy-700/60">
                  <span className="text-slate-400">Squad Target:</span>
                  <span className="font-mono text-slate-200">
                    Min {roomState.settings.minSquad} · Max {roomState.settings.maxSquad}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-navy-700/60">
                  <span className="text-slate-400">Overseas Limit:</span>
                  <span className="font-mono text-slate-200">
                    Max {roomState.settings.maxOverseas} per franchise
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-navy-700/60">
                  <span className="text-slate-400">Min Bid Increment:</span>
                  <span className="font-mono text-slate-200">
                    ₹{(roomState.settings.minBidIncrement / 100000).toFixed(0)} Lakh
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Marquee First:</span>
                  <span className="font-bold text-amber-400">SET -1 MARQUEE</span>
                </div>
              </div>

              {/* Host Start Button */}
              {isHost ? (
                <div className="mt-6 pt-4 border-t border-navy-700">
                  {unassignedHumans.length > 0 && (
                    <div className="mb-3 bg-amber-500/15 border border-amber-500/30 rounded-xl p-2.5 text-xs text-amber-200 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>Waiting for all participants to select their franchise.</span>
                    </div>
                  )}

                  <button
                    onClick={onStartAuction}
                    disabled={!canStart}
                    className="w-full bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-black font-display font-extrabold py-3.5 px-6 rounded-xl transition-all shadow-glow-emerald flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-base"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>Start Auction</span>
                  </button>
                  <p className="text-[11px] text-slate-400 text-center mt-2">
                    Only the room host can launch the auction.
                  </p>
                </div>
              ) : (
                <div className="mt-6 pt-4 border-t border-navy-700 text-center">
                  <p className="text-xs text-slate-400">
                    Waiting for the host (<strong className="text-cyan-300">{roomState.members[roomState.hostId]?.nickname || 'Host'}</strong>) to start the auction...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
