import { ArrowUpCircle, ArrowDownCircle, Repeat, TrendingUp } from "lucide-react";

/**
 * ScoutPanelPreview — the in-season scout / roster panel (roadmap §7-ish +
 * keystone optimizer), at /__preview/scout-panel. KEY: in-season recs speak in
 * WIN value, NOT dollars — "this move adds ~X% win probability / ~N wins" (JK
 * addendum). (The draft-time guide keeps the dollar value-vs-price/bargain-trap
 * framing — a different surface.) Recs: call-up / send-down / trade, each with a
 * reason and its win-impact, ranked. Mock-fed; the optimizer engine wires later.
 */

type RecKind = "call-up" | "send-down" | "trade-for" | "trade-away";
interface ScoutRec { kind: RecKind; headline: string; reason: string; winPct: number; wins: number; target?: string }
interface TeamRead { label: string; status: "strong" | "ok" | "weak"; note: string }

const TEAM_READ: TeamRead[] = [
  { label: "Lineup", status: "strong", note: "top-third in runs scored" },
  { label: "Rotation", status: "ok", note: "league-average — thin at the back" },
  { label: "Bullpen", status: "strong", note: "deep — your most tradeable surplus" },
  { label: "Second base", status: "weak", note: "bottom-50% in bWAR — your biggest hole" },
  { label: "Catcher", status: "weak", note: "the glove is dragging run prevention" },
];

const RECS: ScoutRec[] = [
  { kind: "trade-for", headline: "Trade for a second baseman", winPct: 3.4, wins: 1.5, target: "a league-average bat is your single biggest lever",
    reason: "Your 2B is bottom-50% in bWAR. Closing that gap moves the needle more than any other roster change." },
  { kind: "call-up", headline: "Call up SP Abe Krell", winPct: 2.1, wins: 0.9, target: "from the farm — MLB-ready",
    reason: "He's outpitching two of your five starters; the back of the rotation is leaking runs you don't have to give up." },
  { kind: "send-down", headline: "Sit / move on from C Cy Vane", winPct: 1.2, wins: 0.5, target: "a replacement-level glove helps",
    reason: "His defense is sinking your run prevention — even an average catcher's glove is a net gain here." },
  { kind: "trade-away", headline: "Deal from your bullpen surplus", winPct: 0.4, wins: 0.2, target: "your chip to land the 2B above",
    reason: "You're deep in relief; spending that depth to fix second base is the best use of your surplus." },
];

const STATUS: Record<TeamRead["status"], { c: string; label: string }> = {
  strong: { c: "#9FE0A0", label: "STRONG" },
  ok: { c: "#C4A853", label: "OK" },
  weak: { c: "#E0857A", label: "HOLE" },
};

const KIND: Record<RecKind, { icon: React.ReactNode; label: string; color: string }> = {
  "call-up": { icon: <ArrowUpCircle className="w-5 h-5" />, label: "CALL UP", color: "#9FE0A0" },
  "send-down": { icon: <ArrowDownCircle className="w-5 h-5" />, label: "SEND DOWN", color: "#E0857A" },
  "trade-for": { icon: <Repeat className="w-5 h-5" />, label: "TRADE FOR", color: "#C4A853" },
  "trade-away": { icon: <Repeat className="w-5 h-5" />, label: "TRADE AWAY", color: "#B0B7BC" },
};

function WinImpact({ pct, wins }: { pct: number; wins: number }) {
  return (
    <div className="flex items-center gap-2 bg-[#243024] border-2 border-[#4A6844] px-3 py-1.5">
      <TrendingUp className="w-4 h-4 text-[#9FE0A0]" />
      <div className="leading-tight">
        <div className="text-base font-bold text-[#9FE0A0]" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>+{pct.toFixed(1)}%</div>
        <div className="text-[9px] tracking-wider text-[#E8E8D8]/45">WIN PROB · ~{wins.toFixed(1)} WINS</div>
      </div>
    </div>
  );
}

export function ScoutPanelPreview() {
  return (
    <div className="min-h-screen bg-[#243024] text-[#E8E8D8] p-6" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div className="max-w-[980px] mx-auto">
        <div className="mb-2 text-xs font-bold tracking-[0.2em] text-[#C4A853]">IN-SEASON SCOUT · PREVIEW</div>
        <h1 className="text-2xl font-bold mb-1" style={{ textShadow: "2px 2px 0 rgba(0,0,0,0.8)" }}>The Scout's Desk</h1>
        <p className="text-sm text-[#E8E8D8]/65 mb-5 max-w-[74ch]">
          Your scout's read on the roster, in <b className="text-[#9FE0A0]">win value</b> — every move is rated by how much it moves your odds, not dollars.
          (Money was the draft's language; in-season, wins are.)
        </p>

        {/* team read */}
        <div className="bg-[#2d3d2f] border-4 border-[#4A6844] p-4 mb-4">
          <div className="text-xs font-bold tracking-[0.2em] text-[#C4A853] mb-3">THE READ · where you stand</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {TEAM_READ.map((r) => {
              const s = STATUS[r.status];
              return (
                <div key={r.label} className="bg-[#34472f] border-2 border-[#4A6844] px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[#E8E8D8]">{r.label}</span>
                    <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5" style={{ color: "#1A1A1A", background: s.c }}>{s.label}</span>
                  </div>
                  <div className="text-[11px] text-[#E8E8D8]/55 mt-1">{r.note}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* recommendations, ranked by win-impact */}
        <div className="text-xs font-bold tracking-[0.2em] text-[#C4A853] mb-2">RECOMMENDED MOVES · ranked by win-impact</div>
        <div className="flex flex-col gap-3">
          {RECS.map((rec, i) => {
            const k = KIND[rec.kind];
            return (
              <div key={i} className="bg-[#34472f] border-4 border-[#4A6844] p-4 flex flex-wrap items-start gap-4">
                <div className="flex items-center gap-2" style={{ color: k.color }}>
                  {k.icon}
                  <span className="text-[10px] font-bold tracking-wider">{k.label}</span>
                </div>
                <div className="flex-1 min-w-[260px]">
                  <div className="text-base font-bold text-[#E8E8D8]" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>{rec.headline}</div>
                  <div className="text-[12px] text-[#E8E8D8]/70 mt-1 leading-snug">{rec.reason}</div>
                  {rec.target ? <div className="text-[11px] text-[#C4A853] mt-1">→ {rec.target}</div> : null}
                </div>
                <WinImpact pct={rec.winPct} wins={rec.wins} />
              </div>
            );
          })}
        </div>

        <div className="mt-5 text-[11px] text-[#E8E8D8]/40">Advisory only — the call is yours. Win-impact is the scout's estimate from the keystone optimizer.</div>
      </div>
    </div>
  );
}

export default ScoutPanelPreview;
