import { useState } from "react";
import { useOffseasonState } from "../../hooks/useOffseasonState";

interface ContractionExpansionFlowProps {
  seasonNumber?: number;
  seasonId?: string;
  franchiseId?: string;
  onComplete: () => void;
}

export function ContractionExpansionFlow({
  seasonNumber = 1,
  seasonId = `season-${seasonNumber}`,
  franchiseId,
  onComplete,
}: ContractionExpansionFlowProps) {
  const { completeCurrentPhase } = useOffseasonState(seasonId, seasonNumber, { franchiseId });
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSkipPhase = async () => {
    setSkipping(true);
    setError(null);
    try {
      await completeCurrentPhase();
      onComplete();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to skip phase";
      setError(message);
      setSkipping(false);
    }
  };

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-2xl mx-auto space-y-6 py-12">
        {/* Header */}
        <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6 text-center">
          <div className="text-2xl text-[#E8E8D8] mb-2">Expansion Boundary</div>
          <div className="text-sm text-[#E8E8D8]/60">Season {seasonNumber} Offseason</div>
        </div>

        {/* Coming Soon */}
        <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-8 text-center">
          <div className="text-lg text-[#E8E8D8] mb-4">Deferred in Mode 2 v1</div>
          <div className="text-sm text-[#E8E8D8]/60 max-w-md mx-auto leading-relaxed">
            League expansion is not active yet. This screen is skip-only and does not mutate franchise, roster, or League Builder data.
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-[#DD0000] border-[5px] border-[#8B0000] p-4 text-center">
            <div className="text-sm text-[#E8E8D8]">{error}</div>
          </div>
        )}

        {/* Skip Button */}
        <button
          onClick={handleSkipPhase}
          disabled={skipping}
          className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
        >
          {skipping ? "Skipping..." : "Skip Phase →"}
        </button>
      </div>
    </div>
  );
}
