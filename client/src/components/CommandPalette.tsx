import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Search, Trophy, Users, Wrench, X } from 'lucide-react';
import type { Challenge } from '../types';
import { CATEGORY_META, CategoryIcon } from './CategoryBadge';
import type { NavTab } from './Navbar';

interface Props {
  challenges: Challenge[];
  onSelectChallenge: (id: number) => void;
  onNavigate: (tab: NavTab) => void;
  onOpenToolkit: () => void;
  onClose: () => void;
}

export function CommandPalette({ challenges, onSelectChallenge, onNavigate, onOpenToolkit, onClose }: Props) {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const matches = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return challenges.slice(0, 8);
    return challenges
      .filter((c) => `${c.title} ${c.category} ${c.tags.join(' ')}`.toLowerCase().includes(query))
      .slice(0, 8);
  }, [challenges, q]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 pt-20 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick Jump Command Palette"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0b1019] shadow-2xl animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3.5">
          <Search className="h-4 w-4 text-emerald-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Jump to challenge, category (crypto, stego, osint, pwn), or view..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">Quick Actions</div>
          <div className="grid grid-cols-3 gap-1.5 px-2 pb-2">
            <button
              type="button"
              onClick={() => {
                onNavigate('scoreboard');
                onClose();
              }}
              className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-[#070a0f] px-3 py-2 text-xs text-slate-300 hover:border-emerald-500/40 hover:text-white"
            >
              <Trophy className="h-3.5 w-3.5 text-amber-400" /> Scoreboard
            </button>
            <button
              type="button"
              onClick={() => {
                onNavigate('teams');
                onClose();
              }}
              className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-[#070a0f] px-3 py-2 text-xs text-slate-300 hover:border-emerald-500/40 hover:text-white"
            >
              <Users className="h-3.5 w-3.5 text-cyan-400" /> Squad Hub
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenToolkit();
                onClose();
              }}
              className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-[#070a0f] px-3 py-2 text-xs text-slate-300 hover:border-cyan-500/40 hover:text-white"
            >
              <Wrench className="h-3.5 w-3.5 text-emerald-400" /> Decoder Tool
            </button>
          </div>

          <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">
            Challenges ({matches.length})
          </div>
          {matches.map((c) => {
            const meta = CATEGORY_META[c.category] || CATEGORY_META.Misc;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onSelectChallenge(c.id);
                  onClose();
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.05]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`rounded-lg border p-1.5 ${meta.bg} ${meta.border} ${meta.color}`}>
                    <CategoryIcon category={c.category} className="h-3.5 w-3.5" />
                  </span>
                  <div className="truncate">
                    <div className="text-sm font-medium text-white truncate">{c.title}</div>
                    <div className="text-[11px] font-mono text-slate-400">
                      {c.category} &middot; {c.difficulty} &middot; {c.points} pts
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
