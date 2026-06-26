import { useState } from "react";
import { Check, ChevronRight, Lock, AlertTriangle, Snowflake } from "lucide-react";

/**
 * ConstructionRailPreview — the guided construction rail (roadmap §7.1), at
 * /__preview/construction-rail. One canonical path with a "continue" at every
 * seam (the missing one was farm-draft → setup), and an explicit "this locks your
 * franchise" confirmation at the FREEZE — the Mode-1→Mode-2 boundary, today
 * invisible. Mock-fed; this is the navigation shell the real screens slot into.
 */

interface Stage { key: string; label: string; blurb: string; cta: string }
const STAGES: Stage[] = [
  { key: "league", label: "League", blurb: "Pick your teams, structure, and tier.", cta: "Continue to the pool" },
  { key: "pool", label: "Pool", blurb: "Assemble and lock the player pool you'll draft from.", cta: "Continue to Draft Setup" },
  { key: "setup", label: "Draft Setup", blurb: "Seats, who owns which club, each club's identity, the room.", cta: "Start the draft" },
  { key: "draft", label: "Draft", blurb: "The auction — fill your 22 against the room.", cta: "On to the farm draft" },
  { key: "farm", label: "Farm", blurb: "The prospect draft — your scout's read fills the 10.", cta: "Continue to staffing" },
  { key: "staff", label: "Staff", blurb: "Hire your manager and beat reporter before the season.", cta: "Review & freeze" },
  { key: "freeze", label: "Freeze", blurb: "Lock the rosters and start the living season.", cta: "Freeze the franchise" },
  { key: "season", label: "Season", blurb: "Play ball — the living season begins.", cta: "Go to the clubhouse" },
];

export function ConstructionRailPreview() {
  const [i, setI] = useState(2); // start at Draft Setup for the demo
  const [showFreeze, setShowFreeze] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const stage = STAGES[i];
  const isFreeze = stage.key === "freeze";

  const advance = () => {
    if (isFreeze) { setShowFreeze(true); return; }
    setI((n) => Math.min(STAGES.length - 1, n + 1));
  };

  return (
    <div className="min-h-screen bg-[#243024] text-[#E8E8D8] p-6" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div className="max-w-[1000px] mx-auto">
        <div className="mb-2 text-xs font-bold tracking-[0.2em] text-[#C4A853]">BUILD A FRANCHISE · PREVIEW</div>
        <h1 className="text-2xl font-bold mb-5" style={{ textShadow: "2px 2px 0 rgba(0,0,0,0.8)" }}>From League to Launch</h1>

        {/* the rail */}
        <div className="bg-[#2d3d2f] border-4 border-[#4A6844] p-4 mb-5 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-[760px]">
            {STAGES.map((s, k) => {
              const done = k < i || (frozen && k <= i);
              const cur = k === i && !frozen;
              return (
                <div key={s.key} className="flex items-center gap-1 flex-1">
                  <button type="button" onClick={() => !frozen && setI(k)}
                    className={`flex flex-col items-center gap-1 px-2 py-1 flex-1 ${cur ? "" : "opacity-90"}`}>
                    <div className={`w-8 h-8 flex items-center justify-center border-2 text-xs font-bold ${
                      done ? "border-[#9FE0A0] bg-[#2f5d3a] text-[#9FE0A0]" : cur ? "border-[#C4A853] bg-[#3a4d3c] text-[#C4A853]" : "border-[#4A6844] bg-[#34472f] text-[#E8E8D8]/45"}`}>
                      {done ? <Check className="w-4 h-4" /> : s.key === "freeze" ? <Snowflake className="w-4 h-4" /> : k + 1}
                    </div>
                    <span className={`text-[10px] font-bold tracking-wide ${cur ? "text-[#C4A853]" : done ? "text-[#9FE0A0]" : "text-[#E8E8D8]/45"}`}>{s.label}</span>
                  </button>
                  {k < STAGES.length - 1 && <ChevronRight className={`w-4 h-4 ${k < i ? "text-[#9FE0A0]" : "text-[#4A6844]"}`} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* current stage panel */}
        <div className={`border-4 p-6 ${isFreeze ? "border-[#C4A853] bg-[#3a4d3c]" : "border-[#4A6844] bg-[#2d3d2f]"}`}>
          <div className="text-xs font-bold tracking-[0.2em] text-[#C4A853] mb-1">STEP {i + 1} OF {STAGES.length}</div>
          <div className="text-2xl font-bold text-[#E8E8D8] mb-2" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>{stage.label}</div>
          <p className="text-sm text-[#E8E8D8]/70 mb-5 max-w-[60ch]">{stage.blurb}{isFreeze ? " This is the point of no return — the Mode-1 → Mode-2 boundary." : ""}</p>
          <div className="flex items-center gap-3">
            {i > 0 && !frozen && <button type="button" onClick={() => setI((n) => Math.max(0, n - 1))} className="px-4 py-2 border-4 border-[#4A6844] bg-[#34472f] hover:bg-[#3a4d3c] text-sm font-bold">Back</button>}
            <button type="button" onClick={advance} disabled={frozen && stage.key === "season"}
              className={`flex items-center gap-2 px-6 py-3 font-bold tracking-wide border-[5px] border-[#E8E8D8] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] active:scale-95 ${isFreeze ? "bg-[#A3483D] text-[#fff]" : "bg-[#C4A853] text-[#1A1A1A] hover:bg-[#D4B863]"}`}>
              {isFreeze ? <Lock className="w-5 h-5" /> : null}{stage.cta} {!isFreeze && <ChevronRight className="w-5 h-5" />}
            </button>
            {frozen && <span className="flex items-center gap-1 text-[12px] font-bold text-[#9FE0A0]"><Snowflake className="w-4 h-4" /> franchise frozen</span>}
          </div>
        </div>
      </div>

      {/* the "this locks your franchise" freeze takeover */}
      {showFreeze && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6" style={{ fontFamily: "system-ui, sans-serif" }}>
          <div className="w-full max-w-[520px] bg-[#2d3d2f] border-4 border-[#A3483D] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] text-[#E0857A] mb-2"><AlertTriangle className="w-4 h-4" /> THIS LOCKS YOUR FRANCHISE</div>
            <div className="text-2xl font-bold text-[#E8E8D8] mb-3" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>Freeze & begin the season?</div>
            <p className="text-sm text-[#E8E8D8]/70 mb-2">Freezing snapshots every roster and contract as your franchise's baseline, then starts the living season.</p>
            <ul className="text-[12px] text-[#E8E8D8]/60 mb-5 list-disc pl-5 space-y-1">
              <li>Draft trades and edits close.</li>
              <li>Each player's starting value &amp; morale are set from how the draft went.</li>
              <li><b className="text-[#E8E8D8]">This can't be undone.</b></li>
            </ul>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => { setFrozen(true); setShowFreeze(false); setI(STAGES.length - 1); }}
                className="flex items-center gap-2 bg-[#A3483D] hover:bg-[#b85044] text-[#fff] border-4 border-[#E8E8D8] px-5 py-3 font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] active:scale-95">
                <Snowflake className="w-4 h-4" /> Freeze &amp; start the season
              </button>
              <button type="button" onClick={() => setShowFreeze(false)} className="px-5 py-3 border-4 border-[#4A6844] bg-[#34472f] hover:bg-[#3a4d3c] font-bold">Not yet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConstructionRailPreview;
