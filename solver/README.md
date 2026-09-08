# Vendored solver debugging information

These artifacts come from `@logicpuzzle-app/solver-kit` 0.2.1, from
[solver-kit revision 1cc612c](https://github.com/logicpuzzle-app/solver-kit/tree/1cc612c528544c88796b42c4d03cb7a7bb0ce7a7),
under `packages/solver-kit`. The upstream package declares the MIT license.

The 221 JavaScript files, 221 declarations, and their original mappings were
verified byte-for-byte against a fresh TypeScript build of that source. The
source-map repair leaves the JavaScript and declarations unchanged. Each map
now embeds its corresponding TypeScript in `sourcesContent` and identifies it
with a `solver-kit:///src/…` URL, keeping solver sources separate from the app's
own `src/` paths. No upstream checkout or source download is needed for debugging.

`kurotto.ts` contains invalid UTF-8 bytes in the upstream source. Its embedded
text uses the same replacement-character decoding as TypeScript/Node; rebuilding
that text still reproduces the shipped artifacts and mappings exactly.

Run `npm run check:solver-sourcemaps` to verify the bundle. The check builds the
embedded sources entirely in memory and compares every JavaScript file,
declaration, and mapping to the checked-in artifact. It also rejects missing or
inconsistent embedded sources. `npm run qa:check` runs it before the other checks,
including in CI.

When refreshing the vendored distribution, preserve the matching upstream
TypeScript in **both** `.js.map` and `.d.ts.map` files. Set `sourceRoot` to `""`,
`sources` to `["solver-kit:///src/<relative source path>"]`, and `sourcesContent`
to the source text used by the compiler. Do not attach a newer source tree to
older generated files. Update this provenance when importing a new revision and
run the verification above before committing. Compiler settings used for this
distribution are recorded in `scripts/check-solver-sourcemaps.mjs`; intentional
upstream compiler changes must be reviewed together with the artifact update.
