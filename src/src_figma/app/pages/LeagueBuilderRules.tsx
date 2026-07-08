import { useNavigate } from "react-router";
import { Settings } from "lucide-react";
import { BallparkShell } from "../components/ballpark";

export function LeagueBuilderRules() {
  const navigate = useNavigate();

  return (
    <BallparkShell
      onBack={() => navigate("/league-builder")}
      icon={Settings}
      iconColor="#DD0000"
      title="RULES"
    >
      <div className="bg-[#556B55] border-[6px] border-[#4A6844] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
        <h2
          className="mb-3 text-lg font-bold"
          style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}
        >
          Rules are set during Franchise Setup
        </h2>
        <p className="max-w-[68ch] text-sm leading-6 text-[#E8E8D8]/75">
          Standalone rules presets are not wired into the live v1 season path. Use Franchise Setup to choose the
          season length, innings per game, extra-innings runner rule, and playoff structure that the app actually
          reads.
        </p>
      </div>
    </BallparkShell>
  );
}
