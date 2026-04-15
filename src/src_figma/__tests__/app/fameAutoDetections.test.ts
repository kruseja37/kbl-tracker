import { describe, expect, test } from "vitest";

import type { AtBatEvent, RunnerState } from "../../../utils/eventLog";
import {
  createSaveAppearanceSnapshot,
  detectBackToBackHREvents,
  detectBlownSaveEvent,
  detectTootblanEvent,
  detectTriplePlayEvents,
  detectWalkOffHREvent,
  updateSaveAppearanceSnapshot,
} from "../../app/engines/fameAutoDetections";

function createRunnerState(
  overrides: Partial<RunnerState> = {},
): RunnerState {
  return {
    first: null,
    second: null,
    third: null,
    ...overrides,
  };
}

function createAtBatFixture(
  overrides: Partial<AtBatEvent> = {},
): AtBatEvent {
  return {
    eventId: "game-1_1",
    gameId: "game-1",
    eventIndex: 1,
    timestamp: 1,
    batterId: "batter-1",
    batterName: "Batter One",
    batterTeamId: "away-team",
    pitcherId: "pitcher-1",
    pitcherName: "Pitcher One",
    pitcherTeamId: "home-team",
    result: "GO",
    rbiCount: 0,
    runsScored: 0,
    inning: 7,
    halfInning: "TOP",
    outs: 0,
    runners: createRunnerState(),
    awayScore: 2,
    homeScore: 3,
    outsAfter: 1,
    runnersAfter: createRunnerState(),
    awayScoreAfter: 2,
    homeScoreAfter: 3,
    leverageIndex: 1.2,
    winProbabilityBefore: 0.5,
    winProbabilityAfter: 0.45,
    wpa: -0.05,
    ballInPlay: null,
    fameEvents: [],
    isLeadoff: false,
    isClutch: false,
    isWalkOff: false,
    ...overrides,
  };
}

describe("fameAutoDetections", () => {
  describe("detectTriplePlayEvents", () => {
    test("fires TRIPLE_PLAY for each defender on a three-out play", () => {
      const triplePlay = createAtBatFixture({
        eventId: "game-1_40",
        result: "TP",
        outs: 0,
        outsAfter: 3,
        outsRecorded: 3,
        enrichment: {
          fieldingSequence: [5, 4, 3],
          assists: [5, 4],
          putouts: [4, 3],
        },
      });

      const events = detectTriplePlayEvents(triplePlay, {
        3: { playerId: "first", playerName: "First Baseman" },
        4: { playerId: "second", playerName: "Second Baseman" },
        5: { playerId: "third", playerName: "Third Baseman" },
      });

      expect(events).toHaveLength(3);
      expect(events.map((event) => event.eventType)).toEqual([
        "TRIPLE_PLAY",
        "TRIPLE_PLAY",
        "TRIPLE_PLAY",
      ]);
      expect(events.map((event) => event.playerId).sort()).toEqual([
        "first",
        "second",
        "third",
      ]);
    });

    test("does not fire when the play records fewer than three outs", () => {
      const ordinaryOut = createAtBatFixture({
        result: "GO",
        outs: 0,
        outsAfter: 2,
        outsRecorded: 2,
        enrichment: {
          fieldingSequence: [6, 4, 3],
        },
      });

      expect(
        detectTriplePlayEvents(ordinaryOut, {
          3: { playerId: "first", playerName: "First Baseman" },
          4: { playerId: "second", playerName: "Second Baseman" },
          6: { playerId: "short", playerName: "Shortstop" },
        }),
      ).toEqual([]);
    });
  });

  describe("detectBlownSaveEvent", () => {
    test("fires BLOWN_SAVE when a save opportunity lead is lost and the team still wins", () => {
      const started = createSaveAppearanceSnapshot(
        "pitcher-9",
        "Closer Nine",
        {
          inning: 9,
          halfInning: "TOP",
          outs: 0,
          bases: { first: false, second: false, third: false },
          score: { away: 2, home: 4 },
          scheduledInnings: 9,
          teamSide: "home",
        },
      );

      const updated = updateSaveAppearanceSnapshot(started, {
        inning: 9,
        halfInning: "TOP",
        score: { away: 4, home: 4 },
        scheduledInnings: 9,
        additionalRuns: 2,
        leverageIndex: 3.4,
      });

      expect(detectBlownSaveEvent(updated, true)).toMatchObject({
        eventType: "BLOWN_SAVE",
        playerId: "pitcher-9",
        inning: 9,
        halfInning: "TOP",
        leverageIndex: 3.4,
      });
    });

    test("does not fire when the pitcher keeps the lead intact", () => {
      const started = createSaveAppearanceSnapshot(
        "pitcher-9",
        "Closer Nine",
        {
          inning: 9,
          halfInning: "TOP",
          outs: 0,
          bases: { first: false, second: false, third: false },
          score: { away: 2, home: 4 },
          scheduledInnings: 9,
          teamSide: "home",
        },
      );

      const updated = updateSaveAppearanceSnapshot(started, {
        inning: 9,
        halfInning: "TOP",
        score: { away: 3, home: 4 },
        scheduledInnings: 9,
        additionalRuns: 1,
        leverageIndex: 2.1,
      });

      expect(detectBlownSaveEvent(updated, true)).toBeNull();
    });
  });

  describe("detectTootblanEvent", () => {
    test("fires TOOTBLAN_RALLY_KILLER for an objective pickoff that ends a scoring threat", () => {
      const events = detectTootblanEvent({
        runnerId: "runner-2",
        runnerName: "Runner Two",
        inning: 8,
        halfInning: "TOP",
        leverageIndex: 2.7,
        outsBefore: 2,
        basesBefore: {
          first: false,
          second: true,
          third: false,
        },
        source: "pickoff",
      });

      expect(events).toEqual([
        expect.objectContaining({
          eventType: "TOOTBLAN_RALLY_KILLER",
          playerId: "runner-2",
          leverageIndex: 2.7,
        }),
      ]);
    });

    test("does not auto-fire for caught stealing without objective context", () => {
      expect(
        detectTootblanEvent({
          runnerId: "runner-2",
          runnerName: "Runner Two",
          inning: 8,
          halfInning: "TOP",
          outsBefore: 1,
          basesBefore: {
            first: true,
            second: false,
            third: false,
          },
          source: "caught_stealing",
        }),
      ).toEqual([]);
    });
  });

  describe("detectBackToBackHREvents", () => {
    test("fires BACK_TO_BACK_HR for both batters after consecutive homers", () => {
      const previousAtBat = createAtBatFixture({
        eventId: "game-1_54",
        eventIndex: 54,
        result: "HR",
        batterId: "slugger-1",
        batterName: "Slugger One",
        batterTeamId: "away-team",
        inning: 8,
        halfInning: "TOP",
        leverageIndex: 1.8,
      });
      const currentAtBat = createAtBatFixture({
        eventId: "game-1_55",
        eventIndex: 55,
        result: "HR",
        batterId: "slugger-2",
        batterName: "Slugger Two",
        batterTeamId: "away-team",
        inning: 8,
        halfInning: "TOP",
        leverageIndex: 1.9,
      });

      const events = detectBackToBackHREvents(currentAtBat, previousAtBat);

      expect(events).toHaveLength(2);
      expect(events.map((event) => event.eventType)).toEqual([
        "BACK_TO_BACK_HR",
        "BACK_TO_BACK_HR",
      ]);
      expect(events.map((event) => event.playerId)).toEqual([
        "slugger-1",
        "slugger-2",
      ]);
    });

    test("does not fire when the homers are not consecutive by different batters", () => {
      const previousAtBat = createAtBatFixture({
        eventId: "game-1_54",
        eventIndex: 54,
        result: "HR",
        batterId: "slugger-1",
        batterName: "Slugger One",
        batterTeamId: "away-team",
        inning: 8,
        halfInning: "TOP",
      });
      const currentAtBat = createAtBatFixture({
        eventId: "game-1_55",
        eventIndex: 55,
        result: "HR",
        batterId: "slugger-1",
        batterName: "Slugger One",
        batterTeamId: "away-team",
        inning: 8,
        halfInning: "TOP",
      });

      expect(detectBackToBackHREvents(currentAtBat, previousAtBat)).toEqual(
        [],
      );
    });
  });

  describe("detectWalkOffHREvent", () => {
    test("fires WALK_OFF_HR for a bottom-of-ninth homer that ends the game", () => {
      const walkOff = createAtBatFixture({
        eventId: "game-1_72",
        eventIndex: 72,
        batterId: "hero-1",
        batterName: "Hero One",
        batterTeamId: "home-team",
        pitcherTeamId: "away-team",
        result: "HR",
        inning: 9,
        halfInning: "BOTTOM",
        isWalkOff: true,
        leverageIndex: 4.2,
      });

      expect(detectWalkOffHREvent(walkOff, 9)).toEqual([
        expect.objectContaining({
          eventType: "WALK_OFF_HR",
          playerId: "hero-1",
          leverageIndex: 4.2,
        }),
      ]);
    });

    test("does not fire for a non-walk-off homer", () => {
      const ordinaryHomer = createAtBatFixture({
        result: "HR",
        inning: 9,
        halfInning: "BOTTOM",
        isWalkOff: false,
      });

      expect(detectWalkOffHREvent(ordinaryHomer, 9)).toEqual([]);
    });
  });
});
