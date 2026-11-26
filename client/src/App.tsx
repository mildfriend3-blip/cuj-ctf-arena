import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, getStoredToken, setStoredToken } from './api';
import { AdminConsole } from './components/AdminConsole';
import { AuthModal } from './components/AuthModal';
import { ChallengeModal } from './components/ChallengeModal';
import { ChallengesPage } from './components/ChallengesPage';
import { CommandPalette } from './components/CommandPalette';
import { Navbar, type NavTab } from './components/Navbar';
import { OverviewPage } from './components/OverviewPage';
import { RulesAndLabs } from './components/RulesAndLabs';
import { ScoreboardPage } from './components/ScoreboardPage';
import { TeamHub } from './components/TeamHub';
import { ToolkitDrawer } from './components/ToolkitDrawer';
import type {
  Challenge,
  CompetitionOverview,
  Team,
  TeamStanding,
  TimelineSeries,
  TopPlayer,
  User,
} from './types';

function getCountdownParts(endsAtIso?: string): { hrs: string; mins: string; secs: string; joined: string } {
  if (!endsAtIso) return { hrs: '00', mins: '00', secs: '00', joined: '00:00:00' };
  const diff = Math.max(0, new Date(endsAtIso).getTime() - Date.now());
  const hrs = String(Math.floor(diff / 3600000)).padStart(2, '0');
  const mins = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
  const secs = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
  return { hrs, mins, secs, joined: `${hrs}:${mins}:${secs}` };
}

export function App() {
  const [tab, setTab] = useState<NavTab>('overview');
  const [user, setUser] = useState<User | null>(null);
  const [myTeam, setMyTeam] = useState<Team | null>(null);

  const [overview, setOverview] = useState<CompetitionOverview | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [timeline, setTimeline] = useState<TimelineSeries[]>([]);
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);
  const [isFrozen, setIsFrozen] = useState(false);

  const [catFilter, setCatFilter] = useState('All');
  const [inspectTeamId, setInspectTeamId] = useState<number | null>(null);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | null>(null);
  const [selectedChallengeId, setSelectedChallengeId] = useState<number | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toolkitOpen, setToolkitOpen] = useState(false);

  const [countdownParts, setCountdownParts] = useState(() => getCountdownParts());
  const [sseConnected, setSseConnected] = useState(false);
  const [toast, setToast] = useState<{ title: string; body: string; kind: 'fb' | 'solve' | 'ann' } | null>(null);

  const loadAll = useCallback(async () => {
    const [ov, chRes, sbRes] = await Promise.all([
      apiFetch<CompetitionOverview>('/api/overview'),
      apiFetch<{ challenges: Challenge[] }>('/api/challenges'),
      apiFetch<{ frozen: boolean; standings: TeamStanding[]; timeline: TimelineSeries[]; topPlayers: TopPlayer[] }>(
        '/api/scoreboard'
      ),
    ]);
    setOverview(ov);
    setChallenges(chRes.challenges);
    setStandings(sbRes.standings);
    setTimeline(sbRes.timeline);
    setTopPlayers(sbRes.topPlayers);
    setIsFrozen(sbRes.frozen);

    if (getStoredToken()) {
      try {
        const me = await apiFetch<{ user: User; team: Team | null }>('/api/auth/me');
        setUser(me.user);
        setMyTeam(me.team);
      } catch {
        setStoredToken(null);
        setUser(null);
        setMyTeam(null);
      }
    }
  }, []);

  useEffect(() => {
    loadAll().catch(() => {});
  }, [loadAll]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab]);

  // Global keyboard shortcuts (Ctrl+K or / opens Command Palette)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inInput = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (!inInput && e.key === '/') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const endsAt = overview?.settings?.ends_at;
    setCountdownParts(getCountdownParts(endsAt));
    const id = setInterval(() => setCountdownParts(getCountdownParts(endsAt)), 1000);
    return () => clearInterval(id);
  }, [overview?.settings?.ends_at]);

  const realtimeMode = overview?.realtimeMode || 'sse';

  useEffect(() => {
    if (realtimeMode === 'polling') {
      setSseConnected(true);
      const pollId = setInterval(() => {
        loadAll().catch(() => {});
      }, 8000);
      return () => clearInterval(pollId);
    }

    const es = new EventSource('/api/events');
    es.addEventListener('connected', () => setSseConnected(true));
    es.onerror = () => setSseConnected(false);

    const refresh = () => loadAll().catch(() => {});
    es.addEventListener('scoreboard_update', refresh);
    es.addEventListener('team_update', refresh);
    es.addEventListener('settings_update', refresh);

    es.addEventListener('first_blood', (ev) => {
      try {
        const d = JSON.parse((ev as MessageEvent).data);
        setToast({
          kind: 'fb',
          title: `FIRST BLOOD • ${d.challengeTitle}`,
          body: `${d.teamName} (${d.username}) captured First Blood (+${d.points} pts)!`,
        });
        refresh();
      } catch {
        // ignore
      }
    });

    es.addEventListener('solve', (ev) => {
      try {
        const d = JSON.parse((ev as MessageEvent).data);
        setToast({
          kind: 'solve',
          title: `Flag Captured • ${d.challengeTitle}`,
          body: `${d.teamName} solved [${d.category}] (+${d.points} pts)`,
        });
        refresh();
      } catch {
        // ignore
      }
    });

    es.addEventListener('announcement', (ev) => {
      try {
        const d = JSON.parse((ev as MessageEvent).data);
        setToast({ kind: 'ann', title: d.title, body: d.body });
        refresh();
      } catch {
        // ignore
      }
    });

    return () => es.close();
  }, [loadAll, realtimeMode]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6500);
    return () => clearTimeout(t);
  }, [toast]);

  const selectedChallenge = useMemo(
    () => challenges.find((c) => c.id === selectedChallengeId) || null,
    [challenges, selectedChallengeId]
  );

  const myStanding = useMemo(
    () => (myTeam ? standings.find((s) => s.id === myTeam.id) || null : null),
    [myTeam, standings]
  );

  const solvedCount = useMemo(() => challenges.filter((c) => c.solvedByTeam).length, [challenges]);

  function handleLogout() {
    setStoredToken(null);
    setUser(null);
    setMyTeam(null);
    if (tab === 'admin') setTab('overview');
    loadAll().catch(() => {});
  }

  const settings = overview?.settings || {};
  const maxTeamSize = Number(settings.max_team_size || 4);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        tab={tab}
        setTab={setTab}
        user={user}
        myTeam={myTeam}
        myStanding={myStanding}
        solvedCount={solvedCount}
        totalChallenges={challenges.length}
        compName={settings.competition_name || 'CUJ CyberOps CTF 2026'}
        compStatus={settings.status || 'live'}
        isFrozen={isFrozen}
        countdown={countdownParts.joined}
        sseConnected={sseConnected}
        onOpenAuth={(m) => setAuthModalMode(m)}
        onLogout={handleLogout}
        onOpenPalette={() => setPaletteOpen(true)}
        onOpenToolkit={() => setToolkitOpen(true)}
      />

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 pb-16">
        {tab === 'overview' && overview && (
          <OverviewPage
            overview={overview}
            challenges={challenges}
            user={user}
            myTeam={myTeam}
            myStanding={myStanding}
            countdownParts={countdownParts}
            maxTeamSize={maxTeamSize}
            onNavigate={setTab}
            onFilterCategory={setCatFilter}
            onSelectChallenge={setSelectedChallengeId}
            onOpenAuth={(m) => setAuthModalMode(m)}
          />
        )}

        {tab === 'challenges' && (
          <ChallengesPage
            challenges={challenges}
            user={user}
            myTeam={myTeam}
            catFilter={catFilter}
            setCatFilter={setCatFilter}
            onSelectChallenge={setSelectedChallengeId}
          />
        )}

        {tab === 'scoreboard' && (
          <ScoreboardPage
            standings={standings}
            timeline={timeline}
            topPlayers={topPlayers}
            myTeam={myTeam}
            isFrozen={isFrozen}
            onInspectTeam={(tid) => {
              setInspectTeamId(tid);
              setTab('teams');
            }}
          />
        )}

        {tab === 'teams' && (
          <TeamHub
            user={user}
            myTeam={myTeam}
            standings={standings}
            initialTeamId={inspectTeamId}
            maxTeamSize={maxTeamSize}
            onRefreshAll={loadAll}
            onOpenAuth={() => setAuthModalMode('login')}
          />
        )}

        {tab === 'rules' && (
          <RulesAndLabs
            challenges={challenges}
            onSelectChallenge={(ch) => setSelectedChallengeId(ch.id)}
          />
        )}

        {tab === 'admin' && user?.role === 'admin' && <AdminConsole onRefreshAll={loadAll} />}
      </main>

      {/* Live Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 max-w-sm rounded-2xl border p-4 shadow-2xl backdrop-blur-xl animate-modal-in ${
            toast.kind === 'fb'
              ? 'border-amber-500/50 bg-[#1a1308]/95 text-amber-100'
              : toast.kind === 'solve'
              ? 'border-emerald-500/50 bg-[#081712]/95 text-emerald-100'
              : 'border-cyan-500/50 bg-[#08131a]/95 text-cyan-100'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-mono font-bold uppercase tracking-wider">{toast.title}</div>
            <button type="button" onClick={() => setToast(null)} className="text-xs opacity-60 hover:opacity-100">
              ✕
            </button>
          </div>
          <p className="mt-1 text-xs leading-relaxed opacity-90">{toast.body}</p>
        </div>
      )}

      {authModalMode && (
        <AuthModal
          initialMode={authModalMode}
          onClose={() => setAuthModalMode(null)}
          onSuccess={(u, t) => {
            setUser(u);
            setMyTeam(t);
            setAuthModalMode(null);
            loadAll().catch(() => {});
          }}
        />
      )}

      {selectedChallenge && (
        <ChallengeModal
          challenge={selectedChallenge}
          user={user}
          onClose={() => setSelectedChallengeId(null)}
          onSolvedOrUpdated={() => loadAll().catch(() => {})}
          onOpenAuth={() => setAuthModalMode('login')}
          onOpenToolkit={() => setToolkitOpen(true)}
        />
      )}

      {paletteOpen && (
        <CommandPalette
          challenges={challenges}
          onSelectChallenge={setSelectedChallengeId}
          onNavigate={setTab}
          onOpenToolkit={() => setToolkitOpen(true)}
          onClose={() => setPaletteOpen(false)}
        />
      )}

      {toolkitOpen && <ToolkitDrawer onClose={() => setToolkitOpen(false)} />}
    </div>
  );
}

export default App;
