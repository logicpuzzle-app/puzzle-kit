import { describe, expect, it } from 'vitest';
import url from '../../e2e/fixtures/penpa-battleships.url.txt?raw';
import { parsePenpaUrl } from '../utils/penpaCompat';

describe('Penpa battleships', () => {
  it('imports the external fleet with its directions, colors and problem/answer layers', () => {
    const puzzle = parsePenpaUrl(url.trim())!;
    // Fixed expectations from Penpa's displayed fleet, not from the conversion table.
    const shapes = ['ship_single', 'ship_middle_h', 'ship_left', 'ship_top',
      'ship_right', 'ship_bottom', 'water', 'ship_dot'];
    for (const [row, color, fillColor] of [[1, '#000000', '#000000'],
      [3, '#999999', '#999999'], [5, '#000000', 'none']] as const) {
      const fleet = Object.values(puzzle.state.problem.symbols).filter(s => s.cellId.startsWith(`cell-${row}-`));
      expect(fleet.map(s => s.symbolType)).toEqual(shapes);
      expect(fleet.map(s => [s.color, s.fillColor, s.size])).toEqual(
        shapes.map((_, index) => [color, index >= 6 ? color : fillColor, 'large']));
    }
    expect(Object.values(puzzle.state.answer.symbols).map(s => [s.cellId, s.symbolType, s.layer]))
      .toEqual(shapes.map((type, i) => [`cell-7-${i + 1}`, type, 'answer']));
  });
});
