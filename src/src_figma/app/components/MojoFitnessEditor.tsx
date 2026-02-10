/**
 * MojoFitnessEditor - Between-game Mojo/Fitness management
 * Per MOJO_FITNESS_SYSTEM_SPEC.md §7.1
 *
 * Shows all players on a team with dropdown editors for Mojo and Fitness,
 * plus Apply Recovery / Simulate Rest Day / Reset All to Normal buttons.
 */

import { useState, useMemo } from "react";
import {
  type MojoLevel,
  MOJO_STATES,
  getMojoColor,
} from "../../../engines/mojoEngine";
import {
  type FitnessState,
  FITNESS_STATES,
  getFitnessColor,
} from "../../../engines/fitnessEngine";

export type PlayerFilter = "all" | "pitchers" | "position" | "needs-rest";

export interface MojoFitnessPlayerData {
  playerId: string;
  name: string;
  position: string;
  mojo: MojoLevel;
  fitness: FitnessState;
  lastPlayed?: string; // e.g. "Yesterday", "2 days ago"
  isPitcher: boolean;
}

interface MojoFitnessEditorProps {
  players: MojoFitnessPlayerData[];
  onUpdateMojo: (playerId: string, mojo: MojoLevel) => void;
  onUpdateFitness: (playerId: string, fitness: FitnessState) => void;
  onApplyRecovery: () => void;
  onSimulateRestDay: () => void;
  onResetAll: () => void;
}

const MOJO_LEVELS: MojoLevel[] = [-2, -1, 0, 1, 2];
const FITNESS_STATE_LIST: FitnessState[] = ['JUICED', 'FIT', 'WELL', 'STRAINED', 'WEAK', 'HURT'];

function needsRest(fitness: FitnessState): boolean {
  return fitness === 'STRAINED' || fitness === 'WEAK' || fitness === 'HURT';
}

export function MojoFitnessEditor({
  players,
  onUpdateMojo,
  onUpdateFitness,
  onApplyRecovery,
  onSimulateRestDay,
  onResetAll,
}: MojoFitnessEditorProps) {
  const [filter, setFilter] = useState<PlayerFilter>("all");

  const filteredPlayers = useMemo(() => {
    switch (filter) {
      case "pitchers":
        return players.filter((p) => p.isPitcher);
      case "position":
        return players.filter((p) => !p.isPitcher);
      case "needs-rest":
        return players.filter((p) => needsRest(p.fitness));
      default:
        return players;
    }
  }, [players, filter]);

  const filters: { id: PlayerFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "pitchers", label: "Pitchers" },
    { id: "position", label: "Position Players" },
    { id: "needs-rest", label: "Needs Rest" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Mojo & Fitness</h3>
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                filter === f.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
              <th className="text-left py-2 px-2">Player</th>
              <th className="text-left py-2 px-2">Pos</th>
              <th className="text-left py-2 px-2">Mojo</th>
              <th className="text-left py-2 px-2">Fitness</th>
              <th className="text-left py-2 px-2">Last Played</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.map((player) => (
              <tr
                key={player.playerId}
                className="border-b border-gray-800 hover:bg-gray-800/50"
              >
                <td className="py-2 px-2 text-white font-medium">
                  {player.name}
                </td>
                <td className="py-2 px-2 text-gray-300">{player.position}</td>
                <td className="py-2 px-2">
                  <select
                    value={player.mojo}
                    onChange={(e) =>
                      onUpdateMojo(
                        player.playerId,
                        Number(e.target.value) as MojoLevel
                      )
                    }
                    className="bg-gray-700 text-white rounded px-2 py-1 text-xs border border-gray-600"
                    style={{ color: getMojoColor(player.mojo) }}
                  >
                    {MOJO_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {MOJO_STATES[level].displayName} ({level > 0 ? "+" : ""}
                        {level})
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 px-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={player.fitness}
                      onChange={(e) =>
                        onUpdateFitness(
                          player.playerId,
                          e.target.value as FitnessState
                        )
                      }
                      className="bg-gray-700 text-white rounded px-2 py-1 text-xs border border-gray-600"
                      style={{ color: getFitnessColor(player.fitness) }}
                    >
                      {FITNESS_STATE_LIST.map((state) => (
                        <option key={state} value={state}>
                          {FITNESS_STATES[state].displayName}
                        </option>
                      ))}
                    </select>
                    {needsRest(player.fitness) && (
                      <span className="text-yellow-400 text-xs" title="Needs Rest">
                        ⚠️
                      </span>
                    )}
                    {player.fitness === "JUICED" && (
                      <span className="text-purple-400 text-xs" title="PED Watch">
                        💉
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2 px-2 text-gray-400 text-xs">
                  {player.lastPlayed ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={onApplyRecovery}
          className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded text-sm font-medium transition-colors"
        >
          Apply Recovery
        </button>
        <button
          onClick={onSimulateRestDay}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors"
        >
          Simulate Rest Day
        </button>
        <button
          onClick={onResetAll}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium transition-colors"
        >
          Reset All to Normal
        </button>
      </div>
    </div>
  );
}
