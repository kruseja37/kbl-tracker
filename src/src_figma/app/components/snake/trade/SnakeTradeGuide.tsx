import { useLayoutEffect, useRef, useState } from 'react';
import type { PickValue } from '../../../../../engines/leagueConstruction';
import { TradePackageCard, type SnakeTradeGuideTeam } from './TradePackageCard';
import type { AskedPickGuideResult, SnakeTradeGuidePrefill } from './tradeGuideModel';
import type { SnakeGuidePackage } from '../../../../../engines/snakeGuideTrade';
import type { SnakeOpenTradeOffer } from '../../../../../utils/leagueBuilderStorage';

export function SnakeTradeGuide(props: {
  teams: readonly SnakeTradeGuideTeam[];
  fixedBuyerTeamId?: string | null;
  pickValueChart: readonly PickValue[];
  sessionRevision: number;
  showHelp?: boolean;
  onAsk: (buyerTeamId: string, targetPick: number) => AskedPickGuideResult | Promise<AskedPickGuideResult>;
  onPost?: (proposal: SnakeGuidePackage) => void | Promise<void>;
  openOffers?: readonly SnakeOpenTradeOffer[];
  onNod?: (offerId: string, teamId: string) => void | Promise<void>;
  onClose?: (offerId: string, action: 'WITHDRAWN' | 'DECLINED') => void | Promise<void>;
  onFailure?: () => void | Promise<void>;
  prefill?: SnakeTradeGuidePrefill | null;
  /** Private render identity only. Never leaves this component or enters a guide request. */
  privateScopeKey?: string | null;
}) {
  const validPrefill = props.prefill
    && props.prefill.result.proposal.sessionRevision === props.sessionRevision
    && (!props.fixedBuyerTeamId || props.prefill.result.proposal.buyerTeamId === props.fixedBuyerTeamId)
      ? props.prefill
      : null;
  const firstTeamId = props.teams[0]?.id ?? '';
  const contextKey = `${props.privateScopeKey ?? ''}|${props.sessionRevision}|${props.fixedBuyerTeamId ?? ''}|${validPrefill?.key ?? 'manual'}`;
  const contextRef = useRef(contextKey);
  const operationGenerationRef = useRef(0);
  if (contextRef.current !== contextKey) {
    contextRef.current = contextKey;
    operationGenerationRef.current += 1;
  }
  const [buyerTeamId, setBuyerTeamId] = useState(props.fixedBuyerTeamId ?? firstTeamId);
  const [targetPick, setTargetPick] = useState('');
  const [answer, setAnswer] = useState<AskedPickGuideResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [stateContextKey, setStateContextKey] = useState(contextKey);

  useLayoutEffect(() => {
    setBuyerTeamId(props.fixedBuyerTeamId ?? firstTeamId);
    setTargetPick(validPrefill ? String(validPrefill.result.proposal.targetPick) : '');
    setAnswer(validPrefill?.result ?? null);
    setChecking(false);
    setStatus(null);
    setStateContextKey(contextKey);
  }, [contextKey, firstTeamId, props.fixedBuyerTeamId, validPrefill]);

  const contextCurrent = stateContextKey === contextKey;
  const shownBuyerTeamId = contextCurrent ? buyerTeamId : props.fixedBuyerTeamId ?? firstTeamId;
  const shownTargetPick = contextCurrent ? targetPick : '';
  const shownAnswer = contextCurrent ? answer : null;
  const shownStatus = contextCurrent ? status : null;

  const beginOperation = () => ({ contextKey, generation: ++operationGenerationRef.current });
  const operationIsCurrent = (operation: { contextKey: string; generation: number }) => (
    contextRef.current === operation.contextKey
    && operationGenerationRef.current === operation.generation
  );
  const cancelOperations = () => {
    operationGenerationRef.current += 1;
    setChecking(false);
    setStatus(null);
  };

  const askedPick = Number(shownTargetPick);
  const validPick = Number.isInteger(askedPick) && props.pickValueChart.some((row) => row.pick === askedPick);
  const reportFailure = async (
    cause: unknown,
    operation: { contextKey: string; generation: number },
  ) => {
    if (!operationIsCurrent(operation)) return;
    setStatus((cause instanceof Error ? cause.message : String(cause)).toUpperCase());
    try {
      await props.onFailure?.();
    } catch {
      // The original trade failure remains the actionable status.
    }
  };
  const ask = async () => {
    if (!shownBuyerTeamId || !validPick) return;
    const operation = beginOperation();
    setChecking(true);
    setStatus(null);
    try {
      const result = await props.onAsk(shownBuyerTeamId, askedPick);
      if (operationIsCurrent(operation)) setAnswer(result);
    } catch (cause) {
      await reportFailure(cause, operation);
    } finally {
      if (operationIsCurrent(operation)) setChecking(false);
    }
  };
  const post = async () => {
    if (!shownAnswer?.proposal || !props.onPost) return;
    const operation = beginOperation();
    setChecking(true);
    try {
      await props.onPost(shownAnswer.proposal);
      if (operationIsCurrent(operation)) {
        setStatus('THE OFFER IS POSTED.');
        setAnswer(null);
      }
    } catch (cause) {
      await reportFailure(cause, operation);
    } finally {
      if (operationIsCurrent(operation)) setChecking(false);
    }
  };
  const actOnOffer = async (action: () => void | Promise<void>, success: string) => {
    const operation = beginOperation();
    setChecking(true);
    setStatus(null);
    try {
      await action();
      if (operationIsCurrent(operation)) setStatus(success);
    } catch (cause) {
      await reportFailure(cause, operation);
    } finally {
      if (operationIsCurrent(operation)) setChecking(false);
    }
  };

  return (
    <section aria-label="The trade guide">
      <p className="text-xs font-bold tracking-[0.18em] text-[var(--ballpark-brass)]">POSTED PICK PRICES</p>
      <h2 className="ballpark-title mt-1 text-2xl">THE GUIDE</h2>
      {props.showHelp ? <p className="mt-2 border-l-4 border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] px-3 py-2 text-xs">CHOOSE A PICK. THE GUIDE CHECKS THE PRICE AND MAKES SURE BOTH CLUBS CAN STILL FINISH THEIR TEAMS.</p> : null}

      {!props.fixedBuyerTeamId && (
        <label className="mt-4 block text-sm font-bold">
          YOUR CLUB
          <select className="mt-1 block w-full border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-2" value={shownBuyerTeamId} onChange={(event) => { cancelOperations(); setBuyerTeamId(event.target.value); setAnswer(null); }}>
            {props.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
        </label>
      )}

      <label className="mt-4 block text-sm font-bold">
        WHAT WOULD IT COST TO REACH PICK N?
        <input
          aria-label="WHAT WOULD IT COST TO REACH PICK N?"
          className="mt-1 block w-full border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-2"
          type="number"
          min={1}
          max={props.pickValueChart.at(-1)?.pick ?? 1}
          value={shownTargetPick}
          onChange={(event) => { cancelOperations(); setTargetPick(event.target.value); setAnswer(null); }}
        />
      </label>
      <button className="ballpark-press-button ballpark-press-md ballpark-press-gold mt-3" disabled={!validPick || checking} onClick={() => void ask()}>
        {validPick ? `CHECK PICK ${askedPick}` : 'ENTER A PICK'}
      </button>

      {shownAnswer && <>
        <TradePackageCard answer={shownAnswer} teams={props.teams} />
        {shownAnswer.proposal && props.onPost ? <button className="ballpark-press-button ballpark-press-md ballpark-press-gold mt-3" disabled={checking} onClick={() => void post()}>POST OFFER</button> : null}
      </>}
      {(props.openOffers?.length ?? 0) > 0 ? <div className="mt-4 grid gap-2">
        {props.openOffers?.map((offer) => {
          const ownTeamId = props.fixedBuyerTeamId;
          const ownNod = ownTeamId === offer.buyerTeamId ? offer.buyerNod : offer.sellerNod;
          return <div key={offer.id} className="border-4 border-[var(--ballpark-panel-border)] p-3">
            <p className="font-bold">{offer.buyerTeamId === ownTeamId ? 'YOU RECEIVE' : 'THEY RECEIVE'} {offer.receivePickNumbers.map((pick) => `#${pick}`).join(' + ')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ownTeamId && props.onNod ? <button className="ballpark-press-button ballpark-press-sm ballpark-press-gold" disabled={checking || Boolean(ownNod)} onClick={() => void actOnOffer(() => props.onNod!(offer.id, ownTeamId), 'YOUR NOD IS RECORDED.')}>{ownNod ? 'YOU NODDED' : 'NOD'}</button> : null}
              {ownTeamId && props.onClose ? <button className="ballpark-press-button ballpark-press-sm ballpark-press-default" disabled={checking} onClick={() => void actOnOffer(() => props.onClose!(offer.id, ownTeamId === offer.buyerTeamId ? 'WITHDRAWN' : 'DECLINED'), 'THE OFFER IS CLOSED.')}>{ownTeamId === offer.buyerTeamId ? 'WITHDRAW' : 'DECLINE'}</button> : null}
            </div>
          </div>;
        })}
      </div> : null}
      {shownStatus ? <p className="mt-3 font-bold" role="status">{shownStatus}</p> : null}

      <details className="mt-5 border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-3">
        <summary className="cursor-pointer font-bold">FULL POSTED PRICE CHART</summary>
        <div className="mt-3 grid max-h-72 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
          {props.pickValueChart.map((row) => (
            <div key={row.pick} className="flex justify-between border-2 border-[var(--ballpark-panel-border)] p-2 text-sm">
              <span className="font-bold">PICK {row.pick}</span>
              <span>${Math.round(row.value).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
