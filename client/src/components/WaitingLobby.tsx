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
      <div className="bg-white rounded-xl p-6 sm:p-8 border border-[#D8D8D1] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#E6EDF8] text-[#173B78] text-xs font-heading font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border border-[#D8D8D1]">
              WAITING LOBBY
            </span>
            {roomState.isPrivate && (
              <span className="bg-[#F0C65B]/20 text-[#B8860B] text-xs font-heading font-bold px-2.5 py-0.5 rounded border border-[#F0C65B]/40 flex items-center gap-1 uppercase tracking-wider">
                <Lock className="w-3 h-3" /> PRIVATE
              </span>
            )}
            <span className="text-xs text-[#647084]">
              Season {roomState.settings.season} · {roomState.poolSize} Players
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-[#18243A] uppercase tracking-wide">
            {roomState.settings.roomName}
          </h1>
          <p className="text-xs sm:text-sm text-[#647084] mt-1">
            Select your franchise and confirm readiness. The host will start once everyone is prepared.
          </p>
        </div>

        {/* Room Code & Share Link */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="bg-[#E6EDF8] border border-[#D8D8D1] rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] text-[#647084] uppercase tracking-wider font-heading font-bold">Room Code</span>
              <span className="text-xl font-number font-bold text-[#173B78] tracking-wider">
                {roomState.roomCode}
              </span>
            </div>
            <button
              onClick={handleCopyLink}
              className="bg-white hover:bg-[#D5E2F5] text-[#173B78] px-3.5 py-1.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border border-[#D8D8D1]"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#176B48]" />
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
      <div className="bg-white border border-[#D8D8D1] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          {myMember?.teamId ? (
            <TeamLogo teamId={myMember.teamId} className="w-14 h-14 shadow-sm" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-[#C74444]/15 text-[#C74444] flex items-center justify-center font-bold">
              !
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-base text-[#18243A] uppercase tracking-wide">
                {myMember?.nickname}
              </h3>
              {myMember?.isHost && (
                <span className="bg-[#F0C65B]/20 text-[#B8860B] text-[10px] font-heading font-bold px-1.5 py-0.5 rounded border border-[#F0C65B]/40 uppercase tracking-wider">
                  HOST
                </span>
              )}
            </div>
            <p className="text-xs text-[#647084]">
              Franchise:{' '}
              {myMember?.teamId ? (
                <strong className="text-[#173B78] font-heading font-bold uppercase">{IPL_FRANCHISES[myMember.teamId].name}</strong>
              ) : (
                <strong className="text-[#C74444]">No franchise selected</strong>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onChangeTeamClick}
            className="px-3.5 py-2 rounded-xl bg-[#E6EDF8] hover:bg-[#D5E2F5] text-[#173B78] border border-[#D8D8D1] text-xs font-semibold transition-all"
          >
            Change Team
          </button>

          <button
            onClick={() => onToggleReady(!isReady)}
            className={`px-5 py-2.5 rounded-xl font-heading font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              isReady
                ? 'bg-[#176B48] text-white shadow-md'
                : 'bg-[#E6EDF8] hover:bg-[#D5E2F5] text-[#647084] hover:text-[#18243A] border border-[#D8D8D1]'
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
          <h3 className="font-heading font-bold text-base text-[#18243A] uppercase tracking-wide flex items-center gap-2">
            <Users className="w-4 h-4 text-[#173B78]" />
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
                    isMe ? 'border-[#176B48] bg-[#E6EDF8]/50 shadow-sm' : 'border-[#D8D8D1] bg-white shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {team ? (
                      <TeamLogo teamId={member.teamId} className="w-10 h-10 shadow-sm shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#F3F0E8] border border-dashed border-[#D8D8D1] flex items-center justify-center text-xs text-[#647084] font-bold shrink-0">
                        ?
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold uppercase tracking-wide text-sm text-[#18243A]">
                          {member.nickname}
                        </span>
                        {isMe && <span className="text-[10px] text-[#176B48] font-semibold">(You)</span>}
                        {member.isHost && (
                          <span className="bg-[#F0C65B]/20 text-[#B8860B] text-[9px] font-heading font-bold px-1.5 py-0.2 rounded border border-[#F0C65B]/40 uppercase tracking-wider">
                            HOST
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#647084]">
                        {team ? team.name : 'Selecting team...'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-heading font-bold uppercase tracking-wider px-2.5 py-1 rounded flex items-center gap-1 ${
                        member.isReady
                          ? 'bg-[#176B48]/10 text-[#176B48] border border-[#176B48]/30'
                          : 'bg-[#F0C65B]/20 text-[#B8860B] border border-[#F0C65B]/40'
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
                  className="rounded-xl p-3.5 flex items-center justify-between border border-[#D8D8D1] bg-[#F3F0E8]"
                >
                  <div className="flex items-center gap-3">
                    {team && (
                      <TeamLogo teamId={bot.teamId} className="w-10 h-10 shadow-sm shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold uppercase tracking-wide text-sm text-[#647084]">
                          {bot.nickname}
                        </span>
                        <span className="bg-[#E6EDF8] text-[#173B78] text-[10px] font-heading font-bold px-1.5 py-0.2 rounded border border-[#D8D8D1] uppercase tracking-wider">
                          AI BOT
                        </span>
                      </div>
                      <p className="text-xs text-[#647084]">
                        Strategy: <span className="capitalize text-[#18243A] font-medium">{bot.botStrategy}</span>
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-heading font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-[#176B48]/10 text-[#176B48] border border-[#176B48]/30">
                    READY
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Settings Summary & Host Launch */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 border border-[#D8D8D1] shadow-sm">
            <h3 className="font-heading font-bold text-sm text-[#18243A] mb-3 flex items-center gap-2 uppercase tracking-wide">
              <Sliders className="w-4 h-4 text-[#173B78]" />
              <span>Auction Rules</span>
            </h3>

            <div className="space-y-2.5 text-xs text-[#647084]">
              <div className="flex justify-between py-1.5 border-b border-[#D8D8D1]">
                <span>Starting Purse:</span>
                <span className="font-number font-bold text-[#176B48]">
                  ₹{(roomState.settings.startingPurse / 10000000).toFixed(0)} Cr
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#D8D8D1]">
                <span>Timer Per Lot:</span>
                <span className="font-number font-bold text-[#173B78]">
                  {roomState.settings.timerDuration}s
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#D8D8D1]">
                <span>Squad Limits:</span>
                <span className="font-number font-bold text-[#18243A]">Min 18 · Max 25</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#D8D8D1]">
                <span>Overseas Limit:</span>
                <span className="font-number font-bold text-[#18243A]">Max 8 per team</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#D8D8D1]">
                <span>Min Increment:</span>
                <span className="font-number font-bold text-[#18243A]">
                  ₹{(roomState.settings.minBidIncrement / 100000).toFixed(0)}L
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span>Room Mode:</span>
                <span className="font-bold text-[#18243A] capitalize">{roomState.settings.playMode.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Host Start Action */}
            {isHost ? (
              <div className="mt-6 pt-4 border-t border-[#D8D8D1]">
                {unassignedHumans.length > 0 && (
                  <div className="mb-3 bg-[#F0C65B]/20 border border-[#F0C65B]/40 rounded-xl p-2.5 text-xs text-[#B8860B] flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Waiting for all participants to select their franchise.</span>
                  </div>
                )}

                <button
                  onClick={onStartAuction}
                  disabled={!canStart}
                  className="w-full bg-[#176B48] hover:bg-[#125438] text-white font-heading font-bold uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed text-base"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Start Auction</span>
                </button>
              </div>
            ) : (
              <div className="mt-6 pt-4 border-t border-[#D8D8D1] text-center">
                <p className="text-xs text-[#647084]">
                  Waiting for host (<strong className="text-[#18243A]">{roomState.members[roomState.hostId]?.nickname || 'Host'}</strong>) to start...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
