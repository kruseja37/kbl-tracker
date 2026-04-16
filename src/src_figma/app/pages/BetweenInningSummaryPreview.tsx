import React from "react";

import { INITIAL_MOOD_STATE } from "../../../engines/moodEngine";
import type { BeatReporter } from "../../../types/reporter";
import {
  GrokCommentaryEngine,
  type BetweenInningSummaryInput,
} from "../engines/reporter/commentaryEngine";
import type { ReporterContext } from "../engines/reporter/reporterContext";

function createReporter(): BeatReporter {
  const now = Date.now();
  return {
    id: "preview-reporter",
    teamId: "team-home",
    leagueId: "league-preview",
    name: "Dutch Calloway",
    personality: "DRAMATIC",
    voiceStyle: "THE_HOLY_COW",
    eraFlavor: "CLASSIC_TV",
    avatarEra: "headset",
    avatarColors: {
      primary: "#114488",
      secondary: "#f0d060",
    },
    currentMood: "DRAMATIC",
    moodMomentum: 3,
    createdAt: now,
    updatedAt: now,
    changed_at: now,
  };
}

function createContext(): ReporterContext {
  return {
    batter: {
      id: "batter-1",
      name: "Ivy Sparks",
      nicknames: ["Sparks"],
      effectiveFame: 4,
      archetype: "SLUGGER",
      baselineBackstory: "A cleanup hitter who lives for the late innings.",
      signatureMoment: "A pennant-clinching drive into the arcade.",
      teamId: "team-home",
      handedness: { bats: "R", throws: "R" },
    },
    pitcher: {
      id: "pitcher-1",
      name: "Noelle Vale",
      nicknames: ["Icebox"],
      effectiveFame: 5,
      archetype: "ACE",
      baselineBackstory: "A stoic ace with a high fastball and no wasted motion.",
      signatureMoment: "A thirteen-strikeout shutout under the lights.",
      teamId: "team-away",
      handedness: { bats: "L", throws: "R" },
    },
    battingTeam: {
      id: "team-home",
      name: "Blowfish",
      abbreviation: "BLW",
      location: "Mesa Vista",
      nickname: "Blowfish",
      era: "CLASSIC_TV",
      cityVibe: "sun-baked and rowdy",
      baselineBackstory: "A defense-first club that waits for one loud swing.",
      ballparkNickname: "The Tank",
    },
    pitchingTeam: {
      id: "team-away",
      name: "Freebooters",
      abbreviation: "FBT",
      location: "Harbor City",
      nickname: "Freebooters",
      era: "MODERN_LOCAL",
      cityVibe: "windy and loud",
      baselineBackstory: "An impatient lineup that swings like every count is 3-1.",
      ballparkNickname: "The Docks",
    },
    batterLegacySummary: "Sparks has a habit of turning close games into personal theatre.",
    pitcherLegacySummary: "Vale has authored a shelf full of tense, low-scoring wins.",
    battingTeamLegacySummary:
      "The Blowfish have built their identity around clean innings and timely thunder.",
    pitchingTeamLegacySummary:
      "The Freebooters keep surviving with crooked-number bursts.",
    batterRecentAlmanac: [],
    pitcherRecentAlmanac: [],
    teamRecentAlmanac: [
      {
        id: "team-note-1",
        entityId: "team-home",
        gameId: "preview-game",
        timestamp: 3,
        headline: "Rivalry heat",
        summary: "These clubs have split four nasty one-run games this month.",
      },
    ],
    activeOpposingRelationships: [],
    activeWithinTeamRelationships: [],
    teamRivalryIntensity: 7,
    dramaticWeight: 0.86,
    gameState: {
      gameId: "preview-game",
      atBatId: "preview-ab-1",
      inning: 4,
      halfInning: "TOP",
      outs: 3,
      bases: {
        first: null,
        second: null,
        third: null,
      },
      awayScore: 2,
      homeScore: 3,
      battingTeamId: "team-away",
      pitchingTeamId: "team-home",
      batterId: "batter-1",
      pitcherId: "pitcher-1",
      competitionType: "exhibition",
      competitionId: "preview-comp",
      leagueId: "league-preview",
    },
    wpaMoment: {
      eventId: "preview-ab-1",
      leverageIndex: 2.1,
      winProbabilityBefore: 0.52,
      winProbabilityAfter: 0.57,
      wpa: 0.05,
    },
  };
}

const previousNarrative =
  "Through three innings, the Blowfish scratched out a slim lead behind clean pitching.";

const summaryInput: BetweenInningSummaryInput = {
  context: createContext(),
  mood: {
    ...INITIAL_MOOD_STATE,
    moodScore: 3,
    currentMood: "DRAMATIC",
  },
  halfInningJustEnded: {
    inning: 4,
    halfInning: "TOP",
  },
  halfInningEvents: [
    {
      batterName: "Ivy Sparks",
      pitcherName: "Noelle Vale",
      result: "1B",
      runsScored: 0,
    },
    {
      batterName: "Harry Backman",
      pitcherName: "Noelle Vale",
      result: "GIDP",
      runsScored: 0,
    },
  ],
  previousNarrativeSoFar: previousNarrative,
};

export function BetweenInningSummaryPreview() {
  const [popupText, setPopupText] = React.useState<string | null>(null);
  const [beforeNarrative, setBeforeNarrative] = React.useState(previousNarrative);
  const [afterNarrative, setAfterNarrative] = React.useState<string>("");
  const [status, setStatus] = React.useState("Ready to run mocked between-inning summary.");

  const engine = React.useMemo(
    () =>
      new GrokCommentaryEngine({
        model: "grok-4",
        intensity: "medium",
        gameId: "preview-game",
        mode: "exhibition",
        reporter: createReporter(),
        invokeImpl: async () => ({
          data: {
            text: '{"popup":"Freebooters stranded two.","narrative":"Through the top of the fourth, the Blowfish still cling to their one-run margin."}',
            inputTokens: 80,
            outputTokens: 22,
            model: "grok-4",
          },
          error: null,
        }),
        logUsage: async (entry) => ({
          id: "preview-usage",
          timestamp: Date.now(),
          provider: "grok",
          costUsd: 0,
          ...entry,
        }),
      }),
    [],
  );

  const runSummary = React.useCallback(async () => {
    setStatus("Running mocked Grok call...");
    setBeforeNarrative(summaryInput.previousNarrativeSoFar);

    const result = await engine.generateBetweenInningSummary(summaryInput);
    setPopupText(result.popupText);
    setAfterNarrative(result.updatedNarrativeSoFar);
    setStatus(result.skipped ? "Summary skipped." : "Summary completed with replacement narrative.");
  }, [engine]);

  return (
    <main
      className="min-h-screen px-6 py-10"
      style={{
        background:
          "radial-gradient(circle at top, #5d6c52 0%, #303827 48%, #171b14 100%)",
        color: "#F5E8CF",
        fontFamily: "'Moms Typewriter', monospace",
      }}
    >
      <section
        className="mx-auto max-w-5xl"
        style={{
          border: "3px solid rgba(245, 232, 207, 0.42)",
          background:
            "linear-gradient(180deg, rgba(16, 20, 14, 0.8) 0%, rgba(28, 34, 26, 0.95) 100%)",
          boxShadow: "0 20px 44px rgba(0, 0, 0, 0.34)",
        }}
      >
        <div className="border-b border-[#556B55] px-6 py-5">
          <div
            className="mb-2 text-[0.8rem] uppercase tracking-[0.18em] text-[#CBB89C]"
            style={{ fontFamily: "'Tox Typewriter', monospace" }}
          >
            Between-Inning Summary Preview
          </div>
          <h1 className="m-0 text-[1.9rem] text-[#F2C041]">
            Mocked engine-only replacement check
          </h1>
          <p className="mt-3 max-w-3xl text-[0.95rem] leading-6 text-[#d7d8c8]">
            This route does not touch the live game loop. It runs the new engine
            method with a mocked Grok response so we can confirm the popup text
            and the narrative replacement behavior.
          </p>
        </div>

        <div className="grid gap-0 md:grid-cols-[320px_1fr]">
          <aside className="border-b-[3px] border-[#252b27] bg-[#20271d] p-5 md:border-b-0 md:border-r-[3px]">
            <div
              className="mb-3 text-[0.8rem] uppercase tracking-[0.16em] text-[#C4A853]"
              style={{ fontFamily: "'Tox Typewriter', monospace" }}
            >
              Controls
            </div>
            <button
              type="button"
              className="w-full border border-[#6c7c60] bg-[#313f2f] px-3 py-2 text-left text-[0.8rem] text-[#F5E8CF] transition hover:bg-[#3b4c39]"
              onClick={() => {
                void runSummary().catch((error) => {
                  console.warn("[between-inning-preview] Failed to run mock summary.", error);
                  setStatus("Preview run failed.");
                });
              }}
            >
              Run between-inning summary (mock LLM)
            </button>

            <div className="mt-5 border-t border-[#405140] pt-4 text-[0.78rem] leading-5 text-[#b7bea8]">
              <div>Game ID: preview-game</div>
              <div>Half-inning: TOP 4</div>
              <div className="mt-2 text-[#88AA88]">{status}</div>
            </div>
          </aside>

          <div className="grid gap-4 bg-[#243028] p-6 md:grid-cols-3">
            <article className="border border-[#405140] bg-[#1d271f] p-4">
              <div
                className="mb-2 text-[0.72rem] uppercase tracking-[0.14em] text-[#C4A853]"
                style={{ fontFamily: "'Tox Typewriter', monospace" }}
              >
                Before Narrative
              </div>
              <p className="m-0 text-sm leading-6 text-[#d7d8c8]">
                {beforeNarrative || "None"}
              </p>
            </article>

            <article className="border border-[#6b7a61] bg-[#2a352d] p-4">
              <div
                className="mb-2 text-[0.72rem] uppercase tracking-[0.14em] text-[#C4A853]"
                style={{ fontFamily: "'Tox Typewriter', monospace" }}
              >
                Popup Text
              </div>
              <p className="m-0 text-sm italic leading-6 text-[#F5E8CF]">
                {popupText ?? "Run the mock summary to populate this field."}
              </p>
            </article>

            <article className="border border-[#405140] bg-[#1d271f] p-4">
              <div
                className="mb-2 text-[0.72rem] uppercase tracking-[0.14em] text-[#C4A853]"
                style={{ fontFamily: "'Tox Typewriter', monospace" }}
              >
                After Narrative
              </div>
              <p className="m-0 text-sm leading-6 text-[#d7d8c8]">
                {afterNarrative || "Run the mock summary to see the replacement narrative."}
              </p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}

export default BetweenInningSummaryPreview;
