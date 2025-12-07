// Test with a simple 4x4 puzzle with arrows
import { YajilinSolver, Direction } from '@logicpuzzle-app/solver-kit';

// Simple 4x4 with one arrow pointing right with count 1
console.log("=== Test: 4x4 with (1,1) RIGHT 1 ===");
const arrows1 = [
  { row: 1, col: 1, direction: Direction.RIGHT, count: 1 },
];
const solver1 = YajilinSolver.create(4, 4, { arrows: arrows1 });
const result1 = solver1.solve();
console.log("Result:", result1.status);
if (result1.state) {
  console.log(result1.state.toString());
}

// 5x5 with multiple arrows
console.log("\n=== Test: 5x5 with arrows ===");
const arrows2 = [
  { row: 0, col: 2, direction: Direction.RIGHT, count: 0 },
  { row: 2, col: 0, direction: Direction.DOWN, count: 1 },
  { row: 4, col: 2, direction: Direction.LEFT, count: 1 },
];
const solver2 = YajilinSolver.create(5, 5, { arrows: arrows2 });
const result2 = solver2.solve();
console.log("Result:", result2.status);
if (result2.state) {
  console.log(result2.state.toString());
}

// Test: similar pattern to the 10x10 but smaller
console.log("\n=== Test: 5x5 with multiple arrows like 10x10 ===");
const arrows3 = [
  { row: 0, col: 1, direction: Direction.RIGHT, count: 1 },
  { row: 0, col: 4, direction: Direction.DOWN, count: 1 },
  { row: 2, col: 0, direction: Direction.RIGHT, count: 0 },
  { row: 2, col: 3, direction: Direction.LEFT, count: 1 },
  { row: 4, col: 1, direction: Direction.LEFT, count: 0 },
];
const solver3 = YajilinSolver.create(5, 5, { arrows: arrows3 });
const result3 = solver3.solve();
console.log("Result:", result3.status);
if (result3.state) {
  console.log(result3.state.toString());
}
