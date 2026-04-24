import { resolveMood, type MoodState } from "../../../../engines/moodEngine";
import type {
  NotabilityPlayContext,
  NotabilityResult,
} from "../../../../engines/notabilityScorer";
import {
  FAME_TIER_LABEL,
  type BeatReporter,
  type EraFlavor,
  type HistoricalFactRecord,
  type ReporterPersonality,
  type VoiceStyle,
} from "../../../../types/reporter";
import type { AtBatEvent } from "../../../../utils/eventLog";
import type { ReporterContext } from "./reporterContext";

const PERSONALITY_GUIDES: Record<ReporterPersonality, string> = {
  OPTIMIST: 'Always hunts for the silver lining and believes the club can answer back.',
  PESSIMIST: 'Sees trouble early, keeps one eye on collapse, and never says a lead feels safe.',
  BALANCED: 'Keeps both teams honest, measured, and even-handed without flattening the moment.',
  DRAMATIC: 'Treats turning points like thunderclaps and loves language like "devastating blow" or "THIS changes everything."',
  ANALYTICAL: 'Frames the action through leverage, matchup logic, and what the numbers say changed.',
  HOMER: 'Bleeds for the assigned club, celebrates loudly, and blames luck or the umpires before the hometown nine.',
  CONTRARIAN: 'Finds the less obvious angle and likes asking whether the obvious story will really hold.',
  INSIDER: 'Sounds clubhouse-connected, as if they talked to the skipper before first pitch.',
  OLD_SCHOOL: 'Values fundamentals, proper form, and the way the game "should be played."',
  HOT_TAKE: 'Provocative, punchy, and eager to turn one inning into a bigger argument.',
};

const VOICE_STYLE_GUIDES: Record<VoiceStyle, string> = {
  THE_POET: 'Winding metaphors, calm reverence, poetic pauses, and the occasional "friends, this is something special."',
  THE_REACTOR: 'Measured setup, then a sharp emotional snap like "BACK AT THE WALL... WE ARE TIED."',
  THE_HOLY_COW: 'Gravelly, loud, earthy, and unfiltered with "Holy Cow!" and "It might be... it could be... IT IS!" energy.',
  THE_PROFESSOR: 'Rich vocabulary, historical references, dramatic pauses, and dry wit.',
  THE_HYPE_MAN: 'Back-back-back energy, exclamation-heavy phrasing, and pure momentum over restraint.',
  THE_STORYTELLER: 'Context-obsessed, always tying this inning to the bigger baseball story.',
  THE_GRINDER: 'Blue-collar local-radio phrasing like "that\'s just good baseball right there."',
  THE_CALLER: 'Classic "How about that!" showmanship with golden-age enthusiasm.',
  THE_GENTLEMAN: 'Warm, intimate, polished radio courtesy with a gentle "Oh doctor!" feel.',
};

const ERA_GUIDES: Record<EraFlavor, string> = {
  GOLDEN_AGE: '1930s-1950s texture: telegraph phrasing, formal radio polish, and the occasional "ladies and gentlemen."',
  CLASSIC_TV: '1960s-1980s texture: smoother delivery, dramatic pauses, and big-league booth polish.',
  MODERN_LOCAL: '1990s-present texture: casual local-broadcast ease with light self-awareness.',
};

const RESULT_PHRASES: Record<string, string> = {
  '1B': 'singled',
  '2B': 'doubled',
  '3B': 'tripled',
  BB: 'walked',
  FC: "reached on a fielder's choice",
  FO: 'flied out',
  FLO: 'flied out',
  GO: 'grounded out',
  GRD: 'hit a ground-rule double',
  HBP: 'was hit by a pitch',
  HR: 'homered',
  IBB: 'was intentionally walked',
  ITPHR: 'hit an inside-the-park home run',
  K: 'struck out swinging',
  Kc: 'struck out looking',
  LO: 'lined out',
  PB_K: 'struck out on a passed ball',
  PO: 'popped out',
  SAC: 'laid down a sacrifice',
  SF: 'lifted a sacrifice fly',
  TP: 'hit into a triple play',
  DP: 'hit into a double play',
  WP_K: 'struck out on a wild pitch',
  E: 'reached on an error',
};

const FIELDING_PLAY_LABELS: Record<string, string> = {
  routine: 'routine play',
  charging: 'charging play',
  running: 'running play',
  diving: 'diving stop',
  leaping: 'leaping grab',
  sliding: 'sliding play',
  wall: 'wall play',
  over_shoulder: 'over-the-shoulder play',
  robbed_hr: 'robbed home run',
  failed_robbery: 'failed robbery',
  beat_runner: 'beat the runner',
  beat_throw: 'beat the throw',
  missed_dive: 'missed dive',
  missed_leap: 'missed leap',
};

const MODIFIER_LABELS: Record<string, string> = {
  ROBBERY: '[robbery]',
  NUT_SHOT: '[nut shot]',
  NUT: '[nut shot]',
  KILLED_PITCHER: '[killed pitcher]',
  KP: '[killed pitcher]',
  BEAT_THROW: '[beat throw]',
  BT: '[beat throw]',
  BEAT_RUNNER: '[beat runner]',
  BR: '[beat runner]',
  SEVEN_PLUS_PITCH_AB: '[7+ pitch AB]',
  '7+': '[7+ pitch AB]',
};

const TRAJECTORY_LABELS: Record<string, string> = {
  bunt: 'BUNT',
  fly_ball: 'FLY BALL',
  ground_ball: 'GROUND BALL',
  line_drive: 'LINE DRIVE',
  popup: 'POPUP',
};

const CONTACT_LABELS: Record<string, string> = {
  bloop: 'BLOOP',
  hard: 'HARD',
  normal: 'NORMAL',
  weak: 'WEAK',
};

type ReporterTeamPerspective = {
  awayRecentAlmanac: ReporterContext["battingTeamRecentAlmanac"];
  awayLegacySummary: string;
  awayTeam: ReporterContext["battingTeam"];
  homeRecentAlmanac: ReporterContext["battingTeamRecentAlmanac"];
  homeLegacySummary: string;
  homeTeam: ReporterContext["battingTeam"];
};

function humanizeEnum(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function resolveTeamPerspective(context: ReporterContext): ReporterTeamPerspective {
  if (context.gameState.halfInning === "TOP") {
    return {
      awayTeam: context.battingTeam,
      awayLegacySummary: context.battingTeamLegacySummary,
      awayRecentAlmanac: context.battingTeamRecentAlmanac,
      homeTeam: context.pitchingTeam,
      homeLegacySummary: context.pitchingTeamLegacySummary,
      homeRecentAlmanac: context.pitchingTeamRecentAlmanac,
    };
  }

  return {
    awayTeam: context.pitchingTeam,
    awayLegacySummary: context.pitchingTeamLegacySummary,
    awayRecentAlmanac: context.pitchingTeamRecentAlmanac,
    homeTeam: context.battingTeam,
    homeLegacySummary: context.battingTeamLegacySummary,
    homeRecentAlmanac: context.battingTeamRecentAlmanac,
  };
}

function getReporterSideContext(
  context: ReporterContext,
  reporterTeam: "home" | "away",
): {
  opponentTeam: ReporterContext["battingTeam"];
  recentAlmanac: ReporterContext["battingTeamRecentAlmanac"];
  reporterLegacySummary: string;
  reporterTeamSnapshot: ReporterContext["battingTeam"];
} {
  const teams = resolveTeamPerspective(context);
  if (reporterTeam === "home") {
    return {
      reporterTeamSnapshot: teams.homeTeam,
      opponentTeam: teams.awayTeam,
      reporterLegacySummary: teams.homeLegacySummary,
      recentAlmanac: teams.homeRecentAlmanac,
    };
  }

  return {
    reporterTeamSnapshot: teams.awayTeam,
    opponentTeam: teams.homeTeam,
    reporterLegacySummary: teams.awayLegacySummary,
    recentAlmanac: teams.awayRecentAlmanac,
  };
}

function formatAlmanacEntries(
  entries: Array<{ headline: string; summary: string }>,
  emptyLabel: string,
  limit = 3,
): string[] {
  if (entries.length === 0) {
    return [emptyLabel];
  }

  return entries.slice(0, limit).map((entry) => `${entry.headline}: ${entry.summary}`);
}

function formatBaseState(context: ReporterContext): string {
  const occupied = [
    context.gameState.bases.first ? "1st" : null,
    context.gameState.bases.second ? "2nd" : null,
    context.gameState.bases.third ? "3rd" : null,
  ].filter(Boolean);

  return occupied.length > 0 ? occupied.join(", ") : "bases empty";
}

function resolveReporterTeamName(
  context: ReporterContext,
  reporterTeam: "home" | "away",
): string {
  return getReporterSideContext(context, reporterTeam).reporterTeamSnapshot.name;
}

function formatRivalryLines(context: ReporterContext): string[] {
  const homePerspective =
    context.homeTeamRivalries.find(
      (rivalry) => rivalry.opponentTeamId === resolveTeamPerspective(context).awayTeam.id,
    ) ?? null;
  const awayPerspective =
    context.awayTeamRivalries.find(
      (rivalry) => rivalry.opponentTeamId === resolveTeamPerspective(context).homeTeam.id,
    ) ?? null;

  return [
    `Home-team rivalry intensity for this matchup: ${context.teamRivalryIntensity}/10.`,
    homePerspective
      ? `Home-team rivalry origin: ${homePerspective.origin ?? "origin not supplied"}.`
      : "Home-team rivalry origin: none supplied.",
    awayPerspective
      ? `Away-team rivalry view: ${awayPerspective.intensity}/10${awayPerspective.origin ? ` (${awayPerspective.origin})` : ""}.`
      : "Away-team rivalry view: none supplied.",
  ];
}

function formatRelationshipLines(context: ReporterContext): string[] {
  const relationships = [
    ...context.activeOpposingRelationships,
    ...context.activeWithinTeamRelationships,
  ];
  if (relationships.length === 0) {
    return ["Active relationships on the field: none supplied."];
  }

  return relationships.slice(0, 5).map((relationship) => {
    const note = relationship.note ? ` — ${relationship.note}` : "";
    return `${relationship.kind} (${relationship.intensity}/100)${note}`;
  });
}

function formatTeamDnaLines(context: ReporterContext, reporterTeam: "home" | "away"): string[] {
  if (reporterTeam !== "home") {
    return ["Team DNA facts: none supplied for the away club in ReporterContext."];
  }

  if (context.teamDnaFacts.length === 0) {
    return ["Team DNA facts: none supplied."];
  }

  return context.teamDnaFacts.map((fact) => fact);
}

function getPlayerContextLine(name: string, context: ReporterContext): string {
  if (name === context.batter.name) {
    const almanac = formatAlmanacEntries(
      context.batterRecentAlmanac,
      "No recent batter almanac entries.",
    ).join(" | ");
    return `${name} — ${FAME_TIER_LABEL[context.batter.effectiveFame]}; ${context.batterLegacySummary || "No legacy summary supplied."} Recent: ${almanac}`;
  }

  if (name === context.pitcher.name) {
    const almanac = formatAlmanacEntries(
      context.pitcherRecentAlmanac,
      "No recent pitcher almanac entries.",
    ).join(" | ");
    return `${name} — ${FAME_TIER_LABEL[context.pitcher.effectiveFame]}; ${context.pitcherLegacySummary || "No legacy summary supplied."} Recent: ${almanac}`;
  }

  return `${name} — no legacy summary or almanac context supplied in the current ReporterContext. Keep references generic.`;
}

function formatPlayerContext(plays: AtBatEvent[], context: ReporterContext): string[] {
  const names = new Set<string>();
  for (const play of plays) {
    names.add(play.batterName);
    names.add(play.pitcherName);
  }

  if (names.size === 0) {
    return ["No player appearances supplied for this segment."];
  }

  return Array.from(names).map((name) => getPlayerContextLine(name, context));
}

function describeResult(result: string): string {
  return RESULT_PHRASES[result] ?? humanizeEnum(result);
}

function formatModifierTags(modifiers?: string[]): string {
  if (!modifiers || modifiers.length === 0) {
    return "";
  }

  return modifiers
    .map((modifier) => MODIFIER_LABELS[modifier] ?? `[${humanizeEnum(modifier)}]`)
    .join(" ");
}

function formatExitTypePrefix(exitType?: string): string | null {
  if (!exitType) {
    return null;
  }

  return TRAJECTORY_LABELS[exitType] ?? null;
}

function formatExitTypeSuffix(exitType?: string): string | null {
  if (!exitType) {
    return null;
  }

  if (CONTACT_LABELS[exitType]) {
    return `contact ${CONTACT_LABELS[exitType]}`;
  }

  return null;
}

const FIELDING_POSITION_LABELS: Record<number, string> = {
  1: "P",
  2: "C",
  3: "1B",
  4: "2B",
  5: "3B",
  6: "SS",
  7: "LF",
  8: "CF",
  9: "RF",
};

function formatFieldingSequence(sequence?: number[]): string | null {
  if (!sequence || sequence.length === 0) {
    return null;
  }

  // Translate position numbers to readable labels so the LLM doesn't guess
  // (e.g. "1" → "P" makes it obvious the pitcher fielded; raw "1" is ambiguous).
  const labeled = sequence
    .map((n) => FIELDING_POSITION_LABELS[n] ?? String(n))
    .join("→");
  return `fielded by ${labeled}`;
}

function formatEventLine(event: AtBatEvent): string {
  const resultPhrase = describeResult(event.result);
  const prefix = formatExitTypePrefix(event.enrichment?.exitType);
  const zone = event.enrichment?.fieldLocation?.zone;
  const lineStart = `${event.batterName}: ${prefix ? `${prefix} ` : ""}${resultPhrase} vs ${event.pitcherName}${zone ? ` to ${zone}` : ""}`;
  const clauses = [
    typeof event.enrichment?.pitchesInAtBat === "number"
      ? `${event.enrichment.pitchesInAtBat}-pitch AB`
      : null,
    event.enrichment?.pitchType ? `last pitch ${event.enrichment.pitchType}` : null,
    formatExitTypeSuffix(event.enrichment?.exitType),
    event.enrichment?.fieldingPlayType
      ? FIELDING_PLAY_LABELS[event.enrichment.fieldingPlayType] ??
        humanizeEnum(event.enrichment.fieldingPlayType)
      : null,
    formatFieldingSequence(event.enrichment?.fieldingSequence),
    event.enrichment?.fieldingDifficulty
      ? `difficulty ${event.enrichment.fieldingDifficulty}`
      : null,
    typeof event.enrichment?.hrDistance === "number"
      ? `${event.enrichment.hrDistance}-foot HR`
      : null,
    Array.isArray(event.runsScored) && event.runsScored.length > 0
      ? `${event.runsScored.length} run${event.runsScored.length === 1 ? "" : "s"} scored`
      : !Array.isArray(event.runsScored) && event.runsScored > 0
        ? `${event.runsScored} run${event.runsScored === 1 ? "" : "s"} scored`
        : null,
    formatModifierTags(event.enrichment?.modifiers) || null,
  ].filter(Boolean);

  return clauses.length > 0 ? `${lineStart}; ${clauses.join("; ")}` : lineStart;
}

export function formatReporterIdentity(reporter: BeatReporter): string[] {
  return [
    `Name: ${reporter.name}`,
    `Assigned team: ${reporter.teamId}`,
    `Personality: ${humanizeEnum(reporter.personality)} — ${PERSONALITY_GUIDES[reporter.personality]}`,
    `Voice style: ${humanizeEnum(reporter.voiceStyle)} — ${VOICE_STYLE_GUIDES[reporter.voiceStyle]}`,
    `Era flavor: ${humanizeEnum(reporter.eraFlavor)} — ${ERA_GUIDES[reporter.eraFlavor]}`,
    `Silhouette variant: ${reporter.avatarEra}`,
  ];
}

export function formatMoodState(mood: MoodState): string[] {
  const moodLabel = resolveMood(mood);
  return [
    `Base mood: ${humanizeEnum(mood.baseMood)}`,
    `Current mood: ${humanizeEnum(mood.currentMood)} (resolved label: ${moodLabel})`,
    `Momentum: ${mood.moodMomentum >= 0 ? "+" : ""}${mood.moodMomentum}`,
    `Energy level: ${mood.energyModifier}`,
    `Drift active: ${mood.driftActive ? `yes, expires after ${mood.driftExpiresAfterAtBats} at-bats` : "no"}`,
  ];
}

export function formatGroundTruth(
  context: ReporterContext,
  reporterTeam: "home" | "away",
): string[] {
  const teams = resolveTeamPerspective(context);
  const side = getReporterSideContext(context, reporterTeam);
  const inningSide = context.gameState.halfInning === "TOP" ? "Top" : "Bottom";

  return [
    `Home team: ${teams.homeTeam.name}`,
    `Away team: ${teams.awayTeam.name}`,
    `Stadium: ${teams.homeTeam.ballparkNickname || teams.homeTeam.name}${teams.homeTeam.location ? ` in ${teams.homeTeam.location}` : ""}`,
    `Reporter team: ${resolveReporterTeamName(context, reporterTeam)} (${reporterTeam} booth)`,
    `Opponent team: ${side.opponentTeam.name}`,
    `Score: ${teams.awayTeam.name} ${context.gameState.awayScore}, ${teams.homeTeam.name} ${context.gameState.homeScore}`,
    `Frame: ${inningSide} of inning ${context.gameState.inning}, ${context.gameState.outs} outs, ${formatBaseState(context)}`,
  ];
}

function formatPostGameGroundTruth(
  context: ReporterContext,
  reporterTeam: "home" | "away",
  finalScore: { home: number; away: number },
): string[] {
  const teams = resolveTeamPerspective(context);
  const side = getReporterSideContext(context, reporterTeam);
  const isTie = finalScore.home === finalScore.away;
  const winner = finalScore.home > finalScore.away ? teams.homeTeam.name : teams.awayTeam.name;
  const loser = finalScore.home > finalScore.away ? teams.awayTeam.name : teams.homeTeam.name;

  return [
    `Home team: ${teams.homeTeam.name}`,
    `Away team: ${teams.awayTeam.name}`,
    `Stadium: ${teams.homeTeam.ballparkNickname || teams.homeTeam.name}${teams.homeTeam.location ? ` in ${teams.homeTeam.location}` : ""}`,
    `Reporter team: ${side.reporterTeamSnapshot.name} (${reporterTeam} booth)`,
    `Opponent team: ${side.opponentTeam.name}`,
    `Official final score: ${teams.awayTeam.name} ${finalScore.away}, ${teams.homeTeam.name} ${finalScore.home}`,
    isTie
      ? `Official result: the game ended tied, ${finalScore.away}-${finalScore.home}.`
      : `Official result: ${winner} beat ${loser}, ${Math.max(finalScore.home, finalScore.away)}-${Math.min(finalScore.home, finalScore.away)}.`,
  ];
}

/**
 * Explicit roster-to-team table. Prevents a known failure mode where a
 * losing-team reporter flipped pitcher attribution (called the opponent's
 * shutout ace "our guy who didn't get run support"). The model must not
 * have to infer team membership from `BatterName vs PitcherName` lines.
 */
export function formatRosterAttribution(
  events: AtBatEvent[],
  reporter: BeatReporter,
  context: ReporterContext,
  reporterTeam: "home" | "away",
): string[] {
  const reporterTeamKey = normalizeRosterKey(reporter.teamId);
  const side = getReporterSideContext(context, reporterTeam);
  const reporterTeamName = side.reporterTeamSnapshot.name;
  const opponentTeamName = side.opponentTeam.name;

  const pitchersByTeam = new Map<string, Set<string>>();
  const battersByTeam = new Map<string, Set<string>>();

  for (const event of events) {
    if (event.batterName && event.batterTeamId) {
      const key = normalizeRosterKey(event.batterTeamId);
      if (!battersByTeam.has(key)) battersByTeam.set(key, new Set());
      battersByTeam.get(key)!.add(event.batterName);
    }
    if (event.pitcherName && event.pitcherTeamId) {
      const key = normalizeRosterKey(event.pitcherTeamId);
      if (!pitchersByTeam.has(key)) pitchersByTeam.set(key, new Set());
      pitchersByTeam.get(key)!.add(event.pitcherName);
    }
  }

  const collectOther = (
    byTeam: Map<string, Set<string>>,
  ): string[] =>
    Array.from(byTeam.entries())
      .filter(([teamKey]) => teamKey !== reporterTeamKey)
      .flatMap(([, names]) => Array.from(names));

  const reporterPitchers = Array.from(pitchersByTeam.get(reporterTeamKey) ?? []);
  const reporterBatters = Array.from(battersByTeam.get(reporterTeamKey) ?? []);
  const opponentPitchers = collectOther(pitchersByTeam);
  const opponentBatters = collectOther(battersByTeam);

  return [
    `YOUR team — ${reporterTeamName} (the reporter's team, the club you cover):`,
    `  Pitchers who threw for ${reporterTeamName}: ${reporterPitchers.join(", ") || "none recorded"}`,
    `  Batters who hit for ${reporterTeamName}: ${reporterBatters.join(", ") || "none recorded"}`,
    `OPPONENT — ${opponentTeamName}:`,
    `  Pitchers who threw for ${opponentTeamName}: ${opponentPitchers.join(", ") || "none recorded"}`,
    `  Batters who hit for ${opponentTeamName}: ${opponentBatters.join(", ") || "none recorded"}`,
    `When you describe any pitcher's or batter's line, check this table first. Never credit "our guy" with work the opposing team's player actually did. Opposing pitchers shut out YOUR lineup; YOUR pitchers shut out the opponent's lineup. Do not flip them.`,
  ];
}

function normalizeRosterKey(teamId: string | null | undefined): string {
  return (teamId ?? "").trim().toLowerCase();
}

export function formatHardRules(): string[] {
  return [
    "Never invent facts, stats, player history, pitch details, weather, or quotes.",
    "If a detail is missing, say less and stay generic instead of filling the gap.",
    "Only mention players, teams, and places explicitly supplied in the prompt.",
    "Stay grounded in GROUND TRUTH, EVENTS, PLAYER CONTEXT, and DRAMATIC CONTEXT.",
    "Use active voice and concrete baseball language.",
    "Use past tense for completed plays and inning summaries; use present/future-facing language only for the pregame preamble.",
    "No markdown, no bullet lists, no headings, and no meta commentary in the final answer.",
    // --- Anti-hallucination specifics (added after live test revealed gaps) ---
    "NEVER invent a fielder or fielding location. If an event has no \"fielded by\" tag and no hit-location zone, describe the play without naming where the ball went or who caught it. Do NOT default to \"to center\" or similar — just say \"fielded\" or \"caught\" generically.",
    "NEVER recap events from prior innings. Your summary covers ONLY the current inning listed in the EVENTS section. Use NARRATIVE SO FAR for continuity (acknowledge momentum, reference the running arc) but do NOT restate plays you already covered in an earlier summary.",
    "Prefer sparse-but-accurate over rich-and-invented. A short, factual summary is always better than a long one that fills gaps with guesses.",
    "STRICT length: 3-5 sentences MAXIMUM. Do not exceed 5 sentences. If you run long, you WILL be truncated mid-thought and the user will see broken JSON — keep it tight.",
  ];
}

function formatPostGameHardRules(): string[] {
  return [
    "Never invent facts, stats, player history, pitch details, weather, or quotes.",
    "If a detail is missing, say less and stay generic instead of filling the gap.",
    "Only mention players, teams, and places explicitly supplied in the prompt.",
    "Stay grounded in POSTGAME GROUND TRUTH, ROSTER ATTRIBUTION, EVENTS, and PLAYER CONTEXT.",
    "Use active voice and concrete baseball language.",
    "Use past tense throughout the column.",
    "No markdown, no bullet lists, no headings, and no meta commentary in the final answer.",
    "Do not call the game a tie, deadlock, or draw unless the official final score is actually tied.",
    "Do not treat this like a single-inning recap. You may reference any inning or turning point listed in EVENTS.",
    "Write a complete newspaper column with a punchy headline and 3-4 paragraphs.",
  ];
}

export function formatEnrichedEvents(
  plays: AtBatEvent[],
  context: ReporterContext,
): string[] {
  void context;

  if (plays.length === 0) {
    return ["- No at-bat events supplied."];
  }

  return plays
    .slice()
    .sort((left, right) => left.eventIndex - right.eventIndex)
    .map((event) => `- ${formatEventLine(event)}`);
}

function formatSection(title: string, lines: string[]): string {
  return [title, ...lines].join("\n");
}

function buildCommonSections(
  reporter: BeatReporter,
  reporterTeam: "home" | "away",
  mood: MoodState,
  context: ReporterContext,
): string[] {
  return [
    formatSection("REPORTER IDENTITY", formatReporterIdentity(reporter)),
    formatSection("MOOD STATE", formatMoodState(mood)),
    formatSection("GROUND TRUTH", formatGroundTruth(context, reporterTeam)),
  ];
}

function buildDramaticContextSection(context: ReporterContext): string {
  return formatSection("DRAMATIC CONTEXT", [
    `Dramatic weight: ${context.dramaticWeight.toFixed(2)}`,
    ...formatRivalryLines(context),
    ...formatRelationshipLines(context),
  ]);
}

function buildNarrativeSection(narrativeSoFar: string, emptyLabel: string): string {
  return formatSection("NARRATIVE SO FAR", [narrativeSoFar || emptyLabel]);
}

function buildTeamStorylinesSection(
  context: ReporterContext,
  reporterTeam: "home" | "away",
): string {
  const side = getReporterSideContext(context, reporterTeam);

  return formatSection("TEAM DNA / STORYLINES", [
    `Reporter team legacy summary: ${side.reporterLegacySummary || "No team legacy summary supplied."}`,
    ...formatTeamDnaLines(context, reporterTeam),
    "Active storylines: none explicitly supplied in ReporterContext.",
    ...formatAlmanacEntries(
      side.recentAlmanac,
      "Recent team almanac: none supplied.",
      5,
    ),
  ]);
}

function buildStateOfPlaySection(context: ReporterContext): string {
  const teams = resolveTeamPerspective(context);
  return formatSection("STATE OF PLAY", [
    `Home-team legacy summary: ${teams.homeLegacySummary || "No home-team legacy summary supplied."}`,
    `Away-team legacy summary: ${teams.awayLegacySummary || "No away-team legacy summary supplied."}`,
    ...formatTeamDnaLines(context, "home"),
    ...formatAlmanacEntries(
      teams.homeRecentAlmanac,
      "Recent home-team almanac: none supplied.",
      5,
    ),
  ]);
}

function buildPlayerContextSection(plays: AtBatEvent[], context: ReporterContext): string {
  return formatSection("PLAYER CONTEXT", formatPlayerContext(plays, context));
}

function buildHistoricalFactSection(
  historicalFact: HistoricalFactRecord | null | undefined,
): string {
  if (!historicalFact) {
    return formatSection("HISTORICAL FACT", [
      "No verified historical fact supplied for this inning. historicalLeadIn must be an empty string.",
    ]);
  }

  return formatSection("HISTORICAL FACT", [
    "This fact is verified and may be framed, but not altered or expanded.",
    `Source: ${historicalFact.sourceLabel} — ${historicalFact.sourceUrl}`,
    `Fact ID: ${historicalFact.id}`,
    `Fact text: ${historicalFact.factText}`,
  ]);
}

function buildEventsSection(inning: number, plays: AtBatEvent[], context: ReporterContext): string {
  const topEvents = plays.filter((play) => play.halfInning === "TOP");
  const bottomEvents = plays.filter((play) => play.halfInning === "BOTTOM");

  return [
    `EVENTS — Inning ${inning} (chronological, enrichment surfaced)`,
    `Top of ${inning}:`,
    ...formatEnrichedEvents(topEvents, context),
    `Bottom of ${inning}:`,
    ...formatEnrichedEvents(bottomEvents, context),
  ].join("\n");
}

export function buildCommentarySystemPrompt(
  reporter: BeatReporter,
  mood: MoodState,
  narrativeSoFar: string,
  context: ReporterContext,
): string {
  return [
    ...buildCommonSections(reporter, "home", mood, context),
    buildDramaticContextSection(context),
    buildPlayerContextSection([], context),
    buildNarrativeSection(
      narrativeSoFar,
      "(no prior narrative — treat this like a fresh beat inside the game broadcast)",
    ),
    formatSection("HARD RULES", formatHardRules()),
    formatSection("TASK", [
      "Write 1-2 sentences of live commentary in YOUR voice.",
      "Stay grounded in the current play facts and the running narrative.",
      "Do not invent details that are not supplied.",
    ]),
  ].join("\n\n");
}

export function buildCommentaryUserMessage(
  play: NotabilityPlayContext,
  notability: NotabilityResult,
  boxScore?: Record<string, unknown>,
): string {
  const safeBoxScore = boxScore ? JSON.stringify(boxScore, null, 2) : "No box score snapshot supplied.";
  return [
    "CURRENT PLAY",
    `Frame: ${play.halfInning} ${play.inning}`,
    `Outs: ${play.outsBefore} before, ${play.outsAfter} after`,
    `Bases before: ${formatBases(play.basesBefore)}`,
    `Bases after: ${formatBases(play.basesAfter)}`,
    `Score before: away ${play.awayScoreBefore}, home ${play.homeScoreBefore}`,
    `Score after: away ${play.awayScoreAfter}, home ${play.homeScoreAfter}`,
    `Result: ${play.result}`,
    `Runs scored: ${play.runsScored ?? 0}`,
    `Notability reason: ${notability.reason}`,
    `Notability score: ${notability.score.toFixed(3)}`,
    "BOX SCORE SNAPSHOT",
    safeBoxScore,
  ].join("\n");
}

export function buildPreambleSystemPrompt(
  reporter: BeatReporter,
  reporterTeam: "home",
  mood: MoodState,
  context: ReporterContext,
): string {
  return [
    ...buildCommonSections(reporter, reporterTeam, mood, context),
    buildDramaticContextSection(context),
    buildStateOfPlaySection(context),
    buildNarrativeSection(
      "",
      "(no prior narrative — this is the top of the broadcast)",
    ),
    formatSection("HARD RULES", formatHardRules()),
    formatSection("TASK", [
      "Write a 4-6 sentence whole-game scene-setting preamble in YOUR voice.",
      "Cover where we are, what is at stake, the major storylines, and the leadoff matchup.",
      "Do NOT describe the first pitch or any specific at-bat outcome.",
      "End with a natural sign-off that signals readiness for first pitch.",
    ]),
  ].join("\n\n");
}

export function buildPreambleUserMessage(
  reporter: BeatReporter,
  reporterTeam: "home",
  context: ReporterContext,
): string {
  const teams = resolveTeamPerspective(context);
  return [
    "PREGAME SCENE",
    `Reporter: ${reporter.name}`,
    `Reporter team: ${resolveReporterTeamName(context, reporterTeam)}`,
    `Matchup: ${teams.awayTeam.name} at ${teams.homeTeam.name}`,
    `Ballpark: ${teams.homeTeam.ballparkNickname || teams.homeTeam.name}`,
    `Crowd vibe: ${teams.homeTeam.cityVibe || "not supplied"}`,
    `Leadoff matchup: ${context.batter.name} vs ${context.pitcher.name}`,
    `Home-team rivalry intensity: ${context.teamRivalryIntensity}/10`,
  ].join("\n");
}

export function buildBetweenInningSummarySystemPrompt(
  reporter: BeatReporter,
  reporterTeam: "home" | "away",
  mood: MoodState,
  context: ReporterContext,
  inning: number,
  previousNarrativeSoFar: string,
  inningEvents: AtBatEvent[],
  historicalFact?: HistoricalFactRecord | null,
): string {
  return [
    ...buildCommonSections(reporter, reporterTeam, mood, context),
    buildDramaticContextSection(context),
    buildTeamStorylinesSection(context, reporterTeam),
    buildPlayerContextSection(inningEvents, context),
    buildHistoricalFactSection(historicalFact),
    buildNarrativeSection(
      previousNarrativeSoFar,
      "(no prior narrative — this is the first inning summary)",
    ),
    formatSection("HARD RULES", formatHardRules()),
    formatSection("TASK", [
      `Summarize ONLY inning ${inning}. Do NOT describe or recap plays from earlier innings — the NARRATIVE SO FAR already covers those.`,
      `Your 'popup' field = 2-3 sentences covering the most interesting moments of inning ${inning} only, in YOUR voice.`,
      "Your 'narrative' field = 1-2 sentences MAX that updates the running game-long arc. Be terse. This replaces the prior narrative, so include the most important through-line but trim details that are now redundant.",
      "Your 'historicalLeadIn' field = one short sentence MAX that cleanly tees up the HISTORICAL FACT without repeating, altering, or adding to it. If no HISTORICAL FACT was supplied, return an empty string.",
      "Do not add any historical claim beyond the exact fact text supplied in the HISTORICAL FACT section.",
      "KEEP THE TOTAL OUTPUT SHORT. Long responses get truncated and produce broken JSON visible to the user.",
      'Return JSON only, no markdown fences, exact shape: { "popup": "<2-3 sentences>", "narrative": "<1-2 sentences>", "historicalLeadIn": "<0-1 sentence>" }',
    ]),
  ].join("\n\n");
}

export function buildBetweenInningSummaryUserMessage(
  inning: number,
  inningEvents: AtBatEvent[],
  previousNarrativeSoFar: string,
  historicalFact?: HistoricalFactRecord | null,
): string {
  const sortedEvents = inningEvents
    .slice()
    .sort((left, right) => left.eventIndex - right.eventIndex);
  const topEvents = sortedEvents.filter((event) => event.halfInning === "TOP");
  const bottomEvents = sortedEvents.filter((event) => event.halfInning === "BOTTOM");

  return [
    `INNING SUMMARY REQUEST — Inning ${inning}`,
    `Previous narrative cache: ${previousNarrativeSoFar || "None yet."}`,
    `Top of ${inning}:`,
    ...topEvents.map((event) => `- ${formatEventLine(event)}`),
    `Bottom of ${inning}:`,
    ...bottomEvents.map((event) => `- ${formatEventLine(event)}`),
    `Historical fact supplied: ${historicalFact ? historicalFact.factText : "None."}`,
  ].join("\n");
}

export function buildPostGameColumnSystemPrompt(
  reporter: BeatReporter,
  reporterTeam: "home" | "away",
  context: ReporterContext,
  finalScore: { home: number; away: number },
  allInningEvents: AtBatEvent[],
  narrativeSoFar: string,
): string {
  return [
    formatSection("REPORTER IDENTITY", formatReporterIdentity(reporter)),
    formatSection("MOOD STATE", formatMoodState({
      baseMood: reporter.personality,
      currentMood: reporter.currentMood,
      moodMomentum: reporter.moodMomentum,
      moodScore: 0,
      driftScore: 0,
      energyModifier: "normal",
      driftActive: false,
      driftExpiresAfterAtBats: 0,
    })),
    formatSection(
      "POSTGAME GROUND TRUTH",
      formatPostGameGroundTruth(context, reporterTeam, finalScore),
    ),
    formatSection(
      "ROSTER ATTRIBUTION (do NOT confuse these)",
      formatRosterAttribution(allInningEvents, reporter, context, reporterTeam),
    ),
    buildDramaticContextSection(context),
    buildTeamStorylinesSection(context, reporterTeam),
    buildPlayerContextSection(allInningEvents, context),
    formatSection("NARRATIVE SO FAR", [
      "Treat this as optional texture only. It may lag behind the final result.",
      narrativeSoFar || "(no prior narrative supplied — build the column from the final game facts alone)",
    ]),
    formatSection("HARD RULES", [
      ...formatPostGameHardRules(),
      "For post-game columns, POSTGAME GROUND TRUTH and EVENTS override NARRATIVE SO FAR.",
      "If the official final score is not tied, NEVER call the game a tie, deadlock, or draw.",
    ]),
    formatSection("TASK", [
      `Final score: away ${finalScore.away}, home ${finalScore.home}.`,
      "Write a full newspaper column in YOUR voice about this complete game.",
      "Structure: 1-sentence headline (capitalized, punchy), then 3-4 paragraphs.",
      "Before naming any pitcher or batter, verify which team they played for using ROSTER ATTRIBUTION.",
      "Weave in key plays, your team's performance, the matchups that mattered, the narrative arc, and a closing line.",
      'Return JSON only: { "headline": "<headline>", "body": "<3-4 paragraph column>" }',
    ]),
  ].join("\n\n");
}

export function buildPostGameColumnUserMessage(
  reporter: BeatReporter,
  reporterTeam: "home" | "away",
  context: ReporterContext,
  finalScore: { home: number; away: number },
  allInningEvents: AtBatEvent[],
  narrativeSoFar: string,
): string {
  const innings = Array.from(
    new Set(allInningEvents.map((event) => event.inning)),
  ).sort((left, right) => left - right);
  const teams = resolveTeamPerspective(context);
  const isTie = finalScore.home === finalScore.away;
  const officialResult = isTie
    ? `Official result: tie game, ${finalScore.away}-${finalScore.home}.`
    : `Official result: ${finalScore.home > finalScore.away ? teams.homeTeam.name : teams.awayTeam.name} won ${Math.max(finalScore.home, finalScore.away)}-${Math.min(finalScore.home, finalScore.away)}.`;
  return [
    "POSTGAME COLUMN REQUEST",
    `Reporter: ${reporter.name}`,
    `Reporter side: ${reporterTeam}`,
    `Final score: away ${finalScore.away}, home ${finalScore.home}`,
    officialResult,
    `Current cached narrative: ${narrativeSoFar || "None supplied."}`,
    ...innings.map((inning) =>
      buildEventsSection(
        inning,
        allInningEvents.filter((event) => event.inning === inning),
        context,
      ),
    ),
  ].join("\n\n");
}

function formatBases(bases: NotabilityPlayContext["basesBefore"]): string {
  const occupied = [
    bases.first ? "1st" : null,
    bases.second ? "2nd" : null,
    bases.third ? "3rd" : null,
  ].filter(Boolean);

  return occupied.length > 0 ? occupied.join(", ") : "bases empty";
}
