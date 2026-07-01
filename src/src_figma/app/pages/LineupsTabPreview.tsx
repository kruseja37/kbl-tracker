import { useState } from "react";
import { ChevronUp, ChevronDown, Sparkles, Heart, ArrowRight, RotateCw } from "lucide-react";

/**
 * LineupsTabPreview — the pregame / between-game lineups tab (JK addendum), at
 * /__preview/lineups. Opponent-starter-specific + rotation-aware: header "Optimal
 * lineup vs [opp's next SP]"; show YOUR 4-man rotation that auto-advances after
 * each game; allow MANUAL reorder + mojo/fitness edits. This is a SEPARATE surface
 * from the in-game move advisor (two distinct moments). Mock-fed; optimizer later.
 */

const MOJO = ["Rattled", "Tense", "Normal", "Locked in", "Jacked"];
const FITNESS = ["Hurt", "Weak", "Strained", "Well", "Fit", "Juiced"];
const mojoColor = (m: string) => (m === "Jacked" || m === "Locked in" ? "#9FE0A0" : m === "Normal" || m === "Well" ? "#E8E8D8" : "#E0857A");
const fitColor = (f: string) => (f === "Fit" || f === "Juiced" ? "#9FE0A0" : f === "Well" ? "#E8E8D8" : "#E0857A");

interface Bat { id: string; pos: string; name: string; bats: "L" | "R" | "S"; mojo: string; fitness: string }
interface SP { id: string; name: string; hand: "L" | "R"; line: string }

const OPP_SP: SP = { id: "v", name: "Cole Vesper", hand: "R", line: "2.18 ERA · 214 K" };

export function LineupsTabPreview() {
  const [lineup, setLineup] = useState<Bat[]>([
    { id: "b1", pos: "CF", name: "Dash Okoye", bats: "L", mojo: "Locked in", fitness: "Fit" },
    { id: "b2", pos: "LF", name: "Reed Cole", bats: "L", mojo: "Normal", fitness: "Fit" },
    { id: "b3", pos: "1B", name: "Hank Drake", bats: "R", mojo: "Normal", fitness: "Well" },
    { id: "b4", pos: "RF", name: "Boomer Vance", bats: "R", mojo: "Jacked", fitness: "Fit" },
    { id: "b5", pos: "3B", name: "Vince Hollis", bats: "L", mojo: "Tense", fitness: "Strained" },
    { id: "b6", pos: "C", name: "Gil Roy", bats: "R", mojo: "Normal", fitness: "Fit" },
    { id: "b7", pos: "2B", name: "Sol Park", bats: "S", mojo: "Normal", fitness: "Well" },
    { id: "b8", pos: "SS", name: "Tio Marsh", bats: "R", mojo: "Rattled", fitness: "Weak" },
    { id: "b9", pos: "DH", name: "Milo Reyes", bats: "L", mojo: "Normal", fitness: "Fit" },
  ]);
  const [rotation, setRotation] = useState<SP[]>([
    { id: "r1", name: "Rafa Fenomeno", hand: "R", line: "2.74 ERA" },
    { id: "r2", name: "Dane Cobb", hand: "L", line: "3.40 ERA" },
    { id: "r3", name: "Abe Krell", hand: "R", line: "3.91 ERA" },
    { id: "r4", name: "Sy Booker", hand: "L", line: "4.55 ERA" },
  ]);
  const [nextSP, setNextSP] = useState(0);

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= lineup.length) return;
    setLineup((l) => { const n = [...l]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  };
  const cycle = (i: number, field: "mojo" | "fitness") => {
    const arr = field === "mojo" ? MOJO : FITNESS;
    setLineup((l) => l.map((b, k) => (k === i ? { ...b, [field]: arr[(arr.indexOf(b[field]) + 1) % arr.length] } : b)));
  };
  const moveRot = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= rotation.length) return;
    setRotation((r) => { const n = [...r]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  };

  return (
    <div className="min-h-screen bg-[#243024] text-[#E8E8D8] p-6" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div className="max-w-[1000px] mx-auto">
        <div className="mb-2 text-xs font-bold tracking-[0.2em] text-[#C4A853]">LINEUPS · PREVIEW</div>
        {/* opponent-SP-specific header */}
        <h1 className="text-2xl font-bold mb-1" style={{ textShadow: "2px 2px 0 rgba(0,0,0,0.8)" }}>
          Optimal lineup vs <span className="text-[#C4A853]">{OPP_SP.name}</span>
        </h1>
        <p className="text-sm text-[#E8E8D8]/65 mb-5">Brass Monkeys' next starter — <b className="text-[#E8E8D8]">{OPP_SP.hand}HP · {OPP_SP.line}</b>. Your lefties move up against the righty. Tweak the order and anyone's mojo/fitness below.</p>

        {/* your 4-man rotation (auto-advances) */}
        <div className="bg-[#2d3d2f] border-4 border-[#4A6844] p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-xs font-bold tracking-[0.2em] text-[#C4A853]">YOUR ROTATION</div>
            <span className="text-[11px] text-[#E8E8D8]/45">· 4-man · auto-advances after each game</span>
            <button type="button" onClick={() => setNextSP((n) => (n + 1) % rotation.length)}
              className="ml-auto flex items-center gap-1.5 bg-[#34472f] hover:bg-[#3a4d3c] border-2 border-[#4A6844] px-3 py-1.5 text-[11px] font-bold">
              <RotateCw className="w-3.5 h-3.5" /> Sim game → advance
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {rotation.map((sp, i) => {
              const isNext = i === nextSP;
              return (
                <div key={sp.id} className={`border-2 px-3 py-2 ${isNext ? "border-[#C4A853] bg-[#3a4d3c]" : "border-[#4A6844] bg-[#34472f]"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold tracking-wider" style={{ color: isNext ? "#C4A853" : "#E8E8D8" }}>{isNext ? "NEXT UP" : `SP${i + 1}`}</span>
                    <div className="flex gap-0.5">
                      <button type="button" onClick={() => moveRot(i, -1)} className="opacity-50 hover:opacity-100"><ChevronUp className="w-3 h-3 -rotate-90" /></button>
                      <button type="button" onClick={() => moveRot(i, 1)} className="opacity-50 hover:opacity-100"><ChevronDown className="w-3 h-3 -rotate-90" /></button>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-[#E8E8D8] truncate">{sp.name}</div>
                  <div className="text-[10px] text-[#E8E8D8]/50">{sp.hand}HP · {sp.line}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* the lineup — reorderable + mojo/fitness edits */}
        <div className="bg-[#2d3d2f] border-4 border-[#4A6844] p-4">
          <div className="text-xs font-bold tracking-[0.2em] text-[#C4A853] mb-3">BATTING ORDER · vs {OPP_SP.name}</div>
          <div className="flex flex-col gap-1.5">
            {lineup.map((b, i) => (
              <div key={b.id} className="flex items-center gap-3 bg-[#34472f] border-2 border-[#4A6844] px-3 py-2">
                <span className="w-5 text-center text-sm font-bold text-[#C4A853]">{i + 1}</span>
                <span className="w-10 text-[11px] font-bold text-[#E8E8D8]/60">{b.pos}</span>
                <span className="flex-1 min-w-0 text-sm font-bold text-[#E8E8D8] truncate">{b.name} <span className="text-[10px] text-[#E8E8D8]/45">{b.bats}HB</span></span>
                <button type="button" onClick={() => cycle(i, "mojo")} title="cycle mojo"
                  className="flex items-center gap-1 border-2 border-[#4A6844] px-2 py-1 text-[11px] font-bold" style={{ color: mojoColor(b.mojo) }}>
                  <Sparkles className="w-3 h-3" /> {b.mojo}
                </button>
                <button type="button" onClick={() => cycle(i, "fitness")} title="cycle fitness"
                  className="flex items-center gap-1 border-2 border-[#4A6844] px-2 py-1 text-[11px] font-bold" style={{ color: fitColor(b.fitness) }}>
                  <Heart className="w-3 h-3" /> {b.fitness}
                </button>
                <div className="flex flex-col">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="disabled:opacity-25 hover:text-[#C4A853]"><ChevronUp className="w-4 h-4" /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === lineup.length - 1} className="disabled:opacity-25 hover:text-[#C4A853]"><ChevronDown className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button type="button" className="flex items-center gap-2 bg-[#C4A853] hover:bg-[#D4B863] text-[#1A1A1A] border-[5px] border-[#E8E8D8] px-6 py-3 font-bold tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] active:scale-95">
              Lock this lineup <ArrowRight className="w-5 h-5" />
            </button>
            <span className="text-[11px] text-[#E8E8D8]/45">The scout set the order vs {OPP_SP.name}; your edits stick.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LineupsTabPreview;
