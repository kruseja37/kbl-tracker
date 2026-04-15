import { useState } from "react";

import { FAME_EVENT_LABELS, FAME_VALUES, type FameEventType } from "../../../types/game";
import type { CompletedGameRecord } from "../../../utils/gameStorage";
import {
  formatFameValue,
  getFameColor,
  getFameIcon,
  type FameGameMode,
} from "../engines/fameIntegration";

type FameEventRecord =
  CompletedGameRecord["fameEvents"] extends Array<infer U> ? U : never;

export type FameLeaderboardGameSource = Pick<
  CompletedGameRecord,
  | "gameId"
  | "awayTeamId"
  | "awayTeamName"
  | "homeTeamId"
  | "homeTeamName"
  | "fameEvents"
  | "competitionId"
  | "competitionType"
>;

export interface FameLeaderboardEntry {
  playerId: string;
  playerName: string;
  playerTeam: string;
  totalFame: number;
  eventCount: number;
  runTotal: number;
  events: FameEventRecord[];
}

interface FameLeaderboardColumnData {
  teamId: string;
  teamName: string;
  subtitle: string;
  entries: FameLeaderboardEntry[];
}

interface FameLeaderboardCardProps {
  game: FameLeaderboardGameSource;
  gameMode: FameGameMode;
  initialExpandedPlayerIds?: string[];
  runTotalsByPlayerId?: Record<string, number>;
}

function normalizeTeamId(teamId: string | undefined | null): string {
  return (teamId ?? "").trim().toLowerCase();
}

function isKnownFameEventType(eventType: string): eventType is FameEventType {
  return Object.prototype.hasOwnProperty.call(FAME_VALUES, eventType);
}

function getEventIcon(event: FameEventRecord): string {
  return isKnownFameEventType(event.eventType) ? getFameIcon(event.eventType) : "⚾";
}

function getEventLabel(event: FameEventRecord): string {
  if (isKnownFameEventType(event.eventType)) {
    return FAME_EVENT_LABELS[event.eventType] ?? event.eventType.replace(/_/g, " ");
  }

  return event.eventType.replace(/_/g, " ");
}

function buildRunTotalsStub(
  entries: FameLeaderboardEntry[],
  runTotalsByPlayerId?: Record<string, number>,
): FameLeaderboardEntry[] {
  return entries.map((entry) => ({
    ...entry,
    runTotal: runTotalsByPlayerId?.[entry.playerId] ?? entry.totalFame,
  }));
}

function buildSubtitle(
  gameMode: FameGameMode,
  entries: FameLeaderboardEntry[],
): string {
  if (gameMode === "exhibition") {
    return "This Game";
  }

  if (gameMode === "elimination") {
    const values = entries
      .slice(0, 3)
      .map((entry) => formatFameValue(entry.runTotal))
      .join(" / ");

    return values.length > 0
      ? `This Game — Run total: ${values}`
      : "This Game — Run total: 0.0";
  }

  return "This Game — Season top-10";
}

export function buildFameLeaderboardEntries(
  game: FameLeaderboardGameSource,
  teamId: string,
  runTotalsByPlayerId?: Record<string, number>,
): FameLeaderboardEntry[] {
  const normalizedTeamId = normalizeTeamId(teamId);
  const groupedEntries = new Map<string, FameLeaderboardEntry>();

  for (const event of game.fameEvents) {
    if (normalizeTeamId(event.playerTeam) !== normalizedTeamId) {
      continue;
    }

    const existing = groupedEntries.get(event.playerId);
    if (existing) {
      existing.totalFame += event.fameValue;
      existing.eventCount += 1;
      existing.events.push(event);
      continue;
    }

    groupedEntries.set(event.playerId, {
      playerId: event.playerId,
      playerName: event.playerName,
      playerTeam: event.playerTeam,
      totalFame: event.fameValue,
      eventCount: 1,
      runTotal: event.fameValue,
      events: [event],
    });
  }

  return buildRunTotalsStub(Array.from(groupedEntries.values()), runTotalsByPlayerId)
    .map((entry) => ({
      ...entry,
      events: [...entry.events].sort((left, right) => right.timestamp - left.timestamp),
    }))
    .sort((left, right) => {
      if (right.totalFame !== left.totalFame) {
        return right.totalFame - left.totalFame;
      }

      if (right.eventCount !== left.eventCount) {
        return right.eventCount - left.eventCount;
      }

      return left.playerName.localeCompare(right.playerName);
    })
    .slice(0, 3);
}

function buildColumnData(
  game: FameLeaderboardGameSource,
  gameMode: FameGameMode,
  teamId: string,
  teamName: string,
  runTotalsByPlayerId?: Record<string, number>,
): FameLeaderboardColumnData {
  const entries = buildFameLeaderboardEntries(game, teamId, runTotalsByPlayerId);

  return {
    teamId,
    teamName,
    subtitle: buildSubtitle(gameMode, entries),
    entries,
  };
}

function EmptyState({ teamName }: { teamName: string }) {
  return (
    <div className="border-[4px] border-dashed border-[#5F6F57] bg-[#18211A] px-4 py-5 text-[9px] leading-5 text-[#A8B8A2] sm:text-[10px]">
      No Fame events recorded for {teamName}.
    </div>
  );
}

function EventBreakdown({ events }: { events: FameEventRecord[] }) {
  return (
    <div className="mt-3 space-y-2 border-t border-[#556B55]/60 pt-3">
      {events.map((event) => (
        <div
          key={event.id}
          className="flex items-start justify-between gap-3 border-[2px] border-[#314437] bg-[#18211A] px-3 py-2"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] text-[#E8E8D8]">
              <span aria-hidden="true">{getEventIcon(event)}</span>
              <span className="uppercase tracking-[0.12em]">{getEventLabel(event)}</span>
            </div>
            <div className="mt-1 text-[8px] leading-4 text-[#A8B8A2] sm:text-[9px]">
              {event.description ?? "Archived Fame swing"}
            </div>
          </div>
          <div
            className="shrink-0 text-[10px] sm:text-[11px]"
            style={{ color: getFameColor(event.fameValue) }}
          >
            {formatFameValue(event.fameValue)}
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamColumn({
  column,
  expandedPlayerIds,
  onToggle,
}: {
  column: FameLeaderboardColumnData;
  expandedPlayerIds: Set<string>;
  onToggle: (playerId: string) => void;
}) {
  return (
    <section
      className="border-[4px] border-[#556B55] bg-[#233026] p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.28)]"
      data-testid={`fame-leaderboard-column-${normalizeTeamId(column.teamId)}`}
    >
      <div className="border-b border-[#C4A853]/30 pb-3">
        <div
          className="text-sm text-[#F0DFC2]"
          style={{ fontFamily: "'Tox Typewriter', monospace" }}
        >
          {column.teamName.toUpperCase()}
        </div>
        <div className="mt-2 text-[9px] uppercase tracking-[0.18em] text-[#A8B8A2] sm:text-[10px]">
          {column.subtitle}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {column.entries.length === 0 ? (
          <EmptyState teamName={column.teamName} />
        ) : (
          column.entries.map((entry, index) => {
            const isExpanded = expandedPlayerIds.has(entry.playerId);

            return (
              <article
                key={`${column.teamId}-${entry.playerId}`}
                className="border-[4px] border-[#314437] bg-[#1B241D] px-4 py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-[#C4A853]">#{index + 1}</span>
                      <div
                        className="truncate text-sm text-[#E8E8D8]"
                        style={{ fontFamily: "'Tox Typewriter', monospace" }}
                      >
                        {entry.playerName}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[8px] uppercase tracking-[0.16em] text-[#A8B8A2] sm:text-[9px]">
                      <span>{entry.eventCount} events</span>
                      <span>Run total {formatFameValue(entry.runTotal)}</span>
                    </div>
                  </div>

                  <div
                    className="shrink-0 text-base sm:text-lg"
                    style={{ color: getFameColor(entry.totalFame) }}
                  >
                    {formatFameValue(entry.totalFame)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onToggle(entry.playerId)}
                  className="mt-3 inline-flex items-center border border-[#556B55] bg-[#111814] px-3 py-2 text-[8px] uppercase tracking-[0.18em] text-[#CBB89C] transition hover:border-[#C4A853] hover:text-[#F0DFC2] sm:text-[9px]"
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? "Hide Events" : "Show Events"}
                </button>

                {isExpanded ? <EventBreakdown events={entry.events} /> : null}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

export function FameLeaderboardCard({
  game,
  gameMode,
  initialExpandedPlayerIds = [],
  runTotalsByPlayerId,
}: FameLeaderboardCardProps) {
  const [expandedPlayerIds, setExpandedPlayerIds] = useState(
    () => new Set(initialExpandedPlayerIds),
  );

  const awayColumn = buildColumnData(
    game,
    gameMode,
    game.awayTeamId,
    game.awayTeamName,
    runTotalsByPlayerId,
  );
  const homeColumn = buildColumnData(
    game,
    gameMode,
    game.homeTeamId,
    game.homeTeamName,
    runTotalsByPlayerId,
  );

  if (gameMode === "franchise" || gameMode === "playoff") {
    return (
      <section
        className="bg-[#1f2b21] border-2 border-[#314437] p-4 mb-4 rounded-sm"
        data-testid="fame-leaderboard-card"
      >
        <div className="text-xs text-[#C4A853] tracking-[0.3em] font-bold">
          FAME LEADERBOARD
        </div>
        <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[#A8B8A2]">
          This Game — Season top-10
        </div>
        <div className="mt-4 border-[4px] border-dashed border-[#556B55] bg-[#18211A] px-4 py-5 text-[9px] leading-5 text-[#A8B8A2] sm:text-[10px]">
          Franchise Fame leaderboard integration is coming in a later phase.
        </div>
      </section>
    );
  }

  function togglePlayer(playerId: string) {
    setExpandedPlayerIds((current) => {
      const next = new Set(current);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      return next;
    });
  }

  return (
    <section
      className="bg-[#1f2b21] border-2 border-[#314437] p-4 mb-4 rounded-sm"
      data-testid="fame-leaderboard-card"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#C4A853]/30 pb-3">
        <div>
          <div className="text-xs text-[#C4A853] tracking-[0.3em] font-bold">
            FAME LEADERBOARD
          </div>
          <div className="mt-2 text-[9px] uppercase tracking-[0.18em] text-[#A8B8A2] sm:text-[10px]">
            Top 3 Fame earners per side
          </div>
        </div>
        <div className="text-[9px] uppercase tracking-[0.18em] text-[#CBB89C] sm:text-[10px]">
          {gameMode === "elimination" ? "Elimination" : "Exhibition"}
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <TeamColumn
          column={awayColumn}
          expandedPlayerIds={expandedPlayerIds}
          onToggle={togglePlayer}
        />
        <TeamColumn
          column={homeColumn}
          expandedPlayerIds={expandedPlayerIds}
          onToggle={togglePlayer}
        />
      </div>
    </section>
  );
}

export default FameLeaderboardCard;
