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
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 relative font-body">
      {/* Lobby Top Banner */}
      <div className="bg-[#12142A] rounded-3xl p-6 sm:p-8 border border-[#23274D] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#0A0B14] text-[#C8FF3D] text-xs font-heading font-extrabold uppercase tracking-wider px-3 py-1 rounded-md border border-[#C8FF3D]/30">
              WAITING LOBBY
            </span>
            {roomState.isPrivate && (
              <span className="bg-[#FFC93D]/15 text-[#FFC93D] text-xs font-heading font-bold px-2.5 py-0.5 rounded-md border border-[#FFC93D]/40 flex items-center gap-1 uppercase tracking-wider">
                <Lock className="w-3 h-3" /> PRIVATE
              </span>
            )}
            <span className="text-xs text-[#9E9EB8]">
              Season {roomState.settings.season} · {roomState.poolSize} Players in Pool
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-black text-white uppercase tracking-tight">
            {roomState.settings.roomName}
          </h1>
          <p className="text-xs sm:text-sm text-[#9E9EB8] mt-1">
            Lock in your franchise and confirm readiness. The host will strike the opening gavel once all seats are claimed.
          </p>
        </div>

        {/* Room Code & Share Link */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="bg-[#0A0B14] border border-[#23274D] rounded-2xl px-5 py-3 flex items-center justify-between gap-4 shadow-md">
            <div className="flex flex-col">
              <span className="text-[10px] text-[#9E9EB8] uppercase tracking-wider font-heading font-extrabold">Room Code</span>
              <span className="text-2xl font-number font-black text-[#FFC93D] tracking-wider">
                {roomState.roomCode}
              </span>
            </div>
            <button
              onClick={handleCopyLink}
              className="bg-[#12142A] hover:bg-[#181B38] text-white px-3.5 py-2 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border border-[#23274D]"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#C8FF3D]" />
                  <span className="text-[#C8FF3D]">Copied!</span>
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
      <div className="bg-[#12142A] border border-[#23274D] rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          {myMember?.teamId ? (
            <TeamLogo teamId={myMember.teamId} className="w-14 h-14 drop-shadow-md" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-[#FF3B5C]/15 border border-[#FF3B5C]/30 text-[#FF3B5C] flex items-center justify-center font-heading font-black text-xl">
              !
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-black text-lg text-white uppercase tracking-wide">
                {myMember?.nickname}
              </h3>
              {myMember?.isHost && (
                <span className="bg-[#FFC93D]/15 text-[#FFC93D] text-[10px] font-heading font-extrabold px-2 py-0.5 rounded-md border border-[#FFC93D]/40 uppercase tracking-wider">
                  HOST
                </span>
              )}
            </div>
            <p className="text-xs text-[#9E9EB8]">
              Franchise:{' '}
              {myMember?.teamId ? (
                <strong className="text-[#C8FF3D] font-heading font-bold uppercase">{IPL_FRANCHISES[myMember.teamId].name}</strong>
              ) : (
                <strong className="text-[#FF3B5C]">No franchise selected</strong>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onChangeTeamClick}
            className="px-4 py-2.5 rounded-xl bg-[#0A0B14] hover:bg-[#181B38] text-white border border-[#23274D] text-xs font-heading font-bold uppercase tracking-wider transition-all"
          >
            Change Team
          </button>

          <button
            onClick={() => onToggleReady(!isReady)}
            className={`px-6 py-2.5 rounded-xl font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
              isReady
                ? 'bg-[#C8FF3D] text-[#0A0B14] shadow-[0_0_20px_rgba(200,255,61,0.35)]'
                : 'bg-[#0A0B14] hover:bg-[#181B38] text-[#9E9EB8] hover:text-white border border-[#23274D]'
            }`}
          >
            {isReady ? (
              <>
                <CheckCircle2 className="w-4 h-4 stroke-[3]" />
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
          <h3 className="font-heading font-black text-base text-white uppercase tracking-wide flex items-center gap-2">
            <Users className="w-4 h-4 text-[#C8FF3D]" />
            <span>Participants ({humanMembers.length} Humans, {botMembers.length} Bots)</span>
          </h3>

          <div className="space-y-3">
            {humanMembers.map((member) => {
              const team = member.teamId ? IPL_FRANCHISES[member.teamId] : null;
              const isMe = member.id === myMemberId;

              return (
                <div
                  key={member.id}
                  className={`rounded-2xl p-4 flex items-center justify-between border transition-all ${
                    isMe ? 'border-[#C8FF3D] bg-[#12142A] shadow-md' : 'border-[#23274D] bg-[#12142A]'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {team ? (
                      <TeamLogo teamId={member.teamId} className="w-11 h-11 drop-shadow-sm shrink-0" />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-[#0A0B14] border border-dashed border-[#23274D] flex items-center justify-center text-xs text-[#9E9EB8] font-bold shrink-0">
                        ?
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold uppercase tracking-wide text-sm text-white">
                          {member.nickname}
                        </span>
                        {isMe && <span className="text-[10px] text-[#C8FF3D] font-extrabold">(You)</span>}
                        {member.isHost && (
                          <span className="bg-[#FFC93D]/15 text-[#FFC93D] text-[9px] font-heading font-extrabold px-2 py-0.5 rounded border border-[#FFC93D]/40 uppercase tracking-wider">
                            HOST
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#9E9EB8]">
                        {team ? team.name : 'Selecting team...'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-heading font-extrabold uppercase tracking-wider px-3 py-1 rounded-lg flex items-center gap-1.5 ${
                        member.isReady
                          ? 'bg-[#C8FF3D]/15 text-[#C8FF3D] border border-[#C8FF3D]/40'
                          : 'bg-[#FFC93D]/15 text-[#FFC93D] border border-[#FFC93D]/40'
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
                  className="rounded-2xl p-4 flex items-center justify-between border border-[#23274D] bg-[#0A0B14]"
                >
                  <div className="flex items-center gap-3.5">
                    {team && (
                      <TeamLogo teamId={bot.teamId} className="w-11 h-11 drop-shadow-sm shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold uppercase tracking-wide text-sm text-[#9E9EB8]">
                          {bot.nickname}
                        </span>
                        <span className="bg-[#12142A] text-[#7C5CFF] text-[10px] font-heading font-bold px-2 py-0.5 rounded border border-[#23274D] uppercase tracking-wider">
                          AI BOT
                        </span>
                      </div>
                      <p className="text-xs text-[#62658A]">
                        Strategy: <span className="capitalize text-white font-medium">{bot.botStrategy}</span>
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-heading font-extrabold uppercase tracking-wider px-3 py-1 rounded-lg bg-[#C8FF3D]/15 text-[#C8FF3D] border border-[#C8FF3D]/30">
                    READY
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Settings Summary & Host Launch */}
        <div className="space-y-4">
          <div className="bg-[#12142A] rounded-3xl p-6 border border-[#23274D] shadow-xl">
            <h3 className="font-heading font-black text-sm text-white mb-4 flex items-center gap-2 uppercase tracking-wide">
              <Sliders className="w-4 h-4 text-[#C8FF3D]" />
              <span>Auction Rules</span>
            </h3>

            <div className="space-y-3 text-xs text-[#9E9EB8]">
              <div className="flex justify-between py-1.5 border-b border-[#23274D]">
                <span>Starting Purse:</span>
                <span className="font-number font-extrabold text-[#FFC93D]">
                  ₹{(roomState.settings.startingPurse / 10000000).toFixed(0)} Cr
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#23274D]">
                <span>Timer Per Lot:</span>
                <span className="font-number font-extrabold text-[#C8FF3D]">
                  {roomState.settings.timerDuration}s
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#23274D]">
                <span>Squad Limits:</span>
                <span className="font-number font-bold text-white">Min 18 · Max 25</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#23274D]">
                <span>Overseas Limit:</span>
                <span className="font-number font-bold text-white">Max 8 per team</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#23274D]">
                <span>Min Increment:</span>
                <span className="font-number font-bold text-[#C8FF3D]">
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
              <div className="mt-6 pt-5 border-t border-[#23274D]">
                {unassignedHumans.length > 0 && (
                  <div className="mb-3 bg-[#FFC93D]/15 border border-[#FFC93D]/30 rounded-xl p-3 text-xs text-[#FFC93D] flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Waiting for all participants to select their franchise.</span>
                  </div>
                )}

                <button
                  onClick={onStartAuction}
                  disabled={!canStart}
                  className="w-full bg-[#C8FF3D] hover:bg-[#B5F522] text-[#0A0B14] font-heading font-black uppercase tracking-wider py-4 px-6 rounded-2xl transition-all shadow-[0_0_25px_rgba(200,255,61,0.35)] flex items-center justify-center gap-2.5 disabled:opacity-30 disabled:cursor-not-allowed text-base"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Start Auction</span>
                </button>
              </div>
            ) : (
              <div className="mt-6 pt-5 border-t border-[#23274D] text-center">
                <p className="text-xs text-[#9E9EB8]">
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
