import { useNavigate } from "react-router";
import { ArrowLeft, Shuffle, Play, Users, RefreshCw, Trash2, Plus, Sparkles, User } from "lucide-react";
import { useState, useMemo } from "react";
import {
  useLeagueBuilderData,
  type Player,
  type Position,
  type Grade,
} from "../../hooks/useLeagueBuilderData";

type TabType = "settings" | "prospects" | "inactive";

const GRADES: Grade[] = ['B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-'];
const POSITIONS: Position[] = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'SP', 'RP', 'CP'];

interface DraftProspect {
  id: string;
  firstName: string;
  lastName: string;
  position: Position;
  grade: Grade;
  age: number;
  ceiling: Grade;
  isFromInactive: boolean;
}

export function LeagueBuilderDraft() {
  const navigate = useNavigate();
  const { teams, players, isLoading, error } = useLeagueBuilderData();

  const [activeTab, setActiveTab] = useState<TabType>("settings");
  const [draftRounds, setDraftRounds] = useState(3);
  const [pickTimer, setPickTimer] = useState(90);
  const [draftOrder, setDraftOrder] = useState<"snake" | "straight">("snake");
  const [autoPickEnabled, setAutoPickEnabled] = useState(true);

  // Mock draft class - in production this would be generated/stored
  const [prospects, setProspects] = useState<DraftProspect[]>([]);
  const [selectedInactive, setSelectedInactive] = useState<string[]>([]);

  // Get inactive players (those without a team assignment, grade B or below)
  const inactivePlayers = useMemo(() => {
    return players.filter(
      (p) =>
        p.currentTeamId === null &&
        ['B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-'].includes(p.overallGrade)
    );
  }, [players]);

  // Generate prospects
  const generateProspects = () => {
    const generated: DraftProspect[] = [];
    const totalProspects = teams.length * draftRounds;

    // Generate balanced by position
    for (let i = 0; i < totalProspects; i++) {
      const position = POSITIONS[i % POSITIONS.length];
      const gradeIdx = Math.floor(Math.random() * GRADES.length);
      const ceilingIdx = Math.max(0, gradeIdx - Math.floor(Math.random() * 3));

      generated.push({
        id: `prospect-${Date.now()}-${i}`,
        firstName: generateFirstName(),
        lastName: generateLastName(),
        position,
        grade: GRADES[gradeIdx],
        age: 18 + Math.floor(Math.random() * 5),
        ceiling: GRADES[ceilingIdx],
        isFromInactive: false,
      });
    }

    // Add selected inactive players
    const inactiveProspects: DraftProspect[] = selectedInactive
      .map((id) => {
        const player = players.find((p) => p.id === id);
        if (!player) return null;
        return {
          id: `inactive-${player.id}`,
          firstName: player.firstName,
          lastName: player.lastName,
          position: player.primaryPosition,
          grade: player.overallGrade,
          age: 22,
          ceiling: player.overallGrade,
          isFromInactive: true,
        };
      })
      .filter(Boolean) as DraftProspect[];

    setProspects([...inactiveProspects, ...generated]);
  };

  const gradeDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    prospects.forEach((p) => {
      dist[p.grade] = (dist[p.grade] || 0) + 1;
    });
    return dist;
  }, [prospects]);

  const positionDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    prospects.forEach((p) => {
      dist[p.position] = (dist[p.position] || 0) + 1;
    });
    return dist;
  }, [prospects]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#2d3d2f] text-[#E8E8D8] p-8 flex items-center justify-center">
        <div className="text-lg">Loading draft configuration...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#2d3d2f] text-[#E8E8D8] p-8 flex items-center justify-center">
        <div className="text-xl text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#2d3d2f] text-[#E8E8D8] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/league-builder")}
              className="p-3 bg-[#4A6844] hover:bg-[#5A8352] border-4 border-[#E8E8D8] transition active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
            >
              <ArrowLeft className="w-6 h-6 text-[#E8E8D8]" />
            </button>
            <div className="flex items-center gap-3 bg-[#5A8352] border-[6px] border-[#E8E8D8] px-8 py-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]">
              <Shuffle className="w-6 h-6" style={{ color: "#7733DD" }} />
              <h1
                className="text-2xl font-bold text-[#E8E8D8] tracking-wider"
                style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
              >
                DRAFT SETUP
              </h1>
            </div>
          </div>
          {prospects.length > 0 && (
            <button
              className="flex items-center gap-2 px-6 py-3 bg-[#7733DD] hover:bg-[#6622CC] border-4 border-[#E8E8D8] transition active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
              onClick={() => {
                // In production, this would navigate to the draft execution flow
                alert("Draft simulation would start here during Offseason Phase 7");
              }}
            >
              <Play className="w-5 h-5" />
              <span className="font-bold">START DRAFT</span>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(["settings", "prospects", "inactive"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-bold transition ${
                activeTab === tab
                  ? "bg-[#7733DD] border-4 border-[#E8E8D8] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
                  : "bg-[#4A6844] border-4 border-[#E8E8D8]/30 hover:border-[#E8E8D8]/60"
              }`}
            >
              {tab === "settings" && "SETTINGS"}
              {tab === "prospects" && `PROSPECTS (${prospects.length})`}
              {tab === "inactive" && `INACTIVE (${inactivePlayers.length})`}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "settings" && (
          <div className="grid grid-cols-2 gap-6">
            {/* Draft Configuration */}
            <div className="bg-[#556B55] border-[6px] border-[#4A6844] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
              <h3
                className="font-bold mb-6 text-lg"
                style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}
              >
                DRAFT CONFIGURATION
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-[#E8E8D8]/60 mb-1">DRAFT ORDER</label>
                  <select
                    value={draftOrder}
                    onChange={(e) => setDraftOrder(e.target.value as "snake" | "straight")}
                    className="w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none"
                  >
                    <option value="snake">Snake (1-2-3...3-2-1)</option>
                    <option value="straight">Straight (1-2-3...1-2-3)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-[#E8E8D8]/60 mb-1">
                    ROUNDS ({draftRounds})
                  </label>
                  <input
                    type="range"
                    value={draftRounds}
                    onChange={(e) => setDraftRounds(parseInt(e.target.value, 10))}
                    className="w-full accent-[#7733DD]"
                    min={1}
                    max={5}
                  />
                  <div className="flex justify-between text-xs text-[#E8E8D8]/60 mt-1">
                    <span>1</span>
                    <span>3</span>
                    <span>5</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#E8E8D8]/60 mb-1">
                    PICK TIMER ({pickTimer}s)
                  </label>
                  <input
                    type="range"
                    value={pickTimer}
                    onChange={(e) => setPickTimer(parseInt(e.target.value, 10))}
                    className="w-full accent-[#7733DD]"
                    min={30}
                    max={180}
                    step={15}
                  />
                  <div className="flex justify-between text-xs text-[#E8E8D8]/60 mt-1">
                    <span>30s</span>
                    <span>90s</span>
                    <span>180s</span>
                  </div>
                </div>

                <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoPickEnabled}
                      onChange={(e) => setAutoPickEnabled(e.target.checked)}
                      className="w-5 h-5 accent-[#7733DD]"
                    />
                    <div>
                      <span className="font-bold">CPU AUTO-PICK</span>
                      <p className="text-xs text-[#E8E8D8]/60 mt-1">
                        AI teams automatically select best available
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Draft Class Overview */}
            <div className="bg-[#556B55] border-[6px] border-[#4A6844] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
              <h3
                className="font-bold mb-6 text-lg"
                style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}
              >
                DRAFT CLASS OVERVIEW
              </h3>

              {prospects.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-[#7733DD] opacity-50" />
                  <p className="text-[#E8E8D8]/60 mb-4">
                    No draft class generated yet
                  </p>
                  <button
                    onClick={generateProspects}
                    className="flex items-center gap-2 px-6 py-3 bg-[#7733DD] hover:bg-[#6622CC] border-4 border-[#E8E8D8] transition mx-auto"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span className="font-bold">GENERATE PROSPECTS</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3">
                      <div className="text-xs text-[#E8E8D8]/60 mb-1">TOTAL PROSPECTS</div>
                      <div className="font-bold text-xl">{prospects.length}</div>
                    </div>
                    <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3">
                      <div className="text-xs text-[#E8E8D8]/60 mb-1">FROM INACTIVE</div>
                      <div className="font-bold text-xl">
                        {prospects.filter((p) => p.isFromInactive).length}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3">
                    <div className="text-xs text-[#E8E8D8]/60 mb-2">GRADE DISTRIBUTION</div>
                    <div className="flex flex-wrap gap-2">
                      {GRADES.map((grade) => (
                        <div key={grade} className="bg-[#556B55] px-2 py-1 text-xs">
                          <span className="font-bold">{grade}:</span>{" "}
                          {gradeDistribution[grade] || 0}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={generateProspects}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#4A6844] hover:bg-[#5A8352] border-4 border-[#E8E8D8]/30 transition"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span className="font-bold">REGENERATE</span>
                    </button>
                    <button
                      onClick={() => setProspects([])}
                      className="flex items-center gap-2 px-4 py-2 bg-[#DD0000] hover:bg-[#FF2222] border-4 border-[#E8E8D8]/30 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Teams Participating */}
            <div className="col-span-2 bg-[#556B55] border-[6px] border-[#4A6844] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
              <h3
                className="font-bold mb-4 text-lg"
                style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}
              >
                PARTICIPATING TEAMS ({teams.length})
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {teams.map((team, idx) => (
                  <div
                    key={team.id}
                    className="flex items-center gap-2 bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-2"
                  >
                    <span className="w-6 h-6 flex items-center justify-center bg-[#7733DD] font-bold text-sm">
                      {idx + 1}
                    </span>
                    <div
                      className="w-6 h-6 rounded-full border-2"
                      style={{
                        backgroundColor: team.colors.primary,
                        borderColor: team.colors.secondary,
                      }}
                    />
                    <span className="flex-1 font-bold text-sm truncate">{team.name}</span>
                  </div>
                ))}
                {teams.length === 0 && (
                  <div className="col-span-4 text-center py-4 text-[#E8E8D8]/50">
                    No teams created yet. Create teams first to set up a draft.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "prospects" && (
          <div className="bg-[#556B55] border-[6px] border-[#4A6844] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between mb-4">
              <h3
                className="font-bold text-lg"
                style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}
              >
                DRAFT CLASS ({prospects.length} prospects)
              </h3>
              {prospects.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={generateProspects}
                    className="flex items-center gap-2 px-4 py-2 bg-[#4A6844] hover:bg-[#5A8352] border-4 border-[#E8E8D8]/30"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span className="font-bold text-sm">REGENERATE</span>
                  </button>
                </div>
              )}
            </div>

            {prospects.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-16 h-16 mx-auto mb-4 text-[#E8E8D8]/30" />
                <p className="text-[#E8E8D8]/60 mb-4">
                  Generate a draft class to see prospects
                </p>
                <button
                  onClick={generateProspects}
                  className="flex items-center gap-2 px-6 py-3 bg-[#7733DD] hover:bg-[#6622CC] border-4 border-[#E8E8D8] transition mx-auto"
                >
                  <Sparkles className="w-5 h-5" />
                  <span className="font-bold">GENERATE PROSPECTS</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 max-h-[500px] overflow-y-auto">
                {prospects.map((prospect) => (
                  <div
                    key={prospect.id}
                    className={`bg-[#4A6844] border-4 p-3 ${
                      prospect.isFromInactive
                        ? "border-[#7733DD]"
                        : "border-[#E8E8D8]/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm">
                        {prospect.firstName} {prospect.lastName}
                      </span>
                      {prospect.isFromInactive && (
                        <span className="px-2 py-0.5 bg-[#7733DD] text-xs font-bold">
                          INACTIVE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#E8E8D8]/70">
                      <span className="px-2 py-0.5 bg-[#556B55]">{prospect.position}</span>
                      <span>Grade: {prospect.grade}</span>
                      <span>Age: {prospect.age}</span>
                    </div>
                    <div className="mt-2 text-xs">
                      <span className="text-[#E8E8D8]/60">Ceiling: </span>
                      <span className="font-bold text-[#7733DD]">{prospect.ceiling}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "inactive" && (
          <div className="bg-[#556B55] border-[6px] border-[#4A6844] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between mb-4">
              <h3
                className="font-bold text-lg"
                style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}
              >
                INACTIVE PLAYERS (B or below)
              </h3>
              <div className="text-sm text-[#E8E8D8]/60">
                {selectedInactive.length} selected for draft
              </div>
            </div>

            <p className="text-[#E8E8D8]/70 mb-4 text-sm">
              Select retired or released players to add to the draft class. Only players with
              grade B or below are eligible (Farm roster max grade).
            </p>

            {inactivePlayers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-[#E8E8D8]/30" />
                <p className="text-[#E8E8D8]/60">
                  No inactive players eligible for draft
                </p>
                <p className="text-[#E8E8D8]/50 text-sm mt-2">
                  Players must be unassigned and grade B or below
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {inactivePlayers.map((player) => (
                  <label
                    key={player.id}
                    className={`flex items-center gap-3 bg-[#4A6844] border-4 p-3 cursor-pointer transition ${
                      selectedInactive.includes(player.id)
                        ? "border-[#7733DD]"
                        : "border-[#E8E8D8]/30 hover:border-[#E8E8D8]/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedInactive.includes(player.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedInactive([...selectedInactive, player.id]);
                        } else {
                          setSelectedInactive(selectedInactive.filter((id) => id !== player.id));
                        }
                      }}
                      className="w-5 h-5 accent-[#7733DD]"
                    />
                    <span className="px-2 py-0.5 bg-[#556B55] text-xs font-bold">
                      {player.primaryPosition}
                    </span>
                    <span className="flex-1 font-bold text-sm">
                      {player.firstName} {player.lastName}
                    </span>
                    <span className="text-xs text-[#E8E8D8]/70">
                      {player.overallGrade}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {selectedInactive.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#E8E8D8]/20">
                <button
                  onClick={() => setSelectedInactive([])}
                  className="flex items-center gap-2 px-4 py-2 bg-[#DD0000] hover:bg-[#FF2222] border-4 border-[#E8E8D8]/30 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="font-bold text-sm">CLEAR SELECTION</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Info Panel */}
        <div className="mt-6 bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
          <div className="flex items-start gap-3">
            <Shuffle className="w-5 h-5 text-[#7733DD] flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm mb-1">Farm-First Draft Model</h4>
              <p className="text-xs text-[#E8E8D8]/70">
                All drafted players go directly to FARM rosters (max grade B). Draft class
                consists of AI-generated prospects plus any inactive players you select.
                After the draft, use the Trade phase to swap players, then Finalize &
                Advance to call up prospects to MLB.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Name generators
const FIRST_NAMES = [
  "Marcus", "Jake", "Carlos", "David", "Michael", "James", "Robert", "John",
  "Tyler", "Ryan", "Kevin", "Brian", "Chris", "Matt", "Alex", "Sam", "Nick",
  "Eric", "Jason", "Brandon", "Justin", "Derek", "Anthony", "Steven", "Kyle",
];

const LAST_NAMES = [
  "Williams", "Thompson", "Ramirez", "Chen", "Johnson", "Smith", "Brown",
  "Davis", "Garcia", "Martinez", "Wilson", "Anderson", "Taylor", "Thomas",
  "Moore", "Jackson", "White", "Harris", "Clark", "Lewis", "Robinson",
];

function generateFirstName(): string {
  return FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
}

function generateLastName(): string {
  return LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
}
