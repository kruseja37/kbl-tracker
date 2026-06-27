import type { Position } from "../../../utils/leagueBuilderStorage";
import {
  FRANCHISE_FIELD_POSITIONS,
  FRANCHISE_ROTATION_SIZE,
  getFranchisePlayerName,
} from "../utils/franchiseLineupDomain";
import {
  useFranchiseLineupRotationEditor,
  type UseFranchiseLineupRotationEditorInput,
} from "../hooks/useFranchiseLineupRotationEditor";

/**
 * FranchiseLineupRotationEditor — the legacy (Team Hub) presentation of the durable lineup + rotation
 * editor. All logic lives in useFranchiseLineupRotationEditor (shared with the Fenway-hub surface);
 * this is a thin --franchise-* themed view over it. No DH, four-man rotation, bench + bullpen visible.
 */
export type FranchiseLineupRotationEditorProps = UseFranchiseLineupRotationEditorInput;

export function FranchiseLineupRotationEditor(props: FranchiseLineupRotationEditorProps) {
  const franchiseTeam = props.franchiseTeam;
  const {
    manualLineupSlots,
    manualRotationIds,
    lineupRotationDirty,
    isLineupRotationSaving,
    lineupRotationMessage,
    lineupRotationError,
    franchiseRosterPlayerById,
    positionPlayerOptions,
    pitcherOptions,
    storedLineupRotationWarnings,
    lineupRotationBlockingMessage,
    benchPlayers,
    bullpenPitchers,
    rotationStarterName,
    canAddStarter,
    updateManualLineupSlot,
    moveManualLineupSlot,
    moveManualRotationSlot,
    setManualRotationSlotPitcher,
    addRotationStarter,
    removeRotationStarter,
    rebuildManualLineupRotationFromMlb,
    handleSaveLineupRotation,
  } = useFranchiseLineupRotationEditor(props);

  return (
    <section
      aria-label="Franchise lineup and rotation manager"
      className="mb-4 border-[4px] border-[var(--franchise-border)] bg-[var(--franchise-panel)] p-3"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[10px] text-[var(--franchise-gold)]">DURABLE LINEUP + ROTATION</div>
          <div className="mt-1 text-[8px] text-[var(--franchise-text)]/60">
            Saves current franchise-owned MLB setup for GameTracker launch.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={rebuildManualLineupRotationFromMlb}
            disabled={!franchiseTeam || isLineupRotationSaving}
            className="border-2 border-[var(--franchise-text)]/30 bg-[var(--franchise-border)] px-3 py-1 text-[8px] font-bold text-[var(--franchise-text)] hover:border-[var(--franchise-gold)] disabled:opacity-40"
          >
            REBUILD FROM MLB ASSIGNMENTS
          </button>
          <button
            type="button"
            onClick={() => void handleSaveLineupRotation()}
            disabled={!franchiseTeam || isLineupRotationSaving || Boolean(lineupRotationBlockingMessage)}
            className="border-2 border-[var(--franchise-text)] bg-[var(--franchise-border)] px-3 py-1 text-[8px] font-bold text-[var(--franchise-text)] hover:border-[var(--franchise-gold)] disabled:opacity-40"
          >
            {isLineupRotationSaving ? "SAVING..." : "SAVE LINEUP + ROTATION"}
          </button>
        </div>
      </div>

      {storedLineupRotationWarnings.length > 0 && (
        <div className="mb-3 space-y-1 border-2 border-[var(--franchise-gold)]/60 bg-[var(--franchise-border)] p-2 text-[8px] text-[var(--franchise-gold-soft)]">
          {storedLineupRotationWarnings.map((warning) => (
            <div key={warning}>{warning}</div>
          ))}
        </div>
      )}
      {lineupRotationBlockingMessage && (
        <div className="mb-3 border-2 border-[var(--franchise-loss)]/50 bg-[var(--franchise-border)] p-2 text-[8px] text-[var(--franchise-loss-text)]">
          {lineupRotationBlockingMessage}
        </div>
      )}
      {lineupRotationError && (
        <div className="mb-3 border-2 border-[var(--franchise-loss)]/50 bg-[var(--franchise-border)] p-2 text-[8px] text-[var(--franchise-loss-text)]">
          {lineupRotationError}
        </div>
      )}
      {lineupRotationMessage && (
        <div className="mb-3 border-2 border-[var(--franchise-text)]/30 bg-[var(--franchise-border)] p-2 text-[8px] text-[var(--franchise-text)]">
          {lineupRotationMessage}
        </div>
      )}

      <div className="mb-3 text-[8px] text-[var(--franchise-text)]/60">
        Status: {lineupRotationDirty ? "dirty / unsaved" : "saved"}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)]">
        {/* ---- Lineup + bench ---- */}
        <div className="border-2 border-[var(--franchise-border)] bg-[var(--franchise-border)] p-2">
          <div className="mb-2 text-[8px] font-bold text-[var(--franchise-gold)]">LINEUP ORDER</div>
          {manualLineupSlots.length === 0 ? (
            <div className="text-[8px] text-[var(--franchise-text)]/60">No current MLB position players available.</div>
          ) : (
            <div className="space-y-2">
              {manualLineupSlots.map((slot, index) => {
                const player = franchiseRosterPlayerById.get(slot.playerId);
                return (
                  <div key={`${slot.battingOrder}-${slot.playerId}-${index}`} className="grid grid-cols-[34px_minmax(150px,1fr)_80px_80px] items-center gap-2 text-[8px]">
                    <div className="text-[var(--franchise-text)]/70">#{index + 1}</div>
                    <select
                      aria-label={`Lineup slot ${index + 1} player`}
                      value={slot.playerId}
                      onChange={(event) => updateManualLineupSlot(index, { playerId: event.target.value })}
                      className="min-w-0 border-2 border-[var(--franchise-panel-dark)] bg-[var(--franchise-panel)] p-1 text-[var(--franchise-text)]"
                    >
                      {positionPlayerOptions.map((optionPlayer) => (
                        <option key={optionPlayer.id} value={optionPlayer.id}>
                          {getFranchisePlayerName(optionPlayer)}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label={`Lineup slot ${index + 1} position`}
                      value={slot.fieldingPosition}
                      onChange={(event) => updateManualLineupSlot(index, { fieldingPosition: event.target.value as Position })}
                      className="border-2 border-[var(--franchise-panel-dark)] bg-[var(--franchise-panel)] p-1 text-[var(--franchise-text)]"
                    >
                      {FRANCHISE_FIELD_POSITIONS.map((position) => (
                        <option key={position} value={position}>
                          {position}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        aria-label={`Move lineup slot ${index + 1} up`}
                        disabled={index === 0}
                        onClick={() => moveManualLineupSlot(index, -1)}
                        className="flex-1 border border-[var(--franchise-text)]/30 bg-[var(--franchise-panel)] px-1 py-1 text-[var(--franchise-text)] disabled:opacity-30"
                      >
                        UP
                      </button>
                      <button
                        type="button"
                        aria-label={`Move lineup slot ${index + 1} down`}
                        disabled={index === manualLineupSlots.length - 1}
                        onClick={() => moveManualLineupSlot(index, 1)}
                        className="flex-1 border border-[var(--franchise-text)]/30 bg-[var(--franchise-panel)] px-1 py-1 text-[var(--franchise-text)] disabled:opacity-30"
                      >
                        DN
                      </button>
                    </div>
                    {!player && (
                      <div className="col-span-4 text-[var(--franchise-loss-text)]">Selected player is no longer MLB-active for this team.</div>
                    )}
                  </div>
                );
              })}
              <div className="grid grid-cols-[34px_minmax(150px,1fr)_80px] items-center gap-2 text-[8px] text-[var(--franchise-text)]/70">
                <div>#{manualLineupSlots.length + 1}</div>
                <div>{rotationStarterName ? `${rotationStarterName} (auto)` : "Starting pitcher"}</div>
                <div>P</div>
              </div>
            </div>
          )}

          <div className="mt-3 border-t-2 border-[var(--franchise-border)] pt-2">
            <div className="mb-1 text-[8px] font-bold text-[var(--franchise-gold)]">BENCH</div>
            {benchPlayers.length === 0 ? (
              <div className="text-[8px] text-[var(--franchise-text)]/50">No bench position players — pick a slot above to swap.</div>
            ) : (
              <div className="flex flex-wrap gap-1 text-[8px] text-[var(--franchise-text)]/70">
                {benchPlayers.map((player) => (
                  <span key={player.id} className="border border-[var(--franchise-text)]/20 bg-[var(--franchise-panel)] px-1 py-[2px]">
                    {getFranchisePlayerName(player)} <span className="text-[var(--franchise-text)]/40">({player.primaryPosition})</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ---- Rotation (4-man) + bullpen ---- */}
        <div className="border-2 border-[var(--franchise-border)] bg-[var(--franchise-border)] p-2">
          <div className="mb-2 text-[8px] font-bold text-[var(--franchise-gold)]">
            STARTING ROTATION ({manualRotationIds.length}/{FRANCHISE_ROTATION_SIZE})
          </div>
          {manualRotationIds.length === 0 ? (
            <div className="text-[8px] text-[var(--franchise-text)]/60">No current MLB starters available.</div>
          ) : (
            <div className="space-y-2">
              {manualRotationIds.map((playerId, index) => (
                <div key={`${playerId}-${index}`} className="grid grid-cols-[24px_minmax(110px,1fr)_46px_18px] items-center gap-1 text-[8px]">
                  <div className="text-[var(--franchise-text)]/70">SP{index + 1}</div>
                  <select
                    aria-label={`Rotation slot ${index + 1} pitcher`}
                    value={playerId}
                    onChange={(event) => setManualRotationSlotPitcher(index, event.target.value)}
                    className="min-w-0 border-2 border-[var(--franchise-panel-dark)] bg-[var(--franchise-panel)] p-1 text-[var(--franchise-text)]"
                  >
                    {pitcherOptions.map((optionPlayer) => (
                      <option key={optionPlayer.id} value={optionPlayer.id}>
                        {getFranchisePlayerName(optionPlayer)} ({optionPlayer.primaryPosition})
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      aria-label={`Move rotation pitcher ${index + 1} up`}
                      disabled={index === 0}
                      onClick={() => moveManualRotationSlot(index, -1)}
                      className="flex-1 border border-[var(--franchise-text)]/30 bg-[var(--franchise-panel)] px-1 py-1 text-[var(--franchise-text)] disabled:opacity-30"
                    >
                      UP
                    </button>
                    <button
                      type="button"
                      aria-label={`Move rotation pitcher ${index + 1} down`}
                      disabled={index === manualRotationIds.length - 1}
                      onClick={() => moveManualRotationSlot(index, 1)}
                      className="flex-1 border border-[var(--franchise-text)]/30 bg-[var(--franchise-panel)] px-1 py-1 text-[var(--franchise-text)] disabled:opacity-30"
                    >
                      DN
                    </button>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove rotation pitcher ${index + 1}`}
                    onClick={() => removeRotationStarter(index)}
                    className="border border-[var(--franchise-text)]/30 bg-[var(--franchise-panel)] px-1 py-1 text-[var(--franchise-loss-text)]"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {canAddStarter && (
            <div className="mt-2 grid grid-cols-[24px_minmax(110px,1fr)] items-center gap-1 text-[8px]">
              <div className="text-[var(--franchise-text)]/50">+SP</div>
              <select
                aria-label="Add a starting pitcher"
                value=""
                onChange={(event) => addRotationStarter(event.target.value)}
                className="min-w-0 border-2 border-[var(--franchise-text)]/30 bg-[var(--franchise-panel)] p-1 text-[var(--franchise-text)]"
              >
                <option value="">Add starter…</option>
                {bullpenPitchers.map((optionPlayer) => (
                  <option key={optionPlayer.id} value={optionPlayer.id}>
                    {getFranchisePlayerName(optionPlayer)} ({optionPlayer.primaryPosition})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-3 border-t-2 border-[var(--franchise-border)] pt-2">
            <div className="mb-1 text-[8px] font-bold text-[var(--franchise-gold)]">BULLPEN</div>
            {bullpenPitchers.length === 0 ? (
              <div className="text-[8px] text-[var(--franchise-text)]/50">No relievers outside the rotation.</div>
            ) : (
              <div className="flex flex-wrap gap-1 text-[8px] text-[var(--franchise-text)]/70">
                {bullpenPitchers.map((player) => (
                  <span key={player.id} className="border border-[var(--franchise-text)]/20 bg-[var(--franchise-panel)] px-1 py-[2px]">
                    {getFranchisePlayerName(player)} <span className="text-[var(--franchise-text)]/40">({player.primaryPosition})</span>
                  </span>
                ))}
              </div>
            )}
          </div>
          {pitcherOptions.length === 0 && (
            <div className="mt-2 text-[8px] text-[var(--franchise-gold-soft)]">GameTracker will need a valid MLB pitcher before launch.</div>
          )}
        </div>
      </div>
    </section>
  );
}
