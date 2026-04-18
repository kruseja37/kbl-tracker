import React from "react";

import { INITIAL_MOOD_STATE, type MoodState } from "../../../engines/moodEngine";
import {
  scoreNotability,
  type NotabilityPlayContext,
} from "../../../engines/notabilityScorer";
import type {
  BeatReporter,
  CommentaryFeedEntryRecord,
  GameStory,
  ReporterGameMode,
} from "../../../types/reporter";
import type { NarrativeIntensity } from "../../../types/reporterPreferences";
import {
  listCommentaryFeedEntriesForGame,
  persistCommentaryFeedEntry,
} from "../../../utils/commentaryFeedStorage";
import {
  listGameStoriesForGame,
  persistGameStory,
} from "../../../utils/gameStoriesStorage";
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
  persistGameStory?: (record: GameStory) => Promise<void>;
  listGameStoriesForGame?: (gameId: string) => Promise<GameStory[]>;
}

export interface UseCommentaryFeedOptions {
  gameId: string;
  homeTeamId: string;
  awayTeamId: string;
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
  homeReporterResolved: boolean;
  homeReporter: BeatReporter | null;
  awayReporterResolved: boolean;
  awayReporter: BeatReporter | null;
};

export interface PendingBetweenInningPopup {
  text: string;
  halfInningLabel: string;
}

function toProcessedPlayKey(targetGameId: string, atBatId: string): string {
  return `${targetGameId}:${atBatId}`;
}

export function extractAtBatIdFromCommentaryEntryId(
  entryId: string,
): string | null {
  if (!entryId.startsWith("commentary-")) {
    return null;
  }

  if (
    entryId.startsWith("commentary-pre-") ||
    entryId.startsWith("commentary-inning-")
  ) {
    return null;
  }

  return entryId.slice("commentary-".length) || null;
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
  awayTeamId,
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
    homeReporterResolved: false,
    homeReporter: null,
    awayReporterResolved: false,
    awayReporter: null,
  });

  const engineRef = React.useRef<EngineRefState>(null);
  const homeReporterRef = React.useRef<ReporterRefState>(null);
  const awayReporterRef = React.useRef<ReporterRefState>(null);
  const preambleFiredForGameIdRef = React.useRef<string | null>(null);
  const moodRef = React.useRef<MoodState>(INITIAL_MOOD_STATE);
  const intensityRef = React.useRef<NarrativeIntensity | null>(null);
  const pendingPopupRef = React.useRef<PendingBetweenInningPopup | null>(null);
  const processedPlayIdsRef = React.useRef<Set<string>>(new Set());
  const lastHydratedGameIdRef = React.useRef<string | null>(null);
  // Post-game columns fire exactly once per gameId per component lifetime.
  // Seeded from existing gameStories records on mount so refresh / revisit
  // doesn't re-generate columns that already live in IDB.
  const firedPostGameForGameIdRef = React.useRef<Set<string>>(new Set());

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
  const persistGameStoryImpl =
    dependencies.persistGameStory ?? persistGameStory;
  const listGameStoriesForGameImpl =
    dependencies.listGameStoriesForGame ?? listGameStoriesForGame;

  const resetForNewGame = React.useCallback((nextGameId: string) => {
    setCommentaryEntries([]);
    setPendingPopup(null);
    pendingPopupRef.current = null;
    processedPlayIdsRef.current.clear();
    lastHydratedGameIdRef.current = null;
    preambleFiredForGameIdRef.current = null;
    firedPostGameForGameIdRef.current.clear();
    moodRef.current = INITIAL_MOOD_STATE;
    intensityRef.current = null;
    homeReporterRef.current = null;
    awayReporterRef.current = null;
    setDisabledState({
      homeReporterResolved: false,
      homeReporter: null,
      awayReporterResolved: false,
      awayReporter: null,
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
    if (lastHydratedGameIdRef.current === gameId) {
      return;
    }

    let cancelled = false;

    void listCommentaryFeedEntriesForGameImpl(gameId)
      .then((records) => {
        if (cancelled) {
          return;
        }

        lastHydratedGameIdRef.current = gameId;
        setCommentaryEntries(records.map(toCommentaryFeedEntry));
        processedPlayIdsRef.current = new Set(
          records
            .map((record) => {
              const atBatId = extractAtBatIdFromCommentaryEntryId(record.id);
              return atBatId ? toProcessedPlayKey(gameId, atBatId) : null;
            })
            .filter((key): key is string => Boolean(key)),
        );
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

  // Seed the post-game-fired set from existing gameStories on mount / gameId
  // change. If columns already exist for this gameId (i.e. the user is
  // revisiting a completed game or refreshed mid-post-game), we must not
  // re-fire firePostGameColumns and double-bill.
  React.useEffect(() => {
    if (!gameId) return;
    let cancelled = false;
    void listGameStoriesForGameImpl(gameId)
      .then((stories) => {
        if (cancelled) return;
        if (stories.length > 0) {
          firedPostGameForGameIdRef.current.add(gameId);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn(
            `[reporter:post-game] Failed to hydrate game stories for ${gameId}.`,
            error,
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [gameId, listGameStoriesForGameImpl]);

  const resolveIntensity = React.useCallback(async () => {
    if (intensityRef.current) {
      return intensityRef.current;
    }

    const intensity = await getIntensityImpl();
    intensityRef.current = intensity;
    setDisabledState((current) => ({ ...current, intensity }));
    return intensity;
  }, [getIntensityImpl]);

  const resolveHomeReporter = React.useCallback(async () => {
    if (homeReporterRef.current?.gameId === gameId) {
      return homeReporterRef.current.reporter;
    }

    const reporter = await getReporterForTeamImpl(homeTeamId, leagueId);
    homeReporterRef.current = { gameId, reporter };
    setDisabledState((current) => ({
      ...current,
      homeReporterResolved: true,
      homeReporter: reporter,
    }));
    return reporter;
  }, [gameId, getReporterForTeamImpl, homeTeamId, leagueId]);

  const resolveAwayReporter = React.useCallback(async () => {
    if (awayReporterRef.current?.gameId === gameId) {
      return awayReporterRef.current.reporter;
    }

    const reporter = await getReporterForTeamImpl(awayTeamId, leagueId);
    awayReporterRef.current = { gameId, reporter };
    setDisabledState((current) => ({
      ...current,
      awayReporterResolved: true,
      awayReporter: reporter,
    }));
    return reporter;
  }, [awayTeamId, gameId, getReporterForTeamImpl, leagueId]);

  React.useEffect(() => {
    void resolveIntensity();
    void resolveHomeReporter();
    void resolveAwayReporter();
  }, [resolveAwayReporter, resolveHomeReporter, resolveIntensity]);

  const ensureEngine = React.useCallback(
    (intensity: NarrativeIntensity, mode?: CompetitionType) => {
      if (engineRef.current?.gameId === gameId) {
        return engineRef.current.engine;
      }

      const engine = createEngineImpl({
        model: GROK_COMMENTARY_MODEL,
        intensity,
        gameId,
        mode,
      });
      engineRef.current = { gameId, engine };
      return engine;
    },
    [createEngineImpl, gameId],
  );

  const resolveCallPrerequisites = React.useCallback(async (which: "home" | "away") => {
    const resolveReporter =
      which === "home" ? resolveHomeReporter : resolveAwayReporter;
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
    resolveAwayReporter,
    resolveHomeReporter,
    resolveIntensity,
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
    (nextPopup: PendingBetweenInningPopup | null) => {
      pendingPopupRef.current = nextPopup;
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

      const prerequisites = await resolveCallPrerequisites("home");
      if (prerequisites.status !== "ready") {
        return;
      }

      const reporter = prerequisites.reporter;
      const resolvedIntensity = intensity ?? prerequisites.intensity;
      const engine = ensureEngine(resolvedIntensity, mode);

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
        result = await engine.generatePreamble({
          context,
          mood: moodRef.current,
          reporter,
          reporterTeam: "home",
        });
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
      const processedPlayKey = toProcessedPlayKey(targetGameId, atBatId);
      if (processedPlayIdsRef.current.has(processedPlayKey)) {
        return;
      }

      const prerequisites = await resolveCallPrerequisites("home");
      if (prerequisites.status !== "ready") {
        return;
      }

      const reporter = prerequisites.reporter;
      const resolvedIntensity = intensity ?? prerequisites.intensity;
      const engine = ensureEngine(resolvedIntensity, mode);
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
      processedPlayIdsRef.current.add(processedPlayKey);
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
      inning: number,
      inningEvents: BetweenInningSummaryInput["inningEvents"],
      reporterTeam: "home" | "away",
      intensity?: NarrativeIntensity,
      mode?: CompetitionType,
    ) => {
      // Note: previously checked pendingPopupRef here to guard overlapping popups.
      // In the alternating-inning model we don't render a popup from the live fire
      // path, so the guard never triggered correctly and in fact blocked legitimate
      // subsequent inning summaries. Dedup is handled at the GameTracker call site
      // via firedInningSummariesRef.
      const prerequisites = await resolveCallPrerequisites(reporterTeam);
      if (prerequisites.status !== "ready") {
        return;
      }

      const reporter = prerequisites.reporter;
      const resolvedIntensity = intensity ?? prerequisites.intensity;
      const engine = ensureEngine(resolvedIntensity, mode);
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
          reporter,
          reporterTeam,
          inning,
          inningEvents,
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

      const timestamp = nowImpl();
      const inningLabel = `INNING ${inning}`;
      const entry: CommentaryFeedEntry = {
        id: `commentary-inning-${targetGameId}-${reporterTeam}-${inning}-${timestamp}`,
        commentaryText: result.popupText,
        halfInningLabel: inningLabel,
        kind: "between-inning",
        timestamp,
        reporterId: reporter.id,
      };

      setCommentaryEntries((current) => [...current, entry]);
      persistEntryRecord({
        id: entry.id,
        gameId: targetGameId,
        leagueId,
        reporterId: reporter.id,
        commentaryText: entry.commentaryText,
        halfInningLabel: entry.halfInningLabel,
        kind: "between-inning",
        timestamp,
        createdAt: timestamp,
        changed_at: timestamp,
      });
      // NOTE: do NOT set pendingBetweenInningPopup here. In the alternating-inning
      // model the entry lands directly in the feed (above) and there is no popup
      // overlay rendered in the live GameTracker. Setting a popup that is never
      // dismissed would leave pendingPopupRef pinned forever, causing the stacking
      // guard at the top of this function to block ALL subsequent inning summaries.
      // The BetweenInningPopup component remains used by the preview harness, which
      // drives pendingPopup state via its own dismiss flow.
    },
    [
      buildLiveReporterContextImpl,
      buildReporterContextImpl,
      ensureEngine,
      getLivePreambleSeed,
      resolveCallPrerequisites,
    ],
  );

  const dismissBetweenInningPopup = React.useCallback(
    (reason: "auto" | "tap" | "escape") => {
      void reason;
      const activePopup = pendingPopupRef.current;
      if (!activePopup) {
        return;
      }
      setPendingBetweenInningPopup(null);
    },
    [setPendingBetweenInningPopup],
  );

  /**
   * Fires BOTH reporters' post-game columns in parallel when a game ends.
   * Gated at the caller level by `postGameColumnsEnabled`. Each reporter
   * fails/succeeds independently — a missing away reporter does not block
   * the home column, and vice versa.
   *
   * On success per reporter: persists a GameStory record to IDB (which syncs
   * to Supabase via the normal sync engine path).
   *
   * Deduped via firedPostGameForGameIdRef — seeded on mount from existing
   * gameStories records so refresh / revisit does not regenerate columns.
   */
  const firePostGameColumns = React.useCallback(
    async (params: {
      targetGameId: string;
      allInningEvents: AtBatEvent[];
      finalScore: { home: number; away: number };
      gameMode: ReporterGameMode;
      gameDate: string;
      opponentByReporter?: { home?: string; away?: string };
    }) => {
      const {
        targetGameId,
        allInningEvents,
        finalScore,
        gameMode,
        gameDate,
        opponentByReporter,
      } = params;

      if (firedPostGameForGameIdRef.current.has(targetGameId)) {
        return;
      }
      firedPostGameForGameIdRef.current.add(targetGameId);

      // playersMentioned = union of every batter + pitcher who actually
      // appeared this game. Not a column-body scrape (brittle); just
      // everyone who took an at-bat or pitched. Almanac filtering is on
      // substring match of name, so this is the honest answer.
      const namesInGame = new Set<string>();
      for (const event of allInningEvents) {
        if (event.batterName) namesInGame.add(event.batterName);
        if (event.pitcherName) namesInGame.add(event.pitcherName);
      }
      const playersMentioned = Array.from(namesInGame).sort();

      const runForReporter = async (
        reporterTeam: "home" | "away",
      ): Promise<void> => {
        const prerequisites = await resolveCallPrerequisites(reporterTeam);
        if (prerequisites.status !== "ready") {
          return;
        }
        const reporter = prerequisites.reporter;
        const resolvedIntensity = prerequisites.intensity;
        const engine = ensureEngine(resolvedIntensity, undefined);

        // Context: the at-bat-id path is moot at game's end; use the live
        // seed as a best-effort anchor and let buildReporterContext fall
        // back to buildLiveReporterContext on failure.
        let context: ReporterContext;
        try {
          const liveSeed = getLivePreambleSeed();
          if (liveSeed) {
            context = await buildLiveReporterContextImpl(liveSeed);
          } else {
            // No seed available; skip this reporter — we'd have no grounding
            // without live game state and would just hallucinate.
            console.warn(
              `[reporter:post-game] No live seed for ${reporterTeam} reporter; skipping column.`,
            );
            return;
          }
        } catch (error) {
          console.warn(
            `[reporter:post-game] Failed to build context for ${reporterTeam} reporter.`,
            error,
          );
          return;
        }

        const result = await engine.generatePostGameColumn({
          context,
          reporter,
          reporterTeam,
          finalScore,
          allInningEvents,
          narrativeSoFar: engine.getNarrativeSoFar(),
        });

        if (result.skipped || !result.headline || !result.body) {
          // generatePostGameColumn already console.warned the reason.
          return;
        }

        const now = nowImpl();
        const opponentTeamId =
          reporterTeam === "home"
            ? opponentByReporter?.home ?? awayTeamId
            : opponentByReporter?.away ?? homeTeamId;
        const story: GameStory = {
          id: `game-story-${targetGameId}-${reporterTeam}`,
          gameId: targetGameId,
          reporterId: reporter.id,
          teamId: reporter.teamId,
          leagueId,
          gameMode,
          headline: result.headline,
          body: result.body,
          playersMentioned,
          gameDate,
          opponentTeamId,
          createdAt: now,
          changed_at: now,
        };

        try {
          await persistGameStoryImpl(story);
        } catch (error) {
          console.warn(
            `[reporter:post-game] Failed to persist ${reporterTeam} column.`,
            error,
          );
        }
      };

      // Fire both in parallel — one failing does not block the other.
      await Promise.allSettled([
        runForReporter("home"),
        runForReporter("away"),
      ]);
    },
    [
      awayTeamId,
      buildLiveReporterContextImpl,
      ensureEngine,
      getLivePreambleSeed,
      homeTeamId,
      leagueId,
      nowImpl,
      persistGameStoryImpl,
      resolveCallPrerequisites,
    ],
  );

  const homeDisabled =
    disabledState.intensity === "low" ||
    (disabledState.homeReporterResolved && !disabledState.homeReporter);
  const awayDisabled =
    disabledState.intensity === "low" ||
    (disabledState.awayReporterResolved && !disabledState.awayReporter);

  return {
    commentaryEntries,
    pendingPopup,
    firePreamble,
    firePlayCommentary,
    fireBetweenInningSummary,
    firePostGameColumns,
    dismissBetweenInningPopup,
    resetForNewGame,
    homeDisabled,
    awayDisabled,
    disabled: homeDisabled && awayDisabled,
  };
}

export default useCommentaryFeed;
