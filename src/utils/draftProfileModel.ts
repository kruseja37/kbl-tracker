import { classifyPlayerArchetype, type ClassifiableProfile } from '../engines/playerArchetypeClassifier';
import type { PitchType, Player } from './leagueBuilderStorage';

const PITCHER_POSITIONS = new Set(['SP', 'RP', 'CP', 'SP/RP', 'P']);

export interface DraftProfileFullRatings {
  power: number;
  contact: number;
  speed: number;
  fielding: number;
  arm: number;
  velocity: number;
  junk: number;
  accuracy: number;
  arsenal: PitchType[];
}

export interface DraftProfileScoutBands {
  scoutedGrade: string;
  potentialGrade: string;
  scoutConfidence: string;
  scoutName: string;
}

interface DraftProfileBase {
  name: string;
  age: number;
  primaryPosition: Player['primaryPosition'];
  secondaryPosition?: Player['secondaryPosition'];
  bats: Player['bats'];
  throws: Player['throws'];
  armSlot: Player['armSlot'];
  chemistry: Player['chemistry'];
  personality: Player['personality'];
  traits: string[];
  archetype: string | null;
}

export type DraftProfileModel = DraftProfileBase & (
  | {
      fullRatings: DraftProfileFullRatings;
      scoutBands: null;
    }
  | {
      fullRatings: null;
      scoutBands: DraftProfileScoutBands;
    }
);

function displayName(player: Player): string {
  const baseName = [player.firstName, player.lastName].filter(Boolean).join(' ').trim() || player.id;
  const nickname = player.nickname?.trim();
  const comparable = (value: string): string => value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return nickname && comparable(nickname) !== comparable(baseName)
    ? `${baseName} "${nickname}"`
    : baseName;
}

function traitsFor(player: Player): string[] {
  return [player.trait1, player.trait2].filter((trait): trait is string => Boolean(trait));
}

function shouldReveal(player: Player, revealFull: boolean): boolean {
  if (player.ratingRevealState === 'revealed') return true;
  if (player.ratingRevealState === 'hidden' || revealFull === false) return false;
  return true;
}

function label(value: unknown, fallback: string): string {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function isPitcherPosition(position: string): boolean {
  return PITCHER_POSITIONS.has(position);
}

function classifierProfile(player: Player): ClassifiableProfile {
  return {
    isPitcher: isPitcherPosition(player.primaryPosition),
    primaryPosition: player.primaryPosition,
    secondaryPosition: player.secondaryPosition,
    bats: player.bats,
    throws: player.throws,
    age: player.age,
    power: player.power,
    contact: player.contact,
    speed: player.speed,
    fielding: player.fielding,
    arm: player.arm,
    velocity: player.velocity,
    junk: player.junk,
    accuracy: player.accuracy,
    traits: traitsFor(player),
    arsenal: player.arsenal,
    personality: player.personality,
  };
}

function baseModel(player: Player): DraftProfileBase {
  return {
    name: displayName(player),
    age: player.age,
    primaryPosition: player.primaryPosition,
    ...(player.secondaryPosition ? { secondaryPosition: player.secondaryPosition } : {}),
    bats: player.bats,
    throws: player.throws,
    armSlot: player.armSlot ?? null,
    chemistry: player.chemistry,
    personality: player.personality,
    traits: traitsFor(player),
    archetype: null,
  };
}

export function buildDraftProfileModel(
  player: Player,
  opts: { revealFull: boolean },
): DraftProfileModel {
  const common = baseModel(player);
  if (shouldReveal(player, opts.revealFull)) {
    return {
      ...common,
      archetype: classifyPlayerArchetype(classifierProfile(player)).shape,
      fullRatings: {
        power: player.power,
        contact: player.contact,
        speed: player.speed,
        fielding: player.fielding,
        arm: player.arm,
        velocity: player.velocity,
        junk: player.junk,
        accuracy: player.accuracy,
        arsenal: [...player.arsenal],
      },
      scoutBands: null,
    };
  }

  const scoutProfile = player.prospectProfile;
  return {
    ...common,
    archetype: label(scoutProfile?.archetypeFamily, '') || null,
    fullRatings: null,
    scoutBands: {
      scoutedGrade: label(scoutProfile?.scoutedGrade, 'Unscouted'),
      potentialGrade: label(scoutProfile?.potentialGrade, '—'),
      scoutConfidence: label(scoutProfile?.scoutConfidence, '—'),
      scoutName: label(scoutProfile?.scoutName, '—'),
    },
  };
}
