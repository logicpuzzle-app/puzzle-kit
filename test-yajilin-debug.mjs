// Debug the YajilinSolver
import { YajilinSolver, Direction } from '@logicpuzzle-app/solver-kit';

// Same arrows as before
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

console.log("Arrow details:");
arrows.forEach((a, i) => {
  console.log(`${i}: (${a.row}, ${a.col}) ${a.direction} ${a.count}`);
});

// Try to see initial state
const solver = YajilinSolver.create(10, 10, { arrows });
console.log("\nInitial state before solve:");
console.log(solver.getField().toString());

// Check if initial state already has contradictions
const valid = solver.getField().solveAndCheck();
console.log("\nInitial state valid:", valid);

// Print cell states after solveAndCheck
console.log("\nState after solveAndCheck:");
console.log(solver.getField().toString());

// Now try solving
console.log("\n\n=== Starting solve ===");
const result = solver.solve({ maxDepth: 5, maxBranches: 100000, timeout: 60000 });
console.log("Result:", result.status);
console.log("Branch count:", result.branchCount);
console.log("Propagation count:", result.propagationCount);
if (result.state) {
  console.log("\nSolution:");
  console.log(result.state.toString());
} else if (result.error) {
  console.log("Error:", result.error);
}
