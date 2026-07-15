import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle, CircleHelp, Edit3, FileUp, Plus, Trash2 } from "lucide-react";
import {
  validateFranchiseScheduleCsv,
  type FranchiseScheduleCsvValidationResult,
} from "../../../utils/franchiseScheduleCsv";
import type { FranchiseScheduleImportRow, ScheduledGame } from "../../../utils/scheduleStorage";

interface ScheduleContentProps {
  games: ScheduledGame[];
  selectedTeam: string;
  onTeamChange: (team: string) => void;
  availableTeams: string[];
  onAddGame: () => void;
  dropdownOpen: boolean;
  setDropdownOpen: (open: boolean) => void;
  stadiumMap: Record<string, string>;
  seasonNumber?: number;
  teamNameMap?: Record<string, string>;
  onDeleteGame?: (gameId: string) => void;
  onEditGame?: (game: ScheduledGame) => void;
  onScoreGame?: (game: ScheduledGame) => void;
  onEnterFinalScore?: (game: ScheduledGame) => void;
  onSkipGame?: (game: ScheduledGame) => void;
  onImportCsvRows?: (rows: FranchiseScheduleImportRow[]) => Promise<void> | void;
}

export function ScheduleContent({
  games,
  selectedTeam,
  onTeamChange,
  availableTeams,
  onAddGame,
  dropdownOpen,
  setDropdownOpen,
  stadiumMap,
  seasonNumber = 1,
  teamNameMap = {},
  onDeleteGame,
  onEditGame,
  onScoreGame,
  onEnterFinalScore,
  onSkipGame,
  onImportCsvRows,
}: ScheduleContentProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [csvReview, setCsvReview] = useState<FranchiseScheduleCsvValidationResult | null>(null);
  const [csvFileName, setCsvFileName] = useState<string>("");
  const [csvImportError, setCsvImportError] = useState<string | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  // Helper: resolve team ID to display name
  const teamName = (id: string) => teamNameMap[id] || id;
  const filteredGames = selectedTeam === "FULL LEAGUE" 
    ? games 
    : games.filter(g => g.awayTeamId === selectedTeam || g.homeTeamId === selectedTeam);

  const completedGames = filteredGames.filter(g => g.status === 'COMPLETED').reverse();
  const upcomingGames = filteredGames.filter(g => g.status === 'SCHEDULED');
  const nextGame = upcomingGames[0];

  const renderDeleteButton = (gameId: string) => {
    if (!onDeleteGame) return null;
    if (confirmDeleteId === gameId) {
      return (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteGame(gameId); setConfirmDeleteId(null); }}
            className="bg-[var(--franchise-loss-alt)] border-[2px] border-[var(--franchise-loss-deep)] px-2 py-0.5 text-[8px] text-white font-bold hover:bg-[var(--franchise-loss-deep)] transition-colors"
          >
            DELETE
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
            className="bg-[var(--franchise-border)] border-[2px] border-[var(--franchise-panel-dark)] px-2 py-0.5 text-[8px] text-[var(--franchise-text)] font-bold hover:bg-[var(--franchise-panel-dark)] transition-colors"
          >
            CANCEL
          </button>
        </div>
      );
    }
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(gameId); }}
        className="text-[var(--franchise-text)]/40 hover:text-[var(--franchise-loss-alt)] transition-colors p-1"
        title="Remove game"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    );
  };

  const renderFinalScoreButton = (game: ScheduledGame) => {
    if (!onEnterFinalScore || game.status !== 'SCHEDULED') return null;
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onEnterFinalScore(game); }}
        className="bg-[var(--franchise-border)] border-[2px] border-[var(--franchise-panel-dark)] px-2 py-1 text-[8px] text-[var(--franchise-text)] hover:bg-[var(--franchise-panel-dark)] transition-colors"
        title="Enter score-only final score"
        aria-label={`Enter score-only final score for game ${game.gameNumber}`}
      >
        Score Only
      </button>
    );
  };

  const renderScoreGameButton = (game: ScheduledGame) => {
    if (!onScoreGame || game.status !== 'SCHEDULED') return null;
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onScoreGame(game); }}
        className="bg-[var(--franchise-gold)] border-[2px] border-[var(--franchise-gold-dark)] px-2 py-1 text-[8px] text-[var(--franchise-ink)] hover:bg-[var(--franchise-gold-light)] transition-colors font-bold"
        title="Score this game in GameTracker"
        aria-label={`Score game ${game.gameNumber} in GameTracker`}
      >
        SCORE
      </button>
    );
  };

  const renderSkipGameButton = (game: ScheduledGame) => {
    if (!onSkipGame || game.status !== 'SCHEDULED') return null;
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onSkipGame(game); }}
        className="bg-[var(--franchise-loss-deep)] border-[2px] border-[var(--franchise-loss-alt)] px-2 py-1 text-[8px] text-white hover:bg-[var(--franchise-loss-alt)] transition-colors"
        title="Mark game skipped"
        aria-label={`Skip game ${game.gameNumber}`}
      >
        SKIP
      </button>
    );
  };

  const isScoreOnlyResult = (game: ScheduledGame) =>
    game.status === 'COMPLETED' && game.completionSource === 'score-only';

  const hasGameDetailLink = (game: ScheduledGame) =>
    game.status === 'COMPLETED' && game.completionSource === 'game-tracker' && Boolean(game.gameLogId);

  const renderScoreOnlyBadge = (game: ScheduledGame) => {
    if (!isScoreOnlyResult(game)) return null;
    return (
      <div className="text-[8px] font-bold text-[var(--franchise-ink)] bg-[var(--franchise-gold-amber)] border-[2px] border-[var(--franchise-gold)] px-2 py-1">SCORE ONLY</div>
    );
  };

  const renderArchiveBadge = (game: ScheduledGame) => {
    if (!hasGameDetailLink(game)) return null;
    return (
      <div className="text-[8px] font-bold text-[var(--franchise-text)] bg-[var(--franchise-panel-dark)] border-[2px] border-[var(--franchise-gold)] px-2 py-1">ARCHIVE</div>
    );
  };

  const renderGameDetailLink = (game: ScheduledGame) => {
    if (!hasGameDetailLink(game) || !game.gameLogId) return null;
    return (
      <a
        href={`/almanac/games/${game.gameLogId}`}
        className="text-[8px] text-[var(--franchise-ink)] bg-[var(--franchise-gold)] border-[2px] border-[var(--franchise-gold-dark)] px-2 py-1 font-bold hover:bg-[var(--franchise-gold-light)] transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        Game Detail
      </a>
    );
  };

  const renderScoreOnlyCopy = (game: ScheduledGame) => {
    if (!isScoreOnlyResult(game)) return null;
    return (
      <div className="mt-2 text-[8px] text-[var(--franchise-text)]/65">
        Schedule + standings only. May queue team-fan morale prompt; confirm in Random Event Log. No Game Detail archive, player stats, WPA, fame, milestones, awards, designations, relationships, or Almanac player evidence.
      </div>
    );
  };

  const handleCsvFileSelected = async (file: File | null) => {
    setCsvImportError(null);
    setCsvReview(null);
    setCsvFileName(file?.name ?? "");
    if (!file) return;

    try {
      const csvText = await file.text();
      const review = validateFranchiseScheduleCsv(csvText, {
        teams: availableTeams.map((teamId) => ({
          id: teamId,
          name: teamNameMap[teamId],
        })),
        existingGames: games,
      });
      setCsvReview(review);
    } catch (err) {
      setCsvImportError(err instanceof Error ? err.message : "Unable to read schedule CSV");
    }
  };

  const handleAcceptCsvImport = async () => {
    if (!csvReview || csvReview.hasErrors || csvReview.acceptedRows.length === 0 || !onImportCsvRows) return;

    try {
      setCsvImporting(true);
      setCsvImportError(null);
      await onImportCsvRows(csvReview.acceptedRows);
      setCsvReview(null);
      setCsvFileName("");
    } catch (err) {
      setCsvImportError(err instanceof Error ? err.message : "Schedule import failed");
    } finally {
      setCsvImporting(false);
    }
  };

  // Get team stats if filtering by team
  const getTeamStats = () => {
    if (selectedTeam === "FULL LEAGUE") return null;
    
    const teamGames = games.filter(g => 
      (g.awayTeamId === selectedTeam || g.homeTeamId === selectedTeam) && 
      g.status === 'COMPLETED'
    );
    
    const wins = teamGames.filter(g => g.result?.winningTeamId === selectedTeam).length;
    const losses = teamGames.length - wins;
    const winPct = teamGames.length > 0 ? (wins / teamGames.length).toFixed(3) : ".000";
    const gamesRemaining = games.filter(g => 
      (g.awayTeamId === selectedTeam || g.homeTeamId === selectedTeam) && 
      g.status === 'SCHEDULED'
    ).length;

    return { wins, losses, winPct, gamesRemaining };
  };

  const teamStats = getTeamStats();

  return (
    <div className="space-y-4">
      {/* Header with Add Game button */}
      <div className="bg-[var(--franchise-panel)] p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-sm text-[var(--franchise-text)]">📅 SEASON {seasonNumber} SCHEDULE</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="SCHEDULE HELP"
              aria-expanded={helpOpen}
              onClick={() => setHelpOpen((current) => !current)}
              className="flex h-9 w-9 items-center justify-center border-[3px] border-[var(--franchise-info)] bg-[var(--franchise-border)] text-[var(--franchise-text)]"
            >
              <CircleHelp className="h-4 w-4" />
            </button>
            <button
              onClick={onAddGame}
              className="bg-[var(--franchise-info-bright)] border-[3px] border-[var(--franchise-info)] px-3 py-1 text-xs text-[var(--franchise-text)] hover:bg-[var(--franchise-info)] active:scale-95 transition-transform flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add Game
            </button>
          </div>
        </div>
        
        {teamStats ? (
          <div className="text-xs text-[var(--franchise-text)]/80">
            ⭐ {teamName(selectedTeam)} │ {teamStats.wins}-{teamStats.losses} ({teamStats.winPct}) │ {teamStats.gamesRemaining} games remaining
          </div>
        ) : (
          <div className="text-xs text-[var(--franchise-text)]/80">
            Full League │ {games.length} games scheduled
          </div>
        )}
        {helpOpen ? (
          <aside aria-label="Schedule instructions" className="mt-3 border-[3px] border-[var(--franchise-info)] bg-[var(--franchise-panel-dark)] p-3 text-[9px] leading-5 text-[var(--franchise-text)]/80">
            <p>ADD GAMES MANUALLY OR REVIEW A CSV. GENERATED SCHEDULES ARE OFF.</p>
            {onImportCsvRows ? (
              <>
                <p>CSV HEADER: gameNumber, awayTeam, homeTeam, optional dayNumber, date, time, notes.</p>
                <p>IMPORT USES ONLY YOUR ROWS; IT DOES NOT GENERATE MISSING MATCHUPS.</p>
              </>
            ) : null}
          </aside>
        ) : null}
      </div>

      {onImportCsvRows && (
        <div className="bg-[var(--franchise-panel)] border-[5px] border-[var(--franchise-border)] p-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] text-[var(--franchise-text)]">CSV SCHEDULE IMPORT</div>
            </div>
            <label className="bg-[var(--franchise-border)] border-[3px] border-[var(--franchise-panel-dark)] px-3 py-2 text-[10px] text-[var(--franchise-text)] hover:bg-[var(--franchise-panel-dark)] active:scale-95 transition-transform inline-flex items-center gap-2 cursor-pointer">
              <FileUp className="w-3.5 h-3.5" /> Review CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  void handleCsvFileSelected(event.target.files?.[0] ?? null);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>

          {csvFileName && (
            <div className="text-[9px] text-[var(--franchise-text)]/70">Selected: {csvFileName}</div>
          )}

          {csvImportError && (
            <div className="bg-[var(--franchise-loss-deep)] border-[3px] border-[var(--franchise-loss-alt)] p-2 text-[9px] text-white">
              {csvImportError}
            </div>
          )}

          {csvReview && (
            <div className="bg-[var(--franchise-border)] border-[3px] border-[var(--franchise-panel-dark)] p-3 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[10px] text-[var(--franchise-text)]">
                  {csvReview.acceptedRows.length} valid rows
                  {csvReview.issues.length > 0 ? ` | ${csvReview.issues.length} issue${csvReview.issues.length === 1 ? "" : "s"}` : ""}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setCsvReview(null); setCsvFileName(""); setCsvImportError(null); }}
                    className="bg-[var(--franchise-panel)] border-[2px] border-[var(--franchise-panel-dark)] px-3 py-1 text-[9px] text-[var(--franchise-text)] hover:bg-[var(--franchise-panel-dark)]"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => void handleAcceptCsvImport()}
                    disabled={csvReview.hasErrors || csvReview.acceptedRows.length === 0 || csvImporting}
                    className="bg-[var(--franchise-info-bright)] border-[2px] border-[var(--franchise-info)] px-3 py-1 text-[9px] text-[var(--franchise-text)] hover:bg-[var(--franchise-info)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {csvImporting ? "Importing" : "Accept Import"}
                  </button>
                </div>
              </div>

              {csvReview.issues.length > 0 && (
                <div className="space-y-1">
                  {csvReview.issues.slice(0, 6).map((issue, index) => (
                    <div key={`${issue.rowNumber}-${issue.code}-${index}`} className="text-[9px] text-[var(--franchise-loss-text-alt2)]">
                      Row {issue.rowNumber}: {issue.message}
                    </div>
                  ))}
                </div>
              )}

              {csvReview.acceptedRows.length > 0 && (
                <div className="space-y-1">
                  {csvReview.acceptedRows.slice(0, 5).map((row) => (
                    <div key={row.gameNumber} className="text-[9px] text-[var(--franchise-text)]/75">
                      Game {row.gameNumber}: {teamName(row.awayTeamId)} @ {teamName(row.homeTeamId)}{row.date ? ` | ${row.date}` : ""}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filter Dropdown */}
      <div className="bg-[var(--franchise-panel)] border-[5px] border-[var(--franchise-border)] p-4">
        <div className="text-[8px] text-[var(--franchise-text)] mb-3">▶ SEASON {seasonNumber} SCHEDULE</div>
        <div className="relative">
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full bg-[var(--franchise-border)] py-2 px-3 text-[10px] text-[var(--franchise-text)] hover:bg-[var(--franchise-panel-dark)] active:scale-95 transition-transform flex items-center justify-between"
          >
            <span>Filter: {selectedTeam === "FULL LEAGUE" ? selectedTeam : teamName(selectedTeam)}</span>
            {dropdownOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          
          {dropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--franchise-border)] border-[3px] border-[var(--franchise-text)] z-10 max-h-64 overflow-y-auto">
              <button
                onClick={() => {
                  onTeamChange("FULL LEAGUE");
                  setDropdownOpen(false);
                }}
                className="w-full py-2 px-3 text-[10px] text-[var(--franchise-text)] hover:bg-[var(--franchise-panel-dark)] flex items-center justify-between border-b border-[var(--franchise-panel-dark)]"
              >
                <span>FULL LEAGUE</span>
                {selectedTeam === "FULL LEAGUE" && <CheckCircle className="w-3 h-3 text-[var(--franchise-text)]" />}
              </button>
              {availableTeams.map(team => (
                <button
                  key={team}
                  onClick={() => {
                    onTeamChange(team);
                    setDropdownOpen(false);
                  }}
                  className="w-full py-2 px-3 text-[10px] text-[var(--franchise-text)] hover:bg-[var(--franchise-panel-dark)] flex items-center justify-between border-b border-[var(--franchise-panel-dark)]"
                >
                  <span>{teamName(team)}</span>
                  {selectedTeam === team && <CheckCircle className="w-3 h-3 text-[var(--franchise-text)]" />}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {selectedTeam !== "FULL LEAGUE" && filteredGames.length > 0 && (
          <div className="text-xs text-[var(--franchise-text)]/60 mt-2 text-center">
            Showing: {filteredGames.length} games
          </div>
        )}
      </div>

      {/* Empty State */}
      {games.length === 0 && (
        <div className="bg-[var(--franchise-panel)] border-[5px] border-[var(--franchise-border)] p-12 text-center">
          <div className="text-4xl mb-4">📭</div>
          <div className="text-lg text-[var(--franchise-text)] mb-2">NO GAMES SCHEDULED</div>
          <div className="text-sm text-[var(--franchise-text)]/80 mb-6">
            Your Season {seasonNumber} schedule is empty.
          </div>
          <button
            onClick={onAddGame}
            className="bg-[var(--franchise-info-bright)] border-[3px] border-[var(--franchise-info)] px-6 py-3 text-sm text-[var(--franchise-text)] hover:bg-[var(--franchise-info)] active:scale-95 transition-transform inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Game
          </button>
        </div>
      )}

      {/* Games List */}
      {games.length > 0 && (
        <div className="space-y-3">
          {/* Next Game - Highlighted */}
          {nextGame && selectedTeam === "FULL LEAGUE" && (
            <div className="bg-[var(--franchise-panel)] border-[5px] border-[var(--franchise-gold)] p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-[var(--franchise-text)]">
                  {nextGame.date || `DAY ${nextGame.dayNumber}`} {nextGame.date && "• TODAY"}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-[8px] text-[var(--franchise-text)] bg-[var(--franchise-border)] px-2 py-1">NEXT GAME</div>
                  {onEditGame && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditGame(nextGame); }}
                      className="text-[var(--franchise-text)]/40 hover:text-[var(--franchise-gold-bright)] transition-colors p-1"
                      title="Edit game"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {renderScoreGameButton(nextGame)}
                  {renderFinalScoreButton(nextGame)}
                  {renderSkipGameButton(nextGame)}
                  {renderDeleteButton(nextGame.id)}
                </div>
              </div>
              <div className="flex items-center justify-center gap-4">
                <div className="text-right">
                  <div className="text-base text-[var(--franchise-text)]">{teamName(nextGame.awayTeamId)}</div>
                  <div className="text-[8px] text-[var(--franchise-text)]/60">(AWAY)</div>
                </div>
                <div className="text-center px-2">
                  <div className="text-xl text-[var(--franchise-text)]">@</div>
                  <div className="text-[7px] text-[var(--franchise-text)]/70 italic mt-1">{stadiumMap[nextGame.homeTeamId] || teamName(nextGame.homeTeamId)}</div>
                </div>
                <div className="text-left">
                  <div className="text-base text-[var(--franchise-text)]">{teamName(nextGame.homeTeamId)}</div>
                  <div className="text-[8px] text-[var(--franchise-text)]/60">(HOME)</div>
                </div>
              </div>
              {nextGame.time && (
                <div className="text-[8px] text-[var(--franchise-text)]/60 text-center mt-2">{nextGame.time}</div>
              )}
              <div className="text-[8px] text-[var(--franchise-text)]/60 text-right mt-2">Game {nextGame.gameNumber}</div>
            </div>
          )}

          {/* Upcoming Games */}
          {selectedTeam !== "FULL LEAGUE" && upcomingGames.length > 0 && (
            <>
              <div className="text-xs text-[var(--franchise-text)] bg-[var(--franchise-border)] px-3 py-2">
                UPCOMING ({upcomingGames.length} games scheduled)
              </div>
              {upcomingGames.slice(0, 5).map((game, index) => (
                <div key={game.id} className="bg-[var(--franchise-panel)] border-[5px] border-[var(--franchise-border)] p-3">
                  <div className="flex items-center justify-between text-[10px] text-[var(--franchise-text)]/80 mb-2">
                    <span>Game {game.gameNumber} │ Day {game.dayNumber}</span>
                    <div className="flex items-center gap-2">
                  {index === 0 && <span className="text-[var(--franchise-gold-bright)]">← NEXT GAME</span>}
                      {onEditGame && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onEditGame(game); }}
                          className="text-[var(--franchise-text)]/40 hover:text-[var(--franchise-gold-bright)] transition-colors p-1"
                          title="Edit game"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {index === 0 ? renderScoreGameButton(game) : null}
                      {renderFinalScoreButton(game)}
                      {renderSkipGameButton(game)}
                      {renderDeleteButton(game.id)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[var(--franchise-text)]">
                    <span>{game.awayTeamId === selectedTeam ? "vs" : "@"} {teamName(game.awayTeamId === selectedTeam ? game.homeTeamId : game.awayTeamId)}</span>
                    <span>{game.awayTeamId === selectedTeam ? "Home" : "Away"}</span>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Other Scheduled Games (Full League view) */}
          {selectedTeam === "FULL LEAGUE" && upcomingGames.slice(1, 6).map(game => (
            <div key={game.id} className="bg-[var(--franchise-panel)] border-[5px] border-[var(--franchise-border)] p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-[var(--franchise-text)]">
                  {game.date || `DAY ${game.dayNumber}`}
                </div>
                <div className="flex items-center gap-2">
                  {game.time && (
                    <div className="text-[8px] text-[var(--franchise-text)] bg-[var(--franchise-border)] px-2 py-1">{game.time}</div>
                  )}
                  {onEditGame && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditGame(game); }}
                      className="text-[var(--franchise-text)]/40 hover:text-[var(--franchise-gold-bright)] transition-colors p-1"
                      title="Edit game"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {renderFinalScoreButton(game)}
                  {renderSkipGameButton(game)}
                  {renderDeleteButton(game.id)}
                </div>
              </div>
              <div className="flex items-center justify-center gap-4">
                <div className="text-right">
                  <div className="text-base text-[var(--franchise-text)]">{teamName(game.awayTeamId)}</div>
                  <div className="text-[8px] text-[var(--franchise-text)]/60">(AWAY)</div>
                </div>
                <div className="text-center px-2">
                  <div className="text-xl text-[var(--franchise-text)]">@</div>
                  <div className="text-[7px] text-[var(--franchise-text)]/70 italic mt-1">{stadiumMap[game.homeTeamId] || teamName(game.homeTeamId)}</div>
                </div>
                <div className="text-left">
                  <div className="text-base text-[var(--franchise-text)]">{teamName(game.homeTeamId)}</div>
                  <div className="text-[8px] text-[var(--franchise-text)]/60">(HOME)</div>
                </div>
              </div>
              <div className="text-[8px] text-[var(--franchise-text)]/60 text-right mt-2">Game {game.gameNumber}</div>
            </div>
          ))}

          {/* Divider */}
          {completedGames.length > 0 && (
            <>
              <div className="border-t-[3px] border-[var(--franchise-border)] my-2"></div>
              <div className="text-center text-[8px] text-[var(--franchise-text)]/60 py-2">▼ COMPLETED GAMES ({completedGames.length})</div>
            </>
          )}

          {/* Completed Games */}
          {selectedTeam !== "FULL LEAGUE" && completedGames.length > 0 && (
            <>
              <div className="text-xs text-[var(--franchise-text)] bg-[var(--franchise-border)] px-3 py-2">
                COMPLETED ({completedGames.length} games)
              </div>
              {completedGames.slice(0, 10).map(game => {
                const isWin = game.result?.winningTeamId === selectedTeam;
                const opponent = game.awayTeamId === selectedTeam ? game.homeTeamId : game.awayTeamId;
                const location = game.awayTeamId === selectedTeam ? "Away" : "Home";
                const score = game.result ? 
                  (game.awayTeamId === selectedTeam 
                    ? `${game.result.awayScore}-${game.result.homeScore}`
                    : `${game.result.homeScore}-${game.result.awayScore}`)
                  : "--";

                return (
                  <div key={game.id} className="bg-[var(--franchise-panel)] border-[5px] border-[var(--franchise-border)] p-3">
                  <div className="flex items-center justify-between text-[10px] text-[var(--franchise-text)]/80">
                    <span>Game {game.gameNumber} │ Day {game.dayNumber} │ {game.awayTeamId === selectedTeam ? "@" : "vs"} {teamName(opponent)} │ {location}</span>
                    <div className="flex items-center gap-2">
                      {renderScoreOnlyBadge(game)}
                      {renderArchiveBadge(game)}
                      {renderGameDetailLink(game)}
                      <span className={isWin ? "text-[var(--franchise-win)]" : "text-[var(--franchise-loss)]"}>
                        {isWin ? "W" : "L"} {score}
                      </span>
                    </div>
                  </div>
                  {renderScoreOnlyCopy(game)}
                </div>
              );
            })}
            </>
          )}

          {/* Completed Games - Full League view */}
          {selectedTeam === "FULL LEAGUE" && completedGames.slice(0, 5).map(game => (
            <div key={game.id} className="bg-[var(--franchise-panel)] border-[5px] border-[var(--franchise-border)] p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-[var(--franchise-text)]">
                  {game.date || `DAY ${game.dayNumber}`}
                </div>
                <div className="text-[8px] text-[var(--franchise-text)] bg-[var(--franchise-border)] px-2 py-1">FINAL</div>
                {renderScoreOnlyBadge(game)}
                {renderArchiveBadge(game)}
                {renderGameDetailLink(game)}
              </div>
              <div className="flex items-center justify-center gap-4">
                <div className="text-right">
                  <div className="text-base text-[var(--franchise-text)]">{teamName(game.awayTeamId)}</div>
                  <div className="text-[8px] text-[var(--franchise-text)]/60">(AWAY)</div>
                </div>
                <div className="text-center px-2">
                  {game.result ? (
                    <div className="text-2xl text-[var(--franchise-text)] font-bold">
                      {game.result.awayScore}-{game.result.homeScore}
                    </div>
                  ) : (
                    <div className="text-xl text-[var(--franchise-text)]">@</div>
                  )}
                </div>
                <div className="text-left">
                  <div className="text-base text-[var(--franchise-text)]">{teamName(game.homeTeamId)}</div>
                  <div className="text-[8px] text-[var(--franchise-text)]/60">(HOME)</div>
                </div>
              </div>
              {renderScoreOnlyCopy(game)}
              <div className="text-[8px] text-[var(--franchise-text)]/60 text-right mt-2">Game {game.gameNumber}</div>
            </div>
          ))}

          {/* Unscheduled notice for team view */}
          {selectedTeam !== "FULL LEAGUE" && (
            <div className="bg-[var(--franchise-panel)] border-[5px] border-[var(--franchise-border)] p-3 flex items-center justify-between">
              <div className="text-xs text-[var(--franchise-text)]/80">
                {teamStats && teamStats.gamesRemaining === 0 
                  ? "All games scheduled for this season" 
                  : `Unscheduled: games remaining`}
              </div>
              <button
                onClick={onAddGame}
                className="bg-[var(--franchise-info-bright)] border-[2px] border-[var(--franchise-info)] px-3 py-1 text-xs text-[var(--franchise-text)] hover:bg-[var(--franchise-info)] active:scale-95 transition-transform flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Game
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
