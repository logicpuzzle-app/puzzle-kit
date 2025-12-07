// Test the yajilin-plugin solver with very simple cases
import { Direction, CellState } from '@logicpuzzle-app/solver-kit';
import {
  createYajilinState,
  solveYajilin,
  EdgeState,
} from '@logicpuzzle-app/solver-kit/examples/yajilin-plugin';

// Test 1: 2x2 grid, no arrows, should form a simple loop
console.log("=== Test 1: 2x2 no arrows ===");
const state1 = createYajilinState(2, 2, []);
const result1 = solveYajilin(state1);
if (result1) {
  console.log("Solution found!");
  // Print cells
  for (let row = 0; row < 2; row++) {
    let line = '';
    for (let col = 0; col < 2; col++) {
      const cell = result1.cells.get(row, col);
      if (cell === CellState.BLACK) line += '■';
      else if (cell === CellState.WHITE) line += '□';
      else line += '?';
    }
    console.log(line);
  }
  // Print edges
  console.log("H edges:", result1.hEdges.get(0,0), result1.hEdges.get(1,0));
  console.log("V edges:", result1.vEdges.get(0,0), result1.vEdges.get(0,1));
} else {
  console.log("No solution");
}

// Test 2: 3x3 grid, no arrows
console.log("\n=== Test 2: 3x3 no arrows ===");
const state2 = createYajilinState(3, 3, []);
const result2 = solveYajilin(state2);
if (result2) {
  console.log("Solution found!");
  for (let row = 0; row < 3; row++) {
    let line = '';
    for (let col = 0; col < 3; col++) {
      const cell = result2.cells.get(row, col);
      if (cell === CellState.BLACK) line += '■';
      else if (cell === CellState.WHITE) line += '□';
      else line += '?';
    }
    console.log(line);
  }
} else {
  console.log("No solution");
}

// Test 3: 3x3 with one arrow pointing right with count 0 (no black cells to the right)
console.log("\n=== Test 3: 3x3 with arrow RIGHT 0 ===");
const state3 = createYajilinState(3, 3, [
  { row: 1, col: 1, direction: Direction.RIGHT, count: 0 }
]);
const result3 = solveYajilin(state3);
if (result3) {
  console.log("Solution found!");
  for (let row = 0; row < 3; row++) {
    let line = '';
    for (let col = 0; col < 3; col++) {
      const cell = result3.cells.get(row, col);
      if (cell === CellState.BLACK) line += '■';
      else if (cell === CellState.WHITE) line += '□';
      else line += '?';
    }
    console.log(line);
  }
} else {
  console.log("No solution");
}

// Test 4: 4x4 with arrow RIGHT 1
console.log("\n=== Test 4: 4x4 with arrow RIGHT 1 ===");
const state4 = createYajilinState(4, 4, [
  { row: 1, col: 0, direction: Direction.RIGHT, count: 1 }
]);
const result4 = solveYajilin(state4);
if (result4) {
  console.log("Solution found!");
  for (let row = 0; row < 4; row++) {
    let line = '';
    for (let col = 0; col < 4; col++) {
      const cell = result4.cells.get(row, col);
      if (cell === CellState.BLACK) line += '■';
      else if (cell === CellState.WHITE) line += '□';
      else line += '?';
    }
    console.log(line);
  }
} else {
  console.log("No solution");
}
