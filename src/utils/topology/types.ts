/**
 * GridTopology Types
 *
 * Type definitions for topology-based grid representation.
 *
 * ID policy: docs/board-id-contract.md. IDs are opaque keys scoped to a board
 * and entity kind; use explicit geometry, index, and adjacency metadata.
 * Current regeneration/persistence gaps are tracked in docs/board-id-migration.md.
 */

import type { Point } from '../../types';

/**
 * Node types in the topology
 */
export type TopologyNodeType = 'cell' | 'vertex' | 'edge';

/**
 * A node in the grid topology (cell center, vertex, or edge midpoint)
 */
export interface TopologyNode {
  /** Opaque identifier; resolve with the board and explicit node type. */
  id: string;
  /** Type of node */
  type: TopologyNodeType;
  /** Position in SVG coordinates */
  position: Point;
  /** IDs of adjacent nodes of the same type (for path-finding) */
  adjacentSameType: string[];
  /** Additional metadata (e.g., original row/col for square grids) */
  metadata?: Record<string, unknown>;
}

/**
 * Coordinate tuple: [row, col] or null if not applicable
 * Use index && index[0] != null && index[1] != null to check validity
 */
export type Index = [number | null, number | null] | null;

/**
 * A cell in the topology with its boundary vertices
 */
export interface TopologyCell {
  /** Opaque cell key; its spelling does not encode coordinates or shape. */
  id: string;
  /** Center position */
  center: Point;
  /** Position before the current visual deformation; retained across native save/load. */
  baseCenter?: Point;
  /** Ordered list of vertex IDs forming the cell boundary (clockwise) */
  boundaryVertices: string[];
  /** IDs of adjacent cells (sharing an edge) - excludes outboard cells */
  adjacentCells: string[];
  /** IDs of edges on the boundary */
  boundaryEdges: string[];
  /**
   * Optional grid index [row, col], not a persistent identity.
   * Check for missing/null components. Generic topology does not guarantee
   * index uniqueness or stability across edits; never fall back to ID parsing.
   */
  index?: Index;
  /** @deprecated Use index instead. Original row for square grids */
  row?: number;
  /** @deprecated Use index instead. Original col for square grids */
  col?: number;
  /** Optional list of original cells (for merged/split) */
  originalCells?: string[];
  /**
   * Whether this cell is an outboard (hint) cell.
   * - true: Outside the main grid, used for hints (numbers, arrows) only
   * - false/undefined: Normal playable cell
   *
   * Outboard cells are excluded from:
   * - adjacentCells lists of other cells
   * - Connectivity/region validation
   * - Surface/line placement
   */
  outboard?: boolean;
}

/**
 * A vertex in the topology
 */
export interface TopologyVertex {
  /** Opaque vertex key; its spelling does not encode coordinates or order. */
  id: string;
  /** Position */
  position: Point;
  /** Position before the current visual deformation. */
  basePosition?: Point;
  /** IDs of cells that share this vertex */
  adjacentCells: string[];
  /** IDs of edges connected to this vertex */
  adjacentEdges: string[];
  /** IDs of adjacent vertices (connected by an edge) */
  adjacentVertices: string[];
  /**
   * Optional grid index [row, col], not a persistent identity.
   * Check for missing/null components. Generic topology does not guarantee
   * index uniqueness or stability across edits; never fall back to ID parsing.
   */
  index?: Index;
  /** @deprecated Use index instead. Original row for square grids */
  row?: number;
  /** @deprecated Use index instead. Original col for square grids */
  col?: number;
}

/**
 * An edge in the topology (between two vertices)
 */
export interface TopologyEdge {
  /** Opaque edge key; use startVertex/endVertex and explicit direction metadata. */
  id: string;
  /** Midpoint position */
  midpoint: Point;
  /** Midpoint before the current visual deformation. */
  baseMidpoint?: Point;
  /** Start vertex ID */
  startVertex: string;
  /** End vertex ID */
  endVertex: string;
  /** IDs of cells on either side (1 or 2 cells) */
  adjacentCells: string[];
  /** Whether this is a boundary edge (only 1 adjacent cell) */
  isBoundary: boolean;
  /** Direction: 'h' for horizontal, 'v' for vertical (for square grids) */
  direction?: 'h' | 'v';
  /**
   * Optional grid index [row, col], not a persistent identity.
   * Check for missing/null components. Generic topology does not guarantee
   * index uniqueness or stability across edits; never fall back to ID parsing.
   */
  index?: Index;
  /** @deprecated Use index instead. Original row for square grids */
  row?: number;
  /** @deprecated Use index instead. Original col for square grids */
  col?: number;
}

/**
 * Complete grid topology
 */
export interface GridTopology {
  /** Flat source graph and explicit operation identities for mixed merge/split edits. */
  editBase?: GridTopology;
  editOperations?: import('./retainedEdits').TopologyEdit[];
  /** Actual graph before reversible cell merges; no nested merge/exclusion base. */
  mergeBase?: GridTopology;
  /** Explicit merged-cell identity and its source cells, never an ID suffix. */
  mergeGroups?: import('./retainedMerge').MergeGroup[];
  /** Runtime metadata for the rendered graph; saved in topologySettings, not node IDs. */
  appliedPreset?: { preset: TopologyPreset; intensity: number };
  /** Same board before temporary exclusions. One level only; IDs are preserved. */
  exclusionBase?: GridTopology;
  /** Bounds of the original geometry used by visual presets, not an identity key. */
  deformationBounds?: GridTopology['bounds'];
  /** All cells indexed by ID */
  cells: Map<string, TopologyCell>;
  /** All vertices indexed by ID */
  vertices: Map<string, TopologyVertex>;
  /** All edges indexed by ID */
  edges: Map<string, TopologyEdge>;
  /** Grid dimensions (for reference) */
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
  /** Original grid config (if converted from GridConfig) */
  sourceConfig?: import('../../types').GridConfig;
}

/**
 * Cell definition for building topology
 */
export interface CellDefinition {
  /** Unique cell ID */
  id: string;
  /** Ordered vertices (clockwise) */
  vertices: Point[];
  /** Optional center override */
  center?: Point;
  /** Optional list of original cell ids */
  originalCells?: string[];
  /**
   * Optional grid index [row, col], not a persistent identity.
   * If provided, will be copied to the resulting TopologyCell.
   */
  index?: Index;
  /** @deprecated Use index instead. Optional row index */
  row?: number;
  /** @deprecated Use index instead. Optional column index */
  col?: number;
  /**
   * Whether this cell is an outboard (hint) cell.
   * Outboard cells are excluded from adjacency calculations.
   */
  outboard?: boolean;
}

/**
 * Preset types for deformed grids
 */
export type TopologyPreset =
  | 'square'           // Standard square grid (default)
  | 'cylinder'         // Cylindrical projection (horizontal wrap)
  | 'mobius'           // Möbius strip (horizontal wrap with twist)
  | 'torus'            // Torus (both horizontal and vertical wrap)
  | 'sphere'           // Spherical projection
  | 'hyperbolic'       // Hyperbolic (Poincaré disk)
  | 'spiral'           // Spiral layout
  | 'radial'           // Radial/circular layout
  | 'wave'             // Wave deformation
  | 'fisheye'          // Fisheye lens effect
  | 'perspective'      // 3D perspective projection
  | 'pyramid'          // Pyramid layout (staircase of squares)
  | 'custom';          // User-defined positions

/**
 * Parameters for topology presets
 */
export interface TopologyPresetParams {
  preset: TopologyPreset;
  /** Intensity of the deformation (0-1) */
  intensity?: number;
  /** Center point for radial effects */
  centerX?: number;
  centerY?: number;
  /** Direction for wave/spiral effects */
  direction?: 'horizontal' | 'vertical' | 'both';
  /** Custom transformation function */
  customTransform?: (x: number, y: number, row: number, col: number) => Point;
}
