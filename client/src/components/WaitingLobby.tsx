import React, { useState } from 'react';
import { Play, Copy, Check, Users, Sliders, CheckCircle2, XCircle, AlertTriangle, Lock } from 'lucide-react';
import { RoomState, IPLTeamId, IPL_FRANCHISES } from '../types.js';
import { TeamLogo } from './TeamLogo.js';

interface WaitingLobbyProps {
  roomState: RoomState;
  myMemberId: string;
  onToggleReady: (isReady: boolean) => void;
  onSelectTeam: (teamId: IPLTeamId) => void;
  onStartAuction: () => void;
  onChangeTeamClick: () => void;
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

  const unassignedHumans = humanMembers.filter(m => !m.teamId);
  const canStart = isHost && unassignedHumans.length === 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 relative selection:bg-cricket-400 selection:text-black">
      {/* Lobby Top Banner */}
      <div className="bg-[#0D0D0D] rounded-2xl p-6 sm:p-8 border border-[#292929] shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-cricket-400/15 text-cricket-400 text-xs font-bold px-2.5 py-0.5 rounded-full border border-cricket-400/30">
              WAITING LOBBY
            </span>
            {roomState.isPrivate && (
              <span className="bg-gold-400/15 text-gold-400 text-xs font-bold px-2.5 py-0.5 rounded-full border border-gold-400/30 flex items-center gap-1">
                <Lock className="w-3 h-3" /> PRIVATE
              </span>
            )}
            <span className="text-xs text-[#B3B3B3] font-mono">
              Season {roomState.settings.season} · {roomState.poolSize} Players
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-white">
            {roomState.settings.roomName}
          </h1>
          <p className="text-xs sm:text-sm text-[#B3B3B3] mt-1">
            Select your franchise and confirm readiness. The host will start once everyone is prepared.
          </p>
        </div>

        {/* Room Code & Share Link */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="bg-[#151515] border border-[#292929] rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] text-[#808080] uppercase tracking-wider font-bold">Room Code</span>
              <span className="text-lg font-mono font-black text-cricket-400 tracking-wider">
                {roomState.roomCode}
              </span>
            </div>
            <button
              onClick={handleCopyLink}
              className="bg-[#1E1E1E] hover:bg-[#292929] text-cricket-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border border-[#292929]"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-cricket-400" />
                  <span className="text-cricket-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* User Ready & Team Banner */}
      <div className="bg-[#0D0D0D] border border-[#292929] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {myMember?.teamId ? (
            <TeamLogo teamId={myMember.teamId} className="w-14 h-14 shadow-lg" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-alert-500/15 text-alert-500 flex items-center justify-center font-bold">
              !
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-base text-white">
                {myMember?.nickname}
              </h3>
              {myMember?.isHost && (
                <span className="bg-gold-400/15 text-gold-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-gold-400/30">
                  HOST
                </span>
              )}
            </div>
            <p className="text-xs text-[#B3B3B3]">
              Franchise:{' '}
              {myMember?.teamId ? (
                <strong className="text-white">{IPL_FRANCHISES[myMember.teamId].name}</strong>
              ) : (
                <strong className="text-alert-500">No franchise selected</strong>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onChangeTeamClick}
            className="px-3.5 py-2 rounded-xl bg-[#151515] hover:bg-[#1E1E1E] text-[#B3B3B3] hover:text-white border border-[#292929] text-xs font-semibold transition-all"
          >
            Change Team
          </button>

          <button
            onClick={() => onToggleReady(!isReady)}
            className={`px-5 py-2 rounded-xl font-display font-bold text-xs transition-all flex items-center gap-1.5 ${
              isReady
                ? 'bg-cricket-400 text-black shadow-glow-green'
                : 'bg-[#151515] hover:bg-[#1E1E1E] text-[#B3B3B3] border border-[#292929]'
            }`}
          >
            {isReady ? (
              <>
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>Ready!</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 opacity-60" />
                <span>Mark Ready</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Participants & Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-cricket-400" />
            <span>Participants ({humanMembers.length} Humans, {botMembers.length} Bots)</span>
          </h3>

          <div className="space-y-2.5">
            {humanMembers.map((member) => {
              const team = member.teamId ? IPL_FRANCHISES[member.teamId] : null;
              const isMe = member.id === myMemberId;

              return (
                <div
                  key={member.id}
                  className={`rounded-xl p-3.5 flex items-center justify-between border transition-all ${
                    isMe ? 'border-cricket-400/50 bg-[#151515]' : 'border-[#292929] bg-[#0D0D0D]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {team ? (
                      <TeamLogo teamId={member.teamId} className="w-10 h-10 shadow-sm shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#151515] border border-dashed border-[#3D3D3D] flex items-center justify-center text-xs text-[#808080] font-bold shrink-0">
                        ?
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-sm text-white">
                          {member.nickname}
                        </span>
                        {isMe && <span className="text-[10px] text-cricket-400 font-semibold">(You)</span>}
                        {member.isHost && (
                          <span className="bg-gold-400/15 text-gold-400 text-[9px] font-bold px-1.5 py-0.2 rounded border border-gold-400/30">
                            HOST
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#B3B3B3]">
                        {team ? team.name : 'Selecting team...'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                        member.isReady
                          ? 'bg-cricket-400/15 text-cricket-400 border border-cricket-400/30'
                          : 'bg-gold-400/15 text-gold-400 border border-gold-400/30'
                      }`}
                    >
                      {member.isReady ? 'READY' : 'WAITING'}
                    </span>
                  </div>
                </div>
              );
            })}

            {botMembers.map((bot) => {
              const team = bot.teamId ? IPL_FRANCHISES[bot.teamId] : null;
              return (
                <div
                  key={bot.id}
                  className="rounded-xl p-3.5 flex items-center justify-between border border-[#292929] bg-[#0D0D0D]/60"
                >
                  <div className="flex items-center gap-3">
                    {team && (
                      <TeamLogo teamId={bot.teamId} className="w-10 h-10 shadow-sm shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-sm text-[#B3B3B3]">
                          {bot.nickname}
                        </span>
                        <span className="bg-purple-500/20 text-purple-300 text-[10px] font-bold px-1.5 py-0.2 rounded border border-purple-500/30">
                          AI BOT
                        </span>
                      </div>
                      <p className="text-xs text-[#808080]">
                        Strategy: <span className="capitalize text-white font-medium">{bot.botStrategy}</span>
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-cricket-400/15 text-cricket-400 border border-cricket-400/30">
                    READY
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Settings Summary & Host Launch */}
        <div className="space-y-4">
          <div className="bg-[#0D0D0D] rounded-2xl p-5 border border-[#292929]">
            <h3 className="font-display font-bold text-sm text-white mb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cricket-400" />
              <span>Auction Rules</span>
            </h3>

            <div className="space-y-2.5 text-xs text-[#B3B3B3]">
              <div className="flex justify-between py-1.5 border-b border-[#1E1E1E]">
                <span>Starting Purse:</span>
                <span className="font-bold text-cricket-400 font-mono">
                  ₹{(roomState.settings.startingPurse / 10000000).toFixed(0)} Cr
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#1E1E1E]">
                <span>Timer Per Lot:</span>
                <span className="font-bold text-gold-400 font-mono">
                  {roomState.settings.timerDuration}s
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#1E1E1E]">
                <span>Squad Limits:</span>
                <span className="font-mono text-white">Min 18 · Max 25</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#1E1E1E]">
                <span>Overseas Limit:</span>
                <span className="font-mono text-gold-400 font-bold">Max 8 per team</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#1E1E1E]">
                <span>Min Increment:</span>
                <span className="font-mono text-white">
                  ₹{(roomState.settings.minBidIncrement / 100000).toFixed(0)}L
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span>Room Mode:</span>
                <span className="font-bold text-white capitalize">{roomState.settings.playMode.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Host Start Action */}
            {isHost ? (
              <div className="mt-6 pt-4 border-t border-[#292929]">
                {unassignedHumans.length > 0 && (
                  <div className="mb-3 bg-gold-400/10 border border-gold-400/25 rounded-xl p-2.5 text-xs text-gold-400 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Waiting for all participants to select their franchise.</span>
                  </div>
                )}

                <button
                  onClick={onStartAuction}
                  disabled={!canStart}
                  className="w-full bg-cricket-400 hover:bg-cricket-500 text-black font-display font-extrabold py-3.5 px-6 rounded-xl transition-all shadow-glow-green flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-base"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Start Auction</span>
                </button>
              </div>
            ) : (
              <div className="mt-6 pt-4 border-t border-[#292929] text-center">
                <p className="text-xs text-[#B3B3B3]">
                  Waiting for host (<strong className="text-white">{roomState.members[roomState.hostId]?.nickname || 'Host'}</strong>) to start...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
