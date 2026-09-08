# Symbol sizing — QA 2026-09-09 JST

Before application: `c0cb33a258ce24b7106b519dabea77933e53c8cf` (develop + initial QA runner improvements).
Full-regression application/tests: `e4e050d4cab6e5ef6e5e9e13a306af3fc5f0a4e4` (integrated with PR #60 and PR #61).
Final UI/evidence: `007363f5dc419f0e1c6782fa370dc5084a76e03f`. This subsequent change only draws the preview cell outline after the symbol, keeping it visible over fills. The final revision passed all 12 sizing E2E cases and all 48 production checks.
Final restoration-wait test correction: `f24cc9ee05f31b061bc058f6beef4bf726d80354`. This changes only the post-reload assertion to wait for the complete restored symbol; application/rendering and recorded UI are unchanged. Ten consecutive mobile WebKit runs passed at this correction, without retries. Related: #8.

## Results

| Check | Result |
| --- | --- |
| Solver source maps; application and E2E types | PASS |
| Unit | 1,108 passed, 74 files |
| E2E: Chromium/WebKit desktop/mobile | 312 passed, 8 existing recording-only skips; no failures or retries |
| Final sizing E2E | 12 passed across all four browser profiles; no failures, skips or retries |
| Production build | PASS, no build warnings |
| Production Chromium | 48 passed; no failures, skips or retries |
| Evidence | 8 before/after videos, 2 production videos; screenshots, exported SVG/PNG and pixel diagnostics |

Final sizing run: `artifacts/qa/symbol-sizing-preview-final`.
Full run: `artifacts/check/2026-09-08T22-01-45-535Z`.
Production: `artifacts/qa/symbol-sizing-production-preview-final`.
Before: `artifacts/qa/symbol-sizing-before`; 4 expected failures at the missing Largest button or object selector, with no browser exceptions.
The pre-integration full run `2026-09-08T21-58-14-119Z` was intentionally stopped to resolve overlap with PR #60. It is not final evidence.

Restore-wait regression: `artifacts/qa/symbol-sizing-restore-stability` (10 passed). The initial PR CI read the store immediately after reload and received no symbol before restoration finished. The final test waits for all expected symbol fields, preserving the same assertions.

## Verified behavior

Under Problem → Symbol → Properties, choose **New symbols** to set the placement default, or select an existing symbol to resize only that object. The panel preview keeps the selected symbol visible when a mobile drawer covers the board; its outline represents one cell.

| Case | Before | After |
| --- | --- | --- |
| Presets | Large / Medium / Small only | Small / Medium / Large / Largest |
| Fine sizing | No percentage control | 10–300%, in 1% steps; invalid inputs are rejected |
| Individual edits | No explicit resize target | Resize the selected circle from 70% to 175%, preserving the overlapping arrow |
| History and identity | No atomic individual resize action | Same ID, color, fill, rotation, directions and object key; one Undo/Redo restores/reapplies the size |
| Placement defaults | Direction mode may resize the arrow at the cursor | Changing the new-symbol default leaves existing objects untouched |
| Subsequent arrow edits | Size reads the placement default | Rotation and color changes retain the existing custom size |
| Saved content | Four preset strings | Preset strings remain compatible; numeric sizes survive JSON, compressed share encoding and autosave/reload |
| Output | No custom-size UI | Real placement renders a circle with radius 28 at 175%; downloaded SVG and PNG preserve this size |

Unit tests cover invalid and boundary values, no-op history, missing targets, inactive layers, Player problem protection, answer editing, overlapping objects, metadata, legacy rendering and SVG export. Size resolution is shared by board rendering, solver overlays and arrow previews; numeric palette previews fit the existing buttons.

The editing tests use the development store API only to prepare fixtures and inspect results. Their edits/history/reload use browser interactions; mobile resizing uses a Playwright tap. The production placement test uses UI controls and a real canvas click/tap, then downloads both images via File. It reads localStorage only to wait for autosave before reloading; no development store API is used. PNG assertions sample the expected black circle edge in the decoded download.

## Evidence

- [Screenshot/video comparison index](evidence-symbol-sizing-20260909/index.html)
- [Revisions, durations and SHA-256](evidence-symbol-sizing-20260909/evidence.json)
- Desktop UI: [before](evidence-symbol-sizing-20260909/resize-chromium-before.png) / [after](evidence-symbol-sizing-20260909/resize-chromium-after.png)
- Mobile UI: [before](evidence-symbol-sizing-20260909/resize-mobile-chrome-before.png) / [after](evidence-symbol-sizing-20260909/resize-mobile-chrome-after.png)

All videos have positive durations and are fully decoded with ffmpeg. Native Chromium playback and seeking passed for all 10 videos.

## Scope

This addresses the sizing portion of #8; the existing symbol category/search interface is retained. Preset values are unchanged: small 0.5, medium 0.7, large 1, largest 1.3. Custom values are cell-relative render scales, so individual glyphs retain their built-in margins. Malformed imported sizes use the legacy small rendering fallback. Editing other properties continues to use existing controls.

Mobile QA uses browser emulation, not physical hardware. UI/design review notes remain in ignored `.work/ui-review/` and are not pushed. PR #60's Special editing and PNG fixes are included in the final integrated regression run.
