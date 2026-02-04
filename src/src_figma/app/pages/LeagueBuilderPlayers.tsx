/**
 * League Builder - Players Module
 * Per LEAGUE_BUILDER_SPEC.md Section 5
 *
 * Create, edit, and manage the global player database.
 * All players exist in one pool and are assigned to teams via the Rosters module.
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  User,
  Search,
  Plus,
  Trash2,
  Edit3,
  Loader2,
  X,
  Check,
  AlertTriangle,
  Users,
} from "lucide-react";
import {
  useLeagueBuilderData,
  type Player,
  type Position,
  type Grade,
  type Personality,
  type Chemistry,
  type MojoState,
  type RosterStatus,
  type PitchType,
} from "../../hooks/useLeagueBuilderData";

// ============================================
// CONSTANTS
// ============================================

const POSITIONS: Position[] = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP', 'CP', 'SP/RP', 'TWO-WAY'];
const GRADES: Grade[] = ['S', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-'];
const PERSONALITIES: Personality[] = ['Competitive', 'Spirited', 'Crafty', 'Scholarly', 'Disciplined', 'Tough', 'Relaxed', 'Egotistical', 'Jolly', 'Timid', 'Droopy'];
const CHEMISTRIES: Chemistry[] = ['Competitive', 'Spirited', 'Crafty', 'Scholarly', 'Disciplined'];
const PITCH_TYPES: PitchType[] = ['4F', '2F', 'CB', 'SL', 'CH', 'FK', 'CF', 'SB', 'SC', 'KN'];

// ============================================
// TYPES
// ============================================

interface PlayerFormData {
  firstName: string;
  lastName: string;
  nickname: string;
  gender: 'M' | 'F';
  age: string;
  bats: 'L' | 'R' | 'S';
  throws: 'L' | 'R';
  primaryPosition: Position;
  secondaryPosition: Position | '';
  power: string;
  contact: string;
  speed: string;
  fielding: string;
  arm: string;
  velocity: string;
  junk: string;
  accuracy: string;
  arsenal: PitchType[];
  overallGrade: Grade;
  trait1: string;
  trait2: string;
  personality: Personality;
  chemistry: Chemistry;
  currentTeamId: string;
  rosterStatus: RosterStatus;
}

const DEFAULT_FORM_DATA: PlayerFormData = {
  firstName: "",
  lastName: "",
  nickname: "",
  gender: 'M',
  age: "25",
  bats: 'R',
  throws: 'R',
  primaryPosition: 'CF',
  secondaryPosition: '',
  power: "50",
  contact: "50",
  speed: "50",
  fielding: "50",
  arm: "50",
  velocity: "50",
  junk: "50",
  accuracy: "50",
  arsenal: ['4F'],
  overallGrade: 'C',
  trait1: "",
  trait2: "",
  personality: 'Competitive',
  chemistry: 'Competitive',
  currentTeamId: "",
  rosterStatus: 'FREE_AGENT',
};

// ============================================
// MAIN COMPONENT
// ============================================

export function LeagueBuilderPlayers() {
  const navigate = useNavigate();
  const {
    players,
    teams,
    isLoading,
    error,
    createPlayer,
    updatePlayer,
    removePlayer,
  } = useLeagueBuilderData();

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [formData, setFormData] = useState<PlayerFormData>(DEFAULT_FORM_DATA);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("ALL");
  const [teamFilter, setTeamFilter] = useState<string>("ALL");

  // Filter players
  const filteredPlayers = useMemo(() => {
    let list = [...players];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.firstName.toLowerCase().includes(query) ||
        p.lastName.toLowerCase().includes(query) ||
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(query)
      );
    }

    // Position filter
    if (positionFilter !== "ALL") {
      list = list.filter(p => p.primaryPosition === positionFilter);
    }

    // Team filter
    if (teamFilter !== "ALL") {
      if (teamFilter === "FREE_AGENT") {
        list = list.filter(p => !p.currentTeamId);
      } else {
        list = list.filter(p => p.currentTeamId === teamFilter);
      }
    }

    // Sort by last name
    list.sort((a, b) => a.lastName.localeCompare(b.lastName));

    return list.slice(0, 100); // Limit for performance
  }, [players, searchQuery, positionFilter, teamFilter]);

  // ============================================
  // HANDLERS
  // ============================================

  const openCreateModal = () => {
    setEditingPlayer(null);
    setFormData(DEFAULT_FORM_DATA);
    setIsModalOpen(true);
  };

  const openEditModal = (player: Player) => {
    setEditingPlayer(player);
    setFormData({
      firstName: player.firstName,
      lastName: player.lastName,
      nickname: player.nickname || "",
      gender: player.gender,
      age: player.age.toString(),
      bats: player.bats,
      throws: player.throws,
      primaryPosition: player.primaryPosition,
      secondaryPosition: player.secondaryPosition || '',
      power: player.power.toString(),
      contact: player.contact.toString(),
      speed: player.speed.toString(),
      fielding: player.fielding.toString(),
      arm: player.arm.toString(),
      velocity: player.velocity.toString(),
      junk: player.junk.toString(),
      accuracy: player.accuracy.toString(),
      arsenal: player.arsenal,
      overallGrade: player.overallGrade,
      trait1: player.trait1 || "",
      trait2: player.trait2 || "",
      personality: player.personality,
      chemistry: player.chemistry,
      currentTeamId: player.currentTeamId || "",
      rosterStatus: player.rosterStatus,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPlayer(null);
    setFormData(DEFAULT_FORM_DATA);
  };

  const handleSave = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) return;

    setIsSaving(true);
    try {
      const isPitcher = ['SP', 'RP', 'CP', 'SP/RP'].includes(formData.primaryPosition);

      const playerData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        nickname: formData.nickname.trim() || undefined,
        gender: formData.gender,
        age: parseInt(formData.age, 10) || 25,
        bats: formData.bats,
        throws: formData.throws,
        primaryPosition: formData.primaryPosition,
        secondaryPosition: formData.secondaryPosition || undefined,
        power: parseInt(formData.power, 10) || 50,
        contact: parseInt(formData.contact, 10) || 50,
        speed: parseInt(formData.speed, 10) || 50,
        fielding: parseInt(formData.fielding, 10) || 50,
        arm: parseInt(formData.arm, 10) || 50,
        velocity: isPitcher ? parseInt(formData.velocity, 10) || 50 : 0,
        junk: isPitcher ? parseInt(formData.junk, 10) || 50 : 0,
        accuracy: isPitcher ? parseInt(formData.accuracy, 10) || 50 : 0,
        arsenal: isPitcher ? formData.arsenal : [],
        overallGrade: formData.overallGrade,
        trait1: formData.trait1 || undefined,
        trait2: formData.trait2 || undefined,
        personality: formData.personality,
        chemistry: formData.chemistry,
        morale: editingPlayer?.morale ?? 75,
        mojo: editingPlayer?.mojo ?? 'Normal' as MojoState,
        fame: editingPlayer?.fame ?? 0,
        salary: editingPlayer?.salary ?? 1.0,
        contractYears: editingPlayer?.contractYears,
        currentTeamId: formData.currentTeamId || null,
        rosterStatus: formData.rosterStatus,
        isCustom: true,
        sourceDatabase: 'League Builder',
      };

      if (editingPlayer) {
        await updatePlayer({
          ...editingPlayer,
          ...playerData,
        });
      } else {
        await createPlayer(playerData);
      }
      closeModal();
    } catch (err) {
      console.error("Failed to save player:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await removePlayer(id);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Failed to delete player:", err);
    }
  };

  const toggleArsenal = (pitch: PitchType) => {
    setFormData(prev => ({
      ...prev,
      arsenal: prev.arsenal.includes(pitch)
        ? prev.arsenal.filter(p => p !== pitch)
        : [...prev.arsenal, pitch],
    }));
  };

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return "Free Agent";
    const team = teams.find(t => t.id === teamId);
    return team?.abbreviation || "Unknown";
  };

  const isPitcherPosition = (pos: Position) => ['SP', 'RP', 'CP', 'SP/RP'].includes(pos);

  // ============================================
  // RENDER
  // ============================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#2d3d2f] text-[#E8E8D8] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading players...</span>
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
            <User className="w-6 h-6" style={{ color: "#3366FF" }} />
            <h1
              className="text-2xl font-bold text-[#E8E8D8] tracking-wider"
              style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
            >
              PLAYERS
            </h1>
          </div>
          <div className="ml-auto text-sm text-[#E8E8D8]/70">{players.length} players</div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border-4 border-red-500 p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-red-200">{error}</span>
          </div>
        )}

        {/* Create Button & Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={openCreateModal}
            className="bg-[#5A8352] hover:bg-[#4A6844] border-[5px] border-[#E8E8D8] px-6 py-3 transition-all active:scale-[0.98] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span className="font-bold tracking-wide">CREATE PLAYER</span>
          </button>

          <div className="flex-1 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#E8E8D8]/50" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 pl-10 pr-4 py-2 text-[#E8E8D8] placeholder-[#E8E8D8]/50 focus:border-[#E8E8D8]/60 outline-none"
              />
            </div>
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-4 py-2 text-[#E8E8D8] focus:border-[#E8E8D8]/60 outline-none"
            >
              <option value="ALL">All Positions</option>
              {POSITIONS.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-4 py-2 text-[#E8E8D8] focus:border-[#E8E8D8]/60 outline-none"
            >
              <option value="ALL">All Teams</option>
              <option value="FREE_AGENT">Free Agents</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.abbreviation}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Players Table */}
        <div className="bg-[#556B55] border-[6px] border-[#4A6844] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] overflow-hidden">
          {players.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: "#3366FF" }} />
              <h2 className="text-xl font-bold mb-2">No Players Yet</h2>
              <p className="text-[#E8E8D8]/70">Create your first player to get started</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-[#4A6844] text-xs">
                  <th className="text-left p-3">NAME</th>
                  <th className="text-center p-3">POS</th>
                  <th className="text-center p-3">TEAM</th>
                  <th className="text-center p-3">OVR</th>
                  <th className="text-center p-3">AGE</th>
                  <th className="text-center p-3">B/T</th>
                  <th className="text-right p-3">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((player, idx) => (
                  <tr
                    key={player.id}
                    className={`${idx % 2 === 0 ? 'bg-[#556B55]' : 'bg-[#4A6844]/30'} hover:bg-[#5A8352]/50 transition-colors`}
                  >
                    <td className="p-3 font-medium">
                      {player.firstName} {player.lastName}
                      {player.nickname && <span className="text-[#E8E8D8]/50 text-xs ml-1">"{player.nickname}"</span>}
                    </td>
                    <td className="p-3 text-center text-xs">{player.primaryPosition}</td>
                    <td className="p-3 text-center text-xs">{getTeamName(player.currentTeamId)}</td>
                    <td className="p-3 text-center font-bold">{player.overallGrade}</td>
                    <td className="p-3 text-center text-xs">{player.age}</td>
                    <td className="p-3 text-center text-xs">{player.bats}/{player.throws}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(player)}
                          className="p-1.5 bg-[#5A8352] hover:bg-[#6A9362] border-2 border-[#E8E8D8]/50 transition"
                          title="Edit player"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        {deleteConfirmId === player.id ? (
                          <>
                            <button
                              onClick={() => handleDelete(player.id)}
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
                            onClick={() => setDeleteConfirmId(player.id)}
                            className="p-1.5 bg-red-800 hover:bg-red-700 border-2 border-red-500/50 transition"
                            title="Delete player"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPlayers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[#E8E8D8]/50">
                      {searchQuery || positionFilter !== "ALL" || teamFilter !== "ALL"
                        ? "No players match your filters"
                        : "No players in database"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#556B55] border-[6px] border-[#4A6844] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b-4 border-[#4A6844]">
              <h2 className="text-xl font-bold">
                {editingPlayer ? "Edit Player" : "Create New Player"}
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
              {/* Name Row */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">First Name *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Last Name *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Nickname</label>
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                  />
                </div>
              </div>

              {/* Demographics Row */}
              <div className="grid grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as 'M' | 'F' }))}
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                  >
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Age</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                    min={18}
                    max={50}
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Bats</label>
                  <select
                    value={formData.bats}
                    onChange={(e) => setFormData(prev => ({ ...prev, bats: e.target.value as 'L' | 'R' | 'S' }))}
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                  >
                    <option value="R">Right</option>
                    <option value="L">Left</option>
                    <option value="S">Switch</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Throws</label>
                  <select
                    value={formData.throws}
                    onChange={(e) => setFormData(prev => ({ ...prev, throws: e.target.value as 'L' | 'R' }))}
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                  >
                    <option value="R">Right</option>
                    <option value="L">Left</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Grade</label>
                  <select
                    value={formData.overallGrade}
                    onChange={(e) => setFormData(prev => ({ ...prev, overallGrade: e.target.value as Grade }))}
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                  >
                    {GRADES.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Position Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Primary Position</label>
                  <select
                    value={formData.primaryPosition}
                    onChange={(e) => setFormData(prev => ({ ...prev, primaryPosition: e.target.value as Position }))}
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                  >
                    {POSITIONS.map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Secondary Position</label>
                  <select
                    value={formData.secondaryPosition}
                    onChange={(e) => setFormData(prev => ({ ...prev, secondaryPosition: e.target.value as Position | '' }))}
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                  >
                    <option value="">None</option>
                    {POSITIONS.filter(p => p !== formData.primaryPosition).map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Batting Ratings */}
              <div>
                <label className="block text-sm font-bold mb-2">Batting Ratings</label>
                <div className="grid grid-cols-5 gap-3">
                  {[
                    { key: 'power', label: 'POW' },
                    { key: 'contact', label: 'CON' },
                    { key: 'speed', label: 'SPD' },
                    { key: 'fielding', label: 'FLD' },
                    { key: 'arm', label: 'ARM' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-xs text-[#E8E8D8]/70 mb-1">{label}</label>
                      <input
                        type="number"
                        value={formData[key as keyof PlayerFormData] as string}
                        onChange={(e) => setFormData(prev => ({ ...prev, [key]: e.target.value }))}
                        min={0}
                        max={99}
                        className="w-full bg-[#4A6844] border-[3px] border-[#3F5A3A] p-2 text-center text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Pitching Ratings (only show for pitchers) */}
              {isPitcherPosition(formData.primaryPosition) && (
                <div>
                  <label className="block text-sm font-bold mb-2">Pitching Ratings</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: 'velocity', label: 'VEL' },
                      { key: 'junk', label: 'JNK' },
                      { key: 'accuracy', label: 'ACC' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-xs text-[#E8E8D8]/70 mb-1">{label}</label>
                        <input
                          type="number"
                          value={formData[key as keyof PlayerFormData] as string}
                          onChange={(e) => setFormData(prev => ({ ...prev, [key]: e.target.value }))}
                          min={0}
                          max={99}
                          className="w-full bg-[#4A6844] border-[3px] border-[#3F5A3A] p-2 text-center text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Arsenal */}
                  <div className="mt-3">
                    <label className="block text-xs text-[#E8E8D8]/70 mb-2">Arsenal</label>
                    <div className="flex flex-wrap gap-2">
                      {PITCH_TYPES.map(pitch => (
                        <button
                          key={pitch}
                          type="button"
                          onClick={() => toggleArsenal(pitch)}
                          className={`px-3 py-1 text-xs border-2 transition ${
                            formData.arsenal.includes(pitch)
                              ? 'bg-[#5599FF] border-[#3366FF] text-white'
                              : 'bg-[#4A6844] border-[#3F5A3A] text-[#E8E8D8]/70 hover:border-[#E8E8D8]/50'
                          }`}
                        >
                          {pitch}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Personality & Chemistry */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Personality</label>
                  <select
                    value={formData.personality}
                    onChange={(e) => setFormData(prev => ({ ...prev, personality: e.target.value as Personality }))}
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                  >
                    {PERSONALITIES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Chemistry</label>
                  <select
                    value={formData.chemistry}
                    onChange={(e) => setFormData(prev => ({ ...prev, chemistry: e.target.value as Chemistry }))}
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                  >
                    {CHEMISTRIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Team Assignment */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">
                    <Users className="w-3 h-3 inline mr-1" />
                    Team
                  </label>
                  <select
                    value={formData.currentTeamId}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      currentTeamId: e.target.value,
                      rosterStatus: e.target.value ? prev.rosterStatus : 'FREE_AGENT'
                    }))}
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                  >
                    <option value="">Free Agent</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Roster Status</label>
                  <select
                    value={formData.rosterStatus}
                    onChange={(e) => setFormData(prev => ({ ...prev, rosterStatus: e.target.value as RosterStatus }))}
                    disabled={!formData.currentTeamId}
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none disabled:opacity-50"
                  >
                    <option value="FREE_AGENT">Free Agent</option>
                    <option value="MLB">MLB Roster</option>
                    <option value="FARM">Farm System</option>
                  </select>
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
                disabled={!formData.firstName.trim() || !formData.lastName.trim() || isSaving}
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
                    {editingPlayer ? "Save Changes" : "Create Player"}
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
