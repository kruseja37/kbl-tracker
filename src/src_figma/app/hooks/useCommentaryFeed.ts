import React from "react";

import { INITIAL_MOOD_STATE, type MoodState } from "../../../engines/moodEngine";
import {
  scoreNotability,
  type NotabilityPlayContext,
} from "../../../engines/notabilityScorer";
import type { BeatReporter } from "../../../types/reporter";
import type { NarrativeIntensity } from "../../../types/reporterPreferences";
import { getNarrativeIntensity } from "../../../utils/userPreferencesStorage";
import { getReporterForTeam } from "../../../utils/reporterStorage";
import type { AtBatEvent } from "../../../utils/eventLog";
import type { CompetitionType } from "../../../utils/gameStorage";
import type { CommentaryFeedEntry } from "../components/CommentaryFeed";
import {
  GrokCommentaryEngine,
  type CommentaryEngine,
  type CommentaryEngineConfig,
} from "../engines/reporter/commentaryEngine";
import {
  buildLiveReporterContext,
  buildReporterContext,
  type LiveReporterContextSeed,
  type ReporterContext,
} from "../engines/reporter/reporterContext";
import { isWithinDailyCallLimit } from "../engines/reporter/usageLogger";

const GROK_COMMENTARY_MODEL = "grok-4";

export interface UseCommentaryFeedDependencies {
  getIntensity?: () => Promise<NarrativeIntensity>;
  getReporterForTeam?: (
    teamId: string,
    leagueId?: string,
  ) => Promise<BeatReporter | null>;
  buildReporterContext?: (
    gameId: string,
    atBatId: string,
  ) => Promise<ReporterContext>;
  buildLiveReporterContext?: (
    seed: LiveReporterContextSeed,
  ) => Promise<ReporterContext>;
  isWithinDailyCallLimit?: (now?: number) => Promise<boolean>;
  now?: () => number;
  createEngine?: (config: CommentaryEngineConfig) => CommentaryEngine;
  scoreNotability?: typeof scoreNotability;
}

export interface UseCommentaryFeedOptions {
  gameId: string;
  homeTeamId: string;
  leagueId?: string;
  getLivePreambleSeed: () => LiveReporterContextSeed | null;
  dependencies?: UseCommentaryFeedDependencies;
}

type EngineRefState = {
  gameId: string;
  engine: CommentaryEngine;
} | null;

type ReporterRefState = {
  gameId: string;
  reporter: BeatReporter | null;
} | null;

type DisabledState = {
  intensity?: NarrativeIntensity;
  reporterResolved: boolean;
  reporter: BeatReporter | null;
};

function toShortHalfInningLabel(event: Pick<AtBatEvent, "halfInning" | "inning">): string {
  return `${event.halfInning === "TOP" ? "T" : "B"}${event.inning}`;
}

function toBaseOccupancy(
  runners: Pick<AtBatEvent, "runners" | "runnersAfter">["runners"],
): NotabilityPlayContext["basesBefore"] {
  return {
    first: Boolean(runners.first),
    second: Boolean(runners.second),
    third: Boolean(runners.third),
  };
}

function toNotabilityPlayContext(event: AtBatEvent): NotabilityPlayContext {
  const runsScored = Array.isArray(event.runsScored)
    ? event.runsScored.length
    : event.runsScored;

  return {
    inning: event.inning,
    halfInning: event.halfInning,
    outsBefore: Math.min(Math.max(event.outs, 0), 2) as 0 | 1 | 2,
    outsAfter: event.outsAfter,
    basesBefore: toBaseOccupancy(event.runners),
    basesAfter: toBaseOccupancy(event.runnersAfter),
    homeScoreBefore: event.homeScore,
    awayScoreBefore: event.awayScore,
    homeScoreAfter: event.homeScoreAfter,
    awayScoreAfter: event.awayScoreAfter,
    totalInnings: 9,
    wpaOverride: event.wpa,
    result: event.result,
    runsScored,
    isError:
      event.result === "E" || String(event.result).toUpperCase().includes("ERROR"),
    isFirstAB: event.eventIndex === 1,
  };
}

export function useCommentaryFeed({
  gameId,
  homeTeamId,
  leagueId,
  getLivePreambleSeed,
  dependencies = {},
}: UseCommentaryFeedOptions) {
  const [commentaryEntries, setCommentaryEntries] = React.useState<
    CommentaryFeedEntry[]
  >([]);
  const [disabledState, setDisabledState] = React.useState<DisabledState>({
    reporterResolved: false,
    reporter: null,
  });

  const engineRef = React.useRef<EngineRefState>(null);
  const reporterRef = React.useRef<ReporterRefState>(null);
  const preambleFiredForGameIdRef = React.useRef<string | null>(null);
  const moodRef = React.useRef<MoodState>(INITIAL_MOOD_STATE);
  const intensityRef = React.useRef<NarrativeIntensity | null>(null);

  const getIntensityImpl = dependencies.getIntensity ?? getNarrativeIntensity;
  const getReporterForTeamImpl =
    dependencies.getReporterForTeam ?? getReporterForTeam;
  const buildReporterContextImpl =
    dependencies.buildReporterContext ?? buildReporterContext;
  const buildLiveReporterContextImpl =
    dependencies.buildLiveReporterContext ?? buildLiveReporterContext;
  const isWithinDailyCallLimitImpl =
    dependencies.isWithinDailyCallLimit ?? isWithinDailyCallLimit;
  const nowImpl = dependencies.now ?? Date.now;
  const createEngineImpl =
    dependencies.createEngine ??
    ((config: CommentaryEngineConfig) => new GrokCommentaryEngine(config));
  const scoreNotabilityImpl = dependencies.scoreNotability ?? scoreNotability;

  const resetForNewGame = React.useCallback((nextGameId: string) => {
    setCommentaryEntries([]);
    preambleFiredForGameIdRef.current = null;
    moodRef.current = INITIAL_MOOD_STATE;
    intensityRef.current = null;
    reporterRef.current = null;
    setDisabledState({
      reporterResolved: false,
      reporter: null,
    });

    if (engineRef.current?.gameId === nextGameId) {
      engineRef.current.engine.resetNarrative();
      return;
    }

    engineRef.current = null;
  }, []);

  React.useEffect(() => {
    resetForNewGame(gameId);
  }, [gameId, resetForNewGame]);

  const resolveIntensity = React.useCallback(async () => {
    if (intensityRef.current) {
      return intensityRef.current;
    }

    const intensity = await getIntensityImpl();
    intensityRef.current = intensity;
    setDisabledState((current) => ({ ...current, intensity }));
    return intensity;
  }, [getIntensityImpl]);

  const resolveReporter = React.useCallback(async () => {
    if (reporterRef.current?.gameId === gameId) {
      return reporterRef.current.reporter;
    }

    const reporter = await getReporterForTeamImpl(homeTeamId, leagueId);
    reporterRef.current = { gameId, reporter };
    setDisabledState((current) => ({
      ...current,
      reporterResolved: true,
      reporter,
    }));
    return reporter;
  }, [gameId, getReporterForTeamImpl, homeTeamId, leagueId]);

  React.useEffect(() => {
    void resolveIntensity();
    void resolveReporter();
  }, [resolveIntensity, resolveReporter]);

  const ensureEngine = React.useCallback(
    (reporter: BeatReporter, intensity: NarrativeIntensity, mode?: CompetitionType) => {
      if (engineRef.current?.gameId === gameId) {
        return engineRef.current.engine;
      }

      const engine = createEngineImpl({
        model: GROK_COMMENTARY_MODEL,
        intensity,
        gameId,
        mode,
        reporter,
      });
      engineRef.current = { gameId, engine };
      return engine;
    },
    [createEngineImpl, gameId],
  );

  const resolveCallPrerequisites = React.useCallback(async () => {
    const [intensity, reporter] = await Promise.all([
      resolveIntensity(),
      resolveReporter(),
    ]);

    if (intensity === "low") {
      return { status: "disabled_intensity" as const, intensity, reporter };
    }

    if (!reporter) {
      return { status: "disabled_reporter" as const, intensity, reporter };
    }

    const withinLimit = await isWithinDailyCallLimitImpl(nowImpl());
    if (!withinLimit) {
      console.warn(
        "[reporter:commentary] Grok daily call safety rail reached; skipping commentary call.",
      );
      return { status: "daily_limit" as const, intensity, reporter };
    }

    return { status: "ready" as const, intensity, reporter };
  }, [
    isWithinDailyCallLimitImpl,
    nowImpl,
    resolveIntensity,
    resolveReporter,
  ]);

  const firePreamble = React.useCallback(
    async (
      targetGameId: string,
      atBatIdLike: string,
      intensity?: NarrativeIntensity,
      mode?: CompetitionType,
    ) => {
      if (preambleFiredForGameIdRef.current === targetGameId) {
        return;
      }

      const prerequisites = await resolveCallPrerequisites();
      if (prerequisites.status !== "ready") {
        return;
      }

      const reporter = prerequisites.reporter;
      const resolvedIntensity = intensity ?? prerequisites.intensity;
      const engine = ensureEngine(reporter, resolvedIntensity, mode);

      let context: ReporterContext;
      try {
        context = await buildReporterContextImpl(targetGameId, atBatIdLike);
      } catch (error) {
        const liveSeed = getLivePreambleSeed();
        if (!liveSeed) {
          console.warn(
            "[reporter:commentary] Failed to build preamble context; skipping preamble.",
            error,
          );
          return;
        }

        try {
          context = await buildLiveReporterContextImpl(liveSeed);
        } catch (liveError) {
          console.warn(
            "[reporter:commentary] Failed to build preamble context; skipping preamble.",
            liveError,
          );
          return;
        }
      }

      let result;
      try {
        result = await engine.generatePreamble(context, moodRef.current);
      } catch (error) {
        console.warn(
          "[reporter:commentary] Preamble generation threw unexpectedly; skipping preamble.",
          error,
        );
        return;
      }
      const preambleText = result.text;
      if (result.skipped || !preambleText) {
        console.warn(
          "[reporter:commentary] Preamble skipped or empty; no feed entry appended.",
          result.error ?? "skipped",
        );
        return;
      }

      preambleFiredForGameIdRef.current = targetGameId;
      setCommentaryEntries((current) => [
        {
          id: `commentary-pre-${targetGameId}`,
          commentaryText: preambleText,
          halfInningLabel: "PRE",
          timestamp: 0,
          reporterId: reporter.id,
        },
        ...current.filter((entry) => entry.id !== `commentary-pre-${targetGameId}`),
      ]);
    },
    [
      buildLiveReporterContextImpl,
      buildReporterContextImpl,
      ensureEngine,
      getLivePreambleSeed,
      resolveCallPrerequisites,
    ],
  );

  const firePlayCommentary = React.useCallback(
    async (
      targetGameId: string,
      atBatId: string,
      play: AtBatEvent,
      intensity?: NarrativeIntensity,
      mode?: CompetitionType,
    ) => {
      const prerequisites = await resolveCallPrerequisites();
      if (prerequisites.status !== "ready") {
        return;
      }

      const reporter = prerequisites.reporter;
      const resolvedIntensity = intensity ?? prerequisites.intensity;
      const engine = ensureEngine(reporter, resolvedIntensity, mode);
      const notabilityPlay = toNotabilityPlayContext(play);
      const notability = scoreNotabilityImpl(notabilityPlay, moodRef.current);

      if (!notability.shouldComment) {
        return;
      }

      let context: ReporterContext;
      try {
        context = await buildReporterContextImpl(targetGameId, atBatId);
      } catch (error) {
        console.warn(
          "[reporter:commentary] Failed to build reporter context; skipping play commentary.",
          error,
        );
        return;
      }

      let result;
      try {
        result = await engine.generateCommentary({
          play: notabilityPlay,
          notability,
          reporter,
          mood: moodRef.current,
          context,
          boxScore: {
            batterName: play.batterName,
            pitcherName: play.pitcherName,
            result: play.result,
            runsScored: Array.isArray(play.runsScored)
              ? play.runsScored.length
              : play.runsScored,
            leverageIndex: play.leverageIndex,
            wpa: play.wpa,
          },
        });
      } catch (error) {
        console.warn(
          "[reporter:commentary] Commentary generation threw unexpectedly; skipping play commentary.",
          error,
        );
        return;
      }

      const commentaryText = result.text;
      if (result.skipped || !commentaryText) {
        console.warn(
          "[reporter:commentary] Commentary skipped or empty; no feed entry appended.",
          result.error ?? "skipped",
        );
        return;
      }

      setCommentaryEntries((current) => [
        ...current,
        {
          id: `commentary-${atBatId}`,
          commentaryText,
          halfInningLabel: toShortHalfInningLabel(play),
          timestamp: nowImpl(),
          reporterId: reporter.id,
        },
      ]);
    },
    [
      buildReporterContextImpl,
      ensureEngine,
      nowImpl,
      resolveCallPrerequisites,
      scoreNotabilityImpl,
    ],
  );

  return {
    commentaryEntries,
    firePreamble,
    firePlayCommentary,
    resetForNewGame,
    disabled:
      disabledState.intensity === "low" ||
      (disabledState.reporterResolved && !disabledState.reporter),
  };
}

export default useCommentaryFeed;
