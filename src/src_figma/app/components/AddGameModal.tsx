import { useState, useEffect } from "react";
import { CircleHelp, X } from "lucide-react";

interface AddGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddGame: (game: GameFormData) => Promise<void> | void;
  onAddSeries: (game: GameFormData, count: number) => Promise<void> | void;
  onUpdateGame?: (gameId: string, game: GameFormData) => Promise<void> | void;
  editingGame?: (GameFormData & { id: string }) | null;
  nextGameNumber: number;
  nextDayNumber: number;
  nextDate: string;
  teams: string[];
  teamNameMap?: Record<string, string>;
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
  onUpdateGame,
  editingGame,
  nextGameNumber,
  nextDayNumber,
  nextDate,
  teams,
  teamNameMap = {},
}: AddGameModalProps) {
  const [gameNumber, setGameNumber] = useState(nextGameNumber);
  const [dayNumber, setDayNumber] = useState<number | "">(""); // Default to empty
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [homeTeam, setHomeTeam] = useState("");
  const [seriesCount, setSeriesCount] = useState(3);
  const [error, setError] = useState("");
  const [savingAction, setSavingAction] = useState<'game' | 'series' | 'update' | null>(null);
  const saving = savingAction !== null;
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGameNumber(editingGame?.gameNumber ?? nextGameNumber);
      setDayNumber(editingGame?.dayNumber ?? nextDayNumber);
      setDate(editingGame?.date ?? nextDate);
      setTime(editingGame?.time ?? "");
      setAwayTeam(editingGame?.awayTeamId ?? "");
      setHomeTeam(editingGame?.homeTeamId ?? "");
      setSeriesCount(3);
      setError("");
      setSavingAction(null);
      setShowHelp(false);
    }
  }, [isOpen, editingGame, nextGameNumber, nextDayNumber, nextDate]);

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

  const formData = (): GameFormData => ({
    gameNumber,
    dayNumber: typeof dayNumber === 'number' ? dayNumber : nextDayNumber,
    date: date || undefined,
    time: time || undefined,
    awayTeamId: awayTeam,
    homeTeamId: homeTeam,
  });

  const runSave = async (action: 'game' | 'series' | 'update', save: () => Promise<void> | void) => {
    if (saving) return;
    setSavingAction(action);
    setError("");
    try {
      await save();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Schedule save failed");
    } finally {
      setSavingAction(null);
    }
  };

  const handleAddGame = async () => {
    if (!validateForm()) return;
    await runSave('game', () => onAddGame(formData()));
  };

  const handleAddSeries = async () => {
    if (!validateForm()) return;
    await runSave('series', () => onAddSeries(formData(), seriesCount));
  };

  const handleUpdateGame = async () => {
    if (!editingGame || !onUpdateGame || !validateForm()) return;
    await runSave('update', () => onUpdateGame(editingGame.id, formData()));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-game-dialog-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border-[5px] border-[var(--ballpark-brass)] bg-[var(--ballpark-page-bg)] text-[var(--ballpark-chalk)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-[3px] border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-4">
          <div id="schedule-game-dialog-title" className="text-sm">{editingGame ? "EDIT SCHEDULE GAME" : "ADD GAME TO SCHEDULE"}</div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowHelp((current) => !current)} aria-label="Help" aria-pressed={showHelp} className="flex min-h-11 min-w-11 items-center justify-center border-2 border-[var(--ballpark-panel-border)] p-1.5 hover:border-[var(--ballpark-brass)]">
              <CircleHelp className="h-4 w-4" />
            </button>
            <button type="button" onClick={onClose} disabled={saving} aria-label="Close" className="flex min-h-11 min-w-11 items-center justify-center p-1.5 hover:text-[var(--ballpark-warn-text)] disabled:opacity-40">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showHelp ? <div className="border-b-[3px] border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] px-4 py-3 text-[10px] font-bold">ADD ONE GAME OR REPEAT THE MATCHUP AS A SERIES. NOTHING ELSE IS GENERATED.</div> : null}

        <div className="p-6 space-y-4">
          {/* Game Details */}
          <div className="space-y-3 border-[3px] border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-4">
            <div className="mb-2 text-xs">GAME DETAILS</div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="schedule-date" className="mb-1 block text-[10px] text-[var(--ballpark-chalk)]/80">
                  Date
                </label>
                <input
                  type="text"
                  id="schedule-date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="July 13"
                  className="w-full border-[2px] border-[var(--ballpark-brass)] bg-[var(--ballpark-page-bg)] p-2 text-xs placeholder:text-[var(--ballpark-chalk)]/40"
                />
                {showHelp ? <div className="mt-1 text-[9px] text-[var(--ballpark-chalk)]/60">Defaults after the latest dated game.</div> : null}
              </div>

              <div>
                <label htmlFor="schedule-time" className="mb-1 block text-[10px] text-[var(--ballpark-chalk)]/80">
                  Time
                </label>
                <input
                  type="text"
                  id="schedule-time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="7:00 PM"
                  className="w-full border-[2px] border-[var(--ballpark-panel-border)] bg-[var(--ballpark-page-bg)] p-2 text-xs placeholder:text-[var(--ballpark-chalk)]/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="schedule-game-number" className="mb-1 block text-[10px] text-[var(--ballpark-chalk)]/80">
                  Game Number
                </label>
                <input
                  type="number"
                  id="schedule-game-number"
                  value={gameNumber}
                  onChange={(e) => setGameNumber(parseInt(e.target.value) || 1)}
                  className="w-full border-[2px] border-[var(--ballpark-panel-border)] bg-[var(--ballpark-page-bg)] p-2 text-xs"
                  min="1"
                />
              </div>

              <div>
                <label htmlFor="schedule-day-number" className="mb-1 block text-[10px] text-[var(--ballpark-chalk)]/80">
                  Day #
                </label>
                <input
                  type="number"
                  id="schedule-day-number"
                  value={dayNumber}
                  onChange={(e) => setDayNumber(parseInt(e.target.value) || "")}
                  className="w-full border-[2px] border-[var(--ballpark-panel-border)] bg-[var(--ballpark-page-bg)] p-2 text-xs"
                  min="1"
                />
              </div>
            </div>
          </div>

          {/* Matchup */}
          <div className="space-y-3 border-[3px] border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-4">
            <div className="mb-2 text-xs">MATCHUP</div>

            <div>
              <label htmlFor="schedule-away-team" className="mb-1 block text-[10px] text-[var(--ballpark-chalk)]/80">
                Away Team
              </label>
              <select
                id="schedule-away-team"
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                className="w-full border-[2px] border-[var(--ballpark-panel-border)] bg-[var(--ballpark-page-bg)] p-2 text-xs"
              >
                <option value="">Select Away Team</option>
                {teams.map(team => (
                  <option key={team} value={team}>{teamNameMap[team] ?? team}</option>
                ))}
              </select>
            </div>

            <div className="text-center text-lg">@</div>

            <div>
              <label htmlFor="schedule-home-team" className="mb-1 block text-[10px] text-[var(--ballpark-chalk)]/80">
                Home Team
              </label>
              <select
                id="schedule-home-team"
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                className="w-full border-[2px] border-[var(--ballpark-panel-border)] bg-[var(--ballpark-page-bg)] p-2 text-xs"
              >
                <option value="">Select Home Team</option>
                {teams.map(team => (
                  <option key={team} value={team}>{teamNameMap[team] ?? team}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Add Series */}
          {!editingGame && (
          <div className="space-y-3 border-[3px] border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] p-4">
            <div className="mb-2 text-xs">ADD SERIES</div>
            {showHelp ? <div className="text-[9px] text-[var(--ballpark-chalk)]/70">Repeats this matchup with consecutive game and day numbers.</div> : null}

            <div className="flex items-center gap-2">
              <span className="text-[10px]">Add</span>
              <select
                aria-label="Series length"
                value={seriesCount}
                onChange={(e) => setSeriesCount(parseInt(e.target.value))}
                className="border-[2px] border-[var(--ballpark-panel-border)] bg-[var(--ballpark-page-bg)] p-1 text-xs"
              >
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
              <span className="text-[10px]">games</span>
            </div>

            <button
              type="button"
              onClick={() => void handleAddSeries()}
              disabled={saving}
              className="w-full border-[3px] border-[var(--ballpark-brass)] bg-[var(--ballpark-action-green)] py-2 text-xs font-black hover:brightness-110 active:scale-95 disabled:opacity-40"
            >
              {savingAction === 'series' ? "SAVING SERIES…" : "ADD SERIES"}
            </button>
          </div>
          )}

          {/* Error message */}
          {error && (
            <div role="alert" className="border-[3px] border-[var(--ballpark-warn-border)] bg-[var(--ballpark-warn-panel)] p-3 text-xs text-[var(--ballpark-warn-text)]">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 border-[3px] border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] py-3 text-sm active:scale-95 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void (editingGame ? handleUpdateGame() : handleAddGame())}
              disabled={saving}
              className="flex-1 border-[3px] border-[var(--ballpark-brass)] bg-[var(--ballpark-action-green)] py-3 text-sm font-black hover:brightness-110 active:scale-95 disabled:opacity-40"
            >
              {savingAction === 'game' || savingAction === 'update' ? "SAVING GAME…" : editingGame ? "SAVE GAME" : "ADD GAME"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
