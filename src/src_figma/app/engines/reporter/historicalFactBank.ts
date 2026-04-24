import type {
  HistoricalFactRecord,
  HistoricalTidbit,
} from "../../../../types/reporter";
import type { AtBatEvent } from "../../../../utils/eventLog";
import type { ReporterContext, TeamSnapshot } from "./reporterContext";

export interface HistoricalFactSelectionInput {
  inning: number;
  inningEvents: AtBatEvent[];
  context: ReporterContext;
  usedFactIds?: string[];
  previousFamilyKey?: string | null;
  previousSourceLabel?: string | null;
}

export interface SelectedHistoricalFact {
  fact: HistoricalFactRecord;
  tidbit: HistoricalTidbit;
  familyKey: string;
}

const VERIFIED_ON = "2026-04-23";

export const HISTORICAL_FACT_BANK: HistoricalFactRecord[] = [
  {
    id: "mlb-josh-gibson-records",
    factText:
      "When Negro League statistics were added to MLB's official record in 2024, Josh Gibson became the career leader in batting average, slugging percentage, and OPS.",
    sourceLabel: "MLB",
    sourceUrl:
      "https://www.mlb.com/press-release/press-release-statistics-of-the-negro-leagues-officially-enter-the-major-league-record",
    sourceType: "mlb",
    subjectType: "player",
    subjectIds: ["josh-gibson"],
    teamTags: ["homestead-grays", "pittsburgh-crawfords"],
    playerTags: ["josh-gibson"],
    themeTags: ["batting", "power", "record_book", "negro_leagues", "history"],
    eraTags: ["1920s", "1930s", "1940s"],
    verifiedAt: VERIFIED_ON,
    priority: 10,
    active: true,
  },
  {
    id: "mlb-negro-leagues-records-still-growing",
    factText:
      "MLB said in 2024 that researchers estimate the official Negro League record from 1920 to 1948 is about 75% complete, so more verified stats can still surface.",
    sourceLabel: "MLB",
    sourceUrl:
      "https://www.mlb.com/news/stats-leaderboard-changes-negro-leagues-mlb",
    sourceType: "mlb",
    subjectType: "general",
    subjectIds: ["negro-leagues"],
    teamTags: [],
    playerTags: [],
    themeTags: ["record_book", "research", "history", "negro_leagues"],
    eraTags: ["1920s", "1930s", "1940s"],
    verifiedAt: VERIFIED_ON,
    priority: 8,
    active: true,
  },
  {
    id: "mlb-pete-dowling-no-hitter",
    factText:
      "Retrospective research eventually credited Pete Dowling with a no-hitter 119 years after he pitched it.",
    sourceLabel: "MLB",
    sourceUrl:
      "https://www.mlb.com/news/baseball-record-books-changing-negro-leagues",
    sourceType: "mlb",
    subjectType: "player",
    subjectIds: ["pete-dowling"],
    teamTags: [],
    playerTags: ["pete-dowling"],
    themeTags: ["pitching", "no_hitter", "record_book", "research", "history"],
    eraTags: ["1900s"],
    verifiedAt: VERIFIED_ON,
    priority: 9,
    active: true,
  },
  {
    id: "mlb-mathewson-alexander-wins",
    factText:
      "After decades of record-book revisions, Christy Mathewson and Grover Cleveland Alexander are officially tied at 373 career wins.",
    sourceLabel: "MLB",
    sourceUrl:
      "https://www.mlb.com/news/baseball-record-books-changing-negro-leagues",
    sourceType: "mlb",
    subjectType: "general",
    subjectIds: ["christy-mathewson", "grover-cleveland-alexander"],
    teamTags: [],
    playerTags: ["christy-mathewson", "grover-cleveland-alexander"],
    themeTags: ["pitching", "wins", "record_book", "history"],
    eraTags: ["1900s", "1910s", "1920s"],
    verifiedAt: VERIFIED_ON,
    priority: 8,
    active: true,
  },
  {
    id: "mlb-lou-gehrig-rbi-total",
    factText:
      "Lou Gehrig's official RBI total settled at 1,995 after researchers spent years resolving old scoring discrepancies.",
    sourceLabel: "MLB",
    sourceUrl:
      "https://www.mlb.com/news/baseball-record-books-changing-negro-leagues",
    sourceType: "mlb",
    subjectType: "player",
    subjectIds: ["lou-gehrig"],
    teamTags: ["yankees", "new-york-yankees"],
    playerTags: ["lou-gehrig"],
    themeTags: ["batting", "rbi", "record_book", "history"],
    eraTags: ["1920s", "1930s"],
    verifiedAt: VERIFIED_ON,
    priority: 7,
    active: true,
  },
  {
    id: "mlb-cap-anson-hits-total",
    factText:
      "Cap Anson's career hits total has appeared as seven different numbers in old encyclopedias, but MLB's official total is 3,011.",
    sourceLabel: "MLB",
    sourceUrl:
      "https://www.mlb.com/news/baseball-record-books-changing-negro-leagues",
    sourceType: "mlb",
    subjectType: "player",
    subjectIds: ["cap-anson"],
    teamTags: [],
    playerTags: ["cap-anson"],
    themeTags: ["batting", "hits", "record_book", "history"],
    eraTags: ["1800s"],
    verifiedAt: VERIFIED_ON,
    priority: 7,
    active: true,
  },
  {
    id: "sabr-luis-castro-first-latino-modern-era",
    factText:
      "Luis Castro was the first Colombian in the majors, the first Latino-born player of the modern era, and the first to wear an American or National League uniform in 1902.",
    sourceLabel: "SABR",
    sourceUrl: "https://sabr.org/bioproj/person/f212f545",
    sourceType: "sabr",
    subjectType: "player",
    subjectIds: ["luis-castro"],
    teamTags: ["athletics", "philadelphia-athletics"],
    playerTags: ["luis-castro"],
    themeTags: ["history", "integration", "firsts", "batting"],
    eraTags: ["1900s"],
    verifiedAt: VERIFIED_ON,
    priority: 9,
    active: true,
  },
  {
    id: "sabr-jackie-robinson-stole-home",
    factText:
      "Jackie Robinson stole home 19 times in his career, tied for the most in the post-World War II era, and he also stole home in the 1955 World Series.",
    sourceLabel: "SABR",
    sourceUrl: "https://sabr.org/bioproj/person/Jackie-Robinson/",
    sourceType: "sabr",
    subjectType: "player",
    subjectIds: ["jackie-robinson"],
    teamTags: ["dodgers", "brooklyn-dodgers"],
    playerTags: ["jackie-robinson"],
    themeTags: ["speed", "stolen_base", "history", "firsts"],
    eraTags: ["1940s", "1950s"],
    verifiedAt: VERIFIED_ON,
    priority: 10,
    active: true,
  },
  {
    id: "mlb-johnny-vander-meer-back-to-back-no-hitters",
    factText:
      "Johnny Vander Meer's back-to-back no-hitters in June 1938 still stand as the only consecutive no-hitters in Major League history.",
    sourceLabel: "MLB",
    sourceUrl:
      "https://www.mlb.com/news/75th-anniversary-of-vander-meers-back-to-back-no-hitters/c-50314542",
    sourceType: "mlb",
    subjectType: "player",
    subjectIds: ["johnny-vander-meer"],
    teamTags: ["reds", "cincinnati-reds"],
    playerTags: ["johnny-vander-meer"],
    themeTags: ["pitching", "no_hitter", "history", "record_book"],
    eraTags: ["1930s"],
    verifiedAt: VERIFIED_ON,
    priority: 10,
    active: true,
  },
  {
    id: "mlb-rickey-henderson-steals",
    factText:
      "Rickey Henderson finished with 1,406 career stolen bases and set the single-season record with 130 in 1982.",
    sourceLabel: "MLB",
    sourceUrl:
      "https://www.mlb.com/news/remembering-mlb-stolen-base-king-rickey-henderson",
    sourceType: "mlb",
    subjectType: "player",
    subjectIds: ["rickey-henderson"],
    teamTags: ["athletics", "oakland-athletics", "as", "a's"],
    playerTags: ["rickey-henderson"],
    themeTags: ["speed", "stolen_base", "record_book", "history"],
    eraTags: ["1970s", "1980s", "1990s"],
    verifiedAt: VERIFIED_ON,
    priority: 10,
    active: true,
  },
  {
    id: "mlb-hank-aaron-755",
    factText:
      "Hank Aaron hit 755 home runs, broke Babe Ruth's record with number 715 on April 8, 1974, and remains MLB's all-time leader in RBI and total bases.",
    sourceLabel: "MLB",
    sourceUrl:
      "https://www.mlb.com/press-release/press-release-brewers-mourn-the-passing-of-hall-of-famer-hank-aaron",
    sourceType: "mlb",
    subjectType: "player",
    subjectIds: ["hank-aaron"],
    teamTags: ["braves", "atlanta-braves", "milwaukee-braves", "brewers", "milwaukee-brewers"],
    playerTags: ["hank-aaron", "henry-aaron"],
    themeTags: ["power", "home_run", "batting", "record_book", "history"],
    eraTags: ["1950s", "1960s", "1970s"],
    verifiedAt: VERIFIED_ON,
    priority: 10,
    active: true,
  },
  {
    id: "hof-giamatti-research-center",
    factText:
      "The Hall of Fame's research center, founded with the museum in 1939, now preserves more than three million documents and over 250,000 photographs.",
    sourceLabel: "HOF",
    sourceUrl: "https://baseballhall.org/the-museum/library-research",
    sourceType: "hof",
    subjectType: "general",
    subjectIds: ["hall-of-fame-library"],
    teamTags: [],
    playerTags: [],
    themeTags: ["history", "research", "archives", "hall_of_fame"],
    eraTags: ["1930s", "modern"],
    verifiedAt: VERIFIED_ON,
    priority: 5,
    active: true,
  },
  {
    id: "retrosheet-event-file-archive",
    factText:
      "Retrosheet's play-by-play archive includes regular-season event files from 1910 forward and also publishes Negro League game files in the same historical system.",
    sourceLabel: "Retrosheet",
    sourceUrl: "https://www.retrosheet.org/game.htm",
    sourceType: "retrosheet",
    subjectType: "general",
    subjectIds: ["retrosheet-event-files"],
    teamTags: [],
    playerTags: [],
    themeTags: ["history", "research", "archives", "negro_leagues", "record_book"],
    eraTags: ["1910s", "modern"],
    verifiedAt: VERIFIED_ON,
    priority: 4,
    active: true,
  },
];

const STRIKEOUT_RESULTS = new Set(["K", "Kc", "PB_K", "WP_K"]);
const EXTRA_BASE_RESULTS = new Set(["2B", "3B", "GRD"]);
const POWER_RESULTS = new Set(["HR", "ITPHR", "2B", "3B", "GRD"]);

function normalizeTag(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || null;
}

function createTagSet(values: Array<string | null | undefined>): Set<string> {
  return new Set(
    values
      .map((value) => normalizeTag(value))
      .filter((value): value is string => Boolean(value)),
  );
}

function collectTeamTags(team: TeamSnapshot): Set<string> {
  return createTagSet([
    team.id,
    team.name,
    team.abbreviation,
    team.nickname,
    team.location,
    team.location && team.nickname ? `${team.location}-${team.nickname}` : null,
  ]);
}

function collectPlayerTags(context: ReporterContext): Set<string> {
  return createTagSet([
    context.batter.id,
    context.batter.name,
    ...context.batter.nicknames,
    context.pitcher.id,
    context.pitcher.name,
    ...context.pitcher.nicknames,
  ]);
}

function deriveThemeTags(inningEvents: AtBatEvent[], context: ReporterContext): Set<string> {
  const themes = new Set<string>();

  for (const event of inningEvents) {
    if (STRIKEOUT_RESULTS.has(event.result)) {
      themes.add("strikeout");
      themes.add("pitching");
    }

    if (EXTRA_BASE_RESULTS.has(event.result)) {
      themes.add("extra_base_hit");
      themes.add("batting");
    }

    if (POWER_RESULTS.has(event.result)) {
      themes.add("power");
      themes.add("batting");
    }

    if (event.result === "HR" || event.result === "ITPHR") {
      themes.add("home_run");
    }

    if (event.result === "BB" || event.result === "IBB" || event.result === "HBP") {
      themes.add("patience");
      themes.add("batting");
    }

    if (event.result === "DP") {
      themes.add("double_play");
      themes.add("defense");
    }

    if (event.result === "TP") {
      themes.add("triple_play");
      themes.add("defense");
    }

    if (event.result === "SF" || event.result === "SAC") {
      themes.add("small_ball");
      themes.add("batting");
    }

    if ((Array.isArray(event.runsScored) ? event.runsScored.length : event.runsScored) > 0) {
      themes.add("clutch");
      themes.add("batting");
    }
  }

  const scoreDiff = Math.abs(context.gameState.homeScore - context.gameState.awayScore);
  if (scoreDiff <= 1) {
    themes.add("close_game");
  }

  if (context.gameState.inning >= 7) {
    themes.add("late_inning");
  }

  return themes;
}

function buildFamilyKey(fact: HistoricalFactRecord): string {
  const familySeed =
    fact.playerTags[0] ??
    fact.teamTags[0] ??
    fact.themeTags[0] ??
    fact.subjectIds[0] ??
    fact.id;

  return `${fact.sourceType}:${normalizeTag(familySeed) ?? fact.id}`;
}

function countMatches(candidateTags: string[], targetTags: Set<string>): number {
  return candidateTags.reduce((count, tag) => {
    const normalized = normalizeTag(tag);
    return normalized && targetTags.has(normalized) ? count + 1 : count;
  }, 0);
}

function choosePreferredCandidate(
  candidates: Array<{ fact: HistoricalFactRecord; score: number; familyKey: string }>,
  input: HistoricalFactSelectionInput,
): SelectedHistoricalFact | null {
  if (candidates.length === 0) {
    return null;
  }

  const previousFamilyKey = input.previousFamilyKey ?? null;
  const previousSourceLabel = normalizeTag(input.previousSourceLabel) ?? null;

  const preferred =
    candidates.find((candidate) => {
      const sourceLabel = normalizeTag(candidate.fact.sourceLabel);
      return (
        candidate.familyKey !== previousFamilyKey &&
        sourceLabel !== previousSourceLabel
      );
    }) ??
    candidates.find((candidate) => candidate.familyKey !== previousFamilyKey) ??
    candidates.find(
      (candidate) =>
        normalizeTag(candidate.fact.sourceLabel) !== previousSourceLabel,
    ) ??
    candidates[0];

  return {
    fact: preferred.fact,
    tidbit: {
      factId: preferred.fact.id,
      text: preferred.fact.factText,
      sourceLabel: preferred.fact.sourceLabel,
      sourceUrl: preferred.fact.sourceUrl,
    },
    familyKey: preferred.familyKey,
  };
}

export function selectHistoricalFact(
  input: HistoricalFactSelectionInput,
  facts: HistoricalFactRecord[] = HISTORICAL_FACT_BANK,
): SelectedHistoricalFact | null {
  const usedFactIds = new Set(input.usedFactIds ?? []);
  const teamTags = new Set<string>([
    ...collectTeamTags(input.context.battingTeam),
    ...collectTeamTags(input.context.pitchingTeam),
  ]);
  const playerTags = collectPlayerTags(input.context);
  const themeTags = deriveThemeTags(input.inningEvents, input.context);

  const contextualCandidates: Array<{
    fact: HistoricalFactRecord;
    score: number;
    familyKey: string;
  }> = [];
  const generalCandidates: Array<{
    fact: HistoricalFactRecord;
    score: number;
    familyKey: string;
  }> = [];

  for (const fact of facts) {
    if (!fact.active || usedFactIds.has(fact.id)) {
      continue;
    }

    const playerMatches = countMatches(fact.playerTags, playerTags);
    const teamMatches = countMatches(fact.teamTags, teamTags);
    const themeMatches = countMatches(fact.themeTags, themeTags);
    const familyKey = buildFamilyKey(fact);

    if (playerMatches === 0 && teamMatches === 0 && themeMatches === 0) {
      if (fact.subjectType === "general") {
        generalCandidates.push({
          fact,
          score: fact.priority,
          familyKey,
        });
      }
      continue;
    }

    contextualCandidates.push({
      fact,
      score:
        fact.priority +
        playerMatches * 120 +
        teamMatches * 80 +
        themeMatches * 25,
      familyKey,
    });
  }

  contextualCandidates.sort((left, right) => right.score - left.score);
  generalCandidates.sort((left, right) => right.score - left.score);

  return (
    choosePreferredCandidate(contextualCandidates, input) ??
    choosePreferredCandidate(generalCandidates, input)
  );
}
