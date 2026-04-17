import { resolveMood, type MoodState } from "../../../../engines/moodEngine";
import type {
  NotabilityPlayContext,
  NotabilityResult,
} from "../../../../engines/notabilityScorer";
import {
  FAME_TIER_LABEL,
  type BeatReporter,
  type EraFlavor,
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

function formatFieldingSequence(sequence?: number[]): string | null {
  if (!sequence || sequence.length === 0) {
    return null;
  }

  return sequence.join("-");
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

export function formatHardRules(): string[] {
  return [
    "Never invent facts, stats, player history, pitch details, weather, or quotes.",
    "If a detail is missing, say less and stay generic instead of filling the gap.",
    "Only mention players, teams, and places explicitly supplied in the prompt.",
    "Stay grounded in GROUND TRUTH, EVENTS, PLAYER CONTEXT, and DRAMATIC CONTEXT.",
    "Use active voice and concrete baseball language.",
    "Use past tense for completed plays and inning summaries; use present/future-facing language only for the pregame preamble.",
    "No markdown, no bullet lists, no headings, and no meta commentary in the final answer.",
    "Prefer 3-5 sentences unless the TASK section explicitly asks for a different length.",
  ];
}

export function formatEnrichedEvents(
  plays: AtBatEvent[],
  _context: ReporterContext,
): string[] {
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
): string {
  return [
    ...buildCommonSections(reporter, reporterTeam, mood, context),
    buildDramaticContextSection(context),
    buildTeamStorylinesSection(context, reporterTeam),
    buildPlayerContextSection(inningEvents, context),
    buildNarrativeSection(
      previousNarrativeSoFar,
      "(no prior narrative — this is the first inning summary)",
    ),
    formatSection("HARD RULES", formatHardRules()),
    formatSection("TASK", [
      `Write a 3-5 sentence summary of inning ${inning} in YOUR voice.`,
      "Stay grounded in EVENTS, DRAMATIC CONTEXT, and PLAYER CONTEXT.",
      "Continue the arc from NARRATIVE SO FAR.",
      'Return JSON only (no markdown fences): { "popup": "<2-3 sentences for the in-game popup>", "narrative": "<updated running narrative for the whole game; 2-3 sentences; REPLACES previous narrative>" }',
    ]),
  ].join("\n\n");
}

export function buildBetweenInningSummaryUserMessage(
  inning: number,
  inningEvents: AtBatEvent[],
  previousNarrativeSoFar: string,
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
    ...buildCommonSections(reporter, reporterTeam, {
      baseMood: reporter.personality,
      currentMood: reporter.currentMood,
      moodMomentum: reporter.moodMomentum,
      moodScore: 0,
      driftScore: 0,
      energyModifier: "normal",
      driftActive: false,
      driftExpiresAfterAtBats: 0,
    }, context),
    buildDramaticContextSection(context),
    buildTeamStorylinesSection(context, reporterTeam),
    buildPlayerContextSection(allInningEvents, context),
    buildNarrativeSection(
      narrativeSoFar,
      "(no prior narrative supplied — build the column from the final game facts alone)",
    ),
    formatSection("HARD RULES", formatHardRules()),
    formatSection("TASK", [
      `Final score: away ${finalScore.away}, home ${finalScore.home}.`,
      "Write a full newspaper column in YOUR voice about this complete game.",
      "Structure: 1-sentence headline (capitalized, punchy), then 3-4 paragraphs.",
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
  return [
    "POSTGAME COLUMN REQUEST",
    `Reporter: ${reporter.name}`,
    `Reporter side: ${reporterTeam}`,
    `Final score: away ${finalScore.away}, home ${finalScore.home}`,
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
