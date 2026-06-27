import { useEffect, useMemo, useState } from "react";
import type { LineupSlot, Player, Position, Team } from "../../../utils/leagueBuilderStorage";
import { saveFranchiseTeam } from "../../../utils/franchisePlayerStorage";
import {
  FRANCHISE_FIELD_POSITIONS,
  FRANCHISE_ROTATION_SIZE,
  applyFranchiseTeamUpdateWithStaleOptimalSnapshots,
  buildEditableFranchiseLineupSlots,
  buildManualLineupForSave,
  describeStoredLineupRotationWarnings,
  duplicateIds,
  expectedManualLineupPositions,
  getFranchisePlayerName,
  isFranchisePitcher,
  normalizeFranchiseRotationIds,
} from "../utils/franchiseLineupDomain";

/**
 * FranchiseLineupRotationEditor — the durable lineup + rotation editor shared by Team Hub AND the
 * Lineups tab (no divergent copies). Extracted from TeamHubContent, then aligned to franchise rules
 * (JK 2026-06-26):
 *  - NO DH: franchise mode is sealed no-DH at config level, so the editor never offers a DH slot.
 *  - FOUR-MAN ROTATION: SMB4 is always a 4-man rotation; exactly 4 starter slots, the rest is bullpen.
 *  - BENCH + BULLPEN visible: position players not in the nine and pitchers not in the four are shown
 *    so the user can swap anyone in or out.
 *
 * Fully controlled by props: the parent owns the team record + roster; this component owns only the
 * in-progress manual edit state. On save it writes through saveFranchiseTeam and hands the saved Team
 * back via setFranchiseTeam (which re-seeds the editor through the init effect).
 */
export interface FranchiseLineupRotationEditorProps {
  franchiseId: string | undefined;
  franchiseTeam: Team | null;
  setFranchiseTeam: (team: Team) => void;
  franchiseRosterPlayers: Player[];
  /** Called at the start of a save — Team Hub clears its optimal-comparison panel here. */
  onBeforeSave?: () => void;
}

export function FranchiseLineupRotationEditor({
  franchiseId,
  franchiseTeam,
  setFranchiseTeam,
  franchiseRosterPlayers,
  onBeforeSave,
}: FranchiseLineupRotationEditorProps) {
  const [manualLineupSlots, setManualLineupSlots] = useState<LineupSlot[]>([]);
  const [manualRotationIds, setManualRotationIds] = useState<string[]>([]);
  const [lineupRotationDirty, setLineupRotationDirty] = useState(false);
  const [isLineupRotationSaving, setIsLineupRotationSaving] = useState(false);
  const [lineupRotationMessage, setLineupRotationMessage] = useState<string | null>(null);
  const [lineupRotationError, setLineupRotationError] = useState<string | null>(null);

  const touch = () => {
    setLineupRotationDirty(true);
    setLineupRotationMessage(null);
    setLineupRotationError(null);
  };

  const franchiseRosterPlayerById = useMemo(
    () => new Map(franchiseRosterPlayers.map((player) => [player.id, player])),
    [franchiseRosterPlayers],
  );
  const positionPlayerOptions = useMemo(
    () => franchiseRosterPlayers.filter((player) => !isFranchisePitcher(player)),
    [franchiseRosterPlayers],
  );
  const pitcherOptions = useMemo(
    () => franchiseRosterPlayers.filter((player) => isFranchisePitcher(player)),
    [franchiseRosterPlayers],
  );
  const storedLineupRotationWarnings = useMemo(() => {
    return describeStoredLineupRotationWarnings(
      franchiseRosterPlayers,
      franchiseTeam?.lineupWithoutDH,
      franchiseTeam?.startingRotation,
      false,
    );
  }, [franchiseRosterPlayers, franchiseTeam]);
  const duplicateManualLineupIds = useMemo(
    () => duplicateIds(manualLineupSlots.map((slot) => slot.playerId)),
    [manualLineupSlots],
  );
  const duplicateManualRotationIds = useMemo(
    () => duplicateIds(manualRotationIds),
    [manualRotationIds],
  );
  const duplicateManualLineupPositions = useMemo(
    () => duplicateIds(manualLineupSlots.map((slot) => slot.fieldingPosition)),
    [manualLineupSlots],
  );
  const missingManualLineupPositions = useMemo(() => {
    const assignedPositions = new Set(manualLineupSlots.map((slot) => slot.fieldingPosition));
    return expectedManualLineupPositions(false).filter((position) => !assignedPositions.has(position));
  }, [manualLineupSlots]);
  const lineupRotationBlockingMessage = useMemo(() => {
    if (duplicateManualLineupIds.length > 0) {
      return `Lineup has duplicate players: ${duplicateManualLineupIds.join(', ')}.`;
    }
    if (duplicateManualLineupPositions.length > 0) {
      return `Lineup has duplicate defensive positions: ${duplicateManualLineupPositions.join(', ')}.`;
    }
    if (missingManualLineupPositions.length > 0) {
      return `Lineup is missing defensive positions: ${missingManualLineupPositions.join(', ')}.`;
    }
    if (duplicateManualRotationIds.length > 0) {
      return `Rotation has duplicate pitchers: ${duplicateManualRotationIds.join(', ')}.`;
    }
    return null;
  }, [
    duplicateManualLineupIds,
    duplicateManualLineupPositions,
    duplicateManualRotationIds,
    missingManualLineupPositions,
  ]);

  // Players not currently in the starting nine / four — the bench + bullpen.
  const benchPlayers = useMemo(() => {
    const inLineup = new Set(manualLineupSlots.map((slot) => slot.playerId));
    return positionPlayerOptions.filter((player) => !inLineup.has(player.id));
  }, [positionPlayerOptions, manualLineupSlots]);
  const bullpenPitchers = useMemo(() => {
    const inRotation = new Set(manualRotationIds);
    return pitcherOptions.filter((player) => !inRotation.has(player.id));
  }, [pitcherOptions, manualRotationIds]);
  const rotationStarterName = useMemo(() => {
    const starter = manualRotationIds[0] ? franchiseRosterPlayerById.get(manualRotationIds[0]) : undefined;
    return starter ? getFranchisePlayerName(starter) : null;
  }, [manualRotationIds, franchiseRosterPlayerById]);
  const canAddStarter = manualRotationIds.length < FRANCHISE_ROTATION_SIZE && bullpenPitchers.length > 0;

  useEffect(() => {
    if (!franchiseTeam) {
      setManualLineupSlots([]);
      setManualRotationIds([]);
      setLineupRotationDirty(false);
      setLineupRotationMessage(null);
      setLineupRotationError(null);
      return;
    }

    setManualLineupSlots(buildEditableFranchiseLineupSlots(franchiseRosterPlayers, franchiseTeam.lineupWithoutDH, false));
    setManualRotationIds(normalizeFranchiseRotationIds(franchiseRosterPlayers, franchiseTeam.startingRotation));
    setLineupRotationDirty(false);
    setLineupRotationMessage(null);
    setLineupRotationError(null);
  }, [franchiseRosterPlayers, franchiseTeam]);

  const updateManualLineupSlot = (index: number, update: Partial<LineupSlot>) => {
    setManualLineupSlots((slots) =>
      slots.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, ...update } : slot,
      ),
    );
    touch();
  };

  const moveManualLineupSlot = (index: number, direction: -1 | 1) => {
    setManualLineupSlots((slots) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= slots.length) return slots;
      const next = [...slots];
      const [slot] = next.splice(index, 1);
      next.splice(nextIndex, 0, slot);
      return next.map((lineupSlot, slotIndex) => ({
        ...lineupSlot,
        battingOrder: slotIndex + 1,
      }));
    });
    touch();
  };

  const moveManualRotationSlot = (index: number, direction: -1 | 1) => {
    setManualRotationIds((rotationIds) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= rotationIds.length) return rotationIds;
      const next = [...rotationIds];
      const [playerId] = next.splice(index, 1);
      next.splice(nextIndex, 0, playerId);
      return next;
    });
    touch();
  };

  // Swap a different pitcher into rotation slot `index` (pull from bullpen, or swap with another slot).
  const setManualRotationSlotPitcher = (index: number, playerId: string) => {
    if (!playerId) return;
    setManualRotationIds((ids) => {
      const next = [...ids];
      const existing = next.indexOf(playerId);
      if (existing === index) return ids;
      if (existing >= 0) {
        [next[index], next[existing]] = [next[existing], next[index]];
      } else {
        next[index] = playerId;
      }
      return next.slice(0, FRANCHISE_ROTATION_SIZE);
    });
    touch();
  };

  const addRotationStarter = (playerId: string) => {
    if (!playerId) return;
    setManualRotationIds((ids) =>
      ids.includes(playerId) || ids.length >= FRANCHISE_ROTATION_SIZE ? ids : [...ids, playerId],
    );
    touch();
  };

  const removeRotationStarter = (index: number) => {
    setManualRotationIds((ids) => ids.filter((_, slotIndex) => slotIndex !== index));
    touch();
  };

  const rebuildManualLineupRotationFromMlb = () => {
    setManualLineupSlots(buildEditableFranchiseLineupSlots(franchiseRosterPlayers, undefined, false));
    setManualRotationIds(normalizeFranchiseRotationIds(franchiseRosterPlayers, undefined));
    setLineupRotationDirty(true);
    setLineupRotationMessage("Rebuilt from current MLB assignments. Save to make it durable.");
    setLineupRotationError(null);
  };

  const handleSaveLineupRotation = async () => {
    if (!franchiseId || !franchiseTeam || lineupRotationBlockingMessage) return;

    onBeforeSave?.();
    setIsLineupRotationSaving(true);
    setLineupRotationError(null);
    setLineupRotationMessage(null);

    try {
      const normalizedRotationIds = normalizeFranchiseRotationIds(franchiseRosterPlayers, manualRotationIds);
      const lineupForSave = buildManualLineupForSave(
        franchiseRosterPlayers,
        manualLineupSlots,
        normalizedRotationIds,
        false,
      );
      const update: Partial<Team> = {
        startingRotation: normalizedRotationIds,
        lineupWithoutDH: lineupForSave,
      };
      const nextTeam = applyFranchiseTeamUpdateWithStaleOptimalSnapshots(franchiseTeam, update);
      const savedTeam = await saveFranchiseTeam(franchiseId, nextTeam);
      setFranchiseTeam(savedTeam);
      setLineupRotationDirty(false);
      setLineupRotationMessage("Lineup and rotation saved to franchise team state.");
    } catch (err) {
      setLineupRotationError(err instanceof Error ? err.message : "Failed to save franchise lineup and rotation.");
    } finally {
      setIsLineupRotationSaving(false);
    }
  };

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
              {/* Pitcher bats ninth (no DH in franchise) */}
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
