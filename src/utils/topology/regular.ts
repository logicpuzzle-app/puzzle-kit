/**
 * Regular Tilings and Special Grids
 *
 * Re-exports for backward compatibility.
 */

// Regular tilings
export {
  squareGridToTopology,
  triangularGridToTopology,
  hexagonalGridToTopology,
} from './regular/index';

// Special grids
export {
  pyramidGridToTopology,
  applyIsometricTransform,
  isometricGridToTopology,
} from './special/index';
