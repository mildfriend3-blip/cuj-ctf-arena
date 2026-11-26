import { db, getAllSettings } from './db.js';

export function calculateDynamicPoints(
  initialPoints: number,
  minPoints: number,
  decay: number,
  solveCount: number,
  isDynamic: boolean,
  globalDynamic = true
): number {
  if (!isDynamic || !globalDynamic) {
    return initialPoints;
  }
  const effectiveSolves = Math.max(0, solveCount - 1);
  const ratio = Math.min(1, effectiveSolves / Math.max(1, decay));
  const value = Math.ceil(minPoints + (initialPoints - minPoints) * (1 - ratio * ratio));
  return Math.max(minPoints, value);
}

interface ChallengeScoreRow {
  id: number;
  slug: string;
  title: string;
  category: string;
  difficulty: string;
  initial_points: number;
  min_points: number;
  decay: number;
  is_dynamic: number;
  published: number;
}

interface SolveRow {
  id: number;
  challenge_id: number;
  team_id: number;
  user_id: number;
  is_first_blood: number;
  bonus_points: number;
  solved_at: string;
}

interface TeamRow {
  id: number;
  name: string;
  tag: string;
  department: string;
  motto: string;
  banned: number;
  created_at: string;
}

export function getChallengePointMap(includeFrozenSolves: boolean) {
  const settings = getAllSettings();
  const frozen = settings.scoreboard_frozen === '1';
  const freezeAt = settings.freeze_at || '';
  const globalDynamic = settings.dynamic_scoring !== '0';

  const challenges = db
    .prepare('SELECT id, slug, title, category, difficulty, initial_points, min_points, decay, is_dynamic, published FROM challenges')
    .all() as unknown as ChallengeScoreRow[];

  let solves = db
    .prepare(
      `SELECT s.id, s.challenge_id, s.team_id, s.user_id, s.is_first_blood, s.bonus_points, s.solved_at
       FROM solves s
       JOIN teams t ON t.id = s.team_id
       WHERE t.banned = 0
       ORDER BY s.solved_at ASC, s.id ASC`
    )
    .all() as unknown as SolveRow[];

  if (!includeFrozenSolves && frozen && freezeAt) {
    solves = solves.filter((s) => s.solved_at <= freezeAt);
  }

  const solveCounts = new Map<number, number>();
  const firstBloodByChallenge = new Map<number, { team_id: number; user_id: number; solved_at: string }>();

  for (const s of solves) {
    solveCounts.set(s.challenge_id, (solveCounts.get(s.challenge_id) || 0) + 1);
    if (!firstBloodByChallenge.has(s.challenge_id)) {
      firstBloodByChallenge.set(s.challenge_id, {
        team_id: s.team_id,
        user_id: s.user_id,
        solved_at: s.solved_at,
      });
    }
  }

  const pointsMap = new Map<number, number>();
  for (const c of challenges) {
    const count = solveCounts.get(c.id) || 0;
    pointsMap.set(
      c.id,
      calculateDynamicPoints(c.initial_points, c.min_points, c.decay, count, c.is_dynamic === 1, globalDynamic)
    );
  }

  return { challenges, solves, solveCounts, firstBloodByChallenge, pointsMap, frozen, freezeAt };
}

export function getScoreboardData(isAdminView = false) {
  const { challenges, solves, pointsMap, frozen, freezeAt } = getChallengePointMap(isAdminView);
  const challengeMap = new Map(challenges.map((c) => [c.id, c]));

  const teams = db
    .prepare('SELECT id, name, tag, department, motto, banned, created_at FROM teams WHERE banned = 0')
    .all() as unknown as TeamRow[];

  const membersCountRows = db
    .prepare('SELECT team_id, COUNT(*) as cnt FROM users WHERE team_id IS NOT NULL GROUP BY team_id')
    .all() as Array<{ team_id: number; cnt: number }>;
  const membersCount = new Map(membersCountRows.map((r) => [r.team_id, r.cnt]));

  const hintCosts = db
    .prepare('SELECT team_id, SUM(cost_paid) as total_cost FROM hint_unlocks GROUP BY team_id')
    .all() as Array<{ team_id: number; total_cost: number }>;
  const hintCostMap = new Map(hintCosts.map((r) => [r.team_id, r.total_cost || 0]));

  const teamBuckets = new Map<
    number,
    {
      id: number;
      name: string;
      tag: string;
      department: string;
      motto: string;
      memberCount: number;
      score: number;
      hintPenalty: number;
      solveCount: number;
      firstBloods: number;
      lastSolveAt: string | null;
      categoryScores: Record<string, number>;
      solvedChallenges: Array<{ challengeId: number; title: string; category: string; points: number; isFirstBlood: boolean; solvedAt: string }>;
    }
  >();

  for (const t of teams) {
    const penalty = hintCostMap.get(t.id) || 0;
    teamBuckets.set(t.id, {
      id: t.id,
      name: t.name,
      tag: t.tag,
      department: t.department,
      motto: t.motto,
      memberCount: membersCount.get(t.id) || 0,
      score: 0,
      hintPenalty: penalty,
      solveCount: 0,
      firstBloods: 0,
      lastSolveAt: null,
      categoryScores: {},
      solvedChallenges: [],
    });
  }

  for (const s of solves) {
    const team = teamBuckets.get(s.team_id);
    const ch = challengeMap.get(s.challenge_id);
    if (!team || !ch) continue;
    const basePts = pointsMap.get(ch.id) || ch.initial_points;
    const totalEarned = basePts + (s.bonus_points || 0);
    team.score += totalEarned;
    team.solveCount += 1;
    if (s.is_first_blood) team.firstBloods += 1;
    if (!team.lastSolveAt || s.solved_at > team.lastSolveAt) {
      team.lastSolveAt = s.solved_at;
    }
    team.categoryScores[ch.category] = (team.categoryScores[ch.category] || 0) + totalEarned;
    team.solvedChallenges.push({
      challengeId: ch.id,
      title: ch.title,
      category: ch.category,
      points: totalEarned,
      isFirstBlood: s.is_first_blood === 1,
      solvedAt: s.solved_at,
    });
  }

  for (const team of teamBuckets.values()) {
    team.score = Math.max(0, team.score - team.hintPenalty);
  }

  const standings = Array.from(teamBuckets.values())
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.solveCount !== a.solveCount) return b.solveCount - a.solveCount;
      if (a.lastSolveAt && b.lastSolveAt) {
        if (a.lastSolveAt !== b.lastSolveAt) return a.lastSolveAt < b.lastSolveAt ? -1 : 1;
      } else if (a.lastSolveAt || b.lastSolveAt) {
        return a.lastSolveAt ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    })
    .map((team, idx) => ({ ...team, rank: idx + 1 }));

  // Build score progression series for top 8 teams
  const topTeams = standings.slice(0, 8);
  const topIds = new Set(topTeams.map((t) => t.id));
  const seriesMap = new Map<number, Array<{ time: string; score: number }>>();
  const runningScore = new Map<number, number>();
  for (const t of topTeams) {
    seriesMap.set(t.id, []);
    runningScore.set(t.id, 0);
  }

  for (const s of solves) {
    if (!topIds.has(s.team_id)) continue;
    const ch = challengeMap.get(s.challenge_id);
    if (!ch) continue;
    const pts = (pointsMap.get(ch.id) || ch.initial_points) + (s.bonus_points || 0);
    const nextScore = (runningScore.get(s.team_id) || 0) + pts;
    runningScore.set(s.team_id, nextScore);
    seriesMap.get(s.team_id)?.push({ time: s.solved_at, score: nextScore });
  }

  const timeline = topTeams.map((t) => ({
    teamId: t.id,
    teamName: t.name,
    tag: t.tag,
    finalScore: t.score,
    points: seriesMap.get(t.id) || [],
  }));

  // Individual MVP solvers
  const userRows = db
    .prepare(
      `SELECT u.id, u.username, u.department, t.name as team_name, t.tag as team_tag
       FROM users u
       LEFT JOIN teams t ON t.id = u.team_id
       WHERE u.role = 'player'`
    )
    .all() as Array<{ id: number; username: string; department: string; team_name: string | null; team_tag: string | null }>;
  const userMap = new Map(userRows.map((u) => [u.id, u]));
  const userStats = new Map<number, { solves: number; points: number; firstBloods: number }>();

  for (const s of solves) {
    const ch = challengeMap.get(s.challenge_id);
    if (!ch) continue;
    const pts = (pointsMap.get(ch.id) || ch.initial_points) + (s.bonus_points || 0);
    const curr = userStats.get(s.user_id) || { solves: 0, points: 0, firstBloods: 0 };
    curr.solves += 1;
    curr.points += pts;
    if (s.is_first_blood) curr.firstBloods += 1;
    userStats.set(s.user_id, curr);
  }

  const topPlayers = Array.from(userStats.entries())
    .map(([uid, st]) => {
      const u = userMap.get(uid);
      return {
        userId: uid,
        username: u?.username || 'Unknown',
        department: u?.department || 'CUJ',
        teamName: u?.team_name || 'Solo',
        teamTag: u?.team_tag || '',
        solves: st.solves,
        points: st.points,
        firstBloods: st.firstBloods,
      };
    })
    .sort((a, b) => b.points - a.points || b.solves - a.solves)
    .slice(0, 15)
    .map((p, i) => ({ ...p, rank: i + 1 }));

  return {
    frozen: frozen && !isAdminView,
    freezeAt,
    standings,
    timeline,
    topPlayers,
  };
}
