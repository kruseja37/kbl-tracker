import { useEffect, useMemo, useState } from "react";
import { MLB_AUCTION_SEASON } from "../../../utils/leagueBuilderAuctionPipeline";
import {
  createFarmAuctionSessionId,
  getAuctionSession,
  getAuctionSessionById,
} from "../../../utils/leagueBuilderStorage";

export const SAVED_AUCTION_RECORD_LOCK_MESSAGE =
  "A saved auction is in progress. Resume that draft before changing League Builder records.";
export const CHECKING_SAVED_AUCTION_MESSAGE =
  "Checking for a saved auction before allowing League Builder changes.";
export const SAVED_AUCTION_LOOKUP_ERROR_MESSAGE =
  "Could not confirm whether a saved auction exists. Refresh before changing League Builder records.";

export function isSavedAuctionMutationGuardMessage(message: string | null | undefined): boolean {
  return (
    message === SAVED_AUCTION_RECORD_LOCK_MESSAGE ||
    message === CHECKING_SAVED_AUCTION_MESSAGE ||
    message === SAVED_AUCTION_LOOKUP_ERROR_MESSAGE
  );
}

export function useSavedAuctionMutationGuard(leagueIds: Array<string | null | undefined>) {
  const leagueKey = useMemo(
    () => [...new Set(leagueIds.filter((leagueId): leagueId is string => Boolean(leagueId)))].sort().join("|"),
    [leagueIds],
  );
  const resolvedLeagueIds = useMemo(
    () => (leagueKey ? leagueKey.split("|") : []),
    [leagueKey],
  );
  const [checked, setChecked] = useState(resolvedLeagueIds.length === 0);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lockedLeagueIds, setLockedLeagueIds] = useState<string[]>([]);
  const [lockedPlayerIds, setLockedPlayerIds] = useState<string[]>([]);

  useEffect(() => {
      if (resolvedLeagueIds.length === 0) {
        setChecked(true);
        setLookupError(null);
        setLockedLeagueIds([]);
        setLockedPlayerIds([]);
        return;
      }

    let cancelled = false;
      setChecked(false);
      setLookupError(null);
      setLockedLeagueIds([]);
      setLockedPlayerIds([]);

    void Promise.all(
      resolvedLeagueIds.flatMap((leagueId) => [
        (async () => ({
          leagueId,
          row: await getAuctionSession(leagueId, MLB_AUCTION_SEASON),
        }))(),
        (async () => ({
          leagueId,
          row: await getAuctionSessionById(createFarmAuctionSessionId(leagueId, 1)),
        }))(),
      ]),
    )
      .then((rows) => {
        if (cancelled) return;
        const activeRows = rows.filter(({ row }) => row && row.session.state !== "AUCTION_COMPLETE");
        setLockedLeagueIds(activeRows.map(({ leagueId }) => leagueId));
        setLockedPlayerIds(
          Array.from(
            new Set(
              activeRows.flatMap(({ row }) => Object.keys(row?.session.players ?? {})),
            ),
          ),
        );
        setLookupError(null);
        setChecked(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLockedLeagueIds([]);
        setLockedPlayerIds([]);
        setLookupError(SAVED_AUCTION_LOOKUP_ERROR_MESSAGE);
        setChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [resolvedLeagueIds]);

  const message = checked
    ? lookupError ?? (lockedLeagueIds.length > 0 ? SAVED_AUCTION_RECORD_LOCK_MESSAGE : null)
    : CHECKING_SAVED_AUCTION_MESSAGE;

  return {
    blocked: !checked || Boolean(lookupError) || lockedLeagueIds.length > 0,
    checked,
    lockedLeagueIds,
    lockedPlayerIds,
    lookupError,
    message,
  };
}
