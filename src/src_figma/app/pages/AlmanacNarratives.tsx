import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, BookOpenText, Newspaper } from "lucide-react";
import {
  listAlmanacNarrativeArchive,
  type AlmanacNarrativeArchiveEntry,
  type AlmanacNarrativeKind,
} from "../../../utils/almanacNarrativeArchive";
import type { ReporterGameMode } from "../../../types/reporter";

const KIND_FILTERS: Array<{ value: AlmanacNarrativeKind | "all"; label: string }> = [
  { value: "all", label: "ALL" },
  { value: "historical-tidbit", label: "TIDBITS" },
  { value: "post-game-story", label: "POST-GAME" },
];

const MODE_FILTERS: Array<{ value: ReporterGameMode | "all"; label: string }> = [
  { value: "all", label: "ALL MODES" },
  { value: "exhibition", label: "EXHIBITION" },
  { value: "elimination", label: "ELIMINATION" },
  { value: "franchise", label: "FRANCHISE" },
];

function formatArchiveDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(timestamp);
}

function modeLabel(mode: ReporterGameMode): string {
  return mode.toUpperCase();
}

function kindLabel(kind: AlmanacNarrativeKind): string {
  return kind === "historical-tidbit" ? "HISTORICAL TIDBIT" : "POST-GAME SUMMARY";
}

function kindIcon(kind: AlmanacNarrativeKind) {
  return kind === "historical-tidbit" ? (
    <BookOpenText className="h-4 w-4" />
  ) : (
    <Newspaper className="h-4 w-4" />
  );
}

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-[4px] px-3 py-2 text-[9px] transition sm:text-[10px] ${
        active
          ? "border-[#DD0000] bg-[#DD0000] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)]"
          : "border-[#3366FF] bg-[#141414] text-[#BFD0FF] hover:bg-[#1d1d1d]"
      }`}
    >
      {label}
    </button>
  );
}

export function AlmanacNarratives() {
  const [entries, setEntries] = useState<AlmanacNarrativeArchiveEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState<AlmanacNarrativeKind | "all">("all");
  const [modeFilter, setModeFilter] = useState<ReporterGameMode | "all">("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);

      try {
        const archiveEntries = await listAlmanacNarrativeArchive();
        if (!cancelled) {
          setEntries(archiveEntries);
        }
      } catch (error) {
        console.error("[AlmanacNarratives] Failed to load archive.", error);
        if (!cancelled) {
          setEntries([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) => (kindFilter === "all" ? true : entry.kind === kindFilter)).filter((entry) =>
        modeFilter === "all" ? true : entry.gameMode === modeFilter,
      ),
    [entries, kindFilter, modeFilter],
  );

  return (
    <div className="min-h-screen bg-black px-4 py-6 font-['Press_Start_2P'] text-white sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/almanac"
            className="inline-flex items-center gap-3 self-start border-[5px] border-[#3366FF] bg-[#111111] px-4 py-3 text-[10px] text-white shadow-[6px_6px_0px_0px_rgba(221,0,0,0.85)] transition hover:bg-[#1a1a1a]"
          >
            <ArrowLeft className="h-4 w-4 shrink-0 text-white" />
            BACK
          </Link>

          <div className="border-[6px] border-[#3366FF] bg-white px-5 py-4 text-center text-black shadow-[8px_8px_0px_0px_#DD0000] sm:px-8">
            <div className="text-[10px] tracking-[0.28em] text-[#3366FF]">ALMANAC</div>
            <h1 className="mt-2 text-xs leading-6 text-[#DD0000] sm:text-sm">REPORTER ARCHIVE</h1>
          </div>

          <div className="hidden sm:block sm:w-[104px]" />
        </div>

        <div className="border-[6px] border-[#2B2B2B] bg-[#101010] p-5 shadow-[8px_8px_0px_0px_rgba(51,102,255,0.35)] sm:p-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="text-[9px] text-[#3366FF] sm:text-[10px]">ARCHIVE TYPE</div>
              <div className="flex flex-wrap gap-2">
                {KIND_FILTERS.map((filter) => (
                  <FilterButton
                    key={filter.value}
                    active={kindFilter === filter.value}
                    label={filter.label}
                    onClick={() => setKindFilter(filter.value)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-[9px] text-[#3366FF] sm:text-[10px]">MODE</div>
              <div className="flex flex-wrap gap-2">
                {MODE_FILTERS.map((filter) => (
                  <FilterButton
                    key={filter.value}
                    active={modeFilter === filter.value}
                    label={filter.label}
                    onClick={() => setModeFilter(filter.value)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="border-[6px] border-[#2B2B2B] bg-[#101010] px-6 py-10 text-center text-xs text-[#E8E8D8]">
            Loading archive...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="border-[6px] border-[#2B2B2B] bg-[#101010] px-6 py-10 text-center text-xs text-[#E8E8D8]">
            No archived tidbits or post-game summaries match the current filters.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredEntries.map((entry) => (
              <article
                key={entry.id}
                className="border-[6px] border-[#2B2B2B] bg-[#101010] p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.7)]"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2 text-[8px] sm:text-[9px]">
                        <span className="inline-flex items-center gap-2 border-[3px] border-[#3366FF] bg-[#16203A] px-2 py-1 text-[#BFD0FF]">
                          {kindIcon(entry.kind)}
                          {kindLabel(entry.kind)}
                        </span>
                        <span className="border-[3px] border-[#DD0000] bg-[#2B1111] px-2 py-1 text-[#FFB0B0]">
                          {modeLabel(entry.gameMode)}
                        </span>
                        {entry.sourceLabel ? (
                          <span className="border-[3px] border-[#C4A853] bg-[#2A2110] px-2 py-1 text-[#F1D79A]">
                            {entry.sourceLabel}
                          </span>
                        ) : null}
                        {entry.halfInningLabel ? (
                          <span className="border-[3px] border-[#4B4B4B] bg-[#1A1A1A] px-2 py-1 text-[#C4C4C4]">
                            {entry.halfInningLabel}
                          </span>
                        ) : null}
                      </div>

                      <div className="text-[9px] text-[#3366FF] sm:text-[10px]">
                        {formatArchiveDate(entry.timestamp)}
                      </div>

                      <h2 className="text-sm leading-6 text-white sm:text-base">{entry.headline}</h2>

                      {entry.awayTeamName && entry.homeTeamName ? (
                        <div className="text-[9px] leading-5 text-[#E8E8D8] sm:text-[10px]">
                          {entry.awayTeamName} @ {entry.homeTeamName}
                        </div>
                      ) : null}
                    </div>

                    <Link
                      to={`/almanac/games/${entry.gameId}`}
                      className="inline-flex items-center justify-center border-[4px] border-[#3366FF] bg-[#111111] px-4 py-3 text-[9px] text-white transition hover:bg-[#1a1a1a]"
                    >
                      GAME
                    </Link>
                  </div>

                  <div className="whitespace-pre-wrap text-[9px] leading-6 text-[#E8E8D8] sm:text-[10px]">
                    {entry.body}
                  </div>

                  {entry.sourceUrl ? (
                    <div>
                      <a
                        href={entry.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[8px] text-[#8CCBFF] underline decoration-[#35597C] decoration-2 underline-offset-4 hover:text-white sm:text-[9px]"
                      >
                        VIEW SOURCE
                      </a>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
