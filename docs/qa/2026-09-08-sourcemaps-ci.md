# Solver sourcemap and CI runtime cleanup — 2026-09-08 JST

Baseline: `0d6dd6587beb26f0a3ccbde75acf2534f70cf4a1` (merged PR #56).
Solver repair: `4afaee5`; CI update: `c224a8a`.

## Results

| Check | Before | After |
| --- | --- | --- |
| Missing-source warnings in the full Unit run | 193 | 0 |
| Embedded solver sources | None | 221 sources in 442 maps |
| Self-contained source/map verification | Fails on missing source | Pass |
| Unit | 1,030 passed / 66 files | 1,030 passed / 66 files |
| Application and E2E type checks | Previously verified | Pass |
| Full desktop/mobile Chromium and WebKit E2E | Previously verified | 252 passed, 8 existing recording-only skips, 0 failed/flaky |
| Production Chromium | 16 solver cases passed | All 44 production cases passed |
| Production build | No warnings | No warnings; all 87 output files byte-identical |

The source content and virtual `solver-kit:///src/…` URLs repair broken map
references without modifying solver JavaScript or declarations. Before embedding,
a fresh build of the corresponding upstream source reproduced all 884 vendored
files exactly, including both kinds of mappings. The new
`npm run check:solver-sourcemaps` compiles the embedded source entirely in memory
and checks all JavaScript, declarations, and mappings without an upstream checkout.
It is part of `qa:check` and therefore runs in CI. See the
[solver provenance and maintenance notes](../../solver/README.md).

Four isolated corruption probes confirmed rejection of missing source content,
inconsistent source content, incorrect mappings, and consistent but incorrect
source content that emits different artifacts. The baseline fails the new check
with `missing embedded source`; the repaired distribution passes. The check is
an artifact-consistency guard, not a proof of solver algorithm correctness.

`actions/setup-node` and `actions/upload-artifact` were updated from v4 to v7.
Both official v7 action definitions use Node 24:
[setup-node](https://github.com/actions/setup-node/blob/v7/action.yml),
[upload-artifact](https://github.com/actions/upload-artifact/blob/v7/action.yml).
The app's Node version remains 24 in CI, with npm caching and the same artifact
path and 30-day retention. The prior Node 20 deprecation annotation is verified
against the final PR CI run, together with successful artifact upload.

## Recordings and logs

[Open the before/after comparison](evidence-sourcemaps-20260908/index.html) and
[metadata](evidence-sourcemaps-20260908/metadata.json). Download/open the HTML
locally to play the videos; GitHub's source viewer does not execute it. There are
32 videos: 8 solver scenarios × desktop/mobile Chromium × before/after. Every
video was fully decoded with FFmpeg and checked for positive duration; metadata
includes checksums, source hashes, screenshots, and worker-result attachments.

Both runs pass. The videos establish continued UI/worker behavior; the warning
change is shown in the before/after Unit logs. The Heyawake scenario explicitly
calls the bundled worker and asserts its result; its video shows the imported
board, not an injected worker answer. The other cases exercise normal solving,
partial results, failed download/retry, cancellation, URL import, and worker
startup recovery. No physical-device coverage is claimed: these runs use actual
Chromium with desktop and mobile emulation.

The evidence directory also contains build output hashes, the upstream comparison,
and corruption-probe results. Full local traces/reports are in
`artifacts/qa/sourcemaps-before`, `artifacts/qa/sourcemaps-after`, and
`artifacts/check/2026-09-08T13-52-08-611Z`. CI saves its full evidence for 30 days;
the comparison files in this repository are independent of artifact retention.
UI Review documents remain ignored under `.work/`.

## Re-run

```sh
npm ci
npx playwright install chromium webkit
npm run qa:check
npm run build
npm run qa:production
```
