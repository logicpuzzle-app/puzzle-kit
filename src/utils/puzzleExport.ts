/**
 * Puzzle Export Utilities
 *
 * Functions for optimizing puzzle data for export/import.
 * Strips redundant fields like 'layer' which can be inferred from structure.
 */

import type { LayerType, PuzzleElements, PuzzleState } from '../types';

/**
 * Strip 'layer' field from all elements in a category (for export optimization)
 */
function stripLayerFromElements(
  elements: Record<string, any>
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [id, element] of Object.entries(elements)) {
    if (element && typeof element === 'object') {
      const { layer, ...rest } = element;
      result[id] = rest;
    }
  }
  return result;
}

/**
 * Strip layer from all elements in a PuzzleElements object
 */
function stripLayerFromPuzzleElements(elements: PuzzleElements): Record<string, any> {
  return {
    surfaces: stripLayerFromElements(elements.surfaces || {}),
    lines: stripLayerFromElements(elements.lines || {}),
    edges: stripLayerFromElements(elements.edges || {}),
    walls: stripLayerFromElements(elements.walls || {}),
    numbers: stripLayerFromElements(elements.numbers || {}),
    symbols: stripLayerFromElements(elements.symbols || {}),
    cages: stripLayerFromElements(elements.cages || {}),
    specials: stripLayerFromElements(elements.specials || {}),
    boxLines: stripLayerFromElements(elements.boxLines || {}),
    directionalClues: stripLayerFromElements(elements.directionalClues || {}),
  };
}

/**
 * Restore 'layer' field to all elements in a category (for import)
 */
export function restoreLayerToElements(
  elements: Record<string, any>,
  layer: LayerType
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [id, element] of Object.entries(elements)) {
    result[id] = { ...element, layer };
  }
  return result;
}

/**
 * Restore layer to all elements in a PuzzleElements object
 */
export function restoreLayerToPuzzleElements(
  elements: Record<string, any>,
  layer: LayerType
): PuzzleElements {
  return {
    surfaces: restoreLayerToElements(elements.surfaces || {}, layer),
    lines: restoreLayerToElements(elements.lines || {}, layer),
    edges: restoreLayerToElements(elements.edges || {}, layer),
    walls: restoreLayerToElements(elements.walls || {}, layer),
    numbers: restoreLayerToElements(elements.numbers || {}, layer),
    symbols: restoreLayerToElements(elements.symbols || {}, layer),
    cages: restoreLayerToElements(elements.cages || {}, layer),
    specials: restoreLayerToElements(elements.specials || {}, layer),
    boxLines: restoreLayerToElements(elements.boxLines || {}, layer),
    directionalClues: restoreLayerToElements(elements.directionalClues || {}, layer),
  };
}

/**
 * Optimize puzzle state for export by stripping redundant layer fields
 */
export function optimizePuzzleStateForExport(puzzleState: PuzzleState): Record<string, any> {
  return {
    problem: stripLayerFromPuzzleElements(puzzleState.problem),
    answer: stripLayerFromPuzzleElements(puzzleState.answer),
    ...(puzzleState.multicolorSurfaces && Object.keys(puzzleState.multicolorSurfaces).length > 0
      ? { multicolorSurfaces: puzzleState.multicolorSurfaces }
      : {}),
    ...(puzzleState.solutionArea ? { solutionArea: puzzleState.solutionArea } : {}),
  };
}

/**
 * Restore puzzle state from optimized export format
 */
export function restorePuzzleStateFromExport(data: Record<string, any>): PuzzleState {
  const normalizeMulticolorSurfaces = (
    multicolorSurfaces: Record<string, any> | undefined
  ): Record<string, any> | undefined => {
    if (!multicolorSurfaces) return undefined;
    const result: Record<string, any> = {};
    for (const [id, element] of Object.entries(multicolorSurfaces)) {
      if (!element || typeof element !== 'object') continue;
      const layer = element.layer === 'answer' ? 'answer' : 'problem';
      result[id] = { ...element, layer };
    }
    return result;
  };

  // Check if layer is missing from elements to determine format
  const needsLayerRestore = (elements: Record<string, any>) => {
    const firstElement = Object.values(elements)[0] as Record<string, any> | undefined;
    return firstElement && !('layer' in firstElement);
  };

  const problemElements = (data.problem || {}) as Record<string, any>;
  const answerElements = (data.answer || {}) as Record<string, any>;

  const problemNeedsRestore = problemElements.surfaces &&
    needsLayerRestore(problemElements.surfaces);
  const answerNeedsRestore = answerElements.surfaces &&
    needsLayerRestore(answerElements.surfaces);

  if (problemNeedsRestore || answerNeedsRestore) {
    return {
      problem: restoreLayerToPuzzleElements(problemElements, 'problem'),
      answer: restoreLayerToPuzzleElements(answerElements, 'answer'),
      ...(data.multicolorSurfaces
        ? { multicolorSurfaces: normalizeMulticolorSurfaces(data.multicolorSurfaces) }
        : {}),
      ...(data.solutionArea ? { solutionArea: data.solutionArea } : {}),
    };
  }

  // Already has layer fields, return as-is
  return {
    ...(data as PuzzleState),
    ...(data.multicolorSurfaces
      ? { multicolorSurfaces: normalizeMulticolorSurfaces(data.multicolorSurfaces) as any }
      : {}),
  };
}
