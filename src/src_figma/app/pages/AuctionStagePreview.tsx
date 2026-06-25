import { useMemo, useState } from "react";
import { AuctionStage, type AuctionStageVM } from "../components/auction/AuctionStage";

/**
 * AuctionStagePreview — a non-destructive, routable preview of the redesigned
 * AuctionStage fed by mock view-models (no seeded auction needed). Lets JK see
 * the "Premium Retro" MLB + farm stage running in-app at /__preview/auction-stage
 * without touching the live auction pages or their tests. The production pages
 * will feed AuctionStage real `useAuctionDraft` data via a thin adapter.
 */

function buildMlbVm(highBid: number, currentBid: number, selected: number): AuctionStageVM {
  return {
    tier: "mlb",
    status: {
      phaseLabel: "⚾ MLB Draft",
      lotLabel: "Lot 14 of ~92",
      rosterLabel: "filling 22-man rosters",
      nowText: "your move",
    },
    lot: {
      name: "Rafa Fenomeno",
      positions: "SP / RP",
      personality: "🔥 Competitive",
      chemistry: "⚡ Sparkplug",
      batsThrows: "R/R",
      ivAdvisory: "~$144,000",
      highBid: { amount: highBid, by: highBid >= 37000 ? "you" : "Page Keys", isYou: highBid >= 37000 },
    },
    move: {
      walletLabel: "Your budget",
      wallet: 410000,
      maxBid: 66000,
      slotsLeft: 9,
      ceilingNote: "Capped at $66k so you can still fill your last 9 slots at the minimum. Raises above it are off the table.",
      presets: [
        { label: "+$5k", amount: 5000, enabled: true, selected: selected === 5000 },
        { label: "+$10k", amount: 10000, enabled: true, selected: selected === 10000 },
        { label: "+$25k", amount: 25000, enabled: true, selected: selected === 25000 },
        { label: "+$50k", amount: 50000, enabled: false },
      ],
      currentBid,
      canBid: true,
    },
    board: {
      title: "Your roster · 13 of 22",
      hint: "gaps glow",
      slots: [
        { pos: "C", who: "Vane", filled: true, isGap: false },
        { pos: "1B", who: "Drake", filled: true, isGap: false },
        { pos: "2B", who: "open", filled: false, isGap: true },
        { pos: "SS", who: "Pax", filled: true, isGap: false },
        { pos: "3B", who: "Ruiz", filled: true, isGap: false },
        { pos: "LF", who: "Stad", filled: true, isGap: false },
        { pos: "CF", who: "Pastimm", filled: true, isGap: false },
        { pos: "RF", who: "open", filled: false, isGap: true },
        { pos: "SP", who: "Bolt", filled: true, isGap: false },
        { pos: "SP", who: "Lars", filled: true, isGap: false },
        { pos: "SP", who: "open", filled: false, isGap: true },
        { pos: "CP", who: "open", filled: false, isGap: true },
      ],
      needLine: <>Still hunting: a <b>2B</b>, an arm for the rotation, and a closer.</>,
    },
    log: [
      { kind: "won", text: "Blake Bolt", amount: 28000 },
      { kind: "rival", text: "Cy Vane → Page Caps", amount: 41000 },
      { kind: "gone", text: "Avery Anchor — no bid" },
      { kind: "won", text: "Pax Flext", amount: 53000 },
    ],
    coach: <>He'd plug your <b>rotation hole</b> — and remember, pass and he's gone for good.</>,
  };
}

function buildFarmVm(selected: number, currentBid: number): AuctionStageVM {
  return {
    tier: "farm",
    status: {
      phaseLabel: "🌱 Farm Draft",
      lotLabel: "Lot 5 of ~24",
      rosterLabel: "filling 10-deep farm",
      nowText: "your move",
    },
    lot: {
      name: "Jet Komuro",
      positions: "2B / SS",
      personality: "😎 Relaxed",
      chemistry: "🤝 Team-First",
      age: 19,
      scout: {
        rangeLow: 22000,
        rangeHigh: 40000,
        mid: 31000,
        grade2080: 55,
        confidence: "High",
        confidenceNote: "Okafor scouts infielders; this is right in his lane.",
      },
      highBid: { amount: 24000, by: "you", isYou: true },
    },
    move: {
      walletLabel: "Farm wallet",
      wallet: 120000,
      maxBid: 31000,
      slotsLeft: 6,
      ceilingNote: "Bid against your scout's range, not a number you can see. Over the band looks like an overpay — and your kid will feel it.",
      presets: [
        { label: "+$1k", amount: 1000, enabled: true, selected: selected === 1000 },
        { label: "+$5k", amount: 5000, enabled: true, selected: selected === 5000 },
        { label: "+$10k", amount: 10000, enabled: true, selected: selected === 10000 },
      ],
      currentBid,
      canBid: true,
    },
    board: {
      title: "Your farm · 4 of 10",
      hint: "up-the-middle wanted",
      columns: 5,
      slots: [
        { pos: "C", filled: true, isGap: false },
        { pos: "2B", filled: false, isGap: true },
        { pos: "SS", filled: false, isGap: true },
        { pos: "CF", filled: true, isGap: false },
        { pos: "SP", filled: true, isGap: false },
        { pos: "RP", filled: false, isGap: true },
        { pos: "3B", filled: true, isGap: false },
        { pos: "LF", filled: false, isGap: true },
        { pos: "RF", filled: false, isGap: true },
        { pos: "CP", filled: false, isGap: true },
      ],
      needLine: <>Komuro is a <b>2B/SS</b> — exactly the up-the-middle hole your scout flagged.</>,
    },
    log: [],
    coach: <>Right in your need — but he's a <b>relaxed, team-first</b> kid. Overpay and he won't sulk; reach too far and your wallet will.</>,
  };
}

export function AuctionStagePreview() {
  const [tier, setTier] = useState<"mlb" | "farm">("mlb");
  const [mlbSel, setMlbSel] = useState(5000);
  const [farmSel, setFarmSel] = useState(5000);
  const [mlbHigh, setMlbHigh] = useState(32000);
  const [farmHigh, setFarmHigh] = useState(24000);

  const vm = useMemo(() => {
    if (tier === "mlb") return buildMlbVm(mlbHigh, mlbHigh + mlbSel, mlbSel);
    return buildFarmVm(farmSel, farmHigh + farmSel);
  }, [tier, mlbSel, farmSel, mlbHigh, farmHigh]);

  const onBid = () => {
    if (tier === "mlb") setMlbHigh((h) => h + mlbSel);
    else setFarmHigh((h) => h + farmSel);
  };
  const onPass = () => {
    // preview: cycle the high bid as a stand-in for "next lot"
    if (tier === "mlb") setMlbHigh(32000);
    else setFarmHigh(24000);
  };

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "fixed", top: 12, right: 12, zIndex: 50, display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => setTier("mlb")}
          style={pillStyle(tier === "mlb")}
        >MLB stage</button>
        <button
          type="button"
          onClick={() => setTier("farm")}
          style={pillStyle(tier === "farm")}
        >Farm stage</button>
      </div>
      <AuctionStage
        vm={vm}
        onSelectPreset={(amt) => (tier === "mlb" ? setMlbSel(amt) : setFarmSel(amt))}
        onBid={onBid}
        onPass={onPass}
      />
    </div>
  );
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
    fontFamily: "-apple-system, system-ui, sans-serif",
    fontSize: 12.5,
    fontWeight: 650,
    padding: "8px 14px",
    borderRadius: 999,
    cursor: "pointer",
    border: active ? "1px solid #C4A853" : "1px solid rgba(232,232,216,0.18)",
    background: active ? "linear-gradient(180deg,#4a6440,#3c5236)" : "rgba(0,0,0,0.3)",
    color: active ? "#E8E8D8" : "rgba(232,232,216,0.62)",
  };
}

export default AuctionStagePreview;
