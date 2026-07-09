import "fake-indexeddb/auto";

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { LEAGUE_MINIMUM_SALARY } from "../../../data/rosterEngineConstants";
import { gradeToTwentyEighty } from "../../../engines/gradeEngine";
import { archetypeBandValueRange } from "../../../engines/scoutValueRange";
import {
  deriveAuctionSessionNominationSeed,
  lotOpeningAsk,
  seededNominationOrder,
  surfaceNextPlayer,
} from "../../../engines/auctionStateMachine";
import { buildFarmAuctionSession } from "../../../utils/farmAuctionSession";
import {
  __resetLeagueBuilderDatabaseForTests,
  createFarmAuctionSessionId,
  deleteScoutProfilesForLeague,
  saveScoutProfile,
} from "../../../utils/leagueBuilderStorage";
import {
  scoutOverallBandForPosition,
  scoutOverallGradeBand,
  scoutOverallTierForPosition,
  scoutToolBands,
  type DraftPosition,
  type LeagueBuilderProspectPlayerDto,
  type ProspectScoutDescriptor,
} from "../../../utils/prospectScoutingDraftEngine";
import {
  LeagueBuilderFarmAuctionDraft,
  buildFarmBridgeHeadline,
} from "../../app/pages/LeagueBuilderFarmAuctionDraft";
import {
  useLeagueBuilderData,
  type LeagueTemplate,
  type Team,
  type TeamRoster,
  type UseLeagueBuilderDataReturn,
} from "../../hooks/useLeagueBuilderData";

const mockNavigate = vi.fn();
const TEST_SESSION_LAUNCH_NONCE = "00000000-0000-4000-8000-000000000001";

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../../../utils/syncEngine", () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock("../../hooks/useLeagueBuilderData", async () => {
  const actual = await vi.importActual<typeof import("../../hooks/useLeagueBuilderData")>(
    "../../hooks/useLeagueBuilderData",
  );
  return {
    ...actual,
    useLeagueBuilderData: vi.fn(),
  };
});

const DB_NAME = "kbl-league-builder";
const LEAGUE_ID = "farm-page";
const TEAM_IDS = ["team-a", "team-b"] as const;

const SCOUTS_BY_TEAM_ID: Record<string, ProspectScoutDescriptor> = {
  "team-a": {
    scoutId: `${LEAGUE_ID}-team-a-scout`,
    scoutName: "TEAM-A Scout",
    specialties: ["outfield"],
    weaknesses: ["CP"],
  },
  "team-b": {
    scoutId: `${LEAGUE_ID}-team-b-scout`,
    scoutName: "TEAM-B Scout",
    specialties: ["pitching"],
    weaknesses: ["1B"],
  },
};

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function makeLeague(): LeagueTemplate {
  return {
    id: LEAGUE_ID,
    name: "Farm Page League",
    teamIds: [...TEAM_IDS],
    conferences: [],
    divisions: [],
    defaultRulesPreset: "rules",
    tier: "standard",
    balanceMode: "taxed",
    createdDate: "2026-01-01",
    lastModified: "2026-01-01",
  };
}

function makeTeam(id: string): Team {
  return {
    id,
    name: id === "team-a" ? "Caps" : "Keys",
    abbreviation: id.toUpperCase(),
    location: "Farm",
    nickname: id,
    colors: { primary: "#000000", secondary: "#ffffff" },
    stadium: "Farm Park",
    controlledBy: "human",
    leagueIds: [LEAGUE_ID],
    farmArchetypeKey: id === "team-a" ? "web-gems" : "bomba-squad",
    createdDate: "2026-01-01",
    lastModified: "2026-01-01",
  };
}

function emptyRoster(teamId: string): TeamRoster {
  return {
    teamId,
    mlbRoster: [],
    farmRoster: [],
    lineupWithDH: [],
    lineupWithoutDH: [],
    startingRotation: [],
    longRelievers: [],
    closingPitcher: "",
    setupPitchers: [],
    depthChart: {
      C: [],
      "1B": [],
      "2B": [],
      SS: [],
      "3B": [],
      LF: [],
      CF: [],
      RF: [],
      DH: [],
      SP: [],
      RP: [],
      CP: [],
    },
    pinchHitOrder: [],
    pinchRunOrder: [],
    defensiveSubOrder: [],
    lastModified: "2026-01-01",
  };
}

function teamDisplayName(team: Team): string {
  return `${team.location} ${team.name}`;
}

function mockLeagueData() {
  const teams = TEAM_IDS.map((teamId) => makeTeam(teamId));
  const leagueData = {
    leagues: [makeLeague()],
    teams,
    players: [],
    rulesPresets: [],
    isLoading: false,
    error: null,
    getRoster: vi.fn(async (teamId: string) => emptyRoster(teamId)),
    refresh: vi.fn(async () => undefined),
  } as unknown as UseLeagueBuilderDataReturn;

  vi.mocked(useLeagueBuilderData).mockReturnValue(leagueData);
  return { leagueData, teams };
}

function seedWithFirst(teamIds: readonly string[], firstTeamId: string): string {
  const seed = Array.from({ length: 1_000 }, (_, index) => `farm-page-seed-${index}`).find(
    (candidate) => {
      const sessionSeed = deriveAuctionSessionNominationSeed({
        sessionId: createFarmAuctionSessionId(LEAGUE_ID, 1),
        launchNonce: TEST_SESSION_LAUNCH_NONCE,
        baseSeed: candidate,
      });
      return seededNominationOrder(teamIds, sessionSeed)[0] === firstTeamId;
    },
  );
  if (!seed) throw new Error(`No seed found for first team ${firstTeamId}`);
  return seed;
}

async function seedScoutProfiles(): Promise<void> {
  await Promise.all(
    TEAM_IDS.map((teamId) => saveScoutProfile({
      id: `${LEAGUE_ID}-${teamId}-scout`,
      leagueId: LEAGUE_ID,
      teamId,
      name: `${teamId.toUpperCase()} Scout`,
      specialties: SCOUTS_BY_TEAM_ID[teamId].specialties ?? [],
      weaknesses: SCOUTS_BY_TEAM_ID[teamId].weaknesses ?? [],
      accuracyByPosition: { CF: 82, SP: 78, CP: 58, "1B": 65 },
      seed: `${LEAGUE_ID}:${teamId}:scout`,
      createdDate: "2026-01-01",
      lastModified: "2026-01-01",
    })),
  );
}

function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/A";
  return `$${Math.round(value).toLocaleString()}`;
}

function prospectDisplayName(prospect: LeagueBuilderProspectPlayerDto): string {
  return `${prospect.firstName} ${prospect.lastName}`.trim();
}

function prospectPositions(prospect: LeagueBuilderProspectPlayerDto): string[] {
  return Array.from(new Set([prospect.primaryPosition, prospect.secondaryPosition].filter(Boolean) as string[]));
}

function prospectRatingsOf(prospect: LeagueBuilderProspectPlayerDto): Record<string, number> {
  return {
    power: prospect.power,
    contact: prospect.contact,
    speed: prospect.speed,
    fielding: prospect.fielding,
    arm: prospect.arm,
    velocity: prospect.velocity,
    junk: prospect.junk,
    accuracy: prospect.accuracy,
  };
}

function formatScoutRange(range: { displayedEstimate: number; low: number; high: number }): string {
  return `${formatMoney(range.displayedEstimate)} estimate [${formatMoney(range.low)}-${formatMoney(range.high)}]`;
}

function expectTextContent(text: string): void {
  expect(textContentNode(text)).toBeVisible();
}

function textContentNode(text: string): HTMLElement {
  return screen.getByText((_, node) => node?.textContent === text);
}

function openEngineLot(session: ReturnType<typeof buildFarmAuctionSession>["session"]) {
  const result = surfaceNextPlayer(session);
  if (!result.ok || !result.session.currentLot) {
    throw new Error("Expected farm auction engine to surface an open lot.");
  }
  return result.session;
}

describe("LeagueBuilderFarmAuctionDraft", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    window.history.pushState({}, "", "/league-builder/farm-auction-draft");
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(TEST_SESSION_LAUNCH_NONCE);
    __resetLeagueBuilderDatabaseForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
    await seedScoutProfiles();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    __resetLeagueBuilderDatabaseForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  test("renders the obscured farm auction flow with positions and scout ranges only", async () => {
    const { leagueData, teams } = mockLeagueData();
    await deleteScoutProfilesForLeague(LEAGUE_ID);
    teams[0].farmCapIdentity = {
      increase: ["Defense First"],
      decrease: [],
    };
    const seed = seedWithFirst(TEAM_IDS, "team-a");
    const expected = buildFarmAuctionSession({
      leagueId: LEAGUE_ID,
      seasonNumber: 1,
      teams: teams.map((team) => ({
        teamId: team.id,
        teamName: teamDisplayName(team),
      })),
      scoutsByTeamId: SCOUTS_BY_TEAM_ID,
      seed,
      config: {
        nominationOrderSeed: seed,
        cpuShillCount: 0,
        bidIncrement: 1000,
        turnTimerSeconds: null,
        excludeFromLeague: true,
        nominationWeightExponent: 3,
        flatReserveFloor: LEAGUE_MINIMUM_SALARY,
      },
      sessionId: createFarmAuctionSessionId(LEAGUE_ID, 1),
      sessionLaunchNonce: TEST_SESSION_LAUNCH_NONCE,
    });
    const surfaced = openEngineLot(expected.session);
    const surfacedLot = surfaced.currentLot!;
    const prospectById = new Map(expected.pool.prospects.map((prospect) => [prospect.id, prospect]));
    const baseCandidates = expected.session.availablePlayerIds
      .map((playerId) => expected.session.players[playerId])
      .map((candidate) => {
        const prospect = prospectById.get(candidate.playerId)!;
        return { candidate, prospect };
      });
    const mlbPlayers = [
      { id: "mlb-c", firstName: "Mlb", lastName: "Catcher", primaryPosition: "C" },
      { id: "mlb-1b", firstName: "Mlb", lastName: "First", primaryPosition: "1B" },
      { id: "mlb-2b", firstName: "Mlb", lastName: "Second", primaryPosition: "2B" },
      { id: "mlb-3b", firstName: "Mlb", lastName: "Third", primaryPosition: "3B" },
      { id: "mlb-lf", firstName: "Mlb", lastName: "Left", primaryPosition: "LF" },
    ];
    const mlbRosterPlayerIds = mlbPlayers.map((player) => player.id);
    leagueData.players = mlbPlayers.map((player) => ({
      ...player,
      chemistry: baseCandidates[0].prospect.chemistry,
    })) as unknown as UseLeagueBuilderDataReturn["players"];
    leagueData.getRoster = vi.fn(async (teamId: string) => ({
      ...emptyRoster(teamId),
      mlbRoster: teamId === "team-a" ? mlbRosterPlayerIds : [],
    }));
    const target = baseCandidates.find((candidate) => candidate.candidate.playerId === surfacedLot.playerId);
    if (!target) throw new Error("Expected the engine-surfaced farm lot in the candidate list.");
    const targetTeamId = surfacedLot.bidTurnTeamId ?? "team-a";
    const targetFarmArchetypeKey = teams.find((team) => team.id === targetTeamId)?.farmArchetypeKey;
    const targetSessionSeed = deriveAuctionSessionNominationSeed({
      sessionId: createFarmAuctionSessionId(LEAGUE_ID, 1),
      launchNonce: TEST_SESSION_LAUNCH_NONCE,
      baseSeed: seed,
    });
    const targetBand = scoutOverallGradeBand(
      target.prospect.prospectProfile.trueGrade,
      scoutOverallTierForPosition(
        target.prospect.primaryPosition as DraftPosition,
        targetFarmArchetypeKey,
        {
          power: target.prospect.power,
          contact: target.prospect.contact,
          speed: target.prospect.speed,
          fielding: target.prospect.fielding,
          arm: target.prospect.arm,
          velocity: target.prospect.velocity,
          junk: target.prospect.junk,
          accuracy: target.prospect.accuracy,
        },
      ),
      `${targetSessionSeed}:grade-band:${target.prospect.id}:${targetTeamId}`,
    );
    const targetOverallBand = scoutOverallBandForPosition(
      target.prospect.primaryPosition as DraftPosition,
      targetFarmArchetypeKey,
      {
        power: target.prospect.power,
        contact: target.prospect.contact,
        speed: target.prospect.speed,
        fielding: target.prospect.fielding,
        arm: target.prospect.arm,
        velocity: target.prospect.velocity,
        junk: target.prospect.junk,
        accuracy: target.prospect.accuracy,
      },
    );
    const targetRange = archetypeBandValueRange(
      surfacedLot.openingAsk,
      targetOverallBand,
      `${targetSessionSeed}:value-band:${target.prospect.id}:${targetTeamId}`,
    );
    const targetToolBands = scoutToolBands({
      ratings: {
        power: target.prospect.power,
        contact: target.prospect.contact,
        speed: target.prospect.speed,
        fielding: target.prospect.fielding,
        arm: target.prospect.arm,
        velocity: target.prospect.velocity,
        junk: target.prospect.junk,
        accuracy: target.prospect.accuracy,
      },
      position: target.prospect.primaryPosition as DraftPosition,
      farmArchetypeKey: targetFarmArchetypeKey,
      seed: `${targetSessionSeed}:tool-bands:${target.prospect.id}:${targetTeamId}`,
    });
    const targetName = prospectDisplayName(target.prospect);
    const targetRangeText = formatScoutRange(targetRange);
    const targetGradeText = `Scout grade ${target.prospect.prospectProfile.scoutedGrade} (${gradeToTwentyEighty(target.prospect.prospectProfile.scoutedGrade)})`;
    const targetAgeText = `Age ${target.prospect.age}`;
    const targetTraitCountText = `Traits ${[target.prospect.trait1, target.prospect.trait2].filter(Boolean).length}`;
    const targetRangeMidpoint = (targetRange.low + targetRange.high) / 2;
    const expectedOpeningPrice = formatMoney(surfacedLot.openingAsk);
    const expectedBidAmount = Math.ceil(surfacedLot.openingAsk);
    const expectedSalePrice = formatMoney(expectedBidAmount);
    window.history.pushState({}, "", `/league-builder/farm-auction-draft?leagueId=${LEAGUE_ID}&devSeed=${encodeURIComponent(seed)}`);

    render(<LeagueBuilderFarmAuctionDraft />);

    // TEXTLAW-SWEEP A3 reverse fix: the AuctionStage phase-label pill (also "Farm auction") is now
    // ALWAYS-class content, so this text now renders twice on this page (toolbar chip + stage
    // pill) -- assert presence via getAllByText rather than the single-match getByText.
    expect(screen.getAllByText("Farm auction").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("SEED")).not.toBeInTheDocument();
    expect(screen.queryByText("BID INCREMENT")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /BEGIN FARM AUCTION/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/CPU COUNT/i)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(targetName.toUpperCase())).toBeInTheDocument();
    });

    // FLOORREFIT Move 1: the farm floor inherits the ON THE CLOCK banner identically -- every team
    // in this fixture is human-controlled (makeTeam: controlledBy "human"), so the acting team's
    // turn reads the personal "YOU'RE UP" copy, team-colored (both fixture teams carry valid hex).
    const actingTeam = teams.find((team) => team.id === targetTeamId)!;
    const banner = screen.getByTestId("on-the-clock-banner");
    expect(banner).toHaveTextContent(`YOU'RE UP — ${teamDisplayName(actingTeam).toUpperCase()}`);
    expect(banner.className).toContain("otc-team");

    expect(screen.getByText("On the block · prospect")).toBeInTheDocument();
    expect(screen.queryByLabelText("Position filter")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /SCOUT SORT/i })).not.toBeInTheDocument();
    for (const position of prospectPositions(target.prospect)) {
      expect(screen.getAllByText(position).length).toBeGreaterThan(0);
    }
    expect(screen.getByText(targetAgeText)).toBeInTheDocument();
    expect(screen.getByText(targetTraitCountText)).toBeInTheDocument();
    for (const trait of [target.prospect.trait1, target.prospect.trait2].filter(Boolean)) {
      expect(screen.queryByText(trait!)).not.toBeInTheDocument();
    }
    const scoutReportControl = screen.getByRole("button", { name: "Scout report" });
    expect(scoutReportControl).toBeInTheDocument();
    expect(screen.queryByText((_, node) => node?.textContent === `Scout value ${targetRangeText}`)).not.toBeInTheDocument();
    expect(screen.queryByText((_, node) => node?.textContent === targetGradeText)).not.toBeInTheDocument();
    expect(screen.getByText("OPENING")).toBeInTheDocument();
    expect(screen.getByText(expectedOpeningPrice)).toBeInTheDocument();
    fireEvent.click(scoutReportControl);
    expectTextContent(`Scout value ${targetRangeText}`);
    expectTextContent(targetGradeText);
    expectTextContent(`Grade band ${targetBand.best}-${targetBand.worst}`);
    expectTextContent(`Confidence band ${targetOverallBand}`);
    for (const [tool, band] of Object.entries(targetToolBands)) {
      expect(screen.getByText(`${tool.toUpperCase()} ${band.lower}-${band.upper}`)).toBeInTheDocument();
    }
    // HARDENING (WT-A): the privacy invariant (no raw trait names) must hold in the revealed
    // state too, not just the covered state asserted above -- the scout VM only ever carries
    // bands/grades (LeagueBuilderFarmAuctionDraft.tsx scout VM construction), so revealing the
    // report can never leak a trait name.
    for (const trait of [target.prospect.trait1, target.prospect.trait2].filter(Boolean)) {
      expect(screen.queryByText(trait!)).not.toBeInTheDocument();
    }
    fireEvent.click(scoutReportControl);
    expect(screen.queryByText((_, node) => node?.textContent === `Scout value ${targetRangeText}`)).not.toBeInTheDocument();
    expect(screen.queryByText((_, node) => node?.textContent === targetGradeText)).not.toBeInTheDocument();
    expect(targetRange.low).not.toBe(targetRange.high);
    expect(targetRange.low).toBeLessThanOrEqual(surfacedLot.openingAsk);
    expect(targetRange.high).toBeGreaterThanOrEqual(surfacedLot.openingAsk);
    expect(targetRangeMidpoint).toBeCloseTo(surfacedLot.openingAsk, 10);
    expect(targetRange.displayedEstimate).toBeGreaterThan(targetRange.low);
    expect(targetRange.displayedEstimate).toBeLessThan(targetRange.high);
    expect(screen.queryByText(/True grade|Ratings/i)).not.toBeInTheDocument();
    expect(screen.getByText("Most you can bid")).toBeInTheDocument();
    expect(screen.getByText("Slots left")).toBeInTheDocument();
    expect(screen.getByText("PRIORITY GAPS")).toBeInTheDocument();
    // COCKPIT W1d: the bridge headline (always-visible, zero taps) now ALSO promotes this same
    // team-conditioned gap text, so the SS-gap phrase legitimately appears twice on the page.
    expect(screen.getAllByText(/SS coverage below target/).length).toBeGreaterThan(0);
    const bridgeStrip = screen.getByTestId("whisper-farm-bridge");
    expect(bridgeStrip).toHaveTextContent(/Board flags:/);
    expect(bridgeStrip).toHaveTextContent(/coverage below target/);

    // P4: Assistant-GM whisper on the farm lot -- team-a is the human seat on the clock right
    // now (OPEN_BIDDING, pre-BID), so the panel must be live, not the dormant "WAITING ON THE
    // TABLE" state (today's bug: the farm page never threads a whisperPayload at all).
    const whisperStrip = screen.getByTestId("whisper-strip");
    expect(whisperStrip).not.toBeDisabled();
    fireEvent.click(whisperStrip);
    const whisperBody = screen.getByTestId("whisper-body");
    expect(whisperBody).toBeInTheDocument();
    // A real, classified verdict rendered (push/cap/pass) -- not blank, not fabricated.
    const verdictEl = document.querySelector(".whisper-verdict");
    expect(verdictEl).not.toBeNull();
    expect((verdictEl?.textContent ?? "").length).toBeGreaterThan(0);
    expect(verdictEl?.className ?? "").toMatch(/\b(push|cap|pass)\b/);
    // MAX BID (the liquidity-adjusted ceiling) renders, band-derived from the scout read.
    expect(within(whisperBody).getByText("MAX BID")).toBeInTheDocument();
    // COCKPIT W1d: Budget AND SHAPE are both real reads now (SHAPE un-stubs once the seat's MLB
    // roster resolves -- team-a's fixture roster here is missing SS/CF/RF and carries no
    // pitchers, so shapeLight correctly reads it as an incomplete/illegal roster, i.e. 'red', not
    // the old 'unknown' stub). IDENTITY/CHEMISTRY are DELETED from the farm light row entirely.
    expect(within(whisperBody).getByRole("button", { name: "BUDGET" })).not.toHaveAttribute("data-status", "unknown");
    expect(within(whisperBody).getByRole("button", { name: "SHAPE" })).not.toHaveAttribute("data-status", "unknown");
    expect(within(whisperBody).getByRole("button", { name: "SHAPE" })).toHaveAttribute("data-status", "red");
    expect(within(whisperBody).queryByRole("button", { name: "IDENTITY" })).not.toBeInTheDocument();
    expect(within(whisperBody).queryByRole("button", { name: "CHEMISTRY" })).not.toBeInTheDocument();
    // COCKPIT W1d item 4(i), REWORKED per the audit's fog-law finding: the farm board's ranking
    // AND display key must be `range.displayedEstimate` (the seeded, jittered, fog-CARRYING scout
    // point estimate) -- NEVER the band midpoint, because archetypeBandValueRange builds the band
    // SYMMETRIC around the true opening ask, so (low+high)/2 === lotOpeningAsk === a pure
    // function of TRUE IV (the exact leak the audit proved algebraically).
    const farmBoard = within(whisperBody).getByTestId("whisper-board");
    expect(farmBoard).not.toHaveTextContent("The board's bare");
    expect(farmBoard.textContent).toMatch(/\d+ NAMES LEFT/);
    // Recompute the board exactly the way the page does (same seeds, same team lens).
    const expectedBoard = baseCandidates
      .filter(({ candidate }) => candidate.playerId !== surfacedLot.playerId)
      .map(({ candidate, prospect }) => {
        const openingAsk = lotOpeningAsk(candidate, surfaced.config);
        const overallBand = scoutOverallBandForPosition(
          prospect.primaryPosition as DraftPosition,
          targetFarmArchetypeKey,
          prospectRatingsOf(prospect),
        );
        const range = archetypeBandValueRange(
          openingAsk,
          overallBand,
          `${targetSessionSeed}:value-band:${prospect.id}:${targetTeamId}`,
        );
        return { prospect, openingAsk, range, midpoint: (range.low + range.high) / 2 };
      })
      .sort((a, b) => b.range.displayedEstimate - a.range.displayedEstimate);
    // Expand the full board so every row is rendered for the assertions below.
    fireEvent.click(within(farmBoard).getByRole("button", { name: "FULL BOARD" }));
    const boardRows = Array.from(farmBoard.querySelectorAll(".whisper-board-row"));
    expect(boardRows.length).toBe(expectedBoard.length);
    // (a) Seeded-fixture lock: the top-ranked row's rendered worth IS the displayedEstimate.
    expect(boardRows[0].querySelector(".whisper-board-name")?.textContent).toBe(
      prospectDisplayName(expectedBoard[0].prospect),
    );
    expect(boardRows[0].querySelector(".whisper-worth")?.textContent).toBe(
      formatMoney(expectedBoard[0].range.displayedEstimate),
    );
    // (b) Adversarial midpoint lock: pick a uniquely-named fixture whose ROUNDED displayedEstimate
    // and midpoint diverge, and prove the rendered figure equals the former and differs from the
    // latter -- if anyone regresses worth back to the midpoint, this fails. Also prove the
    // midpoint IS the true anchor this lock guards against (midpoint === lotOpeningAsk).
    const nameCounts = new Map<string, number>();
    for (const entry of expectedBoard) {
      const name = prospectDisplayName(entry.prospect);
      nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
    }
    const divergent = expectedBoard.find((entry) =>
      Math.round(entry.range.displayedEstimate) !== Math.round(entry.midpoint) &&
      nameCounts.get(prospectDisplayName(entry.prospect)) === 1,
    );
    expect(divergent).toBeDefined();
    expect(divergent!.midpoint).toBeCloseTo(divergent!.openingAsk, 6);
    const divergentRow = boardRows.find((row) =>
      row.querySelector(".whisper-board-name")?.textContent === prospectDisplayName(divergent!.prospect),
    );
    expect(divergentRow).toBeDefined();
    const divergentWorthText = divergentRow!.querySelector(".whisper-worth")?.textContent;
    expect(divergentWorthText).toBe(formatMoney(divergent!.range.displayedEstimate));
    expect(divergentWorthText).not.toBe(formatMoney(divergent!.midpoint));
    // Close it back up before continuing the existing flow below.
    fireEvent.click(whisperStrip);

    fireEvent.click(screen.getByRole("button", { name: /BID/i }));
    await waitFor(() => {
      expect(screen.getByText(/Farm Keys — raise or pass/)).toBeInTheDocument();
    });
    fireEvent.click(await screen.findByRole("button", { name: /Let prospect go/i }));

    await waitFor(() => {
      expect(screen.getByText("SOLD")).toBeInTheDocument();
    });

    // CALLFIX Item 3: the log row's headline name is now popover-wrapped (a separate element from
    // the trailing "SOLD to ... for $X" text), so the sentence is split across sibling nodes --
    // match on full element.textContent (a custom function matcher) instead of the default
    // direct-child-text-only matcher, per testing-library's own guidance for this case.
    expect(
      screen.getAllByText((_content, element) =>
        (element?.textContent ?? "").includes(`${targetName} SOLD to Farm Caps for ${expectedSalePrice}`),
      ).length,
    ).toBeGreaterThan(0);

    // WT-D: the just-won prospect's name on the farm roster board must now open the profile
    // popover -- but since ratingRevealState stays 'hidden' pre-call-up, it must show scout bands
    // only, never the true ratings grid or the raw trait names (same privacy invariant already
    // asserted above for the on-the-block card). Farm Caps (team-a) is the roster-board focus
    // once the auction settles back to no-active-bidder, and this prospect is its only entry, so
    // its slot testid is deterministic: farm-1-<prospectId>.
    const wonSlot = screen.getByTestId(`auction-board-slot-farm-1-${target.prospect.id}`);
    fireEvent.click(within(wonSlot).getByRole("button", { name: targetName }));

    expect(await screen.findByText("Farm - scouting only")).toBeInTheDocument();
    expect(screen.queryByText("POW")).not.toBeInTheDocument();
    for (const trait of [target.prospect.trait1, target.prospect.trait2].filter(Boolean)) {
      expect(screen.queryByText(trait!)).not.toBeInTheDocument();
    }
  });
});

describe("buildFarmBridgeHeadline — COCKPIT W1d rework (audit note (h))", () => {
  const gaps = [
    { id: "g1", severity: "high", label: "SS coverage below target" },
    { id: "g2", severity: "warn", label: "Bullpen coverage is thin" },
  ];

  test("renders the team-conditioned headline only when the gaps' source team IS the whisper seat", () => {
    expect(buildFarmBridgeHeadline(gaps, "team-a", "team-a")).toBe(
      "Board flags: SS coverage below target · Bullpen coverage is thin — work the farm floor there first.",
    );
    // RESOLVE-state transient: rosterBoardTeamState (human fallback) != pendingClaim seat --
    // another club's gaps must never render in the seat's private whisper.
    expect(buildFarmBridgeHeadline(gaps, "team-a", "team-b")).toBeNull();
    expect(buildFarmBridgeHeadline(gaps, null, "team-a")).toBeNull();
    expect(buildFarmBridgeHeadline(gaps, "team-a", null)).toBeNull();
    // Anti-generic law: no gaps, no headline -- never a generic fallback sentence.
    expect(buildFarmBridgeHeadline([], "team-a", "team-a")).toBeNull();
  });
});
