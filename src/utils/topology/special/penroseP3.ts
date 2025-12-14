/**
 * Penrose P3 (Rhombus) Tiling Generator
 *
 * This is a TypeScript port of Penpa-edit's Puzzle_penrose_P3 class.
 * Generates Penrose P3 tiling using de Bruijn's multigrid method.
 *
 * The algorithm creates an aperiodic rhombus tiling by computing intersections
 * of multiple families of parallel lines (pentagrid).
 *
 * Reference: https://www.mathpages.com/home/kmath621/kmath621.htm
 */
import type { GridConfig, Point } from '../../../types';
import type { CellDefinition, GridTopology } from '../types';
import { buildTopologyFromCells } from '../builder';

/**
 * Point class compatible with Penpa's point structure
 */
interface PenpaPoint {
  x: number;
  y: number;
  type: number;  // 0: cell center, 1: vertex, 2: edge midpoint
  adjacent: number[];
  surround: number[];  // For type 0: vertex indices; For type 1: adjacent vertices
  use: number;  // 1: active, 0/-1: inactive/margin
  neighbor: number[];  // For type 0: edge indices; For type 2: adjacent faces
  degree?: number;
}

/**
 * Tile specification for de Bruijn grid
 */
interface TileSpec {
  xnum: number;
  ynum: number;
  i: number;
  j: number;
  rsq: number;  // Distance squared from origin
}

/**
 * Location specification for tile placement
 */
interface LocSpec {
  xco: number;
  yco: number;
  dir: number;  // 1: forward, -1: backward
}

/**
 * Penrose P3 configuration
 */
export interface PenroseP3Config {
  /** Side length (number of tiles along one direction) */
  side: number;
  /** Order (number of grid families, typically 5 for P3) */
  order: number;
  /** Cell size in pixels */
  size: number;
  /** Rotational asymmetry parameter (0-4) */
  rotational?: number;
  /** Tiling seed/variation (0.0-1.0) */
  variation?: number;
}

/**
 * Generate Penrose P3 tiling points using de Bruijn method
 *
 * This is a direct port of Penpa's Puzzle_penrose_P3.create_point()
 */
function createPenrosePoints(config: PenroseP3Config): PenpaPoint[] {
  const PI = Math.PI;
  const { side, order, size, rotational = 0, variation = 0.001 } = config;

  const ngrids = order;
  const nx = side;
  const nx0 = nx + 2;

  // Grid offset coefficients - determines which part of infinite tiling
  // Must not be integer to avoid singular cases
  const grid_offset = Array.from({ length: ngrids }, (_, i) =>
    1e-8 + ((variation / 2 + (i * rotational) / ngrids) % 1.0)
  );

  // Compute region size in dual graph
  // Scale by ngrids^2 to get approximately equal tiles regardless of order
  const sqradius = (nx * nx * 4) / (ngrids * ngrids);
  const sqradius0 = (nx0 * nx0 * 4) / (ngrids * ngrids);

  /**
   * Compute the next tile in the tiling using de Bruijn grid
   */
  const nextGridpoint = (
    x: number,
    y: number,
    i: number,
    j: number,
    dir: number
  ): TileSpec => {
    const rel = (ngrids + j - i) % ngrids;
    const costh = Math.cos((rel * 2 * PI) / ngrids);
    const sinth = Math.sin((rel * 2 * PI) / ngrids);
    const yco =
      (-(x + grid_offset[i]) * costh) / sinth + (y + grid_offset[j]) / sinth;
    let nextyco = yco + dir * 1000;
    let bestp: number | null = null;
    let besty: number | null = null;

    for (let p = 1; p < ngrids; p++) {
      if (p === rel) continue;
      const costhp = Math.cos((p * 2 * PI) / ngrids);
      const sinthp = Math.sin((p * 2 * PI) / ngrids);
      const base = (-(x + grid_offset[i]) * costhp) / sinthp;
      const off = Math.abs(1 / sinthp);
      const go = grid_offset[(i + p) % ngrids];

      if (dir > 0) {
        const thisy = Math.ceil((yco - base) / off - go * Math.sign(sinthp));
        const higher = base + off * (thisy + go * Math.sign(sinthp));
        if (higher < nextyco) {
          nextyco = higher;
          bestp = p;
          besty = 0 + thisy * Math.sign(sinthp);
        }
      } else {
        const thisy = Math.floor((yco - base) / off - go * Math.sign(sinthp));
        const lower = base + off * (thisy + go * Math.sign(sinthp));
        if (lower > nextyco) {
          nextyco = lower;
          bestp = p;
          besty = 0 + thisy * Math.sign(sinthp);
        }
      }
    }

    const bestj = (ngrids + i + bestp!) % ngrids;
    const rsq = nextyco * nextyco + (x + grid_offset[i]) * (x + grid_offset[i]);
    return { xnum: x, ynum: besty!, i, j: bestj, rsq };
  };

  /**
   * Find initial gridpoint nearest the origin
   */
  const initialGridpoint = (i: number, dir: number): TileSpec => {
    let yco = 0;
    let nextyco = yco + dir * 1000;
    let bestp: number | null = null;
    let besty: number | null = null;

    for (let p = 1; p < ngrids; p++) {
      const costh = Math.cos((p * 2 * PI) / ngrids);
      const sinth = Math.sin((p * 2 * PI) / ngrids);
      const base = (-grid_offset[i] * costh) / sinth;
      const off = Math.abs(1 / sinth);
      const go = grid_offset[(i + p) % ngrids];

      if (dir > 0) {
        const thisy = Math.ceil((yco - base) / off - go * Math.sign(sinth));
        const higher = base + off * (thisy + go * Math.sign(sinth));
        if (higher < nextyco) {
          nextyco = higher;
          bestp = p;
          besty = 0 + thisy * Math.sign(sinth);
        }
      } else {
        const thisy = Math.floor((yco - base) / off - go * Math.sign(sinth));
        const lower = base + off * (thisy + go * Math.sign(sinth));
        if (lower > nextyco) {
          nextyco = lower;
          bestp = p;
          besty = 0 + thisy * Math.sign(sinth);
        }
      }
    }

    const bestj = (ngrids + i + bestp!) % ngrids;
    const rsq = nextyco * nextyco + grid_offset[i] * grid_offset[i];
    return { xnum: 0, ynum: besty!, i, j: bestj, rsq };
  };

  let k = 0;
  const point: PenpaPoint[] = [];
  let queue: Array<{ tile_spec: TileSpec; loc_spec: LocSpec }> = [];
  const existingTiles = new Map<string, number>();

  const getTileName = (spec: TileSpec): string => {
    const rel = (ngrids + spec.j - spec.i) % ngrids;
    if (rel > ngrids / 2) {
      return `<${spec.j}|${spec.i}>(${spec.ynum},${spec.xnum})`;
    } else {
      return `<${spec.i}|${spec.j}>(${spec.xnum},${spec.ynum})`;
    }
  };

  /**
   * Add a tile to the point array
   */
  const addTile = (tileSpec: TileSpec, locSpec: LocSpec, use: number): void => {
    const name = getTileName(tileSpec);
    if (existingTiles.has(name)) return;

    const rel = (ngrids + tileSpec.j - tileSpec.i) % ngrids;
    let i: number, j: number, xnum: number, ynum: number;

    if (rel > ngrids / 2) {
      i = tileSpec.j;
      j = tileSpec.i;
      xnum = tileSpec.ynum;
      ynum = tileSpec.xnum;
    } else {
      i = tileSpec.i;
      j = tileSpec.j;
      xnum = tileSpec.xnum;
      ynum = tileSpec.ynum;
    }

    const xoffi = Math.sin((2 * i * PI) / ngrids) * size;
    const yoffi = -Math.cos((2 * i * PI) / ngrids) * size;
    const xoffj = Math.sin((2 * j * PI) / ngrids) * size;
    const yoffj = -Math.cos((2 * j * PI) / ngrids) * size;

    let xco = locSpec.xco;
    let yco = locSpec.yco;

    if (rel > ngrids / 2) {
      if (locSpec.dir > 0) {
        xco = xco - xoffi;
        yco = yco - yoffi;
      } else {
        xco = xco - xoffj;
        yco = yco - yoffj;
      }
    } else if (locSpec.dir < 0) {
      xco = xco - xoffi - xoffj;
      yco = yco - yoffi - yoffj;
    }

    const xcen = xco + 0.5 * xoffi + 0.5 * xoffj;
    const ycen = yco + 0.5 * yoffi + 0.5 * yoffj;

    const xcoArr = [xco, xco + xoffi, xco + xoffi + xoffj, xco + xoffj];
    const ycoArr = [yco, yco + yoffi, yco + yoffi + yoffj, yco + yoffj];

    const surround: (number | null)[] = [null, null, null, null];
    const edge: (number | null)[] = [null, null, null, null];
    const adja: (number | null)[] = [null, null, null, null];

    // Check adjacent tiles and update connectivity
    const directions = [
      { fn: () => nextGridpoint(xnum, ynum, i, j, 1), idx: 2, xIdx: 3, yIdx: 3 },
      { fn: () => nextGridpoint(xnum, ynum, i, j, -1), idx: 0, xIdx: 1, yIdx: 1 },
      { fn: () => nextGridpoint(ynum, xnum, j, i, 1), idx: 3, xIdx: 0, yIdx: 0 },
      { fn: () => nextGridpoint(ynum, xnum, j, i, -1), idx: 1, xIdx: 2, yIdx: 2 },
    ];

    for (const { fn, idx, xIdx, yIdx } of directions) {
      const nbrSpec = fn();
      const nbr = existingTiles.get(getTileName(nbrSpec));

      if (nbr !== undefined) {
        adja[idx] = nbr;
        const nbrPoint = point[nbr];
        const s = ((ngrids + nbrSpec.j - nbrSpec.i) % ngrids) > ngrids / 2;

        if (idx === 2) {
          surround[3] = s ? nbrPoint.surround[1] : nbrPoint.surround[0];
          surround[2] = s ? nbrPoint.surround[2] : nbrPoint.surround[1];
          edge[2] = s ? nbrPoint.neighbor[1] : nbrPoint.neighbor[0];
        } else if (idx === 0) {
          surround[1] = s ? nbrPoint.surround[3] : nbrPoint.surround[2];
          surround[0] = s ? nbrPoint.surround[0] : nbrPoint.surround[3];
          edge[0] = s ? nbrPoint.neighbor[3] : nbrPoint.neighbor[2];
        } else if (idx === 3) {
          surround[0] = s ? nbrPoint.surround[1] : nbrPoint.surround[0];
          surround[3] = s ? nbrPoint.surround[2] : nbrPoint.surround[1];
          edge[3] = s ? nbrPoint.neighbor[1] : nbrPoint.neighbor[0];
        } else if (idx === 1) {
          surround[2] = s ? nbrPoint.surround[3] : nbrPoint.surround[2];
          surround[1] = s ? nbrPoint.surround[0] : nbrPoint.surround[3];
          edge[1] = s ? nbrPoint.neighbor[3] : nbrPoint.neighbor[2];
        }
      } else {
        const newLocSpec: LocSpec = {
          xco: xcoArr[xIdx],
          yco: ycoArr[yIdx],
          dir: idx === 2 || idx === 3 ? 1 : -1,
        };
        queue.push({ tile_spec: nbrSpec, loc_spec: newLocSpec });
      }
    }

    // Create vertices if they don't exist
    for (let e = 0; e < 4; e++) {
      if (surround[e] === null) {
        point[k] = {
          x: xcoArr[e],
          y: ycoArr[e],
          type: 1,
          adjacent: [],
          surround: [],
          use,
          neighbor: [],
        };
        surround[e] = k;
        k++;
      } else if (use === 1 && surround[e] !== null) {
        point[surround[e]!].use = 1;
      }
    }

    // Update vertex adjacency
    for (let e = 0; e < 4; e++) {
      const se = surround[e]!;
      const sf = surround[(e + 1) % 4]!;
      if (!point[se].adjacent.includes(sf)) {
        point[se].adjacent.push(sf);
      }
      if (!point[sf].adjacent.includes(se)) {
        point[sf].adjacent.push(se);
      }
    }

    // Create edges if they don't exist
    for (let e = 0; e < 4; e++) {
      if (edge[e] === null) {
        const se = surround[e]!;
        const sf = surround[(e + 1) % 4]!;
        point[k] = {
          x: (point[se].x + point[sf].x) / 2,
          y: (point[se].y + point[sf].y) / 2,
          type: 2,
          adjacent: [],
          surround: [],
          use,
          neighbor: [],
        };
        edge[e] = k;
        k++;
      } else if (use === 1 && edge[e] !== null) {
        point[edge[e]!].use = 1;
      }
    }

    // Create face (cell center)
    point[k] = {
      x: xcen,
      y: ycen,
      type: 0,
      adjacent: adja.filter((a): a is number => a !== null),
      surround: surround.filter((s): s is number => s !== null),
      use,
      neighbor: edge.filter((e): e is number => e !== null),
    };

    // Update edge -> face mapping
    for (let e = 0; e < 4; e++) {
      if (edge[e] !== null) {
        point[edge[e]!].neighbor.push(k);
      }
      if (adja[e] !== null) {
        const adjPoint = point[adja[e]!];
        const edgeIdx = adjPoint.neighbor.indexOf(edge[e]!);
        if (edgeIdx !== -1) {
          adjPoint.adjacent[edgeIdx] = k;
        }
      }
    }

    existingTiles.set(name, k);
    k++;
  };

  // Start with initial tile
  const initSpec = initialGridpoint(0, 1);
  addTile(initSpec, { xco: 0.0, yco: 0.0, dir: 1 }, 1);

  // Expand tiling by processing queue
  for (let iter = 0; queue.length > 0 && iter < 100; iter++) {
    const oldqueue = queue;
    queue = [];

    for (const item of oldqueue) {
      if (item.tile_spec.rsq <= sqradius0) {
        const use = item.tile_spec.rsq <= sqradius + 1e-4 ? 1 : 0;
        addTile(item.tile_spec, item.loc_spec, use);
      }
    }

    if (queue.length === 0) break;
  }

  // Compute vertex degrees
  for (const p of point) {
    if (p && p.type === 1) {
      p.degree = p.adjacent.length;
    }
  }

  return point;
}

/**
 * Generate Penrose P3 topology from Penpa-compatible parameters
 */
export function penroseP3GridToTopology(config: GridConfig): GridTopology {
  const {
    rows = 5,
    cols = 5,
    cellSize = 38,
    outerPadding = 20,
    disabledCells = [],
  } = config;

  // Extract Penrose-specific options
  const extConfig = config as GridConfig & {
    penroseSide?: number;
    penroseOrder?: number;
    penroseRotational?: number;
    penroseVariation?: number;
  };

  const penroseConfig: PenroseP3Config = {
    side: extConfig.penroseSide ?? Math.max(rows, cols),
    order: extConfig.penroseOrder ?? 5,  // Default to 5-fold symmetry (P3)
    size: cellSize,
    rotational: extConfig.penroseRotational ?? 0,
    variation: extConfig.penroseVariation ?? 0.001,
  };

  const disabledSet = new Set(disabledCells);
  const points = createPenrosePoints(penroseConfig);

  // Extract centerlist (active cells)
  const centerlist: number[] = [];
  for (let i = 0; i < points.length; i++) {
    if (points[i] && points[i].use === 1 && points[i].type === 0) {
      centerlist.push(i);
    }
  }

  if (centerlist.length === 0) {
    return buildTopologyFromCells([], config);
  }

  // Find bounds for centering
  let xmin = Infinity, xmax = -Infinity;
  let ymin = Infinity, ymax = -Infinity;

  for (const idx of centerlist) {
    const p = points[idx];
    xmin = Math.min(xmin, p.x);
    xmax = Math.max(xmax, p.x);
    ymin = Math.min(ymin, p.y);
    ymax = Math.max(ymax, p.y);
  }

  // Calculate shift to position at outerPadding
  const shiftX = outerPadding - xmin + cellSize;
  const shiftY = outerPadding - ymin + cellSize;

  // Convert to CellDefinitions
  const cellDefs: CellDefinition[] = [];

  // Sort centerlist by position for consistent cell IDs
  const sortedCenterlist = [...centerlist].sort((a, b) => {
    const pa = points[a];
    const pb = points[b];
    const dy = pa.y - pb.y;
    if (Math.abs(dy) > 0.1) return dy;
    return pa.x - pb.x;
  });

  sortedCenterlist.forEach((cellIdx, arrayIdx) => {
    const cell = points[cellIdx];

    // Get vertices in order (surround contains vertex indices)
    const vertices: Point[] = cell.surround.map((vIdx) => ({
      x: points[vIdx].x + shiftX,
      y: points[vIdx].y + shiftY,
    }));

    const center: Point = {
      x: cell.x + shiftX,
      y: cell.y + shiftY,
    };

    // Assign pseudo row/col for ID (using index in sorted array)
    const pseudoRow = Math.floor(arrayIdx / cols);
    const pseudoCol = arrayIdx % cols;
    const id = `cell-${pseudoRow}-${pseudoCol}`;

    if (disabledSet.has(id)) return;

    cellDefs.push({
      id,
      vertices,
      center,
      index: [pseudoRow, pseudoCol],
    });
  });

  return buildTopologyFromCells(cellDefs, config);
}

/**
 * Generate Penrose P3 topology from Penpa URL parameters
 *
 * @param nx Side parameter from Penpa
 * @param ny Order parameter from Penpa
 * @param size Cell size from Penpa
 * @param options Additional options from Penpa sudoku array
 */
export function penroseP3FromPenpa(
  nx: number,
  ny: number,
  size: number,
  options?: {
    rotational?: number;
    variation?: number;
  }
): { topology: GridTopology; centerlist: number[]; points: PenpaPoint[] } {
  const penroseConfig: PenroseP3Config = {
    side: nx,
    order: ny,
    size,
    rotational: options?.rotational ?? 0,
    variation: options?.variation ?? 0.001,
  };

  const points = createPenrosePoints(penroseConfig);

  // Extract centerlist
  const centerlist: number[] = [];
  for (let i = 0; i < points.length; i++) {
    if (points[i] && points[i].use === 1 && points[i].type === 0) {
      centerlist.push(i);
    }
  }

  const gridConfig: GridConfig = {
    rows: nx,
    cols: nx,
    cellSize: size,
    outerPadding: 20,
    showGrid: true,
    gridStyle: 'normal',
    gridType: 'square',
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    frameStyle: 'normal',
    frameColor: '#000000',
    gridColor: '#000000',
    backgroundColor: '#ffffff',
    penroseOrder: ny,
    penroseRotational: options?.rotational,
    penroseVariation: options?.variation,
  } as GridConfig & {
    penroseOrder?: number;
    penroseRotational?: number;
    penroseVariation?: number;
  };

  const topology = penroseP3GridToTopology(gridConfig);

  return { topology, centerlist, points };
}

/**
 * Map Penpa point index to cell index using centerlist
 */
export function penpaIndexToCellIndex(
  penpaIndex: number,
  centerlist: number[]
): number {
  return centerlist.indexOf(penpaIndex);
}

/**
 * Get the cell ID for a Penpa point index
 */
export function penpaIndexToCellId(
  penpaIndex: number,
  centerlist: number[],
  cols: number
): string | null {
  const cellIndex = centerlist.indexOf(penpaIndex);
  if (cellIndex === -1) return null;

  const row = Math.floor(cellIndex / cols);
  const col = cellIndex % cols;
  return `cell-${row}-${col}`;
}
