# LITS border editing and text access — QA 2026-09-09 JST

Before application: develop `d683f056a4b18ed025af1e8c4e79b7da50e4f2c1`.
After application/tests: `146680af2d29e6d56177d86bf70c87235ad0827b`.
Subsequent evidence/documentation commits do not change application or test code.
Related: #10 (partial), #33 (LITS follow-up).

## Results

| Check | Result |
| --- | --- |
| Solver source maps; application and E2E type checks | PASS |
| Unit | 1,078 passed, 71 files |
| E2E, Chromium/WebKit desktop and mobile | 288 passed, 8 existing recording-only skips; no failures or retries |
| Production build | PASS, no build warnings |
| Production Chromium desktop/mobile smoke | 44 passed; no failures, skips or retries |
| Before/after evidence | 8 videos, fully decoded; positive durations and SHA-256 recorded |

Full run: `artifacts/check/2026-09-08T19-47-00-544Z`.
Production run: `artifacts/qa/room-text-production`.
Before run: `artifacts/qa/room-text-before-verified` (4 expected regression failures, no browser exceptions).

## Reproduction and verified behavior

| Case | Before | After |
| --- | --- | --- |
| LITS: 6×6 single-room map, horizontal I shaded; draw a full vertical divider through it | Still Correct; entire room remains highlighted | Incorrect: each new room has only two shaded cells; no completion highlight |
| Undo/Redo of that divider | Stale map does not follow the border | Undo restores Correct; Redo restores Incorrect |
| Autosave/reload after dividing | Obsolete room partition is retained | Edited partition and Incorrect result persist |
| Free text entry from the main toolbar | Text category is absent | Text → Free Text → cell opens the text dialog |
| Multiline text, reload and edit | Main toolbar cannot reach the tool | `A:B` + Japanese second line survives reload; replacing it keeps one text entry; Undo restores the previous text |

The browser tests use the store API only for deterministic initial board/tool setup and state assertions. LITS Border selection, drawing, Check Answer, text tool selection, text editing, Undo/Redo and reload use browser interactions. The text test never selects its tool through the store API.

Additional Unit checks verify map-only JSON imports receive editable border lines; erasing one border opens a room; incomplete dividers persist until closed; Undo/Redo and JSON roundtrips preserve the resulting partition; malformed maps remain invalid; answer/freehand lines and other genres do not trigger room-map synchronization.

## Evidence

- [Before/after video index](evidence-room-text-20260909/index.html)
- [Video checksums, durations and source revisions](evidence-room-text-20260909/evidence.json)
- [LITS before — Chromium](evidence-room-text-20260909/lits-chromium-before.webm) / [after](evidence-room-text-20260909/lits-chromium-after.webm)
- [Text before — Chromium](evidence-room-text-20260909/text-chromium-before.webm) / [after](evidence-room-text-20260909/text-chromium-after.webm)
- [LITS before — mobile Chrome](evidence-room-text-20260909/lits-mobile-chrome-before.webm) / [after](evidence-room-text-20260909/lits-mobile-chrome-after.webm)
- [Text before — mobile Chrome](evidence-room-text-20260909/text-mobile-chrome-before.webm) / [after](evidence-room-text-20260909/text-mobile-chrome-after.webm)

Earlier exploratory runs had selector/setup errors and are excluded from the evidence. The selected before run fails at the actual regressions: Incorrect is absent after dividing the LITS room; Text is absent from the toolbar.

## Scope

Mobile means Pixel 7/iPhone emulation, not physical-device QA. New interaction regressions run against the development harness; the 44 production checks cover shipped entrypoints, persistence and workers, not every new interaction.

Room synchronization is limited to square LITS boards. Imported map-only boundaries become visible/editable lines. Invalid maps retain their validation error. Grid geometry changes and other room-based genres require separate investigation. Number/text input unification and freely positioned text boxes in #10 remain open.

UI/design review notes remain in ignored `.work/ui-review/` and are not published.
