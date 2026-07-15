import { LEGAL_ROSTER } from '../data/rosterConstruction';
import { resolvePoolSizingTarget } from './poolFromDemand';

export type SnakePoolAssemblyMode = 'full-sources' | 'shape-to-teams';
export type SnakePoolCompetitionPreset = 'tight' | 'competitive' | 'loose';

export const SNAKE_POOL_COMPETITION_PRESETS = {
  tight: { label: 'TIGHT', multiplier: 1.2 },
  competitive: { label: 'COMPETITIVE', multiplier: 1.35 },
  loose: { label: 'LOOSE', multiplier: 1.5 },
} as const satisfies Record<SnakePoolCompetitionPreset, {
  label: string;
  multiplier: 1.2 | 1.35 | 1.5;
}>;

export const DEFAULT_SNAKE_POOL_ASSEMBLY_MODE: SnakePoolAssemblyMode = 'full-sources';
export const DEFAULT_SNAKE_POOL_COMPETITION_PRESET: SnakePoolCompetitionPreset = 'competitive';

export function authoritativeDraftPoolLockBlocked(input: {
  draftFormat: 'auction' | 'snake';
  legacySalaryOnlyBlocked: boolean;
  snakeRosterLocalProofBlocked: boolean;
}): boolean {
  return input.draftFormat === 'snake'
    ? input.snakeRosterLocalProofBlocked
    : input.legacySalaryOnlyBlocked;
}

export function draftPoolPreferenceScopeKey(
  leagueId: string,
  draftFormat: 'auction' | 'snake',
  poolMode: string,
): string {
  return `${leagueId}:${draftFormat}:${poolMode}`;
}

export function snakePoolCompetitionPresetFromMultiplier(
  multiplier: number | null | undefined,
): SnakePoolCompetitionPreset {
  if (multiplier !== null && multiplier !== undefined) {
    for (const [preset, definition] of Object.entries(SNAKE_POOL_COMPETITION_PRESETS)) {
      if (Math.abs(definition.multiplier - multiplier) < 1e-9) {
        return preset as SnakePoolCompetitionPreset;
      }
    }
  }
  return DEFAULT_SNAKE_POOL_COMPETITION_PRESET;
}

export function snakePoolSizeGuide(teamCount: number): {
  rosterDemand: number;
  targets: Record<SnakePoolCompetitionPreset, number>;
} {
  const teams = Math.max(0, Math.floor(teamCount));
  const rosterDemand = teams * LEGAL_ROSTER.size;
  return {
    rosterDemand,
    targets: Object.fromEntries(
      (Object.entries(SNAKE_POOL_COMPETITION_PRESETS) as Array<[
        SnakePoolCompetitionPreset,
        (typeof SNAKE_POOL_COMPETITION_PRESETS)[SnakePoolCompetitionPreset],
      ]>).map(([preset, definition]) => [
        preset,
        resolvePoolSizingTarget({
          teams,
          shills: 0,
          poolSizeMultiplier: definition.multiplier,
        }).effectiveTarget,
      ]),
    ) as Record<SnakePoolCompetitionPreset, number>,
  };
}

function normalizedIds(ids: readonly string[], validIds?: ReadonlySet<string>): Set<string> {
  return new Set(ids.filter((id) => id.length > 0 && (!validIds || validIds.has(id))));
}

export function updateSnakePoolManualOverrides(input: {
  handAdds: readonly string[];
  handRemoves: readonly string[];
  sourceIds: readonly string[];
  addedIds?: readonly string[];
  removedIds?: readonly string[];
}): { handAdds: string[]; handRemoves: string[] } {
  const handAdds = new Set(input.handAdds);
  const handRemoves = new Set(input.handRemoves);

  for (const id of input.addedIds ?? []) {
    handRemoves.delete(id);
    handAdds.add(id);
  }
  for (const id of input.removedIds ?? []) {
    handAdds.delete(id);
    // Remember removal intent even while the player sits outside the selected
    // source cohort. If that cohort later expands to include them, they must not
    // silently return after the GM explicitly took them out.
    handRemoves.add(id);
  }

  return {
    handAdds: [...handAdds].sort((a, b) => a.localeCompare(b)),
    handRemoves: [...handRemoves].sort((a, b) => a.localeCompare(b)),
  };
}

export function assembleFullSourcePoolIds(input: {
  sourceIds: readonly string[];
  handAdds?: readonly string[];
  handRemoves?: readonly string[];
  hardKeepIds?: readonly string[];
  validPlayerIds?: readonly string[];
}): string[] {
  const validIds = input.validPlayerIds ? new Set(input.validPlayerIds) : undefined;
  const result = normalizedIds(input.sourceIds, validIds);
  const hardKeeps = normalizedIds(input.hardKeepIds ?? [], validIds);
  for (const id of normalizedIds(input.handRemoves ?? [], validIds)) {
    if (!hardKeeps.has(id)) result.delete(id);
  }
  for (const id of normalizedIds(input.handAdds ?? [], validIds)) result.add(id);
  for (const id of hardKeeps) result.add(id);
  return [...result].sort((a, b) => a.localeCompare(b));
}
