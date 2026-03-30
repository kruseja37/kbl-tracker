import { useEffect, useState } from "react";
import { Link } from "react-router";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import {
  getExhibitionGames,
  getGameAtBatEvents,
  type ExhibitionGameFilters,
} from "../../../utils/almanacQueries";
import type { CompletedGameRecord } from "../../../utils/gameStorage";
import type { AtBatEvent } from "../../../utils/eventLog";

interface TeamOption {
  teamId: string;
  teamName: string;
}

interface GameBrowserRow {
  game: CompletedGameRecord;
  pogName: string | null;
  winningPitcher: string | null;
  losingPitcher: string | null;
  keyMoment: string | null;
}

function ordinal(value: number) {
  const remainder10 = value % 10;
  const remainder100 = value % 100;

  if (remainder10 === 1 && remainder100 !== 11) {
    return `${value}st`;
  }

  if (remainder10 === 2 && remainder100 !== 12) {
    return `${value}nd`;
  }

  if (remainder10 === 3 && remainder100 !== 13) {
    return `${value}rd`;
  }

  return `${value}th`;
}

function describeResult(result: AtBatEvent["result"]) {
  const labels: Record<AtBatEvent["result"], string> = {
    "1B": "singled",
    "2B": "doubled",
    "3B": "tripled",
    HR: "homered",
    ITPHR: "hit an inside-the-park home run",
    BB: "walked",
    IBB: "was intentionally walked",
    K: "struck out",
    Kc: "struck out looking",
    "Ꝁ": "struck out looking",
    GO: "grounded out",
    FO: "flied out",
    FLO: "flied out",
    LO: "lined out",
    PO: "popped out",
    DP: "grounded into a double play",
    TP: "hit into a triple play",
    SF: "hit a sacrifice fly",
    SAC: "laid down a sacrifice",
    HBP: "was hit by a pitch",
    E: "reached on an error",
    FC: "reached on a fielder's choice",
    D3K: "reached on a dropped third strike",
    WP_K: "reached after a wild-pitch strikeout",
    PB_K: "reached after a passed-ball strikeout",
    GRD: "hit a ground-rule double",
  };

  return labels[result] ?? "made a play";
}

function getPogName(game: CompletedGameRecord, events: AtBatEvent[]) {
  const pogPlayerId = game.pogPlayerId ?? game.playersOfTheGame?.first;

  if (pogPlayerId) {
    const battingPlayer = game.playerStats[pogPlayerId];
    if (battingPlayer) {
      return battingPlayer.playerName;
    }

    const pitcher = game.pitcherGameStats.find((entry) => entry.pitcherId === pogPlayerId);
    if (pitcher) {
      return pitcher.pitcherName;
    }
  }

  const topEvent = [...events].sort((a, b) => Math.abs(b.wpa) - Math.abs(a.wpa))[0];
  return topEvent?.batterName ?? null;
}

function getPitcherDecisionName(game: CompletedGameRecord, decision: "W" | "L") {
  return game.pitcherGameStats.find((pitcher) => pitcher.decision === decision)?.pitcherName ?? null;
}

function getKeyMoment(events: AtBatEvent[]) {
  if (events.length === 0) {
    return null;
  }

  const topEvent = [...events].sort((a, b) => Math.abs(b.wpa) - Math.abs(a.wpa))[0];
  if (!topEvent) {
    return null;
  }

  const half = topEvent.halfInning === "TOP" ? "Top" : "Bottom";
  return `${topEvent.batterName} ${describeResult(topEvent.result)} in the ${half} ${ordinal(topEvent.inning)}`;
}

function buildTeamOptions(games: CompletedGameRecord[]): TeamOption[] {
  const options = new Map<string, TeamOption>();

  for (const game of games) {
    options.set(game.awayTeamId, { teamId: game.awayTeamId, teamName: game.awayTeamName });
    options.set(game.homeTeamId, { teamId: game.homeTeamId, teamName: game.homeTeamName });
  }

  return Array.from(options.values()).sort((a, b) => a.teamName.localeCompare(b.teamName));
}

export function GameBrowser() {
  const [filters, setFilters] = useState<ExhibitionGameFilters>({});
  const [teamOptions, setTeamOptions] = useState<TeamOption[]>([]);
  const [rows, setRows] = useState<GameBrowserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadTeams() {
      const games = await getExhibitionGames();
      if (cancelled) {
        return;
      }

      setTeamOptions(buildTeamOptions(games));
    }

    loadTeams();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadGames() {
      setIsLoading(true);

      try {
        const games = await getExhibitionGames(filters);
        const eventLists = await Promise.all(games.map((game) => getGameAtBatEvents(game.gameId)));

        if (cancelled) {
          return;
        }

        setRows(
          games.map((game, index) => ({
            game,
            pogName: getPogName(game, eventLists[index]),
            winningPitcher: getPitcherDecisionName(game, "W"),
            losingPitcher: getPitcherDecisionName(game, "L"),
            keyMoment: getKeyMoment(eventLists[index]),
          }))
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadGames();

    return () => {
      cancelled = true;
    };
  }, [filters]);

  return (
    <div className="min-h-screen bg-black px-4 py-6 font-['Press_Start_2P'] text-white sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/almanac/exhibition"
            className="inline-flex items-center gap-3 self-start border-[5px] border-[#3366FF] bg-[#111111] px-4 py-3 text-[10px] text-white shadow-[6px_6px_0px_0px_rgba(221,0,0,0.85)] transition hover:bg-[#1a1a1a]"
          >
            <ArrowLeft className="h-4 w-4 shrink-0 text-white" />
            BACK
          </Link>

          <div className="border-[6px] border-[#3366FF] bg-white px-5 py-4 text-center text-black shadow-[8px_8px_0px_0px_#DD0000] sm:px-8">
            <h1 className="text-xs leading-6 text-[#DD0000] sm:text-sm">EXHIBITION GAMES</h1>
          </div>

          <div className="hidden sm:block sm:w-[104px]" />
        </div>

        <div className="border-[6px] border-[#2B2B2B] bg-[#101010] p-5 shadow-[8px_8px_0px_0px_rgba(51,102,255,0.35)] sm:p-6">
          <div className="grid gap-4 md:grid-cols-4">
            <label className="flex flex-col gap-3 text-[9px] text-[#3366FF] sm:text-[10px]">
              FROM
              <input
                type="date"
                value={filters.dateFrom ?? ""}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    dateFrom: event.target.value || undefined,
                  }))
                }
                className="h-12 border-[4px] border-[#3366FF] bg-[#161616] px-3 text-[9px] text-white outline-none focus:border-white"
              />
            </label>

            <label className="flex flex-col gap-3 text-[9px] text-[#3366FF] sm:text-[10px]">
              TO
              <input
                type="date"
                value={filters.dateTo ?? ""}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    dateTo: event.target.value || undefined,
                  }))
                }
                className="h-12 border-[4px] border-[#3366FF] bg-[#161616] px-3 text-[9px] text-white outline-none focus:border-white"
              />
            </label>

            <label className="flex flex-col gap-3 text-[9px] text-[#3366FF] sm:text-[10px]">
              TEAM
              <select
                value={filters.teamId ?? ""}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    teamId: event.target.value || undefined,
                  }))
                }
                className="h-12 border-[4px] border-[#3366FF] bg-[#161616] px-3 text-[9px] text-white outline-none focus:border-white"
              >
                <option value="">All teams</option>
                {teamOptions.map((team) => (
                  <option key={team.teamId} value={team.teamId}>
                    {team.teamName}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-3 text-[9px] text-[#3366FF] sm:text-[10px]">
              OPPONENT
              <select
                value={filters.opponentId ?? ""}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    opponentId: event.target.value || undefined,
                  }))
                }
                className="h-12 border-[4px] border-[#3366FF] bg-[#161616] px-3 text-[9px] text-white outline-none focus:border-white"
              >
                <option value="">All opponents</option>
                {teamOptions.map((team) => (
                  <option key={team.teamId} value={team.teamId}>
                    {team.teamName}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {isLoading ? (
          <div className="border-[6px] border-[#2B2B2B] bg-[#101010] px-6 py-10 text-center text-xs text-[#E8E8D8]">
            Loading...
          </div>
        ) : rows.length === 0 ? (
          <div className="border-[6px] border-[#2B2B2B] bg-[#101010] px-6 py-10 text-center text-xs text-[#E8E8D8]">
            No exhibition games recorded yet.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {rows.map(({ game, pogName, winningPitcher, losingPitcher, keyMoment }) => (
              <Link
                key={game.gameId}
                to={`/almanac/games/${game.gameId}`}
                className="block border-[6px] border-[#2B2B2B] bg-[#101010] p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.7)] transition hover:border-[#3366FF] hover:bg-[#141414]"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="text-[9px] text-[#3366FF] sm:text-[10px]">
                        {format(new Date(game.date), "MMM dd, yyyy")}
                      </div>
                      <div className="text-sm leading-6 text-white sm:text-base">
                        {game.awayTeamName} @ {game.homeTeamName}
                      </div>
                    </div>

                    <div className="border-[4px] border-[#DD0000] bg-[#1A1A1A] px-4 py-3 text-center text-sm text-white sm:min-w-[150px]">
                      {game.finalScore.away} - {game.finalScore.home}
                    </div>
                  </div>

                  <div className="grid gap-3 text-[9px] leading-5 text-[#E8E8D8] sm:grid-cols-3 sm:text-[10px]">
                    <div>
                      <span className="text-[#3366FF]">POG:</span>{" "}
                      <span className="text-white">{pogName ?? "Unavailable"}</span>
                    </div>
                    <div>
                      <span className="text-[#3366FF]">W/L:</span>{" "}
                      <span className="text-white">
                        {winningPitcher ?? "?"} / {losingPitcher ?? "?"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#3366FF]">KEY MOMENT:</span>{" "}
                      <span className="text-white">{keyMoment ?? "No play log available."}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
