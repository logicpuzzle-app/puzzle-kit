/**
 * Debug version to understand the issue
 */
import { NumlinSolver } from '../solvers/numlin.js';
// 2x3 puzzle with unique path
const puzzle = [
    '1  ',
    '  1',
];
console.log('Testing 2x3 puzzle with single pair:');
const solver = NumlinSolver.fromString(2, 3, puzzle);
console.log('Initial state:');
console.log(solver.getField().toString());
console.log('\nState dump:', solver.getField().getStateDump());
// Try to manually solve
const field = solver.getField();
console.log('\nNumber at (0,0):', field.getNumber(0, 0));
console.log('Number at (1,2):', field.getNumber(1, 2));
// Test solveAndCheck directly
const testField = field.clone();
const checkResult = testField.solveAndCheck();
console.log('\nDirect solveAndCheck result:', checkResult);
console.log('State after check:', testField.toString());
// Try solving with more depth
const result = solver.solve({ maxDepth: 5, maxBranches: 100000 });
console.log('\nSolve result:', result.status);
console.log('Propagations:', result.propagationCount);
console.log('Branches:', result.branchCount);
if (result.error) {
    console.log('Error:', result.error);
}
if (result.state) {
    console.log('\nFinal state:');
    console.log(result.state.toString());
    console.log('State dump:', result.state.getStateDump());
}
//# sourceMappingURL=numlin-debug.js.map