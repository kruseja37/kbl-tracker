export type ManagerMode = "exhibition" | "elimination" | "franchise";

export type OpposingPitcherHand = "R" | "L";

export type OptimalLineupModeContext =
  | "exhibition"
  | "elimination"
  | "franchise";

export type OptimalLineupSourceConfidence =
  | "engine_calculated"
  | "user_registered"
  | "user_confirmed_engine"
  | "stale_roster"
  | "fallback";

export type OptimalLineupGeneratedFrom =
  | "league_builder"
  | "team_hub"
  | "pregame_recalculate"
  | "user_registered_smb4_optimal"
  | "game_lock";

export interface OptimalLineupSlot {
  playerId: string;
  playerName: string;
  battingOrderSlot: number;
  defensivePosition: string;
  projectedSlotKblWpa: number;
  projectedValueScore: number;
  positionalFitScore: number;
  confidence: ManagerDecisionConfidence;
}

export interface OptimalLineupSnapshot {
  snapshotId: string;
  teamId: string;
  mode: OptimalLineupModeContext;
  instanceId?: string;
  opposingPitcherHand: OpposingPitcherHand;
  rosterVersionId?: string;
  algorithmVersion: string;
  generatedAt: number;
  generatedFrom: OptimalLineupGeneratedFrom;
  sourceConfidence: OptimalLineupSourceConfidence;
  dhEnabled?: boolean;
  slots: OptimalLineupSlot[];
  projectedTeamLineupKblWpa: number;
  confidence: ManagerDecisionConfidence;
}

export interface GameLockLineupSnapshots {
  away?: OptimalLineupSnapshot;
  home?: OptimalLineupSnapshot;
}

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
  | "keep_defender_in"
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

export type ManagerDecisionHorizon =
  | "single_play"
  | "matchup"
  | "inning_consequence"
  | "personnel_stint"
  | "lineup_baseline";

export type ManagerDecisionScope =
  | "whole_event"
  | "sub_event"
  | "inning_consequence"
  | "stint"
  | "lineup_baseline"
  | "non_scoring_note";

export type ManagerDecisionScoringModel =
  | "whole_event_window"
  | "sub_event_counterfactual"
  | "inning_consequence_components"
  | "deployment_stint"
  | "lineup_delta"
  | "non_scoring";

export type ManagerDecisionCounterfactualReadiness =
  | "not_required"
  | "not_available"
  | "partial"
  | "available";

export type ManagerDecisionTraceComponent =
  | "official_net"
  | "raw_window_wpa"
  | "manager_share"
  | "cap"
  | "final_value"
  | "immediate_cost"
  | "consequence_payoff"
  | "counterfactual_state"
  | "excluded_batter_value"
  | "deployment_exclusion"
  | "lineup_baseline"
  | "non_scoring_note";

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

export type ManagerRunPlay = "hit_and_run";

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
  | "runner_consequence"
  | "runner_terminal"
  | "first_fielding_event"
  | "half_inning_end"
  | "game_end";

export type IntentionalWalkConsequenceStatus =
  | "scored"
  | "out"
  | "removed"
  | "stranded";

export interface IntentionalWalkWpaComponentMetadata {
  beforeIbbTeamWinProbability: number;
  afterIbbTeamWinProbability: number;
  finalTeamWinProbability?: number;
  immediateRawWpa: number;
  consequenceRawWpa?: number;
  netRawWpa?: number;
}

export interface IntentionalWalkExplanationMetadata {
  ibbEventId: string;
  walkedRunnerId: string;
  walkedRunnerName?: string;
  walkedRunnerStartBase?: "first" | "second" | "third";
  nextBatterEventId?: string;
  nextBatterId?: string;
  nextBatterName?: string;
  nextBatterResult?: string;
  finalConsequenceEventId?: string;
  finalConsequence?: IntentionalWalkConsequenceStatus;
  inningEnded?: boolean;
  wpaComponents?: IntentionalWalkWpaComponentMetadata;
}

export type ManagerOutAdvancingSendUnscoredReason =
  | "missing_runner_outcome"
  | "unsupported_between_play_counterfactual"
  | "missing_hit_context"
  | "missing_hold_base"
  | "base_conflict"
  | "invalid_out_count";

export interface ManagerOutAdvancingSendStateMetadata {
  outs: number;
  awayScore: number;
  homeScore: number;
  bases: {
    first: boolean;
    second: boolean;
    third: boolean;
  };
}

export interface ManagerOutAdvancingSendExplanationMetadata {
  runnerId?: string;
  runnerName?: string;
  fromBase?: "batter" | "first" | "second" | "third";
  actualToBase?: "first" | "second" | "third" | "home" | "out" | "end";
  inferredHoldBase?: "first" | "second" | "third";
  holdBaseSource?: string;
  actualState?: ManagerOutAdvancingSendStateMetadata;
  counterfactualState?: ManagerOutAdvancingSendStateMetadata;
  actualTeamWinProbability?: number;
  counterfactualTeamWinProbability?: number;
  originalPlateAppearanceTeamWinProbabilityBefore?: number;
  rawCounterfactualWpa?: number;
  unscoredReason?: ManagerOutAdvancingSendUnscoredReason;
}

export interface ManagerDecisionExplanationMetadata {
  intentionalWalk?: IntentionalWalkExplanationMetadata;
  outAdvancingSend?: ManagerOutAdvancingSendExplanationMetadata;
  recommendation?: ManagerRecommendationProvenanceMetadata;
}

export type ManagerRecommendationWatchType =
  | "consider_pitching_change"
  | "consider_pinch_hitter"
  | "consider_defensive_replacement";

export type ManagerRecommendationWatchConfidence = "high" | "medium" | "low";

export type ManagerRecommendationWatchSurface =
  | "recommendation_card"
  | "feed_quick_action"
  | "feed_passive";

export type ManagerRecommendationWatchPrimaryAction =
  | "open_pitching_change"
  | "open_pinch_hit"
  | "open_defensive_sub";

export type ManagerRecommendationWatchNoChangeAction =
  | "keep_pitcher"
  | "let_batter_hit"
  | "decline_defensive_sub";

export type ManagerRecommendationWatchResolutionStatus =
  | "pending"
  | "action_taken"
  | "action_taken_alternative"
  | "explicit_no_change"
  | "inferred_no_change";

export interface ManagerRecommendationWatchEvent {
  recommendationId: string;
  type: ManagerRecommendationWatchType;
  managerId: string;
  teamId: string;
  opponentTeamId: string;
  confidence: ManagerRecommendationWatchConfidence;
  surface: ManagerRecommendationWatchSurface;
  trackedPlayerIds: string[];
  primaryAction: ManagerRecommendationWatchPrimaryAction;
  noChangeAction?: ManagerRecommendationWatchNoChangeAction;
  suppressKey: string;
  title?: string;
  rationale?: string;
  leverageIndex?: number;
}

export interface ManagerRecommendationProvenanceMetadata {
  recommendationId: string;
  recommendationType: ManagerRecommendationWatchType;
  suppressKey: string;
  sourceEventId: string;
  response: Exclude<ManagerRecommendationWatchResolutionStatus, "pending">;
  confidence: ManagerRecommendationWatchConfidence;
  surface: ManagerRecommendationWatchSurface;
  recommendedPlayerId?: string;
  suggestedPlayerId?: string;
  actualPlayerId?: string;
  alternativePlayerId?: string;
}

export interface ManagerRecommendationWatchRecord
  extends ManagerRecommendationWatchEvent {
  watchId: string;
  gameId: string;
  sourceEventId: string;
  openedAtEventIndex: number;
  inning: number;
  half: "top" | "bottom";
  outs: number;
  targetPlayerId?: string;
  suggestedPlayerId?: string;
  status: ManagerRecommendationWatchResolutionStatus;
  resolvedAtEventId?: string;
  resolvedDecisionId?: string;
  resolutionDecisionType?: ManagerDecisionType;
  actualPlayerId?: string;
  alternativePlayerId?: string;
  linkedEventIds: string[];
}

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
  wpaModelVersion?: string;

  resolved: boolean;
  resolvedAtEventId?: string;
  resolutionWindow?: ManagerDecisionResolutionWindow;
  explanationMetadata?: ManagerDecisionExplanationMetadata;
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
  replacementBaselineSource?: "optimal_lineup_v2";
  replacementBaselineConfidence?: "low" | "medium" | "high";
  rawPerformanceDelta: number;
  managerShare: number;
  managerWpa: number;
  wpaModelVersion?: string;

  optimalSnapshotId?: string;
  opposingPitcherHand?: OpposingPitcherHand;
  algorithmVersion?: string;

  chosenPlayerId?: string;
  chosenPlayerName?: string;
  chosenBattingOrderSlot?: number;
  chosenDefensivePosition?: string;

  optimalPlayerId?: string;
  optimalPlayerName?: string;
  optimalBattingOrderSlot?: number;
  optimalDefensivePosition?: string;

  chosenProjectedKblWpa?: number;
  optimalProjectedKblWpa?: number;
  projectedOpportunityCost?: number;

  actualChosenKblWpa?: number;
  realizedVsChosenProjection?: number;
  actualVsOptimalProjection?: number;
  capApplied?: number;
}

// 'KblWpa' here denotes rescaled IV (÷CALIBRATE.lineupSnapshotWpaDivisor), NOT win probability (IV §9 / D9).
export interface ManagerLineupDeltaSummary {
  gameId: string;
  managerId: string;
  teamId: string;
  side: "away" | "home";
  chosenProjectedTeamLineupKblWpa: number;
  optimalProjectedTeamLineupKblWpa: number;
  lineupDeltaWpaStandard: number;
  algorithmVersion: string;
  optimizerConstantsVersion: string;
}

export type ManagerDeploymentRole =
  | "pinch_hitter_remaining"
  | "pinch_runner"
  | "defensive_position"
  | "pitcher"
  | "kept_position_player_in"
  | "kept_defender_in"
  | "kept_pitcher_in"
  | "kept_in"
  | "manual_deployment";

export type ManagerDeploymentLinkedOutcomeRole =
  | "batting"
  | "pitching"
  | "catching"
  | "fielding"
  | "baserunning"
  | "managing";

export interface ManagerDeploymentLinkedOutcome {
  eventId: string;
  source: "at_bat" | "between_play";
  role: ManagerDeploymentLinkedOutcomeRole;
  rawWpa: number;
  weight: number;
  weightedWpa: number;
}

export interface ManagerDeploymentStintRecord {
  stintId: string;
  gameId: string;
  managerId: string;
  teamId: string;
  deploymentRole: ManagerDeploymentRole;
  playerId: string;
  playerName?: string;
  trackedPosition?: string;
  sourceEventId: string;
  openedAtEventIndex: number;
  tacticalExclusionEventIds: string[];
  closedAtEventId?: string;
  closedAtEventIndex?: number;
  closeReason?: "removed" | "role_change" | "runner_terminal" | "game_end";
  linkedEventIds: string[];
  linkedOutcomes?: ManagerDeploymentLinkedOutcome[];
  rawLinkedWpa: number;
  managerShare: number;
  managerDeploymentWpa: number;
  cap: number;
  confidence: ManagerDecisionConfidence;
  wpaModelVersion?: string;
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
