/**
 * Data Loading State Component
 * Per Ralph Framework GAP-004
 *
 * Reusable component for loading and error states.
 */

import type { ReactNode } from 'react';

interface DataLoadingStateProps {
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  children: ReactNode;
  loadingMessage?: string;
}

export function DataLoadingState({
  isLoading,
  error,
  onRetry,
  children,
  loadingMessage = 'Loading data...',
}: DataLoadingStateProps) {
  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContent}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContent}>
          <div style={styles.errorIcon}>⚠️</div>
          <h3 style={styles.errorTitle}>Something went wrong</h3>
          <p style={styles.errorMessage}>{error}</p>
          {onRetry && (
            <button style={styles.retryButton} onClick={onRetry}>
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
  },
  loadingContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #334155',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#94a3b8',
  },
  errorContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    maxWidth: '400px',
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: '3rem',
  },
  errorTitle: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#fff',
  },
  errorMessage: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#94a3b8',
  },
  retryButton: {
    marginTop: '8px',
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};

// Add keyframe animation via style tag
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
if (typeof document !== 'undefined' && !document.querySelector('[data-loading-styles]')) {
  styleSheet.setAttribute('data-loading-styles', 'true');
  document.head.appendChild(styleSheet);
}

export default DataLoadingState;
