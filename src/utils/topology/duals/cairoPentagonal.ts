/**
 * Cairo Pentagonal (Penpa-compatible)
 *
 * Mirrors Penpa's cairo_pentagonal generator (see docs/js/class_uniform.js).
 * The geometry is built from a staggered triangular lattice and produces true
 * pentagonal faces (5 vertices per cell). Cell count is (2*rows) x (2*cols).
 */
import type { GridConfig, Point } from '../../../types';
import type { CellDefinition, GridTopology } from '../types';
import { buildTopologyFromCells } from '../builder';

type RawPoint = {
  x: number;
  y: number;
  type: number;
  use: number;
  type2?: number;
  surround: number[];
  neighbor: number[];
};

const DEDUP_TOLERANCE_SQ = 0.01;

function buildRawPoints(rows: number, cols: number, cellSize: number): RawPoint[] {
  const nx0 = cols + 2;
  const ny0 = rows + 2;
  const pts: RawPoint[] = [];
  let k = 0;

  for (let j = 0; j < ny0; j++) {
    for (let i = 0; i < nx0; i++) {
      const offsetx = i * (1 + 0.5 * Math.sqrt(3)) + j * 0.5 + 0.5;
      const offsety = j * (1 + 0.5 * Math.sqrt(3)) - i * 0.5 + 0.5;
      const k0 = k;
      const use = i === 0 || i === nx0 - 1 || j === 0 || j === ny0 - 1 ? -1 : 1;

      // Type 1 anchor points (Penpa: six per lattice)
      pts[k] = { x: offsetx * cellSize, y: offsety * cellSize, type: 1, use, surround: [], neighbor: [], type2: 0 }; k++;
      pts[k] = { x: (offsetx + 0.5 + Math.sqrt(3) / 6) * cellSize, y: offsety * cellSize, type: 1, use, surround: [], neighbor: [], type2: 1 }; k++;
      pts[k] = { x: offsetx * cellSize, y: (offsety + 0.5 + Math.sqrt(3) / 6) * cellSize, type: 1, use, surround: [], neighbor: [], type2: 1 }; k++;
      pts[k] = { x: (offsetx + 0.5) * cellSize, y: (offsety + 0.5 + Math.sqrt(3) / 3) * cellSize, type: 1, use, surround: [], neighbor: [], type2: 1 }; k++;
      pts[k] = { x: (offsetx + 0.75 + Math.sqrt(3) / 4) * cellSize, y: (offsety + 0.25 + Math.sqrt(3) / 4) * cellSize, type: 1, use, surround: [], neighbor: [], type2: 4 }; k++;
      pts[k] = { x: (offsetx + 0.5 + Math.sqrt(3) / 3) * cellSize, y: (offsety - 0.5) * cellSize, type: 1, use, surround: [], neighbor: [], type2: 1 }; k++;

      // Type 0 (cells) around anchors
      let r = 0.5 * Math.SQRT2;
      for (let m = 0; m < 4; m++) {
        pts[k] = {
          x: pts[k0].x + r * cellSize * Math.cos(((m * 90 + 45) * Math.PI) / 180),
          y: pts[k0].y + r * cellSize * Math.sin(((m * 90 + 45) * Math.PI) / 180),
          type: 0,
          use,
          surround: [k0],
          neighbor: [],
        };
        pts[k0].surround.push(k);
        k++;
      }

      r = Math.sqrt(3) / 3;
      for (let m = 0; m < 3; m++) {
        const anchors = [
          { idx: k0 + 1, ang: 0 },
          { idx: k0 + 2, ang: 90 },
          { idx: k0 + 3, ang: 30 },
        ];
        for (const { idx: anchor, ang } of anchors) {
          pts[k] = {
            x: pts[anchor].x + r * cellSize * Math.cos(((m * 120 + ang) * Math.PI) / 180),
            y: pts[anchor].y + r * cellSize * Math.sin(((m * 120 + ang) * Math.PI) / 180),
            type: 0,
            use,
            surround: [anchor],
            neighbor: [],
          };
          pts[anchor].surround.push(k);
          k++;
        }
      }

      r = 0.5 * Math.SQRT2;
      for (let m = 0; m < 4; m++) {
        const type2 = m === 0 ? 1 : 0;
        pts[k] = {
          x: pts[k0 + 4].x + r * cellSize * Math.cos(((m * 90 + 15) * Math.PI) / 180),
          y: pts[k0 + 4].y + r * cellSize * Math.sin(((m * 90 + 15) * Math.PI) / 180),
          type: 0,
          use,
          surround: [k0 + 4],
          neighbor: [],
          type2,
        };
        pts[k0 + 4].surround.push(k);
        k++;
      }

      r = Math.sqrt(3) / 3;
      for (let m = 0; m < 3; m++) {
        pts[k] = {
          x: pts[k0 + 5].x + r * cellSize * Math.cos(((m * 120 + 60) * Math.PI) / 180),
          y: pts[k0 + 5].y + r * cellSize * Math.sin(((m * 120 + 60) * Math.PI) / 180),
          type: 0,
          use,
          surround: [k0 + 5],
          neighbor: [],
        };
        pts[k0 + 5].surround.push(k);
        k++;
      }

      // Type 2 edge points (neighbors)
      r = 0.5;
      for (let m = 0; m < 4; m++) {
        pts[k] = {
          x: pts[k0].x + r * cellSize * Math.cos(((m * 90 + 0) * Math.PI) / 180),
          y: pts[k0].y + r * cellSize * Math.sin(((m * 90 + 0) * Math.PI) / 180),
          type: 2,
          use,
          surround: [],
          neighbor: [],
        };
        pts[k0].neighbor.push(k);
        if (m === 0) {
          pts[k - 17].neighbor.push(k);
          pts[k - 20].neighbor.push(k);
        } else {
          pts[k - 21].neighbor.push(k);
          pts[k - 20].neighbor.push(k);
        }
        k++;
      }

      r = Math.sqrt(3) / 6;
      for (let m = 0; m < 3; m++) {
        const anchors = [
          { idx: k0 + 1, ang: 60 },
          { idx: k0 + 2, ang: 30 },
          { idx: k0 + 3, ang: 90 },
        ];
        for (const { idx: anchor, ang } of anchors) {
          pts[k] = {
            x: pts[anchor].x + r * cellSize * Math.cos(((m * 120 + ang) * Math.PI) / 180),
            y: pts[anchor].y + r * cellSize * Math.sin(((m * 120 + ang) * Math.PI) / 180),
            type: 2,
            use,
            surround: [],
            neighbor: [],
          };
          pts[anchor].neighbor.push(k);
          if (m === 2) {
            pts[k - 20].neighbor.push(k);
            pts[k - 22].neighbor.push(k);
          } else {
            pts[k - 20].neighbor.push(k);
            pts[k - 19].neighbor.push(k);
          }
          k++;
        }
      }

      r = 0.5;
      for (let m = 0; m < 4; m++) {
        pts[k] = {
          x: pts[k0 + 4].x + r * cellSize * Math.cos(((m * 90 + 60) * Math.PI) / 180),
          y: pts[k0 + 4].y + r * cellSize * Math.sin(((m * 90 + 60) * Math.PI) / 180),
          type: 2,
          use,
          surround: [],
          neighbor: [],
        };
        pts[k0 + 4].neighbor.push(k);
        if (m === 3) {
          pts[k - 17].neighbor.push(k);
          pts[k - 20].neighbor.push(k);
        } else {
          pts[k - 19].neighbor.push(k);
          pts[k - 20].neighbor.push(k);
        }
        k++;
      }

      r = Math.sqrt(3) / 6;
      for (let m = 0; m < 3; m++) {
        pts[k] = {
          x: pts[k0 + 5].x + r * cellSize * Math.cos(((m * 120 + 0) * Math.PI) / 180),
          y: pts[k0 + 5].y + r * cellSize * Math.sin(((m * 120 + 0) * Math.PI) / 180),
          type: 2,
          use,
          surround: [],
          neighbor: [],
        };
        pts[k0 + 5].neighbor.push(k);
        if (m === 2) {
          pts[k - 20].neighbor.push(k);
          pts[k - 22].neighbor.push(k);
        } else {
          pts[k - 20].neighbor.push(k);
          pts[k - 19].neighbor.push(k);
        }
        k++;
      }
    }
  }

  return pts;
}

function deduplicateAndNormalize(points: RawPoint[]): RawPoint[] {
  const renumber: number[] = new Array(points.length);
  for (let i = 0; i < points.length; i++) {
    if (!points[i] || renumber[i] !== undefined) continue;
    renumber[i] = i;
    for (let j = i + 1; j < points.length; j++) {
      if (!points[j]) continue;
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      if (dx * dx + dy * dy < DEDUP_TOLERANCE_SQ) renumber[j] = i;
    }
  }

  for (const pt of points) {
    if (!pt) continue;
    pt.surround = pt.surround.map((idx) => {
      const mapped = renumber[idx];
      return mapped !== undefined ? mapped : idx;
    });
    const next: number[] = [];
    for (const nb of pt.neighbor) {
      const mapped = renumber[nb];
      const add = mapped !== undefined ? mapped : nb;
      if (!next.includes(add)) next.push(add);
    }
    pt.neighbor = next;
  }

  for (let j = 0; j < points.length; j++) {
    const i = renumber[j];
    if (i === j || i === undefined) continue;
    if (!points[i] || !points[j]) continue;
    for (const s of points[j].surround) if (!points[i].surround.includes(s)) points[i].surround.push(s);
    for (const n of points[j].neighbor) if (!points[i].neighbor.includes(n)) points[i].neighbor.push(n);
    points[j] = undefined as unknown as RawPoint;
  }

  // Use update
  for (const pt of points) {
    if (!pt || pt.type !== 0 || pt.use === -1) continue;
    for (const nb of pt.neighbor) points[nb].use = 1;
    for (const s of pt.surround) points[s].use = 1;
  }

  // Surround reorder (Penpa-specific)
  for (const pt of points) {
    if (!pt || pt.type !== 0 || pt.use === -1) continue;
    if (pt.type2 === 0) {
      const s0 = pt.surround[2];
      pt.surround[2] = pt.surround[4];
      pt.surround[4] = s0;
    } else {
      const s0 = pt.surround[3];
      pt.surround[3] = pt.surround[4];
      pt.surround[4] = s0;
      pt.type2 = 0;
    }
  }

  // Compact indices so surrounds/neighbors point to existing entries
  const indexMap: number[] = [];
  const compacted: RawPoint[] = [];
  points.forEach((pt, oldIdx) => {
    if (!pt) return;
    const newIdx = compacted.length;
    indexMap[oldIdx] = newIdx;
    compacted.push({ ...pt });
  });

  for (const pt of compacted) {
    pt.surround = pt.surround.map((idx) => indexMap[idx]);
    pt.neighbor = pt.neighbor.map((idx) => indexMap[idx]);
  }

  return compacted;
}

function reorderSurroundByAngle(points: RawPoint[]): void {
  for (const pt of points) {
    if (!pt || pt.type !== 0 || pt.use === -1) continue;
    pt.surround = [...pt.surround]
      .map((idx) => {
        const v = points[idx];
        const angle = Math.atan2(v.y - pt.y, v.x - pt.x);
        return { idx, angle };
      })
      .sort((a, b) => a.angle - b.angle)
      .map((entry) => entry.idx);
  }
}

export function cairoPentagonalGridToTopology(config: GridConfig): GridTopology {
  const { rows = 1, cols = 1, cellSize = 50, outerPadding = 0, disabledCells = [] } = config;
  const disabledSet = new Set(disabledCells);

  const rawPoints = deduplicateAndNormalize(buildRawPoints(rows, cols, cellSize));
  reorderSurroundByAngle(rawPoints);

  // Collect pentagonal cells (type 0, use 1)
  type CellWithCenter = { id: string; vertices: Point[]; cx: number; cy: number };
  const rawCells: CellWithCenter[] = [];
  for (const pt of rawPoints) {
    if (pt.type !== 0 || pt.use !== 1) continue;
    const vertices = pt.surround.map((idx) => {
      const v = rawPoints[idx];
      return { x: v.x, y: v.y };
    });
    const cx = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length;
    const cy = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length;
    rawCells.push({ id: '', vertices, cx, cy });
  }

  if (rawCells.length === 0) {
    return buildTopologyFromCells([], config);
  }

  // Shift to outerPadding
  let minX = Infinity;
  let minY = Infinity;
  for (const cell of rawCells) {
    for (const v of cell.vertices) {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
    }
  }
  const shiftX = outerPadding - minX;
  const shiftY = outerPadding - minY;
  if (shiftX !== 0 || shiftY !== 0) {
    rawCells.forEach((cell) => {
      cell.vertices = cell.vertices.map((v) => ({ x: v.x + shiftX, y: v.y + shiftY }));
      cell.cx += shiftX;
      cell.cy += shiftY;
    });
  }

  // Assign row/col in grid order (2*rows by 2*cols)
  const gridCols = cols * 2;
  const sortedCells = rawCells.sort((a, b) => (a.cy === b.cy ? a.cx - b.cx : a.cy - b.cy));
  const cellDefs: CellDefinition[] = [];

  sortedCells.forEach((cell, idx) => {
    const row = Math.floor(idx / gridCols);
    const col = idx % gridCols;
    const id = `cell-${row}-${col}`;
    if (disabledSet.has(id)) return;
    cellDefs.push({ id, vertices: cell.vertices, row, col });
  });

  return buildTopologyFromCells(cellDefs, config);
}
