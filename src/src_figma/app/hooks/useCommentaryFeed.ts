import React from "react";

import { INITIAL_MOOD_STATE, type MoodState } from "../../../engines/moodEngine";
import {
  scoreNotability,
  type NotabilityPlayContext,
} from "../../../engines/notabilityScorer";
import type { BeatReporter, CommentaryFeedEntryRecord } from "../../../types/reporter";
import type { NarrativeIntensity } from "../../../types/reporterPreferences";
import {
  listCommentaryFeedEntriesForGame,
  persistCommentaryFeedEntry,
} from "../../../utils/commentaryFeedStorage";
import { getNarrativeIntensity } from "../../../utils/userPreferencesStorage";
import { getReporterForTeam } from "../../../utils/reporterStorage";
import type { AtBatEvent } from "../../../utils/eventLog";
import type { CompetitionType } from "../../../utils/gameStorage";
import type { CommentaryFeedEntry } from "../components/CommentaryFeed";
import {
  GrokCommentaryEngine,
  type BetweenInningSummaryInput,
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
  persistCommentaryFeedEntry?: (record: CommentaryFeedEntryRecord) => Promise<void>;
  listCommentaryFeedEntriesForGame?: (
    gameId: string,
  ) => Promise<CommentaryFeedEntryRecord[]>;
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

export interface PendingBetweenInningPopup {
  text: string;
  halfInningLabel: string;
}

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

function toCommentaryFeedEntry(
  record: CommentaryFeedEntryRecord,
): CommentaryFeedEntry {
  return {
    id: record.id,
    commentaryText: record.commentaryText,
    halfInningLabel: record.halfInningLabel,
    kind: record.kind,
    timestamp: record.timestamp,
    reporterId: record.reporterId,
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
  const [pendingPopup, setPendingPopup] =
    React.useState<PendingBetweenInningPopup | null>(null);
  const [disabledState, setDisabledState] = React.useState<DisabledState>({
    reporterResolved: false,
    reporter: null,
  });

  const engineRef = React.useRef<EngineRefState>(null);
  const reporterRef = React.useRef<ReporterRefState>(null);
  const preambleFiredForGameIdRef = React.useRef<string | null>(null);
  const moodRef = React.useRef<MoodState>(INITIAL_MOOD_STATE);
  const intensityRef = React.useRef<NarrativeIntensity | null>(null);
  const pendingPopupRef = React.useRef<PendingBetweenInningPopup | null>(null);
  const pendingPopupReporterIdRef = React.useRef<string | null>(null);

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
  const persistCommentaryFeedEntryImpl =
    dependencies.persistCommentaryFeedEntry ?? persistCommentaryFeedEntry;
  const listCommentaryFeedEntriesForGameImpl =
    dependencies.listCommentaryFeedEntriesForGame ?? listCommentaryFeedEntriesForGame;

  const resetForNewGame = React.useCallback((nextGameId: string) => {
    setCommentaryEntries([]);
    setPendingPopup(null);
    pendingPopupRef.current = null;
    pendingPopupReporterIdRef.current = null;
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

  React.useEffect(() => {
    let cancelled = false;

    void listCommentaryFeedEntriesForGameImpl(gameId)
      .then((records) => {
        if (cancelled) {
          return;
        }

        setCommentaryEntries(records.map(toCommentaryFeedEntry));
        preambleFiredForGameIdRef.current = records.some(
          (record) => record.halfInningLabel === "PRE",
        )
          ? gameId
          : null;
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn(
            `[reporter:commentary] Failed to load commentary feed entries for ${gameId}.`,
            error,
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [gameId, listCommentaryFeedEntriesForGameImpl]);

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

  const persistEntryRecord = React.useCallback(
    (record: CommentaryFeedEntryRecord) => {
      void persistCommentaryFeedEntryImpl(record).catch((error) => {
        console.warn(
          `[reporter:commentary] Failed to persist commentary feed entry ${record.id}.`,
          error,
        );
      });
    },
    [persistCommentaryFeedEntryImpl],
  );

  const setPendingBetweenInningPopup = React.useCallback(
    (nextPopup: PendingBetweenInningPopup | null, reporterId?: string | null) => {
      pendingPopupRef.current = nextPopup;
      pendingPopupReporterIdRef.current = nextPopup ? reporterId ?? null : null;
      setPendingPopup(nextPopup);
    },
    [],
  );

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
      const entry: CommentaryFeedEntry = {
        id: `commentary-pre-${targetGameId}`,
        commentaryText: preambleText,
        halfInningLabel: "PRE",
        timestamp: 0,
        reporterId: reporter.id,
      };
      const createdAt = nowImpl();
      setCommentaryEntries((current) => [
        entry,
        ...current.filter((currentEntry) => currentEntry.id !== entry.id),
      ]);
      persistEntryRecord({
        id: entry.id,
        gameId: targetGameId,
        leagueId,
        reporterId: reporter.id,
        commentaryText: entry.commentaryText,
        halfInningLabel: entry.halfInningLabel,
        timestamp: entry.timestamp,
        createdAt,
        changed_at: createdAt,
      });
    },
    [
      buildLiveReporterContextImpl,
      buildReporterContextImpl,
      ensureEngine,
      getLivePreambleSeed,
      leagueId,
      nowImpl,
      persistEntryRecord,
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

      const timestamp = nowImpl();
      const entry: CommentaryFeedEntry = {
        id: `commentary-${atBatId}`,
        commentaryText,
        halfInningLabel: toShortHalfInningLabel(play),
        timestamp,
        reporterId: reporter.id,
      };
      setCommentaryEntries((current) => [
        ...current,
        entry,
      ]);
      persistEntryRecord({
        id: entry.id,
        gameId: targetGameId,
        leagueId,
        reporterId: reporter.id,
        commentaryText: entry.commentaryText,
        halfInningLabel: entry.halfInningLabel,
        timestamp: entry.timestamp,
        createdAt: timestamp,
        changed_at: timestamp,
      });
    },
    [
      buildReporterContextImpl,
      ensureEngine,
      leagueId,
      nowImpl,
      persistEntryRecord,
      resolveCallPrerequisites,
      scoreNotabilityImpl,
    ],
  );

  const fireBetweenInningSummary = React.useCallback(
    async (
      targetGameId: string,
      halfInningJustEnded: BetweenInningSummaryInput["halfInningJustEnded"],
      halfInningEvents: BetweenInningSummaryInput["halfInningEvents"],
      intensity?: NarrativeIntensity,
      mode?: CompetitionType,
    ) => {
      if (pendingPopupRef.current) {
        console.warn(
          "[reporter:commentary] Between-inning popup already pending; skipping new summary.",
        );
        return;
      }

      const prerequisites = await resolveCallPrerequisites();
      if (prerequisites.status !== "ready") {
        return;
      }

      const reporter = prerequisites.reporter;
      const resolvedIntensity = intensity ?? prerequisites.intensity;
      const engine = ensureEngine(reporter, resolvedIntensity, mode);
      const liveSeed = getLivePreambleSeed();

      if (!liveSeed) {
        console.warn(
          "[reporter:commentary] Missing live reporter seed; skipping between-inning summary.",
        );
        return;
      }

      let context: ReporterContext;
      try {
        context = await buildReporterContextImpl(targetGameId, liveSeed.atBatId);
      } catch (error) {
        try {
          context = await buildLiveReporterContextImpl(liveSeed);
        } catch (liveError) {
          console.warn(
            "[reporter:commentary] Failed to build between-inning summary context; skipping summary.",
            liveError ?? error,
          );
          return;
        }
      }

      let result;
      try {
        result = await engine.generateBetweenInningSummary({
          context,
          mood: moodRef.current,
          halfInningJustEnded,
          halfInningEvents,
          previousNarrativeSoFar: engine.getNarrativeSoFar(),
        });
      } catch (error) {
        console.warn(
          "[reporter:commentary] Between-inning summary threw unexpectedly; skipping popup.",
          error,
        );
        return;
      }

      if (result.skipped || !result.popupText) {
        return;
      }

      setPendingBetweenInningPopup(
        {
          text: result.popupText,
          halfInningLabel: toShortHalfInningLabel(halfInningJustEnded),
        },
        reporter.id,
      );
    },
    [
      buildLiveReporterContextImpl,
      buildReporterContextImpl,
      ensureEngine,
      getLivePreambleSeed,
      resolveCallPrerequisites,
      setPendingBetweenInningPopup,
    ],
  );

  const dismissBetweenInningPopup = React.useCallback(
    (reason: "auto" | "tap" | "escape") => {
      void reason;
      const activePopup = pendingPopupRef.current;
      if (!activePopup) {
        return;
      }

      const reporterId = pendingPopupReporterIdRef.current;
      const timestamp = nowImpl();
      const entry: CommentaryFeedEntry = {
        id: `commentary-inning-${gameId}-${activePopup.halfInningLabel}-${timestamp}`,
        commentaryText: activePopup.text,
        halfInningLabel: activePopup.halfInningLabel,
        kind: "between-inning",
        timestamp,
        reporterId: reporterId ?? undefined,
      };

      setCommentaryEntries((current) => [...current, entry]);
      if (reporterId) {
        persistEntryRecord({
          id: entry.id,
          gameId,
          leagueId,
          reporterId,
          commentaryText: entry.commentaryText,
          halfInningLabel: entry.halfInningLabel,
          kind: "between-inning",
          timestamp,
          createdAt: timestamp,
          changed_at: timestamp,
        });
      }
      setPendingBetweenInningPopup(null);
    },
    [gameId, leagueId, nowImpl, persistEntryRecord, setPendingBetweenInningPopup],
  );

  return {
    commentaryEntries,
    pendingPopup,
    firePreamble,
    firePlayCommentary,
    fireBetweenInningSummary,
    dismissBetweenInningPopup,
    resetForNewGame,
    disabled:
      disabledState.intensity === "low" ||
      (disabledState.reporterResolved && !disabledState.reporter),
  };
}

export default useCommentaryFeed;
