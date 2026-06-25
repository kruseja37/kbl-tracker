/**
 * Spring Training Flow Component
 * Per Ralph Framework NEW-002 (GAP-038)
 *
 * Shows roster age overview for spring training.
 */

import { useMemo, useState } from "react";
import { useOffseasonData } from "@/hooks/useOffseasonData";
import {
  getCareerPhase,
  getCareerPhaseDisplayName,
  type CareerPhase,
} from "../../../engines/agingEngine";
import { Sunrise, CheckCircle } from "lucide-react";

interface PlayerProjection {
  playerId: string;
  name: string;
  position: string;
  age: number;
  careerPhase: CareerPhase;
}

function getPhaseColor(phase: string): string {
  switch (phase) {
    case "DEVELOPMENT":
      return "#22c55e"; // Green
    case "PRIME":
      return "#3b82f6"; // Blue
    case "DECLINE":
      return "#f59e0b"; // Amber
    case "FORCED_RETIREMENT":
      return "#ef4444"; // Red
    default:
      return "#94a3b8"; // Gray
  }
}

interface SpringTrainingFlowProps {
  onComplete?: () => void;
}

export function SpringTrainingFlow({ onComplete }: SpringTrainingFlowProps) {
  const { players, teams, isLoading } = useOffseasonData();
  const [selectedTeam, setSelectedTeam] = useState<string>("ALL");
  const [isCompleted, setIsCompleted] = useState(false);

  // Build roster age display for all players.
  const playerProjections: PlayerProjection[] = useMemo(() => {
    if (!players) return [];

    return players
      .filter((p) => selectedTeam === "ALL" || p.teamId === selectedTeam)
      .map((player) => {
        const nextAge = player.age + 1;

        return {
          playerId: player.id,
          name: player.name,
          position: player.position,
          age: player.age,
          careerPhase: getCareerPhase(nextAge),
        };
      });
  }, [players, selectedTeam]);

  // Count players by phase
  const phaseCounts = useMemo(() => {
    const counts = { developing: 0, prime: 0, declining: 0, forcedRetirement: 0 };
    playerProjections.forEach((p) => {
      if (p.careerPhase === "DEVELOPMENT") counts.developing++;
      else if (p.careerPhase === "PRIME") counts.prime++;
      else if (p.careerPhase === "DECLINE") counts.declining++;
      else if (p.careerPhase === "FORCED_RETIREMENT") counts.forcedRetirement++;
    });
    return counts;
  }, [playerProjections]);

  const handleComplete = () => {
    setIsCompleted(true);
    onComplete?.();
  };

  if (isLoading) {
    return (
      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-8 text-center">
        <div className="text-[#E8E8D8]">Loading roster data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-4">
        <div className="flex items-center gap-3 mb-2">
          <Sunrise className="w-6 h-6 text-[#FFD700]" />
          <h2 className="text-lg text-[#E8E8D8] font-bold">SPRING TRAINING</h2>
        </div>
        <p className="text-xs text-[#E8E8D8]/80">
          Spring-training development is now handled continuously by the season engine.
        </p>
      </div>

      {/* Team Filter */}
      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-4">
        <label className="block text-xs text-[#E8E8D8]/80 mb-2">Filter by Team</label>
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          className="w-full bg-[#4A6844] border-[3px] border-[#3F5A3A] p-2 text-sm text-[#E8E8D8]"
        >
          <option value="ALL">All Teams</option>
          {teams?.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      {/* Phase Overview */}
      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-4">
        <div className="text-xs text-[#E8E8D8]/60 mb-3 text-center">ROSTER OUTLOOK</div>
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: getPhaseColor("DEVELOPMENT") }}>
              {phaseCounts.developing}
            </div>
            <div className="text-[8px] text-[#E8E8D8]/70">DEVELOPING</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: getPhaseColor("PRIME") }}>
              {phaseCounts.prime}
            </div>
            <div className="text-[8px] text-[#E8E8D8]/70">PRIME</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: getPhaseColor("DECLINE") }}>
              {phaseCounts.declining}
            </div>
            <div className="text-[8px] text-[#E8E8D8]/70">DECLINING</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: getPhaseColor("FORCED_RETIREMENT") }}>
              {phaseCounts.forcedRetirement}
            </div>
            <div className="text-[8px] text-[#E8E8D8]/70">MUST RETIRE</div>
          </div>
        </div>
      </div>

      {/* Player List */}
      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-4 max-h-[400px] overflow-y-auto">
        <div className="text-xs text-[#E8E8D8]/60 mb-3">
          ROSTER AGE OUTLOOK ({playerProjections.length} players)
        </div>

        {playerProjections.length === 0 ? (
          <div className="text-center py-8 text-[#E8E8D8]/60 text-sm">
            No players found
          </div>
        ) : (
          <div className="space-y-2">
            {playerProjections.map((player) => (
              <div
                key={player.playerId}
                className="bg-[#4A6844] border-[3px] border-[#3F5A3A] p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm text-[#E8E8D8] font-bold">{player.name}</div>
                    <div className="text-[10px] text-[#E8E8D8]/70">
                      {player.position} · Age {player.age} → {player.age + 1}
                    </div>
                  </div>
                  <div
                    className="px-2 py-1 text-[8px] font-bold rounded"
                    style={{
                      backgroundColor: getPhaseColor(player.careerPhase),
                      color: "#fff",
                    }}
                  >
                    {getCareerPhaseDisplayName(player.careerPhase)}
                  </div>
                </div>

                <div className="bg-[#2A3424] px-3 py-2 rounded text-[10px] text-[#E8E8D8]/70">
                  Development updates are handled continuously by the season engine.
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Complete Button */}
      <button
        onClick={handleComplete}
        disabled={isCompleted}
        className={`w-full py-4 text-sm font-bold transition-all active:scale-[0.98] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center justify-center gap-2 ${
          isCompleted
            ? "bg-[#22c55e] border-[5px] border-[#16a34a] text-white"
            : "bg-[#5599FF] border-[5px] border-[#3366FF] text-[#E8E8D8] hover:bg-[#3366FF]"
        }`}
      >
        {isCompleted ? (
          <>
            <CheckCircle className="w-5 h-5" />
            SPRING TRAINING COMPLETE
          </>
        ) : (
          "COMPLETE SPRING TRAINING"
        )}
      </button>
    </div>
  );
}
