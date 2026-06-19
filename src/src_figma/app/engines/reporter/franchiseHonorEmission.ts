import { isFranchisePhase2L12Enabled } from '../../../../utils/franchisePhase2Flags';
import { loadSeasonEmissionConfig } from '../../../../utils/seasonEmissionConfigStorage';
import { listSeasonNewsItemsByEvent, persistSeasonNewsItem } from '../../../../utils/seasonNewsStorage';
import { getReporterForTeam } from '../../../../utils/reporterStorage';
import { generateSeasonNewsTake, shouldEmitSeasonNews } from './seasonNewsGenerator';
import { buildFranchiseAwardSeasonNewsEvent, type FranchiseHonorNewsInput } from './franchiseL12AwardNewsAdapter';

// Seam for test injection (mirror raceStandingsSeam / allStarRosterSeam).
export const franchiseHonorEmissionSeam = {
  loadConfig: loadSeasonEmissionConfig,
  listByEvent: listSeasonNewsItemsByEvent,
  getReporter: getReporterForTeam,
  generateTake: generateSeasonNewsTake,
  persist: persistSeasonNewsItem,
};

export type EmitHonorStatus = 'dark-noop' | 'gated' | 'deduped' | 'no-reporter' | 'take-failed' | 'emitted';
export type EmitHonorResult = { status: EmitHonorStatus; reason?: string };

export async function emitFranchiseHonorNews(params: {
  honorInput: FranchiseHonorNewsInput;
  teamId: string;
  leagueId?: string;
}): Promise<EmitHonorResult> {
  if (!isFranchisePhase2L12Enabled()) return { status: 'dark-noop', reason: 'Phase-2 L12 disabled.' };

  const config = await franchiseHonorEmissionSeam.loadConfig();
  // Marquee awards emit by default (Fork F3) unless the config explicitly set AWARD_RESULT (0 = opt-out),
  // without writing the stored config.
  const effectiveConfig = {
    ...config,
    perEventRate: { ...config.perEventRate, AWARD_RESULT: config.perEventRate.AWARD_RESULT ?? 1 },
  };
  if (!shouldEmitSeasonNews('AWARD_RESULT', effectiveConfig)) return { status: 'gated' };

  // Overcounting valve (Fork F5): one AWARD_RESULT per (franchise, season, honorKind).
  const existing = await franchiseHonorEmissionSeam.listByEvent(
    params.honorInput.franchiseId, params.honorInput.seasonId, 'AWARD_RESULT',
  );
  if (existing.some((item) => item.facts?.honorKind === params.honorInput.honorKind)) {
    return { status: 'deduped' };
  }

  const reporter = await franchiseHonorEmissionSeam.getReporter(params.teamId, params.leagueId, params.honorInput.franchiseId);
  if (!reporter) return { status: 'no-reporter' };

  const event = buildFranchiseAwardSeasonNewsEvent(params.honorInput);
  const item = await franchiseHonorEmissionSeam.generateTake(event, reporter, effectiveConfig);
  if (!item) return { status: 'take-failed' };

  await franchiseHonorEmissionSeam.persist(item);
  return { status: 'emitted' };
}
