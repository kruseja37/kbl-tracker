import type { MojoLevel } from '../../../engines/mojoEngine';
import type { FitnessState } from '../../../engines/fitnessEngine';
import type { RunnerBase } from '../components/RunnerPopover';

interface SelectedPlayerStateData {
  playerId: string;
  gameState: {
    currentMojo: MojoLevel;
  };
  fitnessProfile: {
    currentFitness: FitnessState;
  };
}

interface ResolvedRosterPlayerState {
  playerData?: SelectedPlayerStateData;
  rosterMojo?: MojoLevel;
  rosterFitness?: FitnessState;
}

export interface SelectedPlayerCardState {
  playerId: string;
  currentMojo?: MojoLevel;
  currentFitness?: FitnessState;
}

export interface SelectedLineupPlayerCard {
  name: string;
  type: 'batter' | 'pitcher';
  playerId: string;
  runnerBase?: RunnerBase;
}

export type LineupRunnerBases = Partial<
  Record<RunnerBase, { name?: string; playerId?: string }>
>;

export function findRunnerBaseForSelectedPlayer(
  runnersByBase: LineupRunnerBases,
  playerId: string,
  playerName?: string,
): RunnerBase | null {
  for (const base of ['first', 'second', 'third'] as const) {
    const runner = runnersByBase[base];
    if (!runner) continue;

    if (runner.playerId && playerId) {
      if (runner.playerId === playerId) {
        return base;
      }
      continue;
    }

    if (playerName && runner.name === playerName) {
      return base;
    }
  }

  return null;
}

export function buildSelectedLineupPlayerCard(params: {
  playerId: string;
  playerName: string;
  isPitcher: boolean;
  runnerBase?: RunnerBase;
}): SelectedLineupPlayerCard {
  return {
    name: params.playerName,
    type: params.isPitcher ? 'pitcher' : 'batter',
    playerId: params.playerId,
    runnerBase: params.runnerBase,
  };
}

export function resolveSelectedPlayerCardState(
  selectedPlayerId: string,
  resolved: ResolvedRosterPlayerState,
): SelectedPlayerCardState {
  return {
    playerId: resolved.playerData?.playerId ?? selectedPlayerId,
    currentMojo: resolved.playerData?.gameState.currentMojo ?? resolved.rosterMojo,
    currentFitness:
      resolved.playerData?.fitnessProfile.currentFitness ?? resolved.rosterFitness,
  };
}
