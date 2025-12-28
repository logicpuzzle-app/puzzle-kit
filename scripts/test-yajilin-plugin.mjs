// Test the yajilin-plugin solver directly
import { Direction, CellState } from '../solver/index.js';
import {
  createYajilinState,
  solveYajilin,
  EdgeState,
} from '../solver/examples/yajilin-plugin.js';

// Test with the 10x10 puzzle from puzz.link
// https://puzz.link/p?yajilin/10/10/b41e2121e21o41a41b41g41b41g30d41a41b40a40r31a31d30f
const arrows = [
  { row: 0, col: 2, direction: Direction.RIGHT, count: 1 },
  { row: 0, col: 8, direction: Direction.DOWN, count: 1 },
  { row: 0, col: 9, direction: Direction.DOWN, count: 1 },
  { row: 1, col: 5, direction: Direction.DOWN, count: 1 },
  { row: 3, col: 1, direction: Direction.RIGHT, count: 1 },
  { row: 3, col: 3, direction: Direction.RIGHT, count: 1 },
  { row: 3, col: 6, direction: Direction.RIGHT, count: 1 },
  { row: 4, col: 4, direction: Direction.RIGHT, count: 1 },
  { row: 4, col: 7, direction: Direction.RIGHT, count: 1 },
  { row: 5, col: 5, direction: Direction.LEFT, count: 0 },
  { row: 6, col: 0, direction: Direction.RIGHT, count: 1 },
  { row: 6, col: 2, direction: Direction.RIGHT, count: 1 },
  { row: 6, col: 5, direction: Direction.RIGHT, count: 0 },
  { row: 6, col: 7, direction: Direction.RIGHT, count: 0 },
  { row: 8, col: 6, direction: Direction.LEFT, count: 1 },
  { row: 8, col: 8, direction: Direction.LEFT, count: 1 },
  { row: 9, col: 3, direction: Direction.LEFT, count: 0 },
];

console.log("Creating Yajilin state with", arrows.length, "arrows");
console.log("Grid: 10x10");

try {
  const initialState = createYajilinState(10, 10, arrows);
  console.log("Initial state created successfully");

  const solvedState = solveYajilin(initialState);

  if (solvedState) {
    console.log("\nSolution found!");

    // Print cells
    console.log("\nCells (■=black, □=white/loop):");
    for (let row = 0; row < 10; row++) {
      let line = '';
      for (let col = 0; col < 10; col++) {
        const cell = solvedState.cells.get(row, col);
        if (cell === CellState.BLACK) line += '■';
        else if (cell === CellState.WHITE) line += '□';
        else line += '?';
      }
      console.log(line);
    }

    // Count black cells
    let blackCount = 0;
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        if (solvedState.cells.get(row, col) === CellState.BLACK) {
          blackCount++;
        }
      }
    }
    console.log(`\nBlack cells: ${blackCount}`);

    // Count loop edges
    let hEdgeCount = 0;
    let vEdgeCount = 0;
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 9; col++) {
        if (solvedState.hEdges.get(row, col) === EdgeState.LINE) {
          hEdgeCount++;
        }
      }
    }
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 10; col++) {
        if (solvedState.vEdges.get(row, col) === EdgeState.LINE) {
          vEdgeCount++;
        }
      }
    }
    console.log(`Loop edges: ${hEdgeCount} horizontal, ${vEdgeCount} vertical`);
  } else {
    console.log("\nNo solution found");
  }
} catch (e) {
  console.error("Error:", e);
}
