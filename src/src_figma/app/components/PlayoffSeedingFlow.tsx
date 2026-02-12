/**
 * PlayoffSeedingFlow (MAJ-B8-009)
 *
 * Playoff Mode Entry + Seeding screens per SEASON_SETUP_FIGMA_SPEC.md §SS-F008/F009.
 *
 * Features:
 *   - 5-step progress indicator (League → Playoffs → Teams → Seeding → Confirm)
 *   - Auto-seed modes: Random, By Grade, Manual
 *   - Drag-to-reorder seeding list
 *   - Bracket preview panel
 *   - Home field advantage info
 */

import { useState, useMemo, useCallback } from "react";
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Trophy, Shuffle, BarChart, Hand, CheckCircle } from "lucide-react";

// --- Types ---

interface PlayoffTeamSeed {
  teamId: string;
  teamName: string;
  shortName: string;
  grade: string;
  record: { wins: number; losses: number };
  seed: number;
  primaryColor: string;
}

type SeedMethod = "random" | "by-grade" | "manual";
type PlayoffScreen = "entry" | "seeding" | "confirm";

interface PlayoffSeedingFlowProps {
  teams: PlayoffTeamSeed[];
  teamsQualifying?: number;
  onComplete: (seededTeams: PlayoffTeamSeed[]) => void;
  onCancel: () => void;
}

// --- Grade ordering for auto-seed by grade ---
const GRADE_ORDER: Record<string, number> = {
  S: 0, "A+": 1, A: 2, "A-": 3, "B+": 4, B: 5, "B-": 6,
  "C+": 7, C: 8, "C-": 9, "D+": 10, D: 11,
};

function gradeRank(grade: string): number {
  return GRADE_ORDER[grade] ?? 99;
}

// Empty teams fallback — populated from standings when available
const EMPTY_PLAYOFF_TEAMS: PlayoffTeamSeed[] = [];

// --- Step indicator ---
const STEPS = ["League", "Playoffs", "Teams", "Seeding", "Confirm"];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-1 mb-6">
      {STEPS.map((label, i) => {
        const isDone = i < currentStep;
        const isCurrent = i === currentStep;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                  isDone
                    ? "bg-[#FFD700] border-[#CC9900] text-[#1A1A1A]"
                    : isCurrent
                    ? "bg-[#5599FF] border-[#3377DD] text-white"
                    : "bg-[#4A6844] border-[#5A8352] text-[#E8E8D8]/50"
                }`}
              >
                {isDone ? "✓" : i + 1}
              </div>
              <div className={`text-[9px] mt-1 ${isCurrent ? "text-[#5599FF]" : "text-[#E8E8D8]/50"}`}>
                {label}
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-0.5 mx-1 ${i < currentStep ? "bg-[#FFD700]" : "bg-[#E8E8D8]/20"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- Bracket Preview ---
function BracketPreview({ teams }: { teams: PlayoffTeamSeed[] }) {
  const count = teams.length;
  // Show first round matchups: 1v8, 4v5, 2v7, 3v6 (standard bracket)
  const matchups: [number, number][] =
    count >= 8
      ? [[0, 7], [3, 4], [1, 6], [2, 5]]
      : count >= 4
      ? [[0, 3], [1, 2]]
      : [[0, 1]];

  return (
    <div className="space-y-2">
      <div className="text-xs text-[#E8E8D8]/70 mb-2">BRACKET PREVIEW</div>
      {matchups.map(([a, b], i) => {
        const teamA = teams[a];
        const teamB = teams[b];
        return (
          <div key={i} className="bg-[#4A6844] border-[2px] border-[#5A8352] p-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[#FFD700] font-bold">#{teamA?.seed || "?"}</span>
                <span className="text-[#E8E8D8]">{teamA?.shortName || "?"}</span>
              </div>
              <span className="text-[#E8E8D8]/40">vs</span>
              <div className="flex items-center gap-2">
                <span className="text-[#E8E8D8]">{teamB?.shortName || "?"}</span>
                <span className="text-[#FFD700] font-bold">#{teamB?.seed || "?"}</span>
              </div>
            </div>
          </div>
        );
      })}
      <div className="text-[10px] text-[#E8E8D8]/50 text-center mt-2">
        Higher seeds have home field advantage
      </div>
    </div>
  );
}

// --- Component ---

export function PlayoffSeedingFlow({
  teams: providedTeams,
  teamsQualifying = 8,
  onComplete,
  onCancel,
}: PlayoffSeedingFlowProps) {
  const initialTeams = (providedTeams.length > 0 ? providedTeams : EMPTY_PLAYOFF_TEAMS)
    .slice(0, teamsQualifying)
    .map((t, i) => ({ ...t, seed: i + 1 }));

  const [screen, setScreen] = useState<PlayoffScreen>("entry");
  const [seededTeams, setSeededTeams] = useState<PlayoffTeamSeed[]>(initialTeams);
  const [seedMethod, setSeedMethod] = useState<SeedMethod>("by-grade");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Auto-seed methods
  const seedByGrade = useCallback(() => {
    const sorted = [...seededTeams].sort((a, b) => {
      const gDiff = gradeRank(a.grade) - gradeRank(b.grade);
      if (gDiff !== 0) return gDiff;
      return b.record.wins - a.record.wins;
    });
    setSeededTeams(sorted.map((t, i) => ({ ...t, seed: i + 1 })));
    setSeedMethod("by-grade");
  }, [seededTeams]);

  const seedRandom = useCallback(() => {
    const shuffled = [...seededTeams];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setSeededTeams(shuffled.map((t, i) => ({ ...t, seed: i + 1 })));
    setSeedMethod("random");
  }, [seededTeams]);

  const setManual = () => {
    setSeedMethod("manual");
  };

  // Swap adjacent
  const swapTeams = (i: number, j: number) => {
    const next = [...seededTeams];
    [next[i], next[j]] = [next[j], next[i]];
    setSeededTeams(next.map((t, idx) => ({ ...t, seed: idx + 1 })));
  };

  // Drag-drop reorder
  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); setDragOverIndex(index); };
  const handleDrop = (index: number) => {
    if (dragIndex !== null && dragIndex !== index) {
      const next = [...seededTeams];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(index, 0, moved);
      setSeededTeams(next.map((t, i) => ({ ...t, seed: i + 1 })));
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => { setDragIndex(null); setDragOverIndex(null); };

  // --- Entry Screen ---
  if (screen === "entry") {
    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center overflow-y-auto">
        <div className="max-w-lg mx-auto p-8 w-full">
          <StepIndicator currentStep={3} />

          <div className="text-center mb-6">
            <Trophy className="w-10 h-10 text-[#FFD700] mx-auto mb-3" />
            <h2 className="text-xl text-[#E8E8D8] font-bold">PLAYOFF MODE</h2>
            <div className="text-sm text-[#E8E8D8]/70 mt-1">
              {seededTeams.length} teams qualifying for the playoffs
            </div>
          </div>

          <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-6 mb-6">
            <div className="text-sm text-[#E8E8D8] mb-4">QUALIFYING TEAMS</div>
            <div className="space-y-2">
              {seededTeams.map((team) => (
                <div key={team.teamId} className="bg-[#4A6844] border-[2px] border-[#5A8352] p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-white font-bold"
                      style={{ backgroundColor: team.primaryColor }}
                    >
                      {team.shortName.slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm text-[#E8E8D8]">{team.teamName}</div>
                      <div className="text-xs text-[#E8E8D8]/60">{team.record.wins}-{team.record.losses}</div>
                    </div>
                  </div>
                  <span className="text-xs text-[#FFD700] font-bold">{team.grade}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={onCancel}
              className="bg-[#4A6844] border-[3px] border-[#3F5A3A] px-6 py-3 text-xs text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform flex items-center gap-2"
            >
              <ArrowLeft className="w-3 h-3" /> Cancel
            </button>
            <button
              onClick={() => setScreen("seeding")}
              className="bg-[#5599FF] border-[3px] border-[#3377DD] px-8 py-3 text-xs text-white font-bold hover:bg-[#3377DD] active:scale-95 transition-transform flex items-center gap-2"
            >
              Set Seeding <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Seeding Screen ---
  if (screen === "seeding") {
    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8 w-full">
          <StepIndicator currentStep={3} />

          <div className="text-center mb-4">
            <h2 className="text-xl text-[#E8E8D8] font-bold">SET PLAYOFF SEEDING</h2>
            <div className="text-xs text-[#E8E8D8]/60 mt-1">Drag rows or use arrows to reorder</div>
          </div>

          {/* Auto-seed buttons */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <button
              onClick={seedRandom}
              className={`flex items-center gap-2 px-4 py-2 text-xs border-[2px] active:scale-95 transition-all ${
                seedMethod === "random" ? "bg-[#FFD700]/20 border-[#FFD700] text-[#FFD700]" : "bg-[#4A6844] border-[#5A8352] text-[#E8E8D8]"
              }`}
            >
              <Shuffle className="w-3 h-3" /> Random
            </button>
            <button
              onClick={seedByGrade}
              className={`flex items-center gap-2 px-4 py-2 text-xs border-[2px] active:scale-95 transition-all ${
                seedMethod === "by-grade" ? "bg-[#FFD700]/20 border-[#FFD700] text-[#FFD700]" : "bg-[#4A6844] border-[#5A8352] text-[#E8E8D8]"
              }`}
            >
              <BarChart className="w-3 h-3" /> By Grade
            </button>
            <button
              onClick={setManual}
              className={`flex items-center gap-2 px-4 py-2 text-xs border-[2px] active:scale-95 transition-all ${
                seedMethod === "manual" ? "bg-[#FFD700]/20 border-[#FFD700] text-[#FFD700]" : "bg-[#4A6844] border-[#5A8352] text-[#E8E8D8]"
              }`}
            >
              <Hand className="w-3 h-3" /> Manual
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Left: Seeding List */}
            <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-4">
              <div className="text-sm text-[#E8E8D8] mb-3">SEEDING ORDER</div>
              <div className="space-y-1">
                {seededTeams.map((team, index) => {
                  const isDragging = dragIndex === index;
                  const isDragOver = dragOverIndex === index && dragIndex !== index;
                  return (
                    <div
                      key={team.teamId}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={() => handleDrop(index)}
                      onDragEnd={handleDragEnd}
                      className={`bg-[#4A6844] border-[2px] border-[#5A8352] p-2 flex items-center gap-3 cursor-grab active:cursor-grabbing transition-all ${
                        isDragging ? "opacity-40" : ""
                      } ${isDragOver ? "border-[#5599FF]" : ""}`}
                    >
                      {/* Seed number */}
                      <div className="w-6 h-6 bg-[#FFD700] text-[#1A1A1A] rounded-full flex items-center justify-center text-xs font-bold">
                        {team.seed}
                      </div>

                      {/* Team color dot */}
                      <div
                        className="w-6 h-6 rounded-full flex-shrink-0"
                        style={{ backgroundColor: team.primaryColor }}
                      />

                      {/* Team info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-[#E8E8D8] truncate">{team.teamName}</div>
                        <div className="text-[10px] text-[#E8E8D8]/60">
                          {team.record.wins}-{team.record.losses}
                        </div>
                      </div>

                      {/* Grade */}
                      <span className="text-xs text-[#FFD700] font-bold w-6 text-center">{team.grade}</span>

                      {/* Arrow buttons */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => index > 0 && swapTeams(index, index - 1)}
                          disabled={index === 0}
                          className={`p-0.5 ${index > 0 ? "text-[#E8E8D8] hover:text-[#5599FF]" : "text-[#E8E8D8]/20"}`}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => index < seededTeams.length - 1 && swapTeams(index, index + 1)}
                          disabled={index === seededTeams.length - 1}
                          className={`p-0.5 ${index < seededTeams.length - 1 ? "text-[#E8E8D8] hover:text-[#5599FF]" : "text-[#E8E8D8]/20"}`}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Bracket Preview */}
            <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-4">
              <BracketPreview teams={seededTeams} />
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3 justify-center mt-6">
            <button
              onClick={() => setScreen("entry")}
              className="bg-[#4A6844] border-[3px] border-[#3F5A3A] px-6 py-3 text-xs text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform flex items-center gap-2"
            >
              <ArrowLeft className="w-3 h-3" /> Back
            </button>
            <button
              onClick={onCancel}
              className="bg-[#4A6844] border-[3px] border-[#3F5A3A] px-6 py-3 text-xs text-[#E8E8D8]/60 hover:text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform"
            >
              Cancel
            </button>
            <button
              onClick={() => setScreen("confirm")}
              className="bg-[#5599FF] border-[3px] border-[#3377DD] px-8 py-3 text-xs text-white font-bold hover:bg-[#3377DD] active:scale-95 transition-transform flex items-center gap-2"
            >
              Next <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Confirmation Screen ---
  if (screen === "confirm") {
    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center overflow-y-auto">
        <div className="max-w-lg mx-auto p-8 w-full">
          <StepIndicator currentStep={4} />

          <div className="text-center mb-6">
            <Trophy className="w-10 h-10 text-[#FFD700] mx-auto mb-3" />
            <h2 className="text-xl text-[#E8E8D8] font-bold">CONFIRM SEEDING</h2>
            <div className="text-xs text-[#E8E8D8]/60 mt-1">Method: {seedMethod.toUpperCase()}</div>
          </div>

          <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-6 mb-4">
            <div className="space-y-2">
              {seededTeams.map((team) => (
                <div key={team.teamId} className="bg-[#4A6844] border-[2px] border-[#5A8352] p-3 flex items-center gap-3">
                  <div className="w-7 h-7 bg-[#FFD700] text-[#1A1A1A] rounded-full flex items-center justify-center text-xs font-bold">
                    {team.seed}
                  </div>
                  <div
                    className="w-7 h-7 rounded-full flex-shrink-0"
                    style={{ backgroundColor: team.primaryColor }}
                  />
                  <div className="flex-1">
                    <div className="text-sm text-[#E8E8D8]">{team.teamName}</div>
                    <div className="text-xs text-[#E8E8D8]/60">{team.record.wins}-{team.record.losses} • {team.grade}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-3 mb-6">
            <BracketPreview teams={seededTeams} />
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setScreen("seeding")}
              className="bg-[#4A6844] border-[3px] border-[#3F5A3A] px-6 py-3 text-xs text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform flex items-center gap-2"
            >
              <ArrowLeft className="w-3 h-3" /> Back
            </button>
            <button
              onClick={() => onComplete(seededTeams)}
              className="bg-[#FFD700] border-[3px] border-[#CC9900] px-8 py-3 text-xs text-[#1A1A1A] font-bold hover:bg-[#CC9900] active:scale-95 transition-transform flex items-center gap-2"
            >
              <CheckCircle className="w-3 h-3" /> Start Playoffs
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
