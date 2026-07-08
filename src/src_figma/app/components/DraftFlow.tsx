import { useState, useEffect, useMemo, useCallback } from "react";
import { ChevronDown, ChevronUp, X, Search, Plus, Clock, Trophy, Star, AlertCircle, CheckCircle, Sparkles } from "lucide-react";
import { useOffseasonData, type OffseasonTeam, type OffseasonPlayer } from "@/hooks/useOffseasonData";
import { useOffseasonState, type DraftPick as StoredDraftPick } from "../../hooks/useOffseasonState";
import {
  savePlayer,
  getTeam,
  getTeamRoster,
  saveTeamRoster,
  normalizeStoredPersonality,
  type TeamRoster,
} from "../../../utils/leagueBuilderStorage";
import { getActiveFranchise, loadFranchise } from "../../../utils/franchiseManager";
import { FIRST_NAMES, LAST_NAMES } from "../../../data/nameDatabase";
import {
  FRANCHISE_OFFSEASON_TEMPLATE_MUTATION_MESSAGE,
  shouldBlockFranchiseTemplateMutation,
} from "../utils/franchiseOffseasonGuards";
import {
  FRANCHISE_DRAFT_CALCULATION_VERSION,
  runFranchiseDraftDryRun,
  type FranchiseDraftAdapterData,
} from "../../../utils/franchiseDraftAdapter";
import { drawProspectAge, pick as pickSeeded, pickWeightedPersonality } from "../../../utils/prospectScoutingDraftEngine";
import { CHEMISTRY_CODE_TO_WORD } from "../../../data/chemistryCanonical";
import type { FranchiseOffseasonAdapterIssue } from "../../../utils/franchiseOffseasonAdapters";

// Empty teams fallback — populated from IndexedDB when available
const EMPTY_TEAMS: { name: string; mlb: number; farm: number }[] = [];
const PROSPECT_POSITIONS = ["SS", "SP", "CF", "3B", "C", "RF", "1B", "LF", "2B", "RP"];
const PROSPECT_GRADES: Array<"B" | "B-" | "C+" | "C" | "C-"> = ["B", "B", "B-", "B-", "C+", "C+", "C+", "C", "C", "C", "C", "C-", "C-", "C-"];
const CEILINGS: Record<string, Array<DraftProspect["potentialCeiling"]>> = {
  "B": ["A", "A-", "A-"],
  "B-": ["A-", "B+", "B+"],
  "C+": ["B+", "B", "B"],
  "C": ["B", "B-", "B-"],
  "C-": ["B-", "B-", "B-"],
};
// Canonical chemistry words (src/data/chemistryCanonical.ts) for the seeded uniform chemistry
// draw at draft-commit time below. The old fake ["LEADER","COMPETITIVE","CALM","HOTHEAD"]
// personality pool here was never part of the canonical 7-personality taxonomy and has been
// removed — prospects now display and save the same weighted-drawn canonical personality.
const CANONICAL_CHEMISTRY_WORDS = Object.values(CHEMISTRY_CODE_TO_WORD);

type DraftScreen = 
  | "inactive-selection"
  | "class-preview"
  | "order-reveal"
  | "draft-board"
  | "pick-modal"
  | "pass-modal"
  | "pick-confirmation"
  | "undrafted-retirements"
  | "draft-summary";

interface DraftProspect {
  id: string;
  name: string;
  position: string;
  grade: "B" | "B-" | "C+" | "C" | "C-";
  age: number;
  potentialCeiling: "A" | "A-" | "B+" | "B" | "B-" | "N/A";
  power?: number;
  contact?: number;
  speed?: number;
  fielding?: number;
  velocity?: number;
  junk?: number;
  accuracy?: number;
  personality?: string;
  fromInactive?: boolean;
}

interface DraftPick {
  round: number;
  pickNumber: number;
  teamName: string;
  prospect?: DraftProspect;
  passed?: boolean;
}

interface TeamRosterStatus {
  teamName: string;
  mlbCount: number; // out of 22
  farmCount: number; // can exceed 10
  totalCount: number; // mlbCount + farmCount
  totalGaps: number; // 32 - totalCount
  draftedThisDraft: number;
  hasPassedDraft: boolean;
}

interface DraftFlowProps {
  seasonId: string;
  seasonNumber?: number;
  franchiseId?: string;
  onComplete: () => void;
  onCancel: () => void;
}

export function DraftFlow(props: DraftFlowProps) {
  if (props.franchiseId) {
    return (
      <FranchiseDraftDryRunPreview
        franchiseId={props.franchiseId}
        seasonId={props.seasonId}
        seasonNumber={props.seasonNumber ?? 1}
        onCancel={props.onCancel}
      />
    );
  }

  return <PrototypeDraftFlow {...props} />;
}

function FranchiseDraftDryRunPreview({
  franchiseId,
  seasonId,
  seasonNumber,
  onCancel,
}: {
  franchiseId: string;
  seasonId: string;
  seasonNumber: number;
  onCancel: () => void;
}) {
  const [franchisePreviewData, setFranchisePreviewData] = useState<FranchiseDraftAdapterData | null>(null);
  const [franchisePreviewIssues, setFranchisePreviewIssues] = useState<FranchiseOffseasonAdapterIssue[]>([]);
  const [franchisePreviewLoading, setFranchisePreviewLoading] = useState(false);
  const [franchisePreviewError, setFranchisePreviewError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setFranchisePreviewLoading(true);
    setFranchisePreviewError(null);

    runFranchiseDraftDryRun(
      {
        franchiseId,
        seasonId,
        seasonNumber,
        offseasonStateId: `offseason-${seasonId}`,
        phase: "DRAFT",
        dryRun: true,
      },
      { dryRun: true },
    )
      .then((result) => {
        if (cancelled) return;
        setFranchisePreviewData(result.data ?? null);
        setFranchisePreviewIssues(result.issues ?? []);
        if (!result.success) {
          setFranchisePreviewError(result.message || "Draft readiness preview failed validation.");
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setFranchisePreviewData(null);
        setFranchisePreviewIssues([]);
        setFranchisePreviewError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!cancelled) setFranchisePreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [franchiseId, seasonId, seasonNumber]);

  const reports = franchisePreviewData?.teamReports ?? [];
  const teamsWithNeeds = reports.filter((report) =>
    report.mlbVacancies > 0 ||
    report.farmVacancies > 0 ||
    report.farmOverage > 0 ||
    report.positionNeeds.length > 0,
  );
  const issuesBySeverity = franchisePreviewIssues.reduce<Record<string, FranchiseOffseasonAdapterIssue[]>>((acc, issue) => {
    const key = issue.severity ?? "info";
    acc[key] = [...(acc[key] ?? []), issue];
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/90 z-50 overflow-y-auto">
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto bg-[#6B9462] border-[5px] border-[#4A6844]">
          <div className="bg-[#4A6844] p-4 border-b-[3px] border-[#3F5A3A]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-[#E8E8D8]">DRAFT READINESS PREVIEW - SEASON {seasonNumber}</div>
                <div className="text-[10px] text-[#E8E8D8]/60 mt-1">Franchise Mode 2 v1 dry-run boundary</div>
              </div>
              <button onClick={onCancel} className="text-[#E8E8D8] hover:text-[#DD0000]" aria-label="Close draft preview">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-[#5A8352] border-[3px] border-[#FFD700] p-4 space-y-2">
              <div className="text-xs text-[#E8E8D8]">Preview only - no draft commit</div>
              <div className="text-[10px] text-[#E8E8D8]/85">
                Method: <span className="text-[#FFD700]">{FRANCHISE_DRAFT_CALCULATION_VERSION}</span>
              </div>
              <div className="text-[10px] text-[#E8E8D8]/80">
                No draft picks are made, no players are generated, signed, released, replaced, retired, or moved, no transactions are written, and no draft class is persisted.
              </div>
              <div className="text-[10px] text-[#E8E8D8]/80">
                The 22 MLB / 10 farm counts are Phase 11 roster lock readiness targets, not current draft-phase requirements.
              </div>
              <div className="text-[10px] text-[#E8E8D8]/80">
                Draft class preview is unavailable until a safe pure generator is added later.
              </div>
            </div>

            {franchisePreviewLoading && (
              <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4 text-xs text-[#E8E8D8]">
                Loading draft readiness preview...
              </div>
            )}

            {franchisePreviewError && (
              <div className="bg-[#5A2F2F] border-[3px] border-[#DD0000] p-4 text-xs text-[#E8E8D8]">
                {franchisePreviewError}
              </div>
            )}

            {franchisePreviewData && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-3">
                    <div className="text-[9px] text-[#E8E8D8]/60">Teams reviewed</div>
                    <div className="text-xl text-[#E8E8D8]">{reports.length}</div>
                  </div>
                  <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-3">
                    <div className="text-[9px] text-[#E8E8D8]/60">Teams with needs</div>
                    <div className="text-xl text-[#E8E8D8]">{teamsWithNeeds.length}</div>
                  </div>
                  <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-3">
                    <div className="text-[9px] text-[#E8E8D8]/60">Warnings/issues</div>
                    <div className="text-xl text-[#E8E8D8]">{franchisePreviewIssues.length}</div>
                  </div>
                  <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-3">
                    <div className="text-[9px] text-[#E8E8D8]/60">Draft class</div>
                    <div className="text-xs text-[#FFD700] mt-2">Unavailable</div>
                  </div>
                </div>

                <div className="bg-[#5A8352] border-[3px] border-[#4A6844]">
                  <div className="bg-[#4A6844] p-2 text-[10px] text-[#E8E8D8]">TEAM READINESS</div>
                  <div className="p-4 space-y-3 max-h-[520px] overflow-y-auto">
                    {reports.length === 0 ? (
                      <div className="text-[10px] text-[#E8E8D8]/60 text-center py-4">
                        No franchise-owned teams were available for draft readiness.
                      </div>
                    ) : reports.map((report) => (
                      <div key={report.teamId} className="bg-[#4A6844] border-[2px] border-[#3F5A3A] p-3 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-xs text-[#E8E8D8]">{report.teamName}</div>
                            <div className="text-[9px] text-[#E8E8D8]/60">{report.teamId}</div>
                          </div>
                          <div className="text-[10px] text-[#FFD700] uppercase">
                            {report.draftUrgency} urgency / {report.trustLevel} trust
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[10px] text-[#E8E8D8]">
                          <div>MLB: {report.mlbCount}/22</div>
                          <div>Farm: {report.farmCount}/10</div>
                          <div>Total: {report.totalCount}/32</div>
                          <div>Farm vacancies: {report.farmVacancies}</div>
                          <div>MLB vacancies: {report.mlbVacancies}</div>
                        </div>

                        {report.positionNeeds.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-[9px] text-[#E8E8D8]/60">Position / role needs</div>
                            <div className="flex flex-wrap gap-2">
                              {report.positionNeeds.map((need) => (
                                <span key={`${report.teamId}-${need.role}`} className="text-[9px] text-[#E8E8D8] bg-[#5A8352] px-2 py-1">
                                  {need.role}: {need.currentCount}/{need.targetCount} ({need.severity})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-3">
                          <div>
                            <div className="text-[9px] text-[#E8E8D8]/60 mb-1">Evidence</div>
                            <ul className="space-y-1">
                              {report.evidence.map((item) => (
                                <li key={item} className="text-[9px] text-[#E8E8D8]/80">{item}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <div className="text-[9px] text-[#E8E8D8]/60 mb-1">Limitations</div>
                            <ul className="space-y-1">
                              {report.limitations.map((item) => (
                                <li key={item} className="text-[9px] text-[#E8E8D8]/80">{item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4">
                  <div className="text-xs text-[#E8E8D8] mb-2">LIMITATIONS</div>
                  <ul className="space-y-1">
                    {franchisePreviewData.limitations.map((limitation) => (
                      <li key={limitation} className="text-[10px] text-[#E8E8D8]/80">{limitation}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {franchisePreviewIssues.length > 0 && (
              <div className="bg-[#5A8352] border-[3px] border-[#DDC45A] p-4">
                <div className="text-xs text-[#E8E8D8] mb-2">WARNINGS / ISSUES</div>
                <div className="text-[9px] text-[#E8E8D8]/60 mb-2">
                  Errors: {issuesBySeverity.error?.length ?? 0} / Warnings: {issuesBySeverity.warning?.length ?? 0}
                </div>
                <div className="space-y-2">
                  {franchisePreviewIssues.map((issue, index) => (
                    <div key={`${issue.code}-${index}`} className="bg-[#4A6844] p-2">
                      <div className="text-[10px] text-[#FFD700]">{issue.code}</div>
                      <div className="text-[9px] text-[#E8E8D8]/80">{issue.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center pt-2">
              <button
                onClick={onCancel}
                className="bg-[#4A6844] border-[3px] border-[#3F5A3A] px-6 py-3 text-xs text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrototypeDraftFlow({ seasonId, seasonNumber = 1, franchiseId, onComplete, onCancel }: DraftFlowProps) {
  // Get real data from hook
  const { teams: realTeams, players: realPlayers, hasRealData, isLoading } = useOffseasonData();

  // Offseason state hook for persistence
  const { saveDraft } = useOffseasonState(seasonId, seasonNumber, { franchiseId });
  const [isSaving, setIsSaving] = useState(false);
  const [franchisePreviewData, setFranchisePreviewData] = useState<FranchiseDraftAdapterData | null>(null);
  const [franchisePreviewIssues, setFranchisePreviewIssues] = useState<FranchiseOffseasonAdapterIssue[]>([]);
  const [franchisePreviewLoading, setFranchisePreviewLoading] = useState(false);
  const [franchisePreviewError, setFranchisePreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!franchiseId) return;

    let cancelled = false;
    setFranchisePreviewLoading(true);
    setFranchisePreviewError(null);

    runFranchiseDraftDryRun(
      {
        franchiseId,
        seasonId,
        seasonNumber,
        offseasonStateId: `offseason-${seasonId}`,
        phase: "DRAFT",
        dryRun: true,
      },
      { dryRun: true },
    )
      .then((result) => {
        if (cancelled) return;
        setFranchisePreviewData(result.data ?? null);
        setFranchisePreviewIssues(result.issues ?? []);
        if (!result.success) {
          setFranchisePreviewError(result.message || "Draft readiness preview failed validation.");
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setFranchisePreviewData(null);
        setFranchisePreviewIssues([]);
        setFranchisePreviewError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!cancelled) setFranchisePreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [franchiseId, seasonId, seasonNumber]);

  // Load controlled team name from franchise metadata
  const [userTeamName, setUserTeamName] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function loadUserTeam() {
      try {
        const franchiseId = await getActiveFranchise();
        if (franchiseId && !cancelled) {
          const meta = await loadFranchise(franchiseId);
          if (meta?.controlledTeamName && !cancelled) {
            setUserTeamName(meta.controlledTeamName);
          }
        }
      } catch (err) {
        console.error('[DraftFlow] Failed to load controlled team:', err);
      }
    }
    loadUserTeam();
    return () => { cancelled = true; };
  }, []);

  const [currentScreen, setCurrentScreen] = useState<DraftScreen>("inactive-selection");
  const [selectedInactivePlayers, setSelectedInactivePlayers] = useState<string[]>([]);
  const [draftClass, setDraftClass] = useState<DraftProspect[]>([]);
  const [draftPicks, setDraftPicks] = useState<DraftPick[]>([]);
  const [currentPickIndex, setCurrentPickIndex] = useState(0);
  const [selectedProspect, setSelectedProspect] = useState<DraftProspect | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("All Positions");

  // Team roster tracking (20 teams)
  const [teamRosters, setTeamRosters] = useState<Record<string, TeamRosterStatus>>({});

  // Draft board table state
  const [sortColumn, setSortColumn] = useState<string>("grade");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Convert real teams to draft format
  const draftTeams = useMemo(() => {
    if (hasRealData && realTeams.length > 0 && realPlayers.length > 0) {
      return realTeams.slice(0, 20).map((team) => {
        const teamPlayers = realPlayers.filter(p => p.teamId === team.id);
        // Assume MLB roster is 22, farm roster is rest
        const mlbCount = Math.min(teamPlayers.length, 22);
        const farmCount = Math.max(0, teamPlayers.length - 22);
        return {
          name: team.name,
          mlb: mlbCount,
          farm: farmCount,
        };
      });
    }
    return EMPTY_TEAMS;
  }, [realTeams, realPlayers, hasRealData]);

  // Map team names to their IDs for roster wiring
  const teamNameToId = useMemo(() => {
    const map: Record<string, string> = {};
    if (hasRealData && realTeams.length > 0) {
      realTeams.slice(0, 20).forEach(t => { map[t.name] = t.id; });
    }
    return map;
  }, [realTeams, hasRealData]);

  // Inactive players (retired players eligible for draft) — populated from retirement/museum data when available
  const inactivePlayers: { id: string; name: string; position: string; grade: "B" | "B-" | "C+" | "C" | "C-"; retiredSeason: number; seasons: number; hof: boolean }[] = [];

  // Ineligible players (Hall of Famers too high-grade for farm) — populated from museum data when available
  const ineligiblePlayers: { name: string; grade: string }[] = [];

  // Generate draft class with random prospects
  const generateDraftClass = () => {
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const randBetween = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
    const usedNames = new Set<string>();

    const aiProspects: DraftProspect[] = [];
    for (let i = 0; i < 20; i++) {
      // Generate unique name
      let name: string;
      do {
        name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
      } while (usedNames.has(name));
      usedNames.add(name);

      const grade = PROSPECT_GRADES[i % PROSPECT_GRADES.length];
      const position = PROSPECT_POSITIONS[i % PROSPECT_POSITIONS.length];
      const ceiling = pick(CEILINGS[grade]);
      const isPitcher = position === "SP" || position === "RP";

      const prospect: DraftProspect = {
        id: `p${i + 1}`,
        name,
        position,
        grade,
        age: drawProspectAge(`draft-flow:${seasonId}:ai:${i}`),
        potentialCeiling: ceiling,
        personality: pickWeightedPersonality(`draft-flow:${seasonId}:ai:${i}:personality`),
      };

      if (isPitcher) {
        prospect.velocity = randBetween(70, 92);
        prospect.junk = randBetween(50, 75);
        prospect.accuracy = randBetween(50, 75);
      } else {
        prospect.power = randBetween(40, 82);
        prospect.contact = randBetween(40, 78);
        prospect.speed = randBetween(28, 86);
        prospect.fielding = randBetween(40, 82);
      }

      aiProspects.push(prospect);
    }

    // Add selected inactive players
    const inactiveProspects: DraftProspect[] = selectedInactivePlayers.map(id => {
      const player = inactivePlayers.find(p => p.id === id)!;
      return {
        id: `inactive-${id}`,
        name: player.name,
        position: player.position,
        grade: player.grade,
        age: drawProspectAge(`draft-flow:${seasonId}:inactive:${id}`),
        potentialCeiling: "N/A" as const,
        power: 70,
        contact: 75,
        speed: 60,
        fielding: 70,
        personality: "VETERAN",
        fromInactive: true
      };
    });

    setDraftClass([...aiProspects, ...inactiveProspects]);
    return [...aiProspects, ...inactiveProspects];
  };

  // Generate draft order (20 teams, reverse standings)
  const generateDraftOrder = useCallback(() => {
    // Use draftTeams which may be real data or mock fallback
    const teams = draftTeams;

    // Initialize team rosters
    const initialRosters: Record<string, TeamRosterStatus> = {};
    teams.forEach(team => {
      initialRosters[team.name] = {
        teamName: team.name,
        mlbCount: team.mlb,
        farmCount: team.farm,
        totalCount: team.mlb + team.farm,
        totalGaps: 32 - (team.mlb + team.farm),
        draftedThisDraft: 0,
        hasPassedDraft: false
      };
    });
    setTeamRosters(initialRosters);

    const picks: DraftPick[] = [];
    const maxRounds = 5;

    for (let round = 1; round <= maxRounds; round++) {
      teams.forEach((team, index) => {
        picks.push({
          round,
          pickNumber: (round - 1) * 20 + index + 1,
          teamName: team.name,
        });
      });
    }

    setDraftPicks(picks);
  }, [draftTeams]);

  const handleContinueFromInactive = () => {
    const prospects = generateDraftClass();
    setCurrentScreen("class-preview");
  };

  const handleContinueToOrder = () => {
    generateDraftOrder();
    setCurrentScreen("order-reveal");
  };

  const handleBeginDraft = () => {
    setCurrentScreen("draft-board");
    
    // Auto-advance through AI picks if draft doesn't start with user
    setTimeout(() => {
      const firstPick = draftPicks[0];
      if (firstPick?.teamName !== userTeamName) {
        // Trigger AI picks
        const availableProspects = draftClass;
        if (availableProspects.length > 0) {
          const sortedByGrade = [...availableProspects].sort((a, b) => {
            const gradeOrder = { "B": 5, "B-": 4, "C+": 3, "C": 2, "C-": 1 };
            return gradeOrder[b.grade] - gradeOrder[a.grade];
          });
          handleSelectProspect(sortedByGrade[0]);
        }
      }
    }, 500);
  };

  const handleSelectProspect = (prospect: DraftProspect) => {
    setSelectedProspect(prospect);
    setCurrentScreen("pick-modal");
  };

  const handlePassPick = () => {
    const currentPick = draftPicks[currentPickIndex];
    if (!currentPick) return;

    const teamStatus = teamRosters[currentPick.teamName];
    
    // Check if can pass (must have drafted at least 1)
    if (teamStatus.draftedThisDraft < 1) {
      alert("Must draft at least 1 player before passing");
      return;
    }

    setCurrentScreen("pass-modal");
  };

  const handleConfirmPass = () => {
    const currentPick = draftPicks[currentPickIndex];
    if (!currentPick) return;

    // Mark team as passed
    setTeamRosters(prev => ({
      ...prev,
      [currentPick.teamName]: {
        ...prev[currentPick.teamName],
        hasPassedDraft: true
      }
    }));

    // Mark this pick as passed
    const updatedPicks = [...draftPicks];
    updatedPicks[currentPickIndex].passed = true;
    setDraftPicks(updatedPicks);

    // Continue to next pick
    advanceToNextPick();
  };

  const handleConfirmPick = () => {
    if (!selectedProspect) return;

    const currentPick = draftPicks[currentPickIndex];
    if (!currentPick) return;

    // Add pick to draft picks
    const updatedPicks = [...draftPicks];
    updatedPicks[currentPickIndex].prospect = selectedProspect;
    setDraftPicks(updatedPicks);

    // Remove from draft class
    setDraftClass(draftClass.filter(p => p.id !== selectedProspect.id));

    // Update team roster status
    setTeamRosters(prev => ({
      ...prev,
      [currentPick.teamName]: {
        ...prev[currentPick.teamName],
        farmCount: prev[currentPick.teamName].farmCount + 1,
        totalCount: prev[currentPick.teamName].totalCount + 1,
        totalGaps: prev[currentPick.teamName].totalGaps - 1,
        draftedThisDraft: prev[currentPick.teamName].draftedThisDraft + 1
      }
    }));

    setCurrentScreen("pick-confirmation");
  };

  const advanceToNextPick = () => {
    let nextPickIndex = currentPickIndex + 1;
    
    // Skip teams that have passed
    while (nextPickIndex < draftPicks.length) {
      const nextPick = draftPicks[nextPickIndex];
      const teamStatus = teamRosters[nextPick.teamName];
      
      if (teamStatus?.hasPassedDraft) {
        // Mark as passed
        const updatedPicks = [...draftPicks];
        updatedPicks[nextPickIndex].passed = true;
        setDraftPicks(updatedPicks);
        nextPickIndex++;
      } else {
        break;
      }
    }

    // Check if draft is complete
    if (nextPickIndex >= draftPicks.length || draftClass.length === 0) {
      setCurrentScreen("undrafted-retirements");
      return;
    }

    setCurrentPickIndex(nextPickIndex);
    setSelectedProspect(null);
    setCurrentScreen("draft-board");

    // Auto-pick for AI teams (simulate)
    const nextPick = draftPicks[nextPickIndex];
    if (nextPick?.teamName !== userTeamName) {
      setTimeout(() => {
        const availableProspects = draftClass;
        if (availableProspects.length > 0) {
          const teamStatus = teamRosters[nextPick.teamName];
          
          // AI decides to pass if they have 2+ picks and low gaps
          if (teamStatus.draftedThisDraft >= 2 && teamStatus.totalGaps <= 1 && Math.random() > 0.5) {
            // AI passes
            setTeamRosters(prev => ({
              ...prev,
              [nextPick.teamName]: {
                ...prev[nextPick.teamName],
                hasPassedDraft: true
              }
            }));
            const updatedPicks = [...draftPicks];
            updatedPicks[nextPickIndex].passed = true;
            setDraftPicks(updatedPicks);
            advanceToNextPick();
          } else {
            // AI picks best available
            const sortedByGrade = [...availableProspects].sort((a, b) => {
              const gradeOrder = { "B": 5, "B-": 4, "C+": 3, "C": 2, "C-": 1 };
              return gradeOrder[b.grade] - gradeOrder[a.grade];
            });
            handleSelectProspect(sortedByGrade[0]);
          }
        }
      }, 500);
    }
  };

  const handleContinueDraft = () => {
    advanceToNextPick();
  };

  const handleContinueToSummary = () => {
    setCurrentScreen("draft-summary");
  };

  // Save draft results to storage and complete
  const handleSaveAndComplete = useCallback(async () => {
    if (shouldBlockFranchiseTemplateMutation(franchiseId)) {
      window.alert(FRANCHISE_OFFSEASON_TEMPLATE_MUTATION_MESSAGE);
      return;
    }

    setIsSaving(true);
    try {
      // Convert draft picks to storage format
      const order = draftTeams.map(t => t.name);
      const picks: StoredDraftPick[] = draftPicks
        .filter(p => p.prospect)
        .map(p => ({
          round: p.round,
          pick: p.pickNumber % 20 || 20, // Within-round pick number
          overallPick: p.pickNumber,
          teamId: p.teamName,
          playerId: p.prospect!.id,
          playerName: p.prospect!.name,
          position: p.prospect!.position,
          grade: p.prospect!.grade,
          potential: p.prospect!.potentialCeiling,
        }));

      // Calculate max rounds used
      const maxRounds = Math.max(...draftPicks.filter(p => p.prospect).map(p => p.round), 1);

      await saveDraft(order, picks, maxRounds);

      // Add drafted players to leagueBuilderStorage rosters
      for (const pick of picks) {
        try {
          const teamId = teamNameToId[pick.teamId];
          if (!teamId) continue;

          const prospect = draftPicks.find(
            dp => dp.prospect?.id === pick.playerId
          )?.prospect;
          if (!prospect) continue;
          const team = await getTeam(teamId);
          const leagueId = team?.leagueIds?.[0] ?? "";

          const isPitcher = prospect.position === "SP" || prospect.position === "RP" || prospect.position === "CP";
          const [firstName, ...lastParts] = prospect.name.split(' ');
          const lastName = lastParts.join(' ') || firstName;

          // Create the player in leagueBuilderStorage
          const saved = await savePlayer({
            firstName,
            lastName,
            gender: 'M',
            age: prospect.age,
            bats: 'R',
            throws: 'R',
            primaryPosition: prospect.position as 'SS' | 'SP' | 'CF' | '3B' | 'C' | 'RF' | '1B' | 'LF' | '2B' | 'RP',
            power: prospect.power ?? 0,
            contact: prospect.contact ?? 0,
            speed: prospect.speed ?? 0,
            fielding: prospect.fielding ?? 0,
            arm: 50,
            velocity: prospect.velocity ?? 0,
            junk: prospect.junk ?? 0,
            accuracy: prospect.accuracy ?? 0,
            arsenal: isPitcher ? ['4F', 'SL'] : [],
            overallGrade: prospect.grade,
            // Real draws (not hardcoded) — personality reuses whatever was already
            // weighted-drawn and shown for this prospect on the draft board; chemistry is a
            // seeded uniform pick from the canonical 5 (this dark flow doesn't need the
            // chemistry quota system used by the real prospect-pool generator).
            personality: normalizeStoredPersonality(prospect.personality),
            chemistry: pickSeeded(`draft-flow:${seasonId}:${prospect.id}:chemistry`, CANONICAL_CHEMISTRY_WORDS),
            morale: 75,
            mojo: 'Normal',
            fame: 0,
            salary: 0.5,
            leagueAssignments: leagueId
              ? [{
                  leagueId,
                  teamId,
                  rosterStatus: 'FARM',
                }]
              : [],
            isCustom: false,
          });

          // Add to team's farm roster
          const roster = await getTeamRoster(teamId);
          if (roster) {
            roster.farmRoster.push(saved.id);
            await saveTeamRoster(roster);
          }
        } catch (err) {
          console.error(`[DraftFlow] Failed to persist drafted player ${pick.playerName}:`, err);
        }
      }

      onComplete();
    } catch (error) {
      console.error('[DraftFlow] Failed to save draft:', error);
      // Continue anyway to avoid getting stuck
      onComplete();
    } finally {
      setIsSaving(false);
    }
  }, [draftPicks, draftTeams, franchiseId, saveDraft, onComplete, teamNameToId]);

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "B": return "text-[#5599FF]";
      case "B-": return "text-[#7799FF]";
      case "C+": return "text-[#9999FF]";
      case "C": return "text-[#BBBBFF]";
      case "C-": return "text-[#DDDDFF]";
      default: return "text-[#E8E8D8]";
    }
  };

  const getCeilingColor = (ceiling: string) => {
    switch (ceiling) {
      case "A": return "text-[#FFD700]";
      case "A-": return "text-[#FFC700]";
      case "B+": return "text-[#5599FF]";
      case "B": return "text-[#7799FF]";
      case "B-": return "text-[#9999FF]";
      default: return "text-[#E8E8D8]/60";
    }
  };

  // Sort prospects for table
  const sortProspects = (prospects: DraftProspect[]) => {
    return [...prospects].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortColumn) {
        case "name":
          aVal = a.name;
          bVal = b.name;
          break;
        case "position":
          aVal = a.position;
          bVal = b.position;
          break;
        case "age":
          aVal = a.age;
          bVal = b.age;
          break;
        case "grade":
          const gradeOrder = { "B": 5, "B-": 4, "C+": 3, "C": 2, "C-": 1 };
          aVal = gradeOrder[a.grade];
          bVal = gradeOrder[b.grade];
          break;
        case "ceiling":
          const ceilingOrder = { "A": 5, "A-": 4, "B+": 3, "B": 2, "B-": 1, "N/A": 0 };
          aVal = ceilingOrder[a.potentialCeiling];
          bVal = ceilingOrder[b.potentialCeiling];
          break;
        case "power":
          aVal = a.power || 0;
          bVal = b.power || 0;
          break;
        case "contact":
          aVal = a.contact || 0;
          bVal = b.contact || 0;
          break;
        case "speed":
          aVal = a.speed || 0;
          bVal = b.speed || 0;
          break;
        case "fielding":
          aVal = a.fielding || 0;
          bVal = b.fielding || 0;
          break;
        case "velocity":
          aVal = a.velocity || 0;
          bVal = b.velocity || 0;
          break;
        case "junk":
          aVal = a.junk || 0;
          bVal = b.junk || 0;
          break;
        case "accuracy":
          aVal = a.accuracy || 0;
          bVal = b.accuracy || 0;
          break;
        default:
          return 0;
      }

      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  if (franchiseId) {
    const reports = franchisePreviewData?.teamReports ?? [];
    const changedTeams = reports.filter((report) =>
      report.mlbVacancies > 0 ||
      report.farmVacancies > 0 ||
      report.farmOverage > 0 ||
      report.positionNeeds.length > 0,
    );
    const issuesBySeverity = franchisePreviewIssues.reduce<Record<string, FranchiseOffseasonAdapterIssue[]>>((acc, issue) => {
      const key = issue.severity ?? "info";
      acc[key] = [...(acc[key] ?? []), issue];
      return acc;
    }, {});

    return (
      <div className="fixed inset-0 bg-black/90 z-50 overflow-y-auto">
        <div className="min-h-screen p-8">
          <div className="max-w-6xl mx-auto bg-[#6B9462] border-[5px] border-[#4A6844]">
            <div className="bg-[#4A6844] p-4 border-b-[3px] border-[#3F5A3A]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-[#E8E8D8]">DRAFT READINESS PREVIEW - SEASON {seasonNumber}</div>
                  <div className="text-[10px] text-[#E8E8D8]/60 mt-1">Franchise Mode 2 v1 dry-run boundary</div>
                </div>
                <button onClick={onCancel} className="text-[#E8E8D8] hover:text-[#DD0000]" aria-label="Close draft preview">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-[#5A8352] border-[3px] border-[#FFD700] p-4 space-y-2">
                <div className="text-xs text-[#E8E8D8]">Preview only - no draft commit</div>
                <div className="text-[10px] text-[#E8E8D8]/85">
                  Method: <span className="text-[#FFD700]">{FRANCHISE_DRAFT_CALCULATION_VERSION}</span>
                </div>
                <div className="text-[10px] text-[#E8E8D8]/80">
                  No draft picks are made, no players are generated, signed, released, replaced, retired, or moved, no transactions are written, and no draft class is persisted.
                </div>
                <div className="text-[10px] text-[#E8E8D8]/80">
                  The 22 MLB / 10 farm counts are Phase 11 roster lock readiness targets, not current draft-phase requirements.
                </div>
                <div className="text-[10px] text-[#E8E8D8]/80">
                  Draft class preview is unavailable until a safe pure generator is added later.
                </div>
              </div>

              {franchisePreviewLoading && (
                <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4 text-xs text-[#E8E8D8]">
                  Loading draft readiness preview...
                </div>
              )}

              {franchisePreviewError && (
                <div className="bg-[#5A2F2F] border-[3px] border-[#DD0000] p-4 text-xs text-[#E8E8D8]">
                  {franchisePreviewError}
                </div>
              )}

              {franchisePreviewData && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-3">
                      <div className="text-[9px] text-[#E8E8D8]/60">Teams reviewed</div>
                      <div className="text-xl text-[#E8E8D8]">{reports.length}</div>
                    </div>
                    <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-3">
                      <div className="text-[9px] text-[#E8E8D8]/60">Teams with needs</div>
                      <div className="text-xl text-[#E8E8D8]">{changedTeams.length}</div>
                    </div>
                    <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-3">
                      <div className="text-[9px] text-[#E8E8D8]/60">Warnings/issues</div>
                      <div className="text-xl text-[#E8E8D8]">{franchisePreviewIssues.length}</div>
                    </div>
                    <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-3">
                      <div className="text-[9px] text-[#E8E8D8]/60">Draft class</div>
                      <div className="text-xs text-[#FFD700] mt-2">Unavailable</div>
                    </div>
                  </div>

                  <div className="bg-[#5A8352] border-[3px] border-[#4A6844]">
                    <div className="bg-[#4A6844] p-2 text-[10px] text-[#E8E8D8]">TEAM READINESS</div>
                    <div className="p-4 space-y-3 max-h-[520px] overflow-y-auto">
                      {reports.length === 0 ? (
                        <div className="text-[10px] text-[#E8E8D8]/60 text-center py-4">
                          No franchise-owned teams were available for draft readiness.
                        </div>
                      ) : reports.map((report) => (
                        <div key={report.teamId} className="bg-[#4A6844] border-[2px] border-[#3F5A3A] p-3 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="text-xs text-[#E8E8D8]">{report.teamName}</div>
                              <div className="text-[9px] text-[#E8E8D8]/60">{report.teamId}</div>
                            </div>
                            <div className="text-[10px] text-[#FFD700] uppercase">
                              {report.draftUrgency} urgency / {report.trustLevel} trust
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[10px] text-[#E8E8D8]">
                            <div>MLB: {report.mlbCount}/22</div>
                            <div>Farm: {report.farmCount}/10</div>
                            <div>Total: {report.totalCount}/32</div>
                            <div>Farm vacancies: {report.farmVacancies}</div>
                            <div>MLB vacancies: {report.mlbVacancies}</div>
                          </div>

                          {report.positionNeeds.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-[9px] text-[#E8E8D8]/60">Position / role needs</div>
                              <div className="flex flex-wrap gap-2">
                                {report.positionNeeds.map((need) => (
                                  <span key={`${report.teamId}-${need.role}`} className="text-[9px] text-[#E8E8D8] bg-[#5A8352] px-2 py-1">
                                    {need.role}: {need.currentCount}/{need.targetCount} ({need.severity})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="grid md:grid-cols-2 gap-3">
                            <div>
                              <div className="text-[9px] text-[#E8E8D8]/60 mb-1">Evidence</div>
                              <ul className="space-y-1">
                                {report.evidence.map((item) => (
                                  <li key={item} className="text-[9px] text-[#E8E8D8]/80">{item}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <div className="text-[9px] text-[#E8E8D8]/60 mb-1">Limitations</div>
                              <ul className="space-y-1">
                                {report.limitations.map((item) => (
                                  <li key={item} className="text-[9px] text-[#E8E8D8]/80">{item}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4">
                    <div className="text-xs text-[#E8E8D8] mb-2">LIMITATIONS</div>
                    <ul className="space-y-1">
                      {franchisePreviewData.limitations.map((limitation) => (
                        <li key={limitation} className="text-[10px] text-[#E8E8D8]/80">{limitation}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {franchisePreviewIssues.length > 0 && (
                <div className="bg-[#5A8352] border-[3px] border-[#DDC45A] p-4">
                  <div className="text-xs text-[#E8E8D8] mb-2">WARNINGS / ISSUES</div>
                  <div className="text-[9px] text-[#E8E8D8]/60 mb-2">
                    Errors: {issuesBySeverity.error?.length ?? 0} / Warnings: {issuesBySeverity.warning?.length ?? 0}
                  </div>
                  <div className="space-y-2">
                    {franchisePreviewIssues.map((issue, index) => (
                      <div key={`${issue.code}-${index}`} className="bg-[#4A6844] p-2">
                        <div className="text-[10px] text-[#FFD700]">{issue.code}</div>
                        <div className="text-[9px] text-[#E8E8D8]/80">{issue.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-center pt-2">
                <button
                  onClick={onCancel}
                  className="bg-[#4A6844] border-[3px] border-[#3F5A3A] px-6 py-3 text-xs text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
        <div className="text-[#E8E8D8] text-xl">Loading draft data...</div>
      </div>
    );
  }

  // Screen 1: Inactive Player Selection
  if (currentScreen === "inactive-selection") {
    return (
      <div className="fixed inset-0 bg-black/90 z-50 overflow-y-auto">
        <div className="min-h-screen p-8">
          <div className="max-w-5xl mx-auto bg-[#6B9462] border-[5px] border-[#4A6844]">
            {/* Header */}
            <div className="bg-[#4A6844] p-4 border-b-[3px] border-[#3F5A3A]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-[#E8E8D8]">📂 PRE-DRAFT: INACTIVE PLAYER DATABASE</div>
                  <div className="text-[10px] text-[#E8E8D8]/60 mt-1">Phase 7: Draft • Screen 1 of 9</div>
                </div>
                <button onClick={onCancel} className="text-[#E8E8D8] hover:text-[#DD0000]">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="text-xs text-[#E8E8D8]">
                Would you like to add any retired players to this year's draft class?
              </div>
              <div className="text-[10px] text-[#E8E8D8]/70">
                ⚠️ Note: All drafted players go to FARM roster (max grade: B)
              </div>

              {/* Search/Filter */}
              <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <Search className="w-4 h-4 text-[#E8E8D8]/60" />
                  <input
                    type="text"
                    placeholder="Search players..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent text-[10px] text-[#E8E8D8] placeholder:text-[#E8E8D8]/40 outline-none flex-1"
                  />
                </div>
                <select
                  value={positionFilter}
                  onChange={(e) => setPositionFilter(e.target.value)}
                  className="bg-[#4A6844] text-[10px] text-[#E8E8D8] p-1 border-2 border-[#3F5A3A]"
                >
                  <option>All Positions</option>
                  <option>IF</option>
                  <option>OF</option>
                  <option>P</option>
                </select>
              </div>

              {/* Eligible Players */}
              <div className="bg-[#5A8352] border-[3px] border-[#4A6844]">
                <div className="bg-[#4A6844] p-2 flex items-center justify-between">
                  <div className="text-[10px] text-[#E8E8D8]">INACTIVE PLAYERS - FARM ELIGIBLE (Grade B or below)</div>
                  <div className="text-[9px] text-[#E8E8D8]/60">Sort: Grade</div>
                </div>
                <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                  {inactivePlayers.length === 0 ? (
                    <div className="text-[10px] text-[#E8E8D8]/50 text-center py-4">No retired players eligible for draft yet.</div>
                  ) : inactivePlayers.map(player => (
                    <label key={player.id} className="flex items-center gap-3 p-2 hover:bg-[#4A6844] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedInactivePlayers.includes(player.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedInactivePlayers([...selectedInactivePlayers, player.id]);
                          } else {
                            setSelectedInactivePlayers(selectedInactivePlayers.filter(id => id !== player.id));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <div className="flex-1 flex items-center gap-4 text-[10px] text-[#E8E8D8]">
                        <span className="w-32">{player.name}</span>
                        <span className="w-8">{player.position}</span>
                        <span className={`w-8 ${getGradeColor(player.grade)}`}>{player.grade}</span>
                        <span className="text-[#E8E8D8]/60">Retired S{player.retiredSeason}</span>
                        <span className="text-[#E8E8D8]/60">{player.seasons} seasons</span>
                        {player.hof && <span className="text-[#FFD700]">🏛️ HOF</span>}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Ineligible Players */}
              <div className="bg-[#5A8352] border-[3px] border-[#DD0000] p-3">
                <div className="text-[10px] text-[#E8E8D8] mb-2">⛔ NOT ELIGIBLE (Grade too high for Farm: A-, A, A+)</div>
                <div className="text-[9px] text-[#E8E8D8]/60">
                  {ineligiblePlayers.length > 0
                    ? ineligiblePlayers.map(p => `${p.name} (${p.grade})`).join(", ")
                    : "No Hall of Fame players ineligible yet."}
                </div>
              </div>

              {/* Selected Summary */}
              {selectedInactivePlayers.length > 0 && (
                <div className="bg-[#4A6844] border-[3px] border-[#FFD700] p-3">
                  <div className="text-[10px] text-[#E8E8D8] mb-2">SELECTED FOR DRAFT ({selectedInactivePlayers.length})</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedInactivePlayers.map(id => {
                      const player = inactivePlayers.find(p => p.id === id)!;
                      return (
                        <div key={id} className="text-[9px] text-[#E8E8D8] bg-[#5A8352] px-2 py-1">
                          ✓ {player.name} ({player.position}, {player.grade})
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="text-[9px] text-[#E8E8D8]/60 text-center">
                Note: Selected players will be added to draft class at age 22. All drafted players go directly to FARM roster.
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-center pt-4">
                <button
                  onClick={handleContinueFromInactive}
                  className="bg-[#4A6844] border-[3px] border-[#3F5A3A] px-6 py-3 text-xs text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform"
                >
                  Skip - Use Generated Prospects Only
                </button>
                <button
                  onClick={handleContinueFromInactive}
                  className="bg-[#5599FF] border-[3px] border-[#3366FF] px-6 py-3 text-xs text-[#E8E8D8] hover:bg-[#3366FF] active:scale-95 transition-transform"
                >
                  Add Selected to Draft ({selectedInactivePlayers.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Screen 2: Draft Class Preview
  if (currentScreen === "class-preview") {
    const gradeDistribution = {
      "B": draftClass.filter(p => p.grade === "B").length,
      "B-": draftClass.filter(p => p.grade === "B-").length,
      "C+": draftClass.filter(p => p.grade === "C+").length,
      "C": draftClass.filter(p => p.grade === "C").length,
      "C-": draftClass.filter(p => p.grade === "C-").length,
    };

    const positionCounts = {
      "C": draftClass.filter(p => p.position === "C").length,
      "1B": draftClass.filter(p => p.position === "1B").length,
      "2B": draftClass.filter(p => p.position === "2B").length,
      "SS": draftClass.filter(p => p.position === "SS").length,
      "3B": draftClass.filter(p => p.position === "3B").length,
      "LF": draftClass.filter(p => p.position === "LF").length,
      "CF": draftClass.filter(p => p.position === "CF").length,
      "RF": draftClass.filter(p => p.position === "RF").length,
      "SP": draftClass.filter(p => p.position === "SP").length,
      "RP": draftClass.filter(p => p.position === "RP").length,
      "CP": draftClass.filter(p => p.position === "CP").length,
    };

    const topProspects = [...draftClass]
      .sort((a, b) => {
        const gradeOrder = { "B": 5, "B-": 4, "C+": 3, "C": 2, "C-": 1 };
        return gradeOrder[b.grade] - gradeOrder[a.grade];
      })
      .slice(0, 6);

    return (
      <div className="fixed inset-0 bg-black/90 z-50 overflow-y-auto">
        <div className="min-h-screen p-8">
          <div className="max-w-5xl mx-auto bg-[#6B9462] border-[5px] border-[#4A6844]">
            {/* Header */}
            <div className="bg-[#4A6844] p-4 border-b-[3px] border-[#3F5A3A]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-[#E8E8D8]">📋 DRAFT CLASS PREVIEW - SEASON {seasonNumber}</div>
                  <div className="text-[10px] text-[#E8E8D8]/60 mt-1">Screen 2 of 9 • 🌱 All picks go to FARM roster</div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Overview */}
              <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4">
                <div className="text-xs text-[#E8E8D8] mb-3">DRAFT CLASS OVERVIEW</div>
                <div className="grid grid-cols-3 gap-4 text-[10px] text-[#E8E8D8]">
                  <div>Total Prospects: <span className="text-[#FFD700]">{draftClass.length}</span></div>
                  <div>From Inactive DB: <span className="text-[#5599FF]">{selectedInactivePlayers.length}</span></div>
                  <div>AI Generated: <span className="text-[#5599FF]">{draftClass.length - selectedInactivePlayers.length}</span></div>
                </div>
                
                <div className="text-xs text-[#E8E8D8] mt-4 mb-2">GRADE DISTRIBUTION (B to C- only):</div>
                <div className="space-y-1 text-[10px] text-[#E8E8D8]">
                  {Object.entries(gradeDistribution).map(([grade, count]) => (
                    <div key={grade} className="flex items-center gap-2">
                      <span className="w-8">{grade}:</span>
                      <div className="flex-1 bg-[#4A6844] h-4 max-w-xs">
                        <div 
                          className="bg-[#5599FF] h-full"
                          style={{ width: `${(count / draftClass.length) * 100}%` }}
                        />
                      </div>
                      <span>{count} ({Math.round((count / draftClass.length) * 100)}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Prospects */}
              <div className="bg-[#5A8352] border-[3px] border-[#4A6844]">
                <div className="bg-[#4A6844] p-2 flex items-center justify-between">
                  <div className="text-[10px] text-[#E8E8D8]">TOP PROSPECTS</div>
                </div>
                <div className="p-4 grid grid-cols-3 gap-3">
                  {topProspects.map(prospect => (
                    <div key={prospect.id} className="bg-[#4A6844] border-[2px] border-[#3F5A3A] p-3 text-center">
                      <div className="text-xs text-[#E8E8D8] mb-1">{prospect.name}</div>
                      <div className="text-[10px] text-[#E8E8D8]/80 mb-2">
                        {prospect.position} │ <span className={getGradeColor(prospect.grade)}>{prospect.grade}</span>
                      </div>
                      <div className="text-[9px] text-[#E8E8D8]/60 mb-1">Age: {prospect.age}</div>
                      <div className={`text-[9px] ${getCeilingColor(prospect.potentialCeiling)} mb-2`}>
                        {prospect.fromInactive ? "⭐ FROM INACTIVE" : `⭐ Ceiling: ${prospect.potentialCeiling}`}
                      </div>
                      <div className="text-[9px] text-[#E8E8D8]/60">→ FARM</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Position Breakdown */}
              <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4">
                <div className="text-xs text-[#E8E8D8] mb-2">BY POSITION</div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-[#E8E8D8]">
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(positionCounts).slice(0, 8).map(([pos, count]) => (
                      <span key={pos}>{pos}: {count}</span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(positionCounts).slice(8).map(([pos, count]) => (
                      <span key={pos}>{pos}: {count}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Button */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleContinueToOrder}
                  className="bg-[#5599FF] border-[3px] border-[#3366FF] px-8 py-3 text-xs text-[#E8E8D8] hover:bg-[#3366FF] active:scale-95 transition-transform"
                >
                  Continue to Draft Order →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Screen 3: Draft Order Reveal
  if (currentScreen === "order-reveal") {
    const userTeamIndex = userTeamName ? Object.keys(teamRosters).indexOf(userTeamName) : -1;
    const teamsList = Object.values(teamRosters).slice(0, 20);

    return (
      <div className="fixed inset-0 bg-black/90 z-50 overflow-y-auto">
        <div className="min-h-screen p-8">
          <div className="max-w-5xl mx-auto bg-[#6B9462] border-[5px] border-[#4A6844]">
            {/* Header */}
            <div className="bg-[#4A6844] p-4 border-b-[3px] border-[#3F5A3A]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-[#E8E8D8]">🎯 DRAFT ORDER - SEASON {seasonNumber}</div>
                  <div className="text-[10px] text-[#E8E8D8]/60 mt-1">Screen 3 of 9 • 🌱 All drafted players go directly to FARM roster</div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Method */}
              <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-3 text-[10px] text-[#E8E8D8] text-center">
                ORDER DETERMINED BY: Reverse Average Expected WAR (Weaker teams pick first)
              </div>

              {/* Draft Order */}
              <div className="bg-[#5A8352] border-[3px] border-[#4A6844]">
                <div className="bg-[#4A6844] p-2">
                  <div className="grid grid-cols-2 text-[10px] text-[#E8E8D8]">
                    <div>DRAFT ORDER</div>
                    <div className="text-right">TOTAL ROSTER STATUS (out of 32)</div>
                  </div>
                </div>
                <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                  {teamsList.map((team, index) => {
                    const isUserTeam = team.teamName === userTeamName;
                    
                    return (
                      <div 
                        key={team.teamName}
                        className={`p-3 ${isUserTeam ? 'bg-[#FFD700]/20 border-[3px] border-[#FFD700]' : 'bg-[#4A6844]'}`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-[#E8E8D8]">
                          <div className="flex items-center gap-3">
                            <span className={`${isUserTeam ? 'text-[#FFD700]' : 'text-[#E8E8D8]'}`}>
                              #{index + 1} {isUserTeam ? '⭐' : ''} {team.teamName.toUpperCase()} {isUserTeam ? '⭐' : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[#E8E8D8]/60">
                              {team.totalCount}/32 ({team.totalGaps} gaps) │ MLB: {team.mlbCount}/22 │ Farm: {team.farmCount}
                            </span>
                            {isUserTeam && <span className="text-[#FFD700]">← YOU</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* League Summary */}
              <div className="bg-[#5A8352] border-[#3px] border-[#4A6844] p-3">
                <div className="text-xs text-[#E8E8D8] mb-2">LEAGUE ROSTER NEEDS</div>
                <div className="grid grid-cols-3 gap-4 text-[10px] text-[#E8E8D8]">
                  <div>Total Gaps: <span className="text-[#DD0000]">{teamsList.reduce((sum, t) => sum + t.totalGaps, 0)}</span></div>
                  <div>Full Rosters (32/32): <span className="text-[#00DD00]">{teamsList.filter(t => t.totalGaps === 0).length} teams</span></div>
                  <div>Need Players: <span className="text-[#FFD700]">{teamsList.filter(t => t.totalGaps > 0).length} teams</span></div>
                </div>
              </div>

              <div className="text-[10px] text-[#E8E8D8] text-center">
                Your team picks #{userTeamIndex + 1} overall (Round 1) - Drafts go to Farm
              </div>

              {/* Button */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleBeginDraft}
                  className="bg-[#5599FF] border-[3px] border-[#3366FF] px-8 py-3 text-xs text-[#E8E8D8] hover:bg-[#3366FF] active:scale-95 transition-transform"
                >
                  Begin Draft →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Screen 4: Draft Board
  if (currentScreen === "draft-board") {
    const currentPick = draftPicks[currentPickIndex];
    const recentPicks = draftPicks.slice(0, currentPickIndex).filter(p => p.prospect).reverse().slice(0, 5);
    const upcomingPicks = draftPicks.slice(currentPickIndex, currentPickIndex + 10);
    const isUserPick = currentPick?.teamName === userTeamName;
    const currentTeamStatus = currentPick ? teamRosters[currentPick.teamName] : null;

    const availableProspects = sortProspects(draftClass);

    const canPass = currentTeamStatus && currentTeamStatus.draftedThisDraft >= 1;
    const canDraft = isUserPick && selectedProspect;

    return (
      <div className="fixed inset-0 bg-black/90 z-50 overflow-y-auto">
        <div className="min-h-screen p-8">
          <div className="max-w-6xl mx-auto bg-[#6B9462] border-[5px] border-[#4A6844]">
            {/* Header */}
            <div className="bg-[#4A6844] p-4 border-b-[3px] border-[#3F5A3A]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-[#E8E8D8]">📋 SEASON {seasonNumber} DRAFT</div>
                  <div className="text-[10px] text-[#E8E8D8]/60 mt-1">
                    Round {currentPick?.round} │ Pick {currentPickIndex + 1} of {draftPicks.length} │ 🌱 All picks → FARM
                  </div>
                </div>
              </div>
            </div>

            {/* On the Clock */}
            <div className="bg-[#FFD700] border-b-[3px] border-[#C4A853] p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-[#1A1A1A]" />
                  <div>
                    <div className="text-sm text-[#1A1A1A] font-bold">ON THE CLOCK: {currentPick?.teamName.toUpperCase()}</div>
                    {currentTeamStatus && (
                      <div className="text-[10px] text-[#1A1A1A]/70">
                        Total Roster: {currentTeamStatus.totalCount}/32 ({currentTeamStatus.totalGaps} gaps) │ 
                        MLB: {currentTeamStatus.mlbCount}/22 │ Farm: {currentTeamStatus.farmCount} │ 
                        Drafted: {currentTeamStatus.draftedThisDraft}
                      </div>
                    )}
                  </div>
                </div>
                {isUserPick && (
                  <div className="flex items-center gap-3">
                    {canPass && (
                      <button
                        onClick={handlePassPick}
                        className="bg-[#DD0000] border-[2px] border-[#AA0000] px-4 py-2 text-xs text-[#E8E8D8] hover:bg-[#AA0000] active:scale-95 transition-transform"
                      >
                        Pass & Exit Draft
                      </button>
                    )}
                    <div className="text-sm text-[#DD0000] font-bold">← YOUR PICK</div>
                  </div>
                )}
              </div>
            </div>

            {/* Main Content */}
            <div className="p-4">
              {/* Action Bar */}
              {isUserPick && (
                <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-3 mb-4 flex items-center justify-between">
                  <div className="text-xs text-[#E8E8D8]">
                    {selectedProspect ? (
                      <>Selected: <span className="text-[#FFD700]">{selectedProspect.name}</span> ({selectedProspect.position}, {selectedProspect.grade})</>
                    ) : (
                      <>Select a player from the table below by clicking the checkbox</>
                    )}
                  </div>
                  <div className="flex gap-3">
                    {selectedProspect && (
                      <button
                        onClick={() => setSelectedProspect(null)}
                        className="bg-[#4A6844] border-[2px] border-[#3F5A3A] px-4 py-2 text-xs text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform"
                      >
                        Clear Selection
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (canDraft && selectedProspect) {
                          handleSelectProspect(selectedProspect);
                        }
                      }}
                      className={`border-[2px] px-6 py-2 text-xs text-[#E8E8D8] transition-transform ${
                        canDraft 
                          ? 'bg-[#5599FF] border-[#3366FF] hover:bg-[#3366FF] cursor-pointer active:scale-95' 
                          : 'bg-[#4A6844] border-[#3F5A3A] opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {canDraft ? '✓ DRAFT SELECTED PLAYER' : 'Select a Player to Draft'}
                    </button>
                  </div>
                </div>
              )}

              {/* Prospects Table */}
              <div className="bg-[#5A8352] border-[3px] border-[#4A6844]">
                <div className="bg-[#4A6844] p-2 flex items-center justify-between">
                  <div className="text-[10px] text-[#E8E8D8]">AVAILABLE PROSPECTS ({availableProspects.length})</div>
                  <div className="text-[9px] text-[#E8E8D8]/60">Click column headers to sort</div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-[9px] text-[#E8E8D8]">
                    <thead className="bg-[#4A6844] sticky top-0">
                      <tr>
                        {isUserPick && <th className="p-2 border-b-2 border-[#3F5A3A]">Select</th>}
                        <th 
                          className="p-2 border-b-2 border-[#3F5A3A] cursor-pointer hover:bg-[#3F5A3A]"
                          onClick={() => handleSort("name")}
                        >
                          Name {sortColumn === "name" && (sortDirection === "asc" ? "↑" : "↓")}
                        </th>
                        <th 
                          className="p-2 border-b-2 border-[#3F5A3A] cursor-pointer hover:bg-[#3F5A3A]"
                          onClick={() => handleSort("position")}
                        >
                          Pos {sortColumn === "position" && (sortDirection === "asc" ? "↑" : "↓")}
                        </th>
                        <th 
                          className="p-2 border-b-2 border-[#3F5A3A] cursor-pointer hover:bg-[#3F5A3A]"
                          onClick={() => handleSort("age")}
                        >
                          Age {sortColumn === "age" && (sortDirection === "asc" ? "↑" : "↓")}
                        </th>
                        <th 
                          className="p-2 border-b-2 border-[#3F5A3A] cursor-pointer hover:bg-[#3F5A3A]"
                          onClick={() => handleSort("grade")}
                        >
                          Grade {sortColumn === "grade" && (sortDirection === "asc" ? "↑" : "↓")}
                        </th>
                        <th 
                          className="p-2 border-b-2 border-[#3F5A3A] cursor-pointer hover:bg-[#3F5A3A]"
                          onClick={() => handleSort("ceiling")}
                        >
                          Ceiling {sortColumn === "ceiling" && (sortDirection === "asc" ? "↑" : "↓")}
                        </th>
                        <th 
                          className="p-2 border-b-2 border-[#3F5A3A] cursor-pointer hover:bg-[#3F5A3A]"
                          onClick={() => handleSort("power")}
                        >
                          PWR {sortColumn === "power" && (sortDirection === "asc" ? "↑" : "↓")}
                        </th>
                        <th 
                          className="p-2 border-b-2 border-[#3F5A3A] cursor-pointer hover:bg-[#3F5A3A]"
                          onClick={() => handleSort("contact")}
                        >
                          CON {sortColumn === "contact" && (sortDirection === "asc" ? "↑" : "↓")}
                        </th>
                        <th 
                          className="p-2 border-b-2 border-[#3F5A3A] cursor-pointer hover:bg-[#3F5A3A]"
                          onClick={() => handleSort("speed")}
                        >
                          SPD {sortColumn === "speed" && (sortDirection === "asc" ? "↑" : "↓")}
                        </th>
                        <th 
                          className="p-2 border-b-2 border-[#3F5A3A] cursor-pointer hover:bg-[#3F5A3A]"
                          onClick={() => handleSort("fielding")}
                        >
                          FLD {sortColumn === "fielding" && (sortDirection === "asc" ? "↑" : "↓")}
                        </th>
                        <th 
                          className="p-2 border-b-2 border-[#3F5A3A] cursor-pointer hover:bg-[#3F5A3A]"
                          onClick={() => handleSort("velocity")}
                        >
                          VEL {sortColumn === "velocity" && (sortDirection === "asc" ? "↑" : "↓")}
                        </th>
                        <th 
                          className="p-2 border-b-2 border-[#3F5A3A] cursor-pointer hover:bg-[#3F5A3A]"
                          onClick={() => handleSort("junk")}
                        >
                          JNK {sortColumn === "junk" && (sortDirection === "asc" ? "↑" : "↓")}
                        </th>
                        <th 
                          className="p-2 border-b-2 border-[#3F5A3A] cursor-pointer hover:bg-[#3F5A3A]"
                          onClick={() => handleSort("accuracy")}
                        >
                          ACC {sortColumn === "accuracy" && (sortDirection === "asc" ? "↑" : "↓")}
                        </th>
                        <th className="p-2 border-b-2 border-[#3F5A3A]">Trait</th>
                        <th className="p-2 border-b-2 border-[#3F5A3A]">Source</th>
                      </tr>
                    </thead>
                    <tbody className="max-h-[400px] overflow-y-auto">
                      {availableProspects.map(prospect => (
                        <tr 
                          key={prospect.id} 
                          className={`border-b border-[#4A6844] hover:bg-[#4A6844] ${
                            selectedProspect?.id === prospect.id ? 'bg-[#5599FF]/20' : ''
                          }`}
                        >
                          {isUserPick && (
                            <td className="p-2 text-center">
                              <input
                                type="checkbox"
                                checked={selectedProspect?.id === prospect.id}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedProspect(prospect);
                                  } else {
                                    setSelectedProspect(null);
                                  }
                                }}
                                className="w-4 h-4 cursor-pointer"
                              />
                            </td>
                          )}
                          <td className="p-2">{prospect.name}</td>
                          <td className="p-2 text-center">{prospect.position}</td>
                          <td className="p-2 text-center">{prospect.age}</td>
                          <td className={`p-2 text-center ${getGradeColor(prospect.grade)}`}>{prospect.grade}</td>
                          <td className={`p-2 text-center ${getCeilingColor(prospect.potentialCeiling)}`}>{prospect.potentialCeiling}</td>
                          <td className="p-2 text-center">{prospect.power || "-"}</td>
                          <td className="p-2 text-center">{prospect.contact || "-"}</td>
                          <td className="p-2 text-center">{prospect.speed || "-"}</td>
                          <td className="p-2 text-center">{prospect.fielding || "-"}</td>
                          <td className="p-2 text-center">{prospect.velocity || "-"}</td>
                          <td className="p-2 text-center">{prospect.junk || "-"}</td>
                          <td className="p-2 text-center">{prospect.accuracy || "-"}</td>
                          <td className="p-2 text-center">{prospect.personality}</td>
                          <td className="p-2 text-center">
                            {prospect.fromInactive ? <span className="text-[#FFD700]">★ INACTIVE</span> : "AI"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Picks */}
              <div className="bg-[#5A8352] border-[3px] border-[#4A6844] mt-4">
                <div className="bg-[#4A6844] p-2 text-[10px] text-[#E8E8D8]">RECENT PICKS</div>
                <div className="p-3 grid grid-cols-5 gap-2">
                  {recentPicks.map(pick => (
                    <div key={pick.pickNumber} className="bg-[#4A6844] p-2 text-[9px]">
                      <div className="text-[#E8E8D8]/60 mb-1">#{pick.pickNumber}</div>
                      <div className="text-[#E8E8D8] mb-1">{pick.prospect?.name}</div>
                      <div className="text-[#E8E8D8]/60">
                        {pick.prospect?.position}, <span className={getGradeColor(pick.prospect?.grade || "")}>{pick.prospect?.grade}</span>
                      </div>
                      <div className="text-[#E8E8D8]/40 mt-1">→ {pick.teamName.split(' ')[0]}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Screen: Pass Modal
  if (currentScreen === "pass-modal") {
    const currentPick = draftPicks[currentPickIndex];
    const teamStatus = currentPick ? teamRosters[currentPick.teamName] : null;

    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
        <div className="max-w-2xl mx-auto bg-[#6B9462] border-[5px] border-[#DD0000] p-8">
          <div className="text-sm text-[#DD0000] mb-6 text-center font-bold">
            ⏭️ PASS ON PICK?
          </div>

          {teamStatus && (
            <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4 mb-4">
              <div className="text-xs text-[#E8E8D8] mb-2">CURRENT ROSTER STATUS</div>
              <div className="text-[10px] text-[#E8E8D8]/80 space-y-1">
                <div>Total Roster: {teamStatus.totalCount}/32 ({teamStatus.totalGaps} gaps remaining)</div>
                <div>MLB Roster: {teamStatus.mlbCount}/22</div>
                <div>Farm Roster: {teamStatus.farmCount}</div>
                <div>Drafted This Draft: {teamStatus.draftedThisDraft} players</div>
              </div>
            </div>
          )}

          <div className="bg-[#DD0000]/20 border-[3px] border-[#DD0000] p-4 mb-6">
            <div className="text-xs text-[#DD0000] mb-2">⚠️ WARNING</div>
            <div className="text-[10px] text-[#E8E8D8]/80 space-y-1">
              <div>If you pass now, you will EXIT the draft entirely.</div>
              <div>You will not be called again in any future rounds.</div>
              <div className="pt-2 border-t border-[#DD0000]/50">
                You have drafted: {teamStatus?.draftedThisDraft} players (minimum requirement met)
              </div>
            </div>
          </div>

          <div className="text-xs text-[#E8E8D8] text-center mb-6">
            Are you sure you want to pass and exit the draft?
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setCurrentScreen("draft-board")}
              className="bg-[#4A6844] border-[3px] border-[#3F5A3A] px-6 py-3 text-xs text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform"
            >
              Go Back to Pick
            </button>
            <button
              onClick={handleConfirmPass}
              className="bg-[#DD0000] border-[3px] border-[#AA0000] px-6 py-3 text-xs text-[#E8E8D8] hover:bg-[#AA0000] active:scale-95 transition-transform"
            >
              Pass & Exit Draft
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Screen 5: Pick Selection Modal
  if (currentScreen === "pick-modal") {
    const currentPick = draftPicks[currentPickIndex];
    const isUserPick = currentPick?.teamName === userTeamName;
    const teamStatus = currentPick ? teamRosters[currentPick.teamName] : null;

    if (!isUserPick) {
      // AI Pick announcement
      return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
          <div className="max-w-2xl mx-auto bg-[#6B9462] border-[5px] border-[#4A6844] p-8">
            <div className="text-sm text-[#E8E8D8] mb-4 text-center">
              📋 {currentPick?.teamName.toUpperCase()} SELECT...
            </div>
            <div className="text-[10px] text-[#E8E8D8]/60 mb-6 text-center">
              Round {currentPick?.round} │ Pick {currentPickIndex + 1}
            </div>

            {selectedProspect && (
              <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-6 text-center mb-6">
                <div className="text-lg text-[#E8E8D8] mb-2">{selectedProspect.name}</div>
                <div className="text-sm text-[#E8E8D8]/80 mb-3">
                  {selectedProspect.position} │ <span className={getGradeColor(selectedProspect.grade)}>{selectedProspect.grade}</span> │ Age: {selectedProspect.age}
                </div>
                <div className={`text-xs ${getCeilingColor(selectedProspect.potentialCeiling)} mb-3`}>
                  ⭐ {selectedProspect.fromInactive ? 'FROM INACTIVE' : `POTENTIAL CEILING: ${selectedProspect.potentialCeiling}`}
                </div>
                <div className="text-xs text-[#E8E8D8] bg-[#4A6844] inline-block px-4 py-2">
                  🌱 → {currentPick?.teamName.toUpperCase()} FARM
                </div>
              </div>
            )}

            <div className="text-xs text-[#E8E8D8] text-center mb-6">
              "With the {currentPickIndex + 1}{currentPickIndex === 0 ? 'st' : currentPickIndex === 1 ? 'nd' : currentPickIndex === 2 ? 'rd' : 'th'} pick in the Season {seasonNumber} Draft, the {currentPick?.teamName} select {selectedProspect?.name}, {selectedProspect?.position}, to their Farm roster."
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={handleConfirmPick}
                className="bg-[#5599FF] border-[3px] border-[#3366FF] px-6 py-3 text-xs text-[#E8E8D8] hover:bg-[#3366FF] active:scale-95 transition-transform"
              >
                Continue →
              </button>
            </div>
          </div>
        </div>
      );
    }

    // User Pick modal
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto bg-[#6B9462] border-[5px] border-[#FFD700]">
          <div className="bg-[#FFD700] p-4 border-b-[3px] border-[#C4A853]">
            <div className="text-sm text-[#1A1A1A] font-bold">⭐ YOUR PICK - {userTeamName?.toUpperCase() || 'YOUR TEAM'}</div>
            <div className="text-[10px] text-[#1A1A1A]/70">Round {currentPick?.round} │ Pick {currentPickIndex + 1}</div>
          </div>

          <div className="p-6">
            {selectedProspect && (
              <>
                {/* Player Card */}
                <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-6 mb-4">
                  <div className="text-center mb-4">
                    <div className="text-lg text-[#E8E8D8] mb-2">{selectedProspect.name}</div>
                    <div className="text-sm text-[#E8E8D8]/80 mb-2">
                      {selectedProspect.position} │ Grade: <span className={getGradeColor(selectedProspect.grade)}>{selectedProspect.grade}</span> │ Age: {selectedProspect.age}
                    </div>
                  </div>

                  {/* Attributes */}
                  <div className="bg-[#4A6844] p-4 mb-4">
                    {selectedProspect.position === "SP" || selectedProspect.position === "RP" || selectedProspect.position === "CP" ? (
                      <>
                        <div className="flex items-center justify-between text-[10px] text-[#E8E8D8] mb-2">
                          <span>VEL: {selectedProspect.velocity}</span>
                          <div className="flex-1 mx-3 bg-[#3F5A3A] h-2">
                            <div className="bg-[#5599FF] h-full" style={{ width: `${(selectedProspect.velocity || 0)}%` }} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[#E8E8D8] mb-2">
                          <span>JNK: {selectedProspect.junk}</span>
                          <div className="flex-1 mx-3 bg-[#3F5A3A] h-2">
                            <div className="bg-[#5599FF] h-full" style={{ width: `${(selectedProspect.junk || 0)}%` }} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[#E8E8D8]">
                          <span>ACC: {selectedProspect.accuracy}</span>
                          <div className="flex-1 mx-3 bg-[#3F5A3A] h-2">
                            <div className="bg-[#5599FF] h-full" style={{ width: `${(selectedProspect.accuracy || 0)}%` }} />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-[10px] text-[#E8E8D8] mb-2">
                          <span>PWR: {selectedProspect.power}</span>
                          <div className="flex-1 mx-3 bg-[#3F5A3A] h-2">
                            <div className="bg-[#5599FF] h-full" style={{ width: `${(selectedProspect.power || 0)}%` }} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[#E8E8D8] mb-2">
                          <span>CON: {selectedProspect.contact}</span>
                          <div className="flex-1 mx-3 bg-[#3F5A3A] h-2">
                            <div className="bg-[#5599FF] h-full" style={{ width: `${(selectedProspect.contact || 0)}%` }} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[#E8E8D8] mb-2">
                          <span>SPD: {selectedProspect.speed}</span>
                          <div className="flex-1 mx-3 bg-[#3F5A3A] h-2">
                            <div className="bg-[#5599FF] h-full" style={{ width: `${(selectedProspect.speed || 0)}%` }} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[#E8E8D8]">
                          <span>FLD: {selectedProspect.fielding}</span>
                          <div className="flex-1 mx-3 bg-[#3F5A3A] h-2">
                            <div className="bg-[#5599FF] h-full" style={{ width: `${(selectedProspect.fielding || 0)}%` }} />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className={`text-sm ${getCeilingColor(selectedProspect.potentialCeiling)} text-center mb-2`}>
                    ⭐ {selectedProspect.fromInactive ? 'FROM INACTIVE DATABASE' : `POTENTIAL CEILING: ${selectedProspect.potentialCeiling}`}
                  </div>
                  <div className="text-xs text-[#E8E8D8]/80 text-center mb-2">
                    Personality: {selectedProspect.personality}
                  </div>
                  <div className="text-sm text-[#E8E8D8] bg-[#4A6844] text-center py-2">
                    🌱 DESTINATION: FARM ROSTER (can exceed 10)
                  </div>
                </div>

                {/* Roster Status */}
                {teamStatus && (
                  <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4 mb-4">
                    <div className="text-xs text-[#E8E8D8] mb-2">ROSTER STATUS AFTER PICK</div>
                    <div className="text-[10px] text-[#E8E8D8]/80 mb-2">
                      Total: {teamStatus.totalCount}/32 → {teamStatus.totalCount + 1}/32 ({teamStatus.totalGaps - 1} gaps remaining)
                    </div>
                    <div className="text-[10px] text-[#E8E8D8]/80">
                      Farm: {teamStatus.farmCount} → {teamStatus.farmCount + 1} (can exceed 10, will waive later)
                    </div>
                  </div>
                )}

                {/* Next Steps */}
                <div className="bg-[#5A8352] border-[3px] border-[#5599FF] p-4 mb-6">
                  <div className="text-xs text-[#E8E8D8] mb-2">💡 NEXT STEPS AFTER DRAFT</div>
                  <div className="text-[10px] text-[#E8E8D8]/80 space-y-1">
                    <div>• Trade Phase: Can trade this prospect to other teams</div>
                    <div>• Finalize: Can call up to MLB (becomes Rookie next season)</div>
                    <div>• Can waive excess Farm players to get back to 10</div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setCurrentScreen("draft-board")}
                    className="bg-[#4A6844] border-[3px] border-[#3F5A3A] px-6 py-3 text-xs text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmPick}
                    className="bg-[#5599FF] border-[3px] border-[#3366FF] px-8 py-3 text-xs text-[#E8E8D8] hover:bg-[#3366FF] active:scale-95 transition-transform"
                  >
                    ✓ Confirm Pick → Farm
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Screen 7: Pick Confirmation
  if (currentScreen === "pick-confirmation") {
    const currentPick = draftPicks[currentPickIndex];
    const isUserPick = currentPick?.teamName === userTeamName;
    const teamStatus = currentPick ? teamRosters[currentPick.teamName] : null;

    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
        <div className="max-w-2xl mx-auto bg-[#6B9462] border-[5px] border-[#FFD700] p-8">
          <div className="text-center mb-6">
            <Sparkles className="w-12 h-12 text-[#FFD700] mx-auto mb-4" />
            <div className="text-lg text-[#E8E8D8] mb-2">🎉 PICK CONFIRMED</div>
          </div>

          {selectedProspect && (
            <>
              {/* Player Card */}
              <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-6 mb-4 text-center">
                <div className="text-lg text-[#E8E8D8] mb-2">{selectedProspect.name}</div>
                <div className="text-sm text-[#E8E8D8]/80 mb-2">
                  {selectedProspect.position} │ Grade: <span className={getGradeColor(selectedProspect.grade)}>{selectedProspect.grade}</span>
                </div>
                <div className={`text-sm ${getCeilingColor(selectedProspect.potentialCeiling)} mb-3`}>
                  ⭐ Ceiling: {selectedProspect.potentialCeiling}
                </div>
                <div className="text-sm text-[#E8E8D8] font-bold">
                  🌱 {currentPick?.teamName.toUpperCase()}
                </div>
                <div className="text-xs text-[#E8E8D8]/60">FARM ROSTER</div>
              </div>

              {/* Announcement */}
              <div className="text-xs text-[#E8E8D8] text-center mb-6">
                "With the {currentPickIndex + 1}{currentPickIndex === 0 ? 'st' : currentPickIndex === 1 ? 'nd' : currentPickIndex === 2 ? 'rd' : 'th'} pick in the Season {seasonNumber} Draft, the {currentPick?.teamName} select {selectedProspect.name}, {selectedProspect.position}, to their Farm roster."
              </div>

              {/* Transaction */}
              {isUserPick && teamStatus && (
                <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4 mb-4">
                  <div className="text-xs text-[#E8E8D8] mb-3">TRANSACTION</div>
                  <div className="space-y-2 text-[10px] text-[#E8E8D8]">
                    <div className="text-[#00DD00]">
                      + {selectedProspect.name} ({selectedProspect.position}, {selectedProspect.grade}, Ceiling: {selectedProspect.potentialCeiling}) added to FARM
                    </div>
                    <div className="text-[#E8E8D8]/60 pt-2">
                      Total Roster: {teamStatus.totalCount}/32 ({teamStatus.totalGaps} gaps)
                    </div>
                    <div className="text-[#E8E8D8]/60">
                      Farm Roster: {teamStatus.farmCount} {teamStatus.farmCount > 10 && '(over limit, will waive later)'}
                    </div>
                  </div>
                </div>
              )}

              {/* Reminder */}
              {isUserPick && (
                <div className="bg-[#5A8352] border-[3px] border-[#5599FF] p-4 mb-6">
                  <div className="text-xs text-[#E8E8D8] mb-2">💡 REMINDER: After Draft</div>
                  <div className="text-[10px] text-[#E8E8D8]/80 space-y-1">
                    <div>• Trade Phase → Can trade this prospect</div>
                    <div>• Finalize → Can call up to MLB (becomes Rookie)</div>
                  </div>
                </div>
              )}

              {/* Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleContinueDraft}
                  className="bg-[#5599FF] border-[3px] border-[#3366FF] px-8 py-3 text-xs text-[#E8E8D8] hover:bg-[#3366FF] active:scale-95 transition-transform"
                >
                  Continue Draft →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Screen 8: Undrafted Retirements
  if (currentScreen === "undrafted-retirements") {
    return (
      <div className="fixed inset-0 bg-black/90 z-50 overflow-y-auto">
        <div className="min-h-screen p-8">
          <div className="max-w-4xl mx-auto bg-[#6B9462] border-[5px] border-[#4A6844]">
            {/* Header */}
            <div className="bg-[#4A6844] p-4 border-b-[3px] border-[#3F5A3A]">
              <div className="text-sm text-[#E8E8D8]">👋 UNDRAFTED PLAYERS</div>
              <div className="text-[10px] text-[#E8E8D8]/60 mt-1">Screen 8 of 9</div>
            </div>

            {/* Content */}
            <div className="p-6">
              {draftClass.length > 0 ? (
                <>
                  <div className="text-xs text-[#E8E8D8] mb-4">
                    The following prospects went undrafted and will be added to the inactive database:
                  </div>

                  <div className="bg-[#5A8352] border-[3px] border-[#4A6844]">
                    <div className="bg-[#4A6844] p-2 text-[10px] text-[#E8E8D8]">UNDRAFTED ({draftClass.length})</div>
                    <div className="p-4 space-y-3">
                      {draftClass.slice(0, 10).map(prospect => (
                        <div key={prospect.id} className="bg-[#4A6844] border-[2px] border-[#3F5A3A] p-4">
                          <div className="text-sm text-[#E8E8D8] mb-2">{prospect.name}</div>
                          <div className="text-[10px] text-[#E8E8D8]/80 mb-2">
                            {prospect.position} │ Grade: <span className={getGradeColor(prospect.grade)}>{prospect.grade}</span> │ Age: {prospect.age}
                          </div>
                          <div className={`text-[10px] ${getCeilingColor(prospect.potentialCeiling)} mb-2`}>
                            Potential Ceiling: {prospect.potentialCeiling}
                          </div>
                          <div className="text-[10px] text-[#5599FF]">Added to Inactive Player Database</div>
                        </div>
                      ))}
                      {draftClass.length > 10 && (
                        <div className="text-[10px] text-[#E8E8D8]/60 text-center">
                          ... and {draftClass.length - 10} more
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-[10px] text-[#E8E8D8]/60 text-center mt-4">
                    Note: These players can be added to future draft classes.
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">✓</div>
                  <div className="text-sm text-[#E8E8D8] mb-2">ALL PROSPECTS DRAFTED</div>
                  <div className="text-xs text-[#E8E8D8]/60">
                    Every player in the draft class was selected.
                  </div>
                </div>
              )}

              {/* Button */}
              <div className="flex justify-center pt-6">
                <button
                  onClick={handleContinueToSummary}
                  className="bg-[#5599FF] border-[3px] border-[#3366FF] px-8 py-3 text-xs text-[#E8E8D8] hover:bg-[#3366FF] active:scale-95 transition-transform"
                >
                  Continue to Summary →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Screen 9: Draft Summary
  if (currentScreen === "draft-summary") {
    const userPicks = draftPicks.filter(p => p.teamName === userTeamName && p.prospect);
    const allPicks = draftPicks.filter(p => p.prospect);
    const passedTeams = Object.values(teamRosters).filter(t => t.hasPassedDraft);
    
    const gradeDistribution = {
      "B": allPicks.filter(p => p.prospect?.grade === "B").length,
      "B-": allPicks.filter(p => p.prospect?.grade === "B-").length,
      "C+": allPicks.filter(p => p.prospect?.grade === "C+").length,
      "C": allPicks.filter(p => p.prospect?.grade === "C").length,
      "C-": allPicks.filter(p => p.prospect?.grade === "C-").length,
    };

    const topPicksByCeiling = [...allPicks]
      .sort((a, b) => {
        const ceilingOrder = { "A": 5, "A-": 4, "B+": 3, "B": 2, "B-": 1, "N/A": 0 };
        return ceilingOrder[b.prospect?.potentialCeiling || "N/A"] - ceilingOrder[a.prospect?.potentialCeiling || "N/A"];
      })
      .slice(0, 3);

    const userTeamStatus = userTeamName ? teamRosters[userTeamName] : undefined;

    return (
      <div className="fixed inset-0 bg-black/90 z-50 overflow-y-auto">
        <div className="min-h-screen p-8">
          <div className="max-w-6xl mx-auto bg-[#6B9462] border-[5px] border-[#FFD700]">
            {/* Header */}
            <div className="bg-[#FFD700] p-4 border-b-[3px] border-[#C4A853]">
              <div className="text-sm text-[#1A1A1A] font-bold">📊 DRAFT SUMMARY - SEASON {seasonNumber}</div>
              <div className="text-[10px] text-[#1A1A1A]/70 mt-1">Screen 9 of 9 • 🌱 ALL PICKS WENT TO FARM ROSTERS</div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Top Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Overview */}
                <div className="bg-[#5A8352] border-[3px] border-[#4A6844]">
                  <div className="bg-[#4A6844] p-2 text-[10px] text-[#E8E8D8]">DRAFT OVERVIEW</div>
                  <div className="p-4 space-y-2 text-[10px] text-[#E8E8D8]">
                    <div>Total Picks: <span className="text-[#FFD700]">{allPicks.length}</span></div>
                    <div>Teams Passed: <span className="text-[#DD0000]">{passedTeams.length}</span></div>
                    <div>AI Generated: <span className="text-[#5599FF]">{allPicks.filter(p => !p.prospect?.fromInactive).length}</span></div>
                    <div>From Inactive DB: <span className="text-[#5599FF]">{allPicks.filter(p => p.prospect?.fromInactive).length}</span></div>
                    <div>Undrafted: <span className="text-[#DD0000]">{draftClass.length}</span></div>
                    <div className="pt-2 border-t border-[#4A6844]">
                      Grade Range: <span className="text-[#5599FF]">B to C-</span>
                    </div>
                    <div className="text-[9px] text-[#E8E8D8]/60">(No A-tier in Farm draft)</div>
                  </div>
                </div>

                {/* Top Picks by Ceiling */}
                <div className="bg-[#5A8352] border-[#3px] border-[#4A6844]">
                  <div className="bg-[#4A6844] p-2 text-[10px] text-[#E8E8D8]">TOP PICKS (By Ceiling)</div>
                  <div className="p-4 space-y-3">
                    {topPicksByCeiling.map((pick, index) => (
                      <div key={pick.pickNumber} className="text-[10px] text-[#E8E8D8]">
                        <div className="mb-1">
                          #{pick.pickNumber} {pick.prospect?.name} ({pick.prospect?.position}, <span className={getGradeColor(pick.prospect?.grade || "")}>{pick.prospect?.grade}</span>)
                        </div>
                        <div className="text-[9px] text-[#E8E8D8]/60 mb-1">
                          → {pick.teamName} Farm 🌱
                        </div>
                        <div className={`text-[9px] ${getCeilingColor(pick.prospect?.potentialCeiling || "")}`}>
                          ⭐ Ceiling: {pick.prospect?.potentialCeiling}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Your Picks */}
                <div className="bg-[#5A8352] border-[3px] border-[#FFD700]">
                  <div className="bg-[#FFD700] p-2 text-[10px] text-[#1A1A1A] font-bold">YOUR PICKS ({userTeamName ? `${userTeamName} Farm` : 'Your Farm'})</div>
                  <div className="p-4 space-y-3">
                    {userPicks.length > 0 ? (
                      userPicks.map((pick, index) => (
                        <div key={pick.pickNumber} className="bg-[#4A6844] p-3">
                          <div className="text-[10px] text-[#E8E8D8] mb-1">
                            R{pick.round} #{pick.pickNumber}: {pick.prospect?.name} ({pick.prospect?.position})
                          </div>
                          <div className="text-[9px] text-[#E8E8D8]/80 mb-1">
                            Grade: <span className={getGradeColor(pick.prospect?.grade || "")}>{pick.prospect?.grade}</span>, 
                            Ceiling: <span className={getCeilingColor(pick.prospect?.potentialCeiling || "")}>{pick.prospect?.potentialCeiling}</span>
                          </div>
                          <div className="text-[9px] text-[#5599FF]">→ {userTeamName?.toUpperCase() || 'YOUR TEAM'} FARM</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-[10px] text-[#E8E8D8]/60">
                        You passed on the draft
                      </div>
                    )}
                    {userTeamStatus && (
                      <div className="bg-[#4A6844] p-3 border-t-2 border-[#3F5A3A]">
                        <div className="text-[10px] text-[#E8E8D8]/80">
                          Final Roster: {userTeamStatus.totalCount}/32 ({userTeamStatus.totalGaps} gaps)
                        </div>
                        <div className="text-[10px] text-[#E8E8D8]/80">
                          Farm: {userTeamStatus.farmCount} {userTeamStatus.farmCount > 10 && '(will waive excess)'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Distributions */}
                <div className="bg-[#5A8352] border-[3px] border-[#4A6844]">
                  <div className="bg-[#4A6844] p-2 text-[10px] text-[#E8E8D8]">BY GRADE</div>
                  <div className="p-4">
                    <div className="text-[10px] text-[#E8E8D8] mb-2">GRADE DISTRIBUTION:</div>
                    <div className="space-y-1 text-[9px] text-[#E8E8D8] mb-4">
                      {Object.entries(gradeDistribution).map(([grade, count]) => (
                        <div key={grade}>
                          {grade}: {'█'.repeat(Math.ceil((count / allPicks.length) * 10))} {count} ({Math.round((count / allPicks.length) * 100)}%)
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Roster Status & Next Steps */}
              <div className="bg-[#5A8352] border-[3px] border-[#5599FF] p-4">
                <div className="text-xs text-[#E8E8D8] mb-3">ROSTER STATUS</div>
                <div className="text-[10px] text-[#E8E8D8] mb-4">
                  Draft complete! Teams can now have more than 32 total players (and more than 10 on Farm).
                </div>
                
                <div className="text-xs text-[#E8E8D8] mb-2">NEXT STEPS:</div>
                <div className="text-[10px] text-[#E8E8D8]/80 space-y-1">
                  <div>• Trade Phase - Trade Farm/MLB players with other teams</div>
                  <div>• Finalize & Advance - Call up prospects to MLB (become Rookies)</div>
                  <div>• Waive excess players to get back to 22 MLB + 10 Farm = 32 total</div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-center pt-4">
                <button
                  onClick={handleSaveAndComplete}
                  disabled={isSaving}
                  className={`border-[3px] px-8 py-3 text-xs text-[#E8E8D8] active:scale-95 transition-transform ${
                    isSaving
                      ? 'bg-[#4A6844] border-[#3F5A3A] cursor-wait opacity-70'
                      : 'bg-[#5599FF] border-[#3366FF] hover:bg-[#3366FF]'
                  }`}
                >
                  {isSaving ? 'Saving Draft Results...' : 'Continue to Trade Phase →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
