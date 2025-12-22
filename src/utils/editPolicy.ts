import type { DataLayerType, LayerType } from '../types';
import { toDataLayer } from '../types';

export function canActivateLayer(layer: LayerType, isPlayerMode: boolean): boolean {
  if (!isPlayerMode) return true;
  return layer === 'answer';
}

export function canEditActiveLayer(activeLayer: LayerType, isPlayerMode: boolean): boolean {
  if (activeLayer === 'grid' || activeLayer === 'constraint') return false;
  if (isPlayerMode && activeLayer !== 'answer') return false;
  return true;
}

export function canEditDataLayer(layer: DataLayerType, isPlayerMode: boolean): boolean {
  return !(isPlayerMode && layer === 'problem');
}

export function getEditableDataLayer(activeLayer: LayerType, isPlayerMode: boolean): DataLayerType | null {
  if (!canEditActiveLayer(activeLayer, isPlayerMode)) return null;
  return isPlayerMode ? 'answer' : toDataLayer(activeLayer);
}
