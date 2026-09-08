/**
 * LITS Highlight Provider
 *
 * Highlights rooms when a complete tetromino (4 connected shaded cells) is present.
 */

import {
  registerHighlightProvider,
  type HighlightContext,
  type HighlightOutput,
  type HighlightFill,
} from './core';
import { getLitsRooms, getLitsShape, isLitsShaded } from '../helpers/lits';

const HIGHLIGHT_COLOR = '#60ffa0';
const HIGHLIGHT_OPACITY = 1;

registerHighlightProvider('lits.tetromino-region', (ctx): HighlightOutput => {
  const rooms = getLitsRooms(ctx);
  if (!rooms) return { fills: [] };
  const fills: HighlightFill[] = [];

  rooms.forEach((cells) => {
    const shadedInRoom = cells.filter((cellId) => isLitsShaded(ctx.puzzle, cellId));
    if (!getLitsShape(shadedInRoom)) return;

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
