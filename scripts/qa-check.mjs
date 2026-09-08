import { closeSync, mkdirSync, openSync, writeFileSync, writeSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const directory = resolve('artifacts/check', new Date().toISOString().replace(/[:.]/g, '-'));
mkdirSync(directory, { recursive: true });
console.log(`Results: ${directory}`);
const results = [];
// Continue after a failure so type errors cannot hide browser regression results.
for (const script of ['check:solver-sourcemaps', 'typecheck', 'typecheck:e2e', 'test:unit', 'test:e2e']) {
  console.log(`Running ${script}...`);
  const log = openSync(resolve(directory, `${script.replaceAll(':', '-')}.log`), 'w');
  let exitCode;
  try {
    exitCode = await new Promise(resolveExit => {
      const child = spawn('npm', ['run', script], {
        env: { ...process.env, QA_ARTIFACT_DIR: resolve(directory, 'e2e') },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      child.stdout.on('data', chunk => { writeSync(log, chunk); process.stdout.write(chunk); });
      child.stderr.on('data', chunk => { writeSync(log, chunk); process.stderr.write(chunk); });
      child.on('error', error => {
        writeSync(log, `${error.message}\n`);
        console.error(error.message);
      });
      // close also follows a spawn error, after both output streams have closed.
      child.on('close', code => resolveExit(code ?? 1));
    });
  } finally {
    closeSync(log);
  }
  results.push({ script, exitCode });
  writeFileSync(resolve(directory, 'summary.json'), JSON.stringify(results, null, 2));
  console.log(`${script}: ${exitCode === 0 ? 'PASS' : 'FAIL'}`);
}
process.exitCode = results.some(result => result.exitCode !== 0) ? 1 : 0;
