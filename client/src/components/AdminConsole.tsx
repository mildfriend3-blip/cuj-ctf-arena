import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle,
  Download,
  Eye,
  EyeOff,
  Megaphone,
  PlusCircle,
  Settings,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { apiFetch } from '../api';

interface AdminChallenge {
  id: number;
  title: string;
  category: string;
  difficulty: string;
  flag_value: string;
  initial_points: number;
  min_points: number;
  decay: number;
  first_blood_bonus: number;
  published: number;
}

interface AdminTeam {
  id: number;
  name: string;
  tag: string;
  department: string;
  invite_code: string;
  member_count: number;
  solve_count: number;
  banned: number;
}

interface AdminSubmission {
  id: number;
  submitted_flag: string;
  is_correct: number;
  ip_address: string;
  submitted_at: string;
  challenge_title: string;
  category: string;
  team_name: string | null;
  username: string;
}

interface AdminOverview {
  settings: Record<string, string>;
  challenges: AdminChallenge[];
  teams: AdminTeam[];
  submissions: AdminSubmission[];
}

export function AdminConsole({ onRefreshAll }: { onRefreshAll: () => Promise<void> }) {
  const [subTab, setSubTab] = useState<'settings' | 'challenges' | 'teams' | 'audit'>('settings');
  const [data, setData] = useState<AdminOverview | null>(null);
  const [statusMsg, setStatusMsg] = useState('');

  // Settings local form
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({});

  // New Challenge form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newCh, setNewCh] = useState({
    title: '',
    category: 'Crypto',
    difficulty: 'Medium',
    description: '',
    flag_value: 'CUJCTF{}',
    initial_points: 400,
    min_points: 100,
    decay: 12,
    first_blood_bonus: 35,
    tags: '',
    writeup: '',
  });

  // Broadcast Announcement form
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annSeverity, setAnnSeverity] = useState<'info' | 'warning' | 'critical'>('info');

  async function loadAdmin() {
    const res = await apiFetch<AdminOverview>('/api/admin/overview');
    setData(res);
    setSettingsForm(res.settings);
  }

  useEffect(() => {
    loadAdmin().catch(() => {});
  }, []);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settingsForm),
    });
    setStatusMsg('Competition settings saved & broadcasted live.');
    await loadAdmin();
    await onRefreshAll();
  }

  async function toggleSettingFlag(key: string) {
    const nextVal = settingsForm[key] === '1' ? '0' : '1';
    const next = { ...settingsForm, [key]: nextVal };
    setSettingsForm(next);
    await apiFetch('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ [key]: nextVal }),
    });
    setStatusMsg(`Updated ${key} = ${nextVal}`);
    await loadAdmin();
    await onRefreshAll();
  }

  async function createChallenge(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch('/api/admin/challenges', {
      method: 'POST',
      body: JSON.stringify(newCh),
    });
    setShowNewForm(false);
    setNewCh({
      title: '',
      category: 'Crypto',
      difficulty: 'Medium',
      description: '',
      flag_value: 'CUJCTF{}',
      initial_points: 400,
      min_points: 100,
      decay: 12,
      first_blood_bonus: 35,
      tags: '',
      writeup: '',
    });
    setStatusMsg('New challenge created & published.');
    await loadAdmin();
    await onRefreshAll();
  }

  async function togglePublish(ch: AdminChallenge) {
    await apiFetch(`/api/admin/challenges/${ch.id}`, {
      method: 'PUT',
      body: JSON.stringify({ published: ch.published === 1 ? 0 : 1 }),
    });
    await loadAdmin();
    await onRefreshAll();
  }

  async function deleteChallenge(ch: AdminChallenge) {
    if (!window.confirm(`Delete challenge "${ch.title}" permanently?`)) return;
    await apiFetch(`/api/admin/challenges/${ch.id}`, { method: 'DELETE' });
    await loadAdmin();
    await onRefreshAll();
  }

  async function toggleBan(t: AdminTeam) {
    await apiFetch(`/api/admin/teams/${t.id}/ban`, {
      method: 'POST',
      body: JSON.stringify({ banned: t.banned !== 1 }),
    });
    await loadAdmin();
    await onRefreshAll();
  }

  async function postAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch('/api/admin/announcements', {
      method: 'POST',
      body: JSON.stringify({ title: annTitle, body: annBody, severity: annSeverity }),
    });
    setAnnTitle('');
    setAnnBody('');
    setStatusMsg('Live announcement broadcasted to all connected teams!');
    await onRefreshAll();
  }

  if (!data) {
    return <div className="p-8 text-sm text-slate-400">Loading Organizer Console...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <ShieldAlert className="h-6 w-6 text-amber-400" />
            Organizer Control Console
          </h1>
          <p className="text-sm text-slate-400">Manage live competition state, challenges, teams, and submission audit logs</p>
        </div>
        <a
          href="/api/scoreboard/ctftime"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#0b1019] px-3.5 py-2 text-xs font-mono text-cyan-300 hover:border-cyan-500/40"
        >
          <Download className="h-4 w-4" />
          Export CTFTime JSON
        </a>
      </div>

      {statusMsg && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-200">
          {statusMsg}
        </div>
      )}

      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'settings', label: 'Competition Control' },
          { id: 'challenges', label: `Challenges (${data.challenges.length})` },
          { id: 'teams', label: `Teams (${data.teams.length})` },
          { id: 'audit', label: `Broadcasts & Audit Log (${data.submissions.length})` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id as typeof subTab)}
            className={`rounded-lg px-4 py-2 text-xs font-medium transition ${
              subTab === t.id
                ? 'border border-amber-500/40 bg-amber-500/15 text-amber-300'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: COMPETITION CONTROL */}
      {subTab === 'settings' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form onSubmit={saveSettings} className="lg:col-span-7 rounded-2xl border border-slate-800 bg-[#0b1019] p-5 space-y-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-white">
              <Settings className="h-4 w-4 text-emerald-400" />
              Event Parameters
            </h2>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Competition Name</label>
              <input
                value={settingsForm.competition_name || ''}
                onChange={(e) => setSettingsForm({ ...settingsForm, competition_name: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-[#070a0f] px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Subtitle</label>
              <input
                value={settingsForm.subtitle || ''}
                onChange={(e) => setSettingsForm({ ...settingsForm, subtitle: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-[#070a0f] px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Competition Status</label>
                <select
                  value={settingsForm.status || 'live'}
                  onChange={(e) => setSettingsForm({ ...settingsForm, status: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-[#070a0f] px-3 py-2 text-sm text-white"
                >
                  <option value="live">LIVE (Open)</option>
                  <option value="upcoming">UPCOMING (Locked)</option>
                  <option value="paused">PAUSED</option>
                  <option value="ended">ENDED</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Max Team Size</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={settingsForm.max_team_size || '4'}
                  onChange={(e) => setSettingsForm({ ...settingsForm, max_team_size: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-[#070a0f] px-3 py-2 text-sm font-mono text-white"
                />
              </div>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400"
            >
              Save Settings
            </button>
          </form>

          <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-[#0b1019] p-5 space-y-3">
            <h2 className="text-base font-bold text-white">Live Competition Switches</h2>
            {[
              {
                key: 'scoreboard_frozen',
                title: 'Freeze Public Scoreboard',
                desc: 'Hides new solves from public standings during final hour.',
              },
              {
                key: 'writeups_unlocked',
                title: 'Unlock All Official Writeups',
                desc: 'Reveals walkthroughs for every challenge to all students.',
              },
              {
                key: 'dynamic_scoring',
                title: 'Dynamic Decay Scoring',
                desc: 'Automatically decays challenge points as solve counts rise.',
              },
              {
                key: 'registration_open',
                title: 'Student Registration Open',
                desc: 'Allows new CUJ student accounts to register.',
              },
            ].map((sw) => {
              const active = settingsForm[sw.key] === '1';
              return (
                <div
                  key={sw.key}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#070a0f] px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-medium text-white">{sw.title}</div>
                    <div className="text-xs text-slate-400">{sw.desc}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSettingFlag(sw.key)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-mono font-bold transition ${
                      active
                        ? 'bg-emerald-500 text-slate-950'
                        : 'border border-slate-700 bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {active ? 'ON' : 'OFF'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: CHALLENGES MANAGER */}
      {subTab === 'challenges' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowNewForm(!showNewForm)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
            >
              <PlusCircle className="h-4 w-4" />
              {showNewForm ? 'Cancel' : 'Author New Challenge'}
            </button>
          </div>

          {showNewForm && (
            <form onSubmit={createChallenge} className="rounded-2xl border border-emerald-500/30 bg-[#0b1019] p-5 space-y-4">
              <h3 className="text-base font-bold text-white">Create Custom Challenge</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input
                  required
                  placeholder="Title"
                  value={newCh.title}
                  onChange={(e) => setNewCh({ ...newCh, title: e.target.value })}
                  className="rounded-lg border border-slate-700 bg-[#070a0f] px-3 py-2 text-sm text-white"
                />
                <select
                  value={newCh.category}
                  onChange={(e) => setNewCh({ ...newCh, category: e.target.value })}
                  className="rounded-lg border border-slate-700 bg-[#070a0f] px-3 py-2 text-sm text-white"
                >
                  {['Crypto', 'Stego', 'OSINT', 'Web', 'Rev', 'Pwn', 'Forensics', 'Misc'].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={newCh.difficulty}
                  onChange={(e) => setNewCh({ ...newCh, difficulty: e.target.value })}
                  className="rounded-lg border border-slate-700 bg-[#070a0f] px-3 py-2 text-sm text-white"
                >
                  {['Easy', 'Medium', 'Hard', 'Insane'].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                required
                rows={3}
                placeholder="Challenge narrative / instructions (Markdown supported)"
                value={newCh.description}
                onChange={(e) => setNewCh({ ...newCh, description: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-[#070a0f] px-3 py-2 text-sm text-white"
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <input
                  required
                  placeholder="CUJCTF{flag}"
                  value={newCh.flag_value}
                  onChange={(e) => setNewCh({ ...newCh, flag_value: e.target.value })}
                  className="sm:col-span-2 rounded-lg border border-slate-700 bg-[#070a0f] px-3 py-2 text-sm font-mono text-emerald-300"
                />
                <input
                  type="number"
                  placeholder="Initial Points"
                  value={newCh.initial_points}
                  onChange={(e) => setNewCh({ ...newCh, initial_points: Number(e.target.value) })}
                  className="rounded-lg border border-slate-700 bg-[#070a0f] px-3 py-2 text-sm font-mono text-white"
                />
                <input
                  type="number"
                  placeholder="Min Points"
                  value={newCh.min_points}
                  onChange={(e) => setNewCh({ ...newCh, min_points: Number(e.target.value) })}
                  className="rounded-lg border border-slate-700 bg-[#070a0f] px-3 py-2 text-sm font-mono text-white"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-400"
              >
                Publish Challenge
              </button>
            </form>
          )}

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#0b1019]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-[#070a0f] font-mono uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Challenge</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Flag</th>
                  <th className="px-4 py-3">Points (Init/Min)</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {data.challenges.map((ch) => (
                  <tr key={ch.id} className="hover:bg-slate-900/40">
                    <td className="px-4 py-3 font-medium text-white">
                      {ch.title}{' '}
                      {ch.published === 0 && (
                        <span className="ml-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">HIDDEN</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {ch.category} &middot; {ch.difficulty}
                    </td>
                    <td className="px-4 py-3 font-mono text-emerald-300">{ch.flag_value}</td>
                    <td className="px-4 py-3 font-mono text-slate-300">
                      {ch.initial_points} / {ch.min_points}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => togglePublish(ch)}
                        title={ch.published === 1 ? 'Hide challenge' : 'Publish challenge'}
                        className="inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-slate-300 hover:text-white"
                      >
                        {ch.published === 1 ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        {ch.published === 1 ? 'Live' : 'Hidden'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteChallenge(ch)}
                        className="inline-flex items-center rounded border border-rose-500/30 p-1 text-rose-400 hover:bg-rose-500/15"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TEAMS & MODERATION */}
      {subTab === 'teams' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#0b1019]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-[#070a0f] font-mono uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Invite Code</th>
                <th className="px-4 py-3">Members / Solves</th>
                <th className="px-4 py-3 text-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {data.teams.map((t) => (
                <tr key={t.id} className="hover:bg-slate-900/40">
                  <td className="px-4 py-3 font-semibold text-white">
                    {t.name} <span className="font-mono text-slate-400">[{t.tag}]</span>
                    {t.banned === 1 && (
                      <span className="ml-2 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-300">BANNED</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{t.department}</td>
                  <td className="px-4 py-3 font-mono text-cyan-300">{t.invite_code}</td>
                  <td className="px-4 py-3 font-mono text-slate-300">
                    {t.member_count} members &middot; {t.solve_count} solves
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleBan(t)}
                      className={`inline-flex items-center gap-1 rounded px-2.5 py-1 font-medium ${
                        t.banned === 1
                          ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                          : 'border border-rose-500/40 bg-rose-500/10 text-rose-300'
                      }`}
                    >
                      <Ban className="h-3.5 w-3.5" />
                      {t.banned === 1 ? 'Unban' : 'Suspend'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: BROADCASTS & AUDIT LOG */}
      {subTab === 'audit' && (
        <div className="space-y-6">
          <form onSubmit={postAnnouncement} className="rounded-2xl border border-slate-800 bg-[#0b1019] p-5 space-y-3">
            <h2 className="flex items-center gap-2 text-base font-bold text-white">
              <Megaphone className="h-4 w-4 text-cyan-400" />
              Broadcast Live Announcement
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input
                required
                placeholder="Announcement Title"
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                className="sm:col-span-2 rounded-lg border border-slate-700 bg-[#070a0f] px-3 py-2 text-sm text-white"
              />
              <select
                value={annSeverity}
                onChange={(e) => setAnnSeverity(e.target.value as 'info' | 'warning' | 'critical')}
                className="rounded-lg border border-slate-700 bg-[#070a0f] px-3 py-2 text-sm text-white"
              >
                <option value="info">Info</option>
                <option value="warning">Warning / Hint Update</option>
                <option value="critical">Urgent Alert</option>
              </select>
            </div>
            <textarea
              required
              rows={2}
              placeholder="Message pushed instantly via SSE to every connected team..."
              value={annBody}
              onChange={(e) => setAnnBody(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-[#070a0f] px-3 py-2 text-sm text-white"
            />
            <button
              type="submit"
              className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"
            >
              Broadcast Now
            </button>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#0b1019]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-[#070a0f] font-mono uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">User / Team</th>
                  <th className="px-4 py-3">Challenge</th>
                  <th className="px-4 py-3">Submitted Payload</th>
                  <th className="px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {data.submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-900/40">
                    <td className="px-4 py-2.5">
                      {sub.is_correct === 1 ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-mono">
                          <CheckCircle className="h-3.5 w-3.5" /> PASS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-mono">
                          <AlertTriangle className="h-3.5 w-3.5" /> FAIL
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-cyan-300">{sub.username}</span>
                      {sub.team_name && <span className="text-slate-400"> ({sub.team_name})</span>}
                    </td>
                    <td className="px-4 py-2.5 text-white">{sub.challenge_title}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-300">{sub.submitted_flag}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-500">
                      {new Date(sub.submitted_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
