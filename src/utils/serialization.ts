import pako from 'pako';
import type { PuzzleExport, GridConfig, PuzzleState } from '../types';
import type { GridTopology, TopologyCell, TopologyVertex, TopologyEdge } from './topology/types';
import { PUZZLE_EXPORT_VERSION } from '../constants/version';

// Penpa-compatible compression using zlib
// Format: "m=edit&p=" + base64(zlib(JSON))

const PUZZLE_VERSION = PUZZLE_EXPORT_VERSION;

// Key compression mapping (similar to Penpa's Z-substitution)
const COMPRESS_KEYS: Record<string, string> = {
  surfaces: 'zS',
  lines: 'zL',
  edges: 'zE',
  walls: 'zW',
  numbers: 'zN',
  symbols: 'zY',
  cages: 'zC',
  specials: 'zP',
  problem: 'zQ',
  answer: 'zA',
  solutionArea: 'zSA',
  multicolorSurfaces: 'zMS',
  cellId: 'ci',
  color: 'co',
  layer: 'la',
  from: 'fr',
  to: 'to',
  style: 'st',
  thickness: 'th',
  value: 'va',
  size: 'sz',
  position: 'po',
  cornerIndex: 'cx',
  sideIndex: 'sx',
  symbolType: 'sy',
  rotation: 'ro',
  fillColor: 'fc',
  cells: 'ce',
  label: 'lb',
  points: 'pt',
  type: 'ty',
  data: 'da',
  rows: 'rw',
  cols: 'cl',
  cellSize: 'cs',
  outerPadding: 'op',
  showGrid: 'sg',
  gridStyle: 'gs',
  blockRows: 'br',
  blockCols: 'bc',
  colors: 'crs',
  enabled: 'en',
  startRow: 'sr',
  startCol: 'sc',
  endRow: 'er',
  endCol: 'ec',
};

const DECOMPRESS_KEYS: Record<string, string> = Object.fromEntries(
  Object.entries(COMPRESS_KEYS).map(([k, v]) => [v, k])
);

function decompressKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(decompressKeys);
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const newKey = DECOMPRESS_KEYS[key] || key;
      result[newKey] = decompressKeys(value);
    }
    return result;
  }
  return obj;
}

export function serializePuzzle(
  grid: GridConfig,
  state: PuzzleState,
  metadata?: PuzzleExport['metadata'],
  topologySettings?: PuzzleExport['topologySettings']
): string {
  const data: PuzzleExport = {
    version: PUZZLE_VERSION,
    grid,
    state,
    metadata: {
      ...metadata,
      modified: new Date().toISOString(),
    },
  };

  // Include topology settings if provided
  if (topologySettings) {
    data.topologySettings = topologySettings;
  }

  // Do not rewrite dictionary keys: an opaque element ID may itself be "co",
  // "color", or "zL". The envelope distinguishes this from legacy key substitution.
  const json = JSON.stringify({ encoding: 'puzzle-kit-json', data });

  // Compress with zlib
  const deflated = pako.deflate(json, { level: 9 });

  // Convert to base64
  let binary = '';
  for (let offset = 0; offset < deflated.length; offset += 8192) {
    binary += String.fromCharCode(...deflated.subarray(offset, offset + 8192));
  }
  const base64 = btoa(binary);

  // URL-safe base64
  const urlSafe = base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return urlSafe;
}

export function deserializePuzzle(encoded: string): PuzzleExport | null {
  try {
    // Restore standard base64
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');

    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }

    // Decode base64
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Decompress with zlib
    const inflated = pako.inflate(bytes, { to: 'string' });

    // Parse JSON
    const compressed = JSON.parse(inflated);
    return (compressed?.encoding === 'puzzle-kit-json'
      ? compressed.data : decompressKeys(compressed)) as PuzzleExport;
  } catch (error) {
    console.error('Failed to deserialize puzzle:', error);
    return null;
  }
}

export function generateShareUrl(
  grid: GridConfig,
  state: PuzzleState,
  metadata?: PuzzleExport['metadata'],
  topologySettings?: PuzzleExport['topologySettings']
): string {
  const encoded = serializePuzzle(grid, state, metadata, topologySettings);
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?p=${encoded}`;
}

export function parseShareUrl(url: string): PuzzleExport | null {
  try {
    const urlObj = new URL(url);
    const encoded = urlObj.searchParams.get('p');
    if (!encoded) return null;
    return deserializePuzzle(encoded);
  } catch {
    return null;
  }
}

// Local storage functions
const STORAGE_KEY = 'puzzlekit_autosave';
const STORAGE_LIST_KEY = 'puzzlekit_saved_puzzles';

export function autoSave(
  grid: GridConfig,
  state: PuzzleState,
  metadata?: PuzzleExport['metadata'],
  topologySettings?: PuzzleExport['topologySettings']
): void {
  const data: PuzzleExport = {
    version: PUZZLE_VERSION,
    grid,
    state,
    metadata: {
      ...metadata,
      modified: new Date().toISOString(),
    },
  };
  if (topologySettings) {
    data.topologySettings = topologySettings;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadAutoSave(): PuzzleExport | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved) as PuzzleExport;
  } catch {
    return null;
  }
}

export function clearAutoSave(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export interface SavedPuzzleInfo {
  id: string;
  title: string;
  modified: string;
  thumbnail?: string;
}

export function getSavedPuzzleList(): SavedPuzzleInfo[] {
  try {
    const list = localStorage.getItem(STORAGE_LIST_KEY);
    if (!list) return [];
    return JSON.parse(list) as SavedPuzzleInfo[];
  } catch {
    return [];
  }
}

export function savePuzzleToList(
  id: string,
  grid: GridConfig,
  state: PuzzleState,
  metadata?: PuzzleExport['metadata'],
  topologySettings?: PuzzleExport['topologySettings']
): void {
  const data: PuzzleExport = {
    version: PUZZLE_VERSION,
    grid,
    state,
    ...(topologySettings ? { topologySettings } : {}),
    metadata: {
      ...metadata,
      modified: new Date().toISOString(),
    },
  };

  // Save puzzle data
  localStorage.setItem(`puzzlekit_puzzle_${id}`, JSON.stringify(data));

  // Update list
  const list = getSavedPuzzleList();
  const existing = list.findIndex((p) => p.id === id);
  const info: SavedPuzzleInfo = {
    id,
    title: metadata?.title || 'Untitled',
    modified: data.metadata?.modified || new Date().toISOString(),
  };

  if (existing >= 0) {
    list[existing] = info;
  } else {
    list.unshift(info);
  }

  localStorage.setItem(STORAGE_LIST_KEY, JSON.stringify(list));
}

export function loadPuzzleFromList(id: string): PuzzleExport | null {
  try {
    const saved = localStorage.getItem(`puzzlekit_puzzle_${id}`);
    if (!saved) return null;
    return JSON.parse(saved) as PuzzleExport;
  } catch {
    return null;
  }
}

export function deletePuzzleFromList(id: string): void {
  localStorage.removeItem(`puzzlekit_puzzle_${id}`);

  const list = getSavedPuzzleList();
  const filtered = list.filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_LIST_KEY, JSON.stringify(filtered));
}

// Export to file
export function downloadAsJson(
  grid: GridConfig,
  state: PuzzleState,
  metadata?: PuzzleExport['metadata'],
  topologySettings?: PuzzleExport['topologySettings'],
  filename = 'puzzle.json'
): void {
  const data: PuzzleExport = {
    version: PUZZLE_VERSION,
    grid,
    state,
    metadata: {
      ...metadata,
      modified: new Date().toISOString(),
    },
  };

  if (topologySettings) {
    data.topologySettings = topologySettings;
  }

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

// Import from file
export function importFromJson(file: File): Promise<PuzzleExport | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as PuzzleExport;
        if (data.version && data.grid && data.state) {
          resolve(data);
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}

// PNG Export using canvas
export async function exportToPng(
  svgElement: SVGSVGElement,
  scale = 2
): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      // Get dimensions from SVG attributes (width/height or viewBox)
      let width = parseFloat(svgElement.getAttribute('width') || '0');
      let height = parseFloat(svgElement.getAttribute('height') || '0');

      // If no width/height, try viewBox
      if (!width || !height) {
        const viewBox = svgElement.getAttribute('viewBox');
        if (viewBox) {
          const parts = viewBox.split(/\s+/).map(Number);
          if (parts.length >= 4) {
            width = parts[2];
            height = parts[3];
          }
        }
      }

      // Fallback to getBBox if SVG is in DOM
      if ((!width || !height) && svgElement.ownerDocument) {
        try {
          const bbox = svgElement.getBBox();
          width = bbox.width + bbox.x * 2;
          height = bbox.height + bbox.y * 2;
        } catch {
          // getBBox failed, use default
          width = width || 500;
          height = height || 500;
        }
      }

      // Ensure we have valid dimensions
      if (!width || !height) {
        resolve(null);
        return;
      }

      // Clone SVG and prepare for export
      const clone = svgElement.cloneNode(true) as SVGSVGElement;
      clone.querySelectorAll('[data-preview]').forEach(element => element.remove());
      clone.setAttribute('width', String(width));
      clone.setAttribute('height', String(height));
      clone.setAttribute('viewBox', `0 0 ${width} ${height}`);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

      // Serialize to string
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clone);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      // Create image
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(svgUrl);
          resolve(null);
          return;
        }

        // Fill white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw SVG
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          URL.revokeObjectURL(svgUrl);
          resolve(blob);
        }, 'image/png');
      };

      img.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        resolve(null);
      };

      img.src = svgUrl;
    } catch {
      resolve(null);
    }
  });
}

export function downloadAsPng(blob: Blob, filename = 'puzzle.png'): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ========================================
// Topology Serialization
// ========================================

/**
 * Serializable topology format (uses arrays instead of Maps)
 */
export interface SerializedTopology {
  exclusionBase?: SerializedTopology;
  deformationBounds?: GridTopology['bounds'];
  cells: [string, TopologyCell][];
  vertices: [string, TopologyVertex][];
  edges: [string, TopologyEdge][];
  bounds: GridTopology['bounds'];
  sourceConfig?: GridConfig;
}

/**
 * Convert GridTopology to serializable format
 */
export function serializeTopology(topology: GridTopology): SerializedTopology {
  return {
    ...(topology.exclusionBase ? { exclusionBase: serializeTopology(topology.exclusionBase) } : {}),
    cells: Array.from(topology.cells.entries()),
    vertices: Array.from(topology.vertices.entries()),
    edges: Array.from(topology.edges.entries()),
    bounds: topology.bounds,
    ...(topology.deformationBounds && { deformationBounds: topology.deformationBounds }),
    sourceConfig: topology.sourceConfig,
  };
}

/**
 * Convert serialized format back to GridTopology
 */
export function deserializeTopology(serialized: SerializedTopology): GridTopology {
  // Validate before constructing Maps: duplicate keys would otherwise silently
  // replace a node and leave every reference to it pointing at the wrong object.
  const record = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value);
  const point = (value: unknown): boolean =>
    record(value) && Number.isFinite(value.x) && Number.isFinite(value.y);
  const readNodes = <T extends { id: string }>(value: unknown): Map<string, T> => {
    if (!Array.isArray(value)) throw new Error('Invalid topology node collection');
    const nodes = new Map<string, T>();
    for (const entry of value) {
      if (!Array.isArray(entry) || entry.length !== 2 ||
          typeof entry[0] !== 'string' || !entry[0] ||
          !record(entry[1]) || entry[1].id !== entry[0] || nodes.has(entry[0])) {
        throw new Error('Duplicate or inconsistent topology ID');
      }
      nodes.set(entry[0], entry[1] as T);
    }
    return nodes;
  };
  if (!record(serialized)) throw new Error('Invalid topology snapshot');
  const phase = serialized.sourceConfig?.hexRowOffset;
  if (phase !== undefined && phase !== 0 && phase !== 1) throw new Error('Invalid hex row offset');
  const cells = readNodes<TopologyCell>(serialized.cells);
  const vertices = readNodes<TopologyVertex>(serialized.vertices);
  const edges = readNodes<TopologyEdge>(serialized.edges);
  let exclusionBase: GridTopology | undefined;
  if (serialized.exclusionBase !== undefined) {
    if (!record(serialized.exclusionBase) || serialized.exclusionBase.exclusionBase !== undefined) {
      throw new Error('Nested exclusion base is not supported');
    }
    exclusionBase = deserializeTopology(serialized.exclusionBase);
    if ((exclusionBase.sourceConfig?.hexRowOffset ?? 0) !== (phase ?? 0)) throw new Error('Inconsistent hidden hex row offset');
    for (const [id, vertex] of vertices) {
      const original = exclusionBase.vertices.get(id);
      if (!original || original.position.x !== vertex.position.x || original.position.y !== vertex.position.y
          || JSON.stringify(original.basePosition) !== JSON.stringify(vertex.basePosition)) {
        throw new Error('Exclusion base reassigns a vertex ID');
      }
    }
    for (const [id, edge] of edges) {
      const original = exclusionBase.edges.get(id);
      if (!original || original.startVertex !== edge.startVertex || original.endVertex !== edge.endVertex
          || JSON.stringify(original.baseMidpoint) !== JSON.stringify(edge.baseMidpoint)) {
        throw new Error('Exclusion base reassigns an edge ID');
      }
    }
    for (const [id, cell] of cells) {
      const original = exclusionBase.cells.get(id);
      if (!original || original.center.x !== cell.center.x || original.center.y !== cell.center.y
          || JSON.stringify(original.baseCenter) !== JSON.stringify(cell.baseCenter) ||
          JSON.stringify(original.boundaryVertices) !== JSON.stringify(cell.boundaryVertices) ||
          JSON.stringify(original.boundaryEdges) !== JSON.stringify(cell.boundaryEdges)) {
        throw new Error('Exclusion base reassigns a cell ID');
      }
    }
  }
  const refs = (value: unknown, target: Map<string, unknown>): boolean =>
    Array.isArray(value) && value.every(id => typeof id === 'string' && target.has(id));
  if (!record(serialized.bounds) ||
      !['minX', 'minY', 'maxX', 'maxY', 'width', 'height']
        .every(key => Number.isFinite(serialized.bounds[key as keyof GridTopology['bounds']]))) {
    throw new Error('Invalid topology bounds');
  }
  if (serialized.deformationBounds !== undefined && (!record(serialized.deformationBounds) ||
      !['minX', 'minY', 'maxX', 'maxY', 'width', 'height'].every(key =>
        Number.isFinite(serialized.deformationBounds![key as keyof GridTopology['bounds']])))) {
    throw new Error('Invalid deformation bounds');
  }
  const origin = (value: unknown) => serialized.deformationBounds !== undefined ? point(value) : value === undefined;
  for (const cell of cells.values()) {
    if (!point(cell.center) || !origin(cell.baseCenter) || !refs(cell.boundaryVertices, vertices) ||
        !refs(cell.boundaryEdges, edges) || !refs(cell.adjacentCells, cells)) {
      throw new Error('Invalid cell geometry or reference');
    }
  }
  for (const vertex of vertices.values()) {
    if (!point(vertex.position) || !origin(vertex.basePosition) || !refs(vertex.adjacentCells, cells) ||
        !refs(vertex.adjacentEdges, edges) || !refs(vertex.adjacentVertices, vertices)) {
      throw new Error('Invalid vertex geometry or reference');
    }
  }
  for (const edge of edges.values()) {
    if (!point(edge.midpoint) || !origin(edge.baseMidpoint) || !vertices.has(edge.startVertex) ||
        !vertices.has(edge.endVertex) || !refs(edge.adjacentCells, cells)) {
      throw new Error('Invalid edge geometry or reference');
    }
  }
  return {
    cells,
    vertices,
    edges,
    ...(exclusionBase ? { exclusionBase } : {}),
    bounds: serialized.bounds,
    ...(serialized.deformationBounds && { deformationBounds: serialized.deformationBounds }),
    sourceConfig: serialized.sourceConfig,
  };
}
