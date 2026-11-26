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

export async function getChallengePointMap(includeFrozenSolves: boolean) {
  const settings = await getAllSettings();
  const frozen = settings.scoreboard_frozen === '1';
  const freezeAt = settings.freeze_at || '';
  const globalDynamic = settings.dynamic_scoring !== '0';

  const challenges = await db.all<ChallengeScoreRow>(
    'SELECT id, slug, title, category, difficulty, initial_points, min_points, decay, is_dynamic, published FROM challenges'
  );

  let solves = await db.all<SolveRow>(
    `SELECT s.id, s.challenge_id, s.team_id, s.user_id, s.is_first_blood, s.bonus_points, s.solved_at
     FROM solves s
     JOIN teams t ON t.id = s.team_id
     WHERE t.banned = 0
     ORDER BY s.solved_at ASC, s.id ASC`
  );

  if (!includeFrozenSolves && frozen && freezeAt) {
    solves = solves.filter((s) => s.solved_at <= freezeAt);
  }

  const solveCounts = new Map<number, number>();
  const firstBloodByChallenge = new Map<number, { team_id: number; user_id: number; solved_at: string }>();

  for (const s of solves) {
    const chId = Number(s.challenge_id);
    solveCounts.set(chId, (solveCounts.get(chId) || 0) + 1);
    if (!firstBloodByChallenge.has(chId)) {
      firstBloodByChallenge.set(chId, {
        team_id: Number(s.team_id),
        user_id: Number(s.user_id),
        solved_at: String(s.solved_at),
      });
    }
  }

  const pointsMap = new Map<number, number>();
  for (const c of challenges) {
    const id = Number(c.id);
    const count = solveCounts.get(id) || 0;
    pointsMap.set(
      id,
      calculateDynamicPoints(
        Number(c.initial_points),
        Number(c.min_points),
        Number(c.decay),
        count,
        Number(c.is_dynamic) === 1,
        globalDynamic
      )
    );
  }

  return { challenges, solves, solveCounts, firstBloodByChallenge, pointsMap, frozen, freezeAt };
}

export async function getScoreboardData(isAdminView = false) {
  const { challenges, solves, pointsMap, frozen, freezeAt } = await getChallengePointMap(isAdminView);
  const challengeMap = new Map(challenges.map((c) => [Number(c.id), c]));

  const teams = await db.all<TeamRow>(
    'SELECT id, name, tag, department, motto, banned, created_at FROM teams WHERE banned = 0'
  );

  const membersCountRows = await db.all<{ team_id: number; cnt: number }>(
    'SELECT team_id, COUNT(*) as cnt FROM users WHERE team_id IS NOT NULL GROUP BY team_id'
  );
  const membersCount = new Map(membersCountRows.map((r) => [Number(r.team_id), Number(r.cnt)]));

  const hintCosts = await db.all<{ team_id: number; total_cost: number }>(
    'SELECT team_id, SUM(cost_paid) as total_cost FROM hint_unlocks GROUP BY team_id'
  );
  const hintCostMap = new Map(hintCosts.map((r) => [Number(r.team_id), Number(r.total_cost || 0)]));

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
      solvedChallenges: Array<{
        challengeId: number;
        title: string;
        category: string;
        points: number;
        isFirstBlood: boolean;
        solvedAt: string;
      }>;
    }
  >();

  for (const t of teams) {
    const id = Number(t.id);
    const penalty = hintCostMap.get(id) || 0;
    teamBuckets.set(id, {
      id,
      name: t.name,
      tag: t.tag,
      department: t.department,
      motto: t.motto,
      memberCount: membersCount.get(id) || 0,
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
    const team = teamBuckets.get(Number(s.team_id));
    const ch = challengeMap.get(Number(s.challenge_id));
    if (!team || !ch) continue;
    const chId = Number(ch.id);
    const basePts = pointsMap.get(chId) || Number(ch.initial_points);
    const totalEarned = basePts + Number(s.bonus_points || 0);
    team.score += totalEarned;
    team.solveCount += 1;
    if (Number(s.is_first_blood) === 1) team.firstBloods += 1;
    if (!team.lastSolveAt || s.solved_at > team.lastSolveAt) {
      team.lastSolveAt = s.solved_at;
    }
    team.categoryScores[ch.category] = (team.categoryScores[ch.category] || 0) + totalEarned;
    team.solvedChallenges.push({
      challengeId: chId,
      title: ch.title,
      category: ch.category,
      points: totalEarned,
      isFirstBlood: Number(s.is_first_blood) === 1,
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

  const topTeams = standings.slice(0, 8);
  const topIds = new Set(topTeams.map((t) => t.id));
  const seriesMap = new Map<number, Array<{ time: string; score: number }>>();
  const runningScore = new Map<number, number>();
  for (const t of topTeams) {
    seriesMap.set(t.id, []);
    runningScore.set(t.id, 0);
  }

  for (const s of solves) {
    const tId = Number(s.team_id);
    if (!topIds.has(tId)) continue;
    const ch = challengeMap.get(Number(s.challenge_id));
    if (!ch) continue;
    const pts = (pointsMap.get(Number(ch.id)) || Number(ch.initial_points)) + Number(s.bonus_points || 0);
    const nextScore = (runningScore.get(tId) || 0) + pts;
    runningScore.set(tId, nextScore);
    seriesMap.get(tId)?.push({ time: s.solved_at, score: nextScore });
  }

  const timeline = topTeams.map((t) => ({
    teamId: t.id,
    teamName: t.name,
    tag: t.tag,
    finalScore: t.score,
    points: seriesMap.get(t.id) || [],
  }));

  const userRows = await db.all<{
    id: number;
    username: string;
    department: string;
    team_name: string | null;
    team_tag: string | null;
  }>(
    `SELECT u.id, u.username, u.department, t.name as team_name, t.tag as team_tag
     FROM users u
     LEFT JOIN teams t ON t.id = u.team_id
     WHERE u.role = 'player'`
  );
  const userMap = new Map(userRows.map((u) => [Number(u.id), u]));
  const userStats = new Map<number, { solves: number; points: number; firstBloods: number }>();

  for (const s of solves) {
    const ch = challengeMap.get(Number(s.challenge_id));
    if (!ch) continue;
    const uId = Number(s.user_id);
    const pts = (pointsMap.get(Number(ch.id)) || Number(ch.initial_points)) + Number(s.bonus_points || 0);
    const curr = userStats.get(uId) || { solves: 0, points: 0, firstBloods: 0 };
    curr.solves += 1;
    curr.points += pts;
    if (Number(s.is_first_blood) === 1) curr.firstBloods += 1;
    userStats.set(uId, curr);
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
