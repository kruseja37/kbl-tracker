import { useEffect, useState } from "react";
import { listGameStoriesForGame } from "../../../utils/gameStoriesStorage";
import { getReporter } from "../../../utils/reporterStorage";
import { getTeamColors } from "@/config/teamColors";
import type { BeatReporter, GameStory } from "../../../types/reporter";
import chalkBgImg from "../../../assets/chalk-bg.png";

interface PostGameColumnsProps {
  gameId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
}

interface ColumnSlot {
  story: GameStory | null;
  reporter: BeatReporter | null;
}

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 10;

const EMPTY_SLOT: ColumnSlot = { story: null, reporter: null };

function normalize(teamId: string | undefined | null): string {
  return (teamId ?? "").trim().toLowerCase();
}

function normalizeStoryBody(body: string): string {
  return body
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n");
}

export function PostGameColumns({
  gameId,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
}: PostGameColumnsProps) {
  const [homeSlot, setHomeSlot] = useState<ColumnSlot>(EMPTY_SLOT);
  const [awaySlot, setAwaySlot] = useState<ColumnSlot>(EMPTY_SLOT);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    setHomeSlot(EMPTY_SLOT);
    setAwaySlot(EMPTY_SLOT);
    setIsPolling(true);

    const homeKey = normalize(homeTeamId);
    const awayKey = normalize(awayTeamId);

    async function poll(): Promise<void> {
      if (cancelled) return;
      attempts += 1;

      try {
        const stories = await listGameStoriesForGame(gameId);
        if (cancelled) return;

        const homeStory =
          stories.find((entry) => normalize(entry.teamId) === homeKey) ?? null;
        const awayStory =
          stories.find((entry) => normalize(entry.teamId) === awayKey) ?? null;

        const [homeReporter, awayReporter] = await Promise.all([
          homeStory ? getReporter(homeStory.reporterId) : Promise.resolve(null),
          awayStory ? getReporter(awayStory.reporterId) : Promise.resolve(null),
        ]);
        if (cancelled) return;

        setHomeSlot({ story: homeStory, reporter: homeReporter });
        setAwaySlot({ story: awayStory, reporter: awayReporter });

        const bothDone = Boolean(homeStory && awayStory);
        if (!bothDone && attempts < MAX_POLL_ATTEMPTS) {
          timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
        } else {
          setIsPolling(false);
        }
      } catch (error) {
        console.warn("[PostGameColumns] poll failed:", error);
        if (!cancelled) setIsPolling(false);
      }
    }

    void poll();

    return () => {
      cancelled = true;
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, [gameId, homeTeamId, awayTeamId]);

  const hasAny = Boolean(homeSlot.story || awaySlot.story);
  if (!isPolling && !hasAny) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
      <ColumnCard
        slot={homeSlot}
        teamId={homeTeamId}
        teamName={homeTeamName}
        role="home"
        isPolling={isPolling && !homeSlot.story}
      />
      <ColumnCard
        slot={awaySlot}
        teamId={awayTeamId}
        teamName={awayTeamName}
        role="away"
        isPolling={isPolling && !awaySlot.story}
      />
    </div>
  );
}

function ColumnCard({
  slot,
  teamId,
  teamName,
  role,
  isPolling,
}: {
  slot: ColumnSlot;
  teamId: string;
  teamName: string;
  role: "home" | "away";
  isPolling: boolean;
}) {
  const colors = getTeamColors(teamId);
  const primary = colors.primary;
  const roleLabel = role === "home" ? "HOME COLUMN" : "AWAY COLUMN";

  const baseCardStyle = {
    borderColor: primary,
    backgroundImage: `url(${chalkBgImg}), linear-gradient(${primary}22, ${primary}22)`,
    backgroundRepeat: "repeat" as const,
    backgroundColor: "#1f2b21",
  };

  if (isPolling && !slot.story) {
    return (
      <div
        className="border-2 p-4 rounded-sm flex flex-col gap-2"
        style={baseCardStyle}
      >
        <HeaderRow
          primary={primary}
          teamName={teamName}
          roleLabel={roleLabel}
          byline={null}
        />
        <div className="text-[11px] text-[#a0a898] italic">
          Reporter filing column...
        </div>
      </div>
    );
  }

  if (!slot.story) {
    return (
      <div
        className="border-2 p-4 rounded-sm flex flex-col gap-2 opacity-60"
        style={{
          borderColor: "#556B55",
          backgroundColor: "#1f2b21",
        }}
      >
        <HeaderRow
          primary="#a0a898"
          teamName={teamName}
          roleLabel={roleLabel}
          byline={null}
        />
        <div className="text-[11px] text-[#a0a898] italic">
          No column filed for this game.
        </div>
      </div>
    );
  }

  const byline = slot.reporter?.name ?? null;

  return (
    <div
      className="border-2 p-4 rounded-sm flex flex-col gap-2"
      style={baseCardStyle}
    >
      <HeaderRow
        primary={primary}
        teamName={teamName}
        roleLabel={roleLabel}
        byline={byline}
      />
      <div
        className="text-sm font-bold text-[#E8E8D8] leading-tight"
        style={{
          fontFamily: "'Tox Typewriter', monospace",
          textShadow: "1px 1px 2px rgba(0,0,0,0.7)",
        }}
      >
        {slot.story.headline}
      </div>
      <div className="text-[12px] text-[#E8E8D8] whitespace-pre-wrap leading-relaxed">
        {normalizeStoryBody(slot.story.body)}
      </div>
    </div>
  );
}

function HeaderRow({
  primary,
  teamName,
  roleLabel,
  byline,
}: {
  primary: string;
  teamName: string;
  roleLabel: string;
  byline: string | null;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <div
        className="text-[10px] tracking-[0.3em] uppercase font-bold"
        style={{ color: primary }}
      >
        {teamName} · {roleLabel}
      </div>
      {byline ? (
        <div className="text-[9px] tracking-[0.2em] uppercase text-[#a0a898]">
          by {byline}
        </div>
      ) : null}
    </div>
  );
}
