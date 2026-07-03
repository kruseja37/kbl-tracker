import { describe, expect, it } from 'vitest';
import {
  ALL_SHAPES,
  AGE_BANDS,
  EXTENDED_SHAPES,
  GENERATOR_FAMILIES,
  PERSONALITY_GROUPS,
  TAXONOMY_TUNING,
  menuForPosition,
  type ArchetypeFamilyDefinition,
  type ExtendedShapeDefinition,
} from '../../data/playerArchetypeTaxonomy';
import {
  classifyPlayerArchetype,
  pitcherAlignmentGroupFor,
  shapeAlignmentScore,
  type ClassifiableProfile,
} from '../playerArchetypeClassifier';
import { HISTORICAL_ARCHETYPES, type HistoricalArchetype } from '../../data/historicalArchetypes';
import { CAPTAIN_AGE_TILT_TIERS } from '../../utils/franchiseInitializer';
import { PERSONALITY_POOL } from '../../utils/prospectScoutingDraftEngine';
import {
  ANTAGONIST_PERSONALITIES,
  STEADY_PERSONALITIES,
} from '../relationshipFormation';
import { COMPOSURE_NEGATIVE_IMAGE_DRIVERS } from '../traitAcquisition';

function hitter(
  tools: { power: number; contact: number; speed: number; fielding: number; arm: number },
  overrides: Partial<ClassifiableProfile> = {},
): ClassifiableProfile {
  return { isPitcher: false, primaryPosition: 'CF', bats: 'R', throws: 'R', age: 27, ...tools, ...overrides };
}

function pitcher(
  tools: { velocity: number; junk: number; accuracy: number },
  overrides: Partial<ClassifiableProfile> = {},
): ClassifiableProfile {
  return {
    isPitcher: true,
    primaryPosition: 'SP',
    bats: 'R',
    throws: 'R',
    age: 27,
    arsenal: ['4F', 'SL', 'CH'],
    ...tools,
    ...overrides,
  };
}

describe('the taxonomy registry', () => {
  it('carries the 17 generator families byte-identical at the pinned anchors', () => {
    expect(GENERATOR_FAMILIES).toHaveLength(17);
    const slugger = GENERATOR_FAMILIES.find((shape) => shape.family === 'Slugger');
    expect(slugger?.template).toEqual({ power: 1, arm: 0.3, contact: -0.35, speed: -0.55, fielding: -0.25 });
    expect(slugger?.positionAffinity['1B']).toBe(1.55);
    expect(slugger?.baseWeight).toBe(1.1);
    const project = GENERATOR_FAMILIES.find((shape) => shape.family === 'Pitching-Project');
    expect(project?.baseWeight).toBe(0.85);
  });

  it('opens the sweep at 19 hitter and 12 pitcher shapes (design §2.1)', () => {
    const hitters = ALL_SHAPES.filter((shape) => shape.role === 'hitter');
    const pitchers = ALL_SHAPES.filter((shape) => shape.role === 'pitcher');
    expect(hitters).toHaveLength(18); // + Balanced (role 'both') = 19 hitter-usable
    expect(pitchers).toHaveLength(12); // + Balanced = 13 pitcher-usable
    expect(ALL_SHAPES.filter((shape) => shape.role === 'both')).toHaveLength(1);
  });

  it('builds per-position menus with role separation and real affinities', () => {
    const ss = menuForPosition('SS').map((shape) => shape.family);
    expect(ss).toContain('Defensive-Wizard');
    expect(ss).toContain('Contact-Glove');
    expect(ss).not.toContain('Power-Ace');
    const rp = menuForPosition('RP').map((shape) => shape.family);
    expect(rp).toContain('Power-Reliever');
    expect(rp).toContain('Effectively-Wild');
    expect(rp).not.toContain('Slugger');
    for (const position of ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SP', 'SP/RP', 'RP', 'CP'] as const) {
      expect(menuForPosition(position).length).toBeGreaterThanOrEqual(4);
    }
  });

  it('has no DH position anywhere (JK: DH is not part of the app)', () => {
    for (const shape of ALL_SHAPES) {
      expect(Object.keys(shape.positionAffinity)).not.toContain('DH');
    }
  });

  it('pins the age bands to the captain tilt tiers (single-math on age semantics)', () => {
    expect(AGE_BANDS.map((band) => band.maxAge)).toEqual(CAPTAIN_AGE_TILT_TIERS.map((tier) => tier.maxAge));
  });

  it('F2 pin: the personality groups equal the engines\' own sets — drift fails here', () => {
    const membersOf = (group: string) =>
      Object.entries(PERSONALITY_GROUPS)
        .filter(([, candidate]) => candidate === group)
        .map(([name]) => name.toUpperCase())
        .sort();
    expect(membersOf('STEADY')).toEqual([...STEADY_PERSONALITIES].sort());
    expect(membersOf('FRAGILE')).toEqual([...COMPOSURE_NEGATIVE_IMAGE_DRIVERS].sort());
    // FIRED_UP and VOLATILE are the antagonist-set members that are not also steady.
    for (const name of [...membersOf('FIRED_UP'), ...membersOf('VOLATILE')]) {
      expect(ANTAGONIST_PERSONALITIES).toContain(name);
    }
  });

  it('pins the personality groups to the canonical seven', () => {
    expect(Object.keys(PERSONALITY_GROUPS).sort()).toEqual([...PERSONALITY_POOL].sort());
    expect(PERSONALITY_GROUPS.Tough).toBe('STEADY');
    expect(PERSONALITY_GROUPS.Jolly).toBe('STEADY');
    expect(PERSONALITY_GROUPS.Relaxed).toBe('STEADY');
    expect(PERSONALITY_GROUPS.Competitive).toBe('FIRED_UP');
    expect(PERSONALITY_GROUPS.Egotistical).toBe('VOLATILE');
    expect(PERSONALITY_GROUPS.Timid).toBe('FRAGILE');
    expect(PERSONALITY_GROUPS.Droopy).toBe('FRAGILE');
  });
});

describe('classifyPlayerArchetype — shapes', () => {
  it('recovers every non-flat shape from its own template (synthetic self-consistency)', () => {
    const recoverable = ALL_SHAPES.filter(
      (shape) => shape.role !== 'both' && Object.keys(shape.template).length > 0,
    );
    for (const shape of recoverable) {
      const isDepth = Boolean((shape as ExtendedShapeDefinition).depthClass);
      // Five-Tool's template is near-flat BY DESIGN — its identity is level, not deviation
      // (the flat path assigns it in the star stratum), so its echo profile sits at 75.
      const base = shape.family === 'Five-Tool' ? 75 : isDepth ? 40 : 60;
      const scale = isDepth ? 8 : 15;
      // Project classes are age-and-rawness-qualified: their echoes carry the markers.
      const isProject = shape.family === 'Project' || shape.family === 'Pitching-Project';
      const projectMarkers = isProject ? { age: 21, potentialGap: 2 } : {};
      const profile: ClassifiableProfile =
        shape.role === 'pitcher'
          ? pitcher(
              {
                velocity: base + scale * (shape.template.velocity ?? 0),
                junk: base + scale * (shape.template.junk ?? 0),
                accuracy: base + scale * (shape.template.accuracy ?? 0),
              },
              { arsenal: ['4F', 'SL'], ...projectMarkers },
            )
          : hitter(
              {
                power: base + scale * (shape.template.power ?? 0),
                contact: base + scale * (shape.template.contact ?? 0),
                speed: base + scale * (shape.template.speed ?? 0),
                fielding: base + scale * (shape.template.fielding ?? 0),
                arm: base + scale * (shape.template.arm ?? 0),
              },
              projectMarkers,
            );
      const result = classifyPlayerArchetype(profile);
      expect(result.shape, `template self-recovery for ${shape.family}`).toBe(shape.family);
    }
  });

  it('age-qualifies the Project classes: a veteran with raw tools is his tool shape, not a Project', () => {
    const projectTools = { power: 71, contact: 52, speed: 69, fielding: 53, arm: 67 }; // ~Project template echo
    const veteran = classifyPlayerArchetype(hitter(projectTools, { age: 34 }));
    expect(veteran.shape).not.toBe('Project');
    const youngRaw = classifyPlayerArchetype(hitter(projectTools, { age: 21, potentialGap: 2 }));
    expect(youngRaw.shape).toBe('Project');
    // A young player whose scouting says NO headroom is not a Project either.
    const youngCapped = classifyPlayerArchetype(hitter(projectTools, { age: 21, potentialGap: 0 }));
    expect(youngCapped.shape).not.toBe('Project');
  });

  it('classifies the canonical examples', () => {
    expect(classifyPlayerArchetype(hitter({ power: 85, contact: 55, speed: 45, fielding: 50, arm: 60 })).shape)
      .toBe('Slugger');
    expect(classifyPlayerArchetype(hitter({ power: 40, contact: 50, speed: 60, fielding: 80, arm: 70 })).shape)
      .toBe('Defensive-Wizard');
    expect(classifyPlayerArchetype(pitcher({ velocity: 80, junk: 70, accuracy: 48 })).shape).toBe('Power-Ace');
    expect(classifyPlayerArchetype(pitcher({ velocity: 80, junk: 58, accuracy: 48 })).shape).toBe('Effectively-Wild');
  });

  it('stratifies flat profiles by level: Five-Tool / Balanced / Filler', () => {
    const star = classifyPlayerArchetype(hitter({ power: 80, contact: 80, speed: 80, fielding: 80, arm: 80 }));
    expect(star.shape).toBe('Five-Tool');
    expect(star.levelStratum).toBe('star');
    const mid = classifyPlayerArchetype(hitter({ power: 60, contact: 60, speed: 60, fielding: 60, arm: 60 }));
    expect(mid.shape).toBe('Balanced');
    const low = classifyPlayerArchetype(hitter({ power: 40, contact: 40, speed: 40, fielding: 40, arm: 40 }));
    expect(low.shape).toBe('Roster-Filler');
    expect(low.levelStratum).toBe('depth');
    const lowArm = classifyPlayerArchetype(pitcher({ velocity: 40, junk: 40, accuracy: 40 }));
    expect(lowArm.shape).toBe('Bullpen-Filler');
  });

  it('reserves the depth classes for the depth stratum (a cheap glove is a cheap Defensive-Wizard)', () => {
    const regular = classifyPlayerArchetype(hitter({ power: 62, contact: 50, speed: 52, fielding: 48, arm: 52 }));
    expect(regular.shape).not.toBe('Bench-Bat');
    const depthPower = classifyPlayerArchetype(hitter({ power: 55, contact: 40, speed: 35, fielding: 33, arm: 38 }));
    expect(depthPower.shape).toBe('Bench-Bat');
    expect(depthPower.levelStratum).toBe('depth');
  });

  it('gates Two-Pitch-Reliever on arsenal size', () => {
    const bigArsenal = classifyPlayerArchetype(
      pitcher({ velocity: 66, junk: 63, accuracy: 56 }, { arsenal: ['4F', 'SL', 'CH', 'CB', 'CF'], primaryPosition: 'RP' }),
    );
    expect(bigArsenal.shape).not.toBe('Two-Pitch-Reliever');
  });
});

describe('classifyPlayerArchetype — tags (the whole-profile rider)', () => {
  it('extracts handedness, utility, platoon, two-way, age band, arsenal and personality group', () => {
    const result = classifyPlayerArchetype(
      hitter(
        { power: 85, contact: 55, speed: 45, fielding: 50, arm: 60 },
        {
          bats: 'S',
          secondaryPosition: '2B',
          traits: ['POW vs LHP', 'Two Way (IF)'],
          age: 36,
          personality: 'Tough',
        },
      ),
    );
    expect(result.tags.bats).toBe('S');
    expect(result.tags.utility).toBe('2B');
    expect(result.tags.platoonSides).toEqual(['vs-LHP']);
    expect(result.tags.twoWay).toBe(true);
    expect(result.tags.ageBand).toBe('elder');
    expect(result.tags.personalityGroup).toBe('STEADY');

    const arm = classifyPlayerArchetype(
      pitcher({ velocity: 80, junk: 70, accuracy: 48 }, { throws: 'L', arsenal: ['4F', 'SL', 'CH', 'CB'], personality: 'Scholarly' }),
    );
    expect(arm.tags.leftArm).toBe(true);
    expect(arm.tags.deepArsenal).toBe(true);
    // Polluted chemistry-word personality → UNKNOWN until PERSONALITY-CANON lands.
    expect(arm.tags.personalityGroup).toBe('UNKNOWN');
  });
});

describe('shapeAlignmentScore (identity fit, not value)', () => {
  it('aligns bat-first shapes with a power identity and glove shapes against it', () => {
    const murderersRow = HISTORICAL_ARCHETYPES.find((arch) => arch.id === 'murderers-row') as HistoricalArchetype;
    const slugger = ALL_SHAPES.find((shape) => shape.family === 'Slugger') as ArchetypeFamilyDefinition;
    const speedster = ALL_SHAPES.find((shape) => shape.family === 'Speedster') as ArchetypeFamilyDefinition;
    expect(shapeAlignmentScore(slugger, murderersRow)).toBeGreaterThan(
      shapeAlignmentScore(speedster, murderersRow),
    );
  });

  it('maps pitcher alignment through the role group (rotation vs bullpen cap rows)', () => {
    const synthetic: HistoricalArchetype = {
      id: 'test-pen-power',
      name: 'Test',
      exemplars: [],
      era: '',
      lore: '',
      identity: '',
      boosts: ['PEN_VEL'],
      nerfs: ['ROT_VEL'],
      spec: { PEN_VEL: 1.5, ROT_VEL: -1.5 },
    };
    const powerReliever = ALL_SHAPES.find((shape) => shape.family === 'Power-Reliever') as ArchetypeFamilyDefinition;
    expect(shapeAlignmentScore(powerReliever, synthetic, 'bullpen')).toBeGreaterThan(0);
    expect(shapeAlignmentScore(powerReliever, synthetic, 'rotation')).toBeLessThan(0);
    expect(pitcherAlignmentGroupFor('CP')).toBe('bullpen');
    expect(pitcherAlignmentGroupFor('SP')).toBe('rotation');
  });
});

describe('taxonomy tuning sanity', () => {
  it('keeps the strata thresholds ordered', () => {
    expect(TAXONOMY_TUNING.depthLevelMax).toBeLessThan(TAXONOMY_TUNING.fiveToolLevelMin);
    expect(TAXONOMY_TUNING.flatShapeNorm).toBeGreaterThan(0);
    expect(EXTENDED_SHAPES.length).toBeGreaterThan(0);
  });
});
