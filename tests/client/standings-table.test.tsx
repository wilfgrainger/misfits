/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StandingsTable } from '../../src/client/components/StandingsTable';

describe('StandingsTable', () => {
  afterEach(() => cleanup());

  it('keeps primary mobile stats prominent while retaining secondary statistics accessibly', () => {
    render(<StandingsTable label="Misfits 501 standings" highlightPlayerId="wilf" standings={[{
      playerId: 'wilf', username: 'Wilf', rank: 1, played: 4, won: 2, drawn: 1, lost: 1,
      legsFor: 12, legsAgainst: 8, legDifference: 4, average: 47.25, points: 7,
    }]} />);

    expect(screen.getByRole('table', { name: 'Misfits 501 standings' })).toBeTruthy();
    for (const label of ['Pos', 'Player', 'P', 'W-D-L', 'Legs', 'Avg', 'Pts']) expect(screen.getByRole('columnheader', { name: label })).toBeTruthy();
    expect(screen.getByRole('cell', { name: '2-1-1' })).toBeTruthy();
    expect(screen.getByRole('cell', { name: '12' }).classList.contains('standing-cell-secondary')).toBe(true);
    expect(screen.getByRole('cell', { name: '47.25' }).classList.contains('standing-cell-secondary')).toBe(true);
    expect(screen.getByRole('columnheader', { name: 'Legs' }).classList.contains('standing-cell-secondary')).toBe(true);
    expect(screen.getByRole('columnheader', { name: 'Avg' }).classList.contains('standing-cell-secondary')).toBe(true);
    expect(screen.getByRole('rowheader', { name: 'Wilf' }).parentElement?.className).toBe('standing-row-you');
  });
});
