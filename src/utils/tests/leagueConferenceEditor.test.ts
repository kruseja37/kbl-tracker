import { describe, expect, test } from 'vitest';
import {
  buildConferenceDraftFromLeague,
  buildConferenceStructure,
  createBalancedConferenceDraft,
  createSingleConferenceDraft,
  validateConferenceDraft,
} from '../leagueConferenceEditor';

describe('leagueConferenceEditor', () => {
  test('builds the hidden one-division-per-conference persistence shape', () => {
    const draft = createBalancedConferenceDraft(['team-a', 'team-b', 'team-c', 'team-d']);
    const structure = buildConferenceStructure(draft);

    expect(structure.conferences).toEqual([
      { id: 'conf-1', name: 'Eastern', abbreviation: 'EAST', divisionIds: ['division-conf-1'] },
      { id: 'conf-2', name: 'Western', abbreviation: 'WEST', divisionIds: ['division-conf-2'] },
    ]);
    expect(structure.divisions).toEqual([
      { id: 'division-conf-1', name: 'Eastern', conferenceId: 'conf-1', teamIds: ['team-a', 'team-c'] },
      { id: 'division-conf-2', name: 'Western', conferenceId: 'conf-2', teamIds: ['team-b', 'team-d'] },
    ]);
  });

  test('validates that every selected team has exactly one conference', () => {
    expect(validateConferenceDraft(['team-a', 'team-b'], createSingleConferenceDraft(['team-a', 'team-b']))).toEqual({
      valid: true,
      message: null,
    });

    expect(validateConferenceDraft(['team-a', 'team-b'], [{
      id: 'conf-1',
      name: 'Eastern',
      abbreviation: 'E',
      teamIds: ['team-a'],
    }])).toEqual({
      valid: false,
      message: 'Every selected team needs a conference before saving.',
    });

    expect(validateConferenceDraft(['team-a', 'team-b'], [
      { id: 'conf-1', name: 'Eastern', abbreviation: 'E', teamIds: ['team-a', 'team-b'] },
      { id: 'conf-2', name: 'Western', abbreviation: 'W', teamIds: ['team-b'] },
    ])).toEqual({
      valid: false,
      message: 'A team can only belong to one conference.',
    });
  });

  test('rebuilds editor state from persisted conference membership', () => {
    const draft = buildConferenceDraftFromLeague({
      teamIds: ['team-a', 'team-b', 'team-c'],
      conferences: [
        { id: 'conf-east', name: 'East Circuit', abbreviation: 'EC', divisionIds: ['div-east'] },
        { id: 'conf-west', name: 'West Circuit', abbreviation: 'WC', divisionIds: ['div-west'] },
      ],
      divisions: [
        { id: 'div-east', name: 'East Circuit', conferenceId: 'conf-east', teamIds: ['team-a', 'team-b'] },
        { id: 'div-west', name: 'West Circuit', conferenceId: 'conf-west', teamIds: ['team-c'] },
      ],
    });

    expect(draft).toEqual([
      { id: 'conf-east', name: 'East Circuit', abbreviation: 'EC', teamIds: ['team-a', 'team-b'] },
      { id: 'conf-west', name: 'West Circuit', abbreviation: 'WC', teamIds: ['team-c'] },
    ]);
  });
});
