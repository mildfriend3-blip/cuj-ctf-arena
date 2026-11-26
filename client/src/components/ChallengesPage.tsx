import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Flame,
  LayoutGrid,
  Layers,
  List,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import type { Challenge, Team, User } from '../types';
import { CATEGORY_META, CategoryIcon, DifficultyBadge } from './CategoryBadge';

const CATEGORIES = ['All', 'Crypto', 'Stego', 'OSINT', 'Web', 'Rev', 'Pwn', 'Forensics', 'Misc'];

interface Props {
  challenges: Challenge[];
  user: User | null;
  myTeam: Team | null;
  catFilter: string;
  setCatFilter: (c: string) => void;
  onSelectChallenge: (id: number) => void;
}

export function ChallengesPage({
  challenges,
  user,
  myTeam,
  catFilter,
  setCatFilter,
  onSelectChallenge,
}: Props) {
  const [diffFilter, setDiffFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unsolved' | 'solved' | 'live'>('all');
  const [sortMode, setSortMode] = useState<'order' | 'pts_desc' | 'pts_asc' | 'solves_desc'>('order');
  const [viewMode, setViewMode] = useState<'grid' | 'tracks' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  const solvedCount = useMemo(() => challenges.filter((c) => c.solvedByTeam).length, [challenges]);

  const filtered = useMemo(() => {
    const list = challenges.filter((c) => {
      if (catFilter !== 'All' && c.category !== catFilter) return false;
      if (diffFilter !== 'All' && c.difficulty !== diffFilter) return false;
      if (statusFilter === 'unsolved' && c.solvedByTeam) return false;
      if (statusFilter === 'solved' && !c.solvedByTeam) return false;
      if (statusFilter === 'live' && c.labType === 'none') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${c.title} ${c.category} ${c.tags.join(' ')} ${c.author}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortMode === 'pts_desc') return [...list].sort((a, b) => b.points - a.points);
    if (sortMode === 'pts_asc') return [...list].sort((a, b) => a.points - b.points);
    if (sortMode === 'solves_desc') return [...list].sort((a, b) => b.solveCount - a.solveCount);
    return list;
  }, [challenges, catFilter, diffFilter, statusFilter, searchQuery, sortMode]);

  const groupedByCategory = useMemo(() => {
    const groups = new Map<string, Challenge[]>();
    for (const c of filtered) {
      const arr = groups.get(c.category) || [];
      arr.push(c);
      groups.set(c.category, arr);
    }
    return Array.from(groups.entries());
  }, [filtered]);

  function renderCard(ch: Challenge) {
    const meta = CATEGORY_META[ch.category] || CATEGORY_META.Misc;
    return (
      <button
        key={ch.id}
        type="button"
        onClick={() => onSelectChallenge(ch.id)}
        className={`card-hover group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-5 text-left ${
          ch.solvedByTeam
            ? 'border-emerald-500/45 bg-gradient-to-b from-emerald-950/30 to-[#080d14]'
            : 'border-white/[0.08] bg-[#0a0f18]/90 hover:border-white/20'
        }`}
      >
        <div
          className="absolute inset-x-0 top-0 h-[2px] opacity-85"
          style={{ backgroundColor: ch.solvedByTeam ? '#10b981' : meta.accentHex }}
        />

        <div>
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${meta.bg} ${meta.border} ${meta.color}`}
            >
              <CategoryIcon category={ch.category} className="h-3 w-3" />
              {ch.category}
            </span>
            <div className="flex items-center gap-1.5">
              {ch.labType !== 'none' && (
                <span className="inline-flex items-center gap-1 rounded border border-cyan-500/35 bg-cyan-500/12 px-1.5 py-0.5 font-mono text-[10px] uppercase text-cyan-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  {ch.labType}
                </span>
              )}
              <DifficultyBadge difficulty={ch.difficulty} />
            </div>
          </div>

          <h3 className="mt-3.5 flex items-center gap-2 text-lg font-bold text-white transition group-hover:text-emerald-300">
            <span className="truncate">{ch.title}</span>
            {ch.solvedByTeam && <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-400" />}
          </h3>

          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-400">
            {ch.description.replace(/[*`]/g, '')}
          </p>

          {ch.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {ch.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-slate-400"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 flex items-end justify-between border-t border-white/[0.06] pt-3">
          <div className="text-xs text-slate-400">
            <span className="font-mono font-semibold text-slate-200">{ch.solveCount}</span>{' '}
            {ch.solveCount === 1 ? 'solve' : 'solves'}
            {ch.firstBloodTeam ? (
              <div className="mt-0.5 flex items-center gap-1 text-[11px] text-amber-300/90">
                <Flame className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[140px]">{ch.firstBloodTeam}</span>
              </div>
            ) : (
              <div className="mt-0.5 font-mono text-[11px] text-amber-400/90">
                First Blood +{ch.firstBloodBonus}
              </div>
            )}
          </div>
          <div className="text-right font-mono">
            <div className="text-2xl font-bold text-emerald-400 tabular-nums leading-none">{ch.points}</div>
            <div className="mt-1 text-[10px] tracking-wider text-slate-500">PTS</div>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Challenge Matrix</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Showing <span className="font-mono text-slate-200">{filtered.length}</span> of {challenges.length} challenges
            &middot; Dynamic decay rewards early &amp; rare captures
          </p>
        </div>

        <div className="flex items-center gap-3">
          {user && myTeam && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-mono text-emerald-300">
              Squad Progress: {solvedCount}/{challenges.length}
            </div>
          )}
          <div className="flex rounded-xl border border-white/[0.08] bg-[#0a0f18] p-1">
            {[
              { id: 'grid', icon: <LayoutGrid className="h-3.5 w-3.5" />, label: 'Cards' },
              { id: 'tracks', icon: <Layers className="h-3.5 w-3.5" />, label: 'Tracks' },
              { id: 'table', icon: <List className="h-3.5 w-3.5" />, label: 'Matrix' },
            ].map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setViewMode(v.id as typeof viewMode)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  viewMode === v.id ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                {v.icon}
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter & Sort Dock */}
      <div className="glass-panel rounded-2xl border border-white/[0.07] p-4 space-y-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search challenges, tags (rsa, lsb, sqli, bof), or authors..."
              className="w-full rounded-xl border border-white/[0.08] bg-[#06090f] pl-10 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-slate-500 hidden sm:block" />
            <select
              value={diffFilter}
              onChange={(e) => setDiffFilter(e.target.value)}
              className="rounded-xl border border-white/[0.08] bg-[#06090f] px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
            >
              <option value="All">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="rounded-xl border border-white/[0.08] bg-[#06090f] px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="unsolved">Unsolved Only</option>
              <option value="solved">Solved Only</option>
              <option value="live">Live Interactive Labs</option>
            </select>

            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
              className="rounded-xl border border-white/[0.08] bg-[#06090f] px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
            >
              <option value="order">Sort: Default Track</option>
              <option value="pts_desc">Sort: Highest Points</option>
              <option value="pts_asc">Sort: Lowest Points</option>
              <option value="solves_desc">Sort: Most Solved</option>
            </select>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => {
            const active = catFilter === cat;
            const list = cat === 'All' ? challenges : challenges.filter((c) => c.category === cat);
            const catSolved = list.filter((c) => c.solvedByTeam).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCatFilter(cat)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'border border-emerald-500/45 bg-emerald-500/18 text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.12)]'
                    : 'border border-white/[0.06] bg-[#06090f] text-slate-400 hover:border-white/15 hover:text-white'
                }`}
              >
                {cat !== 'All' && <CategoryIcon category={cat} className="h-3.5 w-3.5" />}
                <span>{cat}</span>
                <span className="font-mono text-[10px] opacity-75">
                  {user && myTeam ? `${catSolved}/${list.length}` : list.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Modes */}
      {filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl border border-white/[0.07] p-12 text-center text-sm text-slate-400">
          No challenges match your current filters.
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map(renderCard)}</div>
      ) : viewMode === 'tracks' ? (
        <div className="space-y-8">
          {groupedByCategory.map(([cat, list]) => {
            const meta = CATEGORY_META[cat] || CATEGORY_META.Misc;
            return (
              <section key={cat} className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.07] pb-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`rounded-lg border p-1.5 ${meta.bg} ${meta.border} ${meta.color}`}>
                      <CategoryIcon category={cat} className="h-4 w-4" />
                    </span>
                    <h2 className="text-lg font-bold text-white">{meta.label}</h2>
                    <span className="font-mono text-xs text-slate-500">({list.length})</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{list.map(renderCard)}</div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="glass-panel overflow-x-auto rounded-2xl border border-white/[0.07]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/[0.07] bg-[#06090f] text-[11px] font-mono uppercase text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Challenge</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Difficulty</th>
                <th className="px-5 py-3.5">First Blood</th>
                <th className="px-5 py-3.5 text-center">Solves</th>
                <th className="px-5 py-3.5 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filtered.map((ch) => (
                <tr
                  key={ch.id}
                  onClick={() => onSelectChallenge(ch.id)}
                  className="cursor-pointer transition hover:bg-white/[0.03]"
                >
                  <td className="px-5 py-3.5">
                    {ch.solvedByTeam ? (
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" /> SOLVED
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-slate-500">OPEN</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-white">{ch.title}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-300">{ch.category}</td>
                  <td className="px-5 py-3.5">
                    <DifficultyBadge difficulty={ch.difficulty} />
                  </td>
                  <td className="px-5 py-3.5 text-xs text-amber-300">
                    {ch.firstBloodTeam || <span className="text-slate-500">Unclaimed (+{ch.firstBloodBonus})</span>}
                  </td>
                  <td className="px-5 py-3.5 text-center font-mono text-xs text-slate-300">{ch.solveCount}</td>
                  <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-400 tabular-nums">
                    {ch.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
