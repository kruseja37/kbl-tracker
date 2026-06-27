import { useState } from "react";
import { Star, Users, ChevronDown, Play } from "lucide-react";

/**
 * MyTeamsSwitcherPreview — the "my teams" clubhouse concept (roadmap §7.8), at
 * /__preview/my-teams. Today the hub is a neutral all-teams browser (defaults to
 * teams[0]); this adds the couch-coop ownership lens: badge + sort the human's
 * clubs, switch among them, and show whose-club-is-whose across the seats. Mock-
 * fed; reads from controlledTeams/playerAssignments once wired.
 */

interface Team { id: string; name: string; abbr: string; record: string; owner: string }
const TEAMS: Team[] = [
  { id: "PC", name: "Page Capitals", abbr: "PC", record: "48–32", owner: "You" },
  { id: "BM", name: "Brass Monkeys", abbr: "BM", record: "50–30", owner: "You" },
  { id: "RR", name: "River Rats", abbr: "RR", record: "44–36", owner: "Player 2" },
  { id: "SG", name: "Sand Gnats", abbr: "SG", record: "39–41", owner: "Player 2" },
  { id: "ST", name: "Steel Tides", abbr: "ST", record: "47–33", owner: "CPU" },
  { id: "DV", name: "Delta Vipers", abbr: "DV", record: "45–35", owner: "CPU" },
  { id: "CC", name: "Cactus Cats", abbr: "CC", record: "41–39", owner: "CPU" },
  { id: "HB", name: "Harbor Bandits", abbr: "HB", record: "35–45", owner: "CPU" },
];
const ME = "You";

export function MyTeamsSwitcherPreview() {
  const mine = TEAMS.filter((t) => t.owner === ME);
  const [active, setActive] = useState(mine[0].id);
  const team = TEAMS.find((t) => t.id === active)!;
  const seats = Array.from(new Set(TEAMS.map((t) => t.owner)));

  return (
    <div className="min-h-screen bg-[#243024] text-[#E8E8D8] p-6" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div className="max-w-[1000px] mx-auto">
        <div className="mb-2 text-xs font-bold tracking-[0.2em] text-[#C4A853]">CLUBHOUSE · PREVIEW</div>

        {/* my-clubs switcher bar */}
        <div className="bg-[#2d3d2f] border-4 border-[#C4A853] p-3 mb-5 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.16em] text-[#C4A853] mr-1"><Star className="w-3.5 h-3.5" /> MY CLUBS</div>
          {mine.map((t) => {
            const sel = t.id === active;
            return (
              <button key={t.id} type="button" onClick={() => setActive(t.id)}
                className={`flex items-center gap-2 px-3 py-2 border-4 text-sm font-bold ${sel ? "border-[#C4A853] bg-[#3a4d3c] text-[#E8E8D8]" : "border-[#4A6844] bg-[#34472f] text-[#E8E8D8]/80 hover:bg-[#3a4d3c]"}`}>
                {t.name} <span className="text-[11px] text-[#E8E8D8]/55">{t.record}</span>
              </button>
            );
          })}
          <span className="ml-auto text-[11px] text-[#E8E8D8]/45 flex items-center gap-1">viewing as {team.name} <ChevronDown className="w-3.5 h-3.5" /></span>
        </div>

        {/* active club snapshot (mock clubhouse context) */}
        <div className="bg-[#34472f] border-4 border-[#4A6844] p-5 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-14 h-14 grid place-items-center bg-[#243024] border-2 border-[#C4A853] text-xl font-bold text-[#C4A853]">{team.abbr}</div>
            <div>
              <div className="text-xl font-bold text-[#E8E8D8]" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>{team.name}</div>
              <div className="text-[12px] text-[#E8E8D8]/60">{team.record} · GM You · your club</div>
            </div>
            <button type="button" className="ml-auto flex items-center gap-2 bg-[#C4A853] hover:bg-[#D4B863] text-[#1A1A1A] border-4 border-[#E8E8D8] px-4 py-2.5 font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] active:scale-95">
              <Play className="w-4 h-4" /> Next game
            </button>
          </div>
        </div>

        {/* the league, grouped by seat — whose-club-is-whose */}
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-[#C4A853]" />
          <div className="text-xs font-bold tracking-[0.2em] text-[#C4A853]">THE LEAGUE · by who's running it</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {seats.map((owner) => {
            const ts = TEAMS.filter((t) => t.owner === owner);
            const isMe = owner === ME;
            return (
              <div key={owner} className={`border-4 p-3 ${isMe ? "border-[#C4A853] bg-[#3a4d3c]" : "border-[#4A6844] bg-[#2d3d2f]"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold" style={{ color: isMe ? "#C4A853" : "#E8E8D8" }}>{owner}</span>
                  {isMe && <span className="text-[9px] font-bold tracking-wider bg-[#C4A853] text-[#1A1A1A] px-1.5">YOU</span>}
                  <span className="ml-auto text-[11px] text-[#E8E8D8]/45">{ts.length} club{ts.length > 1 ? "s" : ""}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {ts.map((t) => (
                    <button key={t.id} type="button" disabled={!isMe} onClick={() => isMe && setActive(t.id)}
                      className={`flex items-center justify-between gap-2 px-2.5 py-1.5 border-2 text-sm ${
                        isMe ? (t.id === active ? "border-[#C4A853] bg-[#34472f]" : "border-[#4A6844] bg-[#34472f] hover:bg-[#3a4d3c]") : "border-[#4A6844]/60 bg-[#34472f]/40 text-[#E8E8D8]/70 cursor-default"}`}>
                      <span className="font-bold">{t.name}</span><span className="text-[11px] text-[#E8E8D8]/50">{t.record}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default MyTeamsSwitcherPreview;
