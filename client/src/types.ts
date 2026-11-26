export interface User {
  id: number;
  username: string;
  email: string;
  role: 'player' | 'admin';
  department: string;
  roll_number: string;
  team_id: number | null;
  avatar_seed: string;
}

export interface TeamMember {
  id: number;
  username: string;
  department: string;
  roll_number: string;
  avatar_seed: string;
  solve_count?: number;
}

export interface Team {
  id: number;
  name: string;
  tag: string;
  department: string;
  motto: string;
  invite_code?: string;
  captain_id: number | null;
  banned: number;
  members?: TeamMember[];
}

export interface ChallengeArtifact {
  path: string;
  name: string;
  size: number;
  sha256: string;
}

export interface ChallengeHint {
  id: number;
  order_idx: number;
  cost: number;
  unlocked: boolean;
  content?: string;
}

export interface Challenge {
  id: number;
  slug: string;
  title: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Insane';
  description: string;
  author: string;
  points: number;
  initialPoints: number;
  minPoints: number;
  decay: number;
  isDynamic: boolean;
  firstBloodBonus: number;
  solveCount: number;
  firstBloodTeam: string | null;
  solvedByTeam: boolean;
  labType: 'none' | 'web' | 'pwn' | 'misc';
  labUrl: string;
  artifacts: ChallengeArtifact[];
  tags: string[];
  hints: ChallengeHint[];
  writeup: string | null;
  published: boolean;
}

export interface TeamStanding {
  rank: number;
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
}

export interface TimelineSeries {
  teamId: number;
  teamName: string;
  tag: string;
  finalScore: number;
  points: Array<{ time: string; score: number }>;
}

export interface TopPlayer {
  rank: number;
  userId: number;
  username: string;
  department: string;
  teamName: string;
  teamTag: string;
  solves: number;
  points: number;
  firstBloods: number;
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  severity: 'info' | 'warning' | 'critical' | 'first_blood';
  created_by: string;
  created_at: string;
}

export interface RecentSolve {
  id: number;
  challenge_id: number;
  challenge_title: string;
  category: string;
  team_id: number;
  team_name: string;
  team_tag: string;
  username: string;
  is_first_blood: number;
  bonus_points: number;
  solved_at: string;
}

export interface CompetitionOverview {
  settings: Record<string, string>;
  stats: {
    totalChallenges: number;
    totalTeams: number;
    totalPlayers: number;
    totalSolves: number;
    leader: TeamStanding | null;
  };
  categories: Array<{ category: string; count: number }>;
  recentSolves: RecentSolve[];
  announcements: Announcement[];
}
