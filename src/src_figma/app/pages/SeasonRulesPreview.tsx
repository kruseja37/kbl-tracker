import { CalendarDays } from "lucide-react";

/**
 * P7 RULES-V1-PRUNE: this preview used to render future season-rule controls.
 * Those controls are intentionally not built here because the live v1 consumers
 * do not read custom length, custom innings, checkpoint cadence, conferences, or
 * season-intensity settings yet.
 */
export function SeasonRulesPreview() {
  return (
    <div className="min-h-screen bg-[#243024] p-6 text-[#E8E8D8]" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div className="mx-auto max-w-[760px]">
        <div className="mb-2 text-xs font-bold tracking-[0.2em] text-[#C4A853]">SEASON RULES · PREVIEW</div>
        <h1 className="mb-5 text-2xl font-bold" style={{ textShadow: "2px 2px 0 rgba(0,0,0,0.8)" }}>
          No Live Preview Controls
        </h1>
        <div className="border-4 border-[#4A6844] bg-[#2d3d2f] p-5">
          <div className="mb-3 flex items-center gap-2 text-[#C4A853]">
            <CalendarDays className="h-4 w-4" />
            <span className="text-xs font-bold tracking-[0.2em]">PRUNED FOR V1</span>
          </div>
          <p className="max-w-[62ch] text-sm leading-6 text-[#E8E8D8]/70">
            The live season settings are in Franchise Setup. Future custom controls for season length, innings,
            extra-innings variants, checkpoint cadence, conferences, and season intensity are intentionally not
            interactive until their engine consumers exist.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SeasonRulesPreview;
