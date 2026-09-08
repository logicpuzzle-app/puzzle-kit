# Special tip editing — QA 2026-09-09 JST

Before: develop `355232b53991a5a8459a804fb610e41c0fcfb7b2` (PR #59 merged).
After application/tests: `996d78c573786336b02d2209a6297fd000a453ff`.
Later evidence/documentation commits do not change application or test code.
Related: #30.

## Results

| Check | Result |
| --- | --- |
| Solver source maps; application and E2E type checks | PASS |
| Unit | 1,089 passed, 73 files |
| E2E, Chromium/WebKit desktop/mobile | 300 passed, 8 existing recording-only skips; no failures or retries |
| Production build | PASS, no build warnings |
| Production Chromium smoke | 46 passed; no failures, skips or retries |
| Before/after evidence | 12 videos, positive duration, fully decoded, SHA-256 recorded; Chromium playback/seek passed for all 12; selected-object screenshots included |

Full run: `artifacts/check/2026-09-08T20-49-30-595Z`.
Production: `artifacts/qa/special-tip-production-png-final`.
Before: `artifacts/qa/special-tip-before` (4 expected failures: the object-edit selector is absent; no browser exceptions).
PNG before: `artifacts/qa/special-png-before`, application `5fdbbeb6e646700b15f30c81c7e346b8aa32242d` (2 expected failures: actual toolbar download is a 32 × 32 icon). Intermediate runs are excluded from final after evidence.

## Reproduction and verified behavior

Choose Problem → Special → Arrow or Thermo → Properties. Select the object in Object to edit; the path and tip are highlighted on the board and in the panel preview, so the mobile drawer does not obscure the editing target. Shorten tip removes its last point. At two points, shortening is disabled; Delete object is a separate action.

| Case | Before | After |
| --- | --- | --- |
| Arrow/thermo partial editing | No object-selection or tip-shortening controls | Select an object and shorten 4 → 3 → 2 points |
| Overlapping objects | Right-click deletes an entire matching object | Only the selected object changes; the other object remains identical |
| Shortening history | No shortening action | One Undo restores the prior path; Redo reapplies it |
| Autosave/reload | No shortened state to save | Same ID, color, metadata and shortened path survive reload |
| Minimum length | No partial edit | Two-point minimum; button disabled; separate deletion can be undone |
| Toolbar PNG target | First SVG in the document: a 32 × 32 toolbar icon | Explicit board SVG; default board exports at 800 × 800 with its arrow; pan/zoom and UI overlays removed |
| Image export while selected | No new selection preview | Preview is excluded, while the actual arrow and on-screen selection remain intact |

The PNG test draws an arrow, selects it and downloads through the actual toolbar; it runs against both dev and production builds without the store API. Assertions check output dimensions, an opaque black arrow-shaft pixel and absence of blue selection pixels. The desktop test also confirms selection remains visible on screen after export. Mobile closes the modal drawer to access the toolbar, which clears selection; selection-exclusion coverage comes from desktop.

The tip-editing tests seed deterministic objects through the development store API. Tool selection, object selection, shortening, deletion, history and reload use browser interactions. Mobile profiles use an actual Playwright tap for the shortening button. Unit tests additionally cover repeated points, missing IDs, polygons, inactive layers, Player restrictions, answer-layer edits, JSON roundtrips and SVG export filtering.

## Evidence

- [Before/after video index](evidence-special-tip-20260909/index.html)
- [Checksums and durations](evidence-special-tip-20260909/evidence.json)
- [Arrow: Chromium before](evidence-special-tip-20260909/arrow-chromium-before.webm) / [after](evidence-special-tip-20260909/arrow-chromium-after.webm)
- [Arrow: mobile before](evidence-special-tip-20260909/arrow-mobile-chrome-before.webm) / [after](evidence-special-tip-20260909/arrow-mobile-chrome-after.webm)
- [Thermo: Chromium before](evidence-special-tip-20260909/thermo-chromium-before.webm) / [after](evidence-special-tip-20260909/thermo-chromium-after.webm)
- [Thermo: mobile before](evidence-special-tip-20260909/thermo-mobile-chrome-before.webm) / [after](evidence-special-tip-20260909/thermo-mobile-chrome-after.webm)

- [PNG: Chromium before](evidence-special-tip-20260909/png-chromium-before.webm) / [after](evidence-special-tip-20260909/png-chromium-after.webm)
- [PNG: mobile before](evidence-special-tip-20260909/png-mobile-chrome-before.webm) / [after](evidence-special-tip-20260909/png-mobile-chrome-after.webm)

## Scope

The feature removes the last stored point/segment, which may span multiple cells; it does not promise a one-cell distance. It supports arrow and thermo Special objects, not polygons, cages, BoxLine or arbitrary middle-path editing. Existing drawing and right-click deletion remain available.

Mobile means browser device emulation, not physical hardware. Tip-editing tests use the dev harness for setup; production smoke covers shipped entrypoints, persistence, workers and real toolbar PNG export. UI/design notes remain in ignored `.work/ui-review/` and are not pushed.
