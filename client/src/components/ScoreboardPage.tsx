import { useState } from 'react';
import { Award, Crown, Flame, Medal, Trophy } from 'lucide-react';
import type { Team, TeamStanding, TimelineSeries, TopPlayer } from '../types';
import { CATEGORY_META } from './CategoryBadge';
import { ScoreChart } from './ScoreChart';

interface Props {
  standings: TeamStanding[];
  timeline: TimelineSeries[];
  topPlayers: TopPlayer[];
  myTeam: Team | null;
  isFrozen: boolean;
  onInspectTeam: (teamId: number) => void;
}

export function ScoreboardPage({
  standings,
  timeline,
  topPlayers,
  myTeam,
  isFrozen,
  onInspectTeam,
}: Props) {
  const [mode, setMode] = useState<'teams' | 'players'>('teams');

  const top3 = standings.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Live Scoreboard</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Real-time CUJ squad standings with dynamic decay &amp; First Blood tie-breaking
          </p>
        </div>

        <div className="flex rounded-xl border border-white/[0.08] bg-[#0a0f18] p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => setMode('teams')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition ${
              mode === 'teams' ? 'bg-emerald-500/18 text-emerald-300 border border-emerald-500/35' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="h-3.5 w-3.5" /> Team Standings
          </button>
          <button
            type="button"
            onClick={() => setMode('players')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition ${
              mode === 'players' ? 'bg-emerald-500/18 text-emerald-300 border border-emerald-500/35' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award className="h-3.5 w-3.5" /> Individual MVPs
          </button>
        </div>
      </div>

      {isFrozen && (
        <div className="rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-xs font-mono text-cyan-200">
          SCOREBOARD FROZEN — Final-hour captures are recorded securely and will unlock at closing ceremony.
        </div>
      )}

      {/* Championship Top 3 Podium */}
      {top3.length > 0 && mode === 'teams' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {top3.map((team) => {
            const isFirst = team.rank === 1;
            const isSecond = team.rank === 2;
            const ringStyle = isFirst
              ? 'border-amber-400/45 bg-gradient-to-b from-amber-500/12 via-[#0d131e] to-[#080c14] shadow-[0_0_32px_rgba(245,158,11,0.12)]'
              : isSecond
              ? 'border-slate-400/35 bg-gradient-to-b from-slate-400/10 via-[#0c121c] to-[#080c14]'
              : 'border-amber-700/40 bg-gradient-to-b from-amber-700/10 via-[#0c121c] to-[#080c14]';

            const topCat = Object.entries(team.categoryScores).sort((a, b) => b[1] - a[1])[0];

            return (
              <button
                key={team.id}
                type="button"
                onClick={() => onInspectTeam(team.id)}
                className={`card-hover rounded-2xl border p-5 text-left ${ringStyle}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-xs font-bold">
                    {isFirst ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-0.5 text-amber-300">
                        <Crown className="h-3.5 w-3.5" /> #1 CHAMPION
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-slate-300">
                        <Medal className="h-3.5 w-3.5" /> #{team.rank} PLACE
                      </span>
                    )}
                  </div>
                  <span className="rounded bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] text-slate-300">
                    [{team.tag}]
                  </span>
                </div>

                <div className="mt-3 text-xl font-bold text-white truncate">{team.name}</div>
                <div className="text-xs text-slate-400">
                  {team.department} &middot; {team.memberCount} members
                </div>

                <div className="mt-4 flex items-end justify-between border-t border-white/[0.07] pt-3">
                  <div className="space-y-1 text-xs">
                    <div className="font-mono text-slate-300">
                      {team.solveCount} solves &middot;{' '}
                      <span className="text-amber-300">{team.firstBloods} 1st bloods</span>
                    </div>
                    {topCat && (
                      <div className="text-[11px] text-slate-400">
                        Strongest:{' '}
                        <span style={{ color: CATEGORY_META[topCat[0]]?.accentHex || '#10b981' }} className="font-semibold">
                          {topCat[0]}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-2xl font-bold text-emerald-400 tabular-nums">{team.score}</div>
                    <div className="text-[10px] text-slate-500">PTS</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Progression Chart */}
      <ScoreChart timeline={timeline} />

      {/* Standings Table */}
      {mode === 'teams' ? (
        <div className="glass-panel overflow-x-auto rounded-2xl border border-white/[0.07]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/[0.07] bg-[#06090f] text-[11px] font-mono uppercase text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Rank</th>
                <th className="px-5 py-3.5">Squad</th>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5">Category Strengths</th>
                <th className="px-5 py-3.5 text-center">Solves</th>
                <th className="px-5 py-3.5 text-center">1st Blood</th>
                <th className="px-5 py-3.5 text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {standings.map((t) => {
                const isMine = myTeam?.id === t.id;
                const cats = Object.entries(t.categoryScores).sort((a, b) => b[1] - a[1]).slice(0, 3);
                return (
                  <tr
                    key={t.id}
                    onClick={() => onInspectTeam(t.id)}
                    className={`cursor-pointer transition ${
                      isMine ? 'bg-emerald-500/10 hover:bg-emerald-500/15' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <td className="px-5 py-3.5 font-mono font-bold">
                      {t.rank === 1 ? (
                        <span className="inline-flex items-center gap-1 text-amber-400">
                          <Crown className="h-4 w-4" /> 1
                        </span>
                      ) : t.rank === 2 ? (
                        <span className="text-slate-200">#2</span>
                      ) : t.rank === 3 ? (
                        <span className="text-amber-600">#3</span>
                      ) : (
                        <span className="text-slate-400">#{t.rank}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 font-semibold text-white">
                        {t.name}
                        <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                          {t.tag}
                        </span>
                        {isMine && (
                          <span className="rounded border border-emerald-500/40 bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300">
                            YOU
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400">
                      {t.department} &middot; {t.memberCount}m
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {cats.map(([cat]) => {
                          const m = CATEGORY_META[cat];
                          return (
                            <span
                              key={cat}
                              className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${m ? `${m.bg} ${m.color}` : 'bg-slate-800 text-slate-300'}`}
                            >
                              {cat}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono text-xs text-cyan-300">{t.solveCount}</td>
                    <td className="px-5 py-3.5 text-center font-mono text-xs text-amber-300">
                      {t.firstBloods > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Flame className="h-3.5 w-3.5" /> {t.firstBloods}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-base font-bold text-emerald-400 tabular-nums">
                      {t.score}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass-panel overflow-x-auto rounded-2xl border border-white/[0.07]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/[0.07] bg-[#06090f] text-[11px] font-mono uppercase text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Rank</th>
                <th className="px-5 py-3.5">Student Handle</th>
                <th className="px-5 py-3.5">Squad</th>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5 text-center">Captures</th>
                <th className="px-5 py-3.5 text-right">Points Contributed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {topPlayers.map((p) => (
                <tr key={p.userId} className="hover:bg-white/[0.03]">
                  <td className="px-5 py-3.5 font-mono text-slate-300">#{p.rank}</td>
                  <td className="px-5 py-3.5 font-mono font-semibold text-white flex items-center gap-2">
                    <Award className="h-4 w-4 text-cyan-400" />
                    {p.username}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-300">
                    {p.teamName} {p.teamTag && <span className="font-mono text-slate-500">[{p.teamTag}]</span>}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-400">{p.department}</td>
                  <td className="px-5 py-3.5 text-center font-mono text-xs text-cyan-300">{p.solves}</td>
                  <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-400 tabular-nums">
                    {p.points}
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
