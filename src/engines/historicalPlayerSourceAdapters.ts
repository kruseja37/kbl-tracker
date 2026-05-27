import type {
  HistoricalCareerTotals,
  HistoricalMetricSnapshot,
  HistoricalPercentileSignals,
  HistoricalPitchArchetype,
  HistoricalPitcherRole,
  HistoricalPlayerKind,
  HistoricalPlayerSourceRecord,
  HistoricalSeasonRecord,
  HistoricalSourceProvenance,
} from "./historicalPlayerConverter";

export interface ManualHistoricalSourceInput extends Omit<HistoricalPlayerSourceRecord, "sourceId" | "sourceName"> {
  sourceId?: string;
  sourceName?: string;
}

export interface LahmanCsvBundle {
  people: string;
  batting: string;
  pitching: string;
  fielding: string;
  appearances?: string;
  sourceVersion?: string;
  sourceUrl?: string;
}

interface LahmanPersonRow {
  playerID: string;
  nameFirst?: string;
  nameLast?: string;
  nameGiven?: string;
  birthYear?: string;
  bats?: string;
  throws?: string;
}

interface LahmanBattingRow {
  playerID: string;
  yearID: string;
  teamID?: string;
  lgID?: string;
  G?: string;
  PA?: string;
  AB?: string;
  R?: string;
  H?: string;
  "2B"?: string;
  "3B"?: string;
  HR?: string;
  RBI?: string;
  SB?: string;
  CS?: string;
  BB?: string;
  SO?: string;
  HBP?: string;
  SH?: string;
  SF?: string;
}

interface LahmanPitchingRow {
  playerID: string;
  yearID: string;
  teamID?: string;
  lgID?: string;
  W?: string;
  L?: string;
  G?: string;
  GS?: string;
  GF?: string;
  CG?: string;
  SHO?: string;
  SV?: string;
  IPouts?: string;
  H?: string;
  ER?: string;
  HR?: string;
  BB?: string;
  SO?: string;
  ERA?: string;
}

interface LahmanFieldingRow {
  playerID: string;
  yearID: string;
  teamID?: string;
  lgID?: string;
  POS?: string;
  G?: string;
  GS?: string;
  InnOuts?: string;
  PO?: string;
  A?: string;
  E?: string;
  DP?: string;
}

interface LahmanPlayerStats {
  playerID: string;
  playerName: string;
  birthYear?: number;
  bats?: "R" | "L" | "S";
  throws?: "R" | "L";
  batting: LahmanBattingRow[];
  pitching: LahmanPitchingRow[];
  fielding: LahmanFieldingRow[];
}

interface LahmanRateSummary {
  playerID: string;
  batting?: {
    seasons: number;
    games: number;
    plateAppearances: number;
    isolatedPower: number;
    contactRate: number;
    walkRate: number;
    speedScore: number;
    battingValue: number;
  };
  pitching?: {
    seasons: number;
    games: number;
    gamesStarted: number;
    gamesFinished: number;
    saves: number;
    inningsPitched: number;
    era: number;
    strikeoutRate: number;
    walkAvoidance: number;
    homeRunAvoidance: number;
    workloadScore: number;
    pitchingValue: number;
  };
  fielding?: {
    positions: string[];
    primaryPositions: string[];
    games: number;
    fieldingRate: number;
    assistRate: number;
    versatility: number;
  };
}

export interface LahmanAdapterOptions {
  minPlateAppearances?: number;
  minInningsPitched?: number;
  sourceVersion?: string;
  sourceUrl?: string;
}

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        cell += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows;
  return dataRows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  );
}

function toNumber(value: string | number | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function toOptionalNumber(value: string | number | undefined): number | undefined {
  const parsed = toNumber(value);
  return String(value ?? "").trim() === "" ? undefined : parsed;
}

function divide(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function clampPercentile(value: number): number {
  return Math.max(1, Math.min(99, Math.round(value)));
}

function percentileRank(value: number, population: number[], lowerIsBetter = false): number {
  const values = population.filter((item) => Number.isFinite(item)).sort((a, b) => a - b);
  if (values.length <= 1) return 50;

  let below = 0;
  let equal = 0;
  for (const item of values) {
    if (item < value) below += 1;
    if (item === value) equal += 1;
  }

  const percentile = ((below + 0.5 * equal) / values.length) * 100;
  return clampPercentile(lowerIsBetter ? 100 - percentile : percentile);
}

function groupByPlayer<T extends { playerID: string }>(rows: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const existing = grouped.get(row.playerID) ?? [];
    existing.push(row);
    grouped.set(row.playerID, existing);
  }
  return grouped;
}

function nonEmpty<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

function sumRows<T>(rows: T[], accessor: (row: T) => string | number | undefined): number {
  return rows.reduce((sum, row) => sum + toNumber(accessor(row)), 0);
}

function seasonCount(rows: Array<{ yearID: string }>): number {
  return new Set(rows.map((row) => row.yearID).filter(Boolean)).size;
}

function lahmanPlayerName(person: LahmanPersonRow): string {
  const name = [person.nameFirst, person.nameLast].filter(Boolean).join(" ").trim();
  return name || person.nameGiven || person.playerID;
}

function normalizeHandedness(value: string | undefined, allowSwitch = false): "R" | "L" | "S" | undefined {
  const cleaned = String(value ?? "").trim().toUpperCase();
  if (cleaned === "R" || cleaned === "L") return cleaned;
  if (allowSwitch && cleaned === "S") return "S";
  return undefined;
}

function normalizeThrowingHand(value: string | undefined): "R" | "L" | undefined {
  const handedness = normalizeHandedness(value);
  return handedness === "R" || handedness === "L" ? handedness : undefined;
}

function normalizePosition(position: string): string {
  const cleaned = position.trim().toUpperCase();
  if (cleaned === "OF") return "CF";
  if (cleaned === "P") return "SP";
  return cleaned;
}

function positionDifficulty(position: string): number {
  switch (position) {
    case "C":
      return 84;
    case "SS":
      return 80;
    case "CF":
      return 72;
    case "2B":
    case "3B":
      return 64;
    case "RF":
      return 56;
    case "LF":
      return 48;
    case "1B":
      return 40;
    default:
      return 50;
  }
}

function inferPrimaryPositions(fieldingRows: LahmanFieldingRow[], pitchingRows: LahmanPitchingRow[]): string[] {
  const gamesByPosition = new Map<string, number>();
  for (const row of fieldingRows) {
    const position = normalizePosition(String(row.POS ?? ""));
    if (!position) continue;
    gamesByPosition.set(position, (gamesByPosition.get(position) ?? 0) + toNumber(row.G));
  }

  if (pitchingRows.length > 0) {
    gamesByPosition.set("SP", (gamesByPosition.get("SP") ?? 0) + sumRows(pitchingRows, (row) => row.GS));
    gamesByPosition.set("RP", (gamesByPosition.get("RP") ?? 0) + Math.max(0, sumRows(pitchingRows, (row) => row.G) - sumRows(pitchingRows, (row) => row.GS)));
  }

  return Array.from(gamesByPosition.entries())
    .filter(([, games]) => games > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([position]) => position)
    .slice(0, 4);
}

function summarizeBatting(playerID: string, rows: LahmanBattingRow[]): LahmanRateSummary["batting"] {
  if (rows.length === 0) return undefined;

  const ab = sumRows(rows, (row) => row.AB);
  const hits = sumRows(rows, (row) => row.H);
  const doubles = sumRows(rows, (row) => row["2B"]);
  const triples = sumRows(rows, (row) => row["3B"]);
  const homeRuns = sumRows(rows, (row) => row.HR);
  const walks = sumRows(rows, (row) => row.BB);
  const strikeouts = sumRows(rows, (row) => row.SO);
  const hbp = sumRows(rows, (row) => row.HBP);
  const sacrifices = sumRows(rows, (row) => row.SH) + sumRows(rows, (row) => row.SF);
  const stolenBases = sumRows(rows, (row) => row.SB);
  const caughtStealing = sumRows(rows, (row) => row.CS);
  const plateAppearances = sumRows(rows, (row) => row.PA) || ab + walks + hbp + sacrifices;
  const totalBases = hits + doubles + 2 * triples + 3 * homeRuns;
  const extraBaseHits = doubles + triples + homeRuns;

  return {
    seasons: seasonCount(rows),
    games: sumRows(rows, (row) => row.G),
    plateAppearances,
    isolatedPower: divide(totalBases - hits, ab),
    contactRate: 1 - divide(strikeouts, plateAppearances),
    walkRate: divide(walks, plateAppearances),
    speedScore: 0.65 * divide(stolenBases, plateAppearances) + 0.35 * divide(triples, Math.max(1, hits)) - 0.2 * divide(caughtStealing, Math.max(1, stolenBases + caughtStealing)),
    battingValue: divide(totalBases + walks + hbp + stolenBases - caughtStealing, plateAppearances),
  };
}

function summarizePitching(rows: LahmanPitchingRow[]): LahmanRateSummary["pitching"] {
  if (rows.length === 0) return undefined;

  const ipOuts = sumRows(rows, (row) => row.IPouts);
  const inningsPitched = ipOuts / 3;
  const games = sumRows(rows, (row) => row.G);
  const gamesStarted = sumRows(rows, (row) => row.GS);
  const walks = sumRows(rows, (row) => row.BB);
  const strikeouts = sumRows(rows, (row) => row.SO);
  const homeRuns = sumRows(rows, (row) => row.HR);
  const earnedRuns = sumRows(rows, (row) => row.ER);
  const saves = sumRows(rows, (row) => row.SV);

  return {
    seasons: seasonCount(rows),
    games,
    gamesStarted,
    gamesFinished: sumRows(rows, (row) => row.GF),
    saves,
    inningsPitched,
    era: inningsPitched > 0 ? (earnedRuns * 9) / inningsPitched : 99,
    strikeoutRate: divide(strikeouts, inningsPitched),
    walkAvoidance: -divide(walks, inningsPitched),
    homeRunAvoidance: -divide(homeRuns, inningsPitched),
    workloadScore: inningsPitched + gamesStarted * 4,
    pitchingValue: inningsPitched > 0 ? -(earnedRuns * 9) / inningsPitched + divide(strikeouts, inningsPitched) - 0.45 * divide(walks, inningsPitched) : 0,
  };
}

function summarizeFielding(rows: LahmanFieldingRow[]): LahmanRateSummary["fielding"] {
  if (rows.length === 0) return undefined;

  const primaryPositions = inferPrimaryPositions(rows, []);
  const putouts = sumRows(rows, (row) => row.PO);
  const assists = sumRows(rows, (row) => row.A);
  const errors = sumRows(rows, (row) => row.E);
  const games = sumRows(rows, (row) => row.G);
  const primaryDifficulty = primaryPositions.length > 0 ? Math.max(...primaryPositions.map(positionDifficulty)) : 50;

  return {
    positions: Array.from(new Set(rows.map((row) => normalizePosition(String(row.POS ?? ""))).filter(Boolean))),
    primaryPositions,
    games,
    fieldingRate: primaryDifficulty + 15 * divide(putouts + assists, Math.max(1, putouts + assists + errors)) - 8 * divide(errors, Math.max(1, games)),
    assistRate: divide(assists, Math.max(1, games)),
    versatility: primaryPositions.length,
  };
}

function peakAverage<T extends { yearID: string }>(
  rows: T[],
  valueForSeason: (seasonRows: T[]) => number,
  windowSize = 3,
): number | undefined {
  const byYear = new Map<string, T[]>();
  for (const row of rows) {
    const yearRows = byYear.get(row.yearID) ?? [];
    yearRows.push(row);
    byYear.set(row.yearID, yearRows);
  }
  const seasons = Array.from(byYear.entries())
    .map(([yearID, seasonRows]) => ({ yearID: Number(yearID), value: valueForSeason(seasonRows) }))
    .filter((season) => Number.isFinite(season.yearID) && Number.isFinite(season.value))
    .sort((a, b) => a.yearID - b.yearID);

  if (seasons.length === 0) return undefined;
  if (seasons.length <= windowSize) return seasons.reduce((sum, season) => sum + season.value, 0) / seasons.length;

  let best = Number.NEGATIVE_INFINITY;
  for (let index = 0; index <= seasons.length - windowSize; index += 1) {
    const window = seasons.slice(index, index + windowSize);
    const average = window.reduce((sum, season) => sum + season.value, 0) / window.length;
    if (average > best) best = average;
  }
  return best;
}

function battingSignals(summary: LahmanRateSummary["batting"], population: NonNullable<LahmanRateSummary["batting"]>[]): HistoricalPercentileSignals | undefined {
  if (!summary) return undefined;
  return {
    overall: percentileRank(summary.battingValue, population.map((player) => player.battingValue)),
    power: percentileRank(summary.isolatedPower, population.map((player) => player.isolatedPower)),
    contact: percentileRank(summary.contactRate, population.map((player) => player.contactRate)),
    discipline: percentileRank(summary.walkRate, population.map((player) => player.walkRate)),
    speed: percentileRank(summary.speedScore, population.map((player) => player.speedScore)),
    baserunning: percentileRank(summary.speedScore, population.map((player) => player.speedScore)),
    durability: percentileRank(summary.plateAppearances, population.map((player) => player.plateAppearances)),
  };
}

function pitchingSignals(summary: LahmanRateSummary["pitching"], population: NonNullable<LahmanRateSummary["pitching"]>[]): HistoricalPercentileSignals | undefined {
  if (!summary) return undefined;
  return {
    overall: percentileRank(summary.pitchingValue, population.map((player) => player.pitchingValue)),
    runPrevention: percentileRank(summary.era, population.map((player) => player.era), true),
    strikeouts: percentileRank(summary.strikeoutRate, population.map((player) => player.strikeoutRate)),
    velocity: percentileRank(summary.strikeoutRate, population.map((player) => player.strikeoutRate)),
    movement: percentileRank(summary.homeRunAvoidance, population.map((player) => player.homeRunAvoidance)),
    command: percentileRank(summary.walkAvoidance, population.map((player) => player.walkAvoidance)),
    workload: percentileRank(summary.workloadScore, population.map((player) => player.workloadScore)),
    leverage: percentileRank(summary.saves, population.map((player) => player.saves)),
  };
}

function fieldingSignals(summary: LahmanRateSummary["fielding"], population: NonNullable<LahmanRateSummary["fielding"]>[]): HistoricalPercentileSignals {
  if (!summary || population.length === 0) {
    return {};
  }
  return {
    defense: percentileRank(summary.fieldingRate, population.map((player) => player.fieldingRate)),
    arm: percentileRank(summary.assistRate, population.map((player) => player.assistRate)),
    versatility: percentileRank(summary.versatility, population.map((player) => player.versatility)),
  };
}

function mergeSignals(...signals: Array<HistoricalPercentileSignals | undefined>): HistoricalPercentileSignals | undefined {
  const merged = Object.assign({}, ...signals.filter(nonEmpty));
  return Object.keys(merged).length > 0 ? merged : undefined;
}

function inferPitcherRole(summary: LahmanRateSummary["pitching"]): HistoricalPitcherRole | undefined {
  if (!summary) return undefined;
  const startRate = divide(summary.gamesStarted, summary.games);
  if (summary.saves >= 50 && startRate < 0.2) return "closer";
  if (startRate >= 0.55) return "starter";
  if (startRate >= 0.25) return "swingman";
  return "reliever";
}

function inferPitchArchetype(summary: LahmanRateSummary["pitching"], signals: HistoricalPercentileSignals | undefined): HistoricalPitchArchetype | undefined {
  if (!summary || !signals) return undefined;
  if ((signals.strikeouts ?? 50) >= 75) return "power";
  if ((signals.command ?? 50) >= 75) return "command";
  if ((signals.movement ?? 50) >= 75) return "groundBall";
  return "balanced";
}

function buildSeasons(battingRows: LahmanBattingRow[], pitchingRows: LahmanPitchingRow[], fieldingRows: LahmanFieldingRow[]): HistoricalSeasonRecord[] {
  const years = Array.from(
    new Set([...battingRows.map((row) => row.yearID), ...pitchingRows.map((row) => row.yearID), ...fieldingRows.map((row) => row.yearID)].filter(Boolean)),
  ).sort();

  return years.map((yearID) => {
    const batting = battingRows.filter((row) => row.yearID === yearID);
    const pitching = pitchingRows.filter((row) => row.yearID === yearID);
    const fielding = fieldingRows.filter((row) => row.yearID === yearID);
    const primaryPosition = inferPrimaryPositions(fielding, pitching)[0];
    return {
      season: Number(yearID),
      team: batting[0]?.teamID ?? pitching[0]?.teamID ?? fielding[0]?.teamID,
      primaryPosition,
      games: Math.max(sumRows(batting, (row) => row.G), sumRows(pitching, (row) => row.G), sumRows(fielding, (row) => row.G)),
      plateAppearances: sumRows(batting, (row) => row.PA) || sumRows(batting, (row) => row.AB) + sumRows(batting, (row) => row.BB),
      inningsPitched: sumRows(pitching, (row) => row.IPouts) / 3,
    };
  });
}

function createProvenance(bundle: LahmanCsvBundle, options: LahmanAdapterOptions): HistoricalSourceProvenance[] {
  return [
    {
      sourceName: "SABR Lahman Database",
      sourceVersion: options.sourceVersion ?? bundle.sourceVersion,
      sourceUrl: options.sourceUrl ?? bundle.sourceUrl ?? "https://sabr.org/lahman-database/",
      table: "People,Batting,Pitching,Fielding",
      notes: [
        "Adapter computes era-relative percentile signals from caller-provided Lahman CSV text.",
        "No live data fetch is performed by this adapter.",
      ],
    },
  ];
}

export function createManualHistoricalSourceRecord(input: ManualHistoricalSourceInput): HistoricalPlayerSourceRecord {
  const sourceName = input.sourceName ?? "Manual historical source";
  return {
    ...input,
    sourceId: input.sourceId ?? `manual:${input.playerName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    sourceName,
    primaryPositions: input.primaryPositions.length > 0 ? input.primaryPositions : ["CF"],
    provenance: [
      ...(input.provenance ?? []),
      {
        sourceName,
        notes: ["Manual source record supplied by caller; percentile quality depends on caller curation."],
      },
    ],
  };
}

export function buildHistoricalSourcesFromLahmanCsv(
  bundle: LahmanCsvBundle,
  options: LahmanAdapterOptions = {},
): HistoricalPlayerSourceRecord[] {
  const people = parseCsv(bundle.people) as unknown as LahmanPersonRow[];
  const batting = parseCsv(bundle.batting) as unknown as LahmanBattingRow[];
  const pitching = parseCsv(bundle.pitching) as unknown as LahmanPitchingRow[];
  const fielding = parseCsv(bundle.fielding) as unknown as LahmanFieldingRow[];
  const battingByPlayer = groupByPlayer(batting);
  const pitchingByPlayer = groupByPlayer(pitching);
  const fieldingByPlayer = groupByPlayer(fielding);
  const players = people.map<LahmanPlayerStats>((person) => ({
    playerID: person.playerID,
    playerName: lahmanPlayerName(person),
    birthYear: toOptionalNumber(person.birthYear),
    bats: normalizeHandedness(person.bats, true),
    throws: normalizeThrowingHand(person.throws),
    batting: battingByPlayer.get(person.playerID) ?? [],
    pitching: pitchingByPlayer.get(person.playerID) ?? [],
    fielding: fieldingByPlayer.get(person.playerID) ?? [],
  }));
  const summaries: LahmanRateSummary[] = players.map((player) => ({
    playerID: player.playerID,
    batting: summarizeBatting(player.playerID, player.batting),
    pitching: summarizePitching(player.pitching),
    fielding: summarizeFielding(player.fielding),
  }));
  const battingPopulation = summaries
    .map((summary) => summary.batting)
    .filter((summary): summary is NonNullable<LahmanRateSummary["batting"]> => Boolean(summary && summary.plateAppearances >= (options.minPlateAppearances ?? 1)));
  const pitchingPopulation = summaries
    .map((summary) => summary.pitching)
    .filter((summary): summary is NonNullable<LahmanRateSummary["pitching"]> => Boolean(summary && summary.inningsPitched >= (options.minInningsPitched ?? 1)));
  const fieldingPopulation = summaries
    .map((summary) => summary.fielding)
    .filter((summary): summary is NonNullable<LahmanRateSummary["fielding"]> => Boolean(summary && summary.games > 0));
  const summaryByPlayer = new Map(summaries.map((summary) => [summary.playerID, summary]));
  const provenance = createProvenance(bundle, options);

  return players
    .map((player): HistoricalPlayerSourceRecord | undefined => {
      const summary = summaryByPlayer.get(player.playerID);
      if (!summary) return undefined;

      const battingCareer = battingSignals(summary.batting, battingPopulation);
      const pitchingCareer = pitchingSignals(summary.pitching, pitchingPopulation);
      const fieldingCareer = fieldingSignals(summary.fielding, fieldingPopulation);
      const battingPeakValue = peakAverage(player.batting, (seasonRows) => summarizeBatting(player.playerID, seasonRows)?.battingValue ?? 0);
      const pitchingPeakValue = peakAverage(player.pitching, (seasonRows) => summarizePitching(seasonRows)?.pitchingValue ?? 0);
      const battingPeak =
        battingPeakValue !== undefined && battingPopulation.length > 0
          ? { ...battingCareer, overall: percentileRank(battingPeakValue, battingPopulation.map((item) => item.battingValue)) }
          : battingCareer;
      const pitchingPeak =
        pitchingPeakValue !== undefined && pitchingPopulation.length > 0
          ? { ...pitchingCareer, overall: percentileRank(pitchingPeakValue, pitchingPopulation.map((item) => item.pitchingValue)) }
          : pitchingCareer;
      const primaryPositions = inferPrimaryPositions(player.fielding, player.pitching);
      const hasBatting = Boolean(summary.batting && summary.batting.plateAppearances >= (options.minPlateAppearances ?? 1));
      const hasPitching = Boolean(summary.pitching && summary.pitching.inningsPitched >= (options.minInningsPitched ?? 1));
      const playerKind: HistoricalPlayerKind = hasBatting && hasPitching ? "twoWay" : hasPitching ? "pitcher" : "hitter";
      const hitterSnapshot: HistoricalMetricSnapshot | undefined = hasBatting
        ? {
            career: mergeSignals(battingCareer, fieldingCareer),
            peak: mergeSignals(battingPeak, fieldingCareer),
            notes: ["Lahman adapter estimates power/contact/discipline/speed from batting totals and defense/arm from fielding totals."],
          }
        : undefined;
      const pitcherSnapshot: HistoricalMetricSnapshot | undefined = hasPitching
        ? {
            career: pitchingCareer,
            peak: pitchingPeak,
            notes: ["Lahman adapter estimates pitcher style from run prevention, strikeouts, walks, home-run avoidance, workload, and saves."],
          }
        : undefined;
      const careerTotals: HistoricalCareerTotals = {
        games: Math.max(summary.batting?.games ?? 0, summary.pitching?.games ?? 0, summary.fielding?.games ?? 0),
        plateAppearances: summary.batting?.plateAppearances,
        inningsPitched: summary.pitching?.inningsPitched,
        seasons: Math.max(summary.batting?.seasons ?? 0, summary.pitching?.seasons ?? 0, seasonCount(player.fielding)),
      };

      return {
        sourceId: `lahman:${player.playerID}`,
        sourceName: "SABR Lahman Database",
        playerName: player.playerName,
        sourceIds: { lahman: player.playerID },
        provenance,
        birthYear: player.birthYear,
        bats: player.bats,
        throws: player.throws,
        primaryPositions: primaryPositions.length > 0 ? primaryPositions : hasPitching ? ["SP"] : ["CF"],
        seasons: buildSeasons(player.batting, player.pitching, player.fielding),
        careerTotals,
        hitter: hitterSnapshot,
        pitcher: pitcherSnapshot,
        playerKind,
        pitcherRole: inferPitcherRole(summary.pitching),
        pitchArchetype: inferPitchArchetype(summary.pitching, pitchingCareer),
        notes: [
          "Lahman-derived record; advanced modern signals such as pitch velocity, Statcast sprint speed, and batted-ball quality require enrichment adapters.",
        ],
      };
    })
    .filter(nonEmpty);
}
