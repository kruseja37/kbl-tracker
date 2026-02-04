import { useNavigate } from "react-router";
import { ArrowLeft, Settings, Plus, Trash2, X, Copy, Check, Lock, Edit2 } from "lucide-react";
import { useState, useEffect } from "react";
import {
  useLeagueBuilderData,
  type RulesPreset,
} from "../../hooks/useLeagueBuilderData";

type TabType = "game" | "season" | "playoffs";

export function LeagueBuilderRules() {
  const navigate = useNavigate();
  const {
    rulesPresets,
    isLoading,
    error,
    createRulesPreset,
    updateRulesPreset,
    removeRulesPreset,
  } = useLeagueBuilderData();

  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("game");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPreset, setEditingPreset] = useState<RulesPreset | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Select first preset by default
  useEffect(() => {
    if (!selectedPresetId && rulesPresets.length > 0) {
      setSelectedPresetId(rulesPresets[0].id);
    }
  }, [rulesPresets, selectedPresetId]);

  const selectedPreset = rulesPresets.find((p) => p.id === selectedPresetId);

  const handleDuplicate = async (preset: RulesPreset) => {
    const { id, createdDate, lastModified, ...rest } = preset;
    await createRulesPreset({
      ...rest,
      name: `${preset.name} Copy`,
      isDefault: false,
      isEditable: true,
    });
  };

  const handleDelete = async (id: string) => {
    await removeRulesPreset(id);
    setDeleteConfirm(null);
    if (selectedPresetId === id) {
      setSelectedPresetId(rulesPresets.find((p) => p.id !== id)?.id || null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#2d3d2f] text-[#E8E8D8] p-8 flex items-center justify-center">
        <div className="text-xl">Loading rules presets...</div>
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
              <Settings className="w-6 h-6" style={{ color: "#DD0000" }} />
              <h1 className="text-2xl font-bold text-[#E8E8D8] tracking-wider" style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}>
                RULES PRESETS
              </h1>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#5A8352] hover:bg-[#6A9362] border-4 border-[#E8E8D8] transition active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
          >
            <Plus className="w-5 h-5" />
            <span className="font-bold">NEW PRESET</span>
          </button>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Preset List - Left Column */}
          <div className="col-span-4">
            <div className="bg-[#556B55] border-[6px] border-[#4A6844] p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
              <h3 className="font-bold mb-4 text-sm" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>
                AVAILABLE PRESETS
              </h3>
              <div className="space-y-2">
                {rulesPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className={`relative group bg-[#4A6844] border-4 p-3 cursor-pointer transition-all ${
                      selectedPresetId === preset.id
                        ? "border-[#DD0000] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]"
                        : "border-[#E8E8D8]/30 hover:border-[#E8E8D8]/60"
                    }`}
                    onClick={() => setSelectedPresetId(preset.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {!preset.isEditable && <Lock className="w-4 h-4 text-[#E8E8D8]/50" />}
                        <span className="font-bold text-sm">{preset.name}</span>
                      </div>
                      {selectedPresetId === preset.id && (
                        <div className="w-5 h-5 rounded-full bg-[#DD0000] flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-[#E8E8D8]/60 mt-1 line-clamp-2">{preset.description}</p>

                    {/* Hover Actions */}
                    <div className="absolute top-2 right-2 hidden group-hover:flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(preset);
                        }}
                        className="p-1 bg-[#556B55] hover:bg-[#5A8352] border-2 border-[#E8E8D8]/50"
                        title="Duplicate"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      {preset.isEditable && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPreset(preset);
                            }}
                            className="p-1 bg-[#556B55] hover:bg-[#5A8352] border-2 border-[#E8E8D8]/50"
                            title="Edit"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          {deleteConfirm === preset.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(preset.id);
                                }}
                                className="p-1 bg-[#DD0000] hover:bg-[#FF2222] border-2 border-[#E8E8D8]/50"
                                title="Confirm Delete"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirm(null);
                                }}
                                className="p-1 bg-[#556B55] hover:bg-[#5A8352] border-2 border-[#E8E8D8]/50"
                                title="Cancel"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm(preset.id);
                              }}
                              className="p-1 bg-[#DD0000] hover:bg-[#FF2222] border-2 border-[#E8E8D8]/50"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Preset Details - Right Column */}
          <div className="col-span-8">
            {selectedPreset ? (
              <div className="bg-[#556B55] border-[6px] border-[#4A6844] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
                {/* Tabs */}
                <div className="flex border-b-4 border-[#4A6844]">
                  {(["game", "season", "playoffs"] as TabType[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-3 px-4 font-bold text-sm transition ${
                        activeTab === tab
                          ? "bg-[#4A6844] text-[#E8E8D8]"
                          : "bg-[#556B55] text-[#E8E8D8]/60 hover:text-[#E8E8D8]/80"
                      }`}
                    >
                      {tab.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div className="p-6">
                  {activeTab === "game" && <GameSettings preset={selectedPreset} />}
                  {activeTab === "season" && <SeasonSettings preset={selectedPreset} />}
                  {activeTab === "playoffs" && <PlayoffSettings preset={selectedPreset} />}
                </div>
              </div>
            ) : (
              <div className="bg-[#556B55] border-[6px] border-[#4A6844] p-8 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
                <Settings className="w-12 h-12 mx-auto mb-4 text-[#E8E8D8]/30" />
                <p className="text-[#E8E8D8]/60">Select a preset to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingPreset) && (
        <RulesPresetModal
          preset={editingPreset}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPreset(null);
          }}
          onSave={async (data) => {
            if (editingPreset) {
              await updateRulesPreset({ ...editingPreset, ...data });
            } else {
              const newPreset = await createRulesPreset(data);
              setSelectedPresetId(newPreset.id);
            }
            setShowCreateModal(false);
            setEditingPreset(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================
// SETTINGS DISPLAY COMPONENTS
// ============================================

function GameSettings({ preset }: { preset: RulesPreset }) {
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg mb-4" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>
        GAME RULES
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <RuleSetting label="Innings Per Game" value={String(preset.game.inningsPerGame)} />
        <RuleSetting
          label="Extra Innings"
          value={
            preset.game.extraInningsRule === "standard"
              ? "Standard"
              : preset.game.extraInningsRule === "runner_on_second"
              ? "Runner on 2nd"
              : "Sudden Death"
          }
        />
        <RuleSetting
          label="Mercy Rule"
          value={
            preset.game.mercyRule.enabled
              ? `${preset.game.mercyRule.runDifferential} runs after ${preset.game.mercyRule.afterInning}th`
              : "Disabled"
          }
        />
        <RuleSetting
          label="Pitch Counts"
          value={
            preset.game.pitchCounts.enabled
              ? `SP: ${preset.game.pitchCounts.starterLimit} / RP: ${preset.game.pitchCounts.relieverLimit}`
              : "Disabled"
          }
        />
        <RuleSetting
          label="Mound Visits"
          value={preset.game.moundVisits.enabled ? `${preset.game.moundVisits.perGame} per game` : "Disabled"}
        />
      </div>
    </div>
  );
}

function SeasonSettings({ preset }: { preset: RulesPreset }) {
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg mb-4" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>
        SEASON STRUCTURE
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <RuleSetting label="Games Per Team" value={String(preset.season.gamesPerTeam)} />
        <RuleSetting
          label="Schedule Type"
          value={
            preset.season.scheduleType === "balanced"
              ? "Balanced"
              : preset.season.scheduleType === "division_heavy"
              ? "Division Heavy"
              : "Rivalry Focused"
          }
        />
        <RuleSetting label="All-Star Game" value={preset.season.allStarGame ? "Enabled" : "Disabled"} />
        {preset.season.allStarGame && (
          <RuleSetting label="All-Star Timing" value={`${Math.round(preset.season.allStarTiming * 100)}% through season`} />
        )}
        <RuleSetting
          label="Trade Deadline"
          value={
            preset.season.tradeDeadline.enabled
              ? `${Math.round(preset.season.tradeDeadline.timing * 100)}% through season`
              : "Disabled"
          }
        />
      </div>
    </div>
  );
}

function PlayoffSettings({ preset }: { preset: RulesPreset }) {
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg mb-4" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>
        PLAYOFF FORMAT
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <RuleSetting label="Teams Qualifying" value={String(preset.playoffs.teamsQualifying)} />
        <RuleSetting
          label="Format"
          value={
            preset.playoffs.format === "bracket"
              ? "Single Bracket"
              : preset.playoffs.format === "pool"
              ? "Pool Play"
              : "Best Record Bye"
          }
        />
        <RuleSetting
          label="Series Lengths"
          value={preset.playoffs.seriesLengths.map((len) => `${len}-game`).join(", ")}
        />
        <RuleSetting
          label="Home Field"
          value={
            preset.playoffs.homeFieldAdvantage === "higher_seed"
              ? "Higher Seed"
              : preset.playoffs.homeFieldAdvantage === "alternating"
              ? "Alternating"
              : "Fixed"
          }
        />
      </div>
    </div>
  );
}

function RuleSetting({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3">
      <div className="text-xs text-[#E8E8D8]/60 mb-1">{label}</div>
      <div className="font-bold text-sm">{value}</div>
    </div>
  );
}

// ============================================
// CREATE/EDIT MODAL
// ============================================

interface RulesPresetModalProps {
  preset: RulesPreset | null;
  onClose: () => void;
  onSave: (data: Omit<RulesPreset, "id" | "createdDate" | "lastModified">) => Promise<void>;
}

function RulesPresetModal({ preset, onClose, onSave }: RulesPresetModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("game");
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState(preset?.name || "");
  const [description, setDescription] = useState(preset?.description || "");

  // Game settings
  const [inningsPerGame, setInningsPerGame] = useState<6 | 7 | 9>(preset?.game.inningsPerGame || 9);
  const [extraInningsRule, setExtraInningsRule] = useState<"standard" | "runner_on_second" | "sudden_death">(preset?.game.extraInningsRule || "standard");
  const [mercyEnabled, setMercyEnabled] = useState(preset?.game.mercyRule.enabled ?? false);
  const [mercyDiff, setMercyDiff] = useState(preset?.game.mercyRule.runDifferential || 10);
  const [mercyAfter, setMercyAfter] = useState(preset?.game.mercyRule.afterInning || 7);
  const [pitchCountsEnabled, setPitchCountsEnabled] = useState(preset?.game.pitchCounts.enabled ?? true);
  const [starterLimit, setStarterLimit] = useState(preset?.game.pitchCounts.starterLimit || 100);
  const [relieverLimit, setRelieverLimit] = useState(preset?.game.pitchCounts.relieverLimit || 40);
  const [moundVisitsEnabled, setMoundVisitsEnabled] = useState(preset?.game.moundVisits.enabled ?? true);
  const [moundVisitsPerGame, setMoundVisitsPerGame] = useState(preset?.game.moundVisits.perGame || 5);

  // Season settings
  const [gamesPerTeam, setGamesPerTeam] = useState(preset?.season.gamesPerTeam || 50);
  const [scheduleType, setScheduleType] = useState<"balanced" | "division_heavy" | "rivalry_focused">(preset?.season.scheduleType || "balanced");
  const [allStarGame, setAllStarGame] = useState(preset?.season.allStarGame ?? true);
  const [allStarTiming, setAllStarTiming] = useState(preset?.season.allStarTiming || 0.5);
  const [tradeDeadlineEnabled, setTradeDeadlineEnabled] = useState(preset?.season.tradeDeadline.enabled ?? true);
  const [tradeDeadlineTiming, setTradeDeadlineTiming] = useState(preset?.season.tradeDeadline.timing || 0.75);

  // Playoff settings
  const [teamsQualifying, setTeamsQualifying] = useState(preset?.playoffs.teamsQualifying || 4);
  const [playoffFormat, setPlayoffFormat] = useState<"bracket" | "pool" | "best_record_bye">(preset?.playoffs.format || "bracket");
  const [seriesLengths, setSeriesLengths] = useState(preset?.playoffs.seriesLengths.join(",") || "5,7,7");
  const [homeFieldAdvantage, setHomeFieldAdvantage] = useState<"higher_seed" | "alternating" | "fixed">(preset?.playoffs.homeFieldAdvantage || "higher_seed");

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        isDefault: false,
        isEditable: true,
        game: {
          inningsPerGame,
          extraInningsRule: extraInningsRule as "standard" | "runner_on_second" | "sudden_death",
          mercyRule: {
            enabled: mercyEnabled,
            runDifferential: mercyDiff,
            afterInning: mercyAfter,
          },
          pitchCounts: {
            enabled: pitchCountsEnabled,
            starterLimit,
            relieverLimit,
          },
          moundVisits: {
            enabled: moundVisitsEnabled,
            perGame: moundVisitsPerGame,
          },
        },
        season: {
          gamesPerTeam,
          scheduleType: scheduleType as "balanced" | "division_heavy" | "rivalry_focused",
          allStarGame,
          allStarTiming,
          tradeDeadline: {
            enabled: tradeDeadlineEnabled,
            timing: tradeDeadlineTiming,
          },
        },
        playoffs: {
          teamsQualifying,
          format: playoffFormat as "bracket" | "pool" | "best_record_bye",
          seriesLengths: seriesLengths.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n)),
          homeFieldAdvantage: homeFieldAdvantage as "higher_seed" | "alternating" | "fixed",
        },
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#2d3d2f] border-[6px] border-[#E8E8D8] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
        {/* Modal Header */}
        <div className="bg-[#5A8352] border-b-4 border-[#E8E8D8] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold" style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}>
            {preset ? "EDIT PRESET" : "CREATE PRESET"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-[#4A6844] transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Name/Description */}
        <div className="p-6 border-b-4 border-[#4A6844]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#E8E8D8]/60 mb-1">PRESET NAME</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none"
                placeholder="My Custom Rules"
              />
            </div>
            <div>
              <label className="block text-xs text-[#E8E8D8]/60 mb-1">DESCRIPTION</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] focus:border-[#E8E8D8]/60 outline-none"
                placeholder="Custom settings for my league"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b-4 border-[#4A6844]">
          {(["game", "season", "playoffs"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 font-bold text-sm transition ${
                activeTab === tab
                  ? "bg-[#4A6844] text-[#E8E8D8]"
                  : "bg-[#556B55] text-[#E8E8D8]/60 hover:text-[#E8E8D8]/80"
              }`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto max-h-[400px]">
          {activeTab === "game" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#E8E8D8]/60 mb-1">INNINGS PER GAME</label>
                  <select
                    value={inningsPerGame}
                    onChange={(e) => setInningsPerGame(parseInt(e.target.value, 10) as 6 | 7 | 9)}
                    className="w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none"
                  >
                    <option value={6}>6 Innings</option>
                    <option value={7}>7 Innings</option>
                    <option value={9}>9 Innings</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#E8E8D8]/60 mb-1">EXTRA INNINGS RULE</label>
                  <select
                    value={extraInningsRule}
                    onChange={(e) => setExtraInningsRule(e.target.value as "standard" | "runner_on_second" | "sudden_death")}
                    className="w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none"
                  >
                    <option value="standard">Standard</option>
                    <option value="runner_on_second">Runner on 2nd</option>
                    <option value="sudden_death">Sudden Death</option>
                  </select>
                </div>
              </div>

              {/* Mercy Rule */}
              <div className="bg-[#556B55] border-4 border-[#4A6844] p-4">
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={mercyEnabled}
                    onChange={(e) => setMercyEnabled(e.target.checked)}
                    className="w-5 h-5 accent-[#DD0000]"
                  />
                  <span className="font-bold">MERCY RULE</span>
                </label>
                {mercyEnabled && (
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="block text-xs text-[#E8E8D8]/60 mb-1">Run Differential</label>
                      <input
                        type="number"
                        value={mercyDiff}
                        onChange={(e) => setMercyDiff(parseInt(e.target.value, 10) || 0)}
                        className="w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none"
                        min={1}
                        max={20}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#E8E8D8]/60 mb-1">After Inning</label>
                      <input
                        type="number"
                        value={mercyAfter}
                        onChange={(e) => setMercyAfter(parseInt(e.target.value, 10) || 0)}
                        className="w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none"
                        min={1}
                        max={9}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Pitch Counts */}
              <div className="bg-[#556B55] border-4 border-[#4A6844] p-4">
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={pitchCountsEnabled}
                    onChange={(e) => setPitchCountsEnabled(e.target.checked)}
                    className="w-5 h-5 accent-[#DD0000]"
                  />
                  <span className="font-bold">PITCH COUNTS</span>
                </label>
                {pitchCountsEnabled && (
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="block text-xs text-[#E8E8D8]/60 mb-1">Starter Limit</label>
                      <input
                        type="number"
                        value={starterLimit}
                        onChange={(e) => setStarterLimit(parseInt(e.target.value, 10) || 0)}
                        className="w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none"
                        min={50}
                        max={200}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#E8E8D8]/60 mb-1">Reliever Limit</label>
                      <input
                        type="number"
                        value={relieverLimit}
                        onChange={(e) => setRelieverLimit(parseInt(e.target.value, 10) || 0)}
                        className="w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none"
                        min={20}
                        max={100}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Mound Visits */}
              <div className="bg-[#556B55] border-4 border-[#4A6844] p-4">
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={moundVisitsEnabled}
                    onChange={(e) => setMoundVisitsEnabled(e.target.checked)}
                    className="w-5 h-5 accent-[#DD0000]"
                  />
                  <span className="font-bold">MOUND VISITS</span>
                </label>
                {moundVisitsEnabled && (
                  <div className="mt-2">
                    <label className="block text-xs text-[#E8E8D8]/60 mb-1">Per Game</label>
                    <input
                      type="number"
                      value={moundVisitsPerGame}
                      onChange={(e) => setMoundVisitsPerGame(parseInt(e.target.value, 10) || 0)}
                      className="w-full max-w-[200px] bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none"
                      min={1}
                      max={10}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "season" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#E8E8D8]/60 mb-1">GAMES PER TEAM</label>
                  <input
                    type="number"
                    value={gamesPerTeam}
                    onChange={(e) => setGamesPerTeam(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none"
                    min={8}
                    max={162}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#E8E8D8]/60 mb-1">SCHEDULE TYPE</label>
                  <select
                    value={scheduleType}
                    onChange={(e) => setScheduleType(e.target.value as "balanced" | "division_heavy" | "rivalry_focused")}
                    className="w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none"
                  >
                    <option value="balanced">Balanced</option>
                    <option value="division_heavy">Division Heavy</option>
                    <option value="rivalry_focused">Rivalry Focused</option>
                  </select>
                </div>
              </div>

              {/* All-Star Game */}
              <div className="bg-[#556B55] border-4 border-[#4A6844] p-4">
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={allStarGame}
                    onChange={(e) => setAllStarGame(e.target.checked)}
                    className="w-5 h-5 accent-[#DD0000]"
                  />
                  <span className="font-bold">ALL-STAR GAME</span>
                </label>
                {allStarGame && (
                  <div className="mt-2">
                    <label className="block text-xs text-[#E8E8D8]/60 mb-1">Timing (% through season)</label>
                    <input
                      type="range"
                      value={allStarTiming * 100}
                      onChange={(e) => setAllStarTiming(parseInt(e.target.value, 10) / 100)}
                      className="w-full accent-[#DD0000]"
                      min={30}
                      max={70}
                    />
                    <div className="text-center text-sm font-bold mt-1">{Math.round(allStarTiming * 100)}%</div>
                  </div>
                )}
              </div>

              {/* Trade Deadline */}
              <div className="bg-[#556B55] border-4 border-[#4A6844] p-4">
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={tradeDeadlineEnabled}
                    onChange={(e) => setTradeDeadlineEnabled(e.target.checked)}
                    className="w-5 h-5 accent-[#DD0000]"
                  />
                  <span className="font-bold">TRADE DEADLINE</span>
                </label>
                {tradeDeadlineEnabled && (
                  <div className="mt-2">
                    <label className="block text-xs text-[#E8E8D8]/60 mb-1">Timing (% through season)</label>
                    <input
                      type="range"
                      value={tradeDeadlineTiming * 100}
                      onChange={(e) => setTradeDeadlineTiming(parseInt(e.target.value, 10) / 100)}
                      className="w-full accent-[#DD0000]"
                      min={50}
                      max={90}
                    />
                    <div className="text-center text-sm font-bold mt-1">{Math.round(tradeDeadlineTiming * 100)}%</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "playoffs" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#E8E8D8]/60 mb-1">TEAMS QUALIFYING</label>
                  <input
                    type="number"
                    value={teamsQualifying}
                    onChange={(e) => setTeamsQualifying(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none"
                    min={2}
                    max={16}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#E8E8D8]/60 mb-1">FORMAT</label>
                  <select
                    value={playoffFormat}
                    onChange={(e) => setPlayoffFormat(e.target.value as "bracket" | "pool" | "best_record_bye")}
                    className="w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none"
                  >
                    <option value="bracket">Single Bracket</option>
                    <option value="pool">Pool Play</option>
                    <option value="best_record_bye">Best Record Bye</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#E8E8D8]/60 mb-1">
                  SERIES LENGTHS (comma-separated, e.g., "3,5,7")
                </label>
                <input
                  type="text"
                  value={seriesLengths}
                  onChange={(e) => setSeriesLengths(e.target.value)}
                  className="w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none"
                  placeholder="5,7,7"
                />
              </div>

              <div>
                <label className="block text-xs text-[#E8E8D8]/60 mb-1">HOME FIELD ADVANTAGE</label>
                <select
                  value={homeFieldAdvantage}
                  onChange={(e) => setHomeFieldAdvantage(e.target.value as "higher_seed" | "alternating" | "fixed")}
                  className="w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none"
                >
                  <option value="higher_seed">Higher Seed</option>
                  <option value="alternating">Alternating</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-[#4A6844] border-t-4 border-[#E8E8D8] px-6 py-4 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#556B55] hover:bg-[#667B66] border-4 border-[#E8E8D8]/50 font-bold transition"
          >
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || saving}
            className="px-6 py-2 bg-[#DD0000] hover:bg-[#FF2222] border-4 border-[#E8E8D8] font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "SAVING..." : preset ? "UPDATE" : "CREATE"}
          </button>
        </div>
      </div>
    </div>
  );
}
