import { useEffect, useState } from "react";
import type { CompletedGameRecord } from "../../../utils/gameStorage";
import {
  getPlayerRunFame as loadPlayerRunFame,
  type PlayerRunFame,
} from "../../../utils/eliminationRunFameStorage";
import {
  FAME_VALUES,
  type FameEventType,
} from "../../../types/game";
import {
  createGameFameTracker,
  formatFameValue,
  getFameColor,
  getPlayerGameEvents,
  getPlayerGameFame,
  formatFameEvent,
  type FameEventDisplay,
  type FameGameMode,
  type GameFameTracker,
  type FameResult,
} from "../engines/fameIntegration";
import { formatTimelineDate } from "../utils/almanacPlayerViews";

export type PlayerFameGameSource = Pick<CompletedGameRecord, "gameId" | "fameEvents">;

interface PlayerFameSectionProps {
  game?: PlayerFameGameSource | null;
  gameMode: FameGameMode;
  playerId: string;
  runId?: string | null;
}

interface ArchivedDisplayEvent extends FameEventDisplay {
  timestamp: number;
  inning: number;
  halfInning: "TOP" | "BOTTOM";
}

function isKnownFameEventType(eventType: string): eventType is FameEventType {
  return Object.prototype.hasOwnProperty.call(FAME_VALUES, eventType);
}

function buildArchivedFameResult(
  eventType: FameEventType,
  savedFameValue: number,
  fameType: "bonus" | "boner",
  gameMode: FameGameMode,
): FameResult {
  const formatted = formatFameEvent(eventType, 1, gameMode);
  const baseWithPlayoff = formatted.baseFame * formatted.playoffMultiplier;
  const liMultiplier = baseWithPlayoff === 0 ? 1 : savedFameValue / baseWithPlayoff;

  return {
    baseFame: formatted.baseFame,
    liMultiplier,
    playoffMultiplier: formatted.playoffMultiplier,
    finalFame: savedFameValue,
    isBonus: fameType === "bonus",
    isBoner: fameType === "boner",
  };
}

function buildArchivedGameFameTracker(
  game: PlayerFameGameSource | null | undefined,
  gameMode: FameGameMode,
): GameFameTracker {
  const tracker = createGameFameTracker(game?.gameId ?? "player-fame-preview");

  if (!game) {
    return tracker;
  }

  return {
    ...tracker,
    events: game.fameEvents.flatMap((event) => {
      if (!isKnownFameEventType(event.eventType)) {
        return [];
      }

      return [
        {
          eventType: event.eventType,
          playerId: event.playerId,
          playerName: event.playerName,
          result: buildArchivedFameResult(
            event.eventType,
            event.fameValue,
            event.fameType,
            gameMode,
          ),
          inning: event.inning,
          halfInning: event.halfInning,
          timestamp: event.timestamp,
        },
      ];
    }),
  };
}

function getArchivedDisplayEvents(
  tracker: GameFameTracker,
  playerId: string,
): ArchivedDisplayEvent[] {
  const trackerEvents = tracker.events.filter((event) => event.playerId === playerId);
  const displayEvents = getPlayerGameEvents(tracker, playerId);

  return displayEvents.map((event, index) => ({
    ...event,
    timestamp: trackerEvents[index]?.timestamp ?? 0,
    inning: trackerEvents[index]?.inning ?? 0,
    halfInning: trackerEvents[index]?.halfInning ?? "TOP",
  }));
}

function formatEventStamp(
  event: ArchivedDisplayEvent,
): string {
  const halfLabel = event.halfInning === "TOP" ? "Top" : "Bot";
  return `${halfLabel} ${event.inning} · ${formatTimelineDate(event.timestamp)}`;
}

export { getPlayerRunFame } from "../../../utils/eliminationRunFameStorage";

export function PlayerFameSection({
  game,
  gameMode,
  playerId,
  runId,
}: PlayerFameSectionProps) {
  const [runFame, setRunFame] = useState<PlayerRunFame>({
    totalFame: 0,
    events: [],
    gamesPlayed: 0,
  });

  useEffect(() => {
    let isCancelled = false;

    if (gameMode !== "elimination" || !runId) {
      setRunFame({
        totalFame: 0,
        events: [],
        gamesPlayed: 0,
      });
      return () => {
        isCancelled = true;
      };
    }

    void loadPlayerRunFame(runId, playerId).then((nextRunFame) => {
      if (!isCancelled) {
        setRunFame(nextRunFame);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [gameMode, playerId, runId]);

  if (gameMode === "franchise" || gameMode === "playoff") {
    return (
      <section className="border-[6px] border-[#5B4A24] bg-[#17120D] p-5 text-[#F5E8CF] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.45)] sm:p-6">
        <div className="border-b-[4px] border-[#8A6A1A] pb-3 text-[10px] text-[#D8A84A] sm:text-xs">
          GAME FAME
        </div>
        <div className="mt-5 border-[4px] border-dashed border-[#6E5730] bg-[#21180E] px-5 py-6 text-[9px] leading-5 text-[#CBB89C] sm:text-[10px]">
          Franchise Fame rollup — coming soon.
        </div>
      </section>
    );
  }

  const tracker = buildArchivedGameFameTracker(game, gameMode);
  const gameFame = getPlayerGameFame(tracker, playerId);
  const events = getArchivedDisplayEvents(tracker, playerId);

  return (
    <section className="border-[6px] border-[#5B4A24] bg-[#17120D] p-5 text-[#F5E8CF] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.45)] sm:p-6">
      <div className="border-b-[4px] border-[#8A6A1A] pb-3 text-[10px] text-[#D8A84A] sm:text-xs">
        GAME FAME
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="border-[4px] border-[#4B5D46] bg-[#101810] px-4 py-4">
          <div className="text-[8px] uppercase tracking-[0.18em] text-[#A8B8A2] sm:text-[9px]">
            This Game
          </div>
          <div
            className="mt-3 text-lg sm:text-xl"
            style={{ color: getFameColor(gameFame) }}
          >
            {formatFameValue(gameFame)}
          </div>
        </div>

        {gameMode === "elimination" ? (
          <div className="border-[4px] border-[#4F3D12] bg-[#1A140A] px-4 py-4">
            <div className="text-[8px] uppercase tracking-[0.18em] text-[#D8A84A] sm:text-[9px]">
              Run To Date
            </div>
            <div
              className="mt-3 text-lg sm:text-xl"
              style={{ color: getFameColor(runFame.totalFame) }}
            >
              {formatFameValue(runFame.totalFame)}
            </div>
          </div>
        ) : (
          <div className="border-[4px] border-[#3C3020] bg-[#130F0B] px-4 py-4">
            <div className="text-[8px] uppercase tracking-[0.18em] text-[#BDAE8B] sm:text-[9px]">
              Event Count
            </div>
            <div className="mt-3 text-lg text-[#F2C041] sm:text-xl">
              {events.length}
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 space-y-3">
        {events.length === 0 ? (
          <div className="border-[4px] border-[#403224] bg-[#1C140D] px-4 py-5 text-[9px] text-[#CBB89C] sm:text-[10px]">
            No Fame swings recorded for this player in the selected game.
          </div>
        ) : (
          events.map((event, index) => (
            <div
              key={`${event.eventType}-${event.timestamp}-${index}`}
              className="border-[4px] px-4 py-4"
              style={{
                borderColor: event.finalFame >= 0 ? "#4B5D46" : "#6D2B2B",
                backgroundColor: event.finalFame >= 0 ? "#101810" : "#1C0E0E",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 text-[10px] text-[#F5E8CF] sm:text-[11px]">
                    <span aria-hidden="true" className="text-base leading-none">
                      {event.icon}
                    </span>
                    <span className="truncate uppercase tracking-[0.08em]">
                      {event.label}
                    </span>
                  </div>
                  <div className="mt-2 text-[8px] leading-5 text-[#BDAE8B] sm:text-[9px]">
                    {event.description}
                  </div>
                  <div className="mt-2 text-[8px] uppercase tracking-[0.16em] text-[#8F9B84] sm:text-[9px]">
                    {formatEventStamp(event)}
                  </div>
                </div>

                <div
                  className="shrink-0 text-sm sm:text-base"
                  style={{ color: getFameColor(event.finalFame) }}
                >
                  {formatFameValue(event.finalFame)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default PlayerFameSection;
