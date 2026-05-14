import React from "react";

import type {
  ManagerDeploymentStintRecord,
  ManagerDecisionRecord,
  ManagerLineupDeltaRecord,
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

function formatManagerName(managerId: string, teamId: string, teamName: string): string {
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
  return stints.reduce((sum, stint) => sum + stint.managerDeploymentWpa, 0);
}

export function buildManagerWpaOverlayRows(
  game: ManagerWpaOverlayProps["game"],
): ManagerWpaOverlayRow[] {
  const decisions = game.managerDecisions ?? [];
  const deploymentStints = game.managerDeploymentStints ?? [];
  const lineupDeltas = game.managerLineupDeltas ?? [];
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
      managerName: formatManagerName(managerId, teamId, teamName),
      tacticalManagerWpa,
      deploymentWpa,
      lineupDeltaWpa,
      managerValue: tacticalManagerWpa + deploymentWpa + lineupDeltaWpa,
      decisionCount: teamDecisions.length,
      pendingCount: teamDecisions.length - resolvedDecisions.length,
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

export function ManagerWpaOverlay({ game }: ManagerWpaOverlayProps) {
  const rows = buildManagerWpaOverlayRows(game);

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
                    row.tacticalManagerWpa >= 0
                      ? "text-[#34d399]"
                      : "text-[#f87171]"
                  }`}
                  data-testid={`manager-wpa-total-${testId}`}
                >
                  {formatSignedManagerWpa(row.tacticalManagerWpa)}
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
                    Tactical WPA
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
