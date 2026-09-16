import type { PuzzleStore } from '../types';
import { createSculptEdit, type SculptEdit } from '../../../utils/topology/retainedSculpt';
import { editedGrid, projectEdits, removeEdits, retainedEdits } from '../../../utils/topology/retainedEdits';
import { applyTopologyPreset } from '../../../utils/topology/presets';
import { finishTopologyEdit } from './cellOperations';

/** Edit the retained graph and all live references as one history operation. */
function sculptCluster(state: PuzzleStore, vertexId: string, mode: SculptEdit['mode']): Partial<PuzzleStore> | PuzzleStore {
  if (!state.useTopology || !state.topology || state.grid.gridType !== 'iso') return state;
  const pivot = state.topology.vertices.get(vertexId);
  if (!pivot || pivot.adjacentCells.length !== 3) return state;
  const full = state.topology.exclusionBase ?? state.topology;
  const { base, operations } = retainedEdits(full);
  const edit = createSculptEdit(full, vertexId, mode);
  if (!edit) return state;
  const projected = projectEdits(base, [...operations, edit], full.cells, full.edges);
  if (!projected) return state;
  const next = applyTopologyPreset(projected, { preset: state.topologyPreset, intensity: state.topologyIntensity });
  return finishTopologyEdit(state, next, editedGrid(next, state.grid));
}
export const sculptRotateCluster = (state: PuzzleStore, vertexId: string) => sculptCluster(state, vertexId, 'rotate');
export const sculptCutCluster = (state: PuzzleStore, vertexId: string) => sculptCluster(state, vertexId, 'cut');

export function clearSculptOperations(state: PuzzleStore): Partial<PuzzleStore> | PuzzleStore {
  const full = state.topology?.exclusionBase ?? state.topology;
  if (!full?.editBase || !full.editOperations?.some(op => op.kind === 'sculpt')) return state;
  const operations = removeEdits(full, op => op.kind === 'sculpt');
  if (!operations) return state;
  const projected = projectEdits(full.editBase, operations, full.cells, full.edges);
  if (!projected) return state;
  const next = applyTopologyPreset(projected, { preset: state.topologyPreset, intensity: state.topologyIntensity });
  return finishTopologyEdit(state, next, editedGrid(next, state.grid));
}
