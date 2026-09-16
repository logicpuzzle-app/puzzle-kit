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
- Start with the contract's decision table: distinguish board entity IDs, annotation record IDs, coordinates, and display/external numbering. For each lookup, identify scope, unresolved behavior, and lifetime before choosing an API.
- Follow [the board ID contract](docs/board-id-contract.md). Board entity references are opaque keys scoped to a board, reference mode, and entity kind; do not derive coordinates, kinds, adjacency, order, or array indexes from their spelling. Use the data's declared reference mode, which need not match the display mode (vertex shading always references Topology).
- Compare IDs exactly without trimming, case folding, Unicode normalization, or numeric conversion. An ID does not prove that its target currently exists or is editable; check the scoped topology and state.
- Resolve geometry and adjacency from topology metadata/query APIs. Grid-format lookup belongs to an explicitly scoped compatibility adapter; a missing topology reference is not permission to parse the ID.
- For ID parsing in a compatibility adapter, identify the declared format/version, the conversion boundary, the unknown/ambiguous-input behavior, and a real-format regression fixture. Successful parsing does not establish the reference mode.
- Choose reference mode from explicit board/input context before lookup, never from whether an ID parses. Topology IDs may look exactly like legacy Grid IDs; missing topology must remain unresolved.
- Treat reference-mode changes as atomic migrations: map all affected references by kind, restore mode together with data in history, and reject unresolved or ambiguous mappings without partial changes. Identical strings across modes do not prove correspondence.
- Carry entity kind with IDs through mixed point lookup, pending line input, paths, and stored endpoints. The same string may identify a cell and a vertex; do not resolve by searching Maps in priority order or compare unscoped endpoint strings.
- Preserve IDs of surviving cells, vertices, and edges across editing and native save/load. Do not reuse deleted IDs for unrelated entities, including after undoing an allocation and branching into a new edit. Migrations must update all affected references together with topology and history.
- Before calling an entity a survivor, define its correspondence for each entity kind. A cell mapping does not establish a vertex or edge mapping. Splits, merges, and ambiguous matches must not inherit identity by Map order, nearest position, or boundary offset; follow the operation's explicit lifetime and annotation policy.
- A stable ID does not mean unchanged geometry, adjacency, or editability. Revalidate those dependencies before reusing cached results or replaying pending/dependent edits; existence of the ID alone is insufficient.
- Structural edits and imports must preserve reference integrity as well as unique IDs: cell boundaries, edge endpoints, and vertex/edge/cell incidences must describe the same graph.
- Keep display numbering separate from identity. Do not replace persistent identity with a row/column tuple, rounded position, or boundary-array offset.
- Preserve allocated IDs and references, not the generator's incidental output order. Record IDs when allocating; replay saved edits with recorded IDs. Independently generated boards have no implied ID correspondence, even with identical settings.
- Keep the resolved cell ID in selection and pending input; validate its board scope and current target before applying input. Missing or ambiguous coordinate lookups must not manufacture an ID or choose the first candidate. Cells without row/column metadata are still valid input targets.
- Before changing topology, persistence, or references, describe ID lifetime, unresolved-reference behavior, and legacy/history handling in the PR. Keep focused identity regression tests; do not assert incidental allocation order.
- When removing identity tests, identify which real failure they detect (collision, ID reuse, changed identity, or broken references) and where that protection remains. Type guarantees and mock lookup tests do not replace allocator, editing, persistence, or history behavior tests.
- Existing gaps are listed in [the migration inventory](docs/board-id-migration.md). Do not present planned guarantees as already implemented or add new application-level parsing because old code still does it.
