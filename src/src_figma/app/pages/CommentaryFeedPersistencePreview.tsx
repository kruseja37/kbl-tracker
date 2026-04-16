import React from "react";

import {
  deleteCommentaryFeedEntry,
  listCommentaryFeedEntriesForGame,
  persistCommentaryFeedEntry,
} from "../../../utils/commentaryFeedStorage";
import { CommentaryFeed, type CommentaryFeedEntry } from "../components/CommentaryFeed";

const PREVIEW_GAME_ID = "preview-persistence";
const PREVIEW_REPORTER_ID = "preview-reporter";
const PREVIEW_LEAGUE_ID = "preview-league";

function toCommentaryFeedEntry(record: {
  id: string;
  commentaryText: string;
  halfInningLabel: string;
  timestamp: number;
  reporterId: string;
}): CommentaryFeedEntry {
  return {
    id: record.id,
    commentaryText: record.commentaryText,
    halfInningLabel: record.halfInningLabel,
    timestamp: record.timestamp,
    reporterId: record.reporterId,
  };
}

export function CommentaryFeedPersistencePreview() {
  const [entries, setEntries] = React.useState<CommentaryFeedEntry[]>([]);
  const [status, setStatus] = React.useState("Loading persisted feed...");

  const loadEntries = React.useCallback(async () => {
    try {
      const records = await listCommentaryFeedEntriesForGame(PREVIEW_GAME_ID);
      setEntries(records.map(toCommentaryFeedEntry));
      setStatus(
        records.length === 0
          ? "No persisted entries yet for this preview game."
          : `Loaded ${records.length} persisted entr${records.length === 1 ? "y" : "ies"}.`,
      );
    } catch (error) {
      console.warn("[commentary-preview] Failed to load preview entries.", error);
      setStatus("Failed to load persisted entries. Check the console for details.");
    }
  }, []);

  React.useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const writePreEntry = React.useCallback(async () => {
    const now = Date.now();

    await persistCommentaryFeedEntry({
      id: `commentary-pre-${PREVIEW_GAME_ID}`,
      gameId: PREVIEW_GAME_ID,
      leagueId: PREVIEW_LEAGUE_ID,
      reporterId: PREVIEW_REPORTER_ID,
      commentaryText:
        "Dutch Calloway here before first pitch, and the park feels like it knows trouble is on deck.",
      halfInningLabel: "PRE",
      timestamp: 0,
      createdAt: now,
      changed_at: now,
    });

    await loadEntries();
  }, [loadEntries]);

  const writePlayEntry = React.useCallback(async () => {
    const now = Date.now();

    await persistCommentaryFeedEntry({
      id: `commentary-preview-play-${now}`,
      gameId: PREVIEW_GAME_ID,
      leagueId: PREVIEW_LEAGUE_ID,
      reporterId: PREVIEW_REPORTER_ID,
      commentaryText:
        "A line drive screams into the gap and the home crowd rises like it expected fireworks all along.",
      halfInningLabel: "B7",
      timestamp: now,
      createdAt: now,
      changed_at: now,
    });

    await loadEntries();
  }, [loadEntries]);

  const clearEntries = React.useCallback(async () => {
    const records = await listCommentaryFeedEntriesForGame(PREVIEW_GAME_ID);
    await Promise.all(records.map((record) => deleteCommentaryFeedEntry(record.id)));
    await loadEntries();
  }, [loadEntries]);

  return (
    <main
      className="min-h-screen px-6 py-10"
      style={{
        background:
          "radial-gradient(circle at top, #586349 0%, #2c3425 48%, #171c15 100%)",
        color: "#F5E8CF",
        fontFamily: "'Moms Typewriter', monospace",
      }}
    >
      <section
        className="mx-auto max-w-4xl"
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
            Commentary Persistence Preview
          </div>
          <h1 className="m-0 text-[1.9rem] text-[#F2C041]">
            IndexedDB round-trip harness
          </h1>
          <p className="mt-3 max-w-3xl text-[0.95rem] leading-6 text-[#d7d8c8]">
            Use the buttons below to write and clear persisted commentary for the
            fixed preview game. Refresh the page and the feed should still be
            there until you clear it.
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
            <div className="space-y-3">
              <button
                type="button"
                className="w-full border border-[#6c7c60] bg-[#313f2f] px-3 py-2 text-left text-[0.8rem] text-[#F5E8CF] transition hover:bg-[#3b4c39]"
                onClick={() => {
                  void writePreEntry().catch((error) => {
                    console.warn("[commentary-preview] Failed to write PRE entry.", error);
                    setStatus("Failed to write PRE entry.");
                  });
                }}
              >
                Write sample PRE entry to IDB
              </button>
              <button
                type="button"
                className="w-full border border-[#6c7c60] bg-[#313f2f] px-3 py-2 text-left text-[0.8rem] text-[#F5E8CF] transition hover:bg-[#3b4c39]"
                onClick={() => {
                  void writePlayEntry().catch((error) => {
                    console.warn("[commentary-preview] Failed to write play entry.", error);
                    setStatus("Failed to write sample play entry.");
                  });
                }}
              >
                Write sample play entry to IDB
              </button>
              <button
                type="button"
                className="w-full border border-[#7f5e4e] bg-[#412c25] px-3 py-2 text-left text-[0.8rem] text-[#F5E8CF] transition hover:bg-[#54352d]"
                onClick={() => {
                  void clearEntries().catch((error) => {
                    console.warn("[commentary-preview] Failed to clear preview entries.", error);
                    setStatus("Failed to clear entries for this game.");
                  });
                }}
              >
                Clear all entries for this gameId
              </button>
            </div>

            <div className="mt-5 border-t border-[#405140] pt-4 text-[0.78rem] leading-5 text-[#b7bea8]">
              <div>Game ID: {PREVIEW_GAME_ID}</div>
              <div>Reporter ID: {PREVIEW_REPORTER_ID}</div>
              <div className="mt-2 text-[#88AA88]">{status}</div>
            </div>
          </aside>

          <div className="bg-[#243028] p-6">
            <div className="mx-auto max-w-xl">
              <CommentaryFeed entries={entries} soundsOn={false} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default CommentaryFeedPersistencePreview;
