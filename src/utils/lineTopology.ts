import type { GridConfig, LineElement } from '../types';
import type { GridTopology } from './topology/types';
import { buildEdgeGridToTopologyMap, buildVertexGridToTopologyMap } from './gridIds';
import { getEdgeBetweenCells, getEdgeBetweenVertices } from './gridTopology';

export const remapLineEdgeIdsForTopology = (
  lines: Record<string, LineElement>,
  topology: GridTopology,
  grid: GridConfig
): Record<string, LineElement> => {
  const edgeMap = buildEdgeGridToTopologyMap(topology, grid);
  const vertexMap = buildVertexGridToTopologyMap(topology, grid);
  const remapped: Record<string, LineElement> = {};

  for (const [id, line] of Object.entries(lines)) {
    let edgeId = line.edgeId;

    if (edgeId && edgeMap.has(edgeId)) {
      edgeId = edgeMap.get(edgeId)!.id;
    } else if (!edgeId && line.lineTarget === 'cell' && line.from && line.to) {
      edgeId = getEdgeBetweenCells(topology, line.from, line.to) ?? undefined;
    } else if (
      !edgeId &&
      (line.lineTarget === 'edge' || line.lineTarget === 'wall') &&
      line.from &&
      line.to
    ) {
      const fromTopo = vertexMap.get(line.from)?.id;
      const toTopo = vertexMap.get(line.to)?.id;
      if (fromTopo && toTopo) {
        edgeId = getEdgeBetweenVertices(topology, fromTopo, toTopo) ?? undefined;
      }
    }

    remapped[id] = edgeId && edgeId !== line.edgeId ? { ...line, edgeId } : line;
  }

  return remapped;
};
