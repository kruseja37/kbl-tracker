import type { AdaptiveStandardsConfig } from './franchiseAdaptiveStandards';
import { deriveAdaptiveStandardsConfig } from './franchiseAdaptiveStandards';
import { awardQualifierThresholds } from './franchiseAwardTrust';
import {
  replaceFranchiseAwardRowsForScope,
  type FranchiseAwardCategory,
  type FranchiseAwardRow,
  type FranchiseAwardsScopeInput,
} from './franchiseAwardsStorage';
import type { FranchiseTrustedValueArtifact } from './franchiseTrustedValueStorage';
import {
  getTrustedValueArtifact,
  isPlayerTrustedForValue,
} from './franchiseTrustedValueStorage';
import {
  buildFranchiseValueInputRows,
  type FranchiseValueInputRow,
} from './franchiseValueInputs';
import {
  getFranchiseTrueValueRows,
  type FranchiseTrueValueRow,
} from './franchiseTrueValueStorage';
import { buildFranchiseAnalyticsTrustReport } from './franchiseAnalyticsTrust';
import { getCareerStats } from './careerStorage';
import {
  getAllBattingStats,
  getAllPitchingStats,
  type PlayerSeasonBatting,
  type PlayerSeasonPitching,
} from './seasonStorage';

export type FranchiseWarAwardCategory = Extract<
  FranchiseAwardCategory,
  'MVP' | 'CY_YOUNG' | 'ROOKIE_OF_YEAR' | 'GOLD_GLOVE' | 'SILVER_SLUGGER'
>;

export interface FranchiseWarAwardQualifierFacts {
  playerId: string;
  plateAppearances?: number | null;
  inningsPitched?: number | null;
}

export interface ComputeFranchiseWarAwardsInput extends FranchiseAwardsScopeInput {
  valueRows: FranchiseValueInputRow[];
  trueValueRows: FranchiseTrueValueRow[];
  trustedValueArtifact: FranchiseTrustedValueArtifact | null;
  adaptiveStandardsConfig: AdaptiveStandardsConfig;
  qualifierFacts: FranchiseWarAwardQualifierFacts[];
  rookiePlayerIds: Set<string>;
  trustedForAwards: boolean;
  computedAt: string;
}

export interface ComputeAndPersistFranchiseWarAwardsScope extends FranchiseAwardsScopeInput {
  seasonNumber: number;
  computedAt?: string;
}

type ScoreSelector = (row: FranchiseValueInputRow) => number | null;

const WAR_AWARD_CATEGORIES: readonly FranchiseWarAwardCategory[] = [
  'MVP',
  'CY_YOUNG',
  'ROOKIE_OF_YEAR',
  'GOLD_GLOVE',
  'SILVER_SLUGGER',
];

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function rounded(value: number): number {
  return Number(value.toFixed(3));
}

function factsByPlayerId(
  rows: FranchiseWarAwardQualifierFacts[],
): Map<string, FranchiseWarAwardQualifierFacts> {
  return new Map(rows.map((row) => [row.playerId, row]));
}

function trueValueRowsByPlayerId(
  rows: FranchiseTrueValueRow[],
): Map<string, FranchiseTrueValueRow> {
  return new Map(rows.map((row) => [row.playerId, row]));
}

function scoreForCategory(
  category: FranchiseWarAwardCategory,
): ScoreSelector {
  switch (category) {
    case 'MVP':
    case 'ROOKIE_OF_YEAR':
      return (row) => row.warPreviewValues.totalWar;
    case 'CY_YOUNG':
      return (row) => row.warPreviewValues.pitchingWar;
    case 'GOLD_GLOVE':
      return (row) => row.warPreviewValues.fieldingWar;
    case 'SILVER_SLUGGER':
      return (row) => row.warPreviewValues.battingWar;
  }
}

function meetsQualifier(params: {
  category: FranchiseWarAwardCategory;
  facts: FranchiseWarAwardQualifierFacts | undefined;
  minPlateAppearances: number;
  minInningsPitched: number;
}): boolean {
  if (!params.facts) return false;
  if (params.category === 'CY_YOUNG') {
    return finiteNumber(params.facts.inningsPitched) &&
      params.facts.inningsPitched >= params.minInningsPitched;
  }

  return finiteNumber(params.facts.plateAppearances) &&
    params.facts.plateAppearances >= params.minPlateAppearances;
}

function categoryCandidateRows(params: {
  category: FranchiseWarAwardCategory;
  valueRows: FranchiseValueInputRow[];
  trueValueByPlayerId: Map<string, FranchiseTrueValueRow>;
  trustedValueArtifact: FranchiseTrustedValueArtifact;
  qualifierByPlayerId: Map<string, FranchiseWarAwardQualifierFacts>;
  minPlateAppearances: number;
  minInningsPitched: number;
  rookiePlayerIds: Set<string>;
}): Array<{
  row: FranchiseValueInputRow;
  score: number;
  trueValueScore: number;
}> {
  const scoreSelector = scoreForCategory(params.category);

  return params.valueRows
    .map((row) => {
      const trueValueRow = params.trueValueByPlayerId.get(row.playerId);
      const score = scoreSelector(row);
      if (
        !trueValueRow ||
        !isPlayerTrustedForValue(params.trustedValueArtifact, row.playerId) ||
        !finiteNumber(score) ||
        !meetsQualifier({
          category: params.category,
          facts: params.qualifierByPlayerId.get(row.playerId),
          minPlateAppearances: params.minPlateAppearances,
          minInningsPitched: params.minInningsPitched,
        })
      ) {
        return null;
      }
      if (
        params.category === 'ROOKIE_OF_YEAR' &&
        !params.rookiePlayerIds.has(row.playerId)
      ) {
        return null;
      }

      return {
        row,
        score,
        trueValueScore: trueValueRow.trueValue,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((left, right) =>
      right.score - left.score ||
      right.trueValueScore - left.trueValueScore ||
      left.row.playerId.localeCompare(right.row.playerId),
    );
}

function buildAwardRow(params: {
  scope: FranchiseAwardsScopeInput;
  category: FranchiseWarAwardCategory;
  candidates: ReturnType<typeof categoryCandidateRows>;
  computedAt: string;
}): FranchiseAwardRow | null {
  const winner = params.candidates[0];
  if (!winner) return null;
  const winnerScore = rounded(winner.score);

  return {
    ...params.scope,
    category: params.category,
    winnerPlayerId: winner.row.playerId,
    candidates: params.candidates.map((candidate) => {
      const score = rounded(candidate.score);
      return {
        playerId: candidate.row.playerId,
        score,
        marginToWinner: rounded(score - winnerScore),
      };
    }),
    goldGloveSplit: params.category === 'GOLD_GLOVE'
      ? {
          fWar: rounded(winner.score),
          totalWar: finiteNumber(winner.row.warPreviewValues.totalWar)
            ? rounded(winner.row.warPreviewValues.totalWar)
            : null,
        }
      : null,
    voteWeight: null,
    finalized: false,
    computedAt: params.computedAt,
  };
}

export function computeFranchiseWarAwards(
  input: ComputeFranchiseWarAwardsInput,
): FranchiseAwardRow[] {
  const trustedValueArtifact = input.trustedValueArtifact;
  if (
    !input.trustedForAwards ||
    trustedValueArtifact?.frozen !== true
  ) {
    return [];
  }

  const thresholds = awardQualifierThresholds(input.adaptiveStandardsConfig);
  const scope = {
    franchiseId: input.franchiseId,
    seasonId: input.seasonId,
    statsScopeId: input.statsScopeId,
  };
  const qualifierByPlayerId = factsByPlayerId(input.qualifierFacts);
  const trueValueByPlayerId = trueValueRowsByPlayerId(input.trueValueRows);

  return WAR_AWARD_CATEGORIES
    .map((category) => buildAwardRow({
      scope,
      category,
      candidates: categoryCandidateRows({
        category,
        valueRows: input.valueRows,
        trueValueByPlayerId,
        trustedValueArtifact,
        qualifierByPlayerId,
        minPlateAppearances: thresholds.minPlateAppearances,
        minInningsPitched: thresholds.minInningsPitched,
        rookiePlayerIds: input.rookiePlayerIds,
      }),
      computedAt: input.computedAt,
    }))
    .filter((row): row is FranchiseAwardRow => row !== null);
}

function qualifierFactsFromStats(
  battingRows: PlayerSeasonBatting[],
  pitchingRows: PlayerSeasonPitching[],
): FranchiseWarAwardQualifierFacts[] {
  const facts = new Map<string, FranchiseWarAwardQualifierFacts>();
  for (const row of battingRows) {
    facts.set(row.playerId, {
      ...(facts.get(row.playerId) ?? { playerId: row.playerId }),
      plateAppearances: row.pa,
    });
  }
  for (const row of pitchingRows) {
    facts.set(row.playerId, {
      ...(facts.get(row.playerId) ?? { playerId: row.playerId }),
      inningsPitched: row.outsRecorded / 3,
    });
  }
  return Array.from(facts.values()).sort((left, right) => left.playerId.localeCompare(right.playerId));
}

async function loadRookiePlayerIds(playerIds: string[]): Promise<Set<string>> {
  const rookies = new Set<string>();
  await Promise.all(playerIds.map(async (playerId) => {
    const career = await getCareerStats(playerId);
    if (
      career.batting?.seasonsPlayed === 0 ||
      career.pitching?.seasonsPlayed === 0 ||
      career.fielding?.seasonsPlayed === 0
    ) {
      rookies.add(playerId);
    }
  }));
  return rookies;
}

export async function computeAndPersistFranchiseWarAwards(
  scope: ComputeAndPersistFranchiseWarAwardsScope,
): Promise<FranchiseAwardRow[]> {
  const valueInputReport = await buildFranchiseValueInputRows({
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    seasonNumber: scope.seasonNumber,
  });
  const [
    trustedValueArtifact,
    trueValueRows,
    battingRows,
    pitchingRows,
    rookiePlayerIds,
  ] = await Promise.all([
    getTrustedValueArtifact(scope.franchiseId, scope.seasonId, scope.statsScopeId),
    getFranchiseTrueValueRows(scope),
    getAllBattingStats(scope.statsScopeId),
    getAllPitchingStats(scope.statsScopeId),
    loadRookiePlayerIds(valueInputReport.rows.map((row) => row.playerId)),
  ]);
  const trustReport = buildFranchiseAnalyticsTrustReport({
    valueInputReport,
  });
  const awards = computeFranchiseWarAwards({
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    valueRows: valueInputReport.rows,
    trueValueRows,
    trustedValueArtifact,
    adaptiveStandardsConfig: deriveAdaptiveStandardsConfig({
      gamesPerTeam: valueInputReport.seasonContext.gamesPerTeam,
      inningsPerGame: valueInputReport.seasonContext.inningsPerGame,
    }),
    qualifierFacts: qualifierFactsFromStats(battingRows, pitchingRows),
    rookiePlayerIds,
    trustedForAwards: trustReport.war.trustedForAwards,
    computedAt: scope.computedAt ?? new Date().toISOString(),
  }).map((row) => ({
    ...row,
    finalized: true,
  }));

  return replaceFranchiseAwardRowsForScope(scope, awards);
}
