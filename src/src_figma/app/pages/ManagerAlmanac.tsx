import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, BarChart3 } from "lucide-react";
import {
  getManagerAlmanacAggregates,
  getManagerAlmanacFilterOptions,
  getManagerAlmanacLeaderboards,
  getManagerTeamTenures,
  type AlmanacInstanceMode,
  type ManagerAlmanacAggregate,
  type ManagerAlmanacFilterOptions,
  type ManagerAlmanacLeaderboards,
  type ManagerAlmanacModeFilter,
  type ManagerLeaderboardEntry,
  type ManagerTeamTenureAggregate,
} from "../../../utils/almanacQueries";

const MODE_OPTIONS: Array<{ value: ManagerAlmanacModeFilter; label: string }> = [
  { value: "all", label: "All modes" },
  { value: "exhibition", label: "Exhibition" },
  { value: "elimination", label: "Elimination" },
  { value: "franchise", label: "Franchise" },
];

const emptyLeaderboards: ManagerAlmanacLeaderboards = {
  managerValue: [],
  tacticalManagerWpa: [],
  deploymentWpa: [],
  lineupDeltaWpa: [],
  decisionCount: [],
  bestDecision: [],
  worstDecision: [],
  decisionTypeTendencies: [],
};

const emptyOptions: ManagerAlmanacFilterOptions = {
  modes: [],
  instances: [],
  teams: [],
};

function formatSigned(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
}

function formatRate(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatMode(value: AlmanacInstanceMode): string {
  return value.toUpperCase();
}

function teamList(teamNames: string[]): string {
  if (teamNames.length === 0) {
    return "No Team";
  }

  if (teamNames.length <= 2) {
    return teamNames.join(" / ");
  }

  return `${teamNames.slice(0, 2).join(" / ")} +${teamNames.length - 2}`;
}

function LeaderboardPanel({
  title,
  entries,
  valueLabel,
  renderValue,
}: {
  title: string;
  entries: ManagerLeaderboardEntry[];
  valueLabel: string;
  renderValue: (entry: ManagerLeaderboardEntry) => string;
}) {
  return (
    <section className="border-[5px] border-[#2B2B2B] bg-[#101010] shadow-[6px_6px_0px_0px_rgba(51,102,255,0.25)]">
      <div className="border-b-[5px] border-[#2B2B2B] bg-[#171717] px-4 py-4 text-[10px] text-white sm:px-5">
        {title}
      </div>
      {entries.length === 0 ? (
        <div className="px-4 py-5 text-[9px] text-[#8F96A3]">NO COMMITTED DATA</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[9px] text-[#E8E8D8] sm:text-[10px]">
            <thead>
              <tr className="border-b border-white/10 text-[#8F96A3]">
                <th className="px-4 py-3 font-normal">RK</th>
                <th className="px-4 py-3 font-normal">MANAGER</th>
                <th className="px-4 py-3 font-normal">TEAM</th>
                <th className="px-4 py-3 text-right font-normal">{valueLabel}</th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 10).map((entry, index) => (
                <tr key={`${title}-${entry.managerId}`} className="border-b border-white/5">
                  <td className="px-4 py-3 text-[#3366FF]">{index + 1}</td>
                  <td className="px-4 py-3 text-white">{entry.managerName}</td>
                  <td className="px-4 py-3 text-[#E8E8D8]">{teamList(entry.teamNames)}</td>
                  <td className="px-4 py-3 text-right text-white">{renderValue(entry)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function DecisionLeaderboardPanel({
  title,
  entries,
  kind,
}: {
  title: string;
  entries: ManagerLeaderboardEntry[];
  kind: "best" | "worst";
}) {
  return (
    <section className="border-[5px] border-[#2B2B2B] bg-[#101010] shadow-[6px_6px_0px_0px_rgba(51,102,255,0.25)]">
      <div className="border-b-[5px] border-[#2B2B2B] bg-[#171717] px-4 py-4 text-[10px] text-white sm:px-5">
        {title}
      </div>
      {entries.length === 0 ? (
        <div className="px-4 py-5 text-[9px] text-[#8F96A3]">NO RESOLVED DECISIONS</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[9px] text-[#E8E8D8] sm:text-[10px]">
            <thead>
              <tr className="border-b border-white/10 text-[#8F96A3]">
                <th className="px-4 py-3 font-normal">RK</th>
                <th className="px-4 py-3 font-normal">MANAGER</th>
                <th className="px-4 py-3 font-normal">DECISION</th>
                <th className="px-4 py-3 text-right font-normal">WPA</th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 10).map((entry, index) => {
                const decision = kind === "best" ? entry.bestDecision : entry.worstDecision;
                return (
                  <tr key={`${title}-${entry.managerId}`} className="border-b border-white/5">
                    <td className="px-4 py-3 text-[#3366FF]">{index + 1}</td>
                    <td className="px-4 py-3 text-white">{entry.managerName}</td>
                    <td className="px-4 py-3">
                      {decision ? (
                        <Link
                          to={`/almanac/games/${decision.gameId}`}
                          className="text-white underline decoration-[#3366FF] underline-offset-4 transition hover:text-[#BFD0FF]"
                        >
                          {decision.title}
                        </Link>
                      ) : (
                        "None"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-white">
                      {decision ? formatSigned(decision.value) : "+0.000"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function TendenciesPanel({ entries }: { entries: ManagerLeaderboardEntry[] }) {
  return (
    <section className="border-[5px] border-[#2B2B2B] bg-[#101010] shadow-[6px_6px_0px_0px_rgba(51,102,255,0.25)]">
      <div className="border-b-[5px] border-[#2B2B2B] bg-[#171717] px-4 py-4 text-[10px] text-white sm:px-5">
        DECISION-TYPE TENDENCIES
      </div>
      {entries.length === 0 ? (
        <div className="px-4 py-5 text-[9px] text-[#8F96A3]">NO COMMITTED DATA</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[9px] text-[#E8E8D8] sm:text-[10px]">
            <thead>
              <tr className="border-b border-white/10 text-[#8F96A3]">
                <th className="px-4 py-3 font-normal">MANAGER</th>
                <th className="px-4 py-3 text-right font-normal">STEAL</th>
                <th className="px-4 py-3 text-right font-normal">BUNT</th>
                <th className="px-4 py-3 text-right font-normal">BULLPEN</th>
                <th className="px-4 py-3 text-right font-normal">PH</th>
                <th className="px-4 py-3 text-right font-normal">PR</th>
                <th className="px-4 py-3 text-right font-normal">IBB</th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 10).map((entry) => (
                <tr key={`tendencies-${entry.managerId}`} className="border-b border-white/5">
                  <td className="px-4 py-3 text-white">{entry.managerName}</td>
                  <td className="px-4 py-3 text-right">{formatRate(entry.tendencies.stealRate)}</td>
                  <td className="px-4 py-3 text-right">{formatRate(entry.tendencies.buntRate)}</td>
                  <td className="px-4 py-3 text-right">{formatRate(entry.tendencies.bullpenAggressiveness)}</td>
                  <td className="px-4 py-3 text-right">{formatRate(entry.tendencies.pinchHitRate)}</td>
                  <td className="px-4 py-3 text-right">{formatRate(entry.tendencies.pinchRunRate)}</td>
                  <td className="px-4 py-3 text-right">{formatRate(entry.tendencies.intentionalWalkRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ManagerCards({ aggregates }: { aggregates: ManagerAlmanacAggregate[] }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="border-l-[6px] border-[#DD0000] bg-[#111111] px-4 py-3 text-xs text-white">
        MANAGER CARDS
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {aggregates.slice(0, 8).map((manager) => (
          <article
            key={manager.managerId}
            className="border-[5px] border-[#2B2B2B] bg-[#101010] p-5 shadow-[6px_6px_0px_0px_rgba(51,102,255,0.25)]"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-xs leading-5 text-white">{manager.managerName}</div>
                <div className="mt-2 text-[8px] uppercase tracking-[0.2em] text-[#8F96A3]">
                  {teamList(manager.teamNames)}
                </div>
              </div>
              <div className="text-right text-sm text-[#C4A853]">
                {formatSigned(manager.managerValue)}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-[8px] text-[#E8E8D8] sm:grid-cols-5">
              <div>
                <div className="text-[#8F96A3]">W-L</div>
                <div className="mt-2 text-white">{manager.wins}-{manager.losses}</div>
              </div>
              <div>
                <div className="text-[#8F96A3]">DEC</div>
                <div className="mt-2 text-white">{manager.decisionCount}</div>
              </div>
              <div>
                <div className="text-[#8F96A3]">TACTICAL</div>
                <div className="mt-2 text-white">{formatSigned(manager.tacticalManagerWpa)}</div>
              </div>
              <div>
                <div className="text-[#8F96A3]">DEPLOY</div>
                <div className="mt-2 text-white">{formatSigned(manager.deploymentWpa)}</div>
              </div>
              <div>
                <div className="text-[#8F96A3]">LINEUP</div>
                <div className="mt-2 text-white">{formatSigned(manager.lineupDeltaWpa)}</div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 text-[8px] leading-5 text-[#E8E8D8] sm:grid-cols-2">
              <div>
                <div className="text-[#8F96A3]">BEST</div>
                <div className="mt-1 text-white">
                  {manager.bestDecision
                    ? `${manager.bestDecision.title} ${formatSigned(manager.bestDecision.value)}`
                    : "None"}
                </div>
              </div>
              <div>
                <div className="text-[#8F96A3]">WORST</div>
                <div className="mt-1 text-white">
                  {manager.worstDecision
                    ? `${manager.worstDecision.title} ${formatSigned(manager.worstDecision.value)}`
                    : "None"}
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-white/10 pt-4 text-[8px] leading-5 text-[#E8E8D8]">
              <div className="text-[#8F96A3]">LINEUP DELTA DETAILS</div>
              {manager.lineupDeltaDetails.length === 0 ? (
                <div className="mt-1 text-white">No lineup deviations</div>
              ) : (
                <div className="mt-2 grid gap-2">
                  {manager.lineupDeltaDetails.slice(0, 2).map((delta) => (
                    <div key={delta.decisionId} className="border border-white/10 bg-black/20 p-2">
                      <div className="text-white">Chosen: {delta.chosenLabel}</div>
                      <div className="text-white">Optimal: {delta.optimalLabel}</div>
                      <div>
                        Projected opportunity cost: {delta.projectedOpportunityCost != null
                          ? formatSigned(delta.projectedOpportunityCost)
                          : "n/a"}
                      </div>
                      <div>
                        Actual vs optimal projection: {delta.actualVsOptimalProjection != null
                          ? formatSigned(delta.actualVsOptimalProjection)
                          : "n/a"}
                      </div>
                      <div>Manager WPA: {formatSigned(delta.managerWpa)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TenureTable({ tenures }: { tenures: ManagerTeamTenureAggregate[] }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="border-l-[6px] border-[#3366FF] bg-[#111111] px-4 py-3 text-xs text-white">
        TEAM TENURES
      </div>
      <div className="overflow-x-auto border-[5px] border-[#2B2B2B] bg-[#101010] p-4">
        <table className="min-w-full text-left text-[9px] text-[#E8E8D8] sm:text-[10px]">
          <thead>
            <tr className="border-b border-white/10 text-[#8F96A3]">
              <th className="pb-3 pr-4 font-normal">MANAGER</th>
              <th className="pb-3 pr-4 font-normal">TEAM</th>
              <th className="pb-3 pr-4 font-normal">MODE</th>
              <th className="pb-3 pr-4 text-right font-normal">W-L</th>
              <th className="pb-3 pr-4 text-right font-normal">TACTICAL</th>
              <th className="pb-3 pr-4 text-right font-normal">DEPLOY</th>
              <th className="pb-3 pr-4 text-right font-normal">LINEUP</th>
              <th className="pb-3 text-right font-normal">VALUE</th>
            </tr>
          </thead>
          <tbody>
            {tenures.slice(0, 20).map((tenure) => (
              <tr
                key={`${tenure.managerId}-${tenure.teamId}-${tenure.mode}-${tenure.instanceId}`}
                className="border-b border-white/5"
              >
                <td className="py-3 pr-4 text-white">{tenure.managerName}</td>
                <td className="py-3 pr-4">
                  <Link
                    to={`/almanac/teams/${tenure.instanceId}/${tenure.teamId}`}
                    className="text-white underline decoration-[#DD0000] underline-offset-4 transition hover:text-[#FFD2D2]"
                  >
                    {tenure.teamName}
                  </Link>
                </td>
                <td className="py-3 pr-4">{formatMode(tenure.mode)}</td>
                <td className="py-3 pr-4 text-right">{tenure.wins}-{tenure.losses}</td>
                <td className="py-3 pr-4 text-right">{formatSigned(tenure.tacticalManagerWpa)}</td>
                <td className="py-3 pr-4 text-right">{formatSigned(tenure.deploymentWpa)}</td>
                <td className="py-3 pr-4 text-right">{formatSigned(tenure.lineupDeltaWpa)}</td>
                <td className="py-3 text-right text-white">{formatSigned(tenure.managerValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ManagerAlmanac() {
  const [mode, setMode] = useState<ManagerAlmanacModeFilter>("all");
  const [instanceId, setInstanceId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [aggregates, setAggregates] = useState<ManagerAlmanacAggregate[]>([]);
  const [leaderboards, setLeaderboards] =
    useState<ManagerAlmanacLeaderboards>(emptyLeaderboards);
  const [tenures, setTenures] = useState<ManagerTeamTenureAggregate[]>([]);
  const [options, setOptions] = useState<ManagerAlmanacFilterOptions>(emptyOptions);
  const [isLoading, setIsLoading] = useState(true);

  const availableInstances = useMemo(
    () =>
      options.instances.filter(
        (instance) => mode === "all" || instance.mode === mode,
      ),
    [mode, options.instances],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      const filters = {
        mode,
        instanceId: instanceId || undefined,
        teamId: teamId || undefined,
      };

      try {
        const [nextAggregates, nextLeaderboards, nextTenures, nextOptions] =
          await Promise.all([
            getManagerAlmanacAggregates(filters),
            getManagerAlmanacLeaderboards(filters, 10),
            getManagerTeamTenures(filters),
            getManagerAlmanacFilterOptions(),
          ]);

        if (cancelled) {
          return;
        }

        setAggregates(nextAggregates);
        setLeaderboards(nextLeaderboards);
        setTenures(nextTenures);
        setOptions(nextOptions);
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
  }, [instanceId, mode, teamId]);

  const summary = useMemo(
    () => ({
      managers: aggregates.length,
      games: aggregates.reduce((sum, manager) => sum + manager.gamesManaged, 0),
      decisions: aggregates.reduce((sum, manager) => sum + manager.decisionCount, 0),
      value: aggregates.reduce((sum, manager) => sum + manager.managerValue, 0),
    }),
    [aggregates],
  );

  const hasData = aggregates.length > 0;

  return (
    <div className="min-h-screen bg-black px-4 py-6 font-['Press_Start_2P'] text-white sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
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
              MANAGER ALMANAC
            </h1>
          </div>

          <Link
            to="/almanac/games"
            className="inline-flex items-center justify-center gap-2 self-start border-[5px] border-[#AA0000] bg-[#DD0000] px-4 py-3 text-[10px] text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)] transition hover:bg-[#f01010]"
          >
            <BarChart3 className="h-4 w-4" />
            GAMES
          </Link>
        </div>

        <div className="border-[6px] border-[#2B2B2B] bg-[#101010] p-5 shadow-[8px_8px_0px_0px_rgba(51,102,255,0.35)] sm:p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-3 text-[9px] text-[#3366FF] sm:text-[10px]">
              MODE
              <select
                value={mode}
                onChange={(event) => {
                  setMode(event.target.value as ManagerAlmanacModeFilter);
                  setInstanceId("");
                }}
                className="h-12 border-[4px] border-[#3366FF] bg-[#161616] px-3 text-[9px] text-white outline-none focus:border-white"
              >
                {MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-3 text-[9px] text-[#3366FF] sm:text-[10px]">
              INSTANCE
              <select
                value={instanceId}
                onChange={(event) => setInstanceId(event.target.value)}
                className="h-12 border-[4px] border-[#3366FF] bg-[#161616] px-3 text-[9px] text-white outline-none focus:border-white"
              >
                <option value="">All instances</option>
                {availableInstances.map((instance) => (
                  <option
                    key={`${instance.mode}-${instance.instanceId}`}
                    value={instance.instanceId}
                  >
                    {instance.instanceName}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-3 text-[9px] text-[#3366FF] sm:text-[10px]">
              TEAM
              <select
                value={teamId}
                onChange={(event) => setTeamId(event.target.value)}
                className="h-12 border-[4px] border-[#3366FF] bg-[#161616] px-3 text-[9px] text-white outline-none focus:border-white"
              >
                <option value="">All teams</option>
                {options.teams.map((team) => (
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
        ) : !hasData ? (
          <div className="border-[6px] border-[#2B2B2B] bg-[#101010] px-6 py-10 text-center text-xs text-[#E8E8D8]">
            No committed manager records yet.
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { label: "MANAGERS", value: summary.managers.toString() },
                { label: "TEAM GAMES", value: summary.games.toString() },
                { label: "DECISIONS", value: summary.decisions.toString() },
                { label: "VALUE", value: formatSigned(summary.value) },
              ].map((item) => (
                <div
                  key={item.label}
                  className="border-[5px] border-[#2B2B2B] bg-[#101010] p-5 shadow-[6px_6px_0px_0px_rgba(51,102,255,0.25)]"
                >
                  <div className="text-[8px] uppercase tracking-[0.22em] text-[#8F96A3]">
                    {item.label}
                  </div>
                  <div className="mt-3 text-sm text-white">{item.value}</div>
                </div>
              ))}
            </div>

            <section className="flex flex-col gap-4">
              <div className="border-l-[6px] border-[#C4A853] bg-[#111111] px-4 py-3 text-xs text-white">
                MANAGER LEADERBOARDS
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <LeaderboardPanel
                  title="MANAGER VALUE"
                  entries={leaderboards.managerValue}
                  valueLabel="VALUE"
                  renderValue={(entry) => formatSigned(entry.managerValue)}
                />
                <LeaderboardPanel
                  title="TACTICAL MANAGER WPA"
                  entries={leaderboards.tacticalManagerWpa}
                  valueLabel="TACTICAL"
                  renderValue={(entry) => formatSigned(entry.tacticalManagerWpa)}
                />
                <LeaderboardPanel
                  title="DEPLOYMENT WPA"
                  entries={leaderboards.deploymentWpa}
                  valueLabel="DEPLOY"
                  renderValue={(entry) => formatSigned(entry.deploymentWpa)}
                />
                <LeaderboardPanel
                  title="LINEUP DELTA"
                  entries={leaderboards.lineupDeltaWpa}
                  valueLabel="LINEUP"
                  renderValue={(entry) => formatSigned(entry.lineupDeltaWpa)}
                />
                <LeaderboardPanel
                  title="DECISION COUNT"
                  entries={leaderboards.decisionCount}
                  valueLabel="DEC"
                  renderValue={(entry) => entry.decisionCount.toString()}
                />
                <DecisionLeaderboardPanel
                  title="BEST DECISION"
                  entries={leaderboards.bestDecision}
                  kind="best"
                />
                <DecisionLeaderboardPanel
                  title="WORST DECISION"
                  entries={leaderboards.worstDecision}
                  kind="worst"
                />
              </div>
              <TendenciesPanel entries={leaderboards.decisionTypeTendencies} />
            </section>

            <ManagerCards aggregates={aggregates} />
            <TenureTable tenures={tenures} />
          </>
        )}
      </div>
    </div>
  );
}

export default ManagerAlmanac;
