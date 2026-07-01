import { useEffect, useMemo, useState } from "react";
import type { LineupSlot, Player, Team } from "../../../utils/leagueBuilderStorage";
import { saveFranchiseTeam } from "../../../utils/franchisePlayerStorage";
import {
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
 * useFranchiseLineupRotationEditor — the durable lineup + rotation editor LOGIC, shared by the legacy
 * Team-Hub editor AND the Fenway-hub Lineups surface (no divergent logic; each renders its own JSX over
 * this hook). Franchise rules baked in: NO DH (config-sealed), four-man rotation (FRANCHISE_ROTATION_SIZE),
 * bench + bullpen visibility.
 *
 * Fully controlled: the parent owns the team record + roster; this hook owns only the in-progress edit
 * state. On save it writes through saveFranchiseTeam and hands the saved Team back via setFranchiseTeam
 * (which re-seeds the editor via the init effect).
 */
export interface UseFranchiseLineupRotationEditorInput {
  franchiseId: string | undefined;
  franchiseTeam: Team | null;
  setFranchiseTeam: (team: Team) => void;
  franchiseRosterPlayers: Player[];
  /** Called at the start of a save — Team Hub clears its optimal-comparison panel here. */
  onBeforeSave?: () => void;
}

export function useFranchiseLineupRotationEditor({
  franchiseId,
  franchiseTeam,
  setFranchiseTeam,
  franchiseRosterPlayers,
  onBeforeSave,
}: UseFranchiseLineupRotationEditorInput) {
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

  return {
    // state
    manualLineupSlots,
    manualRotationIds,
    lineupRotationDirty,
    isLineupRotationSaving,
    lineupRotationMessage,
    lineupRotationError,
    // derived
    franchiseRosterPlayerById,
    positionPlayerOptions,
    pitcherOptions,
    storedLineupRotationWarnings,
    lineupRotationBlockingMessage,
    benchPlayers,
    bullpenPitchers,
    rotationStarterName,
    canAddStarter,
    // handlers
    updateManualLineupSlot,
    moveManualLineupSlot,
    moveManualRotationSlot,
    setManualRotationSlotPitcher,
    addRotationStarter,
    removeRotationStarter,
    rebuildManualLineupRotationFromMlb,
    handleSaveLineupRotation,
  };
}
