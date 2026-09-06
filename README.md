# Puzzle Kit

> **Warning**: This project is under active development. Breaking changes may occur frequently.

A web-based puzzle editor for creating and solving logic puzzles. Built with React + TypeScript + Vite.

**Demo:** https://puzzle-kit.logicpuzzle.app/

## Features

- Multiple grid types: Square, Hexagonal, Triangular, Isometric (3D cube)
- Drawing tools: Lines, surfaces, numbers, symbols, cages, thermometers, arrows
- Problem/Answer layer separation
- Export/Import puzzles as JSON
- PNG export
- Undo/Redo support

## Getting Started

```bash
# Install locked dependencies
npm ci

# Copy environment file and configure Firebase (optional)
cp .env.example .env.local

# Start development server
npm run dev

# Build for production
npm run build

# Build library artifacts
npm run build:lib
```

## Development and QA

See [Testing and development harness](docs/testing.md) for unit/E2E commands,
local scenario debugging, and before/after video capture. The latest verification is in [editor QA results](docs/qa/2026-09-06-editor-quality.md),
with [before/after recordings](docs/qa/evidence-editor-quality-20260906/README.md).

## Solver Backend

Solver features are bundled in this repo under `puzzle-kit/solver`, so no extra install
steps are required for solver functionality.

## NPGenerator WebAssembly

Choose **New → NPGenerator…** to open the Number Place generator. The dialog
exposes solve/evaluate, pattern generation, symmetric random generation,
benchmarking, all solver-method and uniqueness switches, difficulty bounds,
forbidden numbers, sizes 2–25, rectangular/random/custom blocks, diagonal
constraints, deterministic seeds, and NPGenerator XML import/export.

The checked-in Wasm artifact is rebuilt from the verified Rust port with:

```bash
npm run build:npgen-wasm
```

Generation runs in a Web Worker so the editor UI remains responsive.

### Browser test

Install the Playwright-managed Chromium binary once, then run the NPGenerator
end-to-end test:

```bash
npx playwright install chromium
npm run test:e2e
```

## Library Usage

Headless and embedded-UI usage entrypoints are documented here:
- `puzzle-kit/docs/library-usage.md`

Embedded example page:
- `puzzle-kit/docs/embedded-example.md`

## Environment Variables

Firebase integration is optional. To enable it, create `.env.local` with your Firebase credentials:

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
...
```

See `.env.example` for all available options.

## Acknowledgments

This project is inspired by these wonderful tools:

**pzpr family**
- [pzprjs](https://github.com/sabo2/pzprjs)
- [pzpr-puzzlink](https://github.com/robx/pzpr-puzzlink)

**penpa family**
- [penpa-edit (original)](https://github.com/opt-pan/penpa-edit/)
- [penpa-edit (enhanced)](https://github.com/swaroopg92/penpa-edit)

**Kudamono editor**
- [Kudamono](https://pedros.works/kudamono/)

## License

The pre-existing Puzzle Kit source is MIT-licensed; see [LICENSE](LICENSE).
The bundled NPGenerator Wasm component is GPL-3.0-or-later. See
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) before distributing the
combined application.
