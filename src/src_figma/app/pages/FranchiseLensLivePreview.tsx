/**
 * FranchiseLensLivePreview — the REAL-DATA franchise-lens hub, behind the parallel route
 * /__preview/franchise-lens/:franchiseId (non-destructive; the live /franchise/:franchiseId
 * route and the mock /__preview/franchise-lens route are untouched).
 *
 * This is the thin page wrapper: read the franchiseId from the URL, run the real-data adapter
 * hook, and render the unchanged pure-view FranchiseLensHub. Seed a demo franchise via
 * /__preview/franchise-lens-seed (dev only) to get a reproducible :franchiseId, or point this
 * at any real save's franchiseId. See FRANCHISE_LENS_REALDATA_ADAPTER_PLAN.md.
 */
import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

import { FranchiseLensHub } from "../components/franchise/FranchiseLensHub";
import { useFranchiseLensData } from "../../hooks/useFranchiseLensData";

export function FranchiseLensLivePreview() {
  const { franchiseId } = useParams<{ franchiseId: string }>();
  const [searchParams] = useSearchParams();
  const seasonNumber = Number(searchParams.get("season") ?? "1") || 1;
  const [viewedTeamId, setViewedTeamId] = useState<string | undefined>(undefined);

  const { teams, active, hub, isLoading, error, callUp, sendDown, executeTrade } = useFranchiseLensData(
    franchiseId,
    seasonNumber,
    viewedTeamId,
  );

  if (error) {
    return (
      <div className="fen-root">
        <div className="fen-wrap" style={{ padding: 24 }} data-testid="franchise-lens-error">
          Could not load franchise <strong>{franchiseId}</strong>: {error}
        </div>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="fen-root">
        <div className="fen-wrap" style={{ padding: 24 }} data-testid="franchise-lens-loading">
          {isLoading
            ? "Loading the ballpark…"
            : `No franchise data found for "${franchiseId}". Seed the demo at /__preview/franchise-lens-seed.`}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="franchise-lens-live">
      <FranchiseLensHub
        teams={teams}
        active={active}
        hub={hub}
        onSelectTeam={setViewedTeamId}
        actions={{ onCallUp: callUp, onSendDown: sendDown, onExecuteTrade: executeTrade }}
      />
    </div>
  );
}

export default FranchiseLensLivePreview;
