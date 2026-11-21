import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { keepRuns, pruneRuns } from './qa-prune.mjs';

const runs = ['2026-09-06T01-54-51-810Z', '2026-09-08T20-15-20-996Z', '2026-09-12T02-54-18-683Z', '2026-09-15T12-27-03-159Z'];
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'qa-prune-'));
  for (const name of [...runs, ...runs.map(r => 'production-' + r), 'retention-after-capture', 'production-notes']) {
    await mkdir(join(root, name, 'e2e'), { recursive: true });
    await writeFile(join(root, name, 'e2e', 'trace.zip'), 'x');
  }
  await writeFile(join(root, '2026-09-01T00-00-00-000Z'), 'a file, not a run');
  return root;
}

test('keeps the newest runs of one kind and leaves named folders and files alone', async () => {
  const root = await fixture();
  try {
    assert.deepEqual(pruneRuns('check', { root, keep: 2 }), runs.slice(0, 2));
    assert.deepEqual(pruneRuns('production', { root, keep: 1 }), runs.slice(0, 3).map(r => 'production-' + r));
    assert.deepEqual((await readdir(root)).sort(), [
      '2026-09-01T00-00-00-000Z', ...runs.slice(2), 'production-' + runs[3], 'production-notes', 'retention-after-capture',
    ].sort());
    assert.deepEqual(pruneRuns('check', { root, keep: 5 }), []);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('missing folder is not an error', () => {
  assert.deepEqual(pruneRuns('check', { root: join(tmpdir(), 'qa-prune-missing-' + process.pid), keep: 0 }), []);
});

test('QA_KEEP_RUNS', () => {
  assert.equal(keepRuns({}), 5);
  assert.equal(keepRuns({ QA_KEEP_RUNS: '0' }), 0);
  assert.equal(keepRuns({ QA_KEEP_RUNS: 'all' }), Infinity);
  assert.throws(() => keepRuns({ QA_KEEP_RUNS: '-1' }));
  assert.throws(() => keepRuns({ QA_KEEP_RUNS: 'two' }));
});
