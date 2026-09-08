# Priority issue fixes — QA 2026-09-09 JST

Before: develop `cf8c60554a3bdcfda531e0dc90355fff2a288639`.
After: `b6a195a83773b6cc24e9fb64d941daea5362a844` (subsequent documentation commit does not change application or test code).
Related: #10, #13, #15, #33. These broad feature issues are not automatically closed by this change.

## Results

| Check | Result |
| --- | --- |
| Solver source maps | PASS |
| Application and E2E type checks | PASS |
| Unit | 1,073 passed, 71 files |
| E2E, Chromium and WebKit desktop/mobile | 280 passed, 8 existing recording-only skips; no failures or retries |
| Production build | PASS; no build warnings |
| Production Chromium desktop/mobile | 44 passed; no failures, skips or retries |
| Before/after evidence | 30 videos fully decoded; positive durations and SHA-256 recorded |

Full local run: `artifacts/check/2026-09-08T16-33-46-132Z`.
Production run: `artifacts/qa/issue-fixes-production-20260909`.

## Verified behavior

| Case | Before | After |
| --- | --- | --- |
| LITS, one room with two shaded cells | Correct | Incorrect (`bkNotLits`) |
| LITS, valid I tetromino | Correct | Correct |
| LITS, forbidden O tetromino | Room completion highlight despite incorrect answer | No completion highlight; incorrect answer |
| Free Text `A:B` | Displays/reopens as `A` | Displays/reopens literally |
| Text edit `ABC` → `DEF` | Two overlapping entries | One entry; Undo restores `ABC` |
| Clear existing text | No deletion on empty submit | Deletes; Undo restores |
| Long/multiline text | Single-line input; 20 characters overflow a cell | Multiline input; wrapping and fitting; survives reload |
| Long/short snapped segments | Two overlapping records, persisted | One union; contained additions are no-ops; Undo/Redo/reload verified |
| Full/half snapped segments | Duplicate records | One record |
| Black number/text on black surface | Invisible | White; white-cell text remains black |
| Akari/Yajilin highlights | Existing visual helpers | Akari beams and Yajilin 0/1/2 shading controls retained |

Additional Unit checks cover tetromino rotations/reflections, empty rooms, same-shaped adjacent rooms, unavailable validation functions, dot markers, JSON room metadata, post-load text history, legacy line overlaps, and visible background composition.

## Evidence

- [Before/after video index](evidence-issue-fixes-20260909/index.html)
- [Checksums and durations](evidence-issue-fixes-20260909/evidence.json)
- [LITS/Yajilin control results before](evidence-issue-fixes-20260909/controls-before.json) / [after](evidence-issue-fixes-20260909/controls-after.json)
- [Two-cell LITS before](evidence-issue-fixes-20260909/before-lits-two-validation.png) / [after](evidence-issue-fixes-20260909/after-lits-two-validation.png)

The 14 primary pairs use desktop Chromium and Pixel 7 emulation. One additional desktop control pair reuses the prior investigation script. Fixtures initialize board/tool data through the development store API; drawing, text dialogs and Check Answer use the browser UI. After recordings include additional regression steps, so clip lengths differ. Mobile profiles are emulation, not physical-device QA. Exported screenshots and representative video frames were visually inspected.

The initial exploratory E2E selectors were corrected for post-reload tool selection and the modal Close button. An intermediate run affected by development reload was discarded. Only the fixed-commit full run above is used for the after evidence. Default Unit concurrency caused the pre-existing Solver cold-import test to exceed its unchanged five-second timeout twice; limiting Vitest to two workers yielded the clean full run.

## Scope

Freehand strokes, directed/grouped lines, and endpoint-only contact retain their behavior. Automatic text color applies to neutral black/white text over supported cell backgrounds; mixed multicolor cells retain their saved text color, and image-local contrast is not analyzed. Cell fitting can make very long text small; freely positioned text boxes remain outside this change. LITS uses supplied room maps when present, or derives rooms from drawn square-grid borders when absent. Logical auto-completion and custom preset editing remain separate work.

UI/design review documents remain in ignored `.work/ui-review/` and are not part of this commit.
