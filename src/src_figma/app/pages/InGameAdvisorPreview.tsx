import { useState } from "react";
import { Check, ArrowLeftRight, ShieldQuestion, Zap } from "lucide-react";

/**
 * InGameAdvisorPreview — the in-game move advisor (JK addendum), at
 * /__preview/ingame-advisor. A DISTINCT surface from the pregame lineups tab: a
 * mid-game decision moment — accept / adjust a recommended sub (or keep-in),
 * shown with its WIN-IMPACT. Two options compared by win probability; the call is
 * the GM's. Mock-fed; the optimizer wires later.
 */

export function InGameAdvisorPreview() {
  const [decided, setDecided] = useState<null | "change" | "keep">(null);

  return (
    <div className="min-h-screen bg-[#1a241c] text-[#E8E8D8] p-6 flex items-start justify-center" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div className="w-full max-w-[620px] mt-8">
        <div className="mb-2 text-xs font-bold tracking-[0.2em] text-[#C4A853]">IN-GAME ADVISOR · PREVIEW</div>

        <div className="bg-[#2d3d2f] border-4 border-[#C4A853] p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]">
          {/* the situation */}
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-[#C4A853] mb-2">
            <Zap className="w-4 h-4" /> THE BOOK SAYS
          </div>
          <div className="text-sm text-[#E8E8D8]/80 mb-1">
            <b className="text-[#E8E8D8]">Top 7th · ▲ 4–3</b> · runner on 2nd, 1 out
          </div>
          <div className="text-[12px] text-[#E8E8D8]/55 mb-4">Rafa Fenomeno is at 94 pitches, velocity down ~2 mph — the heart of their order is up.</div>

          {/* the two options, compared by win prob */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className={`border-4 p-3 ${decided === "keep" ? "border-[#9FE0A0]" : "border-[#4A6844] bg-[#34472f]"}`}>
              <div className="text-[10px] font-bold tracking-wider text-[#E8E8D8]/50 mb-1">KEEP FENOMENO IN</div>
              <div className="text-2xl font-bold text-[#E8E8D8]" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>71%</div>
              <div className="text-[10px] text-[#E8E8D8]/45">win probability</div>
            </div>
            <div className={`border-4 p-3 ${decided === "change" ? "border-[#9FE0A0]" : "border-[#C4A853] bg-[#3a4d3c]"}`}>
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold tracking-wider text-[#C4A853] mb-1">GO TO REYES (CP)</div>
                <span className="text-[9px] font-bold bg-[#9FE0A0] text-[#1A1A1A] px-1.5">+7%</span>
              </div>
              <div className="text-2xl font-bold text-[#9FE0A0]" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>78%</div>
              <div className="text-[10px] text-[#E8E8D8]/45">win probability · recommended</div>
            </div>
          </div>

          {/* the why */}
          <div className="bg-[#243024] border-2 border-[#4A6844] px-3 py-2 text-[12px] text-[#E8E8D8]/70 leading-snug mb-4">
            <b className="text-[#E8E8D8]">Why:</b> Reyes has owned the next two hitters (4-for-19, 0 HR), and Fenomeno's fading velocity plays right into their thump. The swap buys the most win-probability of any move here.
          </div>

          {/* decision */}
          {decided ? (
            <div className="flex items-center gap-2 bg-[#2f5d3a] border-4 border-[#9FE0A0] px-4 py-3 text-sm font-bold text-[#9FE0A0]">
              <Check className="w-5 h-5" />
              {decided === "change" ? "Change made — Reyes is in. (+7% win prob)" : "Sticking with Fenomeno — your call."}
              <button type="button" onClick={() => setDecided(null)} className="ml-auto text-[11px] text-[#E8E8D8]/60 hover:text-[#E8E8D8] underline">undo</button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setDecided("change")}
                className="flex items-center gap-2 bg-[#C4A853] hover:bg-[#D4B863] text-[#1A1A1A] border-4 border-[#E8E8D8] px-4 py-3 font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] active:scale-95">
                <ArrowLeftRight className="w-4 h-4" /> Make the change <span className="text-[#1A1A1A]/70">+7%</span>
              </button>
              <button type="button" onClick={() => setDecided("keep")}
                className="flex items-center gap-2 bg-[#34472f] hover:bg-[#3a4d3c] border-4 border-[#4A6844] px-4 py-3 font-bold text-[#E8E8D8]">
                Stick with Fenomeno
              </button>
              <button type="button"
                className="flex items-center gap-2 bg-[#34472f] hover:bg-[#3a4d3c] border-4 border-[#4A6844] px-4 py-3 font-bold text-[#E8E8D8]/80">
                <ShieldQuestion className="w-4 h-4" /> Someone else…
              </button>
            </div>
          )}
        </div>
        <div className="mt-3 text-[11px] text-[#E8E8D8]/40">A separate moment from the pregame lineups tab — this fires when the game asks for a call.</div>
      </div>
    </div>
  );
}

export default InGameAdvisorPreview;
