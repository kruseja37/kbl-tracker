import { HISTORICAL_ARCHETYPES } from "../../../data/historicalArchetypes";
import { resolveClubBandPriorities } from "../../../engines/archetypeIdentity";
import { historicalToSimArchetype } from "../../../engines/draftabilityRanker";
import type { SimArchetype } from "../../../engines/archetypeBalanceSimulator";
import { materializeRankOrder } from "../components/shared/RankReorderList";
import {
  sortBoardEntriesForPosition,
  type BoardEntry,
  type FiveLights,
  type Light,
  type RosterIntelligencePayload,
} from "../../../engines/rosterIntelligencePayload";
import type { AuctionResultDisposition } from "../../../engines/auctionStateMachine";
import type { BandPriorities } from "../../../engines/leagueConstruction";
import type { TaxonomyPosition } from "../../../data/playerArchetypeTaxonomy";
import type { Team } from "../../hooks/useLeagueBuilderData";

const HISTORICAL_ARCHETYPE_BY_ID = new Map(HISTORICAL_ARCHETYPES.map((archetype) => [archetype.id, archetype]));

const UNKNOWN_SHAPE_LIGHT: Light = {
  status: "unknown",
  sentence: "Shape read needs the full roster.",
  detailKey: "shape",
};

const UNKNOWN_CHEMISTRY_LIGHT: Light = {
  status: "unknown",
  sentence: "Chemistry read needs the full roster.",
  detailKey: "chemistry",
};

export function resolveAuctionWhisperIdentityArchetype(
  team: Pick<Team, "mlbArchetypeKey">,
): SimArchetype | undefined {
  const historical = team.mlbArchetypeKey ? HISTORICAL_ARCHETYPE_BY_ID.get(team.mlbArchetypeKey) : undefined;
  return historical ? historicalToSimArchetype(historical) : undefined;
}

export function applyAuctionWhisperRosterCleanGates(
  scorecard: FiveLights,
  rosterPlayersClean: boolean,
): FiveLights {
  if (rosterPlayersClean) return scorecard;
  return {
    ...scorecard,
    shape: UNKNOWN_SHAPE_LIGHT,
    chemistry: UNKNOWN_CHEMISTRY_LIGHT,
  };
}

export function buildMarketBandPrioritiesByTeamId(leagueTeams: readonly Team[]): Map<string, BandPriorities> {
  const map = new Map<string, BandPriorities>();
  for (const team of leagueTeams) {
    const priorities = resolveClubBandPriorities(team);
    if (priorities) {
      map.set(team.id, priorities);
    }
  }
  return map;
}

export function computeBoardAutoAdvanceLine(input: {
  latestResultPlayerId: string | undefined;
  latestResultDisposition: AuctionResultDisposition | undefined;
  soldPosition: TaxonomyPosition | undefined;
  currentLotPlayerId: string | undefined;
  board: readonly BoardEntry[];
  boardRankOverrides: Team["boardRankOverrides"] | undefined;
  boardMeta: Record<string, { name?: string; positions?: string }>;
}): string | null {
  const {
    latestResultPlayerId,
    latestResultDisposition,
    soldPosition,
    currentLotPlayerId,
    board,
    boardRankOverrides,
    boardMeta,
  } = input;
  if (!latestResultPlayerId || !soldPosition) return null;
  if (latestResultDisposition !== "SOLD") return null;
  const positionOverride = boardRankOverrides?.byPosition?.[soldPosition];
  if (!positionOverride?.length) return null;
  const priorAvailableIds = new Set<string>([...board.map((entry) => entry.playerId), latestResultPlayerId]);
  const gmsEffectiveTopBeforeThisResolution = positionOverride.find((id) => priorAvailableIds.has(id));
  if (gmsEffectiveTopBeforeThisResolution !== latestResultPlayerId) return null;
  const promoted = materializeRankOrder(
    sortBoardEntriesForPosition(board, soldPosition, undefined),
    (entry) => entry.playerId,
    positionOverride,
  )[0];
  if (!promoted) return null;
  const rankLabel = positionOverride.indexOf(promoted.playerId) + 1;
  const promotedName = boardMeta[promoted.playerId]?.name ?? promoted.note ?? promoted.playerId;
  if (promoted.playerId === currentLotPlayerId) {
    return rankLabel > 0
      ? `On the block now: ${promotedName} — your #${rankLabel} at ${soldPosition}.`
      : `On the block now: ${promotedName} at ${soldPosition}.`;
  }
  return rankLabel > 0
    ? `Next up at ${soldPosition}: ${promotedName} — your #${rankLabel}.`
    : `Next up at ${soldPosition}: ${promotedName}.`;
}

export function applyLiveBoardRankOverlay(
  payload: RosterIntelligencePayload,
  overlay: { overrides: NonNullable<Team["boardRankOverrides"]> },
  latestResult: {
    latestResultPlayerId: string | undefined;
    latestResultDisposition: AuctionResultDisposition | undefined;
    soldPosition: TaxonomyPosition | undefined;
    currentLotPlayerId: string | undefined;
  },
): RosterIntelligencePayload & { boardRankOverrides?: Team["boardRankOverrides"] | null; nextUpLine?: string | null } {
  const overrideBoard = materializeRankOrder(
    payload.board ?? [],
    (entry) => entry.playerId,
    overlay.overrides.global,
  );
  const nextUpLine = computeBoardAutoAdvanceLine({
    latestResultPlayerId: latestResult.latestResultPlayerId,
    latestResultDisposition: latestResult.latestResultDisposition,
    soldPosition: latestResult.soldPosition,
    currentLotPlayerId: latestResult.currentLotPlayerId,
    board: overrideBoard,
    boardRankOverrides: overlay.overrides,
    boardMeta: {},
  });
  return Object.assign({}, payload, {
    board: overrideBoard,
    boardRankOverrides: overlay.overrides,
    nextUpLine,
  });
}
