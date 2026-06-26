import { useState } from "react";
import { Lock, Check, TrendingUp, AlertTriangle, Star } from "lucide-react";

/**
 * DraftGuideCard — the player-on-the-block draft-guide overlay (roadmap §7.4),
 * for the auction (MLB, public IV) and the farm draft (fogged value). The guide
 * is an assembly: (a) a green/yellow/red AFFORDABILITY badge (your MLB archetype's
 * luxury-tax risk), (b) the SCOUT value read — price range + 20–80 grade — default
 * COVERED, press-and-hold to reveal (keeps your read from rivals across the table),
 * (c) TEAM-FIT / hole flags (from the roster analyzer), and (d) BARGAIN / TRAP
 * flags where true value ≠ price (the scout's fielding-corrected edge).
 *
 * Draft-time framing is DOLLARS (value-vs-price). The IN-SEASON scout speaks
 * win-value — a different surface.
 */

export type Affordability = "green" | "yellow" | "red";

export interface DraftGuidePlayer {
  name: string;
  position: string;
  personality?: string;
  tier: "mlb" | "farm";
  ivLabel?: string;          // MLB only — public IV, e.g. "~$144k"
  affordability: Affordability;
  affordabilityNote?: string;
  scout: { priceLow: string; priceHigh: string; grade: number; confidence?: string }; // covered read
  teamFit?: { fit: boolean; text: string };
  flag?: { kind: "bargain" | "trap"; text: string };
}

const AFF: Record<Affordability, { c: string; bg: string; label: string }> = {
  green: { c: "#9FE0A0", bg: "#2f5d3a", label: "Affordable" },
  yellow: { c: "#1A1A1A", bg: "#C4A853", label: "Tax risk" },
  red: { c: "#fff", bg: "#A3483D", label: "Over the line" },
};

function GradeGauge({ grade }: { grade: number }) {
  const pct = Math.max(0, Math.min(100, ((grade - 20) / 60) * 100));
  return (
    <div>
      <div className="flex justify-between text-[9px] font-bold text-[#E8E8D8]/45 mb-1"><span>20</span><span>50</span><span>80</span></div>
      <div className="relative h-2 bg-[#243024] border border-[#4A6844]">
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#4A6844]" />
        <div className="absolute -top-1 -bottom-1 w-1 bg-[#C4A853]" style={{ left: `calc(${pct}% - 2px)` }} />
      </div>
      <div className="text-center text-lg font-bold text-[#C4A853] mt-1" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>{grade}</div>
    </div>
  );
}

export function DraftGuideCard({ player }: { player: DraftGuidePlayer }) {
  const [revealed, setRevealed] = useState(false);
  const aff = AFF[player.affordability];
  const hold = {
    onMouseDown: () => setRevealed(true),
    onMouseUp: () => setRevealed(false),
    onMouseLeave: () => setRevealed(false),
    onTouchStart: () => setRevealed(true),
    onTouchEnd: () => setRevealed(false),
  };

  return (
    <div className="bg-[#34472f] border-4 border-[#C4A853] p-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,0.8)]">
      {/* header + affordability */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="text-xl font-bold text-[#E8E8D8]" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>{player.name}</div>
          <div className="text-[12px] text-[#E8E8D8]/65">{player.position}{player.personality ? ` · ${player.personality}` : ""}</div>
        </div>
        <div className="flex flex-col items-end">
          <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider px-2 py-1" style={{ color: aff.c, background: aff.bg }}>
            <span className="w-2 h-2 rounded-full" style={{ background: aff.c }} /> {aff.label.toUpperCase()}
          </span>
          {player.affordabilityNote ? <span className="text-[10px] text-[#E8E8D8]/45 mt-1 max-w-[150px] text-right">{player.affordabilityNote}</span> : null}
        </div>
      </div>

      {/* public value (MLB) or fogged (farm) */}
      <div className="text-[12px] mb-3">
        {player.tier === "mlb" && player.ivLabel ? (
          <span className="text-[#E8E8D8]/70">Worth (IV): <b className="text-[#E8E8D8]">{player.ivLabel}</b> <span className="text-[#E8E8D8]/40">· public, advisory</span></span>
        ) : (
          <span className="text-[#E8E8D8]/50 italic">Value fogged — only your scout's read.</span>
        )}
      </div>

      {/* covered scout read — press & hold */}
      <button type="button" {...hold}
        className="w-full text-left border-2 border-[#4A6844] bg-[#2d3d2f] px-3 py-2 mb-3 select-none cursor-pointer">
        <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.14em] text-[#C4A853] mb-1">
          <Lock className="w-3 h-3" /> YOUR SCOUT'S READ
          <span className="ml-auto text-[#E8E8D8]/40 normal-case tracking-normal">{revealed ? "release to cover" : "hold to reveal"}</span>
        </div>
        {revealed ? (
          <div className="grid grid-cols-[1fr_auto] gap-3 items-center pt-1">
            <div>
              <div className="text-[10px] text-[#E8E8D8]/45">SCOUT PRICE RANGE</div>
              <div className="text-base font-bold text-[#E8E8D8]">{player.scout.priceLow} – {player.scout.priceHigh}</div>
              {player.scout.confidence ? <div className="text-[10px] text-[#E8E8D8]/45 mt-0.5">{player.scout.confidence}</div> : null}
            </div>
            <div className="w-28"><GradeGauge grade={player.scout.grade} /></div>
          </div>
        ) : (
          <div className="text-[12px] text-[#E8E8D8]/30 py-1">●●●●●●  ·  ●●  ·  press & hold to see the range + grade</div>
        )}
      </button>

      {/* team-fit + bargain/trap flags */}
      <div className="flex flex-col gap-1.5">
        {player.teamFit ? (
          <div className={`flex items-center gap-2 text-[12px] font-bold ${player.teamFit.fit ? "text-[#9FE0A0]" : "text-[#E8E8D8]/55"}`}>
            {player.teamFit.fit ? <Check className="w-4 h-4" /> : <TrendingUp className="w-4 h-4 opacity-50" />} {player.teamFit.text}
          </div>
        ) : null}
        {player.flag ? (
          <div className={`flex items-center gap-2 text-[12px] font-bold ${player.flag.kind === "bargain" ? "text-[#C4A853]" : "text-[#E0857A]"}`}>
            {player.flag.kind === "bargain" ? <Star className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {player.flag.kind === "bargain" ? "BARGAIN" : "TRAP"} — {player.flag.text}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default DraftGuideCard;
