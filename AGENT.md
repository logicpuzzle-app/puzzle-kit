# Agent Instructions

## Safety / Backup
- Before large changes, create a baseline tag: `git tag baseline/<topic>/<YYYYMMDD>`.
- Use `feature/<topic>` for work branches and `backup/<topic>/<YYYYMMDD>` for rollback.

## Scope Control
- One commit = one functional unit. Split UI, logic, and dependency changes.
- For wide-impact work, list the changed areas before editing.
- Include the target feature in commit messages (e.g., `paint: ...`, `solver: ...`).

## Paint (Regression Guard)
- Lock the genre tool list and behaviors in a spec file (e.g., `docs/paint-tool-spec.md`).
- Define freehand behavior (snap, directions, input mode) before modifying it.

## Recovery
- Preserve a known-good state with baseline tags and the spec file.

## Board IDs and References
- Follow [the board ID contract](docs/board-id-contract.md). IDs are opaque keys scoped to a board and entity kind; do not derive coordinates, kinds, adjacency, order, or array indexes from their spelling.
- Compare IDs exactly without trimming, case folding, Unicode normalization, or numeric conversion. An ID does not prove that its target currently exists or is editable; check the scoped topology and state.
- Resolve geometry and adjacency from topology metadata/query APIs. Grid-format lookup belongs to an explicitly scoped compatibility adapter; a missing topology reference is not permission to parse the ID.
- Choose reference mode from explicit board/input context before lookup, never from whether an ID parses. Topology IDs may look exactly like legacy Grid IDs; missing topology must remain unresolved.
- Treat reference-mode changes as atomic migrations: map all affected references by kind, restore mode together with data in history, and reject unresolved or ambiguous mappings without partial changes. Identical strings across modes do not prove correspondence.
- Carry entity kind with IDs through mixed point lookup, pending line input, paths, and stored endpoints. The same string may identify a cell and a vertex; do not resolve by searching Maps in priority order or compare unscoped endpoint strings.
- Preserve IDs of surviving cells, vertices, and edges across editing and native save/load. Do not reuse deleted IDs for unrelated entities, including after undoing an allocation and branching into a new edit. Migrations must update all affected references together with topology and history.
- Keep display numbering separate from identity. Do not replace persistent identity with a row/column tuple, rounded position, or boundary-array offset.
- Keep the resolved cell ID in selection and pending input; validate its board scope and current target before applying input. Missing or ambiguous coordinate lookups must not manufacture an ID or choose the first candidate. Cells without row/column metadata are still valid input targets.
- Before changing topology, persistence, or references, describe ID lifetime, unresolved-reference behavior, and legacy/history handling in the PR. Keep focused identity regression tests; do not assert incidental allocation order.
- When removing identity tests, identify which real failure they detect (collision, ID reuse, changed identity, or broken references) and where that protection remains. Type guarantees and mock lookup tests do not replace allocator, editing, persistence, or history behavior tests.
- Existing gaps are listed in [the migration inventory](docs/board-id-migration.md). Do not present planned guarantees as already implemented or add new application-level parsing because old code still does it.
