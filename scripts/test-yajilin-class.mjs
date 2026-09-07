// Test the YajilinSolver class directly
import { YajilinSolver, Direction } from '../solver/index.js';

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

console.log("Creating YajilinSolver with", arrows.length, "arrows");
console.log("Grid: 10x10");

try {
  const solver = YajilinSolver.create(10, 10, { arrows });
  console.log("Solver created successfully");

  console.log("\nSolving...");
  const result = solver.solve({ maxDepth: 10 });
  console.log("Result:", result.status);

  if (result.status === 'solved' && result.state) {
    console.log("\nSolution found!");
    console.log(result.state.toString());
  } else if (result.status === 'unsolvable') {
    console.log("\nNo solution exists");
  } else {
    console.log("\nUnexpected result:", result);
  }
} catch (e) {
  console.error("Error:", e);
}

// Also test a simpler case
console.log("\n\n=== Test 2: 3x3 with one arrow ===");
const arrows2 = [
  { row: 0, col: 0, direction: Direction.RIGHT, count: 0 },
];

try {
  const solver2 = YajilinSolver.create(3, 3, { arrows: arrows2 });
  const result2 = solver2.solve();
  console.log("Result:", result2.status);
  if (result2.state) {
    console.log(result2.state.toString());
  }
} catch (e) {
  console.error("Error:", e);
}

console.log("\n\n=== Test 3: 4x4 no arrows ===");
try {
  const solver3 = YajilinSolver.create(4, 4, { arrows: [] });
  const result3 = solver3.solve();
  console.log("Result:", result3.status);
  if (result3.state) {
    console.log(result3.state.toString());
  }
} catch (e) {
  console.error("Error:", e);
}
