export const FRANCHISE_FAN_MORALE_BLOWOUT_FORMULA_VERSION =
  'franchise-fan-morale-blowout-formula-v1';

export const FRANCHISE_FAN_MORALE_BLOWOUT_RUN_DIFFERENTIAL = 7;

export type FranchiseFanMoraleBlowoutSource = 'gametracker-archive' | 'score-only';
export type FranchiseFanMoraleBlowoutOutcome = 'blowout-win' | 'blowout-loss';

export interface FranchiseFanMoraleBlowoutInput {
  source: FranchiseFanMoraleBlowoutSource;
  gameId: string;
  awayTeamId: string;
  homeTeamId: string;
  awayTeamName?: string;
  homeTeamName?: string;
  awayScore: number;
  homeScore: number;
}

export interface FranchiseFanMoraleBlowoutEffect {
  formulaVersion: typeof FRANCHISE_FAN_MORALE_BLOWOUT_FORMULA_VERSION;
  source: FranchiseFanMoraleBlowoutSource;
  gameId: string;
  teamId: string;
  teamName: string;
  opponentTeamId: string;
  opponentTeamName: string;
  outcome: FranchiseFanMoraleBlowoutOutcome;
  runDifferential: number;
  delta: number;
  reason: string;
}

export interface FranchiseFanMoraleBlowoutFormulaResult {
  formulaVersion: typeof FRANCHISE_FAN_MORALE_BLOWOUT_FORMULA_VERSION;
  effects: FranchiseFanMoraleBlowoutEffect[];
  blockers: string[];
  limitations: string[];
}

function teamName(teamId: string, name: string | undefined): string {
  return name?.trim() || teamId;
}

function validScore(score: number): boolean {
  return Number.isInteger(score) && score >= 0;
}

function effect(
  input: FranchiseFanMoraleBlowoutInput,
  team: {
    teamId: string;
    teamName: string;
    opponentTeamId: string;
    opponentTeamName: string;
    outcome: FranchiseFanMoraleBlowoutOutcome;
    runDifferential: number;
    delta: number;
  },
): FranchiseFanMoraleBlowoutEffect {
  const direction = team.delta > 0 ? '+' : '';
  return {
    formulaVersion: FRANCHISE_FAN_MORALE_BLOWOUT_FORMULA_VERSION,
    source: input.source,
    gameId: input.gameId,
    teamId: team.teamId,
    teamName: team.teamName,
    opponentTeamId: team.opponentTeamId,
    opponentTeamName: team.opponentTeamName,
    outcome: team.outcome,
    runDifferential: team.runDifferential,
    delta: team.delta,
    reason: `${team.teamName} ${team.outcome.replace('-', ' ')} by ${team.runDifferential} vs ${team.opponentTeamName}: fan morale ${direction}${team.delta}.`,
  };
}

export function buildFranchiseFanMoraleBlowoutEffects(
  input: FranchiseFanMoraleBlowoutInput,
): FranchiseFanMoraleBlowoutFormulaResult {
  const awayTeamId = input.awayTeamId.trim();
  const homeTeamId = input.homeTeamId.trim();
  const blockers: string[] = [];
  if (!input.gameId.trim()) blockers.push('Game id is required for fan morale blowout formula.');
  if (!awayTeamId || !homeTeamId) {
    blockers.push('Both team ids are required for fan morale blowout formula.');
  }
  if (awayTeamId && homeTeamId && awayTeamId === homeTeamId) {
    blockers.push('Away and home team ids must be different for fan morale blowout formula.');
  }
  if (!validScore(input.awayScore) || !validScore(input.homeScore)) {
    blockers.push('Non-negative integer final scores are required for fan morale blowout formula.');
  }
  if (input.awayScore === input.homeScore) {
    blockers.push('Tied results do not produce v1 fan morale blowout effects.');
  }

  const limitations = [
    'V1 blowout formula supports 7+ run differential team fan morale modifiers only.',
    'No-hitter and perfect-game achievements are handled by a separate confirmation-gated fan morale prompt formula.',
    'Rival, playoff, comeback, walk-off, expected-wins, and daily snapshot modifiers remain deferred.',
    'Returned effects are preview targets until the user confirms a durable random-event prompt.',
  ];

  if (blockers.length > 0) {
    return {
      formulaVersion: FRANCHISE_FAN_MORALE_BLOWOUT_FORMULA_VERSION,
      effects: [],
      blockers,
      limitations,
    };
  }

  const runDifferential = Math.abs(input.awayScore - input.homeScore);
  if (runDifferential < FRANCHISE_FAN_MORALE_BLOWOUT_RUN_DIFFERENTIAL) {
    return {
      formulaVersion: FRANCHISE_FAN_MORALE_BLOWOUT_FORMULA_VERSION,
      effects: [],
      blockers: [`Run differential ${runDifferential} is below the ${FRANCHISE_FAN_MORALE_BLOWOUT_RUN_DIFFERENTIAL}-run blowout threshold.`],
      limitations,
    };
  }

  const awayName = teamName(awayTeamId, input.awayTeamName);
  const homeName = teamName(homeTeamId, input.homeTeamName);
  const awayWon = input.awayScore > input.homeScore;
  const winner = awayWon
    ? { id: awayTeamId, name: awayName, opponentId: homeTeamId, opponentName: homeName }
    : { id: homeTeamId, name: homeName, opponentId: awayTeamId, opponentName: awayName };
  const loser = awayWon
    ? { id: homeTeamId, name: homeName, opponentId: awayTeamId, opponentName: awayName }
    : { id: awayTeamId, name: awayName, opponentId: homeTeamId, opponentName: homeName };

  return {
    formulaVersion: FRANCHISE_FAN_MORALE_BLOWOUT_FORMULA_VERSION,
    effects: [
      effect(input, {
        teamId: winner.id,
        teamName: winner.name,
        opponentTeamId: winner.opponentId,
        opponentTeamName: winner.opponentName,
        outcome: 'blowout-win',
        runDifferential,
        delta: 1,
      }),
      effect(input, {
        teamId: loser.id,
        teamName: loser.name,
        opponentTeamId: loser.opponentId,
        opponentTeamName: loser.opponentName,
        outcome: 'blowout-loss',
        runDifferential,
        delta: -1,
      }),
    ],
    blockers: [],
    limitations,
  };
}
