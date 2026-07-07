import { useState } from "react";
import { ArchetypePicker, type ArchetypeSlot } from "../components/draft/ArchetypePicker";
import { archetypeByKey } from "../data/teamArchetypeCatalog";

/**
 * DraftSetupArchetypePreview — a non-destructive, routable preview of the Draft
 * Setup archetype picker (the two-pick MLB/farm model over the 24 historical
 * identities). Mock teams; kept as an unrouted fixture now that the explainer
 * copy lives in LeagueBuilderDraftSetup's help layer.
 */

interface MockTeam { id: string; name: string; abbr: string; }
const TEAMS: MockTeam[] = [
  { id: "PC", name: "Page Capitals", abbr: "PC" },
  { id: "BM", name: "Brass Monkeys", abbr: "BM" },
  { id: "RR", name: "River Rats", abbr: "RR" },
  { id: "SG", name: "Sand Gnats", abbr: "SG" },
];

type Picks = Record<string, { mlb?: string; farm?: string }>;

export function DraftSetupArchetypePreview() {
  const [teamId, setTeamId] = useState("PC");
  const [picks, setPicks] = useState<Picks>({});
  const team = TEAMS.find((t) => t.id === teamId)!;
  const teamPicks = picks[teamId] ?? {};

  const handlePick = (slot: ArchetypeSlot, key: string) => {
    setPicks((p) => ({ ...p, [teamId]: { ...(p[teamId] ?? {}), [slot]: key } }));
  };

  const assignedCount = TEAMS.filter((t) => picks[t.id]?.mlb && picks[t.id]?.farm).length;

  return (
    <div className="min-h-screen bg-[#243024] text-[#E8E8D8] p-6" style={{ fontFamily: "'Press Start 2P', system-ui, sans-serif" }}>
      <div className="max-w-[1200px] mx-auto" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
        {/* header */}
        <div className="mb-2 text-xs font-bold tracking-[0.2em] text-[#C4A853]">DRAFT SETUP · PREVIEW</div>
        <h1 className="text-2xl font-bold mb-1" style={{ textShadow: "2px 2px 0 rgba(0,0,0,0.8)" }}>Team Identity</h1>
        <p className="text-sm text-[#E8E8D8]/65 mb-5 max-w-[70ch]">
          Each team picks an <b className="text-[#E8E8D8]">MLB identity</b> (sets what's cheap to build) and a{" "}
          <b className="text-[#E8E8D8]">farm identity</b> (steers your scout) from 24 historical team archetypes — all
          balanced, so no identity builds a stronger team; the difference is the <i>shape</i> of the team you can build.
        </p>

        {/* team selector + progress */}
        <div className="flex flex-wrap items-center gap-2 mb-6 bg-[#2d3d2f] border-4 border-[#4A6844] p-3">
          {TEAMS.map((t) => {
            const done = picks[t.id]?.mlb && picks[t.id]?.farm;
            const sel = t.id === teamId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTeamId(t.id)}
                className={`flex items-center gap-2 px-3 py-2 border-4 text-sm font-bold ${
                  sel ? "border-[#C4A853] bg-[#3a4d3c]" : "border-[#4A6844] bg-[#34472f] hover:bg-[#3a4d3c]"
                }`}
              >
                <span className={`w-2.5 h-2.5 ${done ? "bg-[#9FE0A0]" : "bg-[#E8E8D8]/25"}`} />
                {t.name}
              </button>
            );
          })}
          <div className="ml-auto text-xs text-[#E8E8D8]/55">{assignedCount} / {TEAMS.length} teams set</div>
        </div>

        {/* the picker */}
        <ArchetypePicker
          teamLabel={`${team.name} (${team.abbr})`}
          mlbKey={teamPicks.mlb}
          farmKey={teamPicks.farm}
          onPick={handlePick}
        />

        {/* per-team summary */}
        <div className="mt-8 bg-[#2d3d2f] border-4 border-[#4A6844] p-4">
          <div className="text-xs font-bold tracking-[0.2em] text-[#C4A853] mb-3">THE FIELD</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {TEAMS.map((t) => {
              const tp = picks[t.id] ?? {};
              const m = archetypeByKey(tp.mlb);
              const f = archetypeByKey(tp.farm);
              return (
                <div key={t.id} className="bg-[#34472f] border-2 border-[#4A6844] px-3 py-2">
                  <div className="text-sm font-bold text-[#E8E8D8]">{t.name}</div>
                  <div className="text-[11px] text-[#E8E8D8]/60 mt-1">MLB: <span className="text-[#E8E8D8]">{m?.name ?? "—"}</span></div>
                  <div className="text-[11px] text-[#E8E8D8]/60">Farm: <span className="text-[#E8E8D8]">{f?.name ?? "—"}</span></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DraftSetupArchetypePreview;
