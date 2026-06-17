import {
  generateEraReporterName,
  type EraFlavor as ReporterNameEra,
} from "../engines/reporterNameGenerator";
import { deriveReporterAvatarPalette } from "../engines/reporterAvatarPalette";
import { INITIAL_MOOD_STATE } from "../engines/moodEngine";
import type {
  BeatReporter,
  EraFlavor,
  ReporterPersonality,
  VoiceStyle,
} from "../types/reporter";
import {
  createReporter,
  listReporters,
  updateReporter,
} from "./reporterStorage";

type FranchiseScopedReporterInput = Parameters<typeof createReporter>[0] & {
  franchiseId?: string;
};
type FranchiseScopedReporterPatch = Parameters<typeof updateReporter>[1] & {
  franchiseId?: string;
};

export interface ReporterAssignmentTeam {
  id: string;
  name: string;
  era?: EraFlavor;
  colors?: {
    primary?: string;
    secondary?: string;
  };
}

const DEFAULT_PRIMARY = "#4A6A42";
const DEFAULT_SECONDARY = "#E8E8D8";

const PERSONALITIES: ReporterPersonality[] = [
  "OPTIMIST",
  "PESSIMIST",
  "BALANCED",
  "DRAMATIC",
  "ANALYTICAL",
  "HOMER",
  "CONTRARIAN",
  "INSIDER",
  "OLD_SCHOOL",
  "HOT_TAKE",
];

const VOICE_STYLES: VoiceStyle[] = [
  "THE_POET",
  "THE_REACTOR",
  "THE_HOLY_COW",
  "THE_PROFESSOR",
  "THE_HYPE_MAN",
  "THE_STORYTELLER",
  "THE_GRINDER",
  "THE_CALLER",
  "THE_GENTLEMAN",
];

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function toReporterNameEra(era: EraFlavor | undefined): ReporterNameEra {
  if (era === "GOLDEN_AGE") return "classic";
  if (era === "MODERN_LOCAL") return "future";
  return "modern";
}

export async function autoGenerateReporterForTeam(
  team: ReporterAssignmentTeam,
  leagueId?: string,
  franchiseId?: string,
): Promise<BeatReporter> {
  const eraFlavor = team.era ?? "MODERN_LOCAL";
  const existingNames = (await listReporters({ leagueId, franchiseId })).map((reporter) => reporter.name);
  const name = generateEraReporterName(toReporterNameEra(eraFlavor), existingNames);
  const palette = deriveReporterAvatarPalette({
    id: team.id,
    primaryColor: team.colors?.primary ?? DEFAULT_PRIMARY,
    secondaryColor: team.colors?.secondary ?? DEFAULT_SECONDARY,
  });
  const profileSeed = hashString(`${team.id}:${franchiseId ?? leagueId ?? "global"}`);
  const personality = PERSONALITIES[profileSeed % PERSONALITIES.length];
  const voiceStyle = VOICE_STYLES[Math.floor(profileSeed / PERSONALITIES.length) % VOICE_STYLES.length];
  const now = Date.now();

  const reporterInput: FranchiseScopedReporterInput = {
    teamId: team.id,
    leagueId,
    franchiseId,
    name,
    personality,
    voiceStyle,
    eraFlavor,
    avatarEra: palette.silhouetteVariant,
    avatarColors: {
      primary: palette.primary,
      secondary: palette.secondary,
    },
    currentMood: personality === INITIAL_MOOD_STATE.baseMood
      ? INITIAL_MOOD_STATE.currentMood
      : personality,
    moodMomentum: INITIAL_MOOD_STATE.moodMomentum,
    createdAt: now,
    updatedAt: now,
  };

  return createReporter(reporterInput);
}

export async function assignReporterToTeam(
  reporterId: string,
  teamId: string,
  franchiseId?: string,
): Promise<BeatReporter> {
  const patch: FranchiseScopedReporterPatch = { teamId };
  if (franchiseId !== undefined) {
    patch.franchiseId = franchiseId;
  }
  return updateReporter(reporterId, patch);
}
