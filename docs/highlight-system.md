# Constraint Highlight System (Design Draft)

## Background
Puzzle-kit already supports constraint presets with:
- Edit rules (problem input)
- Play rules (answer input)
- Check rules (validation)

The request is to add a new preset-driven feature: **Highlight**.
Highlight is a dynamic, derived visual layer that reacts to the current puzzle state
and can:
- change cell colors (fills),
- change text colors (numbers/clues),
- draw overlay marks (aux symbols).

Examples from puzz.link-style behavior:
- Akari (Light Up): highlight cells lit by lamps (cross-shaped beam).
- LITS: highlight rooms that contain a completed tetromino (puzz.link autocmp behavior).
- Norinori: highlight rooms that contain exactly two shaded cells.
- Choco Banana: no autocmp-style highlight (puzz.link does not highlight regions).
- Yajilin: gray out a clue number after the required count is satisfied.

This document proposes a puzzle-kit-oriented design that is generic, data-driven,
and consistent with existing constraints/validation patterns.

## Current Architecture (Summary)
- `ConstraintSchema` has `problem`, `answer`, `validation` rule lists.
- UI has `constraintSubCategory`: common/edit/play/check.
- `PuzzleCanvas` renders layered SVG (surface, lines, symbols, numbers, etc.).
- Validation is plugin-based (`constraints/validators` with registry).

There is no generic highlight layer yet. Existing highlights are limited to UI
selection/cursor states (e.g., line selection, cursor cell highlight).

## Goals
1. Preset-aware: highlight rules are part of each constraint schema.
2. Dynamic: highlight reflects current input and puzzle state.
3. Non-destructive: highlight does not modify puzzle data.
4. Flexible: supports fills, text color overrides, and overlay symbols.
5. Efficient: avoid heavy recomputation on every render.

## Design Proposal

### 1) Add a Highlight section to ConstraintSchema
Introduce a new schema section:
- `highlight: HighlightRule[]`

This is parallel to `problem/answer/validation` but it is **visual** and **dynamic**.
Each highlight rule can be enabled/disabled similar to validation rules.

### 2) HighlightRule and HighlightOutput
We need a generic representation of highlight results that can feed the renderer.

**Proposed types (draft):**
```ts
export type HighlightScope = 'problem' | 'answer' | 'both';

export interface HighlightRule {
  id: string;
  scope: HighlightScope;
  title: string;       // i18n key
  description: string; // i18n key
  defaultOn?: boolean;
  // optional: specific display priority or group
}

export type HighlightLayerHint =
  | 'under-surfaces'
  | 'under-lines'
  | 'over-lines'
  | 'over-numbers';

export interface HighlightFill {
  cellId: string;
  color: string;
  opacity?: number;
  layer?: HighlightLayerHint;
}

export interface HighlightTextStyle {
  cellId: string;
  // apply to numbers or directional numbers at this cell
  target: 'number' | 'directional' | 'text';
  color?: string;
  fontWeight?: 'normal' | 'bold';
}

export interface HighlightOverlaySymbol {
  cellId: string;
  symbolType: string;   // reuse existing symbol types or introduce "highlight-*"
  color?: string;
  size?: number;
  opacity?: number;
  layer?: HighlightLayerHint;
}

export interface HighlightOutput {
  fills?: HighlightFill[];
  textStyles?: HighlightTextStyle[];
  overlays?: HighlightOverlaySymbol[];
}
```

### 3) Highlight Provider Registry (plugin-style)
Highlights are computed dynamically by code (like validators).
We keep the schema data-driven, and attach logic via a registry:

```ts
export interface HighlightContext {
  puzzle: PuzzleState;
  grid: GridConfig;
  schema: ConstraintSchema;
  topology: GridTopology | null;
  currentInputMode: InputMode;
  activeLayer: 'problem' | 'answer';
  // helper functions similar to ValidationContext
}

export type HighlightProvider = (ctx: HighlightContext) => HighlightOutput;

registerHighlightProvider(pid: string, ruleId: string, fn: HighlightProvider);
```

Schema highlights reference providers by `id`. This mirrors the validation registry
and keeps the schema simple.

### 4) Store / Settings / Persistence
Add to constraint state:
- `highlightOverrides: Record<ruleId, boolean>`
- `isHighlightEnabled: boolean`

Persist in `constraintSettings` (export/import) alongside validation overrides.

### 5) Rendering Integration
Add a new `HighlightLayer` into `PuzzleCanvas`:

Suggested order:
1) Grid + background
2) Surface fills
3) **Highlight fills** (under surfaces or under lines, depending on rule)
4) Lines / symbols
5) **Highlight overlays** (over lines)
6) Numbers / directional numbers
7) **Text color overrides** (applied inside NumberLayer / DirectionalClueLayer)

Text overrides should be applied by the relevant layer (numbers or directional numbers)
using a `highlightTextStyles` map keyed by cellId.

This avoids re-drawing full text overlays and prevents z-order conflicts.

### 6) UI
Add `highlight` to `ConstraintSubCategory` and UI tabs:
- Common / Edit / Play / Check / Highlight

New panel should list highlight rules for the current preset, with toggles.
Optionally add a global "Enable highlight" toggle.

## Example Implementations

### Akari (Light Up): Light Beam Highlight
Reuse logic from validator (`getVisibleCells`) to compute lit cells.
Highlight output:
- `fills`: yellow translucent fill for lit cells
- optional overlays: conflict marks where two lights see each other

### LITS: Tetromino Region Highlight
Use shaded cells to detect each tetromino group (size 4).
Highlight output:
- `fills`: green translucent fill for cells in the same tetromino
Potential additional overlay for invalid group size or adjacency.

### Yajilin: Clue Count Used
Reuse directional number parsing and `countShadedInDirection`.
Highlight output:
- `textStyles`: gray out directional number when count matches
- optional: red if count exceeds

## Performance and Caching
- Highlight output should be memoized using `useMemo` or selector patterns.
- Providers should declare dependencies (e.g., uses surfaces/lines/numbers).
- Avoid full recompute on every mouse move; recompute on puzzle state changes.

## Open Questions
1) Should highlight be available in both editor and player, or player-only?
2) Should highlight respect trial layers (showing trial state only)?
3) How should highlight interact with multi-color surfaces and solution area masks?

## Implementation Steps (Suggested)
1) Add types: `HighlightRule`, `HighlightOutput`, `HighlightContext`.
2) Add registry + default highlight list (empty) with no runtime changes.
3) Add store state for highlight overrides + enable flag.
4) Add `HighlightLayer` and text override plumbing.
5) Add UI tab for highlight settings.
6) Implement initial providers for Akari, LITS, Yajilin.
7) Document per-puzzle highlight rules.

## Notes on puzz.link
Local `pzprjs` sources do not expose a generic "highlight" module.

## LITS (puzz.link / pzprjs behavior)
- Triggered by `autocmp` (default: on). No highlight when autocmp is off.
- Condition per room: exactly 4 shaded cells that are all part of the same connected component
  (orthogonal adjacency only, separated by room borders).
- Highlight is room-wide background (`qcmpbgcolor` = `rgb(96, 255, 160)` in pzprjs),
  drawn under shaded cells so black fill stays unchanged.
- It does not check other constraints (2x2 ban, overall connectivity, same-shape adjacency).

## Norinori (puzz.link / pzprjs behavior)
- Triggered by `autocmp` (default: on). No highlight when autocmp is off.
- Condition per room: exactly two shaded cells (no adjacency check for the highlight itself).
- Highlight is room-wide background (`qcmpbgcolor` = `rgb(96, 255, 160)` in pzprjs),
  drawn under shaded cells so black fill stays unchanged.
Highlight-like behaviors appear puzzle-specific. The registry approach above
matches that model while keeping puzzle-kit’s constraints data-driven.
