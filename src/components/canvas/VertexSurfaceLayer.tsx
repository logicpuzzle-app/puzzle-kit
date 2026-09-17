import { useId } from 'react';
import { useCanvasRenderState } from '../../hooks/useCanvasRenderState';
import type { DataLayerType, VertexSurfaceElement } from '../../types';
import type { GridTopology } from '../../utils/gridTopology';
import { getVertexSurfaceRegion, resolveSurfaceVertex } from '../../utils/vertexSurfaces';

function VertexSurface({ element, topology, cellSize }: { element: VertexSurfaceElement; topology: GridTopology; cellSize: number }) {
  const clipId = useId();
  const vertexId = resolveSurfaceVertex(element, topology);
  const region = vertexId ? getVertexSurfaceRegion(topology, vertexId) : null;
  if (!region) return null;
  if (element.displayMode === 'dot') return <g data-vertex-surface={vertexId}>
    <defs><clipPath id={clipId}><path d={region.path} clipRule="evenodd" /></clipPath></defs>
    <circle cx={region.position.x} cy={region.position.y} r={cellSize * 0.06} fill="gray" clipPath={`url(#${clipId})`} />
  </g>;
  return <path data-vertex-surface={vertexId} d={region.path} fill={element.color} fillRule="evenodd" />;
}

export function VertexSurfaceLayer({ layer, elements }: { layer: DataLayerType; elements?: Record<string, VertexSurfaceElement> }) {
  const { grid, topology, puzzle, showProblemLayer, showAnswerLayer } = useCanvasRenderState();
  if (!topology) return null;
  if (layer === 'problem' ? !showProblemLayer : !showAnswerLayer) return null;
  return <g className={`vertex-surface-layer-${layer}`}>
    {Object.values(elements ?? puzzle[layer].vertexSurfaces ?? {}).map(element => <VertexSurface key={element.id} element={element} topology={topology} cellSize={grid.cellSize} />)}
  </g>;
}
