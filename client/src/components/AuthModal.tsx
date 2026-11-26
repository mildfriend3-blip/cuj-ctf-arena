import React, { useState } from 'react';
import { KeyRound, ShieldCheck, UserPlus, X } from 'lucide-react';
import { apiFetch, setStoredToken } from '../api';
import type { Team, User } from '../types';

interface Props {
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onSuccess: (user: User, team: Team | null) => void;
}

const DEPARTMENTS = [
  'B.Tech CSE',
  'B.Tech CS&IT',
  'M.Tech Cyber Security',
  'MCA',
  'B.Tech ECE',
  'Mathematics & CS',
  'Integrated M.Sc',
  'Other CUJ Dept',
];

export function AuthModal({ initialMode = 'login', onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [rollNumber, setRollNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await apiFetch<{ token: string; user: User; team: Team | null }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ identifier, password }),
        });
        setStoredToken(res.token);
        onSuccess(res.user, res.team);
      } else {
        const res = await apiFetch<{ token: string; user: User; team: Team | null }>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ username, email, password, department, rollNumber }),
        });
        setStoredToken(res.token);
        onSuccess(res.user, res.team);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(demoEmail: string, demoPass: string) {
    setMode('login');
    setIdentifier(demoEmail);
    setPassword(demoPass);
    setError('');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Authentication"
        className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-[#0c111a] p-6 shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">CUJ CyberOps Access</h2>
            <p className="text-xs text-slate-400">Central University of Jammu CTF Portal</p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-xl border border-slate-800 bg-[#070a0f] p-1 text-sm">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 font-medium transition ${
              mode === 'login' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="h-4 w-4" />
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
            }}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 font-medium transition ${
              mode === 'register' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            Register Student
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'login' ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Username or CUJ Email</label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="aarav.cse@cujammu.ac.in"
                className="w-full rounded-lg border border-slate-700/80 bg-[#070a0f] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Handle / Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="cyber_cuj"
                    className="w-full rounded-lg border border-slate-700/80 bg-[#070a0f] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">CUJ Roll No.</label>
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="CUJ24CSE011"
                    className="w-full rounded-lg border border-slate-700/80 bg-[#070a0f] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Student Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@cujammu.ac.in"
                  className="w-full rounded-lg border border-slate-700/80 bg-[#070a0f] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full rounded-lg border border-slate-700/80 bg-[#070a0f] px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-700/80 bg-[#070a0f] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : mode === 'login' ? 'Sign In to Arena' : 'Create Student Account'}
          </button>
        </form>

        {mode === 'login' && (
          <div className="mt-5 border-t border-slate-800 pt-4">
            <p className="mb-2 text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Quick Demo Credentials (One-Click Fill)
            </p>
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => fillDemo('aarav.cse@cujammu.ac.in', 'Student@CUJ2026')}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#070a0f] px-3 py-1.5 text-left hover:border-emerald-500/40"
              >
                <span className="text-slate-200">Team Captain (Shivalik Rootkits)</span>
                <span className="font-mono text-[11px] text-emerald-400">aarav.cse</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('kabir.mca@cujammu.ac.in', 'Student@CUJ2026')}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#070a0f] px-3 py-1.5 text-left hover:border-cyan-500/40"
              >
                <span className="text-slate-200">Solo Student (Test Team Join/Create)</span>
                <span className="font-mono text-[11px] text-cyan-400">kabir.mca</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('admin@cujammu.ac.in', 'Admin@CUJ2026')}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#070a0f] px-3 py-1.5 text-left hover:border-amber-500/40"
              >
                <span className="text-slate-200">Competition Organizer (Admin)</span>
                <span className="font-mono text-[11px] text-amber-400">admin</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
