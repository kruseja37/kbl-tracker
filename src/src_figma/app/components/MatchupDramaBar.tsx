import { Flame, Gauge, RadioTower } from "lucide-react";

import { FAME_TIER_LABEL } from "../../../types/reporter";
import { FamePip } from "./FamePip";
import type { ReporterContext } from "../engines/reporter/reporterContext";

export interface MatchupDramaBarProps {
  context: ReporterContext;
  className?: string;
}

type DramaLevel = "low" | "medium" | "high";

const LEVEL_STYLES: Record<
  DramaLevel,
  { label: string; accent: string; glow: string; copy: string }
> = {
  low: {
    label: "Low Drama",
    accent: "#88AA88",
    glow: "rgba(136, 170, 136, 0.2)",
    copy: "Routine matchup. Reporters are watching the count, not writing the lede yet.",
  },
  medium: {
    label: "Medium Drama",
    accent: "#F2C041",
    glow: "rgba(242, 192, 65, 0.24)",
    copy: "There is enough leverage and reputation here for the booth to lean forward.",
  },
  high: {
    label: "High Drama",
    accent: "#CC3433",
    glow: "rgba(204, 52, 51, 0.28)",
    copy: "Marquee pressure. This at-bat is already wearing tomorrow's headline.",
  },
};

export function getMatchupDramaLevel(dramaticWeight: number): DramaLevel {
  if (dramaticWeight >= 3.5) return "high";
  if (dramaticWeight >= 2) return "medium";
  return "low";
}

function formatSignedWpa(wpa?: number): string {
  if (wpa === undefined) return "WPA pending";
  const sign = wpa > 0 ? "+" : "";
  return `${sign}${wpa.toFixed(3)} WPA`;
}

function formatFameLabel(tier: ReporterContext["batter"]["effectiveFame"]): string {
  return `${FAME_TIER_LABEL[tier]} ${tier}/5`;
}

export function MatchupDramaBar({ context, className = "" }: MatchupDramaBarProps) {
  const level = getMatchupDramaLevel(context.dramaticWeight);
  const style = LEVEL_STYLES[level];
  const wpaMoment = context.wpaMoment;
  const inningPrefix = context.gameState.halfInning === "TOP" ? "Top" : "Bot";

  return (
    <section
      aria-label={`Matchup drama bar: ${style.label}`}
      className={`relative overflow-hidden border-[4px] bg-[#263322] text-[#F5E8CF] shadow-[0_18px_42px_rgba(0,0,0,0.35)] ${className}`}
      data-drama-level={level}
      data-testid="matchup-drama-bar"
      style={{
        borderColor: style.accent,
        boxShadow: `0 0 0 1px rgba(245,232,207,0.14) inset, 0 18px 42px rgba(0,0,0,0.35), 0 0 30px ${style.glow}`,
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(circle at 15% 0%, rgba(245,232,207,0.16), transparent 32%), radial-gradient(circle at 86% 22%, rgba(242,192,65,0.16), transparent 30%)",
        }}
      />

      <div className="relative grid gap-4 p-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <PlayerPanel
          align="left"
          label="Batter"
          name={context.batter.name}
          subline={context.battingTeam.name}
          tier={context.batter.effectiveFame}
        />

        <div className="flex flex-col items-center gap-2 border-y border-[#F5E8CF]/20 py-3 md:border-x md:border-y-0 md:px-5 md:py-0">
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ borderColor: style.accent, color: style.accent }}
          >
            <Flame className="h-3.5 w-3.5" />
            {style.label}
          </div>
          <div className="font-['Tox_Typewriter',monospace] text-xl text-[#F2C041]">
            {context.dramaticWeight.toFixed(2)}
          </div>
          <div className="text-center text-[10px] uppercase tracking-[0.14em] text-[#CBB89C]">
            Reporter Weight
          </div>
        </div>

        <PlayerPanel
          align="right"
          label="Pitcher"
          name={context.pitcher.name}
          subline={context.pitchingTeam.name}
          tier={context.pitcher.effectiveFame}
        />
      </div>

      <div className="relative grid gap-3 border-t border-[#F5E8CF]/18 bg-black/18 px-4 py-3 text-xs text-[#E8E8D8] md:grid-cols-[1fr_auto_auto] md:items-center">
        <div className="flex items-center gap-2">
          <RadioTower className="h-4 w-4" style={{ color: style.accent }} />
          <span>{style.copy}</span>
        </div>
        <div className="flex items-center gap-2 text-[#CBB89C]">
          <Gauge className="h-4 w-4" />
          <span>
            {inningPrefix} {context.gameState.inning}, {context.gameState.outs} out
          </span>
        </div>
        <div className="font-bold text-[#F2C041]">{formatSignedWpa(wpaMoment?.wpa)}</div>
      </div>
    </section>
  );
}

function PlayerPanel({
  align,
  label,
  name,
  subline,
  tier,
}: {
  align: "left" | "right";
  label: string;
  name: string;
  subline: string;
  tier: ReporterContext["batter"]["effectiveFame"];
}) {
  const isRight = align === "right";

  return (
    <div className={`flex items-center gap-3 ${isRight ? "md:flex-row-reverse md:text-right" : ""}`}>
      <FamePip tier={tier} size="md" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.18em] text-[#CBB89C]">{label}</div>
        <div className="truncate font-['Tox_Typewriter',monospace] text-lg font-bold text-[#F5E8CF]">
          {name}
        </div>
        <div className="mt-1 text-[11px] text-[#E8E8D8]/70">{subline}</div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#F2C041]">
          {formatFameLabel(tier)}
        </div>
      </div>
    </div>
  );
}
