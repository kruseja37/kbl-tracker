/**
 * TradeProposalBuilder - Build trade packages
 * Per Ralph Framework S-E014
 *
 * Features:
 * - Two-column layout (sending/receiving)
 * - Player selection from roster
 * - Submit when valid
 */

import { useState, useMemo } from 'react';
import type { TradeWarning } from '../../engines/relationshipEngine';

interface Player {
  playerId: string;
  playerName: string;
  position: string;
  overall: string;
  salary: number;
  yearsRemaining: number;
}

interface Team {
  teamId: string;
  teamName: string;
  roster: Player[];
}

interface TradeProposalBuilderProps {
  userTeam: Team;
  otherTeams: Team[];
  salaryMatchRequired: number; // e.g., 0.8 = 80%
  onProposeTrade: (
    otherTeamId: string,
    sendingPlayerIds: string[],
    receivingPlayerIds: string[]
  ) => void;
  onCancel: () => void;
  getTradeWarnings?: (playerId: string) => TradeWarning[];
}

export default function TradeProposalBuilder({
  userTeam,
  otherTeams,
  salaryMatchRequired,
  onProposeTrade,
  onCancel,
  getTradeWarnings,
}: TradeProposalBuilderProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    otherTeams[0]?.teamId || ''
  );
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [receivingIds, setReceivingIds] = useState<Set<string>>(new Set());

  const selectedTeam = useMemo(
    () => otherTeams.find((t) => t.teamId === selectedTeamId),
    [otherTeams, selectedTeamId]
  );

  const sendingPlayers = useMemo(
    () => userTeam.roster.filter((p) => sendingIds.has(p.playerId)),
    [userTeam.roster, sendingIds]
  );

  // Calculate relationship warnings for players being sent
  const tradeWarnings = useMemo(() => {
    if (!getTradeWarnings) return [];
    const warnings: TradeWarning[] = [];
    sendingPlayers.forEach((p) => {
      const playerWarnings = getTradeWarnings(p.playerId);
      warnings.push(...playerWarnings);
    });
    return warnings;
  }, [sendingPlayers, getTradeWarnings]);

  const receivingPlayers = useMemo(
    () => selectedTeam?.roster.filter((p) => receivingIds.has(p.playerId)) || [],
    [selectedTeam, receivingIds]
  );

  const sendingSalary = useMemo(
    () => sendingPlayers.reduce((sum, p) => sum + p.salary, 0),
    [sendingPlayers]
  );

  const receivingSalary = useMemo(
    () => receivingPlayers.reduce((sum, p) => sum + p.salary, 0),
    [receivingPlayers]
  );

  const salaryMatchPercent = useMemo(() => {
    if (sendingSalary === 0 || receivingSalary === 0) return 0;
    const smaller = Math.min(sendingSalary, receivingSalary);
    const larger = Math.max(sendingSalary, receivingSalary);
    return smaller / larger;
  }, [sendingSalary, receivingSalary]);

  const isSalaryValid = salaryMatchPercent >= salaryMatchRequired;
  const hasPlayers = sendingIds.size > 0 && receivingIds.size > 0;
  const canSubmit = hasPlayers && isSalaryValid;

  const toggleSending = (playerId: string) => {
    const newSet = new Set(sendingIds);
    if (newSet.has(playerId)) {
      newSet.delete(playerId);
    } else {
      newSet.add(playerId);
    }
    setSendingIds(newSet);
  };

  const toggleReceiving = (playerId: string) => {
    const newSet = new Set(receivingIds);
    if (newSet.has(playerId)) {
      newSet.delete(playerId);
    } else {
      newSet.add(playerId);
    }
    setReceivingIds(newSet);
  };

  const handleSubmit = () => {
    if (canSubmit) {
      onProposeTrade(
        selectedTeamId,
        Array.from(sendingIds),
        Array.from(receivingIds)
      );
    }
  };

  const formatSalary = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    return `$${(amount / 1000).toFixed(0)}K`;
  };

  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId);
    setReceivingIds(new Set()); // Clear receiving when team changes
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Build Trade</h1>
        <button style={styles.cancelButton} onClick={onCancel}>
          Cancel
        </button>
      </div>

      {/* Team Selector */}
      <div style={styles.teamSelector}>
        <label style={styles.selectorLabel}>Trade with:</label>
        <select
          style={styles.teamSelect}
          value={selectedTeamId}
          onChange={(e) => handleTeamChange(e.target.value)}
        >
          {otherTeams.map((team) => (
            <option key={team.teamId} value={team.teamId}>
              {team.teamName}
            </option>
          ))}
        </select>
      </div>

      {/* Two Column Layout */}
      <div style={styles.columnsContainer}>
        {/* Sending Column */}
        <div style={styles.column}>
          <div style={styles.columnHeader}>
            <h2 style={styles.columnTitle}>You Send</h2>
            <span style={styles.salaryTotal}>{formatSalary(sendingSalary)}</span>
          </div>
          <div style={styles.playerList}>
            {userTeam.roster.map((player) => (
              <div
                key={player.playerId}
                style={{
                  ...styles.playerCard,
                  ...(sendingIds.has(player.playerId) ? styles.selectedCard : {}),
                }}
                onClick={() => toggleSending(player.playerId)}
              >
                <div style={styles.checkbox}>
                  {sendingIds.has(player.playerId) ? '✓' : '○'}
                </div>
                <div style={styles.playerInfo}>
                  <span style={styles.playerName}>{player.playerName}</span>
                  <span style={styles.playerDetails}>
                    {player.position} · {player.overall}
                  </span>
                </div>
                <div style={styles.playerSalary}>
                  {formatSalary(player.salary)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Receiving Column */}
        <div style={styles.column}>
          <div style={styles.columnHeader}>
            <h2 style={styles.columnTitle}>You Receive</h2>
            <span style={styles.salaryTotal}>{formatSalary(receivingSalary)}</span>
          </div>
          <div style={styles.playerList}>
            {selectedTeam?.roster.map((player) => (
              <div
                key={player.playerId}
                style={{
                  ...styles.playerCard,
                  ...(receivingIds.has(player.playerId) ? styles.selectedCard : {}),
                }}
                onClick={() => toggleReceiving(player.playerId)}
              >
                <div style={styles.checkbox}>
                  {receivingIds.has(player.playerId) ? '✓' : '○'}
                </div>
                <div style={styles.playerInfo}>
                  <span style={styles.playerName}>{player.playerName}</span>
                  <span style={styles.playerDetails}>
                    {player.position} · {player.overall}
                  </span>
                </div>
                <div style={styles.playerSalary}>
                  {formatSalary(player.salary)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Salary Matcher */}
      <div style={styles.salaryMatcher}>
        <div style={styles.matcherHeader}>
          <span style={styles.matcherLabel}>Salary Match</span>
          <span
            style={{
              ...styles.matcherStatus,
              color: isSalaryValid ? '#22c55e' : '#ef4444',
            }}
          >
            {isSalaryValid ? '✓ Valid' : '✗ Does not match'}
          </span>
        </div>
        <div style={styles.matcherDetails}>
          <div style={styles.matcherSide}>
            <span style={styles.matcherTeam}>{userTeam.teamName}</span>
            <span style={styles.matcherValue}>{formatSalary(sendingSalary)}</span>
          </div>
          <div style={styles.matcherVs}>vs</div>
          <div style={styles.matcherSide}>
            <span style={styles.matcherTeam}>{selectedTeam?.teamName}</span>
            <span style={styles.matcherValue}>{formatSalary(receivingSalary)}</span>
          </div>
        </div>
        <div style={styles.matcherRule}>
          Salaries must be within {Math.round(salaryMatchRequired * 100)}% of each other
        </div>
      </div>

      {/* Relationship Warnings */}
      {tradeWarnings.length > 0 && (
        <div style={styles.warningsContainer}>
          <div style={styles.warningsHeader}>
            <span style={styles.warningsIcon}>⚠️</span>
            <span style={styles.warningsTitle}>Relationship Impact</span>
          </div>
          <div style={styles.warningsList}>
            {tradeWarnings.map((warning, idx) => (
              <div key={idx} style={styles.warningItem}>
                <span style={styles.warningText}>{warning.description}</span>
                <span style={styles.warningMorale}>
                  {warning.moraleImpact} morale
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        style={{
          ...styles.submitButton,
          ...(canSubmit ? {} : styles.submitDisabled),
        }}
        onClick={handleSubmit}
        disabled={!canSubmit}
      >
        {!hasPlayers
          ? 'Select Players'
          : !isSalaryValid
          ? 'Salaries Must Match'
          : 'Propose Trade'}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
    padding: '40px 20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1000px',
    margin: '0 auto 24px',
  },
  title: {
    margin: 0,
    fontSize: '2rem',
    fontWeight: 900,
    color: '#fff',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#94a3b8',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  teamSelector: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    marginBottom: '24px',
  },
  selectorLabel: {
    fontSize: '1rem',
    color: '#94a3b8',
  },
  teamSelect: {
    padding: '12px 20px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    minWidth: '200px',
  },
  columnsContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    maxWidth: '1000px',
    margin: '0 auto 24px',
  },
  column: {
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid #334155',
  },
  columnHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #334155',
  },
  columnTitle: {
    margin: 0,
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  salaryTotal: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#fbbf24',
  },
  playerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  playerCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    gap: '12px',
  },
  selectedCard: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
  },
  checkbox: {
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
    color: '#22c55e',
    fontWeight: 700,
  },
  playerInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  playerName: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#fff',
  },
  playerDetails: {
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  playerSalary: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#fbbf24',
  },
  salaryMatcher: {
    maxWidth: '500px',
    margin: '0 auto 32px',
    padding: '20px',
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
  },
  matcherHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  matcherLabel: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#e2e8f0',
  },
  matcherStatus: {
    fontSize: '0.875rem',
    fontWeight: 700,
  },
  matcherDetails: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    marginBottom: '12px',
  },
  matcherSide: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  matcherTeam: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  matcherValue: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#fff',
  },
  matcherVs: {
    fontSize: '0.875rem',
    color: '#64748b',
  },
  matcherRule: {
    textAlign: 'center',
    fontSize: '0.75rem',
    color: '#64748b',
  },
  submitButton: {
    display: 'block',
    margin: '0 auto',
    padding: '16px 48px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  submitDisabled: {
    background: '#334155',
    color: '#64748b',
    cursor: 'not-allowed',
  },
  warningsContainer: {
    maxWidth: '500px',
    margin: '0 auto 24px',
    padding: '16px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '12px',
  },
  warningsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  warningsIcon: {
    fontSize: '1.25rem',
  },
  warningsTitle: {
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: '#ef4444',
  },
  warningsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  warningItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
  },
  warningText: {
    fontSize: '0.875rem',
    color: '#fca5a5',
  },
  warningMorale: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#ef4444',
  },
};
