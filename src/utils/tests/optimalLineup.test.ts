import { describe, expect, test } from "vitest";

import {
  buildLineupSnapshotFromSlots,
  buildOptimalLineupSnapshot,
  cloneGameLockLineupSnapshots,
  confirmEngineOptimalLineupSnapshot,
  formatLineupSnapshotSlot,
  formatOptimalLineupBenchmarkStatus,
  getOptimalLineupBenchmarkStatus,
  isOfficialOptimalLineupSnapshot,
  markOptimalLineupSnapshotStale,
  markOptimalLineupSnapshotsStaleForChange,
  mapLineupSnapshotDeviations,
  optimalLineupField,
  selectOptimalLineupForOpposingPitcher,
  summarizeLineupSnapshotComparison,
} from "../optimalLineup";
import type { OptimalLineupCandidate } from "../optimalLineup";

const candidates: OptimalLineupCandidate[] = [
  {
    playerId: "elite-ss",
    playerName: "Elite Shortstop",
    bats: "R",
    primaryPosition: "SS",
    power: 80,
    contact: 85,
    speed: 70,
    fielding: 92,
    arm: 88,
  },
  {
    playerId: "bench-cf",
    playerName: "Bench Center",
    bats: "L",
    primaryPosition: "CF",
    power: 72,
    contact: 78,
    speed: 84,
    fielding: 88,
    arm: 82,
  },
  {
    playerId: "starter-cf",
    playerName: "Starter Center",
    bats: "R",
    primaryPosition: "CF",
    power: 42,
    contact: 48,
    speed: 55,
    fielding: 55,
    arm: 52,
  },
  {
    playerId: "catcher",
    playerName: "Catcher",
    bats: "S",
    primaryPosition: "C",
    power: 50,
    contact: 55,
    speed: 30,
    fielding: 82,
    arm: 78,
  },
  {
    playerId: "first-base",
    playerName: "First Base",
    bats: "L",
    primaryPosition: "1B",
    power: 76,
    contact: 64,
    speed: 34,
    fielding: 55,
    arm: 45,
  },
  {
    playerId: "second-base",
    playerName: "Second Base",
    bats: "R",
    primaryPosition: "2B",
    power: 50,
    contact: 70,
    speed: 68,
    fielding: 78,
    arm: 70,
  },
  {
    playerId: "third-base",
    playerName: "Third Base",
    bats: "R",
    primaryPosition: "3B",
    power: 65,
    contact: 60,
    speed: 45,
    fielding: 65,
    arm: 72,
  },
  {
    playerId: "left-field",
    playerName: "Left Field",
    bats: "L",
    primaryPosition: "LF",
    power: 68,
    contact: 62,
    speed: 60,
    fielding: 60,
    arm: 58,
  },
  {
    playerId: "right-field",
    playerName: "Right Field",
    bats: "R",
    primaryPosition: "RF",
    power: 58,
    contact: 66,
    speed: 62,
    fielding: 64,
    arm: 68,
  },
  {
    playerId: "pitcher",
    playerName: "Pitcher",
    primaryPosition: "SP",
    power: 15,
    contact: 20,
  },
];

describe("optimal lineup engine", () => {
  test("builds deterministic whole-roster snapshots and excludes pitchers", () => {
    const snapshot = buildOptimalLineupSnapshot({
      teamId: "team-a",
      mode: "exhibition",
      opposingPitcherHand: "R",
      candidates,
      dhEnabled: true,
      generatedAt: 100,
      generatedFrom: "league_builder",
      sourceConfidence: "engine_calculated",
    });

    expect(snapshot.algorithmVersion).toBe("kbl-optimal-lineup-v2-greedy-traits-1");
    expect(snapshot.slots).toHaveLength(9);
    expect(snapshot.slots.some((slot) => slot.playerId === "pitcher")).toBe(false);
    expect(snapshot.slots.some((slot) => slot.playerId === "bench-cf")).toBe(true);
  });

  test("uses SMB trait context when selecting hand-specific optimal lineups", () => {
    const fielders: OptimalLineupCandidate[] = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"].map((position) => ({
      playerId: `fielder-${position}`,
      playerName: `Fielder ${position}`,
      bats: "S",
      primaryPosition: position,
      power: 70,
      contact: 70,
      speed: 60,
      fielding: 72,
      arm: 72,
    }));
    const traitCandidates: OptimalLineupCandidate[] = [
      ...fielders,
      {
        playerId: "splits-hitter",
        playerName: "Splits Hitter",
        bats: "R",
        primaryPosition: "DH",
        power: 64,
        contact: 64,
        speed: 50,
        trait1: "CON vs RHP",
      },
      {
        playerId: "neutral-hitter",
        playerName: "Neutral Hitter",
        bats: "R",
        primaryPosition: "DH",
        power: 66,
        contact: 66,
        speed: 50,
      },
    ];

    const vsRhp = buildOptimalLineupSnapshot({
      teamId: "team-a",
      mode: "exhibition",
      opposingPitcherHand: "R",
      candidates: traitCandidates,
      dhEnabled: true,
      generatedAt: 100,
      generatedFrom: "league_builder",
      sourceConfidence: "engine_calculated",
    });
    const vsLhp = buildOptimalLineupSnapshot({
      teamId: "team-a",
      mode: "exhibition",
      opposingPitcherHand: "L",
      candidates: traitCandidates,
      dhEnabled: true,
      generatedAt: 101,
      generatedFrom: "league_builder",
      sourceConfidence: "engine_calculated",
    });

    expect(vsRhp.slots.find((slot) => slot.defensivePosition === "DH")?.playerId).toBe("splits-hitter");
    expect(vsLhp.slots.find((slot) => slot.defensivePosition === "DH")?.playerId).toBe("neutral-hitter");
  });

  test("maps chosen lineup deviations without double-using chosen or optimal slots", () => {
    const optimal = buildOptimalLineupSnapshot({
      teamId: "team-a",
      mode: "exhibition",
      opposingPitcherHand: "R",
      candidates,
      dhEnabled: false,
      generatedAt: 100,
      generatedFrom: "game_lock",
      sourceConfidence: "engine_calculated",
    });
    const chosen = buildLineupSnapshotFromSlots({
      teamId: "team-a",
      mode: "exhibition",
      opposingPitcherHand: "R",
      candidates,
      dhEnabled: false,
      generatedAt: 100,
      slots: [
        { playerId: "starter-cf", playerName: "Starter Center", battingOrderSlot: 1, defensivePosition: "CF" },
        { playerId: "elite-ss", playerName: "Elite Shortstop", battingOrderSlot: 2, defensivePosition: "SS" },
        { playerId: "catcher", playerName: "Catcher", battingOrderSlot: 3, defensivePosition: "C" },
        { playerId: "first-base", playerName: "First Base", battingOrderSlot: 4, defensivePosition: "1B" },
        { playerId: "second-base", playerName: "Second Base", battingOrderSlot: 5, defensivePosition: "2B" },
        { playerId: "third-base", playerName: "Third Base", battingOrderSlot: 6, defensivePosition: "3B" },
        { playerId: "left-field", playerName: "Left Field", battingOrderSlot: 7, defensivePosition: "LF" },
        { playerId: "right-field", playerName: "Right Field", battingOrderSlot: 8, defensivePosition: "RF" },
      ],
    });

    const deviations = mapLineupSnapshotDeviations({ chosen, optimal });
    const chosenKeys = new Set(
      deviations.map((deviation) => `${deviation.chosenSlot.playerId}:${deviation.chosenSlot.battingOrderSlot}`),
    );
    const optimalKeys = new Set(
      deviations.map((deviation) => `${deviation.optimalSlot.playerId}:${deviation.optimalSlot.battingOrderSlot}`),
    );

    expect(deviations.length).toBeGreaterThan(0);
    expect(chosenKeys.size).toBe(deviations.length);
    expect(optimalKeys.size).toBe(deviations.length);
  });

  test("pairs lineup deviations by largest projected opportunity cost first", () => {
    const pairCandidates: OptimalLineupCandidate[] = [
      { playerId: "chosen-low", playerName: "Chosen Low", primaryPosition: "SS" },
      { playerId: "chosen-mid", playerName: "Chosen Mid", primaryPosition: "CF" },
      { playerId: "optimal-high", playerName: "Optimal High", primaryPosition: "SS" },
      { playerId: "optimal-near", playerName: "Optimal Near", primaryPosition: "CF" },
    ];
    const chosen = buildLineupSnapshotFromSlots({
      teamId: "team-a",
      mode: "exhibition",
      opposingPitcherHand: "R",
      candidates: pairCandidates,
      dhEnabled: false,
      generatedAt: 100,
      slots: [
        { playerId: "chosen-low", playerName: "Chosen Low", battingOrderSlot: 1, defensivePosition: "SS" },
        { playerId: "chosen-mid", playerName: "Chosen Mid", battingOrderSlot: 2, defensivePosition: "CF" },
      ],
    });
    const optimal = buildLineupSnapshotFromSlots({
      teamId: "team-a",
      mode: "exhibition",
      opposingPitcherHand: "R",
      candidates: pairCandidates,
      dhEnabled: false,
      generatedAt: 100,
      slots: [
        { playerId: "optimal-high", playerName: "Optimal High", battingOrderSlot: 1, defensivePosition: "SS" },
        { playerId: "optimal-near", playerName: "Optimal Near", battingOrderSlot: 2, defensivePosition: "CF" },
      ],
    });
    const chosenWithScores = {
      ...chosen,
      slots: chosen.slots.map((slot) => ({
        ...slot,
        projectedSlotKblWpa: slot.playerId === "chosen-low" ? 0 : 0.04,
      })),
    };
    const optimalWithScores = {
      ...optimal,
      slots: optimal.slots.map((slot) => ({
        ...slot,
        projectedSlotKblWpa: slot.playerId === "optimal-high" ? 0.1 : 0.05,
      })),
    };

    const deviations = mapLineupSnapshotDeviations({
      chosen: chosenWithScores,
      optimal: optimalWithScores,
    });

    expect(deviations[0]).toMatchObject({
      chosenSlot: expect.objectContaining({ playerId: "chosen-low" }),
      optimalSlot: expect.objectContaining({ playerId: "optimal-high" }),
      projectedOpportunityCost: -0.1,
    });
  });

  test("summarizes current-vs-optimal lineup comparisons for pregame preview", () => {
    const optimal = buildOptimalLineupSnapshot({
      teamId: "team-a",
      mode: "exhibition",
      opposingPitcherHand: "R",
      candidates,
      dhEnabled: false,
      generatedAt: 100,
      generatedFrom: "league_builder",
      sourceConfidence: "engine_calculated",
    });
    const chosen = buildLineupSnapshotFromSlots({
      teamId: "team-a",
      mode: "exhibition",
      opposingPitcherHand: "R",
      candidates,
      dhEnabled: false,
      generatedAt: 101,
      slots: [
        { playerId: "starter-cf", playerName: "Starter Center", battingOrderSlot: 1, defensivePosition: "CF" },
        { playerId: "elite-ss", playerName: "Elite Shortstop", battingOrderSlot: 2, defensivePosition: "SS" },
        { playerId: "catcher", playerName: "Catcher", battingOrderSlot: 3, defensivePosition: "C" },
        { playerId: "first-base", playerName: "First Base", battingOrderSlot: 4, defensivePosition: "1B" },
        { playerId: "second-base", playerName: "Second Base", battingOrderSlot: 5, defensivePosition: "2B" },
        { playerId: "third-base", playerName: "Third Base", battingOrderSlot: 6, defensivePosition: "3B" },
        { playerId: "left-field", playerName: "Left Field", battingOrderSlot: 7, defensivePosition: "LF" },
        { playerId: "right-field", playerName: "Right Field", battingOrderSlot: 8, defensivePosition: "RF" },
      ],
    });

    const comparison = summarizeLineupSnapshotComparison({ chosen, optimal });

    expect(comparison.deviations.length).toBeGreaterThan(0);
    expect(comparison.projectedOpportunityCostTotal).toBe(
      chosen.projectedTeamLineupKblWpa - optimal.projectedTeamLineupKblWpa,
    );
    expect(formatLineupSnapshotSlot(comparison.deviations[0].chosenSlot)).toMatch(/^#\d+ /);
  });

  test("marks user-registered optimal snapshots stale instead of deleting them", () => {
    const userRegistered = buildLineupSnapshotFromSlots({
      teamId: "team-a",
      mode: "exhibition",
      opposingPitcherHand: "R",
      candidates,
      dhEnabled: true,
      generatedAt: 200,
      generatedFrom: "user_registered_smb4_optimal",
      sourceConfidence: "user_registered",
      slots: [
        { playerId: "elite-ss", playerName: "Elite Shortstop", battingOrderSlot: 1, defensivePosition: "SS" },
      ],
    });

    const next = markOptimalLineupSnapshotsStaleForChange(
      { optimalLineupVsRHPWithDH: userRegistered },
      ["optimalLineupVsRHPWithDH"],
    );

    expect(next.optimalLineupVsRHPWithDH?.snapshotId).toBe(userRegistered.snapshotId);
    expect(next.optimalLineupVsRHPWithDH?.slots).toEqual(userRegistered.slots);
    expect(next.optimalLineupVsRHPWithDH?.sourceConfidence).toBe("stale_roster");
    expect(next.optimalLineupVsRHPWithDH?.confidence).toBe("low");
  });

  test("classifies official, display-only, and stale optimal benchmarks", () => {
    const engineFallback = buildOptimalLineupSnapshot({
      teamId: "team-a",
      mode: "exhibition",
      opposingPitcherHand: "R",
      candidates,
      dhEnabled: true,
      generatedAt: 210,
      generatedFrom: "game_lock",
      sourceConfidence: "fallback",
    });
    const confirmedEngine = confirmEngineOptimalLineupSnapshot(
      buildOptimalLineupSnapshot({
        teamId: "team-a",
        mode: "exhibition",
        opposingPitcherHand: "R",
        candidates,
        dhEnabled: true,
        generatedAt: 211,
        generatedFrom: "league_builder",
        sourceConfidence: "engine_calculated",
      }),
    );
    const stale = markOptimalLineupSnapshotStale(confirmedEngine);

    expect(isOfficialOptimalLineupSnapshot(engineFallback)).toBe(false);
    expect(getOptimalLineupBenchmarkStatus(engineFallback)).toBe("display_only");
    expect(isOfficialOptimalLineupSnapshot(confirmedEngine)).toBe(true);
    expect(formatOptimalLineupBenchmarkStatus(confirmedEngine)).toBe("confirmed engine optimal");
    expect(getOptimalLineupBenchmarkStatus(stale)).toBe("stale");
    expect(formatOptimalLineupBenchmarkStatus(stale)).toBe("needs confirmation/recalculation");
  });

  test("does not confirm game-lock snapshots as official optimal benchmarks", () => {
    const gameLock = buildOptimalLineupSnapshot({
      teamId: "team-a",
      mode: "exhibition",
      opposingPitcherHand: "R",
      candidates,
      dhEnabled: true,
      generatedAt: 212,
      generatedFrom: "game_lock",
      sourceConfidence: "engine_calculated",
    });

    const confirmed = confirmEngineOptimalLineupSnapshot(gameLock);

    expect(confirmed).toBe(gameLock);
    expect(confirmed.generatedFrom).toBe("game_lock");
    expect(confirmed.sourceConfidence).not.toBe("user_confirmed_engine");
    expect(isOfficialOptimalLineupSnapshot(confirmed)).toBe(false);
  });

  test("does not confirm fallback snapshots as official optimal benchmarks", () => {
    const fallback = buildOptimalLineupSnapshot({
      teamId: "team-a",
      mode: "exhibition",
      opposingPitcherHand: "R",
      candidates,
      dhEnabled: true,
      generatedAt: 213,
      generatedFrom: "team_hub",
      sourceConfidence: "fallback",
    });

    const confirmed = confirmEngineOptimalLineupSnapshot(fallback);

    expect(confirmed).toBe(fallback);
    expect(confirmed.sourceConfidence).toBe("fallback");
    expect(isOfficialOptimalLineupSnapshot(confirmed)).toBe(false);
  });

  test("does not confirm stale snapshots without recalculation", () => {
    const stale = markOptimalLineupSnapshotStale(
      buildOptimalLineupSnapshot({
        teamId: "team-a",
        mode: "exhibition",
        opposingPitcherHand: "R",
        candidates,
        dhEnabled: true,
        generatedAt: 214,
        generatedFrom: "team_hub",
        sourceConfidence: "engine_calculated",
      }),
    );

    expect(stale).toBeDefined();
    const confirmed = confirmEngineOptimalLineupSnapshot(stale!);

    expect(confirmed).toBe(stale);
    expect(confirmed.sourceConfidence).toBe("stale_roster");
    expect(isOfficialOptimalLineupSnapshot(confirmed)).toBe(false);
  });

  test("confirms valid pregame recalculated engine snapshots as official benchmarks", () => {
    const recalculated = buildOptimalLineupSnapshot({
      teamId: "team-a",
      mode: "exhibition",
      opposingPitcherHand: "R",
      candidates,
      dhEnabled: true,
      generatedAt: 215,
      generatedFrom: "pregame_recalculate",
      sourceConfidence: "engine_calculated",
    });

    const confirmed = confirmEngineOptimalLineupSnapshot(recalculated);

    expect(confirmed).not.toBe(recalculated);
    expect(confirmed.generatedFrom).toBe("pregame_recalculate");
    expect(confirmed.sourceConfidence).toBe("user_confirmed_engine");
    expect(isOfficialOptimalLineupSnapshot(confirmed)).toBe(true);
  });

  test("preserves a freshly recalculated field while staling affected lineup context", () => {
    const oldRhp = buildOptimalLineupSnapshot({
      teamId: "team-a",
      mode: "exhibition",
      opposingPitcherHand: "R",
      candidates,
      dhEnabled: true,
      generatedAt: 100,
      generatedFrom: "league_builder",
      sourceConfidence: "engine_calculated",
    });
    const freshLhp = buildOptimalLineupSnapshot({
      teamId: "team-a",
      mode: "exhibition",
      opposingPitcherHand: "L",
      candidates,
      dhEnabled: true,
      generatedAt: 200,
      generatedFrom: "league_builder",
      sourceConfidence: "engine_calculated",
    });

    const next = markOptimalLineupSnapshotsStaleForChange(
      {
        optimalLineupVsRHPWithDH: oldRhp,
        optimalLineupVsLHPWithDH: freshLhp,
      },
      ["optimalLineupVsRHPWithDH", "optimalLineupVsLHPWithDH"],
      ["optimalLineupVsLHPWithDH"],
    );

    expect(next.optimalLineupVsRHPWithDH?.sourceConfidence).toBe("stale_roster");
    expect(next.optimalLineupVsLHPWithDH).toBe(freshLhp);
    expect(optimalLineupField("L", true)).toBe("optimalLineupVsLHPWithDH");
  });

  test("selects the game-lock benchmark based on opposing starter hand", () => {
    const rhp = buildOptimalLineupSnapshot({
      teamId: "team-a",
      mode: "franchise",
      opposingPitcherHand: "R",
      candidates,
      dhEnabled: true,
      generatedAt: 100,
      generatedFrom: "team_hub",
      sourceConfidence: "engine_calculated",
    });
    const lhp = buildOptimalLineupSnapshot({
      teamId: "team-a",
      mode: "franchise",
      opposingPitcherHand: "L",
      candidates,
      dhEnabled: true,
      generatedAt: 200,
      generatedFrom: "team_hub",
      sourceConfidence: "engine_calculated",
    });

    expect(selectOptimalLineupForOpposingPitcher({ vsRHP: rhp, vsLHP: lhp }, { throwingHand: "L" })).toBe(lhp);
    expect(selectOptimalLineupForOpposingPitcher({ vsRHP: rhp, vsLHP: lhp }, { throwingHand: "R" })).toBe(rhp);
  });

  test("clones game-lock snapshots so launch snapshots stay immutable", () => {
    const snapshot = buildOptimalLineupSnapshot({
      teamId: "team-a",
      mode: "franchise",
      opposingPitcherHand: "R",
      candidates,
      dhEnabled: true,
      generatedAt: 300,
      generatedFrom: "team_hub",
      sourceConfidence: "engine_calculated",
    });

    const cloned = cloneGameLockLineupSnapshots({ away: snapshot });
    snapshot.slots[0] = { ...snapshot.slots[0], playerName: "Mutated Later" };

    expect(cloned.away).not.toBe(snapshot);
    expect(cloned.away?.slots[0].playerName).not.toBe("Mutated Later");
  });
});
