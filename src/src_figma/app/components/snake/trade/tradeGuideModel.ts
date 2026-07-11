import type { PickValue } from '../../../../../engines/leagueConstruction';
import {
  executeSnakeGuidePackage,
  searchSnakeGuidePackage,
  type SnakeGuidePackage,
} from '../../../../../engines/snakeGuideTrade';
import type { SimultaneousSnakeSeatingInput } from '../../../../../engines/snakeSeatingProof';
import type { LeagueBuilderMlbDraftSession } from '../../../../../utils/leagueBuilderStorage';

export interface SnakeTradeGuideContext {
  session: LeagueBuilderMlbDraftSession;
  pickValueChart: readonly PickValue[];
  seatingProofInput: SimultaneousSnakeSeatingInput;
}

export interface NextPickMove {
  teamId: string;
  before: number | null;
  after: number | null;
}

export interface AskedPickGuideResult {
  message: string;
  proposal: SnakeGuidePackage | null;
  nextPickMoves: NextPickMove[];
}

export interface SnakeTradeReceipt {
  teamId: string;
  text: string;
}

export interface ExecutedAskedPickTrade {
  valid: boolean;
  message: string;
  session: LeagueBuilderMlbDraftSession | null;
  livePickMoved: boolean;
  receipts: SnakeTradeReceipt[];
}

function nextOwnedPick(session: LeagueBuilderMlbDraftSession, teamId: string): number | null {
  return session.pickOrder
    .slice(session.currentPickIndex)
    .find((slot) => slot.teamId === teamId)?.pick ?? null;
}

function projectedNextPickMoves(
  session: LeagueBuilderMlbDraftSession,
  proposal: SnakeGuidePackage,
): NextPickMove[] {
  const offered = new Set(proposal.offerPickNumbers);
  const received = new Set(proposal.receivePickNumbers);
  const projected: LeagueBuilderMlbDraftSession = {
    ...session,
    pickOrder: session.pickOrder.map((slot) => {
      if (offered.has(slot.pick)) return { ...slot, teamId: proposal.sellerTeamId };
      if (received.has(slot.pick)) return { ...slot, teamId: proposal.buyerTeamId };
      return slot;
    }),
  };
  return [proposal.buyerTeamId, proposal.sellerTeamId].map((teamId) => ({
    teamId,
    before: nextOwnedPick(session, teamId),
    after: nextOwnedPick(projected, teamId),
  }));
}

/** Answers exactly one GM-selected pick. It never enumerates, compares, or ranks destinations. */
export function guideForAskedPick(
  input: SnakeTradeGuideContext & { buyerTeamId: string; targetPick: number },
): AskedPickGuideResult {
  const result = searchSnakeGuidePackage(input);
  return {
    message: result.message,
    proposal: result.package,
    nextPickMoves: result.package ? projectedNextPickMoves(input.session, result.package) : [],
  };
}

function receiptText(input: {
  give: readonly number[];
  receive: readonly number[];
  nextPick: number | null;
}): string {
  return `YOU TRADED PICKS ${input.give.join('+')} FOR ${input.receive.join('+')} — YOUR NEXT PICK: ${input.nextPick === null ? 'NONE' : `#${input.nextPick}`}.`;
}

/** Revalidates at the current revision, executes through S1a, and emits fact-only desk receipts. */
export function executeAskedPickTrade(
  input: SnakeTradeGuideContext & { proposal: SnakeGuidePackage },
): ExecutedAskedPickTrade {
  const liveOwnerBefore = input.session.pickOrder[input.session.currentPickIndex]?.teamId ?? null;
  const result = executeSnakeGuidePackage(input);
  if (!result.valid || !result.proposedSession) {
    return {
      valid: false,
      message: result.message,
      session: null,
      livePickMoved: false,
      receipts: [],
    };
  }
  const moves = projectedNextPickMoves(input.session, input.proposal);
  const buyerMove = moves.find((move) => move.teamId === input.proposal.buyerTeamId);
  const sellerMove = moves.find((move) => move.teamId === input.proposal.sellerTeamId);
  const liveOwnerAfter = result.proposedSession.pickOrder[result.proposedSession.currentPickIndex]?.teamId ?? null;
  return {
    valid: true,
    message: result.message,
    session: result.proposedSession,
    livePickMoved: liveOwnerBefore !== liveOwnerAfter,
    receipts: [
      {
        teamId: input.proposal.buyerTeamId,
        text: receiptText({
          give: input.proposal.offerPickNumbers,
          receive: input.proposal.receivePickNumbers,
          nextPick: buyerMove?.after ?? null,
        }),
      },
      {
        teamId: input.proposal.sellerTeamId,
        text: receiptText({
          give: input.proposal.receivePickNumbers,
          receive: input.proposal.offerPickNumbers,
          nextPick: sellerMove?.after ?? null,
        }),
      },
    ],
  };
}
