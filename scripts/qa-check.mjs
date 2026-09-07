import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const directory = resolve('artifacts/check', new Date().toISOString().replace(/[:.]/g, '-'));
mkdirSync(directory, { recursive: true });
const results = [];
// Continue after a failure so type errors cannot hide browser regression results.
for (const script of ['typecheck', 'typecheck:e2e', 'test:unit', 'test:e2e']) {
  console.log(`Running ${script}...`);
  const result = spawnSync('npm', ['run', script], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, QA_ARTIFACT_DIR: resolve(directory, 'e2e') },
  });
  writeFileSync(resolve(directory, `${script.replaceAll(':', '-')}.log`),
    (result.stdout ?? '') + (result.stderr ?? '') + (result.error?.message ?? ''));
  results.push({ script, exitCode: result.status ?? 1 });
  console.log(`${script}: ${result.status === 0 ? 'PASS' : 'FAIL'}`);
}
writeFileSync(resolve(directory, 'summary.json'), JSON.stringify(results, null, 2));
console.log(`Results: ${directory}`);
process.exitCode = results.some(result => result.exitCode !== 0) ? 1 : 0;
