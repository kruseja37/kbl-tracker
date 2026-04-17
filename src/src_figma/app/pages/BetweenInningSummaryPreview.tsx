import React from "react";

import { INITIAL_MOOD_STATE } from "../../../engines/moodEngine";
import type { BeatReporter } from "../../../types/reporter";
import CommentaryFeed from "../components/CommentaryFeed";
import BetweenInningPopup from "../components/BetweenInningPopup";
import type {
  BetweenInningSummaryInput,
  CommentaryEngine,
  CommentaryEngineConfig,
} from "../engines/reporter/commentaryEngine";
import { GrokCommentaryEngine } from "../engines/reporter/commentaryEngine";
import type { ReporterContext } from "../engines/reporter/reporterContext";
import { useCommentaryFeed } from "../hooks/useCommentaryFeed";

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
    battingTeamRecentAlmanac: [
      {
        id: "team-note-1",
        entityId: "team-home",
        gameId: "preview-game",
        timestamp: 3,
        headline: "Rivalry heat",
        summary: "These clubs have split four nasty one-run games this month.",
      },
    ],
    pitchingTeamRecentAlmanac: [
      {
        id: "team-note-2",
        entityId: "team-away",
        gameId: "preview-game",
        timestamp: 4,
        headline: "Road tension",
        summary: "The Freebooters have made a habit of silencing home crowds late.",
      },
    ],
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
    teamDnaFacts: [
      "Blowfish fans expect late-inning noise.",
      "The Tank gets louder the tighter it gets.",
    ],
    homeTeamRivalries: [
      {
        opponentTeamId: "team-away",
        intensity: 7,
        origin: "Division rivals",
      },
    ],
    awayTeamRivalries: [
      {
        opponentTeamId: "team-home",
        intensity: 6,
        origin: "Recent playoff split",
      },
    ],
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

function createPreviewEngineFactory(params: {
  setBeforeNarrative: React.Dispatch<React.SetStateAction<string>>;
  setAfterNarrative: React.Dispatch<React.SetStateAction<string>>;
  setLastPopupText: React.Dispatch<React.SetStateAction<string | null>>;
  setStatus: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (config: CommentaryEngineConfig): CommentaryEngine => {
    const engine = new GrokCommentaryEngine({
      ...config,
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
    });

    return {
      generatePreamble: engine.generatePreamble.bind(engine),
      generateCommentary: engine.generateCommentary.bind(engine),
      async generateBetweenInningSummary(input) {
        params.setBeforeNarrative(input.previousNarrativeSoFar);
        const result = await engine.generateBetweenInningSummary(input);
        params.setLastPopupText(result.popupText);
        params.setAfterNarrative(result.updatedNarrativeSoFar);
        params.setStatus(
          result.skipped
            ? "Summary skipped."
            : "Popup live. Let it auto-dismiss or tap it to send it into the feed.",
        );
        return result;
      },
      getNarrativeSoFar: engine.getNarrativeSoFar.bind(engine),
      resetNarrative() {
        engine.resetNarrative();
        params.setAfterNarrative("");
      },
    };
  };
}

export function BetweenInningSummaryPreview() {
  const [beforeNarrative, setBeforeNarrative] = React.useState(previousNarrative);
  const [afterNarrative, setAfterNarrative] = React.useState("");
  const [lastPopupText, setLastPopupText] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState(
    "Ready to run the mocked between-inning summary through the hook.",
  );

  const createEngine = React.useMemo(
    () =>
      createPreviewEngineFactory({
        setBeforeNarrative,
        setAfterNarrative,
        setLastPopupText,
        setStatus,
      }),
    [],
  );

  const {
    commentaryEntries,
    pendingPopup,
    fireBetweenInningSummary,
    dismissBetweenInningPopup,
  } = useCommentaryFeed({
    gameId: "preview-game",
    homeTeamId: "team-home",
    leagueId: "league-preview",
    getLivePreambleSeed: () => ({
      gameId: "preview-game",
      atBatId: "preview-ab-1",
      inning: 4,
      halfInning: "TOP",
      outs: 3,
      bases: { first: null, second: null, third: null },
      awayScore: 2,
      homeScore: 3,
      battingTeamId: "team-away",
      battingTeamName: "Freebooters",
      pitchingTeamId: "team-home",
      pitchingTeamName: "Blowfish",
      batterId: "batter-1",
      batterName: "Ivy Sparks",
      pitcherId: "pitcher-1",
      pitcherName: "Noelle Vale",
      competitionType: "exhibition",
      competitionId: "preview-comp",
      leagueId: "league-preview",
    }),
    dependencies: {
      getIntensity: async () => "medium",
      getReporterForTeam: async () => createReporter(),
      buildReporterContext: async () => createContext(),
      buildLiveReporterContext: async () => createContext(),
      isWithinDailyCallLimit: async () => true,
      createEngine,
    },
  });

  React.useEffect(() => {
    if (pendingPopup) {
      setLastPopupText(pendingPopup.text);
    }
  }, [pendingPopup]);

  const runSummary = React.useCallback(async () => {
    setStatus("Running mocked Grok call through useCommentaryFeed...");
    await fireBetweenInningSummary(
      "preview-game",
      summaryInput.halfInningJustEnded,
      summaryInput.halfInningEvents,
      "medium",
      "exhibition",
    );
  }, [fireBetweenInningSummary]);

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
      {pendingPopup ? (
        <BetweenInningPopup
          text={pendingPopup.text}
          onDismiss={(reason) => {
            dismissBetweenInningPopup(reason);
            setStatus(
              reason === "auto"
                ? "Popup auto-dismissed and collapsed into the feed."
                : "Popup dismissed early and collapsed into the feed.",
            );
          }}
        />
      ) : null}

      <section
        className="mx-auto max-w-6xl"
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
            Mocked I1 to I2 popup-to-feed flow
          </h1>
          <p className="mt-3 max-w-4xl text-[0.95rem] leading-6 text-[#d7d8c8]">
            This route stays out of the live game loop. It runs the mocked Grok
            response through <code>useCommentaryFeed</code>, shows the popup,
            then lets the dismissal path persist and re-render the summary as a
            differentiated feed entry.
          </p>
        </div>

        <div className="grid gap-0 lg:grid-cols-[340px_1fr]">
          <aside className="border-b-[3px] border-[#252b27] bg-[#20271d] p-5 lg:border-b-0 lg:border-r-[3px]">
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
                  console.warn(
                    "[between-inning-preview] Failed to run hook-based mock summary.",
                    error,
                  );
                  setStatus("Preview run failed.");
                });
              }}
            >
              Run between-inning summary (mock LLM)
            </button>

            <div className="mt-4 text-[0.78rem] leading-6 text-[#D7D8C8]">
              {status}
            </div>

            <div className="mt-6 rounded border border-[#485645] bg-[#171d18] p-4">
              <div
                className="mb-3 text-[0.72rem] uppercase tracking-[0.18em] text-[#AFC6AF]"
                style={{ fontFamily: "'Tox Typewriter', monospace" }}
              >
                Feed Snapshot
              </div>
              <CommentaryFeed entries={commentaryEntries} soundsOn={false} />
            </div>
          </aside>

          <div className="grid gap-4 px-6 py-5 md:grid-cols-3">
            {[
              { label: "Before Narrative", value: beforeNarrative },
              { label: "Popup Text", value: pendingPopup?.text ?? lastPopupText ?? "Awaiting summary..." },
              { label: "After Narrative", value: afterNarrative || "Awaiting summary..." },
            ].map((panel) => (
              <section
                key={panel.label}
                className="rounded border border-[#435443] bg-[#171d18] p-4"
              >
                <div
                  className="mb-3 text-[0.74rem] uppercase tracking-[0.18em] text-[#C4A853]"
                  style={{ fontFamily: "'Tox Typewriter', monospace" }}
                >
                  {panel.label}
                </div>
                <p className="m-0 text-[0.92rem] leading-7 text-[#E6E5D5]">
                  {panel.value}
                </p>
              </section>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default BetweenInningSummaryPreview;
