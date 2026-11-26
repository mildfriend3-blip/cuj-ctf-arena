import { useState } from 'react';
import type { TimelineSeries } from '../types';

const PALETTE = ['#10b981', '#38bdf8', '#f59e0b', '#f43f5e', '#a855f7', '#facc15', '#ec4899', '#84cc16'];

export function ScoreChart({ timeline }: { timeline: TimelineSeries[] }) {
  const [hoveredTeamId, setHoveredTeamId] = useState<number | null>(null);

  const activeSeries = timeline.filter((t) => t.points.length > 0);
  if (activeSeries.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-slate-800 bg-[#0b1019] text-sm text-slate-500">
        No solves recorded yet to plot score progression.
      </div>
    );
  }

  const allTimes = activeSeries.flatMap((s) => s.points.map((p) => new Date(p.time).getTime()));
  const minT = Math.min(...allTimes);
  const maxT = Math.max(...allTimes, minT + 60_000);
  const maxScore = Math.max(...activeSeries.map((s) => s.finalScore), 500);
  const yCeiling = Math.ceil(maxScore / 200) * 200;

  const width = 820;
  const height = 270;
  const pad = { top: 20, right: 24, bottom: 32, left: 56 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const xFor = (ts: number) => pad.left + ((ts - minT) / Math.max(1, maxT - minT)) * plotW;
  const yFor = (sc: number) => pad.top + plotH - (sc / Math.max(1, yCeiling)) * plotH;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * yCeiling));

  return (
    <div className="glass-panel rounded-2xl border border-white/[0.07] p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Top Teams Score Progression</h3>
          <p className="text-xs text-slate-400">Cumulative dynamic points over competition timeline</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeSeries.map((series, idx) => {
            const color = PALETTE[idx % PALETTE.length];
            const dimmed = hoveredTeamId !== null && hoveredTeamId !== series.teamId;
            return (
              <button
                key={series.teamId}
                type="button"
                onMouseEnter={() => setHoveredTeamId(series.teamId)}
                onMouseLeave={() => setHoveredTeamId(null)}
                className={`flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#06090f] px-2.5 py-1 text-[11px] font-mono transition ${
                  dimmed ? 'opacity-40' : 'opacity-100'
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-slate-200">{series.tag || series.teamName}</span>
                <span className="text-slate-400 tabular-nums">{series.finalScore}</span>
              </button>
            );
          })}
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full overflow-visible">
        {/* Horizontal grid lines */}
        {yTicks.map((tick) => {
          const y = yFor(tick);
          return (
            <g key={tick}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#1e293b" strokeDasharray="3 4" />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" className="fill-slate-500 text-[10px] font-mono">
                {tick}
              </text>
            </g>
          );
        })}

        {/* X Axis start/end labels */}
        <text x={pad.left} y={height - 8} className="fill-slate-500 text-[10px] font-mono">
          {new Date(minT).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </text>
        <text x={width - pad.right} y={height - 8} textAnchor="end" className="fill-slate-500 text-[10px] font-mono">
          {new Date(maxT).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </text>

        {/* Series step/line paths */}
        {activeSeries.map((series, idx) => {
          const color = PALETTE[idx % PALETTE.length];
          const dimmed = hoveredTeamId !== null && hoveredTeamId !== series.teamId;
          const coords = [
            { x: pad.left, y: yFor(0) },
            ...series.points.map((pt) => ({
              x: xFor(new Date(pt.time).getTime()),
              y: yFor(pt.score),
            })),
          ];
          const pathD = coords
            .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
            .join(' ');

          return (
            <g key={series.teamId} style={{ opacity: dimmed ? 0.2 : 1, transition: 'opacity 150ms' }}>
              <path d={pathD} fill="none" stroke={color} strokeWidth={hoveredTeamId === series.teamId ? 3 : 2} strokeLinejoin="round" />
              {series.points.map((pt, pIdx) => (
                <circle
                  key={pIdx}
                  cx={xFor(new Date(pt.time).getTime())}
                  cy={yFor(pt.score)}
                  r={3.2}
                  fill="#070a0f"
                  stroke={color}
                  strokeWidth={2}
                >
                  <title>{`${series.teamName}: ${pt.score} pts (${new Date(pt.time).toLocaleTimeString()})`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
