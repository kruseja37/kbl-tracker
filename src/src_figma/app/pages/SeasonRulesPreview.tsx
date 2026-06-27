import { useState } from "react";
import { CalendarDays, TrendingUp, Flame, Trophy, Clock, Network, ChevronRight } from "lucide-react";

/**
 * SeasonRulesPreview — the rebuilt season-rules screen (roadmap §7.7, D4),
 * mock-fed at /__preview/season-rules. Replaces the mostly-cosmetic LeagueBuilder
 * Rules screen. KEEP: season length, innings, playoffs, extra-innings. ADD: custom
 * numeric games + innings (free entry, flows into ALL scaling — WAR, checkpoints),
 * development cadence, a living-season intensity dial, conferences on/off + naming.
 * CUT the dead settings (scheduleType, mercy, all-star/deadline timing). Non-
 * destructive preview; wiring to the season engines later.
 */

function NumberPresets({
  value, onChange, presets, min, max, unit,
}: { value: number; onChange: (n: number) => void; presets: number[]; min: number; max: number; unit: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((p) => (
        <button key={p} type="button" onClick={() => onChange(p)}
          className={`px-3 py-2 border-2 text-sm font-bold ${value === p ? "border-[#C4A853] bg-[#3a4d3c] text-[#E8E8D8]" : "border-[#4A6844] bg-[#34472f] text-[#E8E8D8]/80 hover:bg-[#3a4d3c]"}`}>
          {p}
        </button>
      ))}
      <div className="flex items-center gap-1 ml-1">
        <span className="text-[11px] text-[#E8E8D8]/45">custom</span>
        <input type="number" min={min} max={max} value={value}
          onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
          className="w-20 bg-[#243024] border-2 border-[#4A6844] focus:border-[#C4A853] outline-none px-2 py-2 text-sm font-bold text-[#E8E8D8]" />
        <span className="text-[11px] text-[#E8E8D8]/60">{unit}</span>
      </div>
    </div>
  );
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; sub?: string }[] }) {
  return (
    <div className="inline-flex flex-wrap border-4 border-[#4A6844]">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`px-4 py-2 text-sm font-bold border-r-4 border-[#4A6844] last:border-r-0 ${value === o.value ? "bg-[#C4A853] text-[#1A1A1A]" : "bg-[#34472f] text-[#E8E8D8] hover:bg-[#3a4d3c]"}`}>
          <div>{o.label}</div>
          {o.sub ? <div className={`text-[10px] font-normal ${value === o.value ? "text-[#1A1A1A]/70" : "text-[#E8E8D8]/45"}`}>{o.sub}</div> : null}
        </button>
      ))}
    </div>
  );
}

function Card({ icon, title, hint, children }: { icon: React.ReactNode; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#2d3d2f] border-4 border-[#4A6844] p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[#C4A853]">{icon}</span>
        <div className="text-xs font-bold tracking-[0.2em] text-[#C4A853]">{title}</div>
      </div>
      {hint ? <div className="text-[12px] text-[#E8E8D8]/55 mb-3">{hint}</div> : <div className="mb-2" />}
      {children}
    </div>
  );
}

export function SeasonRulesPreview() {
  const [games, setGames] = useState(50);
  const [innings, setInnings] = useState(9);
  const [cadence, setCadence] = useState<"standard" | "frequent">("standard");
  const [intensity, setIntensity] = useState<"calm" | "standard" | "wild">("standard");
  const [playoffsOn, setPlayoffsOn] = useState(true);
  const [playoffTeams, setPlayoffTeams] = useState(6);
  const [series, setSeries] = useState(5);
  const [extra, setExtra] = useState<"play-out" | "runner-2nd">("play-out");
  const [confOn, setConfOn] = useState(true);
  const [confNames, setConfNames] = useState(["Eastern", "Western"]);

  const checkpoints = cadence === "standard" ? 5 : 10;

  return (
    <div className="min-h-screen bg-[#243024] text-[#E8E8D8] p-6" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div className="max-w-[980px] mx-auto">
        <div className="mb-2 text-xs font-bold tracking-[0.2em] text-[#C4A853]">SEASON RULES · PREVIEW</div>
        <h1 className="text-2xl font-bold mb-1" style={{ textShadow: "2px 2px 0 rgba(0,0,0,0.8)" }}>How the Season Runs</h1>
        <p className="text-sm text-[#E8E8D8]/65 mb-5 max-w-[72ch]">Set the shape of your season. These flow straight into the engines — games and innings scale everything (stats, WAR, the development calendar).</p>

        <div className="grid grid-cols-1 gap-4">
          <Card icon={<CalendarDays className="w-4 h-4" />} title="SEASON LENGTH" hint="Games per club and innings per game — free entry. They scale WAR, the development calendar, and every per-season stat.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] font-bold tracking-wider text-[#E8E8D8]/50 mb-2">GAMES PER CLUB</div>
                <NumberPresets value={games} onChange={setGames} presets={[32, 50, 82, 162]} min={6} max={200} unit="games" />
              </div>
              <div>
                <div className="text-[11px] font-bold tracking-wider text-[#E8E8D8]/50 mb-2">INNINGS PER GAME</div>
                <NumberPresets value={innings} onChange={setInnings} presets={[7, 9]} min={3} max={15} unit="innings" />
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card icon={<TrendingUp className="w-4 h-4" />} title="HOW OFTEN PLAYERS DEVELOP" hint={`A ratings checkpoint and a chance to enter changes into SMB4 — ${checkpoints} times this season.`}>
              <Segmented value={cadence} onChange={setCadence} options={[
                { value: "standard", label: "Standard", sub: "every 20% · 5×" },
                { value: "frequent", label: "Frequent", sub: "every 10% · 10×" },
              ]} />
            </Card>

            <Card icon={<Flame className="w-4 h-4" />} title="HOW LIVELY IS THE SEASON" hint="How often the big random beats fire — hot streaks, slumps, trades, firings, trait swings.">
              <Segmented value={intensity} onChange={setIntensity} options={[
                { value: "calm", label: "Calm", sub: "rare" },
                { value: "standard", label: "Standard", sub: "balanced" },
                { value: "wild", label: "Wild", sub: "frequent" },
              ]} />
            </Card>
          </div>

          <Card icon={<Trophy className="w-4 h-4" />} title="PLAYOFFS">
            <div className="flex flex-wrap items-center gap-4">
              <Segmented value={playoffsOn ? "on" : "off"} onChange={(v) => setPlayoffsOn(v === "on")} options={[{ value: "on", label: "Playoffs" }, { value: "off", label: "No playoffs" }]} />
              {playoffsOn && (
                <>
                  <div className="flex items-center gap-2"><span className="text-[11px] text-[#E8E8D8]/50">TEAMS</span>
                    <Segmented value={String(playoffTeams)} onChange={(v) => setPlayoffTeams(Number(v))} options={[{ value: "4", label: "4" }, { value: "6", label: "6" }, { value: "8", label: "8" }]} />
                  </div>
                  <div className="flex items-center gap-2"><span className="text-[11px] text-[#E8E8D8]/50">SERIES</span>
                    <Segmented value={String(series)} onChange={(v) => setSeries(Number(v))} options={[{ value: "1", label: "1" }, { value: "3", label: "Bo3" }, { value: "5", label: "Bo5" }, { value: "7", label: "Bo7" }]} />
                  </div>
                </>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card icon={<Clock className="w-4 h-4" />} title="EXTRA INNINGS" hint="What happens when a game is tied after the final inning.">
              <Segmented value={extra} onChange={setExtra} options={[
                { value: "play-out", label: "Play it out", sub: "free baseball" },
                { value: "runner-2nd", label: "Runner on 2nd", sub: "speed it up" },
              ]} />
            </Card>

            <Card icon={<Network className="w-4 h-4" />} title="CONFERENCES">
              <div className="flex flex-col gap-3">
                <Segmented value={confOn ? "on" : "off"} onChange={(v) => setConfOn(v === "on")} options={[{ value: "on", label: "Two conferences" }, { value: "off", label: "One league" }]} />
                {confOn && (
                  <div className="flex flex-wrap gap-2">
                    {confNames.map((n, i) => (
                      <input key={i} value={n} onChange={(e) => setConfNames((c) => c.map((x, j) => (j === i ? e.target.value : x)))}
                        className="w-40 bg-[#243024] border-2 border-[#4A6844] focus:border-[#C4A853] outline-none px-3 py-2 text-sm font-bold text-[#E8E8D8]" />
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button type="button" className="flex items-center gap-2 bg-[#C4A853] hover:bg-[#D4B863] text-[#1A1A1A] border-[5px] border-[#E8E8D8] px-6 py-3 font-bold tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] active:scale-95">
            Save the Rules <ChevronRight className="w-5 h-5" />
          </button>
          <div className="text-[11px] text-[#E8E8D8]/50">{games}-game · {innings}-inning · {checkpoints} checkpoints · {intensity} · {confOn ? `${confNames[0]}/${confNames[1]}` : "one league"}</div>
        </div>
      </div>
    </div>
  );
}

export default SeasonRulesPreview;
