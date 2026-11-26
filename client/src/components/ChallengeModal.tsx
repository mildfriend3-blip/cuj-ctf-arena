import React, { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  Flame,
  Flag,
  HelpCircle,
  Lock,
  Terminal,
  Trophy,
  Unlock,
  Wrench,
  X,
} from 'lucide-react';
import { apiFetch } from '../api';
import type { Challenge, User } from '../types';
import { CATEGORY_META, CategoryIcon, DifficultyBadge } from './CategoryBadge';
import { MarkdownLite } from './MarkdownLite';

interface Props {
  challenge: Challenge;
  user: User | null;
  onClose: () => void;
  onSolvedOrUpdated: () => void;
  onOpenAuth: () => void;
  onOpenToolkit: () => void;
}

interface SolveEntry {
  id: number;
  team_id: number;
  team_name: string;
  team_tag: string;
  solved_by: string;
  is_first_blood: number;
  bonus_points: number;
  solved_at: string;
}

export function ChallengeModal({
  challenge,
  user,
  onClose,
  onSolvedOrUpdated,
  onOpenAuth,
  onOpenToolkit,
}: Props) {
  const [rightTab, setRightTab] = useState<'intel' | 'solves' | 'writeup'>('intel');
  const [flagInput, setFlagInput] = useState('');
  const [submitState, setSubmitState] = useState<{ type: 'ok' | 'fb' | 'err'; msg: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [solves, setSolves] = useState<SolveEntry[]>([]);
  const [unlockedHints, setUnlockedHints] = useState<Record<number, string>>({});
  const [confirmHintId, setConfirmHintId] = useState<number | null>(null);
  const [unlockingId, setUnlockingId] = useState<number | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Interactive Pwn Terminal
  const [pwnInput, setPwnInput] = useState('');
  const [pwnLog, setPwnLog] = useState<string[]>([
    `Connected to ${challenge.labUrl || 'service'}`,
    'Tip: Supports raw ASCII or Python-style hex escapes (e.g. AAAA...\\x21\\x4a\\x55\\x43)',
  ]);
  const [pwnBusy, setPwnBusy] = useState(false);

  // Interactive Misc PoW Gauntlet
  const [powChallenge, setPowChallenge] = useState<{
    challengeId: string;
    prefix: string;
    targetHexPrefix: string;
  } | null>(null);
  const [powNonce, setPowNonce] = useState('');
  const [powResult, setPowResult] = useState('');

  useEffect(() => {
    apiFetch<{ solves: SolveEntry[] }>(`/api/challenges/${challenge.id}/solves`)
      .then((r) => setSolves(r.solves))
      .catch(() => {});
  }, [challenge.id, challenge.solveCount]);

  async function handleSubmitFlag(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    setSubmitting(true);
    setSubmitState(null);
    try {
      const res = await apiFetch<{ correct: boolean; isFirstBlood?: boolean; message: string }>(
        `/api/challenges/${challenge.id}/submit`,
        {
          method: 'POST',
          body: JSON.stringify({ flag: flagInput }),
        }
      );
      setSubmitState({
        type: res.isFirstBlood ? 'fb' : 'ok',
        msg: res.message,
      });
      setFlagInput('');
      onSolvedOrUpdated();
    } catch (err) {
      setSubmitState({
        type: 'err',
        msg: err instanceof Error ? err.message : 'Incorrect flag',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnlockHint(hintId: number) {
    if (!user) {
      onOpenAuth();
      return;
    }
    setUnlockingId(hintId);
    try {
      const res = await apiFetch<{ content: string }>(`/api/challenges/${challenge.id}/hints/${hintId}/unlock`, {
        method: 'POST',
      });
      setUnlockedHints((prev) => ({ ...prev, [hintId]: res.content }));
      setConfirmHintId(null);
      onSolvedOrUpdated();
    } catch (err) {
      setSubmitState({
        type: 'err',
        msg: err instanceof Error ? err.message : 'Could not unlock hint',
      });
    } finally {
      setUnlockingId(null);
    }
  }

  async function sendPwnPayload(e: React.FormEvent) {
    e.preventDefault();
    if (!challenge.labUrl || pwnBusy) return;
    setPwnBusy(true);
    setPwnLog((prev) => [...prev, `$ > ${pwnInput}`]);
    try {
      const res = await apiFetch<{ output: string }>(challenge.labUrl, {
        method: 'POST',
        body: JSON.stringify({ input: pwnInput }),
      });
      setPwnLog((prev) => [...prev, res.output]);
    } catch (err) {
      setPwnLog((prev) => [...prev, `[error] ${err instanceof Error ? err.message : 'Connection error'}`]);
    } finally {
      setPwnBusy(false);
    }
  }

  async function startPow() {
    setPowResult('');
    try {
      const res = await apiFetch<{ challengeId: string; prefix: string; targetHexPrefix: string }>(
        '/api/labs/misc/hash-gauntlet/start'
      );
      setPowChallenge(res);
    } catch (err) {
      setPowResult(err instanceof Error ? err.message : 'Failed to start');
    }
  }

  async function submitPow() {
    if (!powChallenge) return;
    try {
      const res = await apiFetch<{ flag?: string; digest?: string }>('/api/labs/misc/hash-gauntlet/verify', {
        method: 'POST',
        body: JSON.stringify({ challengeId: powChallenge.challengeId, nonce: powNonce }),
      });
      setPowResult(`SOLVED! SHA256=${res.digest}\nFLAG: ${res.flag}`);
    } catch (err) {
      setPowResult(err instanceof Error ? err.message : 'Verification failed');
    }
  }

  function copySha(sha: string) {
    navigator.clipboard.writeText(sha);
    setCopiedHash(sha);
    setTimeout(() => setCopiedHash(null), 1500);
  }

  const catStyle = CATEGORY_META[challenge.category] || CATEGORY_META.Misc;
  const decayRatio =
    challenge.initialPoints > challenge.minPoints
      ? Math.round(
          ((challenge.points - challenge.minPoints) / (challenge.initialPoints - challenge.minPoints)) * 100
        )
      : 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={challenge.title}
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/[0.1] bg-[#090d15] shadow-2xl animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Strip */}
        <div className="h-[3px] w-full" style={{ backgroundColor: catStyle.accentHex }} />

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] bg-[#0c121e] px-6 py-4">
          <div className="space-y-1.5 pr-8">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${catStyle.bg} ${catStyle.border} ${catStyle.color}`}
              >
                <CategoryIcon category={challenge.category} className="h-3.5 w-3.5" />
                {challenge.category}
              </span>
              <DifficultyBadge difficulty={challenge.difficulty} />
              {challenge.solvedByTeam && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Solved
                </span>
              )}
              {challenge.firstBloodTeam && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-mono text-amber-300">
                  <Flame className="h-3.5 w-3.5" /> 1st Blood: {challenge.firstBloodTeam}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white sm:text-2xl">{challenge.title}</h2>
            <p className="text-xs text-slate-400">
              Author: <span className="text-slate-200">{challenge.author}</span> &middot; {challenge.solveCount} solve
              {challenge.solveCount === 1 ? '' : 's'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenToolkit}
              className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20"
            >
              <Wrench className="h-3.5 w-3.5" />
              Open Decoder
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 text-slate-400 hover:bg-white/[0.08] hover:text-white"
              aria-label="Close challenge"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Split-Pane Workbench */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12">
          {/* LEFT PANE: Mission Briefing, Artifacts & Interactive Lab */}
          <div className="lg:col-span-7 p-6 space-y-5 lg:border-r lg:border-white/[0.07]">
            <div>
              <div className="mb-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">Mission Briefing</div>
              <MarkdownLite content={challenge.description} />
            </div>

            {challenge.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {challenge.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-md border border-white/[0.06] bg-[#06090f] px-2 py-0.5 text-[11px] font-mono text-slate-400"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* Downloadable Artifacts */}
            {challenge.artifacts.length > 0 && (
              <div className="rounded-2xl border border-white/[0.07] bg-[#06090f] p-4 space-y-2.5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Challenge Files ({challenge.artifacts.length})
                </div>
                {challenge.artifacts.map((art) => (
                  <div
                    key={art.path}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-[#0b1019] px-3.5 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-mono font-medium text-cyan-300 truncate">{art.name}</div>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                        <span>{(art.size / 1024).toFixed(1)} KB</span>
                        <button
                          type="button"
                          onClick={() => copySha(art.sha256)}
                          className="inline-flex items-center gap-1 hover:text-slate-300"
                          title="Copy full SHA-256"
                        >
                          SHA256: {art.sha256.slice(0, 12)}...
                          {copiedHash === art.sha256 ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>
                    <a
                      href={`/api/artifacts/${art.path}`}
                      download={art.name}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/35 bg-cyan-500/12 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/22"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                  </div>
                ))}
              </div>
            )}

            {/* Live Web Target */}
            {challenge.labType === 'web' && challenge.labUrl && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      Live Web Target Active
                    </div>
                    <div className="mt-0.5 text-sm font-mono text-white">{challenge.labUrl}</div>
                  </div>
                  <a
                    href={challenge.labUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                  >
                    Open Target Lab
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* Live Pwn Terminal */}
            {challenge.labType === 'pwn' && challenge.labUrl && (
              <div className="rounded-2xl border border-rose-500/30 bg-[#05080d] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono text-rose-300">
                    <Terminal className="h-4 w-4" />
                    Interactive Binary Terminal ({challenge.labUrl})
                  </div>
                  <button
                    type="button"
                    onClick={() => setPwnLog([`Terminal reset for ${challenge.labUrl}`])}
                    className="text-[11px] font-mono text-slate-500 hover:text-white"
                  >
                    Clear Output
                  </button>
                </div>
                <pre className="max-h-52 overflow-y-auto rounded-xl border border-white/[0.06] bg-black/75 p-3 text-xs font-mono text-emerald-300 whitespace-pre-wrap">
                  {pwnLog.join('\n')}
                </pre>
                <form onSubmit={sendPwnPayload} className="flex gap-2">
                  <input
                    type="text"
                    value={pwnInput}
                    onChange={(e) => setPwnInput(e.target.value)}
                    placeholder="Payload (raw ASCII or \xHH bytes)..."
                    className="flex-1 rounded-xl border border-slate-700 bg-[#0b1019] px-3 py-2 text-xs font-mono text-white focus:border-rose-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={pwnBusy}
                    className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white hover:bg-rose-400 disabled:opacity-50"
                  >
                    {pwnBusy ? 'Running...' : 'Execute'}
                  </button>
                </form>
              </div>
            )}

            {/* Live Misc PoW Gauntlet */}
            {challenge.labType === 'misc' && (
              <div className="rounded-2xl border border-lime-500/30 bg-[#070d08] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-lime-300">
                    <Cpu className="h-4 w-4" />
                    Proof-of-Work Challenge Runner (15s TTL)
                  </div>
                  <button
                    type="button"
                    onClick={startPow}
                    className="rounded-lg border border-lime-500/40 bg-lime-500/15 px-3 py-1.5 text-xs font-semibold text-lime-300 hover:bg-lime-500/25"
                  >
                    Fetch Prefix
                  </button>
                </div>
                {powChallenge && (
                  <div className="space-y-2 text-xs font-mono">
                    <div className="rounded-lg border border-white/[0.06] bg-black/60 p-2.5 text-slate-300">
                      challengeId: <span className="text-cyan-300">{powChallenge.challengeId}</span>
                      <br />
                      prefix: <span className="text-amber-300">{powChallenge.prefix}</span> (SHA256 prefix{' '}
                      <span className="text-lime-300">{powChallenge.targetHexPrefix}</span>)
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={powNonce}
                        onChange={(e) => setPowNonce(e.target.value)}
                        placeholder="Found nonce..."
                        className="flex-1 rounded-lg border border-slate-700 bg-black/70 px-3 py-1.5 text-white"
                      />
                      <button
                        type="button"
                        onClick={submitPow}
                        className="rounded-lg bg-lime-500 px-3.5 py-1.5 font-bold text-slate-950 hover:bg-lime-400"
                      >
                        Verify
                      </button>
                    </div>
                  </div>
                )}
                {powResult && (
                  <pre className="rounded-lg border border-white/[0.06] bg-black/70 p-2.5 text-xs font-mono text-emerald-300 whitespace-pre-wrap">
                    {powResult}
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* RIGHT PANE: Flag Dock, Scoring Meter, Hints & Solves */}
          <div className="lg:col-span-5 bg-[#070a10] p-6 space-y-5">
            {/* Score Readout & Decay Bar */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#0b1019] p-4 space-y-2.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Current Bounty</span>
                <span className="font-mono text-3xl font-bold text-emerald-400 tabular-nums">{challenge.points} pts</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${decayRatio}%` }} />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span>Min: {challenge.minPoints}</span>
                <span>+{challenge.firstBloodBonus} 1st Blood</span>
                <span>Init: {challenge.initialPoints}</span>
              </div>
            </div>

            {/* Flag Submission Form */}
            <form
              onSubmit={handleSubmitFlag}
              className="rounded-2xl border border-emerald-500/25 bg-[#0c141d] p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-emerald-300">
                  <Flag className="h-3.5 w-3.5" />
                  Submit Flag
                </label>
                <span className="text-[11px] font-mono text-slate-500">CUJCTF&#123;...&#125;</span>
              </div>
              <input
                type="text"
                value={flagInput}
                onChange={(e) => setFlagInput(e.target.value)}
                placeholder="CUJCTF{enter_captured_flag}"
                disabled={challenge.solvedByTeam}
                className="w-full rounded-xl border border-slate-700 bg-[#05080d] px-3.5 py-2.5 text-sm font-mono text-emerald-300 placeholder-slate-600 focus:border-emerald-500 focus:outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={submitting || challenge.solvedByTeam}
                className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {challenge.solvedByTeam ? 'Captured by Squad' : submitting ? 'Verifying Flag...' : 'Verify & Capture Flag'}
              </button>
              {submitState && (
                <div
                  className={`rounded-xl border px-3 py-2 text-xs font-medium ${
                    submitState.type === 'fb'
                      ? 'border-amber-500/50 bg-amber-500/15 text-amber-200'
                      : submitState.type === 'ok'
                      ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                      : 'border-rose-500/50 bg-rose-500/15 text-rose-200'
                  }`}
                >
                  {submitState.msg}
                </div>
              )}
            </form>

            {/* Right Sub-tabs */}
            <div className="grid grid-cols-3 rounded-xl border border-white/[0.06] bg-[#0b1019] p-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => setRightTab('intel')}
                className={`rounded-lg py-1.5 transition ${
                  rightTab === 'intel' ? 'bg-white/[0.08] text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Hints ({challenge.hints.length})
              </button>
              <button
                type="button"
                onClick={() => setRightTab('solves')}
                className={`rounded-lg py-1.5 transition ${
                  rightTab === 'solves' ? 'bg-white/[0.08] text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Solves ({challenge.solveCount})
              </button>
              <button
                type="button"
                onClick={() => setRightTab('writeup')}
                className={`flex items-center justify-center gap-1 rounded-lg py-1.5 transition ${
                  rightTab === 'writeup' ? 'bg-white/[0.08] text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {challenge.writeup ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                Writeup
              </button>
            </div>

            {rightTab === 'intel' && (
              <div className="space-y-2.5">
                {challenge.hints.length === 0 ? (
                  <div className="rounded-xl border border-white/[0.06] bg-[#0b1019] p-4 text-center text-xs text-slate-500">
                    No hints configured for this challenge.
                  </div>
                ) : (
                  challenge.hints.map((h) => {
                    const revealed = h.content || unlockedHints[h.id];
                    const confirming = confirmHintId === h.id;
                    return (
                      <div
                        key={h.id}
                        className="rounded-xl border border-white/[0.06] bg-[#0b1019] px-4 py-3 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 font-medium text-amber-300">
                            <HelpCircle className="h-3.5 w-3.5" /> Hint #{h.order_idx}
                          </span>
                          {!revealed && !confirming && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!user) return onOpenAuth();
                                setConfirmHintId(h.id);
                              }}
                              className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 font-mono text-[11px] text-amber-300 hover:bg-amber-500/20"
                            >
                              Unlock (-{h.cost} pts)
                            </button>
                          )}
                          {!revealed && confirming && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={unlockingId === h.id}
                                onClick={() => handleUnlockHint(h.id)}
                                className="rounded bg-amber-500 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-950"
                              >
                                {unlockingId === h.id ? '...' : `Confirm -${h.cost}`}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmHintId(null)}
                                className="rounded border border-slate-700 px-2 py-0.5 text-[11px] text-slate-400"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                        {revealed && <p className="leading-relaxed text-slate-300">{revealed}</p>}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {rightTab === 'solves' && (
              <div className="rounded-xl border border-white/[0.06] bg-[#0b1019] overflow-hidden max-h-64 overflow-y-auto">
                {solves.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Unclaimed! First Blood (+{challenge.firstBloodBonus} pts) is still open.
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.05]">
                    {solves.map((s, idx) => (
                      <div key={s.id} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-slate-500 w-5">
                            {idx === 0 ? <Trophy className="h-3.5 w-3.5 text-amber-400" /> : `#${idx + 1}`}
                          </span>
                          <span className="font-semibold text-white truncate">{s.team_name}</span>
                          <span className="font-mono text-[10px] text-cyan-300">{s.solved_by}</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-500">
                          {new Date(s.solved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {rightTab === 'writeup' && (
              <div className="rounded-xl border border-white/[0.06] bg-[#0b1019] p-4">
                {challenge.writeup ? (
                  <MarkdownLite content={challenge.writeup} />
                ) : (
                  <div className="py-6 text-center">
                    <Lock className="mx-auto mb-2 h-6 w-6 text-slate-600" />
                    <p className="text-xs font-medium text-slate-300">Official Writeup Locked</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Capture the flag or wait for organizers to unlock writeups.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
