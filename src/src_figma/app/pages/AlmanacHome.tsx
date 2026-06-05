import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Search } from "lucide-react";
import { searchCanonicalPlayers } from "../../../utils/almanacStorage";
import type { CanonicalPlayer } from "../../../utils/almanacStorage";
import { getAllTeams } from "../../../utils/leagueBuilderStorage";
import type { Team } from "../../../utils/leagueBuilderStorage";
import { backfillCanonicalPlayers } from "../../../utils/registerAlmanacPlayers";
import {
  searchArchivedPlayerInstances,
  type ExhibitionPlayerSearchEntry,
} from "../../../utils/almanacQueries";

interface TeamResult {
  team: Team;
  leagueId: string;
}

export function AlmanacHome() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [playerResults, setPlayerResults] = useState<CanonicalPlayer[]>([]);
  const [fallbackPlayerResults, setFallbackPlayerResults] = useState<
    ExhibitionPlayerSearchEntry[]
  >([]);
  const [teamResults, setTeamResults] = useState<TeamResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Backfill canonical players from any completed games missing registration
  useEffect(() => {
    backfillCanonicalPlayers().catch((err) =>
      console.error('[AlmanacHome] Backfill failed:', err)
    );
  }, []);

  // Live search as user types
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setPlayerResults([]);
      setFallbackPlayerResults([]);
      setTeamResults([]);
      setShowResults(false);
      return;
    }

    let cancelled = false;
    setSearching(true);

    async function search() {
      const [players, archivedPlayers, allTeams] = await Promise.all([
        searchCanonicalPlayers(trimmed),
        searchArchivedPlayerInstances(trimmed),
        getAllTeams(),
      ]);

      if (cancelled) return;

      const lowerQuery = trimmed.toLowerCase();
      const matchingTeams: TeamResult[] = allTeams
        .filter((t) => {
          const fullName = `${t.location} ${t.nickname}`.toLowerCase();
          return (
            fullName.includes(lowerQuery) ||
            t.abbreviation.toLowerCase().includes(lowerQuery) ||
            t.name.toLowerCase().includes(lowerQuery)
          );
        })
        .flatMap((t) =>
          t.leagueIds.length > 0
            ? t.leagueIds.map((lid) => ({ team: t, leagueId: lid }))
            : [{ team: t, leagueId: "exhibition" }],
        );

      const canonicalIds = new Set(players.map((player) => player.canonicalId));
      setPlayerResults(players.slice(0, 8));
      setFallbackPlayerResults(
        archivedPlayers
          .filter((player) => !canonicalIds.has(player.canonicalId))
          .slice(0, 8),
      );
      setTeamResults(matchingTeams.slice(0, 5));
      setShowResults(true);
      setSearching(false);
    }

    const timer = setTimeout(search, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Close results on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (resultsRef.current && !resultsRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const params = new URLSearchParams();
    const trimmedQuery = query.trim();

    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    }

    setShowResults(false);
    navigate(params.size > 0 ? `/almanac/players?${params.toString()}` : "/almanac/players");
  };

  const hasResults =
    playerResults.length > 0 ||
    fallbackPlayerResults.length > 0 ||
    teamResults.length > 0;

  return (
    <div className="min-h-screen bg-black text-white font-['Press_Start_2P'] px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-3 border-[5px] border-[#3366FF] bg-[#111111] px-4 py-3 text-[10px] text-white shadow-[6px_6px_0px_0px_rgba(221,0,0,0.85)] transition hover:bg-[#1a1a1a]"
          >
            <ArrowLeft className="h-4 w-4 shrink-0 text-white" />
            HOME
          </Link>
          <div className="border-[6px] border-[#3366FF] bg-white px-4 py-4 text-center text-black shadow-[8px_8px_0px_0px_#DD0000] sm:px-8">
            <div className="text-[11px] tracking-[0.28em] text-[#3366FF]">SMB</div>
            <h1 className="mt-2 text-sm leading-6 text-[#DD0000] sm:text-base">ALMANAC</h1>
          </div>
        </div>

        <div className="border-[6px] border-[#2B2B2B] bg-[#101010] p-5 shadow-[8px_8px_0px_0px_rgba(51,102,255,0.35)] sm:p-8">
          <p className="mb-6 text-[10px] leading-5 text-[#E8E8D8] sm:text-xs">
            SEARCH PLAYERS, TEAMS, AND GAMES ACROSS THE ARCHIVE.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label htmlFor="almanac-search" className="text-[10px] text-[#3366FF] sm:text-xs">
              QUICK SEARCH
            </label>
            <div className="relative flex flex-col gap-3 sm:flex-row" ref={resultsRef}>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3366FF]" />
                <input
                  id="almanac-search"
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onFocus={() => { if (query.trim()) setShowResults(true); }}
                  placeholder="Search players, teams, games..."
                  className="h-14 w-full border-[5px] border-[#3366FF] bg-[#1B1B1B] px-12 py-3 text-[10px] text-white outline-none placeholder:text-[9px] placeholder:text-[#8F96A3] focus:border-white"
                />

                {/* Dropdown results */}
                {showResults && query.trim() && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[400px] overflow-y-auto border-[5px] border-[#3366FF] bg-[#1B1B1B] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
                    {searching ? (
                      <div className="px-4 py-4 text-[9px] text-[#8F96A3]">SEARCHING...</div>
                    ) : !hasResults ? (
                      <div className="px-4 py-4 text-[9px] text-[#8F96A3]">NO RESULTS FOUND.</div>
                    ) : (
                      <>
                        {playerResults.length > 0 && (
                          <div>
                            <div className="border-b border-[#2B2B2B] px-4 py-3 text-[9px] text-[#3366FF]">
                              PLAYERS ({playerResults.length})
                            </div>
                            {playerResults.map((p) => (
                              <Link
                                key={p.canonicalId}
                                to={`/almanac/players/${p.canonicalId}`}
                                onClick={() => setShowResults(false)}
                                className="block border-b border-[#2B2B2B] px-4 py-3 text-[10px] text-white transition hover:bg-[#2B2B2B]"
                              >
                                {p.playerName}
                                <span className="ml-3 text-[8px] text-[#8F96A3]">
                                  {p.hometown.city}, {p.hometown.state}
                                </span>
                              </Link>
                            ))}
                          </div>
                        )}
                        {fallbackPlayerResults.length > 0 && (
                          <div>
                            <div className="border-b border-[#2B2B2B] px-4 py-3 text-[9px] text-[#C4A853]">
                              ARCHIVED INSTANCES ({fallbackPlayerResults.length})
                            </div>
                            {fallbackPlayerResults.map((p) => (
                              <Link
                                key={`${p.instanceId}-${p.playerId}`}
                                to={`/almanac/players/${p.canonicalId}/${p.instanceId}`}
                                onClick={() => setShowResults(false)}
                                className="block border-b border-[#2B2B2B] px-4 py-3 text-[10px] text-white transition hover:bg-[#2B2B2B]"
                              >
                                {p.playerName}
                                <span className="ml-3 text-[8px] text-[#8F96A3]">
                                  {p.teamName} • {p.games} G • {p.mode.toUpperCase()}
                                </span>
                              </Link>
                            ))}
                          </div>
                        )}
                        {teamResults.length > 0 && (
                          <div>
                            <div className="border-b border-[#2B2B2B] px-4 py-3 text-[9px] text-[#DD0000]">
                              TEAMS ({teamResults.length})
                            </div>
                            {teamResults.map((tr) => (
                              <Link
                                key={`${tr.leagueId}-${tr.team.id}`}
                                to={`/almanac/teams/${tr.leagueId}/${tr.team.id}`}
                                onClick={() => setShowResults(false)}
                                className="block border-b border-[#2B2B2B] px-4 py-3 text-[10px] text-white transition hover:bg-[#2B2B2B]"
                              >
                                {tr.team.location} {tr.team.nickname}
                                <span className="ml-3 text-[8px] text-[#8F96A3]">
                                  {tr.team.abbreviation}
                                </span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="h-14 border-[5px] border-[#AA0000] bg-[#DD0000] px-6 text-[10px] text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)] transition hover:bg-[#f01010] sm:min-w-[180px]"
              >
                SEARCH
              </button>
            </div>
          </form>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Link
            to="/almanac/exhibition"
            className="border-[6px] border-[#113399] bg-[#1A44CC] p-5 text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] transition hover:bg-[#2652e0]"
          >
            <div className="text-[10px] text-[#BFD0FF]">MODE 01</div>
            <div className="mt-3 text-sm leading-6">EXHIBITION</div>
            <div className="mt-4 text-[9px] leading-5 text-white/80">
              ALL-TIME LEADERS, GAME ARCHIVE, AND PLAYER HUBS.
            </div>
          </Link>

          <Link
            to="/almanac/narratives"
            className="border-[6px] border-[#8A1F1F] bg-[#B22B2B] p-5 text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] transition hover:bg-[#c53636]"
          >
            <div className="text-[10px] text-[#FFD2D2]">MODE 00</div>
            <div className="mt-3 text-sm leading-6">REPORTER ARCHIVE</div>
            <div className="mt-4 text-[9px] leading-5 text-white/80">
              HISTORICAL TIDBITS AND POST-GAME SUMMARIES ACROSS ALL MODES.
            </div>
          </Link>

          <Link
            to="/almanac/managers"
            className="border-[6px] border-[#285C38] bg-[#2D7A46] p-5 text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] transition hover:bg-[#368d52]"
          >
            <div className="text-[10px] text-[#CFF6DA]">MODE 04</div>
            <div className="mt-3 text-sm leading-6">MANAGERS</div>
            <div className="mt-4 text-[9px] leading-5 text-white/80">
              MANAGER VALUE, TACTICAL WPA, LINEUP DELTA, AND TENDENCIES.
            </div>
          </Link>

          <div
            className="border-[6px] border-[#4B4B4B] bg-[#232323] p-5 text-left text-[#E8E8D8] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.65)]"
          >
            <div className="text-[10px] text-[#707070]">MODE 02</div>
            <div className="mt-3 text-sm leading-6">FRANCHISE</div>
            <div className="mt-4 text-[9px] leading-5 text-[#B0B0B0]">
              ARCHIVE-BACKED FRANCHISE GAMES, PLAYER INSTANCES, AND TEAM LINKS
              ARE AVAILABLE. FULL FRANCHISE HISTORY HUB REMAINS DEFERRED.
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                to="/almanac/franchise"
                className="border-[4px] border-[#3366FF] bg-[#111111] px-3 py-2 text-[8px] text-white transition hover:bg-[#1a1a1a]"
              >
                FRANCHISE GAME ARCHIVE
              </Link>
              <Link
                to="/almanac/players?mode=franchise"
                className="border-[4px] border-[#3366FF] bg-[#111111] px-3 py-2 text-[8px] text-white transition hover:bg-[#1a1a1a]"
              >
                FRANCHISE PLAYER SEARCH
              </Link>
            </div>
          </div>

          <Link
            to="/almanac/elimination"
            className="border-[6px] border-[#8A6A1A] bg-[#B2871E] p-5 text-left text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] transition hover:bg-[#c99622]"
          >
            <div className="text-[10px] text-[#707070]">MODE 03</div>
            <div className="mt-3 text-sm leading-6">ELIMINATION</div>
            <div className="mt-4 text-[9px] leading-5 text-white/80">
              RUN ARCHIVES, HISTORICAL GAMES, AND ELIMINATION INSTANCES.
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
