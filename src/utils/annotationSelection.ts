import type { DataLayerType, Point } from '../types';
import type { PuzzleStore } from '../store/slices/types';
import type { ResolveContext } from './pointResolver';
import { resolveBoardPoint } from './lineReferences';
import { getEditableDataLayer } from './editPolicy';
import { getVertexSurfaceRegion } from './vertexSurfaces';

export const annotationKinds = ['surfaces', 'vertexSurfaces', 'numbers', 'symbols'] as const;
export type AnnotationKind = typeof annotationKinds[number];
export interface AnnotationRef { kind: AnnotationKind; id: string }
export interface AnnotationSelection extends ResolveContext { layer: DataLayerType; refs: AnnotationRef[] }
export interface SelectableAnnotation extends AnnotationRef { position: Point }
type Context = Pick<PuzzleStore, 'grid' | 'topology' | 'useTopology' | 'puzzle' | 'activeLayer' | 'isPlayerMode' | 'showProblemLayer' | 'showAnswerLayer'>;
export const sameAnnotation = (a: AnnotationRef, b: AnnotationRef) => a.kind === b.kind && a.id === b.id;

export function annotationScope(state: Context): Omit<AnnotationSelection, 'refs'> | null {
  const layer = getEditableDataLayer(state.activeLayer, state.isPlayerMode);
  if (!layer || !(layer === 'problem' ? state.showProblemLayer : state.showAnswerLayer)) return null;
  return { grid: state.grid, topology: state.topology, useTopology: state.useTopology, layer };
}
export function sameAnnotationScope(a: Omit<AnnotationSelection, 'refs'> | null, b: Omit<AnnotationSelection, 'refs'> | null) {
  return !!a && !!b && a.grid === b.grid && a.topology === b.topology && a.useTopology === b.useTopology && a.layer === b.layer;
}

export function selectableAnnotations(state: Context): SelectableAnnotation[] {
  const scope = annotationScope(state);
  if (!scope) return [];
  const result: SelectableAnnotation[] = [];
  const elements = state.puzzle[scope.layer];
  for (const kind of annotationKinds) for (const [id, element] of Object.entries(elements[kind] ?? {})) {
    if (element.id !== id || element.layer !== scope.layer) continue;
    let position: Point | undefined;
    if (kind === 'vertexSurfaces') {
      const note = elements.vertexSurfaces![id];
      if (state.topology) position = getVertexSurfaceRegion(state.topology, note.vertexId)?.position;
    } else {
      const note = kind === 'surfaces' ? elements.surfaces[id] : kind === 'numbers' ? elements.numbers[id] : elements.symbols[id];
      const type = kind === 'symbols' ? elements.symbols[id].pointType : 'cell';
      const target = resolveBoardPoint(note.cellId, type, state);
      if (!target) continue;
      if (state.useTopology && target.type === 'cell' && state.topology?.cells.get(target.id)?.outboard
        && (kind === 'surfaces' || scope.layer !== 'problem')) continue;
      position = target.position;
    }
    if (position) result.push({ kind, id, position });
  }
  return result;
}

export function selectedAnnotations(state: Context & Pick<PuzzleStore, 'annotationSelection'>): SelectableAnnotation[] {
  const selection = state.annotationSelection;
  if (!selection || !sameAnnotationScope(selection, annotationScope(state))) return [];
  return selectableAnnotations(state).filter(annotation => selection.refs.some(ref => sameAnnotation(ref, annotation)));
}
