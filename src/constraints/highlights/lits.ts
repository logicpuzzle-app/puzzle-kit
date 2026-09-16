/**
 * LITS Highlight Provider
 *
 * Highlights rooms when a complete tetromino (4 connected shaded cells) is present.
 */

import {
  registerHighlightProvider,
  type HighlightOutput,
  type HighlightFill,
} from './core';
import { getLitsState, getLitsShape } from '../helpers/lits';

const HIGHLIGHT_COLOR = '#60ffa0';
const HIGHLIGHT_OPACITY = 1;

registerHighlightProvider('lits.tetromino-region', (ctx): HighlightOutput => {
  const board = getLitsState(ctx);
  if (!board) return { fills: [] };
  const fills: HighlightFill[] = [];

  board.rooms.forEach((cells) => {
    const shadedInRoom = cells.filter((cellId) => board.shaded.has(cellId));
    if (!getLitsShape(shadedInRoom.map(id => board.cells.get(id)!))) return;

    cells.forEach((cellId) => {
      fills.push({
        cellId,
        color: HIGHLIGHT_COLOR,
        opacity: HIGHLIGHT_OPACITY,
        layer: 'under-surfaces',
      });
    });
  });

  return { fills };
});
