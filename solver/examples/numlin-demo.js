/**
 * Numberlink (Numlin) Solver Demo
 *
 * This demonstrates how to use the Numlin solver to solve Numberlink puzzles.
 */
import { NumlinSolver } from '../solvers/numlin.js';
import { SolveStatus } from '../core/types.js';
// Example 1: Simple 3x2 puzzle - single path through all cells
console.log('=== Example 1: Simple 3x2 Puzzle ===\n');
const puzzle1 = [
    '1 ',
    '  ',
    ' 1',
];
const solver1 = NumlinSolver.fromString(3, 2, puzzle1);
console.log('Initial puzzle:');
console.log(solver1.getField().toString());
console.log();
const result1 = solver1.solve({ maxDepth: 3, maxBranches: 10000 });
console.log('Solve status:', result1.status);
console.log('Difficulty:', result1.difficulty);
console.log('Propagations:', result1.propagationCount);
console.log('Branches:', result1.branchCount);
if (result1.status === SolveStatus.SOLVED && result1.state) {
    console.log('\nSolution:');
    console.log(result1.state.toString());
}
console.log('\n' + '='.repeat(50) + '\n');
// Example 2: 5x5 puzzle with 3 number pairs
console.log('=== Example 2: Larger 5x5 Puzzle ===\n');
const puzzle2 = [
    '1   2',
    '     ',
    '  3  ',
    '     ',
    '2 3 1',
];
const solver2 = NumlinSolver.fromString(5, 5, puzzle2);
console.log('Initial puzzle:');
console.log(solver2.getField().toString());
console.log();
const result2 = solver2.solve();
console.log('Solve status:', result2.status);
console.log('Difficulty:', result2.difficulty);
if (result2.status === SolveStatus.SOLVED && result2.state) {
    console.log('\nSolution:');
    console.log(result2.state.toString());
}
console.log('\n' + '='.repeat(50) + '\n');
// Example 3: Using fromPairs constructor
console.log('=== Example 3: Using fromPairs Constructor ===\n');
const solver3 = NumlinSolver.fromPairs(3, 3, [
    {
        num: 1,
        positions: [
            { row: 0, col: 0 },
            { row: 2, col: 2 },
        ],
    },
    {
        num: 2,
        positions: [
            { row: 0, col: 2 },
            { row: 2, col: 0 },
        ],
    },
]);
console.log('Initial puzzle:');
console.log(solver3.getField().toString());
console.log();
const result3 = solver3.solve();
console.log('Solve status:', result3.status);
if (result3.status === SolveStatus.SOLVED && result3.state) {
    console.log('\nSolution:');
    console.log(result3.state.toString());
}
console.log('\n' + '='.repeat(50) + '\n');
// Example 4: Medium 5x5 puzzle with three pairs
console.log('=== Example 4: 5x5 Puzzle ===\n');
const puzzle4 = [
    '1 2  ',
    '     ',
    '  3  ',
    '     ',
    '2 3 1',
];
const solver4 = NumlinSolver.fromString(5, 5, puzzle4);
console.log('Initial puzzle:');
console.log(solver4.getField().toString());
console.log();
const result4 = solver4.solve();
console.log('Solve status:', result4.status);
console.log('Difficulty:', result4.difficulty);
console.log('Propagations:', result4.propagationCount);
console.log('Branches:', result4.branchCount);
if (result4.status === SolveStatus.SOLVED && result4.state) {
    console.log('\nSolution:');
    console.log(result4.state.toString());
}
//# sourceMappingURL=numlin-demo.js.map