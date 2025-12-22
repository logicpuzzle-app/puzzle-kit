# Library Usage (Embedded UI + Headless)

`puzzle-kit` can be consumed as a library in two modes:

- **Headless**: use core logic and (optionally) compat parsers/exporters.
- **UI embed**: use the runtime store + React components.

This is exposed as **entrypoints** under `src/lib` (logical split, no package publish required yet).

## Entrypoints

- `src/lib/core.ts`
  - Pure logic/types: `types`, `constraints`, `solver`, and key utilities.
  - Topology helpers are under the `topology` namespace.
  - Grid adjacency is exposed as `getAdjacentCellsFromGrid` (to avoid topology name collisions).
- `src/lib/compat.ts`
  - Import/export formats and legacy conversions:
    - Penpa, puzz.link, pzprv3, legacy directionalClues merge.
- `src/lib/runtime.ts`
  - Zustand store + action executor (UI-agnostic).
  - `createPuzzleStore()` returns a store + executor pair for embedded usage.
  - `createModalStore()` returns a modal store for isolated UI state.
- `src/lib/react.ts`
  - React components for embedding (`PuzzleKitApp`, `PuzzleCanvas`, panels).
  - `PuzzleStoreProvider` + `ModalStoreProvider` for supplying custom store instances.
  - `createModalStore` for per-embed modal state.

## Example (Headless)

```ts
import { PuzzleState, constraintCatalog, getDirectionalCluesFromElements } from './src/lib/core';
import { parsePuzzlinkUrl } from './src/lib/compat';

const data = parsePuzzlinkUrl('https://puzz.link/p?slither/5/5/cbcbcddad');
if (data) {
  const schema = constraintCatalog.getSchema(data.puzzleType ?? '');
  const clues = getDirectionalCluesFromElements(data.state.problem);
  // ...
}
```

## Example (UI Embed)

```tsx
import React from 'react';
import {
  PuzzleKitApp,
  PuzzleCanvas,
  PuzzleStoreProvider,
  ModalStoreProvider,
  createModalStore,
} from './src/lib/react';
import { createPuzzleStore } from './src/lib/runtime';

const { useStore } = createPuzzleStore();
const modalStore = createModalStore();

export const EmbeddedPuzzle = () => (
  <PuzzleStoreProvider store={useStore}>
    <ModalStoreProvider store={modalStore}>
      <PuzzleKitApp />
      <PuzzleCanvas />
    </ModalStoreProvider>
  </PuzzleStoreProvider>
);
```

## Example (Embedded Page)

See:
- `puzzle-kit/docs/embedded-example.md`

## Notes

- Directional numbers are stored in `numbers` with `direction`/`angle`.
- Legacy `directionalClues` exists only in compat import/export paths.
- For topology queries, use `topology.getAdjacentCells(...)` etc.
- UI components use the store from `PuzzleStoreProvider` when supplied.
- Modal state can be isolated per embed with `ModalStoreProvider`.
- Build library artifacts with `npm run build:lib` (outputs to `puzzle-kit/dist`).
- A future step can split these entrypoints into separate npm packages.
