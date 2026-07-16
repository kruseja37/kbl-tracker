import type { BoardPriorityGap } from "../components/DraftRosterBoard";

export function buildFarmBridgeHeadline(
  gaps: readonly BoardPriorityGap[],
  sourceTeamId: string | null | undefined,
  seatTeamId: string | null | undefined,
): string | null {
  if (!sourceTeamId || !seatTeamId || sourceTeamId !== seatTeamId) return null;
  if (gaps.length === 0) return null;
  const top = gaps.slice(0, 2).map((gap) => gap.label.replace(/\.$/, "")).join(" · ");
  return `Board flags: ${top} — work the farm floor there first.`;
}
