export type ManagerMode = "exhibition" | "elimination" | "franchise";

export interface ManagerStyleSnapshot {
  stealRate?: number;
  buntRate?: number;
  bullpenAggressiveness?: number;
  pinchHitRate?: number;
  pinchRunRate?: number;
  intentionalWalkRate?: number;
  defensiveSubRate?: number;
  label?: string;
}

export interface ManagerProfile {
  managerId: string;
  displayName: string;
  gender?: string;
  age?: number;
  hometown?: string;
  createdByUser: boolean;
  defaultManager: boolean;
  managementStyle?: ManagerStyleSnapshot;
}

export interface ManagerAssignment {
  managerId: string;
  teamId: string;
  mode: ManagerMode;
  instanceId: string;
  startDate?: string;
  endDate?: string;
  fired?: boolean;
}

export type ManagerDecisionType =
  | "lineup_construction"
  | "pitching_change"
  | "leave_pitcher_in"
  | "pinch_hitter"
  | "let_batter_hit"
  | "pinch_runner"
  | "defensive_sub"
  | "position_change"
  | "intentional_walk"
  | "steal_send"
  | "runner_hold"
  | "out_advancing_send"
  | "bunt_call"
  | "squeeze_call"
  | "hit_and_run"
  | "defensive_alignment"
  | "manual_note";

export type ManagerInferenceMethod =
  | "automatic"
  | "prompted"
  | "manual"
  | "passive";

export type ManagerDecisionSource =
  | "event_semantics"
  | "play_log_enhancement"
  | "user_action"
  | "situational_prompt"
  | "manual_edit";

export type ManagerDecisionConfidence = "high" | "medium" | "low";

export type ManagerRunnerIntent =
  | "manager_send"
  | "runner_choice"
  | "runner_responsibility"
  | "manager_hold";

export type ManagerBuntIntent =
  | "bunt_call"
  | "squeeze_call"
  | "ambiguous_bunt"
  | "not_squeeze";

export interface ManagerDecisionDerivation {
  derivedFromEventIds: string[];
  derivedFromFields: string[];
  manuallyPinned: boolean;
  stale: boolean;
}

export type ManagerDecisionResolutionEndpoint =
  | "same_event"
  | "next_pa"
  | "same_player_pa"
  | "runner_terminal"
  | "first_fielding_event"
  | "half_inning_end"
  | "game_end";

export interface ManagerDecisionResolutionWindow {
  status: "pending" | "resolved";
  startEventId: string;
  startEventIndex: number;
  startSnapshotSource: "pre_event" | "event_state" | "manual_snapshot";
  expectedEndpoint: ManagerDecisionResolutionEndpoint;
  trackedPlayerIds: string[];
  trackedRunnerIds: string[];
  maxEventIndex?: number;
}

export interface ManagerDecisionRecord {
  decisionId: string;
  gameId: string;
  managerId: string;
  teamId: string;
  opponentTeamId: string;
  decisionType: ManagerDecisionType;
  inferenceMethod: ManagerInferenceMethod;
  decisionSource: ManagerDecisionSource;
  confidence: ManagerDecisionConfidence;

  inning: number;
  half: "top" | "bottom";
  outs: number;
  baseState: string;
  scoreDifferentialForTeam: number;
  leverageIndex?: number;

  decisionEventId?: string;
  linkedEventIds: string[];
  involvedPlayerIds: string[];

  teamWinProbabilityBefore: number;
  teamWinProbabilityAfter?: number;
  managerWpa?: number;
  rawWindowWpa?: number;
  managerShare?: number;

  resolved: boolean;
  resolvedAtEventId?: string;
  resolutionWindow?: ManagerDecisionResolutionWindow;
  displayTitle: string;
  displaySummary: string;
  derivation: ManagerDecisionDerivation;
}

export interface ManagerLineupDeltaRecord {
  decisionId: string;
  gameId: string;
  managerId: string;
  teamId: string;
  decisionType: "lineup_construction";
  inferenceMethod: "automatic";
  confidence?: ManagerDecisionConfidence;

  starterPlayerId: string;
  starterPlayerName?: string;
  battingOrderSlot: number;
  defensivePosition: string;
  starterRole: "position_player" | "starting_pitcher" | "designated_hitter";

  actualPlayerKblWpa: number;
  replacementExpectedKblWpa: number;
  replacementBaselineSource?: "v1_zero_default";
  replacementBaselineConfidence?: "low";
  rawPerformanceDelta: number;
  managerShare: number;
  managerWpa: number;
}

export interface ManagerDecisionStandards {
  scheduledInnings: 5 | 6 | 7 | 9 | number;
  lateInningStart: number;
  finalPhaseStart: number;
  criticalLeverageIndex: number;
  lateLeverageIndex: number;
  starterFatigueWatchPitches: number;
  starterFatigueUrgentPitches: number;
  relieverFatigueWatchPitches: number;
  relieverFatigueUrgentPitches: number;
  runsAllowedInInningWatch: number;
  consecutiveBaserunnersWatch: number;
  consecutiveWalksWatch: number;
}
