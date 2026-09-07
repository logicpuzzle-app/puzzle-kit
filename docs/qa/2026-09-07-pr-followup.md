# PR follow-up QA — 2026-09-07

## Directional number history

On quality 88d023d, entering 5 in Arrow Number rendered a clue but left Undo disabled. The same browser test now covers insertion, replacement (5 → 6), deletion and their Undo/Redo through the real /master UI. Desktop and mobile Chromium passed after the fix. Six store regressions cover both layers, full clue metadata, normal/directional conversion with corner notes, gesture grouping, redo invalidation and protected problem data. Before: 5 failed / 1 passed. After: 6 passed; related edit-policy/number tests also passed (32 total). Both typechecks passed.

Number replacement records removal and insertion in one batch, preserving an outer gesture group. Directional operations use the shared number history path.

| Recording | Before | After |
| --- | --- | --- |
| Desktop Chromium | [Undo disabled](evidence-pr-followup-20260907/directional-before-chromium.webm) | [Insert/replace/delete + Undo/Redo](evidence-pr-followup-20260907/directional-after-chromium.webm) |
| Mobile Chromium | Not recorded in this run | [Same flow](evidence-pr-followup-20260907/directional-after-mobile-chrome.webm) |

[Metadata and video checksums](evidence-pr-followup-20260907/metadata.json). Capture metadata records HEAD, working-tree status and command; full local captures also contain the working diff and source manifest. The accepted before capture is 2026-09-07T11-42-19-706Z-before. Two earlier selector probes (11:40:31, 11:41:48 UTC) are diagnostics, excluded from before/after evidence.

## Marker keyboard input (#46)

Ported the marker shortcut from PR #46 onto the current numeric/kana keyboard handlers. Numeric and directional entry accept `?` and `.` and support replacement, deletion, Undo/Redo. The original kana/word handlers remain in place. Desktop and mobile Chromium: 6/6 number-history tests passed (the directional digit case plus both marker cases on each viewport). The old patch did not apply to the current hook; the 11:45:26 capture predates the completed port and is excluded as an After result.

| Flow | Before | After |
| --- | --- | --- |
| Normal markers | [Not accepted](evidence-pr-followup-20260907/marker-normal-before-chromium.webm) | [Entry + history](evidence-pr-followup-20260907/marker-normal-after-chromium.webm) |
| Directional markers | [Not accepted](evidence-pr-followup-20260907/marker-directional-before-chromium.webm) | [Entry + history](evidence-pr-followup-20260907/marker-directional-after-chromium.webm) |

## Selected-cell appearance (#45)

Ported PR #45 settings and persistence to quality, keeping quality's current green default (#00A000) and width 3. Both the last-tapped Surface cell and Number selection outline use the setting; hover/other preview styles are unchanged. Thickness is compensated for zoom, so width 8 means 8 CSS pixels on screen. Existing transforms and symbol rotation rendering are retained.

Surface/Number color and width changes, persisted settings and reload: 4/4 Chromium cases passed across desktop/mobile. Persistence Unit tests explicitly isolate Web Storage from Node's experimental global implementation; browser tests exercise real localStorage. The 11:45:52 cursor capture was an initial Grid-toggle selector probe and is excluded. Accepted before: 11:48:12; after: 11:49:51 UTC.

| Flow | Before | After |
| --- | --- | --- |
| Surface | [Setting absent](evidence-pr-followup-20260907/cursor-surface-before-chromium.webm) | [Configure + reload](evidence-pr-followup-20260907/cursor-surface-after-chromium.webm) |
| Number | [Setting absent](evidence-pr-followup-20260907/cursor-number-before-chromium.webm) | [Configure + reload](evidence-pr-followup-20260907/cursor-number-after-chromium.webm) |


## Production and persistence coverage

Added `qa:production` to CI after the build. The accepted local preview run passed 14/14 Chromium cases (desktop/mobile) against the built assets: number history, markers, both selection cursors, puzzle autosave/reload with new undoable edits, and seeded Wasm generation. The persistence flow explicitly preserves the existing click-to-increment behavior (5 → click 6 → type 7 → Undo 6 → Undo 5). Node 22.21.1 and Node 25.2.1 both passed the three cursor persistence Unit tests.

Rot2 regression now uses explicit PRNG seeds 1 and 2 and asserts a successful result for each run; two repeated desktop Chromium cases passed. Initial production-config exploration accidentally inherited extra servers/projects, and its persistence assertion assumed selection would not increment a clue. That diagnostic run is excluded; the final config replaces the servers/projects and the corrected test retains the product's existing click behavior.


## Clean integration verification

Verified application commit `491d91c` in a new detached worktree, with its own `npm ci` and no copied node_modules or sibling source checkout. It includes latest develop `f459e07`, quality through #54, the directional-history fix, and ports of #45/#46. The develop merge conflict was only a deletion comment; the current keyboard implementation was retained. Production config commit `1624d3a` additionally shares one artifact directory across workers and was reverified against the same built application.

| Check | Result |
| --- | --- |
| npm ci | PASS |
| typecheck / typecheck:e2e | PASS / PASS |
| Unit | 1,022 passed / 64 files |
| Full E2E | 192 passed / 8 existing recording skips / 0 failed / 0 flaky |
| Production build | PASS |
| Production Chromium | 14 passed / 0 failed / 0 skipped |

[Machine-readable results](evidence-pr-followup-20260907/clean-check-summary.json) · [5 before/after comparisons + 5 mobile after videos](evidence-pr-followup-20260907/index.html). All 15 committed videos fully decode with ffmpeg and match their SHA256 metadata. Cursor screenshots were also inspected visually. Build output retains pre-existing solver export/manual-chunk size/cycle warnings; successful smoke tests cover the listed editor and Wasm flows, not every bundled solver.

Wasm regeneration now accepts an explicit Rust source path; missing arguments and missing Cargo.toml both fail with actionable messages (exit 2). Normal clean build uses the committed Wasm. The optional Rust/wasm-pack rebuild was not run in this verification.
