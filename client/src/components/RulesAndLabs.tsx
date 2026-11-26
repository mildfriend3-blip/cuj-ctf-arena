import { BookOpen, ExternalLink, Flag, Scale, ShieldCheck, Terminal } from 'lucide-react';
import type { Challenge } from '../types';

export function RulesAndLabs({
  challenges,
  onSelectChallenge,
}: {
  challenges: Challenge[];
  onSelectChallenge: (ch: Challenge) => void;
}) {
  const liveChallenges = challenges.filter((c) => c.labType !== 'none');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Live Labs & Competition Rules</h1>
        <p className="text-sm text-slate-400">
          Central University of Jammu — Official Capture The Flag Handbook & Hosted Target Directory
        </p>
      </div>

      {/* Live Targets Directory */}
      <div className="rounded-2xl border border-slate-800 bg-[#0b1019] p-6 space-y-4">
        <div className="flex items-center gap-2 text-base font-bold text-white">
          <Terminal className="h-5 w-5 text-emerald-400" />
          Hosted Interactive Target Labs ({liveChallenges.length} Active)
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {liveChallenges.map((c) => (
            <div
              key={c.id}
              className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#070a0f] p-4 space-y-3"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="uppercase text-emerald-400">{c.labType} LAB</span>
                  <span className="text-slate-400">{c.points} pts</span>
                </div>
                <h3 className="mt-1 font-semibold text-white">{c.title}</h3>
                <p className="mt-1 text-xs font-mono text-cyan-300 truncate">{c.labUrl}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onSelectChallenge(c)}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-500/40"
                >
                  Open Challenge
                </button>
                {c.labType === 'web' && (
                  <a
                    href={c.labUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/25"
                  >
                    Visit <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-[#0b1019] p-6 space-y-3">
          <div className="flex items-center gap-2 text-base font-bold text-white">
            <Flag className="h-5 w-5 text-cyan-400" />
            Flag Format & Submission
          </div>
          <ul className="space-y-2 text-sm text-slate-300 list-disc pl-5">
            <li>
              All flags follow the standard format <code className="font-mono text-emerald-300">CUJCTF&#123;...&#125;</code> unless explicitly stated otherwise.
            </li>
            <li>
              Flag submission endpoints are rate-limited (10 attempts/minute per user). Automated flag brute-forcing is prohibited.
            </li>
            <li>
              When one team member submits a valid flag, points and solve credit unlock immediately for the entire squad.
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0b1019] p-6 space-y-3">
          <div className="flex items-center gap-2 text-base font-bold text-white">
            <Scale className="h-5 w-5 text-amber-400" />
            Dynamic Scoring & First Blood
          </div>
          <ul className="space-y-2 text-sm text-slate-300 list-disc pl-5">
            <li>
              Challenge values decay smoothly from <code className="font-mono text-amber-300">initial_points</code> down to{' '}
              <code className="font-mono text-amber-300">min_points</code> as more teams solve them, rewarding rare & technical solves.
            </li>
            <li>
              The first team to solve any challenge earns a permanent <strong>First Blood Bonus</strong> (+25 to +50 pts) that does not decay.
            </li>
            <li>
              Unlocking optional hints deducts points from your team total. Ties are broken by earliest last-solve timestamp.
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0b1019] p-6 space-y-3 md:col-span-2">
          <div className="flex items-center gap-2 text-base font-bold text-white">
            <ShieldCheck className="h-5 w-5 text-rose-400" />
            CUJ Fair Play & Scope Policy
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm text-slate-300">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="font-semibold text-emerald-300 mb-1 flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" /> Permitted
              </div>
              <ul className="space-y-1 text-xs text-slate-300 list-disc pl-4">
                <li>Collaborating within your registered CUJ team (up to 4 members).</li>
                <li>Using Python, CyberChef, Wireshark, Ghidra, Burp Suite, exiftool, and custom scripts.</li>
                <li>Attacking designated <code>/ctf-labs/*</code> and <code>/api/labs/*</code> challenge targets.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
              <div className="font-semibold text-rose-300 mb-1">Strictly Prohibited</div>
              <ul className="space-y-1 text-xs text-slate-300 list-disc pl-4">
                <li>Sharing flags or writeups with rival teams during the competition.</li>
                <li>Denial-of-Service (DoS) against competition infrastructure or CUJ university networks.</li>
                <li>Attacking the scoreboard/auth platform outside designated lab endpoints.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
