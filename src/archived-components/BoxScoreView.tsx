/**
 * BoxScoreView - Complete game box score display
 * Per Ralph Framework S-B009, S-B010
 *
 * Shows:
 * - Batting tables for both teams (AB, R, H, RBI, BB, K)
 * - Team totals row
 * - Pitching tables for both teams (IP, H, R, ER, BB, K)
 * - W/L/S decision indicators
 */

import { useMemo } from 'react';

// Types for box score data
interface BatterLine {
  playerId: string;
  name: string;
  position: string;
  ab: number;
  r: number;
  h: number;
  rbi: number;
  bb: number;
  k: number;
  // Extra stats
  doubles?: number;
  triples?: number;
  hr?: number;
}

interface PitcherLine {
  playerId: string;
  name: string;
  ip: string; // e.g., "6.2" for 6 innings + 2 outs
  h: number;
  r: number;
  er: number;
  bb: number;
  k: number;
  decision: 'W' | 'L' | 'S' | 'H' | 'BS' | null;
}

interface BoxScoreData {
  awayTeamName: string;
  homeTeamName: string;
  awayBatters: BatterLine[];
  homeBatters: BatterLine[];
  awayPitchers: PitcherLine[];
  homePitchers: PitcherLine[];
}

interface BoxScoreViewProps {
  data: BoxScoreData;
  onClose?: () => void;
}

// Calculate team totals from batter lines
function calculateTeamTotals(batters: BatterLine[]) {
  return batters.reduce(
    (totals, b) => ({
      ab: totals.ab + b.ab,
      r: totals.r + b.r,
      h: totals.h + b.h,
      rbi: totals.rbi + b.rbi,
      bb: totals.bb + b.bb,
      k: totals.k + b.k,
    }),
    { ab: 0, r: 0, h: 0, rbi: 0, bb: 0, k: 0 }
  );
}

export default function BoxScoreView({ data, onClose }: BoxScoreViewProps) {
  const awayTotals = useMemo(() => calculateTeamTotals(data.awayBatters), [data.awayBatters]);
  const homeTotals = useMemo(() => calculateTeamTotals(data.homeBatters), [data.homeBatters]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Box Score</h2>
        {onClose && (
          <button style={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        )}
      </div>

      {/* Away Team Batting */}
      <div style={styles.section}>
        <div style={styles.teamHeader}>{data.awayTeamName} Batting</div>
        <BattingTable batters={data.awayBatters} totals={awayTotals} />
      </div>

      {/* Home Team Batting */}
      <div style={styles.section}>
        <div style={styles.teamHeader}>{data.homeTeamName} Batting</div>
        <BattingTable batters={data.homeBatters} totals={homeTotals} />
      </div>

      {/* Away Team Pitching */}
      <div style={styles.section}>
        <div style={styles.teamHeader}>{data.awayTeamName} Pitching</div>
        <PitchingTable pitchers={data.awayPitchers} />
      </div>

      {/* Home Team Pitching */}
      <div style={styles.section}>
        <div style={styles.teamHeader}>{data.homeTeamName} Pitching</div>
        <PitchingTable pitchers={data.homePitchers} />
      </div>
    </div>
  );
}

// Batting Table Component
function BattingTable({
  batters,
  totals,
}: {
  batters: BatterLine[];
  totals: { ab: number; r: number; h: number; rbi: number; bb: number; k: number };
}) {
  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={{ ...styles.th, ...styles.nameCol }}>Player</th>
          <th style={styles.th}>POS</th>
          <th style={styles.th}>AB</th>
          <th style={styles.th}>R</th>
          <th style={styles.th}>H</th>
          <th style={styles.th}>RBI</th>
          <th style={styles.th}>BB</th>
          <th style={styles.th}>K</th>
        </tr>
      </thead>
      <tbody>
        {batters.map((batter) => (
          <tr key={batter.playerId}>
            <td style={{ ...styles.td, ...styles.nameCol }}>{batter.name}</td>
            <td style={styles.td}>{batter.position}</td>
            <td style={styles.td}>{batter.ab}</td>
            <td style={styles.td}>{batter.r}</td>
            <td style={styles.td}>{batter.h}</td>
            <td style={styles.td}>{batter.rbi}</td>
            <td style={styles.td}>{batter.bb}</td>
            <td style={styles.td}>{batter.k}</td>
          </tr>
        ))}
        {/* Totals Row */}
        <tr style={styles.totalsRow}>
          <td style={{ ...styles.td, ...styles.nameCol, fontWeight: 700 }}>Totals</td>
          <td style={styles.td}></td>
          <td style={{ ...styles.td, fontWeight: 700 }}>{totals.ab}</td>
          <td style={{ ...styles.td, fontWeight: 700 }}>{totals.r}</td>
          <td style={{ ...styles.td, fontWeight: 700 }}>{totals.h}</td>
          <td style={{ ...styles.td, fontWeight: 700 }}>{totals.rbi}</td>
          <td style={{ ...styles.td, fontWeight: 700 }}>{totals.bb}</td>
          <td style={{ ...styles.td, fontWeight: 700 }}>{totals.k}</td>
        </tr>
      </tbody>
    </table>
  );
}

// Pitching Table Component (S-B010)
function PitchingTable({ pitchers }: { pitchers: PitcherLine[] }) {
  const getDecisionBadge = (decision: PitcherLine['decision']) => {
    if (!decision) return null;
    const colors: Record<string, { bg: string; text: string }> = {
      W: { bg: '#22c55e', text: '#fff' },
      L: { bg: '#ef4444', text: '#fff' },
      S: { bg: '#3b82f6', text: '#fff' },
      H: { bg: '#8b5cf6', text: '#fff' },
      BS: { bg: '#f97316', text: '#fff' },
    };
    const style = colors[decision] || { bg: '#64748b', text: '#fff' };
    return (
      <span
        style={{
          ...styles.decisionBadge,
          backgroundColor: style.bg,
          color: style.text,
        }}
      >
        {decision}
      </span>
    );
  };

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={{ ...styles.th, ...styles.nameCol }}>Pitcher</th>
          <th style={styles.th}>IP</th>
          <th style={styles.th}>H</th>
          <th style={styles.th}>R</th>
          <th style={styles.th}>ER</th>
          <th style={styles.th}>BB</th>
          <th style={styles.th}>K</th>
        </tr>
      </thead>
      <tbody>
        {pitchers.map((pitcher) => (
          <tr key={pitcher.playerId}>
            <td style={{ ...styles.td, ...styles.nameCol }}>
              {getDecisionBadge(pitcher.decision)}
              {pitcher.name}
            </td>
            <td style={styles.td}>{pitcher.ip}</td>
            <td style={styles.td}>{pitcher.h}</td>
            <td style={styles.td}>{pitcher.r}</td>
            <td style={styles.td}>{pitcher.er}</td>
            <td style={styles.td}>{pitcher.bb}</td>
            <td style={styles.td}>{pitcher.k}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '1.5rem',
    color: '#e2e8f0',
    maxWidth: '800px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    borderBottom: '1px solid #334155',
    paddingBottom: '1rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#fff',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '1.5rem',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
  },
  section: {
    marginBottom: '1.5rem',
  },
  teamHeader: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '0.75rem',
    paddingLeft: '0.5rem',
    borderLeft: '3px solid #3b82f6',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.875rem',
  },
  th: {
    textAlign: 'center' as const,
    padding: '0.5rem 0.25rem',
    color: '#64748b',
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    borderBottom: '1px solid #334155',
  },
  td: {
    textAlign: 'center' as const,
    padding: '0.5rem 0.25rem',
    borderBottom: '1px solid #1e293b',
  },
  nameCol: {
    textAlign: 'left' as const,
    paddingLeft: '0.5rem',
    minWidth: '120px',
  },
  totalsRow: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderTop: '2px solid #334155',
  },
  decisionBadge: {
    display: 'inline-block',
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
    fontSize: '0.625rem',
    fontWeight: 700,
    marginRight: '0.5rem',
    verticalAlign: 'middle',
  },
};

// Export types for external use
export type { BoxScoreData, BatterLine, PitcherLine };
