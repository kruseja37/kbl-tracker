export type GameTrackerSubstitutionType =
  | "player_sub"
  | "pinch_hit"
  | "pinch_run"
  | "defensive_sub"
  | "position_switch"
  | "double_switch";

export function normalizeLiveSubstitutionType(input: {
  requestedSubType?: GameTrackerSubstitutionType;
  lineupPlayerId: string;
  currentBatterId?: string | null;
  gamePhase?: string;
  isPinchHitter?: boolean;
}): GameTrackerSubstitutionType {
  const requestedSubType = input.requestedSubType ?? "player_sub";
  const replacesCurrentBatter =
    Boolean(input.currentBatterId) &&
    input.lineupPlayerId === input.currentBatterId;

  if (
    input.gamePhase === "LIVE" &&
    requestedSubType === "player_sub" &&
    (input.isPinchHitter || replacesCurrentBatter)
  ) {
    return "pinch_hit";
  }

  return requestedSubType;
}
