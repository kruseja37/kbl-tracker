export const FRANCHISE_FAN_MORALE_GAME_RESULT_FORMULA_VERSION =
  'franchise-fan-morale-game-result-formula-v1';

export type FranchiseFanMoraleGameResultSource = 'gametracker-archive' | 'score-only';
export type FranchiseFanMoraleGameResultOutcome =
  | 'win'
  | 'loss'
  | 'shutout-win'
  | 'shutout-loss';

export interface FranchiseFanMoraleGameResultInput {
  source: FranchiseFanMoraleGameResultSource;
  gameId: string;
  awayTeamId: string;
  homeTeamId: string;
  awayTeamName?: string;
  homeTeamName?: string;
  awayScore: number;
  homeScore: number;
}

export interface FranchiseFanMoraleGameResultEffect {
  formulaVersion: typeof FRANCHISE_FAN_MORALE_GAME_RESULT_FORMULA_VERSION;
  source: FranchiseFanMoraleGameResultSource;
  gameId: string;
  teamId: string;
  teamName: string;
  opponentTeamId: string;
  opponentTeamName: string;
  outcome: FranchiseFanMoraleGameResultOutcome;
  delta: number;
  reason: string;
}

export interface FranchiseFanMoraleGameResultFormulaResult {
  formulaVersion: typeof FRANCHISE_FAN_MORALE_GAME_RESULT_FORMULA_VERSION;
  effects: FranchiseFanMoraleGameResultEffect[];
  blockers: string[];
  limitations: string[];
}

function teamName(teamId: string, name: string | undefined): string {
  return name?.trim() || teamId;
}

function isValidScore(score: number): boolean {
  return Number.isInteger(score) && score >= 0;
}

function effect(
  input: FranchiseFanMoraleGameResultInput,
  team: {
    teamId: string;
    teamName: string;
    opponentTeamId: string;
    opponentTeamName: string;
    outcome: FranchiseFanMoraleGameResultOutcome;
    delta: number;
  },
): FranchiseFanMoraleGameResultEffect {
  const direction = team.delta > 0 ? '+' : '';
  return {
    formulaVersion: FRANCHISE_FAN_MORALE_GAME_RESULT_FORMULA_VERSION,
    source: input.source,
    gameId: input.gameId,
    teamId: team.teamId,
    teamName: team.teamName,
    opponentTeamId: team.opponentTeamId,
    opponentTeamName: team.opponentTeamName,
    outcome: team.outcome,
    delta: team.delta,
    reason: `${team.teamName} ${team.outcome.replace('-', ' ')} vs ${team.opponentTeamName}: fan morale ${direction}${team.delta}.`,
  };
}

export function buildFranchiseFanMoraleGameResultEffects(
  input: FranchiseFanMoraleGameResultInput,
): FranchiseFanMoraleGameResultFormulaResult {
  const blockers: string[] = [];
  if (!input.gameId.trim()) blockers.push('Game id is required for fan morale game-result formula.');
  if (!input.awayTeamId.trim() || !input.homeTeamId.trim()) {
    blockers.push('Both team ids are required for fan morale game-result formula.');
  }
  if (input.awayTeamId === input.homeTeamId) {
    blockers.push('Away and home team ids must be different for fan morale game-result formula.');
  }
  if (!isValidScore(input.awayScore) || !isValidScore(input.homeScore)) {
    blockers.push('Non-negative integer final scores are required for fan morale game-result formula.');
  }
  if (input.awayScore === input.homeScore) {
    blockers.push('Tied results do not produce v1 fan morale game-result effects.');
  }

  const limitations = [
    'V1 game-result formula supports regular win/loss and shutout win/loss only.',
    'Blowout modifiers and streaks are handled by separate confirmation-gated fan morale prompt formulas.',
    'Walk-offs, no-hitters, rivals, playoff implications, and expected wins remain deferred.',
    'Returned effects are preview targets until the user confirms a durable random-event prompt.',
  ];

  if (blockers.length > 0) {
    return {
      formulaVersion: FRANCHISE_FAN_MORALE_GAME_RESULT_FORMULA_VERSION,
      effects: [],
      blockers,
      limitations,
    };
  }

  const awayName = teamName(input.awayTeamId, input.awayTeamName);
  const homeName = teamName(input.homeTeamId, input.homeTeamName);
  const awayWon = input.awayScore > input.homeScore;
  const shutout = Math.min(input.awayScore, input.homeScore) === 0;
  const winner = awayWon
    ? { id: input.awayTeamId, name: awayName, opponentId: input.homeTeamId, opponentName: homeName }
    : { id: input.homeTeamId, name: homeName, opponentId: input.awayTeamId, opponentName: awayName };
  const loser = awayWon
    ? { id: input.homeTeamId, name: homeName, opponentId: input.awayTeamId, opponentName: awayName }
    : { id: input.awayTeamId, name: awayName, opponentId: input.homeTeamId, opponentName: homeName };

  return {
    formulaVersion: FRANCHISE_FAN_MORALE_GAME_RESULT_FORMULA_VERSION,
    effects: [
      effect(input, {
        teamId: winner.id,
        teamName: winner.name,
        opponentTeamId: winner.opponentId,
        opponentTeamName: winner.opponentName,
        outcome: shutout ? 'shutout-win' : 'win',
        delta: shutout ? 2 : 1,
      }),
      effect(input, {
        teamId: loser.id,
        teamName: loser.name,
        opponentTeamId: loser.opponentId,
        opponentTeamName: loser.opponentName,
        outcome: shutout ? 'shutout-loss' : 'loss',
        delta: shutout ? -2 : -1,
      }),
    ],
    blockers: [],
    limitations,
  };
}
