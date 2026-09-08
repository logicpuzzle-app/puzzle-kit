import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const runner = resolve(dirname(fileURLToPath(import.meta.url)), 'qa-check.mjs');
for (const mode of ['success', 'failure', 'spawn-error']) {
  test(`QA runner: ${mode}`, async () => {
    const cwd = await realpath(await mkdtemp(join(tmpdir(), 'qa-runner-')));
    try {
      const bin = join(cwd, 'bin');
      await mkdir(bin);
      await writeFile(join(bin, 'npm'), `#!/usr/bin/env node
const script = process.argv[3];
console.log('started:' + script);
console.error('stderr:' + script);
console.log('artifacts:' + process.env.QA_ARTIFACT_DIR);
setTimeout(() => {
  console.log('finished:' + script);
  process.exit(process.env.FIXTURE_MODE === 'failure' && script === 'typecheck' ? 2 : 0);
}, 150);
`, { mode: 0o755 });
      const child = spawn(process.execPath, [runner], {
        cwd, env: { ...process.env, FIXTURE_MODE: mode, PATH: mode === 'spawn-error' ? bin + '/missing' : bin + ':' + process.env.PATH },
      });
      let stdout = '', stderr = '', streamed = false;
      child.stdout.on('data', chunk => {
        stdout += chunk;
        if (stdout.includes('started:check:solver-sourcemaps') && !stdout.includes('finished:check:solver-sourcemaps')) streamed = true;
      });
      child.stderr.on('data', chunk => { stderr += chunk; });
      const code = await new Promise((ok, fail) => { child.on('error', fail); child.on('close', ok); });
      assert.equal(code, mode === 'success' ? 0 : 1);
      const folders = await readdir(join(cwd, 'artifacts/check'));
      assert.equal(folders.length, 1);
      const directory = join(cwd, 'artifacts/check', folders[0]);
      const summary = JSON.parse(await readFile(join(directory, 'summary.json'), 'utf8'));
      assert.equal(summary.length, 5, 'A failed check must not prevent later checks');
      for (const item of summary) {
        const log = await readFile(join(directory, item.script.replaceAll(':', '-') + '.log'), 'utf8');
        if (mode === 'spawn-error') {
          assert.notEqual(item.exitCode, 0);
          assert.match(log, /ENOENT/);
        } else {
          assert.equal(item.exitCode, mode === 'failure' && item.script === 'typecheck' ? 2 : 0);
          assert.ok(log.includes('started:' + item.script));
          assert.ok(log.includes('stderr:' + item.script));
          assert.ok(log.includes('finished:' + item.script));
          assert.ok(log.includes('artifacts:' + join(directory, 'e2e')));
        }
      }
      if (mode !== 'spawn-error') { assert.ok(streamed, 'Output must arrive before the check exits'); assert.match(stderr, /stderr:test:e2e/); }
    } finally { await rm(cwd, { recursive: true, force: true }); }
  });
}
