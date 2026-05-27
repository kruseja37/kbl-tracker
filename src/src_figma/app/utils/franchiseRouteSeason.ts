import { loadFranchise } from "../../../utils/franchiseManager";

export function readGlobalCurrentSeasonNumber(): number {
  const stored = localStorage.getItem('kbl-current-season');
  const parsed = stored ? parseInt(stored, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function getInitialRouteSeasonNumber(franchiseId?: string): number {
  return franchiseId ? 1 : readGlobalCurrentSeasonNumber();
}

export async function loadRouteSeasonNumber(franchiseId?: string): Promise<number> {
  if (!franchiseId) {
    return readGlobalCurrentSeasonNumber();
  }

  if (typeof indexedDB === 'undefined') {
    return 1;
  }

  const metadata = await loadFranchise(franchiseId);
  return metadata?.currentSeason ?? 1;
}
