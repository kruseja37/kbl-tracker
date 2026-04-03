import type { MojoLevel } from '../../../engines/mojoEngine';
import type { FitnessState } from '../../../engines/fitnessEngine';

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
