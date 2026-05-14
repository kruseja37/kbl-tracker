import React from "react";

import type {
  ManagerDeploymentStintRecord,
  ManagerDecisionRecord,
  ManagerLineupDeltaRecord,
  ManagerProfile,
} from "../../../types/managerWpa";
import type { CompletedGameRecord } from "../../../utils/gameStorage";

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
  bestDecision?: ManagerDecisionRecord;
  worstDecision?: ManagerDecisionRecord;
}

function normalizeTestId(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "team";
}

export function formatSignedManagerWpa(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
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
  const profileByManagerId = buildManagerProfileMap(managerProfiles);
  const teamSeeds = [
    { teamId: game.awayTeamId, teamName: game.awayTeamName },
    { teamId: game.homeTeamId, teamName: game.homeTeamName },
  ];

  return teamSeeds.map(({ teamId, teamName }) => {
    const teamDecisions = decisions.filter((decision) => decision.teamId === teamId);
    const teamDeploymentStints = deploymentStints.filter(
      (stint) => stint.teamId === teamId,
    );
    const teamLineupDeltas = lineupDeltas.filter((delta) => delta.teamId === teamId);
    const managerId =
      teamDecisions.find((decision) => decision.managerId)?.managerId ??
      teamDeploymentStints.find((stint) => stint.managerId)?.managerId ??
      teamLineupDeltas.find((delta) => delta.managerId)?.managerId ??
      `${teamId}-manager`;
    const resolvedDecisions = teamDecisions.filter(
      (decision) => decision.resolved && typeof decision.managerWpa === "number",
    );
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
      decisionCount: teamDecisions.length,
      pendingCount: teamDecisions.length - resolvedDecisions.length,
      deploymentStints: teamDeploymentStints,
      lineupDeltas: teamLineupDeltas,
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

function formatLineupSlot(
  playerName: string | undefined,
  battingOrderSlot: number | undefined,
  defensivePosition: string | undefined,
): string {
  const order = battingOrderSlot ? `#${battingOrderSlot}` : "slot ?";
  const position = defensivePosition || "POS";
  return `${order} ${position} ${playerName || "Unknown player"}`;
}

function formatOptionalManagerWpa(value: number | undefined): string {
  return typeof value === "number" ? formatSignedManagerWpa(value) : "n/a";
}

function formatDeploymentRole(role: ManagerDeploymentStintRecord["deploymentRole"]): string {
  switch (role) {
    case "pinch_hitter_remaining":
      return "Pinch hitter remaining";
    case "pinch_runner":
      return "Pinch runner";
    case "defensive_position":
      return "Defensive position";
    case "pitcher":
      return "Pitcher";
    case "kept_position_player_in":
      return "Kept position player in";
    case "kept_pitcher_in":
      return "Kept pitcher in";
    case "kept_in":
      return "Kept in";
    case "manual_deployment":
      return "Manual deployment";
  }
}

function formatDeploymentCloseReason(
  reason: ManagerDeploymentStintRecord["closeReason"],
): string {
  if (!reason) return "Active";
  return titleCase(reason);
}

function formatDeploymentClosed(stint: ManagerDeploymentStintRecord): string {
  const reason = formatDeploymentCloseReason(stint.closeReason);
  if (!isResolvedDeploymentStint(stint)) return reason;
  if (typeof stint.closedAtEventIndex !== "number") return reason;
  return `Event ${stint.closedAtEventIndex} (${reason})`;
}

function formatDeploymentShare(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatDeploymentCap(value: number): string {
  return `+/-${value.toFixed(3)}`;
}

function formatDeploymentOutcomeWeight(weight: number): string {
  return `${Math.round(weight * 100)}%`;
}

function formatDeploymentLinkedOutcome(
  outcome: NonNullable<ManagerDeploymentStintRecord["linkedOutcomes"]>[number],
): string {
  return `${outcome.eventId} ${outcome.role} ${formatDeploymentOutcomeWeight(outcome.weight)}`;
}

function buildDeploymentLinkedSummary(stint: ManagerDeploymentStintRecord): {
  label: "Linked outcomes" | "Linked events";
  count: number;
  preview: string[];
} {
  if (Array.isArray(stint.linkedOutcomes)) {
    return {
      label: "Linked outcomes",
      count: stint.linkedOutcomes.length,
      preview: stint.linkedOutcomes.slice(0, 3).map(formatDeploymentLinkedOutcome),
    };
  }

  return {
    label: "Linked events",
    count: stint.linkedEventIds.length,
    preview: stint.linkedEventIds.slice(0, 3),
  };
}

export function ManagerWpaOverlay({ game, managerProfiles }: ManagerWpaOverlayProps) {
  const rows = buildManagerWpaOverlayRows(game, managerProfiles);

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

      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((row) => {
          const testId = normalizeTestId(row.teamId);
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
                    className="mt-1 space-y-2 text-[#E8E8D8]"
                    data-testid={`manager-deployment-stint-details-${testId}`}
                  >
                    {row.deploymentStints.length === 0 ? (
                      <div
                        className="text-[#a0a898]"
                        data-testid={`manager-deployment-stint-empty-${testId}`}
                      >
                        No deployment stints
                      </div>
                    ) : (
                      row.deploymentStints.slice(0, 3).map((stint) => {
                        const active = !isResolvedDeploymentStint(stint);
                        const linkedSummary = buildDeploymentLinkedSummary(stint);
                        return (
                          <div
                            key={stint.stintId}
                            className="rounded-sm border border-[#4a6a4a] bg-[#1f2b21]/70 p-2"
                            data-testid={`manager-deployment-stint-${testId}-${normalizeTestId(stint.stintId)}`}
                          >
                            <div>
                              {formatDeploymentRole(stint.deploymentRole)}: {stint.playerName ?? stint.playerId}
                            </div>
                            <div>Opened: Event {stint.openedAtEventIndex}</div>
                            <div>Closed: {formatDeploymentClosed(stint)}</div>
                            <div>
                              {linkedSummary.label}: {linkedSummary.count}
                              {linkedSummary.preview.length > 0
                                ? ` (${linkedSummary.preview.join(", ")})`
                                : ""}
                            </div>
                            <div>Raw WPA: {formatSignedManagerWpa(stint.rawLinkedWpa)}</div>
                            <div>Share: {formatDeploymentShare(stint.managerShare)}</div>
                            <div>Cap: {formatDeploymentCap(stint.cap)}</div>
                            <div>
                              Deployment WPA: {formatSignedManagerWpa(active ? 0 : stint.managerDeploymentWpa)}
                            </div>
                            {active ? (
                              <div className="text-[#a0a898]">
                                Active, excluded from resolved total
                              </div>
                            ) : null}
                          </div>
                        );
                      })
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
                    Lineup Delta Details
                  </div>
                  <div
                    className="mt-1 space-y-2 text-[#E8E8D8]"
                    data-testid={`manager-lineup-delta-details-${testId}`}
                  >
                    {row.lineupDeltas.length === 0 ? (
                      <div
                        className="text-[#a0a898]"
                        data-testid={`manager-lineup-delta-empty-${testId}`}
                      >
                        No lineup deviations
                      </div>
                    ) : (
                      row.lineupDeltas.slice(0, 3).map((delta) => (
                        <div
                          key={delta.decisionId}
                          className="rounded-sm border border-[#4a6a4a] bg-[#1f2b21]/70 p-2"
                        >
                          <div>
                            Chosen: {formatLineupSlot(
                              delta.chosenPlayerName ?? delta.starterPlayerName,
                              delta.chosenBattingOrderSlot ?? delta.battingOrderSlot,
                              delta.chosenDefensivePosition ?? delta.defensivePosition,
                            )}
                          </div>
                          <div>
                            Optimal: {formatLineupSlot(
                              delta.optimalPlayerName,
                              delta.optimalBattingOrderSlot,
                              delta.optimalDefensivePosition,
                            )}
                          </div>
                          <div>
                            Projected opportunity cost: {formatOptionalManagerWpa(delta.projectedOpportunityCost)}
                          </div>
                          <div>
                            Actual vs optimal projection: {formatOptionalManagerWpa(delta.actualVsOptimalProjection)}
                          </div>
                          <div>
                            Manager WPA: {formatSignedManagerWpa(delta.managerWpa)}
                          </div>
                        </div>
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
    </section>
  );
}

export default ManagerWpaOverlay;
