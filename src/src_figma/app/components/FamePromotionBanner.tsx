import { Loader2 } from "lucide-react";

import { type FameTier } from "../../../types/reporter";
import { FamePip } from "./FamePip";
import { formatFameValue } from "../engines/fameIntegration";
import {
  formatPromotionLabel,
  type FamePromotionCandidate,
} from "../engines/famePromotion";

interface FamePromotionBannerProps {
  candidates: FamePromotionCandidate[];
  pendingPlayerId?: string | null;
  onAccept: (candidate: FamePromotionCandidate) => void;
  onDismiss: (candidate: FamePromotionCandidate) => void;
}

function TierLabel({
  tier,
  accent,
}: {
  tier: FameTier;
  accent: string;
}) {
  return (
    <div className="inline-flex items-center gap-3 border-[3px] border-[#556B55] bg-[#111814] px-3 py-2">
      <FamePip size="sm" tier={tier} />
      <span className="text-[9px] uppercase tracking-[0.16em]" style={{ color: accent }}>
        {formatPromotionLabel(tier)}
      </span>
    </div>
  );
}

export function FamePromotionBanner({
  candidates,
  pendingPlayerId = null,
  onAccept,
  onDismiss,
}: FamePromotionBannerProps) {
  if (candidates.length === 0) {
    return null;
  }

  return (
    <section
      className="bg-[#1f2b21] border-2 border-[#C4A853] p-4 mb-4 rounded-sm shadow-[0_0_0_1px_rgba(196,168,83,0.2)]"
      data-testid="fame-promotion-banner"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#C4A853]/30 pb-3">
        <div>
          <div className="text-xs text-[#F2C041] tracking-[0.3em] font-bold">
            FAME PROMOTION
          </div>
          <div className="mt-2 text-[9px] uppercase tracking-[0.18em] text-[#CBB89C] sm:text-[10px]">
            Run-total Fame crossed a new editorial tier threshold
          </div>
        </div>
        <div className="text-[9px] uppercase tracking-[0.18em] text-[#F0DFC2] sm:text-[10px]">
          Elimination
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {candidates.map((candidate) => {
          const isPending = pendingPlayerId === candidate.playerId;

          return (
            <article
              key={`${candidate.playerId}-${candidate.targetTier}`}
              className="border-[4px] border-[#556B55] bg-[#18211A] p-4"
              data-testid={`fame-promotion-card-${candidate.playerId}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div
                    className="text-sm text-[#E8E8D8]"
                    style={{ fontFamily: "'Tox Typewriter', monospace" }}
                  >
                    {candidate.playerName}
                  </div>
                  <div className="mt-2 text-[9px] uppercase tracking-[0.16em] text-[#A8B8A2] sm:text-[10px]">
                    {candidate.teamName} • Run Fame {formatFameValue(candidate.runTotalFame)} • {candidate.gamesPlayed} GP
                  </div>
                </div>

                <div className="text-[8px] uppercase tracking-[0.18em] text-[#F0DFC2]">
                  Threshold crossed
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-[8px] uppercase tracking-[0.16em] text-[#A8B8A2]">
                <TierLabel tier={candidate.currentTier} accent="#CBB89C" />
                <span className="text-[#F2C041]">→</span>
                <TierLabel tier={candidate.targetTier} accent="#F2C041" />
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => onAccept(candidate)}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 border-[3px] border-[#C4A853] bg-[#283828] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[#F5E8CF] transition hover:bg-[#314437] disabled:opacity-70"
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Accept
                </button>

                <button
                  type="button"
                  onClick={() => onDismiss(candidate)}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 border-[3px] border-[#556B55] bg-[#111814] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[#CBB89C] transition hover:border-[#A8B8A2] hover:text-[#F0DFC2] disabled:opacity-70"
                >
                  Dismiss
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default FamePromotionBanner;
