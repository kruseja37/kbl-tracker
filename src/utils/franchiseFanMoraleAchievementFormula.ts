export const FRANCHISE_FAN_MORALE_ACHIEVEMENT_FORMULA_VERSION =
  'franchise-fan-morale-achievement-formula-v1';

export type FranchiseFanMoraleAchievementType = 'NO_HITTER' | 'PERFECT_GAME';
export type FranchiseFanMoraleAchievementOutcome =
  | 'no-hitter'
  | 'getting-no-hit'
  | 'perfect-game'
  | 'getting-perfect-gamed';

export interface FranchiseFanMoraleAchievementFameEvent {
  id?: string;
  eventType: string;
  playerId?: string;
  playerName?: string;
  playerTeam?: string;
}

export interface FranchiseFanMoraleAchievementGameInput {
  gameId: string;
  awayTeamId: string;
  homeTeamId: string;
  awayTeamName?: string;
  homeTeamName?: string;
  fameEvents?: FranchiseFanMoraleAchievementFameEvent[];
}

export interface FranchiseFanMoraleAchievementEffect {
  formulaVersion: typeof FRANCHISE_FAN_MORALE_ACHIEVEMENT_FORMULA_VERSION;
  gameId: string;
  achievementType: FranchiseFanMoraleAchievementType;
  outcome: FranchiseFanMoraleAchievementOutcome;
  teamId: string;
  teamName: string;
  opponentTeamId: string;
  opponentTeamName: string;
  delta: number;
  fameEventId: string;
  reason: string;
}

export interface FranchiseFanMoraleAchievementFormulaResult {
  formulaVersion: typeof FRANCHISE_FAN_MORALE_ACHIEVEMENT_FORMULA_VERSION;
  effects: FranchiseFanMoraleAchievementEffect[];
  blockers: string[];
  limitations: string[];
}

function teamName(teamId: string, name: string | undefined): string {
  return name?.trim() || teamId;
}

function achievementType(eventType: string): FranchiseFanMoraleAchievementType | null {
  if (eventType === 'PERFECT_GAME') return 'PERFECT_GAME';
  if (eventType === 'NO_HITTER') return 'NO_HITTER';
  return null;
}

function positiveOutcome(type: FranchiseFanMoraleAchievementType): FranchiseFanMoraleAchievementOutcome {
  return type === 'PERFECT_GAME' ? 'perfect-game' : 'no-hitter';
}

function negativeOutcome(type: FranchiseFanMoraleAchievementType): FranchiseFanMoraleAchievementOutcome {
  return type === 'PERFECT_GAME' ? 'getting-perfect-gamed' : 'getting-no-hit';
}

function positiveDelta(type: FranchiseFanMoraleAchievementType): number {
  return type === 'PERFECT_GAME' ? 7 : 5;
}

function reason(
  teamNameValue: string,
  outcome: FranchiseFanMoraleAchievementOutcome,
  delta: number,
  opponentName: string,
): string {
  const direction = delta > 0 ? '+' : '';
  return `${teamNameValue} ${outcome.replace(/-/g, ' ')} vs ${opponentName}: fan morale ${direction}${delta}.`;
}

export function buildFranchiseFanMoraleAchievementEffects(
  input: FranchiseFanMoraleAchievementGameInput,
): FranchiseFanMoraleAchievementFormulaResult {
  const awayTeamId = input.awayTeamId.trim();
  const homeTeamId = input.homeTeamId.trim();
  const blockers: string[] = [];
  const effects: FranchiseFanMoraleAchievementEffect[] = [];
  const emitted = new Set<string>();
  const limitations = [
    'V1 achievement formula supports archive-backed NO_HITTER and PERFECT_GAME fame events only.',
    'Walk-off, rivalry, playoff, expected-wins, relationship, and daily snapshot modifiers remain deferred.',
    'Returned effects are preview targets until the user confirms a durable random-event prompt.',
  ];

  if (!input.gameId.trim()) blockers.push('Game id is required for fan morale achievement formula.');
  if (!awayTeamId || !homeTeamId) {
    blockers.push('Both team ids are required for fan morale achievement formula.');
  }
  if (awayTeamId && homeTeamId && awayTeamId === homeTeamId) {
    blockers.push('Away and home team ids must be different for fan morale achievement formula.');
  }

  if (blockers.length > 0) {
    return {
      formulaVersion: FRANCHISE_FAN_MORALE_ACHIEVEMENT_FORMULA_VERSION,
      effects: [],
      blockers,
      limitations,
    };
  }

  const awayName = teamName(awayTeamId, input.awayTeamName);
  const homeName = teamName(homeTeamId, input.homeTeamName);
  const selectedEventsByTeam = new Map<string, {
    type: FranchiseFanMoraleAchievementType;
    event: FranchiseFanMoraleAchievementFameEvent;
    eventId: string;
  }>();
  for (const event of input.fameEvents ?? []) {
    const type = achievementType(event.eventType);
    const teamId = event.playerTeam?.trim();
    if (!type || !teamId) continue;
    if (teamId !== awayTeamId && teamId !== homeTeamId) {
      blockers.push(`Ignored achievement fame event ${event.id ?? event.eventType}: playerTeam does not match either game team.`);
      continue;
    }
    const eventId = event.id?.trim() || `${input.gameId}:${event.eventType}:${teamId}`;
    const previous = selectedEventsByTeam.get(teamId);
    if (!previous || (previous.type === 'NO_HITTER' && type === 'PERFECT_GAME')) {
      selectedEventsByTeam.set(teamId, { type, event, eventId });
    }
  }

  for (const { type, event, eventId } of selectedEventsByTeam.values()) {
    const teamId = event.playerTeam!.trim();
    const opponentTeamId = teamId === awayTeamId ? homeTeamId : awayTeamId;
    const teamNameValue = teamId === awayTeamId ? awayName : homeName;
    const opponentName = opponentTeamId === awayTeamId ? awayName : homeName;
    const positiveKey = `${type}:${teamId}:positive`;
    if (!emitted.has(positiveKey)) {
      emitted.add(positiveKey);
      const outcome = positiveOutcome(type);
      const delta = positiveDelta(type);
      effects.push({
        formulaVersion: FRANCHISE_FAN_MORALE_ACHIEVEMENT_FORMULA_VERSION,
        gameId: input.gameId,
        achievementType: type,
        outcome,
        teamId,
        teamName: teamNameValue,
        opponentTeamId,
        opponentTeamName: opponentName,
        delta,
        fameEventId: eventId,
        reason: reason(teamNameValue, outcome, delta, opponentName),
      });
    }

    const negativeKey = `${type}:${opponentTeamId}:negative`;
    if (!emitted.has(negativeKey)) {
      emitted.add(negativeKey);
      const outcome = negativeOutcome(type);
      const delta = -4;
      effects.push({
        formulaVersion: FRANCHISE_FAN_MORALE_ACHIEVEMENT_FORMULA_VERSION,
        gameId: input.gameId,
        achievementType: type,
        outcome,
        teamId: opponentTeamId,
        teamName: opponentName,
        opponentTeamId: teamId,
        opponentTeamName: teamNameValue,
        delta,
        fameEventId: eventId,
        reason: reason(opponentName, outcome, delta, teamNameValue),
      });
    }
  }

  return {
    formulaVersion: FRANCHISE_FAN_MORALE_ACHIEVEMENT_FORMULA_VERSION,
    effects,
    blockers,
    limitations,
  };
}
