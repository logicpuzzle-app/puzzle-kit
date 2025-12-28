// Debug the YajilinSolver - Fresh instance
import { YajilinSolver, Direction } from '../solver/index.js';

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

// Create a fresh solver
const solver = YajilinSolver.create(10, 10, { arrows });

// Try solving
console.log("=== Solving fresh instance ===");
const result = solver.solve({ maxDepth: 10, maxBranches: 100000, timeout: 60000 });
console.log("Result:", result.status);
console.log("Branch count:", result.branchCount);
console.log("Propagation count:", result.propagationCount);

if (result.state) {
  console.log("\nSolution found:");
  console.log(result.state.toString());
} else {
  console.log("\nFinal state of field:");
  console.log(solver.getField().toString());
}

// Count unknown cells/edges in SOLUTION state
if (result.state) {
  const solvedState = result.state;
  let unknownCells = 0;
  let unknownYoko = 0;
  let unknownTate = 0;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (solvedState.getCell(r, c) === 'unknown') unknownCells++;
      if (c < 9 && solvedState.getYokoEdge(r, c) === 'unknown') unknownYoko++;
      if (r < 9 && solvedState.getTateEdge(r, c) === 'unknown') unknownTate++;
    }
  }
  console.log("\nIn solution state:");
  console.log("Unknown cells:", unknownCells);
  console.log("Unknown yokoEdge:", unknownYoko);
  console.log("Unknown tateEdge:", unknownTate);
  console.log("isSolved:", solvedState.isSolved());
}
