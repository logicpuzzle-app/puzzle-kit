import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
let failures = 0;
function check(name, run) {
  try { console.log(`OK   ${name}: ${run()}`); }
  catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
}
check('Node', () => {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 12)) throw new Error('Use Node 22.12+ (Node 24 LTS recommended)');
  return process.version;
});
check('npm', () => {
  const result = spawnSync('npm', ['--version'], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error('Install npm with Node.js');
  return result.stdout.trim();
});
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const packages = ['vite', 'vitest', '@playwright/test', '@vitest/coverage-v8'];
if (manifest.dependencies?.['yajilin-kit']) packages.push('yajilin-kit');
for (const name of packages) {
  check(name, () => require.resolve(name));
}
for (const name of ['chromium', 'webkit']) {
  check(name, () => {
    const browser = require('@playwright/test')[name];
    if (!existsSync(browser.executablePath())) throw new Error(`Run npx playwright install ${name}`);
    return browser.executablePath();
  });
}
for (const name of ['src/wasm/npgen/npgen_bg.wasm', 'e2e/fixtures/xml-seed.xml', 'e2e/fixtures/xml-multiple-groups.xml']) {
  check(name, () => { if (!existsSync(name)) throw new Error('Missing fixture/artifact'); return 'present'; });
}
process.exitCode = failures ? 1 : 0;
