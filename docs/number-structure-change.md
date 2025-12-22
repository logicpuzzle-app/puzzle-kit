# Number Structure Changes (Directional Numbers Unification)

## Summary
Directional numbers are now represented as `NumberElement` entries with `direction`/`angle` instead of a separate storage path. The legacy `directionalClues` record is retained only for import/export compatibility and is no longer stored in puzzle state.

## Before
- Directional numbers lived only in legacy `directionalClues` (Penpa-style).
- `numbers` contained only non-directional values (center/corner/side/candidates).
- Rendering/input/validation/export often branched on the two different stores.

## After (Current)
- `NumberElement` has optional `direction` and `angle`.
- A number with `direction` or `angle` is treated as a directional number.
- Legacy `directionalClues` exists only in import/export payloads, not in internal state.

## Data Model
- `NumberElement` (in `src/types/index.ts`):
  - New fields: `direction?: 0|1|2|3|4`, `angle?: number | null`.
  - Directional numbers remain `position: 'center'`.
- Directional detection:
  - `isDirectionalNumber` in `src/utils/numberEntries.ts`.
- Conversion to legacy clue:
  - `toPenpaDirectionalClue` in `src/utils/numberEntries.ts`.

## Import/Export Normalization
- Import normalization:
  - `mergeDirectionalCluesIntoNumbers` (`src/utils/legacyDirectionalClues.ts`) converts legacy clues into directional numbers.
- Directional number extraction:
  - `getDirectionalCluesFromElements` derives Penpa-style clues from numbers for export.

## Rendering
- Directional rendering reads numbers first:
  - `src/components/canvas/DirectionalClueLayer.tsx`
- Trial rendering skips directional numbers:
  - `src/components/canvas/TrialStackLayer.tsx`

## Input Paths
- Keyboard, click, panels now read directional numbers first:
  - `src/hooks/useNumberKeyboard.ts`
  - `src/components/canvas/InputHandlerLayer.tsx`
  - `src/components/panels/properties/NumberInputPanel.tsx`
  - `src/components/panels/properties/ArrowDirectionSettings.tsx`
  - `src/components/panels/properties/ColorSelector.tsx`

## Export/Import/Validation/Solver
- Import/load converts legacy `directionalClues` into directional numbers.
- Validation/solver/highlight resolve via `getDirectionalCluesFromElements`.
- Export (Penpa/puzz.link) uses directional numbers and avoids double-exporting:
  - `src/utils/penpaCompat.ts`
  - `src/utils/puzzlinkExporter.ts`

## Compatibility Notes
- Legacy `directionalClues` is emitted only for export compatibility.
- Importing older data with only legacy `directionalClues` generates directional numbers via merge.
*** End Patch"}}
