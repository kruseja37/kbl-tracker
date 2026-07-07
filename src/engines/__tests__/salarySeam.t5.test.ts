import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import {
  POSITION_MULTIPLIERS,
  ROOKIE_SCALE_FACTOR,
  calculateAgeFactor,
  calculateSalary,
  calculateSalaryWithBreakdown,
  calculateTrueValue,
  type PlayerForSalary,
} from '../salaryCalculator';
import oracle from '../../../spec-docs/reference/iv_oracle.json';
import {
  classifyFranchiseDesignationEligibility,
  type FranchiseDesignationEligibilityRecord,
} from '../../utils/franchiseDesignationEligibility';
import {
  FRANCHISE_VALUE_INPUT_CONTRACT_VERSION,
  type FranchiseValueInputReport,
  type FranchiseValueInputRow,
} from '../../utils/franchiseValueInputs';

type OraclePlayer = (typeof oracle.players)[number];

function findOraclePlayer(id: string): OraclePlayer {
  const player = oracle.players.find((candidate) => candidate.id === id);
  expect(player).toBeTruthy();
  return player!;
}

function toSalaryPlayer(entry: OraclePlayer, overrides: Partial<PlayerForSalary> = {}): PlayerForSalary {
  const input = entry.input;
  const batterRatings = input.batterRatings
    ? {
        power: input.batterRatings.POW,
        contact: input.batterRatings.CON,
        speed: input.batterRatings.SPD,
        fielding: input.batterRatings.FLD,
        arm: input.batterRatings.ARM,
      }
    : undefined;
  const pitcherRatings = input.pitcherRatings
    ? {
        velocity: input.pitcherRatings.VEL,
        junk: input.pitcherRatings.JNK,
        accuracy: input.pitcherRatings.ACC,
      }
    : undefined;

  return {
    id: entry.id,
    name: entry.name,
    isPitcher: input.isPitcher,
    isTwoWay: input.traits.includes('Two Way') || input.traits.some((trait) => trait.startsWith('Two Way')),
    primaryPosition: (input.isPitcher ? input.role : input.primaryPosition ?? input.position) as PlayerForSalary['primaryPosition'],
    secondaryPosition: input.secondaryPosition,
    pitcherRole: (input.role ?? undefined) as PlayerForSalary['pitcherRole'],
    ratings: input.isPitcher ? pitcherRatings! : batterRatings!,
    battingRatings: input.isPitcher ? batterRatings : undefined,
    age: 28,
    bats: input.bats,
    fame: 0,
    traits: [...input.traits],
    arsenal: [...input.arsenal],
    armSlot: input.armSlot,
    ...overrides,
  };
}

function makeSeasonContext(): FranchiseValueInputRow['seasonContext'] {
  return {
    seasonId: 'season-t5',
    statsScopeId: 'scope-t5',
    seasonNumber: 1,
    gamesPerTeam: 32,
    inningsPerGame: 6,
    seasonLengthSource: 'stored-franchise-config',
    scheduleRowCount: 32,
    scheduleRowsUsedAsSeasonLength: false,
    seasonMetadataTotalGames: 96,
  };
}

function makeValueRow(overrides: Partial<FranchiseValueInputRow>): FranchiseValueInputRow {
  const row: FranchiseValueInputRow = {
    contractVersion: FRANCHISE_VALUE_INPUT_CONTRACT_VERSION,
    franchiseId: 'franchise-t5',
    seasonId: 'season-t5',
    statsScopeId: 'scope-t5',
    seasonNumber: 1,
    playerId: 'player-t5',
    playerName: 'T5 Player',
    valuePosition: 'SS',
    currentTeamId: 'team-t5',
    rosterStatus: 'MLB',
    salary: 33_250,
    contractYears: 2,
    salaryBaselineCalculationVersion: 'salary-v1',
    teamSalaryBaseline: 250_000,
    salaryBaselineAvailable: true,
    seasonStatsAvailability: { batting: true, pitching: false, fielding: true, any: true },
    warInputAvailability: {
      battingWar: true,
      pitchingWar: false,
      fieldingWar: true,
      baserunningWar: true,
      any: true,
      trustedForFinalValue: false,
    },
    warPreviewValues: {
      battingWar: 1.4,
      pitchingWar: null,
      fieldingWar: 0.2,
      baserunningWar: 0.1,
      totalWar: 1.7,
      totalWarSource: 'stat-row',
      trustedForFinalValue: false,
    },
    wpaInputAvailability: {
      playerWpa: false,
      managerWpa: false,
      archiveBacked: false,
      trustedForFinalValue: false,
    },
    seasonContext: makeSeasonContext(),
    stadiumId: 'stadium-t5',
    parkFactorAvailability: {
      stadiumIdAvailable: true,
      seedParkFactorsAvailable: true,
      customParkFactorsAvailable: false,
      status: 'seed-only',
      parkAdjustedValueInputsAvailable: false,
    },
    limitations: ['T5 salary seam fixture remains read-only for designation consumers.'],
    ...overrides,
  };

  const metadataReady = row.seasonContext.gamesPerTeam !== null && row.seasonContext.inningsPerGame !== null;
  const commonReady = row.currentTeamId !== null && row.rosterStatus === 'MLB' && metadataReady && row.seasonStatsAvailability.any;
  return {
    ...row,
    warConsumerTrust: row.warConsumerTrust ?? {
      teamMvpDesignations: commonReady && row.warInputAvailability.any && row.warPreviewValues.totalWar !== null,
      aceDesignations: commonReady && row.warInputAvailability.pitchingWar && row.warPreviewValues.pitchingWar !== null,
      fanFavoriteAlbatrossDesignations: false,
      awards: false,
      salaryMovement: false,
      trueValue: false,
      morale: false,
      mode3Handoff: false,
      blockers: [],
      limitations: ['WAR trust is limited to TEAM_MVP/ACE designation input gating.'],
    },
  };
}

function makeValueReport(rows: FranchiseValueInputRow[]): FranchiseValueInputReport {
  return {
    contractVersion: FRANCHISE_VALUE_INPUT_CONTRACT_VERSION,
    franchiseId: 'franchise-t5',
    seasonId: 'season-t5',
    statsScopeId: 'scope-t5',
    seasonNumber: 1,
    generatedAt: 1,
    seasonContext: makeSeasonContext(),
    rows,
    trueValuePolicy: {
      finalTrueValueCalculated: false,
      persistedTrueValueCreated: false,
    },
    designationPolicy: {
      finalDesignationsCalculated: false,
      persistedDesignationRecordsCreated: false,
      inventedDesignationTypes: [],
    },
    limitations: rows.flatMap((row) => row.limitations),
  };
}

function findDesignation(
  records: FranchiseDesignationEligibilityRecord[],
  playerId: string,
  designationType: FranchiseDesignationEligibilityRecord['designationType'],
): FranchiseDesignationEligibilityRecord {
  const record = records.find((candidate) => candidate.playerId === playerId && candidate.designationType === designationType);
  expect(record).toBeTruthy();
  return record!;
}

describe('T5 salary seam: kblIV salary base', () => {
  test.each([
    ['hitter', 'bee-balmer', 29_925],
    ['starter', 'bee-bender', 98_550],
    ['reliever', 'bee-balfour', 12_509],
  ])('R1 neutral %s salary equals frozen oracle kblIV', (_label, playerId, expectedKblIV) => {
    const player = toSalaryPlayer(findOraclePlayer(playerId));
    const breakdown = calculateSalaryWithBreakdown(player);

    expect(breakdown.ivBase).toBe(expectedKblIV);
    expect(breakdown.baseSalary).toBe(expectedKblIV);
    expect(breakdown.positionMultiplier).toBe(1.0);
    expect(breakdown.traitModifier).toBe(1.0);
    expect(breakdown.ageFactor).toBe(1.0);
    expect(breakdown.finalSalary).toBe(expectedKblIV);
  });

  test('R2 salary path is potency-neutral and has no chemistry-count structural dependency', () => {
    const player = toSalaryPlayer(findOraclePlayer('bee-balmer'));
    const withRosterChemistry = {
      ...player,
      teamChemistryCounts: { Competitive: 7 },
    } as PlayerForSalary;

    expect(calculateSalary(player)).toBe(calculateSalary(withRosterChemistry));

    const source = readFileSync('src/engines/salaryCalculator.ts', 'utf8');
    expect(source).not.toMatch(/countChemistryType/);
    expect(source).not.toMatch(/POTENCY_SCALE/);
  });

  test('R3 rookie scale replaces age factor rather than double-discounting young players', () => {
    const youngPlayer = toSalaryPlayer(findOraclePlayer('bee-balmer'), { age: 22 });
    const normal = calculateSalaryWithBreakdown(youngPlayer);
    const rookie = calculateSalaryWithBreakdown(youngPlayer, undefined, undefined, false, undefined, {
      rookieScaleActive: true,
    });

    expect(ROOKIE_SCALE_FACTOR).toBe(0.5);
    expect(calculateAgeFactor(22)).toBe(0.70);
    expect(normal.ageFactor).toBe(0.70);
    expect(rookie.ageFactor).toBe(ROOKIE_SCALE_FACTOR);
    expect(rookie.finalSalary).toBe(Math.round(rookie.ivBase! * ROOKIE_SCALE_FACTOR));
    expect(rookie.finalSalary).not.toBe(Math.round(rookie.ivBase! * ROOKIE_SCALE_FACTOR * calculateAgeFactor(22)));
  });

  test('R4 True Value percentile math remains scale-invariant under dollar denomination', () => {
    const league = {
      allPlayers: [
        { id: 'a', detectedPosition: 'SS' as const, salary: 120_000, seasonWAR: 1.0 },
        { id: 'b', detectedPosition: 'SS' as const, salary: 140_000, seasonWAR: 1.2 },
        { id: 'c', detectedPosition: 'SS' as const, salary: 160_000, seasonWAR: 1.4 },
        { id: 'd', detectedPosition: 'SS' as const, salary: 180_000, seasonWAR: 1.6 },
        { id: 'e', detectedPosition: 'SS' as const, salary: 200_000, seasonWAR: 1.8 },
        { id: 'target', detectedPosition: 'SS' as const, salary: 150_000, seasonWAR: 1.5 },
      ],
    };
    const scaledLeague = {
      allPlayers: league.allPlayers.map((player) => ({ ...player, salary: player.salary * 10 })),
    };
    const base = calculateTrueValue(league.allPlayers[5], league);
    const scaled = calculateTrueValue(scaledLeague.allPlayers[5], scaledLeague);

    expect(scaled.warPercentile).toBe(base.warPercentile);
    expect(scaled.trueValue).toBeCloseTo(base.trueValue * 10, 5);
    expect(scaled.valueDelta).toBeCloseTo(base.valueDelta * 10, 5);
    expect(scaled.roiTier).toBe(base.roiTier);
  });

  test('R5 TEAM_MVP and ACE designation rules still rank under dollar salary rows', () => {
    const mvp = makeValueRow({
      playerId: 'mvp',
      playerName: 'Dollar MVP',
      valuePosition: 'SS',
      salary: 33_250,
      warPreviewValues: {
        battingWar: 2.1,
        pitchingWar: null,
        fieldingWar: 0.4,
        baserunningWar: 0.2,
        totalWar: 2.7,
        totalWarSource: 'stat-row',
        trustedForFinalValue: false,
      },
    });
    const runnerUp = makeValueRow({
      playerId: 'runner-up',
      playerName: 'Dollar Runner Up',
      valuePosition: '2B',
      salary: 31_000,
      warPreviewValues: {
        battingWar: 0.8,
        pitchingWar: null,
        fieldingWar: 0.1,
        baserunningWar: 0.1,
        totalWar: 1.0,
        totalWarSource: 'stat-row',
        trustedForFinalValue: false,
      },
    });
    const ace = makeValueRow({
      playerId: 'ace',
      playerName: 'Dollar Ace',
      valuePosition: 'SP',
      salary: 98_550,
      seasonStatsAvailability: { batting: false, pitching: true, fielding: false, any: true },
      warInputAvailability: {
        battingWar: false,
        pitchingWar: true,
        fieldingWar: false,
        baserunningWar: false,
        any: true,
        trustedForFinalValue: false,
      },
      warPreviewValues: {
        battingWar: null,
        pitchingWar: 1.2,
        fieldingWar: null,
        baserunningWar: null,
        totalWar: 1.2,
        totalWarSource: 'stat-row',
        trustedForFinalValue: false,
      },
    });

    const report = classifyFranchiseDesignationEligibility(makeValueReport([mvp, runnerUp, ace]));

    expect(findDesignation(report.records, 'mvp', 'TEAM_MVP')).toMatchObject({
      status: 'active',
      persistable: true,
    });
    expect(findDesignation(report.records, 'runner-up', 'TEAM_MVP').status).toBe('blocked');
    expect(findDesignation(report.records, 'ace', 'ACE')).toMatchObject({
      status: 'active',
      persistable: true,
    });
  });

  test('R6 position multipliers default to 1.0 but remain live tuning knobs', () => {
    const catcher = toSalaryPlayer(findOraclePlayer('bee-balmer'), { primaryPosition: 'C' });
    const neutral = calculateSalaryWithBreakdown(catcher);
    const original = POSITION_MULTIPLIERS.C;

    try {
      POSITION_MULTIPLIERS.C = 1.1;
      const tuned = calculateSalaryWithBreakdown(catcher);
      expect(original).toBe(1.0);
      expect(tuned.components.afterPosition).toBeCloseTo(neutral.ivBase! * 1.1, 5);
      expect(tuned.finalSalary).toBe(Math.round(neutral.ivBase! * 1.1));
    } finally {
      POSITION_MULTIPLIERS.C = original;
    }
  });
});
