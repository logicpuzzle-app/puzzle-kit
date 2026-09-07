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
