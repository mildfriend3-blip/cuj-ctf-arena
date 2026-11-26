import React from 'react';
import {
  BookOpen,
  Clock,
  Command,
  Flag,
  LayoutDashboard,
  LogIn,
  LogOut,
  Radio,
  Shield,
  ShieldAlert,
  Trophy,
  UserCheck,
  Users,
  Wrench,
} from 'lucide-react';
import type { Team, TeamStanding, User } from '../types';

export type NavTab = 'overview' | 'challenges' | 'scoreboard' | 'teams' | 'rules' | 'admin';

interface Props {
  tab: NavTab;
  setTab: (tab: NavTab) => void;
  user: User | null;
  myTeam: Team | null;
  myStanding: TeamStanding | null;
  solvedCount: number;
  totalChallenges: number;
  compName: string;
  compStatus: string;
  isFrozen: boolean;
  countdown: string;
  sseConnected: boolean;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onLogout: () => void;
  onOpenPalette: () => void;
  onOpenToolkit: () => void;
}

export function Navbar({
  tab,
  setTab,
  user,
  myTeam,
  myStanding,
  solvedCount,
  totalChallenges,
  compName,
  compStatus,
  isFrozen,
  countdown,
  sseConnected,
  onOpenAuth,
  onLogout,
  onOpenPalette,
  onOpenToolkit,
}: Props) {
  const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode; badge?: string }> = [
    { id: 'overview', label: 'Arena Overview', icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
    {
      id: 'challenges',
      label: 'Challenges',
      icon: <Flag className="h-3.5 w-3.5" />,
      badge: user && myTeam ? `${solvedCount}/${totalChallenges}` : String(totalChallenges),
    },
    { id: 'scoreboard', label: 'Scoreboard', icon: <Trophy className="h-3.5 w-3.5" /> },
    { id: 'teams', label: 'Squads', icon: <Users className="h-3.5 w-3.5" />, badge: myTeam ? myTeam.tag : undefined },
    { id: 'rules', label: 'Labs & Rules', icon: <BookOpen className="h-3.5 w-3.5" /> },
  ];
  if (user?.role === 'admin') {
    navItems.push({ id: 'admin', label: 'Admin Console', icon: <ShieldAlert className="h-3.5 w-3.5 text-amber-400" /> });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#06090f]/90 backdrop-blur-xl">
      {/* Tier 1: Identity, Live Telemetry & Account Actions */}
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <button
          type="button"
          onClick={() => setTab('overview')}
          className="flex items-center gap-3 text-left group shrink-0"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/40 bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 text-emerald-300 shadow-[0_0_24px_rgba(16,185,129,0.2)] transition group-hover:border-emerald-400">
            <Shield className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="font-display text-sm font-bold tracking-tight text-white leading-tight sm:text-base">
              {compName || 'CUJ CyberOps CTF 2026'}
            </div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Central University of Jammu &middot; Rahya-Suchani
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenPalette}
            title="Quick Jump (/ or Ctrl+K)"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#0a0f18] px-2.5 py-1.5 text-xs text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
          >
            <Command className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Jump</span>
            <kbd className="rounded bg-slate-800 px-1 py-0.5 font-mono text-[10px] text-slate-400">/</kbd>
          </button>

          <button
            type="button"
            onClick={onOpenToolkit}
            title="Built-in CTF Decoder Toolkit"
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-medium text-cyan-300 transition hover:bg-cyan-500/20"
          >
            <Wrench className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Toolkit</span>
          </button>

          <div className="hidden md:flex items-center gap-2 rounded-xl border border-white/[0.07] bg-[#0a0f18] px-3 py-1.5 text-[11px] font-mono">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                compStatus === 'live'
                  ? 'bg-emerald-400 animate-pulse'
                  : compStatus === 'paused'
                  ? 'bg-amber-400'
                  : 'bg-slate-500'
              }`}
            />
            <span className="uppercase text-slate-300">{isFrozen ? 'FROZEN' : compStatus}</span>
            <Clock className="h-3 w-3 text-cyan-400 ml-0.5" />
            <span className="text-cyan-300 tabular-nums">{countdown}</span>
            <Radio className={`h-3 w-3 ml-0.5 ${sseConnected ? 'text-emerald-400' : 'text-slate-600'}`} />
          </div>

          {user ? (
            <div className="flex items-center gap-1.5">
              {myStanding && (
                <button
                  type="button"
                  onClick={() => setTab('teams')}
                  className="hidden sm:flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/12 px-2.5 py-1.5 text-xs font-mono hover:bg-emerald-500/20"
                >
                  <span className="font-bold text-emerald-300">#{myStanding.rank}</span>
                  <span className="text-slate-300">{myStanding.tag}</span>
                  <span className="text-emerald-400 tabular-nums">{myStanding.score}</span>
                </button>
              )}
              {!myTeam && user.role !== 'admin' && (
                <button
                  type="button"
                  onClick={() => setTab('teams')}
                  className="hidden sm:inline-flex items-center rounded-xl border border-amber-500/40 bg-amber-500/15 px-2.5 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/25"
                >
                  + Join Squad
                </button>
              )}
              <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#0a0f18] px-2.5 py-1.5 text-xs">
                <UserCheck className="h-3.5 w-3.5 text-cyan-400" />
                <span className="font-mono font-medium text-white max-w-[110px] truncate">{user.username}</span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                title="Sign out"
                className="rounded-xl border border-white/[0.08] bg-[#0a0f18] p-1.5 text-slate-400 transition hover:border-rose-500/40 hover:text-rose-300"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-[#0a0f18] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500"
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign In
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="inline-flex items-center rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tier 2: Full-Width Crisp Navigation Tabs */}
      <div className="border-t border-white/[0.05] bg-[#05080e]/70">
        <nav className="mx-auto flex max-w-[1400px] items-center gap-1 overflow-x-auto px-4 sm:px-6">
          {navItems.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`relative flex items-center gap-2 whitespace-nowrap px-3.5 py-2.5 text-xs font-medium transition ${
                  active ? 'text-emerald-300' : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] ${
                      active ? 'bg-emerald-500/20 text-emerald-200' : 'bg-white/[0.06] text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {active && (
                  <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.7)]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
