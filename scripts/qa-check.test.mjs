import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, realpath, rm } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const runner = resolve(dirname(fileURLToPath(import.meta.url)), 'qa-check.mjs');
const scripts = ['check:solver-sourcemaps', 'typecheck', 'typecheck:e2e', 'test:unit', 'test:e2e'];
for (const mode of ['success', 'failure', 'spawn-error']) {
  test(`QA runner: ${mode}`, async () => {
    const cwd = await realpath(await mkdtemp(join(tmpdir(), 'qa-runner-')));
    try {
      const bin = join(cwd, 'bin');
      await mkdir(bin);
      await writeFile(join(bin, 'npm'), `#!/usr/bin/env node
const { existsSync } = require('node:fs');
const script = process.argv[3];
console.log('started:' + script);
console.error('stderr:' + script);
if (script === 'test:e2e') console.log('artifacts:' + process.env.QA_ARTIFACT_DIR);
if (process.env.FIXTURE_MODE === 'success' && script === 'check:solver-sourcemaps') {
  // The check cannot finish until the test observes its output through the runner.
  // This timeout bounds a broken runner; it is not the streaming assertion.
  const deadline = setTimeout(() => process.exit(9), 10000);
  const acknowledgement = setInterval(() => {
    if (existsSync(process.env.FIXTURE_RELEASE)) {
      clearInterval(acknowledgement);
      clearTimeout(deadline);
    }
  }, 10);
} else process.exitCode = process.env.FIXTURE_MODE === 'failure' && script === 'typecheck' ? 2 : 0;
`, { mode: 0o755 });
      const release = join(cwd, 'output-observed');
      const child = spawn(process.execPath, [runner], {
        cwd, env: { ...process.env, FIXTURE_MODE: mode, FIXTURE_RELEASE: release, PATH: mode === 'spawn-error' ? bin + '/missing' : bin + ':' + process.env.PATH },
      });
      let stdout = '', stderr = '', acknowledged = false;
      child.stdout.on('data', chunk => {
        stdout += chunk;
        if (mode === 'success' && !acknowledged && stdout.includes('started:check:solver-sourcemaps')) {
          writeFileSync(release, '');
          acknowledged = true;
        }
      });
      child.stderr.on('data', chunk => { stderr += chunk; });
      const code = await new Promise((ok, fail) => { child.on('error', fail); child.on('close', ok); });
      assert.equal(code, mode === 'success' ? 0 : 1);
      const folders = await readdir(join(cwd, 'artifacts/check'));
      assert.equal(folders.length, 1);
      const directory = join(cwd, 'artifacts/check', folders[0]);
      const summary = JSON.parse(await readFile(join(directory, 'summary.json'), 'utf8'));
      assert.deepEqual(summary.map(item => item.script), scripts, 'A failed check must not prevent later checks');
      if (mode === 'spawn-error') assert.ok(summary.every(item => item.exitCode !== 0));
      else assert.deepEqual(summary.map(item => item.exitCode), scripts.map(script =>
        mode === 'failure' && script === 'typecheck' ? 2 : 0));
      const logFor = script => readFile(join(directory, script.replaceAll(':', '-') + '.log'), 'utf8');
      if (mode === 'success') {
        for (const script of scripts) {
          const log = await logFor(script);
          assert.ok(log.includes('started:' + script));
          assert.ok(log.includes('stderr:' + script));
        }
        assert.ok((await logFor('test:e2e')).includes('artifacts:' + join(directory, 'e2e')));
        assert.match(stderr, /stderr:test:e2e/);
      } else if (mode === 'spawn-error') {
        assert.match(await logFor('check:solver-sourcemaps'), /ENOENT/);
      }
    } finally { await rm(cwd, { recursive: true, force: true }); }
  });
}
