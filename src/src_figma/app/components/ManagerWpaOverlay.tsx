import React from "react";

import type {
  ManagerDeploymentStintRecord,
  ManagerDecisionRecord,
  ManagerLineupDeltaRecord,
  ManagerProfile,
} from "../../../types/managerWpa";
import type { CompletedGameRecord } from "../../../utils/gameStorage";
import {
  buildManagerValueTraceRows,
  isActiveScoringManagerDecision,
  isCompatibilityOnlyManagerDecision,
  type ManagerValueTraceRow,
} from "../../../utils/managerValueTrace";
import {
  formatManagerMomentFinalValue,
  formatManagerMomentLayer,
  formatManagerMomentRole,
  formatManagerMomentStatus,
  formatSignedManagerMomentValue,
  ManagerMomentDetailDialog,
  type ManagerMomentDetailContext,
} from "./ManagerMomentDetail";

interface ManagerWpaOverlayProps {
  game: Pick<
    CompletedGameRecord,
    | "awayTeamId"
    | "homeTeamId"
    | "awayTeamName"
    | "homeTeamName"
    | "managerDecisions"
    | "managerDeploymentStints"
    | "managerLineupDeltas"
  >;
  managerProfiles?: ManagerProfile[] | Map<string, ManagerProfile>;
}

export interface ManagerWpaOverlayRow {
  teamId: string;
  teamName: string;
  managerId: string;
  managerName: string;
  tacticalManagerWpa: number;
  deploymentWpa: number;
  lineupDeltaWpa: number;
  managerValue: number;
  decisionCount: number;
  pendingCount: number;
  deploymentStints: ManagerDeploymentStintRecord[];
  lineupDeltas: ManagerLineupDeltaRecord[];
  traceRows: ManagerValueTraceRow[];
  bestDecision?: ManagerDecisionRecord;
  worstDecision?: ManagerDecisionRecord;
}

function normalizeTestId(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "team";
}

export function formatSignedManagerWpa(value: number): string {
  return formatSignedManagerMomentValue(value);
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function buildManagerProfileMap(
  profiles: ManagerWpaOverlayProps["managerProfiles"],
): Map<string, ManagerProfile> {
  if (!profiles) return new Map();
  if (profiles instanceof Map) return profiles;
  return new Map(profiles.map((profile) => [profile.managerId, profile]));
}

function formatManagerName(
  managerId: string,
  teamId: string,
  teamName: string,
  profileByManagerId: Map<string, ManagerProfile>,
): string {
  const profileName = profileByManagerId.get(managerId)?.displayName?.trim();
  if (profileName) {
    return profileName;
  }

  if (managerId === `${teamId}-manager`) {
    return `${teamName} Manager`;
  }

  return titleCase(managerId);
}

function compareManagerWpa(
  left: ManagerDecisionRecord,
  right: ManagerDecisionRecord,
): number {
  return (left.managerWpa ?? 0) - (right.managerWpa ?? 0);
}

function sumLineupDeltas(deltas: ManagerLineupDeltaRecord[]): number {
  return deltas.reduce((sum, delta) => sum + delta.managerWpa, 0);
}

function sumDeploymentStints(stints: ManagerDeploymentStintRecord[]): number {
  return stints
    .filter(isResolvedDeploymentStint)
    .reduce((sum, stint) => sum + stint.managerDeploymentWpa, 0);
}

function isResolvedDeploymentStint(stint: ManagerDeploymentStintRecord): boolean {
  return (
    Boolean(stint.closeReason) ||
    Boolean(stint.closedAtEventId) ||
    typeof stint.closedAtEventIndex === "number"
  );
}

export function buildManagerWpaOverlayRows(
  game: ManagerWpaOverlayProps["game"],
  managerProfiles?: ManagerWpaOverlayProps["managerProfiles"],
): ManagerWpaOverlayRow[] {
  const decisions = game.managerDecisions ?? [];
  const deploymentStints = game.managerDeploymentStints ?? [];
  const lineupDeltas = game.managerLineupDeltas ?? [];
  const traceRows = buildManagerValueTraceRows({
    managerDecisions: decisions,
    managerDeploymentStints: deploymentStints,
    managerLineupDeltas: lineupDeltas,
  });
  const profileByManagerId = buildManagerProfileMap(managerProfiles);
  const teamSeeds = [
    { teamId: game.awayTeamId, teamName: game.awayTeamName },
    { teamId: game.homeTeamId, teamName: game.homeTeamName },
  ];

  return teamSeeds.map(({ teamId, teamName }) => {
    const teamDecisions = decisions.filter((decision) => decision.teamId === teamId);
    const activeTeamDecisions = teamDecisions.filter(
      (decision) => !isCompatibilityOnlyManagerDecision(decision),
    );
    const teamDeploymentStints = deploymentStints.filter(
      (stint) => stint.teamId === teamId,
    );
    const teamLineupDeltas = lineupDeltas.filter((delta) => delta.teamId === teamId);
    const teamTraceRows = traceRows.filter((trace) => trace.teamId === teamId);
    const managerId =
      activeTeamDecisions.find((decision) => decision.managerId)?.managerId ??
      teamDeploymentStints.find((stint) => stint.managerId)?.managerId ??
      teamLineupDeltas.find((delta) => delta.managerId)?.managerId ??
      teamDecisions.find((decision) => decision.managerId)?.managerId ??
      `${teamId}-manager`;
    const resolvedDecisions = activeTeamDecisions.filter(isActiveScoringManagerDecision);
    const tacticalManagerWpa = resolvedDecisions.reduce(
      (sum, decision) => sum + (decision.managerWpa ?? 0),
      0,
    );
    const sortedResolved = [...resolvedDecisions].sort(compareManagerWpa);

    const lineupDeltaWpa = sumLineupDeltas(teamLineupDeltas);
    const deploymentWpa = sumDeploymentStints(teamDeploymentStints);

    return {
      teamId,
      teamName,
      managerId,
      managerName: formatManagerName(managerId, teamId, teamName, profileByManagerId),
      tacticalManagerWpa,
      deploymentWpa,
      lineupDeltaWpa,
      managerValue: tacticalManagerWpa + deploymentWpa + lineupDeltaWpa,
      decisionCount: activeTeamDecisions.length,
      pendingCount: activeTeamDecisions.length - resolvedDecisions.length,
      deploymentStints: teamDeploymentStints,
      lineupDeltas: teamLineupDeltas,
      traceRows: teamTraceRows,
      worstDecision: sortedResolved[0],
      bestDecision: sortedResolved[sortedResolved.length - 1],
    };
  });
}

function formatDecisionSummary(decision: ManagerDecisionRecord | undefined): string {
  if (!decision) {
    return "None yet";
  }

  if (typeof decision.managerWpa !== "number") {
    return "Pending";
  }

  return `${decision.displayTitle}, ${formatSignedManagerWpa(decision.managerWpa)}`;
}

function formatPlayerName(name: string | undefined, id: string | undefined): string {
  return name?.trim() || id?.trim() || "Unknown player";
}

function formatSlotLabel(
  battingOrderSlot: number | undefined,
  defensivePosition: string | undefined,
): string {
  const slot = battingOrderSlot ? `Slot ${battingOrderSlot}` : "Slot ?";
  const position = defensivePosition?.trim() || "POS";
  return `${slot} ${position}`;
}

function formatLineupDeltaEvidence(delta: ManagerLineupDeltaRecord): string {
  const chosenSlot = formatSlotLabel(
    delta.chosenBattingOrderSlot ?? delta.battingOrderSlot,
    delta.chosenDefensivePosition ?? delta.defensivePosition,
  );
  const optimalSlot = formatSlotLabel(
    delta.optimalBattingOrderSlot,
    delta.optimalDefensivePosition,
  );
  const chosenPlayer = formatPlayerName(
    delta.chosenPlayerName ?? delta.starterPlayerName,
    delta.chosenPlayerId ?? delta.starterPlayerId,
  );
  const optimalPlayer = formatPlayerName(delta.optimalPlayerName, delta.optimalPlayerId);
  const actualValue = delta.actualChosenKblWpa ?? delta.actualPlayerKblWpa;
  const expectedValue = delta.optimalProjectedKblWpa ?? delta.replacementExpectedKblWpa;
  const deltaValue = delta.actualVsOptimalProjection ?? delta.rawPerformanceDelta;

  return `${chosenSlot} ${chosenPlayer} vs optimal ${optimalSlot} ${optimalPlayer}: actual ${formatSignedManagerWpa(actualValue)}, expected ${formatSignedManagerWpa(expectedValue)}, delta ${formatSignedManagerWpa(deltaValue)}, manager ${formatSignedManagerWpa(delta.managerWpa)}.`;
}

function formatDecisionQualityEvidence(trace: ManagerValueTraceRow): string {
  const layer = formatManagerMomentLayer(trace.layer);
  const event = trace.endpointEventId
    ? `resolved ${trace.endpointEventId}`
    : trace.sourceEventId
      ? `source ${trace.sourceEventId}`
      : "archive evidence";
  return `${layer} ${trace.label}: ${formatManagerMomentFinalValue(trace)} (${event}).`;
}

function traceValueClass(trace: ManagerValueTraceRow): string {
  if (trace.compatibilityOnly) return "text-[#a0a898]";
  if (trace.pending) return "text-[#fbbf24]";
  return (trace.finalValue ?? 0) >= 0 ? "text-[#34d399]" : "text-[#f87171]";
}

function ManagerMomentTraceButton({
  managerName,
  teamName,
  testId,
  trace,
  onOpen,
}: {
  managerName: string;
  teamName: string;
  testId: string;
  trace: ManagerValueTraceRow;
  onOpen: (moment: ManagerMomentDetailContext) => void;
}) {
  return (
    <button
      type="button"
      className="w-full border-t border-[#3d5240] py-2 text-left first:border-t-0 hover:bg-[#314437]/45 focus:outline-none focus:ring-1 focus:ring-[#C4A853]"
      data-testid={`manager-moment-button-${testId}-${normalizeTestId(trace.recordId)}`}
      aria-label={`Open ${trace.label} Manager Moment details for ${managerName}`}
      onClick={() => onOpen({ trace, managerName, teamName })}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="break-words text-[9px] font-bold text-[#E8E8D8]">
            {trace.label}
          </div>
          <div className="mt-0.5 break-words text-[8px] leading-[1.35] text-[#cfd8c9]">
            {trace.description}
          </div>
          <div className="mt-1 text-[7px] uppercase tracking-[0.14em] text-[#88AA88]">
            {formatManagerMomentLayer(trace.layer)} / {formatManagerMomentRole(trace)}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-[9px] font-bold ${traceValueClass(trace)}`}>
            {formatManagerMomentFinalValue(trace)}
          </div>
          <div className="mt-1 text-[7px] uppercase tracking-[0.12em] text-[#6b7b6e]">
            Details
          </div>
        </div>
      </div>
      <div className="mt-1 text-[7px] text-[#a0a898]">
        {formatManagerMomentStatus(trace)}
      </div>
    </button>
  );
}

export function ManagerWpaOverlay({ game, managerProfiles }: ManagerWpaOverlayProps) {
  const rows = buildManagerWpaOverlayRows(game, managerProfiles);
  const [selectedMoment, setSelectedMoment] =
    React.useState<ManagerMomentDetailContext | null>(null);

  return (
    <section
      className="bg-[#1f2b21] border-2 border-[#314437] p-4 mb-4 rounded-sm"
      data-testid="manager-wpa-overlay"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-xs text-[#C4A853] tracking-[0.3em] font-bold">
          MANAGER WPA OVERLAY
        </div>
        <div className="text-[8px] text-[#88AA88] tracking-[0.18em] uppercase">
          Committed truth layer only
        </div>
      </div>
      <div
        className="mb-3 rounded-sm border border-[#3d5240] bg-[#172019] px-3 py-2 text-[8px] leading-[1.45] text-[#cfd8c9]"
        data-testid="manager-wpa-boundary-copy"
      >
        Player WPA remains player outcome credit. Manager WPA below is archived
        decision-quality evidence from tactical decisions, deployment stints, and
        lineup construction deltas.
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((row) => {
          const testId = normalizeTestId(row.teamId);
          const tacticalTraceRows = row.traceRows.filter(
            (trace) => trace.layer === "tactical",
          );
          const deploymentTraceRows = row.traceRows.filter(
            (trace) => trace.layer === "deployment",
          );
          const lineupTraceRows = row.traceRows.filter(
            (trace) => trace.layer === "lineup",
          );
          const decisionQualityTraceRows = row.traceRows.filter(
            (trace) => trace.layer === "tactical" || trace.layer === "deployment",
          );
          return (
            <article
              key={row.teamId}
              className="rounded-sm border border-[#4a6a4a] bg-[#2a352d]/70 p-3"
              data-testid={`manager-wpa-card-${testId}`}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-bold text-[#E8E8D8]">
                    {row.managerName}
                  </div>
                  <div className="text-[8px] uppercase tracking-[0.18em] text-[#88AA88]">
                    {row.teamName}
                  </div>
                </div>
                <div
                  className={`text-[13px] font-bold ${
                    row.managerValue >= 0
                      ? "text-[#34d399]"
                      : "text-[#f87171]"
                  }`}
                  data-testid={`manager-wpa-total-${testId}`}
                >
                  {formatSignedManagerWpa(row.managerValue)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[8px] text-[#a0a898]">
                <div>
                  <div className="uppercase tracking-[0.16em] text-[#6b7b6e]">
                    Decisions
                  </div>
                  <div className="text-[#E8E8D8]">
                    {row.decisionCount}
                    {row.pendingCount > 0 ? ` (${row.pendingCount} pending)` : ""}
                  </div>
                </div>
                <div>
                  <div className="uppercase tracking-[0.16em] text-[#6b7b6e]">
                    Tactical Manager WPA
                  </div>
                  <div className="text-[#E8E8D8]">
                    {formatSignedManagerWpa(row.tacticalManagerWpa)}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="uppercase tracking-[0.16em] text-[#6b7b6e]">
                    Decision Quality Evidence
                  </div>
                  <div
                    className="mt-1 space-y-1 text-[#E8E8D8]"
                    data-testid={`manager-decision-quality-evidence-${testId}`}
                  >
                    {decisionQualityTraceRows.length === 0 ? (
                      <div className="text-[#a0a898]">
                        Decision quality unavailable for older archives,
                        score-only/manual-result games, or games without linked
                        substitution, pinch-hit, or deployment evidence.
                      </div>
                    ) : (
                      decisionQualityTraceRows.slice(0, 4).map((trace) => (
                        <div key={trace.recordId} className="rounded-sm bg-[#172019] p-2">
                          <div className="text-[8px] font-bold text-[#E8E8D8]">
                            {formatDecisionQualityEvidence(trace)}
                          </div>
                          <div className="mt-0.5 text-[7px] leading-[1.35] text-[#a0a898]">
                            {trace.description}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="uppercase tracking-[0.16em] text-[#6b7b6e]">
                    Tactical Details
                  </div>
                  <div
                    className="mt-1 text-[#E8E8D8]"
                    data-testid={`manager-tactical-trace-details-${testId}`}
                  >
                    {tacticalTraceRows.length === 0 ? (
                      <div
                        className="text-[#a0a898]"
                        data-testid={`manager-tactical-trace-empty-${testId}`}
                      >
                        No tactical decisions
                      </div>
                    ) : (
                      tacticalTraceRows.slice(0, 4).map((trace) => (
                        <ManagerMomentTraceButton
                          key={trace.recordId}
                          managerName={row.managerName}
                          teamName={row.teamName}
                          testId={testId}
                          trace={trace}
                          onOpen={setSelectedMoment}
                        />
                      ))
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="uppercase tracking-[0.16em] text-[#6b7b6e]">
                    Deployment WPA
                  </div>
                  <div
                    className="text-[#E8E8D8]"
                    data-testid={`manager-deployment-wpa-${testId}`}
                  >
                    {formatSignedManagerWpa(row.deploymentWpa)}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="uppercase tracking-[0.16em] text-[#6b7b6e]">
                    Deployment Stints
                  </div>
                  <div
                    className="mt-1 text-[#E8E8D8]"
                    data-testid={`manager-deployment-stint-details-${testId}`}
                  >
                    {deploymentTraceRows.length === 0 ? (
                      <div
                        className="text-[#a0a898]"
                        data-testid={`manager-deployment-stint-empty-${testId}`}
                      >
                        No deployment stints
                      </div>
                    ) : (
                      deploymentTraceRows.slice(0, 3).map((trace) => (
                        <ManagerMomentTraceButton
                          key={trace.recordId}
                          managerName={row.managerName}
                          teamName={row.teamName}
                          testId={testId}
                          trace={trace}
                          onOpen={setSelectedMoment}
                        />
                      ))
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="uppercase tracking-[0.16em] text-[#6b7b6e]">
                    Lineup Delta
                  </div>
                  <div
                    className="text-[#E8E8D8]"
                    data-testid={`manager-lineup-delta-${testId}`}
                  >
                    {formatSignedManagerWpa(row.lineupDeltaWpa)}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="uppercase tracking-[0.16em] text-[#6b7b6e]">
                    Manager Value
                  </div>
                  <div
                    className="text-[#E8E8D8]"
                    data-testid={`manager-value-${testId}`}
                  >
                    {formatSignedManagerWpa(row.managerValue)}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="uppercase tracking-[0.16em] text-[#6b7b6e]">
                    Lineup Delta Evidence
                  </div>
                  <div
                    className="mt-1 space-y-1 text-[#E8E8D8]"
                    data-testid={`manager-lineup-delta-evidence-${testId}`}
                  >
                    {row.lineupDeltas.length === 0 ? (
                      <div className="text-[#a0a898]">
                        No lineup deviations. Lineup delta unavailable for older
                        archives, score-only/manual-result games, or completed games
                        without official optimal/chosen lineup snapshots.
                      </div>
                    ) : (
                      row.lineupDeltas.slice(0, 5).map((delta) => (
                        <div key={delta.decisionId} className="rounded-sm bg-[#172019] p-2">
                          <div className="text-[8px] font-bold text-[#E8E8D8]">
                            {formatLineupDeltaEvidence(delta)}
                          </div>
                          <div className="mt-0.5 text-[7px] uppercase tracking-[0.12em] text-[#88AA88]">
                            Archived lineup construction delta, separate from player WPA
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="uppercase tracking-[0.16em] text-[#6b7b6e]">
                    Lineup Delta Details
                  </div>
                  <div
                    className="mt-1 text-[#E8E8D8]"
                    data-testid={`manager-lineup-delta-details-${testId}`}
                  >
                    {lineupTraceRows.length === 0 ? (
                      <div
                        className="text-[#a0a898]"
                        data-testid={`manager-lineup-delta-empty-${testId}`}
                      >
                        No lineup deviations. Lineup delta unavailable for older archives or score-only/manual-result games.
                      </div>
                    ) : (
                      lineupTraceRows.slice(0, 3).map((trace) => (
                        <ManagerMomentTraceButton
                          key={trace.recordId}
                          managerName={row.managerName}
                          teamName={row.teamName}
                          testId={testId}
                          trace={trace}
                          onOpen={setSelectedMoment}
                        />
                      ))
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="uppercase tracking-[0.16em] text-[#6b7b6e]">
                    Best Resolved
                  </div>
                  <div className="text-[#E8E8D8]">
                    {formatDecisionSummary(row.bestDecision)}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="uppercase tracking-[0.16em] text-[#6b7b6e]">
                    Worst Resolved
                  </div>
                  <div className="text-[#E8E8D8]">
                    {formatDecisionSummary(row.worstDecision)}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <ManagerMomentDetailDialog
        moment={selectedMoment}
        onClose={() => setSelectedMoment(null)}
      />
    </section>
  );
}

export default ManagerWpaOverlay;
