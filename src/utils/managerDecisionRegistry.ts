import type {
  ManagerDecisionCounterfactualReadiness,
  ManagerDecisionHorizon,
  ManagerDecisionResolutionEndpoint,
  ManagerDecisionScope,
  ManagerDecisionScoringModel,
  ManagerDecisionTraceComponent,
  ManagerDecisionType,
} from "../types/managerWpa";

export type ManagerDecisionCaptureMode =
  | "automatic"
  | "play_log_enhancement"
  | "prompted"
  | "manual"
  | "unsupported";

export type ManagerDecisionLayer =
  | "lineup_delta"
  | "tactical"
  | "deployment"
  | "tactical_deployment"
  | "manual"
  | "unsupported";

export type ManagerDecisionActingTeam =
  | "offense"
  | "defense"
  | "pre_game"
  | "manual"
  | "unsupported";

export interface ManagerDecisionRegistryEntry {
  decisionType: ManagerDecisionType;
  label: string;
  supported: boolean;
  triggerSource: string;
  actingTeam: ManagerDecisionActingTeam;
  captureMode: ManagerDecisionCaptureMode;
  layer: ManagerDecisionLayer;
  horizon: ManagerDecisionHorizon;
  resolutionEndpoint: ManagerDecisionResolutionEndpoint;
  decisionScope: ManagerDecisionScope;
  scoringModel?: ManagerDecisionScoringModel;
  requiresCounterfactual?: boolean;
  counterfactualReadiness?: ManagerDecisionCounterfactualReadiness;
  traceComponents?: ManagerDecisionTraceComponent[];
  managerShare?: number;
  cap?: number;
  editable: boolean;
  doubleCountingExclusions: string[];
}

const WHOLE_EVENT_TRACE_COMPONENTS: ManagerDecisionTraceComponent[] = [
  "official_net",
  "raw_window_wpa",
  "manager_share",
  "final_value",
];

const STINT_TRACE_COMPONENTS: ManagerDecisionTraceComponent[] = [
  "official_net",
  "raw_window_wpa",
  "manager_share",
  "final_value",
  "deployment_exclusion",
];

const LINEUP_TRACE_COMPONENTS: ManagerDecisionTraceComponent[] = [
  "lineup_baseline",
  "raw_window_wpa",
  "manager_share",
  "cap",
  "final_value",
];

const INNING_CONSEQUENCE_TRACE_COMPONENTS: ManagerDecisionTraceComponent[] = [
  "official_net",
  "immediate_cost",
  "consequence_payoff",
  "manager_share",
  "final_value",
];

const SUB_EVENT_TRACE_COMPONENTS: ManagerDecisionTraceComponent[] = [
  "counterfactual_state",
  "excluded_batter_value",
  "raw_window_wpa",
  "manager_share",
  "final_value",
];

const NON_SCORING_TRACE_COMPONENTS: ManagerDecisionTraceComponent[] = [
  "non_scoring_note",
];

export const ALL_MANAGER_DECISION_TYPES: ManagerDecisionType[] = [
  "lineup_construction",
  "pitching_change",
  "leave_pitcher_in",
  "pinch_hitter",
  "let_batter_hit",
  "keep_defender_in",
  "pinch_runner",
  "defensive_sub",
  "position_change",
  "intentional_walk",
  "steal_send",
  "runner_hold",
  "out_advancing_send",
  "bunt_call",
  "squeeze_call",
  "hit_and_run",
  "defensive_alignment",
  "manual_note",
];

export const MANAGER_DECISION_REGISTRY: Record<
  ManagerDecisionType,
  ManagerDecisionRegistryEntry
> = {
  lineup_construction: {
    decisionType: "lineup_construction",
    label: "Lineup construction",
    supported: true,
    triggerSource: "optimal_lineup_snapshot",
    actingTeam: "pre_game",
    captureMode: "automatic",
    layer: "lineup_delta",
    horizon: "lineup_baseline",
    resolutionEndpoint: "game_end",
    decisionScope: "lineup_baseline",
    scoringModel: "lineup_delta",
    requiresCounterfactual: false,
    counterfactualReadiness: "not_required",
    traceComponents: LINEUP_TRACE_COMPONENTS,
    managerShare: 0.25,
    cap: 0.75,
    editable: false,
    doubleCountingExclusions: ["player_kbl_wpa", "deployment_stints"],
  },
  pitching_change: {
    decisionType: "pitching_change",
    label: "Pitching change",
    supported: true,
    triggerSource: "pitcher_change_event",
    actingTeam: "defense",
    captureMode: "automatic",
    layer: "tactical_deployment",
    horizon: "matchup",
    resolutionEndpoint: "next_pa",
    decisionScope: "whole_event",
    scoringModel: "whole_event_window",
    requiresCounterfactual: false,
    counterfactualReadiness: "not_required",
    traceComponents: STINT_TRACE_COMPONENTS,
    managerShare: 0.25,
    editable: true,
    doubleCountingExclusions: ["deployment_initial_pa"],
  },
  leave_pitcher_in: {
    decisionType: "leave_pitcher_in",
    label: "Leave pitcher in",
    supported: true,
    triggerSource: "keep_current_pitcher_prompt",
    actingTeam: "defense",
    captureMode: "prompted",
    layer: "tactical_deployment",
    horizon: "matchup",
    resolutionEndpoint: "next_pa",
    decisionScope: "stint",
    scoringModel: "deployment_stint",
    requiresCounterfactual: false,
    counterfactualReadiness: "not_required",
    traceComponents: STINT_TRACE_COMPONENTS,
    managerShare: 0.2,
    editable: true,
    doubleCountingExclusions: ["unprompted_non_action"],
  },
  pinch_hitter: {
    decisionType: "pinch_hitter",
    label: "Pinch hitter",
    supported: true,
    triggerSource: "substitution_event",
    actingTeam: "offense",
    captureMode: "automatic",
    layer: "tactical_deployment",
    horizon: "matchup",
    resolutionEndpoint: "next_pa",
    decisionScope: "whole_event",
    scoringModel: "whole_event_window",
    requiresCounterfactual: false,
    counterfactualReadiness: "not_required",
    traceComponents: STINT_TRACE_COMPONENTS,
    managerShare: 0.25,
    editable: true,
    doubleCountingExclusions: ["deployment_initial_pa"],
  },
  let_batter_hit: {
    decisionType: "let_batter_hit",
    label: "Let batter hit",
    supported: true,
    triggerSource: "keep_current_batter_prompt",
    actingTeam: "offense",
    captureMode: "prompted",
    layer: "tactical_deployment",
    horizon: "matchup",
    resolutionEndpoint: "next_pa",
    decisionScope: "stint",
    scoringModel: "deployment_stint",
    requiresCounterfactual: false,
    counterfactualReadiness: "not_required",
    traceComponents: STINT_TRACE_COMPONENTS,
    managerShare: 0.2,
    editable: true,
    doubleCountingExclusions: ["unprompted_non_action"],
  },
  keep_defender_in: {
    decisionType: "keep_defender_in",
    label: "Keep defender in",
    supported: true,
    triggerSource: "defensive_replacement_prompt",
    actingTeam: "defense",
    captureMode: "prompted",
    layer: "tactical_deployment",
    horizon: "matchup",
    resolutionEndpoint: "first_fielding_event",
    decisionScope: "stint",
    scoringModel: "deployment_stint",
    requiresCounterfactual: false,
    counterfactualReadiness: "not_required",
    traceComponents: STINT_TRACE_COMPONENTS,
    managerShare: 0.15,
    editable: true,
    doubleCountingExclusions: ["unprompted_non_action"],
  },
  pinch_runner: {
    decisionType: "pinch_runner",
    label: "Pinch runner",
    supported: true,
    triggerSource: "substitution_event",
    actingTeam: "offense",
    captureMode: "automatic",
    layer: "tactical_deployment",
    horizon: "personnel_stint",
    resolutionEndpoint: "runner_terminal",
    decisionScope: "whole_event",
    scoringModel: "whole_event_window",
    requiresCounterfactual: false,
    counterfactualReadiness: "partial",
    traceComponents: STINT_TRACE_COMPONENTS,
    managerShare: 0.25,
    editable: true,
    doubleCountingExclusions: ["deployment_initial_runner_window"],
  },
  defensive_sub: {
    decisionType: "defensive_sub",
    label: "Defensive substitution",
    supported: true,
    triggerSource: "substitution_event",
    actingTeam: "defense",
    captureMode: "automatic",
    layer: "tactical_deployment",
    horizon: "matchup",
    resolutionEndpoint: "first_fielding_event",
    decisionScope: "stint",
    scoringModel: "deployment_stint",
    requiresCounterfactual: false,
    counterfactualReadiness: "not_required",
    traceComponents: STINT_TRACE_COMPONENTS,
    managerShare: 0.2,
    editable: true,
    doubleCountingExclusions: ["deployment_initial_fielding_window"],
  },
  position_change: {
    decisionType: "position_change",
    label: "Position change",
    supported: true,
    triggerSource: "position_change_event",
    actingTeam: "defense",
    captureMode: "automatic",
    layer: "tactical_deployment",
    horizon: "matchup",
    resolutionEndpoint: "first_fielding_event",
    decisionScope: "stint",
    scoringModel: "deployment_stint",
    requiresCounterfactual: false,
    counterfactualReadiness: "not_required",
    traceComponents: STINT_TRACE_COMPONENTS,
    managerShare: 0.1,
    editable: true,
    doubleCountingExclusions: ["deployment_initial_fielding_window"],
  },
  intentional_walk: {
    decisionType: "intentional_walk",
    label: "Intentional walk",
    supported: true,
    triggerSource: "at_bat_result",
    actingTeam: "defense",
    captureMode: "automatic",
    layer: "tactical",
    horizon: "inning_consequence",
    resolutionEndpoint: "runner_consequence",
    decisionScope: "inning_consequence",
    scoringModel: "inning_consequence_components",
    requiresCounterfactual: false,
    counterfactualReadiness: "not_required",
    traceComponents: INNING_CONSEQUENCE_TRACE_COMPONENTS,
    managerShare: 1,
    editable: false,
    doubleCountingExclusions: ["player_kbl_wpa"],
  },
  steal_send: {
    decisionType: "steal_send",
    label: "Steal/send",
    supported: true,
    triggerSource: "runner_button",
    actingTeam: "offense",
    captureMode: "automatic",
    layer: "tactical",
    horizon: "single_play",
    resolutionEndpoint: "same_event",
    decisionScope: "whole_event",
    scoringModel: "whole_event_window",
    requiresCounterfactual: false,
    counterfactualReadiness: "not_required",
    traceComponents: WHOLE_EVENT_TRACE_COMPONENTS,
    managerShare: 0.35,
    editable: true,
    doubleCountingExclusions: ["runner_choice_tootblan"],
  },
  runner_hold: {
    decisionType: "runner_hold",
    label: "Hold runner",
    supported: true,
    triggerSource: "play_log_runner_enrichment",
    actingTeam: "offense",
    captureMode: "play_log_enhancement",
    layer: "tactical",
    horizon: "single_play",
    resolutionEndpoint: "same_event",
    decisionScope: "whole_event",
    scoringModel: "whole_event_window",
    requiresCounterfactual: false,
    counterfactualReadiness: "not_available",
    traceComponents: WHOLE_EVENT_TRACE_COMPONENTS,
    managerShare: 0.2,
    editable: true,
    doubleCountingExclusions: ["defensive_of_hold_credit"],
  },
  out_advancing_send: {
    decisionType: "out_advancing_send",
    label: "Out-advancing send",
    supported: true,
    triggerSource: "play_log_runner_enrichment",
    actingTeam: "offense",
    captureMode: "play_log_enhancement",
    layer: "tactical",
    horizon: "single_play",
    resolutionEndpoint: "same_event",
    decisionScope: "sub_event",
    scoringModel: "sub_event_counterfactual",
    requiresCounterfactual: true,
    counterfactualReadiness: "partial",
    traceComponents: SUB_EVENT_TRACE_COMPONENTS,
    managerShare: 0.35,
    editable: true,
    doubleCountingExclusions: ["runner_choice_tootblan", "hit_and_run"],
  },
  bunt_call: {
    decisionType: "bunt_call",
    label: "Bunt call",
    supported: true,
    triggerSource: "contact_quality_bunt",
    actingTeam: "offense",
    captureMode: "automatic",
    layer: "tactical",
    horizon: "single_play",
    resolutionEndpoint: "same_event",
    decisionScope: "whole_event",
    scoringModel: "whole_event_window",
    requiresCounterfactual: false,
    counterfactualReadiness: "not_required",
    traceComponents: WHOLE_EVENT_TRACE_COMPONENTS,
    managerShare: 0.35,
    editable: true,
    doubleCountingExclusions: ["squeeze_call"],
  },
  squeeze_call: {
    decisionType: "squeeze_call",
    label: "Squeeze call",
    supported: true,
    triggerSource: "contact_quality_bunt_r3_home",
    actingTeam: "offense",
    captureMode: "automatic",
    layer: "tactical",
    horizon: "single_play",
    resolutionEndpoint: "same_event",
    decisionScope: "whole_event",
    scoringModel: "whole_event_window",
    requiresCounterfactual: false,
    counterfactualReadiness: "not_required",
    traceComponents: WHOLE_EVENT_TRACE_COMPONENTS,
    managerShare: 0.5,
    editable: true,
    doubleCountingExclusions: ["bunt_call"],
  },
  hit_and_run: {
    decisionType: "hit_and_run",
    label: "Hit and run",
    supported: true,
    triggerSource: "play_log_runner_enrichment",
    actingTeam: "offense",
    captureMode: "play_log_enhancement",
    layer: "tactical",
    horizon: "single_play",
    resolutionEndpoint: "same_event",
    decisionScope: "whole_event",
    scoringModel: "whole_event_window",
    requiresCounterfactual: false,
    counterfactualReadiness: "not_available",
    traceComponents: WHOLE_EVENT_TRACE_COMPONENTS,
    managerShare: 0.35,
    editable: true,
    doubleCountingExclusions: ["out_advancing_send", "deployment_stints"],
  },
  defensive_alignment: {
    decisionType: "defensive_alignment",
    label: "Defensive alignment note",
    supported: false,
    triggerSource: "legacy_manager_moment",
    actingTeam: "manual",
    captureMode: "unsupported",
    layer: "manual",
    horizon: "single_play",
    resolutionEndpoint: "same_event",
    decisionScope: "non_scoring_note",
    scoringModel: "non_scoring",
    requiresCounterfactual: false,
    counterfactualReadiness: "not_available",
    traceComponents: NON_SCORING_TRACE_COMPONENTS,
    editable: false,
    doubleCountingExclusions: ["active_manager_value"],
  },
  manual_note: {
    decisionType: "manual_note",
    label: "Manual note",
    supported: true,
    triggerSource: "manual_manager_moment",
    actingTeam: "manual",
    captureMode: "manual",
    layer: "manual",
    horizon: "single_play",
    resolutionEndpoint: "same_event",
    decisionScope: "non_scoring_note",
    scoringModel: "non_scoring",
    requiresCounterfactual: false,
    counterfactualReadiness: "not_available",
    traceComponents: NON_SCORING_TRACE_COMPONENTS,
    editable: true,
    doubleCountingExclusions: ["automatic_derivation"],
  },
};

export const SUPPORTED_MANAGER_DECISION_TYPES = ALL_MANAGER_DECISION_TYPES.filter(
  (decisionType) => MANAGER_DECISION_REGISTRY[decisionType].supported,
);

export const MANAGER_DECISION_LABELS: Record<ManagerDecisionType, string> =
  Object.fromEntries(
    ALL_MANAGER_DECISION_TYPES.map((decisionType) => [
      decisionType,
      MANAGER_DECISION_REGISTRY[decisionType].label,
    ]),
  ) as Record<ManagerDecisionType, string>;

export const MANAGER_WPA_SHARE_BY_DECISION_TYPE: Partial<
  Record<ManagerDecisionType, number>
> = Object.fromEntries(
  ALL_MANAGER_DECISION_TYPES.flatMap((decisionType) => {
    const share = MANAGER_DECISION_REGISTRY[decisionType].managerShare;
    return typeof share === "number" ? [[decisionType, share]] : [];
  }),
) as Partial<Record<ManagerDecisionType, number>>;

export const RESOLUTION_ENDPOINT_BY_DECISION_TYPE: Partial<
  Record<ManagerDecisionType, ManagerDecisionResolutionEndpoint>
> = Object.fromEntries(
  ALL_MANAGER_DECISION_TYPES.map((decisionType) => [
    decisionType,
    MANAGER_DECISION_REGISTRY[decisionType].resolutionEndpoint,
  ]),
) as Partial<Record<ManagerDecisionType, ManagerDecisionResolutionEndpoint>>;

export const DECISION_HORIZON_BY_DECISION_TYPE: Partial<
  Record<ManagerDecisionType, ManagerDecisionHorizon>
> = Object.fromEntries(
  ALL_MANAGER_DECISION_TYPES.map((decisionType) => [
    decisionType,
    MANAGER_DECISION_REGISTRY[decisionType].horizon,
  ]),
) as Partial<Record<ManagerDecisionType, ManagerDecisionHorizon>>;

export const DECISION_SCOPE_BY_DECISION_TYPE: Partial<
  Record<ManagerDecisionType, ManagerDecisionScope>
> = Object.fromEntries(
  ALL_MANAGER_DECISION_TYPES.map((decisionType) => [
    decisionType,
    MANAGER_DECISION_REGISTRY[decisionType].decisionScope,
  ]),
) as Partial<Record<ManagerDecisionType, ManagerDecisionScope>>;
