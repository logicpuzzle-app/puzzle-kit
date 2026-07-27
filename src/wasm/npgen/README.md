# NPGenerator 2007 — Rust rewrite

This is the Rust port of the verified Java reference implementation of
NPGenerator V2.0.2. It uses only the Rust standard library and preserves the
reference solver, evaluator, generator, and `java.util.Random`-compatible LCG
behavior.

The original work is Copyright (C) 2007 Time Intermedia Corporation.
Credits: Director Hirofumi Fujiwara, Puzzler Naoki Inaba, Programmer Masaya
Kiwada. This derived rewrite is licensed under GPL-3.0-or-later; see
`LICENSE`.

## Build and run

```sh
cargo build --release
./target/release/npgen solve ../java/testdata/problem-heart.txt
./target/release/npgen generate ../java/testdata/pattern-heart.txt --seed 42
./target/release/npgen random --hints 20 --seed 1
./target/release/npgen random --hints 20 --seed 1 --symmetry rot2
./target/release/npgen bench --count 1 --seed 1
```

## WebAssembly

The crate also builds as a `cdylib` and exposes the complete browser-facing
engine API through `wasm-bindgen`: `solve_puzzle`, `generate_puzzle`,
`generate_random_puzzle`, `benchmark`, `parse_npgen_xml`, and
`format_npgen_xml`.

```sh
wasm-pack build . --target web --out-dir \
  ../../../PuzzleTools/puzzle-kit/src/wasm/npgen --out-name npgen --release
```

The JavaScript caller supplies flat `Int32Array` grids, block mode/dimensions
or custom labels, additional constraint groups, vertical/horizontal switches,
diagonal mode and ordering, an optional initial solution seed, the
Java-compatible random seed, solver/uniqueness bitmasks, difficulty bounds,
the forbidden number, and the generation retry limit. Long-running calls
should be made from a Web Worker.

`solve`, `generate`, and `random` accept `--use <list>` and `--unique <list>`.
`generate` and `random` additionally accept `--dp-min N` and `--dp-max N`;
passing difficulty bounds to `solve` is an input error. Technique names are `localization`,
`naked-pair`, `hidden-pair`, `naked-triple`, `hidden-triple`, `x-wing`, and
`swordfish`; uniqueness names are `vh`, `cell`, and `block`. The special value
`none` disables every entry and cannot be combined with another name. Omitting
either list enables all of its entries. Difficulty bounds are inclusive and are
swapped when given in reverse order; a negative maximum means unlimited.
`generate` and `random` also accept `--forbidden N` (1–9). Out-of-range
generated puzzles are discarded without resetting the random stream.

`random` accepts `--symmetry rot4|rot2|mirror-h|mirror-v|none`. It defaults
to the original `Random20.java` four-way rotation (`rot4`), with byte-identical
output whether the option is omitted or explicit. `rot2`, `mirror-h`, and
`mirror-v` require an even hint count and skip fixed cells on odd-sized
boards. `none` accepts any positive hint count below the number of cells.
Modes other than `rot4` are rewrite-specific extensions and were not present
in NPGenerator V2.0.2.

`solve`, `generate`, and `random` also support variants compatible with the
Java reference: `--size N` (2–25), `--blocks WxH`, `--blocks random`,
`--blocks @file.txt`, `--diagonal`, `--no-vertical`, and `--no-horizontal`.
A block specification is required for non-square sizes. Text grids use `N`
rows of `N` whitespace-separated cells.
Use `--format xml` for XML input/output, or `--out file.xml` to save generated
output in the original `sudoku.rng`-compatible XML vocabulary. Files ending in
`.xml` are detected automatically on input. XML input preserves `<comment>` and
an explicitly supplied `<hint>`, accepts `<seed>` for generation, and combines
all `<group>` elements. As in the original XML loading path, XML constraints
are ordered vertical, horizontal, group/rectangle, then diagonal. Text/CLI
constraints keep the ProblemBuilder order vertical, horizontal, diagonal,
then group/rectangle.

Successful commands exit with 0. A puzzle with no answer or a failed
generation exits with 1, and invalid input exits with 2. If omitted, seeds
default to zero.

Run `./verify.sh` to build the release binary and compare every reference
problem and pattern, all variant cases, XML round trips, and the seeded random
case byte-for-byte with the Java implementation.
