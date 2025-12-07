/**
 * Test Slitherlink Solver in puzzle-kit context
 */

import { SlitherField, SlitherSolver, SolveStatus, EdgeState } from '@logicpuzzle-app/solver-kit';

// Test 1: Simple 2x2 all 2s
console.log('=== Test 1: 2x2 all 2s ===');
const solver1 = SlitherSolver.fromString(2, 2, ['22', '22']);
const result1 = solver1.solve({ timeout: 30000 });
console.log('Status:', result1.status);
console.log('Branches:', result1.branchCount);
if (result1.status === SolveStatus.SOLVED && result1.state) {
  console.log('Solution:');
  console.log(result1.state.toString());
}

// Test 2: 3x3 puzzle
console.log('\n=== Test 2: 3x3 puzzle ===');
const solver2 = SlitherSolver.fromString(3, 3, ['.2.', '2.2', '.2.']);
const result2 = solver2.solve({ timeout: 30000 });
console.log('Status:', result2.status);
console.log('Branches:', result2.branchCount);
if (result2.status === SolveStatus.SOLVED && result2.state) {
  console.log('Solution:');
  console.log(result2.state.toString());
}

// Test 3: 5x5 puzz.link puzzle
console.log('\n=== Test 3: 5x5 puzz.link puzzle ===');
const puzzle = [
  '....3',
  '3..2.',
  '...2.',
  '2...2',
  '..33.',
];
const solver3 = SlitherSolver.fromString(5, 5, puzzle);
const result3 = solver3.solve({ timeout: 60000 });
console.log('Status:', result3.status);
console.log('Branches:', result3.branchCount);
if (result3.status === SolveStatus.SOLVED && result3.state) {
  console.log('Solution:');
  console.log(result3.state.toString());
} else {
  console.log('Error:', result3.error || 'No solution');
  if (result3.state) {
    console.log('Partial state:');
    console.log(result3.state.toString());
  }
}
