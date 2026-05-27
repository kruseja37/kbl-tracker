import {
  createUnavailableFranchiseOffseasonAdapter,
  type FranchiseOffseasonAdapterPhase,
} from '../../../utils/franchiseOffseasonAdapters';

export const FRANCHISE_OFFSEASON_TEMPLATE_MUTATION_MESSAGE =
  'This prototype offseason action is read-only in Franchise Mode v1 because it would mutate the League Builder template. Franchise roster mutations will be enabled after franchise-owned offseason storage is wired.';

export function shouldBlockFranchiseTemplateMutation(franchiseId?: string): boolean {
  return Boolean(franchiseId);
}

export function parseSeasonNumberFromSeasonId(seasonId: string, fallback = 1): number {
  const match = seasonId.match(/(?:^|-)season-(\d+)$/);
  if (!match) return fallback;

  const parsed = parseInt(match[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getFranchisePrototypeAdapterBoundary(phase: FranchiseOffseasonAdapterPhase) {
  return createUnavailableFranchiseOffseasonAdapter(
    phase,
    FRANCHISE_OFFSEASON_TEMPLATE_MUTATION_MESSAGE,
  );
}
