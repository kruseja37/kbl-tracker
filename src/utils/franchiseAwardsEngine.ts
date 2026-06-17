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
  getRecentGames,
  type CompletedGameRecord,
} from './gameStorage';
import {
  calculateStandings,
  getAllBattingStats,
  getAllPitchingStats,
  type PlayerSeasonBatting,
  type PlayerSeasonPitching,
  type TeamStanding,
} from './seasonStorage';

export type FranchiseWarAwardCategory = Extract<
  FranchiseAwardCategory,
  'MVP' | 'CY_YOUNG' | 'ROOKIE_OF_YEAR' | 'GOLD_GLOVE' | 'SILVER_SLUGGER'
>;

export type FranchiseManagerAwardCategory = Extract<
  FranchiseAwardCategory,
  'MANAGER_OF_YEAR'
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

export interface FranchiseManagerAwardAggregate {
  managerId: string;
  teamId: string;
  tacticalManagerWpa: number;
  deploymentWpa: number;
  lineupDeltaWpa: number;
}

export interface ComputeFranchiseManagerOfYearInput extends FranchiseAwardsScopeInput {
  managerAggregates: FranchiseManagerAwardAggregate[];
  trueValueRows: FranchiseTrueValueRow[];
  trustedValueArtifact: FranchiseTrustedValueArtifact | null;
  standings: TeamStanding[];
  gamesPerTeam: number | null;
  trustedForAwards: boolean;
  computedAt: string;
}

export interface ComputeAndPersistFranchiseWarAwardsScope extends FranchiseAwardsScopeInput {
  seasonNumber: number;
  computedAt?: string;
}

export interface ComputeFranchiseAwardsPreviewScope extends FranchiseAwardsScopeInput {
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

const MANAGER_OF_YEAR_CATEGORY: FranchiseManagerAwardCategory = 'MANAGER_OF_YEAR';
const MANAGER_OF_YEAR_GAME_LIMIT = 1000;

// MOY-7: Simulation-Gate placeholder. Equal weights are intentionally temporary.
const MANAGER_OF_YEAR_SIM_GATE_PLACEHOLDER_WEIGHTS = {
  tacticalManagerWpa: 0.25,
  deploymentWpa: 0.25,
  lineupDeltaWpa: 0.25,
  recordWinsAboveExpectation: 0.25,
} as const;

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

function scaleToUnitRange(values: number[]): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) {
    return values.map(() => 0.5);
  }
  return values.map((value) => (value - min) / (max - min));
}

export function aggregateManagerAwardInputsFromGames(
  games: CompletedGameRecord[],
): FranchiseManagerAwardAggregate[] {
  const byManager = new Map<string, FranchiseManagerAwardAggregate>();

  for (const game of games) {
    for (const total of game.managerWpaTotals ?? []) {
      const existing = byManager.get(total.managerId);
      if (existing) {
        existing.tacticalManagerWpa += finiteNumber(total.tacticalManagerWpa) ? total.tacticalManagerWpa : 0;
        existing.deploymentWpa += finiteNumber(total.deploymentWpa) ? total.deploymentWpa : 0;
        existing.lineupDeltaWpa += finiteNumber(total.lineupDeltaWpa) ? total.lineupDeltaWpa : 0;
        if (!existing.teamId && total.teamId) {
          existing.teamId = total.teamId;
        }
      } else {
        byManager.set(total.managerId, {
          managerId: total.managerId,
          teamId: total.teamId,
          tacticalManagerWpa: finiteNumber(total.tacticalManagerWpa) ? total.tacticalManagerWpa : 0,
          deploymentWpa: finiteNumber(total.deploymentWpa) ? total.deploymentWpa : 0,
          lineupDeltaWpa: finiteNumber(total.lineupDeltaWpa) ? total.lineupDeltaWpa : 0,
        });
      }
    }
  }

  return Array.from(byManager.values())
    .sort((left, right) => left.managerId.localeCompare(right.managerId));
}

function managerRecordTermByTeam(params: {
  trustedValueArtifact: FranchiseTrustedValueArtifact;
  trueValueRows: FranchiseTrueValueRow[];
  standings: TeamStanding[];
  gamesPerTeam: number | null;
}): Map<string, { actualWins: number | null; expectedWins: number | null; recordTerm: number }> {
  const actualWinsByTeamId = new Map(
    params.standings.map((standing) => [standing.teamId, standing.wins]),
  );
  const neutralRecords = new Map<string, { actualWins: number | null; expectedWins: number | null; recordTerm: number }>();
  for (const teamId of actualWinsByTeamId.keys()) {
    const actualWins = actualWinsByTeamId.get(teamId) ?? null;
    neutralRecords.set(teamId, {
      actualWins,
      expectedWins: actualWins,
      recordTerm: 0,
    });
  }

  if (!finiteNumber(params.gamesPerTeam) || params.gamesPerTeam <= 0) {
    return neutralRecords;
  }

  const trueValueByPlayerId = trueValueRowsByPlayerId(params.trueValueRows);
  const rosterTeamByPlayerId = new Map(
    params.trustedValueArtifact.rosterStateSnapshot.map((row) => [row.playerId, row.teamId]),
  );
  const trustedPlayerIds = params.trustedValueArtifact.trustedPlayerIds;
  const teamTrustedValue = new Map<string, number>();

  for (const playerId of trustedPlayerIds) {
    const teamId = rosterTeamByPlayerId.get(playerId);
    if (!teamId) {
      return neutralRecords;
    }
    const trueValueRow = trueValueByPlayerId.get(playerId);
    const trueValue = trueValueRow?.trueValue;
    if (!finiteNumber(trueValue)) {
      continue;
    }
    teamTrustedValue.set(teamId, (teamTrustedValue.get(teamId) ?? 0) + trueValue);
  }

  if (teamTrustedValue.size <= 1) {
    return neutralRecords;
  }

  const totalTrustedValue = Array.from(teamTrustedValue.values())
    .reduce((sum, value) => sum + value, 0);
  if (!finiteNumber(totalTrustedValue) || totalTrustedValue <= 0) {
    return neutralRecords;
  }

  const records = new Map<string, { actualWins: number | null; expectedWins: number | null; recordTerm: number }>();
  for (const [teamId, teamValue] of teamTrustedValue.entries()) {
    const actualWins = actualWinsByTeamId.get(teamId);
    const expectedWins = (teamValue / totalTrustedValue) * params.gamesPerTeam;
    records.set(teamId, {
      actualWins: finiteNumber(actualWins) ? actualWins : null,
      expectedWins,
      recordTerm: finiteNumber(actualWins) ? actualWins - expectedWins : 0,
    });
  }

  return records;
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

function computeFranchiseWarAwardsFromEligibleInput(
  input: ComputeFranchiseWarAwardsInput,
): FranchiseAwardRow[] {
  const trustedValueArtifact = input.trustedValueArtifact;
  if (!trustedValueArtifact) {
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

  return computeFranchiseWarAwardsFromEligibleInput(input);
}

function computeFranchiseManagerOfYearFromEligibleInput(
  input: ComputeFranchiseManagerOfYearInput,
): FranchiseAwardRow | null {
  const trustedValueArtifact = input.trustedValueArtifact;
  if (!trustedValueArtifact) {
    return null;
  }

  const managers = input.managerAggregates
    .filter((manager) => manager.managerId && manager.teamId)
    .sort((left, right) => left.managerId.localeCompare(right.managerId));
  if (managers.length === 0) {
    return null;
  }

  const recordByTeamId = managerRecordTermByTeam({
    trustedValueArtifact,
    trueValueRows: input.trueValueRows,
    standings: input.standings,
    gamesPerTeam: input.gamesPerTeam,
  });
  const tacticalNormalized = scaleToUnitRange(managers.map((manager) => manager.tacticalManagerWpa));
  const deploymentNormalized = scaleToUnitRange(managers.map((manager) => manager.deploymentWpa));
  const lineupNormalized = scaleToUnitRange(managers.map((manager) => manager.lineupDeltaWpa));
  const recordNormalized = scaleToUnitRange(managers.map((manager) =>
    recordByTeamId.get(manager.teamId)?.recordTerm ?? 0,
  ));

  const candidates = managers
    .map((manager, index) => {
      const record = recordByTeamId.get(manager.teamId) ?? {
        actualWins: null,
        expectedWins: null,
        recordTerm: 0,
      };
      const score =
        (tacticalNormalized[index] * MANAGER_OF_YEAR_SIM_GATE_PLACEHOLDER_WEIGHTS.tacticalManagerWpa) +
        (deploymentNormalized[index] * MANAGER_OF_YEAR_SIM_GATE_PLACEHOLDER_WEIGHTS.deploymentWpa) +
        (lineupNormalized[index] * MANAGER_OF_YEAR_SIM_GATE_PLACEHOLDER_WEIGHTS.lineupDeltaWpa) +
        (recordNormalized[index] * MANAGER_OF_YEAR_SIM_GATE_PLACEHOLDER_WEIGHTS.recordWinsAboveExpectation);
      return {
        managerId: manager.managerId,
        score,
        actualWins: record.actualWins,
        expectedWins: record.expectedWins,
      };
    })
    .sort((left, right) =>
      right.score - left.score ||
      left.managerId.localeCompare(right.managerId),
    );
  const winner = candidates[0];
  if (!winner) return null;

  const winnerScore = rounded(winner.score);
  return {
    franchiseId: input.franchiseId,
    seasonId: input.seasonId,
    statsScopeId: input.statsScopeId,
    category: MANAGER_OF_YEAR_CATEGORY,
    winnerPlayerId: winner.managerId,
    candidates: candidates.map((candidate) => {
      const score = rounded(candidate.score);
      return {
        playerId: candidate.managerId,
        score,
        marginToWinner: rounded(score - winnerScore),
      };
    }),
    goldGloveSplit: null,
    managerActualWins: winner.actualWins,
    managerExpectedWins: finiteNumber(winner.expectedWins) ? rounded(winner.expectedWins) : null,
    voteWeight: null,
    finalized: false,
    computedAt: input.computedAt,
  };
}

export function computeFranchiseManagerOfYear(
  input: ComputeFranchiseManagerOfYearInput,
): FranchiseAwardRow | null {
  const trustedValueArtifact = input.trustedValueArtifact;
  if (
    !input.trustedForAwards ||
    trustedValueArtifact?.frozen !== true
  ) {
    return null;
  }

  return computeFranchiseManagerOfYearFromEligibleInput(input);
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
    managerGames,
    standings,
  ] = await Promise.all([
    getTrustedValueArtifact(scope.franchiseId, scope.seasonId, scope.statsScopeId),
    getFranchiseTrueValueRows(scope),
    getAllBattingStats(scope.statsScopeId),
    getAllPitchingStats(scope.statsScopeId),
    loadRookiePlayerIds(valueInputReport.rows.map((row) => row.playerId)),
    getRecentGames(MANAGER_OF_YEAR_GAME_LIMIT, {
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
      statsScopeId: scope.statsScopeId,
    }),
    calculateStandings(scope.seasonId),
  ]);
  const trustReport = buildFranchiseAnalyticsTrustReport({
    valueInputReport,
  });
  const adaptiveStandardsConfig = deriveAdaptiveStandardsConfig({
    gamesPerTeam: valueInputReport.seasonContext.gamesPerTeam,
    inningsPerGame: valueInputReport.seasonContext.inningsPerGame,
  });
  const computedAt = scope.computedAt ?? new Date().toISOString();
  const warAwards = computeFranchiseWarAwards({
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    valueRows: valueInputReport.rows,
    trueValueRows,
    trustedValueArtifact,
    adaptiveStandardsConfig,
    qualifierFacts: qualifierFactsFromStats(battingRows, pitchingRows),
    rookiePlayerIds,
    trustedForAwards: trustReport.war.trustedForAwards,
    computedAt,
  });
  const managerAward = computeFranchiseManagerOfYear({
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    managerAggregates: aggregateManagerAwardInputsFromGames(managerGames),
    trueValueRows,
    trustedValueArtifact,
    standings,
    gamesPerTeam: adaptiveStandardsConfig.gamesPerSeason,
    trustedForAwards: trustReport.war.trustedForAwards,
    computedAt,
  });
  const awards = [
    ...warAwards,
    ...(managerAward ? [managerAward] : []),
  ].map((row) => ({
    ...row,
    finalized: true,
  }));

  return replaceFranchiseAwardRowsForScope(scope, awards);
}

export async function computeFranchiseAwardsPreview(
  scope: ComputeFranchiseAwardsPreviewScope,
): Promise<FranchiseAwardRow[]> {
  const valueInputReport = await buildFranchiseValueInputRows({
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    seasonNumber: scope.seasonNumber,
  });
  const trustReport = buildFranchiseAnalyticsTrustReport({
    valueInputReport,
  });

  if (!trustReport.war.warLikePreviewAvailable) {
    return [];
  }

  const [
    trustedValueArtifact,
    trueValueRows,
    battingRows,
    pitchingRows,
    rookiePlayerIds,
    managerGames,
    standings,
  ] = await Promise.all([
    getTrustedValueArtifact(scope.franchiseId, scope.seasonId, scope.statsScopeId),
    getFranchiseTrueValueRows(scope),
    getAllBattingStats(scope.statsScopeId),
    getAllPitchingStats(scope.statsScopeId),
    loadRookiePlayerIds(valueInputReport.rows.map((row) => row.playerId)),
    getRecentGames(MANAGER_OF_YEAR_GAME_LIMIT, {
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
      statsScopeId: scope.statsScopeId,
    }),
    calculateStandings(scope.seasonId),
  ]);

  if (!trustedValueArtifact) {
    return [];
  }

  const adaptiveStandardsConfig = deriveAdaptiveStandardsConfig({
    gamesPerTeam: valueInputReport.seasonContext.gamesPerTeam,
    inningsPerGame: valueInputReport.seasonContext.inningsPerGame,
  });
  const computedAt = scope.computedAt ?? new Date().toISOString();
  const warAwards = computeFranchiseWarAwardsFromEligibleInput({
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    valueRows: valueInputReport.rows,
    trueValueRows,
    trustedValueArtifact,
    adaptiveStandardsConfig,
    qualifierFacts: qualifierFactsFromStats(battingRows, pitchingRows),
    rookiePlayerIds,
    trustedForAwards: true,
    computedAt,
  });
  const managerAward = computeFranchiseManagerOfYearFromEligibleInput({
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    managerAggregates: aggregateManagerAwardInputsFromGames(managerGames),
    trueValueRows,
    trustedValueArtifact,
    standings,
    gamesPerTeam: adaptiveStandardsConfig.gamesPerSeason,
    trustedForAwards: true,
    computedAt,
  });

  return [
    ...warAwards,
    ...(managerAward ? [managerAward] : []),
  ].map((row) => ({
    ...row,
    finalized: false,
  }));
}
