/**
 * TradeSalaryMatcher - Salary matching display
 * Per Ralph Framework S-E015
 *
 * Features:
 * - Salary totals shown
 * - Match requirement displayed
 * - Pass/fail indicator
 */

interface TradeSalaryMatcherProps {
  sendingSalary: number;
  receivingSalary: number;
  matchRequirement: number; // e.g., 0.8 = 80%
  userTeamName: string;
  otherTeamName: string;
}

export default function TradeSalaryMatcher({
  sendingSalary,
  receivingSalary,
  matchRequirement,
  userTeamName,
  otherTeamName,
}: TradeSalaryMatcherProps) {
  const formatSalary = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`;
    }
    return `$${(amount / 1000).toFixed(0)}K`;
  };

  const calculateMatch = (): number => {
    if (sendingSalary === 0 || receivingSalary === 0) return 0;
    const smaller = Math.min(sendingSalary, receivingSalary);
    const larger = Math.max(sendingSalary, receivingSalary);
    return smaller / larger;
  };

  const matchPercent = calculateMatch();
  const isValid = matchPercent >= matchRequirement;
  const difference = Math.abs(sendingSalary - receivingSalary);
  const requiredPercent = Math.round(matchRequirement * 100);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title}>Salary Matching</span>
        <span
          style={{
            ...styles.statusBadge,
            backgroundColor: isValid
              ? 'rgba(34, 197, 94, 0.15)'
              : 'rgba(239, 68, 68, 0.15)',
            color: isValid ? '#22c55e' : '#ef4444',
          }}
        >
          {isValid ? '✓ Valid Trade' : '✗ Does not match'}
        </span>
      </div>

      {/* Salary Comparison */}
      <div style={styles.comparison}>
        <div style={styles.teamSalary}>
          <span style={styles.teamLabel}>Sending</span>
          <span style={styles.teamName}>{userTeamName}</span>
          <span style={styles.salaryValue}>{formatSalary(sendingSalary)}</span>
        </div>

        <div style={styles.vsContainer}>
          <div style={styles.vsCircle}>
            <span style={styles.vsText}>vs</span>
          </div>
          <div
            style={{
              ...styles.differenceBar,
              backgroundColor: isValid
                ? 'rgba(34, 197, 94, 0.2)'
                : 'rgba(239, 68, 68, 0.2)',
            }}
          >
            <span
              style={{
                ...styles.differenceText,
                color: isValid ? '#22c55e' : '#ef4444',
              }}
            >
              {sendingSalary > receivingSalary ? '+' : '-'}
              {formatSalary(difference)}
            </span>
          </div>
        </div>

        <div style={styles.teamSalary}>
          <span style={styles.teamLabel}>Receiving</span>
          <span style={styles.teamName}>{otherTeamName}</span>
          <span style={styles.salaryValue}>{formatSalary(receivingSalary)}</span>
        </div>
      </div>

      {/* Match Meter */}
      <div style={styles.meterSection}>
        <div style={styles.meterHeader}>
          <span style={styles.meterLabel}>
            Match: {Math.round(matchPercent * 100)}%
          </span>
          <span style={styles.meterRequired}>
            Required: {requiredPercent}%
          </span>
        </div>
        <div style={styles.meterTrack}>
          <div
            style={{
              ...styles.meterFill,
              width: `${Math.min(matchPercent * 100, 100)}%`,
              backgroundColor: isValid ? '#22c55e' : '#ef4444',
            }}
          />
          <div
            style={{
              ...styles.meterThreshold,
              left: `${requiredPercent}%`,
            }}
          />
        </div>
      </div>

      {/* Requirement Info */}
      <div style={styles.ruleInfo}>
        <div style={styles.ruleIcon}>ℹ️</div>
        <div style={styles.ruleText}>
          <span style={styles.ruleBold}>Salary Matching Rule:</span>
          <span>
            Trade salaries must be within {requiredPercent}% of each other.
            {!isValid && (
              <>
                {' '}
                To balance this trade, adjust salaries by at least{' '}
                <strong style={{ color: '#ef4444' }}>
                  {formatSalary(
                    Math.ceil(
                      (Math.max(sendingSalary, receivingSalary) * matchRequirement) -
                        Math.min(sendingSalary, receivingSalary)
                    )
                  )}
                </strong>
                .
              </>
            )}
          </span>
        </div>
      </div>

      {/* Status Summary */}
      <div
        style={{
          ...styles.statusSummary,
          backgroundColor: isValid
            ? 'rgba(34, 197, 94, 0.1)'
            : 'rgba(239, 68, 68, 0.1)',
          borderColor: isValid ? '#22c55e' : '#ef4444',
        }}
      >
        {isValid ? (
          <>
            <span style={styles.statusIcon}>✓</span>
            <span style={styles.statusText}>
              This trade meets salary requirements
            </span>
          </>
        ) : (
          <>
            <span style={styles.statusIcon}>✗</span>
            <span style={styles.statusText}>
              This trade does NOT meet salary requirements
            </span>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid #334155',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  statusBadge: {
    padding: '6px 16px',
    borderRadius: '100px',
    fontSize: '0.8125rem',
    fontWeight: 700,
  },
  comparison: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
  },
  teamSalary: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    flex: 1,
  },
  teamLabel: {
    fontSize: '0.6875rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  teamName: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#94a3b8',
  },
  salaryValue: {
    fontSize: '1.5rem',
    fontWeight: 900,
    color: '#fff',
  },
  vsContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '0 20px',
  },
  vsCircle: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    borderRadius: '50%',
  },
  vsText: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#64748b',
  },
  differenceBar: {
    padding: '6px 16px',
    borderRadius: '100px',
  },
  differenceText: {
    fontSize: '0.8125rem',
    fontWeight: 700,
  },
  meterSection: {
    marginBottom: '20px',
  },
  meterHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  meterLabel: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#e2e8f0',
  },
  meterRequired: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  meterTrack: {
    position: 'relative',
    height: '8px',
    backgroundColor: '#0f172a',
    borderRadius: '4px',
    overflow: 'visible',
  },
  meterFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  meterThreshold: {
    position: 'absolute',
    top: '-4px',
    width: '2px',
    height: '16px',
    backgroundColor: '#fbbf24',
    transform: 'translateX(-50%)',
  },
  ruleInfo: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  ruleIcon: {
    fontSize: '1rem',
    flexShrink: 0,
  },
  ruleText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '0.8125rem',
    color: '#94a3b8',
    lineHeight: 1.5,
  },
  ruleBold: {
    fontWeight: 600,
    color: '#e2e8f0',
  },
  statusSummary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid',
  },
  statusIcon: {
    fontSize: '1.25rem',
  },
  statusText: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#e2e8f0',
  },
};
