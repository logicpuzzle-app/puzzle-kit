import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const [phase, ...filters] = process.argv.slice(2);
if (!['before', 'after'].includes(phase)) {
  console.error('Usage: npm run qa:capture -- before|after [Playwright filters]');
  process.exit(2);
}
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const directory = resolve('artifacts/qa', `${stamp}-${phase}`);
mkdirSync(directory, { recursive: true });
const git = (...args) => spawnSync('git', args, { encoding: 'utf8' }).stdout?.trim();
// Include the working diff: HEAD alone does not identify an uncommitted fix.
writeFileSync(resolve(directory, 'working-tree.patch'), git('diff', 'HEAD') ?? '');
const sourcePaths = (git('ls-files', '--cached', '--others', '--exclude-standard', '--',
  'src', 'e2e', 'scripts', 'package.json', '*config*', 'harness.html') ?? '').split('\n').filter(Boolean);
const manifest = Object.fromEntries([...new Set(sourcePaths)].filter(existsSync).map(path =>
  [path, createHash('sha256').update(readFileSync(path)).digest('hex')]));
writeFileSync(resolve(directory, 'source-manifest.json'), JSON.stringify(manifest, null, 2));
const metadata = {
  phase, createdAt: new Date().toISOString(), commit: git('rev-parse', 'HEAD'),
  branch: git('branch', '--show-current'), status: git('status', '--short'),
  node: process.version, platform: process.platform,
  npm: spawnSync('npm', ['--version'], { encoding: 'utf8' }).stdout?.trim(),
  command: [process.execPath, require.resolve('@playwright/test/cli'), 'test', ...(filters.length ? filters : ['e2e/editor-issues.spec.ts'])],
};
writeFileSync(resolve(directory, 'metadata.json'), JSON.stringify(metadata, null, 2));
const result = spawnSync(metadata.command[0], metadata.command.slice(1), {
  env: { ...process.env, QA_ARTIFACT_DIR: directory }, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
});
writeFileSync(resolve(directory, 'run.log'), (result.stdout ?? '') + (result.stderr ?? '') + (result.error?.message ?? ''));
metadata.exitCode = result.status ?? 1;
writeFileSync(resolve(directory, 'metadata.json'), JSON.stringify(metadata, null, 2));
console.log(result.stdout ?? '');
console.log(`QA artifacts: ${directory}\nOpen: npx playwright show-report "${directory}/report"`);
process.exitCode = metadata.exitCode;
