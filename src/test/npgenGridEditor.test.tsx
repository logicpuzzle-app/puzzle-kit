import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NPGeneratorGridEditor } from '../components/dialogs/NPGeneratorGridEditor';

function NumberHarness() {
  const [values, setValues] = useState([0, 0, 0, 0]);
  return (
    <NPGeneratorGridEditor
      size={2}
      values={values}
      mode="numbers"
      label="Problem grid"
      emptyLabel="Empty"
      numberPadLabel="Number pad"
      onChange={setValues}
    />
  );
}

function PatternHarness() {
  const [values, setValues] = useState([0, 0, 0, 0]);
  return (
    <NPGeneratorGridEditor
      size={2}
      values={values}
      mode="pattern"
      label="Hint pattern"
      emptyLabel="Empty"
      onChange={setValues}
    />
  );
}

describe('NPGenerator grid editor', () => {
  it('enters and clears numbers with keyboard navigation', () => {
    render(<NumberHarness />);
    const firstCell = screen.getByRole('gridcell', {
      name: 'Problem grid: 1, 1, Empty',
    });

    fireEvent.click(firstCell);
    fireEvent.keyDown(firstCell, { key: '2' });
    expect(screen.getByRole('gridcell', { name: 'Problem grid: 1, 1, 2' })).toBeVisible();

    fireEvent.keyDown(firstCell, { key: 'ArrowRight' });
    fireEvent.keyDown(firstCell, { key: '1' });
    expect(screen.getByRole('gridcell', { name: 'Problem grid: 1, 2, 1' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    fireEvent.keyDown(firstCell, { key: 'Backspace' });
    expect(screen.getByRole('gridcell', { name: 'Problem grid: 1, 2, Empty' })).toBeVisible();
  });

  it('enters a selected value with the number pad', () => {
    render(<NumberHarness />);
    fireEvent.click(screen.getByRole('gridcell', { name: 'Problem grid: 2, 1, Empty' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));

    expect(screen.getByRole('gridcell', { name: 'Problem grid: 2, 1, 2' })).toBeVisible();
  });

  it('toggles hint pattern cells by clicking the board', () => {
    render(<PatternHarness />);
    const cell = screen.getByRole('gridcell', { name: 'Hint pattern: 1, 1, Empty' });

    fireEvent.click(cell);
    expect(screen.getByRole('gridcell', { name: 'Hint pattern: 1, 1, selected' })).toBeVisible();
    fireEvent.click(screen.getByRole('gridcell', { name: 'Hint pattern: 1, 1, selected' }));
    expect(screen.getByRole('gridcell', { name: 'Hint pattern: 1, 1, Empty' })).toBeVisible();
  });
});
