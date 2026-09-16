import type { GridConfig } from '../../types';

/** Resolve the declared view/face settings, never an entity ID. The UI's Top
 * switch selects the horizontal face, which is Bottom in interior view. */
export function visibleIsometricFaces(grid: GridConfig): Set<'top' | 'bottom' | 'left' | 'right'> {
  return new Set((grid.isometricFaces ?? ['top', 'left', 'right']).map(face =>
    face === 'top' && grid.isometricView === 'interior' ? 'bottom' : face));
}
