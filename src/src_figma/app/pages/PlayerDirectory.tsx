import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import {
  getCanonicalPlayer,
  searchCanonicalPlayers,
} from "../../../utils/almanacStorage";
import type { CanonicalPlayer } from "../../../utils/almanacStorage";
import {
  searchArchivedPlayerInstances,
  type ExhibitionPlayerSearchEntry,
} from "../../../utils/almanacQueries";

export function PlayerDirectory() {
  const { canonicalId } = useParams<{ canonicalId: string }>();
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get("q") ?? "";

  const [player, setPlayer] = useState<CanonicalPlayer | null>(null);
  const [searchResults, setSearchResults] = useState<CanonicalPlayer[]>([]);
  const [fallbackResults, setFallbackResults] = useState<
    ExhibitionPlayerSearchEntry[]
  >([]);
  const [loading, setLoading] = useState(true);
  const isSinglePlayer = Boolean(canonicalId);
  const countUniqueInstances = (instances: CanonicalPlayer['instances']): number =>
    new Set(instances.map((instance) => `${instance.mode}::${instance.instanceId}`)).size;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      if (canonicalId) {
        const data = await getCanonicalPlayer(canonicalId);
        if (!cancelled) {
          setPlayer(data);
          setFallbackResults([]);
          setLoading(false);
        }
      } else {
        const [results, archivedResults] = await Promise.all([
          searchCanonicalPlayers(queryParam),
          searchArchivedPlayerInstances(queryParam),
        ]);
        if (!cancelled) {
          const canonicalIds = new Set(results.map((result) => result.canonicalId));
          setSearchResults(results);
          setFallbackResults(
            archivedResults.filter(
              (result) => !canonicalIds.has(result.canonicalId),
            ),
          );
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [canonicalId, queryParam]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white font-['Press_Start_2P'] px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-5xl text-center pt-20 text-[10px] text-[#8F96A3]">
          LOADING...
        </div>
      </div>
    );
  }

  // Single player directory hub
  if (isSinglePlayer) {
    if (!player) {
      return (
        <div className="min-h-screen bg-black text-white font-['Press_Start_2P'] px-4 py-6 sm:px-6">
          <div className="mx-auto flex max-w-5xl flex-col gap-6">
            <Link
              to="/almanac"
              className="inline-flex items-center gap-3 self-start border-[5px] border-[#3366FF] bg-[#111111] px-4 py-3 text-[10px] text-white shadow-[6px_6px_0px_0px_rgba(221,0,0,0.85)] transition hover:bg-[#1a1a1a]"
            >
              <ArrowLeft className="h-4 w-4 shrink-0 text-white" />
              ALMANAC
            </Link>
            <div className="border-[6px] border-[#2B2B2B] bg-[#101010] px-6 py-10 text-center text-[10px] text-[#8F96A3]">
              PLAYER NOT FOUND.
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-black text-white font-['Press_Start_2P'] px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <Link
            to="/almanac"
            className="inline-flex items-center gap-3 self-start border-[5px] border-[#3366FF] bg-[#111111] px-4 py-3 text-[10px] text-white shadow-[6px_6px_0px_0px_rgba(221,0,0,0.85)] transition hover:bg-[#1a1a1a]"
          >
            <ArrowLeft className="h-4 w-4 shrink-0 text-white" />
            ALMANAC
          </Link>

          {/* Player info */}
          <div className="border-[6px] border-[#2B2B2B] bg-[#101010] p-5 shadow-[8px_8px_0px_0px_rgba(51,102,255,0.35)] sm:p-8">
            <h1 className="text-sm leading-6 text-white sm:text-base">
              {player.playerName.toUpperCase()}
            </h1>
            <p className="mt-3 text-[10px] text-[#8F96A3]">
              {player.hometown.city}, {player.hometown.state}
            </p>
          </div>

          {/* Instances */}
          <div className="border-[6px] border-[#2B2B2B] bg-[#101010] p-5 shadow-[8px_8px_0px_0px_rgba(51,102,255,0.35)] sm:p-8">
            <h2 className="mb-5 text-xs text-[#3366FF]">INSTANCES</h2>

            {player.instances.length === 0 ? (
              <p className="text-[10px] leading-5 text-[#8F96A3]">
                NO INSTANCES RECORDED.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {Array.from(
                  new Map(
                    player.instances.map((instance) => [
                      `${instance.mode}::${instance.instanceId}`,
                      instance,
                    ]),
                  ).values(),
                ).map((inst) => (
                  <Link
                    key={`${inst.instanceId}-${inst.playerIdInInstance}`}
                    to={`/almanac/players/${player.canonicalId}/${inst.instanceId}`}
                    className="border-[5px] border-[#2B2B2B] bg-[#171717] p-4 transition hover:border-[#3366FF]"
                  >
                    <div className="text-[10px] text-white">{inst.instanceName}</div>
                    <div className="mt-2 text-[9px] text-[#8F96A3]">
                      {inst.mode.toUpperCase()}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Search results list
  return (
    <div className="min-h-screen bg-black text-white font-['Press_Start_2P'] px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/almanac"
            className="inline-flex items-center gap-3 border-[5px] border-[#3366FF] bg-[#111111] px-4 py-3 text-[10px] text-white shadow-[6px_6px_0px_0px_rgba(221,0,0,0.85)] transition hover:bg-[#1a1a1a]"
          >
            <ArrowLeft className="h-4 w-4 shrink-0 text-white" />
            ALMANAC
          </Link>

          <div className="border-[6px] border-[#3366FF] bg-white px-5 py-4 text-center text-black shadow-[8px_8px_0px_0px_#DD0000] sm:px-8">
            <h1 className="text-xs leading-6 text-[#DD0000] sm:text-sm">PLAYER SEARCH</h1>
          </div>

          <div className="w-[120px]" />
        </div>

        {queryParam && (
          <div className="text-[10px] text-[#8F96A3]">
            RESULTS FOR &quot;{queryParam.toUpperCase()}&quot; ({searchResults.length})
          </div>
        )}

        {searchResults.length === 0 && fallbackResults.length === 0 ? (
          <div className="border-[6px] border-[#2B2B2B] bg-[#101010] px-6 py-10 text-center text-[10px] text-[#8F96A3]">
            {queryParam
              ? "NO PLAYERS FOUND MATCHING YOUR SEARCH."
              : "NO PLAYERS IN THE ALMANAC YET. PLAY A GAME TO GET STARTED."}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {searchResults.map((p) => (
              <Link
                key={p.canonicalId}
                to={`/almanac/players/${p.canonicalId}`}
                className="border-[5px] border-[#2B2B2B] bg-[#101010] p-4 shadow-[6px_6px_0px_0px_rgba(51,102,255,0.25)] transition hover:border-[#3366FF] sm:p-5"
              >
                <div className="text-[10px] text-white">{p.playerName}</div>
                <div className="mt-2 text-[9px] text-[#8F96A3]">
                  {p.hometown.city}, {p.hometown.state} &bull; {countUniqueInstances(p.instances)} INSTANCE{countUniqueInstances(p.instances) !== 1 ? "S" : ""}
                </div>
              </Link>
            ))}
            {fallbackResults.map((p) => (
              <Link
                key={`${p.instanceId}-${p.playerId}`}
                to={`/almanac/players/${p.canonicalId}/${p.instanceId}`}
                className="border-[5px] border-[#2B2B2B] bg-[#101010] p-4 shadow-[6px_6px_0px_0px_rgba(196,168,83,0.18)] transition hover:border-[#C4A853] sm:p-5"
              >
                <div className="text-[10px] text-white">{p.playerName}</div>
                <div className="mt-2 text-[9px] text-[#8F96A3]">
                  {p.teamName} &bull; {p.games} G &bull; {p.mode.toUpperCase()} ARCHIVED INSTANCE
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
