/**
 * TradeHub - Trade management center
 * Per Ralph Framework S-E013
 *
 * Features:
 * - New trade button
 * - Active proposals shown
 * - Trade history
 */

interface TradeProposal {
  tradeId: string;
  otherTeamId: string;
  otherTeamName: string;
  status: 'pending' | 'accepted' | 'rejected' | 'countered';
  isIncoming: boolean;
  sendingPlayers: { playerId: string; playerName: string; salary: number }[];
  receivingPlayers: { playerId: string; playerName: string; salary: number }[];
  createdAt: Date;
}

interface CompletedTrade {
  tradeId: string;
  otherTeamId: string;
  otherTeamName: string;
  sentPlayers: { playerId: string; playerName: string }[];
  receivedPlayers: { playerId: string; playerName: string }[];
  completedAt: Date;
}

interface TradeHubProps {
  pendingTrades: TradeProposal[];
  completedTrades: CompletedTrade[];
  userTeamName: string;
  onNewTrade: () => void;
  onViewTrade: (tradeId: string) => void;
  onContinue: () => void;
}

export default function TradeHub({
  pendingTrades,
  completedTrades,
  userTeamName,
  onNewTrade,
  onViewTrade,
  onContinue,
}: TradeHubProps) {
  const incomingTrades = pendingTrades.filter((t) => t.isIncoming);
  const outgoingTrades = pendingTrades.filter((t) => !t.isIncoming);

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatSalary = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    return `$${(amount / 1000).toFixed(0)}K`;
  };

  const getTotalSalary = (
    players: { salary: number }[]
  ): number => {
    return players.reduce((sum, p) => sum + p.salary, 0);
  };

  const getStatusColor = (status: TradeProposal['status']): string => {
    switch (status) {
      case 'pending':
        return '#fbbf24';
      case 'accepted':
        return '#22c55e';
      case 'rejected':
        return '#ef4444';
      case 'countered':
        return '#3b82f6';
      default:
        return '#64748b';
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Trade Center</h1>
        <button style={styles.newTradeButton} onClick={onNewTrade}>
          + Propose Trade
        </button>
      </div>

      {/* Summary Cards */}
      <div style={styles.summaryRow}>
        <div style={styles.summaryCard}>
          <span style={styles.summaryValue}>{incomingTrades.length}</span>
          <span style={styles.summaryLabel}>Incoming</span>
        </div>
        <div style={styles.summaryCard}>
          <span style={styles.summaryValue}>{outgoingTrades.length}</span>
          <span style={styles.summaryLabel}>Outgoing</span>
        </div>
        <div style={styles.summaryCard}>
          <span style={styles.summaryValue}>{completedTrades.length}</span>
          <span style={styles.summaryLabel}>Completed</span>
        </div>
      </div>

      {/* Incoming Trades */}
      {incomingTrades.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Incoming Proposals</h2>
          <div style={styles.tradesList}>
            {incomingTrades.map((trade) => (
              <div
                key={trade.tradeId}
                style={styles.tradeCard}
                onClick={() => onViewTrade(trade.tradeId)}
              >
                <div style={styles.tradeHeader}>
                  <span style={styles.teamName}>{trade.otherTeamName}</span>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: `${getStatusColor(trade.status)}20`,
                      color: getStatusColor(trade.status),
                    }}
                  >
                    {trade.status}
                  </span>
                </div>
                <div style={styles.tradeDetails}>
                  <div style={styles.tradeSide}>
                    <span style={styles.tradeLabel}>You receive:</span>
                    {trade.receivingPlayers.map((p) => (
                      <span key={p.playerId} style={styles.playerName}>
                        {p.playerName}
                      </span>
                    ))}
                    <span style={styles.salarySummary}>
                      {formatSalary(getTotalSalary(trade.receivingPlayers))}
                    </span>
                  </div>
                  <div style={styles.arrow}>⇄</div>
                  <div style={styles.tradeSide}>
                    <span style={styles.tradeLabel}>You send:</span>
                    {trade.sendingPlayers.map((p) => (
                      <span key={p.playerId} style={styles.playerName}>
                        {p.playerName}
                      </span>
                    ))}
                    <span style={styles.salarySummary}>
                      {formatSalary(getTotalSalary(trade.sendingPlayers))}
                    </span>
                  </div>
                </div>
                <div style={styles.tradeFooter}>
                  <span style={styles.dateText}>{formatDate(trade.createdAt)}</span>
                  <span style={styles.viewAction}>View Details →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outgoing Trades */}
      {outgoingTrades.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Your Proposals</h2>
          <div style={styles.tradesList}>
            {outgoingTrades.map((trade) => (
              <div
                key={trade.tradeId}
                style={styles.tradeCard}
                onClick={() => onViewTrade(trade.tradeId)}
              >
                <div style={styles.tradeHeader}>
                  <span style={styles.teamName}>To: {trade.otherTeamName}</span>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: `${getStatusColor(trade.status)}20`,
                      color: getStatusColor(trade.status),
                    }}
                  >
                    {trade.status}
                  </span>
                </div>
                <div style={styles.tradeDetails}>
                  <div style={styles.tradeSide}>
                    <span style={styles.tradeLabel}>Sending:</span>
                    {trade.sendingPlayers.map((p) => (
                      <span key={p.playerId} style={styles.playerName}>
                        {p.playerName}
                      </span>
                    ))}
                  </div>
                  <div style={styles.arrow}>→</div>
                  <div style={styles.tradeSide}>
                    <span style={styles.tradeLabel}>Receiving:</span>
                    {trade.receivingPlayers.map((p) => (
                      <span key={p.playerId} style={styles.playerName}>
                        {p.playerName}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trade History */}
      {completedTrades.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Trade History</h2>
          <div style={styles.historyList}>
            {completedTrades.map((trade) => (
              <div key={trade.tradeId} style={styles.historyCard}>
                <div style={styles.historyHeader}>
                  <span style={styles.historyTeam}>{trade.otherTeamName}</span>
                  <span style={styles.historyDate}>
                    {formatDate(trade.completedAt)}
                  </span>
                </div>
                <div style={styles.historyDetails}>
                  <span>
                    Sent: {trade.sentPlayers.map((p) => p.playerName).join(', ')}
                  </span>
                  <span>
                    Received: {trade.receivedPlayers.map((p) => p.playerName).join(', ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {pendingTrades.length === 0 && completedTrades.length === 0 && (
        <div style={styles.empty}>
          <span style={styles.emptyIcon}>📋</span>
          <span style={styles.emptyText}>No trade activity yet</span>
          <span style={styles.emptyHint}>
            Click "Propose Trade" to start building a deal
          </span>
        </div>
      )}

      {/* Continue Button */}
      <button style={styles.continueButton} onClick={onContinue}>
        Continue to Spring Training
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
    maxWidth: '800px',
    margin: '0 auto 24px',
  },
  title: {
    margin: 0,
    fontSize: '2rem',
    fontWeight: 900,
    color: '#fff',
  },
  newTradeButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '0.9375rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    marginBottom: '32px',
  },
  summaryCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 32px',
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
  },
  summaryValue: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#fff',
  },
  summaryLabel: {
    fontSize: '0.75rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: '4px',
  },
  section: {
    maxWidth: '800px',
    margin: '0 auto 32px',
  },
  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  tradesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  tradeCard: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #334155',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tradeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  teamName: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#fff',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '100px',
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  tradeDetails: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '20px',
    marginBottom: '16px',
  },
  tradeSide: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  tradeLabel: {
    fontSize: '0.6875rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '4px',
  },
  playerName: {
    fontSize: '0.875rem',
    color: '#e2e8f0',
  },
  salarySummary: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#fbbf24',
    marginTop: '8px',
  },
  arrow: {
    fontSize: '1.5rem',
    color: '#64748b',
    paddingTop: '16px',
  },
  tradeFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: '1px solid #334155',
  },
  dateText: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  viewAction: {
    fontSize: '0.8125rem',
    color: '#3b82f6',
    fontWeight: 600,
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  historyCard: {
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #334155',
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  historyTeam: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#e2e8f0',
  },
  historyDate: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  historyDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '0.8125rem',
    color: '#94a3b8',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px 20px',
    gap: '12px',
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '8px',
  },
  emptyText: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#e2e8f0',
  },
  emptyHint: {
    fontSize: '0.875rem',
    color: '#64748b',
  },
  continueButton: {
    display: 'block',
    margin: '40px auto 0',
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
