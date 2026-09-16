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
- Resolve geometry and adjacency from topology metadata/query APIs. Grid-format lookup belongs to an explicitly scoped compatibility adapter; a missing topology reference is not permission to parse the ID.
- Preserve IDs of surviving cells, vertices, and edges across editing and native save/load. Do not reuse deleted IDs for unrelated entities. Migrations must update all affected references together with topology and history.
- Keep display numbering separate from identity. Do not replace persistent identity with a row/column tuple, rounded position, or boundary-array offset.
- Before changing topology, persistence, or references, describe ID lifetime, unresolved-reference behavior, and legacy/history handling in the PR. Keep focused identity regression tests; do not assert incidental allocation order.
- Existing gaps are listed in [the migration inventory](docs/board-id-migration.md). Do not present planned guarantees as already implemented or add new application-level parsing because old code still does it.
