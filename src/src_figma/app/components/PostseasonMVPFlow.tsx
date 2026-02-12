import { useState, useCallback } from "react";
import { Trophy, Star, Award, ArrowLeft, CheckCircle } from "lucide-react";

// --- Types ---

interface MVPCandidate {
  id: string;
  name: string;
  position: string;
  team: string;
  pWAR: number;
  playoffStats: {
    avg?: string;
    hr?: number;
    rbi?: number;
    era?: string;
    k?: number;
    w?: number;
  };
  ratings: Record<string, number>;
}

type CardState = "face-down" | "flipping" | "face-up";

interface PostseasonMVPFlowProps {
  candidates?: MVPCandidate[];
  onComplete: (selectedMVP: MVPCandidate, ratingBonuses: Record<string, number>) => void;
  onCancel: () => void;
}

// Empty fallback — populated from playoff game stats when available
const EMPTY_CANDIDATES: MVPCandidate[] = [];

// --- Medal Config ---

const MEDALS = [
  { label: "3RD PLACE", icon: "🥉", borderColor: "#CD7F32", bgColor: "rgba(205,127,50,0.15)" },
  { label: "2ND PLACE", icon: "🥈", borderColor: "#C0C0C0", bgColor: "rgba(192,192,192,0.15)" },
  { label: "1ST PLACE", icon: "🥇", borderColor: "#FFD700", bgColor: "rgba(255,215,0,0.15)" },
];

// --- Rating Bonus Calculator ---

function calculateRatingBonuses(player: MVPCandidate, totalBonus: number = 10): Record<string, number> {
  // Distribute +10 to lowest-rated categories
  const entries = Object.entries(player.ratings).sort(([, a], [, b]) => a - b);
  const bonuses: Record<string, number> = {};
  let remaining = totalBonus;

  for (const [key] of entries) {
    if (remaining <= 0) break;
    const bonus = Math.min(remaining, Math.ceil(totalBonus / entries.length));
    bonuses[key] = bonus;
    remaining -= bonus;
  }

  return bonuses;
}

// --- Component ---

export function PostseasonMVPFlow({
  candidates: providedCandidates,
  onComplete,
  onCancel,
}: PostseasonMVPFlowProps) {
  // Sort candidates by pWAR descending; display order: 3rd, 2nd, 1st
  const sortedCandidates = (providedCandidates || EMPTY_CANDIDATES)
    .sort((a, b) => b.pWAR - a.pWAR)
    .slice(0, 3);

  // Display order: 3rd (index 2), 2nd (index 1), 1st (index 0)
  const displayOrder = [sortedCandidates[2], sortedCandidates[1], sortedCandidates[0]].filter(Boolean);

  const [cardStates, setCardStates] = useState<CardState[]>(["face-down", "face-down", "face-down"]);
  const [selectedMVP, setSelectedMVP] = useState<MVPCandidate | null>(null);
  const [screen, setScreen] = useState<"reveal" | "confirmation">("reveal");

  const revealedCount = cardStates.filter(s => s === "face-up").length;

  const handleCardClick = useCallback((index: number) => {
    if (cardStates[index] !== "face-down") return;

    // Enforce reveal order: must reveal in sequence (3rd → 2nd → 1st)
    const expectedIndex = revealedCount;
    if (index !== expectedIndex) return;

    // Start flip animation
    setCardStates(prev => {
      const next = [...prev];
      next[index] = "flipping";
      return next;
    });

    // Complete flip after 600ms
    setTimeout(() => {
      setCardStates(prev => {
        const next = [...prev];
        next[index] = "face-up";
        return next;
      });
    }, 600);
  }, [cardStates, revealedCount]);

  const handleSelectMVP = (candidate: MVPCandidate) => {
    setSelectedMVP(candidate);
    setScreen("confirmation");
  };

  const handleConfirmMVP = () => {
    if (!selectedMVP) return;
    const bonuses = calculateRatingBonuses(selectedMVP);
    onComplete(selectedMVP, bonuses);
  };

  // --- Render: Card Reveal Screen ---
  if (screen === "reveal") {
    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8 w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <Trophy className="w-12 h-12 text-[#FFD700] mx-auto mb-3" />
            <h2 className="text-2xl text-[#E8E8D8] font-bold mb-2">POSTSEASON MVP</h2>
            <div className="text-sm text-[#E8E8D8]/70">Click cards to reveal candidates</div>
            <div className="text-xs text-[#5599FF] mt-2">Cards Revealed: {revealedCount}/3</div>
          </div>

          {/* Three Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {displayOrder.map((candidate, index) => {
              const medal = MEDALS[index];
              const state = cardStates[index];
              const isClickable = state === "face-down" && index === revealedCount;

              return (
                <div key={candidate.id} className="perspective-1000">
                  <button
                    onClick={() => handleCardClick(index)}
                    disabled={!isClickable}
                    className={`w-full transition-transform duration-600 ${
                      state === "flipping" ? "animate-pulse" : ""
                    } ${isClickable ? "cursor-pointer hover:scale-105" : "cursor-default"}`}
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    {state === "face-down" || state === "flipping" ? (
                      /* Face Down */
                      <div
                        className="bg-[#3D5A37] border-[4px] p-8 text-center min-h-[320px] flex flex-col items-center justify-center"
                        style={{ borderColor: medal.borderColor }}
                      >
                        <div className="text-4xl mb-4">{medal.icon}</div>
                        <div className="text-sm text-[#E8E8D8] font-bold mb-2">{medal.label}</div>
                        {state === "flipping" ? (
                          <div className="text-xs text-[#FFD700] animate-pulse">REVEALING...</div>
                        ) : isClickable ? (
                          <div className="text-xs text-[#5599FF]">CLICK TO REVEAL</div>
                        ) : (
                          <div className="text-xs text-[#E8E8D8]/30">REVEAL IN ORDER</div>
                        )}
                      </div>
                    ) : (
                      /* Face Up */
                      <div
                        className="bg-[#5A8352] border-[4px] p-6 text-center min-h-[320px]"
                        style={{ borderColor: medal.borderColor, backgroundColor: medal.bgColor }}
                      >
                        <div className="text-2xl mb-2">{medal.icon}</div>
                        <div className="text-lg text-[#E8E8D8] font-bold mb-1">{candidate.name}</div>
                        <div className="text-xs text-[#E8E8D8]/70 mb-3">
                          {candidate.position} │ {candidate.team}
                        </div>
                        <div className="text-lg text-[#FFD700] font-bold mb-3">
                          pWAR: {candidate.pWAR.toFixed(1)}
                        </div>

                        {/* Playoff Stats */}
                        <div className="bg-[#4A6844] p-3 mb-4 text-left space-y-1">
                          <div className="text-[10px] text-[#E8E8D8]/60 mb-1">PLAYOFF STATS</div>
                          {candidate.playoffStats.avg && (
                            <div className="text-xs text-[#E8E8D8]">AVG: {candidate.playoffStats.avg}</div>
                          )}
                          {candidate.playoffStats.hr !== undefined && (
                            <div className="text-xs text-[#E8E8D8]">HR: {candidate.playoffStats.hr}</div>
                          )}
                          {candidate.playoffStats.rbi !== undefined && (
                            <div className="text-xs text-[#E8E8D8]">RBI: {candidate.playoffStats.rbi}</div>
                          )}
                          {candidate.playoffStats.era && (
                            <div className="text-xs text-[#E8E8D8]">ERA: {candidate.playoffStats.era}</div>
                          )}
                          {candidate.playoffStats.k !== undefined && (
                            <div className="text-xs text-[#E8E8D8]">K: {candidate.playoffStats.k}</div>
                          )}
                          {candidate.playoffStats.w !== undefined && (
                            <div className="text-xs text-[#E8E8D8]">W: {candidate.playoffStats.w}</div>
                          )}
                        </div>

                        {/* Select Button (only for 1st place) */}
                        {index === 2 && revealedCount === 3 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSelectMVP(candidate); }}
                            className="bg-[#FFD700] border-[3px] border-[#CC9900] px-4 py-2 text-xs text-[#1A1A1A] font-bold hover:bg-[#CC9900] active:scale-95 transition-transform w-full"
                          >
                            Select as MVP
                          </button>
                        )}
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* All revealed — allow selecting any candidate */}
          {revealedCount === 3 && (
            <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4 mb-6">
              <div className="text-xs text-[#E8E8D8] mb-3 text-center">
                SELECT YOUR POSTSEASON MVP (click any revealed card's Select button below)
              </div>
              <div className="flex gap-3 justify-center">
                {displayOrder.map((candidate, index) => (
                  <button
                    key={candidate.id}
                    onClick={() => handleSelectMVP(candidate)}
                    className="bg-[#4A6844] border-[2px] border-[#E8E8D8]/30 px-4 py-2 text-xs text-[#E8E8D8] hover:border-[#FFD700] active:scale-95 transition-all"
                  >
                    {MEDALS[index].icon} {candidate.name} ({candidate.pWAR.toFixed(1)})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cancel */}
          <div className="flex justify-center">
            <button
              onClick={onCancel}
              className="text-xs text-[#E8E8D8]/50 hover:text-[#E8E8D8]/80"
            >
              Skip MVP Selection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Render: Confirmation Screen ---
  if (screen === "confirmation" && selectedMVP) {
    const bonuses = calculateRatingBonuses(selectedMVP);

    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
        <div className="max-w-lg mx-auto bg-[#6B9462] border-[5px] border-[#FFD700] p-8">
          <div className="text-center mb-6">
            <Award className="w-12 h-12 text-[#FFD700] mx-auto mb-3" />
            <h2 className="text-xl text-[#E8E8D8] font-bold">POSTSEASON MVP</h2>
          </div>

          {/* MVP Card */}
          <div className="bg-[#5A8352] border-[4px] border-[#FFD700] p-6 mb-6 text-center">
            <div className="text-3xl mb-2">🏆</div>
            <div className="text-xl text-[#E8E8D8] font-bold mb-1">{selectedMVP.name}</div>
            <div className="text-sm text-[#E8E8D8]/70 mb-2">
              {selectedMVP.position} │ {selectedMVP.team}
            </div>
            <div className="text-lg text-[#FFD700] font-bold">pWAR: {selectedMVP.pWAR.toFixed(1)}</div>
          </div>

          {/* Rating Bonus Distribution */}
          <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4 mb-6">
            <div className="text-xs text-[#E8E8D8] mb-3 text-center">
              RATING BONUS: +10 (distributed to lowest categories)
            </div>
            <div className="space-y-2">
              {Object.entries(bonuses).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-xs text-[#E8E8D8] capitalize">{key}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#E8E8D8]/60">{selectedMVP.ratings[key]}</span>
                    <span className="text-xs text-[#00DD00]">+{value}</span>
                    <span className="text-xs text-[#FFD700] font-bold">→ {selectedMVP.ratings[key] + value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setScreen("reveal")}
              className="bg-[#4A6844] border-[3px] border-[#3F5A3A] px-6 py-3 text-xs text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform flex items-center gap-2"
            >
              <ArrowLeft className="w-3 h-3" /> Back
            </button>
            <button
              onClick={handleConfirmMVP}
              className="bg-[#FFD700] border-[3px] border-[#CC9900] px-8 py-3 text-xs text-[#1A1A1A] font-bold hover:bg-[#CC9900] active:scale-95 transition-transform flex items-center gap-2"
            >
              <CheckCircle className="w-3 h-3" /> Confirm MVP
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
