# Paint behavior baseline

Baseline: `2396c889a3c1b5ee06c79e7dfeaa1cdb3231636e` (2026-09-16).
The board rotation change preserves the following tool contract.

- Categories, in order: Surface, Number, Symbol, Line, Word, Freehand.
- Input modes come from `paintSchema`: auto; shade, unshade, bgcolor,
  bgcolor1, bgcolor2, empty, ice; number, number-, direc; circle-shade,
  circle-unshade, subcircle, subcross, arrow, bar, crossdot, objblank; line, peke.
- Word reuses Number with the last alphabet/kana mode and horizontal/vertical
  word direction. Number selects numeric input.
- Line supports cell/vertex anchors. Freehand reuses Line modes and selects
  `lineDirections: ['freehand']`: a continuous unsnapped stroke, independent of
  grid segments. Returning to Line removes freehand and defaults to orthogonal
  if no other directions remain. A drag is one undoable stroke.
- Colors remain green, blue, red, purple and black. Selecting an input mode
  retains the selected swatch.
- Answer, Image and Board adjustment modes remain separate. Image movement
  changes its offset; Board movement/resizing preserves the image's screen
  position and displayed size. Existing size/opacity limits remain unchanged.

Rotation applies to the board and its contents together, including the image.
Logical coordinates and tool semantics remain unchanged. Adjustment handles
follow the rotated board; pointer movements are converted back to board axes.
Centering and image export use the rotated board bounds.
