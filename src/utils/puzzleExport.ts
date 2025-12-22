/**
 * Puzzle Export Utilities
 *
 * Functions for optimizing puzzle data for export/import.
 * Strips redundant fields like 'layer' which can be inferred from structure.
 */

import type { LayerType, LineElement, PuzzleElements, PuzzleState } from '../types';
import { generateLineId } from './lineNormalization';
import { mergeDirectionalCluesIntoNumbersForLayer } from './legacyDirectionalClues';
import { getDirectionalCluesFromElements } from './numberEntries';

const guessLineTarget = (line: LineElement): LineElement['lineTarget'] => {
  if (line.lineTarget) return line.lineTarget;
  if (line.from?.startsWith('vertex-')) return 'edge';
  if (line.from?.startsWith('cell-')) return 'cell';
  return undefined;
};

const mergeLegacyLines = (
  lines: Record<string, LineElement>,
  legacy: Record<string, LineElement>,
  fallbackTarget?: LineElement['lineTarget']
): Record<string, LineElement> => {
  const merged = { ...lines };
  for (const line of Object.values(legacy)) {
    const lineTarget = line.lineTarget ?? fallbackTarget ?? guessLineTarget(line);
    const normalized: LineElement = {
      ...line,
      lineTarget,
    };
    const id = normalized.edgeId && normalized.lineTarget
      ? `${normalized.lineTarget}-${normalized.edgeId}`
      : (normalized.from && normalized.to ? generateLineId(normalized.from, normalized.to) : normalized.id);
    normalized.id = id;
    if (!merged[id]) {
      merged[id] = normalized;
    }
  }
  return merged;
};

const normalizeLineTargets = (lines: Record<string, LineElement>): Record<string, LineElement> => {
  const normalized: Record<string, LineElement> = {};
  for (const [id, line] of Object.entries(lines)) {
    const lineTarget = line.lineTarget ?? guessLineTarget(line);
    normalized[id] = lineTarget ? { ...line, lineTarget } : line;
  }
  return normalized;
};

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
  const directionalClueEntries = getDirectionalCluesFromElements(elements);
  const directionalCluesRecord: Record<string, any> = {};
  directionalClueEntries.forEach((clue, index) => {
    let key = clue.id ?? clue.cellId;
    if (directionalCluesRecord[key]) {
      key = `${key}-${index}`;
    }
    directionalCluesRecord[key] = clue;
  });

  return {
    surfaces: stripLayerFromElements(elements.surfaces || {}),
    lines: stripLayerFromElements(elements.lines || {}),
    numbers: stripLayerFromElements(elements.numbers || {}),
    symbols: stripLayerFromElements(elements.symbols || {}),
    cages: stripLayerFromElements(elements.cages || {}),
    specials: stripLayerFromElements(elements.specials || {}),
    boxLines: stripLayerFromElements(elements.boxLines || {}),
    directionalClues: stripLayerFromElements(directionalCluesRecord),
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
  const lines = normalizeLineTargets(
    restoreLayerToElements(elements.lines || {}, layer) as Record<string, LineElement>
  );
  const legacyEdges = restoreLayerToElements(elements.edges || {}, layer) as Record<string, LineElement>;
  const legacyWalls = restoreLayerToElements(elements.walls || {}, layer) as Record<string, LineElement>;
  const mergedLines = mergeLegacyLines(
    mergeLegacyLines(lines, legacyEdges, 'edge'),
    legacyWalls,
    'wall'
  );
  const restored: PuzzleElements & { directionalClues?: Record<string, any> } = {
    surfaces: restoreLayerToElements(elements.surfaces || {}, layer),
    lines: mergedLines,
    edges: {},
    walls: {},
    numbers: restoreLayerToElements(elements.numbers || {}, layer),
    symbols: restoreLayerToElements(elements.symbols || {}, layer),
    cages: restoreLayerToElements(elements.cages || {}, layer),
    specials: restoreLayerToElements(elements.specials || {}, layer),
    boxLines: restoreLayerToElements(elements.boxLines || {}, layer),
    directionalClues: restoreLayerToElements(elements.directionalClues || {}, layer),
  };
  return mergeDirectionalCluesIntoNumbersForLayer(restored);
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
