# Production build warning cleanup — 2026-09-08 JST

Baseline: `9abcb4f4aab972262add5da823b59d7393be70df` (merged PR #55).
Implementation: `09380ff` on `feature/build-warning-cleanup`.

## Build results

| Check | Before | After |
| --- | --- | --- |
| Circular chunk warnings | 4 | 0 |
| Chunk-size warnings | 1 | 0 |
| Largest application JavaScript chunk, minified | vendor: 586.49 kB | pdf: 333.77 kB |
| Shared vendor chunk, minified | 586.49 kB | 251.97 kB |
| Production build | Pass with warnings | Pass without warnings |

The old manual groups absorbed shared transitive dependencies, producing cycles between UI, panels, toolbar and dialogs. `onlyExplicitManualChunks` keeps those shared modules available for automatic splitting. Canvas and the layouts/shared UI that use it now share one group, eliminating the remaining UI/canvas cycle. PDF.js has its own chunk instead of joining the general vendor chunk. The generated static chunk dependency graph was also checked for cycles.

No warning filters or size-limit changes are used. PDF.js remains eagerly imported; this change does not claim reduced initial download size or measured loading-time improvements. The PDF worker remains a separate 1,375.84 kB asset, outside Vite's application chunk-size warning. Solver artifacts are unchanged: their missing upstream sourcemaps still produce separate development/Unit warnings, not production build warnings.

## QA and evidence

Production QA uses Playwright with desktop Chromium and Pixel 7 mobile Chromium emulation, real local HTTP assets, and actual workers. It does not represent physical-device testing.

- Before: existing 30 production checks and 14 new entrypoint/PDF checks passed.
- After: all 44 production checks passed, with no failures, skips or flaky results.
- Application and E2E type checks passed; Unit: 1,030 passed in 66 files.
- Full desktop/mobile Chromium and WebKit E2E: 252 passed, 8 existing recording-only skips, 0 failed/flaky.

New checks cover `/`, `/master`, `/edit`, `/paint`, `/play`, and `/embedded.html`. They assert successful navigation, mounted UI, and the puzzle canvas where applicable. The Paint PDF case creates a self-contained one-page vector PDF, observes the PDF worker, verifies the blue preview's pixels, imports it, and checks the resulting background image. The fixture automatically fails on uncaught browser exceptions. Existing production tests cover editor operations, persistence, solver success/errors/retry/cancellation, and NPGenerator Wasm.

[Open the before/after comparison](evidence-build-20260908/index.html), [metadata](evidence-build-20260908/metadata.json), [before build log](evidence-build-20260908/build-before.log), [after build log](evidence-build-20260908/build-after.log). Download/open the HTML locally; GitHub's source viewer does not run it. All 28 recordings were fully decoded with FFmpeg, have positive duration, and have SHA-256 checksums in metadata. PDF previews and final screenshots are included. The desktop PDF preview screenshots are pixel-identical before/after.

The before recordings use the unchanged baseline `dist` with the new test driver. The after recordings use the rebuilt implementation. An exploratory before run used an incorrect anchored accessible-name selector for the PDF thumbnail; its two test-driver failures are excluded from the passing comparison and are not reported as product bugs.

Full traces and reports remain in `artifacts/qa/build-entrypoints-before-verified`, `artifacts/qa/build-warnings-before`, `artifacts/qa/build-warnings-after`, and `artifacts/check/2026-09-07T20-10-21-591Z`. CI repeats the full checks and production QA and retains its artifacts for 30 days; the comparison evidence above is versioned independently of that retention. UI review notes remain ignored under `.work/`.

## Re-run

```sh
npm ci
npx playwright install chromium webkit
npm run qa:check
npm run build
npm run qa:production
```

For a new production recording, set `QA_ARTIFACT_DIR` to a fresh directory before running `npm run qa:production`. The production suite now includes the entrypoint/PDF scenarios in CI automatically.
