/**
 * Spring Training Flow Component
 * Per Ralph Framework NEW-002 (GAP-038)
 *
 * Shows roster overview with projected development changes
 * using the agingEngine for rating projections.
 */

import { useMemo, useState } from "react";
import { useOffseasonData } from "@/hooks/useOffseasonData";
import {
  getCareerPhase,
  getCareerPhaseDisplayName,
  calculateRatingChange,
  type CareerPhase,
} from "../../../engines/agingEngine";
import { Sunrise, TrendingUp, TrendingDown, Minus, CheckCircle } from "lucide-react";

interface ProjectedChange {
  attribute: string;
  current: number;
  projected: number;
  change: number;
}

interface PlayerProjection {
  playerId: string;
  name: string;
  position: string;
  age: number;
  isPitcher: boolean;
  careerPhase: CareerPhase;
  projectedChanges: ProjectedChange[];
}

function calculateProjectedChanges(player: {
  age: number;
  isPitcher: boolean;
  power?: number;
  contact?: number;
  speed?: number;
  velocity?: number;
  junk?: number;
  accuracy?: number;
}): ProjectedChange[] {
  const changes: ProjectedChange[] = [];
  const nextAge = player.age + 1;

  if (player.isPitcher) {
    if (player.velocity !== undefined) {
      const velChange = calculateRatingChange(player.velocity, nextAge);
      changes.push({
        attribute: "VEL",
        current: player.velocity,
        projected: player.velocity + velChange,
        change: velChange,
      });
    }

    if (player.junk !== undefined) {
      const jnkChange = calculateRatingChange(player.junk, nextAge);
      changes.push({
        attribute: "JNK",
        current: player.junk,
        projected: player.junk + jnkChange,
        change: jnkChange,
      });
    }

    if (player.accuracy !== undefined) {
      const accChange = calculateRatingChange(player.accuracy, nextAge);
      changes.push({
        attribute: "ACC",
        current: player.accuracy,
        projected: player.accuracy + accChange,
        change: accChange,
      });
    }
  } else {
    if (player.power !== undefined) {
      const powChange = calculateRatingChange(player.power, nextAge);
      changes.push({
        attribute: "POW",
        current: player.power,
        projected: player.power + powChange,
        change: powChange,
      });
    }

    if (player.contact !== undefined) {
      const conChange = calculateRatingChange(player.contact, nextAge);
      changes.push({
        attribute: "CON",
        current: player.contact,
        projected: player.contact + conChange,
        change: conChange,
      });
    }

    if (player.speed !== undefined) {
      const spdChange = calculateRatingChange(player.speed, nextAge);
      changes.push({
        attribute: "SPD",
        current: player.speed,
        projected: player.speed + spdChange,
        change: spdChange,
      });
    }
  }

  return changes;
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

  // Calculate projections for all players
  const playerProjections: PlayerProjection[] = useMemo(() => {
    if (!players) return [];

    return players
      .filter((p) => selectedTeam === "ALL" || p.teamId === selectedTeam)
      .map((player) => {
        const isPitcher = player.position === "SP" || player.position === "RP";
        const nextAge = player.age + 1;

        return {
          playerId: player.id,
          name: player.name,
          position: player.position,
          age: player.age,
          isPitcher,
          careerPhase: getCareerPhase(nextAge),
          projectedChanges: calculateProjectedChanges({
            age: player.age,
            isPitcher,
            power: player.power,
            contact: player.contact,
            speed: player.speed,
            velocity: player.velocity,
            junk: player.junk,
            accuracy: player.accuracy,
          }),
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
          Review projected player development for the upcoming season
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
          PROJECTED DEVELOPMENT ({playerProjections.length} players)
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

                {/* Projected Changes */}
                <div className="flex gap-2 flex-wrap">
                  {player.projectedChanges.map((pc) => (
                    <div
                      key={pc.attribute}
                      className="flex items-center gap-1 bg-[#2A3424] px-2 py-1 rounded"
                    >
                      <span className="text-[8px] text-[#E8E8D8]/60">{pc.attribute}</span>
                      <span className="text-[10px] text-[#E8E8D8]/80">{pc.current}</span>
                      <span className="text-[8px] text-[#E8E8D8]/40">→</span>
                      <span
                        className="text-[10px] font-bold"
                        style={{
                          color:
                            pc.change > 0
                              ? "#22c55e"
                              : pc.change < 0
                              ? "#ef4444"
                              : "#94a3b8",
                        }}
                      >
                        {pc.projected}
                      </span>
                      {pc.change !== 0 && (
                        <span
                          className="flex items-center"
                          style={{
                            color: pc.change > 0 ? "#22c55e" : "#ef4444",
                          }}
                        >
                          {pc.change > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                        </span>
                      )}
                      {pc.change === 0 && (
                        <Minus className="w-3 h-3 text-[#94a3b8]" />
                      )}
                    </div>
                  ))}
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
