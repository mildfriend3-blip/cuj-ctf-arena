import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Crown,
  Flame,
  Megaphone,
  Sparkles,
  Target,
  Terminal,
  Trophy,
  Users,
} from 'lucide-react';
import type { Challenge, CompetitionOverview, Team, TeamStanding, User } from '../types';
import { CATEGORY_META, CategoryIcon } from './CategoryBadge';
import type { NavTab } from './Navbar';

interface Props {
  overview: CompetitionOverview;
  challenges: Challenge[];
  user: User | null;
  myTeam: Team | null;
  myStanding: TeamStanding | null;
  countdownParts: { hrs: string; mins: string; secs: string };
  maxTeamSize: number;
  onNavigate: (tab: NavTab) => void;
  onFilterCategory: (cat: string) => void;
  onSelectChallenge: (id: number) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export function OverviewPage({
  overview,
  challenges,
  user,
  myTeam,
  myStanding,
  countdownParts,
  maxTeamSize,
  onNavigate,
  onFilterCategory,
  onSelectChallenge,
  onOpenAuth,
}: Props) {
  const solvedCount = challenges.filter((c) => c.solvedByTeam).length;
  const pct = challenges.length > 0 ? Math.round((solvedCount / challenges.length) * 100) : 0;
  const nextUnsolved = challenges.find((c) => !c.solvedByTeam) || challenges[0];

  const radius = 34;
  const circ = 2 * Math.PI * radius;
  const dashOffset = circ - (pct / 100) * circ;

  return (
    <div className="space-y-6">
      {/* Asymmetric Hero Command Banner */}
      <section className="glass-panel relative overflow-hidden rounded-3xl border border-white/[0.08] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative z-10 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
          {/* Left Hero Story & Countdown */}
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-1 text-[11px] font-mono uppercase tracking-wider text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              Central University of Jammu &bull; Rahya-Suchani Campus
            </div>

            <div className="space-y-2.5">
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
                {overview.settings.competition_name || 'CUJ CyberOps CTF 2026'}
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Team up across CS&amp;IT, CSE, M.Tech Cyber, MCA, and ECE to breach live Web targets, crack cryptography,
                analyze packet captures, reverse VM bytecode, and capture First Blood trophies.
              </p>
            </div>

            {/* Segmented Countdown Clock */}
            <div className="flex flex-wrap items-center gap-3">
              {[
                { val: countdownParts.hrs, label: 'HOURS' },
                { val: countdownParts.mins, label: 'MINS' },
                { val: countdownParts.secs, label: 'SECS' },
              ].map((blk) => (
                <div
                  key={blk.label}
                  className="flex min-w-[74px] flex-col items-center rounded-2xl border border-white/[0.08] bg-[#06090f]/90 px-3.5 py-2.5"
                >
                  <span className="font-mono text-2xl font-bold text-cyan-300 tabular-nums">{blk.val}</span>
                  <span className="text-[9px] font-mono tracking-widest text-slate-500">{blk.label}</span>
                </div>
              ))}
              <div className="h-10 w-px bg-white/[0.08] hidden sm:block mx-1" />
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => onNavigate('challenges')}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-[0_0_24px_rgba(16,185,129,0.28)] transition hover:bg-emerald-400"
                >
                  <Terminal className="h-4 w-4" />
                  Enter Arena
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('teams')}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:border-cyan-400/50 hover:bg-white/[0.07]"
                >
                  <Users className="h-4 w-4 text-cyan-400" />
                  {myTeam ? myTeam.name : 'Create / Join Squad'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Tactical Pulse Card */}
          <div className="lg:col-span-5">
            {user && myStanding ? (
              <div className="rounded-2xl border border-emerald-500/25 bg-[#070b12]/95 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">Active Squad Status</div>
                    <div className="mt-0.5 text-lg font-bold text-white flex items-center gap-2">
                      {myStanding.name}
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                        {myStanding.tag}
                      </span>
                    </div>
                  </div>
                  <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                    <circle
                      cx="40"
                      cy="40"
                      r={radius}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={circ}
                      strokeDashoffset={dashOffset}
                    />
                    <text
                      x="40"
                      y="44"
                      textAnchor="middle"
                      transform="rotate(90 40 40)"
                      className="fill-white text-xs font-mono font-bold"
                    >
                      {pct}%
                    </text>
                  </svg>
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-xl border border-white/[0.06] bg-[#0b1019] p-3 text-center font-mono">
                  <div>
                    <div className="text-lg font-bold text-amber-400 tabular-nums">#{myStanding.rank}</div>
                    <div className="text-[10px] text-slate-500">RANK</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-emerald-400 tabular-nums">{myStanding.score}</div>
                    <div className="text-[10px] text-slate-500">POINTS</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-cyan-300 tabular-nums">
                      {solvedCount}/{challenges.length}
                    </div>
                    <div className="text-[10px] text-slate-500">SOLVED</div>
                  </div>
                </div>

                {nextUnsolved && (
                  <button
                    type="button"
                    onClick={() => onSelectChallenge(nextUnsolved.id)}
                    className="flex w-full items-center justify-between rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-2.5 text-left transition hover:bg-cyan-500/20"
                  >
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                        <Target className="h-3 w-3" /> Next Recommended Target
                      </div>
                      <div className="truncate text-sm font-semibold text-white">
                        {nextUnsolved.title} ({nextUnsolved.category} &middot; {nextUnsolved.points} pts)
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-cyan-300" />
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/[0.08] bg-[#070b12]/95 p-5 space-y-4">
                {overview.stats.leader && (
                  <div className="flex items-center justify-between rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-amber-400">
                        <Crown className="h-3.5 w-3.5" /> Arena Leader #1
                      </div>
                      <div className="mt-0.5 text-base font-bold text-white">{overview.stats.leader.name}</div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-xl font-bold text-emerald-400 tabular-nums">{overview.stats.leader.score}</div>
                      <div className="text-[10px] text-slate-400">{overview.stats.leader.solveCount} solves</div>
                    </div>
                  </div>
                )}

                <div className="space-y-2.5 text-xs">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">How to Compete</div>
                  {[
                    { num: '01', text: 'Sign in with a student demo account or register your CUJ handle.' },
                    { num: '02', text: `Form a squad or join teammates via invite code (up to ${maxTeamSize} players).` },
                    { num: '03', text: 'Capture flags CUJCTF{...} across 8 tracks & claim First Blood bonuses.' },
                  ].map((step) => (
                    <div key={step.num} className="flex items-start gap-2.5 text-slate-300">
                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                        {step.num}
                      </span>
                      <span>{step.text}</span>
                    </div>
                  ))}
                </div>

                {!user && (
                  <button
                    type="button"
                    onClick={() => onOpenAuth('login')}
                    className="w-full rounded-xl border border-emerald-500/35 bg-emerald-500/15 py-2.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/25"
                  >
                    Sign In / Quick Demo Access
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Telemetry KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Challenges', val: overview.stats.totalChallenges, sub: '8 Real CTF Tracks', accent: 'text-emerald-400' },
          { label: 'Active Squads', val: overview.stats.totalTeams, sub: `Max ${maxTeamSize} members/squad`, accent: 'text-cyan-400' },
          { label: 'CUJ Hackers', val: overview.stats.totalPlayers, sub: 'Registered Students', accent: 'text-amber-400' },
          { label: 'Flag Captures', val: overview.stats.totalSolves, sub: 'Dynamic Scoring Live', accent: 'text-fuchsia-400' },
        ].map((k) => (
          <div key={k.label} className="glass-panel rounded-2xl border border-white/[0.07] px-5 py-4">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">{k.label}</div>
            <div className={`mt-1 font-mono text-3xl font-bold tabular-nums ${k.accent}`}>{k.val}</div>
            <div className="mt-0.5 text-xs text-slate-500">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* 8 Discipline Track Matrix */}
      <div className="glass-panel rounded-2xl border border-white/[0.07] p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-white">Security Disciplines &amp; Tracks</h2>
            <p className="text-xs text-slate-400">Select a discipline to filter challenges in the Mission Matrix</p>
          </div>
          <button
            type="button"
            onClick={() => {
              onFilterCategory('All');
              onNavigate('challenges');
            }}
            className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 hover:text-emerald-300"
          >
            View All Tracks <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {overview.categories.map((cat) => {
            const meta = CATEGORY_META[cat.category] || CATEGORY_META.Misc;
            const trackChals = challenges.filter((c) => c.category === cat.category);
            const trackSolved = trackChals.filter((c) => c.solvedByTeam).length;
            const trackPts = trackChals.reduce((acc, c) => acc + c.points, 0);
            const trackPct = trackChals.length > 0 ? Math.round((trackSolved / trackChals.length) * 100) : 0;

            return (
              <button
                key={cat.category}
                type="button"
                onClick={() => {
                  onFilterCategory(cat.category);
                  onNavigate('challenges');
                }}
                className="card-hover group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#080c14] p-4 text-left"
              >
                <div
                  className="absolute inset-x-0 top-0 h-[2px] opacity-80"
                  style={{ backgroundColor: meta.accentHex }}
                />
                <div className="flex items-center justify-between">
                  <span className={`rounded-xl border p-2 ${meta.bg} ${meta.border} ${meta.color}`}>
                    <CategoryIcon category={cat.category} className="h-4 w-4" />
                  </span>
                  <div className="text-right font-mono">
                    <div className="text-xs font-bold text-white tabular-nums">{trackPts} pts</div>
                    <div className="text-[10px] text-slate-500">{cat.count} challenges</div>
                  </div>
                </div>
                <div className="mt-3 text-sm font-bold text-white group-hover:text-emerald-300">{meta.label}</div>
                <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>{user && myTeam ? `${trackSolved}/${cat.count} solved` : `${cat.category} Track`}</span>
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100 group-hover:translate-x-0.5" />
                </div>
                {user && myTeam && (
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${trackPct}%`, backgroundColor: meta.accentHex }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Capture Stream & Organizer Broadcasts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 glass-panel rounded-2xl border border-white/[0.07] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-white">
              <Activity className="h-4 w-4 text-emerald-400" />
              Live Capture Stream
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('scoreboard')}
              className="inline-flex items-center gap-1 text-xs font-mono text-cyan-400 hover:text-cyan-300"
            >
              <Trophy className="h-3.5 w-3.5" /> Full Standings
            </button>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {overview.recentSolves.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-[#070a10] px-3.5 py-2.5 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {s.is_first_blood === 1 ? (
                    <Flame className="h-4 w-4 shrink-0 text-amber-400" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  )}
                  <div className="truncate">
                    <span className="font-semibold text-white">{s.team_name}</span>{' '}
                    <span className="text-slate-400">captured</span>{' '}
                    <span className="font-medium text-emerald-300">{s.challenge_title}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.is_first_blood === 1 && (
                    <span className="rounded-md border border-amber-500/35 bg-amber-500/12 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-300">
                      1ST BLOOD +{s.bonus_points}
                    </span>
                  )}
                  <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                    {new Date(s.solved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 glass-panel rounded-2xl border border-white/[0.07] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-white">
            <Megaphone className="h-4 w-4 text-cyan-400" />
            Organizer Broadcasts
          </h2>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {overview.announcements.map((a) => (
              <div
                key={a.id}
                className={`rounded-xl border p-3.5 text-xs ${
                  a.severity === 'first_blood'
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : a.severity === 'critical'
                    ? 'border-rose-500/40 bg-rose-500/10'
                    : 'border-white/[0.06] bg-[#070a10]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 font-semibold text-white">
                  <span>{a.title}</span>
                  <span className="shrink-0 font-mono text-[10px] text-slate-500">
                    {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="mt-1 leading-relaxed text-slate-300">{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
