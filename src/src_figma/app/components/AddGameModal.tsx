import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface AddGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddGame: (game: GameFormData) => void;
  onAddSeries: (game: GameFormData, count: number) => void;
  nextGameNumber: number;
  nextDayNumber: number;
  nextDate: string;
  teams: string[];
}

export interface GameFormData {
  gameNumber: number;
  dayNumber: number;
  date?: string;
  time?: string;
  awayTeamId: string;
  homeTeamId: string;
}

export function AddGameModal({
  isOpen,
  onClose,
  onAddGame,
  onAddSeries,
  nextGameNumber,
  nextDayNumber,
  nextDate,
  teams
}: AddGameModalProps) {
  const [gameNumber, setGameNumber] = useState(nextGameNumber);
  const [dayNumber, setDayNumber] = useState<number | "">(""); // Default to empty
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [homeTeam, setHomeTeam] = useState("");
  const [seriesCount, setSeriesCount] = useState(3);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setGameNumber(nextGameNumber);
      setDayNumber(""); // Don't auto-fill day number
      setDate(nextDate);
      setTime("");
      setAwayTeam("");
      setHomeTeam("");
      setSeriesCount(3);
      setError("");
    }
  }, [isOpen, nextGameNumber, nextDayNumber]);

  const validateForm = (): boolean => {
    if (!awayTeam || !homeTeam) {
      setError("Please select both teams");
      return false;
    }
    if (awayTeam === homeTeam) {
      setError("Away team cannot equal Home team");
      return false;
    }
    if (gameNumber < 1) {
      setError("Game number must be positive");
      return false;
    }
    setError("");
    return true;
  };

  const handleAddGame = () => {
    if (!validateForm()) return;

    onAddGame({
      gameNumber,
      dayNumber: typeof dayNumber === 'number' ? dayNumber : gameNumber, // Use game number if day number not provided
      date: date || undefined,
      time: time || undefined,
      awayTeamId: awayTeam,
      homeTeamId: homeTeam
    });
    onClose();
  };

  const handleAddSeries = () => {
    if (!validateForm()) return;

    onAddSeries({
      gameNumber,
      dayNumber: typeof dayNumber === 'number' ? dayNumber : gameNumber, // Use game number if day number not provided
      date: date || undefined,
      time: time || undefined,
      awayTeamId: awayTeam,
      homeTeamId: homeTeam
    }, seriesCount);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#5A8352] border-[5px] border-[#FFD700] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-[#4A6844] border-b-[3px] border-[#3F5A3A] p-4 flex items-center justify-between">
          <div className="text-sm text-[#E8E8D8]">➕ ADD GAME TO SCHEDULE</div>
          <button
            onClick={onClose}
            className="text-[#E8E8D8] hover:text-[#DD0000] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Game Details */}
          <div className="bg-[#4A6844] border-[3px] border-[#3F5A3A] p-4 space-y-3">
            <div className="text-xs text-[#E8E8D8] mb-2">GAME DETAILS</div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-[#E8E8D8]/80 mb-1">
                  Date:
                </label>
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="July 13"
                  className="w-full bg-[#2A3424] border-[2px] border-[#FFD700] p-2 text-xs text-[#E8E8D8] placeholder:text-[#E8E8D8]/40"
                />
                <div className="text-[9px] text-[#E8E8D8]/60 mt-1">
                  (auto-increments daily)
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-[#E8E8D8]/80 mb-1">
                  Time (optional):
                </label>
                <input
                  type="text"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="7:00 PM"
                  className="w-full bg-[#2A3424] border-[2px] border-[#5599FF] p-2 text-xs text-[#E8E8D8] placeholder:text-[#E8E8D8]/40"
                />
                <div className="text-[9px] text-[#E8E8D8]/60 mt-1">
                  (optional)
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-[#E8E8D8]/80 mb-1">
                  Game Number:
                </label>
                <input
                  type="number"
                  value={gameNumber}
                  onChange={(e) => setGameNumber(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#2A3424] border-[2px] border-[#5599FF] p-2 text-xs text-[#E8E8D8]"
                  min="1"
                />
                <div className="text-[9px] text-[#E8E8D8]/60 mt-1">
                  (auto-increment from last)
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-[#E8E8D8]/80 mb-1">
                  Day # (optional):
                </label>
                <input
                  type="number"
                  value={dayNumber}
                  onChange={(e) => setDayNumber(parseInt(e.target.value) || "")}
                  placeholder="Leave blank"
                  className="w-full bg-[#2A3424] border-[2px] border-[#5599FF] p-2 text-xs text-[#E8E8D8] placeholder:text-[#E8E8D8]/40"
                  min="1"
                />
                <div className="text-[9px] text-[#E8E8D8]/60 mt-1">
                  (for reference)
                </div>
              </div>
            </div>
          </div>

          {/* Matchup */}
          <div className="bg-[#4A6844] border-[3px] border-[#3F5A3A] p-4 space-y-3">
            <div className="text-xs text-[#E8E8D8] mb-2">MATCHUP</div>

            <div>
              <label className="block text-[10px] text-[#E8E8D8]/80 mb-1">
                Away Team:
              </label>
              <select
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                className="w-full bg-[#2A3424] border-[2px] border-[#5599FF] p-2 text-xs text-[#E8E8D8]"
              >
                <option value="">Select Away Team</option>
                {teams.map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>

            <div className="text-center text-lg text-[#E8E8D8]">@</div>

            <div>
              <label className="block text-[10px] text-[#E8E8D8]/80 mb-1">
                Home Team:
              </label>
              <select
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                className="w-full bg-[#2A3424] border-[2px] border-[#5599FF] p-2 text-xs text-[#E8E8D8]"
              >
                <option value="">Select Home Team</option>
                {teams.map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Add Series */}
          <div className="bg-[#4A6844] border-[3px] border-[#5599FF] p-4 space-y-3">
            <div className="text-xs text-[#E8E8D8] mb-2">💡 QUICK ADD SERIES</div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#E8E8D8]">Add</span>
              <select
                value={seriesCount}
                onChange={(e) => setSeriesCount(parseInt(e.target.value))}
                className="bg-[#2A3424] border-[2px] border-[#5599FF] p-1 text-xs text-[#E8E8D8]"
              >
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
              <span className="text-[10px] text-[#E8E8D8]">games with this matchup</span>
            </div>

            <div className="text-[9px] text-[#E8E8D8]/70 italic">
              Each game will be on consecutive dates
            </div>

            <button
              onClick={handleAddSeries}
              className="w-full bg-[#5599FF] border-[3px] border-[#3366FF] py-2 text-xs text-[#E8E8D8] hover:bg-[#3366FF] active:scale-95 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)]"
            >
              Add as Series
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-[#DD0000] border-[3px] border-[#000] p-3 text-xs text-[#E8E8D8]">
              ⚠️ {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 bg-[#4A6844] border-[3px] border-[#3F5A3A] py-3 text-sm text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)]"
            >
              Cancel
            </button>
            <button
              onClick={handleAddGame}
              className="flex-1 bg-[#5599FF] border-[3px] border-[#3366FF] py-3 text-sm text-[#E8E8D8] hover:bg-[#3366FF] active:scale-95 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)]"
            >
              Add Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}