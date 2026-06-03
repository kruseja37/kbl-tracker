export const FRANCHISE_FAN_MORALE_STREAK_FORMULA_VERSION =
  'franchise-fan-morale-streak-formula-v1';

export type FranchiseFanMoraleStreakSource = 'gametracker-archive' | 'score-only';
export type FranchiseFanMoraleStreakType =
  | 'win-streak-3'
  | 'win-streak-5'
  | 'win-streak-7'
  | 'loss-streak-3'
  | 'loss-streak-5'
  | 'loss-streak-7'
  | 'loss-streak-broken'
  | 'win-streak-broken';

export interface FranchiseFanMoraleStreakGameEvidence {
  evidenceId: string;
  source: FranchiseFanMoraleStreakSource;
  order: number;
  awayTeamId: string;
  homeTeamId: string;
  awayTeamName?: string;
  homeTeamName?: string;
  awayScore: number;
  homeScore: number;
}

export interface FranchiseFanMoraleStreakEffect {
  formulaVersion: typeof FRANCHISE_FAN_MORALE_STREAK_FORMULA_VERSION;
  type: FranchiseFanMoraleStreakType;
  teamId: string;
  teamName: string;
  delta: number;
  streakLength: number;
  evidenceGameId: string;
  source: FranchiseFanMoraleStreakSource;
  reason: string;
}

export interface FranchiseFanMoraleStreakFormulaResult {
  formulaVersion: typeof FRANCHISE_FAN_MORALE_STREAK_FORMULA_VERSION;
  effects: FranchiseFanMoraleStreakEffect[];
  blockers: string[];
  limitations: string[];
}

type StreakKind = 'win' | 'loss';

interface TeamState {
  teamId: string;
  teamName: string;
  currentKind: StreakKind | null;
  currentLength: number;
}

function teamName(teamId: string, name: string | undefined): string {
  return name?.trim() || teamId;
}

function validScore(score: number): boolean {
  return Number.isInteger(score) && score >= 0;
}

function streakMilestone(kind: StreakKind, length: number): { type: FranchiseFanMoraleStreakType; delta: number } | null {
  if (kind === 'win') {
    if (length === 3) return { type: 'win-streak-3', delta: 2 };
    if (length === 5) return { type: 'win-streak-5', delta: 5 };
    if (length === 7) return { type: 'win-streak-7', delta: 8 };
    return null;
  }
  if (length === 3) return { type: 'loss-streak-3', delta: -2 };
  if (length === 5) return { type: 'loss-streak-5', delta: -5 };
  if (length === 7) return { type: 'loss-streak-7', delta: -10 };
  return null;
}

function brokenStreak(previousKind: StreakKind | null, previousLength: number): { type: FranchiseFanMoraleStreakType; delta: number } | null {
  if (previousKind === 'loss' && previousLength >= 5) return { type: 'loss-streak-broken', delta: 4 };
  if (previousKind === 'win' && previousLength >= 5) return { type: 'win-streak-broken', delta: -3 };
  return null;
}

function reason(type: FranchiseFanMoraleStreakType, teamNameValue: string, length: number, delta: number): string {
  const direction = delta > 0 ? '+' : '';
  switch (type) {
    case 'win-streak-3':
      return `${teamNameValue} reaches a 3-game winning streak: fan morale ${direction}${delta}.`;
    case 'win-streak-5':
      return `${teamNameValue} reaches a 5-game winning streak: fan morale ${direction}${delta}.`;
    case 'win-streak-7':
      return `${teamNameValue} reaches a 7+ game winning streak: fan morale ${direction}${delta}.`;
    case 'loss-streak-3':
      return `${teamNameValue} reaches a 3-game losing streak: fan morale ${direction}${delta}.`;
    case 'loss-streak-5':
      return `${teamNameValue} reaches a 5-game losing streak: fan morale ${direction}${delta}.`;
    case 'loss-streak-7':
      return `${teamNameValue} reaches a 7+ game losing streak: fan morale ${direction}${delta}.`;
    case 'loss-streak-broken':
      return `${teamNameValue} snaps a ${length}-game losing streak: fan morale ${direction}${delta}.`;
    case 'win-streak-broken':
      return `${teamNameValue} loses after a ${length}-game winning streak: fan morale ${direction}${delta}.`;
  }
}

function pushEffect(
  effects: FranchiseFanMoraleStreakEffect[],
  state: TeamState,
  marker: { type: FranchiseFanMoraleStreakType; delta: number },
  game: FranchiseFanMoraleStreakGameEvidence,
  length: number,
): void {
  effects.push({
    formulaVersion: FRANCHISE_FAN_MORALE_STREAK_FORMULA_VERSION,
    type: marker.type,
    teamId: state.teamId,
    teamName: state.teamName,
    delta: marker.delta,
    streakLength: length,
    evidenceGameId: game.evidenceId,
    source: game.source,
    reason: reason(marker.type, state.teamName, length, marker.delta),
  });
}

function getState(states: Map<string, TeamState>, teamId: string, name: string | undefined): TeamState {
  const existing = states.get(teamId);
  if (existing) return existing;
  const created: TeamState = {
    teamId,
    teamName: teamName(teamId, name),
    currentKind: null,
    currentLength: 0,
  };
  states.set(teamId, created);
  return created;
}

function applyResult(
  effects: FranchiseFanMoraleStreakEffect[],
  state: TeamState,
  kind: StreakKind,
  game: FranchiseFanMoraleStreakGameEvidence,
): void {
  const priorKind = state.currentKind;
  const priorLength = state.currentLength;
  if (priorKind && priorKind !== kind) {
    const broken = brokenStreak(priorKind, priorLength);
    if (broken) pushEffect(effects, state, broken, game, priorLength);
  }
  if (priorKind === kind) {
    state.currentLength += 1;
  } else {
    state.currentKind = kind;
    state.currentLength = 1;
  }
  const milestone = streakMilestone(kind, state.currentLength);
  if (milestone) pushEffect(effects, state, milestone, game, state.currentLength);
}

export function buildFranchiseFanMoraleStreakEffects(
  games: FranchiseFanMoraleStreakGameEvidence[],
): FranchiseFanMoraleStreakFormulaResult {
  const limitations = [
    'V1 streak formula supports win/loss streak milestones and 5+ streak breaks only.',
    'Rival, playoff, expected-wins, player morale, and daily snapshot modifiers remain deferred.',
    'Returned effects are preview targets until the user confirms a durable random-event prompt.',
  ];
  const blockers: string[] = [];
  const effects: FranchiseFanMoraleStreakEffect[] = [];
  const states = new Map<string, TeamState>();
  const ordered = [...games].sort((left, right) =>
    left.order - right.order ||
    left.evidenceId.localeCompare(right.evidenceId),
  );

  for (const game of ordered) {
    const awayTeamId = game.awayTeamId.trim();
    const homeTeamId = game.homeTeamId.trim();
    const invalid = !game.evidenceId.trim() ||
      !awayTeamId ||
      !homeTeamId ||
      awayTeamId === homeTeamId ||
      !validScore(game.awayScore) ||
      !validScore(game.homeScore) ||
      game.awayScore === game.homeScore;
    if (invalid) {
      blockers.push(`Ignored invalid or tied streak evidence row: ${game.evidenceId || 'missing-id'}.`);
      continue;
    }

    const awayWon = game.awayScore > game.homeScore;
    const away = getState(states, awayTeamId, game.awayTeamName);
    const home = getState(states, homeTeamId, game.homeTeamName);
    applyResult(effects, away, awayWon ? 'win' : 'loss', game);
    applyResult(effects, home, awayWon ? 'loss' : 'win', game);
  }

  return {
    formulaVersion: FRANCHISE_FAN_MORALE_STREAK_FORMULA_VERSION,
    effects,
    blockers,
    limitations,
  };
}
