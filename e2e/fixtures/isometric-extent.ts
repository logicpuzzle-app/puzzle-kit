import { isometricGridToTopology } from '../../src/utils/topology/special/isometric';
import { serializeTopology } from '../../src/utils/serialization';
import { createEmptyElements } from '../../src/store/slices/elements/state';
import type { GridConfig, PuzzleExport } from '../../src/types';

export function isometricExtentFixture(): PuzzleExport {
  const grid: GridConfig = { gridType: 'iso', rows: 3, cols: 3, level: 2, isometricFaces: ['top', 'left', 'right'], isometricView: 'exterior', cellSize: 45, outerPadding: 20,
    marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, showGrid: true, gridStyle: 'normal',
    frameStyle: 'normal', frameColor: '#000000', gridColor: '#000000', backgroundColor: '#ffffff' };
  const topology = isometricGridToTopology(grid);
  // Keep the native payload representative of pre-metadata saved boards.
  for (const cell of topology.cells.values()) delete cell.isometricFace;
  // Rename fixture identities and references together; no allocator output is an oracle.
  const ids = (keys: Iterable<string>, prefix: string) => new Map([...keys].map((id, i) => [id, `${prefix}/${i}|β`]));
  const cells = ids(topology.cells.keys(), 'room'), vertices = ids(topology.vertices.keys(), 'corner'), edges = ids(topology.edges.keys(), 'border');
  // The fixture selects the uppermost face at this index by actual geometry.
  // Its arbitrary IDs, not the generator's spellings, are the identity oracle.
  const roof = [...topology.cells.values()].filter(c => c.index?.[0] === 1 && c.index?.[1] === 1).sort((a, b) => a.center.y - b.center.y)[0];
  cells.set(roof.id, 'cell-0-0');
  const target = roof.boundaryVertices.reduce((a, b) => topology.vertices.get(a)!.position.y < topology.vertices.get(b)!.position.y ? a : b);
  vertices.set(target, 'corner/roof|β');
  topology.cells = new Map([...topology.cells].map(([id, c]) => [cells.get(id)!, { ...c, id: cells.get(id)!,
    boundaryVertices: c.boundaryVertices.map(v => vertices.get(v)!), boundaryEdges: c.boundaryEdges.map(e => edges.get(e)!),
    adjacentCells: c.adjacentCells.map(c => cells.get(c)!), originalCells: [cells.get(id)!] }]));
  topology.vertices = new Map([...topology.vertices].map(([id, v]) => [vertices.get(id)!, { ...v, id: vertices.get(id)!,
    adjacentCells: v.adjacentCells.map(c => cells.get(c)!), adjacentEdges: v.adjacentEdges.map(e => edges.get(e)!),
    adjacentVertices: v.adjacentVertices.map(v => vertices.get(v)!) }]));
  topology.edges = new Map([...topology.edges].map(([id, e]) => [edges.get(id)!, { ...e, id: edges.get(id)!,
    startVertex: vertices.get(e.startVertex)!, endVertex: vertices.get(e.endVertex)!, adjacentCells: e.adjacentCells.map(c => cells.get(c)!) }]));
  const problem = createEmptyElements(), answer = createEmptyElements();
  problem.numbers.clue = { id: 'clue', cellId: 'cell-0-0', value: '17', layer: 'problem', color: '#000000', size: 'medium', position: 'center' };
  answer.vertexSurfaces = { note: { id: 'note', vertexId: 'corner/roof|β', layer: 'answer', color: '#ff0000' } };
  return { version: '1.8.0', grid, state: { problem, answer }, topologySettings: {
    useTopology: true, topologyPreset: 'square', topologyIntensity: 0.5, topology: serializeTopology(topology),
  } };
}
