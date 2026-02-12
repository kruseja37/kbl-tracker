/**
 * League Builder - Teams Module
 * Per LEAGUE_BUILDER_SPEC.md Section 4
 *
 * Create, edit, and manage teams. Teams are global entities
 * that can be assigned to multiple leagues.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Users,
  Plus,
  Trash2,
  Edit3,
  Loader2,
  X,
  Check,
  AlertTriangle,
  MapPin,
  Building2,
} from "lucide-react";
import { useLeagueBuilderData, type Team } from "../../hooks/useLeagueBuilderData";

// ============================================
// TYPES
// ============================================

interface TeamFormData {
  name: string;
  abbreviation: string;
  location: string;
  nickname: string;
  stadium: string;
  stadiumCapacity: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  foundedYear: string;
  championships: string;
}

const DEFAULT_FORM_DATA: TeamFormData = {
  name: "",
  abbreviation: "",
  location: "",
  nickname: "",
  stadium: "",
  stadiumCapacity: "",
  primaryColor: "#FF6600",
  secondaryColor: "#000000",
  accentColor: "",
  foundedYear: "",
  championships: "0",
};

// ============================================
// MAIN COMPONENT
// ============================================

export function LeagueBuilderTeams() {
  const navigate = useNavigate();
  const {
    teams,
    leagues,
    isLoading,
    error,
    createTeam,
    updateTeam,
    removeTeam,
  } = useLeagueBuilderData();

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState<TeamFormData>(DEFAULT_FORM_DATA);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Auto-generate abbreviation from name
  useEffect(() => {
    if (!editingTeam && formData.name && !formData.abbreviation) {
      // Generate 3-letter abbreviation from first letters of words
      const words = formData.name.split(" ").filter(Boolean);
      const abbr =
        words.length >= 3
          ? words
              .slice(0, 3)
              .map((w) => w[0])
              .join("")
              .toUpperCase()
          : formData.name.slice(0, 3).toUpperCase();
      setFormData((prev) => ({ ...prev, abbreviation: abbr }));
    }
  }, [formData.name, formData.abbreviation, editingTeam]);

  // ============================================
  // HANDLERS
  // ============================================

  const openCreateModal = () => {
    setEditingTeam(null);
    setFormData(DEFAULT_FORM_DATA);
    setIsModalOpen(true);
  };

  const openEditModal = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      abbreviation: team.abbreviation,
      location: team.location,
      nickname: team.nickname,
      stadium: team.stadium,
      stadiumCapacity: team.stadiumCapacity?.toString() || "",
      primaryColor: team.colors.primary,
      secondaryColor: team.colors.secondary,
      accentColor: team.colors.accent || "",
      foundedYear: team.foundedYear?.toString() || "",
      championships: team.championships?.toString() || "0",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTeam(null);
    setFormData(DEFAULT_FORM_DATA);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.abbreviation.trim()) return;

    setIsSaving(true);
    try {
      const teamData = {
        name: formData.name.trim(),
        abbreviation: formData.abbreviation.trim().toUpperCase(),
        location: formData.location.trim(),
        nickname: formData.nickname.trim() || formData.name.trim(),
        stadium: formData.stadium.trim(),
        stadiumCapacity: formData.stadiumCapacity
          ? parseInt(formData.stadiumCapacity, 10)
          : undefined,
        colors: {
          primary: formData.primaryColor,
          secondary: formData.secondaryColor,
          accent: formData.accentColor || undefined,
        },
        foundedYear: formData.foundedYear
          ? parseInt(formData.foundedYear, 10)
          : undefined,
        championships: formData.championships
          ? parseInt(formData.championships, 10)
          : 0,
        leagueIds: editingTeam?.leagueIds || [],
        retiredNumbers: editingTeam?.retiredNumbers || [],
      };

      if (editingTeam) {
        await updateTeam({
          ...editingTeam,
          ...teamData,
        });
      } else {
        await createTeam(teamData);
      }
      closeModal();
    } catch (err) {
      console.error("Failed to save team:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await removeTeam(id);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Failed to delete team:", err);
    }
  };

  const getTeamLeagues = (teamId: string) => {
    return leagues.filter((league) => league.teamIds.includes(teamId));
  };

  // ============================================
  // RENDER
  // ============================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#2d3d2f] text-[#E8E8D8] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading teams...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#2d3d2f] text-[#E8E8D8] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/league-builder")}
            className="p-3 bg-[#4A6844] hover:bg-[#5A8352] border-4 border-[#E8E8D8] transition active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
          >
            <ArrowLeft className="w-6 h-6 text-[#E8E8D8]" />
          </button>
          <div className="flex items-center gap-3 bg-[#5A8352] border-[6px] border-[#E8E8D8] px-8 py-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]">
            <Users className="w-6 h-6" style={{ color: "#5599FF" }} />
            <h1
              className="text-2xl font-bold text-[#E8E8D8] tracking-wider"
              style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
            >
              TEAMS
            </h1>
          </div>
          <div className="ml-auto text-sm text-[#E8E8D8]/70">{teams.length} teams</div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border-4 border-red-500 p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-red-200">{error}</span>
          </div>
        )}

        {/* Create Button */}
        <div className="mb-6">
          <button
            onClick={openCreateModal}
            className="bg-[#5A8352] hover:bg-[#4A6844] border-[5px] border-[#E8E8D8] px-6 py-3 transition-all active:scale-[0.98] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span className="font-bold tracking-wide">CREATE NEW TEAM</span>
          </button>
        </div>

        {/* Teams Grid */}
        {teams.length === 0 ? (
          <div className="bg-[#556B55] border-[6px] border-[#4A6844] p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] text-center">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: "#5599FF" }} />
            <h2 className="text-xl font-bold mb-2">No Teams Yet</h2>
            <p className="text-[#E8E8D8]/70">Create your first team to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {teams.map((team) => {
              const teamLeagues = getTeamLeagues(team.id);
              return (
                <div
                  key={team.id}
                  className="bg-[#556B55] border-4 border-[#4A6844] p-4 hover:border-[#5A8352] transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] relative group"
                >
                  {/* Team Color Circle */}
                  <div
                    className="w-12 h-12 rounded-full mx-auto mb-3 border-4"
                    style={{
                      backgroundColor: team.colors.primary,
                      borderColor: team.colors.secondary,
                    }}
                  />

                  {/* Team Info */}
                  <div
                    className="text-sm font-bold text-center mb-1"
                    style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}
                  >
                    {team.name}
                  </div>
                  <div className="text-xs text-[#E8E8D8]/60 text-center mb-2">
                    {team.abbreviation}
                  </div>

                  {/* League badges */}
                  {teamLeagues.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center mb-2">
                      {teamLeagues.slice(0, 2).map((league) => (
                        <span
                          key={league.id}
                          className="text-[8px] px-1 py-0.5 rounded"
                          style={{
                            backgroundColor: league.color || "#5A8352",
                            color: "#fff",
                          }}
                        >
                          {league.name.substring(0, 8)}
                        </span>
                      ))}
                      {teamLeagues.length > 2 && (
                        <span className="text-[8px] text-[#E8E8D8]/50">
                          +{teamLeagues.length - 2}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action Buttons - Visible on hover */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(team)}
                      className="p-1.5 bg-[#5A8352] hover:bg-[#6A9362] border-2 border-[#E8E8D8]/50 transition"
                      title="Edit team"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>

                    {deleteConfirmId === team.id ? (
                      <>
                        <button
                          onClick={() => handleDelete(team.id)}
                          className="p-1.5 bg-red-600 hover:bg-red-700 border-2 border-red-400 transition"
                          title="Confirm delete"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="p-1.5 bg-[#5A8352] hover:bg-[#6A9362] border-2 border-[#E8E8D8]/50 transition"
                          title="Cancel"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(team.id)}
                        className="p-1.5 bg-red-800 hover:bg-red-700 border-2 border-red-500/50 transition"
                        title="Delete team"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#556B55] border-[6px] border-[#4A6844] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b-4 border-[#4A6844]">
              <h2 className="text-xl font-bold">
                {editingTeam ? "Edit Team" : "Create New Team"}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-[#4A6844] transition rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Name & Abbreviation Row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold mb-2">Team Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., Sirloins"
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Abbreviation *</label>
                  <input
                    type="text"
                    value={formData.abbreviation}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        abbreviation: e.target.value.toUpperCase().slice(0, 4),
                      }))
                    }
                    placeholder="SFG"
                    maxLength={4}
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none uppercase"
                  />
                </div>
              </div>

              {/* Location & Nickname */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, location: e.target.value }))
                    }
                    placeholder="e.g., Castleton"
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Nickname</label>
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, nickname: e.target.value }))
                    }
                    placeholder="e.g., Giants"
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none"
                  />
                </div>
              </div>

              {/* Stadium */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">
                    <Building2 className="w-3 h-3 inline mr-1" />
                    Stadium
                  </label>
                  <input
                    type="text"
                    value={formData.stadium}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, stadium: e.target.value }))
                    }
                    placeholder="e.g., Oracle Park"
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Stadium Capacity</label>
                  <input
                    type="number"
                    value={formData.stadiumCapacity}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, stadiumCapacity: e.target.value }))
                    }
                    placeholder="e.g., 41500"
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none"
                  />
                </div>
              </div>

              {/* Colors */}
              <div>
                <label className="block text-sm font-bold mb-2">Team Colors</label>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, primaryColor: e.target.value }))
                      }
                      className="w-10 h-10 rounded cursor-pointer border-2 border-[#3F5A3A]"
                    />
                    <span className="text-xs text-[#E8E8D8]/70">Primary</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.secondaryColor}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, secondaryColor: e.target.value }))
                      }
                      className="w-10 h-10 rounded cursor-pointer border-2 border-[#3F5A3A]"
                    />
                    <span className="text-xs text-[#E8E8D8]/70">Secondary</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.accentColor || "#FFFFFF"}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, accentColor: e.target.value }))
                      }
                      className="w-10 h-10 rounded cursor-pointer border-2 border-[#3F5A3A]"
                    />
                    <span className="text-xs text-[#E8E8D8]/70">Accent</span>
                  </div>

                  {/* Preview */}
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-[#E8E8D8]/70">Preview:</span>
                    <div
                      className="w-10 h-10 rounded-full border-4"
                      style={{
                        backgroundColor: formData.primaryColor,
                        borderColor: formData.secondaryColor,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* History */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Founded Year</label>
                  <input
                    type="number"
                    value={formData.foundedYear}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, foundedYear: e.target.value }))
                    }
                    placeholder="e.g., 1883"
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Championships</label>
                  <input
                    type="number"
                    value={formData.championships}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, championships: e.target.value }))
                    }
                    placeholder="0"
                    min="0"
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t-4 border-[#4A6844]">
              <button
                onClick={closeModal}
                className="px-6 py-2 bg-[#4A6844] hover:bg-[#3F5A3A] border-[3px] border-[#E8E8D8]/50 transition font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name.trim() || !formData.abbreviation.trim() || isSaving}
                className="px-6 py-2 bg-[#5599FF] hover:bg-[#3366FF] border-[3px] border-[#E8E8D8] transition font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {editingTeam ? "Save Changes" : "Create Team"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
