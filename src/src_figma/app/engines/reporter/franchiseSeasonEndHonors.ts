import {
  getFranchiseAwardRowsByScope,
  type FranchiseAwardCategory,
  type FranchiseAwardRow,
} from '../../../../utils/franchiseAwardsStorage';
import {
  buildFranchiseValueInputRows,
  type FranchiseValueInputReport,
} from '../../../../utils/franchiseValueInputs';
import { applyFranchiseHonorReachFloor, type FranchiseHonorTier } from '../../../../utils/franchiseHonorReachFloor';
import { getFranchiseFameRecord } from '../../../../utils/franchiseFameRecordsStorage';
import {
  applyFranchiseRaceSnubMorale,
  pickRaceSnubVictims,
  type FranchiseHonorKind,
} from '../../../../utils/franchiseRaceSnubMorale';
import { persistRaceSnubRivalryEdges } from '../../../../utils/franchiseRelationshipEnvyCompute';
import { isFranchisePhase2L12Enabled } from '../../../../utils/franchisePhase2Flags';
import { emitFranchiseHonorNews } from './franchiseHonorEmission';
import type { FranchiseHonorKind as FranchiseHonorNewsKind } from './franchiseL12AwardNewsAdapter';

const SEASON_END_SNUB_TOP_N = 3;
const SEASON_END_HONOR_SENTINEL = 'season-end-honor';

type SeasonEndNewsKind = Exclude<FranchiseHonorNewsKind, 'ALL_STAR'>;

type SeasonEndHonorConfig = {
  category: FranchiseAwardCategory;
  honorTier: FranchiseHonorTier;
  newsKind: SeasonEndNewsKind;
  snubKind?: FranchiseHonorKind;
};

const PLAYER_AWARD_HONORS: SeasonEndHonorConfig[] = [
  { category: 'MVP', honorTier: 'mvp', newsKind: 'MVP', snubKind: 'MVP' },
  { category: 'CY_YOUNG', honorTier: 'cyYoung', newsKind: 'CY_YOUNG', snubKind: 'CY_YOUNG' },
  { category: 'ROOKIE_OF_YEAR', honorTier: 'rookie', newsKind: 'ROOKIE_OF_YEAR', snubKind: 'ROOKIE_OF_YEAR' },
  { category: 'RELIEVER_OF_YEAR', honorTier: 'reliever', newsKind: 'RELIEVER_OF_YEAR', snubKind: 'RELIEVER_OF_YEAR' },
  { category: 'GOLD_GLOVE', honorTier: 'goldGlove', newsKind: 'GOLD_GLOVE' },
  { category: 'SILVER_SLUGGER', honorTier: 'silverSlugger', newsKind: 'SILVER_SLUGGER' },
  { category: 'BENCH_PLAYER', honorTier: 'benchPlayer', newsKind: 'BENCH_PLAYER' },
  { category: 'BOOGER_GLOVE', honorTier: 'boogerGlove', newsKind: 'BOOGER_GLOVE' },
];

type SeasonEndHonorScope = {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
};

export const franchiseSeasonEndHonorsSeam = {
  getAwards: getFranchiseAwardRowsByScope,
  getValueRows: buildFranchiseValueInputRows,
  emit: emitFranchiseHonorNews,
  getFameRecord: getFranchiseFameRecord,
  applyReachFloor: applyFranchiseHonorReachFloor,
  applySnub: applyFranchiseRaceSnubMorale,
};

async function loadAwardRows(scope: SeasonEndHonorScope): Promise<FranchiseAwardRow[]> {
  try {
    return await franchiseSeasonEndHonorsSeam.getAwards({
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
      statsScopeId: scope.statsScopeId,
    });
  } catch {
    return [];
  }
}

async function loadValueReport(scope: SeasonEndHonorScope): Promise<Pick<FranchiseValueInputReport, 'rows'>> {
  try {
    return await franchiseSeasonEndHonorsSeam.getValueRows(scope);
  } catch {
    return { rows: [] };
  }
}

async function applyRaceSnubAndEnvyEdge(
  row: FranchiseAwardRow,
  winnerPlayerId: string,
  honorKind: FranchiseHonorKind,
  teamByPlayer: Map<string, string | null>,
  scope: SeasonEndHonorScope,
): Promise<void> {
  const victims = pickRaceSnubVictims(
    row.candidates
      .map((candidate) => ({
        playerId: candidate.playerId,
        teamId: teamByPlayer.get(candidate.playerId) ?? '',
        marginToWinner: candidate.marginToWinner,
      }))
      .filter((candidate) => candidate.teamId !== ''),
    new Set([winnerPlayerId]),
    SEASON_END_SNUB_TOP_N,
  );

  try {
    await franchiseSeasonEndHonorsSeam.applySnub({
      victims,
      honorKind,
      scope,
      timestamp: Date.parse(row.computedAt) || 0,
    });
  } catch {
    // Snub payout failure must not block the next honor.
  }

  try {
    await persistRaceSnubRivalryEdges({
      pairs: victims.map((victim) => ({
        snubbedPlayerId: victim.playerId,
        honoredPlayerId: winnerPlayerId,
      })),
      scope,
      timestamp: Date.parse(row.computedAt) || 0,
    });
  } catch {
    // Envy-edge failure must not block the next honor.
  }
}

export async function emitFranchiseSeasonEndHonors(
  scope: SeasonEndHonorScope,
): Promise<{ status: 'dark-noop' | 'processed'; emitted: string[] }> {
  if (!isFranchisePhase2L12Enabled()) return { status: 'dark-noop', emitted: [] };

  const awards = await loadAwardRows(scope);
  const valueReport = await loadValueReport(scope);
  const teamByPlayer = new Map(valueReport.rows.map((row) => [row.playerId, row.currentTeamId]));
  const emitted: string[] = [];
  const fameScope = {
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
  };
  const fameHonorees: { playerId: string; honorTier: FranchiseHonorTier }[] = [];

  for (const honor of PLAYER_AWARD_HONORS) {
    const row = awards.find((award) =>
      award.category === honor.category &&
      award.finalized &&
      award.winnerPlayerId,
    );
    if (!row?.winnerPlayerId) continue;

    const winnerPlayerId = row.winnerPlayerId;
    const winnerTeamId = teamByPlayer.get(winnerPlayerId) ?? null;
    if (winnerTeamId === null) continue;

    let nodEmitted = false;
    try {
      const emitResult = await franchiseSeasonEndHonorsSeam.emit({
        honorInput: {
          franchiseId: scope.franchiseId,
          seasonId: scope.seasonId,
          seasonNumber: scope.seasonNumber,
          honorKind: honor.newsKind,
          triggerPhase: 'season-end',
          subjectIds: [winnerPlayerId],
          facts: { winnerId: winnerPlayerId },
        },
        teamId: winnerTeamId,
      });
      nodEmitted = emitResult.status === 'emitted';
    } catch {
      nodEmitted = false;
    }

    if (nodEmitted) emitted.push(honor.newsKind);

    try {
      const fameRecord = await franchiseSeasonEndHonorsSeam.getFameRecord(fameScope, winnerPlayerId);
      if (fameRecord?.updatedAtCheckpoint !== SEASON_END_HONOR_SENTINEL) {
        fameHonorees.push({ playerId: winnerPlayerId, honorTier: honor.honorTier });
      }
    } catch {
      // Fame lookup failure must not block snub payout or the next honor.
    }

    if (honor.snubKind) {
      await applyRaceSnubAndEnvyEdge(row, winnerPlayerId, honor.snubKind, teamByPlayer, scope);
    }
  }

  if (fameHonorees.length > 0) {
    try {
      await franchiseSeasonEndHonorsSeam.applyReachFloor({
        honorees: fameHonorees,
        scope: fameScope,
        checkpointSentinel: SEASON_END_HONOR_SENTINEL,
      });
    } catch {
      // Reach-floor payout failure must not block season-end honor processing.
    }
  }

  return { status: 'processed', emitted };
}
