/**
 * Narrative Display Component
 *
 * Shows beat reporter narratives for game events.
 * Integrates with narrativeEngine for story generation.
 *
 * @see NARRATIVE_SYSTEM_SPEC.md
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  type BeatReporter,
  type NarrativeContext,
  type GeneratedNarrative,
  type ReporterPersonality,
  type ReporterConfidence,
  type GameDate,
  generateBeatReporter,
  generateNarrative,
  getReporterName,
  VOICE_PROFILES,
} from '../../engines/narrativeEngine';

// ============================================
// TYPES
// ============================================

interface NarrativeCardProps {
  narrative: GeneratedNarrative;
  showReporterInfo?: boolean;
  compact?: boolean;
}

interface NarrativePreviewProps {
  teamName: string;
  teamId?: string;
  gameResult?: {
    won: boolean;
    score: { team: number; opponent: number };
    opponentName: string;
    isWalkOff?: boolean;
    isNoHitter?: boolean;
    isShutout?: boolean;
  };
}

interface BeatReporterProfileProps {
  reporter: BeatReporter;
  showPersonality?: boolean; // Dev mode
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getPersonalityColor(personality: ReporterPersonality): string {
  switch (personality) {
    case 'OPTIMIST': return '#22c55e';
    case 'PESSIMIST': return '#ef4444';
    case 'BALANCED': return '#6b7280';
    case 'DRAMATIC': return '#f97316';
    case 'ANALYTICAL': return '#3b82f6';
    case 'HOMER': return '#eab308';
    case 'CONTRARIAN': return '#8b5cf6';
    case 'INSIDER': return '#06b6d4';
    case 'OLD_SCHOOL': return '#78716c';
    case 'HOT_TAKE': return '#ec4899';
    default: return '#9ca3af';
  }
}

function getMoraleImpactDisplay(impact: number): { text: string; color: string } {
  if (impact >= 3) return { text: '↑↑↑', color: '#22c55e' };
  if (impact >= 1) return { text: '↑', color: '#22c55e' };
  if (impact <= -3) return { text: '↓↓↓', color: '#ef4444' };
  if (impact <= -1) return { text: '↓', color: '#ef4444' };
  return { text: '—', color: '#6b7280' };
}

function getConfidenceDisplay(confidence: ReporterConfidence | undefined): { text: string; color: string } {
  switch (confidence) {
    case 'CONFIRMED': return { text: 'Confirmed', color: '#22c55e' };
    case 'LIKELY': return { text: 'Likely', color: '#86efac' };
    case 'SOURCES_SAY': return { text: 'Sources say', color: '#f59e0b' };
    case 'RUMORED': return { text: 'Rumor', color: '#fbbf24' };
    case 'SPECULATING': return { text: 'Speculation', color: '#ef4444' };
    default: return { text: '', color: '#6b7280' };
  }
}

// ============================================
// COMPONENTS
// ============================================

/**
 * Single narrative card display
 */
export function NarrativeCard({
  narrative,
  showReporterInfo = true,
  compact = false,
}: NarrativeCardProps) {
  const moraleDisplay = getMoraleImpactDisplay(narrative.moraleImpact);
  const confidenceDisplay = getConfidenceDisplay(narrative.confidenceLevel);
  const personalityColor = getPersonalityColor(narrative.reporter.personality);

  if (compact) {
    return (
      <div style={{
        padding: '8px 12px',
        backgroundColor: '#111827',
        borderRadius: '6px',
        borderLeft: `3px solid ${personalityColor}`,
      }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#e5e7eb' }}>
          {narrative.headline}
        </div>
        {showReporterInfo && (
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
            — {narrative.reporter.name}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#111827',
      borderRadius: '8px',
      padding: '16px',
      borderLeft: `4px solid ${personalityColor}`,
    }}>
      {/* Headline */}
      <div style={{
        fontWeight: 700,
        fontSize: '1rem',
        color: '#f9fafb',
        marginBottom: '8px',
        lineHeight: 1.3,
      }}>
        {narrative.headline}
      </div>

      {/* Body */}
      <div style={{
        fontSize: '0.875rem',
        color: '#d1d5db',
        lineHeight: 1.5,
        marginBottom: '12px',
      }}>
        {narrative.body}
      </div>

      {/* Quote (if any) */}
      {narrative.quote && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#0d1117',
          borderRadius: '4px',
          marginBottom: '12px',
          borderLeft: '2px solid #4b5563',
        }}>
          <div style={{ fontSize: '0.875rem', color: '#9ca3af', fontStyle: 'italic' }}>
            "{narrative.quote}"
          </div>
        </div>
      )}

      {/* Footer */}
      {showReporterInfo && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '8px',
          borderTop: '1px solid #1f2937',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              {narrative.reporter.name}
            </span>
            {!narrative.reporter.wasOnBrand && (
              <span style={{
                fontSize: '0.625rem',
                padding: '2px 4px',
                backgroundColor: '#7c3aed20',
                color: '#a78bfa',
                borderRadius: '2px',
              }}>
                Off-brand
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {narrative.confidenceLevel && narrative.confidenceLevel !== 'CONFIRMED' && (
              <span style={{
                fontSize: '0.625rem',
                color: confidenceDisplay.color,
              }}>
                {confidenceDisplay.text}
              </span>
            )}
            {!narrative.isAccurate && (
              <span style={{
                fontSize: '0.625rem',
                padding: '2px 4px',
                backgroundColor: '#ef444420',
                color: '#f87171',
                borderRadius: '2px',
              }}>
                ⚠️ Questionable
              </span>
            )}
            <span style={{
              fontSize: '0.75rem',
              color: moraleDisplay.color,
              fontWeight: 600,
            }}>
              {moraleDisplay.text}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Beat reporter profile card
 */
export function BeatReporterProfile({ reporter, showPersonality = false }: BeatReporterProfileProps) {
  const voice = VOICE_PROFILES[reporter.personality];
  const personalityColor = getPersonalityColor(reporter.personality);

  return (
    <div style={{
      backgroundColor: '#111827',
      borderRadius: '8px',
      padding: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}>
      {/* Avatar placeholder */}
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        backgroundColor: personalityColor + '30',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.25rem',
      }}>
        📝
      </div>

      {/* Info */}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, color: '#f9fafb', fontSize: '0.875rem' }}>
          {getReporterName(reporter)}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
          {reporter.reputation} · {reporter.tenure} season{reporter.tenure !== 1 ? 's' : ''}
        </div>
        {showPersonality && (
          <div style={{
            fontSize: '0.625rem',
            color: personalityColor,
            marginTop: '2px',
          }}>
            {reporter.personality} — {voice.tone}
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#d1d5db' }}>
          {reporter.storiesWritten}
        </div>
        <div style={{ fontSize: '0.625rem', color: '#6b7280' }}>stories</div>
      </div>
    </div>
  );
}

/**
 * Narrative preview with live generation
 */
export function NarrativePreview({
  teamName,
  teamId = 'team-1',
  gameResult,
}: NarrativePreviewProps) {
  // Generate a reporter for demo
  const reporter = useMemo(() => {
    const hiredDate: GameDate = { season: 1, game: 0 };
    return generateBeatReporter(teamId, hiredDate);
  }, [teamId]);

  // Generate a sample narrative
  const narrative = useMemo(() => {
    const context: NarrativeContext = {
      eventType: gameResult ? 'GAME_RECAP' : 'PRE_GAME',
      teamName,
      teamRecord: { wins: 25, losses: 20 },
      gameResult,
    };

    return generateNarrative(context, reporter);
  }, [reporter, teamName, gameResult]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentNarrative, setCurrentNarrative] = useState(narrative);

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    // Generate new reporter for different perspective
    const newHiredDate: GameDate = { season: 1, game: Math.floor(Math.random() * 10) };
    const newReporter = generateBeatReporter(teamId, newHiredDate);
    const context: NarrativeContext = {
      eventType: gameResult ? 'GAME_RECAP' : 'PRE_GAME',
      teamName,
      teamRecord: { wins: 25, losses: 20 },
      gameResult,
    };
    setCurrentNarrative(generateNarrative(context, newReporter));
    setTimeout(() => setIsRefreshing(false), 300);
  }, [teamId, teamName, gameResult]);

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
      }}>
        <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>
          Beat Reporter Coverage
        </div>
        <button
          onClick={refresh}
          disabled={isRefreshing}
          style={{
            padding: '4px 8px',
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '4px',
            color: '#9ca3af',
            fontSize: '0.75rem',
            cursor: 'pointer',
            opacity: isRefreshing ? 0.5 : 1,
          }}
        >
          {isRefreshing ? '...' : '↻ New Take'}
        </button>
      </div>

      <BeatReporterProfile reporter={reporter} showPersonality={false} />

      <div style={{ marginTop: '12px' }}>
        <NarrativeCard narrative={currentNarrative} />
      </div>
    </div>
  );
}

/**
 * Section for Season Summary integration
 */
export function NarrativeSection({
  teamName,
  lastGameWon,
  opponentName = 'Opponents',
  score = { team: 5, opponent: 3 },
}: {
  teamName: string;
  lastGameWon: boolean;
  opponentName?: string;
  score?: { team: number; opponent: number };
}) {
  return (
    <NarrativePreview
      teamName={teamName}
      gameResult={{
        won: lastGameWon,
        score,
        opponentName,
      }}
    />
  );
}

export default NarrativeCard;
