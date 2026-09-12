import { afterEach, expect, test, vi } from 'vitest';
import { parsePuzzlinkUrl } from '../utils/penpaCompat';
import type { SolverWorkerRequest, SolverWorkerResponse } from '../solver/solver.worker';

afterEach(() => vi.unstubAllGlobals());

async function solve(path: string, canonicalWalls = false) {
  const puzzle = parsePuzzlinkUrl(`https://puzz.link/p?${path}`)!;
  expect(puzzle).not.toBeNull();
  if (!canonicalWalls) {
    for (const wall of Object.values(puzzle.state.problem.lines).filter(line => line.lineTarget === 'wall')) {
      puzzle.state.problem.walls[wall.id] = wall;
      delete puzzle.state.problem.lines[wall.id];
    }
  }
  const postMessage = vi.fn();
  const scope = { postMessage, onmessage: null as ((event: MessageEvent<SolverWorkerRequest>) => void) | null };
  vi.stubGlobal('self', scope);
  vi.resetModules();
  await import('../solver/solver.worker');
  scope.onmessage!({ data: {
    id: 'test', pid: puzzle.puzzleType === 'slitherlink' ? 'slither' : puzzle.puzzleType,
    grid: puzzle.grid, problem: puzzle.state.problem,
  } } as MessageEvent<SolverWorkerRequest>);
  return (postMessage.mock.calls[0][0] as SolverWorkerResponse).result;
}

// This case includes the cold transform/import of the bundled solver modules.
test('bundled Nurikabe returns the unique cross of shaded cells', async () => {
  const result = await solve('nurikabe/3/3/1g1i1g1');
  expect(result.status).toBe('solved');
  expect(Object.values(result.answer!.surfaces).map(cell => cell.cellId).sort())
    .toEqual(['cell-0-1', 'cell-1-0', 'cell-1-1', 'cell-1-2', 'cell-2-1']);
}, 15_000);

test('bundled Nurikabe rejects adjacent single-cell islands', async () => {
  expect((await solve('nurikabe/2/2/1111')).status).toBe('unsolvable');
});

test('bundled Heyawake respects canonical room walls', async () => {
  // Vertical split in both rows, horizontal split in the right column: counts 0, 1, 0.
  const legacy = await solve('heyawake/2/2/o8010');
  const canonical = await solve('heyawake/2/2/o8010', true);
  expect(legacy.status).toBe('solved');
  expect(Object.values(legacy.answer!.surfaces).map(cell => cell.cellId)).toEqual(['cell-0-1']);
  expect(canonical.status).toBe('solved');
  expect(canonical.answer).toEqual(legacy.answer);
});
