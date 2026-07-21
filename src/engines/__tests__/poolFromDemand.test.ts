import { describe, expect, it } from 'vitest';
import {
  buildNumericPoolShapeDiagnostics,
  countCellMatches,
  createPoolIdentitySupportReceipt,
  DEFAULT_POOL_SIZE_MULTIPLIER,
  DEFAULT_POOL_QUALITY_CENTER,
  derivePoolQualityTuning,
  deriveHardPositionSupplyFloorTargets,
  derivePositionSupplyFloorTargets,
  enforcePositionSupplyFloors,
  evaluateCompetitivePositionSupplyFloors,
  evaluatePositionSupplyFloors,
  extractPoolFromDemand,
  numericGradeForPoolShape,
  poolBalancePresetTuning,
  PoolTeamsForSizingMissingError,
  POOL_BALANCE_PRESETS,
  POOL_QUALITY_CENTER_STOPS,
  POOL_SIZE_MULTIPLIER_STOPS,
  repairG1PoolForSizing,
  resolvePoolQualityCenter,
  resolvePoolSizingTarget,
  selectFitAwareRepairCandidate,
  shapePoolByNumericGrade,
  trimPoolToTarget,
  type ClassifiedDemandPlayer,
  type DemandUniversePlayer,
  type TeamDesignInput,
} from '../poolFromDemand';
import { buildDefaultDesignSlots } from '../rosterDesignFeasibility';
import { HISTORICAL_ARCHETYPES } from '../../data/historicalArchetypes';
import { classifyPlayerArchetype } from '../playerArchetypeClassifier';
import { demandPlayerFromLeaguePlayer } from '../../src_figma/app/engines/leaguePlayerAdapter';
import { canRelieve, canStart, isCloser, isLegalRoster } from '../../data/rosterConstruction';
import { toRosterSlotPlayer } from '../rosterNeed';
import type { Player } from '../../utils/leagueBuilderStorage';

let n = 0;

function hitter(
  position: string,
  tools: { power: number; contact: number; speed: number; fielding: number; arm: number },
  salary: number,
  extra: Partial<DemandUniversePlayer> = {},
): DemandUniversePlayer {
  const id = `u-h-${position}-${n += 1}`;
  return {
    id,
    iv: salary,
    salary,
    isPitcher: false,
    position,
    bat: { POW: tools.power, CON: tools.contact, SPD: tools.speed, FLD: tools.fielding, ARM: tools.arm },
    profile: {
      isPitcher: false,
      primaryPosition: position,
      bats: 'R',
      throws: 'R',
      age: 27,
      ...tools,
    },
    ...extra,
  } as DemandUniversePlayer;
}

function arm(
  role: 'SP' | 'RP' | 'CP' | 'SP/RP',
  tools: { velocity: number; junk: number; accuracy: number },
  salary: number,
): DemandUniversePlayer {
  const id = `u-p-${role.replace('/', '')}-${n += 1}`;
  return {
    id,
    iv: salary,
    salary,
    isPitcher: true,
    position: 'P',
    role,
    bat: { POW: 20, CON: 20, SPD: 20, FLD: 20, ARM: 20 },
    pit: { VEL: tools.velocity, JNK: tools.junk, ACC: tools.accuracy },
    profile: {
      isPitcher: true,
      primaryPosition: role,
      bats: 'R',
      throws: 'R',
      age: 27,
      arsenal: ['4F', 'SL', 'CH'],
      ...tools,
    },
  } as DemandUniversePlayer;
}

const GLOVE = { power: 50, contact: 56, speed: 65, fielding: 75, arm: 71 }; // Defensive-Wizard echo
const BAT = { power: 82, contact: 55, speed: 47, fielding: 51, arm: 60 }; // Slugger-ish echo
const EVEN = { power: 60, contact: 60, speed: 60, fielding: 60, arm: 60 };
const LOW = { power: 5, contact: 5, speed: 5, fielding: 5, arm: 5 };
const HIGH_BAT = { power: 95, contact: 95, speed: 70, fielding: 50, arm: 50 };
const LOW_TAIL = { power: 35, contact: 35, speed: 35, fielding: 35, arm: 35 };
const MIDDLE_LOW = { power: 55, contact: 55, speed: 55, fielding: 55, arm: 55 };
const MIDDLE_CORE = { power: 60, contact: 60, speed: 60, fielding: 60, arm: 60 };
const MIDDLE_HIGH = { power: 65, contact: 65, speed: 65, fielding: 65, arm: 65 };
const HIGH_TAIL = { power: 70, contact: 70, speed: 70, fielding: 70, arm: 70 };

function universe(): DemandUniversePlayer[] {
  n = 0;
  const players: DemandUniversePlayer[] = [];
  const positions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
  const tiers = [6_000, 10_000, 16_000];
  for (const position of positions) {
    for (const salary of tiers) {
      players.push(hitter(position, GLOVE, salary));
      players.push(hitter(position, BAT, salary + 500));
      players.push(hitter(position, EVEN, salary + 250));
      players.push(hitter(position, EVEN, salary + 750));
    }
  }
  // Backup-C coverage depth beyond the primary Cs.
  for (const salary of tiers) {
    players.push(hitter('1B', EVEN, salary + 100, {
      secondaryPosition: 'C',
      profile: { isPitcher: false, primaryPosition: '1B', secondaryPosition: 'C', bats: 'R', throws: 'R', age: 27, ...EVEN },
    } as Partial<DemandUniversePlayer>));
  }
  for (const salary of tiers) {
    for (let copy = 0; copy < 4; copy += 1) {
      players.push(arm('SP', { velocity: 62, junk: 60, accuracy: 61 }, salary + copy * 300));
      players.push(arm('RP', { velocity: 63, junk: 59, accuracy: 60 }, salary + copy * 350));
    }
    players.push(arm('SP/RP', { velocity: 61, junk: 61, accuracy: 60 }, salary + 200));
    players.push(arm('CP', { velocity: 68, junk: 58, accuracy: 57 }, salary + 400));
    players.push(arm('SP', { velocity: 80, junk: 58, accuracy: 48 }, salary)); // Effectively-Wild echo
  }
  return players;
}

function designAsking(teamId: string, slotId: string, shape: string): TeamDesignInput {
  return {
    teamId,
    slots: buildDefaultDesignSlots().map((slot) =>
      slot.slotId === slotId ? { ...slot, preference: { shape } } : slot,
    ),
  };
}

function leaguePlayer(primaryPosition: Player['primaryPosition']): Player {
  return {
    id: `league-player-${primaryPosition}`,
    firstName: 'Canon',
    lastName: primaryPosition,
    gender: 'M',
    age: 27,
    bats: 'R',
    throws: 'R',
    armSlot: 'High',
    primaryPosition,
    power: 42,
    contact: 43,
    speed: 44,
    fielding: 45,
    arm: 46,
    velocity: 71,
    junk: 72,
    accuracy: 73,
    arsenal: ['4F', 'SL', 'CH'],
    overallGrade: 'B',
    trait1: primaryPosition === 'TWO-WAY' ? 'Two Way (C)' : undefined,
    trait2: undefined,
    personality: 'Competitive',
    chemistry: 'Competitive',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 12_345,
    createdDate: '2026-07-02T00:00:00.000Z',
    lastModified: '2026-07-02T00:00:00.000Z',
    isCustom: true,
  };
}

function shapedHitters(prefix: string, count: number, tools: typeof EVEN, salaryBase = 10_000): DemandUniversePlayer[] {
  const players: DemandUniversePlayer[] = [];
  for (let index = 0; index < count; index += 1) {
    const player = hitter('SS', tools, salaryBase + index);
    player.id = `${prefix}-${index.toString().padStart(2, '0')}`;
    players.push(player);
  }
  return players;
}

function exactCurveSource(): DemandUniversePlayer[] {
  n = 0;
  return [
    ...shapedHitters('low', 10, LOW_TAIL),
    ...shapedHitters('middle-low', 22, MIDDLE_LOW),
    ...shapedHitters('middle-core', 28, MIDDLE_CORE),
    ...shapedHitters('middle-high', 25, MIDDLE_HIGH),
    ...shapedHitters('high', 15, HIGH_TAIL),
  ];
}

function qualitySpectrumSource(): DemandUniversePlayer[] {
  n = 0;
  const levels = [35, 45, 55, 60, 65, 70, 75, 80, 85, 90];
  return levels.flatMap((level) =>
    shapedHitters(
      `quality-${level}`,
      30,
      { power: level, contact: level, speed: level, fielding: level, arm: level },
      10_000 + level,
    ),
  );
}

function legalOneTeamPool(): DemandUniversePlayer[] {
  n = 0;
  return [
    hitter('C', MIDDLE_CORE, 1_000, { id: 'legal-c' } as Partial<DemandUniversePlayer>),
    hitter('1B', MIDDLE_CORE, 1_000, { id: 'legal-1b' } as Partial<DemandUniversePlayer>),
    hitter('2B', MIDDLE_CORE, 1_000, { id: 'legal-2b' } as Partial<DemandUniversePlayer>),
    hitter('3B', MIDDLE_CORE, 1_000, { id: 'legal-3b' } as Partial<DemandUniversePlayer>),
    hitter('SS', MIDDLE_CORE, 1_000, { id: 'legal-ss' } as Partial<DemandUniversePlayer>),
    hitter('LF', MIDDLE_CORE, 1_000, { id: 'legal-lf' } as Partial<DemandUniversePlayer>),
    hitter('CF', MIDDLE_CORE, 1_000, { id: 'legal-cf' } as Partial<DemandUniversePlayer>),
    hitter('RF', MIDDLE_CORE, 1_000, { id: 'legal-rf' } as Partial<DemandUniversePlayer>),
    hitter('1B', MIDDLE_CORE, 1_000, {
      id: 'legal-backup-c',
      secondaryPosition: 'C',
      profile: { isPitcher: false, primaryPosition: '1B', secondaryPosition: 'C', bats: 'R', throws: 'R', age: 27, ...MIDDLE_CORE },
    } as Partial<DemandUniversePlayer>),
    hitter('1B', MIDDLE_CORE, 1_000, { id: 'legal-bench-1b' } as Partial<DemandUniversePlayer>),
    hitter('2B', MIDDLE_CORE, 1_000, { id: 'legal-bench-2b' } as Partial<DemandUniversePlayer>),
    hitter('3B', MIDDLE_CORE, 1_000, { id: 'legal-bench-3b' } as Partial<DemandUniversePlayer>),
    hitter('LF', MIDDLE_CORE, 1_000, { id: 'legal-bench-lf' } as Partial<DemandUniversePlayer>),
    arm('SP', { velocity: 60, junk: 60, accuracy: 60 }, 1_000),
    arm('SP', { velocity: 60, junk: 60, accuracy: 60 }, 1_000),
    arm('SP', { velocity: 60, junk: 60, accuracy: 60 }, 1_000),
    arm('SP', { velocity: 60, junk: 60, accuracy: 60 }, 1_000),
    arm('RP', { velocity: 60, junk: 60, accuracy: 60 }, 1_000),
    arm('RP', { velocity: 60, junk: 60, accuracy: 60 }, 1_000),
    arm('RP', { velocity: 60, junk: 60, accuracy: 60 }, 1_000),
    arm('RP', { velocity: 60, junk: 60, accuracy: 60 }, 1_000),
    arm('CP', { velocity: 60, junk: 60, accuracy: 60 }, 1_000),
  ];
}

function floorTarget(teamCount: number, position: string) {
  const target = derivePositionSupplyFloorTargets(teamCount).find((candidate) => candidate.position === position);
  if (!target) throw new Error(`Missing floor target ${position}`);
  return target;
}

describe('hard legality versus competitive position depth', () => {
  it('keeps twenty-club closer legality at 20 while retaining the 27-card quality target', () => {
    const teamCount = 20;
    const closerShapes = Array.from({ length: 22 }, () => ({
      isPitcher: true,
      position: 'CP',
      role: 'CP',
    } as const));

    expect(deriveHardPositionSupplyFloorTargets(teamCount).find((target) => target.position === 'CP'))
      .toMatchObject({ needed: 20, slack: 0 });
    expect(derivePositionSupplyFloorTargets(teamCount).find((target) => target.position === 'CP'))
      .toMatchObject({ needed: 27, slack: 7 });
    expect(evaluatePositionSupplyFloors(closerShapes, teamCount).find((row) => row.position === 'CP'))
      .toMatchObject({ needed: 20, available: 22, missing: 0 });
    expect(evaluateCompetitivePositionSupplyFloors(closerShapes, teamCount).find((row) => row.position === 'CP'))
      .toMatchObject({ needed: 27, available: 22, missing: 5 });
  });
});

function hardFloorUniverse(teamCount: number, cpCount = floorTarget(teamCount, 'CP').needed): DemandUniversePlayer[] {
  n = 0;
  const players: DemandUniversePlayer[] = [];
  for (const position of ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF']) {
    for (let index = 0; index < floorTarget(teamCount, position).needed; index += 1) {
      const player = hitter(position, MIDDLE_CORE, 1_000 + index);
      player.id = `floor-${position}-${index.toString().padStart(2, '0')}`;
      players.push(player);
    }
  }

  const primaryCatchers = floorTarget(teamCount, 'C').needed;
  const catcherDepth = floorTarget(teamCount, 'CATCHER_DEPTH').needed;
  for (let index = 0; index < Math.max(0, catcherDepth - primaryCatchers); index += 1) {
    players.push(hitter('1B', MIDDLE_CORE, 1_000 + index, {
      id: `floor-backup-c-${index.toString().padStart(2, '0')}`,
      secondaryPosition: 'C',
      profile: {
        isPitcher: false,
        primaryPosition: '1B',
        secondaryPosition: 'C',
        bats: 'R',
        throws: 'R',
        age: 27,
        ...MIDDLE_CORE,
      },
    } as Partial<DemandUniversePlayer>));
  }

  for (let index = 0; index < floorTarget(teamCount, 'SP').needed; index += 1) {
    const player = arm('SP', { velocity: 60, junk: 60, accuracy: 60 }, 1_000 + index);
    player.id = `floor-sp-${index.toString().padStart(2, '0')}`;
    players.push(player);
  }

  for (let index = 0; index < cpCount; index += 1) {
    const player = arm('CP', { velocity: 62, junk: 60, accuracy: 60 }, 1_000 + index);
    player.id = `floor-cp-${index.toString().padStart(2, '0')}`;
    players.push(player);
  }

  const pureRelieversNeeded = Math.max(0, floorTarget(teamCount, 'RP').needed - cpCount);
  for (let index = 0; index < pureRelieversNeeded; index += 1) {
    const player = arm('RP', { velocity: 60, junk: 60, accuracy: 60 }, 1_000 + index);
    player.id = `floor-rp-${index.toString().padStart(2, '0')}`;
    players.push(player);
  }

  return players.sort((left, right) => left.id.localeCompare(right.id));
}

describe('extractPoolFromDemand', () => {
  const archetypes = HISTORICAL_ARCHETYPES.slice(0, 2);

  it('provisions contested asks with multiplicity and both designs verify feasible', () => {
    const designs = [
      designAsking('team-a', 'SS', 'Defensive-Wizard'),
      designAsking('team-b', 'SS', 'Defensive-Wizard'),
    ];
    const result = extractPoolFromDemand(universe(), designs, archetypes, 'standard', {
      teams: 4,
      budgetPerTeam: 5_000_000,
    });

    const cell = result.cells.find((candidate) => candidate.key.startsWith('SS|Defensive-Wizard'));
    expect(cell?.asks).toBe(2);
    expect(cell?.wanted).toBe(4);
    expect(cell?.reserved).toBe(4);
    expect(result.shortfalls.filter((shortfall) => !shortfall.position)).toEqual([]);
    expect(result.size).toBeGreaterThan(0);
    expect(result.floors.players.length).toBeGreaterThan(0);
    for (const verdict of result.designVerdicts) {
      expect(verdict.result.feasible, `design ${verdict.teamId}`).toBe(true);
    }
  });

  it('names the shortfall in plain language when the universe cannot meet an ask', () => {
    const designs = [designAsking('team-a', 'RP1', 'Two-Pitch-Reliever')]; // none in this universe (3-pitch arms)
    const result = extractPoolFromDemand(universe(), designs, archetypes, 'standard', {
      teams: 4,
      budgetPerTeam: 5_000_000,
    });
    const demandShortfalls = result.shortfalls.filter((shortfall) => !shortfall.position);
    expect(demandShortfalls.length).toBe(1);
    expect(demandShortfalls[0].message).toContain('the uploaded universe holds 0');
    // The pool still extracts (floors intact); the asking design reports its blocker.
    expect(result.size).toBeGreaterThan(0);
    const verdict = result.designVerdicts[0].result;
    expect(verdict.feasible).toBe(false);
    expect(verdict.blockers.some((blocker) => blocker.kind === 'no-match')).toBe(true);
  });

  it('does not satisfy a CP design cell with matching RP bodies', () => {
    const source = universe();
    const matchingRp = source.find((player) => player.role === 'RP')!;
    const cpShape = classifyPlayerArchetype(matchingRp.profile).shape;
    const noClosers = source.filter((player) => player.role !== 'CP');
    const designs = [designAsking('team-a', 'CP', cpShape)];
    const result = extractPoolFromDemand(noClosers, designs, archetypes, 'standard', {
      teams: 4,
      budgetPerTeam: 5_000_000,
    });

    const cell = result.cells.find((candidate) => candidate.key.startsWith(`cp|${cpShape}`));
    expect(cell?.asks).toBe(1);
    expect(cell?.reserved).toBe(0);
    expect(result.shortfalls[0].message).toContain('the uploaded universe holds 0');
    expect(result.designVerdicts[0].result.feasible).toBe(false);
  });

  it('tops up hard legal-position floors with CP hoarding slack at extraction', () => {
    const teamCount = 3;
    const source = hardFloorUniverse(teamCount);
    const result = extractPoolFromDemand(source, [], [], 'standard', {
      teams: teamCount,
      budgetPerTeam: 5_000_000,
    });

    const cpFloor = result.positionSupplyFloors.find((floor) => floor.position === 'CP');
    expect(cpFloor).toMatchObject({
      minimumPerTeam: 1,
      teams: teamCount,
      slack: 2,
      needed: 5,
      available: 5,
      missing: 0,
    });
    expect(result.players.filter(isCloser)).toHaveLength(cpFloor!.needed);
    expect(result.shortfalls.filter((shortfall) => shortfall.position === 'CP')).toEqual([]);
  });

  it('reports a structured hard-position shortfall when the universe itself lacks CP slack', () => {
    const teamCount = 3;
    const cpNeeded = floorTarget(teamCount, 'CP').needed;
    const result = extractPoolFromDemand(hardFloorUniverse(teamCount, cpNeeded - 1), [], [], 'standard', {
      teams: teamCount,
      budgetPerTeam: 5_000_000,
    });

    const cpShortfall = result.shortfalls.find((shortfall) => shortfall.position === 'CP');
    expect(cpShortfall).toMatchObject({
      key: 'position-floor:CP',
      position: 'CP',
      wanted: cpNeeded,
      available: cpNeeded - 1,
    });
    expect(cpShortfall?.message).toContain('closers');
    expect(result.positionSupplyFloors.find((floor) => floor.position === 'CP')?.missing).toBe(1);
  });

  it('leaves an already floor-sufficient selected pool byte-identical', () => {
    const teamCount = 3;
    const source = hardFloorUniverse(teamCount);
    const beforeIds = source.map((player) => player.id);
    const result = enforcePositionSupplyFloors({
      universe: source,
      players: source,
      teams: teamCount,
      fitOf: () => 0,
    });

    expect(result.injectedIds).toEqual([]);
    expect(result.shortfalls).toEqual([]);
    expect(result.players.map((player) => player.id)).toEqual(beforeIds);
  });

  it('is deterministic: identical inputs produce the identical pool', () => {
    const designs = [designAsking('team-a', 'SS', 'Defensive-Wizard')];
    const first = extractPoolFromDemand(universe(), designs, archetypes, 'standard', { teams: 4 });
    const second = extractPoolFromDemand(universe(), designs, archetypes, 'standard', { teams: 4 });
    expect(first.players.map((p) => p.id)).toEqual(second.players.map((p) => p.id));
  });

  it('spreads a cell reservation across price tiers (the budget-lever promise)', () => {
    const designs = [designAsking('team-a', 'SS', 'Defensive-Wizard')];
    const result = extractPoolFromDemand(universe(), designs, archetypes, 'standard', { teams: 4 });
    const cell = result.cells.find((candidate) => candidate.key.startsWith('SS|Defensive-Wizard'));
    expect(cell?.reserved).toBe(2); // 1 ask × contest 2
    const reservedSalaries = result.players
      .filter((player) => player.position === 'SS' && player.profile.fielding === GLOVE.fielding)
      .map((player) => player.salary);
    // At least two distinct price tiers among the extracted glove-first SS supply.
    expect(new Set(reservedSalaries).size).toBeGreaterThanOrEqual(2);
  });

  it('threads budgetPerTeam through the extracted floors draftability verdicts', () => {
    const designs = [designAsking('team-a', 'SS', 'Defensive-Wizard')];
    const loose = extractPoolFromDemand(universe(), designs, archetypes, 'standard', {
      teams: 4,
      budgetPerTeam: 5_000_000,
    });
    const tight = extractPoolFromDemand(universe(), designs, archetypes, 'standard', {
      teams: 4,
      budgetPerTeam: 150_000,
    });

    const looseHeadroom = Math.max(...loose.floors.verdicts.map((row) => row.taxHeadroom));
    const tightHeadroom = Math.max(...tight.floors.verdicts.map((row) => row.taxHeadroom));
    expect(tightHeadroom).toBeLessThan(looseHeadroom);
  });

  it('countCellMatches equals the extractor reserved match set for a demand cell', () => {
    const pool = universe();
    const designs = [designAsking('team-a', 'SS', 'Defensive-Wizard')];
    const result = extractPoolFromDemand(pool, designs, archetypes, 'standard', { teams: 4 });
    const cell = result.cells.find((candidate) => candidate.key.startsWith('SS|Defensive-Wizard'));
    expect(cell).toBeDefined();

    const classified: ClassifiedDemandPlayer[] = pool.map((player) => ({
      player,
      classification: classifyPlayerArchetype(player.profile),
    }));
    const actualReservedMatchSet = classified.filter(({ classification }) =>
      classification.shape === cell!.preference.shape
      || ((cell!.preference.allowRunnerUp ?? true) && classification.runnerUp === cell!.preference.shape),
    );

    expect(countCellMatches(classified, cell!.preference)).toBe(actualReservedMatchSet.length);
    expect(countCellMatches(classified, cell!.preference)).toBeGreaterThanOrEqual(cell!.reserved);
  });

  it.each(['P', 'TWO-WAY'] as const)(
    'maps legacy %s pitchers through the canonical roster-slot role',
    (primaryPosition) => {
      const player = leaguePlayer(primaryPosition);
      const mapped = demandPlayerFromLeaguePlayer(player);
      const canonicalShape = toRosterSlotPlayer({
        primaryPosition: player.primaryPosition,
        secondaryPosition: player.secondaryPosition ?? null,
        traits: [player.trait1, player.trait2],
      });

      expect(mapped).toMatchObject({
        id: player.id,
        name: `${player.firstName} ${player.lastName}`.trim(),
        salary: player.salary,
        isPitcher: canonicalShape.isPitcher,
        position: canonicalShape.position,
        role: canonicalShape.role,
        secondaryPosition: canonicalShape.secondaryPosition,
        twoWayVariant: canonicalShape.twoWayVariant,
        bat: {
          POW: player.power,
          CON: player.contact,
          SPD: player.speed,
          FLD: player.fielding,
          ARM: player.arm,
        },
        pit: {
          VEL: player.velocity,
          JNK: player.junk,
          ACC: player.accuracy,
        },
      });
      expect(mapped.role).toBeUndefined();
      expect(canStart(mapped)).toBe(false);
      expect(canRelieve(mapped)).toBe(false);
    },
  );

  it('maps dial targets from roster demand plus expected shill wins', () => {
    const eightTeams = resolvePoolSizingTarget({ teams: 8, shills: 0, poolSizeMultiplier: DEFAULT_POOL_SIZE_MULTIPLIER });
    expect(eightTeams.demandBase).toBe(176);
    expect(eightTeams.requestedTarget).toBe(264);
    expect(resolvePoolSizingTarget({ teams: 8, shills: 0, poolSizeMultiplier: 1.25 }).requestedTarget).toBe(220);
    expect(resolvePoolSizingTarget({ teams: 8, shills: 0, poolSizeMultiplier: 1.5 }).requestedTarget).toBe(264);

    const withShills = resolvePoolSizingTarget({ teams: 8, shills: 3, poolSizeMultiplier: DEFAULT_POOL_SIZE_MULTIPLIER });
    expect(withShills.demandBase).toBe(206);
    expect(withShills.requestedTarget).toBe(309);
  });

  it('uses the canonical numeric analyzer grade instead of display letter labels', () => {
    const lowWithFakeLetter = hitter('SS', LOW_TAIL, 10_000, { overallGrade: 'S+' } as Partial<DemandUniversePlayer>);
    expect(numericGradeForPoolShape(lowWithFakeLetter)).toBeLessThan(58);

    const diagnostics = buildNumericPoolShapeDiagnostics({
      players: [lowWithFakeLetter],
      requiredRosterDemand: 1,
      targetSize: 1,
    });
    expect(diagnostics.lowTailShare).toBe(1);
    expect(diagnostics.highTailShare).toBe(0);
  });

  it('derives shifted quality-center windows from the existing preset bands', () => {
    const highCenter = derivePoolQualityTuning(POOL_BALANCE_PRESETS.balanced, 72);
    expect(highCenter.lowTailMax).toBe(62);
    expect(highCenter.middleMin).toBe(62);
    expect(highCenter.middleMax).toBe(80);
    expect(highCenter.highTailMin).toBe(80);
    expect(highCenter.superstarTailMin).toBe(88);
    expect(highCenter.windows.map((window) => [window.id, window.minInclusive, window.maxExclusive])).toEqual([
      ['low-tail', 0, 62],
      ['middle-low', 62, 68],
      ['middle-core', 68, 74],
      ['middle-high', 74, 80],
      ['high-tail', 80, 88],
      ['ultra-high-tail', 88, 101],
    ]);

    const lowCenter = derivePoolQualityTuning(POOL_BALANCE_PRESETS.balanced, 64);
    expect(lowCenter.windows.map((window) => [window.id, window.minInclusive, window.maxExclusive])).toEqual([
      ['low-tail', 0, 54],
      ['middle-low', 54, 60],
      ['middle-core', 60, 66],
      ['middle-high', 66, 72],
      ['high-tail', 72, 80],
      ['ultra-high-tail', 80, 101],
    ]);
    expect(resolvePoolQualityCenter(69)).toBe(68);
    expect(resolvePoolQualityCenter(99)).toBe(76);
    expect(POOL_QUALITY_CENTER_STOPS).toEqual([64, 66, 68, 70, 72, 74, 76]);
  });

  it('omitted quality center and explicit 68 preserve the default numeric-grade output', () => {
    const source = [
      ...exactCurveSource(),
      ...shapedHitters('extra-middle', 40, MIDDLE_CORE),
      ...shapedHitters('extra-high', 20, HIGH_TAIL),
      ...shapedHitters('extra-ultra', 10, HIGH_BAT),
    ];
    const omitted = shapePoolByNumericGrade({
      universe: source,
      currentPlayers: [],
      protectedIds: new Set<string>(),
      targetSize: 100,
      requiredRosterDemand: 80,
      fitOf: () => 0,
    });
    const explicitDefault = shapePoolByNumericGrade({
      universe: [...source].reverse(),
      currentPlayers: [],
      protectedIds: new Set<string>(),
      targetSize: 100,
      requiredRosterDemand: 80,
      fitOf: () => 0,
      poolQualityCenter: DEFAULT_POOL_QUALITY_CENTER,
    });

    expect(explicitDefault.players.map((player) => player.id)).toEqual(omitted.players.map((player) => player.id));
    expect(explicitDefault.diagnostics.poolQualityCenter).toBe(68);
    expect(explicitDefault.diagnostics.qualityShift).toBe(0);
    expect(explicitDefault.diagnostics.shiftedBandWindows).toEqual(POOL_BALANCE_PRESETS.balanced.windows);
    expect(explicitDefault.diagnostics.achievedMedianQuality).toBe(omitted.diagnostics.medianNumericGrade);
  });

  it('moves the achieved quality distribution when candidate depth exists', () => {
    const source = qualitySpectrumSource();
    const lowCenter = shapePoolByNumericGrade({
      universe: source,
      currentPlayers: [],
      protectedIds: new Set<string>(),
      targetSize: 100,
      requiredRosterDemand: 80,
      fitOf: () => 0,
      poolQualityCenter: 64,
    });
    const highCenter = shapePoolByNumericGrade({
      universe: source,
      currentPlayers: [],
      protectedIds: new Set<string>(),
      targetSize: 100,
      requiredRosterDemand: 80,
      fitOf: () => 0,
      poolQualityCenter: 76,
    });

    expect(highCenter.diagnostics.achievedMedianQuality ?? 0).toBeGreaterThan(lowCenter.diagnostics.achievedMedianQuality ?? 0);
    expect(highCenter.diagnostics.targetMedianQuality).toBe(76);
    expect(lowCenter.diagnostics.targetMedianQuality).toBe(64);
    expect(highCenter.diagnostics.qualityShift).toBe(8);
    expect(lowCenter.diagnostics.qualityShift).toBe(-4);
  });

  it('preserves preset shares and caps under a shifted quality center', () => {
    const source = qualitySpectrumSource();
    const shaped = shapePoolByNumericGrade({
      universe: source,
      currentPlayers: [],
      protectedIds: new Set<string>(),
      targetSize: 100,
      requiredRosterDemand: 80,
      fitOf: () => 0,
      preset: 'grounded',
      poolQualityCenter: 72,
    });

    expect(shaped.diagnostics.highTailShare).toBeLessThanOrEqual(POOL_BALANCE_PRESETS.grounded.highTailCap);
    expect(shaped.diagnostics.superstarTailShare).toBeLessThanOrEqual(POOL_BALANCE_PRESETS.grounded.superstarTailCap);
    expect(shaped.diagnostics.middleMassShare).toBeGreaterThanOrEqual(POOL_BALANCE_PRESETS.grounded.targetMiddleMass);
    expect(shaped.diagnostics.lowTailShare).toBeLessThanOrEqual(POOL_BALANCE_PRESETS.grounded.lowTailRepairCap);
    expect(shaped.diagnostics.qualityBandTargetCounts['middle-core']).toBeGreaterThan(0);
    expect(shaped.diagnostics.qualityBandFinalCounts['middle-core']).toBeGreaterThan(0);
  });

  it('selects a deterministic numeric-grade supply curve with capped high tail and middle mass', () => {
    const source = exactCurveSource();
    const first = shapePoolByNumericGrade({
      universe: source,
      currentPlayers: [],
      protectedIds: new Set<string>(),
      targetSize: 100,
      requiredRosterDemand: 80,
      fitOf: () => 0,
    });
    const second = shapePoolByNumericGrade({
      universe: [...source].reverse(),
      currentPlayers: [],
      protectedIds: new Set<string>(),
      targetSize: 100,
      requiredRosterDemand: 80,
      fitOf: () => 0,
    });

    expect(first.players.map((player) => player.id)).toEqual(second.players.map((player) => player.id));
    expect(first.diagnostics.highTailShare).toBeLessThanOrEqual(0.15);
    expect(first.diagnostics.middleMassShare).toBeGreaterThanOrEqual(0.70);
    expect(first.diagnostics.lowTailShare).toBeLessThanOrEqual(0.10);
    expect(first.diagnostics.poolSlackFactor).toBeCloseTo(1.25);
  });

  it('counts alternate source cards as one person while it shapes a numeric pool', () => {
    const source = exactCurveSource().flatMap((player, index) => {
      const versionGroupId = `legend-person-${index}`;
      return [
        { ...player, id: `${player.id}-career`, versionGroupId },
        { ...player, id: `${player.id}-peak`, versionGroupId, iv: player.iv + 1, salary: player.salary + 1 },
      ];
    });
    const shaped = shapePoolByNumericGrade({
      universe: source,
      currentPlayers: [],
      protectedIds: new Set<string>(),
      targetSize: 80,
      requiredRosterDemand: 64,
      fitOf: () => 0,
    });

    expect(source).toHaveLength(200);
    expect(shaped.players).toHaveLength(80);
    expect(new Set(shaped.players.map((player) => player.versionGroupId))).toHaveLength(80);
  });

  it('keeps protected alternate cards but counts their shared person once against the target', () => {
    const base = exactCurveSource();
    const first = { ...base[0], id: 'protected-career', versionGroupId: 'protected-person' };
    const second = { ...base[0], id: 'protected-peak', versionGroupId: 'protected-person' };
    const source = [first, second, ...base.slice(1).map((player, index) => ({
      ...player,
      versionGroupId: `other-person-${index}`,
    }))];
    const shaped = shapePoolByNumericGrade({
      universe: source,
      currentPlayers: [first, second],
      protectedIds: new Set([first.id, second.id]),
      targetSize: 20,
      requiredRosterDemand: 16,
      fitOf: () => 0,
    });

    expect(shaped.players.map((player) => player.id)).toEqual(expect.arrayContaining([first.id, second.id]));
    expect(new Set(shaped.players.map((player) => player.versionGroupId))).toHaveLength(20);
    expect(shaped.players).toHaveLength(21);
  });

  it('balanced preset matches the default numeric-grade supply curve', () => {
    const source = [
      ...exactCurveSource(),
      ...shapedHitters('extra-middle', 40, MIDDLE_CORE),
      ...shapedHitters('extra-high', 20, HIGH_TAIL),
      ...shapedHitters('extra-ultra', 10, HIGH_BAT),
    ];
    const defaultShape = shapePoolByNumericGrade({
      universe: source,
      currentPlayers: [],
      protectedIds: new Set<string>(),
      targetSize: 100,
      requiredRosterDemand: 80,
      fitOf: () => 0,
    });
    const balancedShape = shapePoolByNumericGrade({
      universe: [...source].reverse(),
      currentPlayers: [],
      protectedIds: new Set<string>(),
      targetSize: 100,
      requiredRosterDemand: 80,
      fitOf: () => 0,
      preset: 'balanced',
      tuning: poolBalancePresetTuning('balanced'),
    });

    expect(POOL_BALANCE_PRESETS.balanced.poolSlackFactor).toBe(DEFAULT_POOL_SIZE_MULTIPLIER);
    expect(balancedShape.players.map((player) => player.id)).toEqual(defaultShape.players.map((player) => player.id));
    expect(balancedShape.diagnostics.highTailShare).toBe(defaultShape.diagnostics.highTailShare);
    expect(balancedShape.diagnostics.middleMassShare).toBe(defaultShape.diagnostics.middleMassShare);
  });

  it('grounded preset reduces high and superstar tails versus balanced', () => {
    const source = [
      ...exactCurveSource(),
      ...shapedHitters('extra-middle', 40, MIDDLE_CORE),
      ...shapedHitters('extra-high', 30, HIGH_TAIL),
      ...shapedHitters('extra-ultra', 20, HIGH_BAT),
    ];
    const balanced = shapePoolByNumericGrade({
      universe: source,
      currentPlayers: [],
      protectedIds: new Set<string>(),
      targetSize: 100,
      requiredRosterDemand: 80,
      fitOf: () => 0,
      preset: 'balanced',
    });
    const grounded = shapePoolByNumericGrade({
      universe: source,
      currentPlayers: [],
      protectedIds: new Set<string>(),
      targetSize: 100,
      requiredRosterDemand: 80,
      fitOf: () => 0,
      preset: 'grounded',
    });

    expect(grounded.diagnostics.highTailShare).toBeLessThan(balanced.diagnostics.highTailShare);
    expect(grounded.diagnostics.superstarTailShare).toBeLessThanOrEqual(balanced.diagnostics.superstarTailShare);
    expect(grounded.diagnostics.superstarTailShare).toBeLessThanOrEqual(POOL_BALANCE_PRESETS.grounded.superstarTailCap);
  });

  it('juiced preset increases high tail without violating the superstar cap', () => {
    const source = [
      ...exactCurveSource(),
      ...shapedHitters('extra-middle', 40, MIDDLE_CORE),
      ...shapedHitters('extra-high', 30, HIGH_TAIL),
      ...shapedHitters('extra-ultra', 20, HIGH_BAT),
    ];
    const balanced = shapePoolByNumericGrade({
      universe: source,
      currentPlayers: [],
      protectedIds: new Set<string>(),
      targetSize: 100,
      requiredRosterDemand: 80,
      fitOf: () => 0,
      preset: 'balanced',
    });
    const juiced = shapePoolByNumericGrade({
      universe: source,
      currentPlayers: [],
      protectedIds: new Set<string>(),
      targetSize: 100,
      requiredRosterDemand: 80,
      fitOf: () => 0,
      preset: 'juiced',
    });

    expect(juiced.diagnostics.highTailShare).toBeGreaterThan(balanced.diagnostics.highTailShare);
    expect(juiced.diagnostics.superstarTailShare).toBeLessThanOrEqual(POOL_BALANCE_PRESETS.juiced.superstarTailCap);
  });

  it('limits the ultra-high numeric tail as its own source-level curve window', () => {
    const source = [
      ...exactCurveSource(),
      ...shapedHitters('ultra-high', 25, HIGH_BAT),
    ];
    const shaped = shapePoolByNumericGrade({
      universe: source,
      currentPlayers: [],
      protectedIds: new Set<string>(),
      targetSize: 100,
      requiredRosterDemand: 80,
      fitOf: () => 0,
    });

    const ultraHighCount = shaped.players.filter((player) => numericGradeForPoolShape(player) >= 84).length;
    expect(ultraHighCount).toBeLessThanOrEqual(2);
    expect(shaped.diagnostics.highTailShare).toBeLessThanOrEqual(0.15);
    expect(shaped.diagnostics.middleMassShare).toBeGreaterThanOrEqual(0.70);
  });

  it('reports numeric quota shortfalls instead of silently filling missing middle windows', () => {
    const source = [
      ...shapedHitters('too-low', 12, LOW_TAIL),
      ...shapedHitters('too-high', 12, HIGH_TAIL),
    ];
    const shaped = shapePoolByNumericGrade({
      universe: source,
      currentPlayers: [],
      protectedIds: new Set<string>(),
      targetSize: 20,
      requiredRosterDemand: 16,
      fitOf: () => 0,
    });

    expect(shaped.diagnostics.quotaShortfalls.length).toBeGreaterThan(0);
    expect(shaped.diagnostics.quotaShortfalls.some((shortfall) => shortfall.windowId.startsWith('middle'))).toBe(true);
    expect(shaped.diagnostics.messages.join(' ')).toContain('quota fallback');
  });

  it('preserves fit-first ordering inside a numeric window with deterministic id ties', () => {
    const lowFit = hitter('SS', MIDDLE_CORE, 10_000);
    lowFit.id = 'a-low-fit';
    const highFit = hitter('SS', MIDDLE_CORE, 10_000);
    highFit.id = 'b-high-fit';

    const shaped = shapePoolByNumericGrade({
      universe: [lowFit, highFit],
      currentPlayers: [],
      protectedIds: new Set<string>(),
      targetSize: 1,
      requiredRosterDemand: 1,
      fitOf: (player) => (player.id === highFit.id ? 10 : 0),
    });

    expect(shaped.players.map((player) => player.id)).toEqual([highFit.id]);
  });

  it('uses selected-team roster membership as source priority, not a hard keep', () => {
    const fullPoolFirst = hitter('SS', MIDDLE_CORE, 10_000);
    fullPoolFirst.id = 'a-full-pool-first';
    const rosterPriority = hitter('SS', MIDDLE_CORE, 10_000);
    rosterPriority.id = 'z-roster-priority';

    const rosterPrioritized = shapePoolByNumericGrade({
      universe: [fullPoolFirst, rosterPriority],
      currentPlayers: [],
      protectedIds: new Set<string>(),
      targetSize: 1,
      requiredRosterDemand: 1,
      fitOf: () => 0,
      poolSourceMode: 'team-roster-priority',
      priorityIds: new Set([rosterPriority.id]),
    });
    const fullPool = shapePoolByNumericGrade({
      universe: [fullPoolFirst, rosterPriority],
      currentPlayers: [],
      protectedIds: new Set<string>(),
      targetSize: 1,
      requiredRosterDemand: 1,
      fitOf: () => 0,
      poolSourceMode: 'full-pool',
      priorityIds: new Set([rosterPriority.id]),
    });

    expect(rosterPrioritized.players.map((player) => player.id)).toEqual([rosterPriority.id]);
    expect(rosterPrioritized.diagnostics.poolSourceMode).toBe('team-roster-priority');
    expect(rosterPrioritized.diagnostics.hardKeepCount).toBe(0);
    expect(rosterPrioritized.diagnostics.selectedTeamRosterCandidateCount).toBe(1);
    expect(rosterPrioritized.diagnostics.engineGeneratedFromSelectedTeamRosterCount).toBe(1);
    expect(fullPool.players.map((player) => player.id)).toEqual([fullPoolFirst.id]);
    expect(fullPool.diagnostics.poolSourceMode).toBe('full-pool');
    expect(fullPool.diagnostics.selectedTeamRosterCandidateCount).toBe(1);
    expect(fullPool.diagnostics.engineGeneratedFromSelectedTeamRosterCount).toBe(0);
  });

  it('keeps selected-team priority as priority, not a hard keep, under shifted quality centers', () => {
    const fullPoolFirst = hitter('SS', HIGH_TAIL, 10_000);
    fullPoolFirst.id = 'a-full-pool-first-shifted';
    const rosterPriority = hitter('SS', HIGH_TAIL, 10_000);
    rosterPriority.id = 'z-roster-priority-shifted';

    const rosterPrioritized = shapePoolByNumericGrade({
      universe: [fullPoolFirst, rosterPriority],
      currentPlayers: [],
      protectedIds: new Set<string>(),
      targetSize: 1,
      requiredRosterDemand: 1,
      fitOf: () => 0,
      poolSourceMode: 'team-roster-priority',
      priorityIds: new Set([rosterPriority.id]),
      poolQualityCenter: 72,
    });

    expect(rosterPrioritized.players.map((player) => player.id)).toEqual([rosterPriority.id]);
    expect(rosterPrioritized.diagnostics.poolQualityCenter).toBe(72);
    expect(rosterPrioritized.diagnostics.hardKeepCount).toBe(0);
    expect(rosterPrioritized.diagnostics.engineGeneratedFromSelectedTeamRosterCount).toBe(1);
  });

  it('preserves protected/reserved source players even when they exceed the numeric target', () => {
    const first = hitter('SS', HIGH_TAIL, 10_000);
    first.id = 'protected-a';
    const second = hitter('SS', HIGH_TAIL, 11_000);
    second.id = 'protected-b';
    const shaped = shapePoolByNumericGrade({
      universe: [first, second],
      currentPlayers: [first, second],
      protectedIds: new Set([first.id, second.id]),
      targetSize: 1,
      requiredRosterDemand: 1,
      fitOf: () => 0,
    });

    expect(shaped.players.map((player) => player.id)).toEqual([first.id, second.id]);
    expect(shaped.diagnostics.messages.join(' ')).toContain('protected classes already exceed');
  });

  it('counts protected high-tail players against generated high-tail need', () => {
    const source = [
      ...exactCurveSource(),
      ...shapedHitters('extra-middle', 40, MIDDLE_CORE),
      ...shapedHitters('extra-high', 30, HIGH_TAIL),
    ];
    const protectedHigh = source.find((player) => player.id.startsWith('high-'))!;
    const baseline = shapePoolByNumericGrade({
      universe: source,
      currentPlayers: [],
      protectedIds: new Set<string>(),
      targetSize: 100,
      requiredRosterDemand: 80,
      fitOf: () => 0,
      preset: 'balanced',
    });
    const withProtected = shapePoolByNumericGrade({
      universe: source,
      currentPlayers: [protectedHigh],
      protectedIds: new Set([protectedHigh.id]),
      targetSize: 100,
      requiredRosterDemand: 80,
      fitOf: () => 0,
      preset: 'balanced',
    });

    expect(withProtected.players.map((player) => player.id)).toContain(protectedHigh.id);
    expect(withProtected.diagnostics.hardKeepByBand.high).toBe(1);
    expect(withProtected.diagnostics.engineGeneratedByBand.high).toBeLessThan(baseline.diagnostics.finalPoolByBand.high);
    expect(withProtected.diagnostics.finalPoolByBand.high).toBe(baseline.diagnostics.finalPoolByBand.high);
  });

  it('counts protected low-tail players against generated low-tail need', () => {
    const source = [
      ...exactCurveSource(),
      ...shapedHitters('extra-low', 20, LOW_TAIL),
      ...shapedHitters('extra-middle', 40, MIDDLE_CORE),
    ];
    const protectedLow = source.find((player) => player.id.startsWith('low-'))!;
    const baseline = shapePoolByNumericGrade({
      universe: source,
      currentPlayers: [],
      protectedIds: new Set<string>(),
      targetSize: 100,
      requiredRosterDemand: 80,
      fitOf: () => 0,
      preset: 'balanced',
    });
    const withProtected = shapePoolByNumericGrade({
      universe: source,
      currentPlayers: [protectedLow],
      protectedIds: new Set([protectedLow.id]),
      targetSize: 100,
      requiredRosterDemand: 80,
      fitOf: () => 0,
      preset: 'balanced',
    });

    expect(withProtected.players.map((player) => player.id)).toContain(protectedLow.id);
    expect(withProtected.diagnostics.hardKeepByBand.low).toBe(1);
    expect(withProtected.diagnostics.engineGeneratedByBand.low).toBeLessThan(baseline.diagnostics.finalPoolByBand.low);
    expect(withProtected.diagnostics.finalPoolByBand.low).toBe(baseline.diagnostics.finalPoolByBand.low);
  });

  it('preserves excess protected high-tail players and reports shape overflow', () => {
    const protectedHigh = shapedHitters('protected-high-overflow', 8, HIGH_TAIL);
    const source = [
      ...protectedHigh,
      ...shapedHitters('middle-overflow', 40, MIDDLE_CORE),
    ];
    const shaped = shapePoolByNumericGrade({
      universe: source,
      currentPlayers: protectedHigh,
      protectedIds: new Set(protectedHigh.map((player) => player.id)),
      targetSize: 10,
      requiredRosterDemand: 8,
      fitOf: () => 0,
      preset: 'grounded',
    });

    expect(protectedHigh.every((player) => shaped.players.some((kept) => kept.id === player.id))).toBe(true);
    expect(shaped.diagnostics.hardKeepShapeOverflowByBand.high).toBeGreaterThan(0);
    expect(shaped.diagnostics.hardKeepOverflowCount).toBe(0);
    expect(shaped.diagnostics.messages.join(' ')).toContain('high-tail cap still exceeds');
  });

  it('preserves hard keeps that conflict with a shifted quality center and diagnoses the conflict', () => {
    const protectedLow = shapedHitters('protected-low-shifted', 4, LOW_TAIL);
    const source = [
      ...protectedLow,
      ...qualitySpectrumSource(),
    ];
    const shaped = shapePoolByNumericGrade({
      universe: source,
      currentPlayers: protectedLow,
      protectedIds: new Set(protectedLow.map((player) => player.id)),
      targetSize: 10,
      requiredRosterDemand: 8,
      fitOf: () => 0,
      poolQualityCenter: 72,
    });

    expect(protectedLow.every((player) => shaped.players.some((kept) => kept.id === player.id))).toBe(true);
    expect(shaped.diagnostics.hardKeepByBand.low).toBeGreaterThan(0);
    expect(shaped.diagnostics.hardKeepShapeOverflowByBand.low).toBeGreaterThan(0);
    expect(shaped.diagnostics.qualityCenterShortfallReason).toContain('hard keeps');
  });

  it('uses generationNonce for deterministic reroll inside numeric windows', () => {
    const source = [
      ...shapedHitters('reroll-middle-a', 60, MIDDLE_CORE),
      ...shapedHitters('reroll-middle-b', 60, MIDDLE_HIGH),
      ...shapedHitters('reroll-low', 20, LOW_TAIL),
      ...shapedHitters('reroll-high', 20, HIGH_TAIL),
    ];
    const common = {
      universe: source,
      currentPlayers: [],
      protectedIds: new Set<string>(),
      targetSize: 50,
      requiredRosterDemand: 40,
      fitOf: () => 0,
      preset: 'balanced' as const,
    };
    const first = shapePoolByNumericGrade({ ...common, generationNonce: 1 });
    const same = shapePoolByNumericGrade({ ...common, generationNonce: 1 });
    const rerolled = shapePoolByNumericGrade({ ...common, generationNonce: 2 });

    expect(first.players.map((player) => player.id)).toEqual(same.players.map((player) => player.id));
    expect(rerolled.players.map((player) => player.id)).not.toEqual(first.players.map((player) => player.id));
    expect(rerolled.diagnostics.highTailShare).toBeLessThanOrEqual(POOL_BALANCE_PRESETS.balanced.highTailCap);
    expect(rerolled.diagnostics.middleMassShare).toBeGreaterThanOrEqual(POOL_BALANCE_PRESETS.balanced.targetMiddleMass);
  });

  it('keeps manual exclusions out during deterministic reroll when alternatives exist', () => {
    const source = [
      ...shapedHitters('exclude-middle-a', 60, MIDDLE_CORE),
      ...shapedHitters('exclude-middle-b', 60, MIDDLE_HIGH),
      ...shapedHitters('exclude-low', 20, LOW_TAIL),
      ...shapedHitters('exclude-high', 20, HIGH_TAIL),
    ];
    const baseline = shapePoolByNumericGrade({
      universe: source,
      currentPlayers: [],
      protectedIds: new Set<string>(),
      targetSize: 50,
      requiredRosterDemand: 40,
      fitOf: () => 0,
      preset: 'balanced',
    });
    const removed = baseline.players.find((player) => player.id.startsWith('exclude-middle'))!;
    const rerolled = shapePoolByNumericGrade({
      universe: source,
      currentPlayers: [],
      protectedIds: new Set<string>(),
      excludedIds: new Set([removed.id]),
      targetSize: 50,
      requiredRosterDemand: 40,
      fitOf: () => 0,
      preset: 'balanced',
      generationNonce: 1,
    });

    expect(rerolled.players.map((player) => player.id)).not.toContain(removed.id);
  });

  it('keeps manual exclusions out across quality-center shifts when alternatives exist', () => {
    const source = qualitySpectrumSource();
    const baseline = shapePoolByNumericGrade({
      universe: source,
      currentPlayers: [],
      protectedIds: new Set<string>(),
      targetSize: 60,
      requiredRosterDemand: 48,
      fitOf: () => 0,
      poolQualityCenter: 72,
    });
    const removed = baseline.players.find((player) => player.id.startsWith('quality-70')) ?? baseline.players[0];
    const shifted = shapePoolByNumericGrade({
      universe: source,
      currentPlayers: [],
      protectedIds: new Set<string>(),
      excludedIds: new Set([removed.id]),
      targetSize: 60,
      requiredRosterDemand: 48,
      fitOf: () => 0,
      poolQualityCenter: 72,
      generationNonce: 2,
    });

    expect(shifted.players.map((player) => player.id)).not.toContain(removed.id);
    expect(shifted.diagnostics.poolQualityCenter).toBe(72);
  });

  it('reports quality-center shortfalls when source supply cannot satisfy shifted high quality', () => {
    const source = [
      ...shapedHitters('short-low', 20, LOW_TAIL),
      ...shapedHitters('short-middle', 20, MIDDLE_LOW),
    ];
    const shaped = shapePoolByNumericGrade({
      universe: source,
      currentPlayers: [],
      protectedIds: new Set<string>(),
      targetSize: 30,
      requiredRosterDemand: 24,
      fitOf: () => 0,
      poolQualityCenter: 76,
    });

    expect(shaped.players.length).toBeGreaterThan(0);
    expect(shaped.diagnostics.quotaShortfalls.length).toBeGreaterThan(0);
    expect(Object.keys(shaped.diagnostics.qualityBandShortfalls).length).toBeGreaterThan(0);
    expect(shaped.diagnostics.qualityCenterShortfallReason).toContain('source pool constraints');
  });

  it('caps requested targets at the hard ceiling and rejects off-stop multipliers', () => {
    const target = resolvePoolSizingTarget({ teams: 8, shills: 0, sizeTarget: 999, poolSizeMultiplier: 1.5 });
    expect(target.ceilingTarget).toBe(264);
    expect(target.requestedTarget).toBe(264);
    expect(POOL_SIZE_MULTIPLIER_STOPS).toEqual([1.2, 1.25, 1.3, 1.35, 1.4, 1.45, 1.5]);
    expect(() => resolvePoolSizingTarget({ teams: 8, poolSizeMultiplier: 1.33 })).toThrow(/poolSizeMultiplier/);
  });

  it('trims by fit before price, evicting cheap zero-fit filler before pricey good-fit filler', () => {
    const cheapZero = { id: 'cheap-zero', salary: 1 };
    const priceyFit = { id: 'pricey-fit', salary: 1_000 };
    const result = trimPoolToTarget([cheapZero, priceyFit], new Set<string>(), (player) => (player.id === cheapZero.id ? 0 : 10), 1);
    expect(result.evicted.map((player) => player.id)).toEqual(['cheap-zero']);
    expect(result.kept.map((player) => player.id)).toEqual(['pricey-fit']);
  });

  it('never evicts reserved, identity-claimed, floor-protected, or pinned ids', () => {
    const players = [
      { id: 'reserved', salary: 500 },
      { id: 'claimed', salary: 400 },
      { id: 'floor', salary: 300 },
      { id: 'pinned', salary: 250 },
      { id: 'loose', salary: 200 },
    ];
    const result = trimPoolToTarget(players, new Set(['reserved', 'claimed', 'floor', 'pinned']), () => 0, 1);
    expect(result.evicted.map((player) => player.id)).toEqual(['loose']);
    expect(result.kept.map((player) => player.id).sort()).toEqual(['claimed', 'floor', 'pinned', 'reserved']);
  });

  it('trims unprotected quota overfill when protected distribution stays below the numeric target', () => {
    n = 0;
    const protectedPlayers = Array.from({ length: 10 }, (_, index) => hitter('SS', MIDDLE_CORE, 10_000 + index, {
      id: `certificate-ss-${index}`,
    } as Partial<DemandUniversePlayer>));
    const source = [
      ...protectedPlayers,
      ...Array.from({ length: 8 }, (_, index) => hitter('SS', index % 2 === 0 ? LOW_TAIL : HIGH_TAIL, 20_000 + index)),
      ...Array.from({ length: 16 }, (_, index) => hitter('CF', index % 2 === 0 ? MIDDLE_LOW : MIDDLE_HIGH, 30_000 + index)),
    ];
    const protectedIds = new Set(protectedPlayers.map((player) => player.id));
    const shape = () => shapePoolByNumericGrade({
      universe: source,
      currentPlayers: protectedPlayers,
      protectedIds,
      targetSize: 12,
      requiredRosterDemand: 10,
      fitOf: (player) => numericGradeForPoolShape(player),
    });

    const first = shape();
    const second = shape();

    expect(first.players).toHaveLength(12);
    expect(protectedPlayers.every((player) => first.players.some((candidate) => candidate.id === player.id))).toBe(true);
    expect(first.players.map((player) => player.id)).toEqual(second.players.map((player) => player.id));
    expect(first.diagnostics.messages.some((message) => message.includes('trimmed') && message.includes('unprotected'))).toBe(true);
    expect(first.diagnostics.quotaShortfalls.length).toBeGreaterThan(0);
  });

  it('preserves every chosen-identity claim across Tight, Competitive, and Loose shaping', () => {
    const source = universe();
    for (const poolSizeMultiplier of [1.2, 1.35, 1.5]) {
      const result = extractPoolFromDemand(source, [], archetypes, 'standard', {
        teams: 2,
        budgetPerTeam: 5_000_000,
        poolSizeMultiplier,
        preserveSelectedIdentityClaims: true,
      });
      const selected = new Set(result.players.map((player) => player.id));
      expect(result.floors.claimedIds.length).toBeGreaterThan(0);
      expect(result.floors.claimedIds.every((id) => selected.has(id))).toBe(true);
      expect(result.floors.verdicts.every((verdict) => verdict.band !== 'LOCKED')).toBe(true);
    }
  });

  it('skips duplicate identity extraction only for a receipt bound to the exact shaping universe', () => {
    const source = universe();
    const supportIds = source.slice(0, 44).map((player) => player.id);
    const receipt = createPoolIdentitySupportReceipt({
      universe: source,
      selectedArchetypes: archetypes,
      tier: 'standard',
      teams: 2,
      budgetPerTeam: 5_000_000,
      playerIds: supportIds,
      authorityFingerprint: 'validated-full-source-proof',
    });
    const certified = extractPoolFromDemand(source, [], archetypes, 'standard', {
      teams: 2,
      budgetPerTeam: 5_000_000,
      poolSizeMultiplier: 1.5,
      identitySupportIds: supportIds,
      identitySupportReceipt: receipt,
      preserveSelectedIdentityClaims: false,
    });
    const supportSignature = [...supportIds].sort().join('|');
    expect([...certified.floors.claimedIds].sort().join('|')).toBe(supportSignature);

    const rawOnly = extractPoolFromDemand(source, [], archetypes, 'standard', {
      teams: 2,
      budgetPerTeam: 5_000_000,
      poolSizeMultiplier: 1.5,
      identitySupportIds: supportIds,
      preserveSelectedIdentityClaims: false,
    });
    expect([...rawOnly.floors.claimedIds].sort().join('|')).not.toBe(supportSignature);

    const changedSource = source.map((player, index) => index === 0
      ? { ...player, iv: player.iv + 1 }
      : player);
    const tampered = extractPoolFromDemand(changedSource, [], archetypes, 'standard', {
      teams: 2,
      budgetPerTeam: 5_000_000,
      poolSizeMultiplier: 1.5,
      identitySupportIds: supportIds,
      identitySupportReceipt: receipt,
      preserveSelectedIdentityClaims: false,
    });
    expect([...tampered.floors.claimedIds].sort().join('|')).not.toBe(supportSignature);
  });

  it('does not let a manual removal silently defeat a chosen identity claim', () => {
    const source = universe();
    const baseline = extractPoolFromDemand(source, [], archetypes, 'standard', {
      teams: 2,
      budgetPerTeam: 5_000_000,
      poolSizeMultiplier: 1.2,
      preserveSelectedIdentityClaims: true,
    });
    const claimedId = baseline.floors.claimedIds[0];
    expect(claimedId).toBeDefined();

    const result = extractPoolFromDemand(source, [], archetypes, 'standard', {
      teams: 2,
      budgetPerTeam: 5_000_000,
      poolSizeMultiplier: 1.2,
      excludedIds: [claimedId],
      preserveSelectedIdentityClaims: true,
    });
    expect(result.players.map((player) => player.id)).toContain(claimedId);
    expect(result.sizing?.messages.some((message) => message.includes('chosen club identities require'))).toBe(true);
  });

  it('uses salary-desc then id-asc only inside equal-fit trim ties', () => {
    const players = [
      { id: 'b-cheap', salary: 100 },
      { id: 'a-expensive', salary: 300 },
      { id: 'a-cheap', salary: 100 },
    ];
    const result = trimPoolToTarget(players, new Set<string>(), () => 1, 1);
    expect(result.evicted.map((player) => player.id)).toEqual(['a-expensive', 'a-cheap']);
  });

  it('clamps an undersized absolute request up to the hard floor with the clamp flag', () => {
    const target = resolvePoolSizingTarget({ teams: 4, shills: 0, sizeTarget: 10, poolSizeMultiplier: DEFAULT_POOL_SIZE_MULTIPLIER });
    expect(target.requestedTarget).toBe(10);
    expect(target.effectiveTarget).toBe(target.hardFloor);
    expect(target.clamped).toBe(true);
  });

  it('constructs disjoint legal 22-player G1 assemblies under the resolved cap', () => {
    const result = extractPoolFromDemand(universe(), [], archetypes, 'standard', {
      teams: 2,
      budgetPerTeam: 5_000_000,
      poolSizeMultiplier: DEFAULT_POOL_SIZE_MULTIPLIER,
    });
    expect(result.g1?.holds).toBe(true);
    expect(result.g1?.assemblies).toHaveLength(2);
    const seen = new Set<string>();
    for (const assembly of result.g1?.assemblies ?? []) {
      expect(assembly).toHaveLength(22);
      for (const id of assembly) {
        expect(seen.has(id)).toBe(false);
        seen.add(id);
      }
      const players = assembly.map((id) => result.players.find((player) => player.id === id)!);
      expect(isLegalRoster(players)).toBe(true);
      expect(players.reduce((sum, player) => sum + player.salary, 0)).toBeLessThanOrEqual(5_000_000);
    }
    expect(result.numericShape?.legalCompletionFeasible).toBe(true);
  });

  it('threads poolQualityCenter through extraction without changing cap or source-mode semantics', () => {
    const result = extractPoolFromDemand(universe(), [], archetypes, 'standard', {
      teams: 2,
      budgetPerTeam: 5_000_000,
      poolQualityCenter: 72,
      poolSourceMode: 'full-pool',
    });

    expect(result.sizing).toBeDefined();
    expect(result.numericShape?.poolQualityCenter).toBe(72);
    expect(result.numericShape?.qualityShift).toBe(4);
    expect(result.numericShape?.shiftedBandWindows.find((window) => window.id === 'high-tail')).toEqual(
      expect.objectContaining({ minInclusive: 80, maxExclusive: 88 }),
    );
    expect(result.numericShape?.poolSourceMode).toBe('full-pool');
  });

  it('selects a pricier fitting repair body before a cheaper zero-fit fallback', () => {
    const cheapZero = { id: 'cheap-zero-rf', salary: 10 };
    const fitting = { id: 'fitting-rf', salary: 20 };
    const pick = selectFitAwareRepairCandidate(
      [cheapZero, fitting],
      5,
      (player) => (player.id === 'fitting-rf' ? 5 : 0),
    );
    expect(pick).toEqual({ player: fitting, lastResort: false });
  });

  it('injects the cheapest legal body with a last-resort note when no repair body is fit-qualified', () => {
    n = 0;
    const source = universe().slice(0, 28);
    const fallback = hitter('RF', LOW, 1);
    fallback.id = 'fallback-rf';
    source.push(fallback);
    const result = extractPoolFromDemand(source, [], [HISTORICAL_ARCHETYPES.find((a) => a.id === 'big-red-machine')!], 'standard', {
      teams: 1,
      budgetPerTeam: 20_000,
      sizeTarget: 26,
      poolSizeMultiplier: DEFAULT_POOL_SIZE_MULTIPLIER,
      maxRepairRounds: 1,
    });
    const fallbackRepairMessage = result.sizing?.messages.find((message) => message.includes('fallback-rf'));
    if (fallbackRepairMessage) {
      expect(fallbackRepairMessage).toContain('cheapest legal option');
    }
  });

  it('keeps repair additive and reports exhaustion instead of failing extraction', () => {
    const result = extractPoolFromDemand(universe().slice(0, 20), [], archetypes, 'standard', {
      teams: 2,
      budgetPerTeam: 50_000,
      sizeTarget: 10,
      poolSizeMultiplier: DEFAULT_POOL_SIZE_MULTIPLIER,
      maxRepairRounds: 1,
    });
    expect(result.players.length).toBeGreaterThan(0);
    expect(result.g1?.holds).toBe(false);
    expect(result.numericShape?.legalCompletionFeasible).toBe(false);
    expect(result.g1?.repairRounds).toBeGreaterThanOrEqual(1);
    expect(result.sizing?.messages.join(' ')).toMatch(/pool still cannot field every club|repair/);
  });

  it('lets the constructive floor beat the requested ceiling when repair needs more bodies', () => {
    const result = extractPoolFromDemand(universe(), [], archetypes, 'standard', {
      teams: 2,
      budgetPerTeam: 75_000,
      sizeTarget: 1,
      poolSizeMultiplier: DEFAULT_POOL_SIZE_MULTIPLIER,
      maxRepairRounds: 2,
    });
    expect(result.sizing?.finalSize).toBeGreaterThanOrEqual(result.sizing?.effectiveTarget ?? 0);
    expect(result.sizing?.clamped).toBe(true);
  });

  it('repairs pure G1 budget overruns with net-zero swap-downs', () => {
    n = 0;
    const starterC = hitter('C', EVEN, 1_000);
    starterC.id = 'starter-c';
    const starter1B = hitter('1B', EVEN, 1_000);
    starter1B.id = 'starter-1b';
    const backupC = hitter('1B', EVEN, 1_000, {
      secondaryPosition: 'C',
      profile: { isPitcher: false, primaryPosition: '1B', secondaryPosition: 'C', bats: 'R', throws: 'R', age: 27, ...EVEN },
    } as Partial<DemandUniversePlayer>);
    backupC.id = 'backup-c';
    const protectedPremium = hitter('LF', EVEN, 50_000);
    protectedPremium.id = 'protected-premium-lf';
    const evictableExpensive = hitter('RF', EVEN, 20_000);
    evictableExpensive.id = 'evictable-expensive-rf';
    const cheapSwap = hitter('RF', LOW, 1_000);
    cheapSwap.id = 'inject-cheap-rf';
    const initialPool = [
      starterC,
      starter1B,
      backupC,
      hitter('2B', EVEN, 1_000),
      hitter('3B', EVEN, 1_000),
      hitter('SS', EVEN, 1_000),
      hitter('LF', EVEN, 1_000),
      hitter('CF', EVEN, 1_000),
      evictableExpensive,
      protectedPremium,
      hitter('1B', EVEN, 1_000),
      hitter('2B', EVEN, 1_000),
      hitter('3B', EVEN, 1_000),
      arm('SP', { velocity: 60, junk: 60, accuracy: 60 }, 1_000),
      arm('SP', { velocity: 60, junk: 60, accuracy: 60 }, 1_000),
      arm('SP', { velocity: 60, junk: 60, accuracy: 60 }, 1_000),
      arm('SP', { velocity: 60, junk: 60, accuracy: 60 }, 1_000),
      arm('RP', { velocity: 60, junk: 60, accuracy: 60 }, 1_000),
      arm('RP', { velocity: 60, junk: 60, accuracy: 60 }, 1_000),
      arm('RP', { velocity: 60, junk: 60, accuracy: 60 }, 1_000),
      arm('RP', { velocity: 60, junk: 60, accuracy: 60 }, 1_000),
      arm('CP', { velocity: 60, junk: 60, accuracy: 60 }, 1_000),
    ];
    const protectedIds = new Set([protectedPremium.id]);
    const common = {
      universe: [...initialPool, cheapSwap],
      players: initialPool,
      protectedIds,
      teams: 1,
      budget: 75_000,
      poolMinSalary: 1_000,
      fitOf: () => 0,
    };
    const initial = repairG1PoolForSizing({ ...common, maxRounds: 0 });
    const repaired = repairG1PoolForSizing({ ...common, maxRounds: 3 });

    expect(initial.g1.holds).toBe(false);
    expect(initial.g1.failing?.overrun).toBeGreaterThan(0);
    expect(initial.g1.failing?.blockers).toEqual([
      expect.stringContaining('budget: The design fills'),
    ]);
    expect(repaired.g1.holds).toBe(true);
    expect(repaired.g1.repairRounds).toBeLessThanOrEqual(3);
    expect(repaired.players).toHaveLength(initialPool.length);
    expect(repaired.players.map((player) => player.id)).toContain(protectedPremium.id);
    expect(repaired.players.map((player) => player.id)).toContain(cheapSwap.id);
    expect(repaired.players.map((player) => player.id)).not.toContain(evictableExpensive.id);
    expect(repaired.injectedIds).toEqual([cheapSwap.id]);
    expect(repaired.evictedIds).toEqual([evictableExpensive.id]);
    expect(repaired.messages.join(' ')).toContain(`id ${cheapSwap.id}`);
    expect(repaired.messages.join(' ')).toContain(`id ${evictableExpensive.id}`);
    expect(repaired.evictedIds).not.toContain(protectedPremium.id);
  });

  it('G1 repair prefers a same-role middle/core candidate over cheap low-tail filler', () => {
    const initialPool = legalOneTeamPool().filter((player) => player.id !== 'legal-rf');
    const cheapLowRf = hitter('RF', LOW_TAIL, 1);
    cheapLowRf.id = 'cheap-low-rf';
    const middleRf = hitter('RF', MIDDLE_CORE, 2_000);
    middleRf.id = 'middle-core-rf';

    const repaired = repairG1PoolForSizing({
      universe: [...initialPool, cheapLowRf, middleRf],
      players: initialPool,
      protectedIds: new Set<string>(),
      teams: 1,
      budget: 100_000,
      maxRounds: 2,
      poolMinSalary: 1,
      fitOf: () => 0,
      requiredRosterDemand: 22,
      targetSize: 22,
    });

    expect(repaired.g1.holds).toBe(true);
    expect(repaired.injectedIds).toContain(middleRf.id);
    expect(repaired.injectedIds).not.toContain(cheapLowRf.id);
    expect(repaired.lowTailAdditionsByRole).not.toHaveProperty('pos:RF');
  });

  it('swaps out low-tail overfill before appending beyond the target size', () => {
    const lowExtra = hitter('1B', LOW_TAIL, 1_000);
    lowExtra.id = 'low-extra-1b';
    const initialPool = [
      ...legalOneTeamPool().filter((player) => player.id !== 'legal-rf'),
      lowExtra,
    ];
    const middleRf = hitter('RF', MIDDLE_CORE, 2_000);
    middleRf.id = 'middle-swap-rf';

    const repaired = repairG1PoolForSizing({
      universe: [...initialPool, middleRf],
      players: initialPool,
      protectedIds: new Set<string>(),
      teams: 1,
      budget: 100_000,
      maxRounds: 2,
      poolMinSalary: 1_000,
      fitOf: () => 0,
      requiredRosterDemand: 22,
      targetSize: 22,
    });

    expect(repaired.g1.holds).toBe(true);
    expect(repaired.players).toHaveLength(22);
    expect(repaired.injectedIds).toEqual([middleRf.id]);
    expect(repaired.evictedIds).toEqual([lowExtra.id]);
    expect(repaired.swaps).toEqual([
      expect.objectContaining({
        addedId: middleRf.id,
        removedId: lowExtra.id,
        removedWindowId: 'low-tail',
      }),
    ]);
  });

  it('never removes protected players during curve-preserving G1 swap repair', () => {
    const protectedLowExtra = hitter('1B', LOW_TAIL, 1_000);
    protectedLowExtra.id = 'protected-low-extra-1b';
    const initialPool = [
      ...legalOneTeamPool().filter((player) => player.id !== 'legal-rf'),
      protectedLowExtra,
    ];
    const middleRf = hitter('RF', MIDDLE_CORE, 2_000);
    middleRf.id = 'middle-protected-rf';

    const repaired = repairG1PoolForSizing({
      universe: [...initialPool, middleRf],
      players: initialPool,
      protectedIds: new Set([protectedLowExtra.id]),
      teams: 1,
      budget: 100_000,
      maxRounds: 2,
      poolMinSalary: 1_000,
      fitOf: () => 0,
      requiredRosterDemand: 22,
      targetSize: 22,
    });

    expect(repaired.g1.holds).toBe(true);
    expect(repaired.players.map((player) => player.id)).toContain(protectedLowExtra.id);
    expect(repaired.evictedIds).not.toContain(protectedLowExtra.id);
    expect(repaired.players).toHaveLength(23);
  });

  it('reports a curve violation instead of silently growing when repair growth is disabled', () => {
    const initialPool = legalOneTeamPool().filter((player) => player.id !== 'legal-rf');
    const middleRf = hitter('RF', MIDDLE_CORE, 2_000);
    middleRf.id = 'middle-blocked-rf';

    const repaired = repairG1PoolForSizing({
      universe: [...initialPool, middleRf],
      players: initialPool,
      protectedIds: new Set<string>(),
      teams: 1,
      budget: 100_000,
      maxRounds: 1,
      poolMinSalary: 1_000,
      fitOf: () => 0,
      requiredRosterDemand: 22,
      targetSize: 21,
      repairGrowthAllowed: false,
    });

    expect(repaired.g1.holds).toBe(false);
    expect(repaired.injectedIds).toEqual([]);
    expect(repaired.curveViolations.some((violation) => violation.code === 'REPAIR_GROWTH_LIMIT')).toBe(true);
    expect(repaired.curveViolations.some((violation) => violation.code === 'LEGALITY_REQUIRES_CURVE_VIOLATION')).toBe(true);
  });

  it('exposes pre-repair and post-repair production curve diagnostics', () => {
    const result = extractPoolFromDemand(universe(), [], archetypes, 'standard', {
      teams: 2,
      budgetPerTeam: 5_000_000,
      poolSizeMultiplier: DEFAULT_POOL_SIZE_MULTIPLIER,
    });

    expect(result.numericShape?.preRepair).toBeDefined();
    expect(result.numericShape?.postRepair).toBeDefined();
    expect(result.numericShape?.g1AdditionCount).toBeGreaterThanOrEqual(0);
    expect(result.numericShape?.g1SwapCount).toBeGreaterThanOrEqual(0);
    expect(result.numericShape?.g1AdditionsByRoleWindow).toBeDefined();
    expect(result.numericShape?.curveViolations).toBeDefined();
  });

  it('keeps price shortfall wording separate from body-count wording and preserves the price-spread pin', () => {
    const designs = [designAsking('team-a', 'SS', 'Defensive-Wizard')];
    const result = extractPoolFromDemand(universe(), designs, archetypes, 'standard', {
      teams: 4,
      budgetPerTeam: 22_000,
      poolSizeMultiplier: DEFAULT_POOL_SIZE_MULTIPLIER,
    });
    expect(result.shortfalls.some((shortfall) => shortfall.message.includes('costs more than'))).toBe(true);

    const cell = result.cells.find((candidate) => candidate.key.startsWith('SS|Defensive-Wizard'));
    expect(cell?.reserved).toBe(2);
  });

  it('skips sizing and G1 for no-dial callers', () => {
    const result = extractPoolFromDemand(universe(), [designAsking('team-a', 'SS', 'Defensive-Wizard')], archetypes, 'standard', {
      teams: 4,
      budgetPerTeam: 5_000_000,
    });
    expect(result.sizing).toBeUndefined();
    expect(result.g1).toBeUndefined();
  });

  it('requires callers to pass the full league team count explicitly', () => {
    expect(() =>
      extractPoolFromDemand(universe(), [designAsking('team-a', 'SS', 'Defensive-Wizard')], archetypes, 'standard'),
    ).toThrow(PoolTeamsForSizingMissingError);
  });

  it('keeps the amendment surface byte-neutral when no pins or excludes are passed', () => {
    const result = extractPoolFromDemand(universe(), [designAsking('team-a', 'SS', 'Defensive-Wizard')], archetypes, 'standard', {
      teams: 4,
      budgetPerTeam: 5_000_000,
      poolSizeMultiplier: DEFAULT_POOL_SIZE_MULTIPLIER,
    });
    expect(result.sizing).not.toHaveProperty('pinnedHandPicks');
    expect(result.sizing).not.toHaveProperty('excludedHandRemoves');
  });

  it('force-includes pins, protects them from trim, and withholds excludes', () => {
    const source = [...universe(), ...shapedHitters('manual-headroom', 100, MIDDLE_CORE)];
    // Keep source headroom in this pin/exclude fixture; the production 1.50 default deliberately
    // consumes its entire tiny universe and would leave no outside player to pin.
    const fixtureMultiplier = 1.25;
    const baseline = extractPoolFromDemand(source, [designAsking('team-a', 'SS', 'Defensive-Wizard')], archetypes, 'standard', {
      teams: 4,
      budgetPerTeam: 5_000_000,
      poolSizeMultiplier: fixtureMultiplier,
    });
    const excluded = baseline.players.find((candidate) => {
      const trial = extractPoolFromDemand(source, [designAsking('team-a', 'SS', 'Defensive-Wizard')], archetypes, 'standard', {
        teams: 4,
        budgetPerTeam: 5_000_000,
        poolSizeMultiplier: fixtureMultiplier,
        excludedIds: [candidate.id],
      });
      return !trial.players.some((player) => player.id === candidate.id);
    })?.id;
    expect(excluded).toBeDefined();
    const pinned = source.find((player) => !baseline.players.some((kept) => kept.id === player.id));
    expect(pinned).toBeDefined();

    const result = extractPoolFromDemand(source, [designAsking('team-a', 'SS', 'Defensive-Wizard')], archetypes, 'standard', {
      teams: 4,
      budgetPerTeam: 5_000_000,
      poolSizeMultiplier: fixtureMultiplier,
      pinnedIds: [pinned!.id],
      excludedIds: [excluded!],
    });

    expect(result.players.map((player) => player.id)).toContain(pinned!.id);
    expect(result.players.map((player) => player.id)).not.toContain(excluded);
    expect(result.sizing?.pinnedHandPicks).toEqual([pinned!.id]);
    expect(result.sizing?.excludedHandRemoves).toEqual([excluded]);
    expect(result.sizing?.evictedIds).not.toContain(pinned!.id);
  });

  it('keeps explicit pins when a manual exclusion conflicts with them', () => {
    const source = universe();
    const fixtureMultiplier = 1.25;
    const baseline = extractPoolFromDemand(source, [designAsking('team-a', 'SS', 'Defensive-Wizard')], archetypes, 'standard', {
      teams: 4,
      budgetPerTeam: 5_000_000,
      poolSizeMultiplier: fixtureMultiplier,
    });
    const pinned = source.find((player) => !baseline.players.some((kept) => kept.id === player.id));
    expect(pinned).toBeDefined();

    const result = extractPoolFromDemand(source, [designAsking('team-a', 'SS', 'Defensive-Wizard')], archetypes, 'standard', {
      teams: 4,
      budgetPerTeam: 5_000_000,
      poolSizeMultiplier: fixtureMultiplier,
      pinnedIds: [pinned!.id],
      excludedIds: [pinned!.id],
    });

    expect(result.players.map((player) => player.id)).toContain(pinned!.id);
    expect(result.sizing?.pinnedHandPicks).toEqual([pinned!.id]);
    expect(result.sizing?.excludedHandRemoves).toEqual([]);
    expect(result.sizing?.evictedIds).not.toContain(pinned!.id);
  });

  it('force-includes design-priority target players as curve-counted hard keeps', () => {
    const source = universe();
    const fixtureMultiplier = 1.25;
    const baseline = extractPoolFromDemand(source, [designAsking('team-a', 'SS', 'Defensive-Wizard')], archetypes, 'standard', {
      teams: 4,
      budgetPerTeam: 5_000_000,
      poolSizeMultiplier: fixtureMultiplier,
    });
    const target = source.find((player) => !baseline.players.some((kept) => kept.id === player.id));
    expect(target).toBeDefined();

    const result = extractPoolFromDemand(source, [designAsking('team-a', 'SS', 'Defensive-Wizard')], archetypes, 'standard', {
      teams: 4,
      budgetPerTeam: 5_000_000,
      poolSizeMultiplier: fixtureMultiplier,
      designPriorityIds: [target!.id],
    });

    expect(result.players.map((player) => player.id)).toContain(target!.id);
    expect(result.numericShape?.identityCriticalCandidateCount).toBe(1);
    expect(result.numericShape?.identityCriticalIncludedCount).toBe(1);
    expect(result.numericShape?.identityCriticalMissingCount).toBe(0);
    expect(result.numericShape?.designHardKeepCount).toBe(1);
  });

  it('reports manual exclusions that block design-priority target players', () => {
    const source = universe();
    const fixtureMultiplier = 1.25;
    const baseline = extractPoolFromDemand(source, [designAsking('team-a', 'SS', 'Defensive-Wizard')], archetypes, 'standard', {
      teams: 4,
      budgetPerTeam: 5_000_000,
      poolSizeMultiplier: fixtureMultiplier,
    });
    const target = source.find((player) => !baseline.players.some((kept) => kept.id === player.id));
    expect(target).toBeDefined();

    const result = extractPoolFromDemand(source, [designAsking('team-a', 'SS', 'Defensive-Wizard')], archetypes, 'standard', {
      teams: 4,
      budgetPerTeam: 5_000_000,
      poolSizeMultiplier: fixtureMultiplier,
      designPriorityIds: [target!.id],
      excludedIds: [target!.id],
    });

    expect(result.players.map((player) => player.id)).not.toContain(target!.id);
    expect(result.numericShape?.identityCriticalCandidateCount).toBe(1);
    expect(result.numericShape?.identityCriticalIncludedCount).toBe(0);
    expect(result.numericShape?.identityCriticalMissingCount).toBe(1);
    expect(result.numericShape?.missingIdentityCriticalReasons).toEqual({ [target!.id]: 'manual exclusion' });
  });

  it('is deterministic with sizing enabled for shuffled input order', () => {
    const source = universe();
    const shuffled = [...source].reverse();
    const designs = [designAsking('team-a', 'SS', 'Defensive-Wizard')];
    const first = extractPoolFromDemand(source, designs, archetypes, 'standard', {
      teams: 4,
      budgetPerTeam: 5_000_000,
      poolSizeMultiplier: DEFAULT_POOL_SIZE_MULTIPLIER,
    });
    const second = extractPoolFromDemand(shuffled, designs, archetypes, 'standard', {
      teams: 4,
      budgetPerTeam: 5_000_000,
      poolSizeMultiplier: DEFAULT_POOL_SIZE_MULTIPLIER,
    });
    expect(first.players.map((player) => player.id)).toEqual(second.players.map((player) => player.id));
    expect(first.sizing).toEqual(second.sizing);
    expect(first.g1).toEqual(second.g1);
  });
});
