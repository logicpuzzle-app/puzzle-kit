import { readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Run folders are named by toISOString() with ':' and '.' replaced, so names sort by time.
const RUN = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/;
const KINDS = { check: name => RUN.test(name), production: name => name.startsWith('production-') && RUN.test(name.slice(11)) };

export function keepRuns(env = process.env) {
  const value = env.QA_KEEP_RUNS ?? '5';
  if (value === 'all') return Infinity;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw Error(`QA_KEEP_RUNS must be a non-negative integer or "all": ${value}`);
  return n;
}

// Removes older timestamped runs of one kind so that `keep` remain. Named folders are never touched.
export function pruneRuns(kind, { root = 'artifacts/check', keep = keepRuns() } = {}) {
  let names;
  try { names = readdirSync(root, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const runs = names.filter(KINDS[kind]).sort();
  const removed = runs.slice(0, Math.max(0, runs.length - keep));
  for (const name of removed) rmSync(resolve(root, name), { recursive: true, force: true });
  return removed;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const kind = process.argv[2];
  if (!KINDS[kind]) { console.error('usage: qa-prune.mjs check|production'); process.exit(2); }
  // The run about to start counts toward the limit.
  const removed = pruneRuns(kind, { keep: Math.max(0, keepRuns() - 1) });
  if (removed.length) console.log(`Removed ${removed.length} old ${kind} run(s) from artifacts/check`);
}
