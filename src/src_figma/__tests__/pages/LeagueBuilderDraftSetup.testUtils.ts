// CONTRACT_FLAKEFIX_2026-07-09: shared fixture/setup helpers for the LeagueBuilderDraftSetup.*
// split suites. These suites descend from the single LeagueBuilderDraftSetup.test.tsx mega-file
// (93 tests, ~98s solo / ~232s under full-suite batch load, and a 1-5-tests-per-run nondeterministic
// flake envelope that always passed solo). The mega-file was split by zone into
// LeagueBuilderDraftSetup.setup.test.tsx / .money.test.tsx / .poolLock.test.tsx /
// .universe.test.tsx / .board.test.tsx to shrink per-file runtime and reduce cross-test resource
// contention; every test kept its exact name and exact assertions (relocation, not rewording).
// This module holds the PURE fixture builders and DOM-query helpers that don't require file-local
// vi.mock() hoisting -- each split file still declares its OWN vi.mock(...) calls (Vitest hoists
// vi.mock per test file, and mock factories referencing a local `mockNavigate` must stay in that
// same file), but everything below is safe to share because vi.mock's effect covers the WHOLE
// module graph loaded during a given test file's run, including modules this file imports
// (useLeagueBuilderData, extractPoolFromDemand, etc.) -- exactly how the original single file's
// helpers already worked against those same mocked bindings.
import { act, configure, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { expect, vi } from "vitest";

import type { Best22Target } from "../../../engines/best22Target";
import { extractPoolFromDemand } from "../../../engines/poolFromDemand";
import { poolDemandModel } from "../../../engines/auctionPoolSizing";
import {
  useLeagueBuilderData,
  type LeagueTemplate,
  type Player,
  type Team,
  type UseLeagueBuilderDataReturn,
} from "../../hooks/useLeagueBuilderData";

// CONTRACT_FLAKEFIX_2026-07-09: raise RTL's DEFAULT waitFor/findBy* timeout (built-in 1000ms) for
// every split suite that imports this module. Empirically, individual {timeout: 5000-12000}
// overrides on the specific call sites the STALEPARITY/CUT2-2/F20 audit flagged were NOT enough --
// a batch run of these 5 files (concurrent with other CPU-heavy sessions on this box, confirmed via
// `uptime` load-average during this lane's own verification) still tripped a call site with no
// explicit override (e.g. a bare `findByText`/`waitFor` this sweep didn't individually touch).
// Rather than continue whack-a-mole on individual call sites, this raises the FILE-WIDE default
// once, in the one module every split suite already imports -- every assertion still checks the
// exact same fact, it just gets more retry budget before giving up. Each file's own
// vi.setConfig({ testTimeout: 15000 }) (or the explicit 20_000 override on the one long test) is
// the real ceiling this stays safely under.
configure({ asyncUtilTimeout: 5000 });

export type LeaguePoolRecord = {
  leagueId: string;
  tier: "standard";
  balanceMode: "taxed";
  players: Array<{ id: string; iv: number; salary: number }>;
  tierCap: number;
  luxuryCaps: never[];
  pickValueChart: never[];
  totalSlots: number;
  poolSurplusWarning: boolean;
  locked?: boolean;
};

export function makeLeague(overrides: Partial<LeagueTemplate> = {}): LeagueTemplate {
  return {
    id: "league-page",
    name: "Page League",
    teamIds: ["team-a", "team-b"],
    conferences: [],
    divisions: [],
    defaultRulesPreset: "rules",
    tier: "standard",
    balanceMode: "taxed",
    draftSeats: [
      { id: "seat-you", name: "You" },
      { id: "seat-player-2", name: "Player 2" },
    ],
    createdDate: "2026-01-01",
    lastModified: "2026-01-01",
    ...overrides,
  };
}

export function makeTeam(id: string, overrides: Partial<Team> = {}): Team {
  return {
    id,
    name: id === "team-a" ? "Caps" : "Keys",
    abbreviation: id.toUpperCase(),
    location: "Page",
    nickname: id,
    colors: { primary: "#000000", secondary: "#ffffff" },
    stadium: "Page Park",
    controlledBy: "human",
    gmSeatId: id === "team-a" ? "seat-you" : "seat-player-2",
    gmSeatName: id === "team-a" ? "You" : "Player 2",
    leagueIds: ["league-page"],
    mlbArchetypeKey: "murderers-row",
    farmArchetypeKey: "whiteyball",
    createdDate: "2026-01-01",
    lastModified: "2026-01-01",
    ...overrides,
  };
}

export function makePlayer(index = 0, overrides: Partial<Player> = {}): Player {
  return {
    id: `player-${index}`,
    firstName: index === 0 ? "Avery" : `Player${index}`,
    lastName: index === 0 ? "Anchor" : "Pool",
    gender: "M",
    age: 25,
    bats: "R",
    throws: "R",
    primaryPosition: "CF",
    secondaryPosition: "LF",
    power: 70,
    contact: 70,
    speed: 70,
    fielding: 70,
    arm: 70,
    velocity: 30,
    junk: 30,
    accuracy: 30,
    arsenal: ["4F"],
    overallGrade: "B",
    personality: "Competitive",
    chemistry: "Crafty",
    morale: 50,
    mojo: "Normal",
    fame: 0,
    salary: 10_000,
    leagueAssignments: [{ leagueId: "league-page", teamId: "team-a", rosterStatus: "FREE_AGENT" }],
    createdDate: "2026-01-01",
    lastModified: "2026-01-01",
    isCustom: true,
    ...overrides,
  };
}

export function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, index) => makePlayer(index));
}

export const DEFAULT_TEST_POOL_SIZE = Math.max(80, poolDemandModel(2, 0).feasibilityFloor);

export function makeLegalRosterPlayers(salary: number): Player[] {
  const hitters: Player[] = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"].map((position, index) =>
    makePlayer(index, { id: `legal-h-${position}`, primaryPosition: position as Player["primaryPosition"], salary }),
  );
  const backupC = makePlayer(20, {
    id: "legal-backup-c",
    primaryPosition: "1B",
    secondaryPosition: "C",
    salary,
  });
  const starters = Array.from({ length: 4 }, (_, index) =>
    makePlayer(30 + index, { id: `legal-sp-${index}`, primaryPosition: "SP", salary }),
  );
  const relievers = Array.from({ length: 3 }, (_, index) =>
    makePlayer(40 + index, { id: `legal-rp-${index}`, primaryPosition: "RP", salary }),
  );
  const closer = makePlayer(44, { id: "legal-cp", primaryPosition: "CP", salary });
  const flexPositions: Player["primaryPosition"][] = ["1B", "2B", "3B", "SS"];
  const flex = flexPositions.map((position, index) =>
    makePlayer(50 + index, { id: `legal-flex-${index}`, primaryPosition: position, salary }),
  );
  const swing = makePlayer(60, { id: "legal-swing", primaryPosition: "SP/RP", salary });
  return [...hitters, backupC, ...starters, ...relievers, closer, ...flex, swing];
}

export function makeLegalRosterPlayerSet(prefix: string, salary: number): Player[] {
  return makeLegalRosterPlayers(salary).map((player) => ({
    ...player,
    id: `${prefix}-${player.id}`,
  }));
}

export function makeFinalizedDesignFirstPlayers(): Player[] {
  return [
    ...makeLegalRosterPlayerSet("one", 10_000),
    ...makeLegalRosterPlayerSet("two", 10_000),
    ...makePlayers(11).map((player) => ({
      ...player,
      id: `extra-${player.id}`,
    })),
  ];
}

export function makeQualityRosterPlayerSet(prefix: string, rating: number): Player[] {
  return makeLegalRosterPlayerSet(prefix, 10_000).map((player) => ({
    ...player,
    power: rating,
    contact: rating,
    speed: rating,
    fielding: rating,
    arm: rating,
    velocity: rating,
    junk: rating,
    accuracy: rating,
  }));
}

export function capFitDiagnosticText(): string {
  return screen.getByLabelText("Cap fit diagnostic").textContent ?? "";
}

export type ExtractPoolOptions = {
  excludedIds?: string[];
  generationNonce?: number;
  pinnedIds?: string[];
  poolBalancePreset?: string;
  poolQualityCenter?: number;
  poolSizeMultiplier?: number;
  poolSourceMode?: string;
  priorityIds?: string[];
};

export function extractPoolOptions(): ExtractPoolOptions[] {
  return vi.mocked(extractPoolFromDemand).mock.calls.map((call) => call[4] as ExtractPoolOptions);
}

export async function waitForExtractPoolOptions(
  predicate: (options: ExtractPoolOptions) => boolean,
): Promise<ExtractPoolOptions> {
  let matched: ExtractPoolOptions | undefined;
  // CONTRACT_FLAKEFIX_2026-07-09: widened from 7000ms -> 12000ms (still inside each file's own
  // vi.setConfig({ testTimeout: 15000 }) ceiling). Empirically, a 7000ms budget was still tight
  // enough to time out under real multi-file/multi-process batch-load CPU contention even though
  // the same test passes solo in ~1.5s -- this shared helper backs ~20 call sites across the split
  // suites, so widening it once here is the single highest-leverage timing cure in the file.
  await waitFor(() => {
    matched = extractPoolOptions().find(predicate);
    expect(matched).toBeDefined();
  }, { timeout: 12000 });
  return matched!;
}

export async function clickDraftSetupButton(name: string | RegExp): Promise<void> {
  const button = await screen.findByRole("button", { name });
  await act(async () => {
    fireEvent.click(button);
  });
}

// BOARDFIX1: mirrors RosterDesigner.test.tsx's own clickSlot/shortlistLines helpers so a
// page-level test can drive into a slot's shortlist through the real club-editor render path.
export function clickSlot(label: string): void {
  // The page renders several unrelated "SS"-labeled nodes (position <option>s, other panels) --
  // the slot grid's own label is always the first match in document order.
  const slotLabel = screen.getAllByText(label)[0];
  const button = slotLabel.closest("button");
  if (!button) throw new Error(`No button found for ${label}`);
  fireEvent.click(button);
}

export function shortlistLines(): string[] {
  const rail = screen.getByText("THE ASK'S SHORTLIST").parentElement;
  if (!rail) throw new Error("No shortlist rail found");
  return Array.from(rail.querySelectorAll("span.min-w-0.truncate")).map((element) => element.textContent ?? "");
}

export function makeLockedRosterDesign(lockedAt: string): NonNullable<Team["rosterDesign"]> {
  return { slots: [], lockedAt };
}

// BOARDFIX2 (Items B/C): five SS candidates with a wide, deliberate worth spread -- reused across
// the rank-edit-lands-at-position and reorder-perf test groups below.
export function fiveGradedSsPlayers(): Player[] {
  return [
    makePlayer(0, { id: "star-ss", firstName: "Star", lastName: "Short", primaryPosition: "SS", power: 99, contact: 99, speed: 99, fielding: 99, arm: 99 }),
    makePlayer(1, { id: "high-ss", firstName: "High", lastName: "Short", primaryPosition: "SS", power: 85, contact: 85, speed: 85, fielding: 85, arm: 85 }),
    makePlayer(2, { id: "mid-ss", firstName: "Mid", lastName: "Short", primaryPosition: "SS", power: 60, contact: 60, speed: 60, fielding: 60, arm: 60 }),
    makePlayer(3, { id: "low-ss", firstName: "Low", lastName: "Short", primaryPosition: "SS", power: 35, contact: 35, speed: 35, fielding: 35, arm: 35 }),
    makePlayer(4, { id: "weak-ss", firstName: "Weak", lastName: "Short", primaryPosition: "SS", power: 20, contact: 20, speed: 20, fielding: 20, arm: 20 }),
  ];
}

export function globalBoardOrder(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("span.min-w-0.truncate.font-bold")).map((el) => el.textContent ?? "");
}

export function makeBest22Target(overrides: Partial<Best22Target> = {}): Best22Target {
  return {
    picks: [],
    pins: { honored: [], dropped: [] },
    totalSalary: 28_000,
    totalTax: 2_000,
    allIn: 30_000,
    budget: 1_000_000,
    feasible: true,
    embodimentZ: 0.4,
    asksHonored: { honored: 0, asked: 0 },
    ...overrides,
  };
}

export function makePool(overrides: Partial<LeaguePoolRecord> = {}): LeaguePoolRecord {
  return {
    leagueId: "league-page",
    tier: "standard",
    balanceMode: "taxed",
    players: Array.from({ length: DEFAULT_TEST_POOL_SIZE }, (_, index) => ({
      id: `player-${index}`,
      iv: 100_000 - index,
      salary: 10_000,
    })),
    tierCap: 1_000_000,
    luxuryCaps: [],
    pickValueChart: [],
    totalSlots: DEFAULT_TEST_POOL_SIZE,
    poolSurplusWarning: false,
    locked: true,
    ...overrides,
  };
}

export function mockLeagueData({
  league = makeLeague(),
  leagues,
  teams = [makeTeam("team-a"), makeTeam("team-b")],
  players = makePlayers(DEFAULT_TEST_POOL_SIZE),
  pool = makePool(),
}: {
  league?: LeagueTemplate;
  leagues?: LeagueTemplate[];
  teams?: Team[];
  players?: Player[];
  pool?: LeaguePoolRecord | null;
} = {}) {
  const leagueData = {
    leagues: leagues ?? [league],
    teams,
    players,
    rulesPresets: [],
    isLoading: false,
    error: null,
    getRegisteredPool: vi.fn(async () => pool),
    updatePlayer: vi.fn(async (player: Player) => player),
    replaceTeamsLocal: vi.fn(() => undefined),
    refresh: vi.fn(async () => undefined),
  } as unknown as UseLeagueBuilderDataReturn;
  vi.mocked(useLeagueBuilderData).mockReturnValue(leagueData);
  return leagueData;
}
