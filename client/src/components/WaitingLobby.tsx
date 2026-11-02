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
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 relative selection:bg-[#C8FF45] selection:text-black font-body">
      {/* Lobby Top Banner */}
      <div className="bg-[#0E1626] rounded-2xl p-6 sm:p-8 border border-[#26354D] shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#C8FF45]/15 text-[#C8FF45] text-xs font-heading font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-[#C8FF45]/30">
              WAITING LOBBY
            </span>
            {roomState.isPrivate && (
              <span className="bg-[#FFC857]/15 text-[#FFC857] text-xs font-heading font-bold px-2.5 py-0.5 rounded-full border border-[#FFC857]/30 flex items-center gap-1 uppercase tracking-wider">
                <Lock className="w-3 h-3" /> PRIVATE
              </span>
            )}
            <span className="text-xs text-[#9BAAC0]">
              Season {roomState.settings.season} · {roomState.poolSize} Players
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-black text-[#F4F7FC] uppercase tracking-wide">
            {roomState.settings.roomName}
          </h1>
          <p className="text-xs sm:text-sm text-[#9BAAC0] mt-1">
            Select your franchise and confirm readiness. The host will start once everyone is prepared.
          </p>
        </div>

        {/* Room Code & Share Link */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="bg-[#141F33] border border-[#26354D] rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] text-[#9BAAC0] uppercase tracking-wider font-heading font-bold">Room Code</span>
              <span className="text-xl font-number text-[#C8FF45] tracking-wider">
                {roomState.roomCode}
              </span>
            </div>
            <button
              onClick={handleCopyLink}
              className="bg-[#1B2942] hover:bg-[#26354D] text-[#C8FF45] px-3.5 py-1.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border border-[#26354D]"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#C8FF45]" />
                  <span>Copied!</span>
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
      <div className="bg-[#0E1626] border border-[#26354D] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {myMember?.teamId ? (
            <TeamLogo teamId={myMember.teamId} className="w-14 h-14 shadow-lg" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-[#FF647C]/15 text-[#FF647C] flex items-center justify-center font-bold">
              !
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-extrabold text-base text-[#F4F7FC] uppercase tracking-wide">
                {myMember?.nickname}
              </h3>
              {myMember?.isHost && (
                <span className="bg-[#FFC857]/20 text-[#FFC857] text-[10px] font-heading font-bold px-1.5 py-0.5 rounded border border-[#FFC857]/30 uppercase tracking-wider">
                  HOST
                </span>
              )}
            </div>
            <p className="text-xs text-[#9BAAC0]">
              Franchise:{' '}
              {myMember?.teamId ? (
                <strong className="text-[#F4F7FC] font-heading font-bold uppercase">{IPL_FRANCHISES[myMember.teamId].name}</strong>
              ) : (
                <strong className="text-[#FF647C]">No franchise selected</strong>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onChangeTeamClick}
            className="px-3.5 py-2 rounded-xl bg-[#141F33] hover:bg-[#1B2942] text-[#9BAAC0] hover:text-[#F4F7FC] border border-[#26354D] text-xs font-semibold transition-all"
          >
            Change Team
          </button>

          <button
            onClick={() => onToggleReady(!isReady)}
            className={`px-5 py-2.5 rounded-xl font-heading font-extrabold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              isReady
                ? 'bg-[#C8FF45] text-black shadow-glow-lime'
                : 'bg-[#141F33] hover:bg-[#1B2942] text-[#9BAAC0] border border-[#26354D]'
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
          <h3 className="font-heading font-black text-base text-[#F4F7FC] uppercase tracking-wide flex items-center gap-2">
            <Users className="w-4 h-4 text-[#C8FF45]" />
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
                    isMe ? 'border-[#C8FF45]/50 bg-[#141F33]' : 'border-[#26354D] bg-[#0E1626]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {team ? (
                      <TeamLogo teamId={member.teamId} className="w-10 h-10 shadow-sm shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#141F33] border border-dashed border-[#26354D] flex items-center justify-center text-xs text-[#9BAAC0] font-bold shrink-0">
                        ?
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold uppercase tracking-wide text-sm text-[#F4F7FC]">
                          {member.nickname}
                        </span>
                        {isMe && <span className="text-[10px] text-[#C8FF45] font-semibold">(You)</span>}
                        {member.isHost && (
                          <span className="bg-[#FFC857]/20 text-[#FFC857] text-[9px] font-heading font-extrabold px-1.5 py-0.2 rounded border border-[#FFC857]/30 uppercase tracking-wider">
                            HOST
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#9BAAC0]">
                        {team ? team.name : 'Selecting team...'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-heading font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                        member.isReady
                          ? 'bg-[#C8FF45]/15 text-[#C8FF45] border border-[#C8FF45]/30'
                          : 'bg-[#FFC857]/15 text-[#FFC857] border border-[#FFC857]/30'
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
                  className="rounded-xl p-3.5 flex items-center justify-between border border-[#26354D] bg-[#0E1626]/70"
                >
                  <div className="flex items-center gap-3">
                    {team && (
                      <TeamLogo teamId={bot.teamId} className="w-10 h-10 shadow-sm shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold uppercase tracking-wide text-sm text-[#9BAAC0]">
                          {bot.nickname}
                        </span>
                        <span className="bg-[#54C8FF]/20 text-[#54C8FF] text-[10px] font-heading font-bold px-1.5 py-0.2 rounded border border-[#54C8FF]/30 uppercase tracking-wider">
                          AI BOT
                        </span>
                      </div>
                      <p className="text-xs text-[#5A6F8F]">
                        Strategy: <span className="capitalize text-[#F4F7FC] font-medium">{bot.botStrategy}</span>
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-heading font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-[#C8FF45]/15 text-[#C8FF45] border border-[#C8FF45]/30">
                    READY
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Settings Summary & Host Launch */}
        <div className="space-y-4">
          <div className="bg-[#0E1626] rounded-2xl p-5 border border-[#26354D]">
            <h3 className="font-heading font-black text-sm text-[#F4F7FC] mb-3 flex items-center gap-2 uppercase tracking-wide">
              <Sliders className="w-4 h-4 text-[#C8FF45]" />
              <span>Auction Rules</span>
            </h3>

            <div className="space-y-2.5 text-xs text-[#9BAAC0]">
              <div className="flex justify-between py-1.5 border-b border-[#1C273A]">
                <span>Starting Purse:</span>
                <span className="font-number text-[#C8FF45]">
                  ₹{(roomState.settings.startingPurse / 10000000).toFixed(0)} Cr
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#1C273A]">
                <span>Timer Per Lot:</span>
                <span className="font-number text-[#FFC857]">
                  {roomState.settings.timerDuration}s
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#1C273A]">
                <span>Squad Limits:</span>
                <span className="font-number text-[#F4F7FC]">Min 18 · Max 25</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#1C273A]">
                <span>Overseas Limit:</span>
                <span className="font-number text-[#FFC857]">Max 8 per team</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#1C273A]">
                <span>Min Increment:</span>
                <span className="font-number text-[#F4F7FC]">
                  ₹{(roomState.settings.minBidIncrement / 100000).toFixed(0)}L
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span>Room Mode:</span>
                <span className="font-bold text-[#F4F7FC] capitalize">{roomState.settings.playMode.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Host Start Action */}
            {isHost ? (
              <div className="mt-6 pt-4 border-t border-[#26354D]">
                {unassignedHumans.length > 0 && (
                  <div className="mb-3 bg-[#FFC857]/10 border border-[#FFC857]/25 rounded-xl p-2.5 text-xs text-[#FFC857] flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Waiting for all participants to select their franchise.</span>
                  </div>
                )}

                <button
                  onClick={onStartAuction}
                  disabled={!canStart}
                  className="w-full bg-[#C8FF45] hover:bg-[#B0E635] text-black font-heading font-black uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all shadow-glow-lime flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed text-base"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Start Auction</span>
                </button>
              </div>
            ) : (
              <div className="mt-6 pt-4 border-t border-[#26354D] text-center">
                <p className="text-xs text-[#9BAAC0]">
                  Waiting for host (<strong className="text-[#F4F7FC]">{roomState.members[roomState.hostId]?.nickname || 'Host'}</strong>) to start...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
