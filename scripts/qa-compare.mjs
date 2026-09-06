import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';

const [beforeArg, afterArg] = process.argv.slice(2);
if (!beforeArg || !afterArg) {
  console.error('Usage: pnpm qa:compare artifacts/qa/<before> artifacts/qa/<after>');
  process.exit(2);
}
const before = resolve(beforeArg), after = resolve(afterArg);
const output = resolve('artifacts/qa', `comparison-${new Date().toISOString().replace(/[:.]/g, '-')}`);
mkdirSync(output, { recursive: true });
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const link = path => relative(output, path).split('/').map(encodeURIComponent).join('/');
function load(directory) {
  const report = JSON.parse(readFileSync(resolve(directory, 'results.json'), 'utf8'));
  const cases = new Map();
  function visit(suite) {
    for (const spec of suite.specs ?? []) for (const test of spec.tests) {
      const result = test.results.at(-1);
      cases.set(`${test.projectName}: ${spec.title}`, { status: result?.status ?? test.status,
        video: result?.attachments?.find(item => item.contentType === 'video/webm')?.path });
    }
    for (const child of suite.suites ?? []) visit(child);
  }
  for (const suite of report.suites) visit(suite);
  return cases;
}
const oldCases = load(before), newCases = load(after);
function panel(item, directory) {
  if (!item) return '<p>Not run</p>';
  return `<p>${escape(item.status)}</p>${item.video ? `<video controls preload="metadata" src="${link(resolve(directory, item.video))}"></video>` : '<p>No recording</p>'}`;
}
const rows = [...new Set([...oldCases.keys(), ...newCases.keys()])].map(key =>
  `<section><h2>${escape(key)}</h2><div class="pair"><div><h3>Before</h3>${panel(oldCases.get(key), before)}</div><div><h3>After</h3>${panel(newCases.get(key), after)}</div></div></section>`).join('\n');
writeFileSync(resolve(output, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Puzzle Kit QA comparison</title><style>body{font:16px system-ui;max-width:1400px;margin:30px auto;padding:16px;background:#f4f6f8;color:#182030}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}section{background:white;padding:20px;margin:20px 0}video{width:100%;max-height:65vh}h2{font-size:20px}@media(max-width:650px){.pair{grid-template-columns:1fr}}</style><h1>Puzzle Kit QA: before / after</h1><p><a href="${link(resolve(before, 'report/index.html'))}">Before report</a> · <a href="${link(resolve(after, 'report/index.html'))}">After report</a></p><button onclick="document.querySelectorAll('video').forEach(v=>{v.currentTime=0;v.play()})">Play both from start</button><button onclick="document.querySelectorAll('video').forEach(v=>v.pause())">Pause all</button><p>Independent recordings; operation timing is not frame-synchronized. Full traces and metadata are in each report folder.</p>${rows}</html>`);
console.log(resolve(output, 'index.html'));
