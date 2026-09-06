# QA evidence — 2026-09-06

Representative recordings retained in Git so reviewers can compare them after cloning. Open `index.html` locally for side-by-side playback. Full Playwright traces and reports remain in the original workspace under `artifacts/`.

| Flow | Before | After |
| --- | --- | --- |
| Free Segment / Undo / Redo | [Video](free-segment-before.webm) — no line, getToolCategory ReferenceError | [Video](free-segment-after.webm) — line committed, Undo/Redo succeeds |
| Number ArrowRight | [Video](arrow-key-before.webm) — key ReferenceError | [Video](arrow-key-after.webm) — two cells entered |

Recordings use the same desktop test actions, 1280×720 Chromium. Before/after captures both started at HEAD `511a926`; the after working tree contains the two input fixes. These recordings were made in the original workspace, which also contained uncommitted Yajilin changes excluded from this PR. `manifest.json` identifies the capture folders and video hashes.

Known layout defects: [Mobile Master](mobile-master.png), [Mobile Paint](mobile-paint.png). Neither is fixed by this PR.
