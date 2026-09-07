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
