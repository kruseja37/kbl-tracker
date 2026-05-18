import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import {
  getExhibitionBattingLeaders,
  getExhibitionPitchingLeaders,
  type ExhibitionBattingLeaderStat,
  type ExhibitionLeaderEntry,
  type ExhibitionPitchingLeaderStat,
} from "../../../utils/almanacQueries";
import { getAllExhibitionTeamImpactLeaderboards, type TeamImpactLeaderboards } from "../../../utils/teamImpact";
import { TeamImpactLeaderboardsPanel } from "../components/TeamImpactLeaderboardsPanel";

const battingCategories: Array<{ stat: ExhibitionBattingLeaderStat; label: string }> = [
  { stat: "ba", label: "BA" },
  { stat: "hr", label: "HR" },
  { stat: "rbi", label: "RBI" },
  { stat: "h", label: "H" },
  { stat: "r", label: "R" },
  { stat: "doubles", label: "2B" },
  { stat: "triples", label: "3B" },
  { stat: "sb", label: "SB" },
  { stat: "bb", label: "BB" },
];

const pitchingCategories: Array<{ stat: ExhibitionPitchingLeaderStat; label: string }> = [
  { stat: "era", label: "ERA" },
  { stat: "w", label: "W" },
  { stat: "sv", label: "SV" },
  { stat: "so", label: "SO" },
  { stat: "ip", label: "IP" },
  { stat: "cg", label: "CG" },
  { stat: "sho", label: "SHO" },
];

function formatLeaderValue(stat: ExhibitionBattingLeaderStat | ExhibitionPitchingLeaderStat, value: number) {
  if (stat === "ba") {
    return value.toFixed(3).replace(/^0/, "");
  }

  if (stat === "era") {
    return value.toFixed(2);
  }

  if (stat === "ip") {
    return value.toFixed(1);
  }

  return Math.round(value).toString();
}

function LeaderboardTable({
  stat,
  label,
  leaders,
  expanded,
  onToggle,
}: {
  stat: ExhibitionBattingLeaderStat | ExhibitionPitchingLeaderStat;
  label: string;
  leaders: ExhibitionLeaderEntry[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const visibleLeaders = leaders.slice(0, expanded ? 20 : 5);

  return (
    <div className="border-[5px] border-[#2B2B2B] bg-[#101010] shadow-[6px_6px_0px_0px_rgba(51,102,255,0.25)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 border-b-[5px] border-[#2B2B2B] bg-[#171717] px-4 py-4 text-left text-[10px] text-white transition hover:bg-[#1d1d1d] sm:px-5"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#DD0000] sm:text-sm">{label}</span>
          <span className="text-[8px] tracking-[0.2em] text-[#8F96A3]">
            {expanded ? "TOP 20" : "TOP 5"}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-[#3366FF]" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-[#3366FF]" />
        )}
      </button>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-[9px] text-[#E8E8D8] sm:text-[10px]">
          <thead>
            <tr className="border-b border-white/10 text-[#8F96A3]">
              <th className="px-4 py-3 text-left font-normal">RK</th>
              <th className="px-4 py-3 text-left font-normal">PLAYER</th>
              <th className="px-4 py-3 text-left font-normal">TEAM</th>
              <th className="px-4 py-3 text-right font-normal">VALUE</th>
            </tr>
          </thead>
          <tbody>
            {visibleLeaders.map((leader, index) => (
              <tr key={`${stat}-${leader.leagueId}-${leader.playerId}`} className="border-b border-white/5">
                <td className="px-4 py-3 text-[#3366FF]">{index + 1}</td>
                <td className="px-4 py-3">
                  <Link
                    to={`/almanac/players/${leader.canonicalId}/${leader.instanceId}`}
                    className="text-white underline decoration-[#3366FF] underline-offset-4 transition hover:text-[#BFD0FF]"
                  >
                    {leader.playerName}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={`/almanac/teams/${leader.leagueId}/${leader.teamId}`}
                    className="text-[#E8E8D8] underline decoration-[#DD0000] underline-offset-4 transition hover:text-white"
                  >
                    {leader.teamName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right text-white">{formatLeaderValue(stat, leader.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ExhibitionLeaders() {
  const [qualified, setQualified] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [battingLeaders, setBattingLeaders] = useState<
    Partial<Record<ExhibitionBattingLeaderStat, ExhibitionLeaderEntry[]>>
  >({});
  const [pitchingLeaders, setPitchingLeaders] = useState<
    Partial<Record<ExhibitionPitchingLeaderStat, ExhibitionLeaderEntry[]>>
  >({});
  const [impactLeaderboards, setImpactLeaderboards] = useState<TeamImpactLeaderboards | null>(null);
  const [impactError, setImpactError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadLeaders() {
      setIsLoading(true);
      setImpactError(null);

      try {
        const [battingResults, pitchingResults, impactResults] = await Promise.all([
          Promise.all(
            battingCategories.map(async ({ stat }) => [stat, await getExhibitionBattingLeaders(stat, qualified, 20)] as const)
          ),
          Promise.all(
            pitchingCategories.map(async ({ stat }) => [stat, await getExhibitionPitchingLeaders(stat, qualified, 20)] as const)
          ),
          getAllExhibitionTeamImpactLeaderboards(5).catch((error) => {
            setImpactError(error instanceof Error ? error.message : "Failed to load Team Impact leaders.");
            return null;
          }),
        ]);

        if (cancelled) {
          return;
        }

        setBattingLeaders(Object.fromEntries(battingResults));
        setPitchingLeaders(Object.fromEntries(pitchingResults));
        setImpactLeaderboards(impactResults);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadLeaders();

    return () => {
      cancelled = true;
    };
  }, [qualified]);

  const hasAnyLeaders = [
    ...Object.values(battingLeaders),
    ...Object.values(pitchingLeaders),
  ].some((entries) => (entries?.length ?? 0) > 0) || impactLeaderboards !== null || impactError !== null;

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
            <h1 className="text-xs leading-6 text-[#DD0000] sm:text-sm">
              EXHIBITION ALL-TIME LEADERS
            </h1>
          </div>

          <Link
            to="/almanac/games"
            className="inline-flex items-center justify-center self-start border-[5px] border-[#AA0000] bg-[#DD0000] px-4 py-3 text-[10px] text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)] transition hover:bg-[#f01010]"
          >
            GAME ARCHIVE
          </Link>
        </div>

        <div className="border-[6px] border-[#2B2B2B] bg-[#101010] p-5 shadow-[8px_8px_0px_0px_rgba(51,102,255,0.35)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] text-[#3366FF] sm:text-xs">FILTER</div>
              <p className="mt-3 text-[9px] leading-5 text-[#E8E8D8] sm:text-[10px]">
                QUALIFIED AFFECTS RATE STATS ONLY. COUNTING STATS ALWAYS INCLUDE EVERYONE.
              </p>
            </div>

            <div className="inline-flex rounded-none border-[5px] border-[#3366FF] bg-[#0C0C0C] p-1">
              <button
                type="button"
                onClick={() => setQualified(true)}
                className={`px-4 py-3 text-[9px] transition sm:text-[10px] ${
                  qualified ? "bg-[#3366FF] text-white" : "bg-transparent text-[#8F96A3] hover:text-white"
                }`}
              >
                QUALIFIED
              </button>
              <button
                type="button"
                onClick={() => setQualified(false)}
                className={`px-4 py-3 text-[9px] transition sm:text-[10px] ${
                  !qualified ? "bg-[#DD0000] text-white" : "bg-transparent text-[#8F96A3] hover:text-white"
                }`}
              >
                ALL
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="border-[6px] border-[#2B2B2B] bg-[#101010] px-6 py-10 text-center text-xs text-[#E8E8D8]">
            Loading...
          </div>
        ) : !hasAnyLeaders ? (
          <div className="border-[6px] border-[#2B2B2B] bg-[#101010] px-6 py-10 text-center text-xs text-[#E8E8D8]">
            No exhibition games recorded yet.
          </div>
        ) : (
          <>
            <TeamImpactLeaderboardsPanel
              leaderboards={impactLeaderboards}
              error={impactError}
              theme="almanac"
            />

            <section className="flex flex-col gap-4">
              <div className="border-l-[6px] border-[#DD0000] bg-[#111111] px-4 py-3 text-xs text-white">
                BATTING
              </div>
              <div className="grid gap-4">
                {battingCategories.map(({ stat, label }) => (
                  <LeaderboardTable
                    key={stat}
                    stat={stat}
                    label={label}
                    leaders={battingLeaders[stat] ?? []}
                    expanded={expandedCategories[stat] ?? false}
                    onToggle={() =>
                      setExpandedCategories((current) => ({
                        ...current,
                        [stat]: !current[stat],
                      }))
                    }
                  />
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <div className="border-l-[6px] border-[#3366FF] bg-[#111111] px-4 py-3 text-xs text-white">
                PITCHING
              </div>
              <div className="grid gap-4">
                {pitchingCategories.map(({ stat, label }) => (
                  <LeaderboardTable
                    key={stat}
                    stat={stat}
                    label={label}
                    leaders={pitchingLeaders[stat] ?? []}
                    expanded={expandedCategories[stat] ?? false}
                    onToggle={() =>
                      setExpandedCategories((current) => ({
                        ...current,
                        [stat]: !current[stat],
                      }))
                    }
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
