import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Crown,
  Flame,
  LogOut,
  Plus,
  RefreshCw,
  Shield,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import { apiFetch } from '../api';
import type { Team, TeamStanding, User } from '../types';
import { CATEGORY_META } from './CategoryBadge';

interface Props {
  user: User | null;
  myTeam: Team | null;
  standings: TeamStanding[];
  initialTeamId?: number | null;
  maxTeamSize: number;
  onRefreshAll: () => Promise<void>;
  onOpenAuth: () => void;
}

interface TeamDetailPayload {
  team: Team & {
    rank: number | null;
    score: number;
    hintPenalty: number;
    firstBloods: number;
    categoryScores: Record<string, number>;
  };
  members: Array<{
    id: number;
    username: string;
    department: string;
    roll_number: string;
    solve_count: number;
  }>;
  solves: Array<{
    challenge_id: number;
    title: string;
    category: string;
    difficulty: string;
    is_first_blood: number;
    bonus_points: number;
    solved_at: string;
    solved_by: string;
  }>;
}

export function TeamHub({ user, myTeam, standings, initialTeamId, maxTeamSize, onRefreshAll, onOpenAuth }: Props) {
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(initialTeamId || myTeam?.id || standings[0]?.id || null);
  const [detail, setDetail] = useState<TeamDetailPayload | null>(null);

  // Create team form
  const [newName, setNewName] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newDept, setNewDept] = useState(user?.department || 'B.Tech CSE');
  const [newMotto, setNewMotto] = useState('');

  // Join team form
  const [inviteCode, setInviteCode] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmKickId, setConfirmKickId] = useState<number | null>(null);

  useEffect(() => {
    if (initialTeamId) {
      setSelectedTeamId(initialTeamId);
    } else if (myTeam?.id && !selectedTeamId) {
      setSelectedTeamId(myTeam.id);
    } else if (!selectedTeamId && standings[0]?.id) {
      setSelectedTeamId(standings[0].id);
    }
  }, [initialTeamId, myTeam?.id, selectedTeamId, standings]);

  useEffect(() => {
    const targetId = selectedTeamId || myTeam?.id;
    if (!targetId) {
      setDetail(null);
      return;
    }
    apiFetch<TeamDetailPayload>(`/api/teams/${targetId}`)
      .then(setDetail)
      .catch(() => setDetail(null));
  }, [selectedTeamId, myTeam?.id, standings]);

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return onOpenAuth();
    setFeedback(null);
    try {
      const res = await apiFetch<{ team: Team }>('/api/teams', {
        method: 'POST',
        body: JSON.stringify({ name: newName, tag: newTag, department: newDept, motto: newMotto }),
      });
      setSelectedTeamId(res.team.id);
      setNewName('');
      setNewTag('');
      setNewMotto('');
      setFeedback({ type: 'ok', msg: `Squad "${res.team.name}" created! Share code ${res.team.invite_code} with teammates.` });
      await onRefreshAll();
    } catch (err) {
      setFeedback({ type: 'err', msg: err instanceof Error ? err.message : 'Could not create team' });
    }
  }

  async function handleJoinTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return onOpenAuth();
    setFeedback(null);
    try {
      const res = await apiFetch<{ team: Team }>('/api/teams/join', {
        method: 'POST',
        body: JSON.stringify({ inviteCode }),
      });
      setSelectedTeamId(res.team.id);
      setInviteCode('');
      setFeedback({ type: 'ok', msg: `Joined "${res.team.name}"! Your captures now pool together.` });
      await onRefreshAll();
    } catch (err) {
      setFeedback({ type: 'err', msg: err instanceof Error ? err.message : 'Failed to join team' });
    }
  }

  async function handleLeaveTeam() {
    try {
      await apiFetch('/api/teams/leave', { method: 'POST' });
      setConfirmLeave(false);
      setSelectedTeamId(null);
      setFeedback({ type: 'ok', msg: 'You left your squad.' });
      await onRefreshAll();
    } catch (err) {
      setFeedback({ type: 'err', msg: err instanceof Error ? err.message : 'Failed to leave team' });
    }
  }

  async function handleRegenerateCode() {
    try {
      const res = await apiFetch<{ invite_code: string }>('/api/teams/regenerate-code', { method: 'POST' });
      setFeedback({ type: 'ok', msg: `New invite code generated: ${res.invite_code}` });
      await onRefreshAll();
    } catch (err) {
      setFeedback({ type: 'err', msg: err instanceof Error ? err.message : 'Failed to regenerate code' });
    }
  }

  async function handleKick(memberId: number) {
    try {
      await apiFetch('/api/teams/kick', { method: 'POST', body: JSON.stringify({ userId: memberId }) });
      setConfirmKickId(null);
      await onRefreshAll();
    } catch (err) {
      setFeedback({ type: 'err', msg: err instanceof Error ? err.message : 'Failed to remove member' });
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const allCatEntries = detail ? Object.entries(detail.team.categoryScores).sort((a, b) => b[1] - a[1]) : [];
  const maxCatVal = Math.max(1, ...allCatEntries.map(([, v]) => v));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Squad Operations Hub</h1>
        <p className="mt-0.5 text-sm text-slate-400">
          Compete together in CUJ squads of up to <span className="font-mono text-emerald-300">{maxTeamSize}</span> students — shared solves, shared hints, unified podium rank.
        </p>
      </div>

      {feedback && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.type === 'ok'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
              : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* Create / Join Split */}
      {(!user || (!myTeam && user.role !== 'admin')) && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <form onSubmit={handleCreateTeam} className="glass-panel rounded-2xl border border-white/[0.08] p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/12 p-2.5 text-emerald-400">
                <Plus className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Form a New Squad</h2>
                <p className="text-xs text-slate-400">Generate a team invite token for up to {maxTeamSize} CUJ members</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs text-slate-400">Team Name</label>
                <input
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Trikuta Hackers"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#06090f] px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Tag</label>
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="TRKT"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#06090f] px-3 py-2 text-sm font-mono uppercase text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Department</label>
                <input
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#06090f] px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Motto</label>
                <input
                  value={newMotto}
                  onChange={(e) => setNewMotto(e.target.value)}
                  placeholder="Hack the campus grid."
                  className="w-full rounded-xl border border-white/[0.08] bg-[#06090f] px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
            >
              {user ? 'Create Squad & Generate Code' : 'Sign In to Create Squad'}
            </button>
          </form>

          <form
            onSubmit={handleJoinTeam}
            className="glass-panel flex flex-col justify-between rounded-2xl border border-white/[0.08] p-5 space-y-4"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-cyan-500/35 bg-cyan-500/12 p-2.5 text-cyan-400">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Join Existing Squad</h2>
                  <p className="text-xs text-slate-400">Paste the invite token from your squad captain</p>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Squad Invite Code</label>
                <input
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="e.g. CUJ-SHVK-2026"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#06090f] px-3.5 py-2.5 text-sm font-mono uppercase tracking-wider text-cyan-300 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <p className="text-xs text-slate-400">
                Testing as solo student <span className="font-mono text-slate-200">kabir.mca</span>? Click{' '}
                <button
                  type="button"
                  onClick={() => setInviteCode('CUJ-SHVK-2026')}
                  className="font-mono text-cyan-400 underline hover:text-cyan-300"
                >
                  CUJ-SHVK-2026
                </button>{' '}
                to join Shivalik Rootkits or create your own squad on the left.
              </p>
            </div>
            <button
              type="submit"
              className="w-full rounded-xl border border-cyan-500/40 bg-cyan-500/15 py-2.5 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/25"
            >
              {user ? 'Join Squad Now' : 'Sign In to Join Squad'}
            </button>
          </form>
        </div>
      )}

      {/* Squad Directory + Inspector */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-5 glass-panel overflow-hidden rounded-2xl border border-white/[0.07]">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Users className="h-4 w-4 text-emerald-400" />
              CUJ Squads ({standings.length})
            </div>
            {myTeam && (
              <button
                type="button"
                onClick={() => setSelectedTeamId(myTeam.id)}
                className="text-xs font-mono text-emerald-400 hover:underline"
              >
                My Squad
              </button>
            )}
          </div>
          <div className="divide-y divide-white/[0.05] max-h-[560px] overflow-y-auto">
            {standings.map((t) => {
              const isMine = myTeam?.id === t.id;
              const isSelected = (selectedTeamId || myTeam?.id) === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTeamId(t.id)}
                  className={`flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition ${
                    isSelected ? 'bg-emerald-500/12' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">#{t.rank}</span>
                      <span className="truncate font-semibold text-white">{t.name}</span>
                      <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                        {t.tag}
                      </span>
                      {isMine && (
                        <span className="rounded border border-emerald-500/40 bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {t.department} &middot; {t.memberCount}/{maxTeamSize} members &middot; {t.solveCount} solves
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-sm font-bold text-emerald-400 tabular-nums">{t.score}</div>
                    <div className="text-[10px] text-slate-500">PTS</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Squad Command Detail */}
        <div className="xl:col-span-7">
          {detail ? (
            <div className="glass-panel rounded-2xl border border-white/[0.07] p-6 space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.07] pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg border border-emerald-500/35 bg-emerald-500/12 px-2.5 py-1 font-mono text-xs font-bold text-emerald-300">
                      RANK #{detail.team.rank || '-'}
                    </span>
                    <span className="rounded bg-white/[0.06] px-2 py-0.5 font-mono text-xs text-slate-300">
                      [{detail.team.tag}]
                    </span>
                    <span className="text-xs text-slate-400">{detail.team.department}</span>
                  </div>
                  <h2 className="mt-2 text-2xl font-bold text-white">{detail.team.name}</h2>
                  <p className="text-sm text-slate-400 italic">"{detail.team.motto}"</p>
                </div>

                <div className="flex gap-5 text-right font-mono">
                  <div>
                    <div className="text-2xl font-bold text-emerald-400 tabular-nums">{detail.team.score}</div>
                    <div className="text-[10px] text-slate-500">SCORE</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-400 tabular-nums">{detail.team.firstBloods}</div>
                    <div className="text-[10px] text-slate-500">1ST BLOODS</div>
                  </div>
                </div>
              </div>

              {/* Invite Code Card */}
              {detail.team.invite_code && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-500/30 bg-cyan-500/[0.06] px-4 py-3">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400">
                      Squad Invite Token
                    </div>
                    <div className="mt-0.5 font-mono text-lg font-bold tracking-widest text-white">
                      {detail.team.invite_code}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copyCode(detail.team.invite_code!)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/25"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    {user?.id === detail.team.captain_id && (
                      <button
                        type="button"
                        onClick={handleRegenerateCode}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 hover:text-white"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Rotate
                      </button>
                    )}
                    {myTeam?.id === detail.team.id && !confirmLeave && (
                      <button
                        type="button"
                        onClick={() => setConfirmLeave(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/20"
                      >
                        <LogOut className="h-3.5 w-3.5" /> Leave
                      </button>
                    )}
                    {myTeam?.id === detail.team.id && confirmLeave && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleLeaveTeam}
                          className="rounded-lg bg-rose-500 px-2.5 py-1 text-xs font-bold text-white"
                        >
                          Confirm Leave
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmLeave(false)}
                          className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-400"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Category Breakdown */}
              {allCatEntries.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    Track Points Breakdown
                  </h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {allCatEntries.map(([cat, pts]) => {
                      const meta = CATEGORY_META[cat] || CATEGORY_META.Misc;
                      const pct = Math.round((pts / maxCatVal) * 100);
                      return (
                        <div key={cat} className="rounded-xl border border-white/[0.06] bg-[#06090f] px-3 py-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-200">{cat}</span>
                            <span className="font-mono font-bold text-white tabular-nums">{pts} pts</span>
                          </div>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: meta.accentHex }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Active Roster */}
              <div>
                <h3 className="mb-3 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Active Roster ({detail.members.length}/{maxTeamSize})
                </h3>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {detail.members.map((m) => {
                    const isCap = m.id === detail.team.captain_id;
                    const initials = m.username.slice(0, 2).toUpperCase();
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#06090f] px-3.5 py-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 font-mono text-xs font-bold text-emerald-300">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-mono text-sm font-semibold text-white truncate">
                              {isCap && <Crown className="h-3.5 w-3.5 shrink-0 text-amber-400" />}
                              <span className="truncate">{m.username}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {m.department} {m.roll_number ? `• ${m.roll_number}` : ''}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="rounded bg-white/[0.05] px-2 py-0.5 font-mono text-xs text-emerald-300">
                            {m.solve_count}
                          </span>
                          {user?.id === detail.team.captain_id && m.id !== user.id && (
                            confirmKickId === m.id ? (
                              <button
                                type="button"
                                onClick={() => handleKick(m.id)}
                                className="rounded bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white"
                              >
                                Kick?
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmKickId(m.id)}
                                title="Remove teammate"
                                className="rounded p-1 text-slate-500 hover:bg-rose-500/15 hover:text-rose-400"
                              >
                                <UserMinus className="h-3.5 w-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Squad Solve Log */}
              <div>
                <h3 className="mb-3 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Captured Flags ({detail.solves.length})
                </h3>
                {detail.solves.length === 0 ? (
                  <div className="rounded-xl border border-white/[0.06] bg-[#06090f] p-6 text-center text-xs text-slate-500">
                    No flags captured yet. Launch Challenges to claim your first capture!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {detail.solves.map((s) => (
                      <div
                        key={s.challenge_id}
                        className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-[#06090f] px-3.5 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          {s.is_first_blood === 1 && <Flame className="h-3.5 w-3.5 text-amber-400" />}
                          <span className="font-semibold text-slate-200">{s.title}</span>
                          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                            {s.category}
                          </span>
                        </div>
                        <div className="font-mono text-slate-400">
                          by <span className="text-cyan-300">{s.solved_by}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.1] bg-[#0a0f18]/50 p-8 text-center">
              <Shield className="mb-3 h-10 w-10 text-slate-600" />
              <p className="text-sm font-medium text-slate-300">Select any squad to inspect roster and category stats</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
