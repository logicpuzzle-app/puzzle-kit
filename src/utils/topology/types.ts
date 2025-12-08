/**
 * GridTopology Types
 *
 * Type definitions for topology-based grid representation.
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
  /** Unique identifier for this node */
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
  /** Cell ID */
  id: string;
  /** Center position */
  center: Point;
  /** Ordered list of vertex IDs forming the cell boundary (clockwise) */
  boundaryVertices: string[];
  /** IDs of adjacent cells (sharing an edge) */
  adjacentCells: string[];
  /** IDs of edges on the boundary */
  boundaryEdges: string[];
  /**
   * Grid index [row, col] for stable reference without parsing cellId.
   * - For regular grids: [row, col] is always set
   * - For special topologies where index is not applicable: null
   */
  index?: Index;
  /** @deprecated Use index instead. Original row for square grids */
  row?: number;
  /** @deprecated Use index instead. Original col for square grids */
  col?: number;
  /** Optional list of original cells (for merged/split) */
  originalCells?: string[];
}

/**
 * A vertex in the topology
 */
export interface TopologyVertex {
  /** Vertex ID */
  id: string;
  /** Position */
  position: Point;
  /** IDs of cells that share this vertex */
  adjacentCells: string[];
  /** IDs of edges connected to this vertex */
  adjacentEdges: string[];
  /** IDs of adjacent vertices (connected by an edge) */
  adjacentVertices: string[];
  /**
   * Grid index [row, col] for stable reference without parsing vertexId.
   * - For regular grids: [row, col] is always set
   * - For special topologies where index is not applicable: null
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
  /** Edge ID */
  id: string;
  /** Midpoint position */
  midpoint: Point;
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
   * Grid index [row, col] for stable reference without parsing edgeId.
   * - For regular grids: [row, col] is always set
   * - For special topologies where index is not applicable: null
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
   * Grid index [row, col] for stable reference.
   * If provided, will be copied to the resulting TopologyCell.
   */
  index?: Index;
  /** @deprecated Use index instead. Optional row index */
  row?: number;
  /** @deprecated Use index instead. Optional column index */
  col?: number;
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
