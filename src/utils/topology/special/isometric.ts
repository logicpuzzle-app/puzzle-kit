/**
 * Isometric Grid
 *
 * Generates a grid topology representing a 3D cuboid with dimensions:
 * - rows (depth)
 * - cols (width)
 * - level (height)
 *
 * Exterior view (default):
 * - TOP face: rows x cols parallelograms (at height = level)
 * - LEFT face: cols x level parallelograms (south-west side)
 * - RIGHT face: rows x level parallelograms (south-east side)
 *
 * Interior view:
 * - BOTTOM face: rows x cols parallelograms (at height = 0)
 * - LEFT face: cols x level parallelograms (south-west side)
 * - RIGHT face: rows x level parallelograms (south-east side)
 *
 * Use isometricFaces to select which faces to show.
 * Use isometricView to switch between 'exterior' and 'interior'.
 */

import type { GridConfig, Point } from '../../../types';
import type { GridTopology, CellDefinition } from '../types';
import { buildTopologyFromCells } from '../builder';

/**
 * Apply isometric (diamond) transform to an existing 2D topology.
 *
 * This function transforms a 2D grid into isometric (diamond) projection.
 * It only performs coordinate transformation - it does NOT generate 3D faces.
 * For full isometric cube with TOP/LEFT/RIGHT faces, use isometricGridToTopology instead.
 *
 * Transform: (x, y) -> (x - y, (x + y) * 0.5)
 */
export function applyIsometricTransform(base: GridTopology): GridTopology {
  const transform = (p: Point): Point => ({
    x: (p.x - p.y),
    y: (p.x + p.y) * 0.5,
  });

  // 1. Transform Vertices
  const newVertices = new Map<string, any>();
  base.vertices.forEach((v, key) => {
    newVertices.set(key, { ...v, position: transform(v.position) });
  });

  // 2. Transform Cells (Centers)
  const newCells = new Map<string, any>();
  base.cells.forEach((cell, key) => {
    newCells.set(key, { ...cell, center: transform(cell.center) });
  });

  // 3. Transform Edges (Midpoints)
  const newEdges = new Map<string, any>();
  base.edges.forEach((edge, key) => {
    const v1 = newVertices.get(edge.startVertex)!;
    const v2 = newVertices.get(edge.endVertex)!;
    const midpoint: Point = {
      x: (v1.position.x + v2.position.x) / 2,
      y: (v1.position.y + v2.position.y) / 2,
    };
    newEdges.set(key, { ...edge, midpoint });
  });

  // 4. Calculate Bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  newVertices.forEach((v) => {
    minX = Math.min(minX, v.position.x);
    minY = Math.min(minY, v.position.y);
    maxX = Math.max(maxX, v.position.x);
    maxY = Math.max(maxY, v.position.y);
  });

  const padding = base.sourceConfig?.outerPadding ?? 0;
  const offsetX = padding - minX;
  const offsetY = padding - minY;

  // 5. Shift Everything by Offset (Padding)
  const shiftPoint = (p: Point) => ({ x: p.x + offsetX, y: p.y + offsetY });

  const shiftedVertices = new Map<string, any>();
  newVertices.forEach((v, k) => shiftedVertices.set(k, { ...v, position: shiftPoint(v.position) }));

  const shiftedCells = new Map<string, any>();
  newCells.forEach((c, k) => shiftedCells.set(k, { ...c, center: shiftPoint(c.center) }));

  const shiftedEdges = new Map<string, any>();
  newEdges.forEach((e, k) => shiftedEdges.set(k, { ...e, midpoint: shiftPoint(e.midpoint) }));

  const bounds = {
    minX: padding,
    minY: padding,
    maxX: maxX - minX + padding,
    maxY: maxY - minY + padding,
    width: maxX - minX,
    height: maxY - minY,
  };

  return {
    ...base,
    cells: shiftedCells as unknown as GridTopology['cells'],
    vertices: shiftedVertices as unknown as GridTopology['vertices'],
    edges: shiftedEdges as unknown as GridTopology['edges'],
    bounds,
  };
}

/**
 * Generates a 3D isometric cuboid topology.
 *
 * Dimensions:
 * - TOP Face: rows * cols (at height = level)
 * - LEFT Face: cols * level (along the bottom edge)
 * - RIGHT Face: rows * level (along the right edge)
 *
 * @param config Grid configuration
 * @returns GridTopology
 */
export function isometricGridToTopology(config: GridConfig): GridTopology {
  const {
    rows,
    cols,
    level = 1, // Default height if not specified
    cellSize,
    outerPadding,
    isometricFaces = ['top', 'left', 'right'],
    isometricView = 'exterior',
    disabledCells = [],
  } = config;

  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];
  const facesToGenerate = new Set(isometricFaces);

  // Isometric factor: 2 * tan(30°) ≈ 1.155 for cube proportions
  // Applied only to height (z) to make the cube appear with correct proportions
  const ISO_FACTOR = 2 * Math.tan(Math.PI / 6);

  /**
   * Projects 3D grid coordinates to 2D screen space.
   * Uses standard isometric projection where:
   * - x: increases to the right-down
   * - y: increases to the left-down
   * - z: increases UP (visually up on screen is negative Y)
   *
   * @param r Row index (0..rows) -> Depth
   * @param c Col index (0..cols) -> Width
   * @param z Level index (0..level) -> Height (0 is bottom, 'level' is top)
   */
  const project = (r: number, c: number, z: number): Point => {
    return {
      x: (c - r) * cellSize,
      y: ((c + r) * cellSize * 0.5) - (z * cellSize * ISO_FACTOR),
    };
  };

  // --- 1. Generate TOP Face (The "Roof") ---
  // Located at z = level (only in exterior view)
  if (facesToGenerate.has('top') && isometricView === 'exterior') {
    const z = level;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cellId = `cell-top-${r}-${c}`;
        if (disabledSet.has(cellId)) continue;

        // Order: Top, Right, Bottom, Left (Clockwise visually)
        const p1 = project(r, c, z);         // Top-Center
        const p2 = project(r, c + 1, z);     // Right
        const p3 = project(r + 1, c + 1, z); // Bottom-Center
        const p4 = project(r + 1, c, z);     // Left

        cellDefs.push({ id: cellId, vertices: [p1, p2, p3, p4], row: r, col: c });
      }
    }
  }

  // --- 1b. Generate BOTTOM Face (The "Floor") ---
  // Located at z = 0 (only in interior view)
  if (facesToGenerate.has('bottom') || (facesToGenerate.has('top') && isometricView === 'interior')) {
    const z = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cellId = `cell-bottom-${r}-${c}`;
        if (disabledSet.has(cellId)) continue;

        // Order: Top, Right, Bottom, Left (Clockwise visually)
        const p1 = project(r, c, z);         // Top-Center
        const p2 = project(r, c + 1, z);     // Right
        const p3 = project(r + 1, c + 1, z); // Bottom-Center
        const p4 = project(r + 1, c, z);     // Left

        cellDefs.push({ id: cellId, vertices: [p1, p2, p3, p4], row: r, col: c });
      }
    }
  }

  // --- 2. Generate LEFT Face (South-West Side for Exterior, North-West Side for Interior) ---
  // Exterior: attaches to the edge where row = rows (front-left)
  // Interior: attaches to the edge where row = 0 (back-left)
  if (facesToGenerate.has('left')) {
    const r = isometricView === 'interior' ? 0 : rows;
    for (let z = level - 1; z >= 0; z--) { // Iterate levels from top down
      for (let c = 0; c < cols; c++) {
        // Use z index for ID to match level concept
        const lv = (level - 1) - z;
        const cellId = `cell-left-${lv}-${c}`;
        if (disabledSet.has(cellId)) continue;

        // A vertical rectangle in 3D
        // Top-Left (in 2D space), Top-Right, Bottom-Right, Bottom-Left
        const p1 = project(r, c, z + 1);      // Top-Left corner of this face cell
        const p2 = project(r, c + 1, z + 1);  // Top-Right corner
        const p3 = project(r, c + 1, z);      // Bottom-Right corner
        const p4 = project(r, c, z);          // Bottom-Left corner

        cellDefs.push({ id: cellId, vertices: [p1, p2, p3, p4], row: lv, col: c });
      }
    }
  }

  // --- 3. Generate RIGHT Face (South-East Side for Exterior, North-East Side for Interior) ---
  // Exterior: attaches to the edge where col = cols (front-right)
  // Interior: attaches to the edge where col = 0 (back-right)
  if (facesToGenerate.has('right')) {
    const c = isometricView === 'interior' ? 0 : cols;
    for (let z = level - 1; z >= 0; z--) {
      for (let r = 0; r < rows; r++) {
        const lv = (level - 1) - z;
        const cellId = `cell-right-${lv}-${r}`;
        if (disabledSet.has(cellId)) continue;

        // A vertical rectangle in 3D
        const p1 = project(r, c, z + 1);     // Top-Left
        const p2 = project(r + 1, c, z + 1); // Top-Right
        const p3 = project(r + 1, c, z);     // Bottom-Right
        const p4 = project(r, c, z);         // Bottom-Left

        cellDefs.push({ id: cellId, vertices: [p1, p2, p3, p4], row: lv, col: r });
      }
    }
  }

  // --- Build Topology & Normalize ---
  const rawTopology = buildTopologyFromCells(cellDefs, config);

  // Calculate Bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  rawTopology.vertices.forEach((v) => {
    minX = Math.min(minX, v.position.x);
    minY = Math.min(minY, v.position.y);
    maxX = Math.max(maxX, v.position.x);
    maxY = Math.max(maxY, v.position.y);
  });

  const offsetX = outerPadding - minX;
  const offsetY = outerPadding - minY;

  // Shift Helper
  const shift = (p: Point): Point => ({ x: p.x + offsetX, y: p.y + offsetY });

  // Apply Shift to All Components
  const finalVertices = new Map<string, any>();
  rawTopology.vertices.forEach((v, k) => {
    finalVertices.set(k, { ...v, position: shift(v.position) });
  });

  const finalCells = new Map<string, any>();
  rawTopology.cells.forEach((c, k) => {
    finalCells.set(k, { ...c, center: shift(c.center) });
  });

  const finalEdges = new Map<string, any>();
  rawTopology.edges.forEach((e, k) => {
    finalEdges.set(k, { ...e, midpoint: shift(e.midpoint) });
  });

  const bounds = {
    minX: outerPadding,
    minY: outerPadding,
    maxX: maxX - minX + outerPadding,
    maxY: maxY - minY + outerPadding,
    width: maxX - minX,
    height: maxY - minY,
  };

  return {
    ...rawTopology,
    vertices: finalVertices as unknown as GridTopology['vertices'],
    cells: finalCells as unknown as GridTopology['cells'],
    edges: finalEdges as unknown as GridTopology['edges'],
    bounds,
  };
}
