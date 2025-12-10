/**
 * Pure Action Helpers - State transformation functions for element CRUD
 * These are pure functions that return new state fragments, no side effects
 */

import type {
  PuzzleState,
  PuzzleElements,
  DataLayerType,
  SurfaceElement,
  LineElement,
  EdgeElement,
  WallElement,
  NumberElement,
  SymbolElement,
  CageElement,
  SpecialElement,
  BoxLineElement,
  DirectionalClueElement,
  LineGroup,
} from '../../../../types';

// ============================================================================
// Generic helpers
// ============================================================================

/**
 * Add an element to a collection
 */
export function addToCollection<T extends { id: string }>(
  collection: Record<string, T>,
  element: T
): Record<string, T> {
  return {
    ...collection,
    [element.id]: element,
  };
}

/**
 * Remove an element from a collection
 */
export function removeFromCollection<T>(
  collection: Record<string, T>,
  id: string
): Record<string, T> {
  const newCollection = { ...collection };
  delete newCollection[id];
  return newCollection;
}

/**
 * Update an element in a collection
 */
export function updateInCollection<T extends { id: string }>(
  collection: Record<string, T>,
  id: string,
  updates: Partial<T>
): Record<string, T> {
  const existing = collection[id];
  if (!existing) return collection;

  return {
    ...collection,
    [id]: { ...existing, ...updates },
  };
}

// ============================================================================
// Layer update helpers
// ============================================================================

/**
 * Update a specific collection in a puzzle layer
 */
export function updateLayerCollection<K extends keyof PuzzleElements>(
  puzzle: PuzzleState,
  layer: DataLayerType,
  collectionKey: K,
  newCollection: PuzzleElements[K]
): PuzzleState {
  return {
    ...puzzle,
    [layer]: {
      ...puzzle[layer],
      [collectionKey]: newCollection,
    },
  };
}

// ============================================================================
// Surface helpers
// ============================================================================

export function addSurfaceToLayer(
  puzzle: PuzzleState,
  element: SurfaceElement
): PuzzleState {
  const layer = element.layer;
  return updateLayerCollection(
    puzzle,
    layer,
    'surfaces',
    addToCollection(puzzle[layer].surfaces, element)
  );
}

export function removeSurfaceFromLayer(
  puzzle: PuzzleState,
  layer: DataLayerType,
  id: string
): PuzzleState {
  return updateLayerCollection(
    puzzle,
    layer,
    'surfaces',
    removeFromCollection(puzzle[layer].surfaces, id)
  );
}

// ============================================================================
// Line helpers
// ============================================================================

export function addLineToLayer(
  puzzle: PuzzleState,
  element: LineElement
): PuzzleState {
  const layer = element.layer;
  return updateLayerCollection(
    puzzle,
    layer,
    'lines',
    addToCollection(puzzle[layer].lines, element)
  );
}

export function removeLineFromLayer(
  puzzle: PuzzleState,
  layer: DataLayerType,
  id: string
): PuzzleState {
  return updateLayerCollection(
    puzzle,
    layer,
    'lines',
    removeFromCollection(puzzle[layer].lines, id)
  );
}

export function updateLineInLayer(
  puzzle: PuzzleState,
  layer: DataLayerType,
  id: string,
  updates: Partial<LineElement>
): PuzzleState {
  return updateLayerCollection(
    puzzle,
    layer,
    'lines',
    updateInCollection(puzzle[layer].lines, id, updates)
  );
}

// ============================================================================
// Edge helpers (legacy)
// ============================================================================

export function addEdgeToLayer(
  puzzle: PuzzleState,
  element: EdgeElement
): PuzzleState {
  const layer = element.layer;
  return updateLayerCollection(
    puzzle,
    layer,
    'edges',
    addToCollection(puzzle[layer].edges, element)
  );
}

export function removeEdgeFromLayer(
  puzzle: PuzzleState,
  layer: DataLayerType,
  id: string
): PuzzleState {
  return updateLayerCollection(
    puzzle,
    layer,
    'edges',
    removeFromCollection(puzzle[layer].edges, id)
  );
}

// ============================================================================
// Wall helpers (legacy)
// ============================================================================

export function addWallToLayer(
  puzzle: PuzzleState,
  element: WallElement
): PuzzleState {
  const layer = element.layer;
  return updateLayerCollection(
    puzzle,
    layer,
    'walls',
    addToCollection(puzzle[layer].walls, element)
  );
}

export function removeWallFromLayer(
  puzzle: PuzzleState,
  layer: DataLayerType,
  id: string
): PuzzleState {
  return updateLayerCollection(
    puzzle,
    layer,
    'walls',
    removeFromCollection(puzzle[layer].walls, id)
  );
}

// ============================================================================
// Number helpers
// ============================================================================

export function addNumberToLayer(
  puzzle: PuzzleState,
  element: NumberElement
): PuzzleState {
  const layer = element.layer;
  return updateLayerCollection(
    puzzle,
    layer,
    'numbers',
    addToCollection(puzzle[layer].numbers, element)
  );
}

export function removeNumberFromLayer(
  puzzle: PuzzleState,
  layer: DataLayerType,
  id: string
): PuzzleState {
  return updateLayerCollection(
    puzzle,
    layer,
    'numbers',
    removeFromCollection(puzzle[layer].numbers, id)
  );
}

export function updateNumberInLayer(
  puzzle: PuzzleState,
  layer: DataLayerType,
  id: string,
  updates: Partial<NumberElement>
): PuzzleState {
  return updateLayerCollection(
    puzzle,
    layer,
    'numbers',
    updateInCollection(puzzle[layer].numbers, id, updates)
  );
}

// ============================================================================
// Symbol helpers
// ============================================================================

export function addSymbolToLayer(
  puzzle: PuzzleState,
  element: SymbolElement
): PuzzleState {
  const layer = element.layer;
  return updateLayerCollection(
    puzzle,
    layer,
    'symbols',
    addToCollection(puzzle[layer].symbols, element)
  );
}

export function removeSymbolFromLayer(
  puzzle: PuzzleState,
  layer: DataLayerType,
  id: string
): PuzzleState {
  return updateLayerCollection(
    puzzle,
    layer,
    'symbols',
    removeFromCollection(puzzle[layer].symbols, id)
  );
}

// ============================================================================
// Cage helpers
// ============================================================================

export function addCageToLayer(
  puzzle: PuzzleState,
  element: CageElement
): PuzzleState {
  const layer = element.layer;
  return updateLayerCollection(
    puzzle,
    layer,
    'cages',
    addToCollection(puzzle[layer].cages, element)
  );
}

export function removeCageFromLayer(
  puzzle: PuzzleState,
  layer: DataLayerType,
  id: string
): PuzzleState {
  return updateLayerCollection(
    puzzle,
    layer,
    'cages',
    removeFromCollection(puzzle[layer].cages, id)
  );
}

// ============================================================================
// Special helpers
// ============================================================================

export function addSpecialToLayer(
  puzzle: PuzzleState,
  element: SpecialElement
): PuzzleState {
  const layer = element.layer;
  return updateLayerCollection(
    puzzle,
    layer,
    'specials',
    addToCollection(puzzle[layer].specials, element)
  );
}

export function removeSpecialFromLayer(
  puzzle: PuzzleState,
  layer: DataLayerType,
  id: string
): PuzzleState {
  return updateLayerCollection(
    puzzle,
    layer,
    'specials',
    removeFromCollection(puzzle[layer].specials, id)
  );
}

// ============================================================================
// BoxLine helpers
// ============================================================================

export function addBoxLineToLayer(
  puzzle: PuzzleState,
  element: BoxLineElement
): PuzzleState {
  const layer = element.layer;
  return updateLayerCollection(
    puzzle,
    layer,
    'boxLines',
    addToCollection(puzzle[layer].boxLines, element)
  );
}

export function removeBoxLineFromLayer(
  puzzle: PuzzleState,
  layer: DataLayerType,
  id: string
): PuzzleState {
  return updateLayerCollection(
    puzzle,
    layer,
    'boxLines',
    removeFromCollection(puzzle[layer].boxLines, id)
  );
}

// ============================================================================
// DirectionalClue helpers
// ============================================================================

export function addDirectionalClueToLayer(
  puzzle: PuzzleState,
  element: DirectionalClueElement
): PuzzleState {
  const layer = element.layer;
  return updateLayerCollection(
    puzzle,
    layer,
    'directionalClues',
    addToCollection(puzzle[layer].directionalClues, element)
  );
}

export function removeDirectionalClueFromLayer(
  puzzle: PuzzleState,
  layer: DataLayerType,
  id: string
): PuzzleState {
  return updateLayerCollection(
    puzzle,
    layer,
    'directionalClues',
    removeFromCollection(puzzle[layer].directionalClues, id)
  );
}

// ============================================================================
// LineGroup helpers
// ============================================================================

export function addLineGroupToLayer(
  puzzle: PuzzleState,
  layer: DataLayerType,
  group: LineGroup
): PuzzleState {
  const existingGroups = puzzle[layer].lineGroups || {};
  return {
    ...puzzle,
    [layer]: {
      ...puzzle[layer],
      lineGroups: {
        ...existingGroups,
        [group.id]: group,
      },
    },
  };
}

export function removeLineGroupFromLayer(
  puzzle: PuzzleState,
  layer: DataLayerType,
  id: string
): PuzzleState {
  const existingGroups = puzzle[layer].lineGroups || {};
  const newGroups = { ...existingGroups };
  delete newGroups[id];
  return {
    ...puzzle,
    [layer]: {
      ...puzzle[layer],
      lineGroups: newGroups,
    },
  };
}

export function updateLineGroupInLayer(
  puzzle: PuzzleState,
  layer: DataLayerType,
  id: string,
  updates: Partial<LineGroup>
): PuzzleState {
  const existingGroups = puzzle[layer].lineGroups || {};
  const existing = existingGroups[id];
  if (!existing) return puzzle;

  return {
    ...puzzle,
    [layer]: {
      ...puzzle[layer],
      lineGroups: {
        ...existingGroups,
        [id]: { ...existing, ...updates },
      },
    },
  };
}

/**
 * Add multiple line groups and update arrow directions in one operation
 */
export function addLineGroupsWithDirections(
  puzzle: PuzzleState,
  layer: DataLayerType,
  groups: LineGroup[],
  arrowDirections: Map<string, 'forward' | 'backward'>
): PuzzleState {
  const existingGroups = puzzle[layer].lineGroups || {};
  const newGroups = { ...existingGroups };
  let newLines = { ...puzzle[layer].lines };

  // Add groups
  for (const group of groups) {
    newGroups[group.id] = group;
  }

  // Update arrow directions
  for (const [lineId, direction] of arrowDirections) {
    const line = newLines[lineId];
    if (line) {
      newLines[lineId] = { ...line, arrowDirection: direction };
    }
  }

  return {
    ...puzzle,
    [layer]: {
      ...puzzle[layer],
      lines: newLines,
      lineGroups: newGroups,
    },
  };
}
