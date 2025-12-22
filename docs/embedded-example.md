# Embedded Example (React)

This is a minimal embedding example that wires a custom store into the UI.

Path: `puzzle-kit/src/examples/EmbeddedExample.tsx`
Entry: `puzzle-kit/embedded.html` (uses `puzzle-kit/src/embedded.tsx`)

```tsx
import React from 'react';
import { EmbeddedExample } from './src/examples/EmbeddedExample';

export const App = () => <EmbeddedExample />;
```

Notes:
- Uses `createPuzzleStore()` to create an isolated puzzle store instance.
- Uses `createModalStore()` + `ModalStoreProvider` to isolate modal state.
- Provides the stores via `PuzzleStoreProvider` + `ModalStoreProvider`.
- Renders `PuzzleCanvas` + a small set of panels.
