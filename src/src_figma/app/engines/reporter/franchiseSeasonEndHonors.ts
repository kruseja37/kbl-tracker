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
import {
  applyFranchiseRaceSnubMorale,
  pickRaceSnubVictims,
  type FranchiseHonorKind,
} from '../../../../utils/franchiseRaceSnubMorale';
import { isFranchisePhase2L12Enabled } from '../../../../utils/franchisePhase2Flags';
import { emitFranchiseHonorNews } from './franchiseHonorEmission';

const SEASON_END_SNUB_TOP_N = 3;

type SeasonEndHonorKind = Extract<FranchiseHonorKind, 'MVP' | 'CY_YOUNG'>;

type SeasonEndHonorConfig = {
  category: FranchiseAwardCategory;
  honorKind: SeasonEndHonorKind;
  honorTier: Extract<FranchiseHonorTier, 'mvp' | 'cyYoung'>;
};

const SEASON_END_HONORS: SeasonEndHonorConfig[] = [
  { category: 'MVP', honorKind: 'MVP', honorTier: 'mvp' },
  { category: 'CY_YOUNG', honorKind: 'CY_YOUNG', honorTier: 'cyYoung' },
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

export async function emitFranchiseSeasonEndHonors(
  scope: SeasonEndHonorScope,
): Promise<{ status: 'dark-noop' | 'processed'; emitted: string[] }> {
  if (!isFranchisePhase2L12Enabled()) return { status: 'dark-noop', emitted: [] };

  const awards = await loadAwardRows(scope);
  const valueReport = await loadValueReport(scope);
  const teamByPlayer = new Map(valueReport.rows.map((row) => [row.playerId, row.currentTeamId]));
  const emitted: string[] = [];

  for (const honor of SEASON_END_HONORS) {
    const row = awards.find((award) =>
      award.category === honor.category &&
      award.finalized &&
      award.winnerPlayerId,
    );
    if (!row?.winnerPlayerId) continue;

    const winnerPlayerId = row.winnerPlayerId;
    const winnerTeamId = teamByPlayer.get(winnerPlayerId) ?? null;
    if (winnerTeamId === null) continue;

    try {
      const emitResult = await franchiseSeasonEndHonorsSeam.emit({
        honorInput: {
          franchiseId: scope.franchiseId,
          seasonId: scope.seasonId,
          seasonNumber: scope.seasonNumber,
          honorKind: honor.honorKind,
          triggerPhase: 'season-end',
          subjectIds: [winnerPlayerId],
          facts: { winnerId: winnerPlayerId },
        },
        teamId: winnerTeamId,
      });
      if (emitResult.status !== 'emitted') continue;
    } catch {
      continue;
    }

    emitted.push(honor.honorKind);

    try {
      await franchiseSeasonEndHonorsSeam.applyReachFloor({
        honorees: [{ playerId: winnerPlayerId, honorTier: honor.honorTier }],
        scope: {
          franchiseId: scope.franchiseId,
          seasonId: scope.seasonId,
          statsScopeId: scope.statsScopeId,
        },
        checkpointSentinel: 'season-end-honor',
      });
    } catch {
      // Reach-floor payout failure must not block snub payout or the next honor.
    }

    try {
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
      await franchiseSeasonEndHonorsSeam.applySnub({
        victims,
        honorKind: honor.honorKind,
        scope,
        timestamp: Date.parse(row.computedAt) || 0,
      });
    } catch {
      // Snub payout failure must not block the next honor.
    }
  }

  return { status: 'processed', emitted };
}
