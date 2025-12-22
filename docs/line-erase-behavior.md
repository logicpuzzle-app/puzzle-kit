# Line Erase Behavior (Investigation Notes)

This document summarizes how line-like tools are implemented today, why "paint-to-erase" can fail, and where the behavior diverges across tool types.

## Current Architecture

Line drawing is split across three separate tool categories and handlers:

1) Cell-center lines (tool category: `line`)
   - Handler: `puzzle-kit/src/hooks/tool-handlers/useLineToolHandler.ts` → `handleLineTool`
   - Used for puzzles with `schema.lineTarget = 'cell'` (e.g., simpleloop, mashu, yajilin)

2) Edge lines (tool category: `edge`)
   - Handler: `puzzle-kit/src/hooks/tool-handlers/useLineToolHandler.ts` → `handleEdgeTool`
   - Used for vertex-to-vertex edges (e.g., slitherlink)

3) Walls (tool category: `wall`)
   - Handler: `puzzle-kit/src/hooks/tool-handlers/useLineToolHandler.ts` → `handleWallTool`
   - Uses `lineTarget = 'wall'` in the unified line representation

The dispatcher is in `puzzle-kit/src/hooks/useCanvasInteraction.ts`:
- `line` → `handleLineTool`
- `edge` → `handleEdgeTool`
- `wall` → `handleWallTool`

## How Toggle/Erase Works Today

### 1) Line tool (`handleLineTool`)
- On drag, it computes a path of segments using:
  - `findNearestGridPoint`
  - `getInterpolatedPath`
- Each segment resolves a line ID using `generateLineId(from, to)`.
- Existing line lookup is by `layerData.lines[lineId]`.
- Action selection:
  - Uses `determineLineAction()` for each segment.
  - Removal only happens when `existingColor === targetColor`.

### 2) Edge tool (`handleEdgeTool`)
- Uses vertex adjacency.
- Existing line lookup scans:
  - `layerData.lines` where `lineTarget === 'edge'`
  - (fallback) legacy `layerData.edges`
- Action selection:
  - `determineLineAction()` per segment.
  - Removal only happens when `existingColor === targetColor`.

### 3) Wall tool (`handleWallTool`)
- Similar to edge, but uses `lineTarget === 'wall'`.
- Also depends on `existingColor === targetColor` to remove.

## Known Design Mismatches That Block “Paint-to-Erase”

1) **Color-dependent remove**
   - `determineLineAction()` only removes when the existing line’s color matches the current tool color.
   - If the line was created with a different color (or tool color changed), overpainting will "replace" (remove+add) or keep the line, not erase it.
   - Result: "painting does nothing" if colors don't match.

2) **Topology mode ID mismatch for cell-lines**
   - When topology is enabled, `addLine()` creates IDs using:
     - `id = "${lineTarget}-${edgeId}"`
   - But `handleLineTool` looks up by `generateLineId(from, to)` (e.g., `line-cell-...-cell-...`).
   - Existing lookup fails → `existingColor` is treated as `null` → no removal.
   - File: `puzzle-kit/src/store/slices/elementsSlice.ts` (ID generation)
   - File: `puzzle-kit/src/hooks/tool-handlers/useLineToolHandler.ts` (lookup)

3) **Freehand lines never erase**
   - In freehand mode, `handleLineTool` only adds segments.
   - There is no “erase” path for freehand lines.

4) **Edge/Wall logic is separate**
   - Edge and wall handlers do not share the same path/ID lookup as line tool.
   - There is no single unified "line element resolver" used by all three tools.

## Where to Fix (Unification Points)

If the goal is "paint over any line to erase" regardless of line type:

- Introduce a shared helper:
  - Resolve line by **either**:
    - normalized endpoints, or
    - `lineTarget + edgeId`
  - Return a consistent `existingLine` for both topology and non-topology.
  - Candidate location: `puzzle-kit/src/utils/lineNormalization.ts` or a new `lineLookup.ts`.

- Decide and document a global **erase policy**:
  - Option A: remove whenever a line exists (ignore color).
  - Option B: remove only when color matches (current behavior).
  - Option C: add a "toggle mode" flag in tool settings.

- Normalize all three handlers (`line`, `edge`, `wall`) to use the same helper and policy.

## Files Involved (for review)

- `puzzle-kit/src/hooks/tool-handlers/useLineToolHandler.ts`
  - `handleLineTool`
  - `handleEdgeTool`
  - `handleWallTool`
- `puzzle-kit/src/utils/lineUtils.ts`
  - `determineLineAction`
  - `determineSegmentAction`
- `puzzle-kit/src/store/slices/elementsSlice.ts`
  - `addLine` (line ID generation)
- `puzzle-kit/src/utils/lineNormalization.ts`
  - `generateLineId`, `normalizeSegmentEndpoints`

## Summary

The current system splits line drawing into multiple handlers and relies on color-matching for erase. In topology mode, cell-line IDs diverge between lookup and storage. These design splits explain why "paint-to-erase" can fail even when the line tool is active. A unified line lookup + a single erase policy would resolve this across line/edge/wall tools.
