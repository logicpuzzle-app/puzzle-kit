/**
 * Special Grids
 *
 * Non-standard grid types:
 * - Pyramid: Square grid with increasing width per row
 * - Isometric: Diamond/cube-like grid with TOP, LEFT, RIGHT faces
 */

export { pyramidGridToTopology } from './pyramid';
export { applyIsometricTransform, isometricGridToTopology } from './isometric';
