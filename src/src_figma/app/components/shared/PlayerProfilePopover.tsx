import type { ReactNode } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { buildDraftProfileModel, type DraftProfileFullRatings } from "../../../../utils/draftProfileModel";
import type { Player } from "../../../../utils/leagueBuilderStorage";

interface PlayerProfilePopoverProps {
  player: Player;
  revealFull: boolean;
  children: ReactNode;
}

type NumericRatingKey = Exclude<keyof DraftProfileFullRatings, "arsenal">;

const BATTING_RATINGS: Array<{ label: string; key: NumericRatingKey }> = [
  { label: "POW", key: "power" },
  { label: "CON", key: "contact" },
  { label: "SPD", key: "speed" },
  { label: "FLD", key: "fielding" },
  { label: "ARM", key: "arm" },
];

const PITCHING_RATINGS: Array<{ label: string; key: NumericRatingKey }> = [
  { label: "VEL", key: "velocity" },
  { label: "JNK", key: "junk" },
  { label: "ACC", key: "accuracy" },
];

function metaLine(model: ReturnType<typeof buildDraftProfileModel>): string {
  const positions = model.secondaryPosition
    ? `${model.primaryPosition}/${model.secondaryPosition}`
    : model.primaryPosition;
  const armSlot = model.armSlot ? `${model.armSlot} slot` : "slot -";
  return `${positions} · Age ${model.age} · B/T ${model.bats}/${model.throws} · ${armSlot}`;
}

function Chip({ children, tone = "ash" }: { children: ReactNode; tone?: "ash" | "brass" | "chalk" }) {
  const toneClass =
    tone === "brass"
      ? "border-[#D3BF84] text-[#F7D883]"
      : tone === "chalk"
        ? "border-[#E8E8D8]/45 text-[#E8E8D8]"
        : "border-[#53645A] text-[#C9C2A3]";
  return (
    <span className={`inline-flex items-center border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${toneClass}`}>
      {children}
    </span>
  );
}

function AttributeCell({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  const emphasized = typeof value === "number" && value >= 80;
  return (
    <div className={`border-[3px] border-[#D3BF84] bg-[#FFF8DB] px-4 py-4 ${emphasized ? "shadow-[0_0_0_2px_rgba(247,216,131,0.35)]" : ""}`}>
      <div className="text-[8px] text-[#8A6A1A] sm:text-[9px]">{label}</div>
      <div className={`mt-2 text-[10px] leading-5 sm:text-[11px] ${emphasized ? "font-black text-[#6F3F00]" : "text-black"}`}>{value}</div>
    </div>
  );
}

function RatingsGrid({ ratings }: { ratings: DraftProfileFullRatings }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-1.5">
        {BATTING_RATINGS.map((rating) => (
          <AttributeCell key={rating.key} label={rating.label} value={ratings[rating.key]} />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {PITCHING_RATINGS.map((rating) => (
          <AttributeCell key={rating.key} label={rating.label} value={ratings[rating.key]} />
        ))}
        <AttributeCell label="ARS" value={ratings.arsenal.length > 0 ? ratings.arsenal.join(" ") : "-"} />
      </div>
    </div>
  );
}

export function PlayerProfilePopover({ player, revealFull, children }: PlayerProfilePopoverProps) {
  const model = buildDraftProfileModel(player, { revealFull });
  return (
    <Popover>
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          className="inline-flex min-w-0 cursor-pointer align-baseline outline-none focus-visible:ring-2 focus-visible:ring-[#F7D883] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1D1A]"
        >
          {children}
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="z-[80] w-[min(92vw,520px)] rounded-none border-[3px] border-[#D3BF84] bg-[#20241F] p-0 text-[#E8E8D8] shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
      >
        <div className="border-b border-[#D3BF84]/45 bg-[#2B302A] px-4 py-3">
          <div className="text-[18px] font-black uppercase leading-tight tracking-[0.08em] text-[#FFF8DB]">{model.name}</div>
          <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#C9C2A3]">{metaLine(model)}</div>
        </div>

        <div className="space-y-4 bg-[linear-gradient(180deg,#20241F_0%,#171A17_100%)] px-4 py-4">
          <div className="flex flex-wrap gap-2">
            {model.archetype ? <Chip tone="brass">{model.archetype}</Chip> : null}
            <Chip tone="chalk">{model.chemistry}</Chip>
            <Chip>{model.personality}</Chip>
          </div>

          {model.fullRatings ? (
            <>
              <RatingsGrid ratings={model.fullRatings} />
              <div className="flex flex-wrap gap-2">
                {model.traits.length > 0 ? (
                  model.traits.map((trait) => <Chip key={trait}>{trait}</Chip>)
                ) : (
                  <span className="text-[11px] uppercase tracking-[0.12em] text-[#C9C2A3]/70">No listed traits</span>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <AttributeCell label="SCOUT" value={model.scoutBands.scoutedGrade} />
                <AttributeCell label="POT" value={model.scoutBands.potentialGrade} />
                <AttributeCell label="CONF" value={model.scoutBands.scoutConfidence} />
                <AttributeCell label="NAME" value={model.scoutBands.scoutName} />
              </div>
              <div className="border border-[#53645A] bg-[#151915] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#C9C2A3]">
                Farm - scouting only
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
