import React from "react";

import type {
  ManagerValueTraceComponent,
  ManagerValueTraceRow,
} from "../../../utils/managerValueTrace";
import { formatWpaPoints } from "../../../utils/wpaDisplay";

export interface ManagerMomentDetailContext {
  trace: ManagerValueTraceRow;
  managerName: string;
  teamName: string;
  supplementalDetail?: string;
  supplementalOutcome?: string;
}

interface ManagerMomentDetailDialogProps {
  children?: React.ReactNode;
  moment: ManagerMomentDetailContext | null;
  onClose: () => void;
}

export function formatSignedManagerMomentValue(value: number): string {
  return formatWpaPoints(value);
}

export function formatManagerMomentFinalValue(
  trace: ManagerValueTraceRow,
): string {
  if (trace.compatibilityOnly) return "Non-scoring";
  if (trace.pending) return trace.layer === "deployment" ? "Active" : "Pending";
  return typeof trace.finalValue === "number"
    ? formatSignedManagerMomentValue(trace.finalValue)
    : "n/a";
}

export function formatManagerMomentLayer(
  layer: ManagerValueTraceRow["layer"],
): string {
  switch (layer) {
    case "tactical":
      return "Tactical";
    case "deployment":
      return "Deployment";
    case "lineup":
      return "Lineup Delta";
  }
}

export function formatManagerMomentRole(trace: ManagerValueTraceRow): string {
  if (trace.deploymentRole) {
    return titleCase(trace.deploymentRole);
  }

  if (trace.decisionType) {
    return titleCase(trace.decisionType);
  }

  return "n/a";
}

export function formatManagerMomentStatus(trace: ManagerValueTraceRow): string {
  if (trace.compatibilityOnly) return "Non-scoring compatibility row";
  if (trace.pending && trace.layer === "deployment") {
    return "Active, excluded from resolved total";
  }
  if (trace.pending) return "Pending, waiting for linked outcome";
  return "Scored";
}

function formatOptionalManagerMomentValue(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? formatSignedManagerMomentValue(value)
    : "n/a";
}

function formatShare(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(value * 100)}%`
    : "n/a";
}

function formatCap(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? `+/-${Math.abs(value).toFixed(3)}`
    : "n/a";
}

function formatWeight(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatComponentValue(
  component: ManagerValueTraceComponent,
): string | undefined {
  if (component.valueLabel) return component.valueLabel;
  if (typeof component.value === "number" && Number.isFinite(component.value)) {
    return formatSignedManagerMomentValue(component.value);
  }
  return undefined;
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function statusClass(trace: ManagerValueTraceRow): string {
  if (trace.compatibilityOnly) return "text-[#a0a898]";
  if (trace.pending) return "text-[#fbbf24]";
  return (trace.finalValue ?? 0) >= 0 ? "text-[#34d399]" : "text-[#f87171]";
}

export function ManagerMomentDetailDialog({
  children,
  moment,
  onClose,
}: ManagerMomentDetailDialogProps) {
  if (!moment) return null;

  const { trace, managerName, teamName, supplementalDetail, supplementalOutcome } =
    moment;
  const linkedEvents = trace.linkedEventIds.length
    ? trace.linkedEventIds.join(", ")
    : "n/a";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-3 py-4"
      role="dialog"
      aria-modal="true"
      aria-label="Manager Moment details"
      data-testid="manager-moment-detail-dialog"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto border-4 border-[#5a6b38] bg-[#243028] p-4 text-[#E8E8D8] shadow-[6px_6px_0_rgba(0,0,0,0.35)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#C4A853]">
              {formatManagerMomentLayer(trace.layer)} Manager Moment
            </div>
            <h3 className="m-0 mt-1 break-words text-sm text-[#E8E8D8]">
              {trace.label}
            </h3>
          </div>
          <button
            type="button"
            className="shrink-0 border border-[#425546] bg-[#182118] px-2 py-1 text-[8px] text-[#C4A853] hover:bg-[#2f3b21]"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="space-y-3 text-[9px] leading-[1.45]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#425546] pb-2">
            <span className="min-w-0 break-words text-[#88AA88]">
              {managerName} / {teamName}
            </span>
            <span className={`font-bold ${statusClass(trace)}`}>
              {formatManagerMomentFinalValue(trace)}
            </span>
          </div>

          <div>
            <div className="text-[7px] font-bold uppercase tracking-[0.16em] text-[#C4A853]">
              Baseball Explanation
            </div>
            <p
              className="m-0 break-words"
              data-testid="manager-moment-detail-description"
            >
              {trace.description}
            </p>
          </div>

          {supplementalDetail || supplementalOutcome ? (
            <div className="space-y-2 border-t border-[#425546] pt-2">
              {supplementalDetail ? (
                <div>
                  <div className="text-[7px] font-bold uppercase tracking-[0.16em] text-[#C4A853]">
                    Feed Detail
                  </div>
                  <p className="m-0 break-words">{supplementalDetail}</p>
                </div>
              ) : null}
              {supplementalOutcome ? (
                <div>
                  <div className="text-[7px] font-bold uppercase tracking-[0.16em] text-[#C4A853]">
                    Feed Outcome
                  </div>
                  <p className="m-0 break-words">{supplementalOutcome}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {trace.components.length > 0 ? (
            <div className="border-t border-[#425546] pt-2">
              <div className="mb-1 text-[7px] font-bold uppercase tracking-[0.16em] text-[#C4A853]">
                Scoped Components
              </div>
              <ul className="m-0 space-y-1.5 p-0">
                {trace.components.map((component) => {
                  const value = formatComponentValue(component);
                  return (
                    <li
                      key={component.key}
                      className="list-none border-t border-[#314437] pt-1.5 first:border-t-0 first:pt-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="min-w-0 break-words font-bold text-[#E8E8D8]">
                          {component.label}
                        </span>
                        {value ? (
                          <span className="shrink-0 text-[#C4A853]">{value}</span>
                        ) : null}
                      </div>
                      {component.description ? (
                        <div className="mt-0.5 break-words text-[8px] text-[#a0a898]">
                          {component.description}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[#425546] pt-2 text-[8px] text-[#88AA88]">
            <DetailMetric label="Manager" value={managerName} />
            <DetailMetric label="Team" value={teamName} />
            <DetailMetric label="Layer" value={formatManagerMomentLayer(trace.layer)} />
            <DetailMetric label="Type / Role" value={formatManagerMomentRole(trace)} />
            <DetailMetric
              label="Raw WPA"
              value={formatOptionalManagerMomentValue(trace.rawWpa)}
            />
            <DetailMetric label="Share" value={formatShare(trace.share)} />
            <DetailMetric label="Cap" value={formatCap(trace.cap)} />
            <DetailMetric
              label="Final Manager Value"
              value={formatManagerMomentFinalValue(trace)}
            />
            <DetailMetric
              className="col-span-2"
              label="Status"
              value={formatManagerMomentStatus(trace)}
            />
            <DetailMetric
              className="col-span-2"
              label="Source / Endpoint"
              value={`${trace.sourceEventId ?? "n/a"} / ${trace.endpointEventId ?? (trace.pending ? "pending" : "n/a")}`}
            />
            <DetailMetric
              className="col-span-2"
              label="Linked Events"
              value={linkedEvents}
            />
          </div>

          <div className="border-t border-[#425546] pt-2">
            <div className="mb-1 text-[7px] font-bold uppercase tracking-[0.16em] text-[#C4A853]">
              Linked Outcomes
            </div>
            {trace.linkedOutcomes.length > 0 ? (
              <ul className="m-0 space-y-1 p-0">
                {trace.linkedOutcomes.map((outcome) => (
                  <li
                    key={`${outcome.eventId}-${outcome.source}-${outcome.role}-${outcome.weightedWpa}`}
                    className="list-none border-t border-[#314437] pt-1 first:border-t-0 first:pt-0"
                  >
                    <span className="text-[#E8E8D8]">{outcome.eventId}</span>{" "}
                    <span className="text-[#88AA88]">
                      {titleCase(outcome.role)} {formatWeight(outcome.weight)}
                    </span>{" "}
                    <span className="text-[#a0a898]">
                      raw {formatSignedManagerMomentValue(outcome.rawWpa)}, weighted{" "}
                      {formatSignedManagerMomentValue(outcome.weightedWpa)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-[8px] text-[#a0a898]">
                No weighted outcomes linked.
              </div>
            )}
          </div>

          {children ? (
            <div className="border-t border-[#425546] pt-2">{children}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DetailMetric({
  className,
  label,
  value,
}: {
  className?: string;
  label: string;
  value: string;
}) {
  return (
    <div className={className}>
      <span className="block text-[#C4A853]">{label}</span>
      <span className="break-words text-[#E8E8D8]">{value}</span>
    </div>
  );
}

export default ManagerMomentDetailDialog;
