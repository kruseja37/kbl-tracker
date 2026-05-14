import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { getTeam } from "../../../utils/leagueBuilderStorage";
import type { Team } from "../../../utils/leagueBuilderStorage";
import {
  getArchiveInstanceMode,
  getManagerTeamTenures,
  getTeamRosterFromGames,
  type AlmanacInstanceMode,
  type ManagerTeamTenureAggregate,
} from "../../../utils/almanacQueries";

interface RosterEntry {
  playerId: string;
  playerName: string;
  canonicalId: string;
  instanceId: string;
  games: number;
}

export function TeamPage() {
  const { leagueId, teamId } = useParams<{ leagueId: string; teamId: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [managerTenures, setManagerTenures] = useState<ManagerTeamTenureAggregate[]>([]);
  const [instanceMode, setInstanceMode] = useState<AlmanacInstanceMode>("exhibition");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leagueId || !teamId) return;

    let cancelled = false;

    async function load() {
      const [teamData, rosterData, resolvedMode] = await Promise.all([
        getTeam(teamId!),
        getTeamRosterFromGames(leagueId!, teamId!),
        getArchiveInstanceMode(leagueId!),
      ]);
      const mode = resolvedMode ?? "exhibition";
      const tenureData = await getManagerTeamTenures({
        mode,
        instanceId: leagueId!,
        teamId: teamId!,
      });

      if (!cancelled) {
        setTeam(teamData);
        setRoster(rosterData);
        setManagerTenures(tenureData);
        setInstanceMode(mode);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [leagueId, teamId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white font-['Press_Start_2P'] px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-5xl text-center pt-20 text-[10px] text-[#8F96A3]">
          LOADING...
        </div>
      </div>
    );
  }

  const teamName = team ? `${team.location} ${team.nickname}` : teamId ?? "Unknown Team";
  const stadium = team?.stadium ?? "Unknown Stadium";
  const primaryColor = team?.colors?.primary ?? "#3366FF";
  const secondaryColor = team?.colors?.secondary ?? "#DD0000";
  const formatSigned = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
  const backLink =
    instanceMode === "elimination"
      ? "/almanac/elimination"
      : instanceMode === "franchise"
        ? "/almanac"
        : "/almanac/exhibition";
  const backLabel =
    instanceMode === "elimination"
      ? "ELIMINATION"
      : instanceMode === "franchise"
        ? "ALMANAC"
        : "EXHIBITION";

  return (
    <div className="min-h-screen bg-black text-white font-['Press_Start_2P'] px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <Link
            to={backLink}
            className="inline-flex items-center gap-3 border-[5px] border-[#3366FF] bg-[#111111] px-4 py-3 text-[10px] text-white shadow-[6px_6px_0px_0px_rgba(221,0,0,0.85)] transition hover:bg-[#1a1a1a]"
          >
            <ArrowLeft className="h-4 w-4 shrink-0 text-white" />
            {backLabel}
          </Link>
        </div>

        {/* Team Info */}
        <div className="border-[6px] border-[#2B2B2B] bg-[#101010] p-5 shadow-[8px_8px_0px_0px_rgba(51,102,255,0.35)] sm:p-8">
          {/* Color accent bar */}
          <div
            className="mb-5 h-3 w-full"
            style={{
              background: `linear-gradient(90deg, ${primaryColor} 50%, ${secondaryColor} 50%)`,
            }}
          />

          <h1 className="text-sm leading-6 text-white sm:text-base">{teamName.toUpperCase()}</h1>
          <p className="mt-3 text-[10px] text-[#8F96A3]">{stadium.toUpperCase()}</p>
        </div>

        <div className="border-[6px] border-[#2B2B2B] bg-[#101010] p-5 shadow-[8px_8px_0px_0px_rgba(51,102,255,0.35)] sm:p-8">
          <h2 className="mb-5 text-xs text-[#2D7A46]">MANAGER TENURE</h2>

          {managerTenures.length === 0 ? (
            <p className="text-[10px] leading-5 text-[#8F96A3]">
              NO COMMITTED MANAGER RECORDS FOR THIS TEAM YET.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px]">
                <thead>
                  <tr className="border-b-2 border-[#2D7A46] text-[9px] text-[#8F96A3]">
                    <th className="pb-3 pr-6">MANAGER</th>
                    <th className="pb-3 pr-6 text-right">W-L</th>
                    <th className="pb-3 pr-6 text-right">DEC</th>
                    <th className="pb-3 pr-6 text-right">TACTICAL</th>
                    <th className="pb-3 pr-6 text-right">DEPLOY</th>
                    <th className="pb-3 pr-6 text-right">LINEUP</th>
                    <th className="pb-3 pr-6 text-right">VALUE</th>
                  </tr>
                </thead>
                <tbody>
                  {managerTenures.map((entry) => (
                    <tr
                      key={`${entry.managerId}-${entry.mode}-${entry.instanceId}`}
                      className="border-b border-[#2B2B2B]"
                    >
                      <td className="py-3 pr-6 text-white">{entry.managerName}</td>
                      <td className="py-3 pr-6 text-right text-[#E8E8D8]">
                        {entry.wins}-{entry.losses}
                      </td>
                      <td className="py-3 pr-6 text-right text-[#E8E8D8]">
                        {entry.decisionCount}
                      </td>
                      <td className="py-3 pr-6 text-right text-[#E8E8D8]">
                        {formatSigned(entry.tacticalManagerWpa)}
                      </td>
                      <td className="py-3 pr-6 text-right text-[#E8E8D8]">
                        {formatSigned(entry.deploymentWpa)}
                      </td>
                      <td className="py-3 pr-6 text-right text-[#E8E8D8]">
                        {formatSigned(entry.lineupDeltaWpa)}
                      </td>
                      <td className="py-3 pr-6 text-right text-white">
                        {formatSigned(entry.managerValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Roster */}
        <div className="border-[6px] border-[#2B2B2B] bg-[#101010] p-5 shadow-[8px_8px_0px_0px_rgba(51,102,255,0.35)] sm:p-8">
          <h2 className="mb-5 text-xs text-[#3366FF]">ROSTER</h2>

          {roster.length === 0 ? (
            <p className="text-[10px] leading-5 text-[#8F96A3]">
              NO GAMES RECORDED FOR THIS TEAM YET.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px]">
                <thead>
                  <tr className="border-b-2 border-[#3366FF] text-[9px] text-[#8F96A3]">
                    <th className="pb-3 pr-6">PLAYER</th>
                    <th className="pb-3 pr-6 text-right">GP</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((entry) => (
                    <tr key={entry.playerId} className="border-b border-[#2B2B2B]">
                      <td className="py-3 pr-6">
                        <Link
                          to={`/almanac/players/${entry.canonicalId}/${entry.instanceId}`}
                          className="text-[#3366FF] transition hover:text-white"
                        >
                          {entry.playerName}
                        </Link>
                      </td>
                      <td className="py-3 pr-6 text-right text-[#E8E8D8]">{entry.games}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
