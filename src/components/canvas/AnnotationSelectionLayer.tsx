import { useCanvasRenderState } from '../../hooks/useCanvasRenderState';
import { selectedAnnotations } from '../../utils/annotationSelection';

export function AnnotationSelectionLayer() {
  const state = useCanvasRenderState();
  if (state.toolSettings.currentTool !== 'select') return null;
  return <g className="annotation-selection" data-preview="true" pointerEvents="none" aria-hidden="true">
    {selectedAnnotations(state).map(ref => <circle key={JSON.stringify([ref.kind, ref.id])}
      cx={ref.position.x} cy={ref.position.y} r={9 / state.canvas.zoom}
      fill="none" stroke="#0078d4" strokeWidth={2 / state.canvas.zoom} />)}
  </g>;
}
