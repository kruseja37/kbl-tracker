import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { getTeam } from "../../../utils/leagueBuilderStorage";
import type { Team } from "../../../utils/leagueBuilderStorage";
import { getTeamRosterFromGames } from "../../../utils/almanacQueries";

interface RosterEntry {
  playerId: string;
  playerName: string;
  canonicalId: string;
  games: number;
}

export function TeamPage() {
  const { leagueId, teamId } = useParams<{ leagueId: string; teamId: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leagueId || !teamId) return;

    let cancelled = false;

    async function load() {
      const [teamData, rosterData] = await Promise.all([
        getTeam(teamId!),
        getTeamRosterFromGames(leagueId!, teamId!),
      ]);

      if (!cancelled) {
        setTeam(teamData);
        setRoster(rosterData);
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

  return (
    <div className="min-h-screen bg-black text-white font-['Press_Start_2P'] px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/almanac/exhibition"
            className="inline-flex items-center gap-3 border-[5px] border-[#3366FF] bg-[#111111] px-4 py-3 text-[10px] text-white shadow-[6px_6px_0px_0px_rgba(221,0,0,0.85)] transition hover:bg-[#1a1a1a]"
          >
            <ArrowLeft className="h-4 w-4 shrink-0 text-white" />
            EXHIBITION
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
                          to={`/almanac/players/${entry.canonicalId}`}
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
