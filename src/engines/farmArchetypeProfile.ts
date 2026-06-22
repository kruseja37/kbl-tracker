import { type Band, type BandPriorities } from './leagueConstruction';
import { SMB4_TEAM_PROFILE_CATEGORIES, type Smb4TeamProfileLevels } from './smb4TeamProfileEngine';

/**
 * Build-DARK RB-9b bridge for RB-9c's farm-archetype scout-priority tilt.
 * SMB4's team profile has no defense category, so Defense is intentionally
 * dropped from the profile-gap signal; defensive completeness remains covered
 * by the analyzer's position_coverage. The priority-to-level curve is
 * sim-tunable.
 */

/**
 * Sim-tunable farm-archetype target curve. baseLevel is the neutral SMB4
 * profile target and spread lifts the highest mapped priority to level 6.
 */
export const FARM_ARCHETYPE_TARGET_TUNING = {
  baseLevel: 3,
  spread: 3,
} as const;

export const BAND_TO_PROFILE_CATEGORY: Partial<Record<Band, keyof Smb4TeamProfileLevels>> = {
  Power: 'power',
  Contact: 'contact',
  Speed: 'speed',
  Rotation: 'rotation',
  Bullpen: 'bullpen',
};

const MAPPED_PROFILE_BANDS = ['Power', 'Contact', 'Speed', 'Rotation', 'Bullpen'] as const satisfies readonly Band[];

function priorityValue(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function clampLevel(value: number): number {
  return Math.max(0, Math.min(6, value));
}

export function bandPrioritiesToTargetProfile(priorities: BandPriorities): Smb4TeamProfileLevels {
  const maxMapped = Math.max(
    0,
    ...MAPPED_PROFILE_BANDS.map((band) => priorityValue(priorities[band])),
  );
  const levels = {} as Smb4TeamProfileLevels;

  for (const category of SMB4_TEAM_PROFILE_CATEGORIES) {
    const band = MAPPED_PROFILE_BANDS.find(
      (candidate) => BAND_TO_PROFILE_CATEGORY[candidate] === category,
    );
    const priority = band ? priorityValue(priorities[band]) : 0;
    const share = maxMapped > 0 ? priority / maxMapped : 0;
    levels[category] = clampLevel(
      Math.round(
        FARM_ARCHETYPE_TARGET_TUNING.baseLevel +
        share * FARM_ARCHETYPE_TARGET_TUNING.spread,
      ),
    );
  }

  return levels;
}
