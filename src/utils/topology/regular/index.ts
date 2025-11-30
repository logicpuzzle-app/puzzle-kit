/**
 * Regular Tilings
 *
 * The three regular tilings:
 * - Square {4,4}: 4 squares meeting at each vertex
 * - Triangular {3,6}: 6 triangles meeting at each vertex
 * - Hexagonal {6,3}: 3 hexagons meeting at each vertex
 */

export { squareGridToTopology } from './square';
export { triangularGridToTopology } from './triangle';
export { hexagonalGridToTopology } from './hex';
