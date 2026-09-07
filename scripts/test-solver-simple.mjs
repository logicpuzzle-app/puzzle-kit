// Test the Yajilin solver with a simple case
import { YajilinSolver, Direction } from '../solver/index.js';

// Test 1: Simple 3x3 with one arrow
console.log("=== Test 1: Simple 3x3 ===");
const arrows1 = [
  { row: 0, col: 0, direction: Direction.RIGHT, count: 1 },
];
const solver1 = YajilinSolver.create(3, 3, { arrows: arrows1 });
const result1 = solver1.solve();
console.log("Result:", result1.status);

// Test 2: Empty 4x4 (should be solvable - just a loop)
console.log("\n=== Test 2: Empty 4x4 ===");
const solver2 = YajilinSolver.create(4, 4, { arrows: [] });
const result2 = solver2.solve();
console.log("Result:", result2.status);

// Test 3: Known solvable Yajilin
console.log("\n=== Test 3: Known solvable 4x4 ===");
const arrows3 = [
  { row: 1, col: 1, direction: Direction.RIGHT, count: 1 },
];
const solver3 = YajilinSolver.create(4, 4, { arrows: arrows3 });
const result3 = solver3.solve();
console.log("Result:", result3.status);
if (result3.state) {
  console.log("Grid:");
  for (let r = 0; r < 4; r++) {
    let line = "";
    for (let c = 0; c < 4; c++) {
      const cell = result3.state.getCell(r, c);
      line += cell === 'black' ? '■' : cell === 'white' ? '□' : '?';
    }
    console.log("  " + line);
  }
}

// Test 4: Test fromString method with known puzzle
console.log("\n=== Test 4: fromString method ===");
const puzzle = [
  "R1. .",
  ". . .",
  ". . .",
];
const solver4 = YajilinSolver.fromString(3, 3, puzzle);
const result4 = solver4.solve();
console.log("Result:", result4.status);
