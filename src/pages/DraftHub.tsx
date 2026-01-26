/**
 * DraftHub - Draft management and pick selection
 * Per Ralph Framework S-E009, S-E010
 *
 * Features:
 * - Draft order displayed
 * - Prospects pool with ratings
 * - User's turn highlighted
 * - Select and confirm picks
 */

import { useState, useMemo } from 'react';

interface DraftPick {
  pickNumber: number;
  teamId: string;
  teamName: string;
  selectedProspectId?: string;
  selectedProspectName?: string;
}

interface Prospect {
  prospectId: string;
  playerName: string;
  position: string;
  age: number;
  overall: string;
  potential: string;
  isPitcher: boolean;
  // Ratings
  power?: number;
  contact?: number;
  speed?: number;
  fielding?: number;
  velocity?: number;
  junk?: number;
  accuracy?: number;
}

interface DraftHubProps {
  draftOrder: DraftPick[];
  prospects: Prospect[];
  userTeamId: string;
  currentPick: number;
  round: number;
  totalRounds: number;
  onDraftPlayer: (prospectId: string) => void;
  onContinue: () => void;
}

type FilterPosition = 'all' | 'batter' | 'pitcher';

export default function DraftHub({
  draftOrder,
  prospects,
  userTeamId,
  currentPick,
  round,
  totalRounds,
  onDraftPlayer,
  onContinue,
}: DraftHubProps) {
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [filterPosition, setFilterPosition] = useState<FilterPosition>('all');

  const isUserTurn = useMemo(() => {
    const currentPickData = draftOrder.find((p) => p.pickNumber === currentPick);
    return currentPickData?.teamId === userTeamId;
  }, [draftOrder, currentPick, userTeamId]);

  // Filter out already drafted prospects
  const availableProspects = useMemo(() => {
    const draftedIds = new Set(
      draftOrder
        .filter((p) => p.selectedProspectId)
        .map((p) => p.selectedProspectId)
    );
    let available = prospects.filter((p) => !draftedIds.has(p.prospectId));

    if (filterPosition === 'batter') {
      available = available.filter((p) => !p.isPitcher);
    } else if (filterPosition === 'pitcher') {
      available = available.filter((p) => p.isPitcher);
    }

    return available;
  }, [prospects, draftOrder, filterPosition]);

  const handleConfirmPick = () => {
    if (selectedProspectId && isUserTurn) {
      onDraftPlayer(selectedProspectId);
      setSelectedProspectId(null);
    }
  };

  const userPickNumbers = useMemo(() => {
    return draftOrder
      .filter((p) => p.teamId === userTeamId)
      .map((p) => p.pickNumber);
  }, [draftOrder, userTeamId]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Draft</h1>
        <div style={styles.roundBadge}>
          Round {round}/{totalRounds}
        </div>
      </div>

      <div style={styles.mainGrid}>
        {/* Draft Order Panel */}
        <div style={styles.orderPanel}>
          <h2 style={styles.panelTitle}>Draft Order</h2>
          <div style={styles.picksList}>
            {draftOrder.map((pick) => {
              const isCurrentPick = pick.pickNumber === currentPick;
              const isUserPick = pick.teamId === userTeamId;
              const isComplete = !!pick.selectedProspectId;

              return (
                <div
                  key={pick.pickNumber}
                  style={{
                    ...styles.pickRow,
                    ...(isCurrentPick ? styles.currentPickRow : {}),
                    ...(isUserPick ? styles.userPickRow : {}),
                    ...(isComplete ? styles.completedPickRow : {}),
                  }}
                >
                  <span style={styles.pickNumber}>{pick.pickNumber}</span>
                  <div style={styles.pickInfo}>
                    <span style={styles.teamName}>{pick.teamName}</span>
                    {pick.selectedProspectName && (
                      <span style={styles.draftedPlayer}>
                        {pick.selectedProspectName}
                      </span>
                    )}
                  </div>
                  {isCurrentPick && !isComplete && (
                    <span style={styles.onClockBadge}>
                      {isUserPick ? 'YOUR PICK' : 'On Clock'}
                    </span>
                  )}
                  {isComplete && <span style={styles.checkmark}>✓</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Prospects Panel */}
        <div style={styles.prospectsPanel}>
          <div style={styles.prospectsPanelHeader}>
            <h2 style={styles.panelTitle}>Available Prospects</h2>
            <div style={styles.filterTabs}>
              <button
                style={{
                  ...styles.filterTab,
                  ...(filterPosition === 'all' ? styles.filterTabActive : {}),
                }}
                onClick={() => setFilterPosition('all')}
              >
                All
              </button>
              <button
                style={{
                  ...styles.filterTab,
                  ...(filterPosition === 'batter' ? styles.filterTabActive : {}),
                }}
                onClick={() => setFilterPosition('batter')}
              >
                Batters
              </button>
              <button
                style={{
                  ...styles.filterTab,
                  ...(filterPosition === 'pitcher' ? styles.filterTabActive : {}),
                }}
                onClick={() => setFilterPosition('pitcher')}
              >
                Pitchers
              </button>
            </div>
          </div>

          <div style={styles.prospectsList}>
            {availableProspects.map((prospect) => (
              <div
                key={prospect.prospectId}
                style={{
                  ...styles.prospectCard,
                  ...(selectedProspectId === prospect.prospectId
                    ? styles.selectedProspect
                    : {}),
                  cursor: isUserTurn ? 'pointer' : 'default',
                  opacity: isUserTurn ? 1 : 0.7,
                }}
                onClick={() =>
                  isUserTurn && setSelectedProspectId(prospect.prospectId)
                }
              >
                <div style={styles.prospectHeader}>
                  <div style={styles.prospectInfo}>
                    <span style={styles.prospectName}>{prospect.playerName}</span>
                    <span style={styles.prospectDetails}>
                      {prospect.position} · Age {prospect.age}
                    </span>
                  </div>
                  <div style={styles.prospectGrades}>
                    <div style={styles.grade}>
                      <span style={styles.gradeValue}>{prospect.overall}</span>
                      <span style={styles.gradeLabel}>OVR</span>
                    </div>
                    <div style={styles.grade}>
                      <span style={styles.gradeValue}>{prospect.potential}</span>
                      <span style={styles.gradeLabel}>POT</span>
                    </div>
                  </div>
                </div>
                <div style={styles.ratingsRow}>
                  {prospect.isPitcher ? (
                    <>
                      <span>VEL: {prospect.velocity}</span>
                      <span>JNK: {prospect.junk}</span>
                      <span>ACC: {prospect.accuracy}</span>
                    </>
                  ) : (
                    <>
                      <span>POW: {prospect.power}</span>
                      <span>CON: {prospect.contact}</span>
                      <span>SPD: {prospect.speed}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {availableProspects.length === 0 && (
            <div style={styles.empty}>No prospects available</div>
          )}
        </div>
      </div>

      {/* Draft Button */}
      {isUserTurn && (
        <div style={styles.draftAction}>
          <button
            style={{
              ...styles.draftButton,
              ...(selectedProspectId ? {} : styles.draftButtonDisabled),
            }}
            onClick={handleConfirmPick}
            disabled={!selectedProspectId}
          >
            {selectedProspectId ? 'Confirm Selection' : 'Select a Prospect'}
          </button>
        </div>
      )}

      {!isUserTurn && (
        <div style={styles.waitingMessage}>
          Waiting for other teams to pick...
        </div>
      )}

      {/* Continue Button (when draft complete) */}
      {draftOrder.every((p) => p.selectedProspectId) && (
        <button style={styles.continueButton} onClick={onContinue}>
          Continue to Trades
        </button>
      )}
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
    maxWidth: '1100px',
    margin: '0 auto 24px',
  },
  title: {
    margin: 0,
    fontSize: '2rem',
    fontWeight: 900,
    color: '#fff',
  },
  roundBadge: {
    padding: '8px 20px',
    backgroundColor: '#a855f7',
    borderRadius: '100px',
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#fff',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '300px 1fr',
    gap: '24px',
    maxWidth: '1100px',
    margin: '0 auto',
  },
  orderPanel: {
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid #334155',
    height: 'fit-content',
  },
  panelTitle: {
    margin: '0 0 16px 0',
    fontSize: '1rem',
    fontWeight: 700,
    color: '#e2e8f0',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  picksList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  pickRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    gap: '12px',
  },
  currentPickRow: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    border: '1px solid rgba(168, 85, 247, 0.5)',
  },
  userPickRow: {
    borderLeft: '3px solid #22c55e',
  },
  completedPickRow: {
    opacity: 0.6,
  },
  pickNumber: {
    width: '24px',
    fontSize: '0.8125rem',
    fontWeight: 700,
    color: '#64748b',
    textAlign: 'center',
  },
  pickInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  teamName: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#e2e8f0',
  },
  draftedPlayer: {
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  onClockBadge: {
    padding: '4px 8px',
    backgroundColor: '#a855f7',
    borderRadius: '4px',
    fontSize: '0.625rem',
    fontWeight: 700,
    color: '#fff',
    textTransform: 'uppercase',
  },
  checkmark: {
    color: '#22c55e',
    fontWeight: 700,
  },
  prospectsPanel: {
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid #334155',
  },
  prospectsPanelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  filterTabs: {
    display: 'flex',
    gap: '8px',
  },
  filterTab: {
    padding: '6px 12px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#94a3b8',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  filterTabActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    color: '#fff',
  },
  prospectsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '12px',
    maxHeight: '500px',
    overflowY: 'auto',
  },
  prospectCard: {
    padding: '16px',
    backgroundColor: '#0f172a',
    borderRadius: '10px',
    border: '2px solid transparent',
    transition: 'all 0.15s ease',
  },
  selectedProspect: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
  },
  prospectHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  prospectInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  prospectName: {
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: '#fff',
  },
  prospectDetails: {
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  prospectGrades: {
    display: 'flex',
    gap: '8px',
  },
  grade: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '4px 8px',
    backgroundColor: '#1e293b',
    borderRadius: '4px',
  },
  gradeValue: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  gradeLabel: {
    fontSize: '0.5rem',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  ratingsRow: {
    display: 'flex',
    gap: '12px',
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    color: '#64748b',
  },
  draftAction: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '32px',
  },
  draftButton: {
    padding: '16px 48px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  draftButtonDisabled: {
    background: '#334155',
    color: '#64748b',
    cursor: 'not-allowed',
  },
  waitingMessage: {
    textAlign: 'center',
    marginTop: '32px',
    fontSize: '1rem',
    color: '#94a3b8',
  },
  continueButton: {
    display: 'block',
    margin: '32px auto 0',
    padding: '16px 48px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
};
