// Test the Yajilin solver with the parsed data
import { YajilinSolver, Direction } from '../solver/index.js';

// Clues from parsing puzz.link URL:
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

console.log("Creating solver with", arrows.length, "arrows");
console.log("Grid: 10x10");
console.log("\nArrows:");
arrows.forEach(a => {
  const dirName = { 'up': '↑', 'down': '↓', 'left': '←', 'right': '→' }[a.direction];
  console.log(`  (${a.row}, ${a.col}): ${a.count}${dirName}`);
});

try {
  const solver = YajilinSolver.create(10, 10, { arrows });
  console.log("\nSolver created successfully");

  const result = solver.solve();
  console.log("\nSolve result:", result.status);

  if (result.status === 'solved' && result.state) {
    console.log("\nSolution found!");
    // Print grid
    for (let row = 0; row < 10; row++) {
      let line = '';
      for (let col = 0; col < 10; col++) {
        const cell = result.state.getCell(row, col);
        if (cell === 'black') line += '■';
        else if (cell === 'white') line += '□';
        else line += '?';
      }
      console.log(line);
    }
  }
} catch (e) {
  console.error("Error:", e);
}
