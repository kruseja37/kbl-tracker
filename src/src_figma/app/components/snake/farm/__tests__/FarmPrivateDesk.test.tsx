import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { FarmPrivateDesk } from '../FarmPrivateDesk';
import { buildFarmFogCard, buildFarmScoutPressure } from '../farmRoomModel';
import type { LeagueBuilderProspectPlayerDto } from '../../../../../../utils/prospectScoutingDraftEngine';

function prospect(): LeagueBuilderProspectPlayerDto {
  return {
    id: 'diaz', firstName: 'Mara', lastName: 'Diaz', gender: 'F', jerseyNumber: 77,
    age: 19, bats: 'L', throws: 'R', armSlot: null, primaryPosition: 'SS',
    power: 97, contact: 96, speed: 95, fielding: 94, arm: 93,
    velocity: 12, junk: 13, accuracy: 14, arsenal: [], overallGrade: 'A',
    personality: 'Competitive', chemistry: 'Competitive', morale: 75, mojo: 'Normal', fame: 0,
    salary: 999_999, contractYears: 3, leagueAssignments: [], ratingRevealState: 'hidden',
    isCustom: false, sourceDatabase: 'league-builder-startup-prospect-draft',
    hometown: { city: 'Denver', state: 'CO' }, hiddenPersonalityModifiers: { loyalty: 0, ambition: 0, resilience: 0, charisma: 0 },
    prospectProfile: {
      methodVersion: 'league-builder-prospect-scouting-draft-v1', source: 'league-builder-startup-prospect-draft',
      draftYear: 1, draftRound: 1, draftPick: 1, teamId: 'pool', trueGrade: 'A', scoutedGrade: 'C',
      potentialGrade: 'A', scoutAccuracy: 50, scoutConfidence: 'low', scoutGradeError: 4,
      scoutSpecialtiesVisible: [], scoutWeaknessesVisible: [],
    },
  };
}

describe('S6 farm fog', () => {
  test('renders only own-scout grade/range and never true ratings, IV, true cost, or survival reads', () => {
    const card = buildFarmFogCard({
      prospect: prospect(),
      scout: { scoutId: 'ours', scoutName: 'Jo Scout', specialties: ['infield'] },
      seed: 'ours-only',
    });
    const pressure = buildFarmScoutPressure({
      card,
      farmTarget: 10,
      publicRosters: { a: [], b: [{ position: 'SP' }], c: [] },
    });
    expect(card.scoutsCall).toContain('KEEP THIS PLAYER NEAR THE TOP OF YOUR LIST.');
    expect(card.scoutsCall).not.toMatch(/\b(?:he|she|him|her)\b/i);
    const onChoose = vi.fn();
    const { container } = render(<FarmPrivateDesk
      cards={[card]}
      selectedId={card.id}
      slotPick={7}
      slotSalary={25_000}
      farmMoneyLeft={200_000}
      advisorLog={[{ key: 'pressure', text: pressure, actionable: true }]}
      onChoose={onChoose}
    />);

    expect(screen.getByText(/YOUR SCOUT:/)).toBeInTheDocument();
    expect(screen.getByText(/YOUR SCOUT LIKES MARA DIAZ/)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/POWER 97|CONTACT 96|SPEED 95|FIELDING 94|ARM 93|999,999|\bIV\b|TRUE COST|SAFE TO WAIT|LIKELY GONE/);
    fireEvent.click(screen.getByRole('button', { name: /Mara Diaz/i }));
    expect(onChoose).toHaveBeenCalledWith('diaz');
  });

  test('different club scouts can produce different named-player snapshots', () => {
    const player = prospect();
    const strong = buildFarmFogCard({ prospect: player, scout: { scoutId: 'strong', scoutName: 'Strong', accuracyModifier: 35 }, seed: 'variance' });
    const weak = buildFarmFogCard({ prospect: player, scout: { scoutId: 'weak', scoutName: 'Weak', accuracyModifier: -35 }, seed: 'variance' });
    expect({ grade: strong.scoutedGrade, range: strong.gradeRange, confidence: strong.confidence })
      .not.toEqual({ grade: weak.scoutedGrade, range: weak.gradeRange, confidence: weak.confidence });
  });
});
