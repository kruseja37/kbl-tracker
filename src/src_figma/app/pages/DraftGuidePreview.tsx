import { useState } from "react";
import { DraftGuideCard, type DraftGuidePlayer } from "../components/draft/DraftGuideCard";

/**
 * DraftGuidePreview — the draft-guide overlay (roadmap §7.4) on the block, at
 * /__preview/draft-guide. Mock-fed; toggles between the MLB auction (public IV)
 * and the farm draft (fogged). Shows the affordability badge, the covered scout
 * read (press & hold), team-fit, and bargain/trap flags across states.
 */

const MLB: DraftGuidePlayer[] = [
  {
    name: "Rafa Fenomeno", position: "SP/RP", personality: "Competitive · Sparkplug", tier: "mlb",
    ivLabel: "~$144k", affordability: "green", affordabilityNote: "fits your power identity — cheap to land",
    scout: { priceLow: "$120k", priceHigh: "$155k", grade: 62, confidence: "tight read · your scout's strength" },
    teamFit: { fit: true, text: "Fills your rotation hole" },
    flag: { kind: "bargain", text: "priced under his true glove value" },
  },
  {
    name: "Cy Vane", position: "C", personality: "Egotistical", tier: "mlb",
    ivLabel: "~$310k", affordability: "red", affordabilityNote: "blows your catcher budget; heavy tax",
    scout: { priceLow: "$180k", priceHigh: "$240k", grade: 38, confidence: "wide read — proceed carefully" },
    teamFit: { fit: false, text: "You're already deep at catcher" },
    flag: { kind: "trap", text: "his bat won't cover that glove at this price" },
  },
  {
    name: "Hank Drake", position: "1B", personality: "Relaxed", tier: "mlb",
    ivLabel: "~$84k", affordability: "yellow", affordabilityNote: "fine, but tightens your last few slots",
    scout: { priceLow: "$70k", priceHigh: "$95k", grade: 54 },
    teamFit: { fit: true, text: "Solid corner bat you still need" },
  },
];

const FARM: DraftGuidePlayer[] = [
  {
    name: "Junior Voss", position: "SS", personality: "Competitive", tier: "farm",
    affordability: "green", affordabilityNote: "well within your farm wallet",
    scout: { priceLow: "$28k", priceHigh: "$34k", grade: 70, confidence: "high — your scout's specialty (infield)" },
    teamFit: { fit: true, text: "The crown jewel your system lacks" },
    flag: { kind: "bargain", text: "the room is sleeping on him" },
  },
  {
    name: "Rudy Sant", position: "LF", personality: "Droopy", tier: "farm",
    affordability: "yellow",
    scout: { priceLow: "$9k", priceHigh: "$18k", grade: 41, confidence: "wide — out of your scout's lane" },
    teamFit: { fit: false, text: "Outfield's crowded already" },
    flag: { kind: "trap", text: "raw — the grade flatters him" },
  },
];

export function DraftGuidePreview() {
  const [tier, setTier] = useState<"mlb" | "farm">("mlb");
  const players = tier === "mlb" ? MLB : FARM;
  return (
    <div className="min-h-screen bg-[#243024] text-[#E8E8D8] p-6" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div className="max-w-[1100px] mx-auto">
        <div className="mb-2 text-xs font-bold tracking-[0.2em] text-[#C4A853]">DRAFT GUIDE · PREVIEW</div>
        <h1 className="text-2xl font-bold mb-1" style={{ textShadow: "2px 2px 0 rgba(0,0,0,0.8)" }}>On the Block</h1>
        <p className="text-sm text-[#E8E8D8]/65 mb-5 max-w-[74ch]">
          Your read on each player as they come up: can you afford him (vs your MLB identity), your scout's private
          price + grade (press &amp; hold so rivals can't see), whether he fits a hole, and where price ≠ true value.
        </p>

        <div className="inline-flex border-4 border-[#4A6844] mb-6">
          {(["mlb", "farm"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTier(t)}
              className={`px-5 py-2 text-sm font-bold border-r-4 border-[#4A6844] last:border-r-0 ${tier === t ? "bg-[#C4A853] text-[#1A1A1A]" : "bg-[#34472f] text-[#E8E8D8] hover:bg-[#3a4d3c]"}`}>
              {t === "mlb" ? "MLB auction" : "Farm draft"}
            </button>
          ))}
        </div>
        <div className="text-[12px] text-[#E8E8D8]/50 mb-4">
          {tier === "mlb" ? "MLB — the IV is public; your scout's edge is the bargain/trap read." : "Farm — value is fogged; the scout's read is all you've got. Press & hold to see it."}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {players.map((p) => <DraftGuideCard key={p.name} player={p} />)}
        </div>
      </div>
    </div>
  );
}

export default DraftGuidePreview;
